/**
 * useRoutineMode — Hook para el modo rutina (fuerza/hipertrofia).
 *
 * A diferencia del RoutineEngine (countdown, avance automático),
 * este hook usa countup y el usuario controla cuándo avanzar.
 *
 * Estados: idle → working → resting → transition → completed
 * El descanso tiene semáforo: azul → amarillo → rojo.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { speak as speakTTS, stopSpeech } from '@/src/utils/speech';
import { playStepStart, playStepEnd, playRoutineComplete, initAudio, cleanupAudio, setSoundStyle } from '@/src/utils/sounds';
import { vibrateLight, vibrateMedium, vibrateHeavy } from '@/src/utils/haptics';
import { useSettings } from '@/src/contexts/settings-context';
import { logExerciseSet, checkRecentPR } from '@/src/services/exercise-service';
import type { Routine, Block } from '@/src/engine/types';

// === TIPOS ===

export type RoutineModePhase = 'idle' | 'working' | 'resting' | 'transition' | 'awaiting_next' | 'completed';
export type RestZone = 'blue' | 'yellow' | 'red';

export interface ExerciseSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  rir: number | null;
  durationSeconds: number;
  restDurationSeconds: number;
  isExtra: boolean;
}

export interface RoutineExercise {
  blockId: string;
  exerciseId: string;
  exerciseName: string;
  label: string;
  suggestedSets: number;
  suggestedRestSeconds: number;
  completedSets: ExerciseSet[];
}

export interface RoutineModeStats {
  totalDurationSeconds: number;
  exercisesCompleted: number;
  totalSets: number;
  totalReps: number;
  startedAt: Date;
  completedAt: Date;
}

export interface PRCelebration {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

// === EXTRAER EJERCICIOS DE LOS BLOQUES ===

/**
 * Extrae ejercicios ejecutables de los bloques.
 * El número de sets viene del group padre (rounds del contenedor),
 * no del bloque work en sí. Si no hay group padre, default 1 set.
 */
function extractExercises(blocks: Block[]): RoutineExercise[] {
  const exercises: RoutineExercise[] = [];

  const walk = (blockList: Block[], parentGroupRounds: number) => {
    for (const block of blockList) {
      if (block.type === 'group') {
        // Propagar rounds del grupo a sus hijos
        walk(block.children ?? [], block.rounds > 0 ? block.rounds : 1);
      } else if (block.type === 'work' && block.exercise_id) {
        exercises.push({
          blockId: block.id,
          exerciseId: block.exercise_id,
          exerciseName: block.exercise_name ?? block.label,
          label: block.label,
          suggestedSets: parentGroupRounds,
          suggestedRestSeconds: block.suggested_rest_seconds ?? 120,
          completedSets: [],
        });
      } else if (block.children) {
        walk(block.children, parentGroupRounds);
      }
    }
  };

  walk(blocks, 1);
  return exercises;
}

// === HOOK ===

export function useRoutineMode(routine: Routine) {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Ejercicios extraídos de los bloques
  const exercises = useMemo(() => extractExercises(routine.blocks), [routine]);

  // Estado principal
  const [phase, setPhase] = useState<RoutineModePhase>('idle');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Map<number, ExerciseSet[]>>(new Map());
  const [suggestedSetsCounts, setSuggestedSetsCounts] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    exercises.forEach((ex, i) => m.set(i, ex.suggestedSets));
    return m;
  });

  // Timers
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [stats, setStats] = useState<RoutineModeStats | null>(null);

  // PR detection
  const [lastPR, setLastPR] = useState<PRCelebration | null>(null);
  const [sessionPRs, setSessionPRs] = useState<Set<string>>(new Set());

  // Refs
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const lastAlertRef = useRef(0);

  // Inicializar audio
  useEffect(() => {
    initAudio();
    setSoundStyle(settingsRef.current.soundStyle);
    return () => {
      stopTimers();
      stopSpeech();
      cleanupAudio();
    };
  }, []);

  // Sincronizar estilo de sonido
  useEffect(() => {
    setSoundStyle(settings.soundStyle);
  }, [settings.soundStyle]);

  const stopTimers = useCallback(() => {
    if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
    if (workTimerRef.current) { clearInterval(workTimerRef.current); workTimerRef.current = null; }
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
  }, []);

  // Timer de sesión (siempre corriendo una vez que empieza)
  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) return;
    sessionTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  /** Verificar si un set generó un PR nuevo (fire-and-forget) */
  const checkAndCelebratePR = useCallback(async (exerciseId: string, exerciseName: string) => {
    // Esperar a que el trigger de la DB haya procesado
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const pr = await checkRecentPR(exerciseId);
      if (pr) {
        setLastPR({ exerciseName, weightKg: pr.weight_kg, reps: pr.rep_range });
        setSessionPRs(prev => new Set(prev).add(exerciseId));
        const s = settingsRef.current;
        if (s.vibrationEnabled) vibrateHeavy();
        if (s.voiceEnabled) speakTTS('Nuevo récord personal', s.voiceLanguage);
      }
    } catch { /* silencioso */ }
  }, []);

  const clearPR = useCallback(() => setLastPR(null), []);

  // === ACCIONES ===

  /** Iniciar la rutina — muestra transición al primer ejercicio */
  const start = useCallback(() => {
    if (exercises.length === 0) return;
    startedAtRef.current = new Date();
    startSessionTimer();
    setPhase('transition');

    const s = settingsRef.current;
    if (s.voiceEnabled) {
      const ex = exercises[0];
      speakTTS(ex.exerciseName, s.voiceLanguage);
    }
    if (s.vibrationEnabled) vibrateLight();
  }, [exercises, startSessionTimer]);

  /** Empezar a trabajar (desde transición o descanso) */
  const startWorking = useCallback(() => {
    setPhase('working');
    setWorkSeconds(0);

    // Timer de trabajo (countup)
    if (workTimerRef.current) clearInterval(workTimerRef.current);
    workTimerRef.current = setInterval(() => {
      setWorkSeconds(prev => prev + 1);
    }, 1000);

    const s = settingsRef.current;
    if (s.soundsEnabled) playStepStart(s.soundVolume / 100);
  }, []);

  /** Completar un set — registra y pasa a descanso */
  const completeSet = useCallback(async (reps: number, weightKg: number | null, rpe: number | null, rir: number | null) => {
    // Parar timer de trabajo
    if (workTimerRef.current) { clearInterval(workTimerRef.current); workTimerRef.current = null; }

    const exerciseIdx = currentExerciseIndex;
    const exercise = exercises[exerciseIdx];
    if (!exercise) return;

    const existingSets = completedSets.get(exerciseIdx) ?? [];
    const setNumber = existingSets.length + 1;
    const totalSuggested = suggestedSetsCounts.get(exerciseIdx) ?? exercise.suggestedSets;

    const newSet: ExerciseSet = {
      setNumber,
      reps,
      weightKg,
      rpe,
      rir,
      durationSeconds: workSeconds,
      restDurationSeconds: 0,
      isExtra: setNumber > exercise.suggestedSets,
    };

    const updatedSets = [...existingSets, newSet];
    setCompletedSets(prev => new Map(prev).set(exerciseIdx, updatedSets));
    setCurrentSetIndex(setNumber); // Siguiente set (1-indexed)

    // Guardar en Supabase
    try {
      await logExerciseSet({
        exercise_id: exercise.exerciseId,
        reps,
        weight_kg: weightKg,
        rpe,
        rir,
        block_id: exercise.blockId,
        set_number: setNumber,
      });
    } catch (err) {
      if (__DEV__) console.error('[routineMode] Error al guardar set:', err);
    }

    // Verificar si fue PR (fire-and-forget, no bloquea)
    if (weightKg && weightKg > 0 && reps > 0) {
      checkAndCelebratePR(exercise.exerciseId, exercise.exerciseName);
    }

    const s = settingsRef.current;

    // ¿Es el último set? → Verificar si hay más ejercicios
    if (setNumber >= totalSuggested) {
      // Último set sugerido completado — pero el usuario puede agregar extras
      // Ir a descanso de todas formas
    }

    // Iniciar descanso
    setPhase('resting');
    setRestSeconds(0);
    lastAlertRef.current = 0;

    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestSeconds(prev => prev + 1);
    }, 1000);

    if (s.soundsEnabled) playStepEnd(s.soundVolume / 100);
    if (s.vibrationEnabled) vibrateLight();
    if (s.voiceEnabled) {
      const restLabel = exercise.suggestedRestSeconds >= 60
        ? `Descanso, ${Math.floor(exercise.suggestedRestSeconds / 60)} minutos`
        : `Descanso, ${exercise.suggestedRestSeconds} segundos`;
      speakTTS(restLabel, s.voiceLanguage);
    }
  }, [currentExerciseIndex, exercises, completedSets, suggestedSetsCounts, workSeconds]);

  /** Agregar un set extra — funciona en cualquier fase activa */
  const addExtraSet = useCallback(() => {
    const exerciseIdx = currentExerciseIndex;
    const current = suggestedSetsCounts.get(exerciseIdx) ?? exercises[exerciseIdx]?.suggestedSets ?? 3;
    setSuggestedSetsCounts(prev => new Map(prev).set(exerciseIdx, current + 1));

    // Desde resting, awaiting_next o transition → volver a trabajar
    if (phase === 'resting' || phase === 'awaiting_next' || phase === 'transition') {
      if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
      if (workTimerRef.current) { clearInterval(workTimerRef.current); workTimerRef.current = null; }
      stopSpeech();
      startWorking();
    }
  }, [currentExerciseIndex, suggestedSetsCounts, exercises, phase, startWorking]);

  /** Siguiente serie (desde descanso) */
  const nextSet = useCallback(() => {
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
    stopSpeech();

    const exerciseIdx = currentExerciseIndex;
    const totalSuggested = suggestedSetsCounts.get(exerciseIdx) ?? exercises[exerciseIdx]?.suggestedSets ?? 3;
    const doneSets = (completedSets.get(exerciseIdx) ?? []).length;

    if (doneSets >= totalSuggested) {
      // Todos los sets completados → mostrar confirmación de transición
      setPhase('awaiting_next');
    } else {
      startWorking();
    }
  }, [currentExerciseIndex, suggestedSetsCounts, exercises, completedSets, startWorking]);

  /** Pedir confirmación para ir al siguiente ejercicio */
  const requestNextExercise = useCallback(() => {
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
    if (workTimerRef.current) { clearInterval(workTimerRef.current); workTimerRef.current = null; }
    stopSpeech();
    setPhase('awaiting_next');
  }, []);

  /** Cancelar transición — volver a descanso del ejercicio actual */
  const cancelNextExercise = useCallback(() => {
    setPhase('resting');
    setRestSeconds(0);
    lastAlertRef.current = 0;
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  /** Siguiente ejercicio (ejecución directa) */
  const nextExercise = useCallback(() => {
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
    if (workTimerRef.current) { clearInterval(workTimerRef.current); workTimerRef.current = null; }
    stopSpeech();

    const nextIdx = currentExerciseIndex + 1;

    if (nextIdx >= exercises.length) {
      // Rutina completada
      stopTimers();
      const completedAt = new Date();
      let totalSets = 0;
      let totalReps = 0;
      completedSets.forEach(sets => {
        totalSets += sets.length;
        totalReps += sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
      });

      setStats({
        totalDurationSeconds: elapsedSeconds,
        exercisesCompleted: exercises.length,
        totalSets,
        totalReps,
        startedAt: startedAtRef.current ?? completedAt,
        completedAt,
      });
      setPhase('completed');

      const s = settingsRef.current;
      if (s.vibrationEnabled) vibrateHeavy();
      if (s.soundsEnabled) playRoutineComplete(s.soundVolume / 100);
      if (s.voiceEnabled) speakTTS('Rutina completada. Excelente trabajo.', s.voiceLanguage);
      return;
    }

    setCurrentExerciseIndex(nextIdx);
    setCurrentSetIndex(0);
    setPhase('transition');

    const s = settingsRef.current;
    if (s.vibrationEnabled) vibrateMedium();
    if (s.voiceEnabled) speakTTS(exercises[nextIdx].exerciseName, s.voiceLanguage);
  }, [currentExerciseIndex, exercises, completedSets, elapsedSeconds, stopTimers]);

  /** Confirmar transición al siguiente ejercicio (desde awaiting_next) */
  const confirmNextExercise = useCallback(() => {
    nextExercise();
  }, [nextExercise]);

  // === ALERTAS DE DESCANSO (semáforo) ===

  const currentExercise = exercises[currentExerciseIndex] ?? null;
  const suggestedRest = currentExercise?.suggestedRestSeconds ?? 120;

  const restZone: RestZone = useMemo(() => {
    if (restSeconds <= suggestedRest) return 'blue';
    if (restSeconds <= suggestedRest * 1.5) return 'yellow';
    return 'red';
  }, [restSeconds, suggestedRest]);

  // Alertas del semáforo
  useEffect(() => {
    if (phase !== 'resting') return;
    const s = settingsRef.current;

    // Zona amarilla: al cruzar el sugerido
    if (restSeconds === suggestedRest) {
      if (s.vibrationEnabled) vibrateMedium();
      if (s.soundsEnabled) playStepEnd(s.soundVolume / 100);
      if (s.voiceEnabled) speakTTS('Descanso cumplido', s.voiceLanguage);
    }

    // Zona roja: al cruzar 150%
    const redThreshold = Math.floor(suggestedRest * 1.5);
    if (restSeconds === redThreshold) {
      if (s.vibrationEnabled) vibrateHeavy();
      if (s.voiceEnabled) speakTTS('Siguiente serie', s.voiceLanguage);
    }

    // Zona roja: repetir cada 30s
    if (restSeconds > redThreshold && restSeconds - lastAlertRef.current >= 30) {
      lastAlertRef.current = restSeconds;
      if (s.vibrationEnabled) vibrateHeavy();
      if (s.voiceEnabled) speakTTS('Llevas mucho descanso, siguiente serie', s.voiceLanguage);
    }
  }, [restSeconds, phase, suggestedRest]);

  // Datos derivados
  const currentSets = completedSets.get(currentExerciseIndex) ?? [];
  const totalSuggestedSets = suggestedSetsCounts.get(currentExerciseIndex) ?? currentExercise?.suggestedSets ?? 3;
  const nextExerciseData = exercises[currentExerciseIndex + 1] ?? null;
  const restCountdown = Math.max(0, suggestedRest - restSeconds);
  const restOvertime = Math.max(0, restSeconds - suggestedRest);

  return {
    // Estado
    phase,
    exercises,
    currentExercise,
    currentExerciseIndex,
    currentSetIndex,
    currentSets,
    totalSuggestedSets,
    nextExerciseData,
    stats,
    completedSets,

    // Timers
    elapsedSeconds,
    workSeconds,
    restSeconds,
    restCountdown,
    restOvertime,
    restZone,
    suggestedRest,

    // PR
    lastPR,
    sessionPRs,
    clearPR,

    // Acciones
    start,
    startWorking,
    completeSet,
    addExtraSet,
    nextSet,
    requestNextExercise,
    confirmNextExercise,
    cancelNextExercise,
  };
}
