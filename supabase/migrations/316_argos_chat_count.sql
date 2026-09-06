-- 316_argos_chat_count.sql
-- Fecha: 2026-09-04. Referencia: PIVOTE_ATP_3.0_2026-09-04.md (Parte 1.3,
-- Free = 3 mensajes de ARGOS al dia; Parte 2.5) y RUTA_A_ATP_3.0.md pasos
-- 1.3 y 1.8.
--
-- Por que: el tope de Free en 3.0 es de 3 chats al dia. El contador
-- message_count de argos_daily_usage cuenta TODAS las llamadas al proxy
-- (chat, electron_award, insight...) y no sirve para eso: un free agotaria
-- el tope con insights sin haber escrito nada. Este contador separado
-- (chat_count) solo lo incrementa el proxy cuando request_type = 'chat'.
--
-- consume_argos_chat sigue la convencion de consume_argos_usage (262):
-- asegura la fila del dia, toma lock FOR UPDATE, y si ya llego al tope
-- devuelve blocked sin incrementar (el contador queda = chats servidos).
-- Devuelve jsonb {blocked, count}. El dia se calcula en UTC de forma
-- explicita ((now() AT TIME ZONE 'UTC')::date) para que el corte no
-- dependa del TimeZone de la sesion; en Supabase la sesion ya es UTC, asi
-- que coincide con el CURRENT_DATE que usa consume_argos_usage.
--
-- No se toca message_count ni weighted_units: los sigue llevando
-- consume_argos_usage / consume_argos_usage_weighted. A quien pago no se le
-- aplica este tope: el proxy solo llama esta RPC para tier free (1.8), y un
-- p_limit NULL se trata como sin tope (fail-safe abre).
--
-- Solo service_role ejecuta (igual que consume_argos_usage): el cliente
-- nunca llama esta RPC.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS y CREATE OR REPLACE.

BEGIN;

ALTER TABLE public.argos_daily_usage
  ADD COLUMN IF NOT EXISTS chat_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.argos_daily_usage.chat_count IS
  'Chats servidos en el dia UTC (solo request_type=chat). Tope de Free en 3.0. Migracion 316.';

CREATE OR REPLACE FUNCTION public.consume_argos_chat(p_user_id uuid, p_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day date := (now() AT TIME ZONE 'UTC')::date;
  v_count int;
BEGIN
  -- Asegurar la fila del dia (count 0) y tomar lock para decidir sin carrera.
  INSERT INTO argos_daily_usage (user_id, usage_date, message_count, chat_count)
  VALUES (p_user_id, v_day, 0, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT chat_count INTO v_count
  FROM argos_daily_usage
  WHERE user_id = p_user_id AND usage_date = v_day
  FOR UPDATE;

  -- p_limit NULL = sin tope. Bloqueado SIN incrementar: el contador queda
  -- = chats servidos, igual que consume_argos_usage.
  IF p_limit IS NOT NULL AND v_count >= p_limit THEN
    RETURN jsonb_build_object('blocked', true, 'count', v_count);
  END IF;

  UPDATE argos_daily_usage
  SET chat_count = chat_count + 1, updated_at = now()
  WHERE user_id = p_user_id AND usage_date = v_day
  RETURNING chat_count INTO v_count;

  RETURN jsonb_build_object('blocked', false, 'count', v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_argos_chat(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_argos_chat(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.consume_argos_chat(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_argos_chat(uuid, integer) TO service_role;

COMMIT;
