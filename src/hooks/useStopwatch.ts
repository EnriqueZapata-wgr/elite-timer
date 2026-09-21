/**
 * useStopwatch — cronómetro que cuenta HACIA ARRIBA (el use-timer existente cuenta hacia
 * abajo). Para los tests cinemáticos (plank/BOLT) donde el usuario mide cuánto aguanta.
 *
 * Preciso por timestamp (no acumula drift de setInterval) y soporta pausar/reanudar.
 *
 * Bloque TIMERS: es una cara del reloj único (useReloj + reloj-core) con tick
 * de 100 ms para mostrar décimas. La API { elapsed, running, start, stop,
 * reset } no cambia.
 */
import { useReloj } from '@/src/hooks/useReloj';

export function useStopwatch() {
  const reloj = useReloj({ tickMs: 100 });
  const elapsed = Math.round(reloj.transcurridoMs / 100) / 10; // segundos, 1 decimal
  return {
    elapsed,
    running: reloj.corriendo,
    start: reloj.reanudar,
    stop: reloj.pausar,
    reset: reloj.reiniciar,
  };
}
