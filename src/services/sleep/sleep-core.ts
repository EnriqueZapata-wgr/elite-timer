/**
 * Sleep core (MB-30A · Pieza 1) — TODA la lógica pura del Sleep Cycle.
 *
 * Entra: niveles de sonido (metering en dBFS, números negativos, 0 = techo)
 * muestreados ~1/s desde el micrófono con la app en primer plano en el buró.
 * Sale: decisión de alarma, score de calma de la noche y minutos de ronquido.
 *
 * Doctrina del sensor: MICRÓFONO, no acelerómetro — el teléfono se queda en
 * el buró, no bajo la almohada. Y honestidad de medida: esto NO detecta
 * fases; mide qué tan movida estuvo la noche por sonido, y nada más.
 *
 * Privacidad: a este módulo solo entran NÚMEROS. Ningún buffer ni fragmento
 * de audio pasa por aquí; el descarte de los archivos temporales del
 * grabador vive en mic-privacy.ts.
 */

// ── Tipos ──

export const SLEEP_SOURCES = ['sleep_cycle', 'health_connect', 'healthkit'] as const;
export type SleepSource = (typeof SLEEP_SOURCES)[number];

/** Muestra de nivel: timestamp epoch ms + nivel en dBFS (negativo). */
export interface NivelMuestra {
  t: number;
  db: number;
}

/** Noche normalizada — lo ÚNICO que se persiste (solo números y strings). */
export interface NocheDormida {
  /** Fecha local del DESPERTAR (la noche del 7 al 8 es el 8). */
  nightDate: string;
  bedTimeISO: string;
  wakeTimeISO: string;
  durationMinutes: number;
  /** Score de calma 0-100, o null si no hubo micrófono / muestras suficientes. */
  score: number | null;
  snoreMinutes: number | null;
  source: SleepSource;
  externalId: string | null;
}

// ── Constantes de análisis ──

/** Delta sobre el piso de ruido para contar una muestra como "actividad". */
const DELTA_ACTIVIDAD_DB = 8;
/** Delta sobre el piso para contar un pico respirable (ronquido). */
const DELTA_RONQUIDO_DB = 5;
/** Tamaño de época para el score (ms). */
const EPOCA_MS = 5 * 60 * 1000;
/** Fracción de muestras activas que vuelve "movida" una época. */
const FRACCION_EPOCA_MOVIDA = 0.2;
/** Mínimo de muestras para emitir score (≈ 30 min a 1/s). */
export const MIN_MUESTRAS_SCORE = 30 * 60;
/** Intervalo entre picos que parece respiración (ronquido): 2 a 10 s. */
const RONQUIDO_INTERVALO_MIN_MS = 2000;
const RONQUIDO_INTERVALO_MAX_MS = 10000;
/** Picos rítmicos mínimos por minuto para contarlo como ronquido. */
const RONQUIDO_PICOS_MIN = 6;

// ── Piso de ruido ──

/** Mediana de niveles: el piso de ruido del cuarto esa noche. */
export function pisoDeRuido(muestras: readonly NivelMuestra[]): number {
  if (muestras.length === 0) return -160;
  const dbs = muestras.map((m) => m.db).sort((a, b) => a - b);
  const mid = Math.floor(dbs.length / 2);
  return dbs.length % 2 === 1 ? dbs[mid] : (dbs[mid - 1] + dbs[mid]) / 2;
}

// ── Score de calma (0-100) ──

/**
 * Qué tan movida estuvo la noche: fracción de épocas de 5 min SIN actividad
 * de sonido sostenida. 100 = noche serena; 0 = sonido toda la noche.
 * Con menos de MIN_MUESTRAS_SCORE devuelve null: sin datos suficientes no
 * se inventa un número.
 */
export function scoreDeCalma(muestras: readonly NivelMuestra[]): number | null {
  if (muestras.length < MIN_MUESTRAS_SCORE) return null;
  const piso = pisoDeRuido(muestras);
  const umbral = piso + DELTA_ACTIVIDAD_DB;
  const t0 = muestras[0].t;
  const porEpoca = new Map<number, { total: number; activas: number }>();
  for (const m of muestras) {
    const epoca = Math.floor((m.t - t0) / EPOCA_MS);
    const e = porEpoca.get(epoca) ?? { total: 0, activas: 0 };
    e.total += 1;
    if (m.db > umbral) e.activas += 1;
    porEpoca.set(epoca, e);
  }
  let movidas = 0;
  for (const e of porEpoca.values()) {
    if (e.total > 0 && e.activas / e.total >= FRACCION_EPOCA_MOVIDA) movidas += 1;
  }
  const total = porEpoca.size;
  if (total === 0) return null;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - movidas / total))));
}

/** Etiqueta honesta del score — habla de calma, jamás de fases. */
export function etiquetaDeScore(score: number): string {
  if (score >= 85) return 'Noche serena';
  if (score >= 70) return 'Noche tranquila';
  if (score >= 50) return 'Noche con movimiento';
  return 'Noche movida';
}

// ── Ronquido (aproximado, por ritmo) ──

/**
 * Minutos con patrón rítmico de picos de sonido a cadencia respiratoria
 * (un pico cada 2-10 s, sostenido el minuto). Es una APROXIMACIÓN por
 * niveles — sin espectro no se puede afirmar más, y el copy no lo afirma.
 */
export function minutosDeRonquido(muestras: readonly NivelMuestra[]): number | null {
  if (muestras.length < MIN_MUESTRAS_SCORE) return null;
  const piso = pisoDeRuido(muestras);
  const umbralPico = piso + DELTA_RONQUIDO_DB;
  // Picos: máximos locales por encima del umbral.
  const picos: number[] = [];
  for (let i = 1; i < muestras.length - 1; i++) {
    const m = muestras[i];
    if (m.db > umbralPico && m.db >= muestras[i - 1].db && m.db >= muestras[i + 1].db) {
      picos.push(m.t);
    }
  }
  if (picos.length < RONQUIDO_PICOS_MIN) return 0;
  // Por minuto: cuenta intervalos pico-a-pico dentro de la cadencia respiratoria.
  const t0 = muestras[0].t;
  const ritmicosPorMinuto = new Map<number, number>();
  for (let i = 1; i < picos.length; i++) {
    const dt = picos[i] - picos[i - 1];
    if (dt >= RONQUIDO_INTERVALO_MIN_MS && dt <= RONQUIDO_INTERVALO_MAX_MS) {
      const minuto = Math.floor((picos[i] - t0) / 60000);
      ritmicosPorMinuto.set(minuto, (ritmicosPorMinuto.get(minuto) ?? 0) + 1);
    }
  }
  let minutos = 0;
  for (const n of ritmicosPorMinuto.values()) {
    if (n >= RONQUIDO_PICOS_MIN) minutos += 1;
  }
  return minutos;
}

// ── Actividad reciente (para la alarma en rango) ──

/**
 * Fracción de muestras "activas" en los últimos `ventanaMs`. Sonido de
 * movimiento reciente sugiere un momento menos pesado para despertar.
 */
export function actividadReciente(
  muestras: readonly NivelMuestra[],
  ahoraMs: number,
  ventanaMs = 10 * 60 * 1000,
): number {
  const desde = ahoraMs - ventanaMs;
  const recientes = muestras.filter((m) => m.t >= desde && m.t <= ahoraMs);
  if (recientes.length === 0) return 0;
  const piso = pisoDeRuido(muestras);
  const umbral = piso + DELTA_ACTIVIDAD_DB;
  const activas = recientes.filter((m) => m.db > umbral).length;
  return activas / recientes.length;
}

// ── Alarma en rango — LA GARANTÍA ──

export type DecisionAlarma = 'esperar' | 'sonar_momento' | 'sonar_limite';

export const UMBRAL_MOMENTO_DEFAULT = 0.15;

/**
 * Decide si la alarma suena.
 *
 * 🚨 INVARIANTE (la alarma NUNCA puede no sonar): llegado el cierre de la
 * ventana, la decisión es 'sonar_limite' pase lo que pase — sin micrófono,
 * sin muestras, sin detección. El fallback se evalúa PRIMERO y no depende
 * de ningún otro dato. La mutación que lo quite truena los tests.
 */
export function evaluarAlarma(args: {
  ahoraMs: number;
  inicioVentanaMs: number;
  finVentanaMs: number;
  yaSono: boolean;
  actividadReciente: number;
  umbral?: number;
}): DecisionAlarma {
  const { ahoraMs, inicioVentanaMs, finVentanaMs, yaSono } = args;
  if (yaSono) return 'esperar';
  // GARANTÍA: el cierre de la ventana dispara SIEMPRE.
  if (ahoraMs >= finVentanaMs) return 'sonar_limite';
  if (ahoraMs >= inicioVentanaMs) {
    const umbral = args.umbral ?? UMBRAL_MOMENTO_DEFAULT;
    if (args.actividadReciente >= umbral) return 'sonar_momento';
  }
  return 'esperar';
}

// ── Rampa de volumen ──

/** Volumen de la alarma: empieza muy bajito y sube en `duracionMs`. */
export function volumenRampa(
  transcurridoMs: number,
  opts: { desde?: number; hasta?: number; duracionMs?: number } = {},
): number {
  const desde = opts.desde ?? 0.03;
  const hasta = opts.hasta ?? 1;
  const dur = opts.duracionMs ?? 90_000;
  if (transcurridoMs <= 0) return desde;
  if (transcurridoMs >= dur) return hasta;
  // Curva cuadrática: sube despacio al principio (despertar amable).
  const p = transcurridoMs / dur;
  return desde + (hasta - desde) * p * p;
}

// ── Ventana de despertar ──

/**
 * Resuelve la ventana [inicio, fin] en epoch ms a partir de la hora límite
 * elegida ('HH:MM') y el ancho en minutos. Si la hora ya pasó hoy, la
 * ventana es de mañana (la sesión se arma antes de dormir).
 */
export function resolverVentana(
  ahora: Date,
  horaLimite: string,
  anchoMin: number,
): { inicioMs: number; finMs: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(horaLimite);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const fin = new Date(ahora);
  fin.setHours(h, min, 0, 0);
  if (fin.getTime() <= ahora.getTime()) fin.setDate(fin.getDate() + 1);
  const inicio = fin.getTime() - Math.max(5, anchoMin) * 60_000;
  return { inicioMs: inicio, finMs: fin.getTime() };
}

/** 'HH:MM:SS' de user_chronotype → 'HH:MM' (default de la hora límite). */
export function horaLimiteDesdeChronotipo(wakeTime: string | null | undefined): string | null {
  if (!wakeTime) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(wakeTime);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Suma minutos a 'HH:MM' con vuelta de día (stepper de la hora límite). */
export function ajustarHora(hhmm: string, deltaMin: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const total = (((Number(m[1]) * 60 + Number(m[2]) + deltaMin) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Sesión mínima para registrar una noche (evita basura de pruebas de 2 min). */
export const MIN_NOCHE_MINUTOS = 30;

// ── Armado de la noche ──

/** Construye el registro persistible de una sesión propia terminada. */
export function armarNochePropia(args: {
  inicioMs: number;
  finMs: number;
  muestras: readonly NivelMuestra[];
  /** Convierte Date → 'YYYY-MM-DD' local (inyectado: date-helpers). */
  aFechaLocal: (d: Date) => string;
}): NocheDormida {
  const { inicioMs, finMs, muestras, aFechaLocal } = args;
  const durationMinutes = Math.max(0, Math.min(1440, Math.round((finMs - inicioMs) / 60000)));
  return {
    nightDate: aFechaLocal(new Date(finMs)),
    bedTimeISO: new Date(inicioMs).toISOString(),
    wakeTimeISO: new Date(finMs).toISOString(),
    durationMinutes,
    score: scoreDeCalma(muestras),
    snoreMinutes: minutosDeRonquido(muestras),
    source: 'sleep_cycle',
    externalId: null,
  };
}

// ── Cola offline (pura, storage inyectado) ──

/**
 * La noche entera corre sin red (modo avión recomendado). Si al terminar no
 * hay internet, la noche se ENCOLA local y se sube después. Nada se pierde
 * y nada de la sesión depende de la red.
 */
export interface KVStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const COLA_NOCHES_KEY = 'sleep_noches_pendientes_v1';

export async function lecturaCola(storage: KVStorage): Promise<NocheDormida[]> {
  try {
    const raw = await storage.getItem(COLA_NOCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NocheDormida[]) : [];
  } catch {
    return [];
  }
}

export async function encolarNoche(storage: KVStorage, noche: NocheDormida): Promise<void> {
  const cola = await lecturaCola(storage);
  // Una noche, un registro — también en la cola.
  const sinEsa = cola.filter((n) => n.nightDate !== noche.nightDate);
  sinEsa.push(noche);
  await storage.setItem(COLA_NOCHES_KEY, JSON.stringify(sinEsa));
}

/**
 * Intenta subir cada pendiente; las que fallan SE QUEDAN en la cola.
 * Devuelve cuántas subieron.
 */
export async function drenarCola(
  storage: KVStorage,
  subir: (noche: NocheDormida) => Promise<boolean>,
): Promise<number> {
  const cola = await lecturaCola(storage);
  if (cola.length === 0) return 0;
  const quedan: NocheDormida[] = [];
  let subidas = 0;
  for (const noche of cola) {
    let ok = false;
    try {
      ok = await subir(noche);
    } catch {
      ok = false;
    }
    if (ok) subidas += 1;
    else quedan.push(noche);
  }
  await storage.setItem(COLA_NOCHES_KEY, JSON.stringify(quedan));
  return subidas;
}
