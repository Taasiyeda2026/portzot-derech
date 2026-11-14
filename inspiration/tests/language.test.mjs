import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const languageSource=await read('language.js');
const commonSource=(await read('common.js')).replace(/\bexport\s+/g,'').replaceAll('import.meta.url',"'https://portzot-derech.org/inspiration/common.js'");
const participantSource=(await read('participant.js')).replace(/^import .*;\n/,'');
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
async function harness(page='index.html',query='?code=ABCD&lang=he'){
  const html=(await read(page)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  const dom=new JSDOM(html,{url:'https://portzot-derech.org/inspiration/'+page+query,runScripts:'outside-only'});
  const w=dom.window;
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://portzot-derech.org/inspiration/language.js'}});
  w.eval(languageSource);
  await tick();
  return {dom,w,document:w.document,language:w.InspirationLanguage};
}

test('shared compact switch translates both ways without navigating or losing input, URL or room state',async()=>{
  const {dom,w,document:d,language:l}=await harness();
  try{
    d.querySelector('#app').innerHTML='<label>מה שמך?<input id="name" placeholder="השם הפרטי שלך"></label><div translate="no">שם</div>';
    d.querySelector('#name').value='שם';
    w.localStorage.setItem('inspiration:participant:ABCD','saved-token-and-choice');
    const logo=d.querySelector('.brand-logo').getAttribute('src');
    l.setLanguage('ar');await tick();
    assert.equal(d.documentElement.lang,'ar');
    assert.equal(d.querySelector('#name').value,'שם');
    assert.equal(d.querySelector('#name').placeholder,'اسمكِ الأول');
    assert.equal(d.querySelector('[translate="no"] div'),null);
    assert.equal(d.querySelector('#app div').textContent,'שם');
    assert.match(d.querySelector('#app label').textContent,/ما اسمكِ/);
    assert.equal(d.querySelector('.brand-logo').getAttribute('src'),logo);
    assert.equal(w.localStorage.getItem('inspiration:participant:ABCD'),'saved-token-and-choice');
    assert.equal(new URL(w.location.href).searchParams.get('code'),'ABCD');
    assert.equal(w.localStorage.getItem('portzot-derech-course-language'),'ar');
    d.querySelector('#app label').firstChild.nodeValue='מספר הקלף שלך';await tick();
    assert.equal(d.querySelector('#app label').firstChild.nodeValue,'رقم بطاقتكِ');
    l.setLanguage('he');await tick();
    assert.equal(d.querySelector('#name').placeholder,'השם הפרטי שלך');
    assert.equal(d.querySelector('#app label').firstChild.nodeValue,'מספר הקלף שלך');
    assert.equal(d.querySelector('#name').value,'שם');
  }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
});

test('every Arabic mapping exists, matches Hebrew filename case exactly, and unknown cards fall back explicitly',async()=>{
  const {dom,w,language:l}=await harness('index.html','?lang=ar');
  try{
    const files=JSON.parse(await read('cards/ar/manifest.json')).files;
    assert.equal(files.length,24);
    for(const filename of files){
      assert.ok((await stat(new URL('../cards/ar/'+filename,import.meta.url))).size>1000);
      assert.ok((await stat(new URL('../cards/women/'+filename,import.meta.url))).size>1000);
      assert.equal(l.assetUrl(filename),'https://portzot-derech.org/inspiration/cards/ar/'+filename);
    }
    assert.equal(l.assetFilename('adayonat.png'),'women/adayonat.png');
    assert.equal(l.hasArabic('adayonat.png'),false);
    l.setLanguage('he');assert.equal(l.assetFilename('ada.png'),'women/ada.png');
  }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
});

test('authorized participant flow switches artwork without repeating join, claim, verification or confirmation',async()=>{
  const {dom,w,document:d,language:l}=await harness();
  try{
    const calls=[],images=[],blobs=new Map();
    let phase='choosing',chosen=false,verified=false,confirmed=false,filename='ada.png';
    const state=()=>({room:{id:'fixture-room',phase,expected:2},player:{id:'p1',name:'ريم',card:chosen?{number:1,woman_name:'אדה לאבלייס',field:'מתמטיקה',has_front:true,has_back:false}:null},taken:[],progress:{group_size:2,verified,confirmed,hint:verified?'האם דמיון ודיוק הם הפכים, או שאולי דווקא השילוב ביניהם מאפשר ליצור משהו חדש?':null}});
    w.URL.createObjectURL=blob=>{const id='blob:fixture/'+blobs.size;blobs.set(id,blob);return id;};w.URL.revokeObjectURL=()=>{};
    w.fetch=async(url,options)=>{
      if(options?.method==='GET'){images.push(String(url));return new Response(new Blob(['fixture'],{type:'image/png'}),{headers:{'Content-Type':'image/png'}});}
      const data=JSON.parse(options.body);calls.push(data);
      if(data.action==='participant.join')return Response.json({token:'a'.repeat(64)});
      if(data.action==='participant.asset')return Response.json({site_asset:filename});
      if(data.action==='participant.claim')chosen=true;
      if(data.action==='participant.verify_match')verified=true;
      if(data.action==='participant.confirm_activity')confirmed=true;
      return Response.json(state());
    };
    w.eval(commonSource);w.eval(participantSource);await tick();
    const name=d.querySelector('#player-name');name.value='ريم';l.setLanguage('ar');await tick();
    assert.equal(name.value,'ريم');assert.equal(d.querySelector('button[type=submit]').textContent,'أنضمّ إلى اللعبة');
    d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
    d.querySelector('[data-number="1"]').click();await tick();
    assert.ok(images.at(-1).endsWith('/cards/ar/ada.png'));
    assert.equal(d.querySelector('.personal-header h2').textContent,'آدا لوفلايس');
    const saved=w.localStorage.getItem('inspiration:participant:ABCD');
    l.setLanguage('he');await tick();assert.ok(images.at(-1).endsWith('/cards/women/ada.png'));
    phase='matching';await w.eval('refresh()');await tick();
    const input=d.querySelector('.match-form input');input.value='2';l.setLanguage('ar');await tick();
    assert.equal(input.value,'2');assert.equal(d.querySelector('.hint-text'),null);
    d.querySelector('.match-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
    assert.equal(d.querySelector('.hint-text').hidden,true);
    d.querySelector('.hint-trigger').click();l.setLanguage('he');l.setLanguage('ar');await tick();
    assert.equal(d.querySelector('.hint-text').hidden,false);assert.match(d.querySelector('.hint-text').textContent,/الخيال/);
    d.querySelector('.hint-panel .actions button').click();await tick();
    assert.match(d.querySelector('#app').textContent,/نفكّ الشيفرة/);
    assert.equal(w.localStorage.getItem('inspiration:participant:ABCD'),saved);
    for(const action of ['join','claim','verify_match','confirm_activity'])assert.equal(calls.filter(c=>c.action==='participant.'+action).length,1);
    filename='adayonat.png';l.setLanguage('ar');await tick();
    assert.ok(images.at(-1).endsWith('/cards/women/adayonat.png'));
    assert.match(d.querySelector('.viewer-status').textContent,/النسخة العبرية/);
    l.setLanguage('he');await tick();assert.equal(d.querySelector('.viewer-status').textContent,'הצד הקדמי של הקלף');
    filename='../secret.png';const before=images.length;l.setLanguage('ar');await tick();
    assert.equal(images.length,before);assert.match(d.querySelector('.error-inline').textContent,/تعذّر تحميل/);
    w.dispatchEvent(new w.Event('pagehide'));
  }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
});

test('teacher management and gallery translate without resetting forms; Arabic search uses localized metadata',async()=>{
  for(const page of ['teacher.html','admin.html']){
    const {dom,w,document:d,language:l}=await harness(page,'?lang=ar');
    try{
      w.sessionStorage.setItem('inspiration-teacher-access','fixture-token');
      w.fetch=async(url,options)=>{
        const data=JSON.parse(options.body);
        if(data.action==='teacher.me')return Response.json({can_manage:true});
        if(data.action==='teacher.rooms')return Response.json({rooms:[]});
        if(data.action==='teacher.catalog')return Response.json({groups:[{cards:[{woman_name:'אדה לאבלייס',field:'מתמטיקה',front_path:'site:women/ada.png'}]}],capacity:{max_even:32,max_odd:33}});
        throw Error('Unexpected fixture action '+data.action);
      };
      w.eval(commonSource);
      let source=await read(page==='teacher.html'?'teacher.js':'admin.js');
      source=source.replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',"'https://portzot-derech.org/inspiration/admin.js'");
      w.eval(source);await tick();
      if(page==='teacher.html'){
        assert.equal(d.querySelector('h1').textContent,'إدارة الألعاب');
        d.querySelector('#expected').value='27';l.setLanguage('he');await tick();assert.equal(d.querySelector('#expected').value,'27');
      }else{
        assert.ok(d.querySelector('.gallery-artwork img').src.endsWith('/cards/ar/ada.png'));
        const search=d.querySelector('#card-search');search.value='آدا';search.dispatchEvent(new w.Event('input'));await tick();
        assert.equal(d.querySelectorAll('.gallery-card').length,1);
        l.setLanguage('he');await tick();assert.equal(search.value,'آدا');
      }
    }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
  }
});
