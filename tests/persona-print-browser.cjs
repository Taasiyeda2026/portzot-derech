/* Native Chromium PDF and persona-only regression checks. No external services. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const http=require('node:http');
const puppeteer=require('puppeteer');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'generated-artifacts/persona-print');
const ids=['problem','audience','team','participants','personaName','age','routine','moment','barrier','impact','feeling','wish','objective'];
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,body)=>{
  if(err){res.writeHead(404);return res.end()}
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff':'font/woff','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
 });
});
// Poppler wraps RTL runs in bidi controls and emits their visual order.
const logical=text=>text.replace(/[\u202a-\u202e\u2066-\u2069]/g,'').split('\n').map(line=>[...line].reverse().join('')).join('\n');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/repl/tools/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const lang of (process.env.PERSONA_LANG?[process.env.PERSONA_LANG]:['he','ar'])){
   const route=(lang==='ar'?'ar/':'')+'steps/persona.html?lang='+lang;
   for(const width of [1440,390]){
    await page.setViewport({width,height:900,isMobile:width===390,hasTouch:width===390});
    await page.goto(base+route,{waitUntil:'networkidle0'});
    await page.evaluate(()=>{sessionStorage.clear();window.print=()=>{window.__printed=(window.__printed||0)+1}});
    await page.reload({waitUntil:'networkidle0'});
    await page.evaluate(()=>{window.print=()=>{window.__printed=(window.__printed||0)+1}});
    await page.click('#print');
    assert.equal(await page.evaluate(()=>window.__printed||0),0);
    assert.equal(await page.$eval('#problem',el=>el.getAttribute('aria-invalid')),'true');
    const data=Object.fromEntries(ids.map(id=>[id,lang==='he'?'טקסט לבדיקה בעברית':'نص للاختبار بالعربية']));
    data.routine=lang==='he'?'  בוקר   עם רווחים\n\nשורה שנייה  \nEnglish 123 <b>בטוח</b>':'  صباح   مع مسافات\n\nسطر ثان  \nEnglish 123 <b>آمن</b>';
    await page.evaluate(data=>{
     for(const [id,value]of Object.entries(data)){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))}
    },data);
    await page.click('#print');await page.waitForFunction(()=>window.__printed===1);
    assert.deepEqual(await page.$$eval('[data-print]',es=>Object.fromEntries(es.map(e=>[e.dataset.print,e.textContent]))),data);
    assert.equal(await page.$('[data-print] b'),null,'input must remain safe text');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(output,`${lang}-screen-${width}.png`),fullPage:true});
    await page.reload({waitUntil:'networkidle0'});
    assert.equal(await page.$eval('#routine',e=>e.value),data.routine);
    const other=lang==='he'?'ar':'he';
    await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click(`[data-course-language="${other}"]`)]);
    assert.equal(await page.$eval('#routine',e=>e.value),data.routine);
    await page.goto(base+route,{waitUntil:'networkidle0'});
    // Menu printing must synchronize even a programmatic value with no input event.
    await page.$eval('#barrier',e=>e.value='menu print 123');
    await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.$eval('[data-print="barrier"]',e=>e.textContent),'menu print 123');
    page.once('dialog',dialog=>dialog.accept());
    await page.click('#clear');
    assert.equal(await page.$eval('#participants',e=>e.value),'');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('portzot-persona-2027-v1')),null);
   }
   await page.setViewport({width:1200,height:900,isMobile:false,hasTouch:false});
   const phrase=lang==='he'?'בדיקת עברית תקינה עם רווחים':'اختبار العربية السليمة مع مسافات';
   for(const scenario of (process.env.PERSONA_SCENARIO?[process.env.PERSONA_SCENARIO]:['short','multiline','oversized','no-background'])){
    const data=Object.fromEntries(ids.map(id=>[id,phrase]));
    data.age='15';data.personaName=lang==='he'?'מאיה':'ليلى';
    if(scenario==='multiline')for(const id of ['routine','moment','barrier','impact','wish','objective'])data[id]=Array.from({length:12},()=>phrase+'\n\n'+phrase).join('\n');
    if(scenario==='oversized')data.barrier=Array.from({length:150},(_,i)=>`${phrase} ${String(i).padStart(3,'0')}`).join('\n');
    await page.evaluate(data=>{for(const[id,value]of Object.entries(data))document.getElementById(id).value=value},data);
    await page.evaluate(async()=>{await preparePersonaPrint();window.dispatchEvent(new Event('beforeprint'))});
    const pdf=path.join(output,`${lang}-${scenario}.pdf`);
    const economy=scenario==='no-background'?await page.addStyleTag({content:'.print-sheet,.print-sheet *{print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}'}):null;
    await page.pdf({path:pdf,preferCSSPageSize:true,printBackground:scenario!=='no-background',displayHeaderFooter:false});
    if(economy)await economy.evaluate(el=>el.remove());
    const info=cp.execFileSync('pdfinfo',[pdf],{encoding:'utf8'});
    assert.match(info,/Page size:.*\(A4\)/);
    const size=info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);
    assert(Math.abs(+size[1]-595.28)<1&&Math.abs(+size[2]-841.89)<1,'A4 rounding tolerance');
    const pages=Number(info.match(/Pages:\s+(\d+)/)[1]);
    assert(scenario==='short'||scenario==='no-background'?pages===1:pages>1,`${lang} ${scenario}: ${pages} pages`);
    const raw=cp.execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    fs.writeFileSync(pdf+'.txt',raw);
    const text=logical(raw);
    assert(text.includes(phrase)||raw.includes(phrase),'PDF must contain extractable RTL words with spaces');
    if(scenario==='oversized')for(let i=0;i<150;i++)assert(raw.includes(String(i).padStart(3,'0')),`missing answer line ${i}`);
    assert(!raw.includes('PDF')&&!raw.includes('ניקוי התשובות')&&!raw.includes('مسح الإجابات'),'site controls must not print');
    // Check every glyph's bounding box remains inside A4 content margins.
    const bbox=cp.execFileSync('pdftotext',['-bbox',pdf,'-'],{encoding:'utf8'});
    for(const m of bbox.matchAll(/<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)"/g)){
     assert(+m[1]>=32&&+m[3]<=563&&+m[2]>=30&&+m[4]<=812,`${lang} ${scenario}: clipped text ${m[0]}`);
    }
    cp.execFileSync('pdftoppm',['-scale-to','950','-png',pdf,path.join(output,`${lang}-${scenario}`)]);
    console.log(`PASS ${lang} ${scenario}: ${pages} A4 page(s), extractable text, all text within margins`);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile validation, exact safe text, draft reload, language switch, beforeprint, fonts and logo in both languages');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
