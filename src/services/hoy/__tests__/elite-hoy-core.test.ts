/**
 * HOY para un cliente Elite (20-sep-2026): el hero decide por existencia y
 * distingue "no hay" de "no se pudo leer"; los tres marcadores salen del
 * `estado` que Enrique puso y no de la matriz; la terna se arma desde el
 * plan (suplementos, palancas) y rellena con lo de siempre; las puertas
 * nunca inventan numeros. Se corre con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/elite-hoy-core.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import {
  decidirHeroElite, ocultarPildoraEconomia, marcadoresEliteParaHero, cuentaPidenAccion, edadesDeEvaluacion,
  detallePuertas, objetivoActivo, lineaPlanHoy, tituloTarjetaHoy, suplementosDeHoy, accionSuplementosDeHoy,
  marcadorDePalanca, accionesDePalancas, marcadoresFueraDeEvaluacion, componerTernaElite, tokensDePalanca,
  falloEvaluacionEsFatal, cambioVersionElite, firmaEnrique, lineaPidenAccion, TOPE_HERO_ELITE_MS,
  KEY_ACCION_SUPLEMENTOS, type NivelHoy, type SuplementoHoy,
} from '@/src/services/hoy/elite-hoy-core';
import type { AccionHoy } from '@/src/services/hoy/que-hacer-hoy-core';
import { PACKS } from '@/src/constants/packs';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';

const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

/** Copia profunda: el validador devuelve el mismo objeto y los tests mutan. */
function omar(): EliteV3 {
  const r = validarEliteV3(JSON.parse(JSON.stringify(ejemplo)));
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

const nivel = (o: Partial<NivelHoy> = {}): NivelHoy => ({
  tier: 'free', cargando: false, noSePudoLeer: false, tieneEvaluacionElite: false, evaluacionEliteNoSePudoLeer: false, ...o,
});

const EM_DASH = '—';
const ROJAS = /diagn[oó]stic|tratamiento|terap[eé]utic|previene|\bcura\b|receta m[eé]dica|chequeo|cl[ií]nicamente/i;
const VENTA = /\bPro\b|Premium|membres[ií]a|paywall|\bpack\b|intervenci[oó]n/i;

describe('decidirHeroElite', () => {
  const e = omar();
  it('con evaluacion, la pinta aunque el nivel sea free, este cargando o haya fallado', () => {
    expect(decidirHeroElite({ estado: 'ok', evaluacion: e }, nivel())).toBe('evaluacion');
    expect(decidirHeroElite({ estado: 'ok', evaluacion: e }, nivel({ cargando: true }))).toBe('evaluacion');
    expect(decidirHeroElite({ estado: 'ok', evaluacion: e }, nivel({ noSePudoLeer: true }))).toBe('evaluacion');
  });
  it('Elite sin evaluacion: en camino, nunca "sube tu estudio"', () => {
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ tier: 'elite' }))).toBe('en_camino');
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ tier: 'elite', cargando: true }))).toBe('en_camino');
  });
  it('regla 7: fallo de lectura con algo Elite es "no se pudo leer"; sin nada Elite, el hero viejo sigue', () => {
    expect(decidirHeroElite({ estado: 'fallo' }, nivel({ tier: 'elite' }))).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'fallo' }, nivel({ tieneEvaluacionElite: true }))).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'fallo' }, nivel())).toBe('labs');
    expect(decidirHeroElite({ estado: 'fallo' }, nivel({ tier: 'premium' }))).toBe('labs');
  });
  it('el hook dice que existe y la lectura dice que no: reintentar, no "sube tu estudio"', () => {
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ tieneEvaluacionElite: true }))).toBe('no_se_pudo_leer');
  });
  it('nivel en vuelo sin evaluacion: se espera; nivel fallido: el hero viejo (fail-open)', () => {
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ cargando: true }))).toBe('cargando');
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ cargando: true, noSePudoLeer: true }))).toBe('labs');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel())).toBe('cargando');
  });
  it('nunca le quita a nadie lo que tenia: free o premium sin evaluacion es el hero viejo', () => {
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel())).toBe('labs');
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ tier: 'premium' }))).toBe('labs');
  });
  it('A3: la lectura fallo Y la existencia no se pudo leer: "no pudimos leer", nunca "sube tu estudio"', () => {
    // functional_dx cayo en las dos lecturas (hook y hero); lab_values respondio. Antes: labs.
    expect(decidirHeroElite({ estado: 'fallo', motivo: 'lectura' }, nivel({ evaluacionEliteNoSePudoLeer: true }))).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'fallo', motivo: 'lectura' }, nivel({ evaluacionEliteNoSePudoLeer: true, noSePudoLeer: true }))).toBe('no_se_pudo_leer');
    // Con la existencia leida y sin nada Elite, el hero viejo sigue (no se le inventa una evaluacion a nadie).
    expect(decidirHeroElite({ estado: 'fallo', motivo: 'lectura' }, nivel({ evaluacionEliteNoSePudoLeer: false }))).toBe('labs');
  });
  it('fallo de lectura con el nivel en vuelo: se espera, no se le pinta "sube tu estudio" a nadie', () => {
    expect(decidirHeroElite({ estado: 'fallo' }, nivel({ cargando: true }))).toBe('cargando');
  });
  it('A8: vencido el tope, lo que siga en vuelo se trata como fallo', () => {
    const v = { vencido: true };
    // Lectura Elite sin resolver: Elite o desconocido -> reintentar; nivel leido y no Elite -> hero viejo.
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ tier: 'elite' }), v)).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ tieneEvaluacionElite: true }), v)).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ cargando: true }), v)).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ evaluacionEliteNoSePudoLeer: true }), v)).toBe('no_se_pudo_leer');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel(), v)).toBe('labs');
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ tier: 'premium' }), v)).toBe('labs');
    // Lectura ok sin evaluacion y nivel colgado: no se sabe si es Elite -> reintentar, nunca "sube tu estudio".
    expect(decidirHeroElite({ estado: 'ok', evaluacion: null }, nivel({ cargando: true }), v)).toBe('no_se_pudo_leer');
    // Fallo con nivel colgado: igual.
    expect(decidirHeroElite({ estado: 'fallo' }, nivel({ cargando: true }), v)).toBe('no_se_pudo_leer');
    // Sin tope vencido nada cambia respecto a lo de arriba.
    expect(decidirHeroElite({ estado: 'cargando' }, nivel({ tier: 'elite' }), { vencido: false })).toBe('cargando');
    // Y la evaluacion, si llego, gana aunque el tope haya vencido.
    expect(decidirHeroElite({ estado: 'ok', evaluacion: e }, nivel({ cargando: true }), v)).toBe('evaluacion');
    expect(TOPE_HERO_ELITE_MS).toBe(10_000);
  });
});

describe('falloEvaluacionEsFatal (A7: fail-open solo para quien sabemos que no tiene plan)', () => {
  it('fatal si es Elite, si el hook vio la evaluacion, o si algo no se pudo leer o sigue en vuelo', () => {
    expect(falloEvaluacionEsFatal(nivel({ tier: 'elite' }))).toBe(true);
    expect(falloEvaluacionEsFatal(nivel({ tieneEvaluacionElite: true }))).toBe(true);
    expect(falloEvaluacionEsFatal(nivel({ noSePudoLeer: true }))).toBe(true);
    expect(falloEvaluacionEsFatal(nivel({ evaluacionEliteNoSePudoLeer: true }))).toBe(true);
    expect(falloEvaluacionEsFatal(nivel({ cargando: true }))).toBe(true);
    expect(falloEvaluacionEsFatal(undefined)).toBe(true);
    expect(falloEvaluacionEsFatal(null)).toBe(true);
  });
  it('no fatal: nivel leido, no Elite y el hook confirmo que no hay evaluacion (sigue lo de siempre)', () => {
    expect(falloEvaluacionEsFatal(nivel())).toBe(false);
    expect(falloEvaluacionEsFatal(nivel({ tier: 'premium' }))).toBe(false);
  });
});

describe('cambioVersionElite (A5: la cache solo relee el JSON si la version cambio)', () => {
  it('nada contra nada es igual; algo contra nada es cambio', () => {
    expect(cambioVersionElite(null, null)).toBe(false);
    expect(cambioVersionElite(null, { version: 3, created_at: 'a' })).toBe(true);
    expect(cambioVersionElite({ version: 3, created_at: 'a' }, null)).toBe(true);
  });
  it('manda la version; a igual version decide created_at; sin ambos datos no se afirma cambio', () => {
    expect(cambioVersionElite({ version: 3, created_at: 'a' }, { version: 4, created_at: 'a' })).toBe(true);
    expect(cambioVersionElite({ version: 3, created_at: 'a' }, { version: 3, created_at: 'a' })).toBe(false);
    expect(cambioVersionElite({ version: 3, created_at: 'a' }, { version: 3, created_at: 'b' })).toBe(true);
    expect(cambioVersionElite({ version: 3, created_at: null }, { version: 3, created_at: 'b' })).toBe(false);
    expect(cambioVersionElite({ version: null, created_at: 'a' }, { version: 3, created_at: 'a' })).toBe(false);
    expect(cambioVersionElite({ version: null, created_at: null }, { version: 3, created_at: null })).toBe(true);
  });
});

describe('NOMBRE_COACH_ELITE (A11: un solo sitio para el nombre)', () => {
  it('las firmas y la linea del plan usan la constante, no un literal', () => {
    expect(firmaEnrique(null)).toBe(`De tu evaluación con ${NOMBRE_COACH_ELITE}`);
    expect(firmaEnrique({ key: 'hba1c', nombre: 'HbA1c', estado: 'att' } as never)).toBe(`${NOMBRE_COACH_ELITE} lo eligió por tu HbA1c`);
    const e = omar();
    expect(lineaPlanHoy(null, e, false)).toContain(NOMBRE_COACH_ELITE);
    const s = accionSuplementosDeHoy([{ id: '1', nombre: 'Magnesio', tomadoHoy: false }]);
    expect(s?.firma).toBe(`Asignado por ${NOMBRE_COACH_ELITE}`);
  });
  it('lineaPidenAccion: con 0 no dice "0 marcadores"; con 1 singular; con mas, plural; sin em dash ni rojas', () => {
    expect(lineaPidenAccion(0)).toBe(`Ningún marcador pide acción hoy. ${NOMBRE_COACH_ELITE} te explica cada uno.`);
    expect(lineaPidenAccion(1)).toBe(`1 marcador pide acción en tu evaluación. ${NOMBRE_COACH_ELITE} te dice cuáles y por qué.`);
    expect(lineaPidenAccion(4)).toBe(`4 marcadores piden acción en tu evaluación. ${NOMBRE_COACH_ELITE} te dice cuáles y por qué.`);
    for (const n of [0, 1, 4]) {
      expect(lineaPidenAccion(n).includes(EM_DASH)).toBe(false);
      expect(ROJAS.test(lineaPidenAccion(n))).toBe(false);
      expect(VENTA.test(lineaPidenAccion(n))).toBe(false);
    }
  });
});

describe('ocultarPildoraEconomia', () => {
  it('se oculta por nivel Elite, por existencia de la evaluacion o mientras se lee; a los demas no se les quita', () => {
    expect(ocultarPildoraEconomia({ tier: 'elite', tieneEvaluacionElite: false, cargando: false })).toBe(true);
    expect(ocultarPildoraEconomia({ tier: 'free', tieneEvaluacionElite: true, cargando: false })).toBe(true);
    expect(ocultarPildoraEconomia({ tier: 'free', tieneEvaluacionElite: false, cargando: true })).toBe(true);
    expect(ocultarPildoraEconomia({ tier: 'free', tieneEvaluacionElite: false, cargando: false })).toBe(false);
    expect(ocultarPildoraEconomia({ tier: 'premium', tieneEvaluacionElite: false, cargando: false })).toBe(false);
  });
});

describe('el hero con la evaluacion de Omar', () => {
  const e = omar();
  it('los tres marcadores son los primeros att en el orden del documento, por el estado de Enrique', () => {
    const top = marcadoresEliteParaHero(e);
    expect(top.map((m) => m.key)).toEqual(['ggt', 'transaminasa_glutamico_piruvica_alt', 'transaminasa_glutamico_oxalacetica_ast']);
    expect(top.every((m) => m.estado === 'att')).toBe(true);
  });
  it('con menos de tres att, rellena con sub y no repite llave', () => {
    const copia = omar();
    for (const g of copia.marcadores.grupos) for (const m of g.marcadores) if (m.estado === 'att') m.estado = 'opt';
    for (const m of copia.composicion.filas) if (m.estado === 'att') m.estado = 'opt';
    copia.marcadores.grupos[0].marcadores[0].estado = 'att';
    const top = marcadoresEliteParaHero(copia);
    expect(top[0].estado).toBe('att');
    expect(top.slice(1).every((m) => m.estado === 'sub')).toBe(true);
    expect(new Set(top.map((m) => m.key)).size).toBe(top.length);
  });
  it('piden accion: el numero de Enrique manda; sin el, se cuentan los att', () => {
    expect(cuentaPidenAccion(e)).toBe(e.conteo.piden_accion);
    const copia = omar();
    copia.conteo.piden_accion = null;
    expect(cuentaPidenAccion(copia)).toBe(15);
  });
  it('las edades salen de inicio (44.5 contra 38) en la forma del hero', () => {
    expect(edadesDeEvaluacion(e)).toEqual({ integral: 44.5, cronologica: 38 });
    const copia = omar();
    copia.inicio.edad_atp = null;
    copia.edades.atp = 43;
    expect(edadesDeEvaluacion(copia)).toEqual({ integral: 43, cronologica: 38 });
    copia.edades.atp = null;
    expect(edadesDeEvaluacion(copia)).toBeNull();
  });
});

describe('detallePuertas', () => {
  it('numeros del documento, nunca inventados, y sin rastros de venta', () => {
    const d = detallePuertas(omar());
    expect(d.evaluacion).toBe('Versión 1 · 12 semanas');
    expect(d.suplementos).toBe('6 en tu plan');
    expect(d.alimentacion).toBe('6 que priorizar · 6 que evitar');
    expect(d.entrenamiento).toBe('3 tipos de sesión');
    for (const v of Object.values(d)) {
      expect(v).not.toContain(EM_DASH);
      expect(v).not.toMatch(VENTA);
    }
  });
  it('una seccion vacia dice "En tu evaluación": la puerta no se esconde', () => {
    const copia = omar();
    copia.suplementos = [];
    copia.entrenamiento.sesiones = [];
    copia.alimentacion.prioriza = [];
    copia.alimentacion.evita = [];
    const d = detallePuertas(copia);
    expect(d.suplementos).toBe('En tu evaluación');
    expect(d.entrenamiento).toBe('En tu evaluación');
    expect(d.alimentacion).toBe('En tu evaluación');
  });
});

describe('objetivoActivo y lineaPlanHoy', () => {
  const pack = PACKS[0];
  it('toma el mas reciente que el catalogo conoce; ignora apagados y llaves desconocidas', () => {
    const o = objetivoActivo([
      { pack_key: 'no_existe', activated_at: '2026-09-19T00:00:00Z' },
      { pack_key: pack.key, activated_at: '2026-09-01T00:00:00Z' },
      { pack_key: PACKS[1].key, activated_at: '2026-09-10T00:00:00Z', active: false },
    ]);
    expect(o).toEqual({ nombre: pack.nombre, senal: pack.mide.que });
    expect(objetivoActivo([])).toBeNull();
  });
  it('la linea nombra el objetivo y la senal, en minuscula y con un solo punto final', () => {
    const l = lineaPlanHoy({ nombre: 'Dormir mejor', senal: 'Tu hora real de dormir contra tu hora objetivo.' }, null, false);
    expect(l).toBe('Tu objetivo: Dormir mejor. La señal que vas a ver moverse: tu hora real de dormir contra tu hora objetivo.');
    expect(lineaPlanHoy({ nombre: 'X', senal: 'HbA1c a los 3 meses' }, null, false)).toContain('moverse: HbA1c a los 3 meses.');
  });
  it('sin objetivo pero con evaluacion habla del programa; sin nada, el copy de siempre', () => {
    expect(lineaPlanHoy(null, omar(), false)).toBe('Tu programa de 12 semanas con Enrique, en lo que toca hoy.');
    const copia = omar();
    copia.inicio.programa_semanas = null;
    expect(lineaPlanHoy(null, copia, false)).toBe('Tu plan con Enrique, en lo que toca hoy.');
    expect(lineaPlanHoy(null, null, true)).toBe('Tres hábitos elegidos por tus marcadores fuera de ventana.');
    expect(lineaPlanHoy(null, null, false)).toBe('Tres hábitos para hoy. Palomea lo que ya hiciste.');
    expect(tituloTarjetaHoy(omar())).toBe('TU PLAN, HOY');
    expect(tituloTarjetaHoy(null)).toBe('QUÉ HACER HOY');
  });
  it('ninguna linea del catalogo trae em dash ni palabras rojas', () => {
    for (const p of PACKS) {
      const l = lineaPlanHoy({ nombre: p.nombre, senal: p.mide.que }, null, false);
      expect(l).not.toContain(EM_DASH);
      expect(l).not.toMatch(ROJAS);
    }
  });
});

describe('suplementos de hoy', () => {
  const filas = [
    { id: 'a', name: 'Magnesio (glicinato)', source: 'coach', is_active: true },
    { id: 'b', name: 'Vitamina D3', source: 'coach', is_active: true },
    { id: 'c', name: 'Omega-3', source: 'coach', is_active: true },
    { id: 'd', name: 'Creatina', source: 'manual', is_active: true },
    { id: 'e', name: 'Zinc', source: 'coach', is_active: false },
    { id: 'f', name: '  ', source: 'coach', is_active: true },
  ];
  it('solo los del plan de Enrique y activos; un log con 0 unidades no es toma', () => {
    const s = suplementosDeHoy(filas, [
      { supplement_id: 'a', taken: true },
      { supplement_id: 'b', taken: true, units_taken: 0 },
      { supplement_id: 'c', taken: false },
      { supplement_id: 'd', taken: true },
    ]);
    expect(s).toEqual([
      { id: 'a', nombre: 'Magnesio (glicinato)', tomadoHoy: true },
      { id: 'b', nombre: 'Vitamina D3', tomadoHoy: false },
      { id: 'c', nombre: 'Omega-3', tomadoHoy: false },
    ]);
  });
  it('la accion cuenta pendientes, nombra dos y resume el resto; con todo tomado queda hecha', () => {
    const cuatro: SuplementoHoy[] = [
      { id: '1', nombre: 'A', tomadoHoy: false }, { id: '2', nombre: 'B', tomadoHoy: false },
      { id: '3', nombre: 'C', tomadoHoy: false }, { id: '4', nombre: 'D', tomadoHoy: true },
    ];
    const a = accionSuplementosDeHoy(cuatro)!;
    expect(a.key).toBe(KEY_ACCION_SUPLEMENTOS);
    expect(a.tipo).toBe('suplementos');
    expect(a.hecha).toBe(false);
    expect(a.detalle).toBe('3 pendientes: A, B y 1 más.');
    expect(a.firma).toBe('Asignado por Enrique');
    const dos = accionSuplementosDeHoy([{ id: '1', nombre: 'A', tomadoHoy: false }, { id: '2', nombre: 'B', tomadoHoy: false }])!;
    expect(dos.detalle).toBe('2 pendientes: A y B.');
    const uno = accionSuplementosDeHoy([{ id: '1', nombre: 'A', tomadoHoy: false }])!;
    expect(uno.detalle).toBe('1 pendiente: A.');
    const hecha = accionSuplementosDeHoy(cuatro.map((s) => ({ ...s, tomadoHoy: true })))!;
    expect(hecha.hecha).toBe(true);
    expect(hecha.detalle).toBe('Las 4 tomas de hoy ya están registradas.');
    expect(accionSuplementosDeHoy([{ id: '1', nombre: 'A', tomadoHoy: true }])!.detalle).toBe('La toma de hoy ya está registrada.');
    expect(accionSuplementosDeHoy([])).toBeNull();
  });
});

describe('palancas de Omar', () => {
  const e = omar();
  const marcadores = e.marcadores.grupos.flatMap((g) => g.marcadores).concat(e.composicion.filas);
  it('tokens: cuatro letras o mas, sin acentos, sin vacias', () => {
    expect(tokensDePalanca('Tu hígado y el alcohol')).toEqual(['higado', 'alcohol']);
    expect(tokensDePalanca('Insulina en ayuno alta')).toEqual(['insulina']);
  });
  it('cada palanca encuentra el marcador de Enrique que la justifica', () => {
    const [p1, p2, p3] = e.cierre.palancas;
    expect(marcadorDePalanca(p1, marcadores)?.key).toBe('ggt');
    // "insulina" se repite cuatro veces en la palanca 2: gana sobre "grasa alrededor de los organos" (tres palabras, una vez).
    expect(marcadorDePalanca(p2, marcadores)?.key).toBe('homair');
    expect(marcadorDePalanca(p3, marcadores)?.key).toBe('sueno_deep');
  });
  it('sin palabras en comun no se inventa un marcador y la firma es generica', () => {
    const m = marcadorDePalanca({ titulo: 'Caminar', por_que: 'Porque si', como: 'Diario' }, marcadores);
    expect(m).toBeNull();
    const acciones = accionesDePalancas({ ...e, cierre: { ...e.cierre, palancas: [{ titulo: 'Caminar', por_que: 'Porque si', como: 'Diario' }, e.cierre.palancas[1], e.cierre.palancas[2]] } }, 3);
    expect(acciones[0].firma).toBe('De tu evaluación con Enrique');
    expect(acciones[0].porMarcador).toBeNull();
  });
  it('los marcadores opt nunca justifican una palanca', () => {
    const soloOpt = marcadores.map((m) => ({ ...m, estado: 'opt' as const }));
    expect(marcadorDePalanca(e.cierre.palancas[0], soloOpt)).toBeNull();
  });
  it('las acciones llevan el titulo y el como de Enrique, no se palomean y respetan el tope', () => {
    const acciones = accionesDePalancas(e, 2);
    expect(acciones).toHaveLength(2);
    expect(acciones[0]).toMatchObject({
      key: 'elite_palanca_1', tipo: 'palanca', titulo: 'Tu hígado y el alcohol', origen: 'plan',
      userInterventionId: null, hecha: false, firma: 'Enrique lo eligió por tu Enzima del hígado (GGT)',
    });
    expect(accionesDePalancas(e, 0)).toEqual([]);
  });
});

describe('marcadoresFueraDeEvaluacion', () => {
  it('att pesa como atencion, sub como aceptable, opt no entra; sin llaves repetidas', () => {
    const fuera = marcadoresFueraDeEvaluacion(omar());
    expect(fuera.find((f) => f.key === 'ggt')?.estado).toBe('atencion');
    expect(fuera.find((f) => f.key === 'colesterol_ldl' || f.etiqueta.includes('LDL'))?.estado).toBe('aceptable');
    expect(fuera.some((f) => f.etiqueta === 'Colesterol total')).toBe(false);
    expect(new Set(fuera.map((f) => f.key)).size).toBe(fuera.length);
    expect(fuera[0].nombres).toEqual([fuera[0].etiqueta]);
  });
});

describe('componerTernaElite', () => {
  const e = omar();
  const relleno: AccionHoy[] = ['hidratacion_matutina', 'caminata_postprandial', 'recordatorio_dormir'].map((key) => ({
    key, titulo: key, detalle: '', origen: 'base', userInterventionId: null, porMarcador: null, hecha: false,
  }));
  const supls: SuplementoHoy[] = [{ id: '1', nombre: 'Magnesio', tomadoHoy: false }];
  it('con plan de suplementos: la toma primero y dos palancas; nunca mas de tres', () => {
    const terna = componerTernaElite(e, supls, relleno);
    expect(terna.map((a) => a.key)).toEqual([KEY_ACCION_SUPLEMENTOS, 'elite_palanca_1', 'elite_palanca_2']);
  });
  it('sin suplementos del plan: las tres palancas', () => {
    expect(componerTernaElite(e, [], relleno).map((a) => a.key)).toEqual(['elite_palanca_1', 'elite_palanca_2', 'elite_palanca_3']);
  });
  it('lo que no viene del plan cae a lo de siempre, sin repetir llave', () => {
    const sinPalancas = { ...e, cierre: { ...e.cierre, palancas: [e.cierre.palancas[0]] as unknown as EliteV3['cierre']['palancas'] } };
    const terna = componerTernaElite(sinPalancas, supls, relleno);
    expect(terna.map((a) => a.key)).toEqual([KEY_ACCION_SUPLEMENTOS, 'elite_palanca_1', 'hidratacion_matutina']);
    expect(componerTernaElite(sinPalancas, [], [...relleno, relleno[0]]).map((a) => a.key)).toEqual(['elite_palanca_1', 'hidratacion_matutina', 'caminata_postprandial']);
  });
  it('ningun copy de la terna trae em dash, palabras rojas ni rastros de venta', () => {
    for (const a of componerTernaElite(e, supls, relleno)) {
      for (const s of [a.titulo, a.detalle, a.firma ?? '']) {
        expect(s).not.toContain(EM_DASH);
        expect(s).not.toMatch(ROJAS);
        expect(s).not.toMatch(VENTA);
      }
    }
  });
});
