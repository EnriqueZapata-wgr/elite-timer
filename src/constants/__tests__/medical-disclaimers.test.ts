import { describe, it, expect } from 'vitest';
import {
  mustShowDisclaimer,
  MEDICAL_DISCLAIMER_VERSION,
  DISCLAIMERS,
  DISCLAIMER_SECTIONS,
} from '../medical-disclaimers';

describe('mustShowDisclaimer (#42)', () => {
  it('nunca aceptó → mostrar', () => {
    expect(mustShowDisclaimer(null, null)).toBe(true);
    expect(mustShowDisclaimer(undefined, undefined)).toBe(true);
  });

  it('aceptó la versión vigente → no mostrar', () => {
    expect(mustShowDisclaimer('2026-07-06T00:00:00Z', MEDICAL_DISCLAIMER_VERSION)).toBe(false);
  });

  it('aceptó versión vieja → re-mostrar (version bump)', () => {
    expect(mustShowDisclaimer('2026-01-01T00:00:00Z', '0.9')).toBe(true);
  });

  it('aceptó pero sin versión registrada → re-mostrar', () => {
    expect(mustShowDisclaimer('2026-01-01T00:00:00Z', null)).toBe(true);
  });

  it('versión explícita distinta a la pasada como vigente', () => {
    expect(mustShowDisclaimer('2026-01-01T00:00:00Z', '1.0', '2.0')).toBe(true);
    expect(mustShowDisclaimer('2026-01-01T00:00:00Z', '2.0', '2.0')).toBe(false);
  });
});

describe('contenido de disclaimers', () => {
  it('todas las secciones del modal referencian copy existente', () => {
    for (const sec of DISCLAIMER_SECTIONS) {
      expect(DISCLAIMERS[sec.feature]).toBeTruthy();
      expect(DISCLAIMERS[sec.feature].length).toBeGreaterThan(40);
    }
  });

  it('la versión vigente es semántica', () => {
    expect(MEDICAL_DISCLAIMER_VERSION).toMatch(/^\d+\.\d+$/);
  });
});
