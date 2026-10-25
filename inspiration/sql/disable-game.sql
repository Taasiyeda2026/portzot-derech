-- Emergency disable for the Inspiration module only.
-- Execute through the approved migration/SQL process after explicit authorization.
-- Keeps every game row, private bucket, asset and dashboard/Auth setting intact.
-- Blocks new gateway RPC calls; an operation already in progress may complete.
begin;
do $$
declare inspiration_job record;
begin
 if to_regclass('cron.job') is not null then
  for inspiration_job in select jobid from cron.job where jobname='inspiration-retention' loop
   perform cron.unschedule(inspiration_job.jobid);
  end loop;
 end if;
end $$;
revoke execute on function public.inspiration_rpc(text,uuid,text,jsonb) from service_role;
revoke execute on function public.inspiration_rate_limit(text,integer) from service_role;
revoke execute on function inspiration_private.cleanup() from service_role;
commit;
