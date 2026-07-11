import { describe, it, expect } from 'vitest';
import {
  clampSeverity,
  clampConfidence,
  extractJsonBlock,
  parseArgosDxResponse,
  deriveSourcePresence,
  countCompletedAreas,
  isDxFresh,
  maxTimestamp,
  presenceFromSnapshot,
} from '../dx-engine-core';
import { HC_AREA_IDS } from '@/src/constants/historia-clinica-questionnaires';

describe('clamp helpers', () => {
  it('clampSeverity → entero 1-5, default 3', () => {
    expect(clampSeverity(0)).toBe(1);
    expect(clampSeverity(9)).toBe(5);
    expect(clampSeverity(3.4)).toBe(3);
    expect(clampSeverity('bad')).toBe(3);
    expect(clampSeverity(undefined)).toBe(3);
  });

  it('clampConfidence → 0-1, default 0.5', () => {
    expect(clampConfidence(-1)).toBe(0);
    expect(clampConfidence(2)).toBe(1);
    expect(clampConfidence(0.42)).toBe(0.42);
    expect(clampConfidence(null)).toBe(0.5);
  });
});

describe('extractJsonBlock', () => {
  it('extrae JSON con fences y prosa alrededor', () => {
    const raw = 'Aquí tienes:\n```json\n{"a":1,"b":{"c":2}}\n```\nfin';
    expect(extractJsonBlock(raw)).toBe('{"a":1,"b":{"c":2}}');
  });
  it('respeta llaves dentro de strings', () => {
    expect(extractJsonBlock('{"t":"a}b"}')).toBe('{"t":"a}b"}');
  });
  it('null si no hay objeto', () => {
    expect(extractJsonBlock('sin json')).toBeNull();
  });
});

describe('parseArgosDxResponse', () => {
  it('descarta raíces fuera del vocabulario controlado', () => {
    const raw = JSON.stringify({
      roots_detected: [
        { root_key: 'disbiosis', severity: 4, confidence: 0.8, sources: ['síntomas'] },
        { root_key: 'raiz_inventada_por_argos', severity: 5, confidence: 0.9, sources: [] },
      ],
      summary_text: 'ok',
    });
    const r = parseArgosDxResponse(raw);
    expect(r.roots).toHaveLength(1);
    expect(r.roots[0].root_key).toBe('disbiosis');
    expect(r.summary_text).toBe('ok');
  });

  it('clampa severity/confidence y dedupe por root_key', () => {
    const raw = JSON.stringify({
      roots_detected: [
        { root_key: 'estres_cronico', severity: 99, confidence: 5, sources: ['x'] },
        { root_key: 'estres_cronico', severity: 1, confidence: 0, sources: ['dup'] },
      ],
      summary_text: '',
    });
    const r = parseArgosDxResponse(raw);
    expect(r.roots).toHaveLength(1);
    expect(r.roots[0].severity).toBe(5);
    expect(r.roots[0].confidence).toBe(1);
    expect(r.roots[0].sources).toEqual(['x']);
  });

  it('normaliza sources a strings no vacíos', () => {
    const raw = JSON.stringify({
      roots_detected: [{ root_key: 'sedentarismo', severity: 2, confidence: 0.3, sources: ['a', '', 2, null, ' b '] }],
      summary_text: 's',
    });
    const r = parseArgosDxResponse(raw);
    expect(r.roots[0].sources).toEqual(['a', 'b']);
  });

  it('respuesta basura → roots vacíos sin lanzar', () => {
    expect(parseArgosDxResponse('no soy json').roots).toEqual([]);
    expect(parseArgosDxResponse('{"roots_detected": "no-array"}').roots).toEqual([]);
    expect(parseArgosDxResponse('').summary_text).toBe('');
  });

  it('severity/confidence faltantes usan defaults', () => {
    const raw = JSON.stringify({ roots_detected: [{ root_key: 'hipertension' }], summary_text: 'z' });
    const r = parseArgosDxResponse(raw);
    expect(r.roots[0].severity).toBe(3);
    expect(r.roots[0].confidence).toBe(0.5);
  });
});

describe('deriveSourcePresence', () => {
  it('mapea conteos a booleans', () => {
    const p = deriveSourcePresence({
      hasBasicHistory: true,
      hasIntegralQuestionnaire: false,
      areaQuestionnairesCount: 2,
      hasConsistentHabits: false,
      labsCount: 3,
      geneticsCount: 0,
    });
    expect(p.hasLabs).toBe(true);
    expect(p.hasGenetics).toBe(false);
    expect(p.areaQuestionnairesCount).toBe(2);
  });

  it('labsCount 0 → hasLabs false; negativos se saturan a 0', () => {
    const p = deriveSourcePresence({
      hasBasicHistory: false,
      hasIntegralQuestionnaire: false,
      areaQuestionnairesCount: -5,
      hasConsistentHabits: false,
      labsCount: 0,
      geneticsCount: 0,
    });
    expect(p.hasLabs).toBe(false);
    expect(p.areaQuestionnairesCount).toBe(0);
  });
});

describe('countCompletedAreas', () => {
  it('cuenta sólo áreas de la lista controlada', () => {
    const completed = ['integral', 'salud_digestiva', 'salud_sueno', 'algo_random'];
    expect(countCompletedAreas(completed, HC_AREA_IDS)).toBe(2);
  });
});

describe('isDxFresh / maxTimestamp', () => {
  it('sin DX previo → no fresco', () => {
    expect(isDxFresh(null, '2026-07-10T00:00:00Z')).toBe(false);
  });
  it('sin cosecha nueva → fresco', () => {
    expect(isDxFresh('2026-07-10T00:00:00Z', null)).toBe(true);
    expect(isDxFresh('2026-07-10T12:00:00Z', '2026-07-10T06:00:00Z')).toBe(true);
  });
  it('cosecha posterior al DX → no fresco', () => {
    expect(isDxFresh('2026-07-10T00:00:00Z', '2026-07-11T00:00:00Z')).toBe(false);
  });
  it('maxTimestamp ignora null/inválidos', () => {
    expect(maxTimestamp([null, '2026-01-01T00:00:00Z', undefined, '2026-06-01T00:00:00Z'])).toBe('2026-06-01T00:00:00Z');
    expect(maxTimestamp([])).toBeNull();
  });
});

describe('presenceFromSnapshot', () => {
  it('reconstruye presencia desde snapshot persistido', () => {
    const snapshot = {
      levantamientos: { completed: ['integral', 'salud_digestiva', 'salud_sueno', 'salud_piel', 'habitos_nutricionales'] },
      labs: { count: 2 },
    };
    const p = presenceFromSnapshot(snapshot);
    expect(p.hasBasicHistory).toBe(true);
    expect(p.hasIntegralQuestionnaire).toBe(true);
    expect(p.areaQuestionnairesCount).toBe(4);
    expect(p.hasConsistentHabits).toBe(true);
    expect(p.hasLabs).toBe(true);
  });
  it('snapshot vacío → presencia mínima sin lanzar', () => {
    const p = presenceFromSnapshot(undefined);
    expect(p.hasBasicHistory).toBe(false);
    expect(p.hasLabs).toBe(false);
    expect(p.areaQuestionnairesCount).toBe(0);
  });
});
