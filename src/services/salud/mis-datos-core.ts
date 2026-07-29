/**
 * mis-datos-core — helpers PUROS del destino MIS DATOS (Mega-Sprint B · B2).
 * Sin supabase/react-native → testeable node-only. Formatea los últimos valores
 * de cada tipo de dato numérico para el resumen de las secciones.
 *
 * DOCTRINA (menú_navegacion_vs_consulta_datos): las tablas ya son canónicas por
 * tipo (health_measurements para composición+vitals, lab_values para labs,
 * glucose_logs/ketones_logs para glucosa/cetonas). MIS DATOS NO migra tablas —
 * es el destino ÚNICO que consolida la navegación + muestra el último valor.
 */
import { HOME_METRIC_THRESHOLDS } from '../../constants/lab-clinical-ranges';

export interface MisDatosSummary {
  labsCount: number;
  labsLatestDate: string | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  restingHr: number | null;
  vo2max: number | null;
  glucoseMgDl: number | null;
  glucoseAt: string | null;
  ketonesMmol: number | null;
  ketonesAt: string | null;
}

export const EMPTY_SUMMARY: MisDatosSummary = {
  labsCount: 0, labsLatestDate: null, weightKg: null, bodyFatPct: null,
  systolicBp: null, diastolicBp: null, restingHr: null, vo2max: null,
  glucoseMgDl: null, glucoseAt: null, ketonesMmol: null, ketonesAt: null,
};

/** Etiqueta corta de un valor (o '—' si falta). */
export function fmt(value: number | null | undefined, unit = '', decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

/** Presión arterial "120/80" o '—'. */
export function fmtBp(sys: number | null, dia: number | null): string {
  if (sys == null || dia == null) return '—';
  return `${Math.round(sys)}/${Math.round(dia)}`;
}

/** Fecha ISO/date → "hace N días" legible (o '' si falta). NOW inyectable para tests. */
export function relativeDays(iso: string | null | undefined, now: Date): string {
  if (!iso) return '';
  const then = new Date(iso);
  if (isNaN(then.getTime())) return '';
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;
}

/** Rango funcional de glucosa (mg/dL) → etiqueta + severidad para color.
 *  E-9 (MB-12): umbrales desde la fuente única (lab-clinical-ranges). */
export function glucoseStatus(value: number | null): { label: string; level: 'ok' | 'warn' | 'high' } | null {
  if (value == null) return null;
  const g = HOME_METRIC_THRESHOLDS.fasting_glucose;
  if (value < g.lowMax) return { label: 'Baja', level: 'warn' };
  if (value <= g.optimalMax) return { label: 'Óptima (ayuno)', level: 'ok' };
  if (value <= g.elevatedMax) return { label: 'Elevada', level: 'warn' };
  return { label: 'Alta', level: 'high' };
}

/** Rango de cetosis (mmol/L) → etiqueta. */
export function ketosisStatus(value: number | null): { label: string; level: 'ok' | 'warn' | 'high' } | null {
  if (value == null) return null;
  const k = HOME_METRIC_THRESHOLDS.ketones;
  if (value < k.nutritionalMin) return { label: 'Sin cetosis', level: 'warn' };
  if (value <= k.nutritionalMax) return { label: 'Cetosis nutricional', level: 'ok' };
  return { label: 'Cetosis alta', level: 'high' };
}
