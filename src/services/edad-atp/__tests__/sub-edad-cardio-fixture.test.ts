import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeEdadCardiovascular } from '../sub-edad-cardiovascular-service';

// NOTA: el buzón pedía un fixture_enrique.json (SF cardio ≈86.8 → ~30) que NO vino en el
// handoff. Se usa el paciente HOMBRES V7 (datos reales, 23 params cardio) como regresión
// del nuevo path cardio-desde-matriz. (Su cardio es mediocre: HDL 38, LDL 149 → edad mayor.)
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/hombres_v7.json'), 'utf-8'));

describe('Sub-edad Cardiovascular — paciente real (HOMBRES V7) desde matriz', () => {
  it('23 params cardio → CE alto + edad funcional definida (no ASCVD)', () => {
    const r = computeEdadCardiovascular({
      paramValues: fixture.param_values,
      sex: 'male',
      chronological_age: fixture.chronological_age, // 50
    });
    expect(r.ce_percent).toBeGreaterThan(70); // ~77% (la mayoría de los 23 presentes)
    expect(r.age_years).toBeGreaterThan(0);
    expect(Number.isFinite(r.age_years)).toBe(true);
    // Drill-down: cada param con su banda.
    expect(r.components.colesterol_ldl).toBeDefined();
    expect(r.components.colesterol_ldl.band).toBeDefined();
  });

  it('mejor perfil cardio → edad funcional menor (monótono)', () => {
    const base = { sex: 'male' as const, chronological_age: 35 };
    const sano = computeEdadCardiovascular({
      paramValues: { colesterol_hdl: 70, colesterol_ldl: 80, colesterol_total: 160, trigliceridos: 60, presion_sistolica: 110, presion_diastolica: 70, apolipoproteinas_b: 60 },
      ...base,
    });
    const malo = computeEdadCardiovascular({
      paramValues: { colesterol_hdl: 32, colesterol_ldl: 190, colesterol_total: 280, trigliceridos: 250, presion_sistolica: 145, presion_diastolica: 95, apolipoproteinas_b: 140 },
      ...base,
    });
    expect(malo.age_years).toBeGreaterThan(sano.age_years);
  });
});
