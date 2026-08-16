-- 275_insight_ventana_y_cuota_ponderada.sql — CIERRE-4 (costos ARGOS).
-- Idempotente. `npx supabase db push` post-merge. NO la corre el agente.
--
-- Dos piezas, ninguna destructiva, ninguna borra ni transforma datos existentes:
--
--   A · argos_daily_insights.stale — el insight diario deja de invalidarse
--       falseando `created_at`. Hoy `invalidateDailyInsight` escribe epoch 0 en
--       la marca de tiempo, que además de mentirle a cualquier lector del
--       historial anula la única guarda de frecuencia que existía. Con una
--       bandera aparte, `created_at` vuelve a significar lo que dice y la
--       decisión de regenerar vive en argos-insight-window-core.
--
--   B · consume_argos_usage_weighted — el circuit breaker diario deja de cobrar
--       lo mismo por una extracción barata que por una consulta de salud. Medido
--       en argos_logs a 30 días: chat $0.03837 por llamada contra
--       food_estimate_text $0.00338. Once veces de diferencia, misma unidad de
--       cuota. Un usuario Base (25/día) que registra 20 comidas por foto se
--       quedaba sin ARGOS habiendo gastado siete centavos de dólar.
--
-- CANDADO DE DISEÑO (no negociable, ver comentario de la función): todos los
-- pesos son <= 1. La cuota ponderada NUNCA puede ser más estricta que la de
-- hoy, solo más holgada. Nadie pierde acceso a algo que pagó.

-- ── A · marca de invalidación del insight diario ──────────────────────────
ALTER TABLE argos_daily_insights
  ADD COLUMN IF NOT EXISTS stale BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN argos_daily_insights.stale IS
  'CIERRE-4 — el día cambió desde que se generó este insight. Lo pone invalidateDailyInsight; lo consume decidirRegeneracionInsight junto con la ventana de 4h. Reemplaza el hack de escribir created_at = epoch 0.';

-- La tabla nace con RLS en 050. Se reafirma idempotentemente (regla 4 CLAUDE.md):
-- ENABLE es no-op si ya estaba activo, y la policy se recrea solo si falta.
ALTER TABLE argos_daily_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'argos_daily_insights'
      AND policyname = 'Users own argos_insights'
  ) THEN
    CREATE POLICY "Users own argos_insights" ON argos_daily_insights
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── B · cuota diaria ponderada por costo real ─────────────────────────────
-- Columna nueva, en numérico, para no tocar message_count (que sigue contando
-- acciones servidas y alimenta cualquier reporte existente).
ALTER TABLE argos_daily_usage
  ADD COLUMN IF NOT EXISTS weighted_units NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN argos_daily_usage.weighted_units IS
  'CIERRE-4 — consumo diario ponderado por costo real de la acción (peso <= 1 siempre). message_count se conserva intacto como conteo crudo de acciones servidas.';

CREATE OR REPLACE FUNCTION consume_argos_usage_weighted(
  p_user_id uuid,
  p_limit int,
  p_weight numeric DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_units  numeric;
  v_count  int;
  v_weight numeric;
BEGIN
  -- El peso se satura en [0, 1] DENTRO de la función, no solo en el proxy.
  -- Un peso > 1 haría la cuota más estricta que la de hoy y podría dejar sin
  -- ARGOS a alguien que pagó: eso es exactamente lo que este trabajo existe
  -- para impedir, así que el candado vive en la base y no en el llamador.
  v_weight := LEAST(GREATEST(COALESCE(p_weight, 1), 0), 1);

  INSERT INTO argos_daily_usage (user_id, usage_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT weighted_units, message_count INTO v_units, v_count
  FROM argos_daily_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  -- Mismo criterio que consume_argos_usage (ECO-2): bloquea SIN incrementar,
  -- para que insistir no encarezca el desbloqueo posterior con un boost.
  IF v_units >= p_limit THEN
    RETURN jsonb_build_object('blocked', true, 'count', CEIL(v_units)::int,
                              'units', v_units, 'weighted', true);
  END IF;

  -- Peso 0 (acción declarada gratuita): se sirve y se cuenta como acción, pero
  -- no consume cuota. No se retorna antes del UPDATE para que message_count
  -- siga siendo el conteo fiel de acciones servidas.
  UPDATE argos_daily_usage
  SET weighted_units = weighted_units + v_weight,
      message_count  = message_count + 1,
      updated_at     = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  RETURNING weighted_units, message_count INTO v_units, v_count;

  RETURN jsonb_build_object('blocked', false, 'count', CEIL(v_units)::int,
                            'units', v_units, 'weighted', true);
END;
$$;

REVOKE ALL ON FUNCTION consume_argos_usage_weighted(uuid, int, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_argos_usage_weighted(uuid, int, numeric) TO service_role;

COMMENT ON FUNCTION consume_argos_usage_weighted(uuid, int, numeric) IS
  'CIERRE-4 — circuit breaker ARGOS ponderado por costo real de la acción. Peso saturado a [0,1] en la propia función: la cuota resultante nunca es más estricta que consume_argos_usage. El proxy cae a consume_argos_usage si esta no existe todavía.';
