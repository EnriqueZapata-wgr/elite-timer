-- 319: la verdad del consentimiento, del lado del servidor.
-- Pivote limpio, 7 de septiembre de 2026 (paso 0).
--
-- QUÉ RESUELVE
-- Desde hoy el guardia de la app (app/index.tsx + acceso-consentido-core) abre
-- o cierra según `user_consent_log`, y ya no según `profiles.onboarding_step`.
-- Esa decisión vivía SOLO en el cliente. Esta migración pone la misma regla en
-- la base, en dos funciones, para que mañana una policy de RLS sobre las tablas
-- de salud pueda apoyarse en ella sin volver a inventarla.
--
-- QUÉ NO HACE, Y ES LO MÁS IMPORTANTE DEL ARCHIVO
-- NO hace backfill. Ni un INSERT, ni un UPDATE, ni un DELETE sobre datos de
-- nadie. En producción hay 3 filas en user_consent_log para 13 perfiles, y a
-- los 12 que no tienen las suyas se les pide en la app la próxima vez que
-- entran (/consentimientos). Escribirles una fila desde aquí sería firmar por
-- ellos: evidencia legal falsificada, y encima ellos sin enterarse de qué
-- aceptaron. Tampoco toca `profiles`: el perfil que quedó en
-- onboarding_step='pending' se queda como está, con su ruta a welcome.
--
-- Idempotente. Con BEGIN/COMMIT propios porque el CLI corre en autocommit
-- (CLAUDE.md) y aquí hay varias sentencias que dependen unas de otras.

BEGIN;

-- La fila más reciente de cada checkbox es la que manda: el log es
-- append-only y una revocación posterior gana sobre una aceptación vieja.
-- SECURITY INVOKER a propósito (es el default, se deja explícito para que no
-- se cambie por descuido): así la RLS de user_consent_log sigue aplicando y
-- nadie puede preguntar por el consentimiento de otra persona.
CREATE OR REPLACE FUNCTION public.consentimiento_vigente(p_user UUID, p_cb TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT l.action = 'accepted'
      FROM user_consent_log l
      WHERE l.user_id = p_user
        AND l.checkbox_id = p_cb
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.consentimiento_vigente(UUID, TEXT) IS
  'True si la fila mas reciente de ese checkbox es accepted. Sin fila = false. '
  'Espejo de permiteDatosDeSalud/autorizaEntrada en acceso-consentido-core.ts.';

-- Los tres de la puerta: CB-1 terminos y aviso, CB-3 transferencia
-- internacional, CB-4 mayoria de edad. Es la MISMA lista que
-- CONSENTIMIENTOS_DE_PUERTA en el cliente; si una cambia, la otra cambia.
-- CB-2 no esta aqui a proposito: bloquea la funcion que escribe datos de
-- salud, no la entrada a la app.
CREATE OR REPLACE FUNCTION public.consentimientos_de_puerta_ok(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.consentimiento_vigente(p_user, 'CB-1')
     AND public.consentimiento_vigente(p_user, 'CB-3')
     AND public.consentimiento_vigente(p_user, 'CB-4');
$$;

COMMENT ON FUNCTION public.consentimientos_de_puerta_ok(UUID) IS
  'True si CB-1, CB-3 y CB-4 estan aceptados y vigentes. Es la puerta legal '
  'de la app: sin los tres no se entra. Ver acceso-consentido-core.ts.';

GRANT EXECUTE ON FUNCTION public.consentimiento_vigente(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consentimientos_de_puerta_ok(UUID) TO authenticated;

-- El indice que sostiene las dos lecturas (user_id, checkbox_id, created_at
-- DESC) ya existe desde la 209: idx_user_consent_log_user_cb. Se deja escrito
-- para que nadie lo agregue dos veces.

COMMIT;
