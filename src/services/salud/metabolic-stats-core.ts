/**
 * metabolic-stats-core — estadísticas de glucosa y cetonas, PURO (MB-29 P5).
 *
 * El recorrido lo dijo claro: "la app captura y no devuelve". Glucosa y
 * cetonas eran bitácoras; esto les da la vuelta: ventanas de 7 y 30 días
 * con promedio y rango, y el GKI donde aplique (glucosa Y cetonas en
 * sangre del mismo día).
 *
 * Números, no juicios: el GKI se muestra como índice con su fórmula, sin
 * zonas ni semáforos (mismo criterio del reporte de consulta).
 *
 * Puro: sin supabase ni react-native. Testeable node-only.
 */
import { parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

export interface PuntoMetabolico {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface ResumenVentana {
  dias: number;
  n: number;
  avg: number;
  min: number;
  max: number;
}

/** Primer día (inclusive) de una ventana de `dias` terminando hoy. */
export function inicioVentana(hoy: string, dias: number): string {
  const d = parseLocalDate(hoy);
  d.setDate(d.getDate() - (dias - 1));
  return toLocalDateString(d);
}

/**
 * Resumen de una ventana de días terminando hoy. null si no hay ni un
 * punto en la ventana (cero datos no es promedio cero).
 */
export function resumenVentana(
  puntos: PuntoMetabolico[],
  dias: number,
  hoy: string,
): ResumenVentana | null {
  const desde = inicioVentana(hoy, dias);
  const v = puntos
    .filter((p) => p.date >= desde && p.date <= hoy && Number.isFinite(p.value))
    .map((p) => p.value);
  if (v.length === 0) return null;
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return {
    dias,
    n: v.length,
    avg: round1(v.reduce((a, b) => a + b, 0) / v.length),
    min: round1(Math.min(...v)),
    max: round1(Math.max(...v)),
  };
}

/**
 * GKI: glucosa (mg/dL → mmol/L entre 18) dividida entre cetonas en sangre
 * (mmol/L). Solo aplica con ambos valores del día y cetonas > 0; si no,
 * null y la UI no lo inventa.
 */
export function gki(glucosaMgDl: number | null | undefined, cetonasMmol: number | null | undefined): number | null {
  if (glucosaMgDl == null || cetonasMmol == null) return null;
  if (!Number.isFinite(glucosaMgDl) || !Number.isFinite(cetonasMmol)) return null;
  if (glucosaMgDl <= 0 || cetonasMmol <= 0) return null;
  return Math.round((glucosaMgDl / 18 / cetonasMmol) * 10) / 10;
}
