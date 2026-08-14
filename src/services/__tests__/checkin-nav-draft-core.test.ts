/**
 * OLA5 pieza 2 — el borrador que rescata el re-check-in.
 *
 * El caso normal lo cubre el ref en memoria: la pantalla del check-in sigue
 * montada bajo /breathing y al volver el useFocusEffect reencuentra el paso.
 * Esto prueba el caso feo (proceso muerto) y, sobre todo, que un borrador
 * viejo o corrupto NUNCA secuestre un check-in nuevo.
 */
import { describe, it, expect } from 'vitest';
import { isNavDraftFresh, parseNavDraft, NAV_DRAFT_TTL_MS } from '../checkin-nav-draft-core';

const NOW = 1_800_000_000_000;
const draft = (savedAt: number) =>
  JSON.stringify({ emotionId: 'anxious', chainIds: ['anxious', 'tense', 'calm'], savedAt });

describe('ventana del borrador', () => {
  it('la ventana es de 30 minutos', () => {
    expect(NAV_DRAFT_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('recién guardado está fresco', () => {
    expect(isNavDraftFresh({ savedAt: NOW }, NOW)).toBe(true);
  });

  it('a 29 minutos sigue fresco; a 31 ya no', () => {
    expect(isNavDraftFresh({ savedAt: NOW - 29 * 60_000 }, NOW)).toBe(true);
    expect(isNavDraftFresh({ savedAt: NOW - 31 * 60_000 }, NOW)).toBe(false);
  });

  it('un reloj que se movió hacia atrás no tira el borrador del momento', () => {
    expect(isNavDraftFresh({ savedAt: NOW + 60_000 }, NOW)).toBe(true);
  });
});

describe('parseNavDraft — un borrador nuevo no se inventa', () => {
  it('devuelve el borrador cuando está en ventana', () => {
    expect(parseNavDraft(draft(NOW - 5 * 60_000), NOW)).toEqual({
      emotionId: 'anxious',
      chainIds: ['anxious', 'tense', 'calm'],
      savedAt: NOW - 5 * 60_000,
    });
  });

  it('fuera de la ventana es como si no existiera', () => {
    expect(parseNavDraft(draft(NOW - 2 * 60 * 60_000), NOW)).toBeNull();
  });

  it('sin borrador, null (no revienta)', () => {
    expect(parseNavDraft(null, NOW)).toBeNull();
    expect(parseNavDraft('', NOW)).toBeNull();
  });

  it('JSON corrupto no atrapa a nadie en una pantalla rota', () => {
    expect(parseNavDraft('{no es json', NOW)).toBeNull();
    expect(parseNavDraft('[]', NOW)).toBeNull();
    expect(parseNavDraft('null', NOW)).toBeNull();
  });

  it('payload incompleto se descarta entero', () => {
    expect(parseNavDraft(JSON.stringify({ chainIds: ['a'], savedAt: NOW }), NOW)).toBeNull();
    expect(parseNavDraft(JSON.stringify({ emotionId: 'anxious', savedAt: NOW }), NOW)).toBeNull();
    expect(parseNavDraft(JSON.stringify({ emotionId: 'anxious', chainIds: ['a'] }), NOW)).toBeNull();
    expect(parseNavDraft(JSON.stringify({ emotionId: '', chainIds: ['a'], savedAt: NOW }), NOW)).toBeNull();
    expect(parseNavDraft(JSON.stringify({ emotionId: 'anxious', chainIds: [1, 2], savedAt: NOW }), NOW)).toBeNull();
  });
});
