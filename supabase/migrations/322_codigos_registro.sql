-- 322_codigos_registro.sql
-- Fecha: 2026-09-08. Referencia: pivote Elite del 7 de septiembre de 2026
-- ("la app deja de ser para el publico y pasa a ser solo para clientes con
-- servicio contratado; sin codigo de activacion no hay cuenta").
--
-- POR QUE existe esta migracion, en dos piezas:
--
-- 1) verificar_codigo_activacion(p_code)
--    El registro tiene que saber si un codigo sirve ANTES de crear la cuenta,
--    y quien registra todavia no tiene sesion, asi que no puede llamar a
--    redeem_activation_code (necesita auth.uid()). Tampoco puede leer la tabla:
--    activation_codes tiene RLS sin policies a proposito, porque quien pueda
--    listar codigos los canjea todos.
--    Esta funcion mira el codigo SIN consumirlo y devuelve un estado y nada
--    mas: ni el nivel, ni el correo al que se emitio, ni cuantos usos le
--    quedan. Se otorga a anon porque el que la llama aun no existe como
--    cuenta. El riesgo aceptado es que alguien pruebe codigos a ciegas: el
--    alfabeto es de 31 simbolos legibles en 8 posiciones (mas de 850 mil
--    millones de combinaciones) y adivinar uno no da acceso a nada, porque
--    consumirlo sigue exigiendo cuenta y sesion. A cambio, un cliente que
--    pago puede oir "no se pudo verificar" en lugar de "tu codigo no existe".
--
-- 2) listar_codigos_activacion(p_email, p_limite)
--    Enrique entrega codigos por mensaje y hoy no tiene forma de saber cuales
--    se usaron sin entrar a SQL a mano. Misma puerta que
--    generate_activation_codes (migracion 315): gate role='admin' dentro de la
--    funcion, SECURITY DEFINER para poder leer la tabla sin abrirle RLS a
--    nadie. NO se agrega ninguna columna a activation_codes: a quien se le dio
--    el codigo ya lo guarda issued_to_email (239, escrito desde la 315), y
--    CUANDO se canjeo sale de tier_grants.ref, que redeem_activation_code
--    llena con el codigo desde la migracion 240. Inventar una columna
--    redeemed_at cuando el dato ya existe seria duplicar una verdad.
--
-- No se escribe ni una fila de datos de usuario. Idempotente: CREATE OR
-- REPLACE de dos funciones nuevas y GRANT explicitos.
-- Se aplica con npx supabase db push (Enrique), nunca desde Cowork.
--
-- OJO AL ORDEN DE DESPLIEGUE: sin esta migracion en produccion, la pantalla
-- de registro no puede verificar ningun codigo y no deja crear cuentas (dice
-- "no pudimos verificar tu codigo"). Va antes que el primer cliente.

BEGIN;

-- ── 1) Mirar un codigo sin gastarlo ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verificar_codigo_activacion(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm TEXT;
  v_row activation_codes%ROWTYPE;
BEGIN
  -- Misma normalizacion que redeem_activation_code (239): mayusculas y solo
  -- alfanumericos. Si aqui y alla no normalizaran igual, un codigo podria
  -- pasar la puerta y morir en el canje.
  v_norm := regexp_replace(upper(COALESCE(p_code, '')), '[^A-Z0-9]', '', 'g');

  -- Campo vacio o basura corta: no se toca la tabla.
  IF length(v_norm) < 6 THEN
    RETURN jsonb_build_object('estado', 'no_encontrado');
  END IF;

  SELECT * INTO v_row
  FROM activation_codes
  WHERE regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('estado', 'no_encontrado');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('estado', 'vencido');
  END IF;

  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('estado', 'agotado');
  END IF;

  -- Solo esto. Ni tier, ni issued_to_email, ni usos restantes: quien pregunta
  -- todavia no es nadie en el sistema.
  RETURN jsonb_build_object('estado', 'usable');
END;
$function$;

REVOKE ALL ON FUNCTION public.verificar_codigo_activacion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_codigo_activacion(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verificar_codigo_activacion(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_codigo_activacion(text) TO service_role;

COMMENT ON FUNCTION public.verificar_codigo_activacion(text) IS
  'Pivote Elite (8-sep-2026): dice si un codigo de activacion sirve SIN consumirlo, para la puerta del registro. Devuelve solo {estado}: usable / no_encontrado / vencido / agotado. Abierta a anon porque quien registra aun no tiene cuenta.';

-- ── 2) Que codigos entregue y cuales se usaron ────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_codigos_activacion(
  p_email text DEFAULT NULL,
  p_limite integer DEFAULT 50
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_email TEXT;
  v_limite INT;
  v_filas JSONB;
BEGIN
  -- Mismo gate que generate_activation_codes (315). auth.uid() nulo =
  -- llamada service_role, permitida. role::text cubre enum o texto.
  IF v_caller IS NOT NULL THEN
    SELECT role::text INTO v_role FROM profiles WHERE id = v_caller;
    IF COALESCE(v_role, 'client') <> 'admin' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
    END IF;
  END IF;

  v_email := NULLIF(lower(btrim(COALESCE(p_email, ''))), '');
  v_limite := LEAST(GREATEST(COALESCE(p_limite, 50), 1), 500);

  SELECT COALESCE(jsonb_agg(f ORDER BY f->>'created_at' DESC), '[]'::jsonb)
  INTO v_filas
  FROM (
    SELECT jsonb_build_object(
      'code', c.code,
      'tier', c.tier,
      'source', c.source,
      'issued_to_email', c.issued_to_email,
      'duration_days', c.duration_days,
      'expires_at', c.expires_at,
      'created_at', c.created_at,
      'used_count', c.used_count,
      'max_uses', c.max_uses,
      'estado', CASE
        WHEN c.used_count >= c.max_uses THEN 'canjeado'
        WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 'vencido'
        ELSE 'pendiente'
      END,
      -- Cuando se canjeo: lo sabe tier_grants.ref, que redeem_activation_code
      -- llena con el codigo (240). Por eso no hace falta columna nueva.
      'canjeado_en', (
        SELECT min(g.created_at) FROM tier_grants g
        WHERE g.source = 'activation_code' AND g.ref = c.code
      )
    ) AS f
    FROM activation_codes c
    WHERE (v_email IS NULL OR lower(COALESCE(c.issued_to_email, '')) = v_email)
    ORDER BY c.created_at DESC
    LIMIT v_limite
  ) sub;

  RETURN jsonb_build_object('ok', true, 'codigos', v_filas);
END;
$function$;

REVOKE ALL ON FUNCTION public.listar_codigos_activacion(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listar_codigos_activacion(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.listar_codigos_activacion(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_codigos_activacion(text, integer) TO service_role;

COMMENT ON FUNCTION public.listar_codigos_activacion(text, integer) IS
  'Pivote Elite (8-sep-2026): lista los codigos emitidos con su estado (pendiente / canjeado / vencido) y la fecha de canje leida de tier_grants. Solo admin (mismo gate que generate_activation_codes).';

COMMIT;
