/**
 * Tipos del motor de ejecución de timers recursivos.
 *
 * Block → estructura de árbol (como viene de Supabase / get_routine_tree)
 * ExecutionStep → paso lineal compilado, listo para ejecutar
 * RoutineEngine → state machine que consume ExecutionStep[]
 */

// === BLOQUE (árbol) ===

/** Bloque del árbol de rutina — puede ser group (contenedor) o hoja (work/rest/prep) */
export interface Block {
  id: string;
  parent_block_id: string | null;
  sort_order: number;
  type: 'group' | 'work' | 'rest' | 'prep';
  label: string;
  duration_seconds: number | null;
  rounds: number;
  rest_between_seconds: number;
  color: string | null;
  sound_start: string;
  sound_end: string;
  notes: string;
  children?: Block[];
}

// === RUTINA ===

/** Rutina completa con su árbol de bloques */
export interface Routine {
  id: string;
  name: string;
  description: string;
  category: string;
  blocks: Block[];
}

// === STEP COMPILADO ===

/** Contexto de un step: dónde está dentro del árbol de rondas */
export interface StepContext {
  /** Ruta de labels desde la raíz: ["Serie Principal", "Bloque", "11 reps"] */
  breadcrumb: string[];
  /** Stack de rondas activas: [{current:2, total:4, label:"Serie"}] */
  rounds: { current: number; total: number; label: string }[];
  /** Profundidad en el árbol */
  depth: number;
}

/** Paso de ejecución lineal — resultado de compilar el árbol recursivo */
export interface ExecutionStep {
  stepIndex: number;
  blockId: string;
  type: 'work' | 'rest' | 'prep';
  label: string;
  durationSeconds: number;
  color: string | null;
  soundStart: string;
  soundEnd: string;
  notes: string;
  /** true si es un descanso insertado entre rondas (rest_between) */
  isRestBetween: boolean;
  context: StepContext;
}

// === ENGINE ===

export type EngineState = 'idle' | 'running' | 'paused' | 'completed';

/** Callbacks que el engine invoca durante la ejecución */
export interface EngineCallbacks {
  onStepChange: (step: ExecutionStep, nextStep: ExecutionStep | null) => void;
  onTick: (remainingSeconds: number, step: ExecutionStep) => void;
  onStateChange: (state: EngineState) => void;
  onComplete: (stats: ExecutionStats) => void;
  onSpeak: (text: string) => void;
  onSound: (sound: string) => void;
}

/** Estadísticas al completar una rutina */
export interface ExecutionStats {
  totalDurationSeconds: number;
  actualDurationSeconds: number;
  workSeconds: number;
  restSeconds: number;
  stepsCompleted: number;
  stepsSkipped: number;
  startedAt: Date;
  completedAt: Date;
}
