/**
 * Tests de consola-core (8-sep-2026). El que mas importa es el bloque de
 * adherencia: ahi vive la regla de "no hay dato" contra "no cumplio", que es
 * lo que evita que Enrique le hable mal a un cliente que si esta cumpliendo.
 * Node-only, sin react-native ni supabase.
 */
import { describe, it, expect } from 'vitest';
import {
  PERFILES_EXCLUIDOS,
  estaExcluido,
  diasEntre,
  restarDias,
  etiquetaDias,
  senalDeVida,
  temperatura,
  adherenciaIntervenciones,
  esElite,
  esSeguimiento,
  pendientesDeCliente,
  ordenarPorAtencion,
  resumenDeLista,
  VENTANA_ADHERENCIA_DIAS,
  type ClienteConsola,
} from '../consola-core';

const HOY = '2026-09-08';

function cliente(p: Partial<ClienteConsola> = {}): ClienteConsola {
  return {
    id: p.id ?? 'c1',
    nombre: p.nombre ?? 'Cliente',
    email: p.email ?? 'c@x.com',
    tier: p.tier ?? 'elite',
    accesoVence: p.accesoVence ?? null,
    // `??` no sirve aqui: `evaluacion: null` es un caso de prueba real (cliente
    // sin evaluacion cargada) y el operador lo confundiria con "no lo pasaron".
    evaluacion: 'evaluacion' in p ? (p.evaluacion ?? null) : { version: 1, fecha: '2026-09-01' },
    dxFecha: p.dxFecha ?? null,
    suplementosActivos: p.suplementosActivos ?? 0,
    objetivos: p.objetivos ?? [],
    senal: p.senal ?? { estado: 'ok', fecha: HOY, dias: 0, fuente: 'intervenciones' },
    adherencia: p.adherencia ?? { estado: 'ok', pct: 80, hechos: 8, esperados: 10 },
    novedades: p.novedades ?? [],
  };
}

describe('exclusiones nominales', () => {
  it('Mariana esta excluida y con motivo escrito', () => {
    const uid = '7503a669-ab9c-41ab-a38a-365c0af672a6';
    expect(estaExcluido(uid)).toBe(true);
    expect(PERFILES_EXCLUIDOS[uid]).toContain('Mariana');
    expect(PERFILES_EXCLUIDOS[uid].length).toBeGreaterThan(30);
  });

  it('cualquier otro perfil no esta excluido', () => {
    expect(estaExcluido('6ac686b1-38c4-473c-9dec-543125b6fa8d')).toBe(false);
  });
});

describe('dias de calendario', () => {
  it('cuenta dias hacia adelante y hacia atras', () => {
    expect(diasEntre('2026-09-01', '2026-09-08')).toBe(7);
    expect(diasEntre('2026-09-08', '2026-09-01')).toBe(-7);
    expect(diasEntre(HOY, HOY)).toBe(0);
  });

  it('cruza fin de mes y ano bisiesto', () => {
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
    expect(diasEntre('2024-02-28', '2024-03-01')).toBe(2);
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
    expect(restarDias('2026-01-01', 1)).toBe('2025-12-31');
  });

  it('etiqueta en espanol sin em dashes', () => {
    expect(etiquetaDias(0)).toBe('hoy');
    expect(etiquetaDias(1)).toBe('ayer');
    expect(etiquetaDias(3)).toBe('hace 3 días');
    expect(etiquetaDias(10)).toBe('hace 1 semana');
    expect(etiquetaDias(400)).toBe('hace más de un año');
    expect(etiquetaDias(45)).not.toContain('—');
  });
});

describe('senalDeVida', () => {
  it('sin ninguna fuente con fecha devuelve sinDato, no cero dias', () => {
    const s = senalDeVida([{ fuente: 'comida', fecha: null }, { fuente: 'agua', fecha: null }], HOY);
    expect(s.estado).toBe('sinDato');
  });

  it('toma la fuente mas reciente y la nombra', () => {
    const s = senalDeVida([
      { fuente: 'comida', fecha: '2026-09-02' },
      { fuente: 'electrones', fecha: '2026-09-06' },
      { fuente: 'agua', fecha: null },
    ], HOY);
    expect(s).toEqual({ estado: 'ok', fecha: '2026-09-06', dias: 2, fuente: 'electrones' });
  });

  it('una fecha futura no produce dias negativos', () => {
    const s = senalDeVida([{ fuente: 'agenda', fecha: '2026-09-20' }], HOY);
    expect(s.estado === 'ok' && s.dias).toBe(0);
  });

  it('temperatura por cortes de negocio', () => {
    expect(temperatura(0)).toBe('hoy');
    expect(temperatura(2)).toBe('reciente');
    expect(temperatura(6)).toBe('enfriando');
    expect(temperatura(7)).toBe('frio');
  });
});

describe('adherenciaIntervenciones: no hay dato NO es no cumplio', () => {
  const iv = [{ id: 'a', activadaEl: '2026-08-01' }, { id: 'b', activadaEl: '2026-08-01' }];

  it('sin intervenciones activas no inventa cero', () => {
    const r = adherenciaIntervenciones([], [], HOY, true);
    expect(r).toEqual({ estado: 'sinDato', motivo: 'sin-intervenciones' });
  });

  it('todo cargado hoy: no hay dias que medir todavia', () => {
    const r = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-09-09' }], [], HOY, true);
    expect(r).toEqual({ estado: 'sinDato', motivo: 'recien-cargado' });
  });

  it('cero marcas Y cero senal: sin dato, NUNCA 0%', () => {
    const r = adherenciaIntervenciones(iv, [], HOY, false);
    expect(r).toEqual({ estado: 'sinDato', motivo: 'sin-senal' });
    expect(r.estado === 'ok').toBe(false);
  });

  it('cero marcas PERO con senal: eso si es 0% real', () => {
    const r = adherenciaIntervenciones(iv, [], HOY, true);
    expect(r.estado).toBe('ok');
    expect(r.estado === 'ok' && r.pct).toBe(0);
    expect(r.estado === 'ok' && r.esperados).toBe(VENTANA_ADHERENCIA_DIAS * 2);
  });

  it('cuenta por par intervencion-dia: dos marcas del mismo dia son un dia', () => {
    const r = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-08-01' }], [
      { intervencionId: 'a', fecha: '2026-09-08' },
      { intervencionId: 'a', fecha: '2026-09-08' },
    ], HOY, true);
    expect(r.estado === 'ok' && r.hechos).toBe(1);
  });

  it('ignora marcas fuera de la ventana y de intervenciones ya no activas', () => {
    const r = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-08-01' }], [
      { intervencionId: 'a', fecha: '2026-07-01' },
      { intervencionId: 'zz', fecha: '2026-09-08' },
      { intervencionId: 'a', fecha: '2026-09-08' },
    ], HOY, true);
    expect(r.estado === 'ok' && r.hechos).toBe(1);
  });

  it('lo cargado hace 3 dias se juzga con 3 dias, no con 14', () => {
    const r = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-09-06' }], [
      { intervencionId: 'a', fecha: '2026-09-06' },
      { intervencionId: 'a', fecha: '2026-09-07' },
      { intervencionId: 'a', fecha: '2026-09-08' },
    ], HOY, true);
    expect(r).toEqual({ estado: 'ok', pct: 100, hechos: 3, esperados: 3 });
  });

  it('nunca pasa de 100', () => {
    const r = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-09-08' }], [
      { intervencionId: 'a', fecha: '2026-09-08' },
    ], HOY, true);
    expect(r.estado === 'ok' && r.pct).toBe(100);
  });
});

describe('Elite contra seguimiento', () => {
  it('la evaluacion manda sobre el tier vencido', () => {
    expect(esElite({ tier: 'free', evaluacion: { version: 2, fecha: '2026-01-01' } })).toBe(true);
  });

  it('tier elite sin evaluacion tambien es Elite', () => {
    expect(esElite({ tier: 'elite', evaluacion: null })).toBe(true);
  });

  it('seguimiento: sin Elite pero con mapa funcional viejo', () => {
    const c = { tier: 'free', evaluacion: null, dxFecha: '2026-07-30', suplementosActivos: 0 };
    expect(esSeguimiento(c)).toBe(true);
  });

  it('seguimiento: sin Elite pero con suplementos asignados', () => {
    const c = { tier: 'pro', evaluacion: null, dxFecha: null, suplementosActivos: 9 };
    expect(esSeguimiento(c)).toBe(true);
  });

  it('quien no tiene nada no es ni Elite ni seguimiento', () => {
    const c = { tier: 'free', evaluacion: null, dxFecha: null, suplementosActivos: 0 };
    expect(esElite(c)).toBe(false);
    expect(esSeguimiento(c)).toBe(false);
  });
});

describe('pendientes', () => {
  it('sin evaluacion cargada es lo mas urgente', () => {
    const p = pendientesDeCliente(cliente({ evaluacion: null }), HOY);
    expect(p[0].tipo).toBe('sin-evaluacion');
    expect(p[0].urgencia).toBe(2);
  });

  it('avisa del vencimiento dentro de la ventana y no antes', () => {
    const cerca = pendientesDeCliente(cliente({ accesoVence: '2026-09-15' }), HOY);
    expect(cerca.some((x) => x.tipo === 'acceso-por-vencer')).toBe(true);
    const lejos = pendientesDeCliente(cliente({ accesoVence: '2026-12-01' }), HOY);
    expect(lejos.some((x) => x.tipo === 'acceso-por-vencer')).toBe(false);
  });

  it('acceso ya vencido urge', () => {
    const p = pendientesDeCliente(cliente({ accesoVence: '2026-09-01' }), HOY);
    const v = p.find((x) => x.tipo === 'acceso-vencido');
    expect(v?.urgencia).toBe(2);
  });

  it('nunca dejo registro urge mas que llevar dias sin senal', () => {
    const nunca = pendientesDeCliente(cliente({ senal: { estado: 'sinDato' } }), HOY);
    expect(nunca.find((x) => x.tipo === 'nunca-entro')?.urgencia).toBe(2);
    const frio = pendientesDeCliente(
      cliente({ senal: { estado: 'ok', fecha: '2026-08-20', dias: 19, fuente: 'comida' } }), HOY);
    expect(frio.find((x) => x.tipo === 'sin-senal')?.urgencia).toBe(1);
  });

  it('un cliente al corriente no genera pendientes', () => {
    expect(pendientesDeCliente(cliente(), HOY)).toEqual([]);
  });

  it('ningun texto de pendiente trae em dash', () => {
    const p = pendientesDeCliente(cliente({ evaluacion: null, accesoVence: '2026-09-01', senal: { estado: 'sinDato' } }), HOY);
    for (const x of p) expect(x.texto).not.toContain('—');
  });
});

describe('ordenarPorAtencion', () => {
  it('primero el mas urgente, luego el mas frio, luego alfabetico', () => {
    const alDia = cliente({ id: '1', nombre: 'Ana' });
    const frio = cliente({ id: '2', nombre: 'Beto', senal: { estado: 'ok', fecha: '2026-08-20', dias: 19, fuente: 'comida' } });
    const sinEval = cliente({ id: '3', nombre: 'Caro', evaluacion: null });
    const orden = ordenarPorAtencion([alDia, frio, sinEval], HOY).map((c) => c.id);
    expect(orden).toEqual(['3', '2', '1']);
  });

  it('es determinista con entradas empatadas', () => {
    const a = cliente({ id: 'a', nombre: 'Zoe' });
    const b = cliente({ id: 'b', nombre: 'Abel' });
    expect(ordenarPorAtencion([a, b], HOY).map((c) => c.id)).toEqual(['b', 'a']);
    expect(ordenarPorAtencion([b, a], HOY).map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('resumenDeLista', () => {
  it('sin adherencia dice sin dato, no 0%', () => {
    const r = resumenDeLista(cliente({ adherencia: { estado: 'sinDato', motivo: 'sin-senal' } }));
    expect(r).toContain('Adherencia sin dato');
    expect(r).not.toContain('0%');
  });

  it('con adherencia muestra el porcentaje', () => {
    expect(resumenDeLista(cliente())).toContain('80% de lo asignado');
  });
});
