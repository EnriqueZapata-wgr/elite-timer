-- ============================================================================
-- 187 — Ficha de suplemento ampliada + sello BHA (Sprint SUPS+BHA, Bloque 4).
-- Rango Fable 150-199.
--
-- Doctrina: suplementos son REGISTRO, no recomendación. La ficha guarda lo que
-- el usuario ya toma por indicación de su profesional; ATP no sugiere nada.
--
--   brand            — marca del producto (texto libre).
--   form             — presentación: 'capsula'|'polvo'|'gotas'|'tableta'|'gomita'
--                      (validado en cliente; TEXT libre para no bloquear formas nuevas).
--   bha_status       — sello Biohacker Approved del scanner (decisión #5):
--                      'approved' ✅ | 'rejected' ❌ | NULL = sin escanear.
--   bha_scan_summary — razones del sello (summary + reasons del scan LLM).
--
-- RLS ya existe en user_supplements (055). Idempotente.
-- ⚠️ NO aplicar al remoto desde la rama — Enrique corre `npx supabase db push`
--    tras el merge (regla #12).
-- ============================================================================

ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS form TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS bha_status TEXT
  CHECK (bha_status IN ('approved', 'rejected'));
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS bha_scan_summary TEXT;
