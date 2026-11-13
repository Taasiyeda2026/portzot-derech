import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
export const ACTOR_A='11111111-1111-4111-8111-111111111111';
export const ACTOR_B='22222222-2222-4222-8222-222222222222';
export const ADMIN='33333333-3333-4333-8333-333333333333';
export const DISABLED='44444444-4444-4444-8444-444444444444';
export async function database(){
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;create schema extensions;create schema storage;create schema realtime;create schema net;create schema cron;
  create table auth.users(id uuid primary key);
  create table public.users(auth_user_id uuid,full_name text,name text,role text,is_active boolean);
  create table public.schools(id bigint primary key,school_name text,city text);
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create function extensions.gen_random_bytes(n int) returns bytea language sql as $$select decode(repeat(md5(random()::text),ceil(n/16.0)::int),'hex')$$;
  create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select null::void$$;
  create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$select 1::bigint$$;
  create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
  insert into auth.users values('${ACTOR_A}'),('${ACTOR_B}'),('${ADMIN}'),('${DISABLED}');
  insert into public.users values('${ACTOR_A}','עובדת בדיקה א','בדיקה א','employee',true),('${ACTOR_B}','מדריך בדיקה ב','בדיקה ב','instructor',true),('${ADMIN}','אדמין בדיקה','בדיקה','admin',true),('${DISABLED}','מושבת','מושבת','employee',false);
  insert into public.schools values(1,'בית ספר בדיקה','עיר בדיקה');
 `);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261113140437_pairing_group_reporting.sql',import.meta.url),'utf8'));
 for(const name of (await readdir(new URL('../../supabase/migrations/',import.meta.url))).filter(n=>(/_pairing_(early_close_manual_groups|admin_dashboard_delete)\.sql$/).test(n)).sort())await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));
 const rpc=async(action,actor=null,token=null,payload={})=>(await db.query('select public.pairing_rpc($1,$2,$3,$4) as value',[action,actor,token,JSON.stringify(payload)])).rows[0].value;
 return {db,rpc};
}
