/**
 * Tests del reconciliador de avisos del objetivo (7-sep-2026).
 *
 * Lo que amarran, en orden de gravedad:
 *  1 · La línea que no se cruza: un aviso que la persona apagó JAMÁS se
 *      vuelve a encender, ni con la columna nueva ni sin ella.
 *  2 · Un aviso que nunca se pudo encender (sin fila) sí se enciende en
 *      cuanto hay permiso: ese es el bug que se está reparando.
 *  3 · Idempotencia: correrlo diez veces deja lo mismo que correrlo una.
 *  4 · Ante la duda, silencio: sin permiso o sin lectura sana no se
 *      escribe nada Y no se pierde el pendiente.
 */
import { describe, it, expect } from 'vitest';
import {
  clavePendientes,
  decidirCorrida,
  dedupeDeseados,
  filtrarPendientes,
  fusionarPendientes,
  planearReconciliacionAvisos,
  type AvisoDeseado,
  type EntradaReconcilia,
  type FilaAvisoActual,
  type PendienteAviso,
} from '@/src/services/pack-avisos-reconcile-core';

const DESEADO: AvisoDeseado = { packKey: 'dormir-mejor', app: 'meditar', time: '07:00' };

function pendiente(app: AvisoDeseado['app'] = 'meditar'): PendienteAviso {
  return { packKey: 'dormir-mejor', app, time: '07:00', razon: 'permission', desde: '2026-09-07T10:00:00.000Z' };
}

function entrada(over: Partial<EntradaReconcilia> = {}): EntradaReconcilia {
  return {
    deseados: [DESEADO],
    actuales: {},
    pendientes: [pendiente()],
    permiso: 'granted',
    lecturaOk: true,
    ...over,
  };
}

/** Espeja lo que hace el servicio al escribir: la fila nace encendida. */
function trasEncender(fila: AvisoDeseado): FilaAvisoActual {
  return { enabled: true, time: fila.time, apagadoPorUsuario: false };
}

describe('la línea que no se cruza: lo que la persona apagó', () => {
  it('fila apagada con la columna nueva: no se enciende y el pendiente se cierra', () => {
    const plan = planearReconciliacionAvisos(
      entrada({ actuales: { meditar: { enabled: false, time: '07:00', apagadoPorUsuario: true } } }),
    );
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toEqual([{ app: 'meditar', motivo: 'apagado_por_la_persona' }]);
    expect(plan.pendientesRestantes).toHaveLength(0);
  });

  it('fila apagada que NADIE apagó (apagadoPorUsuario:false): SE REPARA', () => {
    // Este es el caso que volvía inerte a la migración 320: con un corte de
    // `!enabled` a secas, una fila apagada por otra vía quedaba sellada como
    // decisión de la persona y el aviso no se reintentaba jamás.
    const plan = planearReconciliacionAvisos(
      entrada({ actuales: { meditar: { enabled: false, time: '07:00', apagadoPorUsuario: false } } }),
    );
    expect(plan.encender).toEqual([DESEADO]);
    expect(plan.cerrar).toHaveLength(0);
    expect(plan.pendientesRestantes).toHaveLength(1);
  });

  it('la columna decide: misma fila apagada, distinta bandera, distinta decisión', () => {
    const fila = (apagadoPorUsuario: boolean): FilaAvisoActual =>
      ({ enabled: false, time: '07:00', apagadoPorUsuario });
    const repara = planearReconciliacionAvisos(entrada({ actuales: { meditar: fila(false) } }));
    const respeta = planearReconciliacionAvisos(entrada({ actuales: { meditar: fila(true) } }));
    expect(repara.encender).toHaveLength(1);
    expect(respeta.encender).toHaveLength(0);
  });

  it('fila apagada SIN la columna (base sin migrar): se respeta igual', () => {
    const plan = planearReconciliacionAvisos(
      entrada({ actuales: { meditar: { enabled: false, time: '07:00', apagadoPorUsuario: null } } }),
    );
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toEqual([{ app: 'meditar', motivo: 'apagado_por_la_persona' }]);
  });

  it('encendida a otra hora: la hora de la persona manda, no se escribe', () => {
    const plan = planearReconciliacionAvisos(
      entrada({ actuales: { meditar: { enabled: true, time: '09:30', apagadoPorUsuario: false } } }),
    );
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toEqual([{ app: 'meditar', motivo: 'ya_encendido' }]);
  });
});

describe('lo que nunca se pudo encender sí se repara', () => {
  it('sin fila y con permiso: se enciende a la hora del objetivo', () => {
    const plan = planearReconciliacionAvisos(entrada());
    expect(plan.motivo).toBe('hay_trabajo');
    expect(plan.encender).toEqual([DESEADO]);
    // Sigue pendiente hasta que la escritura confirme.
    expect(plan.pendientesRestantes).toHaveLength(1);
  });

  it('repara aunque el registro local se haya perdido (la verdad es user_packs)', () => {
    const plan = planearReconciliacionAvisos(entrada({ pendientes: [] }));
    expect(plan.encender).toEqual([DESEADO]);
  });

  it('el pendiente de un objetivo que ya no lo pide se cierra', () => {
    const plan = planearReconciliacionAvisos(entrada({ deseados: [], pendientes: [pendiente('journal')] }));
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toEqual([{ app: 'journal', motivo: 'objetivo_retirado' }]);
    expect(plan.pendientesRestantes).toHaveLength(0);
  });
});

describe('idempotencia: diez corridas = una corrida', () => {
  it('tras aplicar el plan, las nueve siguientes no escriben nada', () => {
    let actuales: EntradaReconcilia['actuales'] = {};
    let pendientes = [pendiente()];
    let escrituras = 0;
    for (let i = 0; i < 10; i++) {
      const plan = planearReconciliacionAvisos(entrada({ actuales, pendientes }));
      for (const a of plan.encender) {
        escrituras++;
        actuales = { ...actuales, [a.app]: trasEncender(a) };
      }
      pendientes = plan.pendientesRestantes.filter((p) => !plan.encender.some((a) => a.app === p.app));
    }
    expect(escrituras).toBe(1);
    expect(pendientes).toHaveLength(0);
  });
});

describe('ante la duda, silencio', () => {
  it('sin permiso: cero escrituras y el pendiente SE CONSERVA', () => {
    const plan = planearReconciliacionAvisos(entrada({ permiso: 'undetermined' }));
    expect(plan.motivo).toBe('sin_permiso');
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toHaveLength(0);
    expect(plan.pendientesRestantes).toHaveLength(1);
  });

  it('permiso negado: igual, se conserva (se puede conceder en Ajustes)', () => {
    const plan = planearReconciliacionAvisos(entrada({ permiso: 'denied' }));
    expect(plan.encender).toHaveLength(0);
    expect(plan.pendientesRestantes).toHaveLength(1);
  });

  it('lectura fallida: no se enciende NI se cierra nada', () => {
    const plan = planearReconciliacionAvisos(entrada({ lecturaOk: false }));
    expect(plan.motivo).toBe('lectura_fallida');
    expect(plan.encender).toHaveLength(0);
    expect(plan.cerrar).toHaveLength(0);
    expect(plan.pendientesRestantes).toHaveLength(1);
  });

  it('lectura fallida NO es "no hay filas": con actuales vacío y ok sí encendería', () => {
    expect(planearReconciliacionAvisos(entrada({ lecturaOk: true })).encender).toHaveLength(1);
    expect(planearReconciliacionAvisos(entrada({ lecturaOk: false })).encender).toHaveLength(0);
  });
});

describe('dos objetivos que piden la misma app', () => {
  it('una sola escritura, la hora más temprana', () => {
    const plan = planearReconciliacionAvisos(
      entrada({
        deseados: [
          { packKey: 'dormir-mejor', app: 'meditar', time: '21:00' },
          { packKey: 'bajar-revoluciones', app: 'meditar', time: '07:30' },
        ],
      }),
    );
    expect(plan.encender).toEqual([{ packKey: 'bajar-revoluciones', app: 'meditar', time: '07:30' }]);
  });

  it('dedupeDeseados es estable en el orden de entrada', () => {
    const a = dedupeDeseados([
      { packKey: 'p2', app: 'journal', time: '21:00' },
      { packKey: 'p1', app: 'meditar', time: '07:00' },
    ]);
    const b = dedupeDeseados([
      { packKey: 'p1', app: 'meditar', time: '07:00' },
      { packKey: 'p2', app: 'journal', time: '21:00' },
    ]);
    expect(a).toEqual(b);
  });
});

describe('el registro de pendientes (lo puro del servicio)', () => {
  it('la clave lleva el userId: la cuenta B no ve los pendientes de la A', () => {
    expect(clavePendientes('u1')).not.toBe(clavePendientes('u2'));
    expect(clavePendientes('u1')).toContain('u1');
  });

  it('basura en storage no tumba nada: se filtra lo que sí es un pendiente', () => {
    expect(filtrarPendientes(null)).toEqual([]);
    expect(filtrarPendientes('no soy una lista')).toEqual([]);
    expect(filtrarPendientes([{ app: 'meditar' }, 7, null, pendiente()])).toEqual([pendiente()]);
    expect(filtrarPendientes([{ ...pendiente(), razon: 'otra_cosa' }])).toEqual([]);
  });

  it('fusionar conserva el `desde` original: importa desde cuándo lleva roto', () => {
    const previo = pendiente();
    const r = fusionarPendientes(
      [previo],
      [{ packKey: 'dormir-mejor', app: 'meditar', time: '07:30', razon: 'error' }],
      '2026-09-09T00:00:00.000Z',
    );
    expect(r).toHaveLength(1);
    expect(r[0].desde).toBe(previo.desde);
    expect(r[0].razon).toBe('error');
    expect(r[0].time).toBe('07:30');
  });

  it('fusionar estrena `desde` solo cuando el pendiente es nuevo', () => {
    const r = fusionarPendientes(
      [],
      [{ packKey: 'p1', app: 'journal', time: '21:00', razon: 'permission' }],
      '2026-09-09T00:00:00.000Z',
    );
    expect(r[0].desde).toBe('2026-09-09T00:00:00.000Z');
  });

  it('un pendiente por app, nunca una bitácora', () => {
    const r = fusionarPendientes(
      [pendiente('journal')],
      [
        { packKey: 'p1', app: 'journal', time: '21:00', razon: 'permission' },
        { packKey: 'p1', app: 'journal', time: '22:00', razon: 'error' },
      ],
      '2026-09-09T00:00:00.000Z',
    );
    expect(r).toHaveLength(1);
    expect(r[0].time).toBe('22:00');
  });
});

describe('el respiro no puede tapar el permiso recién concedido', () => {
  const base = { corriendo: false, ultimaCorridaMs: 1_000, ahoraMs: 11_000, respiroMs: 30_000 };

  it('dentro del respiro no corre', () => {
    expect(decidirCorrida(base)).toBe('muy_pronto');
  });

  it('pasado el respiro sí corre', () => {
    expect(decidirCorrida({ ...base, ahoraMs: 40_000 })).toBe('corre');
  });

  it('la primera corrida de la sesión nunca se frena', () => {
    expect(decidirCorrida({ ...base, ultimaCorridaMs: 0, ahoraMs: 5 })).toBe('corre');
  });

  it('forzar se salta el respiro', () => {
    expect(decidirCorrida({ ...base, forzar: true })).toBe('corre');
  });

  it('con una corrida viva no se encima otra, ni forzando', () => {
    expect(decidirCorrida({ ...base, corriendo: true, forzar: true })).toBe('ya_corriendo');
  });
});
