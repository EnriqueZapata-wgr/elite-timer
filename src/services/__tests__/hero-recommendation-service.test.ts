import { describe, it, expect } from 'vitest';
import {
  getHeroRecommendation,
  HERO_RULES,
  type HeroContext,
} from '../hero-recommendation-service';

/** Contexto base neutro: mediodía, todo registrado, sin señales especiales. */
function ctx(partial: Partial<HeroContext> = {}): HeroContext {
  return {
    hour: 12,
    score: 50,
    streak: 3,
    waterMl: 1000,
    waterTargetMl: 2000,
    proteinG: 60,
    proteinTargetG: 120,
    sunDone: true,
    meditationDone: true,
    journalDone: true,
    fastingActive: false,
    sex: 'male',
    cyclePhase: null,
    edadAtpDelta: 0.6,
    ...partial,
  };
}

describe('getHeroRecommendation (#68) — reglas por prioridad', () => {
  it('1. ayuno activo en la mañana → no romper', () => {
    const r = getHeroRecommendation(ctx({ hour: 8, fastingActive: true }));
    expect(r.id).toBe('ayuno-manana');
    expect(r.route).toBe('/fasting');
  });

  it('2. ayuno activo a mediodía → romper con proteína', () => {
    const r = getHeroRecommendation(ctx({ hour: 13, fastingActive: true }));
    expect(r.id).toBe('ayuno-romper');
  });

  it('3. sin agua después de las 8 → registrar inline (#136: quickAction, ya no navega)', () => {
    const r = getHeroRecommendation(ctx({ hour: 11, waterMl: 0 }));
    expect(r.id).toBe('agua-pendiente');
    expect(r.quickAction).toEqual({ type: 'water', amountMl: 250 });
  });

  it('4. el ayuno silencia el nag de agua (no está comiendo/bebiendo calorías)', () => {
    const r = getHeroRecommendation(ctx({ hour: 8, waterMl: 0, fastingActive: true }));
    expect(r.id).toBe('ayuno-manana');
  });

  it('5. sin proteína después de las 11 → agregar proteína', () => {
    const r = getHeroRecommendation(ctx({ hour: 12, proteinG: 0 }));
    expect(r.id).toBe('proteina-pendiente');
  });

  it('6. sin sol en la mañana (≥7am) → sal al sol', () => {
    const r = getHeroRecommendation(ctx({ hour: 9, sunDone: false, score: 40 }));
    expect(r.id).toBe('sol-pendiente');
    expect(r.route).toBe('/solar');
  });

  it('7. hidratación <50% en la tarde → recuperar', () => {
    const r = getHeroRecommendation(ctx({ hour: 16, waterMl: 400, waterTargetMl: 2000, score: 80 }));
    expect(r.id).toBe('agua-mitad');
    expect(r.subtitle).toContain('400');
  });

  it('8. prioridad: agua pendiente gana sobre reglas de ciclo', () => {
    const r = getHeroRecommendation(ctx({
      hour: 12, waterMl: 0, sex: 'female', cyclePhase: 'menstrual',
    }));
    expect(r.id).toBe('agua-pendiente');
  });

  it('9. fase menstrual → escucha tu cuerpo (hierro)', () => {
    const r = getHeroRecommendation(ctx({ sex: 'female', cyclePhase: 'menstrual' }));
    expect(r.id).toBe('ciclo-menstrual');
    expect(r.subtitle.toLowerCase()).toContain('hierro');
  });

  it('10. fase folicular en la mañana → entrenamiento intenso', () => {
    const r = getHeroRecommendation(ctx({ hour: 9, sex: 'female', cyclePhase: 'follicular' }));
    expect(r.id).toBe('ciclo-folicular');
  });

  it('11. fase lútea en la tarde → baja intensidad', () => {
    const r = getHeroRecommendation(ctx({ hour: 17, sex: 'female', cyclePhase: 'luteal', score: 75 }));
    expect(r.id).toBe('ciclo-lutea');
  });

  it('12. hombre nunca recibe reglas de ciclo', () => {
    const r = getHeroRecommendation(ctx({ sex: 'male', cyclePhase: 'menstrual' }));
    expect(r.id).not.toContain('ciclo');
  });

  it('13. racha ≥7 con día incompleto → no la pierdas', () => {
    const r = getHeroRecommendation(ctx({ streak: 12, score: 60 }));
    expect(r.id).toBe('racha-fuerte');
    expect(r.title).toContain('12');
  });

  it('14. racha en 0 + tarde floja → nueva racha', () => {
    const r = getHeroRecommendation(ctx({ hour: 17, streak: 0, score: 20 }));
    expect(r.id).toBe('racha-nueva');
  });

  it('15. sin Edad ATP calculada (mediodía) → completa tus tests', () => {
    const r = getHeroRecommendation(ctx({ edadAtpDelta: null }));
    expect(r.id).toBe('edad-atp-pendiente');
    expect(r.route).toBe('/edad-atp');
  });

  it('16. Edad ATP mayor que cronológica → foco biomarcadores', () => {
    const r = getHeroRecommendation(ctx({ edadAtpDelta: -2.4 }));
    expect(r.id).toBe('edad-atp-mayor');
  });

  it('17. Edad ATP menor (mañana) → sigues joven', () => {
    const r = getHeroRecommendation(ctx({ hour: 9, edadAtpDelta: 3.2, score: 45 }));
    expect(r.id).toBe('edad-atp-joven');
    expect(r.title).toContain('3');
  });

  it('18. noche sin meditación ni journal → cerrar en calma', () => {
    const r = getHeroRecommendation(ctx({ hour: 20, meditationDone: false, journalDone: false, score: 75 }));
    expect(r.id).toBe('noche-mente');
  });

  it('19. noche tardía → reducir pantallas', () => {
    const r = getHeroRecommendation(ctx({ hour: 22, score: 75 }));
    expect(r.id).toBe('noche-pantallas');
  });

  it('20. score ≥90 → día casi perfecto', () => {
    const r = getHeroRecommendation(ctx({ hour: 18, score: 95, streak: 5, edadAtpDelta: 0.2 }));
    expect(r.id).toBe('dia-completo');
    expect(r.subtitle).toContain('95');
  });

  it('21. fallback: SIEMPRE devuelve algo', () => {
    const r = getHeroRecommendation(ctx({
      hour: 14, score: 75, streak: 3, edadAtpDelta: 0.2,
      meditationDone: true, journalDone: true,
    }));
    expect(r.title.length).toBeGreaterThan(5);
    expect(r.subtitle.length).toBeGreaterThan(5);
  });

  // ── #136: ventanas horarias + fallbacks contextuales ──

  it('22. agua NO dispara a las 21h (ventana 8-20) — el bug de las 7pm', () => {
    const r = getHeroRecommendation(ctx({ hour: 21, waterMl: 0 }));
    expect(r.id).not.toBe('agua-pendiente');
    expect(r.id).toBe('noche-pantallas');
  });

  it('23. agua a las 19h usa copy vespertino con quick action, no "primer vaso"', () => {
    const r = getHeroRecommendation(ctx({ hour: 19, waterMl: 0 }));
    expect(r.id).toBe('agua-pendiente');
    expect(r.title.toLowerCase()).not.toContain('primer');
    expect(r.quickAction).toEqual({ type: 'water', amountMl: 250 });
  });

  it('24. agua en la mañana mantiene el copy "primer vaso"', () => {
    const r = getHeroRecommendation(ctx({ hour: 9, waterMl: 0 }));
    expect(r.id).toBe('agua-pendiente');
    expect(r.title.toLowerCase()).toContain('primer');
  });

  it('25. sol NO dispara después de las 11h', () => {
    const r = getHeroRecommendation(ctx({ hour: 12, sunDone: false }));
    expect(r.id).not.toBe('sol-pendiente');
  });

  it('26. noche-mente NO dispara a las 19h (arranca a las 20h)', () => {
    const r = getHeroRecommendation(ctx({
      hour: 19, meditationDone: false, journalDone: false, edadAtpDelta: 0.2,
    }));
    expect(r.id).not.toBe('noche-mente');
    expect(r.id).toBe('fallback-noche');
  });

  it('27. fallback mañana → intención con Journal', () => {
    const r = getHeroRecommendation(ctx({ hour: 8, edadAtpDelta: 0.2 }));
    expect(r.id).toBe('fallback-manana');
    expect(r.route).toBe('/journal');
  });

  it('28. fallback mediodía → check-in', () => {
    const r = getHeroRecommendation(ctx({ hour: 14, edadAtpDelta: 0.2, score: 75 }));
    expect(r.id).toBe('fallback-mediodia');
    expect(r.route).toBe('/checkin');
  });

  it('29. fallback tarde → respiración', () => {
    const r = getHeroRecommendation(ctx({ hour: 16, edadAtpDelta: 0.2, score: 75 }));
    expect(r.id).toBe('fallback-tarde');
    expect(r.route).toBe('/breathing');
  });

  it('30. madrugada → dormir (antes empujaba lentes rojos a las 3am)', () => {
    const r = getHeroRecommendation(ctx({ hour: 2, edadAtpDelta: 0.2 }));
    expect(r.id).toBe('fallback-madrugada');
    expect(r.route).toBeUndefined();
  });

  it('31. agua-mitad en la tarde también trae quick action', () => {
    const r = getHeroRecommendation(ctx({ hour: 16, waterMl: 400, waterTargetMl: 2000, score: 80 }));
    expect(r.id).toBe('agua-mitad');
    expect(r.quickAction?.type).toBe('water');
  });

  it('todas las reglas tienen id único', () => {
    const ids = HERO_RULES.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('~20 reglas como pide el spec', () => {
    expect(HERO_RULES.length).toBeGreaterThanOrEqual(18);
  });
});
