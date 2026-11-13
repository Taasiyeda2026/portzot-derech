import test from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';
import { questions } from '../../supabase/functions/pairing-groups/questions.mjs';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const answers=name=>Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));
test('admin answers, owner deletion, stale versions and revocation of every participant route',async()=>{
 const h=await harness();
 try{
  const a=(await h.call('teacher.create',{school:'[בדיקה] מחיקה',class_name:'ח1',expected:2})).body;
  const t=token();await h.call('participant.join',{code:a.code,name:'בדיקה'},t);
  await h.call('participant.submit',{answers:answers('בדיקה')},t);
  assert.equal((await h.call('admin.answers',{activity_id:a.id})).status,403);
  assert.equal((await h.call('admin.answers',{activity_id:a.id},null,'b')).status,403);
  const result=await h.call('admin.answers',{activity_id:a.id},null,'admin');
  assert.equal(result.status,200);assert.equal(result.body.participants[0].answers.displayName,'בדיקה');
  assert.equal((await h.call('participant.state',{},t)).body.participant.answers,undefined);
  for(const staff of ['b','disabled'])assert.equal((await h.call('teacher.delete',{activity_id:a.id,version:0},null,staff)).status,403);
  assert.equal((await h.call('teacher.delete',{activity_id:a.id,version:-1})).body.error.code,'stale_version');
  assert.equal((await h.call('teacher.delete',{activity_id:a.id,version:0})).body.deleted,true);
  for(const action of ['teacher.state','teacher.match','teacher.download'])assert.equal((await h.call(action,{activity_id:a.id})).body.error.code,'room_unavailable');
  assert.equal((await h.call('admin.answers',{activity_id:a.id},null,'admin')).body.error.code,'room_unavailable');
  for(const staff of ['a','admin'])assert.equal((await h.call('teacher.activities',{},null,staff)).body.activities.length,0);
  assert.equal((await h.call('participant.join',{code:a.code,name:'מאחרת'},token())).body.error.code,'room_unavailable');
  assert.equal((await h.call('participant.join',{code:a.code,name:'בדיקה'},t)).body.error.code,'room_unavailable');
  assert.equal((await h.call('participant.state',{},t)).body.error.code,'room_unavailable');
  assert.equal((await h.call('participant.submit',{answers:answers('בדיקה')},t)).body.error.code,'room_unavailable');
  const row=(await h.db.query('select deleted_at,deleted_by,retain_until from pairing_activities where id=$1',[a.id])).rows[0];
  assert(row.deleted_at);assert(row.deleted_by);assert.equal((await h.db.query('select count(*)::int as n from pairing_participants where activity_id=$1',[a.id])).rows[0].n,1);
  const b=(await h.call('teacher.create',{school:'[בדיקה] אדמין',class_name:'ח2',expected:2},null,'b')).body;
  assert.equal((await h.call('teacher.delete',{activity_id:b.id,version:0},null,'admin')).body.deleted,true);
  await h.db.exec('set role authenticated');
  await assert.rejects(()=>h.db.query('select * from pairing_activities'),/permission denied/);
  await assert.rejects(()=>h.db.query("select pairing_rpc('teacher.delete',null,null,'{}')"),/permission denied/);
  await h.db.exec('reset role');
 }finally{await h.db.close();}
});
test('deleting a team preserves every response and rejects incomplete partitions',async()=>{
 const h=await harness();
 try{
  let a=(await h.call('teacher.create',{school:'[בדיקה] צוות',class_name:'ח1',expected:4})).body;
  for(let i=0;i<4;i++){const t=token();await h.call('participant.join',{code:a.code,name:'בדיקה '+i},t);await h.call('participant.submit',{answers:answers('בדיקה '+i)},t);}
  a=(await h.call('teacher.match',{activity_id:a.id})).body;
  const ids=a.participants.map(p=>p.id);
  a=(await h.call('teacher.save',{activity_id:a.id,version:a.version,groups:[{members:ids.slice(0,2)},{members:ids.slice(2)}]})).body;
  assert.equal((await h.call('teacher.save',{activity_id:a.id,version:a.version,groups:[{members:ids.slice(2)}]})).body.error.code,'invalid_groups');
  a=(await h.call('teacher.save',{activity_id:a.id,version:a.version,groups:[{members:ids}]})).body;
  assert.equal(a.groups.length,1);assert.equal(a.groups[0].members.length,4);
  assert.equal((await h.call('admin.answers',{activity_id:a.id},null,'admin')).body.participants.filter(p=>p.answers).length,4);
  a=(await h.call('teacher.publish',{activity_id:a.id,version:a.version})).body;
  assert.equal((await h.call('teacher.save',{activity_id:a.id,version:a.version,groups:[{members:ids}]})).body.error.code,'invalid_phase');
 }finally{await h.db.close();}
});
