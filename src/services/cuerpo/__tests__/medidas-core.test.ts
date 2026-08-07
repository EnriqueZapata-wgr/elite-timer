/**
 * Tests que amarran medidas-core (MB-27 Pieza 1, mutación 6).
 *
 * La base garantiza UNIQUE(user_id, date) (mig 030): capturar dos veces el
 * mismo día NO duplica fila — el upsert la actualiza. Aquí el espejo puro:
 * una fecha cuenta UNA vez en la serie, gane quien gane la lectura.
 */
import { describe, it, expect } from 'vitest';
import {
  serieDePeso, ultimoPeso, resumenMedidas, type MedicionRow,
} from '@/src/services/cuerpo/medidas-core';

// Como las entrega el servicio: DESC por fecha.
const ROWS: MedicionRow[] = [
  { date: '2026-08-06', weight_kg: 74.5, waist_cm: 82 },
  { date: '2026-08-01', weight_kg: 74.9, arm_cm: 38 },
  { date: '2026-07-20', weight_kg: 75.6, waist_cm: 84, chest_cm: 104 },
  { date: '2026-07-01', weight_kg: 76.2 },
];

describe('serieDePeso', () => {
  it('ordena ascendente por fecha y etiqueta D/M sin pasar por Date', () => {
    const serie = serieDePeso(ROWS);
    expect(serie.map((p) => p.date)).toEqual([
      '2026-07-01', '2026-07-20', '2026-08-01', '2026-08-06',
    ]);
    expect(serie[0].label).toBe('1/7');
    expect(serie[3].label).toBe('6/8');
    expect(serie.map((p) => p.value)).toEqual([76.2, 75.6, 74.9, 74.5]);
  });

  it('mutación 6: una fecha cuenta UNA vez — dos capturas del mismo día no duplican punto', () => {
    // La lectura DESC trae la fila más reciente primero: esa gana.
    const sucia: MedicionRow[] = [
      { date: '2026-08-06', weight_kg: 74.5 },
      { date: '2026-08-06', weight_kg: 99 }, // fila fantasma del mismo día
      { date: '2026-08-01', weight_kg: 74.9 },
    ];
    const serie = serieDePeso(sucia);
    expect(serie).toHaveLength(2);
    expect(serie[1]).toMatchObject({ date: '2026-08-06', value: 74.5 });
  });

  it('ignora filas sin peso o con peso inválido', () => {
    const conHuecos: MedicionRow[] = [
      { date: '2026-08-06', weight_kg: null, waist_cm: 82 },
      { date: '2026-08-01', weight_kg: 0 },
      { date: '2026-07-20', weight_kg: 75.6 },
    ];
    expect(serieDePeso(conHuecos)).toHaveLength(1);
  });

  it('recorta a los últimos max puntos (los más recientes)', () => {
    const serie = serieDePeso(ROWS, 2);
    expect(serie.map((p) => p.date)).toEqual(['2026-08-01', '2026-08-06']);
  });
});

describe('ultimoPeso', () => {
  it('el hero: último peso con delta contra la medición anterior', () => {
    const u = ultimoPeso(ROWS);
    expect(u).toMatchObject({ kg: 74.5, date: '2026-08-06', deltaKg: -0.4 });
  });

  it('sin mediciones → null; con una sola → delta null', () => {
    expect(ultimoPeso([])).toBe(null);
    expect(ultimoPeso([{ date: '2026-08-06', weight_kg: 74.5 }])).toMatchObject({
      kg: 74.5, deltaKg: null,
    });
  });
});

describe('resumenMedidas', () => {
  it('coalesce por columna: cada medida conserva su valor más reciente', () => {
    const res = resumenMedidas(ROWS);
    const porKey = Object.fromEntries(res.map((m) => [m.key, m]));
    // waist del 06 (más reciente), no la del 20.
    expect(porKey.waist_cm).toMatchObject({ cm: 82, date: '2026-08-06' });
    expect(porKey.arm_cm).toMatchObject({ cm: 38, date: '2026-08-01' });
    expect(porKey.chest_cm).toMatchObject({ cm: 104, date: '2026-07-20' });
    expect(porKey.leg_cm).toBeUndefined();
  });

  it('sin filas → vacío (la pantalla pinta su estado honesto)', () => {
    expect(resumenMedidas([])).toEqual([]);
  });
});
