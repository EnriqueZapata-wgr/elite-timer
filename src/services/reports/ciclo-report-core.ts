/**
 * Lógica PURA del dominio ciclo (OLA1 R-3): promedios, variabilidad y filas
 * del export.
 *
 * Vivía suelta dentro de app/cycle-history.tsx. Aquí se puede probar, que para
 * una cifra que la usuaria compara con su médico no es un lujo.
 */
import type { ExportRow } from './report-domain-core';

export interface CyclePeriodRow {
  id: string;
  start_date: string;
  end_date: string | null;
  cycle_length: number | null;
  period_length: number | null;
}

export interface CycleDailyRow {
  date: string;
  is_period: boolean | null;
  energy: number | null;
  mood: number | null;
  appetite: number | null;
  libido: number | null;
  cramps: number | null;
  bloating: number | null;
  sleep_quality: number | null;
  temperature_c: number | null;
  hrv_ms: number | null;
}

export interface CycleAverages {
  /** Días de ciclo, redondeado. null si ningún ciclo tiene largo. */
  avgCycle: number | null;
  /** Días de periodo, con un decimal. */
  avgPeriod: number | null;
  /** Desviación de los largos de ciclo. Con UN solo ciclo no existe: null. */
  variance: number | null;
}

export function cycleAverages(cycles: readonly CyclePeriodRow[]): CycleAverages {
  const cycleLengths = cycles.map((c) => c.cycle_length).filter((v): v is number => !!v);
  const periodLengths = cycles.map((c) => c.period_length).filter((v): v is number => !!v);

  const avgCycle = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;
  const avgPeriod = periodLengths.length > 0
    ? Math.round((periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) * 10) / 10
    : null;
  // Con un solo ciclo la variabilidad sería 0, y un 0 aquí se lee como
  // "regularísima" cuando en realidad no hay con qué comparar.
  const variance = cycleLengths.length > 1
    ? Math.round(Math.sqrt(
        cycleLengths.reduce((s, v) => s + Math.pow(v - (avgCycle ?? 0), 2), 0) / cycleLengths.length,
      ))
    : null;

  return { avgCycle, avgPeriod, variance };
}

/**
 * El export lleva las DOS cosas que la pantalla muestra: los ciclos y el
 * registro diario. La columna `tipo` las separa. Se incluyen temperatura y HRV,
 * que hoy se consultan y no se pintan: estaban ahí y nadie podía llevárselas.
 */
export function cicloRows(
  cycles: readonly CyclePeriodRow[],
  logs: readonly CycleDailyRow[],
): ExportRow[] {
  const rows: ExportRow[] = cycles.map((c) => ({
    tipo: 'ciclo',
    fecha: c.start_date,
    fin: c.end_date ?? '',
    dias_ciclo: c.cycle_length ?? '',
    dias_periodo: c.period_length ?? '',
  }));

  for (const l of logs) {
    rows.push({
      tipo: 'dia',
      fecha: l.date,
      en_periodo: l.is_period ? 'si' : 'no',
      energia: l.energy ?? '',
      animo: l.mood ?? '',
      apetito: l.appetite ?? '',
      libido: l.libido ?? '',
      colicos: l.cramps ?? '',
      hinchazon: l.bloating ?? '',
      sueno: l.sleep_quality ?? '',
      temperatura_c: l.temperature_c ?? '',
      hrv_ms: l.hrv_ms ?? '',
    });
  }

  return rows;
}
