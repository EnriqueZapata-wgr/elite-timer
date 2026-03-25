/**
 * Biblioteca de emociones — Modelo de 4 cuadrantes (energía × placer).
 */

export interface Emotion {
  id: string;
  label: string;
  quadrant: QuadrantKey;
}

export type QuadrantKey = 'high_pleasant' | 'high_unpleasant' | 'low_pleasant' | 'low_unpleasant';

export const QUADRANTS = {
  high_pleasant: {
    key: 'high_pleasant' as QuadrantKey,
    label: 'Alta energía · Agradable',
    color: '#EFD54F',
    colorLight: 'rgba(239, 213, 79, 0.15)',
    description: 'Motivado, emocionado, vivo',
  },
  high_unpleasant: {
    key: 'high_unpleasant' as QuadrantKey,
    label: 'Alta energía · Desagradable',
    color: '#E24B4A',
    colorLight: 'rgba(226, 75, 74, 0.15)',
    description: 'Ansioso, frustrado, enojado',
  },
  low_pleasant: {
    key: 'low_pleasant' as QuadrantKey,
    label: 'Baja energía · Agradable',
    color: '#5DCAA5',
    colorLight: 'rgba(93, 202, 165, 0.15)',
    description: 'Tranquilo, relajado, en paz',
  },
  low_unpleasant: {
    key: 'low_unpleasant' as QuadrantKey,
    label: 'Baja energía · Desagradable',
    color: '#5B9BD5',
    colorLight: 'rgba(91, 155, 213, 0.15)',
    description: 'Triste, cansado, apático',
  },
} as const;

export const EMOTIONS: Emotion[] = [
  // HIGH PLEASANT
  { id: 'motivated', label: 'Motivado', quadrant: 'high_pleasant' },
  { id: 'excited', label: 'Emocionado', quadrant: 'high_pleasant' },
  { id: 'happy', label: 'Feliz', quadrant: 'high_pleasant' },
  { id: 'energized', label: 'Con energía', quadrant: 'high_pleasant' },
  { id: 'confident', label: 'Seguro', quadrant: 'high_pleasant' },
  { id: 'proud', label: 'Orgulloso', quadrant: 'high_pleasant' },
  { id: 'grateful', label: 'Agradecido', quadrant: 'high_pleasant' },
  { id: 'inspired', label: 'Inspirado', quadrant: 'high_pleasant' },
  { id: 'playful', label: 'Juguetón', quadrant: 'high_pleasant' },
  { id: 'focused', label: 'Enfocado', quadrant: 'high_pleasant' },
  { id: 'optimistic', label: 'Optimista', quadrant: 'high_pleasant' },
  { id: 'passionate', label: 'Apasionado', quadrant: 'high_pleasant' },

  // HIGH UNPLEASANT
  { id: 'anxious', label: 'Ansioso', quadrant: 'high_unpleasant' },
  { id: 'frustrated', label: 'Frustrado', quadrant: 'high_unpleasant' },
  { id: 'angry', label: 'Enojado', quadrant: 'high_unpleasant' },
  { id: 'stressed', label: 'Estresado', quadrant: 'high_unpleasant' },
  { id: 'overwhelmed', label: 'Abrumado', quadrant: 'high_unpleasant' },
  { id: 'irritated', label: 'Irritado', quadrant: 'high_unpleasant' },
  { id: 'nervous', label: 'Nervioso', quadrant: 'high_unpleasant' },
  { id: 'restless', label: 'Inquieto', quadrant: 'high_unpleasant' },
  { id: 'impatient', label: 'Impaciente', quadrant: 'high_unpleasant' },
  { id: 'worried', label: 'Preocupado', quadrant: 'high_unpleasant' },
  { id: 'tense', label: 'Tenso', quadrant: 'high_unpleasant' },
  { id: 'agitated', label: 'Agitado', quadrant: 'high_unpleasant' },

  // LOW PLEASANT
  { id: 'calm', label: 'Tranquilo', quadrant: 'low_pleasant' },
  { id: 'relaxed', label: 'Relajado', quadrant: 'low_pleasant' },
  { id: 'peaceful', label: 'En paz', quadrant: 'low_pleasant' },
  { id: 'content', label: 'Contento', quadrant: 'low_pleasant' },
  { id: 'serene', label: 'Sereno', quadrant: 'low_pleasant' },
  { id: 'cozy', label: 'Cómodo', quadrant: 'low_pleasant' },
  { id: 'thoughtful', label: 'Reflexivo', quadrant: 'low_pleasant' },
  { id: 'balanced', label: 'Equilibrado', quadrant: 'low_pleasant' },
  { id: 'gentle', label: 'Gentil', quadrant: 'low_pleasant' },
  { id: 'present', label: 'Presente', quadrant: 'low_pleasant' },
  { id: 'accepting', label: 'En aceptación', quadrant: 'low_pleasant' },
  { id: 'fulfilled', label: 'Pleno', quadrant: 'low_pleasant' },

  // LOW UNPLEASANT
  { id: 'sad', label: 'Triste', quadrant: 'low_unpleasant' },
  { id: 'tired', label: 'Cansado', quadrant: 'low_unpleasant' },
  { id: 'unmotivated', label: 'Desmotivado', quadrant: 'low_unpleasant' },
  { id: 'lonely', label: 'Solo', quadrant: 'low_unpleasant' },
  { id: 'bored', label: 'Aburrido', quadrant: 'low_unpleasant' },
  { id: 'drained', label: 'Agotado', quadrant: 'low_unpleasant' },
  { id: 'apathetic', label: 'Apático', quadrant: 'low_unpleasant' },
  { id: 'disconnected', label: 'Desconectado', quadrant: 'low_unpleasant' },
  { id: 'melancholic', label: 'Melancólico', quadrant: 'low_unpleasant' },
  { id: 'hopeless', label: 'Sin esperanza', quadrant: 'low_unpleasant' },
  { id: 'numb', label: 'Entumecido', quadrant: 'low_unpleasant' },
  { id: 'vulnerable', label: 'Vulnerable', quadrant: 'low_unpleasant' },
];

export const CONTEXT_WHERE = [
  'Casa', 'Trabajo', 'Gym', 'Calle', 'Carro', 'Restaurante',
  'Naturaleza', 'Oficina', 'Escuela', 'Cama', 'Otro',
];

export const CONTEXT_WHO = [
  'Solo', 'Pareja', 'Familia', 'Amigos', 'Compañeros',
  'Coach', 'Desconocidos', 'Mascota', 'Otro',
];

export const CONTEXT_DOING = [
  'Entrenando', 'Trabajando', 'Comiendo', 'Descansando', 'Meditando',
  'Caminando', 'Socializando', 'Estudiando', 'Manejando', 'Despertando',
  'Pre-dormir', 'Otro',
];
