/**
 * cycle-periods-core (MB-27 V3 · B1) — la reconstrucción de cycle_periods
 * desde los logs, pura.
 *
 * cycle_periods es la fuente que manda en resolverCiclo, y se DERIVA de los
 * bloques is_period de cycle_daily_logs. El audit V2 encontró el zombi: la
 * pantalla solo reconstruía al MARCAR, nunca al desmarcar — un período
 * fantasma se quedaba para siempre y contaminaba fase, largo observado,
 * Entrenar, day-compiler, ARGOS y el motor.
 *
 * La regla ahora: la tabla se reconstruye ante CUALQUIER cambio de
 * is_period (marcar, desmarcar, y desmarcar el último día que quedaba).
 * Este módulo es la mitad pura: fechas marcadas → filas de período. La
 * pantalla ejecuta el write con estas filas.
 */
import { parseLocalDate } from '@/src/utils/date-helpers';

export interface PeriodoAgrupado {
  start_date: string;
  end_date: string;
  period_length: number;
  /** Días desde el inicio del período anterior; null para el primero. */
  cycle_length: number | null;
}

/** Diferencia en días entre dos fechas locales 'YYYY-MM-DD' (b − a). */
function diffDias(a: string, b: string): number {
  return Math.round(
    (parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000,
  );
}

/**
 * Fechas con is_period=true (en cualquier orden) → períodos agrupando días
 * consecutivos, ascendente. Lista vacía → lista vacía (y el caller BORRA la
 * tabla: desmarcar el último día también limpia — la mitad del zombi que
 * el return temprano viejo dejaba viva).
 */
export function agruparPeriodos(fechas: string[]): PeriodoAgrupado[] {
  const orden = [...new Set(fechas)].sort();
  if (orden.length === 0) return [];
  const grupos: { s: string; e: string }[] = [];
  let cs = orden[0];
  let ce = cs;
  for (let i = 1; i < orden.length; i++) {
    if (diffDias(ce, orden[i]) === 1) { ce = orden[i]; }
    else { grupos.push({ s: cs, e: ce }); cs = orden[i]; ce = cs; }
  }
  grupos.push({ s: cs, e: ce });
  return grupos.map((g, i) => ({
    start_date: g.s,
    end_date: g.e,
    period_length: diffDias(g.s, g.e) + 1,
    cycle_length: i > 0 ? diffDias(grupos[i - 1].s, g.s) : null,
  }));
}
