/**
 * Sueño unificado core (20-sep-2026) — la UNIÓN pura de las dos tablas de sueño.
 *
 * POR QUÉ EXISTE: había dos silos que nadie cruzaba. El botón IMPORTAR de la
 * pantalla de Sueño escribe sleep_nights; "Sincronizar" en Ajustes › Salud del
 * teléfono (y la sync automática) escriben health_os_daily.sleep_minutes. La
 * pantalla de Sueño y ARGOS leían solo sleep_nights, así que el cliente que
 * conectaba su teléfono desde Ajustes abría Sueño y veía "Aún no vemos tu
 * descanso" con sus noches ya guardadas en la otra tabla.
 *
 * LA REGLA DE UNIÓN (la misma que health-read-core ya aplica para HOY con una
 * sola fecha; aquí se extiende a una ventana de noches):
 *   · Misma fecha en las dos tablas: manda sleep_nights. Trae más detalle
 *     (hora de acostarse y de despertar, score y ronquido de la sesión
 *     propia) y ya resolvió en la escritura quién pisa a quién: la sesión
 *     propia manda, el import nunca pisa (sleep-source-contract).
 *   · Fecha solo en health_os_daily: se usa con fuente 'telefono'. Es un
 *     número real que el teléfono midió; esconderlo era el defecto.
 *   · Nunca se suman ni se promedian las dos versiones: una noche, un registro.
 *   · Ningún número se corrige aquí. Si una fila trae una duración que no
 *     cuadra, se muestra tal cual: cambiar en silencio un dato del usuario
 *     está prohibido (la limpieza de filas imposibles es la migración 300,
 *     que aplica el dueño).
 *
 * WEARABLES (bloque A, 13-oct-2026, migración 344): sleep_nights ya puede
 * venir de Oura, WHOOP, Garmin o Polar, o 'mixto' (campos de varias fuentes;
 * la base cumple la jerarquía campo por campo y deja la procedencia en
 * `field_sources`). Cada noche lleva ahora `fuentes`: la fuente REAL de cada
 * campo, leída con procedencia-core. Sirve para que una tendencia no mezcle
 * noches de aparatos distintos (ARGOS corta la línea donde cambia la fuente).
 * También trae las etapas (profundo, ligero, REM, despierto), la latencia y
 * la eficiencia: null si no hay dato o si la base todavía no tiene la 344.
 *
 * PURO: sin red ni fechas del sistema. Su único import es procedencia-core,
 * también puro. La capa con I/O vive en sueno-unificado-service.ts.
 */

import { fuenteDelCampo, nombreDeFuente } from '../health/procedencia-core';

// ── Tipos ──

/**
 * De dónde salió la noche. Todos menos 'telefono' son los literales del CHECK
 * de sleep_nights.source (261, ampliado en la 344 con las marcas y 'mixto':
 * la fila junta campos de varias fuentes). 'telefono' marca una noche que
 * SOLO existe en health_os_daily.sleep_minutes (la sync de Ajustes › Salud
 * del teléfono), donde no hay hora de acostarse ni de despertar.
 */
export type FuenteNoche =
  | 'sleep_cycle' | 'health_connect' | 'healthkit'
  | 'oura' | 'whoop' | 'garmin' | 'polar' | 'mixto'
  | 'telefono';

/**
 * La fuente real de cada campo de la noche, con el literal de la base
 * ('oura', 'health_connect', 'sleep_cycle', 'mixto'...). null si el campo no
 * trae valor (sin dato no hay fuente que reportar). Sale de `field_sources`
 * (344) y, si la fila no lo trae, del `source` de la fila.
 */
export interface FuentesNoche {
  duration_minutes: string | null;
  score: string | null;
  deep_min: string | null;
  light_min: string | null;
  rem_min: string | null;
  awake_min: string | null;
  latency_min: string | null;
  efficiency: string | null;
  /** 345: la hora de acostarse y despertar pueden venir de otra fuente que los minutos. */
  bed_time: string | null;
  wake_time: string | null;
}

/** Una noche ya resuelta entre las dos tablas. La más reciente va primero. */
export interface Noche {
  /** YYYY-MM-DD local: la fecha del DESPERTAR (convención de sleep_nights). */
  nightDate: string;
  /** Minutos dormidos. null solo si la fila de sleep_nights no lo trae. */
  durationMinutes: number | null;
  bedTimeISO: string | null;
  wakeTimeISO: string | null;
  /**
   * Score de la noche (0-100). Desde la 344 puede ser el score de calma de la
   * sesión propia (fuentes.score === 'sleep_cycle') O el score de sueño de
   * una marca (Oura, WHOOP...), con la escala de esa marca. Nunca se
   * presenta uno como el otro: ver esScoreDeCalma.
   */
  score: number | null;
  snoreMinutes: number | null;
  fuente: FuenteNoche;
  /** Fuente real por campo (344). Una noche 'telefono' la saca de health_os_daily. */
  fuentes: FuentesNoche;
  /** Minutos de sueño profundo, ligero, REM y despierto (344). null = sin dato o sin columna. */
  deepMin: number | null;
  lightMin: number | null;
  remMin: number | null;
  awakeMin: number | null;
  /** Minutos para quedarse dormido (344). */
  latencyMin: number | null;
  /** Eficiencia 0-100: dormido entre tiempo en cama (344). */
  efficiency: number | null;
  /**
   * Regla 7 de la jerarquía por dato (345): el Sueño de ATP manda en la hora
   * de acostarse y despertar, y un reloj o anillo puede mandar en los
   * minutos. Si las horas y los minutos vienen de fuentes distintas y los
   * minutos NO caben entre esas horas (más de 10 min de sobra), las horas no
   * describen esa noche: false, y la pantalla no las muestra. No se borra
   * nada: los dos valores siguen en la base.
   */
  horasCoherentes: boolean;
}

/** Fila de sleep_nights tal como la devuelve la tabla (solo lo que se usa). */
export interface FilaSleepNight {
  night_date: string;
  bed_time?: string | null;
  wake_time?: string | null;
  duration_minutes?: number | null;
  score?: number | null;
  snore_minutes?: number | null;
  source?: string | null;
  // 344: opcionales; antes de la migración el select no los pide.
  deep_min?: number | null;
  light_min?: number | null;
  rem_min?: number | null;
  awake_min?: number | null;
  latency_min?: number | null;
  efficiency?: number | null;
  /** jsonb {campo: fuente} que llena el trigger de la 344. */
  field_sources?: unknown;
}

/** Fila de health_os_daily, solo la parte de sueño. */
export interface FilaSuenoTelefono {
  date: string;
  sleep_minutes?: number | null;
  /** health_connect | healthkit (264) y, con la 344, marcas o 'mixto'. */
  source?: string | null;
  /** 344: de qué fuente vino cada campo (aquí importa `sleep_minutes`). */
  field_sources?: unknown;
}

// ── Unión ──

function numeroONull(v: number | null | undefined): number | null {
  return v == null || !Number.isFinite(v) ? null : v;
}

const FUENTES_DE_SLEEP_NIGHTS: readonly FuenteNoche[] = [
  'sleep_cycle', 'health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar', 'mixto',
];

/** El `source` crudo de sleep_nights a nuestro vocabulario, sin adivinar. */
export function fuenteDeSleepNight(source: string | null | undefined): FuenteNoche {
  if (typeof source === 'string' && (FUENTES_DE_SLEEP_NIGHTS as readonly string[]).includes(source)) {
    return source as FuenteNoche;
  }
  // Un valor fuera del CHECK no puede existir en la base; si llegara, lo
  // único seguro que sabemos es que no fue la sesión propia.
  return 'telefono';
}

/** Campos de sleep_nights que llevan fuente propia en la Noche. */
const CAMPOS_FUENTE_NOCHE: readonly Exclude<keyof FuentesNoche, 'bed_time' | 'wake_time'>[] = [
  'duration_minutes', 'score', 'deep_min', 'light_min', 'rem_min', 'awake_min', 'latency_min', 'efficiency',
];

/** Fuente de cada campo de una fila de sleep_nights; null donde no hay valor. */
function fuentesDeFila(f: FilaSleepNight): FuentesNoche {
  const r = {} as FuentesNoche;
  for (const campo of CAMPOS_FUENTE_NOCHE) {
    r[campo] = numeroONull(f[campo]) === null ? null : fuenteDelCampo(f.field_sources, campo, f.source);
  }
  r.bed_time = f.bed_time ? fuenteDelCampo(f.field_sources, 'bed_time', f.source) : null;
  r.wake_time = f.wake_time ? fuenteDelCampo(f.field_sources, 'wake_time', f.source) : null;
  return r;
}

/** Holgura para la regla 7: los minutos dormidos pueden pasar la ventana por redondeo. */
export const HOLGURA_HORAS_MIN = 10;

/**
 * Regla 7 (345): ¿las horas de acostarse y despertar describen la misma noche
 * que los minutos dormidos? Solo se puede romper cuando vienen de fuentes
 * distintas. Sin horas, sin minutos o con fechas ilegibles: true (no hay nada
 * que contradiga).
 */
export function horasCoherentes(
  bedISO: string | null,
  wakeISO: string | null,
  minutos: number | null,
  fuentes: Pick<FuentesNoche, 'bed_time' | 'wake_time' | 'duration_minutes'>,
): boolean {
  if (!bedISO || !wakeISO || minutos == null) return true;
  const misma = fuentes.duration_minutes != null
    && fuentes.bed_time === fuentes.duration_minutes
    && fuentes.wake_time === fuentes.duration_minutes;
  if (misma) return true;
  const ventana = (Date.parse(wakeISO) - Date.parse(bedISO)) / 60000;
  if (!Number.isFinite(ventana)) return true;
  return minutos <= ventana + HOLGURA_HORAS_MIN;
}

/**
 * Une las dos tablas en una lista de noches, la más reciente primero, sin
 * fechas repetidas. Misma fecha: manda sleep_nights. Una fila del teléfono
 * sin minutos no es una noche y se ignora.
 *
 * En una noche 'telefono', `fuentes.duration_minutes` sale de
 * `field_sources.sleep_minutes` (o del `source` de esa fila de
 * health_os_daily): así una racha de Health Connect no se corta solo porque
 * una de sus noches llegó por la otra tabla.
 */
export function unirNoches(
  filasSleepNights: readonly FilaSleepNight[],
  filasTelefono: readonly FilaSuenoTelefono[],
): Noche[] {
  const porFecha = new Map<string, Noche>();

  for (const f of filasSleepNights) {
    if (!f.night_date || porFecha.has(f.night_date)) continue;
    porFecha.set(f.night_date, {
      nightDate: f.night_date,
      durationMinutes: numeroONull(f.duration_minutes),
      bedTimeISO: f.bed_time ?? null,
      wakeTimeISO: f.wake_time ?? null,
      score: numeroONull(f.score),
      snoreMinutes: numeroONull(f.snore_minutes),
      fuente: fuenteDeSleepNight(f.source),
      fuentes: fuentesDeFila(f),
      deepMin: numeroONull(f.deep_min),
      lightMin: numeroONull(f.light_min),
      remMin: numeroONull(f.rem_min),
      awakeMin: numeroONull(f.awake_min),
      latencyMin: numeroONull(f.latency_min),
      efficiency: numeroONull(f.efficiency),
      horasCoherentes: true,
    });
    const n = porFecha.get(f.night_date)!;
    n.horasCoherentes = horasCoherentes(n.bedTimeISO, n.wakeTimeISO, n.durationMinutes, n.fuentes);
  }

  for (const f of filasTelefono) {
    if (!f.date || porFecha.has(f.date)) continue;
    const minutos = numeroONull(f.sleep_minutes);
    if (minutos === null) continue;
    porFecha.set(f.date, {
      nightDate: f.date,
      durationMinutes: minutos,
      bedTimeISO: null,
      wakeTimeISO: null,
      score: null,
      snoreMinutes: null,
      fuente: 'telefono',
      fuentes: {
        duration_minutes: fuenteDelCampo(f.field_sources, 'sleep_minutes', f.source),
        score: null,
        deep_min: null,
        light_min: null,
        rem_min: null,
        awake_min: null,
        latency_min: null,
        efficiency: null,
        bed_time: null,
        wake_time: null,
      },
      deepMin: null,
      lightMin: null,
      remMin: null,
      awakeMin: null,
      latencyMin: null,
      efficiency: null,
      horasCoherentes: true,
    });
  }

  // ISO YYYY-MM-DD ordena bien como texto.
  return [...porFecha.values()].sort((a, b) => (a.nightDate < b.nightDate ? 1 : a.nightDate > b.nightDate ? -1 : 0));
}

// ── Ventana ──

/**
 * Primera fecha (inclusive) de una ventana de `dias` noches que termina hoy:
 * con dias = 7 y hoy el 20, desde el 14. Misma cuenta que usa ARGOS para sus
 * "últimos 7 días" (hoy menos seis). `aLocal` se inyecta (toLocalDateString)
 * para que el núcleo no importe utils.
 */
export function fechaDesde(hoy: Date, dias: number, aLocal: (d: Date) => string): string {
  const n = Math.max(1, Math.floor(dias));
  const d = new Date(hoy.getTime());
  d.setDate(d.getDate() - (n - 1));
  return aLocal(d);
}

// ── Presentación ──

/** De dónde salió la noche, dicho al usuario. Siempre visible, nunca dos verdades. */
export function etiquetaFuenteNoche(fuente: FuenteNoche): string {
  switch (fuente) {
    case 'sleep_cycle': return 'Medida con tu Sleep Cycle';
    case 'health_connect': return 'Importada de Health Connect';
    case 'healthkit': return 'Importada de Salud de Apple';
    case 'oura': return 'Medida con tu Oura';
    case 'whoop': return 'Medida con tu WHOOP';
    case 'garmin': return 'Medida con tu Garmin';
    case 'polar': return 'Medida con tu Polar';
    case 'mixto': return 'De varias fuentes o sin identificar';
    case 'telefono': return 'Sincronizada desde tu teléfono';
  }
}

/**
 * ¿El score de esta noche es el de calma de la sesión propia? Solo si su
 * fuente es 'sleep_cycle'. Antes de la 344 `fuentes.score` cae al source de
 * la fila, así que la noche propia sigue mostrando su calma.
 */
export function esScoreDeCalma(noche: Pick<Noche, 'fuentes'>): boolean {
  return noche.fuentes.score === 'sleep_cycle';
}

/**
 * El score de una marca dicho como lo que es: "Score de sueño de Oura · 88".
 * Sin la etiqueta de calma: es la escala de la marca, no la de ATP.
 */
export function textoScoreDeMarca(score: number, fuente: string | null | undefined): string {
  const nombre = nombreDeFuente(fuente);
  return nombre === nombreDeFuente(null)
    ? `Score de sueño (${nombre}) · ${score}`
    : `Score de sueño de ${nombre} · ${score}`;
}

// ── Escritura del import: qué se inserta y qué se actualiza (A5, 20-sep-2026) ──

/** Fila mínima de sleep_nights que el import mira ANTES de escribir. */
export interface FilaExistente {
  night_date: string;
  source?: string | null;
  duration_minutes?: number | null;
}

/** Lo mínimo que una noche por escribir necesita para decidirse. */
export interface NocheAEscribir {
  nightDate: string;
  durationMinutes: number;
}

export interface DecisionEscrituras<N extends NocheAEscribir> {
  /** Sin fila para esa fecha: entra con ON CONFLICT DO NOTHING. */
  insertar: N[];
  /** Ya hay fila DE MÁQUINA más corta: se actualiza SOLO esa fila. */
  actualizar: N[];
}

/**
 * ¿La fila la escribió el IMPORT DEL TELÉFONO (Health Connect o Salud de
 * Apple), no la sesión propia? Decide qué filas puede COMPLETAR
 * decidirEscrituras.
 *
 * Se queda en esos dos literales A PROPÓSITO (344): una noche de Oura, WHOOP,
 * Garmin o Polar, o una 'mixto', no la completa el teléfono aunque traiga más
 * minutos. Esas marcas están arriba en la jerarquía (Sueño de ATP > Oura >
 * WHOOP > Garmin = Polar > Health Connect > HealthKit) y el trigger de la 344
 * tampoco dejaría que el teléfono las pise; intentarlo sería una escritura
 * que la base rechaza o descarta. Por eso aquí no se usa
 * FUENTES_DE_MAQUINA de procedencia-core.
 */
export function esFuenteDeMaquina(source: string | null | undefined): boolean {
  return source === 'health_connect' || source === 'healthkit';
}

/**
 * Decide, noche por noche, qué hace el import con lo que ya hay en la base.
 *
 * EL DEFECTO QUE REPARA: con import silencioso frecuente, una lectura a las
 * 5:30 (la persona despertó, miró el teléfono y siguió durmiendo hasta las 8)
 * entraba a sleep_nights y ON CONFLICT DO NOTHING impedía que la noche
 * completa la reemplazara: la noche quedaba congelada a medias.
 *
 *   · Sin fila para esa fecha: insertar.
 *   · Fila de máquina (health_connect | healthkit) y la nueva trae MÁS
 *     minutos: actualizar solo esa fila. Una fila de máquina sin duración se
 *     completa (null no es "igual o mayor").
 *   · Fila `sleep_cycle` (sesión propia): jamás se toca, traiga lo que traiga.
 *   · Fila con source desconocido: tampoco (no se pisa lo que no se entiende).
 *   · Fila de Oura, WHOOP, Garmin, Polar o 'mixto' (344): tampoco. Están
 *     arriba del teléfono en la jerarquía (ver esFuenteDeMaquina).
 *   · Misma o menor duración: nada.
 *
 * Una fecha repetida en `nuevas` se decide una sola vez (gana la primera).
 */
export function decidirEscrituras<N extends NocheAEscribir>(
  existentes: readonly FilaExistente[],
  nuevas: readonly N[],
): DecisionEscrituras<N> {
  const porFecha = new Map<string, FilaExistente>();
  for (const f of existentes) {
    if (f.night_date && !porFecha.has(f.night_date)) porFecha.set(f.night_date, f);
  }
  const insertar: N[] = [];
  const actualizar: N[] = [];
  const vistas = new Set<string>();
  for (const n of nuevas) {
    if (!n.nightDate || vistas.has(n.nightDate)) continue;
    vistas.add(n.nightDate);
    const fila = porFecha.get(n.nightDate);
    if (!fila) { insertar.push(n); continue; }
    if (!esFuenteDeMaquina(fila.source)) continue;
    const actual = numeroONull(fila.duration_minutes);
    if (actual !== null && n.durationMinutes <= actual) continue;
    actualizar.push(n);
  }
  return { insertar, actualizar };
}

// ── Respiro por usuario (A3, 20-sep-2026) ──

/** Guard y respiro del import silencioso, de UNA cuenta. */
export interface RespiroUsuario {
  corriendo: boolean;
  ultimaCorridaMs: number;
}

/**
 * El respiro de una cuenta, sin que la de otra le estorbe: un cambio de
 * usuario dentro de las dos horas ya no sale como 'muy_pronto' para la cuenta
 * nueva. Sin entrada, la cuenta nunca corrió (objeto nuevo, nunca compartido).
 */
export function respiroDe(
  respiros: ReadonlyMap<string, RespiroUsuario>,
  userId: string,
): RespiroUsuario {
  const r = respiros.get(userId);
  return r ? { corriendo: r.corriendo, ultimaCorridaMs: r.ultimaCorridaMs } : { corriendo: false, ultimaCorridaMs: 0 };
}

// ── Anti-cuelgue ──

/**
 * Toda promesa nativa con fecha de caducidad. Si la plataforma no contesta o
 * falla, se devuelve `respaldo` y la UI sigue viva diciendo la verdad. El
 * llamador elige un respaldo que NO se confunda con un dato (null, no []),
 * para que "no contestó" nunca se lea como "no hay nada". `alFallar` recibe
 * el motivo para que la capa con I/O lo registre; el núcleo no importa logger.
 */
export function conLimite<T>(
  p: Promise<T>,
  respaldo: T,
  ms: number,
  alFallar?: (motivo: 'tiempo' | 'error', detalle?: unknown) => void,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let resuelto = false;
    const t = setTimeout(() => {
      if (resuelto) return;
      resuelto = true;
      alFallar?.('tiempo');
      resolve(respaldo);
    }, ms);
    p.then((v) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(t);
      alFallar?.('error', e);
      resolve(respaldo);
    });
  });
}
