/**
 * Sprint Audio Mente — tipos compartidos (puros, sin imports RN/supabase)
 * entre el core testeable y el servicio I/O.
 */

export type AudioCategoria = 'meditacion' | 'respiracion' | 'descanso';

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
}
