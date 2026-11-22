/* Focused spacing regression; run DOMAIN_INDEX_BASELINE=1 before editing CSS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'generated-artifacts/domains-index-height');
const baseline = process.env.DOMAIN_INDEX_BASELINE === '1';
const baselineFile = path.join(output, 'before.json');
const sizes = [[1366,768],[1920,1080],[390,844],[760,768],[761,768],[1366,600]];
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff':'font/woff','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err,data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
function measure() {
  const rect = e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,
      font:s.fontSize,lineHeight:s.lineHeight,padding:s.padding,margin:s.margin,
      color:s.color,background:s.backgroundImage,minHeight:s.minHeight};
  };
  const cards = [...document.querySelectorAll('.domain-link')];
  const content = cards.map(e => ({text:e.textContent,href:new URL(e.href).pathname,style:e.getAttribute('style')}));
  const text = [...document.querySelectorAll('.domain-copy strong,.domain-copy small,.index-intro h1,.index-intro p,.challenge-copy strong,.challenge-copy small')];
  const clipped = text.filter(e => {
    const r = e.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(e);
    return [...range.getClientRects()].some(t => t.left < r.left-1 || t.right > r.right+1 || t.bottom > r.bottom+1)
      || e.scrollHeight > e.clientHeight+1 || e.scrollWidth > e.clientWidth+1;
  }).map(e => e.textContent);
  return {height:document.documentElement.scrollHeight,scroll:Math.max(0,document.documentElement.scrollHeight-innerHeight),
    overflow:document.documentElement.scrollWidth>innerWidth, cards:cards.map(rect),content,
    text:text.map(e => ({text:e.textContent,...rect(e)})),clipped,
    intro:document.querySelector('.index-intro') ? rect(document.querySelector('.index-intro')) : null,
    cta:document.querySelector('.challenge-entry') ? rect(document.querySelector('.challenge-entry')) : null,
    main:rect(document.querySelector('main')),footer:rect(document.querySelector('footer'))};
}
(async () => {
  fs.mkdirSync(output,{recursive:true});
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  const browser = await puppeteer.launch({executablePath:process.env.CHROME_BIN || '/repl/tools/bin/chromium',
    headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page = await browser.newPage(), errors = [], result = {};
  const before = !baseline && fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile)) : null;
  page.on('pageerror', e => errors.push(e.message));
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register = () => Promise.resolve({});
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [width,height] of sizes) {
      await page.setViewport({width,height});
      for (const [lang,file] of [['he','domains/alldomains.html'],['ar','ar/domains/alldomains.html'],['he','domains/d1.html']]) {
        const key = `${file}-${width}x${height}`;
        await page.goto(`${base}/${file}?lang=${lang}`,{waitUntil:'load'});
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode())); });
        result[key] = await page.evaluate(measure);
        const m = result[key], changed = file === 'domains/alldomains.html' && width > 760;
        assert.equal(m.overflow,false,key+' horizontal overflow');
        if (!file.endsWith('/d1.html')) {
          assert.equal(m.cards.length,10);
          const rows = new Set(m.cards.map(c=>c.y));
          assert.equal(rows.size,width>760?5:10,key+' row count');
          for (let i=0;i<10;i++) {
            assert.equal(m.content[i].href,`/${lang==='ar'?'ar/':''}domains/d${i+1}.html`);
            if (width>760 && i%2===0) {
              assert.equal(m.cards[i].y,m.cards[i+1].y);
              assert(m.cards[i].x>m.cards[i+1].x,'RTL order');
            }
          }
          assert.deepEqual(m.clipped,[],key+' clipped text');
        }
        if (!baseline) {
          if (before) {
            if (!changed) assert.deepEqual(m,before[key],key+' unchanged layout');
            else {
              assert.deepEqual(m.content,before[key].content,key+' content preserved');
              assert.deepEqual(m.text.map(t=>[t.text,t.font,t.lineHeight,t.color]),
                before[key].text.map(t=>[t.text,t.font,t.lineHeight,t.color]),key+' typography preserved');
              assert(m.height<=before[key].height,key+' reduced height');
            }
          }
          if (changed && width>=1366 && height>=768) {
            assert(m.cards[9].bottom<=height,'all five rows visible');
            assert(m.cta.bottom<=height,'continuation fully visible');
            assert.equal(m.scroll,0,'no desktop scroll');
          }
        }
        if (file==='domains/alldomains.html' && [1366,1920,390].includes(width) && height!==600) {
          await page.screenshot({path:path.join(output,`${baseline?'before':'after'}-${width}x${height}.png`),fullPage:true});
        }
      }
    }
    if (!baseline) {
      await page.goto(`${base}/domains/alldomains.html?lang=he`,{waitUntil:'load'});
      const heights = [];
      for (const height of [1080,600,1080]) {
        await page.setViewport({width:1366,height});
        heights.push(await page.$eval('.domain-link',e=>e.offsetHeight));
      }
      assert(heights[1]<heights[0],'spacing responds to window height');
      assert.equal(heights[2],heights[0],'resizing restores spacing');
      await page.keyboard.press('Tab');
      await page.focus('.domain-link');
      assert.equal(await page.$eval('.domain-link',e=>getComputedStyle(e).outlineStyle),'solid','keyboard focus');
      await page.hover('.domain-link');
      await new Promise(r=>setTimeout(r,200));
      assert.notEqual(await page.$eval('.domain-link',e=>getComputedStyle(e).transform),'none','hover');
      await page.screenshot({path:path.join(output,'after-hover-focus.png')});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,baseline?'before.json':'after.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([k])=>k.startsWith('domains/alldomains')).map(([k,m])=>[k,{height:m.height,scroll:m.scroll,fifthRowBottom:m.cards[9].bottom,ctaBottom:m.cta.bottom}])),null,2));
    console.log('PASS index layout, RTL order, content, typography, overflow, responsive height and control-page comparisons');
  } finally {
    await browser.close();
    await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
