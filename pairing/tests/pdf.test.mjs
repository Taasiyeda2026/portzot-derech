import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {buildPdf} from '../../supabase/functions/pairing-groups/pdf.mjs';import {harness,pdfDependencies} from './harness.mjs';import {questions} from '../../supabase/functions/pairing-groups/questions.mjs';
const scratch=resolve(new URL('../../../work/pairing-final-tweaks/',import.meta.url).pathname);await mkdir(scratch,{recursive:true});
const text=file=>execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).replace(/[\u202a-\u202e\u2066-\u2069]/g,'');
const snapshot={school:'בית ספר לדוגמה',class_name:'ח׳1',instructor_name:'מדריכת בדיקה',activity_date:'2026-11-13',participant_count:9,groups:[{groupNumber:1,memberNames:['נועה','מאיה','שירה']},{groupNumber:2,memberNames:['תמר','יעל','ליה']},{groupNumber:3,memberNames:['רוני','אלה','מיכל']}]};
test('Hebrew PDF has two columns, each complete group on its own row, and paginates long names',async()=>{
 const file=resolve(scratch,'two-column-report.pdf');await writeFile(file,await buildPdf(snapshot,pdfDependencies));const content=text(file);
 assert(content.includes('מספר קבוצה'));assert(content.includes('שמות המשתתפות בקבוצה'));
 for(const item of [snapshot.school,snapshot.class_name,snapshot.instructor_name,snapshot.activity_date])assert(content.replace(/\s/g,'').includes(item.replace(/\s/g,'')));
 for(const group of snapshot.groups){const row=content.split('\n').find(line=>line.includes('קבוצה '+group.groupNumber));assert(row);for(const name of group.memberNames)assert(row.includes(name));}
 const bbox=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8'});
 const words=[...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g)].map(m=>({x:+m[1],y:+m[2],right:+m[3],word:/[\u0590-\u05ff]/.test(m[5])?[...m[5].replace(/[\u202a-\u202e,]/g,'')].reverse().join(''):m[5]}));
 for(const group of snapshot.groups){const names=group.memberNames.map(name=>words.find(w=>w.word===name));assert(names.every(Boolean));assert(names.every(w=>w.right<452&&w.x>=38));assert(names.every(w=>Math.abs(w.y-names[0].y)<1));const number=words.find(w=>w.word===String(group.groupNumber)&&w.x>452&&Math.abs(w.y-names[0].y)<2);assert(number);}
 const long={...snapshot,participant_count:120,groups:Array.from({length:30},(_,i)=>({groupNumber:i+1,memberNames:Array.from({length:4},(_,j)=>`משתתפת בדיקה ${i+1} ${j+1} `+'שם משפחה ארוך במיוחד '.repeat(4))}))};
 const longFile=resolve(scratch,'long-two-column-report.pdf'),bytes=await buildPdf(long,pdfDependencies);await writeFile(longFile,bytes);const pages=(await pdfDependencies.PDFDocument.load(bytes)).getPageCount();assert(pages>1);const longText=text(longFile);assert.equal(longText.split('מספר קבוצה').length-1,pages);
});
test('download and mail share the formatted frozen PDF without changing storage, report state or delivery',async()=>{
 const h=await harness();try{
  const room=(await h.call('teacher.create',{school:'[בדיקה] דוח שתי עמודות',class_name:'ח1',expected:2})).body;
  for(const name of ['נועה','מאיה']){const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');await h.call('participant.join',{code:room.code,name},token);const answers=Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));await h.call('participant.submit',{answers},token);}
  const draft=(await h.call('teacher.match',{activity_id:room.id})).body;await h.call('teacher.publish',{activity_id:room.id,version:draft.version});
  await h.call('teacher.download',{activity_id:room.id});assert.equal(h.sends,0);
  const before=(await h.db.query('select * from public.pairing_reports where activity_id=$1',[room.id])).rows[0];
  const downloaded=await h.call('teacher.download',{activity_id:room.id});assert.equal(downloaded.status,200);assert.equal(h.sends,0);
  const after=(await h.db.query('select * from public.pairing_reports where activity_id=$1',[room.id])).rows[0];assert.deepEqual(after,before);
  const downloadFile=resolve(scratch,'download.pdf');await writeFile(downloadFile,downloaded.bytes);assert(text(downloadFile).includes('שמות המשתתפות בקבוצה'));
  assert.equal((await h.call('teacher.report',{activity_id:room.id})).body.status,'sent');assert.equal(h.sends,1);assert.equal(h.mail.message.toRecipients[0].emailAddress.address,'office@think.org.il');
  const attachment=Buffer.from(h.mail.message.attachments[0].contentBytes,'base64'),mailFile=resolve(scratch,'mail-attachment.pdf');await writeFile(mailFile,attachment);assert.equal(text(mailFile),text(downloadFile));
  await h.call('teacher.report',{activity_id:room.id});assert.equal(h.sends,1);
 }finally{await h.db.close();}
});
