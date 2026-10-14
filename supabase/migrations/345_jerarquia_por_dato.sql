-- ============================================================================
-- 345_jerarquia_por_dato.sql
-- Jerarquía de fuentes POR DATO · 14-oct-2026
--
-- Decisión de Enrique (13-oct-2026, aprobada el 14-oct: "a instalar todo
-- eso en Supabase"): cada aparato guarda su propio valor y el
-- "dato del día" sale de un orden elegido por ATP PARA CADA DATO, con base en
-- una calificación de 100 puntos (validación, cómo genera el dato, constancia
-- y lo que llega por la API). El detalle y las fuentes viven en el doc del
-- proyecto claude/Wearables_2026-10-12/11_JERARQUIA_POR_DATO.md.
--
-- Qué cambia contra la 344:
--   1. Tabla health_source_field_priority (tabla, dato, fuente, rango).
--   2. Función health_source_rank(tabla, dato, fuente):
--        · si el dato tiene renglones, manda ese orden y una fuente que no
--          está en la lista queda en 99 (abajo de todas);
--        · si el dato no tiene renglones (score, ronquido, readiness, peso,
--          kcal...), se usa el orden general de la 344.
--   3. El trigger apply_source_priority, best_source_value y
--      purge_wearable_source usan ese rango por dato. Nada más cambia: mismos
--      permisos, misma regla de "un vacío no borra", misma purga.
--   4. Exclusiones (regla 5 del doc): un renglón con rango null quiere decir
--      "esta fuente no cuenta para este dato", ni como respaldo: temperatura
--      absoluta de WHOOP, SpO2 de Polar (prueba manual), pasos de WHOOP y
--      latencia de WHOOP, Garmin y Polar (no la dan; si un día la mandan, no
--      entra sin revisarla).
--      El crudo sigue en wearable_records.
--   5. Desempate del orden general (regla 6: nunca "el que llegó primero"):
--      Polar pasa de 3 a 4, abajo de Garmin, para los datos sin orden propio
--      (readiness, score, peso, kcal, estrés...). Se puede vetar.
--   6. El trigger calcula el rango solo de los campos que sí cambian (antes
--      lo calculaba también para los que se saltaba).
--   7. Al final, un candado: toda marca directa tiene renglón (con rango o
--      excluida) en cada dato con orden; si alguien agrega una marca y olvida
--      sus renglones, la migración falla en vez de dejarla abajo de los tubos.
--
-- Reglas del orden (doc 11):
--   · Los tubos (Health Connect, Salud de Apple) van después de las marcas
--     conectadas directo, hasta guardar de qué aparato vino cada dato.
--   · Sueño de ATP: primero en hora de acostarse y despertar; último en
--     minutos dormidos y etapas.
--   · Sin empates dentro de un dato (el desempate por evidencia ya está
--     aplicado en el orden).
--   · Lo que el brief excluyó no aparece en la lista de ese dato y queda en
--     99 (temperatura absoluta de WHOOP, SpO2 de Polar, pasos de WHOOP).
--
-- Requiere la 344. Solo agrega o reemplaza funciones. Se puede correr dos
-- veces sin error.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Orden por dato
-- ----------------------------------------------------------------------------
create table if not exists public.health_source_field_priority (
  tbl    text    not null check (tbl in ('sleep_nights','health_os_daily')),
  field  text    not null,
  source text    not null references public.health_source_priority(source),
  rank   integer check (rank is null or rank between 1 and 98),  -- null = excluido (regla 5)
  primary key (tbl, field, source),
  unique (tbl, field, rank)
);
comment on table public.health_source_field_priority is
  'Orden de fuentes POR DATO (rank menor gana; null = la fuente no cuenta para ese dato). Si un dato tiene renglones, una fuente que no aparece queda abajo de todas (99). Si no tiene, manda health_source_priority. La migración es dueña del orden: re-correrla borra ajustes manuales. Calificación y fuentes: doc 11_JERARQUIA_POR_DATO.md.';

delete from public.health_source_field_priority;
insert into public.health_source_field_priority (tbl, field, source, rank) values
  ('health_os_daily', 'hrv_ms', 'oura', 1),
  ('health_os_daily', 'hrv_ms', 'whoop', 2),
  ('health_os_daily', 'hrv_ms', 'garmin', 3),
  ('health_os_daily', 'hrv_ms', 'polar', 4),
  ('health_os_daily', 'hrv_ms', 'health_connect', 5),
  ('health_os_daily', 'hrv_ms', 'healthkit', 6),
  ('health_os_daily', 'resting_hr', 'oura', 1),
  ('health_os_daily', 'resting_hr', 'whoop', 2),
  ('health_os_daily', 'resting_hr', 'polar', 3),
  ('health_os_daily', 'resting_hr', 'garmin', 4),
  ('health_os_daily', 'resting_hr', 'healthkit', 5),
  ('health_os_daily', 'resting_hr', 'health_connect', 6),
  ('health_os_daily', 'sleep_minutes', 'oura', 1),
  ('health_os_daily', 'sleep_minutes', 'polar', 2),
  ('health_os_daily', 'sleep_minutes', 'whoop', 3),
  ('health_os_daily', 'sleep_minutes', 'garmin', 4),
  ('health_os_daily', 'sleep_minutes', 'health_connect', 5),
  ('health_os_daily', 'sleep_minutes', 'healthkit', 6),
  ('health_os_daily', 'temp_deviation_c', 'oura', 1),
  ('health_os_daily', 'temp_deviation_c', 'polar', 2),
  ('health_os_daily', 'temp_deviation_c', 'garmin', 3),
  ('health_os_daily', 'temp_deviation_c', 'healthkit', 4),
  ('health_os_daily', 'temp_deviation_c', 'health_connect', 5),
  ('health_os_daily', 'spo2_pct', 'oura', 1),
  ('health_os_daily', 'spo2_pct', 'whoop', 2),
  ('health_os_daily', 'spo2_pct', 'garmin', 3),
  ('health_os_daily', 'spo2_pct', 'healthkit', 4),
  ('health_os_daily', 'spo2_pct', 'health_connect', 5),
  ('health_os_daily', 'breath_rate', 'whoop', 1),
  ('health_os_daily', 'breath_rate', 'oura', 2),
  ('health_os_daily', 'breath_rate', 'polar', 3),
  ('health_os_daily', 'breath_rate', 'garmin', 4),
  ('health_os_daily', 'breath_rate', 'health_connect', 5),
  ('health_os_daily', 'breath_rate', 'healthkit', 6),
  ('health_os_daily', 'steps', 'garmin', 1),
  ('health_os_daily', 'steps', 'oura', 2),
  ('health_os_daily', 'steps', 'polar', 3),
  ('health_os_daily', 'steps', 'health_connect', 4),
  ('health_os_daily', 'steps', 'healthkit', 5),
  ('sleep_nights', 'bed_time', 'sleep_cycle', 1),
  ('sleep_nights', 'bed_time', 'oura', 2),
  ('sleep_nights', 'bed_time', 'polar', 3),
  ('sleep_nights', 'bed_time', 'whoop', 4),
  ('sleep_nights', 'bed_time', 'garmin', 5),
  ('sleep_nights', 'bed_time', 'health_connect', 6),
  ('sleep_nights', 'bed_time', 'healthkit', 7),
  ('sleep_nights', 'wake_time', 'sleep_cycle', 1),
  ('sleep_nights', 'wake_time', 'oura', 2),
  ('sleep_nights', 'wake_time', 'polar', 3),
  ('sleep_nights', 'wake_time', 'whoop', 4),
  ('sleep_nights', 'wake_time', 'garmin', 5),
  ('sleep_nights', 'wake_time', 'health_connect', 6),
  ('sleep_nights', 'wake_time', 'healthkit', 7),
  ('sleep_nights', 'duration_minutes', 'oura', 1),
  ('sleep_nights', 'duration_minutes', 'polar', 2),
  ('sleep_nights', 'duration_minutes', 'whoop', 3),
  ('sleep_nights', 'duration_minutes', 'garmin', 4),
  ('sleep_nights', 'duration_minutes', 'health_connect', 5),
  ('sleep_nights', 'duration_minutes', 'healthkit', 6),
  ('sleep_nights', 'duration_minutes', 'sleep_cycle', 7),
  ('sleep_nights', 'deep_min', 'oura', 1),
  ('sleep_nights', 'deep_min', 'whoop', 2),
  ('sleep_nights', 'deep_min', 'polar', 3),
  ('sleep_nights', 'deep_min', 'garmin', 4),
  ('sleep_nights', 'deep_min', 'health_connect', 5),
  ('sleep_nights', 'deep_min', 'healthkit', 6),
  ('sleep_nights', 'deep_min', 'sleep_cycle', 7),
  ('sleep_nights', 'light_min', 'oura', 1),
  ('sleep_nights', 'light_min', 'whoop', 2),
  ('sleep_nights', 'light_min', 'polar', 3),
  ('sleep_nights', 'light_min', 'garmin', 4),
  ('sleep_nights', 'light_min', 'health_connect', 5),
  ('sleep_nights', 'light_min', 'healthkit', 6),
  ('sleep_nights', 'light_min', 'sleep_cycle', 7),
  ('sleep_nights', 'rem_min', 'oura', 1),
  ('sleep_nights', 'rem_min', 'whoop', 2),
  ('sleep_nights', 'rem_min', 'polar', 3),
  ('sleep_nights', 'rem_min', 'garmin', 4),
  ('sleep_nights', 'rem_min', 'health_connect', 5),
  ('sleep_nights', 'rem_min', 'healthkit', 6),
  ('sleep_nights', 'rem_min', 'sleep_cycle', 7),
  ('sleep_nights', 'awake_min', 'oura', 1),
  ('sleep_nights', 'awake_min', 'whoop', 2),
  ('sleep_nights', 'awake_min', 'polar', 3),
  ('sleep_nights', 'awake_min', 'garmin', 4),
  ('sleep_nights', 'awake_min', 'health_connect', 5),
  ('sleep_nights', 'awake_min', 'healthkit', 6),
  ('sleep_nights', 'awake_min', 'sleep_cycle', 7),
  ('sleep_nights', 'hypnogram', 'oura', 1),
  ('sleep_nights', 'hypnogram', 'whoop', 2),
  ('sleep_nights', 'hypnogram', 'polar', 3),
  ('sleep_nights', 'hypnogram', 'garmin', 4),
  ('sleep_nights', 'hypnogram', 'health_connect', 5),
  ('sleep_nights', 'hypnogram', 'healthkit', 6),
  ('sleep_nights', 'hypnogram', 'sleep_cycle', 7),
  ('sleep_nights', 'efficiency', 'oura', 1),
  ('sleep_nights', 'efficiency', 'whoop', 2),
  ('sleep_nights', 'efficiency', 'garmin', 3),
  ('sleep_nights', 'efficiency', 'polar', 4),
  ('sleep_nights', 'efficiency', 'health_connect', 5),
  ('sleep_nights', 'efficiency', 'healthkit', 6),
  ('sleep_nights', 'latency_min', 'oura', 1),
  ('sleep_nights', 'latency_min', 'health_connect', 2),
  ('sleep_nights', 'latency_min', 'healthkit', 3),
  ('sleep_nights', 'latency_min', 'whoop', null),
  ('sleep_nights', 'latency_min', 'garmin', null),
  ('sleep_nights', 'latency_min', 'polar', null),
  ('health_os_daily', 'steps', 'whoop', null),
  ('health_os_daily', 'spo2_pct', 'polar', null),
  ('health_os_daily', 'temp_deviation_c', 'whoop', null);

alter table public.health_source_field_priority enable row level security;
drop policy if exists "Anyone signed in reads field priority" on public.health_source_field_priority;
create policy "Anyone signed in reads field priority" on public.health_source_field_priority
  for select to authenticated using (true);
revoke all on public.health_source_field_priority from anon, authenticated;
grant select on public.health_source_field_priority to authenticated;
grant all on public.health_source_field_priority to service_role;

update public.health_source_priority set rank = 4 where source = 'polar';

comment on table public.health_source_priority is
  'Orden GENERAL de fuentes (rank menor gana) para los datos que no tienen orden propio en health_source_field_priority. client_can_write = el teléfono puede escribir con esta fuente; las demás solo el servidor.';

-- ----------------------------------------------------------------------------
-- 2. Rango de una fuente para un dato
-- ----------------------------------------------------------------------------
create or replace function public.health_source_rank(p_tbl text, p_field text, p_source text)
returns integer
language sql
stable
set search_path = ''
as $f$
  select case
    when p_source is null or p_source = 'mixto' then 99
    when exists (select 1 from public.health_source_field_priority f
                  where f.tbl = p_tbl and f.field = p_field)
      then case when exists (select 1 from public.health_source_field_priority f
                              where f.tbl = p_tbl and f.field = p_field and f.source = p_source)
                then (select f.rank from public.health_source_field_priority f
                       where f.tbl = p_tbl and f.field = p_field and f.source = p_source)  -- null = excluido
                else 99 end
    else coalesce((select p.rank from public.health_source_priority p where p.source = p_source), 99)
  end;
$f$;
revoke all on function public.health_source_rank(text, text, text) from public, anon;
grant execute on function public.health_source_rank(text, text, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Respaldo y purga con el rango por dato
-- ----------------------------------------------------------------------------
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
           where v.user_id = p_user and v.tbl = p_tbl and v.day = p_day and v.field = p_field
             and v.source is distinct from p_except
           order by public.health_source_rank(p_tbl, p_field, v.source), v.updated_at desc
           limit 1);
end;
$f$;
revoke all on function private.best_source_value(uuid, text, date, text, text) from public, anon;
grant execute on function private.best_source_value(uuid, text, date, text, text) to authenticated, service_role;

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
         where v.user_id = p_user and v.tbl = t and v.day = r.day and v.field = k and v.source <> p_source
         order by public.health_source_rank(t, k, v.source), v.updated_at desc
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

-- ----------------------------------------------------------------------------
-- 4. Trigger de jerarquía con el rango por dato
--    (los triggers de la 344 ya apuntan a esta función; no se recrean)
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
    select client_can_write into w_client
      from public.health_source_priority where source = writer;

    if is_client and not coalesce(w_client, false) then
      if writer is not null and (tg_op = 'INSERT' or writer is distinct from old.source) then
        raise exception 'Solo el servidor puede guardar datos con fuente %', writer;
      end if;
      -- El teléfono no dijo su fuente y la fila es de una marca (o 'mixto'):
      -- escribe como nadie, abajo de todos. Así no se hace pasar por la marca.
      writer := null;
    end if;

    for k in select jsonb_object_keys(newj) loop
      continue when k = any(meta);
      fb := null;
      continue when tg_op = 'INSERT' and (newj -> k is null or newj -> k = 'null'::jsonb);
      continue when tg_op = 'UPDATE' and (newj -> k) is not distinct from (oldj -> k);
      w_rank := public.health_source_rank(tg_table_name, k, writer);
      if w_rank is null then   -- regla 5: esta fuente no cuenta para este dato
        restore := restore || jsonb_build_object(k, coalesce(oldj -> k, 'null'::jsonb));
        continue;
      end if;
      if tg_op = 'INSERT' then
        fs := fs || jsonb_build_object(k, coalesce(writer, 'mixto'));
        continue;
      end if;

      o_src := fs ->> k;
      o_rank := coalesce(public.health_source_rank(tg_table_name, k, o_src), 100);

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

-- ----------------------------------------------------------------------------
-- 5. Candado: cada marca directa tiene renglón en cada dato con orden
-- ----------------------------------------------------------------------------
do $chk$
declare
  faltan text;
begin
  select string_agg(format('%s.%s/%s', d.tbl, d.field, p.source), ', ')
    into faltan
    from (select distinct tbl, field from public.health_source_field_priority) d
    cross join public.health_source_priority p
   where p.client_can_write = false
     and not exists (select 1 from public.health_source_field_priority f
                      where f.tbl = d.tbl and f.field = d.field and f.source = p.source);
  if faltan is not null then
    raise exception 'Faltan renglones de orden por dato para marcas directas: %', faltan;
  end if;
end
$chk$;

commit;
