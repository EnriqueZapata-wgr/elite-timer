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
  getPhase, PHASE_FOLLICULAR_END, PHASE_OVULATION_END,
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

  it('cycle.tsx, el calendario y Entrenar consumen el core (o el servicio que lo re-exporta)', () => {
    const usaCore = (rel: string, patron: RegExp) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} no consume la fase canónica`).toMatch(patron);
    };
    usaCore('app/cycle.tsx', /cycle-phase-core/);
    usaCore('src/components/cycle/CycleCalendar.tsx', /cycle-phase-core/);
    usaCore('src/services/cycle-service.ts', /cycle-phase-core/);
    // Entrenar SOLO por getCycleInfo: el gate (mujer + modo propio) viene
    // incluido — mutación 10: acompañante y sin-datos degradan a null y la
    // pantalla queda como era.
    usaCore('app/fitness-train.tsx', /getCycleInfo/);
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
