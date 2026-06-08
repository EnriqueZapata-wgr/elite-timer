import { describe, it, expect } from 'vitest';
import { computeBodyCompositionAdjustments, computeFFMI } from '../body-composition-service';
import type { BodyComposition } from '@/src/types/edad-atp-v2';

const PATIENT_HOMBRES_V7: BodyComposition = {
  weight_kg: 87.4,
  height_cm: 183,
  body_fat_pct: 24.2,
  skeletal_muscle_pct: 34.6,
  visceral_fat: 10,
  grip_strength_kg: 57.4,
  ffmi: 19.6,
};

describe('Body composition — ajustes HOMBRES V7 (fórmulas del catálogo)', () => {
  it('ajustes individuales correctos', () => {
    const { adjustments } = computeBodyCompositionAdjustments(PATIENT_HOMBRES_V7, 'male');
    expect(adjustments.grasa_visceral).toBe(0); // 10 ≤ 10
    expect(adjustments.ffmi).toBe(0); // 17.5–21
    expect(adjustments.fuerza_agarre).toBe(-2); // > 50
    expect(adjustments.pct_grasa).toBe(0); // 20–25% sin regla
    expect(adjustments.pct_musculo).toBe(0); // 34–38%
  });

  it('paciente HOMBRES V7 — total = −2 (no −1 hardcoded del Excel)', () => {
    const result = computeBodyCompositionAdjustments(PATIENT_HOMBRES_V7, 'male');
    expect(result.total_adjustment_years).toBe(-2);
    // El Excel hardcoded reportaba −1 (errores en H47 fuerza y H49 músculo).
    // La fórmula correcta (catálogo) da −2.
  });

  it('FFMI se calcula si no viene', () => {
    const { ffmi, ...rest } = PATIENT_HOMBRES_V7;
    const computed = computeFFMI(rest);
    expect(computed).toBeGreaterThan(18);
    expect(computed).toBeLessThan(21);
  });

  it('grip ausente → ajuste 0 (no penaliza ni premia)', () => {
    const noGrip = { ...PATIENT_HOMBRES_V7, grip_strength_kg: undefined };
    const { adjustments } = computeBodyCompositionAdjustments(noGrip, 'male');
    expect(adjustments.fuerza_agarre).toBe(0);
  });

  it('reglas de MUJER difieren (grip > 35 → −2)', () => {
    const female: BodyComposition = { ...PATIENT_HOMBRES_V7, grip_strength_kg: 40 };
    const { adjustments } = computeBodyCompositionAdjustments(female, 'female');
    expect(adjustments.fuerza_agarre).toBe(-2); // 40 > 35 (umbral femenino)
  });
});
