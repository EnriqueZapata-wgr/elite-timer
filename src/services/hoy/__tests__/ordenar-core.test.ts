/**
 * Tests que amarran Ordenar mi día (MB-26 Pieza 9).
 *
 * Los tres caminos devuelven CAMBIOS DE ESTADO y nada más: ninguno borra,
 * apaga prefs ni desinstala (mutación 1 aplicada al flujo). ARGOS propone
 * con adherencia real y el usuario edita; nada se mueve solo.
 */
import { describe, it, expect } from 'vitest';
import {
  planCero, planEsencial, planArgos, packMasReciente, habitosDelPack, UMBRAL_MANTENER,
} from '@/src/services/hoy/ordenar-core';
import { ultimasFechas, GRADUACION } from '@/src/services/hoy/graduacion-core';
import type { UserPackRow } from '@/src/services/pack-core';

const HOY = '2026-08-06';

function enVentana(n: number, dias: number = GRADUACION.dias): Set<string> {
  return new Set(ultimasFechas(HOY, dias).slice(-n));
}

describe('empezar de cero', () => {
  it('todo a reposo, nada se borra ni se desinstala', () => {
    const cambios = planCero(['sunlight', 'journal', 'water']);
    expect(cambios).toEqual([
      { key: 'sunlight', state: 'reposo' },
      { key: 'journal', state: 'reposo' },
      { key: 'water', state: 'reposo' },
    ]);
    // Solo estados: si una mutación agregara borrados o apagados de
    // prefs, el shape cambiaría y esto truena.
    for (const c of cambios) expect(Object.keys(c).sort()).toEqual(['key', 'state']);
  });
});

describe('quedarme con lo esencial', () => {
  const filas: UserPackRow[] = [
    {
      pack_key: 'dormir-mejor', intensidad: 'suave', wake_time: '07:00',
      sleep_time: '23:00', active: true, activated_at: '2026-08-05T10:00:00Z',
    },
    {
      pack_key: 'foco-claridad', intensidad: 'con_todo', wake_time: '07:00',
      sleep_time: '23:00', active: true, activated_at: '2026-07-01T10:00:00Z',
    },
  ];

  it('el pack más reciente manda (por fecha, no por orden)', () => {
    expect(packMasReciente(filas)?.pack_key).toBe('dormir-mejor');
    expect(packMasReciente(null)).toBeNull();
    expect(packMasReciente([])).toBeNull();
  });

  it('los del pack quedan activos (aunque estuvieran en reposo); el resto descansa', () => {
    const delPack = habitosDelPack(filas[0]); // etapa 1: sleep/sunlight/screen_time_cutoff
    expect(delPack.sort()).toEqual(['screen_time_cutoff', 'sleep', 'sunlight']);
    const cambios = planEsencial(['sunlight', 'journal', 'grounding'], delPack);
    expect(cambios).toContainEqual({ key: 'journal', state: 'reposo' });
    expect(cambios).toContainEqual({ key: 'grounding', state: 'reposo' });
    expect(cambios).toContainEqual({ key: 'sunlight', state: 'activo' });
    expect(cambios).toContainEqual({ key: 'sleep', state: 'activo' });
    expect(cambios.filter((c) => c.key === 'sunlight')).toHaveLength(1);
  });
});

describe('que ARGOS proponga (propone; el usuario acepta o edita)', () => {
  it('30/35 → graduar; media de 21 → activo; menos → reposo', () => {
    const historial = {
      sunlight: enVentana(31), // graduable
      journal: enVentana(UMBRAL_MANTENER.minimo, UMBRAL_MANTENER.dias), // se queda
      grounding: enVentana(2), // a reposo
    };
    const plan = planArgos(['sunlight', 'journal', 'grounding', 'red_glasses'], historial, HOY);
    expect(plan).toContainEqual({ key: 'sunlight', state: 'graduado' });
    expect(plan).toContainEqual({ key: 'journal', state: 'activo' });
    expect(plan).toContainEqual({ key: 'grounding', state: 'reposo' });
    // Nunca hecho en 35 días → reposo (el candidato más obvio).
    expect(plan).toContainEqual({ key: 'red_glasses', state: 'reposo' });
  });

  it('los cuantitativos sin ledger se quedan activos (ausencia de evidencia no es evidencia)', () => {
    const plan = planArgos(['water', 'protein'], {}, HOY, new Set(['water', 'protein']));
    expect(plan).toEqual([
      { key: 'water', state: 'activo' },
      { key: 'protein', state: 'activo' },
    ]);
  });

  it('propone TODOS los renglones (editable): ninguno se queda sin veredicto', () => {
    const renglones = ['sunlight', 'journal', 'water'];
    const plan = planArgos(renglones, {}, HOY, new Set(['water']));
    expect(plan.map((c) => c.key)).toEqual(renglones);
  });
});
