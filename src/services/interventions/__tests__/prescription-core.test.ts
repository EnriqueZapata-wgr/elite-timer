/**
 * Tests de las derivaciones puras del fenotipo (prescription-core) — node-only.
 * Cubre §11 guard #9 (versionado por hash) + las traducciones fuente→motor.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveDxLevelsFromRoots, deriveBraverman, deriveLabs, deriveChronotype,
  normalizeCyclePhase, ageFromDOB, computePhenotypeHash,
} from '../prescription-core';
import { PROFILE_B } from './_motor_fixtures';

const NOW = new Date('2026-07-15T12:00:00Z');

describe('deriveDxLevelsFromRoots', () => {
  it('severity 5 (peor) → nivel 1 (roto); severity 1 → nivel 5', () => {
    const levels = deriveDxLevelsFromRoots(
      [{ root_key: 'resistencia_insulina', severity: 5, confidence: 0.9 },
        { root_key: 'deficit_sueno_profundo', severity: 1, confidence: 0.5 }],
      NOW,
    );
    const metab = levels.find((l) => l.system === 'metabolismo');
    const sueno = levels.find((l) => l.system === 'sueno');
    expect(metab?.level).toBe(1);
    expect(sueno?.level).toBe(5);
  });

  it('un sistema toma el PEOR (mayor severity) de sus raíces', () => {
    const levels = deriveDxLevelsFromRoots(
      [{ root_key: 'resistencia_insulina', severity: 2, confidence: 0.8 },
        { root_key: 'hiperinsulinemia', severity: 4, confidence: 0.8 }],
      NOW,
    );
    expect(levels.find((l) => l.system === 'metabolismo')?.level).toBe(2); // 6-4
  });

  it('raíz desconocida se ignora sin romper', () => {
    expect(deriveDxLevelsFromRoots([{ root_key: 'raiz_fantasma', severity: 3 }], NOW)).toEqual([]);
  });
});

describe('deriveBraverman', () => {
  it('el déficit primario → low, el resto → medium', () => {
    const b = deriveBraverman({ primary_deficiency: 'dopamine', deficiency_level: 'high', completed_at: null });
    expect(b?.dopamine).toBe('low');
    expect(b?.serotonin).toBe('medium');
  });
  it('grafía española (acetilcolina) también matchea', () => {
    const b = deriveBraverman({ primary_deficiency: 'acetilcolina', deficiency_level: 'medium', completed_at: null });
    expect(b?.acetylcholine).toBe('low');
  });
  it('null → null', () => {
    expect(deriveBraverman(null)).toBeNull();
  });
});

describe('deriveLabs', () => {
  it('mapea parameter_key canónico a marker + tier del motor', () => {
    const labs = deriveLabs({
      hba1c: { value: 6.1, measured_at: '2026-07-01' },
      insulina: { value: 15, measured_at: '2026-07-01' },
      parametro_no_mapeado: { value: 1, measured_at: '2026-07-01' },
    });
    const hba1c = labs.find((l) => l.marker === 'HbA1c');
    expect(hba1c?.value).toBe(6.1);
    expect(hba1c?.tier).toBe(1);
    expect(labs.find((l) => l.marker === 'insulina')?.tier).toBe(2);
    expect(labs.length).toBe(2); // el no mapeado se ignora
  });
});

describe('deriveChronotype', () => {
  it('dolphin → oso con transitionalState delfín', () => {
    const c = deriveChronotype({ chronotype: 'dolphin', wake_time: '06:30:00', sleep_time: '23:30:00' });
    expect(c?.type).toBe('oso');
    expect(c?.transitionalState).toBe('delfin');
  });
  it('lion → leon; wake_time se recorta a HH:MM', () => {
    const c = deriveChronotype({ chronotype: 'lion', wake_time: '06:00:00', sleep_time: '21:30:00' });
    expect(c?.type).toBe('leon');
    expect(c?.wakeTime).toBe('06:00');
  });
});

describe('normalizeCyclePhase', () => {
  it("'ovulation' del cycle-service → 'ovulatory' del motor", () => {
    expect(normalizeCyclePhase('ovulation')).toBe('ovulatory');
    expect(normalizeCyclePhase('luteal')).toBe('luteal');
  });
});

describe('ageFromDOB', () => {
  it('calcula edad correcta y cae a 35 si falta/invalida', () => {
    expect(ageFromDOB('1990-01-01', new Date('2026-07-15'))).toBe(36);
    expect(ageFromDOB(null, NOW)).toBe(35);
    expect(ageFromDOB('no-date', NOW)).toBe(35);
  });
});

describe('computePhenotypeHash (idempotencia · guard #9)', () => {
  it('mismo fenotipo → mismo hash (determinístico)', () => {
    expect(computePhenotypeHash(PROFILE_B)).toBe(computePhenotypeHash(PROFILE_B));
  });

  it('cambiar la fase del ciclo cambia el hash (dispara recálculo)', () => {
    const luteal = { ...PROFILE_B, cyclePhase: { ...PROFILE_B.cyclePhase!, currentPhase: 'luteal' as const } };
    expect(computePhenotypeHash(PROFILE_B)).not.toBe(computePhenotypeHash(luteal));
  });

  it('reordenar conditions NO cambia el hash (canónico ordenado)', () => {
    const a = { ...PROFILE_B, profile: { ...PROFILE_B.profile, conditions: ['x', 'y'] } };
    const b = { ...PROFILE_B, profile: { ...PROFILE_B.profile, conditions: ['y', 'x'] } };
    expect(computePhenotypeHash(a)).toBe(computePhenotypeHash(b));
  });

  it('hash es hex de 16 chars (FNV-1a 64-bit)', () => {
    expect(computePhenotypeHash(PROFILE_B)).toMatch(/^[0-9a-f]{16}$/);
  });
});
