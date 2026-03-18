import { useState, useEffect, useCallback, useRef } from 'react';

// Tipo que describe el estado actual del timer
type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

// Contrato de lo que devuelve el hook al componente que lo use
interface UseTimerReturn {
  timeLeft: number;        // Segundos restantes
  status: TimerStatus;     // Estado actual del timer
  progress: number;        // Progreso de 0 a 1 (para el círculo animado)
  start: () => void;       // Inicia o reanuda la cuenta regresiva
  pause: () => void;       // Pausa sin resetear
  reset: () => void;       // Vuelve al tiempo inicial y detiene
  setDuration: (seconds: number) => void; // Cambia la duración total
}

/**
 * useTimer — Hook que maneja toda la lógica de cuenta regresiva.
 *
 * @param initialSeconds - Duración inicial en segundos (por defecto 30)
 * @returns Objeto con el estado del timer y funciones de control
 */
export function useTimer(initialSeconds: number = 30): UseTimerReturn {

  // Duración total configurada (puede cambiar si el usuario elige otro intervalo)
  const [duration, setDuration] = useState(initialSeconds);

  // Segundos que quedan en la cuenta regresiva
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  // Estado del timer: idle (sin iniciar), running, paused, finished
  const [status, setStatus] = useState<TimerStatus>('idle');

  // Ref para guardar el id del intervalo y poder limpiarlo después.
  // Usamos useRef en vez de useState porque cambiar el id del intervalo
  // NO debe provocar un re-render.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función auxiliar que limpia el intervalo activo.
  // La extraemos para no repetir este patrón en cada acción.
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // --- Efecto principal: crea o destruye el intervalo según el status ---
  useEffect(() => {
    // Solo corremos el intervalo si el timer está activo
    if (status !== 'running') {
      return;
    }

    // Creamos un intervalo que decrementa cada 1000ms (1 segundo)
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Llegamos a cero: limpiamos el intervalo y marcamos como terminado.
          // Usamos setTimeout para evitar actualizar status dentro del setState.
          clearTimer();
          setTimeout(() => setStatus('finished'), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup: si el componente se desmonta o el status cambia, limpiamos
    return clearTimer;
  }, [status, clearTimer]);

  // --- Acciones que expone el hook ---

  const start = useCallback(() => {
    // Solo puede iniciar si está idle (primer inicio) o paused (reanudar)
    if (status === 'idle' || status === 'paused') {
      setStatus('running');
    }
    // Si está finished, el usuario debe hacer reset primero
  }, [status]);

  const pause = useCallback(() => {
    if (status === 'running') {
      clearTimer();
      setStatus('paused');
    }
  }, [status, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setTimeLeft(duration);  // Vuelve al tiempo configurado
    setStatus('idle');       // Regresa al estado inicial
  }, [duration, clearTimer]);

  // Permite cambiar la duración (cuando el usuario elige otro intervalo).
  // También resetea el timer para que el nuevo tiempo se refleje de inmediato.
  const handleSetDuration = useCallback((seconds: number) => {
    clearTimer();
    setDuration(seconds);
    setTimeLeft(seconds);
    setStatus('idle');
  }, [clearTimer]);

  // Progreso de 0 a 1: lo usará CircularTimer para saber cuánto del
  // círculo SVG debe estar lleno. Cuando duration es 0 evitamos dividir por cero.
  const progress = duration > 0 ? timeLeft / duration : 0;

  return {
    timeLeft,
    status,
    progress,
    start,
    pause,
    reset,
    setDuration: handleSetDuration,
  };
}
