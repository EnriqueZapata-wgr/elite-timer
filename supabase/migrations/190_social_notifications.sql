-- ============================================================================
-- 190 — SOCIAL_NOTIFICATIONS: push de solicitudes de amistad (Comunidad V1.1 §2.1).
-- Rango Comunidad V1.1: 190-193 (187-189 los usó el sprint SUPS en otro branch).
-- Depende de 177 (user_profile_public), 182 (friendships), 183 (user_blocks),
-- 184 (RPCs sociales — aquí se hace CREATE OR REPLACE con la MISMA firma).
--
-- Patrón espejo de agenda: agenda_event_logs.notify_at/notified_at → aquí
-- social_notifications.notified_at NULL = pendiente. La Edge Function
-- dispatch-social-notifications (cron cada minuto, mismo schedule que
-- dispatch-agenda-notifications) lee pendientes, manda push vía
-- user_notification_tokens y marca notified_at.
--
-- ⚠️ ANTI-FUGA CLÍNICA (regla NO-NEGOCIABLE del mapa Comunidad):
--   El payload es SOLO identidad pública del otro user (user_id/username/
--   display_name tomados de user_profile_public — frontera anti-leak).
--   Ninguna superficie tocada aquí contiene datos de salud. El test estático
--   community-v11-antileak.test.ts verifica este invariante sobre este archivo.
--
-- ⚠️ PALABRAS RESERVADAS (aprendizaje mig 180): sin 'position'/'window' a secas;
--   referencias de tabla cualificadas (pp./f./ub./sn.).
--
-- Idempotente. NO aplicar al remoto desde este branch (Cowork audita el merge).
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- destinatario
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted')),
  payload JSONB NOT NULL DEFAULT '{}',   -- SOLO identidad pública del emisor
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ                -- NULL = pendiente de despachar
);

-- El dispatcher lee pendientes en orden FIFO.
CREATE INDEX IF NOT EXISTS idx_social_notifications_pending
  ON social_notifications (created_at) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_notifications_user
  ON social_notifications (user_id, created_at);

ALTER TABLE social_notifications ENABLE ROW LEVEL SECURITY;

-- Dueño-lectura. Escrituras SOLO vía RPCs DEFINER (abajo) y la Edge Function
-- con service role (marca notified_at). Sin policy de INSERT/UPDATE/DELETE.
DO $$ BEGIN
  CREATE POLICY "Owner reads own social notifications" ON social_notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── send_friend_request v2 (REPLACE de 184, MISMA firma y códigos) ────────────
-- Único cambio: al quedar 'sent', inserta la notificación al DESTINATARIO
-- (p_target) con la identidad pública del emisor.

CREATE OR REPLACE FUNCTION send_friend_request(p_target UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_allow BOOLEAN;
  v_edge friendships%ROWTYPE;
  v_payload JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;
  IF p_target IS NULL OR p_target = v_uid THEN RETURN 'not_allowed'; END IF;

  SELECT pp.allow_friend_requests INTO v_allow
  FROM user_profile_public pp WHERE pp.user_id = p_target;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = v_uid AND ub.blocked_id = p_target)
       OR (ub.blocker_id = p_target AND ub.blocked_id = v_uid)
  ) THEN
    RETURN 'not_allowed';
  END IF;

  IF NOT COALESCE(v_allow, false) THEN RETURN 'not_allowed'; END IF;

  -- Identidad PÚBLICA del emisor para el payload (solo user_profile_public).
  SELECT jsonb_build_object(
    'from_user_id', pp.user_id,
    'username', pp.username,
    'display_name', COALESCE(pp.display_name, pp.username)
  ) INTO v_payload
  FROM user_profile_public pp WHERE pp.user_id = v_uid;

  SELECT f.* INTO v_edge FROM friendships f
  WHERE LEAST(f.requester_id, f.addressee_id) = LEAST(v_uid, p_target)
    AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(v_uid, p_target);

  IF FOUND THEN
    IF v_edge.status = 'accepted' THEN RETURN 'already_friends'; END IF;
    IF v_edge.status = 'pending' THEN
      IF v_edge.addressee_id = v_uid THEN RETURN 'incoming_pending'; END IF;
      RETURN 'already_pending';
    END IF;
    -- declined viejo → re-request reutilizando la fila (decisión C2 de 184).
    UPDATE friendships SET
      requester_id = v_uid,
      addressee_id = p_target,
      status = 'pending',
      created_at = NOW(),
      responded_at = NULL
    WHERE id = v_edge.id;

    INSERT INTO social_notifications (user_id, type, payload)
    VALUES (p_target, 'friend_request', COALESCE(v_payload, '{}'::jsonb));
    RETURN 'sent';
  END IF;

  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (v_uid, p_target, 'pending');

  INSERT INTO social_notifications (user_id, type, payload)
  VALUES (p_target, 'friend_request', COALESCE(v_payload, '{}'::jsonb));
  RETURN 'sent';
END; $$;

-- ── respond_friend_request v2 (REPLACE de 184, MISMA firma y códigos) ─────────
-- Único cambio: al aceptar, notifica al REQUESTER con la identidad pública de
-- quien aceptó. Declined NO notifica (silencio intencional — anti-fricción).

CREATE OR REPLACE FUNCTION respond_friend_request(p_request_id UUID, p_accept BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_edge friendships%ROWTYPE;
  v_payload JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;

  SELECT f.* INTO v_edge FROM friendships f WHERE f.id = p_request_id;
  IF NOT FOUND OR v_edge.addressee_id <> v_uid OR v_edge.status <> 'pending' THEN
    RETURN 'not_found';
  END IF;

  UPDATE friendships SET
    status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
    responded_at = NOW()
  WHERE id = p_request_id;

  IF p_accept THEN
    UPDATE user_profile_public SET
      friend_count = friend_count + 1,
      updated_at = NOW()
    WHERE user_id IN (v_edge.requester_id, v_edge.addressee_id);

    SELECT jsonb_build_object(
      'from_user_id', pp.user_id,
      'username', pp.username,
      'display_name', COALESCE(pp.display_name, pp.username)
    ) INTO v_payload
    FROM user_profile_public pp WHERE pp.user_id = v_uid;

    INSERT INTO social_notifications (user_id, type, payload)
    VALUES (v_edge.requester_id, 'friend_accepted', COALESCE(v_payload, '{}'::jsonb));
    RETURN 'accepted';
  END IF;
  RETURN 'declined';
END; $$;

-- ── Permisos (patrón 178/184; firmas idénticas → GRANTs se conservan, pero se
--    re-declaran por idempotencia y claridad) ─────────────────────────────────

REVOKE ALL ON FUNCTION send_friend_request(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION respond_friend_request(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_friend_request(UUID, BOOLEAN) TO authenticated;

-- ── DEPLOY (manual, post-merge — Enrique) ────────────────────────────────────
-- 1) npx supabase db push                       (aplica esta migración)
-- 2) npx supabase functions deploy dispatch-social-notifications
-- 3) Programar el cron (MISMO schedule/patrón Vault que la 099 de agenda),
--    vía MCP execute_sql (NO apply_migration — bug 42P10):
--
--    DO $do$ BEGIN
--      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-social-notifications-minutely') THEN
--        PERFORM cron.unschedule('dispatch-social-notifications-minutely');
--      END IF;
--    END $do$;
--    SELECT cron.schedule(
--      'dispatch-social-notifications-minutely',
--      '* * * * *',
--      $cron$
--      SELECT net.http_post(
--        url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/dispatch-social-notifications',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer ' || (
--            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
--          )
--        ),
--        body := '{}'::jsonb
--      );
--      $cron$
--    );
