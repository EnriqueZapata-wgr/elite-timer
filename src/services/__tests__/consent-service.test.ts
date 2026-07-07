import { describe, it, expect } from 'vitest';
import { CONSENT_DEFAULTS, CONSENT_META } from '../consent-core';

describe('consent (#132)', () => {
  it('defaults alineados al schema de la migración 100', () => {
    expect(CONSENT_DEFAULTS).toEqual({
      analytics_posthog: true,
      argos_persistent_memory: true,
      marketing_communications: false,
      share_anonymized_research: false,
      share_with_clinician: true,
    });
  });

  it('los 5 toggles del spec están en CONSENT_META con descripción', () => {
    expect(CONSENT_META).toHaveLength(5);
    const keys = CONSENT_META.map(m => m.key);
    expect(keys).toEqual([
      'analytics_posthog',
      'argos_persistent_memory',
      'marketing_communications',
      'share_anonymized_research',
      'share_with_clinician',
    ]);
    for (const m of CONSENT_META) {
      expect(m.title.length).toBeGreaterThan(3);
      expect(m.description.length).toBeGreaterThan(10);
    }
  });
});
