-- Staff activity: every currently active dashboard user may manage their own
-- Noshmot Hashra'a games, irrespective of their dashboard role.
-- The Edge Function verifies the Supabase Auth token and supplies p_actor.
-- Only the existing service_role may execute this RPC.
-- Existing room-owner checks and admin-only catalog writes are unchanged.
DO $migration$
DECLARE
  definition text;
  old_expression text := $old$select u.role, (u.role in ('admin','instructor') or coalesce(u.permissions->>'inspiration_manage','false')='true'),u.role='admin'$old$;
  new_expression text := $new$select u.role, u.is_active, u.role='admin'$new$;
BEGIN
  SELECT pg_get_functiondef('public.inspiration_rpc(text,uuid,text,jsonb)'::regprocedure)
    INTO definition;
  IF definition IS NULL OR position(old_expression IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected inspiration_rpc authorization definition; migration not applied';
  END IF;
  EXECUTE replace(definition, old_expression, new_expression);
END
$migration$;
