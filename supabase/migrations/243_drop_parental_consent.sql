-- MB-13 · PIEZA 5.4 — Retiro del consentimiento parental
--
-- MB-12 subió la edad mínima a 18 (age gate duro en onboarding/v2/profile:
-- <18 bloquea la cuenta; el tier 'parental' 13-17 se eliminó). Con eso,
-- profiles.parental_consent_email quedó recolectando el correo de una
-- persona que nunca aceptó los términos: dato personal de un tercero sin
-- base. Verificado: cero referencias en app/ y src/ a estas columnas
-- (solo la 154 las creaba). age_verified_at SÍ se usa y se queda.
-- Idempotente.

ALTER TABLE profiles DROP COLUMN IF EXISTS parental_consent_email;
ALTER TABLE profiles DROP COLUMN IF EXISTS parental_consent_at;
