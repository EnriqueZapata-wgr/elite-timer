/**
 * HIIT Presets — lógica PURA de la puerta INTERVALOS del generador (Ola 2
 * Fitness PR2, ANEXO_B_FITNESS §3; ex pantalla /fitness-hiit).
 *
 * Los 4 presets (Tabata / EMOM / AMRAP / 30-30) y buildPresetRoutine()
 * construyen una rutina de PURO TIEMPO del engine: sin matrix_slug, por lo
 * que el árbitro del runner (routineUsesClipRunner) la manda al modo timer
 * de /session. Sin imports de react-native/supabase → testeable en Vitest.
 */
import type { Routine, Block } from '@/src/engine/types';

let _presetId = 0;
function presetId(): string { return `hiit-${Date.now()}-${++_presetId}`; }

/** Defaults para campos obligatorios de Block */
const BD: Omit<Block, 'id' | 'type' | 'label' | 'duration_seconds' | 'rounds' | 'children'> = {
  parent_block_id: null, sort_order: 0, rest_between_seconds: 0,
  color: null, sound_start: 'bell', sound_end: 'bell', notes: '',
};

/** Construye una rutina timer inline a partir de los parámetros del preset */
export function buildPresetRoutine(name: string, p: Record<string, string>): Routine {
  const blocks: Block[] = [];
  const work = parseInt(p.work ?? '0', 10);
  const rest = parseInt(p.rest ?? '0', 10);
  const rounds = parseInt(p.rounds ?? '1', 10);
  const duration = parseInt(p.duration ?? '0', 10);

  if (work > 0 && rounds > 0) {
    // Interval-based: Tabata, 30/30, etc.
    const children: Block[] = [];
    children.push({ ...BD, id: presetId(), type: 'work', label: 'Trabajo', duration_seconds: work, rounds: 1 });
    if (rest > 0) children.push({ ...BD, id: presetId(), type: 'rest', label: 'Descanso', duration_seconds: rest, rounds: 1 });
    blocks.push({ ...BD, id: presetId(), type: 'group', label: name, duration_seconds: null, rounds, children });
  } else if (duration > 0) {
    // Duration-based: EMOM, AMRAP
    blocks.push({ ...BD, id: presetId(), type: 'work', label: name, duration_seconds: duration, rounds: 1 });
  }

  return {
    id: presetId(),
    name,
    description: '',
    category: 'hiit',
    mode: 'timer',
    blocks,
  };
}

// §4.4 caza de redundancia: la descripción lleva el formato completo
// incluida la duración total — un dato = un lugar.
export interface HIITPreset {
  name: string;
  description: string;
  params: Record<string, string>;
}

export const HIIT_PRESETS: HIITPreset[] = [
  {
    name: 'Tabata clásico',
    description: '20s máximo esfuerzo / 10s descanso × 8 rondas · 4 min',
    params: { mode: 'tabata', work: '20', rest: '10', rounds: '8' },
  },
  {
    name: 'EMOM 10 min',
    description: 'Every Minute On the Minute: 1 ejercicio cada minuto',
    params: { mode: 'emom', work: '60', rest: '0', rounds: '10' },
  },
  {
    name: 'AMRAP 15 min',
    description: 'As Many Rounds As Possible: tantas rondas como puedas',
    params: { mode: 'amrap', duration: '900' },
  },
  {
    name: '30/30 × 10',
    description: '30s trabajo / 30s descanso × 10 rondas · 10 min',
    params: { mode: 'intervals', work: '30', rest: '30', rounds: '10' },
  },
];
