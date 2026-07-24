import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetOwnNav, hasOwnNav, registerOwnNav, subscribeOwnNav } from '../nav-presence-core';

describe('nav-presence-core (V1.5.1 #8)', () => {
  beforeEach(() => _resetOwnNav());

  it('sin registros → sin nav propia', () => {
    expect(hasOwnNav()).toBe(false);
  });

  it('registrar → true; release → false', () => {
    const release = registerOwnNav();
    expect(hasOwnNav()).toBe(true);
    release();
    expect(hasOwnNav()).toBe(false);
  });

  it('overlap de transición (nueva registra antes de que la vieja suelte) no apaga', () => {
    const releaseOld = registerOwnNav();
    const releaseNew = registerOwnNav();
    releaseOld();
    expect(hasOwnNav()).toBe(true);
    releaseNew();
    expect(hasOwnNav()).toBe(false);
  });

  it('release idempotente — soltar dos veces no descuenta doble', () => {
    const releaseA = registerOwnNav();
    const releaseB = registerOwnNav();
    releaseA();
    releaseA();
    expect(hasOwnNav()).toBe(true);
    releaseB();
    expect(hasOwnNav()).toBe(false);
  });

  it('notifica a suscriptores en registro y release; unsubscribe deja de notificar', () => {
    const spy = vi.fn();
    const unsub = subscribeOwnNav(spy);
    const release = registerOwnNav();
    expect(spy).toHaveBeenCalledTimes(1);
    release();
    expect(spy).toHaveBeenCalledTimes(2);
    unsub();
    registerOwnNav();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
