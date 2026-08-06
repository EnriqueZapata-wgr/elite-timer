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
  // ── Tab bar ──
  // Las cuatro salas del tab bar: versión de línea en reposo y '-fill' para
  // el estado activo. La orbe (ARGOS) no está aquí: es componente, no glifo.
  'tab-hoy', 'tab-hoy-fill', 'tab-atp', 'tab-atp-fill',
  'tab-salud', 'tab-salud-fill', 'tab-tribu', 'tab-tribu-fill',
  // ── Puertas de SALUD ──
  // No son apps de la sala, pero comparten el mismo enchufe: el día del cambio
  // de set no se quedan fuera.
  'salud-hoy', 'salud-datos', 'salud-evolucion', 'salud-expediente', 'salud-ciclo',

  // ── Hábitos del HOY sin app propia (PIEZA 2.3) ──
  // Electrones que se practican pero no se abren: no tienen pantalla ni entrada
  // en app-registry, y no se les inventa una. Tienen dibujo porque el HOY y
  // /hoy-habitos los pintan igual que a los demás.
  'bano-frio', 'grounding', 'sin-alcohol', 'lentes-rojos', 'pasos',
  'sin-procesados', 'off-pantallas',

  // ── Destinos de SALUD sin app propia ──
  // Las filas detrás de las puertas (salud-puertas.ts). Mismo razonamiento:
  // el mapa es más grande que el registro de apps, y está bien.
  'sintomas', 'diagnostico', 'edad-atp', 'reportes', 'cronotipo',
  'historia-clinica', 'cuestionario', 'evaluaciones', 'padecimientos',
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];

const NAME_SET: ReadonlySet<string> = new Set(APP_ICON_NAMES);

export function hasAppIcon(name: string): name is AppIconName {
  return NAME_SET.has(name);
}
