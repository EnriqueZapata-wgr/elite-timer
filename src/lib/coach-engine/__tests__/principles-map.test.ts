import { describe, it, expect, vi } from 'vitest';

// principles-map importa @/src/lib/supabase (para invokePrinciple).
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { PRINCIPLES_CATALOG, describePrinciple } from '../principles-map';

describe('principles-map (pure)', () => {
  it('el catálogo tiene 8 entradas (3 biológicos + 4 mentales + contexto)', () => {
    expect(PRINCIPLES_CATALOG.length).toBe(8);
  });

  it('el catálogo contiene los principios clave', () => {
    const keys = PRINCIPLES_CATALOG.map((p) => p.key);
    expect(keys).toContain('identidad');
    expect(keys).toContain('estandar');
    expect(keys).toContain('fisiologia');
    expect(keys).toContain('contexto');
  });

  it('describePrinciple devuelve un string no vacío', () => {
    const desc = describePrinciple('identidad');
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });
});
