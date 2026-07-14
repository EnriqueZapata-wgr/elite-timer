-- ============================================================================
-- 198a — Reescritura de handle_new_user(): fuera supplement_protocols.
--        (Peloteo #80, decisión B: reescribir el trigger HOY para poder
--        dropear supplement_protocols limpio en 198b. Cero deuda.)
--
-- ⚠️ HALLAZGO VERIFICADO CONTRA REMOTO (2026-07-14, pg_get_functiondef):
--   La handle_new_user() LIVE ya no era la de 024 — alguien la redujo vía
--   SQL Editor a un hotfix mínimo (solo INSERT a profiles, EXCEPTION swallow)
--   que PERDIÓ la vinculación de placeholders de invite_client_by_email (008).
--   Causa probable del hotfix: 024 hacía UPDATE sobre daily_protocol_items y
--   daily_habits_map, que NO EXISTEN en el remoto → el bloque placeholder
--   reventaba el signup de emails invitados. Hoy hay 4 placeholders y 7 filas
--   en coach_clients esperando vinculación.
--
-- Qué hace esta versión:
--   1. RESTAURA la vinculación de placeholders (lógica canónica de 024) pero:
--      - SIN supplement_protocols (se dropea en 198b; remoto: 0 filas).
--      - SIN daily_protocol_items / daily_habits_map (no existen en remoto).
--      - ai_reports migra por client_id + coach_id (024 decía user_id, que
--        NO existe en remoto — tercer bug latente del 024 original).
--      - ORDEN CORREGIDO (cuarto bug de 024, detectado en test e2e con
--        rollback contra remoto): las FKs de coach_clients/medications/etc.
--        apuntan a profiles(id) → el perfil NUEVO debe existir ANTES de los
--        UPDATE. Pero profiles.email es UNIQUE → el placeholder debe soltar
--        el email primero. Orden final: liberar email del placeholder →
--        upsert perfil nuevo → migrar FKs → borrar placeholder.
--      - Cada UPDATE va vía EXECUTE con guard de tabla+columna en
--        information_schema → drift de schema degrada a skip de esa entrada,
--        nunca a signup roto.
--   2. FAIL-SOFT en tres bloques independientes (preserva la resiliencia del
--      hotfix live): cualquier bloque que falle se loguea y el signup
--      continúa; el peor caso es un placeholder huérfano renombrado
--      'migrating-<uuid>@placeholder.local' (visible en logs, recuperable a
--      mano), nunca un signup roto.
--   3. Re-asegura el trigger on_auth_user_created en auth.users.
--
-- Redirect a user_supplements: NO APLICA (verificado). user_supplements tiene
--   FK user_id → auth.users; los placeholders solo existen en profiles, nunca
--   en auth.users → estructuralmente no puede haber datos de placeholder en
--   user_supplements que migrar. El único flujo real que tocaba
--   supplement_protocols en signup era el UPDATE de placeholder, y con 0
--   filas remotas no hay pérdida.
--
-- Idempotente (CREATE OR REPLACE + DROP TRIGGER IF EXISTS). En replay local
-- desde cero corre después de 007/008/024 → orden seguro.
-- ⚠️ NO aplicar al remoto desde la rama — Enrique corre `npx supabase db push`
-- tras el merge + audit Cowork (regla #12).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_id UUID;
  v_pair TEXT[];
BEGIN
  -- Bloque 1: detectar placeholder de invitación coach y liberar su email
  -- (profiles.email es UNIQUE; el perfil nuevo lo necesita en el bloque 2).
  BEGIN
    SELECT id INTO v_old_id FROM profiles
      WHERE email = lower(NEW.email) AND id != NEW.id
      LIMIT 1;

    IF v_old_id IS NOT NULL THEN
      UPDATE profiles
        SET email = 'migrating-' || v_old_id || '@placeholder.local'
        WHERE id = v_old_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user placeholder-detect error (email %): %',
      lower(NEW.email), SQLERRM;
    v_old_id := NULL;  -- sin email liberado no se intenta migrar
  END;

  -- Bloque 2: perfil del usuario nuevo (fail-soft, igual que el hotfix live).
  -- Debe existir ANTES de migrar FKs: coach_clients/medications/etc.
  -- referencian profiles(id).
  BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
      NEW.id,
      lower(NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
      email = lower(NEW.email),
      full_name = COALESCE(
        NULLIF(profiles.full_name, ''),
        NEW.raw_user_meta_data->>'full_name',
        ''
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user profile-insert error (email %): %',
      lower(NEW.email), SQLERRM;
  END;

  -- Bloque 3: migrar referencias del placeholder al usuario real y borrarlo.
  IF v_old_id IS NOT NULL THEN
    BEGIN
      -- (tabla, columna FK a profiles.id) — lista canónica de 024 menos
      -- supplement_protocols (198b) y menos tablas inexistentes en remoto.
      FOREACH v_pair SLICE 1 IN ARRAY ARRAY[
        ['coach_clients','client_id'],
        ['client_profiles','user_id'],
        ['condition_flags','user_id'],
        ['body_measurements','user_id'],
        ['body_measurements','measured_by'],
        ['lab_results','user_id'],
        ['medications','user_id'],
        ['family_history','user_id'],
        ['protocol_assignments','user_id'],
        ['scheduled_routines','user_id'],
        ['scheduled_routines','assigned_by'],
        ['emotional_checkins','user_id'],
        ['consultations','client_id'],
        ['consultations','coach_id'],
        ['health_scores','user_id'],
        ['lab_uploads','user_id'],
        ['ai_reports','client_id'],
        ['ai_reports','coach_id']
      ]
      LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.table_name = v_pair[1]
            AND c.column_name = v_pair[2]
        ) THEN
          EXECUTE format(
            'UPDATE public.%I SET %I = $1 WHERE %I = $2',
            v_pair[1], v_pair[2], v_pair[2]
          ) USING NEW.id, v_old_id;
        END IF;
      END LOOP;

      DELETE FROM profiles WHERE id = v_old_id;
    EXCEPTION WHEN OTHERS THEN
      -- Sub-transacción revierte los UPDATEs; queda el placeholder huérfano
      -- renombrado (recuperable). El signup NUNCA se bloquea por esto.
      RAISE LOG 'handle_new_user placeholder-link error (old % → new %): %',
        v_old_id, NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-asegurar el binding del trigger.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
