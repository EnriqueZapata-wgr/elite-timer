/**
 * EMOM core (MB-5 Bloque 1) — prescripción X×X según la carga del ejercicio.
 *
 * Criterio de Enrique: el EMOM no es 10×10 fijo — es X reps × N rondas, y el
 * autoajuste (serie de paga con la deuda) vive en la ronda X+1. Las reps se
 * proponen ACORDES A LA CARGA, no con número fijo:
 *   · carga externa (barra/mancuerna/máquina) → reps bajas, el peso trabaja
 *   · peso corporal exigente (pull-ups, dips, push-ups) → reps medias
 *   · peso corporal metabólico (mountain climbers, crunch, jumping jacks) →
 *     reps altas y más rondas
 *
 * La clase se deriva de la matriz (cargable + equipo + cualidades + nivel).
 * Los rangos son PROPUESTA (guiado, no prisionero): el usuario los ajusta en
 * el runner y Enrique los veta después. La REGLA DE PESO del EMOM (deuda 0 →
 * sube · deuda > última serie → baja · si no → mantiene) NO vive aquí y no
 * se toca.
 *
 * Puro (patrón *-core): cero deps de RN/Supabase — testeable en Vitest.
 */
import {
  NIVEL_EJERCICIO_RANK,
  type MatrixExercise,
  type NivelUsuario,
} from '@/src/constants/exercise-matrix';

export type EmomClase = 'cargable' | 'corporal_alta' | 'corporal_baja';

export interface EmomPrescripcion {
  clase: EmomClase;
  reps: number;
  repsMin: number;
  repsMax: number;
  rondas: number;
  rondasMin: number;
  rondasMax: number;
}

/** Implementos cuya carga externa hace el trabajo (→ reps bajas). */
const EQUIPO_CARGA_EXTERNA: ReadonlySet<string> = new Set([
  'Barra', 'Barra EZ', 'Mancuerna', 'Kettlebell', 'Cable/Polea',
  'Máquina', 'Smith', 'Landmine', 'Disco',
]);

export type EmomExercise = Pick<MatrixExercise, 'cargable' | 'equipoRequisitos' | 'cualidades' | 'nivel'>;

/**
 * Clase de carga del ejercicio para EMOM:
 * - 'cargable': cargable Y algún requisito de equipo es carga externa pura
 *   (todas sus alternativas son implemento de carga). Dominadas con lastre NO
 *   caen aquí (su requisito base es Barra fija) — son corporal_alta.
 * - 'corporal_alta': peso corporal que declara fuerza/hipertrofia o exige
 *   nivel Intermedio+ (pull-ups, dips, push-ups).
 * - 'corporal_baja': metabólico/resistencia de nivel principiante
 *   (mountain climbers, crunch, jumping jacks) → solo con reps altas.
 */
export function emomClaseDe(ex: EmomExercise): EmomClase {
  const cargaExterna = ex.cargable && ex.equipoRequisitos.some(
    (grupo) => grupo.length > 0 && grupo.every((tok) => EQUIPO_CARGA_EXTERNA.has(tok)),
  );
  if (cargaExterna) return 'cargable';
  const alta = ex.cualidades.includes('fuerza')
    || ex.cualidades.includes('hipertrofia')
    || NIVEL_EJERCICIO_RANK[ex.nivel] >= 1;
  return alta ? 'corporal_alta' : 'corporal_baja';
}

/**
 * Rangos por clase (brief MB-5 §1.2 — Enrique veta estos números):
 *   cargable       →  6-12 reps (default 8)  ·  6-12 rondas (default 10)
 *   corporal_alta  →  8-20 reps (default 12) ·  6-12 rondas (default 10)
 *   corporal_baja  → 20-40 reps (default 25) ·  8-15 rondas (default 10)
 */
export const EMOM_RANGOS: Record<EmomClase, Omit<EmomPrescripcion, 'clase'>> = {
  cargable:      { reps: 8,  repsMin: 6,  repsMax: 12, rondas: 10, rondasMin: 6, rondasMax: 12 },
  corporal_alta: { reps: 12, repsMin: 8,  repsMax: 20, rondas: 10, rondasMin: 6, rondasMax: 12 },
  corporal_baja: { reps: 25, repsMin: 20, repsMax: 40, rondas: 10, rondasMin: 8, rondasMax: 15 },
};

/** Prescripción propuesta. Principiante arranca en el piso del rango (filosofía del 8×8 previo). */
export function emomPrescripcionDe(ex: EmomExercise, nivelUsuario?: NivelUsuario): EmomPrescripcion {
  const clase = emomClaseDe(ex);
  const base = EMOM_RANGOS[clase];
  if (nivelUsuario === 'principiante') {
    return { clase, ...base, reps: base.repsMin, rondas: base.rondasMin };
  }
  return { clase, ...base };
}

export const EMOM_CLASE_LABEL: Record<EmomClase, string> = {
  cargable: 'Carga externa · reps bajas — el peso hace el trabajo',
  corporal_alta: 'Peso corporal exigente · reps medias',
  corporal_baja: 'Metabólico · reps altas, más rondas',
};

/** Duración estimada del EMOM: N minutos + ~1 min de serie de paga (X+1). */
export function emomTiempoSeg(rondas: number): number {
  return rondas * 60 + 60;
}
