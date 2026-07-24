/**
 * Sprint Audio Mente — tipos compartidos (puros, sin imports RN/supabase)
 * entre el core testeable y el servicio I/O.
 */

// Ajuste v2: mantra y visualizacion tienen categoría propia (migración 215).
// Binaurales (219): audio-utilidad de fondo — sin voz, sin gate, sin economía.
export type AudioCategoria = 'meditacion' | 'respiracion' | 'descanso' | 'mantra' | 'visualizacion' | 'binaural';

export interface AudioPiece {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  categoria: AudioCategoria;
  duracion_seg: number;
  /** null en binaurales (219: voz DROP NOT NULL — no tienen narración). */
  voz: 'm' | 'f' | null;
  imagen_path: string | null;
  orden: number;
  tier: 'base' | 'pro';
  /** true → el player exige reconocimiento explícito antes de reproducir (217). */
  hard_gate: boolean;
}
