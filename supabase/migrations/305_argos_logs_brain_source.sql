-- 305 · argos_logs: dejar rastro de la FUENTE del cerebro, no solo de la versión
--
-- POR QUÉ
-- El proxy lee el cerebro del almacén (RPC get_argos_brain) y solo cae al
-- artefacto empaquetado en la edge function si esa llamada falla. Hoy ese
-- respaldo se puede detectar de rebote: como el empaquetado iba dos versiones
-- atrás, un `brain_version` viejo en los registros delataba la caída.
--
-- Ese detector se apaga solo. El commit que sube el empaquetado a la misma
-- versión del almacén hace que las dos fuentes reporten el MISMO string, y a
-- partir de ahí el respaldo se vuelve indetectable en los registros. Justo
-- cuando deja de ser peligroso servir el respaldo, deja de ser visible que se
-- sirvió, y con eso se pierde la señal de que la RPC del almacén está fallando.
--
-- La columna vuelve explícito lo que hoy se infiere. El proxy ya calcula el
-- valor (`brainSource`, "store" | "embedded") y hasta se lo devuelve al cliente
-- en `_brain_source`; lo único que faltaba es persistirlo.
--
-- QUÉ NO HACE
-- No cambia el comportamiento del proxy ni el orden almacén → empaquetado.
-- Es observabilidad: sirve para alertar sobre "porcentaje de llamadas servidas
-- por el respaldo", que es la métrica que avisa que el almacén está caído.
--
-- ORDEN DE APLICACIÓN (importa)
-- Esta migración va ANTES de desplegar la edge function. El código del proxy
-- que manda `brain_source` está en el mismo commit; si se despliega primero,
-- el insert a argos_logs falla contra el esquema viejo y se pierde el registro
-- de esas llamadas (el insert vive dentro de un try/catch: no rompe la
-- respuesta al usuario, pero el registro no se escribe).
--   1) npx supabase db push
--   2) npx supabase functions deploy argos-proxy
--
-- Idempotente: se puede correr dos veces sin efecto.

ALTER TABLE public.argos_logs
  ADD COLUMN IF NOT EXISTS brain_source text;

COMMENT ON COLUMN public.argos_logs.brain_source IS
  'De dónde salió el cerebro de esta llamada: "store" (RPC get_argos_brain, el camino normal) o "embedded" (respaldo compilado en la edge function, o sea la RPC falló). NULL = la llamada no llevó cerebro (acción en BRAIN_DENY_TYPES, BRAIN_ENABLED apagado, o ruta legacy sin dynamicSystem).';

-- El valor sale de un enum cerrado del proxy. Si aparece un tercer valor es un
-- bug, no un dato: mejor que truene el insert de UNA llamada a que se
-- envenenen las métricas de todas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.argos_logs'::regclass
      AND conname = 'argos_logs_brain_source_check'
  ) THEN
    ALTER TABLE public.argos_logs
      ADD CONSTRAINT argos_logs_brain_source_check
      CHECK (brain_source IS NULL OR brain_source IN ('store', 'embedded'));
  END IF;
END $$;

-- Índice parcial: la consulta que importa es "¿cuántas llamadas cayeron al
-- respaldo?", y esas son la minoría absoluta. Parcial para no pagar índice
-- sobre el 100% de las filas cuando solo se buscan las raras.
CREATE INDEX IF NOT EXISTS argos_logs_brain_source_embedded_idx
  ON public.argos_logs (created_at DESC)
  WHERE brain_source = 'embedded';

-- RLS: argos_logs ya tiene RLS habilitado y sus policies desde su migración de
-- origen. Agregar una columna no las altera y no hace falta policy nueva: no
-- cambia quién ve la fila, solo qué trae la fila.
