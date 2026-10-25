-- Accepted site:women/... paths are static files on the course GitHub Pages.
-- The game still validates all session and card authorizations in the RPC.
-- Unlike private Storage objects, these files are PUBLIC BY DESIGN.
create or replace function inspiration_private.catalog_errors() returns jsonb
language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(e.error),'[]'::jsonb) from (
    select jsonb_build_object('error',case
      when exists(select 1 from storage.buckets where id='inspiration-cards') then 'BUCKET_NOT_PRIVATE'
      else 'BUCKET_MISSING' end) as error
    where not exists(select 1 from storage.buckets where id='inspiration-cards' and public is false)
      and exists (
        select 1 from public.inspiration_cards c
        join public.inspiration_match_groups g on g.id=c.group_id
        where c.active and g.active and (
          (c.front_path is not null and c.front_path !~ '^site:women/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|pdf)$') or
          (c.back_path is not null and c.back_path !~ '^site:women/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|pdf)$')
        )
      )
    union all
    select jsonb_build_object('group_id',g.id,'symbol',g.symbol,'error','GROUP_INCOMPLETE') as error
    from public.inspiration_match_groups g where g.active and (
      (select count(*) from public.inspiration_cards c where c.group_id=g.id and c.active)<>g.size
      or exists(
        select 1 from public.inspiration_cards c where c.group_id=g.id and c.active and (
          (nullif(c.front_path,'') is null and nullif(c.back_path,'') is null)
          or (nullif(c.front_path,'') is not null and
               c.front_path !~ '^site:women/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|pdf)$' and
               not exists(select 1 from storage.objects o
                 where o.bucket_id='inspiration-cards' and o.name=c.front_path))
          or (nullif(c.back_path,'') is not null and
               c.back_path !~ '^site:women/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|pdf)$' and
               not exists(select 1 from storage.objects o
                 where o.bucket_id='inspiration-cards' and o.name=c.back_path))
        )
      )
    )
  ) e
$$;
