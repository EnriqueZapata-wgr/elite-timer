/**
 * MB-29 P6.1/P6.2 — el reporte para el médico, contratos duros:
 *
 *  1. CERO interpretación: el HTML generado con datos realistas no puede
 *     traer vocabulario de juicio (sugiere, riesgo, elevado, semáforos,
 *     nombres de padecimientos). La lectura la hace el médico.
 *  2. Sin Ciclo propio (input.cycle null) NADA de ciclo aparece en el
 *     documento. La mutación que cuele la sección sin gate truena aquí.
 *
 * Más los contratos de agregación editorial (por contexto, mitades del
 * rango, último+previo por lab, síntomas que tocan el rango).
 */
import { describe, it, expect } from 'vitest';
import {
  buildConsultaHtml,
  glucosaPorContexto,
  mitadesDelRango,
  labsUltimoYAnterior,
  sintomasEnRango,
  labDisplayValue,
  labLabel,
  resumenNumerico,
  type ConsultaInput,
} from '@/src/services/salud/consulta-report-core';

/** Input realista: el perfil "cuidar mi glucosa" con 30 días de registros. */
function inputRealista(overrides: Partial<ConsultaInput> = {}): ConsultaInput {
  return {
    firstName: 'Paty',
    fromDate: '2026-07-10',
    toDate: '2026-08-08',
    rangeDays: 30,
    glucose: [
      { date: '2026-07-11', value_mg_dl: 96, context: 'fasting' },
      { date: '2026-07-14', value_mg_dl: 104, context: 'fasting' },
      { date: '2026-07-18', value_mg_dl: 132, context: 'post_meal_2h' },
      { date: '2026-07-25', value_mg_dl: 99, context: 'fasting' },
      { date: '2026-07-29', value_mg_dl: 141, context: 'post_meal_1h' },
      { date: '2026-08-02', value_mg_dl: 92, context: 'fasting' },
      { date: '2026-08-06', value_mg_dl: 88, context: 'bedtime' },
      { date: '2026-08-07', value_mg_dl: 110, context: null },
    ],
    ketones: [
      { date: '2026-07-20', source: 'blood', value_mmol: 0.8, value_ppm: null, urine_level: null },
      { date: '2026-08-01', source: 'urine', value_mmol: null, value_ppm: null, urine_level: 'trace' },
    ],
    measurements: [
      { date: '2026-07-12', weight_kg: 82.4, waist_cm: 94, body_fat_pct: null, systolic_bp: 128, diastolic_bp: 84, resting_hr: 62 },
      { date: '2026-08-05', weight_kg: 80.1, waist_cm: 92, body_fat_pct: 24.5, systolic_bp: 122, diastolic_bp: 80, resting_hr: 60 },
    ],
    labs: [
      { parameter_key: 'hba1c', value: 0.058, measured_at: '2026-06-20' },
      { parameter_key: 'hba1c', value: 0.061, measured_at: '2026-03-02' },
      { parameter_key: 'glucose', value: 101, measured_at: '2026-06-20' },
      { parameter_key: 'triglycerides', value: 180, measured_at: '2026-06-20' },
    ],
    symptoms: [
      { name: 'Dolor de cabeza por la tarde', severity: 3, started_at: '2026-07-20T10:00:00Z', resolved_at: null, is_active: true },
      { name: 'Fatiga al despertar', severity: 2, started_at: '2026-06-01T08:00:00Z', resolved_at: '2026-07-15T08:00:00Z', is_active: false },
    ],
    padecimientos: [
      { name: 'Gastritis', is_chronic: true, isActive: false, lastStartedOn: '2026-05-01' },
    ],
    intervenciones: [
      { name: 'Exposición solar matutina', completedDays: 21, activatedAt: '2026-06-15T00:00:00Z' },
      { name: 'Zona 2 aeróbica', completedDays: 9, activatedAt: null },
    ],
    cycle: null,
    ...overrides,
  };
}

describe('el reporte NO interpreta (P6.1)', () => {
  // Vocabulario de juicio que un documento de solo-datos jamás puede traer.
  const JUICIOS =
    /\bsugiere|\briesgo|\belevad[oa]|\banormal|\bpreocupante|\bdeber[ií]as|\brecomend|\bdiabetes|\bprediabet|\bhipertensi[óo]n|\bsem[áa]foro|\bpeligro|\bnormal\b|\balto\b|\bbaja?\b|\bmejorar\b|\bempeorar\b/i;

  it('con datos realistas, cero vocabulario de juicio', () => {
    const html = buildConsultaHtml(inputRealista());
    const match = html.match(JUICIOS);
    expect(match, `palabra de juicio en el reporte: "${match?.[0] ?? ''}"`).toBeNull();
  });

  it('con TODAS las secciones pobladas (ciclo incluido), sigue sin juzgar', () => {
    const html = buildConsultaHtml(
      inputRealista({
        cycle: {
          phaseLabel: 'Lútea',
          currentDay: 21,
          cycleLen: 28,
          periods: [{ start: '2026-07-18', end: '2026-07-22' }],
        },
      }),
    );
    const match = html.match(JUICIOS);
    expect(match, `palabra de juicio: "${match?.[0] ?? ''}"`).toBeNull();
  });

  it('los datos aparecen como números con fecha (no adjetivos)', () => {
    const html = buildConsultaHtml(inputRealista());
    expect(html).toContain('mg/dL');
    expect(html).toContain('HbA1c');
    expect(html).toContain('Gastritis');
    expect(html).toContain('21 de 30 días con registro');
    // El nombre va en el saludo; el disclaimer dice quién lee.
    expect(html).toContain('Paty');
    expect(html).toContain('la lectura corresponde al profesional de la salud');
  });

  it('sin ningún dato, el documento lo dice y no inventa', () => {
    const html = buildConsultaHtml(
      inputRealista({
        glucose: [], ketones: [], measurements: [], labs: [],
        symptoms: [], padecimientos: [], intervenciones: [], cycle: null,
      }),
    );
    expect(html).toContain('Sin registros en el rango elegido');
  });
});

describe('sin Ciclo propio, NADA de ciclo (P6.2)', () => {
  it('cycle: null → ni una palabra de ciclo en el documento', () => {
    const html = buildConsultaHtml(inputRealista({ cycle: null })).toLowerCase();
    for (const palabra of ['ciclo', 'fase', 'menstrual', 'periodo', 'lútea', 'folicular']) {
      expect(html.includes(palabra), `"${palabra}" apareció sin Ciclo propio`).toBe(false);
    }
  });

  it('con Ciclo propio la sección sí acompaña los datos', () => {
    const html = buildConsultaHtml(
      inputRealista({
        cycle: { phaseLabel: 'Lútea', currentDay: 21, cycleLen: 28, periods: [{ start: '2026-07-18', end: '2026-07-22' }] },
      }),
    );
    expect(html).toContain('Ciclo menstrual');
    expect(html).toContain('Lútea');
    expect(html).toContain('día 21 de un ciclo de 28 días');
  });
});

describe('agregación editorial (un médico con siete minutos)', () => {
  it('glucosa se agrupa por contexto con resumen, no volcado de filas', () => {
    const grupos = glucosaPorContexto(inputRealista().glucose);
    const ayunas = grupos.find((g) => g.label === 'En ayunas');
    expect(ayunas).toBeTruthy();
    expect(ayunas!.resumen.n).toBe(4);
    expect(ayunas!.resumen.min).toBe(92);
    expect(ayunas!.resumen.max).toBe(104);
    // Sin contexto también se reporta (dato honesto), nunca se tira.
    expect(grupos.some((g) => g.label === 'Sin contexto')).toBe(true);
  });

  it('mitades del rango: dos números con fecha; con <3 lecturas por mitad, null', () => {
    const rows = [
      { date: '2026-07-11', value: 100 }, { date: '2026-07-12', value: 102 },
      { date: '2026-07-13', value: 104 }, { date: '2026-08-01', value: 90 },
      { date: '2026-08-02', value: 92 }, { date: '2026-08-03', value: 94 },
    ];
    const m = mitadesDelRango(rows, '2026-07-10', '2026-08-08');
    expect(m).not.toBeNull();
    expect(m!.primeraAvg).toBe(102);
    expect(m!.segundaAvg).toBe(92);
    expect(mitadesDelRango(rows.slice(0, 4), '2026-07-10', '2026-08-08')).toBeNull();
  });

  it('labs: último + previo por parámetro, más reciente primero', () => {
    const pares = labsUltimoYAnterior(inputRealista().labs);
    const hba1c = pares.find((p) => p.key === 'hba1c');
    expect(hba1c!.ultimo.measured_at).toBe('2026-06-20');
    expect(hba1c!.anterior!.measured_at).toBe('2026-03-02');
    const gluc = pares.find((p) => p.key === 'glucose');
    expect(gluc!.anterior).toBeNull();
  });

  it('hba1c vive en decimal y se imprime en % (una sola conversión)', () => {
    expect(labDisplayValue('hba1c', 0.058)).toBe(5.8);
    expect(labDisplayValue('glucose', 101)).toBe(101);
    expect(labLabel('hba1c')).toBe('HbA1c');
    expect(labLabel('clave_desconocida')).toBe('Clave desconocida');
  });

  it('síntomas: activos y los resueltos dentro del rango; lo viejo resuelto no', () => {
    const symptoms = [
      { name: 'Activo viejo', severity: 3, started_at: '2026-01-01T00:00:00Z', resolved_at: null, is_active: true },
      { name: 'Resuelto en rango', severity: 2, started_at: '2026-06-01T00:00:00Z', resolved_at: '2026-07-20T00:00:00Z', is_active: false },
      { name: 'Resuelto antes', severity: 2, started_at: '2026-01-01T00:00:00Z', resolved_at: '2026-02-01T00:00:00Z', is_active: false },
      { name: 'Empieza después', severity: 1, started_at: '2026-09-01T00:00:00Z', resolved_at: null, is_active: true },
    ];
    const enRango = sintomasEnRango(symptoms, '2026-07-10', '2026-08-08').map((s) => s.name);
    expect(enRango).toContain('Activo viejo');
    expect(enRango).toContain('Resuelto en rango');
    expect(enRango).not.toContain('Resuelto antes');
    expect(enRango).not.toContain('Empieza después');
  });

  it('resumenNumerico: sin valores no hay promedio (null, no cero)', () => {
    expect(resumenNumerico([])).toBeNull();
    expect(resumenNumerico([NaN])).toBeNull();
    expect(resumenNumerico([100, 90])).toEqual({ n: 2, avg: 95, min: 90, max: 100 });
  });
});
