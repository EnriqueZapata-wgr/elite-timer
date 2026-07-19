/**
 * Regresión fix heredado (auditoría tramo 2): la card CRONOTIPO de YO mostraba
 * "Estado temporal · ancla Oso" hardcodeado para todo Delfín. Debe reflejar el
 * cronotipo MADRE real (raw_scores) — un Delfín con madre Lobo no puede leer Oso.
 *
 * Se testea la MISMA derivación que usa YoEditorialSection (motherChronotype),
 * espejo de agenda/motor/Mi Cronotipo.
 */
import { describe, it, expect } from 'vitest';
import { motherChronotype } from '@/src/services/interventions/intervention-agenda-core';

const NAME: Record<string, string> = { lion: 'León', bear: 'Oso', wolf: 'Lobo' };

/** Réplica de la lógica de subtitle del Delfín en YoEditorialSection. */
function dolphinDesc(rawScores: Record<string, number> | null | undefined): string {
  return `Estado temporal · base ${NAME[motherChronotype(rawScores)]}`;
}

describe('YO — desc del Delfín usa el cronotipo madre real', () => {
  it('madre Lobo → "base Lobo" (ya NO "ancla Oso" fijo)', () => {
    expect(dolphinDesc({ dolphin: 9, wolf: 7, bear: 4, lion: 2 })).toBe('Estado temporal · base Lobo');
  });
  it('madre León → "base León"', () => {
    expect(dolphinDesc({ dolphin: 8, lion: 6, bear: 3, wolf: 1 })).toBe('Estado temporal · base León');
  });
  it('sin raw_scores → base Oso (fallback doctrinal, no hardcode)', () => {
    expect(dolphinDesc(null)).toBe('Estado temporal · base Oso');
    expect(dolphinDesc(undefined)).toBe('Estado temporal · base Oso');
  });
});
