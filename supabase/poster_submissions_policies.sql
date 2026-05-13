-- Security policy for poster submissions created from the student client.
-- The browser must use only VITE_SUPABASE_ANON_KEY. Never expose a service_role key here.

alter table public.poster_submissions enable row level security;

-- Students may submit new posters.
create policy "students can create poster submissions"
on public.poster_submissions
for insert
to anon
with check (true);

-- No anon SELECT/UPDATE/DELETE policies are created on purpose, so students cannot
-- read, edit, or delete existing submissions with the publishable anon key.
