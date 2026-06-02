import { describe, it, expect, vi } from 'vitest';

// evidence-tag importa @/src/lib/supabase (para lookupEvidenceInCatalog).
// Lo mockeamos para no cargar react-native/expo en el entorno node.
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { hasEvidenceTag, extractEvidenceLevel, enforceEvidenceTag } from '../evidence-tag';

describe('evidence-tag (pure)', () => {
  it('hasEvidenceTag detecta "[Nivel N]"', () => {
    expect(hasEvidenceTag('Esto tiene [Nivel 3] evidencia')).toBe(true);
  });

  it('hasEvidenceTag false sin tag', () => {
    expect(hasEvidenceTag('Sin tag')).toBe(false);
  });

  it('hasEvidenceTag es case-insensible', () => {
    expect(hasEvidenceTag('[NIVEL 5]')).toBe(true);
  });

  it('extractEvidenceLevel devuelve el nivel', () => {
    expect(extractEvidenceLevel('[Nivel 5]')).toBe(5);
  });

  it('extractEvidenceLevel devuelve null sin tag', () => {
    expect(extractEvidenceLevel('sin nivel')).toBeNull();
  });

  it('enforceEvidenceTag marca el GAP cuando falta el tag', async () => {
    await expect(enforceEvidenceTag('sin tag')).resolves.toEqual({
      valid: false,
      missing: 'evidence-level-tag',
    });
  });

  it('enforceEvidenceTag valida cuando hay tag', async () => {
    await expect(enforceEvidenceTag('[Nivel 1] sólida')).resolves.toEqual({ valid: true });
  });
});
