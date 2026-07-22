import { describe, it, expect } from 'vitest';
import {
  CONSENT_CHECKBOXES,
  CONSENT_BY_ID,
  CONSENT_SHORT_TITLES,
  AVISO_VERSION,
} from '../consent-copy';
import { sha256Hex } from '../../utils/sha256';

describe('consent-copy (Sprint Compliance 2 — Aviso Parte 3)', () => {
  it('existen los 7 checkboxes CB-1..CB-7', () => {
    expect(CONSENT_CHECKBOXES).toHaveLength(7);
    expect(CONSENT_CHECKBOXES.map(c => c.id)).toEqual(
      ['CB-1', 'CB-2', 'CB-3', 'CB-4', 'CB-5', 'CB-6', 'CB-7'],
    );
  });

  it('CB-1..CB-4 obligatorios, CB-5..CB-7 opcionales', () => {
    for (const c of CONSENT_CHECKBOXES) {
      const shouldBeRequired = ['CB-1', 'CB-2', 'CB-3', 'CB-4'].includes(c.id);
      expect(c.required, c.id).toBe(shouldBeRequired);
    }
  });

  it('superficies según la spec: CB-1 register, CB-2..5 onboarding, CB-6/7 contextuales', () => {
    expect(CONSENT_BY_ID['CB-1'].surface).toBe('register');
    for (const id of ['CB-2', 'CB-3', 'CB-4', 'CB-5'] as const) {
      expect(CONSENT_BY_ID[id].surface).toBe('onboarding');
    }
    expect(CONSENT_BY_ID['CB-6'].surface).toBe('contextual');
    expect(CONSENT_BY_ID['CB-7'].surface).toBe('contextual');
  });

  it('cada texto es hasheable y no vacío (texto_hash del log)', () => {
    for (const c of CONSENT_CHECKBOXES) {
      expect(c.text.length).toBeGreaterThan(20);
      expect(sha256Hex(c.text)).toMatch(/^[0-9a-f]{64}$/);
      expect(CONSENT_SHORT_TITLES[c.id].length).toBeGreaterThan(3);
    }
  });

  it('textos exactos ancla (si cambian, hay que subir AVISO_VERSION)', () => {
    expect(AVISO_VERSION).toBe('1.0');
    expect(CONSENT_BY_ID['CB-4'].text).toBe('Confirmo que soy mayor de 18 años.');
    expect(CONSENT_BY_ID['CB-2'].text).toContain('datos personales sensibles de salud');
    expect(CONSENT_BY_ID['CB-3'].text).toContain('proveedores en Estados Unidos');
    expect(CONSENT_BY_ID['CB-6'].text).toContain('ElevenLabs');
    expect(CONSENT_BY_ID['CB-7'].text).toContain('ciclo menstrual');
  });
});
