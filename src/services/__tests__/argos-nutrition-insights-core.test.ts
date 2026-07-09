import { describe, it, expect } from 'vitest';
import {
  shouldGenerateInsight,
  buildPostMealPrompt,
  sanitizeInsightText,
  INSIGHT_MIN_GAP_MINUTES,
} from '@/src/services/argos-nutrition-insights-core';

const NOW = 1_700_000_000_000;

describe('shouldGenerateInsight — opt-in + throttle (T6)', () => {
  it('flag OFF → nunca (default no invasivo)', () => {
    expect(shouldGenerateInsight({ enabled: false, lastGeneratedAt: null, now: NOW })).toBe(false);
  });
  it('flag ON sin insight previo → sí', () => {
    expect(shouldGenerateInsight({ enabled: true, lastGeneratedAt: null, now: NOW })).toBe(true);
  });
  it('throttle: dentro del gap → no; pasado el gap → sí', () => {
    const gap = INSIGHT_MIN_GAP_MINUTES * 60_000;
    expect(shouldGenerateInsight({ enabled: true, lastGeneratedAt: NOW - gap + 1000, now: NOW })).toBe(false);
    expect(shouldGenerateInsight({ enabled: true, lastGeneratedAt: NOW - gap, now: NOW })).toBe(true);
  });
});

describe('buildPostMealPrompt', () => {
  it('incluye comida, proteína vs target y score cuando existe', () => {
    const p = buildPostMealPrompt({
      description: 'Salmón con aguacate',
      proteinG: 92.4, proteinTargetG: 144, scoreToday: 68, mealsToday: 2,
    });
    expect(p.user).toContain('Salmón con aguacate');
    expect(p.user).toContain('92/144g');
    expect(p.user).toContain('68/100');
    expect(p.system).toContain('máximo 2 oraciones');
  });
  it('sin score → no lo menciona; sin descripción → placeholder', () => {
    const p = buildPostMealPrompt({ description: '', proteinG: 0, proteinTargetG: 126, scoreToday: null, mealsToday: 1 });
    expect(p.user).not.toContain('Score');
    expect(p.user).toContain('sin descripción');
  });
});

describe('sanitizeInsightText', () => {
  it('texto válido pasa recortado', () => {
    expect(sanitizeInsightText('  Buena proteína hoy. Suma vegetales fibrosos en la cena.  '))
      .toBe('Buena proteína hoy. Suma vegetales fibrosos en la cena.');
  });
  it('vacío / muy corto / no-string → null', () => {
    expect(sanitizeInsightText('')).toBeNull();
    expect(sanitizeInsightText('ok')).toBeNull();
    expect(sanitizeInsightText(undefined)).toBeNull();
    expect(sanitizeInsightText(42)).toBeNull();
  });
  it('muy largo se trunca (≤280) con elipsis', () => {
    const out = sanitizeInsightText('x'.repeat(400))!;
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out.endsWith('…')).toBe(true);
  });
});
