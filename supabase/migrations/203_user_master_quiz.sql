-- 203: Cuestionario Maestro ATP — fenotipo epigenético (Mega-Sprint D).
--
-- Levanta el fenotipo completo del user (13 dimensiones + objetivos) que alimenta
-- el motor de personalización (personalize-interventions, ya existe). Una fila por
-- pregunta respondida; answer JSONB estructurada según el tipo de input.
-- Idempotente (IF NOT EXISTS / OR REPLACE / duplicate_object atrapado).
--
-- C1 (padecimientos activo/remisión/resuelto): NO tabla aparte — la respuesta de
-- D9.2 se guarda estructurada en `answer` (array de {condition,status,year}). El
-- scoring solo cuenta 'activo' para contraindicaciones (historia ≠ estado actual).

CREATE TABLE IF NOT EXISTS user_master_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,        -- 'd1_estado_cuerpo', 'd2_composicion', ...
  question_code VARCHAR(20) NOT NULL,  -- 'D1.1', 'D9.2', 'D9.4b', ...
  answer JSONB NOT NULL,               -- respuesta estructurada según tipo
  skipped BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_code)       -- una respuesta por pregunta (upsert al re-tomar)
);

CREATE INDEX IF NOT EXISTS idx_user_master_quiz_user_section
  ON user_master_quiz(user_id, section);

ALTER TABLE user_master_quiz ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY user_master_quiz_own ON user_master_quiz
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vista consolidada: todas las respuestas del user como un solo objeto + progreso.
-- security_invoker: la RLS de la tabla base gobierna (no fuga entre usuarios).
CREATE OR REPLACE VIEW user_phenotype
WITH (security_invoker = true) AS
SELECT
  user_id,
  jsonb_object_agg(question_code, answer) FILTER (WHERE NOT skipped) AS answers,
  count(*) FILTER (WHERE NOT skipped) AS questions_answered,
  count(DISTINCT section) AS sections_touched,
  max(answered_at) AS last_answered
FROM user_master_quiz
GROUP BY user_id;
