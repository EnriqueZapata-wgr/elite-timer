/**
 * useTareaGesto (MB-20.1) — el contrato de gestos de una tarea, compartido
 * por la fila, la card editorial y el renglón de hechas: una sola mecánica
 * en un solo lugar.
 *
 * MB-20.5 (P5): la DECISIÓN vive en tarea-gesto-core (la tabla pura, con
 * test que la instancia completa). Este hook solo despacha: qué callback,
 * qué vibración. No re-deriva nada del gesto por su cuenta — el contrato
 * lo vigila.
 *
 * El llenado progresivo de 350 ms murió con el hold-palomea (P1): la
 * confirmación del palomeo es la vibración y el viaje de la card a HECHAS;
 * la señal del atajo largo es la vibración al cruzar el umbral (P3).
 */
import { useRef } from 'react';
import { haptic } from '@/src/utils/haptics';
import { accionTap, accionTapLargo } from '@/src/components/hoy/tarea-gesto-core';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export const LONG_PRESS_MS = 350;

export interface TareaGestoCallbacks {
  /** Navegar a la función (tap en navegar/inline; tap largo como atajo en
   * palomear). */
  onNavigate: (t: Tarea) => void;
  /** Tap simple en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
}

export function useTareaGesto(
  tarea: Tarea,
  { onNavigate, onPalomear }: TareaGestoCallbacks,
) {
  // El tap largo consumió este ciclo de press: el onPress del release se ignora.
  const consumedRef = useRef(false);

  function handlePressIn() {
    consumedRef.current = false;
  }

  function handleLongPress() {
    consumedRef.current = true;
    // Sin atajo (o sin ruta) no pasa nada — y tampoco vibra como si fuera
    // a pasar algo (navegación honesta).
    if (accionTapLargo(tarea) !== 'navegar') return;
    // Pieza 3: vibración al cruzar el umbral, ANTES de navegar. Sin el
    // llenado viejo, esta es la única señal de que el hold registró algo.
    haptic.medium();
    onNavigate(tarea);
  }

  function handlePress() {
    if (consumedRef.current) { consumedRef.current = false; return; }
    const accion = accionTap(tarea);
    if (accion === 'palomear') {
      // Pieza 3: la vibración es la mitad de la confirmación; la otra mitad
      // es el viaje de la card a HECHAS (TareasView). Deshacer no celebra.
      if (tarea.completed) haptic.light();
      else haptic.success();
      onPalomear(tarea);
      return;
    }
    if (accion !== 'navegar') return;
    haptic.light();
    onNavigate(tarea);
  }

  return { handlePress, handlePressIn, handleLongPress };
}
