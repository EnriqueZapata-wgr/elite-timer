/**
 * MB-7 — derivación de la máscara embarazo (semana gestacional + trimestre).
 * Especificado en migración 080, nunca construido hasta ahora.
 */
import { describe, it, expect } from 'vitest';
import { derivePregnancyProgress } from '../pregnancy';

const NOW = new Date(2026, 6, 18); // 2026-07-18 local

describe('derivePregnancyProgress', () => {
  it('sin is_pregnant → null', () => {
    expect(derivePregnancyProgress({ is_pregnant: false, due_date: '2026-12-01' }, NOW)).toBeNull();
    expect(derivePregnancyProgress(null, NOW)).toBeNull();
  });

  it('is_pregnant sin ninguna fecha → null (no se inventa etapa)', () => {
    expect(derivePregnancyProgress({ is_pregnant: true }, NOW)).toBeNull();
  });

  it('deriva la semana desde start_date (FUM)', () => {
    // FUM hace 24 semanas exactas.
    const start = new Date(NOW.getTime() - 24 * 7 * 86400000);
    const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const p = derivePregnancyProgress({ is_pregnant: true, start_date: iso }, NOW);
    expect(p?.week).toBe(24);
    expect(p?.trimester).toBe(2); // T2 = semanas 13-26
    expect(p?.label).toContain('Semana 24');
  });

  it('deriva la FUM desde due_date (due − 280 días)', () => {
    // due_date en 16 semanas → FUM hace 24 semanas → semana 24.
    const due = new Date(NOW.getTime() + 16 * 7 * 86400000);
    const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    const p = derivePregnancyProgress({ is_pregnant: true, due_date: iso }, NOW);
    expect(p?.week).toBe(24);
    expect(p?.daysToDue).toBe(16 * 7);
  });

  it('trimestres: <13 → 1, 13-26 → 2, 27+ → 3', () => {
    const wk = (n: number) => {
      const start = new Date(NOW.getTime() - n * 7 * 86400000);
      const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return derivePregnancyProgress({ is_pregnant: true, start_date: iso }, NOW)?.trimester;
    };
    expect(wk(6)).toBe(1);
    expect(wk(20)).toBe(2);
    expect(wk(30)).toBe(3);
  });

  it('fecha inválida → null', () => {
    expect(derivePregnancyProgress({ is_pregnant: true, due_date: 'no-fecha' }, NOW)).toBeNull();
  });
});
