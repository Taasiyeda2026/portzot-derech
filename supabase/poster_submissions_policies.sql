-- Security policy for poster submissions created from the student client.
-- The browser must use only VITE_SUPABASE_ANON_KEY. Never expose a service_role key here.

alter table public.poster_submissions enable row level security;

-- Students may submit new posters.
drop policy if exists "students can create poster submissions" on public.poster_submissions;
create policy "students can create poster submissions"
on public.poster_submissions
for insert
to anon
with check (true);

-- IMPORTANT: this project currently uses the public anon key and a client-side admin
-- code, so RLS cannot truly prove that the browser user is an admin. The safest
-- production flow is a server endpoint / Supabase Edge Function that receives the
-- poster id, schoolLogoImage, and admin code, validates the code server-side, and
-- updates poster_data->schoolLogoImage with the service_role key. Keep the
-- service_role key only on the server and never expose it in browser code.
--
-- Temporary demo/testing policy only: lets the anon admin flow persist school-logo
-- updates from the browser. Do not use this as-is for production, because anyone
-- with the anon key and table shape could update poster submissions.
drop policy if exists "Allow update poster submissions for admin flow" on public.poster_submissions;
create policy "Allow update poster submissions for admin flow"
on public.poster_submissions
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can read poster submissions" on public.poster_submissions;
create policy "anon can read poster submissions"
on public.poster_submissions
for select
to anon
using (true);

alter table public.pitch_groups enable row level security;

drop policy if exists "anon can read pitch groups" on public.pitch_groups;
create policy "anon can read pitch groups"
on public.pitch_groups
for select
to anon
using (true);

-- If the app is moved to Supabase Auth and uses authenticated clients for this
-- admin flow, enable a narrower authenticated policy instead of the anon policy
-- above. The broad policy below is also for demos/tests only:
--
-- drop policy if exists "Allow authenticated update poster submissions" on public.poster_submissions;
-- create policy "Allow authenticated update poster submissions"
-- on public.poster_submissions
-- for update
-- to authenticated
-- using (true)
-- with check (true);
