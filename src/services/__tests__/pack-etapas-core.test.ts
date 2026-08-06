/**
 * Tests que amarran las etapas del pack (MB-26 Pieza 9, mutación 7).
 *
 * Aplicar enciende 3 (etapa 1); a los 14/21 sostenidos se PROPONE el
 * resto; 13/21 todavía no. El usuario siempre puede adelantar.
 */
import { describe, it, expect } from 'vitest';
import { buildPackPlan, type UserPackRow } from '@/src/services/pack-core';
import { etapaDelPack } from '@/src/services/pack-etapas-core';
import { ultimasFechas, ETAPA_PACK } from '@/src/services/hoy/graduacion-core';
import { PACKS, habitosPorIntensidad } from '@/src/constants/packs';

const HOY = '2026-08-06';

const fila = (over: Partial<UserPackRow> = {}): UserPackRow => ({
  pack_key: 'dormir-mejor',
  intensidad: 'suave',
  wake_time: '07:00',
  sleep_time: '23:00',
  active: true,
  activated_at: '2026-08-01T12:00:00Z',
  ...over,
});

/** n días cumplidos dentro de la ventana de 21. */
function enVentana(n: number): Set<string> {
  return new Set(ultimasFechas(HOY, ETAPA_PACK.dias).slice(0, n));
}

describe('aplicar enciende 3, no 6 (mutación 7)', () => {
  it.each(PACKS.map((p) => [p.key] as const))('%s: la etapa 1 son exactamente sus 3 core', (key) => {
    const plan = buildPackPlan(key, 'suave', '07:00', '23:00');
    const core = habitosPorIntensidad(PACKS.find((p) => p.key === key)!, 'suave');
    expect(core).toHaveLength(3);
    expect(plan.encendidos.length + plan.enModulo.length).toBe(3);
  });
});

describe('la señal de sostener 14/21 (mutación 7)', () => {
  // Los core medibles de dormir-mejor: sunlight y screen_time_cutoff
  // (sleep es cuantitativo: no deja fila en el ledger).

  it('14 de 21 en todos los core medibles → propone el resto', () => {
    const e = etapaDelPack(fila(), {
      sunlight: enVentana(14),
      screen_time_cutoff: enVentana(14),
    }, HOY);
    expect(e.etapa).toBe(1);
    expect(e.sostiene).toBe(true);
    expect(e.pendientes.sort()).toEqual(['breathwork', 'red_glasses']);
  });

  it('13 de 21 todavía NO propone', () => {
    const e = etapaDelPack(fila(), {
      sunlight: enVentana(14),
      screen_time_cutoff: enVentana(13),
    }, HOY);
    expect(e.sostiene).toBe(false);
    expect(e.progreso).toEqual({ cumplidos: 13, objetivo: ETAPA_PACK.minimo });
  });

  it('manda el core MENOS avanzado (no el promedio)', () => {
    const e = etapaDelPack(fila(), {
      sunlight: enVentana(21),
      screen_time_cutoff: enVentana(0),
    }, HOY);
    expect(e.sostiene).toBe(false);
    expect(e.progreso?.cumplidos).toBe(0);
  });

  it('etapa 2 aplicada: nada pendiente, nada que proponer', () => {
    const e = etapaDelPack(fila({ intensidad: 'con_todo' }), {}, HOY);
    expect(e.etapa).toBe(2);
    expect(e.pendientes).toEqual([]);
    expect(e.sostiene).toBe(true);
  });

  it('un pack sin core medible no propone solo (adelantar siempre está)', () => {
    // energia-estable: cores protein/water (cuantitativos) + glucose_log
    // (sí deja ledger) → glucose_log es el único medible.
    const sinDato = etapaDelPack(fila({ pack_key: 'energia-estable' }), {}, HOY);
    expect(sinDato.sostiene).toBe(false);
    const conDato = etapaDelPack(
      fila({ pack_key: 'energia-estable' }),
      { glucose_log: enVentana(14) },
      HOY,
    );
    expect(conDato.sostiene).toBe(true);
  });
});
