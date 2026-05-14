-- ── poster_assets table ─────────────────────────────────────────────────────
-- Logos and graphic elements managed by admin for use in posters.
-- Run this once in Supabase SQL Editor.

create table if not exists public.poster_assets (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  name       text        not null,
  asset_type text        not null    default 'other',
  school_name text,
  image_data text        not null,
  is_active  boolean     not null    default true
);

comment on table  public.poster_assets                is 'Logos and graphic elements for posters';
comment on column public.poster_assets.asset_type     is 'school_logo | icon | decoration | other';
comment on column public.poster_assets.school_name    is 'Exact school name, filled only for school_logo type';
comment on column public.poster_assets.image_data     is 'Data URL (base64) or hosted URL';

alter table public.poster_assets enable row level security;

-- Anon can read active assets (client needs this for auto-matching)
create policy "anon_read_active_assets"
  on public.poster_assets for select to anon
  using (is_active = true);

-- Anon can insert (admin uploads from client)
create policy "anon_insert_assets"
  on public.poster_assets for insert to anon
  with check (true);

-- Anon can update (replace image / soft-delete)
create policy "anon_update_assets"
  on public.poster_assets for update to anon
  using (true) with check (true);

grant usage  on schema public to anon;
grant select, insert, update on public.poster_assets to anon;
