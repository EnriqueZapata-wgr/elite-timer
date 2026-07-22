import { describe, it, expect } from 'vitest';
import {
  FUNCTIONAL_SCORE_PROMPT,
  SCORE_ATTRIBUTES,
  buildScanUserText,
  buildScoreSummaryText,
  parseFunctionalScoreResponse,
} from '@/src/services/bha-core';

const FULL = JSON.stringify({
  attributes: [
    { key: 'formas', score: 80, note: 'Magnesio como bisglicinato.' },
    { key: 'aditivos', score: 100, note: 'Sin colorantes ni endulzantes artificiales.' },
    { key: 'excipientes', score: 90, note: 'Cápsula vegetal y celulosa.' },
    { key: 'transparencia', score: 70, note: 'Un blend sin desglose por ingrediente.' },
  ],
  flagged_ingredients: [],
  summary: 'Formulación con formas quelatadas y etiqueta parcialmente desglosada.',
});

describe('parseFunctionalScoreResponse — JSON defensivo (Sprint Compliance 4)', () => {
  it('parsea respuesta completa y calcula el total determinístico (promedio)', () => {
    const r = parseFunctionalScoreResponse(FULL);
    expect(r).not.toBeNull();
    expect(r!.illegible).toBe(false);
    expect(r!.attributes).toHaveLength(4);
    expect(r!.score).toBe(85); // (80+100+90+70)/4
    expect(r!.attributes[0].label).toBe('Formas y biodisponibilidad');
  });

  it('NO confía en un total del modelo: lo ignora y promedia', () => {
    const withBogusTotal = JSON.parse(FULL);
    withBogusTotal.score = 12;
    const r = parseFunctionalScoreResponse(JSON.stringify(withBogusTotal));
    expect(r!.score).toBe(85);
  });

  it('tolera fences ```json y prosa alrededor (extractJsonBlock)', () => {
    const raw = `Claro, aquí está el análisis:\n\`\`\`json\n${FULL}\n\`\`\`\nEspero que ayude.`;
    expect(parseFunctionalScoreResponse(raw)!.score).toBe(85);
  });

  it('clampa scores fuera de rango (0-100) y redondea', () => {
    const dirty = JSON.parse(FULL);
    dirty.attributes[0].score = 150;
    dirty.attributes[1].score = -20;
    dirty.attributes[2].score = 90.6;
    const r = parseFunctionalScoreResponse(JSON.stringify(dirty));
    expect(r!.attributes[0].score).toBe(100);
    expect(r!.attributes[1].score).toBe(0);
    expect(r!.attributes[2].score).toBe(91);
  });

  it('falta un atributo obligatorio o score no numérico → null', () => {
    const missing = JSON.parse(FULL);
    missing.attributes = missing.attributes.slice(0, 3);
    expect(parseFunctionalScoreResponse(JSON.stringify(missing))).toBeNull();

    const nonNumeric = JSON.parse(FULL);
    nonNumeric.attributes[0].score = 'alto';
    expect(parseFunctionalScoreResponse(JSON.stringify(nonNumeric))).toBeNull();
  });

  it('{"illegible":true} → resultado ilegible sin score', () => {
    const r = parseFunctionalScoreResponse('{"illegible":true}');
    expect(r!.illegible).toBe(true);
    expect(r!.attributes).toHaveLength(0);
  });

  it('inputs rotos → null, nunca lanza', () => {
    expect(parseFunctionalScoreResponse('')).toBeNull();
    expect(parseFunctionalScoreResponse('sin json aquí')).toBeNull();
    expect(parseFunctionalScoreResponse('{"attributes":[{"key":"formas"')).toBeNull();
    expect(parseFunctionalScoreResponse('[1,2,3]')).toBeNull();
  });

  it('normaliza flagged_ingredients sucios', () => {
    const dirty = JSON.parse(FULL);
    dirty.flagged_ingredients = ['sucralosa', 42, ''];
    const r = parseFunctionalScoreResponse(JSON.stringify(dirty));
    expect(r!.flagged_ingredients).toEqual(['sucralosa']);
  });
});

describe('FUNCTIONAL_SCORE_PROMPT — criterios + compliance §4.2', () => {
  it('conserva los criterios de formulación de Mariana (decisión #5)', () => {
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('sucralosa');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('aspartame');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('acesulfame-K');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('óxido de magnesio');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('cianocobalamina');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('ácido fólico sintético');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('quelatadas');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('conservantes naturales');
  });

  it('salida numérica por atributos, sin veredicto binario ni marca vieja', () => {
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('ATP Functional Score');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('"attributes"');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('"illegible":true');
    expect(FUNCTIONAL_SCORE_PROMPT).not.toContain('Biohacker Approved');
    expect(FUNCTIONAL_SCORE_PROMPT).not.toMatch(/"verdict"/);
  });

  it('lenguaje objetivo y cero marcas de terceros (reglas duras §4.2)', () => {
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('NUNCA menciones marcas de terceros');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('sin adjetivos valorativos');
  });

  it('doctrina: registro no recomendación + BPC no rompe ayuno metabólico', () => {
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('NUNCA recomiendes comprar');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('NO des consejo médico');
    expect(FUNCTIONAL_SCORE_PROMPT).toContain('NO rompe el ayuno metabólico');
  });

  it('los 4 atributos definidos con labels', () => {
    expect(SCORE_ATTRIBUTES.map(a => a.key)).toEqual(['formas', 'aditivos', 'excipientes', 'transparencia']);
  });
});

describe('buildScanUserText / buildScoreSummaryText', () => {
  it('incluye nombre y marca solo si vienen', () => {
    expect(buildScanUserText('Vitamina C', 'NOW')).toContain('Vitamina C');
    expect(buildScanUserText('Vitamina C', 'NOW')).toContain('NOW');
    expect(buildScanUserText(null, '  ')).not.toContain('Marca');
  });

  it('summary persistible = summary + desglose por atributo, capado a 2000', () => {
    const r = parseFunctionalScoreResponse(FULL)!;
    const text = buildScoreSummaryText(r);
    expect(text).toContain('Formulación con formas quelatadas');
    expect(text).toContain('• Formas y biodisponibilidad: 80 — Magnesio como bisglicinato.');
    expect(text).toContain('• Transparencia de etiqueta: 70');
    expect(text.length).toBeLessThanOrEqual(2000);
  });
});
