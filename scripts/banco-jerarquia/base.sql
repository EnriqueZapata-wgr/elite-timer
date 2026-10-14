create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create function public.update_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create table public.sleep_nights (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  night_date date not null, bed_time timestamptz, wake_time timestamptz,
  duration_minutes integer check (duration_minutes is null or (duration_minutes between 0 and 1440)),
  score integer check (score is null or (score between 0 and 100)),
  snore_minutes integer check (snore_minutes is null or (snore_minutes between 0 and 1440)),
  source text not null, external_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint sleep_nights_source_check check (source = any (array['sleep_cycle','health_connect','healthkit'])),
  unique (user_id, night_date));
create table public.health_os_daily (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, steps integer, sleep_minutes integer, resting_hr integer, weight_kg numeric, active_kcal integer,
  source text not null, synced_at timestamptz not null default now(), created_at timestamptz not null default now(),
  constraint health_os_daily_source_check check (source = any (array['health_connect','healthkit'])),
  unique (user_id, date));
alter table public.sleep_nights enable row level security;
alter table public.health_os_daily enable row level security;
create policy own_sn on public.sleep_nights for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_hod on public.health_os_daily for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.sleep_nights, public.health_os_daily to authenticated;
grant all on public.sleep_nights, public.health_os_daily to service_role;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
-- filas que ya existen antes de la 344 (como las 32 noches de prod)
insert into public.sleep_nights (user_id, night_date, bed_time, wake_time, duration_minutes, score, source)
values ('00000000-0000-0000-0000-000000000001', '2026-10-01', '2026-09-30 23:00-06', '2026-10-01 07:00-06', 450, 80, 'sleep_cycle'),
       ('00000000-0000-0000-0000-000000000001', '2026-10-02', '2026-10-01 23:30-06', '2026-10-02 07:00-06', 420, null, 'health_connect');
