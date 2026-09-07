import { describe, it, expect } from 'vitest';
import {
  V2_STEPS,
  nextV2Step,
  prevV2Step,
  v2Route,
  v2StepNumber,
  resolveOnboardingRoute,
  RUTA_PUERTA_CONSENTIMIENTOS,
  CONSENTIMIENTOS_DEL_MURO,
  cycleModalityOptions,
  defaultCycleModality,
  computeChronotype,
  CHRONO_QUESTIONS,
} from '../onboarding-v2-core';

describe('flujo de steps v2', () => {
  it('9 steps: posicionamiento → consentimiento antes de capturar datos', () => {
    expect(V2_STEPS).toHaveLength(9);
    expect(V2_STEPS[0]).toBe('welcome');
    expect(V2_STEPS[1]).toBe('positioning');
    expect(V2_STEPS[2]).toBe('privacy');
    expect(V2_STEPS[3]).toBe('profile');
    expect(V2_STEPS[8]).toBe('notifications');
  });

  it('nextV2Step encadena y termina en null', () => {
    expect(nextV2Step('welcome')).toBe('positioning');
    expect(nextV2Step('positioning')).toBe('privacy');
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
    expect(v2StepNumber('positioning')).toBe(2);
    expect(v2StepNumber('privacy')).toBe(3);
    expect(v2StepNumber('notifications')).toBe(9);
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

  /**
   * CONTRATO RE-APUNTADO el 7-sep-2026 (pivote limpio, sección 6). Antes esto
   * exigía '/onboarding/v2/welcome'; ahora exige la primera sesión nueva.
   *
   * LA RAZÓN, por escrito: el destino de un paso desconocido es "empieza la
   * primera sesión", y la primera sesión son ahora seis pantallas en
   * /primera-sesion, no diez en /onboarding/v2. El test no se aflojó (sigue
   * exigiendo una ruta exacta para los doce valores): se le cambió el destino
   * porque el destino cambió.
   */
  it('valores legacy v1 y desconocidos → la primera sesión nueva', () => {
    for (const legacy of ['pending', 'basics', 'goal', 'chronotype', 'health', 'nutrition', 'context', 'edad_atp', 'voice_config', 'v2_bogus', null, undefined]) {
      expect(resolveOnboardingRoute(legacy as any)).toBe('/primera-sesion/preguntas');
    }
  });

  it('los pasos de la primera sesión resuelven a su pantalla', () => {
    expect(resolveOnboardingRoute('ps_preguntas')).toBe('/primera-sesion/preguntas');
    expect(resolveOnboardingRoute('ps_armado')).toBe('/primera-sesion/armado');
    expect(resolveOnboardingRoute('ps_dia-1')).toBe('/primera-sesion/dia-1');
  });

  /**
   * 7-sep-2026. En producción hay UN perfil con onboarding_step='pending', de
   * 13. Es el único que no terminó, y el pivote no puede dejarlo sin salida ni
   * reescribirle el paso en la base (sería cambiarle un dato en silencio). Se
   * comprueba aparte del resto de los legacy porque es una persona real y no
   * un valor teórico.
   */
  it("el perfil real con 'pending' tiene ruta y no se queda colgado", () => {
    // 7-sep-2026: su ruta ahora es la primera sesión nueva. Lo que importa de
    // este test no cambió: tiene ruta, no es null, y a su fila no se le tocó
    // ni un campo para conseguirlo.
    expect(resolveOnboardingRoute('pending')).toBe('/primera-sesion/preguntas');
    expect(resolveOnboardingRoute('pending')).not.toBeNull();
  });

  /**
   * El otro lado de la misma promesa: los 12 perfiles que SÍ terminaron no se
   * mandan de vuelta a empezar. 'completed' sigue siendo null (a las
   * pestañas), y ningún cambio del pivote lo toca.
   */
  it('los perfiles que ya terminaron siguen entrando derecho a la app', () => {
    expect(resolveOnboardingRoute('completed')).toBeNull();
  });
});

describe('reparto de consentimientos tras el pivote (7-sep-2026)', () => {
  it('la puerta legal vive fuera del onboarding', () => {
    // No es un step: quien la ve ya tiene cuenta y datos. Si algún día se
    // vuelve un step, este test lo caza.
    expect(RUTA_PUERTA_CONSENTIMIENTOS).toBe('/consentimientos');
    expect(V2_STEPS).not.toContain('consentimientos');
  });

  it('al muro solo le queda CB-5, que es opcional', () => {
    // CB-1/3/4 se firman en register y CB-2 en el punto de uso. Si esta lista
    // se vacía, el muro se puede retirar del flujo sin pasar por Legal.
    expect([...CONSENTIMIENTOS_DEL_MURO]).toEqual(['CB-5']);
  });
});

describe('modalidad de ciclo (task #111)', () => {
  it('mujer: 4 opciones con regular default', () => {
    const opts = cycleModalityOptions('female').map(o => o.value);
    expect(opts).toEqual(['regular', 'pregnancy', 'menopause', 'no_cycle']);
    expect(defaultCycleModality('female')).toBe('regular');
  });

  it('hombre: disabled default (partner retirado de la UI, E-5 MB-12)', () => {
    const opts = cycleModalityOptions('male').map(o => o.value);
    expect(opts).toEqual(['disabled']);
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
