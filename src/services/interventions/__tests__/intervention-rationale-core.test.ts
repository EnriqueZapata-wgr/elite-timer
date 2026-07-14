/**
 * intervention-rationale-core — hash estable + blindaje doctrinal del prompt (B.4).
 */
import { describe, expect, it } from 'vitest';
import {
  buildRationalePrompt,
  computeRationaleSetHash,
  INTERVENTION_RATIONALE_ACTION_KEY,
  type RationalePromptInput,
} from '../intervention-rationale-core';

const DX_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function promptInput(): RationalePromptInput {
  return {
    dx: {
      version: 3,
      qualityLevel: 2,
      summary: 'Indicios de inflamación crónica de bajo grado.',
      roots: [
        { root_key: 'inflamacion_cronica' as any, severity: 4, confidence: 0.8 },
        { root_key: 'sedentarismo' as any, severity: 3, confidence: 0.4 },
      ],
    },
    interventions: [
      {
        name: 'Caminata matutina con luz solar',
        how: '20-30 min antes de las 10am.',
        benefit: 'Ritmo circadiano + NEAT.',
        categories: ['movimiento' as any],
        roots: ['sedentarismo' as any],
      },
    ],
  };
}

describe('computeRationaleSetHash', () => {
  it('mismo DX + mismo set (cualquier orden) → mismo hash', () => {
    const a = computeRationaleSetHash(DX_ID, ['caminata', 'ayuno_12h', 'grounding']);
    const b = computeRationaleSetHash(DX_ID, ['grounding', 'caminata', 'ayuno_12h']);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('cambia el set → cambia el hash', () => {
    const base = computeRationaleSetHash(DX_ID, ['caminata', 'grounding']);
    expect(computeRationaleSetHash(DX_ID, ['caminata'])).not.toBe(base);
    expect(computeRationaleSetHash(DX_ID, ['caminata', 'grounding', 'sauna'])).not.toBe(base);
  });

  it('cambia el DX (id nuevo por versión nueva) → cambia el hash', () => {
    const keys = ['caminata', 'grounding'];
    expect(computeRationaleSetHash(DX_ID, keys))
      .not.toBe(computeRationaleSetHash('ffffffff-0000-1111-2222-333333333333', keys));
  });

  it('es determinista entre llamadas (cache estable)', () => {
    expect(computeRationaleSetHash(DX_ID, ['a', 'b']))
      .toBe(computeRationaleSetHash(DX_ID, ['a', 'b']));
  });
});

describe('buildRationalePrompt', () => {
  it('el system blinda la doctrina (no fármacos, no diagnóstico, match cerrado, data faltante)', () => {
    const { system } = buildRationalePrompt(promptInput());
    expect(system).toMatch(/NUNCA recomiendes fármacos/i);
    expect(system).toMatch(/NO es un diagnóstico médico/i);
    expect(system).toMatch(/NO sugieras agregar, quitar ni sustituir/i);
    expect(system).toMatch(/Falta de data ≠ ausencia/i);
    expect(system).toMatch(/200-400 palabras/);
  });

  it('el user lleva raíces del DX + intervenciones activas como JSON parseable', () => {
    const { user } = buildRationalePrompt(promptInput());
    const parsed = JSON.parse(user);
    expect(parsed.diagnostico_funcional.version).toBe(3);
    expect(parsed.diagnostico_funcional.raices).toHaveLength(2);
    expect(parsed.diagnostico_funcional.raices[0]).toEqual({
      raiz: 'inflamacion_cronica', severidad: 4, confianza: 0.8,
    });
    expect(parsed.intervenciones_activas).toHaveLength(1);
    expect(parsed.intervenciones_activas[0].nombre).toBe('Caminata matutina con luz solar');
    expect(parsed.intervenciones_activas[0].raices_que_ataca).toEqual(['sedentarismo']);
  });

  it('action key coincide con el seed de la migración 175', () => {
    expect(INTERVENTION_RATIONALE_ACTION_KEY).toBe('intervention_rationale');
  });
});
