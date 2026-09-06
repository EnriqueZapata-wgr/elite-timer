-- 317_renewal_reminders.sql
-- Fecha: 2026-09-06. Referencia: RUTA_A_ATP_3.0.md paso 2.7 (recordatorio de
-- renovacion 5 dias antes, reforma LFPC) y PIVOTE_ATP_3.0_2026-09-04.md.
--
-- Por que: la reforma a la Ley Federal de Proteccion al Consumidor obliga a
-- avisar al suscriptor antes de cada renovacion automatica. Aqui vive la cola
-- de avisos: una fila por (usuario, fecha de vencimiento) que alimentan los
-- webhooks de RevenueCat (INITIAL_PURCHASE, RENEWAL y cualquier activacion
-- con expiration_at_ms) y de Stripe (invoice.paid, que trae el fin de
-- periodo real). La edge function dispatch-renewal-reminders toma las filas
-- con due_at vencido y sent_at nulo, manda correo (Resend) y push (Expo),
-- escribe en user_notifications y marca sent_at.
--
-- Quien escribe: solo service_role (los webhooks y el despachador corren con
-- la service key). El usuario solo puede LEER sus propias filas: no hay
-- politica de INSERT/UPDATE/DELETE para authenticated a proposito.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- DO-block para la politica y unschedule antes de schedule. Probada dos
-- veces en local. Se aplica con npx supabase db push (Enrique).
--
-- Cron: mismo patron que la 099 (dispatch-agenda-notifications-minutely) y
-- que el job vivo en produccion (verificado el 6-sep-2026 con SELECT sobre
-- cron.job): pg_net + service key leida en runtime desde
-- vault.decrypted_secrets bajo el nombre 'service_role_key'. Corre a las
-- 14:00 UTC = 08:00 CDMX, para que el correo llegue en la manana. En local
-- no existe pg_cron ni vault, asi que el bloque se salta si la extension
-- no esta instalada (en produccion si lo esta: 6 jobs vivos).

BEGIN;

-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.renewal_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('revenuecat', 'stripe')),
  ref text,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'push', 'ambos')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, expires_at)
);

COMMENT ON TABLE public.renewal_reminders IS
  'ATP 3.0 (ruta 2.7): cola de avisos de renovacion 5 dias antes del vencimiento (LFPC). La escribe service_role desde revenuecat-webhook / payment-webhook; la despacha dispatch-renewal-reminders.';

-- 2. Indice parcial: el despachador solo mira lo pendiente.
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_pendientes
  ON public.renewal_reminders (due_at)
  WHERE sent_at IS NULL;

-- 3. RLS: el dueno lee lo suyo; nadie mas que service_role escribe.
ALTER TABLE public.renewal_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renewal_reminders'
      AND policyname = 'renewal_reminders_select_own'
  ) THEN
    CREATE POLICY renewal_reminders_select_own ON public.renewal_reminders
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Cron diario que invoca la edge function dispatch-renewal-reminders.
--    Patron identico al de la 099: net.http_post con la service key desde
--    Vault. Se salta en entornos sin pg_cron (Postgres local de prueba).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'renewal-reminders-daily') THEN
      PERFORM cron.unschedule('renewal-reminders-daily');
    END IF;
    PERFORM cron.schedule(
      'renewal-reminders-daily',
      '0 14 * * *',
      $cron$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/dispatch-renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron no instalado: el job renewal-reminders-daily no se programa en este entorno';
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
