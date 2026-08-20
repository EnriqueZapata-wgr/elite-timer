/**
 * pack-prescribe-core: la doctrina del dato sagrado, ejecutable.
 * Lo que el usuario pausó o descartó JAMÁS se revive desde un pack.
 */
import { describe, it, expect } from 'vitest';
import { planearPrescripcion, type FilaIntervencion } from '@/src/services/pack-prescribe-core';

const filas = (parejas: [string, FilaIntervencion['status']][]): FilaIntervencion[] =>
  parejas.map(([intervention_key, status]) => ({ intervention_key, status }));

describe('planearPrescripcion', () => {
  it('usuario nuevo: todo se inserta', () => {
    const plan = planearPrescripcion(['a', 'b'], []);
    expect(plan).toEqual({ insertar: ['a', 'b'], promover: [], yaActivas: [], respetadas: [] });
  });

  it('suggested se promueve, active no se toca', () => {
    const plan = planearPrescripcion(['a', 'b', 'c'], filas([['a', 'suggested'], ['b', 'active']]));
    expect(plan.promover).toEqual(['a']);
    expect(plan.yaActivas).toEqual(['b']);
    expect(plan.insertar).toEqual(['c']);
    expect(plan.respetadas).toEqual([]);
  });

  it('lo pausado y lo descartado se respeta, nunca se revive', () => {
    const plan = planearPrescripcion(['a', 'b'], filas([['a', 'paused'], ['b', 'dismissed']]));
    expect(plan.insertar).toEqual([]);
    expect(plan.promover).toEqual([]);
    expect(plan.respetadas).toEqual(['a', 'b']);
  });

  it('re-aplicar el mismo pack es idempotente: cero escrituras', () => {
    const plan = planearPrescripcion(['a', 'b'], filas([['a', 'active'], ['b', 'active']]));
    expect(plan.insertar.length + plan.promover.length).toBe(0);
    expect(plan.yaActivas).toEqual(['a', 'b']);
  });

  it('una fila de otra intervención no contamina el plan', () => {
    const plan = planearPrescripcion(['a'], filas([['zzz', 'dismissed']]));
    expect(plan).toEqual({ insertar: ['a'], promover: [], yaActivas: [], respetadas: [] });
  });
});
