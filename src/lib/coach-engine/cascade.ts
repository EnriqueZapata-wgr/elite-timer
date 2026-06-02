// Coach Engine — Cascada de Intervención (5 niveles)
// Brief §6.3 — escalar EN ORDEN, sin saltar niveles salvo emergencia.
// System prompt Bloque 7: nivel 1 (semáforo) siempre; 2-5 según afectación
// y recurrencia. "Antes de actuar, una cascada."

import type { CascadeLevel, TrafficLight } from './types';

/**
 * Selecciona el nivel de cascada (1-5) a partir del semáforo (Q2) y si la
 * señal recurre. Tabla de decisión del Bloque 7:
 *   verde → 1 (sigue el plan)
 *   amarillo + no recurre → 2 (lectura subjetiva)
 *   amarillo + recurre → 3 (ajuste de plan)
 *   rojo + no recurre → 3 (ajuste de plan)
 *   rojo + recurre → 4 (tests de autoevaluación)
 * Si recurre múltiples veces tras nivel 4, el caller decide subir a 5 (derivación).
 */
export function selectCascadeLevel(
  trafficLight: TrafficLight,
  signalRecurs: boolean,
): CascadeLevel {
  switch (trafficLight) {
    case 'verde':
      // Nivel 1 siempre: el semáforo es el primer filtro. Verde no escala.
      return 1;
    case 'amarillo':
      return signalRecurs ? 3 : 2;
    case 'rojo':
      return signalRecurs ? 4 : 3;
  }
}

// TEST: selectCascadeLevel('verde', false) === 1
// TEST: selectCascadeLevel('verde', true) === 1
// TEST: selectCascadeLevel('amarillo', false) === 2
// TEST: selectCascadeLevel('amarillo', true) === 3
// TEST: selectCascadeLevel('rojo', false) === 3
// TEST: selectCascadeLevel('rojo', true) === 4
