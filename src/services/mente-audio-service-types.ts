/**
 * Sprint Audio Mente — tipos compartidos (puros, sin imports RN/supabase)
 * entre el core testeable y el servicio I/O.
 */

// Ajuste v2: mantra y visualizacion tienen categoría propia (migración 215).
export type AudioCategoria = 'meditacion' | 'respiracion' | 'descanso' | 'mantra' | 'visualizacion';

export interface AudioPiece {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  categoria: AudioCategoria;
  duracion_seg: number;
  voz: 'm' | 'f';
  imagen_path: string | null;
  orden: number;
  tier: 'base' | 'pro';
  /** true → el player exige reconocimiento explícito antes de reproducir (217). */
  hard_gate: boolean;
}
