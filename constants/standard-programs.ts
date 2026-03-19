/**
 * Programas estándar predefinidos — Tabata, HIIT, Quick timers, etc.
 * Cada programa tiene una rutina con bloques configurados.
 */
import type { Block, Routine } from '@/types/models';

// === HELPERS ===

/** Genera bloques para rutinas de intervalo (ejercicio + descanso × N) */
function createIntervalBlocks(
  exerciseSec: number,
  restSec: number,
): Block[] {
  return [
    { id: 'ex', type: 'exercise', label: 'Ejercicio', durationSeconds: exerciseSec },
    { id: 'rest', type: 'rest', label: 'Descanso', durationSeconds: restSec },
  ];
}

/** Calcula duración total: (suma de bloques) × rondas */
function calcTotal(blocks: Block[], rounds: number): number {
  return blocks.reduce((sum, b) => sum + b.durationSeconds, 0) * rounds;
}

// === RUTINAS ESTÁNDAR ===

export interface StandardProgram {
  id: string;
  name: string;
  description: string;
  icon: string;
  routine: Routine;
}

const tabataBlocks = createIntervalBlocks(20, 10);
const hiit3030Blocks = createIntervalBlocks(30, 30);
const hiit4020Blocks = createIntervalBlocks(40, 20);

export const STANDARD_PROGRAMS: StandardProgram[] = [
  {
    id: 'std-tabata',
    name: 'Tabata Classic',
    description: '8 rondas · 20s ejercicio / 10s descanso',
    icon: 'flash-outline',
    routine: {
      id: 'r-tabata',
      name: 'Tabata Classic',
      blocks: tabataBlocks,
      totalDuration: calcTotal(tabataBlocks, 8),
      rounds: 8,
    },
  },
  {
    id: 'std-hiit-3030',
    name: 'HIIT 30/30',
    description: '10 rondas · 30s ejercicio / 30s descanso',
    icon: 'flame-outline',
    routine: {
      id: 'r-hiit-3030',
      name: 'HIIT 30/30',
      blocks: hiit3030Blocks,
      totalDuration: calcTotal(hiit3030Blocks, 10),
      rounds: 10,
    },
  },
  {
    id: 'std-hiit-4020',
    name: 'HIIT 40/20',
    description: '10 rondas · 40s ejercicio / 20s descanso',
    icon: 'flame-outline',
    routine: {
      id: 'r-hiit-4020',
      name: 'HIIT 40/20',
      blocks: hiit4020Blocks,
      totalDuration: calcTotal(hiit4020Blocks, 10),
      rounds: 10,
    },
  },
  {
    id: 'std-emom-10',
    name: 'EMOM 10',
    description: '10 rondas · 60s por ronda',
    icon: 'repeat-outline',
    routine: {
      id: 'r-emom-10',
      name: 'EMOM 10',
      blocks: [{ id: 'emom-ex', type: 'exercise', label: 'Ejercicio', durationSeconds: 60 }],
      totalDuration: 600,
      rounds: 10,
    },
  },
  {
    id: 'std-30s',
    name: 'Quick 30s',
    description: '1 bloque · 30 segundos',
    icon: 'timer-outline',
    routine: {
      id: 'r-30s',
      name: 'Quick 30s',
      blocks: [{ id: 'q30', type: 'exercise', label: 'Ejercicio', durationSeconds: 30 }],
      totalDuration: 30,
      rounds: 1,
    },
  },
  {
    id: 'std-60s',
    name: 'Quick 60s',
    description: '1 bloque · 60 segundos',
    icon: 'timer-outline',
    routine: {
      id: 'r-60s',
      name: 'Quick 60s',
      blocks: [{ id: 'q60', type: 'exercise', label: 'Ejercicio', durationSeconds: 60 }],
      totalDuration: 60,
      rounds: 1,
    },
  },
  {
    id: 'std-90s',
    name: 'Quick 90s',
    description: '1 bloque · 90 segundos',
    icon: 'timer-outline',
    routine: {
      id: 'r-90s',
      name: 'Quick 90s',
      blocks: [{ id: 'q90', type: 'exercise', label: 'Ejercicio', durationSeconds: 90 }],
      totalDuration: 90,
      rounds: 1,
    },
  },
];

/** Programa especial "Personalizado" — no tiene rutina, abre el builder */
export const CUSTOM_PROGRAM_ID = 'std-custom';
