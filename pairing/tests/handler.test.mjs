import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './harness.mjs';import {questions} from '../../supabase/functions/pairing-groups/questions.mjs';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const answers=name=>Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));
test('HTTP flow enforces identity and data boundaries; report/download idempotency and ambiguous delivery',async()=>{
 const h=await harness();try{
  assert.equal((await h.call('teacher.me',{},null,'bad')).status,401);
  assert.equal((await h.call('teacher.me',{},null,'disabled')).status,403);
  assert.equal((await h.call('teacher.report.finish',{})).status,400);
  const denied=await h.handler(new Request('http://example.com',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}));assert.equal(denied.status,403);
  const create=async klass=>(await h.call('teacher.create',{school:'[בדיקה] בית ספר',class_name:klass,expected:2})).body;
  const populate=async room=>{const ts=[token(),token()];for(const t of ts){assert.equal((await h.call('participant.join',{code:room.code,name:'שם בדיקה'},t)).status,200);assert.equal((await h.call('participant.submit',{answers:answers('שם בדיקה')},t)).status,200);}return ts;};
  const a=await create('ח׳1');const ts=await populate(a);
  assert.equal((await h.call('teacher.state',{activity_id:a.id},null,'b')).status,403);
  const bad=answers('שם');bad.mainDomainCode='forged';assert.equal((await h.call('participant.submit',{answers:bad},ts[0])).status,400);
  assert.equal((await h.call('participant.state',{},token())).status,401);
  const draft=(await h.call('teacher.match',{activity_id:a.id})).body;
  assert.equal(draft.groups.length,1);assert.equal((await h.call('participant.state',{},ts[0])).body.group,null);
  assert.equal((await h.call('teacher.publish',{activity_id:a.id,version:draft.version})).status,200);
  const personal=(await h.call('participant.state',{},ts[0])).body;
  assert.equal(personal.group.memberNames.length,2);assert.equal(personal.participant.answers,undefined);assert.equal(personal.group.score,undefined);
  const download=await h.call('teacher.download',{activity_id:a.id});assert.equal(download.status,200);assert.equal(new TextDecoder().decode(download.bytes.slice(0,5)),'%PDF-');assert.equal(h.sends,0);
  // Parallel requests must acquire a single send claim under the activity lock.
  const reports=await Promise.all([h.call('teacher.report',{activity_id:a.id}),h.call('teacher.report',{activity_id:a.id})]);
  assert(reports.some(r=>r.body.status==='sent'));assert.equal(h.sends,1);
  await h.call('teacher.report',{activity_id:a.id});assert.equal(h.sends,1);
  assert.equal(h.mail.message.toRecipients[0].emailAddress.address,'office@think.org.il');assert.equal(h.mail.message.attachments[0].contentType,'application/pdf');
  assert.equal((await h.call('teacher.download',{activity_id:a.id})).bytes.length,download.bytes.length);
  const b=await create('ט׳3');await populate(b);const d=(await h.call('teacher.match',{activity_id:b.id})).body;await h.call('teacher.publish',{activity_id:b.id,version:d.version});
  h.mailStatus=0;assert.equal((await h.call('teacher.report',{activity_id:b.id})).body.status,'unknown');assert.equal(h.sends,2);
  await h.call('teacher.report',{activity_id:b.id});assert.equal(h.sends,2);
  assert.equal((await h.call('teacher.download',{activity_id:b.id})).status,200);
  const c=await create('י׳2');await populate(c);const dc=(await h.call('teacher.match',{activity_id:c.id})).body;await h.call('teacher.publish',{activity_id:c.id,version:dc.version});
  h.mailStatus=403;assert.equal((await h.call('teacher.report',{activity_id:c.id})).body.status,'failed');
  h.mailStatus=202;assert.equal((await h.call('teacher.report',{activity_id:c.id})).body.status,'sent');
 }finally{await h.db.close();}
});

test('retention removes an uploaded-but-uncommitted PDF before deleting expired identity data',async()=>{
 const {createHandler}=await import('../../supabase/functions/pairing-groups/handler.mjs');
 const events=[];let storageFails=false;
 const client={rpc:async(name)=>({data:name==='pairing_cleanup_auth'||name==='pairing_rate_limit'}),storage:{from:()=>({remove:async paths=>{events.push(['storage',paths]);return storageFails?{error:{message:'unavailable'}}:{};}})},
 from:table=>({
  select:()=>({lte:()=>({limit:async()=>({data:[{id:'activity'}]})}),eq:async()=>({data:[{id:'report',pdf_path:null}]})}),
  delete:()=>({eq:async()=>{events.push(['delete',table]);return {};}}),
 })};
 const handler=createHandler({client,buildPdf:()=>{}});
 const request=()=>new Request('http://cleanup',{method:'POST',headers:{'Content-Type':'application/json','x-pairing-cleanup-secret':'test'},body:JSON.stringify({action:'admin.cleanup',payload:{}})});
 assert.equal((await handler(request())).status,200);assert.deepEqual(events,[['storage',['activity/report.pdf']],['delete','pairing_activities']]);
 events.length=0;storageFails=true;assert.equal((await handler(request())).status,503);assert.deepEqual(events,[['storage',['activity/report.pdf']]]);
});
