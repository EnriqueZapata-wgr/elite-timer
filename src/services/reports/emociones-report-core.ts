/**
 * Lógica PURA del dominio emociones (OLA1 R-2): recorte al rango del shell,
 * ventana anterior para el comparativo, y filas del export.
 *
 * La pantalla vieja tenía sus propios rangos (semana/mes/todo) y su propia
 * aritmética de "periodo anterior". Aquí se traduce UNA vez al rango del
 * shell, que es el mismo de los trece reportes.
 */
import { parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import type { HistoryCheckinRecord } from '@/src/services/emotion-history-service';
import type { ResolvedRange } from './report-domain-core';

/** Día LOCAL del check-in, mismo criterio que emotion-history-core. */
export function checkinDayKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return toLocalDateString(d);
}

/** Los check-ins que caen dentro del rango visible. 'Todo' no recorta nada. */
export function filterCheckinsByRange<T extends { created_at: string }>(
  items: readonly T[],
  range: ResolvedRange,
): T[] {
  if (range.from == null) return [...items];
  return items.filter((i) => {
    const key = checkinDayKey(i.created_at);
    return key !== '' && key >= range.from! && key <= range.to;
  });
}

/**
 * La ventana INMEDIATAMENTE anterior, del mismo largo. Es lo que sostiene la
 * flecha de tendencia. En 'Todo' no existe periodo anterior: se devuelve vacío
 * y la flecha no se pinta, que es lo honesto.
 */
export function previousWindow<T extends { created_at: string }>(
  items: readonly T[],
  range: ResolvedRange,
): T[] {
  if (range.from == null || range.days == null) return [];
  const prevTo = parseLocalDate(range.from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = parseLocalDate(range.from);
  prevFrom.setDate(prevFrom.getDate() - range.days);
  const from = toLocalDateString(prevFrom);
  const to = toLocalDateString(prevTo);
  return items.filter((i) => {
    const key = checkinDayKey(i.created_at);
    return key !== '' && key >= from && key <= to;
  });
}

/**
 * Días que cubre el rango para la consistencia. En 'Todo' no hay ventana fija:
 * se usa el tramo que de verdad abarcan los registros, nunca un número
 * inventado que haría bajar el porcentaje sin razón.
 */
export function consistencyWindowDays(
  checkins: readonly { created_at: string }[],
  range: ResolvedRange,
): number {
  if (range.days != null) return range.days;
  const keys = checkins.map((c) => checkinDayKey(c.created_at)).filter((k) => k !== '').sort();
  if (keys.length === 0) return 0;
  const first = parseLocalDate(keys[0]).getTime();
  const last = parseLocalDate(keys[keys.length - 1]).getTime();
  return Math.max(1, Math.round((last - first) / 86400000) + 1);
}

/** Hora LOCAL del check-in. En UTC diría otra cosa que la que se vio. */
export function checkinLocalTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Una fila por check-in: es el dato crudo del usuario, no un resumen. */
export function emocionesRows(checkins: readonly HistoryCheckinRecord[]) {
  return checkins.map((c) => ({
    fecha: checkinDayKey(c.created_at),
    hora: checkinLocalTime(c.created_at),
    cuadrante: c.quadrant,
    emociones: c.emotions.join(' '),
    agrado: c.pleasantness ?? '',
    energia: c.energy_level ?? '',
    donde: c.context_where ?? '',
    con_quien: c.context_who ?? '',
    haciendo: c.context_doing ?? '',
    zona_del_cuerpo: c.body_zone ?? '',
    nota: c.note ?? '',
  }));
}
