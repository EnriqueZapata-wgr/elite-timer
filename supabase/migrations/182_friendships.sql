-- ============================================================================
-- 182 — FRIENDSHIPS: grafo de amistad de Comunidad C2. Rango Comunidad 177+.
-- Depende de 177 (user_profile_public.friend_count).
--
-- Modelo: UN solo edge por par de usuarios (unicidad BIDIRECCIONAL vía índice
-- único sobre LEAST/GREATEST). requester → addressee con status
-- pending/accepted/declined. Cero DM: esto es solo el grafo social.
--
-- ⚠️ ANTI-FUGA CLÍNICA (regla NO-NEGOCIABLE del mapa Comunidad):
--   Esta tabla NO contiene ningún dato clínico (solo UUIDs + status + fechas).
--   La lectura cross-user de perfiles de amigos va por los RPCs SECURITY
--   DEFINER de la migración 184, que seleccionan SOLO de user_profile_public
--   + friendships. JAMÁS un join a DX, intervenciones, síntomas, labs, ciclo,
--   journal, Braverman ni glucosa.
--
-- Escrituras: SOLO vía RPCs DEFINER (184). No hay policy de INSERT/UPDATE/
-- DELETE para el cliente → RLS las niega; el DEFINER las bypassa. El
-- mantenimiento de user_profile_public.friend_count se hace en los RPCs de
-- accept/unfriend/block (no trigger: más simple y auditable).
--
-- NO hay backfill (tabla nueva sin data legacy). Si algún día se backfillea,
-- recordar el aprendizaje de la mig 177: INNER JOIN auth.users para filtrar
-- filas huérfanas antes de insertar contra un FK a auth.users.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);

-- Unicidad BIDIRECCIONAL: un solo edge por par, sin importar quién pidió.
-- (A→B y B→A colisionan en el mismo par canónico LEAST/GREATEST.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON friendships (addressee_id, status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Cada lado VE sus propias filas (lectura directa útil para realtime/estado).
-- Sin policy de INSERT/UPDATE/DELETE → toda mutación pasa por los RPCs
-- SECURITY DEFINER de 184 (validación de blocks, allow_friend_requests, etc.).
DO $$ BEGIN
  CREATE POLICY "Members read own friendship edges" ON friendships
    FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
