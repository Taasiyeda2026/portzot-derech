-- Show aggregate verification and independent continuation progress to the room owner.
-- Do not expose the group hint or any additional pair information to unverified students.
DO $patch$
DECLARE source text;
BEGIN
  source:=pg_get_functiondef('inspiration_private.teacher_state(uuid)'::regprocedure);
  IF strpos(source,'''last_seen'',p.last_seen,''number'',c.number')=0
     OR strpos(source,'''stats'',jsonb_build_object(''joined''')=0 THEN
    RAISE EXCEPTION 'Unexpected teacher_state definition: migration stopped';
  END IF;
  source:=replace(source,
    '''last_seen'',p.last_seen,''number'',c.number',
    '''last_seen'',p.last_seen,''verified'',p.match_verified_at IS NOT NULL,''continued'',p.activity_confirmed_at IS NOT NULL,''number'',c.number');
  source:=replace(source,
    '''stats'',jsonb_build_object(''joined''',
    '''stats'',jsonb_build_object(''verified'',(select count(*) from public.inspiration_room_players where room_id=p_room and match_verified_at IS NOT NULL),''continued'',(select count(*) from public.inspiration_room_players where room_id=p_room and activity_confirmed_at IS NOT NULL),''joined''');
  EXECUTE source;
END;
$patch$;
