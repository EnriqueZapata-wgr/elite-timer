import { describe, it, expect } from 'vitest';
import {
  resumir, porContexto, promedioPorDia, serieGki, huecosGki, copyHuecoGki,
  contextoLabel, CONTEXTO_LABEL,
  type GlucosaRow, type CetonaRow,
} from '../glucosa-report-core';
import { computeGKI } from '@/src/services/fasting-metrics-core';

const g = (date: string, value_mg_dl: number, context: string | null = 'fasting'): GlucosaRow =>
  ({ date, time: '07:00', value_mg_dl, context });
const k = (date: string, value_mmol: number | null, source = 'blood'): CetonaRow =>
  ({ date, time: '07:05', source, value_mmol, value_ppm: null, urine_level: null });

describe('resumir', () => {
  it('promedio, mínimo y máximo', () => {
    expect(resumir([90, 100, 110])).toEqual({ n: 3, promedio: 100, min: 90, max: 110 });
  });

  it('sin valores devuelve null en vez de un cero que miente', () => {
    expect(resumir([])).toBeNull();
    expect(resumir([NaN])).toBeNull();
  });
});

describe('contextos', () => {
  it('un contexto desconocido cae a "sin contexto" y no se pierde la lectura', () => {
    const r = porContexto([g('2026-08-10', 95, 'inventado')]);
    expect(r).toHaveLength(1);
    expect(r[0].contexto).toBe('random');
  });

  it('el orden es el clínico, no el alfabético', () => {
    const r = porContexto([
      g('2026-08-10', 140, 'post_meal_1h'),
      g('2026-08-10', 90, 'fasting'),
      g('2026-08-10', 100, 'bedtime'),
    ]);
    expect(r.map((x) => x.contexto)).toEqual(['fasting', 'post_meal_1h', 'bedtime']);
  });

  it('cada etiqueta tiene copy en español y sin em dash', () => {
    for (const v of Object.values(CONTEXTO_LABEL)) {
      expect(v.length).toBeGreaterThan(3);
      expect(v).not.toContain('—');
    }
    expect(contextoLabel(null)).toBe(CONTEXTO_LABEL.random);
  });
});

describe('promedio por día', () => {
  it('promedia las lecturas del mismo día y ordena cronológicamente', () => {
    expect(promedioPorDia([
      { date: '2026-08-11', valor: 100 },
      { date: '2026-08-10', valor: 90 },
      { date: '2026-08-11', valor: 110 },
    ])).toEqual([
      { date: '2026-08-10', valor: 90, lecturas: 1 },
      { date: '2026-08-11', valor: 105, lecturas: 2 },
    ]);
  });
});

describe('serie del índice', () => {
  it('solo produce punto en los días que tienen las DOS mediciones', () => {
    const serie = serieGki(
      [g('2026-08-10', 90), g('2026-08-11', 95)],
      [k('2026-08-10', 1.5)],
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].date).toBe('2026-08-10');
  });

  it('usa exactamente el índice de fasting-metrics-core, no una fórmula propia', () => {
    const serie = serieGki([g('2026-08-10', 90)], [k('2026-08-10', 1.5)]);
    expect(serie[0].gki).toBe(computeGKI(90, 1.5, 'mgdl'));
  });

  it('empareja los PROMEDIOS del día, no la primera lectura de cada uno', () => {
    const serie = serieGki(
      [g('2026-08-10', 80), g('2026-08-10', 100)],
      [k('2026-08-10', 1.0), k('2026-08-10', 2.0)],
    );
    expect(serie[0].glucosaMgDl).toBe(90);
    expect(serie[0].cetonasMmol).toBe(1.5);
  });

  it('las cetonas de aliento y de orina NO entran al índice', () => {
    const serie = serieGki(
      [g('2026-08-10', 90)],
      [{ date: '2026-08-10', time: null, source: 'breath', value_mmol: null, value_ppm: 20, urine_level: null }],
    );
    expect(serie).toEqual([]);
  });

  it('cada punto trae su zona, y ninguna zona habla de autofagia', () => {
    const serie = serieGki([g('2026-08-10', 90)], [k('2026-08-10', 3)]);
    expect(serie[0].zona.label.length).toBeGreaterThan(3);
    expect(serie[0].zona.label.toLowerCase()).not.toContain('autofagia');
  });
});

describe('huecos del índice', () => {
  it('cuenta los días a los que solo les faltó anotar cetonas', () => {
    const h = huecosGki(
      [g('2026-08-10', 90), g('2026-08-11', 95), g('2026-08-12', 92)],
      [k('2026-08-10', 1.5)],
    );
    expect(h).toEqual({ diasConGlucosa: 3, diasConCetonas: 1, diasConAmbas: 1, soloFaltaCetonas: 2 });
  });

  it('con la serie completa no se inventa un aviso', () => {
    const h = huecosGki([g('2026-08-10', 90)], [k('2026-08-10', 1.5)]);
    expect(copyHuecoGki(h)).toBeNull();
  });

  it('sin nada dice qué hacen falta las dos', () => {
    const copy = copyHuecoGki(huecosGki([], []));
    expect(copy).toContain('glucosa y cetonas');
  });

  it('con glucosa pero sin cetonas dice cuál falta, y el copy no lleva em dash', () => {
    const copy = copyHuecoGki(huecosGki([g('2026-08-10', 90)], []));
    expect(copy).toContain('cetonas');
    expect(copy).not.toContain('—');
  });

  it('una cetona nula no cuenta como día medido', () => {
    const h = huecosGki([g('2026-08-10', 90)], [k('2026-08-10', null)]);
    expect(h.diasConCetonas).toBe(0);
  });
});
