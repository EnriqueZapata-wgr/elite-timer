import { describe, it, expect, vi } from 'vitest';

// collapseLanguageDuplicates es pura, pero importar el módulo arrastra `@/src/lib/supabase` y
// `@/src/lib/logger` (→ react-native) que rompen el transform de vitest. Los stubeamos como el
// test hermano (lab-values-service.test.ts).
vi.mock('@/src/lib/supabase', () => ({ supabase: { from: () => ({}) } }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { collapseLanguageDuplicates, type CanonicalMap, type CanonicalValue } from '@/src/services/edad-atp/lab-values-service';

/**
 * #labs-desmadre (23-jun) — collapseLanguageDuplicates funde la fila raw inglesa con su canónica
 * español en UN solo valor (display-only). Gana la más reciente. No toca el motor v2.
 */
const cv = (value: number, measured_at: string): CanonicalValue => ({
  value, measured_at, source: 'lab_pdf', is_stale: false,
});

describe('collapseLanguageDuplicates', () => {
  it('mapa vacío → vacío', () => {
    expect(collapseLanguageDuplicates({})).toEqual({});
  });

  it('sin duplicados de idioma → intacto', () => {
    const map: CanonicalMap = {
      glucosa_en_ayuno: cv(90, '2026-05-01'),
      colesterol_hdl: cv(55, '2026-05-01'),
    };
    expect(collapseLanguageDuplicates(map)).toEqual(map);
  });

  it('inglés + español del mismo biomarcador → 1 sola key español', () => {
    const map: CanonicalMap = {
      testosterone: cv(994, '2026-05-10'),
      testosterona_total: cv(9.93, '2026-04-01'),
    };
    const out = collapseLanguageDuplicates(map);
    expect(Object.keys(out)).toEqual(['testosterona_total']);
    // gana la más reciente (testosterone, 2026-05-10) bajo la key canónica español.
    expect(out.testosterona_total.value).toBe(994);
  });

  it('más reciente gana sin importar el idioma de origen', () => {
    const map: CanonicalMap = {
      glucose: cv(86, '2026-03-01'),          // inglés, viejo
      glucosa_en_ayuno: cv(99, '2026-06-01'), // español, nuevo
    };
    const out = collapseLanguageDuplicates(map);
    expect(Object.keys(out)).toEqual(['glucosa_en_ayuno']);
    expect(out.glucosa_en_ayuno.value).toBe(99);
  });

  it('no colapsa biomarcadores distintos que comparten doble-key de matriz (ggt)', () => {
    const map: CanonicalMap = {
      ggt: cv(30, '2026-05-01'),
      gama_glutamil_transferasa: cv(30, '2026-05-01'),
    };
    const out = collapseLanguageDuplicates(map);
    // ambos sobreviven (multi-key excluido del colapso) — es un FLAG documentado, no un fix.
    expect(Object.keys(out).sort()).toEqual(['gama_glutamil_transferasa', 'ggt']);
  });
});
