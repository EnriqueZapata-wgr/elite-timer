-- 249 · MB-22 Pieza 4 — Ciclo deja de depender del sexo biológico.
--
-- Modo por app instalada: 'propio' (mi ciclo, lo de siempre) o 'acompanante'
-- (sigo el ciclo de otra persona: un calendario que llevo yo, con lo que sé).
--
-- ⚠️ Lo delicado, escrito donde nace el dato:
--   · NO hay conexión entre cuentas. Nada se comparte con nadie. Si algún día
--     la hay, es su propio proyecto con consentimiento de ambas partes.
--   · Un ciclo en modo acompañante NUNCA entra a la Edad ATP, al contexto de
--     ARGOS ni a ningún cálculo de salud del usuario. El gate vive en el
--     cliente (getCycleInfo — raíz única) y ESTA tabla es su fuente de modo.
--
-- Idempotente. RLS owner-only. db push ANTES del OTA, como siempre; el
-- cliente degrada fail-soft si la tabla aún no existe (modo null = el
-- comportamiento de hoy por biological_sex).

CREATE TABLE IF NOT EXISTS user_app_modes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('propio', 'acompanante')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_key)
);

ALTER TABLE user_app_modes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_app_modes'
      AND policyname = 'Users own app modes'
  ) THEN
    CREATE POLICY "Users own app modes" ON user_app_modes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Backfill: quien hoy tiene ciclo por biological_sex queda en modo propio,
-- sin perder nada. ON CONFLICT DO NOTHING → re-ejecutable.
INSERT INTO user_app_modes (user_id, app_key, mode)
SELECT user_id, 'ciclo', 'propio'
FROM client_profiles
WHERE biological_sex = 'female'
ON CONFLICT (user_id, app_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
