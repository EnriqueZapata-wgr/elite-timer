/**
 * Procedencia core (wearables, bloque A, 13-oct-2026): de dónde vino cada
 * dato, con qué método se midió y si el rango de la casa le aplica.
 *
 * POR QUÉ EXISTE
 * Desde la migración 344 una fila de sleep_nights o de health_os_daily puede
 * juntar campos de varias fuentes. La base cumple la jerarquía campo por
 * campo (Sueño de ATP > Oura > WHOOP > Garmin = Polar > Health Connect >
 * HealthKit) y deja el `source` de la fila como resumen: una sola fuente, o
 * 'mixto' si hay varias. La procedencia real de cada campo vive en
 * `field_sources`. Este módulo es el único que la lee.
 *
 * DATO, NO INSTRUCCIÓN
 * Si el rango de la casa (HRV RMSSD > 50 ms) aplica o no se decide AQUÍ y
 * viaja pegado al número (`metodo`, `aplicaRangoCasa`). ARGOS lo recibe ya
 * marcado; el prompt no tiene que razonar sobre marcas ni métodos.
 *
 * TENDENCIAS DENTRO DE LA MISMA FUENTE
 * Una línea de HRV, temperatura, score o sueño no mezcla días de fuentes
 * distintas: si la fuente cambia, la línea se corta y lo dice
 * (`tramoMismaFuente`).
 *
 * PURO: sin imports, sin red, sin fechas del sistema.
 */

// ── Vocabulario de la 344 ──

/** Los literales del CHECK de sleep_nights.source en la 344. */
export const FUENTES_344_NOCHES = [
  'sleep_cycle', 'health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar', 'mixto',
] as const;

/** Los literales del CHECK de health_os_daily.source en la 344. */
export const FUENTES_344_DIAS = [
  'health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar', 'mixto',
] as const;

/** Lo que mide una máquina: el teléfono (Health Connect, Salud de Apple) o una marca. */
export const FUENTES_DE_MAQUINA = ['health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar'] as const;
export type FuenteDeMaquina = (typeof FUENTES_DE_MAQUINA)[number];

/** Marcas con conexión directa. Solo el servidor escribe con estas fuentes. */
export const FUENTES_DE_MARCA = ['oura', 'whoop', 'garmin', 'polar'] as const;
export type FuenteDeMarca = (typeof FUENTES_DE_MARCA)[number];

export function esFuenteDeMaquinaConocida(s: unknown): s is FuenteDeMaquina {
  return typeof s === 'string' && (FUENTES_DE_MAQUINA as readonly string[]).includes(s);
}

export function esFuenteDeMarca(s: unknown): s is FuenteDeMarca {
  return typeof s === 'string' && (FUENTES_DE_MARCA as readonly string[]).includes(s);
}

// ── Fuente de un campo ──

/**
 * La fuente de UN campo: `field_sources[campo]` si la base lo marcó; si no, el
 * `source` de la fila (filas de antes de la 344, o una lectura sin la
 * columna). Puede devolver 'mixto': así marca la base lo que el teléfono
 * escribió sin decir su fuente. Quien llama decide qué hace con eso; aquí no
 * se adivina.
 */
export function fuenteDelCampo(
  fieldSources: unknown,
  campo: string,
  sourceFila: string | null | undefined,
): string | null {
  if (fieldSources !== null && typeof fieldSources === 'object' && !Array.isArray(fieldSources)) {
    const v = (fieldSources as Record<string, unknown>)[campo];
    if (typeof v === 'string' && v !== '') return v;
  }
  return typeof sourceFila === 'string' && sourceFila !== '' ? sourceFila : null;
}

// ── Método y rango de la casa ──

export type MetodoHrv = 'rmssd' | 'sdnn';

/**
 * Marcas cuyo HRV RMSSD sale de una ventana parcial de la noche, no del
 * promedio de toda: Polar mide las primeras 4 h (briefs 01 y 06). WHOOP va
 * aquí como SUPUESTO del equipo, pendiente de que Enrique lo confirme: su
 * ayuda pública dice que el HRV se pondera hacia el último tramo de sueño
 * profundo, no que promedie la noche. Su número es real y su tendencia
 * sirve, pero no se compara contra el rango de la casa.
 */
export const HRV_VENTANA_PARCIAL: readonly string[] = ['polar', 'whoop'];

/** Columnas de sleep_nights y health_os_daily que se exponen con procedencia. */
export type CampoConProcedencia =
  // health_os_daily
  | 'steps' | 'sleep_minutes' | 'resting_hr' | 'weight_kg' | 'active_kcal'
  | 'hrv_ms' | 'hrv_sdnn_ms' | 'breath_rate' | 'temp_deviation_c' | 'spo2_pct'
  | 'readiness_score' | 'stress_high_min' | 'recovery_high_min' | 'sedentary_min'
  // sleep_nights
  | 'duration_minutes' | 'bed_time' | 'wake_time' | 'score' | 'snore_minutes'
  | 'deep_min' | 'light_min' | 'rem_min' | 'awake_min' | 'latency_min' | 'efficiency';

/**
 * El rango de la casa es una LISTA BLANCA (revisión en frío, 13-oct-2026):
 * hoy la casa solo tiene escrito uno, HRV RMSSD de noche completa > 50 ms.
 * Un campo entra aquí solo cuando la casa tenga su rango escrito; el default
 * es "sin rango de la casa", para que nadie (ARGOS incluido) invente uno.
 * Nunca entran:
 *  · hrv_sdnn_ms: es otra medida (Apple). No se compara con RMSSD ni con rangos.
 *  · temp_deviation_c: es contra la base de la propia persona.
 *  · spo2_pct: de un reloj o anillo, no es un oxímetro médico.
 *  · readiness_score, score: escala propia de cada marca ("de <marca>").
 *  · stress_high_min, recovery_high_min, sedentary_min: definición de cada marca.
 */
export const RANGO_DE_LA_CASA = { hrv_ms: 'más de 50 ms' } as const;

export interface Procedencia {
  /** Literal de la base ('oura', 'health_connect', 'sleep_cycle', 'mixto'...) o null si no se sabe. */
  fuente: string | null;
  /** Solo para HRV. null en todo lo demás. */
  metodo: MetodoHrv | null;
  /** ¿Se puede comparar este número contra el rango de la casa? */
  aplicaRangoCasa: boolean;
}

/**
 * Método y rango de la casa de un campo, dada su fuente.
 *  · hrv_ms: RMSSD. Aplica el rango solo si la fuente es una máquina conocida
 *    que promedia toda la noche ('mixto' o desconocida: no se sabe, no aplica).
 *  · hrv_sdnn_ms: SDNN. Nunca aplica.
 *  · Lo demás: sin método y sin rango de la casa (lista blanca, ver arriba).
 */
export function procedenciaDe(campo: CampoConProcedencia, fuente: string | null | undefined): Procedencia {
  const f = typeof fuente === 'string' && fuente !== '' ? fuente : null;
  if (campo === 'hrv_sdnn_ms') return { fuente: f, metodo: 'sdnn', aplicaRangoCasa: false };
  if (campo === 'hrv_ms') {
    const completa = esFuenteDeMaquinaConocida(f) && !HRV_VENTANA_PARCIAL.includes(f);
    return { fuente: f, metodo: 'rmssd', aplicaRangoCasa: completa };
  }
  return { fuente: f, metodo: null, aplicaRangoCasa: false };
}

/** Atajo: la procedencia de un campo leída directo de la fila. */
export function procedenciaDelCampo(
  campo: CampoConProcedencia,
  fieldSources: unknown,
  sourceFila: string | null | undefined,
): Procedencia {
  return procedenciaDe(campo, fuenteDelCampo(fieldSources, campo, sourceFila));
}

// ── Tendencias dentro de la misma fuente ──

export interface PuntoSerie {
  fecha: string;
  valor: number | null | undefined;
  fuente: string | null | undefined;
}

export interface TramoMismaFuente {
  /** Puntos CON valor de la fuente más reciente, del más nuevo al más viejo, hasta el primer cambio. */
  puntos: { fecha: string; valor: number }[];
  /** Fuente del tramo (null si no hay puntos o la fuente no se sabe). */
  fuente: string | null;
  /** true si antes del tramo hay días con valor de OTRA fuente: la línea se cortó. */
  cortada: boolean;
  /** La fuente que había justo antes del corte, para decirlo. null si no se cortó. */
  fuenteAnterior: string | null;
  /** Fecha del punto más viejo del tramo (desde cuándo se compara). */
  desde: string | null;
}

/**
 * El tramo más reciente de una serie que viene de UNA sola fuente.
 * `serie` va de la fecha más nueva a la más vieja (como las noches). Los
 * puntos sin valor se saltan y no cortan. Una fuente desconocida (null) es su
 * propia fuente: no se junta con ninguna.
 */
export function tramoMismaFuente(serie: readonly PuntoSerie[]): TramoMismaFuente {
  const puntos: { fecha: string; valor: number }[] = [];
  let fuente: string | null = null;
  let iniciado = false;
  for (const p of serie) {
    if (p.valor == null || !Number.isFinite(p.valor)) continue;
    const f = typeof p.fuente === 'string' && p.fuente !== '' ? p.fuente : null;
    if (!iniciado) {
      iniciado = true;
      fuente = f;
    } else if (f !== fuente || f === null) {
      return { puntos, fuente, cortada: true, fuenteAnterior: f, desde: puntos[puntos.length - 1]?.fecha ?? null };
    }
    puntos.push({ fecha: p.fecha, valor: p.valor });
  }
  return { puntos, fuente, cortada: false, fuenteAnterior: null, desde: puntos[puntos.length - 1]?.fecha ?? null };
}

// ── Nombres para personas (y para ARGOS) ──

/**
 * El literal de la base dicho como lo diría una persona. Mismos nombres que
 * `health_source_priority.label` de la 344. 'mixto' en un campo significa que
 * el teléfono escribió sin decir su fuente: no se sabe quién midió.
 */
export function nombreDeFuente(fuente: string | null | undefined): string {
  switch (fuente) {
    case 'sleep_cycle': return 'Sueño de ATP';
    case 'oura': return 'Oura';
    case 'whoop': return 'WHOOP';
    case 'garmin': return 'Garmin';
    case 'polar': return 'Polar';
    case 'health_connect': return 'Health Connect';
    case 'healthkit': return 'Salud de Apple';
    default: return 'fuente sin identificar';
  }
}

// ── Base antes de la 344 ──

/** Columnas que nacen con la 344. Una lectura que las pide falla si la 344 no está. */
export const COLUMNAS_344 = [
  'field_sources',
  'deep_min', 'light_min', 'rem_min', 'awake_min', 'latency_min', 'efficiency', 'hypnogram', 'split_night',
  'hrv_ms', 'hrv_sdnn_ms', 'breath_rate', 'temp_deviation_c', 'spo2_pct', 'readiness_score',
  'stress_high_min', 'recovery_high_min', 'sedentary_min', 'rest_mode',
] as const;

/**
 * ¿Este error es "la base todavía no tiene la 344"? Solo si dice columna
 * faltante (42703, PGRST204 o el texto equivalente) Y, cuando trae mensaje,
 * nombra una columna de la 344. Una tabla faltante, un permiso o una columna
 * mal escrita que no es de la 344 siguen siendo errores de lectura: no se
 * disfrazan de "base vieja".
 */
export function esColumna344Faltante(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  if (/relation\b[\s\S]*does not exist/i.test(msg)) return false;
  const porCodigo = code === '42703' || code === 'PGRST204';
  const porTexto = /column [\s\S]*does not exist|could not find the [\s\S]*column|schema cache/i.test(msg);
  if (!porCodigo && !porTexto) return false;
  if (msg.trim() === '') return porCodigo;
  const m = msg.toLowerCase();
  return COLUMNAS_344.some((c) => new RegExp(`\\b${c}\\b`).test(m));
}
