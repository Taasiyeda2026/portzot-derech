-- Instructor-controlled phase; participant-controlled matching verification, hint and confirmation.
-- Card artwork stays in GitHub; the canonical women and matching metadata stays in Supabase.
ALTER TABLE public.inspiration_match_groups
  ADD COLUMN IF NOT EXISTS hint text;
ALTER TABLE public.inspiration_room_players
  ADD COLUMN IF NOT EXISTS match_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS activity_confirmed_at timestamptz;

DO $seed$
DECLARE n integer;
BEGIN
  UPDATE public.inspiration_match_groups AS g
  SET hint = h.hint
  FROM (VALUES
    ('גביע', 'האם הכללים תמיד הוגנים לכולן? ומה קורה כשמישהי מחליטה לבדוק אותם?'),
    ('פלטת צבעים', 'לפעמים מה שכולם רואים הוא רק חלק קטן מהסיפור. מה אפשר לגלות כשמסתכלים מעבר לתדמית?'),
    ('לב', 'האם כוח נמדד רק ביכולת להמשיך, או גם ביכולת לדעת מתי לעצור ולבחור אחרת?'),
    ('כובע בוגרים', 'מה יכול להתחיל בהקשבה — ולהפוך לשינוי שאי אפשר להתעלם ממנו?'),
    ('שפירית', 'מה משתנה כשמישהי מגיעה למקום שבו לא ציפו לראות אותה?'),
    ('מצלמה', 'איך מזהים הזדמנות במקום שאחרים רואים בו רק קושי או צורך?'),
    ('אטום', 'מה עושים כשיש לך רעיון גדול, אבל כמעט אף אחד לא מאמין שהוא אפשרי?'),
    ('אוזניות', 'האם דמיון ודיוק הם הפכים, או שאולי דווקא השילוב ביניהם מאפשר ליצור משהו חדש?'),
    ('גלגל שיניים', 'מה קורה כשיש לך הידע והיכולת, אבל הדרך להכרה אינה פתוחה בפנייך?'),
    ('טיל', 'כמה ניסיונות נדרשים כדי להצליח? ומה מאפשר להמשיך גם כשעדיין אין תוצאות?'),
    ('זכוכית מגדלת', 'האם פרט קטן שאחרים פספסו יכול לשנות את התמונה כולה?'),
    ('תו מוזיקלי', 'הגעת לפסגה. ומה עכשיו? האם הצלחה גדולה יכולה להיות דווקא נקודת התחלה?'),
    ('מיקרופון', 'מאחורי כל הצלחה גדולה יש דברים שהקהל לא רואה. מה לדעתכן מתרחש מאחורי הקלעים?'),
    ('קלאפר קולנוע', 'כשאנחנו מסתכלות על תמונה או סיפור, איך נדע אם אנחנו רואות את כל האמת?'),
    ('שרביט ניצוח', 'מה יכול להשתנות כשמישהי חדשה מגיעה למקום שבו מתקבלות ההחלטות?'),
    ('כוכב', 'שלוש נשים, שלושה עולמות שונים. איך כל אחת מהן הצליחה לגרום לאחרים לחשוב מחדש על מה שאפשרי?')
  ) AS h(symbol,hint)
  WHERE g.symbol=h.symbol;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>16 THEN RAISE EXCEPTION 'Expected 16 matching groups; updated %',n; END IF;
END;
$seed$;

CREATE OR REPLACE FUNCTION inspiration_private.advance_player(
  p_action text, p_player uuid, p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $advance$
DECLARE
  p public.inspiration_room_players%rowtype;
  r public.inspiration_rooms%rowtype;
  own_card public.inspiration_room_cards%rowtype;
  raw_numbers jsonb;
  number_text text;
  supplied integer[];
  expected integer[];
BEGIN
  SELECT * INTO p FROM public.inspiration_room_players WHERE id=p_player FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTICIPATION_INVALID'; END IF;
  SELECT * INTO r FROM public.inspiration_rooms WHERE id=p.room_id FOR UPDATE;
  IF r.expires_at<=now() OR r.phase='ended' THEN RAISE EXCEPTION 'ROOM_UNAVAILABLE'; END IF;
  IF r.phase NOT IN ('matching','activity') THEN RAISE EXCEPTION 'INVALID_PHASE'; END IF;
  SELECT * INTO own_card FROM public.inspiration_room_cards
    WHERE room_id=p.room_id AND player_id=p.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_UNASSIGNED'; END IF;

  IF p_action='participant.verify_match' THEN
    IF p.match_verified_at IS NOT NULL THEN
      RETURN inspiration_private.player_state(p.id);
    END IF;
    raw_numbers:=p_payload->'numbers';
    IF jsonb_typeof(raw_numbers) IS DISTINCT FROM 'array'
       OR jsonb_array_length(raw_numbers) <> own_card.group_size-1 THEN
      RAISE EXCEPTION 'MATCH_INVALID_INPUT';
    END IF;
    FOR number_text IN SELECT value FROM jsonb_array_elements_text(raw_numbers)
    LOOP
      IF number_text !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'MATCH_INVALID_INPUT'; END IF;
    END LOOP;
    SELECT array_agg(value::integer ORDER BY value::integer) INTO supplied
      FROM jsonb_array_elements_text(raw_numbers);
    IF own_card.number=ANY(supplied)
       OR (SELECT count(distinct n) FROM unnest(supplied) AS n)<>own_card.group_size-1
       OR (SELECT count(*) FROM unnest(supplied) AS n WHERE n<1 OR n>r.expected)>0 THEN
      RAISE EXCEPTION 'MATCH_INVALID_INPUT';
    END IF;
    SELECT array_agg(number ORDER BY number) INTO expected
      FROM public.inspiration_room_cards
      WHERE room_id=p.room_id AND group_id=own_card.group_id
        AND number<>own_card.number AND player_id IS NOT NULL;
    IF cardinality(expected) IS DISTINCT FROM own_card.group_size-1 THEN
      RAISE EXCEPTION 'MATCH_NOT_READY';
    END IF;
    IF supplied IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'MATCH_INCORRECT';
    END IF;
    UPDATE public.inspiration_room_players SET match_verified_at=now() WHERE id=p.id;
    PERFORM inspiration_private.emit(p.room_id);
    RETURN inspiration_private.player_state(p.id);
  END IF;
  IF p_action='participant.confirm_activity' THEN
    IF p.match_verified_at IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_VERIFIED'; END IF;
    UPDATE public.inspiration_room_players
      SET activity_confirmed_at=COALESCE(activity_confirmed_at,now()) WHERE id=p.id;
    PERFORM inspiration_private.emit(p.room_id);
    RETURN inspiration_private.player_state(p.id);
  END IF;
  RAISE EXCEPTION 'UNKNOWN_ACTION';
END;
$advance$;
REVOKE ALL ON FUNCTION inspiration_private.advance_player(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
-- Service RPC calls helper internally; students never receive direct SQL permissions.

CREATE OR REPLACE FUNCTION inspiration_private.player_state(p_player uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $state$
  SELECT jsonb_build_object(
    'room',inspiration_private.room_json(p.room_id),
    'player',jsonb_build_object(
      'id',p.id,'name',p.name,
      'card',(SELECT jsonb_build_object(
        'number',c.number,'woman_name',c.woman_name,'field',c.field,
        'symbol',c.symbol,'has_front',c.front_path IS NOT NULL,'has_back',c.back_path IS NOT NULL,
        'front_path',c.front_path,'back_path',c.back_path)
       FROM public.inspiration_room_cards c
       WHERE c.room_id=p.room_id AND c.player_id=p.id)),
    'progress',jsonb_build_object(
      'verified',p.match_verified_at IS NOT NULL,
      'confirmed',p.activity_confirmed_at IS NOT NULL,
      'group_size',(SELECT c.group_size FROM public.inspiration_room_cards c WHERE c.room_id=p.room_id AND c.player_id=p.id),
      'hint',CASE WHEN p.match_verified_at IS NOT NULL
        THEN (SELECT g.hint FROM public.inspiration_room_cards c
          JOIN public.inspiration_match_groups g ON g.id=c.group_id
          WHERE c.room_id=p.room_id AND c.player_id=p.id)
        ELSE NULL END),
    'taken',COALESCE((SELECT jsonb_agg(c.number ORDER BY c.number)
       FROM public.inspiration_room_cards c WHERE c.room_id=p.room_id AND c.player_id IS NOT NULL),'[]'::jsonb))
  FROM public.inspiration_room_players p WHERE p.id=p_player;
$state$;

DO $patch$
DECLARE source text; marker text;
BEGIN
  source:=pg_get_functiondef('public.inspiration_rpc(text,uuid,text,jsonb)'::regprocedure);
  marker:='if p_action=''participant.state'' then return inspiration_private.player_state(p.id); end if;';
  IF strpos(source,marker)=0 OR strpos(source,'participant.verify_match')<>0 THEN
    RAISE EXCEPTION 'Unexpected inspiration_rpc version: migration aborted safely';
  END IF;
  source:=replace(source,marker,marker||E'\n  if p_action in (''participant.verify_match'',''participant.confirm_activity'') then return inspiration_private.advance_player(p_action,p.id,p_payload); end if;');
  EXECUTE source;
END;
$patch$;
