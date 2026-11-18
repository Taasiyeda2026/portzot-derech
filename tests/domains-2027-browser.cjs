/* Focused end-to-end checks for the domain rollout; no production database calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const puppeteer=require('puppeteer');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404);return res.end()};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&new URL(r.url()).pathname!=='/favicon.ico')missing.push(`${r.status()} ${r.url()}`)});
 // Prevent the unrelated PWA's broad precache from affecting this focused test.
 await page.setBypassServiceWorker(true);
 await page.evaluateOnNewDocument(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register=()=>Promise.resolve({})});
 const shots=process.env.DOMAIN_SCREENSHOTS||'/tmp/portzot-2027';fs.mkdirSync(shots,{recursive:true});
 try{
  for(const width of [1440,390]){
   await page.setViewport({width,height:1000});
   for(const lang of ['he','ar']){
    for(let id=1;id<=10;id++){
     const d=read(`domains/content/${lang}/d${id}.json`);
     await page.goto(`${base}${lang==='ar'?'ar/':''}domains/d${id}.html?lang=${lang}&activity=42`,{waitUntil:'load'});
     await page.evaluate(async()=>{
      const images=[...document.images];images.forEach(img=>img.loading='eager');
      await Promise.all(images.map(img=>img.decode()));await document.fonts.ready;
     });
     const layout=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('.card')].map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top}});
      return{overflow:document.documentElement.scrollWidth>innerWidth+1,main:document.querySelector('main').getBoundingClientRect().width,cards,questions:document.querySelectorAll('.questions p').length,article:!!document.querySelector('.main-article'),loaded:[...document.images].every(i=>i.naturalWidth>0),accent:getComputedStyle(document.body).getPropertyValue('--accent')};
     });
     assert.equal(layout.overflow,false,`${lang} d${id} ${width} overflow`);assert(layout.main<=1160);assert.equal(layout.questions,4);assert(layout.article&&layout.loaded);
     assert.equal(layout.cards.length,8);assert.equal(layout.cards.filter(c=>c.top===layout.cards[0].top).length,width===1440?4:1);
     assert(Math.max(...layout.cards.map(c=>c.height))-Math.min(...layout.cards.map(c=>c.height))<1,'card heights');
     assert(Math.max(...layout.cards.map(c=>c.width))-Math.min(...layout.cards.map(c=>c.width))<1,'card widths');
     if(lang==='ar')assert.equal(await page.evaluate(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style,.course-lang-switch,[data-reader-language]').forEach(e=>e.remove());return /[\u0590-\u05ff]/.test(c.textContent.replace(/פורצות דרך|תעשיידע/g,''))}),false);
     assert.equal(await page.$eval('.brand',e=>e.textContent.trim()),'פורצות דרך');
     assert.equal(await page.$eval('.chapter-nav',e=>!!e.closest('.masthead')),true);
     assert.equal(await page.$eval('.chapter-nav [aria-current="location"]',e=>e.getAttribute('href')),'#main-article');
     if(id===1){
      for(const hash of ['#main-article','#closeup','#thoughts']){
       await page.evaluate(hash=>document.querySelector(hash).scrollIntoView({behavior:'instant'}),hash);
       await page.waitForFunction(hash=>document.querySelector('.chapter-nav [aria-current="location"]')?.getAttribute('href')===hash,{},hash);
      }
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('.chapter-nav [aria-current="location"]')?.getAttribute('href')==='#main-article');
     }
     const switchLayout=await page.$eval('.course-lang-switch',e=>({w:e.offsetWidth,h:e.offsetHeight,wrap:getComputedStyle(e).flexWrap}));
     assert(switchLayout.w<100&&switchLayout.h<=26);assert.equal(switchLayout.wrap,'nowrap');
     const questions=await page.$$eval('.questions p',es=>es.map(e=>({top:e.offsetTop,border:getComputedStyle(e).borderInlineStartWidth})));
     if(width===1440)assert.equal(questions.filter(q=>q.top===questions[0].top).length,2);
     assert(questions.every(q=>q.border==='1px'));
     const localLinks=await page.$$eval('a[href]',es=>es.map(a=>a.href).filter(h=>h.startsWith(location.origin)&&!h.includes('#')));
     for(const url of localLinks){const p=new URL(url).pathname;assert(fs.existsSync(path.join(root,p)),p)}
     // Exercise all eight readers once per language; both layouts also test navigation and focus.
     const indexes=width===1440?[0,1,2,3,4,5,6,7]:[0];
     for(const n of indexes){
      await page.click(`[data-open-article="d${id}-a${String(n+1).padStart(2,'0')}"]`);
      assert.equal(await page.$eval('dialog[open] h2',e=>e.textContent),d.short_articles[n].title);
      const article=d.short_articles[n];
      const actual=await page.$$eval(article.sections?'dialog[open] .reader-body>section>p':'dialog[open] .reader-body>p',es=>es.map(e=>e.textContent));assert.deepEqual(actual,article.paragraphs);
      if(article.sections){
       assert.deepEqual(await page.$$eval('dialog[open] .reader-body>section>h3',es=>es.map(e=>e.textContent)),article.sections.map(s=>s.heading));
       assert.equal(await page.$eval('dialog[open] .reader-body>p',e=>e.textContent),article.teaser);
       if(n===0)await page.screenshot({path:path.join(shots,`${lang}-d${id}-reader-${width}.png`)});
      }
      if(n===0){await page.click('dialog[open] [data-next]');assert.equal(new URL(page.url()).hash,`#d${id}-a02`);await page.click('dialog[open] [data-prev]');}
      await page.keyboard.press('Escape');await page.waitForSelector('body:not(.reader-open)');assert.equal(await page.$('dialog[open]'),null);
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.openArticle),`d${id}-a${String(n+1).padStart(2,'0')}`);
     }
     if(id===1||id===3||id===9||id===10)await page.screenshot({path:path.join(shots,`${lang}-d${id}-${width}.png`),fullPage:true});
    }
    await page.goto(`${base}${lang==='ar'?'ar/':''}domains/alldomains.html?lang=${lang}`,{waitUntil:'load'});
    assert.equal(await page.$$eval('.domain-link',es=>es.length),10);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(shots,`${lang}-index-${width}.png`),fullPage:true});
   }
  }
  // Preserve the exact selected article and activity through the existing language mechanism.
  await page.goto(base+'domains/d3.html?lang=he&activity=42#d3-a04',{waitUntil:'load'});
  assert.equal(await page.$eval('dialog[open]',e=>e.id),'d3-a04');
  // Header switch stays outside the modal; activate it programmatically so the
  // existing course-language handler still rewrites hash/activity into the target.
  await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.$eval('.course-lang-switch [data-course-language="ar"]',el=>el.click())]);
  assert.equal(new URL(page.url()).searchParams.get('activity'),'42');assert.equal(new URL(page.url()).hash,'#d3-a04');assert.equal(await page.$eval('dialog[open]',e=>e.id),'d3-a04');
  await page.keyboard.press('Escape');
  // Complete the real opening quiz, switching language after seven answers.
  await page.goto(base+'start/quiz.html?lang=he&activity=42',{waitUntil:'load'});await page.click('.cta-btn');
  for(let n=0;n<7;n++){await page.waitForSelector('.option:not(:disabled)');await page.click('.option');await new Promise(r=>setTimeout(r,330));}
  await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.click('[data-course-language="ar"]')]);
  assert.match(await page.$eval('#questionCounter',e=>e.textContent),/8/);
  for(let n=7;n<20;n++){await page.waitForSelector('.option:not(:disabled)');await page.click('.option');await new Promise(r=>setTimeout(r,330));}
  await page.waitForSelector('#resultScreen.active');
  const results=await page.$$eval('#domainsResult a',es=>es.map(e=>({path:new URL(e.href).pathname,name:e.querySelector('.name').textContent})));
  assert.equal(results.length,3);for(const r of results){const id=r.path.match(/d(\d+)\.html/)[1];assert.equal(r.name,read(`domains/content/ar/d${id}.json`).name)}
  await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.click('[data-course-language="he"]')]);await page.waitForSelector('#resultScreen.active');
  assert.deepEqual(await page.$$eval('#domainsResult a',es=>es.map(e=>new URL(e.href).pathname)),results.map(r=>r.path.replace('/ar/','/')));

  // Focused regression for the actual SDG workshop: all five stages, both layouts,
  // local field feedback, choice-specific drafts, and reload persistence.
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const workshopKey='portzot-sdg-workshop-he-v2';
  const field=async(id,value,event='input')=>page.$eval('#'+id,(e,v,ev)=>{e.value=v;e.dispatchEvent(new Event(ev,{bubbles:true}))},value,event);
  const action=async(selector)=>page.$eval(selector,e=>e.click());
  const stage=async(n)=>{
   assert.equal(await page.$eval('#stage-'+n,e=>e.hidden),false,'workshop stage '+n);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'workshop horizontal overflow '+n);
  };
  for(const width of [1440,390]){
   await page.setViewport({width,height:850,isMobile:width===390,hasTouch:width===390});
   await page.goto(base+'domains/sdg-goals.html',{waitUntil:'load'});
   await page.evaluate(k=>sessionStorage.removeItem(k),workshopKey);
   await page.reload({waitUntil:'load'});await stage(1);
   assert.equal(await page.$eval('body',e=>Number(getComputedStyle(e).zoom)),width===1440?.75:1);
   await action('[data-next="2"]');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'domain');
   assert.equal(await page.$eval('#domain',e=>e.getAttribute('aria-invalid')),'true');
   await field('domain','3','change');await field('personal','עומס לימודי');await field('shared','תלמידות נוספות');
   await action('[data-next="2"]');await stage(2);
   assert.equal(await page.$eval('#goal',e=>e.options.length),18);
   await action('[data-next="3"]');assert.equal(await page.evaluate(()=>document.activeElement.id),'goal');
   await field('goal','4','change');
   assert.equal(await page.$$eval('#reading-list .reading',es=>es.length),6);
   await page.$eval('#goal-image',e=>{e.loading='eager';return e.decode()});
   await action('#another-goal');assert.equal(await page.evaluate(()=>document.activeElement.id),'goal');
   await action('[data-next="3"]');await stage(3);
   await field('idea-statement-0','עומס מבחנים');await field('idea-statement-1','רעש בכיתה');await field('idea-statement-2','קושי לבקש עזרה');
   await action('[data-next="4"]');await stage(4);
   for(let i=0;i<3;i++)await field('compare-note-'+i,'חשוב לתלמידות ואפשר לחקור בבית הספר');
   await field('winner','0','change');await field('reason','בחרנו בעיה שמוכרת לנו');
   await action('[data-next="5"]');await stage(5);
   assert.equal(await page.$eval('#problem',e=>e.value),'עומס מבחנים');
   await field('problem','תלמידות מתקשות להתארגן בעומס מבחנים');await field('need','התארגנות נוחה');
   await action('[data-back="4"]');await field('winner','1','change');await field('reason','בעיה נוספת');
   await action('[data-next="5"]');await stage(5);assert.equal(await page.$eval('#problem',e=>e.value),'רעש בכיתה');await field('need','ריכוז בכיתה');
   await action('[data-back="4"]');await field('winner','0','change');await action('[data-next="5"]');
   assert.equal(await page.$eval('#need',e=>e.value),'התארגנות נוחה');
   await page.reload({waitUntil:'load'});await stage(5);
   assert.equal(await page.$eval('#problem',e=>e.value),'תלמידות מתקשות להתארגן בעומס מבחנים');
   await page.evaluate(()=>{window.print=()=>{window.__workshopPrinted=true}});
   await action('#print');assert.equal(await page.evaluate(()=>window.__workshopPrinted),true);
   assert.match(await page.$eval('#print-summary',e=>e.textContent),/התארגנות נוחה/);
   await page.screenshot({path:path.join(shots,'sdg-workshop-'+width+'.png'),fullPage:true});
  }
  console.log('PASS SDG workshop: desktop 75%, mobile layout, all stages, validation focus, draft restore, print summary.');

  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('PASS 20 domain pages and two indexes at desktop/mobile sizes; 160 readers, photos, links, focus, language/hash preservation; real quiz switch/resume/completion.');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
