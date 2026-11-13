/* Executes the real inline activity scripts with a small DOM and Firestore test
   double. No requests or writes are sent to production Firebase. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
class Element {
 constructor(){this.style={};this.children=[];this.dataset={};this.handlers={};this.value='';this.textContent='';this.disabled=false;this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,b)=>b?this.classes.add(x):this.classes.delete(x)};}
 set className(v){this.classes=new Set(v.split(' '))} get className(){return [...this.classes].join(' ')}
 set innerHTML(v){this.html=v;this.children=[]}get innerHTML(){return this.html||''}
 appendChild(e){this.children.push(e)} replaceChildren(...es){this.children=es}
 addEventListener(k,f){this.handlers[k]=f}setAttribute(k,v){this[k]=v}focus(){}animate(){return {cancel(){}}}closest(){return this}
}
function load(file,{session=storage(),local=storage(),search='?session=test',firebase={},extra=''}={}){
 const html=read(file), elements=new Map(), events={},timers=[];
 const get=k=>{if(!elements.has(k))elements.set(k,new Element());return elements.get(k)};
 const ctx={console,URL,URLSearchParams,Date,Math,JSON,crypto:webcrypto,sessionStorage:session,localStorage:local,location:{search,href:'',hash:''},document:{getElementById:get,querySelector:get,querySelectorAll:sel=>sel==='.option'?get('optionsContainer').children:[],createElement:()=>new Element()},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},matchMedia:()=>({matches:true}),scrollTo:()=>{},addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k],...firebase};
 ctx.window=ctx;vm.createContext(ctx);
 for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(!m[2].trim()||m[2].includes('serviceWorker'))continue;
  const script=m[2].replace(/import \{[^}]*\} from '[^']*';/g,'');vm.runInContext(script,ctx);
 }
 if(extra)vm.runInContext(extra,ctx);
 return {ctx,get,session,local,pagehide:()=>events.pagehide?.(),flush:()=>{let n=0;while(timers.length){if(++n>200)throw Error('timer loop');timers.shift()()}}};
}
function firestore(){
 const data={instructors:{test:{}},sessions:{},responses:{},pairings:{}};const listeners=[];
 const snap=r=>({id:r.id,exists:()=>!!data[r.name]?.[r.id],data:()=>data[r.name]?.[r.id]});
 const notify=()=>listeners.forEach(({ref,fn})=>fn(snap(ref)));
 return {data,api:{initializeApp:()=>({}),getFirestore:()=>({_settings:{}}),doc:(db,name,id)=>({name,id}),collection:(db,name)=>({name}),where:(field,op,value)=>({field,op,value}),query:(ref,...filters)=>({...ref,filters}),getDoc:async ref=>snap(ref),getDocs:async ref=>{const rows=Object.entries(data[ref.name]).filter(([id,v])=>ref.filters.every(f=>v[f.field]===f.value)).map(([id,v])=>({id,data:()=>v}));return {empty:!rows.length,docs:rows,forEach:fn=>rows.forEach(fn)}},setDoc:async(ref,value)=>{data[ref.name][ref.id]=value;notify()},increment:n=>({increment:n}),updateDoc:async(ref,value)=>{for(const[k,v]of Object.entries(value))data[ref.name][ref.id][k]=v?.increment?(data[ref.name][ref.id][k]||0)+v.increment:v;notify()},deleteDoc:async ref=>delete data[ref.name][ref.id],onSnapshot:(ref,fn)=>{const l={ref,fn};listeners.push(l);fn(snap(ref));return()=>listeners.splice(listeners.indexOf(l),1)}}};
}
test('opening quiz resumes across languages, finishes and preserves tie-ranked results',()=>{
 const opts={extra:'window.quizTest={getAnswers:()=>answers,getResults:()=>JSON.parse(sessionStorage.getItem(quizDraftKey)).results,getQuestion:()=>currentQuestion};'};
 let a=load('start/quiz.html',opts);a.ctx.showQuiz();
 for(let i=0;i<7;i++){a.ctx.selectOption(i%4);a.flush()}
 const chosen=JSON.stringify(a.ctx.quizTest.getAnswers());
 let b=load('ar/start/quiz.html',{...opts,session:a.session});assert.equal(b.ctx.quizTest.getQuestion(),7);assert.equal(JSON.stringify(b.ctx.quizTest.getAnswers()),chosen);
 for(let i=7;i<20;i++){b.ctx.selectOption(i%4);b.flush()}
 const results=JSON.stringify(b.ctx.quizTest.getResults());assert.equal(JSON.parse(results).length,3);
 let c=load('start/quiz.html',{...opts,session:b.session});assert.equal(JSON.stringify(c.ctx.quizTest.getResults()),results);assert.equal(c.get('resultScreen').classList.contains('active'),true);
});
test('legacy Arabic pairing retains mixed-script names, answer codes and meeting recovery',async()=>{
 const db=firestore(),opts={firebase:db.api};
 let admin=load('ar/pairing/admin.html',opts);admin.get('instructorCode').value='test';admin.get('participantCount').value='3';await admin.ctx.startActivity();
 const id=Object.keys(db.data.sessions)[0];assert.ok(id);admin.pagehide();
 admin=load('ar/pairing/admin.html',{...opts,session:admin.session});assert.equal(admin.get('trackingScreen').classList.contains('active'),true);assert.equal(Object.keys(db.data.sessions).length,1);
 const responseLocals=[];
 for(const [file,name]of [['ar/pairing/questionnaire.html','נועה'],['ar/pairing/questionnaire.html','ليان'],['ar/pairing/questionnaire.html','سارة']]){
  let a=load(file,{...opts,search:'?session='+id});a.get('textAnswer').value=name;await a.get('nextBtn').handlers.click();
  for(let i=1;i<15;i++){
   const option=a.get('options').children[0];a.get('options').handlers.click({target:option});
   if(i===4){a.pagehide();a=load(file,{...opts,session:a.session,local:a.local,search:'?session='+id});assert.equal(a.get('options').children[0].classList.contains('active'),true);}
   await a.get('nextBtn').handlers.click();
  }
  a.flush();assert.equal(a.ctx.location.href,'waiting.html?session='+id);responseLocals.push(a.local);
 }
 const rs=Object.values(db.data.responses);assert.equal(rs.length,3);assert.equal(db.data.sessions[id].completedCount,3);
 const codes=r=>Object.fromEntries(Object.entries(r).filter(([k])=>k.endsWith('Code')));assert.deepEqual(codes(rs[0]),codes(rs[1]));assert.deepEqual(codes(rs[1]),codes(rs[2]));
 // Execute the repository's unchanged shared algorithm, not a replacement.
 const alg=vm.createContext({crypto:webcrypto,Date});vm.runInContext(read('js/pairing-algorithm.js').replaceAll('export ',''),alg);
 const shared={generateGroups:r=>alg.generateGroups(r),getGroupStats:g=>alg.getGroupStats(g)};
 let m=load('ar/pairing/matching.html',{firebase:{...db.api,...shared},search:'?session='+id});await m.ctx.runMatching();
 const groups=db.data.pairings[id].groups;assert.equal(groups.length,1);assert.equal(groups[0].members.length,3);
 assert.match(m.get('results').innerHTML,/المجموعات/);assert.doesNotMatch(m.get('results').innerHTML,/יש לכן|גבוהה|טובה/);
 for(let i=0;i<3;i++){
  const waiting=load('ar/pairing/waiting.html',{...opts,search:'?session='+id,local:responseLocals[i]});
  assert.equal(waiting.get('resultScreen').classList.contains('show'),true);assert.match(waiting.get('partnerName').innerHTML,/נועה/);assert.match(waiting.get('partnerName').innerHTML,/ليان/);
 }
});
test('language bootstrap preserves every parameter and hash, scopes routes and supports blocked storage',()=>{
 const script=read('js/course-language.js');
 function run(path,saved,fail=false){let target;const loc=new URL('https://test.example/course/'+path);loc.replace=v=>target=v;const l=storage();if(saved)l.setItem('portzot-derech-course-language',saved);if(fail)l.getItem=l.setItem=()=>{throw Error('blocked')};const c={URL,URLSearchParams,location:loc,localStorage:l,document:{currentScript:{src:'https://test.example/course/js/course-language.js'},addEventListener:()=>{}}};vm.runInNewContext(script,c);return target}
 assert.equal(run('pairing/questionnaire.html?session=abc&activity=7&tag=1&tag=2#q4','ar'),'https://test.example/course/ar/pairing/questionnaire.html?session=abc&activity=7&tag=1&tag=2&lang=ar#q4');
 assert.equal(run('ar/domains/d1.html?lang=he&session=2#fatigue','ar'),'https://test.example/course/domains/d1.html?lang=he&session=2#fatigue');
 assert.equal(run('index.html','ar'),undefined);assert.equal(run('idea/idea-to-product.html','ar'),undefined);assert.equal(run('ar/start/quiz.html',null,true),undefined);
});
