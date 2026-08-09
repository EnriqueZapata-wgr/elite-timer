-- 261_sleep_nights.sql — El sueño cobra vida (MB-30A · Pieza 1)
--
-- Primera tabla propia del módulo de sueño. Una fila por noche por usuario:
-- el UNIQUE (user_id, night_date) es la regla "una noche, un registro" EN LA
-- BASE, no solo en el cliente. night_date es la fecha local en que la noche
-- TERMINA (el día en que despiertas).
--
-- Quién manda cuando hay dos fuentes para la misma noche:
--   · La sesión propia (source='sleep_cycle') MANDA: escribe con upsert
--     ON CONFLICT DO UPDATE (pisa un import previo de la misma noche).
--   · El import (health_connect/healthkit) NUNCA pisa: escribe con
--     ignoreDuplicates (ON CONFLICT DO NOTHING).
-- El contrato vive en un test (sleep-source-contract), no solo aquí.
--
-- Lección MB-27 (246): el CHECK de source nace con los valores del import
-- DESDE EL DÍA UNO — el bug de cardio fue un CHECK que el código violaba
-- porque el ALTER se declaró en un comentario y nunca se escribió.
--
-- Sin fases y sin prometerlas: la tabla guarda horas, score de calma y
-- minutos de ronquido. NO hay columnas de fases porque el sensor no las
-- mide y el producto no las promete.
--
-- Privacidad: aquí solo aterrizan NÚMEROS (niveles procesados en el
-- dispositivo). Ningún fragmento de audio se guarda ni se sube, nunca.
--
-- Idempotente. MB-30B corre en paralelo sin migraciones: esta es la 261.

CREATE TABLE IF NOT EXISTS sleep_nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Fecha local del despertar: la noche del 7 al 8 es night_date = 8.
  night_date DATE NOT NULL,
  bed_time TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 0 AND 1440),
  -- Score de CALMA de la noche (0-100): qué tan movida estuvo, por niveles
  -- de sonido. No es "calidad de sueño" clínica ni arquitectura de fases.
  score INTEGER CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  snore_minutes INTEGER CHECK (snore_minutes IS NULL OR snore_minutes BETWEEN 0 AND 1440),
  source TEXT NOT NULL CHECK (source IN ('sleep_cycle', 'health_connect', 'healthkit')),
  -- Id del registro en la plataforma de salud (solo imports).
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, night_date)
);

ALTER TABLE sleep_nights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own sleep_nights" ON sleep_nights;
CREATE POLICY "Users own sleep_nights" ON sleep_nights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sleep_nights_user_date
  ON sleep_nights(user_id, night_date DESC);
