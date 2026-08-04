/**
 * useTareaGesto (MB-20.1) — el contrato de gestos de una tarea, compartido
 * por la fila, la card editorial y el renglón de hechas: una sola mecánica
 * en un solo lugar.
 *
 * MB-20.5: con el modal muerto quedan DOS tipos (y agua como caso propio).
 * El TAP hace LA ACCIÓN PRINCIPAL de cada fila — ninguna queda muda al
 * toque salvo la que de verdad no tiene a dónde ir:
 *
 *   · palomear → tap palomea (en hechas, destacha); tap largo navega si
 *                hay ruta. Sin ruta (ELECTRONS_SIN_APP) el tap largo no
 *                hace nada: se practican, no se abren.
 *   · navegar  → tap NAVEGA: es su única acción. El tap largo no hace nada.
 *   · inline   → los botones de la card capturan (+250/+500/−250); el tap
 *                en el resto navega a su pantalla. El tap largo no hace nada.
 *
 * El llenado progresivo de 350 ms murió con el hold-palomea (P1): la
 * confirmación del palomeo es la vibración y el viaje de la card a HECHAS;
 * la señal del atajo largo es la vibración al cruzar el umbral (P3).
 */
import { useRef } from 'react';
import { haptic } from '@/src/utils/haptics';
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
    // El tap largo solo es ATAJO a la función donde el tap hace otra cosa
    // (palomear). En navegar e inline el tap ya navega: el hold no tiene
    // papel y no hace nada.
    if (tarea.gesto !== 'palomear') return;
    // Sin ruta no hay a dónde ir: tampoco vibra como si fuera a pasar algo
    // (MB-20.2 · 2.5, navegación honesta).
    if (!tarea.route) return;
    // Pieza 3: vibración al cruzar el umbral, ANTES de navegar. Sin el
    // llenado viejo, esta es la única señal de que el hold registró algo.
    haptic.medium();
    onNavigate(tarea);
  }

  function handlePress() {
    if (consumedRef.current) { consumedRef.current = false; return; }
    if (tarea.gesto === 'palomear') {
      // Pieza 3: la vibración es la mitad de la confirmación; la otra mitad
      // es el viaje de la card a HECHAS (TareasView). Deshacer no celebra.
      if (tarea.completed) haptic.light();
      else haptic.success();
      onPalomear(tarea);
      return;
    }
    // navegar / inline: la acción principal es abrir la función.
    if (!tarea.route) return;
    haptic.light();
    onNavigate(tarea);
  }

  return { handlePress, handlePressIn, handleLongPress };
}
