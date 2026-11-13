const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const he=Array.from({length:10},(_,i)=>json(`domains/content/he/d${i+1}.json`));
const ar=Array.from({length:10},(_,i)=>json(`domains/content/ar/d${i+1}.json`));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
test('all Hebrew source content is preserved byte-for-byte at the data level',()=>{
 const hash=crypto.createHash('sha256').update(JSON.stringify(he)).digest('hex');
 assert.equal(hash,'62068c2a85e6003f7cc73410ad43c1bed4ac5eafd5bb6541d767ee15dcc3d5ec');
 assert.equal(he.flatMap(d=>d.short_articles).length,80);
 assert.equal(he.flatMap(d=>d.reflection_questions).length,40);
});
test('Arabic has complete matching structure, IDs and source references',()=>{
 const ids=new Set();
 he.forEach((d,i)=>{
  const a=ar[i];assert.equal(a.id,d.id);assert.equal(a.slug,d.slug);
  assert.deepEqual(a.sources,d.sources);
  assert.equal(a.main_article.sections.length,d.main_article.sections.length);
  assert.equal(a.short_articles.length,8);assert.equal(a.reflection_questions.length,4);
  a.main_article.sections.forEach((s,n)=>assert.equal(s.paragraphs.length,d.main_article.sections[n].paragraphs.length));
  a.short_articles.forEach((s,n)=>{assert.equal(s.id,d.short_articles[n].id);assert.deepEqual(s.source_ids,d.short_articles[n].source_ids);assert.equal(s.paragraphs.length,d.short_articles[n].paragraphs.length);assert(!ids.has(s.id));ids.add(s.id)});
  const texts=[a.name,a.intro,a.main_article.title,...a.main_article.sections.flatMap(s=>[s.heading,...s.paragraphs]),...a.short_articles.flatMap(s=>[s.title,s.teaser,...s.paragraphs]),...a.reflection_questions];
  for(const t of texts){assert.match(t,/[\u0600-\u06ff]/);assert.doesNotMatch(t,/[\u0590-\u05ff]/)}
 });
});
test('all articles, questions and eight readers are rendered in both languages',()=>{
 for(const [lang,ds]of [['he',he],['ar',ar]])for(const d of ds){
  const html=read(`${lang==='ar'?'ar/':''}domains/d${d.id}.html`);
  for(const text of [d.name,d.intro,d.main_article.title,...d.main_article.sections.flatMap(s=>[s.heading,...s.paragraphs]),...d.short_articles.flatMap(a=>[a.title,...a.paragraphs]),...d.reflection_questions])assert(html.includes(esc(text)),`${lang} ${d.slug}: missing content`);
  assert.equal((html.match(/data-open-article=/g)||[]).length,8);
  assert.equal((html.match(/<dialog /g)||[]).length,8);
  assert.equal((html.match(/class="reflection"/g)||[]).length,1);
  assert.doesNotMatch(html,/data-unlock-content|scroll-lock\.js|tailwind/);
 }
});
test('complete natural card summaries have similar lengths',()=>{
 const summaries=json('domains/content/card-teasers.he.json');
 assert.equal(summaries.length,10);
 for(const row of summaries){assert.equal(row.length,8);for(const t of row){assert(t.length>=39&&t.length<=49,`${t.length}: ${t}`);assert.doesNotMatch(t,/…|\.\.\./)}}
 for(const d of ar)for(const a of d.short_articles){const t=a.card_teaser||a.teaser;assert(t.length>=39&&t.length<=49,`${a.id}: ${t.length}`);assert.doesNotMatch(t,/…|\.\.\./)}
});
test('every hero and article has a verified local image and license attribution',()=>{
 const m=json('domains/images/2027/manifest.json');
 for(const d of he){
  const p=m.domains[d.id];assert(p);assert.equal(Object.keys(p.articles).length,8);
  for(const image of [p.hero,...d.short_articles.map(a=>p.articles[a.id])]){
   assert(image);assert(image.credit);assert(image.alt);assert.match(image.source_url,/^https:\/\//);assert.match(image.license_url,/^https:\/\//);
   assert(fs.existsSync(path.join(root,image.path)),image.path);
   assert(fs.statSync(path.join(root,image.path)).size>3000,image.path);
  }
 }
});
test('opening quiz changes only displayed domain names/colors',()=>{
 const strip=s=>s.replace(/const domains = \[[\s\S]*?\n    \];/,'const domains = [];').trim();
 for(const p of ['start/quiz.html','ar/start/quiz.html']){
  const before=cp.execFileSync('git',['show',`HEAD:${p}`],{cwd:root,encoding:'utf8'});
  assert.equal(strip(read(p)),strip(before),p);
 }
});
test('rendering is reproducible and does not change unrelated files',()=>{
 const pages=['domains/alldomains.html','ar/domains/alldomains.html',...he.flatMap(d=>[`domains/${d.slug}.html`,`ar/domains/${d.slug}.html`])];
 const before=pages.map(read);cp.execFileSync('python3',['scripts/build-domains.py'],{cwd:root});assert.deepEqual(pages.map(read),before);
});
