// Real browser -> real Edge handler -> isolated PostgreSQL. Auth, Storage and
// the Realtime wire are local fixtures; no request is sent to production.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import pg from 'pg';
import { createHandler } from '../../supabase/functions/inspiration-game/handler.mjs';

const require = createRequire(new URL('../../package.json', import.meta.url));
const puppeteer = require('puppeteer');
const { WebSocketServer } = require('ws');
const root = fileURLToPath(new URL('../../', import.meta.url));
if (!process.env.INSPIRATION_DB_FIXTURE) throw new Error('Set INSPIRATION_DB_FIXTURE to the isolated fixture produced by db-integration.mjs.');
const fixture = JSON.parse(readFileSync(process.env.INSPIRATION_DB_FIXTURE, 'utf8'));
assert.equal(fixture.config.host, '127.0.0.1', 'Only a local isolated database is allowed');
assert.equal(fixture.config.database, 'inspiration_test');
const pool = new pg.Pool(fixture.config);
const base = 'http://localhost:4973';
const remote = 'https://szinlhjuwyiyszdpsdop.supabase.co/functions/v1/inspiration-game';
let checks = 0, browser, listener, server;
const socketServer = new WebSocketServer({ port: 0, host: '127.0.0.1' });
await new Promise(resolve => socketServer.once('listening', resolve));
const socketUrl = `ws://127.0.0.1:${socketServer.address().port}`;
const passed = label => { checks++; console.log(`PASS ${label}`); };
const jwt = id => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000) })).toString('base64url')}.local-test-signature`;
const authTokens = Object.fromEntries(Object.entries(fixture.ids).map(([name,id]) => [name,jwt(id)]));
let wireMessages = 0;
socketServer.on('connection', socket => {
  socket.topics = new Map();
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    const array = Array.isArray(message);
    const [joinRef,ref,topic,event] = array ? message : [message.join_ref,message.ref,message.topic,message.event];
    if (event === 'phx_join') socket.topics.set(topic,{ array,joinRef });
    if (event === 'phx_leave') socket.topics.delete(topic);
    if (['phx_join','phx_leave','heartbeat'].includes(event)) socket.send(JSON.stringify(array
      ? [joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]
      : {ref,topic,event:'phx_reply',payload:{status:'ok',response:{}}}));
  });
});
function broadcast(topic) {
  for (const socket of socketServer.clients) {
    const settings = socket.topics?.get(`realtime:${topic}`);
    if (!settings || socket.readyState !== 1) continue;
    const payload = {type:'broadcast',event:'invalidate',payload:{changed:true}};
    socket.send(JSON.stringify(settings.array
      ? [settings.joinRef,null,`realtime:${topic}`,'broadcast',payload]
      : {topic:`realtime:${topic}`,event:'broadcast',payload}));
    wireMessages++;
  }
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const media = new Map();
for (const group of fixture.groups) for (const card of group.cards) if (card.front_path) media.set(card.front_path,new Blob([png],{type:'image/png'}));
const gatewayClient = {
  auth:{getUser:async token => {
    const name = Object.keys(authTokens).find(name => authTokens[name] === token);
    return name ? {data:{user:{id:fixture.ids[name]}},error:null} : {data:null,error:{message:'invalid'}};
  }},
  rpc:async(name,args) => {
    try {
      const query = name === 'inspiration_rate_limit'
        ? await pool.query('select public.inspiration_rate_limit($1,$2) result',[args.p_key,args.p_limit])
        : await pool.query('select public.inspiration_rpc($1,$2,$3,$4::jsonb) result',[args.p_action,args.p_actor,args.p_token,JSON.stringify(args.p_payload)]);
      return {data:query.rows[0].result,error:null};
    } catch(error) { return {data:null,error}; }
  },
  storage:{getBucket:async id => ({data:{id,public:false},error:null}),from:bucket => ({
    download:async path => bucket === 'inspiration-cards' && media.has(path) ? {data:media.get(path),error:null} : {data:null,error:{message:'missing'}},
    upload:async(path,bytes,options) => {
      if (media.has(path)) return {error:{message:'exists'}};
      media.set(path,new Blob([bytes],{type:options.contentType}));
      await pool.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[bucket,path,JSON.stringify({mimetype:options.contentType})]);
      return {data:{path},error:null};
    },
  })},
};
const handler = createHandler({client:gatewayClient,allowedOrigins:[base]});
// HTTP transport preserves multipart file bytes from Chromium without asking
// CDP to serialize an uploaded file as text.
const gatewayServer=createServer(async(incoming,outgoing)=>{
  try {
    const chunks=[];for await(const chunk of incoming)chunks.push(chunk);
    const response=await handler(new Request(remote,{method:incoming.method,headers:{...incoming.headers,origin:base},...(incoming.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch{outgoing.writeHead(500);outgoing.end();}
});
gatewayServer.listen(0,'127.0.0.1');await new Promise(resolve=>gatewayServer.once('listening',resolve));
const gatewayUrl=`http://127.0.0.1:${gatewayServer.address().port}`;
async function request(action,payload={},token=null,actor='teacher') {
  const response = await handler(new Request(remote,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Authorization:`Bearer ${authTokens[actor]}`},body:JSON.stringify({action,payload,...(token?{token}:{})})}));
  const data = await response.json();
  if (!response.ok) throw new Error(`${action}: ${JSON.stringify(data)}`);
  return data;
}
const bodyText = page => page.$eval('body',node => node.innerText);
async function waitText(page,text) {await page.waitForFunction(text => document.body.innerText.includes(text),{timeout:15000},text);}
async function clickText(page,text) {await page.$$eval('button',(nodes,text) => {const node=nodes.find(node=>node.textContent.trim()===text);if(!node)throw new Error(`Button missing ${text}`);node.click();},text);}
async function localPage({actor,width=390,height=844}={}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({width,height,deviceScaleFactor:1});
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  const transport={offline:false};
  await page.evaluateOnNewDocument(({socketUrl,actor,authTokens,ids}) => {
    const BrowserWebSocket = window.WebSocket;
    window.WebSocket = class extends BrowserWebSocket {constructor(url,protocols){super(url.includes('.supabase.co/')?socketUrl:url,protocols);}};
    if(actor) {
      sessionStorage.setItem('inspiration-teacher-access',authTokens[actor]);
    }
  },{socketUrl,actor,authTokens,ids:fixture.ids});
  await page.setRequestInterception(true);
  page.on('request',async browserRequest => {
    try {
      if (browserRequest.url().startsWith(remote)) {
        if(transport.offline){await browserRequest.abort();return;}
        await browserRequest.continue({url:gatewayUrl});
      } else if(browserRequest.url().startsWith(base)||browserRequest.url().startsWith('blob:')||browserRequest.url().startsWith('data:')) await browserRequest.continue();
      else await browserRequest.abort();
    } catch(error) {failures.push(error.message);await browserRequest.abort().catch(()=>{});}
  });
  return {page,context,failures,transport};
}
async function noOverflow(page,label) {assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label);}
try {
  const migrationName=readdirSync(`${root}supabase/migrations`).find(name=>name.endsWith('_inspiration_game.sql'));
  await pool.query(readFileSync(`${root}supabase/migrations/${migrationName}`,'utf8'));
  await pool.query("insert into storage.buckets(id,name,public) values('inspiration-cards','inspiration-cards',false) on conflict(id) do nothing");
  // Add a local-only notification bridge to the Realtime stub in the fixture.
  await pool.query(`create or replace function realtime.browser_notify() returns trigger language plpgsql as $$begin perform pg_notify('inspiration_browser',new.topic);return new;end$$;
    drop trigger if exists browser_notify on realtime.test_events;
    create trigger browser_notify after insert on realtime.test_events for each row execute function realtime.browser_notify();`);
  listener = await pool.connect();await listener.query('listen inspiration_browser');listener.on('notification',message=>broadcast(message.payload));
  server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'4973',HOST:'127.0.0.1'},stdio:'ignore'});
  for(let attempt=0;;attempt++){try{const res=await fetch(`${base}/api/health`);if(res.ok)break;}catch{}if(attempt>30)throw new Error('Local server failed to start');await new Promise(resolve=>setTimeout(resolve,100));}
  browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const teacher=await localPage({actor:'teacher',width:1280,height:900});
  await teacher.page.goto(`${base}/inspiration/teacher.html`);await teacher.page.waitForSelector('#expected');
  await teacher.page.type('#expected','21');await clickText(teacher.page,'משחק חדש');await teacher.page.waitForSelector('.qr-wrap svg');
  const roomId=new URL(teacher.page.url()).searchParams.get('room');
  const state=await request('teacher.state',{room_id:roomId});
  assert.equal(state.room.expected,21);assert.equal(state.groups.filter(g=>g.size===2).length,9);assert.equal(state.groups.filter(g=>g.size===3).length,1);
  const joinLink=await teacher.page.$eval('.join-link',node=>node.textContent);
  assert.equal(new URL(joinLink).searchParams.get('code'),state.room.code);passed('teacher UI creates 21-person room, nine pairs/triple, QR join URL');
  const participant=await localPage();
  await participant.page.goto(joinLink);await participant.page.type('#player-name','בדיקת ממשק');await clickText(participant.page,'אני מצטרפת');await waitText(participant.page,'עוד רגע מגלות מי מחכה לכן!');
  assert.equal((await bodyText(participant.page)).includes('TEST woman'),false);
  const others=await Promise.all(Array.from({length:20},(_,i)=>request('participant.join',{code:state.room.code,join_key:randomUUID(),name:`מבודדת ${i}`})));
  await teacher.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='מתחילות לבחור קלפים'&&!b.disabled));
  await clickText(teacher.page,'מתחילות לבחור קלפים');await participant.page.waitForSelector('.card-back:not([disabled])');
  assert.equal(await participant.page.$$eval('.card-back',nodes=>nodes.length),21);passed('join, waiting, complete roster gate and Realtime phase update');
  const cardNumbers=await pool.query('select number,front_path from public.inspiration_room_cards where room_id=$1 order by number',[roomId]);
  // Use a genuine PDF generated by Chromium, then consumed by the game PDF.js worker.
  const printPage=await browser.newPage();await printPage.setContent('<h1>Isolated PDF card</h1>');
  const pdf=await printPage.pdf({format:'A5'});await printPage.close();
  const firstPath=cardNumbers.rows[0].front_path;
  const pdfPath=`test/${randomUUID()}.pdf`;media.set(pdfPath,new Blob([pdf],{type:'application/pdf'}));
  await pool.query('update public.inspiration_room_cards set back_path=$2 where room_id=$1 and number=1',[roomId,pdfPath]);
  await participant.page.click('[data-number="1"]');await waitText(participant.page,'איזו אישה מעוררת השראה קיבלת?');await participant.page.waitForSelector('.card-viewer img');
  assert.ok(media.has(firstPath));passed('phone card choice confirms persisted database assignment and private image viewer');
  await clickText(participant.page,'לצד השני');await participant.page.waitForSelector('.card-viewer canvas',{timeout:20000});passed('PDF.js canvas displays real PDF without browser download/print toolbar');
  const original=await participant.page.$eval('.personal-header h2',node=>node.textContent);
  await participant.page.reload();await waitText(participant.page,original);await participant.page.waitForSelector('.card-viewer img');
  assert.equal(await participant.page.$('#player-name'),null);passed('refresh restores the same participant and stored card');
  participant.transport.offline=true;
  assert.equal(await participant.page.evaluate(async()=>{
    const {api}=await import('./common.js');
    const saved=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key=>key.startsWith('inspiration:participant:'))));
    try{await api('participant.state',{}, {token:saved.token});return false;}catch{return true;}
  }),true);
  await waitText(participant.page,'אין חיבור כרגע');participant.transport.offline=false;
  await participant.page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await waitText(participant.page,'מעודכן');assert.ok((await bodyText(participant.page)).includes(original));passed('transport disconnect and reconnect preserve the selected card');
  await Promise.all(others.map((player,i)=>request('participant.claim',{number:i+2},player.token)));
  await teacher.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='עוברות למציאת החיבורים'&&!b.disabled));
  const complete=await request('teacher.state',{room_id:roomId});assert.equal(complete.stats.chosen,21);assert.equal(complete.stats.complete_groups,10);
  const saved=await participant.page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key=>key.startsWith('inspiration:participant:')))));
  const personal=await request('participant.state',{},saved.token);
  assert.equal(JSON.stringify(personal).includes('front_path'),false);assert.equal(personal.players,undefined);assert.equal(personal.groups,undefined);
  await clickText(teacher.page,'עוברות למציאת החיבורים');await waitText(participant.page,'עכשיו תורך למצוא את החיבור!');
  assert.equal((await bodyText(participant.page)).includes('מבודדת 1'),false);passed('21 selections, teacher map and independent classroom matching without peer names');
  await clickText(teacher.page,'ממשיכות למפצחות את הקוד');await waitText(participant.page,'מצאתן את החיבור? נהדר!');
  // Exercise even room while odd room is still active.
  const even=await request('teacher.create',{expected:20});
  const evenPlayers=await Promise.all(Array.from({length:20},(_,i)=>request('participant.join',{code:even.room.code,join_key:randomUUID(),name:`זוגית ${i}`})));
  await request('teacher.phase',{room_id:even.room.id,phase:'choosing'});
  await Promise.all(evenPlayers.map((player,i)=>request('participant.claim',{number:i+1},player.token)));
  for(const phase of ['matching','activity','ended'])await request('teacher.phase',{room_id:even.room.id,phase});
  assert.equal((await request('teacher.state',{room_id:roomId})).room.phase,'activity');passed('full 20-person even flow runs alongside odd room without state collisions');
  for(const width of [320,390,768,1280]){
    await participant.page.setViewport({width,height:900});await noOverflow(participant.page,`participant width ${width}`);
    await teacher.page.setViewport({width,height:900});await noOverflow(teacher.page,`teacher width ${width}`);
  }passed('participant and teacher layouts fit 320/390/768/1280px');
  participant.page.setViewport({width:390,height:844});
  teacher.page.on('dialog',dialog=>dialog.accept());await clickText(teacher.page,'סיום המשחק');await waitText(participant.page,'החיבור ממשיך איתך');
  assert.equal(await participant.page.$('.card-back'),null);assert.equal(await participant.page.$('.card-viewer'),null);
  assert.ok(wireMessages>5);passed('Realtime invalidations and final room lock reach participant screen');
  await teacher.page.evaluate(async roomId=>{
    sessionStorage.setItem('inspiration-teacher-access','expired-fixture');
    try{await (await import('./common.js')).api('teacher.state',{room_id:roomId});}catch{}
  },roomId);
  await teacher.page.waitForSelector('[data-login-panel]');assert.equal(new URL(teacher.page.url()).searchParams.get('room'),roomId);
  await teacher.page.evaluate(token=>sessionStorage.setItem('inspiration-teacher-access',token),authTokens.teacher);
  await teacher.page.reload();await waitText(teacher.page,'מפת הקלפים וההתאמות');passed('expired staff token returns to login while preserving the room and resumes after reauthentication');
  // Existing modules still served; their config and contents are checked separately.
  for(const path of ['strongermenu-2026.html','pairing/pairing.html','p.nativ/game/index.html','poster-builder/index.html']){
    const response=await fetch(`${base}/${path}`);assert.equal(response.status,200,path);
  }
  assert.deepEqual(teacher.failures,[]);assert.deepEqual(participant.failures,[]);passed('existing course entry points served and game pages have no JavaScript errors');
  const admin=await localPage({actor:'admin',width:390,height:844});
  await admin.page.goto(`${base}/inspiration/admin.html`);await admin.page.waitForSelector('#admin-workspace',{visible:true});
  const draftSymbol=`DRAFT-${randomUUID().slice(0,6)}`;
  await admin.page.type('#group-form [name=symbol]',draftSymbol);await admin.page.click('#group-form button[type=submit]');
  await waitText(admin.page,'קבוצת ההתאמה נשמרה.');
  const adminCatalog=await request('teacher.catalog',{},null,'admin');const draft=adminCatalog.groups.find(group=>group.symbol===draftSymbol);
  assert.ok(draft);assert.equal(draft.active,false);
  await admin.page.type('#card-form [name=name]',`TEST admin upload ${draftSymbol}`);await admin.page.type('#card-form [name=field]','בדיקה מבודדת');await admin.page.select('#card-group',draft.id);
  await admin.page.$eval('#card-form [name=front_file]',(input,pngBytes)=>{
    const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(pngBytes)],'test.png',{type:'image/png'}));input.files=dt.files;
  },Array.from(png));
  await admin.page.click('#card-form button[type=submit]');await waitText(admin.page,'הקלף נשמר.');
  const savedDraft=(await request('teacher.catalog',{},null,'admin')).groups.find(group=>group.id===draft.id);
  assert.equal(savedDraft.cards.length,1);assert.ok(media.has(savedDraft.cards[0].front_path));
  assert.equal((await pool.query('select 1 from storage.objects where name=$1',[savedDraft.cards[0].front_path])).rows.length,1);passed('admin draft group and real multipart PNG upload save through Edge and SQL');
  const importedSymbol=`JSON-${randomUUID().slice(0,6)}`;
  await admin.page.type('#import-text',JSON.stringify({groups:[{symbol:importedSymbol,size:2,active:false,cards:[]}]}));
  await admin.page.click('#import-form button[type=submit]');await waitText(admin.page,'הרשימה יובאה בהצלחה.');
  assert.ok((await request('teacher.catalog',{},null,'admin')).groups.some(group=>group.symbol===importedSymbol));
  for(const width of [320,390,768,1280]){await admin.page.setViewport({width,height:900});await noOverflow(admin.page,`admin width ${width}`);}
  assert.deepEqual(admin.failures,[]);passed('admin JSON import commits draft metadata and layout fits four viewports');
  console.log(`Browser integration: ${checks} checks passed. Auth/Storage/Realtime transport use local fixtures; actual SQL and Edge handler executed.`);
} finally {
  await browser?.close();server?.kill();
  await new Promise(resolve=>gatewayServer.close(resolve));
  for(const socket of socketServer.clients)socket.terminate();await new Promise(resolve=>socketServer.close(resolve));
  listener?.release();await pool.end();
}
