create extension if not exists pgcrypto;

create table if not exists public.pitch_groups (
  id uuid primary key default gen_random_uuid(),
  group_code text unique not null,
  group_name text,
  project_name text,
  presenter_count integer default 1,
  speaker_1 text,
  speaker_2 text,
  speaker_3 text,
  speaker_4 text,
  speaker_5 text,
  data_json jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pitch_groups_updated_at on public.pitch_groups;

create trigger trg_pitch_groups_updated_at
before update on public.pitch_groups
for each row
execute function public.set_updated_at();
