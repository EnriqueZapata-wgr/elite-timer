-- 295_techo_por_gasto.sql — NOCHE-3 A · el techo antiabuso se calibra por GASTO.
-- Idempotente. `npx supabase db push` post-merge. NO la corre el agente.
-- Nada destructivo: dos columnas nuevas, una tabla nueva, dos funciones nuevas.
-- No borra, no transforma y no toca message_count ni weighted_units.
--
-- ── POR QUÉ ────────────────────────────────────────────────────────────────
-- El proxy tenía un techo antiabuso de 2000 LLAMADAS al día. Medido en
-- argos_logs a 30 días (813 llamadas, 62 días-usuario), el costo por llamada
-- varía DIEZ VECES: 0.006 USD en promedio contra 0.023 USD en el pico. Esas
-- mismas 2000 llamadas cuestan 12 pesos o 800 pesos según cuáles sean, así que
-- contar llamadas no acota el gasto: acota una unidad que no significa nada.
--
-- El insumo real ya estaba en la casa. argos_logs.estimated_cost_usd se escribe
-- por llamada desde que existe el proxy. Lo único que faltaba era acumularlo por
-- usuario para poder leerlo ANTES de la siguiente llamada, y no un mes después
-- en el corte de Anthropic.
--
-- ── LOS DOS UMBRALES, QUE NO SON LO MISMO ──────────────────────────────────
-- Se separan a propósito y el código nombra cuál es cuál:
--
--   NEGOCIO (150 MXN por usuario por mes) → avisa y REGISTRA. No corta. Es un
--   número de presupuesto: dice "este usuario cuesta más de lo que modelamos",
--   no dice "este usuario está abusando". Cortarle a quien paga es exactamente
--   lo que el pivote a membresía única dejó de hacer.
--
--   FRAUDE (500 MXN por usuario por DÍA) → corta. Es un número de seguridad:
--   diez veces el día más pesado que se ha registrado (2.51 USD ≈ 47 MXN) y más
--   de tres veces el presupuesto mensual completo quemado en 24 horas. Ninguna
--   persona real lo alcanza; una llave filtrada en un bucle lo revienta en
--   minutos, y ese es el único escenario que este corte existe para atajar.
--
-- El aviso es la alarma temprana del corte: cuando una cuenta comprometida
-- empieza a gastar, el aviso se registra el día 1 con un humano del otro lado,
-- mucho antes de que el corte diario tenga que actuar treinta veces.

-- ── A · gasto acumulado del día, en la fila que ya existe ──────────────────
ALTER TABLE argos_daily_usage
  ADD COLUMN IF NOT EXISTS spend_usd NUMERIC(12,6) NOT NULL DEFAULT 0;

COMMENT ON COLUMN argos_daily_usage.spend_usd IS
  'NOCHE-3 — gasto real acumulado del día en USD (suma de argos_logs.estimated_cost_usd), reconciliado contra la reserva por llamada. Es el insumo del techo antiabuso por gasto. message_count y weighted_units se conservan intactos: siguen siendo el conteo crudo y la cuota ponderada, y son el insumo de los límites suaves que vienen después.';

CREATE INDEX IF NOT EXISTS idx_argos_daily_usage_user_date
  ON argos_daily_usage (user_id, usage_date DESC);

-- ── B · bitácora de avisos de presupuesto ──────────────────────────────────
-- "Avisa y REGISTRA" necesita dónde registrar. Una fila por usuario por mes:
-- el aviso es un evento de presupuesto, no un contador. El UNIQUE es lo que
-- hace que se avise UNA vez y no en cada llamada de lo que resta del mes.
CREATE TABLE IF NOT EXISTS argos_spend_notices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month       DATE NOT NULL,
  spend_usd   NUMERIC(12,6) NOT NULL,
  spend_mxn   NUMERIC(12,2) NOT NULL,
  threshold_mxn NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_argos_spend_notices_user_month
  ON argos_spend_notices (user_id, month);

COMMENT ON TABLE argos_spend_notices IS
  'NOCHE-3 — un renglón por usuario por mes cuando su gasto de IA cruzó el umbral DE NEGOCIO (150 MXN). No implica abuso ni corta nada: es la lista de a quién le está costando más de lo modelado, para decidir ruteo de modelos con datos y no con corazonadas.';

-- Regla 4 de CLAUDE.md: cada CREATE TABLE con RLS y su policy.
ALTER TABLE argos_spend_notices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'argos_spend_notices'
      AND policyname = 'Users read own argos_spend_notices'
  ) THEN
    -- Solo lectura para el dueño. Nadie escribe desde el cliente: los avisos
    -- los pone el proxy con service_role dentro de consume_argos_spend.
    CREATE POLICY "Users read own argos_spend_notices" ON argos_spend_notices
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── C · la compuerta: evalúa gasto y reserva la llamada en curso ───────────
CREATE OR REPLACE FUNCTION consume_argos_spend(
  p_user_id            uuid,
  p_fraud_daily_usd    numeric,
  p_notice_monthly_usd numeric,
  p_reserve_usd        numeric DEFAULT 0,
  p_fx_usd_mxn         numeric DEFAULT 18.75
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today   numeric;
  v_month   numeric;
  v_reserve numeric;
  v_notice  boolean := false;
  v_fresh   boolean := false;
BEGIN
  v_reserve := GREATEST(COALESCE(p_reserve_usd, 0), 0);

  INSERT INTO argos_daily_usage (user_id, usage_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT spend_usd INTO v_today
  FROM argos_daily_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  -- Mes calendario en curso, la fila de hoy incluida.
  SELECT COALESCE(SUM(spend_usd), 0) INTO v_month
  FROM argos_daily_usage
  WHERE user_id = p_user_id
    AND usage_date >= date_trunc('month', CURRENT_DATE)::date
    AND usage_date <= CURRENT_DATE;

  -- ── UMBRAL DE FRAUDE ── El único que corta. Bloquea SIN reservar, mismo
  -- criterio que consume_argos_usage (ECO-2): insistir no encarece el
  -- desbloqueo posterior.
  IF v_today >= p_fraud_daily_usd THEN
    RETURN jsonb_build_object(
      'blocked', true, 'reason', 'fraud_daily_spend',
      'spend_today_usd', v_today, 'spend_month_usd', v_month,
      'notice', v_month >= p_notice_monthly_usd, 'notice_fresh', false);
  END IF;

  -- ── UMBRAL DE NEGOCIO ── Nunca corta. Deja constancia una vez por mes.
  IF v_month >= p_notice_monthly_usd THEN
    v_notice := true;
    INSERT INTO argos_spend_notices (user_id, month, spend_usd, spend_mxn, threshold_mxn)
    VALUES (p_user_id, date_trunc('month', CURRENT_DATE)::date, v_month,
            ROUND(v_month * p_fx_usd_mxn, 2),
            ROUND(p_notice_monthly_usd * p_fx_usd_mxn, 2))
    ON CONFLICT (user_id, month) DO NOTHING;
    v_fresh := FOUND;
  END IF;

  -- Reserva de la llamada en curso. Sin esto, un script en paralelo mete mil
  -- peticiones dentro de la ventana de latencia y las mil pasan la compuerta
  -- porque ninguna ha cobrado todavía. La reserva es el costo PROMEDIO medido,
  -- no el pico, para no inflar el gasto de quien usa la app normal; el exceso
  -- de las llamadas caras lo agrega record_argos_spend al reconciliar.
  UPDATE argos_daily_usage
  SET spend_usd  = spend_usd + v_reserve,
      updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  RETURNING spend_usd INTO v_today;

  RETURN jsonb_build_object(
    'blocked', false, 'reason', NULL,
    'spend_today_usd', v_today, 'spend_month_usd', v_month + v_reserve,
    'notice', v_notice, 'notice_fresh', v_fresh);
END;
$$;

REVOKE ALL ON FUNCTION consume_argos_spend(uuid, numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_argos_spend(uuid, numeric, numeric, numeric, numeric) TO service_role;

COMMENT ON FUNCTION consume_argos_spend(uuid, numeric, numeric, numeric, numeric) IS
  'NOCHE-3 — compuerta del techo antiabuso por gasto. Dos umbrales con semántica distinta: p_fraud_daily_usd CORTA (seguridad), p_notice_monthly_usd solo avisa y registra en argos_spend_notices (presupuesto). Reserva p_reserve_usd para cerrar la carrera de peticiones concurrentes; record_argos_spend reconcilia contra el costo real.';

-- ── D · reconciliación con el costo real de la llamada ─────────────────────
CREATE OR REPLACE FUNCTION record_argos_spend(
  p_user_id     uuid,
  p_cost_usd    numeric,
  p_reserve_usd numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Se suma la DIFERENCIA contra lo ya reservado en la compuerta, que puede ser
  -- negativa cuando la llamada salió más barata que el promedio. GREATEST(0,...)
  -- impide que una racha de llamadas baratas empuje el acumulado por debajo de
  -- cero y regale gasto del día.
  UPDATE argos_daily_usage
  SET spend_usd  = GREATEST(spend_usd + COALESCE(p_cost_usd, 0) - GREATEST(COALESCE(p_reserve_usd, 0), 0), 0),
      updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
END;
$$;

REVOKE ALL ON FUNCTION record_argos_spend(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_argos_spend(uuid, numeric, numeric) TO service_role;

COMMENT ON FUNCTION record_argos_spend(uuid, numeric, numeric) IS
  'NOCHE-3 — cierra la llamada: cambia la reserva de consume_argos_spend por el costo real ya conocido. La llama el proxy desde logArgosCall, donde el costo ya está calculado, para no tener dos fuentes del mismo número.';
