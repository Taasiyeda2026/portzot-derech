/** Real PostgreSQL integration and concurrent-connection tests.
 * Never connects to Supabase: starts and deletes its own loopback-only Docker DB.
 * npm install --prefix inspiration/tests; node inspiration/tests/db-integration.mjs
 * Optional INSPIRATION_TEST_DEPS selects an already-installed dependency directory.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const pg=process.env.INSPIRATION_TEST_DEPS
  ? await import(pathToFileURL(resolve(process.env.INSPIRATION_TEST_DEPS,'pg/lib/index.js')))
  : await import('pg');
const {Client}=pg.default||pg;
const container=`inspiration-test-${randomUUID()}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const clients=[];
let checks=0;
function passed(label){checks++;console.log(`PASS ${label}`);}
const ids={admin:randomUUID(),teacher:randomUUID(),other:randomUUID(),denied:randomUUID(),inactive:randomUUID(),explicit:randomUUID()};
let connection;
const sql=async(text,params=[])=>connection.query(text,params);
async function connect(){const c=new Client(config);await c.connect();clients.push(c);return c;}
const rpc=async(action,actor=null,token=null,payload={},c=connection)=>{
  if(action==='participant.join')payload={_rate_key:'test-rate-key-00000000000000000000000000000000',...payload};
  const {rows}=await c.query('select public.inspiration_rpc($1,$2,$3,$4::jsonb) as result',[action,actor,token,JSON.stringify(payload)]);
  return rows[0].result;
};
const failure=async(action,actor,token,payload,label)=>{
  await assert.rejects(()=>rpc(action,actor,token,payload));passed(label);
};
let config;
try{
  docker('run','--rm','-d','--name',container,'-e','POSTGRES_DB=inspiration_test','-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432','postgres:17-alpine');
  const port=Number(docker('port',container,'5432/tcp').split(':').at(-1));
  config={host:'127.0.0.1',port,user:'postgres',database:'inspiration_test'};
  for(let tries=0;;tries++){
    try{connection=await connect();break;}catch(e){if(tries===50)throw e;await new Promise(r=>setTimeout(r,200));}
  }
  await sql(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth; create schema storage; create schema realtime;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.users(auth_user_id uuid,role text,is_active boolean,permissions jsonb default '{}');
    create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    create table realtime.test_events(payload jsonb,event text,topic text,private boolean);
    create function realtime.send(payload jsonb,event text,topic text,private boolean default true) returns void language sql as $$insert into realtime.test_events values(payload,event,topic,private)$$;`);
  for(const [key,role,active,permissions] of [
    ['admin','admin',true,{}],['teacher','instructor',true,{}],['other','instructor',true,{}],['denied','finance',true,{}],['inactive','instructor',false,{}],['explicit','finance',true,{inspiration_manage:true}]
  ]){await sql('insert into auth.users values($1)',[ids[key]]);await sql('insert into public.users values($1,$2,$3,$4)',[ids[key],role,active,permissions]);}
  const migrationDir=resolve(root,'supabase/migrations');
  const migration=process.env.INSPIRATION_MIGRATION || (existsSync(migrationDir)
    ?resolve(migrationDir,readdirSync(migrationDir).find(n=>n.endsWith('_inspiration_game.sql'))||'missing')
    :'/workspace/work/inspiration-migration.sql');
  const migrationSql=readFileSync(migration,'utf8');
  await sql(migrationSql);
  passed('migration executes on PostgreSQL 17');
  // Applying again must be safe and must preserve existing data.
  await sql(migrationSql);
  passed('migration is repeatable');
  const tables=await sql("select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'inspiration_%'");
  assert.ok(tables.rows.length>=5);assert.ok(tables.rows.every(r=>r.relrowsecurity));
  for(const role of ['anon','authenticated']){
    assert.equal((await sql("select has_function_privilege($1,'public.inspiration_rpc(text,uuid,text,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed,false);
    for(const table of tables.rows){assert.equal((await sql('select has_table_privilege($1,$2,\'SELECT\') allowed',[role,`public.${table.relname}`])).rows[0].allowed,false);}
  }
  passed('all game tables use RLS and anon/authenticated cannot read tables or execute privileged RPC');
  await failure('teacher.me',null,null,{},'missing verified instructor denied');
  await failure('teacher.me',ids.denied,null,{},'finance role denied');
  await failure('teacher.me',ids.inactive,null,{},'inactive instructor denied');
  assert.ok(await rpc('teacher.me',ids.explicit));passed('explicit game permission accepted without global role changes');
  const missingBucket=await rpc('admin.catalog_validate',ids.admin);
  assert.ok(missingBucket.errors.some(e=>e.error==='BUCKET_MISSING'));
  await failure('teacher.create',ids.teacher,null,{expected:2},'room cannot start without private content bucket');
  passed('catalog validation reports missing private content bucket');
  await sql("insert into storage.buckets(id,name,public) values('inspiration-cards','inspiration-cards',true)");
  const publicBucket=await rpc('admin.catalog_validate',ids.admin);
  assert.ok(publicBucket.errors.some(e=>e.error==='BUCKET_NOT_PRIVATE'));
  await failure('teacher.create',ids.teacher,null,{expected:2},'room cannot start with public content bucket');
  passed('catalog validation rejects public content bucket');
  await sql("update storage.buckets set public=false where id='inspiration-cards'");
  const groups=[];
  for(let g=0;g<16;g++){
    const size=g===15?3:2;
    const group={id:randomUUID(),symbol:`TEST-${g}`,size,active:true,cards:[]};
    for(let i=0;i<size;i++){
      const path=`test/${randomUUID()}.png`;
      await sql("insert into storage.objects(bucket_id,name,metadata) values('inspiration-cards',$1,'{\"mimetype\":\"image/png\"}')",[path]);
      group.cards.push({id:randomUUID(),woman_name:`TEST woman ${g}-${i}`,field:'isolated test',front_path:path,back_path:null,active:true});
    }groups.push(group);
  }
  await rpc('admin.catalog_import',ids.admin,null,{groups});
  passed('approved catalog import with real storage metadata');
  await failure('admin.catalog_import',ids.teacher,null,{groups},'instructor cannot mutate content');
  const duplicateWoman=structuredClone(groups[0]);duplicateWoman.cards[1].woman_name='  '+duplicateWoman.cards[0].woman_name.toUpperCase()+'  ';
  await failure('admin.catalog_import',ids.admin,null,{groups:[duplicateWoman]},'duplicate active woman normalized by case and spaces rejected');
  await sql('insert into public.users values($1,$2,true,$3)',[ids.teacher,'finance',{}]);
  await failure('teacher.me',ids.teacher,null,{},'ambiguous active Auth mapping denied');
  await sql('delete from public.users where auth_user_id=$1 and role=$2',[ids.teacher,'finance']);
  const bad=structuredClone(groups[0]);bad.cards[0].front_path='missing.png';
  await failure('admin.catalog_import',ids.admin,null,{groups:[bad]},'catalog with missing private file rejected');
  const invalid=structuredClone(groups[0]);invalid.id=randomUUID();invalid.symbol='bad';invalid.cards.pop();
  await failure('admin.catalog_import',ids.admin,null,{groups:[invalid]},'incomplete group rejected');
  await failure('teacher.create',ids.teacher,null,{expected:1},'one participant rejected');
  await failure('teacher.create',ids.teacher,null,{expected:34},'capacity derives from approved groups');
  await failure('participant.join',null,null,{code:'invalid',join_key:randomBytes(24).toString('hex'),name:'א'},'invalid room join rejected');
  for(const count of [2,3,20,21,30,31]){
    const created=await rpc('teacher.create',ids.teacher,null,{expected:count});
    const room=created.room||created;
    assert.equal(room.expected,count);
    assert.ok(room.code&&room.realtime_topic);
    const teacherState=await rpc('teacher.state',ids.teacher,null,{room_id:room.id});
    assert.equal(teacherState.cards.length,count);
    assert.equal(teacherState.groups.filter(g=>g.size===3).length,count%2);
    assert.equal(teacherState.groups.filter(g=>g.size===2).length,count%2?(count-3)/2:count/2);
    assert.equal(new Set(teacherState.cards.map(c=>c.woman_name)).size,count);
    const joiners=[];
    for(let i=0;i<count;i++){
      const key=randomBytes(24).toString('hex');
      const joined=await rpc('participant.join',null,null,{code:room.code,join_key:key,name:'אותו שם'});
      assert.ok(joined.token);assert.ok(joined.player.id);
      joiners.push({key,...joined});
    }
    const replay=await rpc('participant.join',null,null,{code:room.code,join_key:joiners[0].key,name:'שם אחר'});
    assert.equal(replay.player.id,joiners[0].player.id);
    assert.equal((await rpc('teacher.state',ids.teacher,null,{room_id:room.id})).players.length,count);
    await failure('participant.join',null,null,{code:room.code,join_key:randomBytes(24).toString('hex'),name:'עוד אחת'},`room ${count}: over-capacity join rejected`);
    await failure('participant.claim',null,replay.token,{number:1},`room ${count}: choosing before phase rejected`);
    await rpc('teacher.phase',ids.teacher,null,{room_id:room.id,phase:'choosing'});
    const participants=joiners.map((p,i)=>({...p,token:i===0?replay.token:p.token}));
    for(let i=0;i<count;i++){
      await rpc('participant.claim',null,participants[i].token,{number:i+1});
      const mine=await rpc('participant.state',null,participants[i].token);
      assert.equal(mine.player.card.number,i+1);
      assert.equal(mine.players,undefined);assert.equal(mine.groups,undefined);assert.equal(mine.cards,undefined);
      assert.equal(mine.player.card.player_id,undefined);
    }
    const stable=await rpc('participant.state',null,participants[0].token);
    const repeated=await rpc('participant.claim',null,participants[0].token,{number:2});
    const restored=await rpc('participant.state',null,participants[0].token);
    assert.deepEqual(restored.player.card,stable.player.card);
    await failure('teacher.resize',ids.teacher,null,{room_id:room.id,expected:count},`room ${count}: resizing after first choice rejected`);
    const final=await rpc('teacher.state',ids.teacher,null,{room_id:room.id});
    assert.equal(final.players.filter(p=>p.number).length,count);
    await failure('teacher.state',ids.other,null,{room_id:room.id},`room ${count}: foreign instructor denied`);
    assert.ok(await rpc('teacher.state',ids.admin,null,{room_id:room.id}));
    await rpc('teacher.phase',ids.teacher,null,{room_id:room.id,phase:'matching'});
    assert.equal((await rpc('participant.state',null,participants[0].token)).room.phase,'matching');
    await rpc('teacher.phase',ids.teacher,null,{room_id:room.id,phase:'activity'});
    await rpc('teacher.phase',ids.teacher,null,{room_id:room.id,phase:'ended'});
    await failure('participant.claim',null,participants[0].token,{number:1},`room ${count}: ended choices locked`);
    await failure('participant.join',null,null,{code:room.code,join_key:randomBytes(24).toString('hex'),name:'עוד'},`room ${count}: ended joins locked`);
    passed(`${count} participants: full flow, correct pairs/triple, stable cards, duplicate names, replay, refresh, privacy, admin and owner authorization`);
  }
  // Real independent PG connections: deliberately hold winning claim transaction open.
  const raceCreated=await rpc('teacher.create',ids.teacher,null,{expected:2});const raceRoom=raceCreated.room||raceCreated;
  const raceP=[];for(let i=0;i<2;i++)raceP.push(await rpc('participant.join',null,null,{code:raceRoom.code,join_key:randomBytes(24).toString('hex'),name:`race ${i}`}));
  await rpc('teacher.phase',ids.teacher,null,{room_id:raceRoom.id,phase:'choosing'});
  const a=await connect(),b=await connect();await a.query('begin');
  await rpc('participant.claim',null,raceP[0].token,{number:1},a);
  let settled=false;
  const losing=rpc('participant.claim',null,raceP[1].token,{number:1},b).then(v=>({value:v}),error=>({error})).finally(()=>{settled=true;});
  await new Promise(r=>setTimeout(r,100));assert.equal(settled,false,'second connection waits for first transaction');
  await a.query('commit');const loser=await losing;assert.ok(loser.error,'only one player can claim card');
  const raceState=await rpc('teacher.state',ids.teacher,null,{room_id:raceRoom.id});assert.equal(raceState.players.filter(p=>p.number===1).length,1);
  await rpc('participant.claim',null,raceP[1].token,{number:2});
  passed('simultaneous same-card selection across independent PostgreSQL connections: second waits, one wins, loser can choose remaining card');
  // Two overlapping claims by the SAME player may only retain their original card.
  const duplicate=await Promise.all([rpc('participant.claim',null,raceP[0].token,{number:1},a),rpc('participant.claim',null,raceP[0].token,{number:2},b)]);
  assert.equal((await rpc('participant.state',null,raceP[0].token)).player.card.number,1);
  passed('simultaneous double click remains idempotent');
  await failure('participant.state',null,randomBytes(32).toString('hex'),{},'forged participation token denied');
  const eventRows=(await sql('select payload from realtime.test_events')).rows;
  assert.ok(eventRows.length>0);assert.ok(eventRows.every(r=>!JSON.stringify(r.payload).includes('TEST woman')&&!JSON.stringify(r.payload).includes('אותו שם')));
  passed('Realtime invalidations contain no names, cards or match maps');

  // Registration correction and manual allocation use the same database invariants.
  const editCreated=await rpc('teacher.create',ids.teacher,null,{expected:2});const editRoom=editCreated.room||editCreated;
  await failure('teacher.phase',ids.teacher,null,{room_id:editRoom.id,phase:'choosing'},'cannot start selection before expected registrations');
  await rpc('teacher.resize',ids.teacher,null,{room_id:editRoom.id,expected:3});
  assert.equal((await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id})).cards.length,3);
  await rpc('teacher.manual_join',ids.teacher,null,{room_id:editRoom.id,name:'ללא טלפון'});
  let edit=await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id});const manual=edit.players[0];
  await rpc('teacher.player_update',ids.teacher,null,{room_id:editRoom.id,player_id:manual.id,name:'שם מתוקן'});
  assert.equal((await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id})).players[0].name,'שם מתוקן');
  const removed=await rpc('participant.join',null,null,{code:editRoom.code,join_key:randomBytes(24).toString('hex'),name:'רישום שגוי'});
  await rpc('teacher.player_remove',ids.teacher,null,{room_id:editRoom.id,player_id:removed.player.id});
  await failure('participant.state',null,removed.token,{},'removed registration token invalidated');
  const editP=[];for(let i=0;i<2;i++)editP.push(await rpc('participant.join',null,null,{code:editRoom.code,join_key:randomBytes(24).toString('hex'),name:`edit ${i}`}));
  await rpc('teacher.phase',ids.teacher,null,{room_id:editRoom.id,phase:'choosing'});
  await rpc('teacher.manual_claim',ids.teacher,null,{room_id:editRoom.id,player_id:manual.id,number:1});
  await rpc('teacher.manual_claim',ids.teacher,null,{room_id:editRoom.id,player_id:manual.id,number:2});
  edit=await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id});assert.equal(edit.players.find(p=>p.id===manual.id).number,1);
  await failure('teacher.player_remove',ids.teacher,null,{room_id:editRoom.id,player_id:manual.id},'cannot remove chosen player silently');
  await rpc('participant.claim',null,editP[0].token,{number:2});await rpc('participant.claim',null,editP[1].token,{number:3});
  passed('resize before first choice, registration rename/removal and manual allocation preserve invariants');
  const ownAsset=await rpc('participant.asset',null,editP[0].token,{side:'front',room_id:raceRoom.id,player_id:raceP[0].player.id,number:1});
  const ownCard=(await rpc('participant.state',null,editP[0].token)).player.card;
  assert.equal(ownAsset.path,ownCard.front_path);
  passed('forged room/player/card asset identifiers cannot escape personal card');
  const teacherAsset=await rpc('teacher.asset',ids.teacher,null,{room_id:editRoom.id,number:2,side:'front'});assert.equal(teacherAsset.path,ownCard.front_path);
  await failure('teacher.asset',ids.other,null,{room_id:editRoom.id,number:2,side:'front'},'foreign instructor cannot view teacher card asset');
  const beforeEdit=(await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id})).cards;
  const triple=structuredClone(groups.at(-1));triple.cards[0].woman_name='TEST edited after room creation';
  await rpc('admin.catalog_import',ids.admin,null,{groups:[triple]});
  assert.deepEqual((await rpc('teacher.state',ids.teacher,null,{room_id:editRoom.id})).cards,beforeEdit);
  await rpc('admin.catalog_import',ids.admin,null,{groups:[groups.at(-1)]});
  passed('catalog edits cannot alter allocated room card snapshots or numbering');
  const disabled=structuredClone(groups.at(-1));disabled.active=false;
  await rpc('admin.catalog_import',ids.admin,null,{groups:[disabled]});
  await failure('teacher.create',ids.teacher,null,{expected:3},'odd room requires an approved active triple');
  assert.ok(await rpc('teacher.create',ids.teacher,null,{expected:2}));
  await rpc('admin.catalog_import',ids.admin,null,{groups:[groups.at(-1)]});
  passed('even rooms work while triple disabled');
  // Foreign-room participant FK is enforced even for a privileged SQL caller.
  await assert.rejects(()=>sql('update public.inspiration_room_cards set player_id=$1 where room_id=$2 and number=1',[editP[0].player.id,raceRoom.id]));
  passed('cross-room card assignment rejected by composite foreign key');
  const rateKey=`isolated-rate-${randomUUID()}`;
  for(let i=0;i<2;i++)assert.equal((await sql('select public.inspiration_rate_limit($1,$2) allowed',[rateKey,2])).rows[0].allowed,true);
  assert.equal((await sql('select public.inspiration_rate_limit($1,$2) allowed',[rateKey,2])).rows[0].allowed,false);
  assert.equal((await sql('select public.inspiration_rate_limit($1,$2) allowed',[rateKey,2])).rows[0].allowed,false);
  for(const role of ['anon','authenticated'])assert.equal((await sql("select has_function_privilege($1,'public.inspiration_rate_limit(text,integer)','EXECUTE') allowed",[role])).rows[0].allowed,false);
  passed('durable public-request rate counter remains blocked after denied attempts and cannot be called directly by clients');
  await sql("update public.inspiration_rooms set expires_at=now()-interval '31 days',ended_at=now()-interval '31 days' where id=$1",[editRoom.id]);
  await failure('participant.state',null,editP[0].token,{},'expired participant token rejected');
  const keptBefore=Number((await sql('select count(*) from public.inspiration_rooms where id<>$1',[editRoom.id])).rows[0].count);
  await rpc('admin.cleanup',ids.admin);
  assert.equal(Number((await sql('select count(*) from public.inspiration_room_players where room_id=$1',[editRoom.id])).rows[0].count),0);
  assert.equal(Number((await sql('select count(*) from public.inspiration_rooms')).rows[0].count),keptBefore);
  passed('30-day cleanup deletes expired personal data and keeps all other rooms');
  const deletedOwner=randomUUID();
  await sql('insert into auth.users values($1)',[deletedOwner]);
  await sql('insert into public.users values($1,$2,true,$3)',[deletedOwner,'instructor',{}]);
  const existingRooms=Number((await sql('select count(*) from public.inspiration_rooms')).rows[0].count);
  const owned=await rpc('teacher.create',deletedOwner,null,{expected:2});
  await sql('delete from auth.users where id=$1',[deletedOwner]);
  assert.equal(Number((await sql('select count(*) from public.inspiration_rooms where id=$1',[owned.room.id])).rows[0].count),0);
  assert.equal(Number((await sql('select count(*) from public.inspiration_rooms')).rows[0].count),existingRooms);
  passed('deleting dashboard Auth account cascades only its game rooms and cannot block account deletion');
  console.log(`\n${checks} PostgreSQL integration checks passed; all data was isolated.`);
  if(process.env.INSPIRATION_DB_FIXTURE)writeFileSync(process.env.INSPIRATION_DB_FIXTURE,JSON.stringify({config,ids,container,groups},null,2));
}finally{
  await Promise.allSettled(clients.map(c=>c.end()));
  if(!process.env.INSPIRATION_DB_FIXTURE)try{docker('rm','-f',container);}catch{}
}
