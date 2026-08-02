/**
 * app-icon-names — la LISTA de nombres lógicos del sistema de iconos. Módulo de
 * datos puros (cero imports), para que los tests node verifiquen cobertura sin
 * montar React Native. El dibujo de cada nombre vive en `app-icon-map.tsx`.
 *
 * El mapa de iconos es más grande que el registro de apps, y está bien: aquí
 * también viven los hábitos del HOY que no tienen app (baño frío, grounding),
 * las puertas de SALUD y sus destinos. Lo que comparten todos: el día que
 * llegue el set definitivo de SVG, cambian juntos.
 */
export const APP_ICON_NAMES = [
  // ── Mente ──
  'meditar', 'respirar', 'emociones', 'journal', 'sueno', 'nback', 'rachas',
  // ── Cuerpo ──
  'entrenar', 'cardio', 'movilidad', 'rm', 'records',
  // ── Hábitos diarios (apps) ──
  'comida', 'hidratacion', 'ayuno', 'suplementos', 'recetas', 'lista-compra',
  // ── Salud (apps) ──
  'sol', 'glucosa', 'cetonas', 'ciclo', 'labs', 'protocolos',
  // ── Sistema ──
  'ajustes',
  // ── Puertas de SALUD ──
  // No son apps de la sala, pero comparten el mismo enchufe: el día del cambio
  // de set no se quedan fuera.
  'salud-hoy', 'salud-datos', 'salud-evolucion', 'salud-expediente', 'salud-ciclo',
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];

const NAME_SET: ReadonlySet<string> = new Set(APP_ICON_NAMES);

export function hasAppIcon(name: string): name is AppIconName {
  return NAME_SET.has(name);
}
