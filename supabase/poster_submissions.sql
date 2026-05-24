create table if not exists public.poster_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  project_name text,
  student_names text,
  class_name text,
  school_name text,
  product_type text,
  school_slug text not null default 'default',
  poster_data jsonb not null
);


alter table public.poster_submissions
  add column if not exists school_slug text not null default 'default';

alter table public.poster_submissions
add column if not exists pitch_group_id uuid references public.pitch_groups(id) on delete set null;

alter table public.poster_submissions
add column if not exists pitch_group_code text;

create index if not exists idx_poster_submissions_pitch_group_id
on public.poster_submissions(pitch_group_id);

create index if not exists idx_poster_submissions_pitch_group_code
on public.poster_submissions(pitch_group_code);
