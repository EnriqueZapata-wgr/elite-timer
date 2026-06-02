import { describe, it, expect } from 'vitest';
import { markGap, blocksIntervention, detectMissingCriticalData } from '../gap-marker';

describe('gap-marker (pure)', () => {
  it('markGap crítico incluye field y [CRÍTICO]', () => {
    const m = markGap('HbA1c', 'critico');
    expect(m).toContain('HbA1c');
    expect(m).toContain('[CRÍTICO]');
  });

  it('markGap accesorio NO incluye [CRÍTICO]', () => {
    const m = markGap('peso', 'accesorio');
    expect(m).not.toContain('[CRÍTICO]');
    expect(m).toContain('[ACCESORIO]');
  });

  it('blocksIntervention crítico → true', () => {
    expect(blocksIntervention('critico')).toBe(true);
  });

  it('blocksIntervention accesorio → false', () => {
    expect(blocksIntervention('accesorio')).toBe(false);
  });

  it('detectMissingCriticalData devuelve 1 entrada para el dato faltante', () => {
    const gaps = detectMissingCriticalData({ peso: 78 }, [
      { field: 'peso', criticality: 'critico' },
      { field: 'glucosa', criticality: 'critico' },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].field).toBe('glucosa');
  });

  it('detectMissingCriticalData devuelve 0 cuando todo está presente', () => {
    const gaps = detectMissingCriticalData({ peso: 78 }, [{ field: 'peso', criticality: 'critico' }]);
    expect(gaps).toHaveLength(0);
  });
});
