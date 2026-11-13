import puppeteer from 'puppeteer';import assert from 'node:assert/strict';import jsQR from 'jsqr';
import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';
import {harness} from './harness.mjs';import {questions} from '../../supabase/functions/pairing-groups/questions.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),scratch=resolve(root,'../work/pairing-management');await mkdir(scratch,{recursive:true});
const h=await harness(),errors=[];let browser;
const answers=name=>Object.fromEntries(questions.flatMap(q=>q.options.length?[[q.field,q.options[0].label],[q.field+'Code',q.options[0].code]]:[[q.field,name]]));
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(path.startsWith(root+'/'));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff':'font/woff'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(4173,'127.0.0.1',r));
async function page(staff){const context=await browser.createBrowserContext(),p=await context.newPage();await p.setViewport({width:1366,height:768});p.on('pageerror',e=>errors.push(e.message));await p.evaluateOnNewDocument(staff=>{sessionStorage.setItem('inspiration-teacher-access',staff);Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copiedInvite=value;}}});},staff);await p.setRequestInterception(true);p.on('request',async req=>{try{
 if(req.url().includes('/functions/v1/pairing-groups')){const r=await h.handler(new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}:{} )}));await req.respond({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});}
 else if(req.url().endsWith('/inspiration/vendor/supabase.js'))await req.respond({status:200,contentType:'text/javascript',body:'globalThis.supabase={createClient:()=>({channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}})};'});
 else if(req.url().startsWith('http://127.0.0.1:4173/'))await req.continue();else await req.abort();
 }catch(error){errors.push(error.message);if(!req.isInterceptResolutionHandled())await req.abort();}});return p;}
async function click(p,label){await p.waitForFunction(label=>[...document.querySelectorAll('button')].some(b=>b.textContent===label&&!b.disabled),{},label);await p.evaluate(label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label&&!b.disabled).click(),label);}
async function idle(p){await p.waitForFunction(()=>document.querySelector('#app').getAttribute('aria-busy')==='false');}
try{
 browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const p=await page('a');await p.goto('http://127.0.0.1:4173/pairing/admin.html');await p.waitForSelector('.create-form');
 assert.equal(await p.$eval('h1',n=>n.textContent),'מציאת שותפות');assert.equal(await p.$$eval('.user-name',ns=>ns.length),1);
 await p.type('.create-form input[aria-label="בית הספר"]','[בדיקה] ניהול מוקדם');await p.type('.create-form input[aria-label="כיתה"]','ח1');await p.$eval('.create-form input[type=number]',n=>n.value='5');await click(p,'פתיחת פעילות');await p.waitForSelector('#qr svg');await idle(p);
 const invite=await p.$eval('#invite',n=>n.href),id=new URL(p.url()).searchParams.get('activity');assert.match(invite,/questionnaire\.html\?room=/);
 assert.equal(await p.$eval('#invite',n=>getComputedStyle(n).display),'none');await click(p,'העתקת קישור');await idle(p);assert.equal(await p.evaluate(()=>window.copiedInvite),invite);
 await click(p,'הצגת QR לכיתה');await p.waitForSelector('#qr-dialog[open]');
 const image=await p.evaluate(async()=>{const source=new XMLSerializer().serializeToString(document.querySelector('#qr-dialog svg'));const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(source);await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=700;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,700,700);ctx.drawImage(image,0,0,700,700);return [...ctx.getImageData(0,0,700,700).data];});
 assert.equal(jsQR(new Uint8ClampedArray(image),700,700)?.data,invite);await click(p,'סגירה');await p.waitForFunction(()=>!document.querySelector('#qr-dialog'));
 const code=new URL(invite).searchParams.get('room'),tokens=Array.from({length:5},token),people=[];
 for(let i=0;i<5;i++)people.push((await h.call('participant.join',{code,name:'משתתפת '+i},tokens[i])).body);
 for(let i=0;i<3;i++)await h.call('participant.submit',{answers:answers('משתתפת '+i)},tokens[i]);
 await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForFunction(()=>document.querySelector('.completion label').textContent==='3 מתוך 5 סיימו');
 assert.deepEqual(await p.$$eval('.metric strong',ns=>ns.map(n=>n.textContent)),['5','5','3']);
 await p.click('.expected-edit summary');await p.$eval('.expected-edit input',n=>n.value='4');await click(p,'עדכון');await p.waitForFunction(()=>document.querySelector('.metric strong').textContent==='4');await idle(p);assert.equal((await h.call('teacher.state',{activity_id:id})).body.participants.length,5);
 await p.screenshot({path:resolve(scratch,'management-desktop.png')});
 await p.setViewport({width:390,height:844});await p.screenshot({path:resolve(scratch,'management-mobile.png'),fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.setViewport({width:1366,height:768});
 await click(p,'סיום השאלון וחלוקה לקבוצות');await p.waitForSelector('#finish-dialog[open]');assert(await p.$eval('#finish-dialog',n=>n.textContent.includes('3 מתוך 4')));await click(p,'המשך לחלוקה');await p.waitForSelector('.group-card');await idle(p);
 assert.equal((await h.call('participant.submit',{answers:answers('מאוחרת')},tokens[4])).body.error.code,'room_closed');
 await p.click('.manual-panel summary');await p.select('select[aria-label="משתתפת לצירוף ידני"]',people[3].id);await click(p,'הוספה לקבוצה');await p.waitForFunction(()=>document.querySelector('.group-count').textContent==='4 משתתפות');await idle(p);
 for(const [name,expected] of [['מצטרפת ידנית א',1],['מצטרפת ידנית ב',2]]){
  await p.click('.manual-panel summary');await p.type('input[aria-label="שם משתתפת לצירוף ידני"]',name);await p.select('select[aria-label="קבוצה לצירוף ידני"]','2');await click(p,'הוספה לקבוצה');await p.waitForFunction(expected=>document.querySelectorAll('.group-count')[1]?.textContent===expected+' משתתפות',{},expected);await idle(p);
  if(expected===1)assert.equal(await p.$$eval('button',ns=>ns.find(n=>n.textContent==='פרסום החלוקה הסופית').disabled),true);
 }
 await p.select('.group-card select','1');await click(p,'שמירת השינויים');await idle(p);assert.deepEqual(await p.$$eval('.group-count',ns=>ns.map(n=>n.textContent)),['3 משתתפות','3 משתתפות']);
 p.once('dialog',d=>d.accept());await click(p,'פרסום החלוקה הסופית');await p.waitForSelector('.report-actions');await idle(p);assert.equal(await p.$('.manual-panel'),null);
 await click(p,'הקבוצות שלי');await p.waitForFunction(()=>!document.querySelector('#groups-view').hidden);assert.equal(await p.$$eval('#history tbody tr',ns=>ns.length),1);assert(await p.$eval('#history',n=>n.textContent.includes('טרם דווח')));
 await click(p,'צפייה');await p.waitForSelector('#history-activity-panel .group-card');await idle(p);await p.screenshot({path:resolve(scratch,'groups-desktop.png')});
 await p.type('input[aria-label="סינון לפי בית ספר"]','לא קיים');assert.equal(await p.$('#history table'),null);await click(p,'ניקוי סינון');assert(await p.$('#history table'));
 const other=(await h.call('teacher.create',{school:'פעילות של מדריך אחר',class_name:'ח2',expected:2},null,'b')).body;
 const admin=await page('admin');await admin.goto('http://127.0.0.1:4173/pairing/admin.html?view=groups');await admin.waitForSelector('select[aria-label="היקף הפעילויות"]');await admin.select('select[aria-label="היקף הפעילויות"]','all');await admin.waitForFunction(()=>document.querySelectorAll('#history tbody tr').length===2);assert(await admin.$eval('#history',n=>n.textContent.includes('מדריך בדיקה ב')));
 assert.equal((await h.call('teacher.state',{activity_id:other.id},null,'a')).status,403);
 await admin.setViewport({width:390,height:844});assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',teacher_open:true,live_progress:true,expected_edit:true,qr_decoded:true,copy_link:true,early_close:true,manual_existing_and_new:true,group_edit_publish:true,history_filters:true,admin_scope:true,desktop_mobile:true,scratch}));
}finally{await browser?.close();await new Promise(r=>server.close(r));await h.db.close();}
