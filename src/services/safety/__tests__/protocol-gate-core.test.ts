import { describe, it, expect } from 'vitest';
import {
  familyForInterventionKey,
  familyForBreathingTemplate,
  familyForTemplateName,
  gateDecisionForFamily,
  fastingGateDecision,
  fastingAlertForHours,
  capBreathingTemplate,
  type SafetyState,
} from '../protocol-gate-core';
import { DEFAULT_SAFETY_PARAMS, PULL_ONLY_INTERVENTION_KEYS } from '../safety-params-defaults';
import { screenFever } from '../fever-screening-core';
import { ATTESTATIONS, attestationText } from '../../../constants/attestation-copy';
import { sha256Hex } from '../../../utils/sha256';

const GATE = DEFAULT_SAFETY_PARAMS.protocol_gate;
const FASTING = DEFAULT_SAFETY_PARAMS.fasting_safety;
const FEVER = DEFAULT_SAFETY_PARAMS.fever_screening;

const clean: SafetyState = { conditions: [], pregnancy: false, lactancia: false };

describe('familyFor* (mapeo de protocolos a familias de riesgo)', () => {
  it('keys del catálogo', () => {
    expect(familyForInterventionKey('wim_hof_basico', GATE)).toBe('breath_intense');
    expect(familyForInterventionKey('tabla_co2', GATE)).toBe('breath_intense');
    expect(familyForInterventionKey('cold_plunge_cns', GATE)).toBe('cold');
    expect(familyForInterventionKey('sauna_finlandesa', GATE)).toBe('heat');
    expect(familyForInterventionKey('protocolo_ayuno_sardinas', GATE)).toBe('fasting_protocol');
    expect(familyForInterventionKey('lentes_rojos', GATE)).toBeNull(); // sin riesgo letal
    expect(familyForInterventionKey('journal_diario', GATE)).toBeNull();
  });

  it('plantillas de respiración', () => {
    expect(familyForBreathingTemplate('wim-hof-lite', GATE)).toBe('breath_intense');
    expect(familyForBreathingTemplate('energize-2', GATE)).toBe('breath_intense');
    expect(familyForBreathingTemplate('box-4', GATE)).toBeNull();
    expect(familyForBreathingTemplate('physiological-sigh', GATE)).toBeNull();
  });

  it('nombres de protocol_templates (keywords)', () => {
    expect(familyForTemplateName('Protocolo Wim Hof avanzado')).toBe('breath_intense');
    expect(familyForTemplateName('Inmersión en frío 21 días')).toBe('cold');
    expect(familyForTemplateName('Sauna + contraste semanal')).toBe('heat');
    expect(familyForTemplateName('Ayuno intermitente 16:8')).toBe('fasting_protocol');
    expect(familyForTemplateName('Rutina de sueño profundo')).toBeNull();
  });
});

describe('gateDecisionForFamily (capas 1-2 del sign-off)', () => {
  it('usuario sin condiciones → atestación (capa 2, corre cada vez)', () => {
    expect(gateDecisionForFamily('breath_intense', clean, GATE))
      .toEqual({ result: 'attest', attestationId: 'wim_hof' });
    expect(gateDecisionForFamily('cold', clean, GATE))
      .toEqual({ result: 'attest', attestationId: 'cold' });
    expect(gateDecisionForFamily('heat', clean, GATE))
      .toEqual({ result: 'attest', attestationId: 'heat' });
  });

  it('embarazo/lactancia → hard block §2.6 (no atestación)', () => {
    expect(gateDecisionForFamily('breath_intense', { ...clean, pregnancy: true }, GATE))
      .toEqual({ result: 'blocked', reason: 'pregnancy' });
    expect(gateDecisionForFamily('cold', { ...clean, lactancia: true }, GATE))
      .toEqual({ result: 'blocked', reason: 'pregnancy' });
  });

  it('condición declarada activa → hard block capa 1 (ni se ofrece)', () => {
    const epileptic: SafetyState = { ...clean, conditions: ['epilepsia'] };
    expect(gateDecisionForFamily('breath_intense', epileptic, GATE))
      .toEqual({ result: 'blocked', reason: 'condition', conditions: ['epilepsia'] });
    // La epilepsia NO bloquea sauna (no está en blockedConditions de heat)
    expect(gateDecisionForFamily('heat', epileptic, GATE))
      .toEqual({ result: 'attest', attestationId: 'heat' });
    const hyper: SafetyState = { ...clean, conditions: ['hipertension'] };
    expect(gateDecisionForFamily('cold', hyper, GATE).result).toBe('blocked');
  });

  it('familia null/desconocida → allowed (sin gate)', () => {
    expect(gateDecisionForFamily(null, clean, GATE)).toEqual({ result: 'allowed' });
    expect(gateDecisionForFamily('yoga', clean, GATE)).toEqual({ result: 'allowed' });
  });
});

describe('fastingGateDecision (contador de ayuno)', () => {
  it('≤48h sin condiciones → allowed (sin atestación)', () => {
    expect(fastingGateDecision(16, clean, FASTING)).toEqual({ result: 'allowed' });
    expect(fastingGateDecision(48, clean, FASTING)).toEqual({ result: 'allowed' });
  });

  it('>48h → atestación §2.4', () => {
    expect(fastingGateDecision(72, clean, FASTING))
      .toEqual({ result: 'attest', attestationId: 'fasting_48h' });
  });

  it('embarazo → bloquea ayunos >12h (no la atestación)', () => {
    const preg = { ...clean, pregnancy: true };
    expect(fastingGateDecision(12, preg, FASTING)).toEqual({ result: 'allowed' });
    expect(fastingGateDecision(16, preg, FASTING)).toEqual({ result: 'blocked', reason: 'pregnancy' });
    expect(fastingGateDecision(72, preg, FASTING)).toEqual({ result: 'blocked', reason: 'pregnancy' });
  });

  it('diabetes/TCA declarados → bloquean ayuno prolongado, permiten intermitente', () => {
    const dm = { ...clean, conditions: ['diabetes_tipo_1'] };
    expect(fastingGateDecision(16, dm, FASTING)).toEqual({ result: 'allowed' });
    expect(fastingGateDecision(72, dm, FASTING))
      .toEqual({ result: 'blocked', reason: 'condition', conditions: ['diabetes_tipo_1'] });
  });
});

describe('fastingAlertForHours (alertas escalantes §2.5)', () => {
  it('36h → advisory, 72h → strong, respetando las ya mostradas', () => {
    expect(fastingAlertForHours(20, new Set(), FASTING)).toBeNull();
    expect(fastingAlertForHours(37, new Set(), FASTING))
      .toEqual({ key: 'advisory36h', markHour: 36 });
    expect(fastingAlertForHours(37, new Set([36]), FASTING)).toBeNull();
    expect(fastingAlertForHours(73, new Set([36]), FASTING))
      .toEqual({ key: 'strong72h', markHour: 72 });
    expect(fastingAlertForHours(73, new Set([36, 72]), FASTING)).toBeNull();
  });

  it('si nunca vio la de 36 y ya va en 80h, prioriza la fuerte', () => {
    expect(fastingAlertForHours(80, new Set(), FASTING))
      .toEqual({ key: 'strong72h', markHour: 72 });
  });
});

describe('PULL_ONLY_INTERVENTION_KEYS (el sistema nunca empuja protocolos de riesgo)', () => {
  it('contiene todas las keys de las 4 familias', () => {
    expect(PULL_ONLY_INTERVENTION_KEYS.has('wim_hof_basico')).toBe(true);
    expect(PULL_ONLY_INTERVENTION_KEYS.has('cold_plunge_cns')).toBe(true);
    expect(PULL_ONLY_INTERVENTION_KEYS.has('sauna_finlandesa')).toBe(true);
    expect(PULL_ONLY_INTERVENTION_KEYS.has('ayuno_16_8')).toBe(true);
    expect(PULL_ONLY_INTERVENTION_KEYS.has('caminata_matutina')).toBe(false);
  });
});

describe('capBreathingTemplate (límites técnicos capa 4)', () => {
  const limits = DEFAULT_SAFETY_PARAMS.breath_limits;

  it('capea rondas a 3 y retenciones a 90s', () => {
    const t = {
      cycles: 10,
      phases: [
        { action: 'inhale', seconds: 60 },
        { action: 'hold_empty', seconds: 120 },
        { action: 'hold', seconds: 95 },
      ],
    };
    const capped = capBreathingTemplate(t, limits);
    expect(capped.cycles).toBe(3);
    expect(capped.phases[0].seconds).toBe(60); // inhale no se capea
    expect(capped.phases[1].seconds).toBe(90);
    expect(capped.phases[2].seconds).toBe(90);
  });

  it('wim-hof-lite actual (3 rondas, retención 60s) pasa intacto', () => {
    const t = {
      cycles: 3,
      phases: [
        { action: 'inhale', seconds: 60 },
        { action: 'hold_empty', seconds: 60 },
        { action: 'hold', seconds: 15 },
      ],
    };
    expect(capBreathingTemplate(t, limits)).toEqual(t);
  });
});

describe('screenFever (umbrales BORRADOR parametrizables)', () => {
  it('sin señales → acompañar ok', () => {
    expect(screenFever({ tempC: 38.2, durationHours: 10, redFlags: [], pregnancy: false }, FEVER))
      .toEqual({ outcome: 'accompany_ok', reasons: [] });
  });

  it('>39°C, >48h, embarazo o síntoma rojo → busca atención médica', () => {
    expect(screenFever({ tempC: 39.4, durationHours: 4, redFlags: [], pregnancy: false }, FEVER).outcome).toBe('seek_care');
    expect(screenFever({ tempC: 38, durationHours: 50, redFlags: [], pregnancy: false }, FEVER).reasons).toEqual(['duration']);
    expect(screenFever({ tempC: null, durationHours: null, redFlags: [], pregnancy: true }, FEVER).reasons).toEqual(['pregnancy']);
    expect(screenFever({ tempC: 38, durationHours: 2, redFlags: ['convulsion'], pregnancy: false }, FEVER).reasons).toEqual(['red_flag']);
  });

  it('39.0 exacto NO dispara (umbral es >39)', () => {
    expect(screenFever({ tempC: 39, durationHours: 1, redFlags: [], pregnancy: false }, FEVER).outcome).toBe('accompany_ok');
  });
});

describe('attestation-copy (textos exactos del sign-off §2)', () => {
  it('4 atestaciones con sus casillas exactas', () => {
    expect(ATTESTATIONS.wim_hof.checks).toHaveLength(4);
    expect(ATTESTATIONS.wim_hof.checks[0]).toContain('No estoy dentro ni cerca del agua');
    expect(ATTESTATIONS.cold.checks).toHaveLength(4);
    expect(ATTESTATIONS.heat.checks).toHaveLength(4);
    expect(ATTESTATIONS.fasting_48h.checks).toHaveLength(3);
    expect(ATTESTATIONS.fasting_48h.checks[0]).toBe('No estoy embarazada ni en lactancia.');
  });

  it('los de contexto variable corren cada vez; el de ayuno no', () => {
    expect(ATTESTATIONS.wim_hof.everyTime).toBe(true);
    expect(ATTESTATIONS.cold.everyTime).toBe(true);
    expect(ATTESTATIONS.heat.everyTime).toBe(true);
    expect(ATTESTATIONS.fasting_48h.everyTime).toBe(false);
  });

  it('attestationText es hasheable (texto_hash del log)', () => {
    for (const spec of Object.values(ATTESTATIONS)) {
      expect(sha256Hex(attestationText(spec))).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
