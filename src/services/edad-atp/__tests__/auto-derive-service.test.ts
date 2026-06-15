import { describe, it, expect } from 'vitest';
import { autoDeriveParams } from '@/src/services/edad-atp/auto-derive-service';

describe('auto-derive-service — autoDeriveParams', () => {
  it('Ratio TG/HDL', () => {
    expect(autoDeriveParams({ triglycerides: 75, hdl: 60 }).ratio_tg_hdl).toBe(1.25);
  });
  it('HOMA-IR', () => {
    expect(autoDeriveParams({ glucose: 90, insulin: 5 }).homa_ir).toBe(1.11);
  });
  it('FFMI', () => {
    expect(autoDeriveParams({ weight_kg: 79, body_fat_pct: 11, height_cm: 176 }).ffmi).toBeCloseTo(22.7, 1);
  });
  it('BMI', () => {
    expect(autoDeriveParams({ weight_kg: 79, height_cm: 176 }).bmi).toBeCloseTo(25.5, 1);
  });
  it('Índice aterogénico (Col/HDL)', () => {
    expect(autoDeriveParams({ cholesterol_total: 204, hdl: 60 }).indice_aterogenico).toBe(3.4);
  });
  it('Índice lipoproteínas (LDL/HDL)', () => {
    expect(autoDeriveParams({ ldl: 120, hdl: 60 }).indice_lipoproteinas).toBe(2);
  });
  it('NLR (neutrófilos/linfocitos)', () => {
    expect(autoDeriveParams({ neutrophils_total: 4000, lymphocytes_total: 2000 }).nlr).toBe(2);
  });
  it('Ratio cintura/cadera', () => {
    expect(autoDeriveParams({ waist_cm: 85, hip_cm: 100 }).ratio_cintura_cadera).toBe(0.85);
  });
  it('BUN/Creatinina', () => {
    expect(autoDeriveParams({ bun: 15, creatinine: 1 }).bun_creatinina_ratio).toBe(15);
  });
  it('Saturación de hierro', () => {
    expect(autoDeriveParams({ iron: 100, tibc: 400 }).iron_saturation).toBe(25);
  });

  describe('inputs faltantes / inválidos → no deriva', () => {
    it('falta HDL → no ratio_tg_hdl', () => {
      expect(autoDeriveParams({ triglycerides: 75 }).ratio_tg_hdl).toBeUndefined();
    });
    it('HDL = 0 → no divide por cero', () => {
      expect(autoDeriveParams({ triglycerides: 75, hdl: 0 }).ratio_tg_hdl).toBeUndefined();
    });
    it('valores null → no deriva', () => {
      expect(autoDeriveParams({ triglycerides: null, hdl: 60 }).ratio_tg_hdl).toBeUndefined();
    });
    it('objeto vacío → sin derivados', () => {
      expect(Object.keys(autoDeriveParams({})).length).toBe(0);
    });
  });

  it('no incluye los inputs base, solo los derivados', () => {
    const out = autoDeriveParams({ triglycerides: 75, hdl: 60 });
    expect(out.triglycerides).toBeUndefined();
    expect(out.ratio_tg_hdl).toBe(1.25);
  });
});
