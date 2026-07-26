-- 234 · edad_atp_calculations al vocabulario del motor v2 (MB-6, corrección Enrique)
--
-- 1) algoritmo_excel es del motor v1 (matriz V7/V6: edad_integral = algoritmo_excel
--    + modificador_cognitivo). El motor v2 NO produce ese valor → nullable, no se
--    rellena con sustitutos.
-- 2) Las 5 columnas legacy recibían áreas v2 que no corresponden al nombre
--    (edad_cardiovascular ← areas.labs, edad_metabolica ← areas.riesgos): se
--    renombran al vocabulario v2 real ANTES de volver a escribir, para no
--    persistir datos mal etiquetados. edad_fitness ya coincide.
-- 3) motor_version distingue motores en señales y tendencias: los registros
--    existentes (111, último 2026-06-12) son del motor v1. El insert v2 escribe
--    motor_version = 'v2' y las lecturas (edadAtpDelta → ARGOS) filtran por el
--    motor actual.
--
-- Idempotente: renames guardeados por existencia de columna; DROP NOT NULL y
-- ADD COLUMN IF NOT EXISTS son re-ejecutables; el backfill solo toca NULL
-- (las filas v2 nacen con motor_version explícito, nunca NULL).

alter table public.edad_atp_calculations
  alter column algoritmo_excel drop not null;

do $$
declare
  renames constant text[][] := array[
    ['edad_metabolica',     'edad_riesgos'],
    ['edad_corporal',       'edad_composicion'],
    ['edad_cardiovascular', 'edad_labs'],
    ['edad_cognitiva',      'edad_cognicion']
  ];
  r text[];
begin
  foreach r slice 1 in array renames loop
    if exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'edad_atp_calculations'
           and column_name = r[1]
       )
       and not exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'edad_atp_calculations'
           and column_name = r[2]
       ) then
      execute format(
        'alter table public.edad_atp_calculations rename column %I to %I',
        r[1], r[2]
      );
    end if;
  end loop;
end $$;

alter table public.edad_atp_calculations
  add column if not exists motor_version text;

-- Backfill: todo lo escrito hasta hoy salió del motor v1.
update public.edad_atp_calculations
  set motor_version = 'v1'
  where motor_version is null;
