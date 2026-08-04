/**
 * useTareaGesto (MB-20.1) — el contrato de gestos de una tarea, compartido
 * por la fila, la card editorial y el renglón de hechas: una sola mecánica
 * en un solo lugar.
 *
 * MB-20.4 · Pieza 1 — EL GESTO SE INVIERTE (decisión de Enrique; revierte la
 * arquitectura V2). HOY es un checklist: la acción principal es palomear y
 * pagaba el gesto caro (hold de 350 ms, diecisiete veces al día); navegar es
 * la secundaria y tenía el gesto barato. Ahora:
 *
 *   · Tap simple PALOMEA (o pregunta, si es experiencia). En hechas, el
 *     mismo tap despalomea: deshacer cuesta lo mismo que hacer (Pieza 4.1).
 *   · Tap largo NAVEGA a la función. Sin ruta (ELECTRONS_SIN_APP) no hace
 *     nada: cero puertas a lugares que no existen.
 *
 * El llenado progresivo de 350 ms murió con el hold-palomea: enseñaba el
 * gesto viejo. La retroalimentación nueva vive en la Pieza 3: vibración
 * inmediata + el viaje de la card a HECHAS para el tap; vibración al cruzar
 * el umbral para el tap largo.
 */
import { useRef } from 'react';
import { haptic } from '@/src/utils/haptics';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export const LONG_PRESS_MS = 350;

export interface TareaGestoCallbacks {
  /** Tap largo: navegar a la función. */
  onNavigate: (t: Tarea) => void;
  /** Tap simple en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
  /** Tap simple en experiencia pendiente: abre la paloma inteligente. */
  onExperiencia: (t: Tarea) => void;
}

export function useTareaGesto(
  tarea: Tarea,
  { onNavigate, onPalomear, onExperiencia }: TareaGestoCallbacks,
) {
  // El tap largo consumió este ciclo de press: el onPress del release se ignora.
  const consumedRef = useRef(false);

  function handlePressIn() {
    consumedRef.current = false;
  }

  function handleLongPress() {
    consumedRef.current = true;
    // Sin ruta no hay a dónde ir: el tap largo no hace nada — tampoco vibra
    // como si fuera a pasar algo (MB-20.2 · 2.5, navegación honesta).
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
    if (tarea.gesto === 'experiencia' && !tarea.completed) {
      haptic.medium();
      onExperiencia(tarea);
      return;
    }
    // navegar / inline / experiencia completada: el tap nunca navega ni
    // regala un check — la navegación vive en el tap largo.
  }

  return { handlePress, handlePressIn, handleLongPress };
}
