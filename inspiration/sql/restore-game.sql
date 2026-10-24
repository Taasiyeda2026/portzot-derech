-- Restore only the permissions and retention job removed by disable-game.sql.
-- Review and explicitly authorize before execution; no game data or assets change.
begin;
grant execute on function public.inspiration_rpc(text,uuid,text,jsonb) to service_role;
grant execute on function public.inspiration_rate_limit(text,integer) to service_role;
grant execute on function inspiration_private.cleanup() to service_role;
do $$
begin
 if to_regclass('cron.job') is not null then
  if not exists(select 1 from cron.job where jobname='inspiration-retention') then
   perform cron.schedule('inspiration-retention','15 2 * * *','select inspiration_private.cleanup();');
  end if;
 else
  raise notice 'Required before classroom use: configure equivalent daily service-role admin.cleanup for 30-day retention';
 end if;
end $$;
commit;
