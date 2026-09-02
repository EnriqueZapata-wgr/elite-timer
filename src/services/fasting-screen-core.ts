/**
 * Piezas PURAS de la pantalla de Ayuno (31-ago-2026, backlog 15.6 / T-11).
 *
 * app/fasting.tsx tenía 1,600 líneas con formateadores, copy de errores y el
 * armado de la tira semanal mezclados con el render. Lo que no necesita React
 * vive aquí y se prueba en node. La pantalla solo importa.
 *
 * Cero imports de react-native; el único import es otro núcleo puro.
 */
import { diaCanonico, fraccionDeMeta } from './fasting-cumplido-core';

/** Razones de fallo de fasting-service (copiadas como tipo para no importar el servicio). */
export type RazonFallo =
  | 'rls' | 'no_rows' | 'network' | 'constraint' | 'unknown' | 'already_closed' | 'fin_antes_de_inicio';

/** Mapea el reason de un MutationResult fallido a copy en español para el usuario. */
export function fastErrorCopy(reason: RazonFallo): string {
  switch (reason) {
    case 'already_closed': return 'Este ayuno ya estaba cerrado. Revisa tu historial.';
    case 'fin_antes_de_inicio': return 'El fin debe ser después del inicio.';
    case 'no_rows': return 'La fila no se encontró. Cierra y abre la app.';
    case 'constraint': return 'Hay un registro en conflicto. Revisa tu historial de ayunos.';
    case 'rls': return 'No tienes permiso para esta operación. Vuelve a iniciar sesión.';
    case 'network': return 'Problema de conexión. Revisa tu internet e intenta de nuevo.';
    default: return 'Ocurrió un error. Intenta de nuevo.';
  }
}

/** '16h 30m' · '45m'. Minutos negativos o no finitos se tratan como 0. */
export function formatDuration(totalMinutes: number): string {
  const min = Number.isFinite(totalMinutes) && totalMinutes > 0 ? totalMinutes : 0;
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** F.3: "desde tu último ayuno", en días cuando ya son >= 48 h. */
export function formatSince(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  if (days >= 2) return `${days} días`;
  return formatDuration(totalMinutes);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Devuelve un Date válido o null. Evita `Invalid Date` propagándose a
 * `toLocaleTimeString` (RangeError) o a props numéricas de SVG (NaN es crash
 * de react-native-svg).
 */
export function safeDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DiaSemana {
  key: string;
  letter: string;
  /** Fracción de la meta cumplida ese día (0..1). */
  pct: number;
  isToday: boolean;
}

export interface AyunoSemanaLike {
  actual_hours: number | null;
  target_hours: number | null;
  date?: string | null;
  fast_start?: string | Date | null;
  fast_end?: string | Date | null;
}

const WEEK_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * F.4: la tira de la semana (7 días terminando hoy). Cada ayuno cae en su día
 * canónico (el de FIN, decisión 15.1); varios el mismo día se quedan con el
 * mejor. Hoy incluye el progreso del ayuno en curso.
 *
 * @param hoy       Date de hoy (se inyecta para poder probar).
 * @param progreso  fracción del ayuno activo (0..1) o null si no hay.
 */
export function construirSemana(
  history: AyunoSemanaLike[],
  hoy: Date,
  progreso: number | null,
  fechaLocal: (d: Date) => string,
): DiaSemana[] {
  const porDia = new Map<string, number>();
  for (const f of history) {
    const dia = diaCanonico(f);
    if (!dia) continue;
    const pct = fraccionDeMeta(f.actual_hours, f.target_hours);
    porDia.set(dia, Math.max(porDia.get(dia) ?? 0, pct));
  }
  const semana: DiaSemana[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const key = fechaLocal(d);
    let pct = porDia.get(key) ?? 0;
    const isToday = i === 0;
    if (isToday && progreso != null) pct = Math.max(pct, progreso);
    semana.push({ key, letter: WEEK_LETTERS[d.getDay()], pct, isToday });
  }
  return semana;
}
