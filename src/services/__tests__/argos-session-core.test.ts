/**
 * MB-21 Pieza 2 — la regla "una sesión de app es una conversación".
 *
 * Estas decisiones definen QUÉ conversación ve el usuario al abrir ARGOS:
 *  - shouldRotateSession: el umbral de background con nombre (no un número
 *    suelto en medio de una función).
 *  - shouldAttemptResume + resumeTarget: la decisión central de autoLoadRecent,
 *    que antes no tenía test y este run cambia.
 */
import { describe, it, expect } from 'vitest';
import {
  ARGOS_SESSION_BACKGROUND_THRESHOLD_MS,
  shouldRotateSession,
  shouldAttemptResume,
  resumeTarget,
} from '@/src/services/argos-session-core';

const NOW = 1_800_000_000_000;

describe('ARGOS_SESSION_BACKGROUND_THRESHOLD_MS — el valor con nombre', () => {
  it('es 5 minutos: separa "me interrumpieron" de "ya me fui"', () => {
    expect(ARGOS_SESSION_BACKGROUND_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });
});

describe('shouldRotateSession — volver del background', () => {
  it('nunca se fue al fondo → no rota', () => {
    expect(shouldRotateSession(null, NOW)).toBe(false);
  });

  it('contestar una llamada de 30 segundos es LA MISMA sesión', () => {
    expect(shouldRotateSession(NOW - 30_000, NOW)).toBe(false);
  });

  it('justo debajo del umbral → misma sesión', () => {
    expect(shouldRotateSession(NOW - (ARGOS_SESSION_BACKGROUND_THRESHOLD_MS - 1), NOW)).toBe(false);
  });

  it('en el umbral exacto → sesión nueva', () => {
    expect(shouldRotateSession(NOW - ARGOS_SESSION_BACKGROUND_THRESHOLD_MS, NOW)).toBe(true);
  });

  it('media hora al fondo → sesión nueva', () => {
    expect(shouldRotateSession(NOW - 30 * 60 * 1000, NOW)).toBe(true);
  });
});

describe('shouldAttemptResume — cuándo ni intentar', () => {
  const base = { hasMessages: false, activeConversationId: null, requestedNew: false };

  it('pantalla en blanco sin pedido de nueva → sí intenta', () => {
    expect(shouldAttemptResume(base)).toBe(true);
  });

  it('new=1 (desde el historial) → no', () => {
    expect(shouldAttemptResume({ ...base, requestedNew: true })).toBe(false);
  });

  it('ya hay mensajes en pantalla → no', () => {
    expect(shouldAttemptResume({ ...base, hasMessages: true })).toBe(false);
  });

  it('ya hay conversación activa → no', () => {
    expect(shouldAttemptResume({ ...base, activeConversationId: 'c1' })).toBe(false);
  });
});

describe('resumeTarget — la decisión central de autoLoadRecent', () => {
  const SESSION = 'session-actual';

  it('sin conversaciones → en blanco', () => {
    expect(resumeTarget(null, SESSION)).toBeNull();
    expect(resumeTarget(undefined, SESSION)).toBeNull();
  });

  it('la más reciente es de ESTA sesión → se retoma', () => {
    expect(resumeTarget({ id: 'c1', session_id: SESSION }, SESSION)).toBe('c1');
  });

  it('la más reciente es de OTRA sesión (app reabierta) → en blanco', () => {
    // LA mutación que este test entierra: quitar el corte por sesión y volver
    // al comportamiento viejo (retomar una charla de hace tres semanas).
    expect(resumeTarget({ id: 'c1', session_id: 'sesion-de-hace-3-semanas' }, SESSION)).toBeNull();
  });

  it('tras "nueva conversación" (ancla rotada) la anterior NO resucita al cambiar de tab', () => {
    // El bug de hoy: nueva → cambiar de tab → volver → recargaba la última.
    const rotated = 'session-rotada-por-nueva';
    expect(resumeTarget({ id: 'c1', session_id: SESSION }, rotated)).toBeNull();
  });

  it('conversación pre-migración (session_id null) → en blanco, no se resucita', () => {
    expect(resumeTarget({ id: 'c1', session_id: null }, SESSION)).toBeNull();
    expect(resumeTarget({ id: 'c1' }, SESSION)).toBeNull();
  });
});
