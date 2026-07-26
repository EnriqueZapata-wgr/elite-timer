-- ============================================================================
-- 230 — MB-SEC-1 §5 · documentar las 7 tablas con RLS activo y CERO policies.
--
-- Hallazgo advisor: 7 tablas con RLS ON sin policies. Eso YA es seguro por
-- defecto (deniegan todo salvo service_role), pero un auditor lo pregunta. Se
-- deja constancia EXPLÍCITA en el comentario de la tabla de que el acceso
-- solo-servicio es intencional. No se abren policies (nadie del cliente debe
-- leerlas: son de edge functions / tooling clínico).
--
-- Guardado con to_regclass: si la tabla no existe en el destino (p.ej. el schema
-- elite_dx no está en todos los entornos), se salta sin error.
--
-- Idempotente (COMMENT sobrescribe). NO aplicar al remoto desde este branch.
-- ============================================================================

DO $$
DECLARE
  r text[];
  targets text[][] := ARRAY[
    ['public.argos_brain',            'RLS ON sin policies: acceso solo service_role (edge functions promueven/leen el cerebro). Intencional — MB-SEC-1 §5.'],
    ['public.argos_config',           'RLS ON sin policies: config de ARGOS solo service_role. Intencional — MB-SEC-1 §5.'],
    ['public.argos_dx_memory',        'RLS ON sin policies: memoria clínica de ARGOS solo service_role. Intencional — MB-SEC-1 §5.'],
    ['public.push_failure_log',       'RLS ON sin policies: log de fallos de push solo service_role. Intencional — MB-SEC-1 §5.'],
    ['elite_dx.clients',              'RLS ON sin policies: datos clínicos solo service_role / tooling elite_dx. Intencional — MB-SEC-1 §5.'],
    ['elite_dx.intake',               'RLS ON sin policies: intake clínico solo service_role / tooling elite_dx. Intencional — MB-SEC-1 §5.'],
    ['elite_dx.braverman_results',    'RLS ON sin policies: resultados clínicos solo service_role / tooling elite_dx. Intencional — MB-SEC-1 §5.']
  ];
BEGIN
  FOREACH r SLICE 1 IN ARRAY targets LOOP
    IF to_regclass(r[1]) IS NOT NULL THEN
      EXECUTE format('COMMENT ON TABLE %s IS %L', r[1], r[2]);
      RAISE NOTICE 'MB-SEC-1: documentada RLS-sin-policies → %', r[1];
    ELSE
      RAISE NOTICE 'MB-SEC-1: % no existe en este destino, se salta', r[1];
    END IF;
  END LOOP;
END $$;
