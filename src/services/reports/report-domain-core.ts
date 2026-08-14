/**
 * Report Domain Core (OLA1 R-0) — lógica PURA del shell de reportes por
 * dominio: el registro de dominios, la resolución del rango a fechas y el
 * armado del export.
 *
 * Sin react-native y sin supabase a propósito: corre en node, se prueba en
 * node, y lo consumen por igual la pantalla /reports/[dominio] y el hub
 * /reports. Todo lo que toque red o pantalla vive fuera de este archivo.
 */
import { toLocalDateString, parseLocalDate } from '@/src/utils/date-helpers';

// ── Rangos ───────────────────────────────────────────────────────────────

export type ReportRange = 'week' | 'month' | 'year' | 'all';

export const REPORT_RANGES: readonly ReportRange[] = ['week', 'month', 'year', 'all'];

export type ReportRangeLabel = 'Semana' | 'Mes' | 'Año' | 'Todo';

export const RANGE_LABELS: Record<ReportRange, ReportRangeLabel> = {
  week: 'Semana', month: 'Mes', year: 'Año', all: 'Todo',
};

export const RANGE_LABEL_LIST: readonly ReportRangeLabel[] = ['Semana', 'Mes', 'Año', 'Todo'];

export const LABEL_TO_RANGE: Record<ReportRangeLabel, ReportRange> = {
  'Semana': 'week', 'Mes': 'month', 'Año': 'year', 'Todo': 'all',
};

/** Días que cubre el rango, contando hoy. 'Todo' no tiene piso: null. */
export function rangeDays(range: ReportRange): number | null {
  switch (range) {
    case 'week': return 7;
    case 'month': return 30;
    case 'year': return 365;
    case 'all': return null;
  }
}

/**
 * Puerta de entrada de todo lo que viene de afuera: el deep link ?period= y
 * lo persistido en AsyncStorage. Acepta las llaves del hub, el legacy
 * '3month' (que ya no tiene pill propia y cae a mes) y las etiquetas en
 * español. Basura → null, y quien llama decide el default.
 */
export function parseRange(raw: string | null | undefined): ReportRange | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  switch (v) {
    case 'week': case 'semana': return 'week';
    case 'month': case '3month': case 'mes': return 'month';
    case 'year': case 'año': case 'ano': return 'year';
    case 'all': case 'todo': return 'all';
    default: return null;
  }
}

/**
 * El período que entienden los servicios que ya existen (reports-service).
 * El shell habla de rangos; los servicios hablan de períodos. Aquí se traduce
 * una sola vez en lugar de en cada dominio.
 */
export type ServicePeriod = 'week' | 'month' | '3month' | 'year' | 'all';

export function toServicePeriod(range: ReportRange): ServicePeriod {
  return range;
}

export interface ResolvedRange {
  range: ReportRange;
  /** Primer día del rango, YYYY-MM-DD. null en 'Todo': no hay piso. */
  from: string | null;
  /** Último día del rango, YYYY-MM-DD. Es hoy. */
  to: string;
  /** Días que cubre, contando hoy. null en 'Todo'. */
  days: number | null;
}

/**
 * Resuelve el rango a fechas locales. `today` es explícito para que la prueba
 * no dependa del reloj de quien la corre.
 */
export function resolveRange(range: ReportRange, today: Date): ResolvedRange {
  const to = toLocalDateString(today);
  const days = rangeDays(range);
  if (days == null) return { range, from: null, to, days: null };
  const start = parseLocalDate(to);
  start.setDate(start.getDate() - (days - 1));
  return { range, from: toLocalDateString(start), to, days };
}

/** Etiqueta humana del rango resuelto, para el encabezado del export. */
export function describeRange(r: ResolvedRange): string {
  return r.from == null ? `todo mi historial hasta ${r.to}` : `${r.from} a ${r.to}`;
}

// ── Registro de dominios ─────────────────────────────────────────────────

/**
 * Vocabulario de pilares del PillarHeader. Se repite aquí porque el core no
 * importa componentes; el compilador cuida que no se desincronicen en el
 * punto de uso.
 */
export type ReportPillar =
  | 'nutrition' | 'fitness' | 'mind' | 'optimization'
  | 'metrics' | 'rest' | 'cycle' | 'health' | 'tests';

export type ReportDomainKey =
  | 'nutricion' | 'hidratacion' | 'ayuno' | 'mente' | 'economia'
  | 'journal' | 'emociones' | 'ciclo';

export interface ReportDomainMeta {
  key: ReportDomainKey;
  /** Título del header. */
  title: string;
  /** Pilar que le da el color al header. */
  pillar: ReportPillar;
  /** Icono del dominio (Ionicons), el mismo que ya usa su sección en el hub. */
  icon: string;
  /** Acento del dominio: el mismo que ya usa su sección en el hub. */
  accent: string;
  /** Qué contesta este reporte, en una línea. */
  subtitle: string;
  /** Estado vacío propio del dominio: no hay datos, y se dice cómo se llenan. */
  emptyCopy: string;
}

export const REPORT_DOMAINS: Record<ReportDomainKey, ReportDomainMeta> = {
  nutricion: {
    key: 'nutricion',
    title: 'Nutrición',
    pillar: 'nutrition',
    icon: 'restaurant-outline',
    accent: '#38bdf8',
    subtitle: 'Qué comiste y cómo se movieron tus calorías y tu proteína.',
    emptyCopy: 'Todavía no registraste comidas en este rango. Cada comida que anotes aparece aquí al día siguiente.',
  },
  hidratacion: {
    key: 'hidratacion',
    title: 'Hidratación',
    pillar: 'nutrition',
    icon: 'water-outline',
    accent: '#60a5fa',
    subtitle: 'Cuánta agua tomaste y qué días llegaste a tu meta.',
    emptyCopy: 'Todavía no registraste agua en este rango. En cuanto anotes un vaso, la gráfica empieza.',
  },
  ayuno: {
    key: 'ayuno',
    title: 'Ayuno',
    pillar: 'nutrition',
    icon: 'timer-outline',
    accent: '#fbbf24',
    subtitle: 'Cuántos ayunos cerraste, de cuánto, y cuál fue el más largo.',
    emptyCopy: 'Todavía no cerraste ayunos en este rango. Solo cuentan los que terminaste, no los que quedaron abiertos.',
  },
  mente: {
    key: 'mente',
    title: 'Mente',
    pillar: 'mind',
    icon: 'flower-outline',
    accent: '#c084fc',
    subtitle: 'Respiración, meditación, journal y check-ins.',
    emptyCopy: 'Todavía no hay sesiones de mente en este rango. Una respiración de tres minutos ya cuenta.',
  },
  journal: {
    key: 'journal',
    title: 'Journal',
    pillar: 'mind',
    icon: 'book-outline',
    accent: '#a78bfa',
    subtitle: 'Todo lo que escribiste, con su fecha y su tipo.',
    emptyCopy: 'Todavía no hay entradas en este rango. Tu primera entrada está a un tap del botón de más.',
  },
  emociones: {
    key: 'emociones',
    title: 'Emociones',
    pillar: 'mind',
    icon: 'color-palette-outline',
    accent: '#818cf8',
    subtitle: 'Tu mosaico, tus patrones y el perfil del periodo.',
    emptyCopy: 'Todavía no hay check-ins emocionales en este rango. Uno solo ya pinta la primera pieza del mosaico.',
  },
  ciclo: {
    key: 'ciclo',
    title: 'Ciclo',
    pillar: 'cycle',
    icon: 'calendar-outline',
    accent: '#fb7185',
    subtitle: 'Tus ciclos, sus promedios y cómo se movieron tus síntomas.',
    emptyCopy: 'Todavía no hay ciclos ni registros diarios en este rango. Marcar el primer día de tu periodo es lo único que hace falta para empezar.',
  },
  economia: {
    key: 'economia',
    title: 'Economía',
    pillar: 'metrics',
    icon: 'flash',
    accent: '#a8e02a',
    subtitle: 'Tus electrones y tus protones: qué entró y qué se fue.',
    emptyCopy: 'Todavía no hay movimientos en este rango. Tus electrones se ganan cumpliendo, no comprando.',
  },
};

export const REPORT_DOMAIN_KEYS = Object.keys(REPORT_DOMAINS) as ReportDomainKey[];

export function isReportDomain(key: string | null | undefined): key is ReportDomainKey {
  return !!key && Object.prototype.hasOwnProperty.call(REPORT_DOMAINS, key);
}

export function getReportDomain(key: string | null | undefined): ReportDomainMeta | null {
  return isReportDomain(key) ? REPORT_DOMAINS[key] : null;
}

// ── Export (CSV / JSON) ──────────────────────────────────────────────────

export type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;

/** Columnas en el orden en que aparecen por primera vez en las filas. */
export function exportColumns(rows: readonly ExportRow[]): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!set.has(k)) { set.add(k); seen.push(k); }
    }
  }
  return seen;
}

/**
 * Escapa un valor para CSV. Además neutraliza la inyección de fórmulas: un
 * valor que empieza con = + - @ se ejecuta al abrir el archivo en Excel o
 * Sheets, y estos archivos los va a abrir gente que confía en ellos.
 */
export function csvCell(v: ExportValue): string {
  if (v == null) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV con CRLF (lo que espera Excel). Sin filas y sin columnas explícitas
 * devuelve cadena vacía: un archivo con solo encabezados inventados miente
 * sobre lo que hay.
 */
export function buildCsv(rows: readonly ExportRow[], columns?: readonly string[]): string {
  const cols = columns ?? exportColumns(rows);
  if (cols.length === 0) return '';
  const lines = [cols.map((c) => csvCell(c)).join(',')];
  for (const row of rows) lines.push(cols.map((c) => csvCell(row[c])).join(','));
  return lines.join('\r\n');
}

export interface ExportPayload {
  dominio: ReportDomainKey;
  rango: ReportRange;
  desde: string | null;
  hasta: string;
  generado: string;
  filas: number;
  datos: ExportRow[];
}

export function buildExportPayload(
  domain: ReportDomainKey, r: ResolvedRange, rows: readonly ExportRow[], now: Date,
): ExportPayload {
  return {
    dominio: domain,
    rango: r.range,
    desde: r.from,
    hasta: r.to,
    generado: now.toISOString(),
    filas: rows.length,
    datos: [...rows],
  };
}

export function buildJsonExport(
  domain: ReportDomainKey, r: ResolvedRange, rows: readonly ExportRow[], now: Date,
): string {
  return JSON.stringify(buildExportPayload(domain, r, rows, now), null, 2);
}

/** Nombre que verá el usuario cuando comparta el archivo. */
export function buildExportFilename(
  domain: ReportDomainKey, r: ResolvedRange, ext: 'csv' | 'json',
): string {
  const desde = r.from ?? 'inicio';
  return `ATP-${domain}-${desde}-a-${r.to}.${ext}`;
}
