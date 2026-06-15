/**
 * useStopwatch — cronómetro que cuenta HACIA ARRIBA (el use-timer existente cuenta hacia
 * abajo). Para los tests cinemáticos (plank/BOLT) donde el usuario mide cuánto aguanta.
 *
 * Preciso por timestamp (no acumula drift de setInterval) y soporta pausar/reanudar.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export function useStopwatch() {
  const [elapsed, setElapsed] = useState(0); // segundos, 1 decimal
  const [running, setRunning] = useState(false);
  const startTs = useRef(0);
  const accum = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    startTs.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.round((accum.current + (Date.now() - startTs.current) / 1000) * 10) / 10);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      accum.current += (Date.now() - startTs.current) / 1000;
    };
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    accum.current = 0;
    setElapsed(0);
  }, []);

  return { elapsed, running, start, stop, reset };
}
