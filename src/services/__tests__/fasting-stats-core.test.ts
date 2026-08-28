/**
 * Estadísticas de ayuno. Los casos de higiene NO son hipotéticos: salen de la
 * base real medida el 28-ago-2026 (57 filas, 3 usuarios), donde hay un ayuno de
 * 263.4 h y cuatro de 0 h. Sin filtro, la media sale 23.75 con mediana 15.75.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularEstadisticas, calcularRacha, esAyunoValido, formatearHoras,
  MAX_HORAS_VALIDAS,
} from '../fasting-stats-core';

const dias = (...ds: string[]) =>
  ds.map((date) => ({ actual_hours: 16, status: 'completed', date }));

describe('esAyunoValido — la higiene que hace honesto el número', () => {
  it('descarta lo que no está completado', () => {
    expect(esAyunoValido({ actual_hours: null, status: 'cancelled' })).toBe(false);
    expect(esAyunoValido({ actual_hours: null, status: 'active' })).toBe(false);
  });

  it('descarta lo imposible: 263 h con auto-cierre declarado en 120', () => {
    expect(esAyunoValido({ actual_hours: 263.4, status: 'completed' })).toBe(false);
    expect(esAyunoValido({ actual_hours: MAX_HORAS_VALIDAS, status: 'completed' })).toBe(true);
  });

  it('descarta el registro fallido de 0 h', () => {
    expect(esAyunoValido({ actual_hours: 0, status: 'completed' })).toBe(false);
  });

  it('el status es nullable en el esquema: sin status, cuenta', () => {
    expect(esAyunoValido({ actual_hours: 16 })).toBe(true);
  });
});

describe('calcularEstadisticas', () => {
  it('con la basura real de la base, solo cuenta lo válido', () => {
    const r = calcularEstadisticas([
      { actual_hours: 263.4, status: 'completed', date: '2026-06-01' },
      { actual_hours: 0, status: 'completed', date: '2026-04-01' },
      { actual_hours: 16.2, status: 'completed', date: '2026-08-26' },
      { actual_hours: 15.3, status: 'completed', date: '2026-08-25' },
      { actual_hours: null, status: 'cancelled', date: '2026-08-24' },
      { actual_hours: null, status: 'active', date: '2026-08-27' },
    ], '2026-08-26');
    expect(r.total).toBe(2);
    expect(r.descartados).toBe(4);
    // Si esto vuelve a 263.4, estamos enseñando un dato clínicamente irresponsable.
    expect(r.masLargo).toBe(16.2);
    expect(r.promedio).toBe(15.8);
  });

  it('publica la mediana porque la media se deja arrastrar', () => {
    const s = calcularEstadisticas([
      { actual_hours: 16, status: 'completed', date: '2026-08-01' },
      { actual_hours: 16, status: 'completed', date: '2026-08-02' },
      { actual_hours: 118, status: 'completed', date: '2026-08-03' },
    ], '2026-08-03');
    expect(s.promedio).toBe(50);
    expect(s.mediana).toBe(16);
  });

  it('sin datos devuelve null, nunca un 0 falso', () => {
    const v = calcularEstadisticas([], '2026-08-26');
    expect(v).toMatchObject({ total: 0, promedio: null, mediana: null, masLargo: null, racha: 0 });
  });
});

describe('calcularRacha — una sola definición, escrita', () => {
  it('cuenta días consecutivos con al menos un ayuno válido', () => {
    expect(calcularRacha(dias('2026-08-26', '2026-08-25', '2026-08-24'), '2026-08-26')).toBe(3);
  });

  it('si hoy aún no ayunas pero ayer sí, la racha sigue viva', () => {
    // Se rompe al saltarse un día completo, no al no haber ayunado TODAVÍA hoy.
    expect(calcularRacha(dias('2026-08-25', '2026-08-24'), '2026-08-26')).toBe(2);
  });

  it('un día saltado la mata', () => {
    expect(calcularRacha(dias('2026-08-24', '2026-08-23'), '2026-08-26')).toBe(0);
    expect(calcularRacha(dias('2026-08-26', '2026-08-24'), '2026-08-26')).toBe(1);
  });

  it('dos ayunos el mismo día son un día, no dos', () => {
    expect(calcularRacha(dias('2026-08-26', '2026-08-26'), '2026-08-26')).toBe(1);
  });

  it('la aritmética de fechas aguanta los cruces', () => {
    expect(calcularRacha(dias('2026-09-01', '2026-08-31', '2026-08-30'), '2026-09-01')).toBe(3);
    expect(calcularRacha(dias('2027-01-01', '2026-12-31'), '2027-01-01')).toBe(2);
    // 2026 no es bisiesto: el 28 de febrero es la víspera del 1 de marzo.
    expect(calcularRacha(dias('2026-03-01', '2026-02-28'), '2026-03-01')).toBe(2);
  });

  it('sin ayunos, cero', () => {
    expect(calcularRacha([], '2026-08-26')).toBe(0);
  });
});

describe('formatearHoras', () => {
  it('null pinta raya, nunca cero', () => {
    expect(formatearHoras(null)).toBe('—');
    expect(formatearHoras(16.2)).toBe('16.2 h');
  });
});
