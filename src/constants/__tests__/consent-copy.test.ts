import { describe, it, expect } from 'vitest';
import {
  CONSENT_CHECKBOXES,
  CONSENT_BY_ID,
  CONSENT_SHORT_TITLES,
  AVISO_VERSION,
} from '../consent-copy';
import { sha256Hex } from '../../utils/sha256';

describe('consent-copy (Sprint Compliance 2: Aviso Parte 3)', () => {
  it('existen los 7 checkboxes CB-1..CB-7', () => {
    expect(CONSENT_CHECKBOXES).toHaveLength(7);
    expect(CONSENT_CHECKBOXES.map(c => c.id)).toEqual(
      ['CB-1', 'CB-2', 'CB-3', 'CB-4', 'CB-5', 'CB-6', 'CB-7'],
    );
  });

  it('CB-1..CB-4 obligatorios, CB-5..CB-7 opcionales', () => {
    for (const c of CONSENT_CHECKBOXES) {
      const shouldBeRequired = ['CB-1', 'CB-2', 'CB-3', 'CB-4'].includes(c.id);
      expect(c.required, c.id).toBe(shouldBeRequired);
    }
  });

  /**
   * RE-APUNTADO el 7 de septiembre de 2026 (pivote limpio, paso 0).
   *
   * Antes fijaba CB-2..CB-5 en 'onboarding'. La revisión legal de ese día movió
   * tres superficies y este candado tenía que moverse con ellas, con la razón
   * por escrito:
   *   · CB-3 y CB-4 a 'register'. Los proveedores de EE. UU. (Supabase, Sentry,
   *     PostHog) tratan datos desde que se crea la cuenta, así que diferir CB-3
   *     sería transferir antes de consentir; y CB-4, la mayoría de edad, es la
   *     condición de validez de todos los demás consentimientos.
   *   · CB-2 a 'contextual'. La LFPDPPP exige consentimiento previo al
   *     TRATAMIENTO, no previo al registro: se pide en la pantalla que va a
   *     escribir el primer dato de salud.
   * Lo que NO se movió: ningún `text`. Por eso AVISO_VERSION sigue en 1.0.
   */
  it('superficies tras el pivote: CB-1/3/4 register, CB-5 onboarding, CB-2/6/7 contextuales', () => {
    for (const id of ['CB-1', 'CB-3', 'CB-4'] as const) {
      expect(CONSENT_BY_ID[id].surface, id).toBe('register');
    }
    expect(CONSENT_BY_ID['CB-5'].surface).toBe('onboarding');
    for (const id of ['CB-2', 'CB-6', 'CB-7'] as const) {
      expect(CONSENT_BY_ID[id].surface, id).toBe('contextual');
    }
  });

  /**
   * Los tres de la puerta son exactamente los que el guardia exige para abrir
   * la app (acceso-consentido-core). Si alguien agrega o quita uno de aquí sin
   * tocar al guardia, los dos lados dejan de decir lo mismo.
   */
  it('los obligatorios de la puerta son CB-1, CB-3 y CB-4', () => {
    const puerta = CONSENT_CHECKBOXES.filter(c => c.surface === 'register').map(c => c.id);
    expect(puerta).toEqual(['CB-1', 'CB-3', 'CB-4']);
    for (const id of puerta) expect(CONSENT_BY_ID[id].required, id).toBe(true);
  });

  it('cada texto es hasheable y no vacío (texto_hash del log)', () => {
    for (const c of CONSENT_CHECKBOXES) {
      expect(c.text.length).toBeGreaterThan(20);
      expect(sha256Hex(c.text)).toMatch(/^[0-9a-f]{64}$/);
      expect(CONSENT_SHORT_TITLES[c.id].length).toBeGreaterThan(3);
    }
  });

  it('textos exactos ancla (si cambian, hay que subir AVISO_VERSION)', () => {
    // 7-sep-2026: el pivote movió superficies y NO textos, así que la versión
    // se queda en 1.0. Subirla sin cambiar una cadena tiraría a la basura
    // hashes que son evidencia válida de lo que la gente ya aceptó.
    expect(AVISO_VERSION).toBe('1.0');
    expect(CONSENT_BY_ID['CB-4'].text).toBe('Confirmo que soy mayor de 18 años.');
    expect(CONSENT_BY_ID['CB-2'].text).toContain('datos personales sensibles de salud');
    expect(CONSENT_BY_ID['CB-3'].text).toContain('proveedores en Estados Unidos');
    expect(CONSENT_BY_ID['CB-6'].text).toContain('ElevenLabs');
    expect(CONSENT_BY_ID['CB-7'].text).toContain('ciclo menstrual');
  });
});
