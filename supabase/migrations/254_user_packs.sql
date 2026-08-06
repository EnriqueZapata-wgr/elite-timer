-- 254 · MB-25 Pieza 2 — El registro de activación de packs.
--
-- Un pack configura la app de un jalón (instala apps, enciende hábitos con
-- su hora, fija metas, configura avisos). Esta tabla guarda LA ACTIVACIÓN:
-- qué pack, con qué intensidad y con qué horario. Con eso pack-core
-- reconstruye el plan de la activación anterior y la re-activación no pisa
-- lo que el usuario cambió a mano (idempotencia del motor).
--
-- Doctrina: UN pack activo a la vez (active) y desactivar NO borra la fila
-- ni desinstala nada — la fila inactiva conserva la memoria del ajuste.
--
-- Idempotente. RLS owner-only. db push ANTES del OTA.

CREATE TABLE IF NOT EXISTS user_packs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_key TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  intensidad TEXT NOT NULL DEFAULT 'suave' CHECK (intensidad IN ('suave', 'con_todo')),
  wake_time TEXT NOT NULL CHECK (wake_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  sleep_time TEXT NOT NULL CHECK (sleep_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_key)
);

ALTER TABLE user_packs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_packs'
      AND policyname = 'Users own packs'
  ) THEN
    CREATE POLICY "Users own packs" ON user_packs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
