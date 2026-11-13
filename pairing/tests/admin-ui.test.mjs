import test from 'node:test';import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';import {readFile} from 'node:fs/promises';
import {harness} from './harness.mjs';import {questions} from '../../supabase/functions/pairing-groups/questions.mjs';
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=path=>readFile(new URL(path,import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await pause();}throw Error('UI state timed out');}
function globals(dom){for(const key of ['window','document','sessionStorage','location','history','Node','Element','DOMParser','MutationObserver','HTMLElement'])globalThis[key]=dom.window[key];globalThis.requestAnimationFrame=f=>f();dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};}
const click=text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text&&!b.disabled);assert(b,'missing button '+text);b.click();};
test('actual manager DOM: answer display, team removal and activity confirmation',async()=>{
 const h=await harness(),oldFetch=globalThis.fetch;
 const dom=new JSDOM('<div id="user-area"></div><div id="notice"></div><div id="app"></div>',{url:'https://portzot-derech.org/pairing/admin.html?view=groups'});globals(dom);
 try{
  let a=(await h.call('teacher.create',{school:'[בדיקה] ממשק',class_name:'ח1',expected:4})).body;
  const answers=name=>Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));
  for(let i=0;i<4;i++){const t=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');await h.call('participant.join',{code:a.code,name:'בדיקה '+i},t);await h.call('participant.submit',{answers:answers('בדיקה '+i)},t);}
  a=(await h.call('teacher.match',{activity_id:a.id})).body;const ids=a.participants.map(p=>p.id);
  a=(await h.call('teacher.save',{activity_id:a.id,version:a.version,groups:[{members:ids.slice(0,2)},{members:ids.slice(2)}]})).body;
  sessionStorage.setItem('inspiration-teacher-access','admin');
  globalThis.fetch=(url,init)=>h.handler(new Request(url,{...init,headers:{...init.headers,Origin:'https://portzot-derech.org'}}));
  globalThis.supabase={createClient:()=>({channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}})};
  const inspiration=await source('../../inspiration/common.js');
  const embed=data(await source('../dashboard-session.js'));
  let common=await source('../common.js');common=common.replace("'../inspiration/common.js'",JSON.stringify(data(inspiration))).replace("'./dashboard-session.js'",JSON.stringify(embed));
  let teacher=await source('../teacher.js');teacher=teacher.replace("'./common.js'",JSON.stringify(data(common))).replace("'./dashboard-session.js'",JSON.stringify(embed)).replace("'../supabase/functions/pairing-groups/questions.mjs'",JSON.stringify(data('export const questions='+JSON.stringify(questions))));
  await import(data(teacher));await until(()=>document.querySelector('#history'));
  const scope=document.querySelector('[aria-label="היקף הפעילויות"]');scope.value='all';scope.dispatchEvent(new window.Event('input'));await until(()=>document.querySelector('#history button'));
  click('צפייה');await until(()=>document.querySelector('.answers-panel'));
  const details=document.querySelector('.answers-panel');details.open=true;details.dispatchEvent(new window.Event('toggle'));await until(()=>document.querySelector('.participant-answers'));
  assert.match(document.querySelector('.participant-answers').textContent,/חיים דיגיטליים/);
  click('מחיקת קבוצה');const dialog=document.querySelector('dialog');assert(dialog.open);
  for(const select of dialog.querySelectorAll('select'))select.value='1';click('מחיקת הקבוצה');assert.equal(document.querySelectorAll('.group-card').length,1);
  click('שמירת השינויים');await until(()=>document.querySelector('#app').getAttribute('aria-busy')==='false');assert.equal((await h.call('teacher.state',{activity_id:a.id})).body.groups[0].members.length,4);
  click('מחיקת פעילות');assert(document.querySelector('#delete-activity-dialog').open);click('ביטול');assert(!document.querySelector('#delete-activity-dialog'));
  assert.equal((await h.call('teacher.activities')).body.activities.length,1);
  click('מחיקת פעילות');click('מחיקת הפעילות');await until(()=>document.querySelector('#notice').textContent==='הפעילות נמחקה.');assert.equal((await h.call('teacher.activities')).body.activities.length,0);
  click('יציאה');
 }finally{globalThis.fetch=oldFetch;dom.window.close();await h.db.close();}
});
