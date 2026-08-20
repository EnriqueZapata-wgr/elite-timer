/**
 * pack-prescribe-core: la doctrina del dato sagrado, ejecutable.
 * Lo que el usuario pausó o descartó JAMÁS se revive desde un pack.
 */
import { describe, it, expect } from 'vitest';
import { planearPrescripcion, validarCombinacion, type FilaIntervencion } from '@/src/services/pack-prescribe-core';

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
describe('validarCombinacion', () => {
  const P = (key: string, opts: { excluye?: string[]; techo?: boolean } = {}) => ({
    key, nombre: key.toUpperCase(), excluye: opts.excluye, cuentaParaElTecho: opts.techo ?? true,
  });

  it('sin activos, todo pasa', () => {
    expect(validarCombinacion(P('a'), [], 3)).toEqual({ ok: true });
  });

  it('la exclusión frena en las dos direcciones', () => {
    const ida = validarCombinacion(P('a', { excluye: ['b'] }), [P('b')], 3);
    expect(ida.ok).toBe(false);
    const vuelta = validarCombinacion(P('a'), [P('b', { excluye: ['a'] })], 3);
    expect(vuelta.ok).toBe(false);
    if (!vuelta.ok && vuelta.razon === 'exclusion') expect(vuelta.con).toBe('b');
  });

  it('el techo cuenta solo estilo de vida: los paquetes de salud no arman el día', () => {
    const salud = [P('s1', { techo: false }), P('s2', { techo: false }), P('s3', { techo: false })];
    expect(validarCombinacion(P('a'), salud, 3)).toEqual({ ok: true });
    const vida = [P('v1'), P('v2'), P('v3')];
    const v = validarCombinacion(P('a'), vida, 3);
    expect(v.ok).toBe(false);
    if (!v.ok && v.razon === 'techo') expect(v.activos).toBe(3);
  });

  it('re-aplicar un pack activo no choca consigo mismo ni cuenta doble', () => {
    expect(validarCombinacion(P('a', { excluye: ['a'] }), [P('a')], 1)).toEqual({ ok: true });
  });

  it('un paquete de salud nunca es frenado por el techo', () => {
    const vida = [P('v1'), P('v2'), P('v3')];
    expect(validarCombinacion(P('s', { techo: false }), vida, 3)).toEqual({ ok: true });
  });
});
