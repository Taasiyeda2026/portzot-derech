import test from 'node:test';import assert from 'node:assert/strict';
import {generateGroups as approved,calculatePairScore as approvedPair,calculateGroupBalance as approvedBalance} from '../../js/pairing-algorithm.js';
import {generateGroups,calculatePairScore,calculateGroupBalance,getPreferredGroupSizes} from '../../supabase/functions/pairing-groups/algorithm.mjs';
import {questions} from '../../supabase/functions/pairing-groups/questions.mjs';
const responses=(count,seed=1)=>Array.from({length:count},(_,i)=>Object.fromEntries([['id',String(i)],...questions.flatMap((q,j)=>q.options.length?[[q.field,q.options[(i*(seed+2)+j*seed)%q.options.length].label],[q.field+'Code',q.options[(i*(seed+2)+j*seed)%q.options.length].code]]:[[q.field,'בדיקה '+i]])]));
const stable=groups=>groups.map(({id,createdAt,...group})=>group);
test('every supported class size exactly preserves approved matching, scores, reasons and tie order',()=>{
 for(let count=2;count<=40;count++){
  const rows=responses(count),before=JSON.stringify(rows),actual=generateGroups(rows);
  assert.deepEqual(stable(actual),stable(approved(rows)),'class size '+count);
  assert.deepEqual(actual.map(g=>g.members.length),getPreferredGroupSizes(count));
  assert.equal(new Set(actual.flatMap(g=>g.members)).size,count);
  assert.equal(JSON.stringify(rows),before,'inputs must remain unchanged');
 }
});
test('40-person request cache does not leak between classes, changed answers, failures or repeated object inputs',()=>{
 const rows=responses(40,7),cpu=process.cpuUsage(),start=performance.now();const grouped=generateGroups(rows);
 console.log(JSON.stringify({capacity:40,wall_ms:Math.round(performance.now()-start),cpu_ms:Math.round(Object.values(process.cpuUsage(cpu)).reduce((a,b)=>a+b,0)/1000)}));
 assert.deepEqual(stable(grouped),stable(approved(rows)));
 for(const question of questions.slice(1))for(const row of rows){const option=question.options.at(-1);row[question.field]=option.label;row[question.field+'Code']=option.code;}
 assert.deepEqual(stable(generateGroups(rows)),stable(approved(rows)));
 assert.throws(()=>generateGroups([null]));
 const other=responses(8,5);assert.deepEqual(stable(generateGroups(other)),stable(approved(other)));
 const repeated=[other[0],other[0],other[1],other[1]];assert.deepEqual(stable(generateGroups(repeated)),stable(approved(repeated)));
 assert.equal(calculatePairScore(rows[0],rows[1]),approvedPair(rows[0],rows[1]));assert.deepEqual(calculateGroupBalance(rows.slice(0,4)),approvedBalance(rows.slice(0,4)));
});
test('production handler matches and publishes a complete 40-participant class',async()=>{
 const {harness}=await import('./harness.mjs');const h=await harness();try{
  const room=(await h.call('teacher.create',{school:'[בדיקה] מוכנות 40',class_name:'בדיקה',expected:40})).body;
  const rows=responses(40,3).map(({id,...answers})=>({answers,token:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')}));
  await h.db.query("insert into public.pairing_participants(activity_id,token_hash,name,answers,completed_at) select $1,encode(sha256(convert_to(x.token,'UTF8')),'hex'),x.answers->>'displayName',x.answers,now() from jsonb_to_recordset($2::jsonb) x(token text,answers jsonb)",[room.id,JSON.stringify(rows)]);
  const start=performance.now(),match=await h.call('teacher.match',{activity_id:room.id});assert.equal(match.status,200);
  assert.deepEqual(match.body.groups.map(g=>g.members.length),getPreferredGroupSizes(40));assert.equal(new Set(match.body.groups.flatMap(g=>g.members)).size,40);
  assert.equal((await h.call('teacher.publish',{activity_id:room.id,version:match.body.version})).status,200);
  const state=await h.call('participant.state',{},rows[0].token);assert.equal(state.status,200);assert(state.body.group.memberNames.includes(rows[0].answers.displayName));assert.equal(state.body.participant.answers,undefined);assert.equal(h.sends,0);
  console.log(JSON.stringify({http_class_size:40,matched_and_published:true,wall_ms:Math.round(performance.now()-start),emails_sent:h.sends}));
 }finally{await h.db.close();}
});
