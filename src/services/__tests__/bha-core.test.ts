import { describe, it, expect } from 'vitest';
import {
  BHA_CRITERIA_PROMPT,
  buildBhaUserText,
  buildBhaSummaryText,
  parseBhaResponse,
  isIllegibleLabel,
} from '@/src/services/bha-core';

describe('parseBhaResponse — JSON defensivo (patrón dx-engine)', () => {
  it('parsea respuesta limpia approved', () => {
    const r = parseBhaResponse(JSON.stringify({
      verdict: 'approved',
      reasons: ['Magnesio bisglicinato (forma quelatada)', 'Excipientes mínimos'],
      flagged_ingredients: [],
      summary: 'Formulación limpia con forma premium.',
    }));
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('approved');
    expect(r!.reasons).toHaveLength(2);
    expect(r!.summary).toContain('premium');
  });

  it('tolera fences ```json y prosa alrededor (extractJsonBlock)', () => {
    const raw = 'Claro, aquí está el análisis:\n```json\n{"verdict":"rejected","reasons":["contiene sucralosa"],"flagged_ingredients":["sucralosa"],"summary":"Endulzante artificial presente."}\n```\nEspero que ayude.';
    const r = parseBhaResponse(raw);
    expect(r!.verdict).toBe('rejected');
    expect(r!.flagged_ingredients).toEqual(['sucralosa']);
  });

  it('veredicto BINARIO: valores fuera de approved/rejected → null (no confía en el modelo)', () => {
    expect(parseBhaResponse('{"verdict":"maybe","reasons":[],"flagged_ingredients":[],"summary":"x"}')).toBeNull();
    expect(parseBhaResponse('{"verdict":"APPROVED","reasons":[]}')).toBeNull();
    expect(parseBhaResponse('{"reasons":["sin verdict"]}')).toBeNull();
  });

  it('inputs rotos → null, nunca lanza', () => {
    expect(parseBhaResponse('')).toBeNull();
    expect(parseBhaResponse('sin json aquí')).toBeNull();
    expect(parseBhaResponse('{"verdict":"approved", TRUNCADO')).toBeNull();
    expect(parseBhaResponse('[1,2,3]')).toBeNull();
  });

  it('normaliza campos sucios: reasons no-array, summary faltante → fallback a primera reason', () => {
    const r = parseBhaResponse('{"verdict":"rejected","reasons":["colorante Rojo 40", 42, ""],"flagged_ingredients":"no-array"}');
    expect(r!.reasons).toEqual(['colorante Rojo 40']);
    expect(r!.flagged_ingredients).toEqual([]);
    expect(r!.summary).toBe('colorante Rojo 40');
  });
});

describe('isIllegibleLabel — duda razonable → rejected re-escaneable', () => {
  it('detecta la reason de etiqueta ilegible', () => {
    const r = parseBhaResponse('{"verdict":"rejected","reasons":["etiqueta ilegible, re-escanea"],"flagged_ingredients":[],"summary":"No se pudo leer."}');
    expect(isIllegibleLabel(r!)).toBe(true);
  });
  it('rejected por ingredientes NO es ilegible; approved nunca es ilegible', () => {
    const rej = parseBhaResponse('{"verdict":"rejected","reasons":["sucralosa"],"flagged_ingredients":["sucralosa"],"summary":"x"}');
    expect(isIllegibleLabel(rej!)).toBe(false);
    const ok = parseBhaResponse('{"verdict":"approved","reasons":["ilegible no aplica"],"flagged_ingredients":[],"summary":"x"}');
    expect(isIllegibleLabel(ok!)).toBe(false);
  });
});

describe('BHA_CRITERIA_PROMPT — criterios de Mariana (decisión #5)', () => {
  it('contiene los criterios que RECHAZAN', () => {
    expect(BHA_CRITERIA_PROMPT).toContain('sucralosa');
    expect(BHA_CRITERIA_PROMPT).toContain('aspartame');
    expect(BHA_CRITERIA_PROMPT).toContain('acesulfame-K');
    expect(BHA_CRITERIA_PROMPT).toContain('óxido de magnesio');
    expect(BHA_CRITERIA_PROMPT).toContain('cianocobalamina');
    expect(BHA_CRITERIA_PROMPT).toContain('ácido fólico sintético');
    expect(BHA_CRITERIA_PROMPT).toContain('Colorantes artificiales');
  });
  it('contiene los criterios que APRUEBAN y la regla de ilegible', () => {
    expect(BHA_CRITERIA_PROMPT).toContain('quelatadas');
    expect(BHA_CRITERIA_PROMPT).toContain('Conservantes naturales');
    expect(BHA_CRITERIA_PROMPT).toContain('etiqueta ilegible, re-escanea');
  });
  it('doctrina: registro no recomendación + BPC no rompe ayuno metabólico', () => {
    expect(BHA_CRITERIA_PROMPT).toContain('NUNCA recomiendes comprar');
    expect(BHA_CRITERIA_PROMPT).toContain('NO opines sobre dosis');
    expect(BHA_CRITERIA_PROMPT).toContain('NO rompe el ayuno metabólico');
  });
  it('exige JSON con el shape estricto', () => {
    expect(BHA_CRITERIA_PROMPT).toContain('"verdict"');
    expect(BHA_CRITERIA_PROMPT).toContain('"reasons"');
    expect(BHA_CRITERIA_PROMPT).toContain('"flagged_ingredients"');
    expect(BHA_CRITERIA_PROMPT).toContain('"summary"');
  });
});

describe('buildBhaUserText / buildBhaSummaryText', () => {
  it('incluye nombre y marca solo si vienen', () => {
    expect(buildBhaUserText('Vitamina C', 'NOW')).toContain('Vitamina C');
    expect(buildBhaUserText('Vitamina C', 'NOW')).toContain('NOW');
    expect(buildBhaUserText(null, '  ')).not.toContain('Marca');
  });
  it('summary persistible = summary + bullets de reasons', () => {
    const text = buildBhaSummaryText({
      verdict: 'rejected',
      reasons: ['sucralosa', 'colorante'],
      flagged_ingredients: ['sucralosa'],
      summary: 'Dos flags.',
    });
    expect(text).toContain('Dos flags.');
    expect(text).toContain('• sucralosa');
    expect(text).toContain('• colorante');
  });
});
