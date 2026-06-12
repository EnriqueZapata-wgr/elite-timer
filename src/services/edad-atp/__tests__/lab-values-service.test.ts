/**
 * GATE Fase 1 — EL CORAZÓN. Tests de integridad de la time-series canónica `lab_values`.
 * Regresión directa del bug raíz: un panel parcial nuevo NO debe borrar valores de paneles
 * anteriores; la precedencia es POR FECHA (no por fuente); un archivo malo (void) no afecta
 * a otros valores; la escritura convierte unidades UNA vez y es idempotente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured = vi.hoisted(() => ({ upserts: [] as any[] }));

vi.mock('@/src/lib/supabase', () => {
  const q: any = {
    select: () => q, eq: () => q, order: () => q, update: () => q,
    upsert: (rows: any[], opts: any) => { captured.upserts.push({ rows, opts }); return q; },
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return { supabase: { from: () => q } };
});
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import {
  dedupeLatestByKey, bridgeToPhenoAge, canonicalToValueDict,
  insertLabValuesFromRaw, insertCanonicalBiomarkers, type LabValueRow,
} from '../lab-values-service';
import { toCanonicalEntries } from '@/src/constants/lab-canonical-map';

const TODAY = '2026-06-12';
beforeEach(() => { captured.upserts = []; });

describe('dedupeLatestByKey — recencia por parámetro, sin pérdida de paneles', () => {
  it('REGRESIÓN: panel viejo completo + panel nuevo parcial → ningún valor se pierde', () => {
    const rows: LabValueRow[] = [
      // Panel viejo completo (2026-01-01): glucosa + tiroides + lípidos.
      { parameter_key: 'glucosa_en_ayuno', value: 92, unit: null, measured_at: '2026-01-01', source: 'lab_pdf' },
      { parameter_key: 'tsh', value: 2.1, unit: null, measured_at: '2026-01-01', source: 'lab_pdf' },
      { parameter_key: 'colesterol_ldl', value: 140, unit: null, measured_at: '2026-01-01', source: 'lab_pdf' },
      // Panel nuevo parcial (2026-05-01): SOLO lípidos.
      { parameter_key: 'colesterol_ldl', value: 110, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
    ];
    const out = dedupeLatestByKey(rows, TODAY);
    // Glucosa y tiroides del panel viejo SIGUEN presentes (antes desaparecían).
    expect(out.glucosa_en_ayuno.value).toBe(92);
    expect(out.tsh.value).toBe(2.1);
    // Lípidos toman el valor más reciente.
    expect(out.colesterol_ldl.value).toBe(110);
    expect(out.colesterol_ldl.measured_at).toBe('2026-05-01');
  });

  it('precedencia POR FECHA, no por fuente: lab fresco gana a biomarcador manual viejo', () => {
    const rows: LabValueRow[] = [
      { parameter_key: 'glucosa_en_ayuno', value: 110, unit: null, measured_at: '2025-01-01', source: 'manual' },
      { parameter_key: 'glucosa_en_ayuno', value: 88, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
    ];
    const out = dedupeLatestByKey(rows, TODAY);
    expect(out.glucosa_en_ayuno.value).toBe(88); // el más reciente, aunque sea otra fuente
    expect(out.glucosa_en_ayuno.source).toBe('lab_pdf');
  });

  it('valor > STALE_DAYS (365) → is_stale=true pero PRESENTE (nunca se descarta)', () => {
    const rows: LabValueRow[] = [
      { parameter_key: 'ferritina', value: 120, unit: null, measured_at: '2024-01-01', source: 'lab_pdf' },
      { parameter_key: 'glucosa_en_ayuno', value: 90, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
    ];
    const out = dedupeLatestByKey(rows, TODAY);
    expect(out.ferritina.value).toBe(120);
    expect(out.ferritina.is_stale).toBe(true);   // >365d
    expect(out.glucosa_en_ayuno.is_stale).toBe(false); // reciente
  });

  it('is_voided=true se ignora; el parámetro vuelve al penúltimo valor', () => {
    const rows: LabValueRow[] = [
      { parameter_key: 'colesterol_ldl', value: 140, unit: null, measured_at: '2026-01-01', source: 'lab_pdf' },
      // Valor del archivo malo, ya voided → no debe ganar pese a ser más reciente.
      { parameter_key: 'colesterol_ldl', value: 999, unit: null, measured_at: '2026-05-01', source: 'lab_pdf', is_voided: true },
    ];
    const out = dedupeLatestByKey(rows, TODAY);
    expect(out.colesterol_ldl.value).toBe(140); // penúltimo, el 999 voided se ignora
  });

  it('void NO afecta a OTROS parámetros del mismo panel', () => {
    const rows: LabValueRow[] = [
      { parameter_key: 'glucosa_en_ayuno', value: 90, unit: null, measured_at: '2026-05-01', source: 'lab_pdf', is_voided: true },
      { parameter_key: 'tsh', value: 2.0, unit: null, measured_at: '2026-04-01', source: 'lab_pdf', is_voided: false },
    ];
    const out = dedupeLatestByKey(rows, TODAY);
    expect(out.glucosa_en_ayuno).toBeUndefined(); // su único valor estaba voided
    expect(out.tsh.value).toBe(2.0);              // intacto
  });
});

describe('bridge PhenoAge — inversión de unidad % donde el consumidor lo espera', () => {
  it('hba1c/rdw_cv salen en % (×100) desde el store decimal', () => {
    const map = dedupeLatestByKey([
      { parameter_key: 'hba1c', value: 0.057, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
      { parameter_key: 'rdw_cv', value: 0.131, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
      { parameter_key: 'glucosa_en_ayuno', value: 91, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
    ], TODAY);
    const bridge = bridgeToPhenoAge(map);
    expect(bridge.hba1c_pct).toBeCloseTo(5.7, 5);
    expect(bridge.rdw_cv_pct).toBeCloseTo(13.1, 5);
    expect(bridge.glucose_mg_dl).toBe(91); // sin inversión
  });
});

describe('escritura — conversión UNA vez + idempotencia + expansión de alias', () => {
  it('toCanonicalEntries convierte pct una vez y expande claves múltiples (ggt→2, ast→2)', () => {
    const entries = toCanonicalEntries({ hba1c: 5.7, ggt: 30, ast: 22, glucose: 90 });
    const byKey = Object.fromEntries(entries.map((e) => [e.parameter_key, e.value]));
    expect(byKey.hba1c).toBeCloseTo(0.057, 5); // %→decimal
    expect(byKey.glucosa_en_ayuno).toBe(90);
    // ggt y ast tienen dos claves de matriz cada uno.
    expect(byKey.gama_glutamil_transferasa).toBe(30);
    expect(byKey.ggt).toBe(30);
    expect(byKey.transaminasa_glutamico_oxalacetica_ast).toBe(22);
    expect(byKey.transaminasa_g_oxalacetica_ast_tgo).toBe(22);
  });

  it('insertLabValuesFromRaw usa ON CONFLICT ignoreDuplicates (idempotente al re-extraer)', async () => {
    await insertLabValuesFromRaw('u1', { glucose: 90, hba1c: 5.7 }, { source: 'lab_pdf', measuredAt: '2026-05-01' });
    expect(captured.upserts).toHaveLength(1);
    const { rows, opts } = captured.upserts[0];
    expect(opts).toEqual({ onConflict: 'user_id,parameter_key,measured_at,source', ignoreDuplicates: true });
    const g = rows.find((r: any) => r.parameter_key === 'glucosa_en_ayuno');
    expect(g.value).toBe(90);
    expect(g.measured_at).toBe('2026-05-01');
    expect(g.source).toBe('lab_pdf');
  });

  it('insertCanonicalBiomarkers convierte unidades pct por clave canónica', async () => {
    await insertCanonicalBiomarkers('u1', [
      { parameter_key: 'hba1c', value: 5.9 }, { parameter_key: 'glucosa_en_ayuno', value: 95 },
    ], { source: 'manual', measuredAt: '2026-05-01' });
    const { rows } = captured.upserts[0];
    expect(rows.find((r: any) => r.parameter_key === 'hba1c').value).toBeCloseTo(0.059, 5);
    expect(rows.find((r: any) => r.parameter_key === 'glucosa_en_ayuno').value).toBe(95);
  });
});

describe('canonicalToValueDict — aplana a { key: value } para el motor', () => {
  it('proyecta solo el valor', () => {
    const map = dedupeLatestByKey([
      { parameter_key: 'glucosa_en_ayuno', value: 90, unit: null, measured_at: '2026-05-01', source: 'lab_pdf' },
    ], TODAY);
    expect(canonicalToValueDict(map)).toEqual({ glucosa_en_ayuno: 90 });
  });
});
