/**
 * useTareaGesto (MB-20.1) — el contrato de gestos de una tarea, extraído
 * VERBATIM de TareaRow para que la fila, la card editorial y el renglón de
 * hechas compartan exactamente la misma mecánica (MB-20 Pieza 1):
 *
 *   · Tap simple NAVEGA a la función.
 *   · Tap largo PALOMEA (o pregunta, si es experiencia) con llenado
 *     progresivo ~350 ms; soltar antes revierte el llenado.
 *   · Con reduce motion el llenado se omite; el tap largo sigue funcionando.
 *
 * Esto es una extracción, no un cambio: el comportamiento es el de MB-20.
 */
import { useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { haptic } from '@/src/utils/haptics';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export const LONG_PRESS_MS = 350;

export interface TareaGestoCallbacks {
  /** Tap simple: navegar a la función. */
  onNavigate: (t: Tarea) => void;
  /** Tap largo en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
  /** Tap largo en experiencia: abre la paloma inteligente. */
  onExperiencia: (t: Tarea) => void;
}

export function useTareaGesto(
  tarea: Tarea,
  reducedMotion: boolean | undefined,
  { onNavigate, onPalomear, onExperiencia }: TareaGestoCallbacks,
) {
  const fill = useSharedValue(0);
  // El tap largo consumió este ciclo de press: el onPress del release se ignora.
  const consumedRef = useRef(false);

  const llenable = !tarea.completed && (tarea.gesto === 'palomear' || tarea.gesto === 'experiencia');
  const destachable = tarea.completed && tarea.gesto === 'palomear';

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fill.value }],
    opacity: fill.value,
  }));

  function handlePressIn() {
    consumedRef.current = false;
    if (reducedMotion) return;
    if (llenable || destachable) {
      fill.value = withTiming(1, { duration: LONG_PRESS_MS });
    }
  }

  function handlePressOut() {
    if (!consumedRef.current) {
      cancelAnimation(fill);
      fill.value = withTiming(0, { duration: 150 });
    }
  }

  function handleLongPress() {
    consumedRef.current = true;
    fill.value = 0;
    if (tarea.gesto === 'palomear') {
      haptic.success();
      onPalomear(tarea);
      return;
    }
    if (tarea.gesto === 'experiencia' && !tarea.completed) {
      haptic.medium();
      onExperiencia(tarea);
      return;
    }
    // navegar / inline / experiencia completada: el tap largo nunca regala
    // un check — se comporta como el tap.
    haptic.light();
    onNavigate(tarea);
  }

  function handlePress() {
    if (consumedRef.current) { consumedRef.current = false; return; }
    haptic.light();
    onNavigate(tarea);
  }

  return { fillStyle, handlePress, handlePressIn, handlePressOut, handleLongPress };
}
