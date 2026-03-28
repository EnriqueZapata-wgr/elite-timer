/**
 * Biblioteca de ejercicios de respiración con ciclos y fases.
 */
import type { InterventionType } from '@/src/constants/categories';
import { CATEGORY_COLORS } from '../constants/brand';

export interface BreathingPhase {
  action: 'inhale' | 'hold' | 'exhale' | 'hold_empty';
  seconds: number;
  label: string;
}

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
}

const P = CATEGORY_COLORS.mind;

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
  },
  {
    id: 'coherent-5',
    title: 'Respiración coherente',
    description: 'Equilibra el sistema nervioso autónomo. 5.5 ciclos/min.',
    durationMinutes: 5,
    cycles: 27,
    phases: [
      { action: 'inhale', seconds: 5, label: 'Inhala' },
      { action: 'exhale', seconds: 6, label: 'Exhala' },
    ],
    category: 'mind',
    accentColor: P,
    closingMessage: 'HRV optimizada. Coherencia cardíaca activada.',
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
  },
];
