/**
 * Routine Bridge — puente PURO entre el árbol del builder (engine `Routine`)
 * y el runner unificado de fuerza (`strength-session`, MB-3/MB-5). MB-7 Track C.
 *
 * Doctrina: exactamente DOS interfaces de entrenamiento en toda la app, y
 * las dos viven DENTRO del runner unificado `/session` (Ola 2 Fitness;
 * /execution murió, /strength-session es alias).
 *  1. Con clip — SIEMPRE que la rutina traiga ejercicios con `matrix_slug`,
 *     sin importar por dónde se creó.
 *  2. Timer puro (TimerModeRunner) — para rutinas de puro tiempo sin matriz.
 * Mezcla: la sesión corre en modo bloques y cada bloque usa lo que le toca —
 * ejercicio de matriz = series con clip; tiempo puro = countdown inline.
 * El usuario NUNCA sale de la sesión.
 *
 * Reglas de traducción (árbol → bloques de sesión, vía flattenRoutine):
 *  - Steps work consecutivos del MISMO ejercicio de matriz → un bloque con
 *    series acumuladas; el rest intercalado se vuelve descanso entre series.
 *  - Steps de tiempo (work sin matriz, prep) → bloques `esTiempo` uno a uno,
 *    en orden fiel (un circuito A,B,A,B se corre A,B,A,B).
 *  - Rests dentro de secciones de tiempo se corren tal cual (el reloj ES el
 *    contenido ahí); rests entre estaciones de fuerza se sueltan (el flujo de
 *    fuerza es a ritmo propio + RestTimer entre series).
 *  - `matrix_slug` que no existe en el catálogo → fail-soft: corre como bloque
 *    de tiempo y se reporta en `omitidos`.
 *
 * Sin imports de react-native/supabase → testeable en Vitest node.
 */
import { flattenRoutine } from '@/src/engine/flatten';
import type { Routine, Block } from '@/src/engine/types';
import type { MatrixExercise, Patron } from '@/src/constants/exercise-matrix';
import type { RoutineBlock } from './routine-generator-core';

/** Subconjunto del catálogo que el puente necesita (test-friendly). */
export type BridgeMatrixEntry = Pick<
  MatrixExercise,
  'slug' | 'nombre' | 'mediaUrl' | 'posterUrl' | 'dinamica' | 'lateralidad' | 'musculoPrincipal' | 'patron' | 'familia'
>;

/** Bloque de sesión: el RoutineBlock del runner + marca de tiempo puro. */
export interface SessionBlock extends RoutineBlock {
  /** true → countdown inline (timer), no registro de series. */
  esTiempo?: boolean;
  /** true → el bloque de tiempo es un descanso prescrito (copy distinto). */
  esDescansoTiempo?: boolean;
}

export interface BridgedSession {
  bloques: SessionBlock[];
  /** Ejercicios con matrix_slug que NO están en el catálogo cargado. */
  omitidos: string[];
}

/** Descanso entre series por default cuando el árbol no prescribe uno. */
const DESCANSO_DEFAULT_SEG = 90;
/** Reps default al traducir un bloque de tiempo a series (mismo criterio que la biblioteca). */
const REPS_DEFAULT = 10;
const ISO_SEGUNDOS_DEFAULT = 40;

/** ¿La rutina merece el runner con clip? true si ALGÚN work trae matrix_slug. */
export function routineUsesClipRunner(routine: Routine): boolean {
  const hasMatrix = (blocks: Block[]): boolean =>
    blocks.some((b) =>
      (b.type === 'work' && !!b.matrix_slug) || (b.children ? hasMatrix(b.children) : false),
    );
  return hasMatrix(routine.blocks);
}

function tiempoBlock(nombre: string, tiempoSeg: number, seq: number, esDescanso: boolean): SessionBlock {
  return {
    slug: `tiempo-${seq}`,
    nombre,
    mediaUrl: null,
    posterUrl: null,
    slot: 'multi_sarcomerico',
    metodo: 'Estándar',
    series: 1,
    reps: 0,
    esIsometrico: false,
    esUnilateral: false,
    descansoSeg: 0,
    miniSeries: 0,
    microDescansoSeg: 0,
    tiempoSeg,
    musculoPrincipal: '',
    // Nunca se pinta: el hero de tiempo no muestra pills de patrón/músculo.
    patron: '' as Patron,
    familia: '',
    esTiempo: true,
    esDescansoTiempo: esDescanso,
  };
}

/**
 * Traduce una rutina del builder a la secuencia de bloques que corre
 * `strength-session`. `matrixBySlug` viene de getExerciseMatrix() en el host.
 */
export function bridgeRoutineToSession(
  routine: Routine,
  matrixBySlug: Map<string, BridgeMatrixEntry>,
): BridgedSession {
  const steps = flattenRoutine(routine);
  const bloques: SessionBlock[] = [];
  const omitidos: string[] = [];
  let pendingRestSeg = 0;
  let tiempoSeq = 0;

  for (const st of steps) {
    if (st.type === 'rest') {
      const last = bloques[bloques.length - 1];
      if (last?.esTiempo && st.durationSeconds > 0) {
        // Sección de tiempo: el descanso prescrito se corre tal cual.
        bloques.push(tiempoBlock('Descanso', st.durationSeconds, ++tiempoSeq, true));
        pendingRestSeg = 0;
      } else {
        // Candidato a descanso entre series del mismo ejercicio.
        pendingRestSeg = st.durationSeconds;
      }
      continue;
    }

    const matrixSlug = st.type === 'work' ? st.matrixSlug ?? null : null;
    const m = matrixSlug ? matrixBySlug.get(matrixSlug) : undefined;
    if (matrixSlug && !m) omitidos.push(st.exerciseName ?? st.label);

    if (m) {
      const last = bloques[bloques.length - 1];
      if (last && !last.esTiempo && last.slug === m.slug) {
        last.series += 1;
        if (pendingRestSeg > 0) last.descansoSeg = pendingRestSeg;
      } else {
        const esIso = m.dinamica === 'Isométrico';
        bloques.push({
          slug: m.slug,
          nombre: m.nombre,
          mediaUrl: m.mediaUrl,
          posterUrl: m.posterUrl,
          slot: 'multi_sarcomerico',
          metodo: 'Estándar',
          series: 1,
          reps: esIso ? ISO_SEGUNDOS_DEFAULT : REPS_DEFAULT,
          esIsometrico: esIso,
          esUnilateral: m.lateralidad === 'Unilateral',
          descansoSeg: pendingRestSeg > 0 ? pendingRestSeg : DESCANSO_DEFAULT_SEG,
          miniSeries: 0,
          microDescansoSeg: 0,
          tiempoSeg: 0,
          musculoPrincipal: m.musculoPrincipal,
          patron: m.patron,
          familia: m.familia,
        });
      }
      pendingRestSeg = 0;
      continue;
    }

    // Tiempo puro (work sin matriz o prep).
    if (st.durationSeconds <= 0) { pendingRestSeg = 0; continue; }
    if (pendingRestSeg > 0) {
      // El descanso previo antecede a un bloque de tiempo → se corre tal cual.
      bloques.push(tiempoBlock('Descanso', pendingRestSeg, ++tiempoSeq, true));
      pendingRestSeg = 0;
    }
    const nombre = st.label || (st.type === 'prep' ? 'Preparación' : 'Trabajo');
    bloques.push(tiempoBlock(nombre, st.durationSeconds, ++tiempoSeq, false));
  }

  return { bloques, omitidos };
}
