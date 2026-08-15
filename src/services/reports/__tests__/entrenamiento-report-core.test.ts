import { describe, it, expect } from 'vitest';
import {
  volumenPorDia, resumenVolumen, progresionDeFuerza, adherenciaAlPlan,
  diasCubiertos, formatDuracion, SIN_META_COPY, SIN_COMPARACION,
  type SetRow, type PrRow,
} from '../entrenamiento-report-core';

describe('volumen', () => {
  it('suma reps por peso y agrupa por día en orden cronológico', () => {
    const sets: SetRow[] = [
      { date: '2026-08-12', reps: 10, weight_kg: 50 },
      { date: '2026-08-10', reps: 8, weight_kg: 60 },
      { date: '2026-08-12', reps: 5, weight_kg: 100 },
    ];
    expect(volumenPorDia(sets)).toEqual([
      { date: '2026-08-10', kg: 480, sets: 1 },
      { date: '2026-08-12', kg: 1000, sets: 2 },
    ]);
  });

  it('el set sin peso cuenta como set pero NO inventa kilos', () => {
    const sets: SetRow[] = [
      { date: '2026-08-12', reps: 20, weight_kg: null },
      { date: '2026-08-12', reps: 12, weight_kg: 0 },
    ];
    expect(volumenPorDia(sets)).toEqual([{ date: '2026-08-12', kg: 0, sets: 2 }]);
  });

  it('el set sin fecha se descarta en vez de caer en un día equivocado', () => {
    expect(volumenPorDia([{ date: null, reps: 10, weight_kg: 50 }])).toEqual([]);
  });

  it('el resumen encuentra el día más pesado y no lo confunde con el de más sets', () => {
    const r = resumenVolumen([
      { date: '2026-08-10', kg: 300, sets: 9 },
      { date: '2026-08-11', kg: 900, sets: 3 },
    ]);
    expect(r.totalKg).toBe(1200);
    expect(r.totalSets).toBe(12);
    expect(r.diasEntrenados).toBe(2);
    expect(r.mejorDia?.date).toBe('2026-08-11');
  });

  it('sin días no hay mejor día inventado', () => {
    expect(resumenVolumen([]).mejorDia).toBeNull();
  });
});

describe('progresión de fuerza', () => {
  const prs: PrRow[] = [
    { achieved_at: '2026-08-01', exercise_name: 'Press banca', weight_kg: 80, rep_range: 5, estimated_1rm: 90 },
    { achieved_at: '2026-08-10', exercise_name: 'Press banca', weight_kg: 85, rep_range: 5, estimated_1rm: 96 },
    { achieved_at: '2026-08-05', exercise_name: 'Sentadilla', weight_kg: 120, rep_range: 3, estimated_1rm: 130 },
  ];

  it('compara la última marca contra la anterior del MISMO ejercicio', () => {
    const p = progresionDeFuerza(prs);
    const banca = p.find((x) => x.ejercicio === 'Press banca');
    expect(banca).toMatchObject({ actual: 96, anterior: 90, delta: 6, marcas: 2 });
  });

  it('la primera marca del rango no finge un delta', () => {
    const p = progresionDeFuerza(prs);
    const sentadilla = p.find((x) => x.ejercicio === 'Sentadilla');
    expect(sentadilla?.anterior).toBeNull();
    expect(sentadilla?.delta).toBeNull();
    expect(SIN_COMPARACION.length).toBeGreaterThan(10);
  });

  it('ordena por el delta más grande primero', () => {
    expect(progresionDeFuerza(prs)[0].ejercicio).toBe('Press banca');
  });

  it('una marca sin 1RM no genera fila fantasma', () => {
    expect(progresionDeFuerza([
      { achieved_at: '2026-08-01', exercise_name: 'Remo', weight_kg: 60, rep_range: 8, estimated_1rm: null },
    ])).toEqual([]);
  });

  it('una marca sin nombre de ejercicio se ignora en vez de agruparse bajo vacío', () => {
    expect(progresionDeFuerza([
      { achieved_at: '2026-08-01', exercise_name: '  ', weight_kg: 60, rep_range: 8, estimated_1rm: 70 },
    ])).toEqual([]);
  });
});

describe('adherencia al plan', () => {
  it('cuenta DÍAS y no sesiones: dos entrenos el mismo día valen por uno', () => {
    const a = adherenciaAlPlan(['2026-08-10', '2026-08-10', '2026-08-12'], 4, 7);
    expect(a.hechas).toBe(2);
    expect(a.esperadas).toBe(4);
    expect(a.pct).toBe(50);
  });

  it('sin meta declarada NO se inventa una vara', () => {
    const a = adherenciaAlPlan(['2026-08-10'], null, 7);
    expect(a.tieneMeta).toBe(false);
    expect(a.pct).toBe(0);
    expect(SIN_META_COPY).not.toContain('—');
  });

  it('una meta de cero o negativa se trata como sin meta', () => {
    expect(adherenciaAlPlan(['2026-08-10'], 0, 7).tieneMeta).toBe(false);
    expect(adherenciaAlPlan(['2026-08-10'], -2, 7).tieneMeta).toBe(false);
  });

  it('pasarse de la meta topa en 100 y no premia con porcentajes imposibles', () => {
    const a = adherenciaAlPlan(
      ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'], 3, 7,
    );
    expect(a.pct).toBe(100);
  });

  it('en el rango Todo se resuelve con los días que van del primer registro al último', () => {
    const a = adherenciaAlPlan(['2026-08-01', '2026-08-14'], 7, null);
    expect(a.esperadas).toBe(14);
    expect(a.hechas).toBe(2);
  });
});

describe('días cubiertos', () => {
  it('cuenta ambos extremos', () => {
    expect(diasCubiertos(['2026-08-01', '2026-08-07'])).toBe(7);
    expect(diasCubiertos(['2026-08-01'])).toBe(1);
    expect(diasCubiertos([])).toBe(0);
  });

  it('no le importa el orden en que llegan las fechas', () => {
    expect(diasCubiertos(['2026-08-07', '2026-08-01'])).toBe(7);
  });
});

describe('duración', () => {
  it('minutos abajo de la hora y horas arriba', () => {
    expect(formatDuracion(2700)).toBe('45min');
    expect(formatDuracion(3600)).toBe('1h');
    expect(formatDuracion(4320)).toBe('1h 12min');
  });

  it('sin dato devuelve null en vez de un cero que parece un entreno vacío', () => {
    expect(formatDuracion(null)).toBeNull();
    expect(formatDuracion(0)).toBeNull();
    expect(formatDuracion(undefined)).toBeNull();
  });
});
