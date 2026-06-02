import { describe, it, expect, vi } from 'vitest';

// red-flags-detector importa @/src/lib/supabase (para persist/getActiveFlags).
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { detectRedFlags, nextLifecyclePhase } from '../red-flags-detector';

describe('red-flags-detector — detectRedFlags (heurística)', () => {
  it('"dolor de pecho" → categoría sistemica_aguda', () => {
    // NOTA: el enum del schema usa 'sistemica_aguda' (no 'sistemicas_agudas').
    const flags = detectRedFlags('tengo dolor de pecho desde ayer');
    expect(flags.some((f) => f.category === 'sistemica_aguda')).toBe(true);
  });

  it('"amenorrea" → categoría marcador_fisiologico_clinico', () => {
    const flags = detectRedFlags('tengo amenorrea hace 4 meses');
    expect(flags.some((f) => f.category === 'marcador_fisiologico_clinico')).toBe(true);
  });

  it('cansancio normal → sin banderas', () => {
    expect(detectRedFlags('estoy bien, sólo cansancio normal')).toHaveLength(0);
  });
});

describe('red-flags-detector — nextLifecyclePhase (pure)', () => {
  it('active + 35 días + derivación → en_seguimiento', () => {
    expect(nextLifecyclePhase('active', 35, true, false)).toBe('en_seguimiento');
  });

  it('active + 20 días → sigue active (no cumple 30 días)', () => {
    expect(nextLifecyclePhase('active', 20, true, false)).toBe('active');
  });

  it('en_seguimiento + 100 días + derivación + resolución → silente', () => {
    expect(nextLifecyclePhase('en_seguimiento', 100, true, true)).toBe('silente');
  });

  it('en_seguimiento + 100 días sin resolución documentada → sigue en_seguimiento', () => {
    expect(nextLifecyclePhase('en_seguimiento', 100, true, false)).toBe('en_seguimiento');
  });

  it('silente + recurrencia (0 días) → vuelve a active', () => {
    expect(nextLifecyclePhase('silente', 0, true, true)).toBe('active');
  });

  it('active + recurrencia sin derivación → active', () => {
    expect(nextLifecyclePhase('active', 0, false, false)).toBe('active');
  });
});
