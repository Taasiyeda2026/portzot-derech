-- השלמת נתוני פיץ׳ חסרים מתוך poster_submissions, ללא דריסה של נתונים קיימים.
-- התאמה ראשית: poster_submissions.pitch_group_code = pitch_groups.group_code

with poster_source as (
  select
    ps.id as poster_id,
    ps.pitch_group_code,
    ps.created_at,
    coalesce(ps.poster_data->'contentValues', '{}'::jsonb) as cv,
    row_number() over (
      partition by ps.pitch_group_code
      order by ps.created_at desc, ps.id desc
    ) as rn
  from public.poster_submissions ps
  where ps.pitch_group_code is not null
), latest_poster as (
  select *
  from poster_source
  where rn = 1
), prepared as (
  select
    pg.id,
    pg.group_code,
    pg.data_json as old_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'project_name', nullif(trim(coalesce(pg.data_json->>'project_name', pg.project_name, lp.cv->>'projectName', '')), ''),
        'problem', nullif(trim(coalesce(pg.data_json->>'problem', lp.cv->>'problem', '')), ''),
        'audience', nullif(trim(coalesce(pg.data_json->>'audience', lp.cv->>'audience', '')), ''),
        'idea', nullif(trim(coalesce(pg.data_json->>'idea', lp.cv->>'solution', '')), ''),
        'solution', nullif(trim(coalesce(pg.data_json->>'solution', lp.cv->>'solution', '')), ''),
        'main_value', nullif(trim(coalesce(pg.data_json->>'main_value', lp.cv->>'value', '')), ''),
        'value', nullif(trim(coalesce(pg.data_json->>'value', lp.cv->>'value', '')), ''),
        'slogan', nullif(trim(coalesce(pg.data_json->>'slogan', lp.cv->>'slogan', '')), ''),
        'product_type', nullif(trim(coalesce(pg.data_json->>'product_type', lp.cv->>'productType', '')), ''),
        'step_1', nullif(trim(coalesce(pg.data_json->>'step_1', lp.cv->>'howItWorks_1', '')), ''),
        'step_2', nullif(trim(coalesce(pg.data_json->>'step_2', lp.cv->>'howItWorks_2', '')), ''),
        'step_3', nullif(trim(coalesce(pg.data_json->>'step_3', lp.cv->>'howItWorks_3', '')), ''),
        'feedback', nullif(trim(coalesce(pg.data_json->>'feedback', lp.cv->>'feedbackReceived', '')), ''),
        'improvement', nullif(trim(coalesce(pg.data_json->>'improvement', lp.cv->>'improvementsAfterFeedback', '')), '')
      )
    ) as next_json
  from public.pitch_groups pg
  join latest_poster lp
    on lp.pitch_group_code = pg.group_code
)
update public.pitch_groups pg
set data_json = p.next_json
from prepared p
where pg.id = p.id
  and p.next_json is distinct from p.old_json;

-- בדיקה אחרי הרצה:
-- select group_code, project_name, data_json from public.pitch_groups order by group_code;
