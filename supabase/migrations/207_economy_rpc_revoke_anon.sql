-- ============================================================================
-- 207 — M2 re-auditoría MB-4: cerrar el hoyo ANON en las RPC de economía.
--
-- El guard de las 4 RPC es "IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid()".
-- Con la ANON KEY (pública, viaja en el bundle) auth.uid() es NULL → el guard
-- nunca aplica, y EXECUTE jamás se revocó de PUBLIC (091 solo revocó los
-- award_*/settle) → cualquiera podía hacer POST /rest/v1/rpc/spend_protons con
-- el user_id de OTRO y vaciarle el saldo de H+ (vandalismo; el minteo sí estaba
-- blindado). Vivo en producción hasta esta migración.
--
-- Fix: REVOKE de PUBLIC/anon + GRANT explícito a quien sí debe entrar:
--   · authenticated → el cliente logueado (ahí auth.uid() NO es NULL y el guard
--     de self-use SÍ aplica). Los 4 flujos in-app siguen intactos: proton-service
--     (spend), electron-to-proton-converter, challenge-service (join),
--     subscription-service (boost).
--   · service_role → edge functions (argos-proxy / argos-voice cobran vía
--     spend_protons). Solo esa RPC lo necesita.
--
-- ⚠️ NO se endurece el guard a "auth.uid() IS NULL → forbidden": las edge
-- functions entran como service_role donde auth.uid() TAMBIÉN es NULL — se
-- romperían. El REVOKE es el corte correcto.
--
-- Nota: activate_pro_boost (103/158) NUNCA tuvo GRANT explícito a authenticated
-- — dependía del default PUBLIC. Sin el GRANT de abajo, el revoke rompería el
-- Boost desde la app.
--
-- Idempotente (REVOKE/GRANT lo son por naturaleza).
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- ============================================================================

REVOKE EXECUTE ON FUNCTION spend_protons(uuid, bigint, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION convert_electrons_to_protons(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION join_challenge(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION activate_pro_boost(uuid, integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION spend_protons(uuid, bigint, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_electrons_to_protons(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION join_challenge(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_pro_boost(uuid, integer, integer) TO authenticated;

-- Edge functions (cobro server-side). Las otras 3 RPC no se llaman con
-- service_role — mínimo privilegio.
GRANT EXECUTE ON FUNCTION spend_protons(uuid, bigint, text, jsonb) TO service_role;
