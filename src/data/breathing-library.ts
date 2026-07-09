/**
 * Biblioteca de ejercicios de respiración con ciclos y fases.
 *
 * PURA (sin imports de brand/RN) para ser testeable en el harness Vitest
 * node — brand.ts arrastra require() de imágenes. El color es espejo de
 * CATEGORY_COLORS.mind; si brand cambia, actualizar aquí.
 */
import type { InterventionType } from '@/src/constants/categories';

export interface BreathingPhase {
  action: 'inhale' | 'hold' | 'exhale' | 'hold_empty';
  seconds: number;
  label: string;
}

export type BreathingLevel = 'principiante' | 'intermedio' | 'avanzado';

export interface BreathingTemplate {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  cycles: number;
  phases: BreathingPhase[];
  category: InterventionType;
  accentColor: string;
  closingMessage: string;
  /** Sprint MENTE: nivel sugerido. */
  level: BreathingLevel;
  /** Sprint MENTE: beneficio principal (una línea, editorial). */
  benefit: string;
  /** Sprint MENTE: contraindicaciones — se muestran ANTES de iniciar. */
  contraindications?: string[];
  /** Placeholder para audio futuro (sin audio real por licensing). */
  audioUrl?: string;
}

const P = '#7F77DD'; // espejo de CATEGORY_COLORS.mind (brand.ts)

export const BREATHING_LIBRARY: BreathingTemplate[] = [
  {
    id: 'box-4',
    title: 'Box Breathing',
    description: 'Calma y enfoque. Usado por Navy SEALs.',
    durationMinutes: 5,
    cycles: 18,
    phases: [
      { action: 'inhale', seconds: 4, label: 'Inhala' },
      { action: 'hold', seconds: 4, label: 'Retén' },
      { action: 'exhale', seconds: 4, label: 'Exhala' },
      { action: 'hold_empty', seconds: 4, label: 'Vacío' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'Sistema nervioso equilibrado. Listo para lo que sea.',
    level: 'principiante',
    benefit: 'Enfoque bajo presión',
  },
  {
    id: '478-relaxation',
    title: 'Respiración 4-7-8',
    description: 'Activación parasimpática. Ideal antes de dormir.',
    durationMinutes: 5,
    cycles: 8,
    phases: [
      { action: 'inhale', seconds: 4, label: 'Inhala' },
      { action: 'hold', seconds: 7, label: 'Retén' },
      { action: 'exhale', seconds: 8, label: 'Exhala' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'Tu sistema nervioso está en modo recuperación.',
    level: 'principiante',
    benefit: 'Calma profunda pre-sueño',
  },
  {
    id: 'coherent-5',
    title: 'Coherencia 5-5',
    description: 'Equilibra el sistema nervioso autónomo. 6 ciclos/min.',
    durationMinutes: 5,
    cycles: 30,
    phases: [
      { action: 'inhale', seconds: 5, label: 'Inhala' },
      { action: 'exhale', seconds: 5, label: 'Exhala' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'HRV optimizada. Coherencia cardíaca activada.',
    level: 'principiante',
    benefit: 'Optimización de HRV',
  },
  {
    id: 'energize-2',
    title: 'Respiración energizante',
    description: 'Activa tu sistema. Ideal por la mañana.',
    durationMinutes: 3,
    cycles: 20,
    phases: [
      { action: 'inhale', seconds: 2, label: 'Inhala fuerte' },
      { action: 'exhale', seconds: 2, label: 'Exhala fuerte' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'Oxígeno al máximo. Tu cuerpo está despierto.',
    level: 'intermedio',
    benefit: 'Activación matutina',
    contraindications: ['Embarazo', 'Hipertensión no controlada'],
  },
  {
    id: 'wim-hof-lite',
    title: 'Wim Hof Lite',
    description: '30 respiraciones profundas + retención. Energía y resiliencia.',
    durationMinutes: 7,
    cycles: 3,
    phases: [
      { action: 'inhale', seconds: 60, label: 'Respira profundo ×30' },
      { action: 'hold_empty', seconds: 60, label: 'Exhala y retén' },
      { action: 'hold', seconds: 15, label: 'Inhala grande y retén' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: '3 rondas. Tu cuerpo está oxigenado y despierto.',
    level: 'avanzado',
    benefit: 'Energía + resiliencia al estrés',
    contraindications: [
      'Embarazo',
      'Condiciones cardíacas',
      'Epilepsia',
      'Nunca en agua ni manejando',
    ],
  },
  {
    id: 'physiological-sigh',
    title: 'Suspiro fisiológico',
    description: 'El reset más rápido del estrés. Respaldado por Stanford.',
    durationMinutes: 3,
    cycles: 12,
    phases: [
      { action: 'inhale', seconds: 2, label: 'Inhala por nariz' },
      { action: 'inhale', seconds: 1, label: 'Doble inhala (sniff)' },
      { action: 'exhale', seconds: 6, label: 'Exhala largo por boca' },
      { action: 'hold_empty', seconds: 2, label: 'Pausa' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'Cortisol reducido en 60 segundos. La ciencia funciona.',
    level: 'principiante',
    benefit: 'Reset del estrés en 1 minuto',
  },
];
