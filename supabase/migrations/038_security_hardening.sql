-- ============================================================================
-- 038 — SECURITY HARDENING: RLS + Policies completas
-- ============================================================================
-- Garantiza que TODAS las tablas tienen RLS habilitado y policies que
-- restringen acceso a auth.uid() = user_id (o equivalente).
--
-- Idempotente: usa ALTER IF EXISTS, DROP POLICY IF EXISTS, y verifica
-- existencia de columna user_id antes de crear policies.
-- ============================================================================

-- ============================================================================
-- PASO 1: Habilitar RLS en TODAS las tablas (las que ya lo tienen no cambian)
-- ============================================================================

-- Tablas core (pueden haber sido creadas fuera de migraciones locales)
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS routine_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS execution_block_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coach_clients ENABLE ROW LEVEL SECURITY;

-- Tablas de nutrición
ALTER TABLE IF EXISTS nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fasting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_nutrition_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;

-- Tablas de fitness deep
ALTER TABLE IF EXISTS cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cardio_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mobility_assessments ENABLE ROW LEVEL SECURITY;

-- Tablas de ciclo menstrual
ALTER TABLE IF EXISTS cycle_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cycle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cycle_symptoms ENABLE ROW LEVEL SECURITY;

-- Tablas de mente / journal
ALTER TABLE IF EXISTS emotional_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries ENABLE ROW LEVEL SECURITY;

-- Tablas de salud / labs
ALTER TABLE IF EXISTS health_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lab_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clinical_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_reports ENABLE ROW LEVEL SECURITY;

-- Tablas de protocolos
ALTER TABLE IF EXISTS protocol_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS action_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_protocols ENABLE ROW LEVEL SECURITY;

-- Tablas de quiz / onboarding
ALTER TABLE IF EXISTS quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_chronotype ENABLE ROW LEVEL SECURITY;

-- Tablas de cliente / coach
ALTER TABLE IF EXISTS client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_routines ENABLE ROW LEVEL SECURITY;

-- Tablas misceláneas
ALTER TABLE IF EXISTS condition_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplement_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Policies genéricas para tablas con user_id
-- ============================================================================
-- Patron: usuario solo ve/escribe sus propios registros.

DO $$
DECLARE
  tbl TEXT;
  tables_with_user_id TEXT[] := ARRAY[
    'routines', 'execution_logs', 'execution_block_logs',
    'exercise_logs', 'personal_records',
    'nutrition_plans', 'food_logs', 'daily_nutrition_scores',
    'cardio_sessions', 'cardio_records', 'mobility_assessments',
    'hydration_logs', 'fasting_logs',
    'cycle_periods', 'cycle_settings', 'cycle_symptoms',
    'emotional_checkins', 'journal_entries',
    'health_measurements', 'health_scores',
    'lab_uploads', 'lab_results', 'clinical_studies',
    'body_measurements', 'ai_reports',
    'user_protocols', 'daily_plans', 'action_blocks', 'daily_protocols',
    'quiz_responses', 'quiz_results', 'user_chronotype',
    'client_profiles', 'client_daily_habits', 'consultations',
    'scheduled_routines',
    'condition_flags', 'family_history', 'medications',
    'supplement_protocols', 'user_subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_user_id
  LOOP
    -- Solo crear policies si la tabla existe y tiene columna user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'user_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "rls_%s_select" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "rls_%s_select" ON %I FOR SELECT USING (auth.uid() = user_id)', tbl, tbl);

      EXECUTE format('DROP POLICY IF EXISTS "rls_%s_insert" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "rls_%s_insert" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl, tbl);

      EXECUTE format('DROP POLICY IF EXISTS "rls_%s_update" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "rls_%s_update" ON %I FOR UPDATE USING (auth.uid() = user_id)', tbl, tbl);

      EXECUTE format('DROP POLICY IF EXISTS "rls_%s_delete" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "rls_%s_delete" ON %I FOR DELETE USING (auth.uid() = user_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 3: Policies especiales
-- ============================================================================

-- === PROFILES — acceso por id (no user_id) ===
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_profiles_select" ON profiles;
  CREATE POLICY "rls_profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
  DROP POLICY IF EXISTS "rls_profiles_update" ON profiles;
  CREATE POLICY "rls_profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
  DROP POLICY IF EXISTS "rls_profiles_insert" ON profiles;
  CREATE POLICY "rls_profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === EXERCISES — lectura publica, escritura solo admin ===
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_exercises_select" ON exercises;
  CREATE POLICY "rls_exercises_select" ON exercises FOR SELECT USING (true);
  DROP POLICY IF EXISTS "rls_exercises_insert" ON exercises;
  CREATE POLICY "rls_exercises_insert" ON exercises FOR INSERT
    WITH CHECK (auth.uid() = '90a55e74-0e3d-477a-9ac5-2b339f7c40af'::uuid
                OR (is_public = false AND auth.uid() = creator_id));
  DROP POLICY IF EXISTS "rls_exercises_update" ON exercises;
  CREATE POLICY "rls_exercises_update" ON exercises FOR UPDATE
    USING (auth.uid() = '90a55e74-0e3d-477a-9ac5-2b339f7c40af'::uuid
           OR auth.uid() = creator_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === BLOCKS — acceso via ownership de la rutina ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks') THEN
    DROP POLICY IF EXISTS "rls_blocks_select" ON blocks;
    CREATE POLICY "rls_blocks_select" ON blocks FOR SELECT USING (
      EXISTS (SELECT 1 FROM routines WHERE routines.id = blocks.routine_id AND routines.user_id = auth.uid())
    );
    DROP POLICY IF EXISTS "rls_blocks_insert" ON blocks;
    CREATE POLICY "rls_blocks_insert" ON blocks FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM routines WHERE routines.id = blocks.routine_id AND routines.user_id = auth.uid())
    );
    DROP POLICY IF EXISTS "rls_blocks_update" ON blocks;
    CREATE POLICY "rls_blocks_update" ON blocks FOR UPDATE USING (
      EXISTS (SELECT 1 FROM routines WHERE routines.id = blocks.routine_id AND routines.user_id = auth.uid())
    );
    DROP POLICY IF EXISTS "rls_blocks_delete" ON blocks;
    CREATE POLICY "rls_blocks_delete" ON blocks FOR DELETE USING (
      EXISTS (SELECT 1 FROM routines WHERE routines.id = blocks.routine_id AND routines.user_id = auth.uid())
    );
  END IF;
END $$;

-- === ROUTINE_SHARES — autor o destinatario ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_shares') THEN
    DROP POLICY IF EXISTS "rls_routine_shares_select" ON routine_shares;
    CREATE POLICY "rls_routine_shares_select" ON routine_shares FOR SELECT USING (
      auth.uid() = shared_by OR auth.uid() = shared_with
    );
    DROP POLICY IF EXISTS "rls_routine_shares_insert" ON routine_shares;
    CREATE POLICY "rls_routine_shares_insert" ON routine_shares FOR INSERT WITH CHECK (
      auth.uid() = shared_by
    );
  END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- === COACH_CLIENTS — coach o cliente ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_clients') THEN
    DROP POLICY IF EXISTS "rls_coach_clients_select" ON coach_clients;
    CREATE POLICY "rls_coach_clients_select" ON coach_clients FOR SELECT USING (
      auth.uid() = coach_id OR auth.uid() = client_id
    );
  END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- === PROTOCOL_TEMPLATES — lectura publica ===
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_protocol_templates_select" ON protocol_templates;
  CREATE POLICY "rls_protocol_templates_select" ON protocol_templates FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === QUIZ_TEMPLATES / QUIZZES — lectura publica ===
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_quiz_templates_select" ON quiz_templates;
  CREATE POLICY "rls_quiz_templates_select" ON quiz_templates FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_quizzes_select" ON quizzes;
  CREATE POLICY "rls_quizzes_select" ON quizzes FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- === RECIPES — lectura publica ===
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_recipes_select" ON recipes;
  CREATE POLICY "rls_recipes_select" ON recipes FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- PASO 4: Nota
-- ============================================================================
-- Despues de ejecutar, verifica en Supabase Dashboard → Authentication → Policies
-- que TODAS las tablas tienen al menos 1 policy.
-- Las tablas que no existian se saltaron sin error (ALTER TABLE IF EXISTS).
-- Las policies previas con nombres diferentes siguen existiendo; estas nuevas
-- con prefijo rls_ garantizan acceso minimo.
