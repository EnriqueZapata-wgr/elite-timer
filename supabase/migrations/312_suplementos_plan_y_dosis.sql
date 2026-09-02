-- ============================================================================
-- 312 - Suplementos: plan vs eventual, dosis por unidad y registro variable.
-- (Backlog 3.6, noche del 30 al 31 de agosto de 2026. Pedido textual de
-- Enrique: "que se puedan seleccionar cuales son de plan y cuales no".)
--
-- Estado remoto al escribir esto: user_supplements = 58 filas (30 activas,
-- 3 usuarios), supplement_logs = 922 filas. Ninguna fila se toca: solo
-- columnas nuevas con defaults que preservan el comportamiento de hoy.
--
-- user_supplements:
--   is_plan BOOLEAN NOT NULL DEFAULT true
--     true  = protocolo establecido: cuenta en el progreso del dia y en la
--             adherencia (7 y 30 dias).
--     false = eventual / rotativo (ashwagandha bajo estres, glicina variable):
--             se registra igual, pero no penaliza la adherencia.
--     DEFAULT true -> toda ficha existente sigue contando como hoy.
--   amount_per_unit NUMERIC
--     Cantidad de reactivo por UNIDAD de la ficha (por capsula, gota, tableta,
--     gomita o porcion segun `form`). NULL = no se sabe; la UI pinta raya.
--     ATP no inventa ni recomienda cantidades: es lo que dice la etiqueta o lo
--     que la persona teclea.
--   amount_unit TEXT
--     Unidad de amount_per_unit: 'mg' | 'mcg' | 'g' | 'UI' | 'ml' (validado en
--     cliente; TEXT libre para no bloquear unidades nuevas).
--   units_per_dose NUMERIC
--     Cuantas unidades lleva UNA toma programada (2 capsulas). NULL = no se
--     sabe. `dosage` (texto libre de 055) sigue siendo lo que se muestra.
--   scan_serving TEXT
--     Porcion que declara la etiqueta segun el escaneo ("1 capsula").
--   scan_actives JSONB
--     Activos por porcion que detecto el escaneo: [{"name","amount"}].
--     Solo registro de lo leido; no se interpreta clinicamente.
--
-- supplement_logs:
--   units_taken NUMERIC
--     Unidades reales de ESA toma cuando difieren de la ficha ("hoy tome 2 en
--     vez de 1"). NULL = la programada (todo el historial queda igual).
--
-- RLS ya existe en ambas tablas (055). Idempotente.
-- NO aplicar al remoto desde la rama: Enrique corre `npx supabase db push`
-- tras el merge (regla #12). Aplicar JUNTO con el OTA de esta noche: el JS
-- nuevo escribe is_plan / amount_per_unit / units_taken y sin la columna el
-- insert responde 400 (misma ventana que 188).
-- ============================================================================

ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS is_plan BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS amount_per_unit NUMERIC;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS amount_unit TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS units_per_dose NUMERIC;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS scan_serving TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS scan_actives JSONB;

ALTER TABLE supplement_logs ADD COLUMN IF NOT EXISTS units_taken NUMERIC;

-- La pantalla de historial lee 30 dias por usuario: el indice de 055
-- (user_id, date) ya cubre esa consulta. No se agrega otro.
