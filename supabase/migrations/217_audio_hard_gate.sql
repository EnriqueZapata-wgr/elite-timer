-- 217: Hard gate de piezas sensibles (Ajuste Mente v2 · 5).
-- hard_gate=true → el player exige reconocimiento explícito ("Entiendo" +
-- acceso visible a ayuda/emergencia) ANTES de reproducir. Primera pieza:
-- navegar_ataque_panico (se siembra cuando Enrique la produzca — el UPDATE
-- es no-op si aún no existe). Idempotente.

ALTER TABLE public.audio_pieces
  ADD COLUMN IF NOT EXISTS hard_gate BOOLEAN NOT NULL DEFAULT false;

UPDATE public.audio_pieces SET hard_gate = true
WHERE slug = 'navegar_ataque_panico';
