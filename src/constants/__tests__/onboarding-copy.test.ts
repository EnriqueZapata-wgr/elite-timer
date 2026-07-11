/**
 * Onboarding v2 copy — estructura y sensibilidad (Sprint ONBOARDING épico T4).
 */
import { describe, it, expect } from 'vitest';
import { ONBOARDING_COPY } from '../onboarding-copy';

/** Recorre un objeto anidado y devuelve todos los strings hoja. */
function allStrings(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(allStrings);
  if (obj && typeof obj === 'object') return Object.values(obj).flatMap(allStrings);
  return [];
}

describe('onboarding-copy · estructura', () => {
  it('cubre las 7 pantallas del flow v2 + common', () => {
    for (const key of ['welcome', 'profile', 'goal', 'cycle', 'chronotype', 'consent', 'notifications', 'common'] as const) {
      expect(ONBOARDING_COPY[key]).toBeDefined();
    }
  });

  it('ninguna cadena está vacía', () => {
    const strings = allStrings(ONBOARDING_COPY);
    expect(strings.length).toBeGreaterThan(30);
    for (const s of strings) expect(s.trim().length).toBeGreaterThan(0);
  });

  it('consent conserva los 5 disclaimers médicos y el checkbox explícito', () => {
    expect(ONBOARDING_COPY.consent.points).toHaveLength(5);
    expect(ONBOARDING_COPY.consent.checkbox).toMatch(/no sustituye atención médica/i);
    // Compliance: nunca prometer diagnóstico/tratamiento.
    expect(ONBOARDING_COPY.consent.points[0].text).toMatch(/No diagnostica/i);
  });

  it('consent incluye los 3 disclaimers aprobados por Mariana (doc 06, >>)', () => {
    const texts = ONBOARDING_COPY.consent.points.map((p) => p.text).join(' ');
    // 1) ATP no reemplaza consulta médica o nutricional.
    expect(texts).toMatch(/no reemplaza una consulta médica o nutricional/i);
    // 2) Recomendaciones basadas en medicina funcional, no sustituyen consulta personalizada.
    expect(texts).toMatch(/medicina funcional/i);
    expect(texts).toMatch(/no sustituyen una consulta personalizada/i);
    // 3) Consentimiento explícito para procesamiento IA.
    expect(texts).toMatch(/consentimiento explícito/i);
    expect(texts).toMatch(/inteligencia artificial/i);
  });

  it('el skip existe con advertencia leve (no bloqueante, no culposa)', () => {
    const c = ONBOARDING_COPY.common;
    expect(c.skip.length).toBeGreaterThan(0);
    expect(c.skipTitle).toMatch(/\?/);
    expect(c.skipBody).toMatch(/después/i);
    expect(c.skipCancel.length).toBeGreaterThan(0);
    expect(c.skipConfirm.length).toBeGreaterThan(0);
  });

  it('notifications: 3 razones honestas con título y descripción', () => {
    expect(ONBOARDING_COPY.notifications.reasons).toHaveLength(3);
    for (const r of ONBOARDING_COPY.notifications.reasons) {
      expect(r.title.trim().length).toBeGreaterThan(0);
      expect(r.desc.trim().length).toBeGreaterThan(0);
      expect(r.icon.trim().length).toBeGreaterThan(0);
    }
    expect(ONBOARDING_COPY.notifications.skip.length).toBeGreaterThan(0);
  });
});
