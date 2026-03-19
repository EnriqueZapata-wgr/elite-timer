/**
 * useBlockTimer — Hook para timer multi-bloque con rondas.
 *
 * Recibe una Routine (bloques + rondas) y maneja:
 * - Countdown por bloque individual
 * - Avance automático al siguiente bloque / ronda
 * - Skip de bloques
 * - Registro de bloques completados (para Session Summary)
 * - Vibración háptica al cambiar de bloque
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Block, CompletedBlock, Routine } from '@/types/models';
import { Notifications } from '@/services/notifications';

export type BlockTimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface UseBlockTimerReturn {
  status: BlockTimerStatus;
  currentBlockIndex: number;
  currentBlock: Block | null;
  nextBlock: Block | null;
  timeLeftInBlock: number;
  blockProgress: number;
  totalTimeLeft: number;
  currentRound: number;
  totalRounds: number;
  completedBlocks: CompletedBlock[];
  elapsedTotal: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipBlock: () => void;
}

export function useBlockTimer(routine: Routine): UseBlockTimerReturn {
  const { blocks } = routine;
  const totalRounds = routine.rounds || 1;

  const [status, setStatus] = useState<BlockTimerStatus>('idle');
  const [blockIndex, setBlockIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(blocks[0]?.durationSeconds ?? 0);
  const [completed, setCompleted] = useState<CompletedBlock[]>([]);
  const [blockElapsed, setBlockElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref para evitar doble-avance cuando timeLeft llega a 0
  const advancingRef = useRef(false);

  const currentBlock = blocks[blockIndex] ?? null;

  // Siguiente bloque: siguiente en la lista, o primero de la siguiente ronda
  const nextIdx = blockIndex + 1;
  const nextBlock =
    nextIdx < blocks.length
      ? blocks[nextIdx]
      : round < totalRounds
        ? blocks[0]
        : null;

  // Progreso del bloque actual (1 → 0)
  const blockProgress = currentBlock
    ? timeLeft / currentBlock.durationSeconds
    : 0;

  // Tiempo total restante
  const calcTotalTimeLeft = (): number => {
    let remaining = timeLeft;
    for (let i = blockIndex + 1; i < blocks.length; i++) {
      remaining += blocks[i].durationSeconds;
    }
    const roundDuration = blocks.reduce((s, b) => s + b.durationSeconds, 0);
    remaining += (totalRounds - round) * roundDuration;
    return remaining;
  };

  // Avanzar al siguiente bloque o terminar
  const advance = useCallback(
    (skipped: boolean) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      const block = blocks[blockIndex];
      const record: CompletedBlock = {
        blockId: block.id,
        type: block.type,
        label: block.label,
        plannedDuration: block.durationSeconds,
        actualDuration: skipped ? blockElapsed : block.durationSeconds,
        skipped,
      };
      setCompleted(prev => [...prev, record]);

      const nextI = blockIndex + 1;
      if (nextI < blocks.length) {
        // Siguiente bloque en la misma ronda
        setBlockIndex(nextI);
        setTimeLeft(blocks[nextI].durationSeconds);
        setBlockElapsed(0);
        Notifications.blockChange();
      } else if (round < totalRounds) {
        // Siguiente ronda
        setRound(r => r + 1);
        setBlockIndex(0);
        setTimeLeft(blocks[0].durationSeconds);
        setBlockElapsed(0);
        Notifications.blockChange();
      } else {
        // Terminado
        setStatus('finished');
        Notifications.routineComplete();
      }

      // Resetear flag en el siguiente tick
      setTimeout(() => {
        advancingRef.current = false;
      }, 0);
    },
    [blockIndex, round, blocks, totalRounds, blockElapsed],
  );

  // Tick del timer
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
      setBlockElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  // Detectar fin de bloque
  useEffect(() => {
    if (status === 'running' && timeLeft <= 0 && currentBlock) {
      advance(false);
    }
  }, [timeLeft, status, currentBlock, advance]);

  // Controles
  const start = useCallback(() => setStatus('running'), []);
  const pause = useCallback(() => setStatus('paused'), []);

  const reset = useCallback(() => {
    setStatus('idle');
    setBlockIndex(0);
    setRound(1);
    setTimeLeft(blocks[0]?.durationSeconds ?? 0);
    setCompleted([]);
    setBlockElapsed(0);
    advancingRef.current = false;
  }, [blocks]);

  const skipBlock = useCallback(() => {
    if (status === 'running' || status === 'paused') {
      advance(true);
    }
  }, [status, advance]);

  // Tiempo total transcurrido
  const elapsedTotal =
    completed.reduce((sum, b) => sum + b.actualDuration, 0) + blockElapsed;

  return {
    status,
    currentBlockIndex: blockIndex,
    currentBlock,
    nextBlock,
    timeLeftInBlock: timeLeft,
    blockProgress,
    totalTimeLeft: calcTotalTimeLeft(),
    currentRound: round,
    totalRounds,
    completedBlocks: completed,
    elapsedTotal,
    start,
    pause,
    reset,
    skipBlock,
  };
}
