import { describe, it, expect } from 'vitest';
import {
  V2_STEPS,
  nextV2Step,
  prevV2Step,
  v2Route,
  v2StepNumber,
  resolveOnboardingRoute,
  cycleModalityOptions,
  defaultCycleModality,
  computeChronotype,
  CHRONO_QUESTIONS,
} from '../onboarding-v2-core';

describe('flujo de steps v2', () => {
  it('8 steps en orden welcome → notifications (privacy = muro de consentimiento)', () => {
    expect(V2_STEPS).toHaveLength(8);
    expect(V2_STEPS[0]).toBe('welcome');
    expect(V2_STEPS[1]).toBe('privacy');
    expect(V2_STEPS[2]).toBe('profile');
    expect(V2_STEPS[7]).toBe('notifications');
  });

  it('nextV2Step encadena y termina en null', () => {
    expect(nextV2Step('welcome')).toBe('privacy');
    expect(nextV2Step('privacy')).toBe('profile');
    expect(nextV2Step('consent')).toBe('notifications');
    expect(nextV2Step('notifications')).toBeNull();
  });

  it('prevV2Step es simétrico', () => {
    for (let i = 1; i < V2_STEPS.length; i++) {
      expect(prevV2Step(V2_STEPS[i])).toBe(V2_STEPS[i - 1]);
    }
    expect(prevV2Step('welcome')).toBeNull();
  });

  it('v2Route y v2StepNumber', () => {
    expect(v2Route('cycle')).toBe('/onboarding/v2/cycle');
    expect(v2StepNumber('welcome')).toBe(1);
    expect(v2StepNumber('privacy')).toBe(2);
    expect(v2StepNumber('notifications')).toBe(8);
  });
});

describe('resolveOnboardingRoute (gate de app/index)', () => {
  it('completed → null (a tabs)', () => {
    expect(resolveOnboardingRoute('completed')).toBeNull();
  });

  it('v2_<step> → su pantalla', () => {
    expect(resolveOnboardingRoute('v2_privacy')).toBe('/onboarding/v2/privacy');
    expect(resolveOnboardingRoute('v2_profile')).toBe('/onboarding/v2/profile');
    expect(resolveOnboardingRoute('v2_notifications')).toBe('/onboarding/v2/notifications');
  });

  it('valores legacy v1 y desconocidos → v2 welcome', () => {
    for (const legacy of ['pending', 'basics', 'goal', 'chronotype', 'health', 'nutrition', 'context', 'edad_atp', 'voice_config', 'v2_bogus', null, undefined]) {
      expect(resolveOnboardingRoute(legacy as any)).toBe('/onboarding/v2/welcome');
    }
  });
});

describe('modalidad de ciclo (task #111)', () => {
  it('mujer: 4 opciones con regular default', () => {
    const opts = cycleModalityOptions('female').map(o => o.value);
    expect(opts).toEqual(['regular', 'pregnancy', 'menopause', 'no_cycle']);
    expect(defaultCycleModality('female')).toBe('regular');
  });

  it('hombre: disabled default + partner', () => {
    const opts = cycleModalityOptions('male').map(o => o.value);
    expect(opts).toEqual(['disabled', 'partner']);
    expect(defaultCycleModality('male')).toBe('disabled');
  });
});

describe('cronotipo rápido (scoring portado del v1)', () => {
  it('5 preguntas', () => {
    expect(CHRONO_QUESTIONS).toHaveLength(5);
  });

  it('todas las respuestas "a" → león', () => {
    const answers = Object.fromEntries(CHRONO_QUESTIONS.map(q => [q.id, 'a']));
    expect(computeChronotype(answers)).toBe('lion');
  });

  it('todas "b" → oso, todas "c" → lobo', () => {
    expect(computeChronotype(Object.fromEntries(CHRONO_QUESTIONS.map(q => [q.id, 'b'])))).toBe('bear');
    expect(computeChronotype(Object.fromEntries(CHRONO_QUESTIONS.map(q => [q.id, 'c'])))).toBe('wolf');
  });

  it('perfil delfín (sueño ligero q4/q6 = d)', () => {
    expect(computeChronotype({ q1: 'd', q2: 'd', q3: 'd', q4: 'd', q6: 'd' })).toBe('dolphin');
  });

  it('empate total (sin respuestas) → gana la primera key, igual que v1', () => {
    // Estado imposible en UI (las 5 preguntas son obligatorias); se documenta
    // el desempate heredado del scoring v1: orden de iteración → lion.
    expect(computeChronotype({})).toBe('lion');
  });
});
