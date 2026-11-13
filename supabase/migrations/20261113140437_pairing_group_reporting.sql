-- Pairing is isolated from Inspiration. No client role can read these tables
-- or call the gateway RPC; the Edge function verifies staff JWTs first.
create schema if not exists pairing_private;
revoke all on schema pairing_private from public,anon,authenticated;
grant usage on schema pairing_private to service_role;
create table public.pairing_policy (
 id boolean primary key default true check(id),
 retention_days integer check(retention_days between 1 and 3650),
 approved_by text,
 approved_at timestamptz,
 check(retention_days is null or (approved_by is not null and approved_at is not null))
);
insert into public.pairing_policy(id) values(true);
create table public.pairing_activities (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 instructor_name text not null,
 school_id bigint references public.schools(id),
 school text not null check(length(school) between 1 and 200),
 class_name text not null check(length(class_name) between 1 and 40),
 expected integer not null check(expected between 2 and 40),
 code text unique not null default encode(extensions.gen_random_bytes(16),'hex'),
 topic text unique not null default 'pairing:'||encode(extensions.gen_random_bytes(24),'hex'),
 phase text not null default 'collecting' check(phase in ('collecting','draft','published','closed')),
 groups jsonb not null default '[]',
 version integer not null default 0,
 created_at timestamptz not null default now(),
 activity_date date not null default (now() at time zone 'Asia/Jerusalem')::date,
 join_expires_at timestamptz not null default now()+interval '8 hours',
 retain_until timestamptz not null,
 published_at timestamptz,
 closed_at timestamptz
);
create index pairing_activities_owner_date on public.pairing_activities(owner_id,created_at desc);
create index pairing_activities_retention on public.pairing_activities(retain_until);
create table public.pairing_participants (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references public.pairing_activities(id) on delete cascade,
 token_hash text not null unique,
 name text not null check(length(name) between 1 and 100),
 answers jsonb,
 joined_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(activity_id,id)
);
create index pairing_participants_activity on public.pairing_participants(activity_id);
create table public.pairing_reports (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null unique references public.pairing_activities(id) on delete cascade,
 version integer not null,
 snapshot jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 status text not null default 'preparing' check(status in ('preparing','ready','sending','sent','failed','unknown')),
 claim uuid not null,
 updated_at timestamptz not null default now(),
 pdf_path text,
 sent_at timestamptz,
 reported_by uuid references auth.users(id),
 attempts integer not null default 0,
 history jsonb not null default '[]'
);
create table pairing_private.rate_limits(key text primary key, window_start timestamptz not null, requests integer not null);

alter table public.pairing_policy enable row level security;
alter table public.pairing_activities enable row level security;
alter table public.pairing_participants enable row level security;
alter table public.pairing_reports enable row level security;
revoke all on public.pairing_policy,public.pairing_activities,public.pairing_participants,public.pairing_reports from public,anon,authenticated;
grant all on public.pairing_policy,public.pairing_activities,public.pairing_participants,public.pairing_reports to service_role;
grant all on all tables in schema pairing_private to service_role;

create function public.pairing_rate_limit(p_key text,p_limit integer) returns boolean
language plpgsql set search_path='' as $$
declare n integer; begin
 insert into pairing_private.rate_limits as r values(p_key,date_trunc('minute',now()),1)
 on conflict(key) do update set requests=case when r.window_start=date_trunc('minute',now()) then r.requests+1 else 1 end,window_start=date_trunc('minute',now()) returning requests into n;
 return n<=p_limit;
end $$;
revoke all on function public.pairing_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.pairing_rate_limit(text,integer) to service_role;

create function pairing_private.validate_groups(p_activity uuid,p_groups jsonb) returns void
language plpgsql set search_path='' as $$
declare total integer; distinct_total integer; completed integer; g jsonb; begin
 if jsonb_typeof(p_groups)<>'array' or jsonb_array_length(p_groups)<1 then raise exception 'invalid_groups'; end if;
 for g in select value from jsonb_array_elements(p_groups) loop
  if jsonb_typeof(g->'members')<>'array' or jsonb_array_length(g->'members') not between 2 and 4 then raise exception 'invalid_groups'; end if;
 end loop;
 select count(*),count(distinct m.id) into total,distinct_total from jsonb_array_elements(p_groups) group_row cross join lateral jsonb_array_elements_text(group_row->'members') m(id);
 select count(*) into completed from public.pairing_participants where activity_id=p_activity and completed_at is not null;
 if completed<2 or total<>completed or distinct_total<>completed or exists(
  select 1 from jsonb_array_elements(p_groups) group_row cross join lateral jsonb_array_elements_text(group_row->'members') m(id)
  where not exists(select 1 from public.pairing_participants p where p.activity_id=p_activity and p.completed_at is not null and p.id::text=m.id)
 ) or exists(select 1 from public.pairing_participants where activity_id=p_activity and completed_at is null) then raise exception 'invalid_groups'; end if;
end $$;

create function pairing_private.named_groups(p_activity uuid,p_groups jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('groupNumber',n,'members',g->'members','memberNames',(
 select jsonb_agg(p.name order by m.n) from jsonb_array_elements_text(g->'members') with ordinality m(id,n) join public.pairing_participants p on p.id::text=m.id and p.activity_id=p_activity
 )) order by n),'[]') from jsonb_array_elements(p_groups) with ordinality x(g,n)
$$;

create function pairing_private.activity_json(p_id uuid) returns jsonb
language sql stable set search_path='' as $$
 select to_jsonb(a)-'groups' || jsonb_build_object('groups',pairing_private.named_groups(a.id,a.groups),
 'participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'completed',p.completed_at is not null) order by p.joined_at,p.id) from public.pairing_participants p where p.activity_id=a.id),'[]'),
 'report',(select jsonb_build_object('id',r.id,'status',case when r.status='sending' and r.updated_at<now()-interval '2 minutes' then 'unknown' else r.status end,'version',r.version,'sent_at',r.sent_at,'pdf_ready',r.pdf_path is not null) from public.pairing_reports r where r.activity_id=a.id))
 from public.pairing_activities a where a.id=p_id
$$;

create function public.pairing_rpc(p_action text,p_actor uuid default null,p_token text default null,p_payload jsonb default '{}') returns jsonb
language plpgsql set search_path='' as $$
declare a public.pairing_activities; p public.pairing_participants; r public.pairing_reports;
 staff public.users; n integer; days integer; g jsonb; snap jsonb; request_claim uuid; path text; entry jsonb;
begin
 if p_action like 'teacher.%' or p_action like 'admin.%' then
  if (select count(*) from public.users where auth_user_id=p_actor and is_active=true)<>1 then raise exception 'forbidden'; end if;
  select * into staff from public.users where auth_user_id=p_actor and is_active=true;
  if p_action like 'admin.%' and staff.role<>'admin' then raise exception 'forbidden'; end if;
 end if;
 if p_action='teacher.me' then
  return jsonb_build_object('name',coalesce(nullif(staff.full_name,''),staff.name),'is_admin',staff.role='admin','can_manage',true,'retention_days',(select retention_days from public.pairing_policy where id));
 elsif p_action='teacher.schools' then
  return jsonb_build_object('schools',coalesce((select jsonb_agg(s) from (select id,school_name,city from public.schools where school_name ilike '%'||left(coalesce(p_payload->>'query',''),80)||'%' order by school_name limit 50) s),'[]'));
 elsif p_action='teacher.activities' then
  return jsonb_build_object('activities',coalesce((select jsonb_agg(pairing_private.activity_json(id) order by created_at desc) from public.pairing_activities where (owner_id=p_actor or staff.role='admin') and retain_until>now()),'[]'));
 elsif p_action='teacher.create' then
  select retention_days into days from public.pairing_policy where id;
  if days is null then raise exception 'retention_not_configured'; end if;
  n:=(p_payload->>'expected')::integer;
  if n not between 2 and 40 or length(trim(p_payload->>'school')) not between 1 and 200 or length(trim(p_payload->>'class_name')) not between 1 and 40 then raise exception 'invalid_request'; end if;
  insert into public.pairing_activities(owner_id,instructor_name,school_id,school,class_name,expected,retain_until)
  values(p_actor,coalesce(nullif(staff.full_name,''),staff.name),nullif(p_payload->>'school_id','')::bigint,
   case when nullif(p_payload->>'school_id','') is not null then (select school_name from public.schools where id=(p_payload->>'school_id')::bigint) else trim(p_payload->>'school') end,
   trim(p_payload->>'class_name'),n,now()+make_interval(days=>days)) returning * into a;
  return pairing_private.activity_json(a.id);
 elsif p_action='participant.join' then
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select * into a from public.pairing_activities where code=p_payload->>'code' for update;
  if not found or a.retain_until<=now() then raise exception 'room_unavailable'; end if;
  select * into p from public.pairing_participants where activity_id=a.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if found then return jsonb_build_object('id',p.id,'activity_id',a.id,'completed',p.completed_at is not null); end if;
  if a.phase<>'collecting' or a.join_expires_at<=now() then raise exception 'room_closed'; end if;
  if (select count(*) from public.pairing_participants where activity_id=a.id)>=a.expected then raise exception 'room_full'; end if;
  if length(trim(p_payload->>'name')) not between 1 and 100 then raise exception 'invalid_request'; end if;
  insert into public.pairing_participants(activity_id,token_hash,name) values(a.id,encode(sha256(convert_to(p_token,'UTF8')),'hex'),trim(p_payload->>'name')) returning * into p;
  perform realtime.send('{"changed":true}'::jsonb,'invalidate',a.topic,false);
  return jsonb_build_object('id',p.id,'activity_id',a.id,'completed',false);
 elsif p_action like 'participant.%' then
  select * into p from public.pairing_participants where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'invalid_token'; end if;
  select * into a from public.pairing_activities where id=p.activity_id for update;
  if a.retain_until<=now() then raise exception 'room_unavailable'; end if;
  select * into p from public.pairing_participants where id=p.id for update;
  if p_action='participant.submit' then
   if p.completed_at is not null then return jsonb_build_object('completed',true); end if;
   if a.phase<>'collecting' or a.join_expires_at<=now() then raise exception 'room_closed'; end if;
   if jsonb_typeof(p_payload->'answers')<>'object' then raise exception 'invalid_answers'; end if;
   update public.pairing_participants set answers=p_payload->'answers',name=p_payload->'answers'->>'displayName',completed_at=now() where id=p.id;
   perform realtime.send('{"changed":true}'::jsonb,'invalidate',a.topic,false);
   return jsonb_build_object('completed',true);
  elsif p_action='participant.state' then
   g:=null;
   if a.published_at is not null then
    select value into g from jsonb_array_elements(pairing_private.named_groups(a.id,a.groups)) where value->'members' ? p.id::text;
   end if;
   return jsonb_build_object('room',jsonb_build_object('id',a.id,'phase',a.phase,'topic',a.topic),'participant',jsonb_build_object('id',p.id,'name',p.name,'completed',p.completed_at is not null),'group',case when g is null then null else g-'members' end);
  else raise exception 'invalid_request'; end if;
 end if;
 select * into a from public.pairing_activities where id=(p_payload->>'activity_id')::uuid for update;
 if not found or (a.owner_id<>p_actor and staff.role<>'admin') then raise exception 'forbidden'; end if;
 if a.retain_until<=now() then raise exception 'room_unavailable'; end if;
 if p_action='teacher.state' then return pairing_private.activity_json(a.id);
 elsif p_action='teacher.resize' then
  n:=(p_payload->>'expected')::integer;
  if a.phase<>'collecting' or n not between 2 and 40 or n<(select count(*) from public.pairing_participants where activity_id=a.id) then raise exception 'invalid_count'; end if;
  update public.pairing_activities set expected=n where id=a.id;
 elsif p_action='teacher.match_input' then
  if a.phase not in ('collecting','draft') then raise exception 'invalid_phase'; end if;
  if exists(select 1 from public.pairing_participants where activity_id=a.id and completed_at is null) or (select count(*) from public.pairing_participants where activity_id=a.id)<2 then raise exception 'incomplete'; end if;
  update public.pairing_activities set phase='draft' where id=a.id;
  return jsonb_build_object('version',a.version,'responses',(select jsonb_agg(answers||jsonb_build_object('id',id) order by joined_at,id) from public.pairing_participants where activity_id=a.id));
 elsif p_action='teacher.save' then
  if a.phase not in ('draft') or exists(select 1 from public.pairing_reports where activity_id=a.id) then raise exception 'invalid_phase'; end if;
  if a.version is distinct from (p_payload->>'version')::integer then raise exception 'stale_version'; end if;
  g:=p_payload->'groups'; perform pairing_private.validate_groups(a.id,g);
  update public.pairing_activities set groups=g,version=version+1 where id=a.id;
 elsif p_action='teacher.publish' then
  if a.phase not in ('draft','published') then raise exception 'invalid_phase'; end if;
  if a.version is distinct from (p_payload->>'version')::integer then raise exception 'stale_version'; end if;
  perform pairing_private.validate_groups(a.id,a.groups);
  update public.pairing_activities set phase='published',published_at=coalesce(published_at,now()) where id=a.id;
 elsif p_action='teacher.close' then
  update public.pairing_activities set phase='closed',closed_at=coalesce(closed_at,now()) where id=a.id;
 elsif p_action='teacher.report.prepare' then
  if a.published_at is null then raise exception 'not_published'; end if;
  perform pairing_private.validate_groups(a.id,a.groups);
  request_claim:=(p_payload->>'claim')::uuid;
  snap:=jsonb_build_object('instructor_name',a.instructor_name,'school',a.school,'class_name',a.class_name,'activity_date',a.activity_date,'participant_count',(select count(*) from public.pairing_participants where activity_id=a.id),'groups',pairing_private.named_groups(a.id,a.groups));
  insert into public.pairing_reports(activity_id,version,snapshot,created_by,claim) values(a.id,a.version,snap,p_actor,request_claim) on conflict(activity_id) do nothing;
  select * into r from public.pairing_reports where activity_id=a.id for update;
  if r.status='preparing' and r.claim<>request_claim then
   if r.updated_at>now()-interval '2 minutes' then raise exception 'busy'; end if;
   update public.pairing_reports set claim=request_claim,updated_at=now() where id=r.id returning * into r;
  end if;
  return to_jsonb(r);
 elsif p_action like 'teacher.report.%' or p_action='admin.report.resolve' then
  select * into r from public.pairing_reports where activity_id=a.id for update;
  if not found then raise exception 'report_missing'; end if;
  request_claim:=nullif(p_payload->>'claim','')::uuid;
  entry:=jsonb_build_object('at',now(),'actor',p_actor,'action',p_action);
  if p_action='teacher.report.ready' then
   if r.status<>'preparing' or r.claim<>request_claim then raise exception 'busy'; end if;
   path:=a.id::text||'/'||r.id::text||'.pdf';
   update public.pairing_reports set pdf_path=path,status='ready',updated_at=now(),history=history||jsonb_build_array(entry) where id=r.id;
  elsif p_action='teacher.report.claim_send' then
   if r.status not in ('ready','failed') then return jsonb_build_object('claimed',false,'status',r.status); end if;
   if r.attempts>=5 then raise exception 'rate_limited'; end if;
   update public.pairing_reports set status='sending',claim=request_claim,attempts=attempts+1,reported_by=p_actor,updated_at=now(),history=history||jsonb_build_array(entry) where id=r.id;
   return jsonb_build_object('claimed',true);
  elsif p_action='teacher.report.finish' then
   if r.status<>'sending' or r.claim<>request_claim or p_payload->>'status' not in ('sent','failed','unknown') then raise exception 'busy'; end if;
   update public.pairing_reports set status=p_payload->>'status',sent_at=case when p_payload->>'status'='sent' then now() else null end,updated_at=now(),history=history||jsonb_build_array(entry||jsonb_build_object('status',p_payload->>'status')) where id=r.id;
  elsif p_action='teacher.report.get' then return to_jsonb(r);
  elsif p_action='admin.report.resolve' then
   if r.status not in ('unknown','sending') or r.updated_at>now()-interval '2 minutes' or p_payload->>'status' not in ('sent','failed') or length(coalesce(p_payload->>'verification',''))<10 then raise exception 'invalid_request'; end if;
   update public.pairing_reports set status=p_payload->>'status',sent_at=case when p_payload->>'status'='sent' then now() else null end,updated_at=now(),history=history||jsonb_build_array(entry||jsonb_build_object('verification',left(p_payload->>'verification',500),'status',p_payload->>'status')) where id=r.id;
  else raise exception 'invalid_request'; end if;
  return (select to_jsonb(x) from public.pairing_reports x where id=r.id);
 else raise exception 'invalid_request'; end if;
 perform realtime.send('{"changed":true}'::jsonb,'invalidate',a.topic,false);
 return pairing_private.activity_json(a.id);
end $$;
revoke all on all functions in schema pairing_private from public,anon,authenticated;
grant execute on all functions in schema pairing_private to service_role;
revoke all on function public.pairing_rpc(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pairing_rpc(text,uuid,text,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pairing-reports','pairing-reports',false,5242880,array['application/pdf']) on conflict(id) do nothing;
-- Cleanup is called daily by the dedicated function; Storage API deletes objects
-- first, then the activity and cascading private data. No SQL storage deletion.

create table pairing_private.runtime (
 id boolean primary key default true check(id),
 cleanup_secret text not null default encode(extensions.gen_random_bytes(32),'hex')
);
insert into pairing_private.runtime(id) values(true);
revoke all on pairing_private.runtime from public,anon,authenticated;
grant select on pairing_private.runtime to service_role;
create function public.pairing_cleanup_auth(p_secret text) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from pairing_private.runtime where cleanup_secret=p_secret)
$$;
revoke all on function public.pairing_cleanup_auth(text) from public,anon,authenticated;
grant execute on function public.pairing_cleanup_auth(text) to service_role;
create function pairing_private.cleanup_tick() returns void
language plpgsql security definer set search_path='' as $$
begin
 perform net.http_post(
  url:='https://szinlhjuwyiyszdpsdop.supabase.co/functions/v1/pairing-groups',
  headers:=jsonb_build_object('Content-Type','application/json','x-pairing-cleanup-secret',(select cleanup_secret from pairing_private.runtime where id)),
  body:='{"action":"admin.cleanup","payload":{}}'::jsonb,timeout_milliseconds:=60000
 );
 delete from pairing_private.rate_limits where window_start<now()-interval '1 day';
end $$;
revoke all on function pairing_private.cleanup_tick() from public,anon,authenticated;
select cron.schedule('pairing-private-retention','35 2 * * *','select pairing_private.cleanup_tick()');
