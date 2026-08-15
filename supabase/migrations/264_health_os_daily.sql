-- 264_health_os_daily.sql — Lo que mide el teléfono, en su propia tabla (NOCHE-1)
--
-- Una fila por día por usuario con lo que ATP LEE de la plataforma de salud
-- del sistema (Health Connect en Android, Salud de Apple en iOS): pasos,
-- minutos dormidos, frecuencia cardiaca en reposo, peso y energía activa.
--
-- Por qué tabla propia y no columnas nuevas en health_measurements:
--   health_measurements es el expediente que la PERSONA escribe a mano, y
--   tiene UNIQUE (user_id, date) con un solo `source` a nivel de FILA. Meter
--   ahí lo que mide una máquina obliga a elegir un ganador por día: si
--   alguien anotó su peso a mano y el reloj reporta otro, el upsert de la
--   máquina le borraría el dato a la persona. Datos de máquina se validan,
--   datos de la persona son sagrados. Separadas, las dos versiones existen
--   y quien lee decide (la persona manda).
--
-- Todas las métricas son NULLABLE a propósito: conceder el permiso de pasos
-- y no el de peso es un caso NORMAL, no un error. Un día con una sola
-- métrica es una fila válida; un día sin ninguna no se escribe (lo filtra
-- diasConDatos en el cliente).
--
-- Los CHECK repiten los rangos de health-metrics-core.ts. Es a propósito:
-- el cliente puede tener una versión vieja por OTA, la base no. Una báscula
-- que pesó una maleta no entra ni aunque el cliente la deje pasar.
--
-- source nace con los dos valores del día uno (lección 246/261: un CHECK que
-- el código viola porque el ALTER se quedó en un comentario).
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS health_os_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Fecha LOCAL del dispositivo, no UTC.
  date DATE NOT NULL,
  steps INTEGER CHECK (steps IS NULL OR steps BETWEEN 0 AND 120000),
  sleep_minutes INTEGER CHECK (sleep_minutes IS NULL OR sleep_minutes BETWEEN 0 AND 1440),
  resting_hr INTEGER CHECK (resting_hr IS NULL OR resting_hr BETWEEN 25 AND 220),
  weight_kg NUMERIC(5,1) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400),
  active_kcal INTEGER CHECK (active_kcal IS NULL OR active_kcal BETWEEN 0 AND 15000),
  source TEXT NOT NULL CHECK (source IN ('health_connect', 'healthkit')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un día, un registro: la resincronización actualiza, no duplica.
  UNIQUE (user_id, date)
);

ALTER TABLE health_os_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own health_os_daily" ON health_os_daily;
CREATE POLICY "Users own health_os_daily" ON health_os_daily
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_os_daily_user_date
  ON health_os_daily(user_id, date DESC);
