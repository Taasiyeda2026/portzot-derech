import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { questions } from '../../supabase/functions/pairing-groups/questions.mjs';
import { generateGroups as approvedGenerateGroups } from '../../js/pairing-algorithm.js';
import { generateGroups,getPreferredGroupSizes } from '../../supabase/functions/pairing-groups/algorithm.mjs';
import { partition,validatedAnswers,validName,personalProjection } from '../../supabase/functions/pairing-groups/domain.mjs';
import { sendGraph,mailPayload,graphAccess } from '../../supabase/functions/pairing-groups/mail.mjs';
export function answers(name='משתתפת בדיקה'){return Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));}
test('the 15 canonical questions, payload labels/options/order/codes, and matching rules are unchanged',async()=>{
 const original=await readFile(new URL('../../js/pairing-algorithm.js',import.meta.url),'utf8');
 const fixture=Array.from({length:8},(_,i)=>({...answers('בדיקה '+i),id:String(i)}));
 const stable=groups=>groups.map(({id,createdAt,...group})=>group);
 assert.deepEqual(stable(generateGroups(fixture)),stable(approvedGenerateGroups(fixture)));
 assert(original.includes('function generateGroups(responses)'));
 const html=await readFile(new URL('../questionnaire.html',import.meta.url),'utf8');
 const source=html.slice(html.indexOf('const questions = ['),html.indexOf('\n];',html.indexOf('const questions = ['))+3);
 assert.equal(source.replace('const questions','export const questions')+'\n',await readFile(new URL('../../supabase/functions/pairing-groups/questions.mjs',import.meta.url),'utf8'));
 assert.equal(questions.length,15);assert.deepEqual(validatedAnswers(answers()),answers());
 const bad=answers();bad.mainDomainCode='forged';assert.throws(()=>validatedAnswers(bad));
 assert.equal(validName('<img src=x onerror=alert(1)>'),false);
});
test('authoritative groups cover each participant once at all required counts',()=>{
 for(const n of [2,3,4,5,7,8,20,30]){
  const participants=Array.from({length:n},(_,i)=>({...answers('בדיקה '+i),id:crypto.randomUUID()}));
  const groups=generateGroups(participants),result=partition(groups,participants.map(p=>p.id));
  assert.deepEqual(result.map(g=>g.members.length),getPreferredGroupSizes(n));
 }
 assert.throws(()=>partition([{members:['x']}],['x']));
 assert.throws(()=>partition([{members:['x','x']}],['x','y']));
 assert.throws(()=>partition([{members:['x','foreign']}],['x','y']));
});
test('participant projection cannot expose other groups, answers or scores',()=>{
 const projected=personalProjection({room:{id:'x',phase:'published',topic:'public',secret:'no'},participant:{id:'a',name:'שם',completed:true,answers:{private:true}},group:{groupNumber:1,memberNames:['שם','חברה'],members:['a','b'],score:90},otherGroups:['private']});
 assert.equal(JSON.stringify(projected).includes('private'),false);assert.equal(projected.group.score,undefined);assert.equal(projected.group.members,undefined);
});
test('Graph only reports success after 202 and treats ambiguous errors as unknown',async()=>{
 for(const [response,expected] of [[202,'sent'],[400,'failed'],[403,'failed'],[429,'failed'],[500,'unknown'],[503,'unknown']])assert.equal(await sendGraph('token',{},async()=>new Response(null,{status:response})),expected);
 assert.equal(await sendGraph('token',{},async()=>{throw new Error('timeout');}),'unknown');
 const mail=mailPayload({school:'בדיקה',class_name:'ח׳1',groups:[],participant_count:0},'report.pdf',new Uint8Array([37,80,68,70]),true,'id');
 assert.equal(mail.message.toRecipients[0].emailAddress.address,'office@think.org.il');assert.match(mail.message.subject,/בדיקה/);assert.equal(mail.message.attachments.length,1);
 await assert.rejects(()=>graphAccess(()=>undefined),/mail_not_configured/);
});
