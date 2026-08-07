/**
 * Tests que amarran LA función de fase (MB-27 Pieza 3, mutaciones 9 y 10).
 *
 * Una sola función, una sola fuente: la misma usuaria, el mismo día, da la
 * misma fase en /cycle, en el calendario y en Entrenar. La mutación que
 * plante umbrales locales en un consumidor truena en el ratchet de abajo.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getPhase, resolverCiclo, largoDeCiclo, FRESCURA_DIAS_EXTRA,
  PHASE_FOLLICULAR_END, PHASE_OVULATION_END,
} from '@/src/services/cycle/cycle-phase-core';

const ROOT = path.resolve(__dirname, '../../../..');

describe('getPhase — el corte canónico', () => {
  it('ciclo de 28 y periodo de 5: menstrual 1-5, folicular 6-13, ovulación 14-16, lútea 17+', () => {
    expect(getPhase(1)).toBe('menstrual');
    expect(getPhase(5)).toBe('menstrual');
    expect(getPhase(6)).toBe('follicular');
    expect(getPhase(13)).toBe('follicular');
    expect(getPhase(14)).toBe('ovulation');
    expect(getPhase(16)).toBe('ovulation');
    expect(getPhase(17)).toBe('luteal');
    expect(getPhase(28)).toBe('luteal');
  });

  it('los cortes escalan con la duración del ciclo (0.46 / 0.57)', () => {
    // Ciclo de 32: folicular hasta round(32*0.46)=15, ovulación hasta round(32*0.57)=18.
    expect(getPhase(15, 32)).toBe('follicular');
    expect(getPhase(16, 32)).toBe('ovulation');
    expect(getPhase(18, 32)).toBe('ovulation');
    expect(getPhase(19, 32)).toBe('luteal');
    expect(PHASE_FOLLICULAR_END).toBe(0.46);
    expect(PHASE_OVULATION_END).toBe(0.57);
  });

  it('un ciclo alargado no inventa fases: más allá del largo sigue lútea', () => {
    expect(getPhase(35, 28)).toBe('luteal');
  });

  it('el copy canónico de PHASES cubre las cuatro fases (a nivel fuente: el arnés es node-only)', () => {
    // cycle-service jala supabase→react-native: no se importa desde tests.
    const src = fs.readFileSync(path.join(ROOT, 'src/services/cycle-service.ts'), 'utf8');
    for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal']) {
      expect(src, `PHASES.${phase} falta en cycle-service`).toMatch(
        new RegExp(`${phase}: \\{[\\s\\S]*?exercise: '[^']+'`),
      );
    }
  });
});

describe('audit B1: UNA resolución de {inicio, largo, periodo} para todas las superficies', () => {
  // Usuaria del caso del audit: ciclos observados de 31 días (3 inicios con
  // gaps de 31), ajuste manual en 28, hoy es su día 14.
  const PERIODS_31 = [
    { start_date: '2026-07-24' }, // inicio actual → hoy 2026-08-06 = día 14
    { start_date: '2026-06-23' },
    { start_date: '2026-05-23' },
  ];

  it('el caso del audit da UNA fase: observado 31 manda sobre ajuste 28 → folicular', () => {
    const res = resolverCiclo({
      periods: PERIODS_31,
      avgCycleLength: 28,
      avgPeriodLength: 5,
      hoy: '2026-08-06',
    });
    // round(31·0.46) = 14 → día 14 sigue folicular. La vieja resolución de
    // Entrenar (ajuste 28: round(28·0.46) = 13) habría dicho ovulación:
    expect(getPhase(14, 28, 5)).toBe('ovulation'); // lo que decía Entrenar
    expect(res).toMatchObject({
      day: 14, cycleLen: 31, phase: 'follicular', largoFuente: 'observado',
    });
    // La MISMA entrada da la MISMA salida para /cycle, sus bandas y
    // Entrenar: las tres superficies llaman esta función (ratchet abajo).
  });

  it('sin ciclos observados suficientes manda el ajuste manual', () => {
    const res = resolverCiclo({
      periods: [{ start_date: '2026-07-24' }],
      avgCycleLength: 30,
      avgPeriodLength: 6,
      hoy: '2026-08-06',
    });
    expect(res).toMatchObject({ cycleLen: 30, periodLen: 6, largoFuente: 'ajuste' });
    expect(largoDeCiclo([], null)).toMatchObject({ cycleLen: 28, fuente: 'ajuste' });
  });

  it('guarda de frescura ADENTRO: sin periodo nuevo tras largo+14 días no hay fase', () => {
    // Último periodo hace ~187 días: nadie ve "fase lútea, día 187".
    const res = resolverCiclo({
      periods: [{ start_date: '2026-02-01' }],
      avgCycleLength: 28,
      avgPeriodLength: 5,
      hoy: '2026-08-06',
    });
    expect(res).toBe(null);
    // La frontera exacta: día cycleLen+14 aún resuelve; +15 ya no.
    expect(resolverCiclo({
      periods: [{ start_date: '2026-07-01' }], avgCycleLength: 28, hoy: '2026-08-11',
    })?.day).toBe(28 + FRESCURA_DIAS_EXTRA);
    expect(resolverCiclo({
      periods: [{ start_date: '2026-07-01' }], avgCycleLength: 28, hoy: '2026-08-12',
    })).toBe(null);
  });

  it('precedencia de inicio: cycle_periods manda; los logs solo son fallback sin periods', () => {
    const conAmbos = resolverCiclo({
      periods: [{ start_date: '2026-07-24' }],
      inicioDeLogs: '2026-08-01',
      avgCycleLength: 28,
      hoy: '2026-08-06',
    });
    expect(conAmbos?.inicio).toBe('2026-07-24');
    const soloLogs = resolverCiclo({
      periods: [],
      inicioDeLogs: '2026-08-01',
      avgCycleLength: 28,
      hoy: '2026-08-06',
    });
    expect(soloLogs?.inicio).toBe('2026-08-01');
    expect(soloLogs?.day).toBe(6);
    expect(resolverCiclo({ periods: [], hoy: '2026-08-06' })).toBe(null);
  });

  it('fecha futura respecto al inicio → null (no se inventa día negativo)', () => {
    expect(resolverCiclo({
      periods: [{ start_date: '2026-08-10' }], avgCycleLength: 28, hoy: '2026-08-06',
    })).toBe(null);
  });
});

describe('mutación 9: los umbrales viven en UN solo lugar', () => {
  const CONSUMIDORES = [
    'app/cycle.tsx',
    'src/components/cycle/CycleCalendar.tsx',
    'src/services/cycle-service.ts',
    'app/fitness-train.tsx',
  ];

  it('ningún consumidor redefine 0.46/0.57 ni el ovDay = len/2 viejo', () => {
    for (const rel of CONSUMIDORES) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} redefine umbrales de fase`).not.toMatch(/0\.46|0\.57/);
      expect(src, `${rel} conserva el ovDay = len\/2 de fase`).not.toMatch(
        /const ovDay = Math\.round\((cycleLen|settings\.avg_cycle_length) \/ 2\)/,
      );
    }
  });

  it('audit B1: las superficies consumen LA RESOLUCIÓN, no solo la función de fase', () => {
    const usaCore = (rel: string, patron: RegExp, msg: string) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel}: ${msg}`).toMatch(patron);
    };
    // La card de /cycle y getCycleInfo (Entrenar/day-compiler/motor) pasan
    // por resolverCiclo: mismo inicio, mismo largo, misma guarda.
    usaCore('app/cycle.tsx', /resolverCiclo/, 'la card debe resolver con resolverCiclo');
    usaCore('src/services/cycle-service.ts', /resolverCiclo/, 'getCycleInfo debe resolver con resolverCiclo');
    // Y la resolución paralela vieja no puede volver:
    const cycleService = fs.readFileSync(path.join(ROOT, 'src/services/cycle-service.ts'), 'utf8');
    expect(cycleService, 'getCycleDay era la resolución paralela sin frescura').not.toMatch(/function getCycleDay/);
    const cycleTsx = fs.readFileSync(path.join(ROOT, 'app/cycle.tsx'), 'utf8');
    expect(cycleTsx, 'las bandas no pueden volver a cortar con settings crudo').not.toMatch(
      /cycleDay = daysDiff >= 0 \? \(daysDiff % settings\.avg_cycle_length\)/,
    );
    // Entrenar SOLO por getCycleInfo: el gate (mujer + modo propio) viene
    // incluido — mutación 10: acompañante y sin-datos degradan a null y la
    // pantalla queda como era.
    usaCore('app/fitness-train.tsx', /getCycleInfo/, 'la fase de Entrenar solo llega por getCycleInfo');
  });

  it('mutación 10: Entrenar no abre camino lateral a las tablas del ciclo', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/fitness-train.tsx'), 'utf8');
    expect(src).not.toMatch(/cycle_periods|cycle_daily_logs|cycle_settings/);
  });
});

describe('el vocabulario es uno (la etiqueta ovulatory murió)', () => {
  it('el catálogo y el motor hablan ovulation', () => {
    for (const rel of [
      'src/constants/interventions-catalog.ts',
      'src/services/interventions/personalize-types.ts',
      'src/services/interventions/personalize-interventions.ts',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} sigue usando la etiqueta vieja`).not.toMatch(/'ovulatory'/);
    }
  });
});
