-- 260_shopping_list_items.sql — La lista de súper conectada (MB-28B · Pieza 3)
--
-- Hasta hoy la lista vivía solo en memoria de la pantalla: se armaba desde
-- recetas y moría al salir. Esta tabla la vuelve persistente y le da memoria
-- de despensa: marcar comprado deja rastro (status='bought' + bought_at) para
-- que la lista no vuelva a pedir lo mismo la semana entrante si todavía está.
--
-- name_key es el nombre normalizado (sin acentos, minúsculas): el índice
-- único (user_id, name_key) hace el dedupe en la base, no solo en el cliente
-- — mandar dos veces la misma receta no duplica ingredientes.
--
-- Idempotente. No toca datos existentes (la pantalla previa no persistía
-- nada: no hay filas viejas que migrar ni que perder).
-- MB-29 corre en paralelo con la 259: esta es la 260 a propósito.

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  -- "400 g" · "2 pza + al gusto" · NULL sin datos.
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bought')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'recipe')),
  -- Nombres de las recetas que lo pidieron (jsonb de strings).
  from_recipes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bought_at TIMESTAMPTZ
);

ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own shopping_list_items" ON shopping_list_items;
CREATE POLICY "Users own shopping_list_items" ON shopping_list_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_list_user_name
  ON shopping_list_items(user_id, name_key);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user_status
  ON shopping_list_items(user_id, status, created_at DESC);
