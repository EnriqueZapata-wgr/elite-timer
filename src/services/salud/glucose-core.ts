/**
 * glucose-core — clasificación y validación de glucosa capilar. PURO.
 *
 * Sin supabase, sin react-native y SIN COLORES: testeable node-only. El color
 * es presentación y se queda en la pantalla; aquí vive el criterio clínico,
 * que es lo que de verdad hay que blindar con tests.
 *
 * Vivía suelto dentro de app/glucose-log.tsx, donde no se podía testear: los
 * rangos de referencia son doctrina (Mariana), no detalle de una pantalla, y
 * cualquiera que edite el archivo podía moverlos sin que nada se quejara.
 *
 * Rangos (mg/dL), los mismos que la pantalla aplicaba desde siempre:
 *   · En AYUNO:        <70 bajo · 70-99 normal · 100-125 elevado · >125 alto
 *   · Cualquier otro:  <140 normal · 140-199 elevado · >=200 alto
 *     (fuera de ayuno no se declara "bajo": un 65 post-comida necesita
 *      contexto que la app no tiene, y marcarlo aquí sería diagnosticar)
 *
 * Las estadísticas de ventana y el GKI NO viven aquí: ya tenían su núcleo en
 * metabolic-stats-core.ts y no se duplican.
 */

/** Contextos en los que se puede tomar una medición. */
export type GlucoseContextId =
  | 'fasting' | 'pre_meal' | 'post_meal_1h' | 'post_meal_2h' | 'random' | 'bedtime';

/** Nombre visible por contexto. El icono es presentación y vive en la pantalla. */
export const GLUCOSE_CONTEXT_NAMES: Record<GlucoseContextId, string> = {
  fasting:      'Ayuno',
  pre_meal:     'Pre-comida',
  post_meal_1h: '1h post',
  post_meal_2h: '2h post',
  random:       'Random',
  bedtime:      'Antes dormir',
};

/** Nombre visible de un contexto; si viene uno desconocido, se devuelve tal cual. */
export function glucoseContextName(id: string | null | undefined): string {
  if (!id) return 'Random';
  return GLUCOSE_CONTEXT_NAMES[id as GlucoseContextId] ?? id;
}

/** Estado semántico. El mapeo a color lo hace la capa visual. */
export type GlucoseEstado = 'bajo' | 'normal' | 'elevado' | 'alto';

export interface GlucoseClasificacion {
  estado: GlucoseEstado;
  label: string;
}

const LABELS: Record<GlucoseEstado, string> = {
  bajo:    'Bajo',
  normal:  'Normal',
  elevado: 'Elevado',
  alto:    'Alto',
};

/**
 * Clasifica una lectura según su contexto. Solo el ayuno tiene umbral bajo
 * (ver cabecera). Los límites son inclusivos por arriba: 99 en ayuno todavía
 * es normal, 100 ya es elevado.
 */
export function classifyGlucose(value: number, context: string): GlucoseClasificacion {
  let estado: GlucoseEstado;
  if (context === 'fasting') {
    if (value < 70) estado = 'bajo';
    else if (value <= 99) estado = 'normal';
    else if (value <= 125) estado = 'elevado';
    else estado = 'alto';
  } else {
    if (value < 140) estado = 'normal';
    else if (value <= 199) estado = 'elevado';
    else estado = 'alto';
  }
  return { estado, label: LABELS[estado] };
}

/**
 * Rango aceptado al capturar. No es un rango clínico: es el filtro de dedazos
 * (un 7 o un 6000 son errores de tecleo, no lecturas).
 */
export const GLUCOSE_MIN_MG_DL = 20;
export const GLUCOSE_MAX_MG_DL = 600;

/**
 * Convierte lo tecleado en un valor válido, o null si no lo es. Entero: los
 * glucómetros capilares no reportan decimales.
 */
export function parseGlucoseInput(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (n < GLUCOSE_MIN_MG_DL || n > GLUCOSE_MAX_MG_DL) return null;
  return n;
}

/**
 * Hora local HH:MM:SS para la columna `time`. Puro: recibe el Date en vez de
 * llamar a new Date() por dentro, que es lo que lo hacía intesteable.
 * Regla técnica #3: la FECHA sale de getLocalToday(); aquí solo la hora.
 */
export function localTimeHHMMSS(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
}
