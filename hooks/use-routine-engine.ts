/**
 * useRoutineEngine — Hook React que envuelve RoutineEngine.
 *
 * Compila la rutina en steps, crea el engine, y expone estado reactivo
 * + controles para consumir desde cualquier pantalla.
 * Integra TTS via expo-speech.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Speech from 'expo-speech';
import { RoutineEngine } from '@/src/engine/RoutineEngine';
import { flattenRoutine } from '@/src/engine/flatten';
import { calcRoutineStats } from '@/src/engine/helpers';
import type {
  Routine as EngineRoutine,
  ExecutionStep,
  EngineState,
  EngineCallbacks,
  ExecutionStats,
} from '@/src/engine/types';

export interface UseRoutineEngineReturn {
  // Estado
  engineState: EngineState;
  currentStep: ExecutionStep | null;
  nextStep: ExecutionStep | null;
  stepAfterNext: ExecutionStep | null;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalRemainingSeconds: number;
  stepProgress: number;
  totalProgress: number;
  currentStepNumber: number;
  totalSteps: number;
  stats: ExecutionStats | null;
  routineStats: ReturnType<typeof calcRoutineStats>;
  // Controles
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skip: () => void;
  restartStep: () => void;
  restart: () => void;
}

export function useRoutineEngine(routine: EngineRoutine): UseRoutineEngineReturn {
  // Compilar rutina a steps una sola vez
  const steps = useMemo(() => flattenRoutine(routine), [routine]);
  const routineStats = useMemo(() => calcRoutineStats(steps), [steps]);

  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [currentStep, setCurrentStep] = useState<ExecutionStep | null>(steps[0] ?? null);
  const [nextStep, setNextStep] = useState<ExecutionStep | null>(steps[1] ?? null);
  const [stepAfterNext, setStepAfterNext] = useState<ExecutionStep | null>(steps[2] ?? null);
  const [remainingSeconds, setRemainingSeconds] = useState(steps[0]?.durationSeconds ?? 0);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [stats, setStats] = useState<ExecutionStats | null>(null);

  const engineRef = useRef<RoutineEngine | null>(null);

  // TTS — hablar texto en español
  const speak = useCallback((text: string) => {
    try {
      Speech.speak(text, { language: 'es-MX', rate: 1.1 });
    } catch {
      // TTS no disponible en este entorno
    }
  }, []);

  // Crear engine con callbacks que actualizan estado React
  useEffect(() => {
    const callbacks: EngineCallbacks = {
      onStateChange: setEngineState,
      onStepChange: (step, next) => {
        setCurrentStep(step);
        setNextStep(next);
        setStepProgress(0);
        // stepAfterNext desde el engine
        const engine = engineRef.current;
        if (engine) {
          setStepAfterNext(engine.getStepAfterNext());
        }
      },
      onTick: (remaining) => {
        setRemainingSeconds(remaining);
        const engine = engineRef.current;
        if (engine) {
          setStepProgress(engine.getCurrentStepProgress());
          setTotalProgress(engine.getProgress());
        }
      },
      onComplete: (executionStats) => setStats(executionStats),
      onSpeak: (text) => speak(text),
      onSound: () => {},  // Audio — se conectará en fase futura
    };

    const engine = new RoutineEngine(steps, callbacks);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      Speech.stop();
    };
  }, [steps, speak]);

  // Controles
  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const togglePlayPause = useCallback(() => engineRef.current?.togglePlayPause(), []);
  const skip = useCallback(() => engineRef.current?.skip(), []);
  const restartStep = useCallback(() => engineRef.current?.restartCurrentStep(), []);

  const restart = useCallback(() => {
    Speech.stop();
    engineRef.current?.restart();
    if (steps.length > 0) {
      setCurrentStep(steps[0]);
      setNextStep(steps[1] ?? null);
      setStepAfterNext(steps[2] ?? null);
      setRemainingSeconds(steps[0].durationSeconds);
    }
    setStepProgress(0);
    setTotalProgress(0);
    setStats(null);
  }, [steps]);

  // Valores derivados
  const currentStepNumber = currentStep ? currentStep.stepIndex + 1 : 0;
  const elapsedSeconds = Math.round(totalProgress * routineStats.totalSeconds);
  const totalRemainingSeconds = routineStats.totalSeconds - elapsedSeconds;

  return {
    engineState,
    currentStep,
    nextStep,
    stepAfterNext,
    remainingSeconds,
    elapsedSeconds,
    totalRemainingSeconds,
    stepProgress,
    totalProgress,
    currentStepNumber,
    totalSteps: steps.length,
    stats,
    routineStats,
    play,
    pause,
    togglePlayPause,
    skip,
    restartStep,
    restart,
  };
}
