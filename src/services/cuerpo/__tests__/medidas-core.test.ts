/**
 * Tests que amarran medidas-core (MB-27 Pieza 1, mutación 6).
 *
 * La base garantiza UNIQUE(user_id, date) (mig 030): capturar dos veces el
 * mismo día NO duplica fila — el upsert la actualiza. Aquí el espejo puro:
 * una fecha cuenta UNA vez en la serie, gane quien gane la lectura.
 */
import { describe, it, expect } from 'vitest';
import {
  serieDePeso, ultimoPeso, resumenMedidas, pesoMasReciente, composicionCoherente,
  type MedicionRow, type RegistroComposicion,
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

describe('audit V2 B6: la recencia se aplica al REGISTRO, no a un campo suelto', () => {
  const hm = (over: Partial<RegistroComposicion>): RegistroComposicion => ({ date: null, ...over });

  it('caso del audit 1 (filtro asimétrico): ambas superficies eligen el MISMO peso', () => {
    // Hoy el usuario capturó solo cintura (esa fila NO es candidata: sin
    // peso). Candidatos reales: hm 1-ago 90 kg vs coach 1-jul 95 kg.
    const canonico = hm({ date: '2026-08-01', weight_kg: 90 });
    const coach = hm({ date: '2026-07-01', weight_kg: 95 });
    const comp = composicionCoherente(canonico, coach);
    expect(comp.weight_kg).toBe(90);
    // Y es EXACTAMENTE el peso de la meta de proteína (misma regla):
    expect(pesoMasReciente(
      { kg: 90, date: '2026-08-01' }, { kg: 95, date: '2026-07-01' },
    )).toBe(comp.weight_kg);
  });

  it('caso del audit 2 (mezcla de épocas): el bloque sale del ganador y el faltante queda DECLARADO', () => {
    // body_measurements 2024: 100 kg y 30 % de grasa; health 2026: 80 kg sin grasa.
    const canonico = hm({ date: '2026-03-01', weight_kg: 80 });
    const coach = hm({ date: '2024-05-01', weight_kg: 100, body_fat_pct: 30, visceral_fat: 9 });
    const comp = composicionCoherente(canonico, coach);
    // El ganador (2026) aporta el peso; la grasa faltante se completa del
    // otro registro PERO declarada — fallback explícito, no default mudo:
    expect(comp.weight_kg).toBe(80);
    expect(comp.body_fat_pct).toBe(30);
    expect(comp.completadosDelOtro).toContain('body_fat_pct');
    expect(comp.completadosDelOtro).toContain('visceral_fat');
  });

  it('ganador con bloque completo: TODO sale de la misma medición (cero collage)', () => {
    const canonico = hm({ date: '2025-08-01', weight_kg: 105, body_fat_pct: 31, visceral_fat: 12 });
    const coach = hm({ date: '2026-08-05', weight_kg: 92, body_fat_pct: 25, muscle_mass_pct: 40, visceral_fat: 7 });
    const comp = composicionCoherente(canonico, coach);
    expect(comp).toMatchObject({
      weight_kg: 92, body_fat_pct: 25, muscle_pct: 40, visceral_fat: 7,
      completadosDelOtro: [],
    });
  });

  it('el músculo en kg se convierte con el peso de SU registro, no del ganador', () => {
    // hm gana (2026, 80 kg) pero no trae músculo; el coach de 2024 traía
    // 40 kg de músculo CON 100 kg de peso → 40 %, no 40/80 = 50 %.
    const canonico = hm({ date: '2026-03-01', weight_kg: 80 });
    const coach = hm({ date: '2024-05-01', weight_kg: 100, muscle_mass_kg: 40 });
    const comp = composicionCoherente(canonico, coach);
    expect(comp.muscle_pct).toBe(40);
    expect(comp.completadosDelOtro).toContain('muscle_pct');
  });

  it('un solo registro / ninguno: sin inventos', () => {
    const solo = composicionCoherente(hm({ date: '2026-08-01', weight_kg: 74, body_fat_pct: 18 }), null);
    expect(solo).toMatchObject({ weight_kg: 74, body_fat_pct: 18, muscle_pct: null, visceral_fat: null });
    const nada = composicionCoherente(null, null);
    expect(nada).toMatchObject({ weight_kg: null, body_fat_pct: null, muscle_pct: null, visceral_fat: null });
  });

  it('empate de fecha o sin fechas → la canónica (misma regla que pesoMasReciente)', () => {
    const comp = composicionCoherente(
      hm({ date: '2026-08-01', weight_kg: 80, body_fat_pct: 20 }),
      hm({ date: '2026-08-01', weight_kg: 92, body_fat_pct: 25 }),
    );
    expect(comp.weight_kg).toBe(80);
    expect(comp.body_fat_pct).toBe(20);
  });
});
