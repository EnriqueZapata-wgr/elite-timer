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
 * PURO: sin imports, sin red, sin fechas del sistema. La capa con I/O vive en
 * sueno-unificado-service.ts.
 */

// ── Tipos ──

/**
 * De dónde salió la noche. Los tres primeros son los literales del CHECK de
 * sleep_nights.source (migración 261); 'telefono' marca una noche que SOLO
 * existe en health_os_daily.sleep_minutes (la sync de Ajustes › Salud del
 * teléfono), donde no hay hora de acostarse ni de despertar.
 */
export type FuenteNoche = 'sleep_cycle' | 'health_connect' | 'healthkit' | 'telefono';

/** Una noche ya resuelta entre las dos tablas. La más reciente va primero. */
export interface Noche {
  /** YYYY-MM-DD local: la fecha del DESPERTAR (convención de sleep_nights). */
  nightDate: string;
  /** Minutos dormidos. null solo si la fila de sleep_nights no lo trae. */
  durationMinutes: number | null;
  bedTimeISO: string | null;
  wakeTimeISO: string | null;
  /** Score de calma (0-100): solo lo trae la sesión propia. */
  score: number | null;
  snoreMinutes: number | null;
  fuente: FuenteNoche;
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
}

/** Fila de health_os_daily, solo la parte de sueño. */
export interface FilaSuenoTelefono {
  date: string;
  sleep_minutes?: number | null;
}

// ── Unión ──

function numeroONull(v: number | null | undefined): number | null {
  return v == null || !Number.isFinite(v) ? null : v;
}

/** El `source` crudo de sleep_nights a nuestro vocabulario, sin adivinar. */
export function fuenteDeSleepNight(source: string | null | undefined): FuenteNoche {
  if (source === 'sleep_cycle' || source === 'health_connect' || source === 'healthkit') return source;
  // Un valor fuera del CHECK no puede existir en la base; si llegara, lo
  // único seguro que sabemos es que no fue la sesión propia.
  return 'telefono';
}

/**
 * Une las dos tablas en una lista de noches, la más reciente primero, sin
 * fechas repetidas. Misma fecha: manda sleep_nights. Una fila del teléfono
 * sin minutos no es una noche y se ignora.
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
    });
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
    case 'telefono': return 'Sincronizada desde tu teléfono';
  }
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

/** ¿La fila la escribió una máquina (import o sync), no la sesión propia? */
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
