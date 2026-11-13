
const assert=require('node:assert/strict');
const fs=require('node:fs');
// Puppeteer is an existing project dependency; this adapter keeps the assertions concise.
const puppeteer=require('puppeteer');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(target,(e,body)=>{if(e){res.writeHead(404);return res.end()};res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[path.extname(target)]||'application/octet-stream');res.end(body)});
});
class Locator {
 constructor(p,s){this.p=p;this.s=s;this.firstOnly=false}
 first(){this.firstOnly=true;return this}
 async click(){await this.p.page.waitForSelector(this.s,{visible:true});await this.p.page.waitForFunction(s=>{const e=document.querySelector(s);return e&&!e.disabled},{},this.s);await this.p.page.click(this.s)}
 async fill(value){await this.p.page.waitForSelector(this.s,{visible:true});await this.p.page.$eval(this.s,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},value)}
 async count(){return (await this.p.page.$$(this.s)).length}
 async textContent(){return this.p.page.$eval(this.s,e=>e.textContent)}
 async getAttribute(a){return this.p.page.$eval(this.s,(e,a)=>e.getAttribute(a),a)}
 async evaluate(fn,arg){return this.p.page.$eval(this.s,fn,arg)}
 async evaluateAll(fn,arg){return this.p.page.$$eval(this.s,fn,arg)}
 async waitFor(options={}){return this.p.page.waitForSelector(this.s,{visible:options.state==='visible'||!options.state,hidden:options.state==='hidden'})}
}
class Page {
 constructor(page){this.page=page}
 locator(s){return new Locator(this,s)}
 on(...args){this.page.on(...args)}
 async goto(url){return this.page.goto(url,{waitUntil:'networkidle2'})}
 async waitForURL(pattern){
  const regex=typeof pattern==='string'?new RegExp('^'+pattern.split('**').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$'):null;
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){const url=this.page.url();if(regex?regex.test(url):pattern(new URL(url))){await this.page.waitForFunction(()=>document.readyState==='complete');return;}await new Promise(r=>setTimeout(r,25));}
  throw new Error('URL did not match: '+this.page.url());
 }
 async waitForTimeout(t){return new Promise(r=>setTimeout(r,t))}
 async evaluate(fn,arg){return this.page.evaluate(fn,arg)}
 async setViewportSize(v){return this.page.setViewport(v)}
 url(){return this.page.url()}
 async screenshot(opts){return this.page.screenshot(opts)}
}
const chromium={launch:async options=>{
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const b=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 return {newContext:async options=>{
  const c=await b.createBrowserContext(),routes=[],init=[];
  return {route:async(pattern,fn)=>routes.push({pattern,fn}),addInitScript:async(fn,arg)=>init.push({fn,arg}),newPage:async()=>{
   const page=await c.newPage();await page.setViewport(options.viewport);for(const i of init)await page.evaluateOnNewDocument(i.fn,i.arg);
   await page.setRequestInterception(true);page.on('request',async req=>{
    const route=routes.find(r=>r.pattern.includes('firebasejs')?req.url().includes('/firebasejs/'):req.url().endsWith('/__mock_db'));
    if(route)await route.fn({request:()=>({postDataJSON:()=>JSON.parse(req.postData())}),fulfill:async x=>req.respond({status:200,headers:{'access-control-allow-origin':'*'},contentType:x.contentType,body:x.body})});else await req.continue();
   });return new Page(page)
  }}
 },close:async()=>{await b.close();await new Promise(r=>server.close(r))}};
}};
const base='http://127.0.0.1:8765/';
const data={instructors:{test:{name:'Test'}},sessions:{},responses:{},pairings:{}};
let calls=[];
const firebase=`
export const initializeApp=x=>x;
export const getFirestore=()=>({_settings:{}});
export const collection=(db,name)=>({name});
export const doc=(db,name,id)=>({name,id});
export const where=(field,op,value)=>({field,op,value});
export const query=(ref,...filters)=>({...ref,filters});
export const increment=value=>({__increment:value});
const api=async(op,ref,value)=>{const r=await fetch('/__mock_db',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,ref,value})});return r.json()};
const snap=(id,value)=>({id,exists:()=>!!value,data:()=>value});
export const getDoc=async ref=>snap(ref.id,await api('get',ref));
export const getDocs=async ref=>{const rows=await api('list',ref);const docs=rows.map(([id,v])=>snap(id,v));return {docs,empty:!docs.length,size:docs.length,forEach:fn=>docs.forEach(fn)}};
export const setDoc=(ref,value)=>api('set',ref,value);
export const updateDoc=(ref,value)=>api('update',ref,value);
export const deleteDoc=ref=>api('delete',ref);
export const onSnapshot=(ref,callback)=>{let active=true;const run=async()=>{const s=ref.id?await getDoc(ref):await getDocs(ref);if(active)callback(s)};run();const id=setInterval(run,100);return()=>{active=false;clearInterval(id)}};
`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 async function context(lang='he',mobile=false){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},serviceWorkers:'block'});
  await ctx.route('**/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:firebase}));
  await ctx.route('**/__mock_db',async route=>{
   const {op,ref,value}=route.request().postDataJSON();calls.push({op,ref,value});let result=null;
   if(op==='get')result=data[ref.name]?.[ref.id]||null;
   if(op==='list')result=Object.entries(data[ref.name]||{}).filter(([id,v])=>(ref.filters||[]).every(f=>v[f.field]===f.value));
   if(op==='set'){data[ref.name][ref.id]=value;result={};}
   if(op==='update'){for(const [k,v]of Object.entries(value)) data[ref.name][ref.id][k]=v&&v.__increment!==undefined?(data[ref.name][ref.id][k]||0)+v.__increment:v;result={};}
   if(op==='delete'){delete data[ref.name][ref.id];result={};}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  // Fonts and Tailwind are existing dependencies. Keep their requests real for visual QA.
  await ctx.addInitScript(lang=>{if(!localStorage.getItem('portzot-derech-course-language'))localStorage.setItem('portzot-derech-course-language',lang)},lang);
  const p=await ctx.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER SCRIPT:',e.message)});return {ctx,p};
 }
 const {ctx,p}=await context();
 await p.goto(base+'index.html');assert.equal(await p.locator('html').getAttribute('lang'),'he');
 assert.equal(await p.locator('[data-course-language]').count(),0);
 await p.locator('#openGateBtn').click();await p.locator('#accessCode').fill('1234');await p.locator('#submitCodeBtn').click();
 await p.waitForURL('**/strongermenu-2026.html');
 await p.locator('[data-course-language="ar"]').click();await p.waitForURL('**/ar/strongermenu-2026.html?lang=ar');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('stronger_gate_2026')),'ok');
 assert.equal(await p.locator('a[href*="ar/start/quiz"]').count(),1);
 await p.setViewportSize({width:390,height:844});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'menu overflow');
 await p.screenshot({path:'/tmp/menu-mobile.png'});
 await p.setViewportSize({width:1440,height:1000});
 assert.match(await p.locator('a[href*="idea-to-product"]').getAttribute('href'),/\/idea\/idea-to-product.html$/);
 await p.goto(base+'ar/start/quiz.html?lang=ar&activity=42#intro');
 await p.locator('.cta-btn').click();
 for(let i=0;i<4;i++){await p.locator('.option').first().click();await p.waitForTimeout(330);}
 await p.locator('[data-course-language="he"]').click();await p.waitForURL('**/start/quiz.html?lang=he&activity=42#intro');
 assert.match(await p.locator('#questionCounter').textContent(),/5/);
 await p.locator('[data-course-language="ar"]').click();await p.waitForURL(u=>u.searchParams.get('lang')==='ar');
 for(let i=4;i<20;i++){await p.locator('.option').first().click();await p.waitForTimeout(330);}
 await p.locator('#resultScreen.active').waitFor();
 const results=await p.locator('#domainsResult a').evaluateAll(es=>es.map(e=>new URL(e.href).pathname));assert.equal(results.length,3);
 await p.locator('[data-course-language="he"]').click();await p.locator('#resultScreen.active').waitFor();
 const resultsHe=await p.locator('#domainsResult a').evaluateAll(es=>es.map(e=>new URL(e.href).pathname));assert.deepEqual(resultsHe,results.map(s=>s.replace('/ar/','/')));
 console.log('PASS Hebrew login, partial menu, opening quiz completion, switch/resume and stable results');
 // All translated domain pages, both viewports, no missing local assets or visible Hebrew.
 for (const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await p.setViewportSize(viewport);
  for(const file of ['alldomains',...Array.from({length:10},(_,i)=>'d'+(i+1))]){
   await p.goto(base+`ar/domains/${file}.html?lang=ar&session=domain-test`);
   await p.locator('.course-lang-switch').waitFor();
   const he=await p.locator('body').evaluate(el=>{const clone=el.cloneNode(true);clone.querySelectorAll('script,style,.course-lang-switch,[data-reader-language]').forEach(e=>e.remove());return /[\u0590-\u05ff]/.test(clone.textContent)});assert.equal(he,false,file);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,file+' overflow');
   if(file!=='alldomains'){
    assert.equal(await p.locator('.main-article').count(),1);
    assert.equal(await p.locator('[data-open-article]').count(),8);
    await p.locator('[data-open-article]').first().click();
    const h=new URL(p.url()).hash;
    assert.equal(await p.locator('dialog[open]').count(),1);
    if(viewport.width===390&&file==='d1')await p.screenshot({path:'/tmp/d1-mobile.png'});
    await p.locator('dialog[open] [data-reader-language="he"]').click();await p.waitForURL(u=>u.searchParams.get('lang')==='he');assert.equal(new URL(p.url()).searchParams.get('session'),'domain-test');assert.equal(new URL(p.url()).hash,h);
   }
   if(viewport.width===390&&file==='alldomains')await p.screenshot({path:`/tmp/${file}-mobile.png`,fullPage:false});
  }
 }
 console.log('PASS 11 domain pages desktop/mobile, expanded article, reader hashes and parameters');
 const admin=await context('ar');
 await admin.p.goto(base+'ar/pairing/admin.html?lang=ar');
 await admin.p.locator('#instructorCode').fill('test');await admin.p.locator('#participantCount').fill('3');await admin.p.locator('button[onclick="startActivity()"]').click();
 await admin.p.locator('#trackingScreen.active').waitFor();
 const session=Object.keys(data.sessions)[0];assert.ok(session);
 await admin.p.page.reload({waitUntil:'networkidle2'});await admin.p.locator('#trackingScreen.active').waitFor();
 assert.equal(Object.keys(data.sessions).length,1);
 console.log('PASS legacy Arabic instructor session survives reload');
 const participants=[];
 for(const [lang,name]of [['ar','נועה'],['ar','ليان'],['ar','سارة']]){
  const a=await context(lang,true);participants.push(a);
  await a.p.goto(base+(lang==='ar'?'ar/':'')+'pairing/pairing.html?lang='+lang);
  await a.p.locator('#startActivityBtn.show').waitFor();await a.p.locator('#startActivityBtn').click();await a.p.waitForURL('**/questionnaire.html?session='+session);
  await a.p.locator('#textAnswer').fill(name);await a.p.locator('#nextBtn').click();
  assert.equal(await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'questionnaire overflow');
  for(let i=1;i<15;i++){
   const before=await a.p.locator('#stepLabel').textContent();
   assert.equal(Number(before.match(/\d+/)[0]),i+1);
   await a.p.locator('.option-btn').first().click();
   if(i===3){
    await a.p.page.reload({waitUntil:'networkidle2'});
    assert.equal(await a.p.locator('.option-btn.active').count(),1);
   }
   await a.p.locator('#nextBtn').click();
   if(i<14){const after=await a.p.locator('#stepLabel').textContent();if(Number(after.match(/\d+/)[0])!==i+2){await a.p.screenshot({path:'/tmp/failed-question-mobile.png'});throw new Error('Question did not advance: '+after)}}
  }
  await a.p.waitForURL('**/waiting.html?session='+session);await a.p.locator('#completedCount').waitFor();
 }
 assert.equal(data.sessions[session].completedCount,3);assert.equal(Object.keys(data.responses).length,3);
 const codes=Object.values(data.responses).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>k.endsWith('Code'))));assert.deepEqual(codes[0],codes[1]);assert.deepEqual(codes[1],codes[2]);
 await admin.p.locator('#matchingButtonContainer').waitFor({state:'visible'});await admin.p.locator('#matchingButtonContainer button').click();await admin.p.waitForURL('**/matching.html?session='+session);
 await admin.p.locator('#runButton').click();await admin.p.locator('#results.show').waitFor();
 const grouping=data.pairings[session].groups.map(g=>g.members);assert.equal(grouping[0].length,3);
 // The separate Arabic legacy flow still translates reasons from the shared algorithm.
 await admin.p.page.reload({waitUntil:'networkidle2'});await admin.p.locator('#runButton').click();await admin.p.locator('#results.show').waitFor();
 assert.deepEqual(data.pairings[session].groups.map(g=>g.members),grouping);
 const resultText=await admin.p.locator('#results').textContent();assert.match(resultText,/مجموعة|المجموعات/);assert.doesNotMatch(resultText,/גבוהה|טובה|יש לכן|דרכי העבודה/);
 for(const a of participants){await a.p.locator('#resultScreen.show').waitFor();assert.match(await a.p.locator('#partnerName').textContent(),/נועה/);}
 await participants[1].p.screenshot({path:'/tmp/pairing-result-mobile.png'});
 console.log('PASS legacy Arabic meeting with mixed-script names, draft recovery, codes and stable matching/results');
 assert.deepEqual(errors,[]);console.log('PASS no browser script errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
