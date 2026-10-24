-- Inspiration game: additive, isolated, no changes to dashboard authentication.
-- Apply to the DASHBOARD project only, after review and explicit production approval.
begin;
create schema if not exists inspiration_private;
revoke all on schema inspiration_private from public, anon, authenticated;

create table if not exists public.inspiration_match_groups (
 id uuid primary key default gen_random_uuid(), symbol text not null check(length(btrim(symbol)) between 1 and 40),
 size integer not null check(size in (2,3)), active boolean not null default false,
 updated_at timestamptz not null default now()
);
create unique index if not exists inspiration_active_symbol on public.inspiration_match_groups(symbol) where active;
create unique index if not exists inspiration_one_active_triple on public.inspiration_match_groups(size) where active and size=3;
create table if not exists public.inspiration_cards (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.inspiration_match_groups(id),
 woman_name text not null check(length(btrim(woman_name)) between 1 and 150),
 field text not null default '' check(length(field)<=200), front_path text, back_path text,
 active boolean not null default false, updated_at timestamptz not null default now()
);
create index if not exists inspiration_cards_group on public.inspiration_cards(group_id);
create unique index if not exists inspiration_active_woman on public.inspiration_cards(lower(btrim(woman_name))) where active;
create table if not exists public.inspiration_rooms (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 owner_id uuid not null references auth.users(id) on delete cascade, expected integer not null check(expected>=2),
 phase text not null default 'waiting' check(phase in ('waiting','choosing','matching','activity','ended')),
 realtime_topic text not null unique, participation_secret text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '8 hours', ended_at timestamptz
);
create index if not exists inspiration_rooms_owner on public.inspiration_rooms(owner_id,created_at desc);
create index if not exists inspiration_rooms_expiry on public.inspiration_rooms(expires_at);
create table if not exists public.inspiration_room_players (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.inspiration_rooms(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60), token_hash text unique, join_hash text,
 manual boolean not null default false, created_at timestamptz not null default now(), last_seen timestamptz not null default now(),
 unique(room_id,id),unique(room_id,join_hash)
);
create table if not exists public.inspiration_room_cards (
 room_id uuid not null references public.inspiration_rooms(id) on delete cascade, number integer not null check(number>0),
 card_id uuid not null, group_id uuid not null, symbol text not null, group_size integer not null check(group_size in (2,3)),
 woman_name text not null, field text not null, front_path text, back_path text,
 player_id uuid, chosen_at timestamptz,
 primary key(room_id,number), unique(room_id,card_id),unique(room_id,player_id),
 foreign key(room_id,player_id) references public.inspiration_room_players(room_id,id)
);
create table if not exists public.inspiration_room_events (
 id bigint generated always as identity primary key, room_id uuid not null references public.inspiration_rooms(id) on delete cascade,
 actor_id uuid, event text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists inspiration_events_room on public.inspiration_room_events(room_id,created_at);
create table if not exists inspiration_private.rate_limits (
 key text primary key, window_start timestamptz not null, requests integer not null
);

-- No anonymous/authenticated table access: all traffic goes through the verified Edge gateway.
do $$ declare t text; begin
 foreach t in array array['inspiration_match_groups','inspiration_cards','inspiration_rooms','inspiration_room_players','inspiration_room_cards','inspiration_room_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
-- Existing dashboard defaults grant sequence UPDATE to public-facing roles.
-- Revoke explicitly: table RLS does not protect sequence operations.
revoke all on sequence public.inspiration_room_events_id_seq from public,anon,authenticated;
grant usage,select on sequence public.inspiration_room_events_id_seq to service_role;

create or replace function inspiration_private.hash(p_value text) returns text
language sql immutable strict set search_path='' as $$ select encode(sha256(convert_to(p_value,'UTF8')),'hex') $$;
create or replace function inspiration_private.secret() returns text
language sql volatile set search_path='' as $$ select encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex') $$;
create or replace function inspiration_private.check_rate(p_key text,p_limit integer) returns void
language plpgsql set search_path='' as $$
declare n integer; begin
 insert into inspiration_private.rate_limits as r(key,window_start,requests) values(p_key,date_trunc('minute',clock_timestamp()),1)
 on conflict(key) do update set requests=case when r.window_start=date_trunc('minute',clock_timestamp()) then r.requests+1 else 1 end,
 window_start=date_trunc('minute',clock_timestamp()) returning requests into n;
 if n>p_limit then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
end $$;
create or replace function inspiration_private.emit(p_room uuid) returns void
language plpgsql set search_path='' as $$
declare topic text; begin
 select realtime_topic into topic from public.inspiration_rooms where id=p_room;
 perform realtime.send('{"changed":true}'::jsonb,'invalidate',topic,false);
end $$;
create or replace function inspiration_private.catalog_errors() returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(e.error),'[]'::jsonb) from (
 select jsonb_build_object('error',case
   when exists(select 1 from storage.buckets where id='inspiration-cards') then 'BUCKET_NOT_PRIVATE'
   else 'BUCKET_MISSING' end) as error
 where not exists(select 1 from storage.buckets where id='inspiration-cards' and public is false)
 union all
 select jsonb_build_object('group_id',g.id,'symbol',g.symbol,'error','GROUP_INCOMPLETE') as error
 from public.inspiration_match_groups g where g.active and (
 (select count(*) from public.inspiration_cards c where c.group_id=g.id and c.active)<>g.size
 or exists(select 1 from public.inspiration_cards c where c.group_id=g.id and c.active and (
 (nullif(c.front_path,'') is null and nullif(c.back_path,'') is null)
 or (nullif(c.front_path,'') is not null and not exists(select 1 from storage.objects o where o.bucket_id='inspiration-cards' and o.name=c.front_path))
 or (nullif(c.back_path,'') is not null and not exists(select 1 from storage.objects o where o.bucket_id='inspiration-cards' and o.name=c.back_path))
 )))
 ) e
$$;
create or replace function inspiration_private.catalog() returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('groups',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('cards',coalesce((select jsonb_agg(to_jsonb(c) order by c.woman_name) from public.inspiration_cards c where c.group_id=g.id),'[]'::jsonb)) order by g.symbol) from public.inspiration_match_groups g),'[]'::jsonb),
 'capacity',jsonb_build_object('pairs',(select count(*) from public.inspiration_match_groups where active and size=2),'triples',(select count(*) from public.inspiration_match_groups where active and size=3),'max_even',(select count(*)*2 from public.inspiration_match_groups where active and size=2),'max_odd',(select case when exists(select 1 from public.inspiration_match_groups where active and size=3) then count(*)*2+3 else 0 end from public.inspiration_match_groups where active and size=2)),
 'errors',inspiration_private.catalog_errors())
$$;
create or replace function inspiration_private.allocate(p_room uuid,p_expected integer) returns void
language plpgsql set search_path='' as $$
declare pairs integer; triples integer; group_ids uuid[]; begin
 perform pg_advisory_xact_lock(619371,1);
 if p_expected<2 then raise exception 'INVALID_COUNT'; end if;
 if jsonb_array_length(inspiration_private.catalog_errors())>0 then raise exception 'CATALOG_INCOMPLETE'; end if;
 triples:=p_expected%2; pairs:=(p_expected-3*triples)/2;
 if pairs>(select count(*) from public.inspiration_match_groups where active and size=2) or triples>(select count(*) from public.inspiration_match_groups where active and size=3) then raise exception 'CAPACITY_EXCEEDED'; end if;
 select array_agg(id) into group_ids from (
 (select id from public.inspiration_match_groups where active and size=2 order by random() limit pairs)
 union all (select id from public.inspiration_match_groups where active and size=3 order by random() limit triples)) s;
 delete from public.inspiration_room_cards where room_id=p_room;
 insert into public.inspiration_room_cards(room_id,number,card_id,group_id,symbol,group_size,woman_name,field,front_path,back_path)
 select p_room,row_number() over(order by random())::integer,c.id,g.id,g.symbol,g.size,c.woman_name,c.field,c.front_path,c.back_path
 from public.inspiration_cards c join public.inspiration_match_groups g on g.id=c.group_id where g.id=any(group_ids) and c.active;
 if (select count(*) from public.inspiration_room_cards where room_id=p_room)<>p_expected then raise exception 'CATALOG_INCOMPLETE'; end if;
end $$;
create or replace function inspiration_private.room_json(p_room uuid) returns jsonb
language sql stable set search_path='' as $$ select jsonb_build_object('id',id,'code',code,'expected',expected,'phase',case when expires_at<=now() then 'ended' else phase end,'created_at',created_at,'expires_at',expires_at,'ended_at',ended_at,'realtime_topic',realtime_topic) from public.inspiration_rooms where id=p_room $$;
create or replace function inspiration_private.player_state(p_player uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('room',inspiration_private.room_json(p.room_id),'player',jsonb_build_object('id',p.id,'name',p.name,'card',(select jsonb_build_object('number',c.number,'woman_name',c.woman_name,'field',c.field,'symbol',c.symbol,'has_front',c.front_path is not null,'has_back',c.back_path is not null,'front_path',c.front_path,'back_path',c.back_path) from public.inspiration_room_cards c where c.room_id=p.room_id and c.player_id=p.id)),
 'taken',coalesce((select jsonb_agg(c.number order by c.number) from public.inspiration_room_cards c where c.room_id=p.room_id and c.player_id is not null),'[]'::jsonb))
 from public.inspiration_room_players p where p.id=p_player
$$;
create or replace function inspiration_private.teacher_state(p_room uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('room',inspiration_private.room_json(p_room),
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'manual',p.manual,'last_seen',p.last_seen,'number',c.number,'woman_name',c.woman_name,'symbol',c.symbol,'group_id',c.group_id) order by p.created_at) from public.inspiration_room_players p left join public.inspiration_room_cards c on c.room_id=p.room_id and c.player_id=p.id where p.room_id=p_room),'[]'::jsonb),
 'cards',coalesce((select jsonb_agg(jsonb_build_object('number',number,'woman_name',woman_name,'field',field,'symbol',symbol,'group_id',group_id,'player_id',player_id,'has_front',front_path is not null,'has_back',back_path is not null,'front_path',front_path,'back_path',back_path) order by number) from public.inspiration_room_cards where room_id=p_room),'[]'::jsonb),
 'groups',coalesce((select jsonb_agg(to_jsonb(s)) from (select group_id as id,symbol,max(group_size) as size,count(player_id)::integer as chosen from public.inspiration_room_cards where room_id=p_room group by group_id,symbol) s),'[]'::jsonb),
 'stats',jsonb_build_object('joined',(select count(*) from public.inspiration_room_players where room_id=p_room),'chosen',(select count(*) from public.inspiration_room_cards where room_id=p_room and player_id is not null),'remaining',(select count(*) from public.inspiration_room_cards where room_id=p_room and player_id is null),'complete_groups',(select count(*) from (select group_id from public.inspiration_room_cards where room_id=p_room group by group_id having count(player_id)=count(*)) s),'partial_groups',(select count(*) from (select group_id from public.inspiration_room_cards where room_id=p_room group by group_id having count(player_id)>0 and count(player_id)<count(*)) s)))
$$;

-- This is deliberately service-role-only. The Edge Function verifies Supabase Auth
-- and supplies p_actor; clients cannot impersonate actors by calling this RPC.
create or replace function public.inspiration_rpc(p_action text,p_actor uuid default null,p_token text default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.inspiration_rooms%rowtype; p public.inspiration_room_players%rowtype;
 actor_role text; can_manage boolean:=false; is_admin boolean:=false; result jsonb; g jsonb; c jsonb;
 rid uuid; pid uuid; gid uuid; cid uuid; n integer; token text; jhash text; v_phase text; cardno integer; asset text;
begin
 if p_action like 'teacher.%' or p_action like 'admin.%' then
  if (select count(*) from public.users where auth_user_id=p_actor and is_active=true)<>1 then raise exception 'FORBIDDEN'; end if;
  select u.role, (u.role in ('admin','instructor') or coalesce(u.permissions->>'inspiration_manage','false')='true'),u.role='admin'
   into actor_role,can_manage,is_admin from public.users u where u.auth_user_id=p_actor and u.is_active=true;
  if not coalesce(can_manage,false) then raise exception 'FORBIDDEN'; end if;
  if p_action like 'admin.%' and not coalesce(is_admin,false) then raise exception 'FORBIDDEN'; end if;
  perform inspiration_private.check_rate('actor:'||p_actor::text,600);
 end if;
 if p_action='teacher.me' then return jsonb_build_object('role',actor_role,'can_manage',can_manage,'is_admin',is_admin); end if;
 if p_action='admin.cleanup' then return jsonb_build_object('deleted_rooms',inspiration_private.cleanup()); end if;
 if p_action in ('teacher.catalog','admin.catalog','admin.catalog_validate') then return inspiration_private.catalog(); end if;
 if p_action in ('admin.catalog_save','admin.catalog_import') then
  perform pg_advisory_xact_lock(619371,1);
  if jsonb_typeof(p_payload->'groups')<>'array' or jsonb_array_length(p_payload->'groups')>500 then raise exception 'INVALID_CATALOG'; end if;
  for g in select value from jsonb_array_elements(p_payload->'groups') loop
   gid:=coalesce(nullif(g->>'id','')::uuid,gen_random_uuid());
   insert into public.inspiration_match_groups(id,symbol,size,active) values(gid,btrim(g->>'symbol'),(g->>'size')::integer,coalesce((g->>'active')::boolean,false))
    on conflict(id) do update set symbol=excluded.symbol,size=excluded.size,active=excluded.active,updated_at=now();
   if jsonb_typeof(g->'cards')<>'array' then raise exception 'INVALID_CATALOG'; end if;
   for c in select value from jsonb_array_elements(g->'cards') loop
    cid:=coalesce(nullif(c->>'id','')::uuid,gen_random_uuid());
    if exists(select 1 from public.inspiration_cards where id=cid and group_id<>gid) then raise exception 'CARD_GROUP_IMMUTABLE'; end if;
    -- Room snapshots retain immutable asset paths even when catalogue records change.
    insert into public.inspiration_cards(id,group_id,woman_name,field,front_path,back_path,active)
    values(cid,gid,btrim(c->>'woman_name'),coalesce(c->>'field',''),nullif(c->>'front_path',''),nullif(c->>'back_path',''),coalesce((c->>'active')::boolean,false))
    on conflict(id) do update set woman_name=excluded.woman_name,field=excluded.field,front_path=excluded.front_path,back_path=excluded.back_path,active=excluded.active,updated_at=now();
   end loop;
  end loop;
  if jsonb_array_length(inspiration_private.catalog_errors())>0 then raise exception 'CATALOG_INCOMPLETE'; end if;
  return inspiration_private.catalog();
 end if;
 if p_action='teacher.rooms' then return jsonb_build_object('rooms',coalesce((select jsonb_agg(inspiration_private.room_json(id) order by created_at desc) from public.inspiration_rooms where (owner_id=p_actor or is_admin) and expires_at>now()-interval '30 days'),'[]'::jsonb)); end if;
 if p_action='teacher.create' then
  n:=(p_payload->>'expected')::integer;
  insert into public.inspiration_rooms(code,owner_id,expected,realtime_topic,participation_secret) values(inspiration_private.secret(),p_actor,n,'inspiration:'||inspiration_private.secret(),inspiration_private.secret()) returning * into r;
  perform inspiration_private.allocate(r.id,n);
  insert into public.inspiration_room_events(room_id,actor_id,event) values(r.id,p_actor,'room_created');
  return inspiration_private.teacher_state(r.id);
 end if;
 if p_action='participant.join' then
  if coalesce(length(p_payload->>'_rate_key'),0)<32 then raise exception 'INVALID_REQUEST'; end if;
  perform inspiration_private.check_rate('join:'||(p_payload->>'_rate_key'),240);
  if coalesce(p_payload->>'join_key','')!~'^[A-Za-z0-9_-]{32,128}$' then raise exception 'INVALID_REQUEST'; end if;
  select * into r from public.inspiration_rooms where code=p_payload->>'code' for update;
  if not found or r.expires_at<=now() or r.phase='ended' then raise exception 'ROOM_UNAVAILABLE'; end if;
  jhash:=inspiration_private.hash(p_payload->>'join_key');
  token:=inspiration_private.hash(r.participation_secret||':'||(p_payload->>'join_key'));
  select * into p from public.inspiration_room_players where room_id=r.id and join_hash=jhash;
  if not found then
   if r.phase<>'waiting' then raise exception 'JOIN_CLOSED'; end if;
   if (select count(*) from public.inspiration_room_players where room_id=r.id)>=r.expected then raise exception 'ROOM_FULL'; end if;
   insert into public.inspiration_room_players(room_id,name,join_hash,token_hash) values(r.id,btrim(p_payload->>'name'),jhash,inspiration_private.hash(token)) returning * into p;
   perform inspiration_private.emit(r.id);
  end if;
  return inspiration_private.player_state(p.id)||jsonb_build_object('token',token);
 end if;
 if p_action like 'participant.%' then
  select * into p from public.inspiration_room_players where token_hash=inspiration_private.hash(p_token);
  if not found then raise exception 'PARTICIPATION_INVALID'; end if;
  select * into r from public.inspiration_rooms where id=p.room_id for update;
  if r.expires_at<=now() then raise exception 'ROOM_EXPIRED'; end if;
  perform inspiration_private.check_rate('player:'||p.id::text,180);
  update public.inspiration_room_players set last_seen=now() where id=p.id and last_seen<now()-interval '30 seconds';
  if p_action='participant.state' then return inspiration_private.player_state(p.id); end if;
  if p_action='participant.asset' then
   if r.phase='ended' then raise exception 'ROOM_UNAVAILABLE'; end if;
   select case when p_payload->>'side'='back' then back_path else front_path end into asset from public.inspiration_room_cards where room_id=r.id and player_id=p.id;
   if asset is null then raise exception 'ASSET_UNAVAILABLE'; end if;
   return jsonb_build_object('path',asset);
  end if;
  if p_action='participant.claim' then
   if r.phase<>'choosing' then raise exception 'CHOOSING_CLOSED'; end if;
   if not exists(select 1 from public.inspiration_room_cards where room_id=r.id and player_id=p.id) then
    cardno:=(p_payload->>'number')::integer;
    update public.inspiration_room_cards set player_id=p.id,chosen_at=now() where room_id=r.id and number=cardno and player_id is null;
    if not found then raise exception 'CARD_TAKEN'; end if;
    perform inspiration_private.emit(r.id);
   end if;
   return inspiration_private.player_state(p.id);
  end if;
  raise exception 'UNKNOWN_ACTION';
 end if;
 -- All remaining operations require a verified owner/admin and a locked room.
 if not coalesce(can_manage,false) then raise exception 'FORBIDDEN'; end if;
 rid:=(p_payload->>'room_id')::uuid;
 select * into r from public.inspiration_rooms where id=rid for update;
 if not found or (r.owner_id<>p_actor and not is_admin) then raise exception 'FORBIDDEN'; end if;
 if p_action='teacher.state' then return inspiration_private.teacher_state(r.id); end if;
 if r.phase='ended' or r.expires_at<=now() then raise exception 'ROOM_UNAVAILABLE'; end if;
 if p_action='teacher.asset' then
  select case when p_payload->>'side'='back' then back_path else front_path end into asset from public.inspiration_room_cards where room_id=r.id and number=(p_payload->>'number')::integer;
  if asset is null then raise exception 'ASSET_UNAVAILABLE'; end if;
  return jsonb_build_object('path',asset);
 end if;
 if p_action='teacher.resize' then
  n:=(p_payload->>'expected')::integer;
  if exists(select 1 from public.inspiration_room_cards where room_id=r.id and player_id is not null) then raise exception 'ALREADY_CHOSEN'; end if;
  if n<(select count(*) from public.inspiration_room_players where room_id=r.id) then raise exception 'COUNT_BELOW_JOINED'; end if;
  if r.phase not in ('waiting','choosing') then raise exception 'INVALID_PHASE'; end if;
  perform inspiration_private.allocate(r.id,n);
  update public.inspiration_rooms set expected=n,phase='waiting' where id=r.id;
 elsif p_action='teacher.phase' then
  v_phase:=p_payload->>'phase';
  if v_phase=r.phase then return inspiration_private.teacher_state(r.id); end if;
  if v_phase='choosing' and r.phase='waiting' then
   if (select count(*) from public.inspiration_room_players where room_id=r.id)<>r.expected then raise exception 'WAITING_FOR_PLAYERS'; end if;
  elsif v_phase='matching' and r.phase='choosing' then
   if (select count(*) from public.inspiration_room_cards where room_id=r.id and player_id is not null)<>r.expected then raise exception 'WAITING_FOR_CHOICES'; end if;
  elsif v_phase='activity' and r.phase='matching' then null;
  elsif v_phase='ended' then null;
  else raise exception 'INVALID_PHASE'; end if;
  update public.inspiration_rooms set phase=v_phase,ended_at=case when v_phase='ended' then now() else ended_at end where id=r.id;
 elsif p_action in ('teacher.player_update','teacher.player_remove','teacher.manual_join') then
  if r.phase<>'waiting' then raise exception 'REGISTRATION_LOCKED'; end if;
  if p_action='teacher.manual_join' then
   if (select count(*) from public.inspiration_room_players where room_id=r.id)>=r.expected then raise exception 'ROOM_FULL'; end if;
   insert into public.inspiration_room_players(room_id,name,manual) values(r.id,btrim(p_payload->>'name'),true);
  else
   pid:=(p_payload->>'player_id')::uuid;
   if exists(select 1 from public.inspiration_room_cards where room_id=r.id and player_id=pid) then raise exception 'ALREADY_CHOSEN'; end if;
   if p_action='teacher.player_update' then update public.inspiration_room_players set name=btrim(p_payload->>'name') where room_id=r.id and id=pid;
   else delete from public.inspiration_room_players where room_id=r.id and id=pid; end if;
   if not found then raise exception 'PLAYER_UNAVAILABLE'; end if;
  end if;
 elsif p_action='teacher.manual_claim' then
  if r.phase<>'choosing' then raise exception 'CHOOSING_CLOSED'; end if;
  pid:=(p_payload->>'player_id')::uuid;
  if not exists(select 1 from public.inspiration_room_players where id=pid and room_id=r.id and manual) then raise exception 'PLAYER_UNAVAILABLE'; end if;
  if not exists(select 1 from public.inspiration_room_cards where room_id=r.id and player_id=pid) then
   update public.inspiration_room_cards set player_id=pid,chosen_at=now() where room_id=r.id and number=(p_payload->>'number')::integer and player_id is null;
   if not found then raise exception 'CARD_TAKEN'; end if;
  end if;
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into public.inspiration_room_events(room_id,actor_id,event,details) values(r.id,p_actor,p_action,p_payload-'name'-'_rate_key');
 perform inspiration_private.emit(r.id);
 return inspiration_private.teacher_state(r.id);
end $$;

-- Separate preflight transaction: failed authentication/invalid joins still consume
-- the rate budget. Return false instead of raising so the counter always commits.
create or replace function public.inspiration_rate_limit(p_key text,p_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; begin
 if coalesce(length(p_key),0)<32 or p_limit not between 1 and 10000 then return false; end if;
 insert into inspiration_private.rate_limits as r(key,window_start,requests) values('edge:'||p_key,date_trunc('minute',clock_timestamp()),1)
 on conflict(key) do update set requests=case when r.window_start=date_trunc('minute',clock_timestamp()) then r.requests+1 else 1 end,
 window_start=date_trunc('minute',clock_timestamp()) returning requests into n;
 return n<=p_limit;
end $$;
revoke all on function public.inspiration_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.inspiration_rate_limit(text,integer) to service_role;

-- Personal names/tokens are erased after 30 days. Configure a daily scheduler after
-- production approval; the callable cleanup function is itself service-role-only.
create or replace function inspiration_private.cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint; begin
 delete from public.inspiration_rooms where coalesce(ended_at,expires_at)<now()-interval '30 days'; get diagnostics n=row_count;
 delete from inspiration_private.rate_limits where window_start<now()-interval '1 day'; return n;
end $$;
-- Schedule erasure when pg_cron is available. No extension is installed here.
-- On projects without pg_cron the deployment checklist requires an equivalent
-- daily service-role call to admin.cleanup before enabling classroom use.
do $$ begin
 if to_regclass('cron.job') is not null then
  if not exists(select 1 from cron.job where jobname='inspiration-retention') then
   perform cron.schedule('inspiration-retention','15 2 * * *','select inspiration_private.cleanup();');
  end if;
 else
  raise notice 'Required setup: schedule daily admin.cleanup for the 30-day retention policy';
 end if;
end $$;

revoke all on all functions in schema inspiration_private from public,anon,authenticated;
revoke all on function public.inspiration_rpc(text,uuid,text,jsonb) from public,anon,authenticated;
grant usage on schema inspiration_private to service_role;
grant execute on function public.inspiration_rpc(text,uuid,text,jsonb) to service_role;
grant execute on function inspiration_private.cleanup() to service_role;
commit;
