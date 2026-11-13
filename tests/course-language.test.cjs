const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const pages = ['strongermenu-2026.html', 'start/quiz.html', 'domains/alldomains.html', ...Array.from({length:10},(_,i)=>`domains/d${i+1}.html`), ...['pairing','questionnaire','waiting','admin','matching'].map(x=>`pairing/${x}.html`)];
const read = p => fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function questions(file) {
 const text = read(file);
 return vm.runInNewContext(text.slice(text.indexOf('const questions = '), text.indexOf('\n];',text.indexOf('const questions = '))+3).replace('const questions = ','') );
}
test('pretranslated counterparts, bootstrap, shared assets, and script syntax',()=>{
 for (const page of pages) {
  for (const lang of ['', 'ar/']) {
   const file = lang+page, html=read(file);
   assert.match(html,new RegExp(`<html lang="${lang?'ar':'he'}" dir="rtl">`));
   if (!lang && page.startsWith('pairing/')) {
    // PR #325 replaces only the Hebrew pairing flow with the approved Supabase UI.
    // Do not redirect its room tokens into the independent legacy Firebase flow.
    assert.doesNotMatch(html,/course-language\.js|www\.gstatic\.com\/firebasejs/);
   } else {
    assert.equal((html.match(/data-course-language="ar"/g)||[]).length,1,file);
    assert.equal((html.match(/data-course-language="he"/g)||[]).length,1,file);
   }
   for(const m of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"?#]+)(?:[^\"]*)"/g)) {
    if (/^(https?:|data:|\/\/)/.test(m[1])) continue;
    // Media may be omitted by sparse checkouts; validate against git's tracked tree.
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1]));
    if(!fs.existsSync(path.join(__dirname,'..',target))) {
      cp.execFileSync('git',['cat-file','-e',`HEAD:${target}`],{stdio:'pipe'});
    }
   }
   for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!m[2].trim()) continue;
    const temp=path.join(require('node:os').tmpdir(),'portzot-syntax.mjs');
    fs.writeFileSync(temp,m[2]);
    cp.execFileSync(process.execPath,['--check',temp],{stdio:'pipe'});
   }
  }
 }
});
test('both questionnaires retain IDs, answer codes, order and scores',()=>{
 for(const page of ['start/quiz.html','pairing/questionnaire.html']) {
  const he=questions(page), ar=questions('ar/'+page);
  const structural=q=>JSON.parse(JSON.stringify(q,(k,v)=>['text','label','eyebrow'].includes(k)?undefined:v));
  assert.deepEqual(structural(ar),structural(he),page);
  assert.equal(he.length,page.startsWith('start/')?20:15);
 }
 const he=read('start/quiz.html'), ar=read('ar/start/quiz.html');
 assert.equal(he.match(/const normalization = (.*);/)[1],ar.match(/const normalization = (.*);/)[1]);
});
test('Arabic activity copy contains no Hebrew except language label and canonical matching metadata',()=>{
 for(const page of pages.filter(p=>p!=='strongermenu-2026.html')) {
  let html=read('ar/'+page).replace(/<!--[^]*?-->/g,'').replace(/<style[^]*?<\/style>/g,'').replace(/\/\/[^\n]*/g,'');
  html=html.replace(/<a[^>]*(?:data-course-language|data-reader-language)="he"[^>]*>עברית<\/a>/g,'');
  html=html.replace(/const groupDisplayText = .*;\n/,'');
  assert.doesNotMatch(html,/[\u0590-\u05ff]/,page);
 }
});
test('login, matching algorithm, and database configuration are unchanged',()=>{
 for(const file of ['index.html','js/pairing-algorithm.js','config/supabase-config.js','firestore.rules']) {
  assert.equal(read(file),cp.execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'}));
 }
});
