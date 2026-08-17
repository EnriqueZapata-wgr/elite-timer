-- ═══════════════════════════════════════════════════════════════════
-- 290 · MEMBRESÍA ÚNICA (PREMIUM, 16-ago-2026)
--
-- ATP pasó de tres planes (Base, Pro, Clínico) a UNA membresía. Esta
-- migración hace lo MÍNIMO para que el servidor pueda emitir la etiqueta
-- nueva, y NADA MÁS.
--
-- ⚠️ LO QUE ESTA MIGRACIÓN NO HACE, a propósito:
--   · NO borra proton_balance, proton_transactions, proton_action_costs,
--     proton_packages ni pro_boosts. Hay personas con saldo real y con
--     historial de transacciones; ese dato es suyo y sigue exportándose en
--     data-export-generator.
--   · NO reescribe profiles.tier. Las etiquetas históricas ('base', 'pro',
--     'clinician') se quedan tal cual y el código las REINTERPRETA como
--     membresía vigente. Sobrescribirlas destruiría la única evidencia de
--     qué compró cada quien, y no hace falta para nada.
--   · NO revoca ni borra spend_protons, award_protons ni
--     convert_electrons_to_protons. Dejaron de llamarse; siguen ahí.
--
-- Los cambios destructivos que alguien podría querer después están
-- documentados aparte, SIN aplicar, en:
--   R and D/PREMIUM_MIGRACION_DESTRUCTIVA_PROPUESTA.md
--
-- Idempotente: se puede correr las veces que sea.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Aceptar 'premium' como etiqueta válida ──────────────────────
-- Sin esto no se puede emitir un código de activación de la membresía
-- nueva: el CHECK solo conocía los tres tiers viejos. Los valores viejos
-- se CONSERVAN en la lista porque hay filas con esos valores y quitarlos
-- reventaría la restricción sobre datos existentes.

ALTER TABLE public.activation_codes
  DROP CONSTRAINT IF EXISTS activation_codes_tier_check;
ALTER TABLE public.activation_codes
  ADD CONSTRAINT activation_codes_tier_check
  CHECK (tier IN ('base', 'pro', 'clinician', 'premium'));

ALTER TABLE public.tier_grants
  DROP CONSTRAINT IF EXISTS tier_grants_tier_check;
ALTER TABLE public.tier_grants
  ADD CONSTRAINT tier_grants_tier_check
  CHECK (tier IN ('base', 'pro', 'clinician', 'premium'));

-- ── 2. Dejar de vender lo que ya no existe ─────────────────────────
-- proton_packages son los paquetes de recarga de H+. La tabla y sus filas
-- se QUEDAN (el historial de compras apunta a ellas), pero se apagan para
-- que ninguna tienda vieja pueda mostrarlas ni cobrarlas.
-- Es un UPDATE de un flag operativo, no un borrado.

UPDATE public.proton_packages SET enabled = false WHERE enabled IS DISTINCT FROM false;

-- ── 3. Registro de por qué ─────────────────────────────────────────
COMMENT ON TABLE public.proton_balance IS
  'CONGELADA 16-ago-2026 (membresía única). Los H+ dejaron de existir como '
  'moneda. Se conserva intacta: es saldo real de personas que pagaron y sigue '
  'saliendo en la exportación de datos. No se lee desde la app.';

COMMENT ON TABLE public.proton_transactions IS
  'CONGELADA 16-ago-2026 (membresía única). Historial inmutable de movimientos '
  'de H+. NO BORRAR: es la evidencia de qué compró y gastó cada persona.';

COMMENT ON TABLE public.pro_boosts IS
  'CONGELADA 16-ago-2026 (membresía única). Los boosts de 24h comprados con H+ '
  'ya no existen. Se conserva como historial de compra.';
