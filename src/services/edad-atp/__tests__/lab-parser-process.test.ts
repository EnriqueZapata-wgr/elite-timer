import { describe, it, expect } from 'vitest';
import { processParserItems, needsConfirmation } from '@/src/services/edad-atp/lab-parser-process';

describe('lab-parser-process — processParserItems', () => {
  it('normaliza + valida un valor bueno (high, explícito)', () => {
    const r = processParserItems([
      { key: 'ldl', value: 149, unit_in_document: 'mg/dL', confidence: 'high', raw_text_snippet: 'LDL: 149 mg/dL' },
    ]);
    const ldl = r.items[0];
    expect(ldl.valueCanonical).toBe(149);
    expect(ldl.passedValidation).toBe(true);
    expect(ldl.confidence).toBe('high');
    expect(ldl.conversionMethod).toBe('explicit');
  });

  it('convierte glucosa mmol/L → mg/dL', () => {
    const r = processParserItems([
      { key: 'glucose', value: 5, unit_in_document: 'mmol/L', confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBe(90);
    expect(r.items[0].unitCanonical).toBe('mg/dL');
  });

  // L3: testosterona ng/mL y ng/dL deben converger a la MISMA unidad canónica (ng/dL)
  // para que no aparezcan como 2 series incomparables en la gráfica. Regression guard del
  // fix de Parser v2 (Capa 2): el path PDF canoniza en el borde de extracción.
  it('L3: testosterona ng/mL → ng/dL (×100, explícito)', () => {
    const r = processParserItems([
      { key: 'testosterone', value: 9.93, unit_in_document: 'ng/mL', confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBe(993);
    expect(r.items[0].unitCanonical).toBe('ng/dL');
    expect(r.items[0].conversionMethod).toBe('explicit');
  });

  it('L3: testosterona ng/dL se mantiene (misma serie que la convertida)', () => {
    const r = processParserItems([
      { key: 'testosterone', value: 600, unit_in_document: 'ng/dL', confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBe(600);
    expect(r.items[0].unitCanonical).toBe('ng/dL');
  });

  it('L3: testosterona sin unidad y magnitud ng/mL (<20) → heurística ×100', () => {
    const r = processParserItems([
      { key: 'testosterone', value: 6.5, unit_in_document: null, confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBe(650);
    expect(r.items[0].conversionMethod).toBe('heuristic');
  });

  it('caso Mariana: LDL 2.27 mg/dL → normaliza sin cambio y FALLA validación', () => {
    const r = processParserItems([
      { key: 'ldl', value: 2.27, unit_in_document: 'mg/dL', confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBe(2.27);
    expect(r.items[0].passedValidation).toBe(false);
  });

  it('baja confidence de high→medium cuando se usó heurística', () => {
    const r = processParserItems([
      { key: 'hba1c', value: 0.057, unit_in_document: null, confidence: 'high' },
    ]);
    expect(r.items[0].valueCanonical).toBeCloseTo(5.7);
    expect(r.items[0].conversionMethod).toBe('heuristic');
    expect(r.items[0].confidence).toBe('medium');
  });

  it('auto-deriva ratios de los valores canónicos', () => {
    const r = processParserItems([
      { key: 'triglycerides', value: 75, unit_in_document: 'mg/dL', confidence: 'high' },
      { key: 'hdl', value: 60, unit_in_document: 'mg/dL', confidence: 'high' },
    ]);
    const tgHdl = r.derived.find((d) => d.key === 'ratio_tg_hdl');
    expect(tgHdl?.value).toBe(1.25);
  });

  it('ignora items sin valor numérico', () => {
    const r = processParserItems([
      { key: 'ldl', value: NaN as any, unit_in_document: 'mg/dL', confidence: 'high' },
      { key: 'hdl', value: 60, unit_in_document: 'mg/dL', confidence: 'high' },
    ]);
    expect(r.items.length).toBe(1);
    expect(r.items[0].key).toBe('hdl');
  });

  it('adjunta el rango clínico cuando existe', () => {
    const r = processParserItems([{ key: 'ldl', value: 100, unit_in_document: 'mg/dL' }]);
    expect(r.items[0].range).toEqual({ min: 30, max: 400, unit: 'mg/dL' });
  });
});

describe('lab-parser-process — needsConfirmation', () => {
  it('false cuando todo es high + válido', () => {
    const r = processParserItems([
      { key: 'ldl', value: 149, unit_in_document: 'mg/dL', confidence: 'high' },
      { key: 'hdl', value: 60, unit_in_document: 'mg/dL', confidence: 'high' },
    ]);
    expect(needsConfirmation(r)).toBe(false);
  });

  it('true si hay un valor rechazado por validación', () => {
    const r = processParserItems([
      { key: 'ldl', value: 2.27, unit_in_document: 'mg/dL', confidence: 'high' },
    ]);
    expect(needsConfirmation(r)).toBe(true);
  });

  it('true si hay confidence < high (ej. conversión heurística)', () => {
    const r = processParserItems([
      { key: 'hba1c', value: 0.057, unit_in_document: null, confidence: 'high' },
    ]);
    expect(needsConfirmation(r)).toBe(true);
  });
});
