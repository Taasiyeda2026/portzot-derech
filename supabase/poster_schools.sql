-- ── poster_schools table ────────────────────────────────────────────────────
-- Schools managed by the poster admin. The school link customizes the student
-- experience; it is not an authentication or authorization boundary.

create table if not exists public.poster_schools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  school_name text not null,
  school_slug text not null unique,
  logo_data text,
  logo_url text,
  background_ids text[] not null default '{}',
  questions_config jsonb,
  is_active boolean not null default true
);

comment on table public.poster_schools is 'School-specific poster builder configuration managed from the admin screen';
comment on column public.poster_schools.school_slug is 'Auto-generated from school_name and used in /poster-builder/?school=<slug>';
comment on column public.poster_schools.logo_data is 'Data URL logo uploaded in the admin';
comment on column public.poster_schools.background_ids is 'Selected existing poster background IDs. Empty means all regular backgrounds.';
comment on column public.poster_schools.questions_config is 'Optional question labels and character limits keyed by existing field ids.';

alter table public.poster_schools enable row level security;

drop policy if exists "anon_read_active_poster_schools" on public.poster_schools;
create policy "anon_read_active_poster_schools"
on public.poster_schools
for select
to anon
using (true);

drop policy if exists "anon_insert_poster_schools" on public.poster_schools;
create policy "anon_insert_poster_schools"
on public.poster_schools
for insert
to anon
with check (true);

drop policy if exists "anon_update_poster_schools" on public.poster_schools;
create policy "anon_update_poster_schools"
on public.poster_schools
for update
to anon
using (true)
with check (true);

drop policy if exists "anon_delete_poster_schools" on public.poster_schools;
create policy "anon_delete_poster_schools"
on public.poster_schools
for delete
to anon
using (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.poster_schools to anon;
