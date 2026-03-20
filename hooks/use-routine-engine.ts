/**
 * useRoutineEngine — Hook React que envuelve RoutineEngine.
 *
 * Compila la rutina en steps, crea el engine, y expone estado reactivo
 * + controles. Integra TTS, sonidos y vibración háptica.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { speak as speakTTS, stopSpeech } from '@/src/utils/speech';
import { playSound, playStepStart, playStepEnd, playRoutineComplete, initAudio, cleanupAudio, setSoundStyle } from '@/src/utils/sounds';
import { vibrateLight, vibrateMedium, vibrateHeavy, vibrateCountdown } from '@/src/utils/haptics';
import { useSettings } from '@/src/contexts/settings-context';
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

/**
 * Detecta el nivel de cambio entre dos steps para elegir intensidad de vibración.
 * Compara los rounds del context para saber si cambió round o set.
 */
function detectChangeLevel(prevStep: ExecutionStep | null, newStep: ExecutionStep): 'step' | 'round' | 'set' {
  if (!prevStep) return 'step';

  const prevRounds = prevStep.context.rounds;
  const newRounds = newStep.context.rounds;

  // Cambio de set: el round de nivel 0 cambió
  if (prevRounds[0] && newRounds[0] && prevRounds[0].current !== newRounds[0].current) {
    return 'set';
  }

  // Cambio de round: algún round de nivel > 0 cambió
  for (let i = 1; i < Math.max(prevRounds.length, newRounds.length); i++) {
    const prev = prevRounds[i];
    const next = newRounds[i];
    if (prev && next && prev.current !== next.current) {
      return 'round';
    }
  }

  return 'step';
}

export function useRoutineEngine(routine: EngineRoutine): UseRoutineEngineReturn {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Sincronizar estilo de sonido cuando cambia en settings
  useEffect(() => {
    setSoundStyle(settings.soundStyle);
  }, [settings.soundStyle]);

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
  // Ref del step previo para detectar nivel de cambio
  const prevStepRef = useRef<ExecutionStep | null>(null);

  // Crear engine con callbacks que integran TTS + sonidos + haptics
  useEffect(() => {
    const callbacks: EngineCallbacks = {
      onStateChange: setEngineState,

      onStepChange: (step, next) => {
        const s = settingsRef.current;
        const vol = s.soundVolume / 100;

        // Vibración según nivel de cambio
        if (s.vibrationEnabled) {
          const changeLevel = detectChangeLevel(prevStepRef.current, step);
          switch (changeLevel) {
            case 'set': vibrateHeavy(); break;
            case 'round': vibrateMedium(); break;
            default: vibrateLight(); break;
          }
        }

        // Sonido de INICIO del nuevo step
        if (s.soundsEnabled) {
          playStepStart(vol);
        }

        prevStepRef.current = step;

        // Actualizar estado React
        setCurrentStep(step);
        setNextStep(next);
        setStepProgress(0);
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

      onComplete: (executionStats) => {
        const s = settingsRef.current;
        if (s.vibrationEnabled) vibrateHeavy();
        if (s.soundsEnabled) playRoutineComplete(s.soundVolume / 100);
        setStats(executionStats);
      },

      onSpeak: (text) => {
        const s = settingsRef.current;
        // Countdown hablado: "3", "2", "1" — respetar countdownSpoken
        const isCountdown = text === '3' || text === '2' || text === '1';
        if (isCountdown && !s.countdownSpoken) return;
        // Voz general — pasar idioma del settings
        if (s.voiceEnabled) {
          speakTTS(text, s.voiceLanguage);
        }
      },

      onSound: (sound) => {
        const s = settingsRef.current;
        const vol = s.soundVolume / 100;
        if (sound === 'countdown') {
          if (s.vibrationEnabled) vibrateCountdown();
          if (s.soundsEnabled) playSound('countdown', vol);
        } else {
          // soundEnd del engine → reproducir sonido de FIN de step (2x)
          if (s.soundsEnabled) playStepEnd(vol);
        }
      },
    };

    const engine = new RoutineEngine(steps, callbacks);
    engineRef.current = engine;
    prevStepRef.current = steps[0] ?? null;

    // Inicializar audio y configurar estilo de sonido
    initAudio();
    setSoundStyle(settingsRef.current.soundStyle);

    return () => {
      engine.destroy();
      stopSpeech();
      cleanupAudio();
    };
  }, [steps]);

  // Controles
  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const togglePlayPause = useCallback(() => engineRef.current?.togglePlayPause(), []);
  const skip = useCallback(() => engineRef.current?.skip(), []);
  const restartStep = useCallback(() => engineRef.current?.restartCurrentStep(), []);

  const restart = useCallback(() => {
    stopSpeech();
    engineRef.current?.restart();
    prevStepRef.current = steps[0] ?? null;
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
