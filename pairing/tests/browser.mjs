import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
import { harness,pdfDependencies } from './harness.mjs';
import { buildPdf } from '../../supabase/functions/pairing-groups/pdf.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
const scratch=resolve(root,'../work/pairing-validation');await mkdir(scratch,{recursive:true});
const snapshot={school:'[בדיקה] בית ספר לפיתוח וחדשנות',class_name:'ח׳1 / 2027',instructor_name:'מדריכת בדיקה',activity_date:'2026-11-13',participant_count:120,groups:Array.from({length:40},(_,i)=>({groupNumber:i+1,memberNames:['תלמידת בדיקה א׳','נועה שם משפחה ארוך במיוחד לבדיקה של גלישת שורה ותצוגה מלאה של השם','תלמידת בדיקה ג׳']}))};
const pdf=await buildPdf(snapshot,pdfDependencies);await writeFile(resolve(scratch,'hebrew-report.pdf'),pdf);
const h=await harness();
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/test-report.pdf'){res.setHeader('Content-Type','application/pdf');res.end(pdf);return;}
  if(req.url==='/pdf-viewer'){
   res.setHeader('Content-Type','text/html');res.end(`<html><body><script type="module">import * as pdfjs from '/inspiration/vendor/pdf.mjs';pdfjs.GlobalWorkerOptions.workerSrc='/inspiration/vendor/pdf.worker.mjs';const doc=await pdfjs.getDocument('/test-report.pdf').promise;window.pageCount=doc.numPages;for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const v=page.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;document.body.append(c);await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;}window.pdfReady=true;</script></body></html>`);return;
  }
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error();
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.statusCode=404;res.end('not found');}
});await new Promise(r=>server.listen(4173,'127.0.0.1',r));
let browser;const errors=[];
async function page(staff=null){const context=await browser.createBrowserContext(),p=await context.newPage();await p.setViewport({width:1280,height:900});p.on('pageerror',e=>errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',async req=>{
  try{if(req.url().includes('/functions/v1/pairing-groups')){
   const response=await h.handler(new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}:{} )}));
   await req.respond({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }else if(req.url().endsWith('/inspiration/vendor/supabase.js'))await req.respond({status:200,contentType:'text/javascript',body:'globalThis.supabase={createClient:()=>({channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}})};'});
  else if(req.url().startsWith('http://127.0.0.1:4173'))await req.continue();else await req.abort();
  }catch(e){errors.push(e.message);if(!req.isInterceptResolutionHandled())await req.abort();}
 });
 if(staff)await p.evaluateOnNewDocument(value=>sessionStorage.setItem('inspiration-teacher-access',value),staff);
 return p;
}
async function click(p,label){await p.waitForFunction(label=>[...document.querySelectorAll('button')].some(b=>b.textContent===label&&!b.disabled),{},label);await p.evaluate(label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label&&!b.disabled).click(),label);}
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const teacher=await page('a');await teacher.goto('http://127.0.0.1:4173/pairing/admin.html');await teacher.waitForSelector('form');
 const inputs=await teacher.$$('form input');await inputs[0].type('[בדיקה] בית ספר');await inputs[1].type('ח׳1');await inputs[2].evaluate(n=>n.value='');await inputs[2].type('5');await click(teacher,'פתיחת פעילות');await teacher.waitForSelector('#invite',{timeout:10000}).catch(async e=>{console.log(await teacher.$eval('body',n=>n.innerText));console.log(errors);console.log(await teacher.$$eval('form input',ns=>ns.map(n=>({value:n.value,valid:n.checkValidity(),message:n.validationMessage}))));throw e;});await teacher.waitForSelector('#qr svg');
 const link=await teacher.$eval('#invite',n=>n.href),activity=new URL(teacher.url()).searchParams.get('activity');assert.match(link,/room=[0-9a-f]{32}$/);
 const students=[];
 for(let i=0;i<5;i++){
  const p=await page();students.push(p);await p.goto(link);await p.waitForSelector('#textAnswer');await p.type('#textAnswer',i<2?'שם זהה':'תלמידת בדיקה '+i);await click(p,'התחלה');
  for(let step=2;step<=15;step++){
   await p.waitForFunction(step=>document.querySelector('#stepLabel').textContent===`שאלה ${step} מתוך 15`,{},step);
   if(i===0&&step===5){await p.reload();await p.waitForFunction(()=>document.querySelector('#stepLabel').textContent==='שאלה 5 מתוך 15');}
   await p.click('.option-btn');
  }
  await p.waitForFunction(()=>location.pathname.endsWith('/waiting.html'));
 }
 await teacher.reload();await teacher.waitForFunction(()=>document.querySelector('#activity-panel').textContent.includes('סיימו: 5'));
 await click(teacher,'סיום השאלון וחלוקה לקבוצות');await click(teacher,'המשך לחלוקה');await teacher.waitForSelector('#activity-panel select');
 assert.equal((await h.call('teacher.state',{activity_id:activity})).body.participants.length,5);
 await teacher.select('#activity-panel select','1');await click(teacher,'שמירת השינויים');await teacher.waitForFunction(()=>document.querySelector('#activity-panel').textContent.includes('חלוקת קבוצות'));
 teacher.once('dialog',d=>d.accept());await click(teacher,'פרסום החלוקה הסופית');await teacher.waitForFunction(()=>!document.querySelector('#activity-panel select'));
 await students[0].reload();await students[0].waitForSelector('#resultScreen.show');assert(await students[0].$eval('#partnerName',n=>n.textContent.includes('שם זהה')));
 await teacher.screenshot({path:resolve(scratch,'teacher-desktop.png'),fullPage:true});
 await teacher.setViewport({width:390,height:844});await teacher.screenshot({path:resolve(scratch,'teacher-mobile.png'),fullPage:true});
 assert(await teacher.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await click(teacher,'דיווח הקבוצות');await teacher.waitForFunction(()=>document.querySelector('#notice').textContent.includes('אישר'));assert.equal(h.sends,1);
 const pages=(await pdfDependencies.PDFDocument.load(pdf)).getPageCount();assert(pages>1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({browser:'passed',participants:5,duplicate_names:true,refresh_recovery:true,manual_edit:true,publication:true,single_mock_mail:h.sends,mobile_width:390,pdf_pages:pages,scratch}));
}finally{await browser?.close();await new Promise(r=>server.close(r));await h.db.close();}
