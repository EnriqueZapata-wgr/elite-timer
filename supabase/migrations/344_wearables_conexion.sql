-- ============================================================================
-- 344_wearables_conexion.sql
-- Conexión directa con wearables (Oura primero; WHOOP, Polar y Garmin con el
-- mismo molde) + jerarquía de fuentes · 12-oct-2026
--
-- Reemplaza al borrador 343_oura_conexion.sql (nunca se aplicó; el 343 del
-- repo es de cuestionarios). Si 344 ya está ocupado en el repo, usa el
-- siguiente número libre.
--
-- Qué hace:
--   1. Perfil de la noche (sleep_nights) y del día (health_os_daily): lugares
--      nuevos para los datos elegidos en "Datos de Oura para ATP". Una sola
--      casa por dato.
--   2. Jerarquía de fuentes en una tabla (health_source_priority):
--        Sueño de ATP > Oura > WHOOP > Garmin = Polar > Health Connect > HealthKit
--      El Sueño de ATP va arriba porque la persona lo midió a propósito; solo
--      escribe hora de dormir, de despertar y duración, así que en todo lo demás
--      (etapas, HRV, etc.) manda Oura.
--      Un trigger la hace cumplir campo por campo, para todos los que escriben
--      (teléfono y servidor). Cambiar el orden = cambiar un número en la tabla.
--   3. Tablas de conexión iguales para todas las marcas (wearable_*).
--   4. Guarda el valor de cada fuente que quedó tapada (esquema private), y
--      una función para borrar lo de una marca: cada dato regresa a la mejor
--      fuente que quede. Nada se pierde.
--
-- Solo agrega. No borra datos. Se puede correr dos veces sin error.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Jerarquía de fuentes
-- ----------------------------------------------------------------------------
create table if not exists public.health_source_priority (
  source           text primary key,
  rank             integer not null,
  client_can_write boolean not null default false,
  label            text not null
);
comment on table public.health_source_priority is
  'Quién manda cuando dos fuentes traen el mismo dato. rank menor gana. Empate: se queda el que llegó primero. client_can_write = el teléfono puede escribir con esta fuente; las demás solo el servidor.';

insert into public.health_source_priority (source, rank, client_can_write, label) values
  ('oura',           1, false, 'Oura'),
  ('whoop',          2, false, 'WHOOP'),
  ('garmin',         3, false, 'Garmin'),
  ('polar',          3, false, 'Polar'),
  ('sleep_cycle',    0, true,  'Sueño de ATP'),
  ('health_connect', 5, true,  'Health Connect'),
  ('healthkit',      6, true,  'Salud de Apple')
on conflict (source) do update
  set rank = excluded.rank, client_can_write = excluded.client_can_write, label = excluded.label;

alter table public.health_source_priority enable row level security;
drop policy if exists "Anyone signed in reads source priority" on public.health_source_priority;
create policy "Anyone signed in reads source priority" on public.health_source_priority
  for select to authenticated using (true);
revoke all on public.health_source_priority from anon, authenticated;
grant select on public.health_source_priority to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Perfil de la noche · sleep_nights
--    Ya existen: bed_time, wake_time, duration_minutes, score, snore_minutes.
--    night_date = fecha local en que la persona despierta (regla del import).
-- ----------------------------------------------------------------------------
alter table public.sleep_nights
  add column if not exists deep_min      integer,
  add column if not exists light_min     integer,
  add column if not exists rem_min       integer,
  add column if not exists awake_min     integer,
  add column if not exists latency_min   integer,
  add column if not exists efficiency    integer,
  add column if not exists hypnogram     text,
  add column if not exists split_night   boolean not null default false,
  add column if not exists field_sources jsonb   not null default '{}'::jsonb;

alter table public.sleep_nights
  drop constraint if exists sleep_nights_deep_min_check,
  drop constraint if exists sleep_nights_light_min_check,
  drop constraint if exists sleep_nights_rem_min_check,
  drop constraint if exists sleep_nights_awake_min_check,
  drop constraint if exists sleep_nights_latency_min_check,
  drop constraint if exists sleep_nights_efficiency_check,
  drop constraint if exists sleep_nights_hypnogram_check,
  drop constraint if exists sleep_nights_source_check;

alter table public.sleep_nights
  add constraint sleep_nights_deep_min_check    check (deep_min    is null or deep_min    between 0 and 1440),
  add constraint sleep_nights_light_min_check   check (light_min   is null or light_min   between 0 and 1440),
  add constraint sleep_nights_rem_min_check     check (rem_min     is null or rem_min     between 0 and 1440),
  add constraint sleep_nights_awake_min_check   check (awake_min   is null or awake_min   between 0 and 1440),
  add constraint sleep_nights_latency_min_check check (latency_min is null or latency_min between 0 and 1440),
  add constraint sleep_nights_efficiency_check  check (efficiency  is null or efficiency  between 0 and 100),
  add constraint sleep_nights_hypnogram_check   check (hypnogram   is null or hypnogram ~ '^[0-4]*$'),
  add constraint sleep_nights_source_check      check (source = any (array[
    'sleep_cycle','health_connect','healthkit','oura','whoop','garmin','polar','mixto']));

comment on column public.sleep_nights.deep_min      is 'Minutos de sueño profundo.';
comment on column public.sleep_nights.light_min     is 'Minutos de sueño ligero.';
comment on column public.sleep_nights.rem_min       is 'Minutos de sueño REM.';
comment on column public.sleep_nights.awake_min     is 'Minutos despierto durante la noche.';
comment on column public.sleep_nights.latency_min   is 'Minutos para quedarse dormido. Lo medido gana sobre lo respondido en el cuestionario de Edad ATP.';
comment on column public.sleep_nights.efficiency    is 'Eficiencia de sueño 0-100 (dormido entre tiempo en cama).';
comment on column public.sleep_nights.hypnogram     is 'Etapas cada 5 min: 1 profundo, 2 ligero, 3 REM, 4 despierto, 0 sin dato.';
comment on column public.sleep_nights.split_night   is 'true si la noche vino en dos periodos largos y se juntaron.';
comment on column public.sleep_nights.field_sources is 'De qué fuente vino cada campo. Lo llena el trigger; nadie lo escribe a mano.';
comment on column public.sleep_nights.score         is 'Score de sueño 0-100 de la marca que lo trajo. Se muestra como "de <marca>".';

-- ----------------------------------------------------------------------------
-- 3. Perfil del día · health_os_daily
--    Ya existen: steps, sleep_minutes, resting_hr, weight_kg, active_kcal.
--    HRV, FC en reposo, temperatura y respiración viven SOLO aquí.
-- ----------------------------------------------------------------------------
alter table public.health_os_daily
  add column if not exists hrv_ms            integer,
  add column if not exists hrv_sdnn_ms       integer,
  add column if not exists breath_rate       numeric(4,1),
  add column if not exists temp_deviation_c  numeric(4,2),
  add column if not exists spo2_pct          numeric(4,1),
  add column if not exists readiness_score   integer,
  add column if not exists stress_high_min   integer,
  add column if not exists recovery_high_min integer,
  add column if not exists sedentary_min     integer,
  add column if not exists rest_mode         boolean,
  add column if not exists field_sources     jsonb not null default '{}'::jsonb;

alter table public.health_os_daily
  drop constraint if exists health_os_daily_hrv_ms_check,
  drop constraint if exists health_os_daily_hrv_sdnn_ms_check,
  drop constraint if exists health_os_daily_breath_rate_check,
  drop constraint if exists health_os_daily_temp_deviation_c_check,
  drop constraint if exists health_os_daily_spo2_pct_check,
  drop constraint if exists health_os_daily_readiness_score_check,
  drop constraint if exists health_os_daily_stress_high_min_check,
  drop constraint if exists health_os_daily_recovery_high_min_check,
  drop constraint if exists health_os_daily_sedentary_min_check,
  drop constraint if exists health_os_daily_source_check;

alter table public.health_os_daily
  add constraint health_os_daily_hrv_ms_check            check (hrv_ms            is null or hrv_ms            between 1 and 500),
  add constraint health_os_daily_hrv_sdnn_ms_check       check (hrv_sdnn_ms       is null or hrv_sdnn_ms       between 1 and 500),
  add constraint health_os_daily_breath_rate_check       check (breath_rate       is null or breath_rate       between 4 and 60),
  add constraint health_os_daily_temp_deviation_c_check  check (temp_deviation_c  is null or temp_deviation_c  between -5 and 5),
  add constraint health_os_daily_spo2_pct_check          check (spo2_pct          is null or spo2_pct          between 50 and 100),
  add constraint health_os_daily_readiness_score_check   check (readiness_score   is null or readiness_score   between 0 and 100),
  add constraint health_os_daily_stress_high_min_check   check (stress_high_min   is null or stress_high_min   between 0 and 1440),
  add constraint health_os_daily_recovery_high_min_check check (recovery_high_min is null or recovery_high_min between 0 and 1440),
  add constraint health_os_daily_sedentary_min_check     check (sedentary_min     is null or sedentary_min     between 0 and 1440),
  add constraint health_os_daily_source_check            check (source = any (array[
    'health_connect','healthkit','oura','whoop','garmin','polar','mixto']));

comment on column public.health_os_daily.hrv_ms            is 'HRV RMSSD (ms), promedio de la noche. Se lee contra la base propia del usuario.';
comment on column public.health_os_daily.hrv_sdnn_ms       is 'HRV SDNN (ms). Solo Salud de Apple da SDNN. Es otra medida: no se mezcla con hrv_ms.';
comment on column public.health_os_daily.resting_hr        is 'FC en reposo. De un wearable: la FC más baja de la noche.';
comment on column public.health_os_daily.breath_rate       is 'Respiraciones por minuto dormido. Señal, no aviso seguro.';
comment on column public.health_os_daily.temp_deviation_c  is 'Desviación de temperatura de piel vs la base del usuario (°C). Nunca temperatura absoluta.';
comment on column public.health_os_daily.spo2_pct          is 'SpO2 promedio de la noche (%). No es oxímetro médico.';
comment on column public.health_os_daily.readiness_score   is 'Readiness/recuperación 0-100 de la marca. Se muestra como "de <marca>". No manda sobre ciclo, modo descanso ni cronotipo.';
comment on column public.health_os_daily.stress_high_min   is 'Minutos de carga alta del cuerpo. Se cruza con el check-in, no lo reemplaza.';
comment on column public.health_os_daily.recovery_high_min is 'Minutos de recuperación alta en el día.';
comment on column public.health_os_daily.sedentary_min     is 'Minutos sentado o sin moverse.';
comment on column public.health_os_daily.rest_mode         is 'true si la persona se marcó enferma o en recuperación en su wearable.';
comment on column public.health_os_daily.field_sources     is 'De qué fuente vino cada campo. Lo llena el trigger; nadie lo escribe a mano.';

-- ----------------------------------------------------------------------------
-- 3b. Filas que ya existen: se marca cada campo con la fuente de su fila,
--     para que la jerarquía las reconozca. Va antes de crear el trigger.
-- ----------------------------------------------------------------------------
update public.sleep_nights t
   set field_sources = coalesce((select jsonb_object_agg(e.key, t.source) from jsonb_each(to_jsonb(t)) e
                                  where e.key <> all (array['id','user_id','night_date','source','field_sources','created_at','updated_at','split_night','external_id'])
                                    and e.value <> 'null'::jsonb), '{}'::jsonb)
 where field_sources = '{}'::jsonb and source <> 'mixto';
update public.health_os_daily t
   set field_sources = coalesce((select jsonb_object_agg(e.key, t.source) from jsonb_each(to_jsonb(t)) e
                                  where e.key <> all (array['id','user_id','date','source','field_sources','created_at','synced_at'])
                                    and e.value <> 'null'::jsonb), '{}'::jsonb)
 where field_sources = '{}'::jsonb and source <> 'mixto';

-- ----------------------------------------------------------------------------
-- 3c. Valores de cada fuente que no quedaron a la vista
--     Cuando una fuente de arriba tapa a otra (o la de abajo llega tarde), su
--     valor se guarda aquí. Si después se borra lo de una marca, el dato
--     regresa de la mejor fuente que quede. Nada se pierde.
--     Vive en el esquema private: la API pública no lo expone.
-- ----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists private.health_source_values (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tbl        text not null check (tbl in ('sleep_nights','health_os_daily')),
  day        date not null,
  field      text not null,
  source     text not null references public.health_source_priority(source),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tbl, day, field, source)
);
revoke all on private.health_source_values from anon, authenticated;
grant all on private.health_source_values to service_role;

-- Guarda (o borra, si p_value es null) el valor de una fuente.
-- Un usuario con sesión solo toca lo suyo; el servidor (sin auth.uid) todo.
create or replace function private.keep_source_value(
  p_user uuid, p_tbl text, p_day date, p_field text, p_source text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $f$
begin
  if auth.uid() is not null and p_user is distinct from auth.uid() then
    raise exception 'Solo puedes guardar tus propios datos';
  end if;
  if p_value is null or p_value = 'null'::jsonb then
    delete from private.health_source_values
     where user_id = p_user and tbl = p_tbl and day = p_day and field = p_field and source = p_source;
  else
    insert into private.health_source_values (user_id, tbl, day, field, source, value)
    values (p_user, p_tbl, p_day, p_field, p_source, p_value)
    on conflict (user_id, tbl, day, field, source)
    do update set value = excluded.value, updated_at = now();
  end if;
end;
$f$;
revoke all on function private.keep_source_value(uuid, text, date, text, text, jsonb) from public, anon;
grant execute on function private.keep_source_value(uuid, text, date, text, text, jsonb) to authenticated, service_role;

-- La mejor fuente guardada para un campo, sin contar p_except.
-- Devuelve {"source": ..., "value": ...} o null.
create or replace function private.best_source_value(
  p_user uuid, p_tbl text, p_day date, p_field text, p_except text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $f$
begin
  if auth.uid() is not null and p_user is distinct from auth.uid() then
    raise exception 'Solo puedes leer tus propios datos';
  end if;
  return (select jsonb_build_object('source', v.source, 'value', v.value)
            from private.health_source_values v
            join public.health_source_priority p on p.source = v.source
           where v.user_id = p_user and v.tbl = p_tbl and v.day = p_day and v.field = p_field
             and v.source is distinct from p_except
           order by p.rank, v.updated_at desc
           limit 1);
end;
$f$;
revoke all on function private.best_source_value(uuid, text, date, text, text) from public, anon;
grant execute on function private.best_source_value(uuid, text, date, text, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Trigger de jerarquía (aplica a sleep_nights y health_os_daily)
--    - field_sources lo calcula la base: cada campo que cambia queda marcado
--      con la fuente que lo escribió (NEW.source).
--    - Si quien escribe tiene menor jerarquía que la fuente que ya llenó un
--      campo, ese campo se queda como estaba. Empate: se queda el primero.
--    - El teléfono solo puede escribir con fuentes client_can_write.
--    - source queda como resumen: una sola fuente o 'mixto'.
--    - Modo purga (purge_wearable_source): no protege, solo recalcula.
-- ----------------------------------------------------------------------------
create or replace function public.apply_source_priority()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  meta      constant text[] := array['id','user_id','date','night_date','source','field_sources',
                                     'created_at','updated_at','synced_at','split_night','external_id'];
  is_client boolean := current_user in ('anon', 'authenticated');
  -- El modo purga solo vale para el servidor: el teléfono no lo puede prender.
  purge     text    := case when current_user in ('anon', 'authenticated') then null
                            else nullif(current_setting('atp.purge_source', true), '') end;
  fb        jsonb;
  writer    text;
  w_rank    integer;
  w_client  boolean;
  o_rank    integer;
  o_src     text;
  fs        jsonb;
  newj      jsonb := to_jsonb(new);
  oldj      jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  restore   jsonb := '{}'::jsonb;
  k         text;
  srcs      text[];
  v_day     date := coalesce((to_jsonb(new) ->> 'night_date')::date, (to_jsonb(new) ->> 'date')::date);
begin
  fs := case when tg_op = 'UPDATE' then coalesce(old.field_sources, '{}'::jsonb) else '{}'::jsonb end;

  -- Modo purga: el servidor ya puso en null lo de una marca; solo recalcular.
  if purge is not null then
    new.field_sources := coalesce(new.field_sources, '{}'::jsonb);
  else
    -- ¿Quién escribe?
    writer := new.source;
    if writer = 'mixto' then writer := null; end if;   -- no dijo quién es
    select rank, client_can_write into w_rank, w_client
      from public.health_source_priority where source = writer;
    w_rank := coalesce(w_rank, 99);

    if is_client and not coalesce(w_client, false) then
      if writer is not null and (tg_op = 'INSERT' or writer is distinct from old.source) then
        raise exception 'Solo el servidor puede guardar datos con fuente %', writer;
      end if;
      -- El teléfono no dijo su fuente y la fila es de una marca (o 'mixto'):
      -- escribe como nadie, abajo de todos. Así no se hace pasar por la marca.
      writer := null;
      w_rank := 99;
    end if;

    for k in select jsonb_object_keys(newj) loop
      continue when k = any(meta);
      if tg_op = 'INSERT' then
        if newj -> k is not null and newj -> k <> 'null'::jsonb then
          fs := fs || jsonb_build_object(k, coalesce(writer, 'mixto'));
        end if;
        continue;
      end if;
      continue when (newj -> k) is not distinct from (oldj -> k);

      o_src := fs ->> k;
      select rank into o_rank from public.health_source_priority where source = o_src;
      o_rank := coalesce(o_rank, 99);

      -- Un vacío (null) no borra lo de otra fuente: "no tengo dato" no es dato.
      if newj -> k is null or newj -> k = 'null'::jsonb then
        if o_src is not null and o_src is distinct from writer then
          restore := restore || jsonb_build_object(k, oldj -> k);
          if writer is not null then   -- si esa fuente tenía un valor guardado, ya no vale
            perform private.keep_source_value(new.user_id, tg_table_name, v_day, k, writer, null);
          end if;
        else
          -- La fuente borra su propio valor: regresa el mejor que quede guardado.
          if writer is not null then
            perform private.keep_source_value(new.user_id, tg_table_name, v_day, k, writer, null);
            fb := private.best_source_value(new.user_id, tg_table_name, v_day, k, writer);
          end if;
          if fb is not null then
            restore := restore || jsonb_build_object(k, fb -> 'value');
            fs := fs || jsonb_build_object(k, fb ->> 'source');
          else
            fs := fs - k;
          end if;
        end if;
        continue;
      end if;

      if o_src is not null and (o_rank < w_rank or (o_rank = w_rank and o_src is distinct from writer)) then
        restore := restore || jsonb_build_object(k, oldj -> k);   -- manda la fuente de arriba
        -- El valor de quien perdió se guarda, por si un día se borra lo de arriba.
        if writer is not null and newj -> k <> 'null'::jsonb then
          perform private.keep_source_value(new.user_id, tg_table_name, v_day, k, writer, newj -> k);
        end if;
      else
        -- El valor que se va a tapar se guarda, si era de otra fuente.
        if o_src is not null and o_src is distinct from writer and o_src <> 'mixto'
           and oldj -> k is not null and oldj -> k <> 'null'::jsonb then
          perform private.keep_source_value(new.user_id, tg_table_name, v_day, k, o_src, oldj -> k);
        end if;
        if newj -> k is null or newj -> k = 'null'::jsonb then
          fs := fs - k;
        else
          fs := fs || jsonb_build_object(k, coalesce(writer, 'mixto'));
        end if;
      end if;
    end loop;

    if restore <> '{}'::jsonb then
      new := jsonb_populate_record(new, restore);
    end if;
    new.field_sources := fs;
  end if;

  -- Resumen de la fila.
  select array_agg(distinct value) into srcs from jsonb_each_text(new.field_sources);
  if srcs is null or cardinality(srcs) = 0 then
    new.source := coalesce(nullif(case when tg_op = 'UPDATE' then old.source end, purge),
                           case when writer is not null then writer end,
                           new.source);
    if new.source = purge then new.source := 'mixto'; end if;
  elsif cardinality(srcs) = 1 then
    new.source := srcs[1];
  else
    new.source := 'mixto';
  end if;

  return new;
end;
$$;

drop trigger if exists sleep_nights_source_priority on public.sleep_nights;
create trigger sleep_nights_source_priority before insert or update on public.sleep_nights
  for each row execute function public.apply_source_priority();

drop trigger if exists health_os_daily_source_priority on public.health_os_daily;
create trigger health_os_daily_source_priority before insert or update on public.health_os_daily
  for each row execute function public.apply_source_priority();

-- ----------------------------------------------------------------------------
-- 5. Conexiones con wearables (una sola forma para todas las marcas)
-- ----------------------------------------------------------------------------
create table if not exists public.wearable_connections (
  user_id                  uuid not null references auth.users(id) on delete cascade,
  provider                 text not null check (provider in ('oura','whoop','polar','garmin')),
  provider_user_id         text,
  status                   text not null default 'conectado'
                           check (status in ('conectado','sin_membresia','revocado','error')),
  import_mode              text not null default 'auto' check (import_mode in ('auto','preguntar')),
  scopes                   text[] not null default '{}',
  connected_at             timestamptz not null default now(),
  last_sync_at             timestamptz,
  last_morning_prompt_date date,
  has_pending_data         boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  primary key (user_id, provider),
  unique (provider, provider_user_id)
);
comment on table public.wearable_connections is 'Una fila por usuario y marca conectada. El usuario solo cambia import_mode y last_morning_prompt_date.';

alter table public.wearable_connections enable row level security;
drop policy if exists "Users read own wearable_connections" on public.wearable_connections;
create policy "Users read own wearable_connections" on public.wearable_connections
  for select using (auth.uid() = user_id);
drop policy if exists "Users update own wearable_connections" on public.wearable_connections;
create policy "Users update own wearable_connections" on public.wearable_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.wearable_connections from anon, authenticated;
grant select on public.wearable_connections to authenticated;
grant update (import_mode, last_morning_prompt_date) on public.wearable_connections to authenticated;

drop trigger if exists wearable_connections_updated_at on public.wearable_connections;
create trigger wearable_connections_updated_at before update on public.wearable_connections
  for each row execute function public.update_updated_at();

-- Tokens: solo service role. Cifrados en la edge function (AES-GCM, IV nuevo por cifrado).
-- refresh_token_enc y expires_at pueden ir vacíos: Polar no da refresh y su token no caduca.
create table if not exists public.wearable_tokens (
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null check (provider in ('oura','whoop','polar','garmin')),
  access_token_enc   text not null,
  refresh_token_enc  text,
  expires_at         timestamptz,
  refresh_lock_until timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.wearable_tokens enable row level security;
revoke all on public.wearable_tokens from anon, authenticated;
drop trigger if exists wearable_tokens_updated_at on public.wearable_tokens;
create trigger wearable_tokens_updated_at before update on public.wearable_tokens
  for each row execute function public.update_updated_at();

-- Estados de OAuth: se gastan al usarse (DELETE ... RETURNING) y viven 10 min.
create table if not exists public.wearable_oauth_states (
  state         text primary key,
  provider      text not null check (provider in ('oura','whoop','polar','garmin')),
  user_id       uuid not null references auth.users(id) on delete cascade,
  code_verifier text check (code_verifier is null or char_length(code_verifier) between 43 and 128),
  expires_at    timestamptz not null default now() + interval '10 minutes',
  created_at    timestamptz not null default now()
);
alter table public.wearable_oauth_states enable row level security;
revoke all on public.wearable_oauth_states from anon, authenticated;

-- Qué tipos de dato se aceptan por marca. Lo que no está aquí no se guarda.
create table if not exists public.wearable_data_types (
  provider  text not null check (provider in ('oura','whoop','polar','garmin')),
  data_type text not null,
  primary key (provider, data_type)
);
insert into public.wearable_data_types (provider, data_type) values
  ('oura','sleep'), ('oura','daily_sleep'), ('oura','daily_readiness'), ('oura','daily_activity'),
  ('oura','daily_spo2'), ('oura','daily_stress'), ('oura','daily_resilience'),
  ('oura','daily_cardiovascular_age'), ('oura','workout'), ('oura','session'),
  ('oura','enhanced_tag'), ('oura','tag'), ('oura','rest_mode_period'),
  ('whoop','sleep'), ('whoop','recovery'), ('whoop','cycle'), ('whoop','workout'),
  ('polar','sleep'), ('polar','nightly_recharge'), ('polar','activity'), ('polar','exercise'),
  ('polar','skin_temperature'), ('polar','spo2_test'), ('polar','cardio_load'),
  ('polar','sleepwise_alertness'), ('polar','sleepwise_bedtime'),
  ('garmin','sleeps'), ('garmin','dailies'), ('garmin','hrv'), ('garmin','skin_temp'),
  ('garmin','pulse_ox'), ('garmin','activities')
on conflict do nothing;
comment on table public.wearable_data_types is 'Lista blanca de tipos por marca. No están (decisión de Enrique): VO2máx de ninguna marca, FC de todo el día, hora ideal de dormir, datos del anillo o reloj, datos personales.';
alter table public.wearable_data_types enable row level security;
revoke all on public.wearable_data_types from anon, authenticated;

-- Respaldo crudo: todo documento que manda una marca ("Solo guardado" vive aquí).
create table if not exists public.wearable_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null,
  data_type   text not null,
  external_id text not null,
  day         date,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (provider, data_type) references public.wearable_data_types (provider, data_type),
  unique (user_id, provider, data_type, external_id)
);
create index if not exists wearable_records_user_type_day
  on public.wearable_records (user_id, provider, data_type, day desc);
alter table public.wearable_records enable row level security;
drop policy if exists "Users read own wearable_records" on public.wearable_records;
create policy "Users read own wearable_records" on public.wearable_records
  for select using (auth.uid() = user_id);
revoke all on public.wearable_records from anon, authenticated;
grant select on public.wearable_records to authenticated;
drop trigger if exists wearable_records_updated_at on public.wearable_records;
create trigger wearable_records_updated_at before update on public.wearable_records
  for each row execute function public.update_updated_at();

-- Avisos (webhooks) de todas las marcas.
create table if not exists public.wearable_webhook_events (
  id               bigint generated always as identity primary key,
  provider         text not null check (provider in ('oura','whoop','polar','garmin')),
  provider_user_id text,
  dedupe_key       text,
  received_at      timestamptz not null default now(),
  payload          jsonb not null,
  processed_at     timestamptz,
  attempts         integer not null default 0,
  error            text,
  unique (provider, dedupe_key)
);
create index if not exists wearable_webhook_events_pending
  on public.wearable_webhook_events (received_at) where processed_at is null;
create index if not exists wearable_webhook_events_user
  on public.wearable_webhook_events (provider, provider_user_id);
comment on table public.wearable_webhook_events is 'Avisos de las marcas. dedupe_key evita procesar dos veces (p. ej. trace_id de WHOOP). Mantenimiento borra los procesados de más de 30 días.';
alter table public.wearable_webhook_events enable row level security;
revoke all on public.wearable_webhook_events from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Borrar lo que vino de una marca (al desconectar con "borrar mis datos")
--    Cada campo que esa marca llenó vuelve al valor de la mejor fuente que
--    quede (guardado en private.health_source_values) o se queda vacío.
--    Las filas que quedan sin ningún dato se borran. Solo service role.
-- ----------------------------------------------------------------------------
create or replace function public.purge_wearable_source(p_user uuid, p_source text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t      text;
  r      record;
  keys   text[];
  k      text;
  best   record;
  patch  jsonb;
  marks  jsonb;
  n      integer := 0;
  datos  text;
  dayc   text;
begin
  if p_source not in (select source from public.health_source_priority) then
    raise exception 'Fuente desconocida: %', p_source;
  end if;
  perform set_config('atp.purge_source', p_source, true);

  foreach t in array array['sleep_nights', 'health_os_daily'] loop
    dayc := case t when 'sleep_nights' then 'night_date' else 'date' end;
    for r in execute format(
      'select id, %I as day, field_sources from public.%I where user_id = $1 and exists
         (select 1 from jsonb_each_text(field_sources) e where e.value = $2)', dayc, t)
      using p_user, p_source
    loop
      select array_agg(key) into keys from jsonb_each_text(r.field_sources) where value = p_source;
      patch := '{}'::jsonb;
      marks := '{}'::jsonb;
      foreach k in array keys loop
        select v.source, v.value into best
          from private.health_source_values v
          join public.health_source_priority p on p.source = v.source
         where v.user_id = p_user and v.tbl = t and v.day = r.day and v.field = k and v.source <> p_source
         order by p.rank, v.updated_at desc
         limit 1;
        if found then
          patch := patch || jsonb_build_object(k, best.value);
          marks := marks || jsonb_build_object(k, best.source);
        else
          patch := patch || jsonb_build_object(k, null);
        end if;
      end loop;
      execute format('update public.%I x set %s, field_sources = (x.field_sources - $2) || $3 where id = $4',
                     t, (select string_agg(format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', c, t, c), ', ')
                         from unnest(keys) c))
        using patch, keys, marks, r.id;
      n := n + 1;
    end loop;

    -- Filas que se quedaron sin ningún dato: se borran.
    datos := (select string_agg(format('%I is null', c.column_name), ' and ')
              from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = t
                and c.column_name not in ('id','user_id','date','night_date','source','field_sources',
                                          'created_at','updated_at','synced_at','split_night','external_id'));
    execute format('delete from public.%I where user_id = $1 and field_sources = ''{}''::jsonb and %s', t, datos)
      using p_user;
  end loop;

  delete from private.health_source_values where user_id = p_user and source = p_source;
  perform set_config('atp.purge_source', '', true);
  return n;
end;
$$;
revoke all on function public.purge_wearable_source(uuid, text) from public, anon, authenticated;

commit;
