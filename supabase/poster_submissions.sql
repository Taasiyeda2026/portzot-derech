create table if not exists public.poster_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  project_name text,
  student_names text,
  class_name text,
  school_name text,
  product_type text,
  poster_data jsonb not null
);
