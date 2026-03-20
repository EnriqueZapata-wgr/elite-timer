/**
 * useRoutineEngine — Hook React que envuelve RoutineEngine.
 *
 * Compila la rutina en steps, crea el engine, y expone estado reactivo
 * + controles para consumir desde cualquier pantalla.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  remainingSeconds: number;
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
  const [remainingSeconds, setRemainingSeconds] = useState(steps[0]?.durationSeconds ?? 0);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [stats, setStats] = useState<ExecutionStats | null>(null);

  const engineRef = useRef<RoutineEngine | null>(null);

  // Crear engine con callbacks que actualizan estado React
  useEffect(() => {
    const callbacks: EngineCallbacks = {
      onStateChange: setEngineState,
      onStepChange: (step, next) => {
        setCurrentStep(step);
        setNextStep(next);
        setStepProgress(0);
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
      onSpeak: () => {},  // TTS — se conectará en fase futura
      onSound: () => {},  // Audio — se conectará en fase futura
    };

    const engine = new RoutineEngine(steps, callbacks);
    engineRef.current = engine;

    return () => engine.destroy();
  }, [steps]);

  // Controles
  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const togglePlayPause = useCallback(() => engineRef.current?.togglePlayPause(), []);
  const skip = useCallback(() => engineRef.current?.skip(), []);
  const restartStep = useCallback(() => engineRef.current?.restartCurrentStep(), []);

  const restart = useCallback(() => {
    engineRef.current?.restart();
    // Resetear estado React manualmente (restart() solo emite onStateChange)
    if (steps.length > 0) {
      setCurrentStep(steps[0]);
      setNextStep(steps[1] ?? null);
      setRemainingSeconds(steps[0].durationSeconds);
    }
    setStepProgress(0);
    setTotalProgress(0);
    setStats(null);
  }, [steps]);

  // currentStepNumber derivado del step actual
  const currentStepNumber = currentStep ? currentStep.stepIndex + 1 : 0;

  return {
    engineState,
    currentStep,
    nextStep,
    remainingSeconds,
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
