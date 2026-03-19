/**
 * Modelos de datos — Tipos centrales de la app ELITE Timer.
 */

// === UTILIDAD ===

/** Genera un ID único basado en timestamp + random */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// === BLOQUES ===

/** Tipos de bloque disponibles en una rutina */
export type BlockType = 'exercise' | 'rest' | 'transition' | 'final';

/** Un bloque individual dentro de una rutina */
export interface Block {
  id: string;
  type: BlockType;
  label: string;
  durationSeconds: number;
}

// === RUTINAS ===

/** Una rutina es una secuencia de bloques que se repite N rondas */
export interface Routine {
  id: string;
  name: string;
  blocks: Block[];
  totalDuration: number;
  rounds: number;
}

// === PROGRAMAS ===

/** Un programa agrupa varias rutinas */
export interface Program {
  id: string;
  name: string;
  description: string;
  routines: Routine[];
  createdAt: number;
  updatedAt: number;
  isStandard: boolean;
}

// === SESIONES ===

/** Registro de un bloque completado durante una sesión */
export interface CompletedBlock {
  blockId: string;
  type: BlockType;
  label: string;
  plannedDuration: number;
  actualDuration: number;
  skipped: boolean;
}

/** Registro de una sesión de entrenamiento completada */
export interface Session {
  id: string;
  programName: string;
  routineName: string;
  completedBlocks: CompletedBlock[];
  totalPlannedTime: number;
  totalActualTime: number;
  completedAt: number;
  roundsCompleted: number;
}

// === PROGRESO ===

/** Estadísticas agregadas del usuario */
export interface ProgressStats {
  totalSessions: number;
  totalTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
}

// === FASE 2 ===

/** Perfil de atleta — ELITE Health Card */
export interface HealthCard {
  name: string;
  age: number;
  weight: number;
  height: number;
  goals: string;
  photoUri: string | null;
}
