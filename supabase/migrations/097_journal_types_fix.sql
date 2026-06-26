-- ============================================================
-- Migración 097: Journal types FIX (re-aplicar columnas de 035)
-- ============================================================
-- Causa: la migración 035_journal_types.sql se marcó como aplicada en
-- migration_history del remoto pero las columnas NUNCA se crearon
-- (probable falla silenciosa hace tiempo). Bug detectado 2026-06-26 vía
-- Sentry cuando journal_entries INSERT fallaba con "Could not find the
-- 'journal_type' column of 'journal_entries' in the schema cache".
--
-- Aplicada en remoto via MCP execute_sql el 2026-06-26.
-- Este archivo deja el record en el repo (idempotente con IF NOT EXISTS).
-- ============================================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_type TEXT DEFAULT 'free';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS structured_data JSONB;

-- Recargar schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
