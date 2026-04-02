-- ============================================================
-- Migración 035: Journal types + structured data
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_type TEXT DEFAULT 'free';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS structured_data JSONB;
