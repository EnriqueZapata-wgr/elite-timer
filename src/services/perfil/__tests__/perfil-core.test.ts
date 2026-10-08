/**
 * Tests de perfil-core (8-oct-2026 (v4)). Se corren con
 * `node scripts/run-tests-sin-vitest.js src/services/perfil/__tests__/perfil-core.test.ts`.
 *
 * Candados (no aflojar sin escribir aqui por que):
 *  - Un programa nunca lee "Elite" en su Perfil.
 *  - Lo que el documento no trae no aparece (sin heroe sin Edad ATP, sin
 *    pestana de Cruces sin cruces) y nada se vuelve cero.
 *  - "Lo mueve en tu plan" no inventa: sin vinculo, lista vacia; una parte
 *    del plan que no se leyo se dice, no se calla.
 *  - Sin raya larga ni palabras rojas en lo que lee el cliente.
 *  - La foto del heroe sale del banco sin persona de HOY.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { palabrasRojasEn, validarEliteV3, type EliteMarcador, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import { IMAGENES_PROGRAMA_SIN_PERSONA } from '@/src/services/hoy/hoy-resumen-core';
import {
  CEJA_PERFIL, ETIQUETA_FUERZA, IMAGENES_PERFIL_SIN_PERSONA, PARAM_MARCADOR, RUTAS_PERFIL, TEXTO_LAB_OK_NO_NUESTRO,
  TITULO_ENTREGA_1, TITULO_ENTREGA_2, TITULO_SIN_EVALUACION,
  marcadorDelParametro, nombreDeSuplementoNombraMarcador, siglasDe,
  avisoVinculosNoLeidos, detalleMarcador, entregaDe, estadoPerfil, filtrarGruposPorSistema, imagenPerfilKey,
  inicialDe, lecturaGeneralDe, perfilDesdeDocumento, sistemasDeMarcador, textoNombraMarcador, textosSinDocumento,
  tokensVinculo, vincularMarcadorPlan,
  type InsumosVinculo, type PracticaParaVinculo, type SuplementoParaVinculo,
} from '../perfil-core';

function leer(ruta: string): Record<string, any> {
  return JSON.parse(readFileSync(resolve(process.cwd(), ruta), 'utf8'));
}
function valido(obj: unknown): EliteV3 {
  const r = validarEliteV3(obj);
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}
const eliteCrudo = () => leer('R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json');
const programaCrudo = () => leer('R and D/diagnostico/programa_ejemplo.json');
const elite = () => valido(eliteCrudo());
const programa = () => valido(programaCrudo());

/** Elite sin genetica ni cruces: la primera entrega. */
function eliteEntrega1(): EliteV3 {
  const o = eliteCrudo();
  o.genetica.hallazgos = [];
  o.cruces = { hilo: null, lista: [] };
  o.conteo.hallazgos_adn = null;
  return valido(o);
}

function marcador(p: Partial<EliteMarcador> & { key: string; nombre: string }): EliteMarcador {
  return {
    valor: null, unidad: null, rango_lab: null, objetivo: null, estado: null, fuente: ['lab'],
    evidencia: null, estimado: false, ...p,
  };
}

/** Todas las cadenas de un objeto (para revisar copy). */
function cadenas(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((y) => cadenas(y, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((y) => cadenas(y, out));
  return out;
}

const EM_DASH = '\u2014';

describe('perfilDesdeDocumento: Elite completa (entrega 2)', () => {
  const v = perfilDesdeDocumento(elite());

  it('cabecera: ceja, titulo de entrega 2, pildora con fecha e inicial del nombre preferido', () => {
    expect(v.ceja).toBe(CEJA_PERFIL);
    expect(v.entrega).toBe(2);
    expect(v.titulo).toBe(TITULO_ENTREGA_2);
    expect(v.pildora).toBe('Entrega 2 · 6 de septiembre de 2026');
    expect(v.inicial).toBe('O');
    expect(v.esPrograma).toBe(false);
  });

  it('heroe: Edad ATP, delta con referente y la linea solo con lo que existe', () => {
    expect(v.hero).not.toBeNull();
    expect(v.hero!.edad).toBe('44.5');
    expect(v.hero!.delta).toContain('por encima de tu edad real');
    expect(v.hero!.tono).toBe('advertencia');
    expect(v.hero!.linea).toBe('Sangre 32.7 · Vida 48.4 · Ritmo 15.6 meses por año');
    expect(v.hero!.accesible).toContain('Tu Edad ATP: 44.5');
    expect(v.lead).toBeNull();
  });

  it('pestanas: las cuatro y arranca en Cruces', () => {
    expect(v.pestanas).toEqual(['sistemas', 'marcadores', 'cruces', 'genetica']);
    expect(v.pestanaInicial).toBe('cruces');
  });

  it('sistemas: diez, de peor a mejor, con su fraccion y su token', () => {
    expect(v.sistemas.length).toBe(10);
    expect(v.sistemas[0].key).toBe('metabolismo');
    expect(v.sistemas[0].fraccion).toBe(0.29);
    expect(v.sistemas[0].token).toBe('critico');
    expect(v.sistemas[0].etiqueta).toBe('Pide acción');
    expect(v.sistemas[9].estado).toBe('opt');
    const rango = { att: 0, sub: 1, opt: 2 } as Record<string, number>;
    for (let i = 1; i < v.sistemas.length; i++) {
      expect(rango[v.sistemas[i - 1].estado!] <= rango[v.sistemas[i].estado!]).toBe(true);
    }
    expect(v.leyenda.map((l) => l.estado)).toEqual(['opt', 'sub', 'att']);
  });

  it('marcadores: agrupados por estado, primero los que piden accion, sin perder ninguno', () => {
    expect(v.grupos.map((g) => g.estado)).toEqual(['att', 'sub', 'opt']);
    expect(v.grupos[0].titulo).toBe('Pide acción');
    const total = v.grupos.reduce((n, g) => n + g.marcadores.length, 0);
    expect(total).toBe(34);
    const ggt = v.grupos[0].marcadores.find((m) => m.key === 'ggt')!;
    expect(ggt.valorTexto).toBe('67');
    expect(ggt.etiqueta).toBe('Pide acción');
  });

  it('un sistema filtra marcadores cuando la matriz dice donde caen', () => {
    const meta = v.sistemas.find((s) => s.key === 'metabolismo')!;
    expect(meta.filtraMarcadores).toBe(true);
    expect(meta.nMarcadores).toBe(filtrarGruposPorSistema(v.grupos, 'metabolismo').reduce((n, g) => n + g.marcadores.length, 0));
    const habitos = v.sistemas.find((s) => s.key === 'habitos')!;
    expect(habitos.filtraMarcadores).toBe(false);
    expect(habitos.nMarcadores).toBe(0);
    const filtrados = filtrarGruposPorSistema(v.grupos, 'metabolismo');
    const llaves = filtrados.flatMap((g) => g.marcadores.map((m) => m.key));
    expect(llaves.includes('homair')).toBe(true);
    expect(llaves.includes('magnesio')).toBe(false);
    expect(filtrados.every((g) => g.marcadores.length > 0)).toBe(true);
    expect(filtrarGruposPorSistema(v.grupos, null).length).toBe(v.grupos.length);
  });

  it('cruces: origenes desde las fuentes, en orden fijo', () => {
    expect(v.cruces.length).toBe(6);
    expect(v.cruces[0].origenes).toEqual(['genetica', 'laboratorio', 'vida']);
    expect(v.cruces[1].origenes).toEqual(['genetica', 'laboratorio']);
    expect(v.cruces[0].accion.length > 0).toBe(true);
  });

  it('genetica: la lista de hallazgos', () => {
    expect(v.genetica.estado).toBe('hallazgos');
    if (v.genetica.estado === 'hallazgos') expect(v.genetica.hallazgos.length).toBe(22);
  });

  it('copy: sin raya larga ni palabras rojas', () => {
    for (const s of cadenas({ ...v, voz: null })) {
      expect(s.includes(EM_DASH)).toBe(false);
      expect(palabrasRojasEn(s)).toEqual([]);
    }
  });
});

describe('perfilDesdeDocumento: Elite entrega 1', () => {
  const v = perfilDesdeDocumento(eliteEntrega1());

  it('titulo de entrega 1, sin pestana de Cruces, arranca en Sistemas', () => {
    expect(entregaDe(eliteEntrega1())).toBe(1);
    expect(v.titulo).toBe(TITULO_ENTREGA_1);
    expect(v.pildora!.startsWith('Entrega 1')).toBe(true);
    expect(v.pestanas).toEqual(['sistemas', 'marcadores', 'genetica']);
    expect(v.pestanaInicial).toBe('sistemas');
  });

  it('genetica: llega en la segunda entrega', () => {
    expect(v.genetica.estado).toBe('por_llegar');
    if (v.genetica.estado !== 'hallazgos') expect(v.genetica.titulo).toBe('Tu genética llega en tu segunda entrega');
  });

  it('cruces sin genetica: entrega 2 sin prometer genetica', () => {
    const o = eliteCrudo();
    o.genetica.hallazgos = [];
    o.conteo.hallazgos_adn = null;
    const x = perfilDesdeDocumento(valido(o));
    expect(x.entrega).toBe(2);
    expect(x.genetica.estado).toBe('no_incluida');
  });
});

describe('perfilDesdeDocumento: programa', () => {
  const v = perfilDesdeDocumento(programa(), { nombrePerfil: 'Otro' });

  it('nunca dice Elite', () => {
    for (const s of cadenas(v)) expect(/elite/i.test(s)).toBe(false);
  });

  it('sin entregas: pildora con version; sin heroe, con la frase del documento', () => {
    expect(v.esPrograma).toBe(true);
    expect(v.entrega).toBeNull();
    expect(v.pildora).toBe('Versión 1 · 8 de octubre de 2026');
    expect(v.hero).toBeNull();
    expect(v.lead).toContain('Doce semanas');
    expect(v.inicial).toBe('A');
  });

  it('sin evaluacion: lo dice con un titulo honesto y sin pestanas (Genetica no se abre en un programa sin ella)', () => {
    expect(v.conEvaluacion).toBe(false);
    expect(v.titulo).toBe(TITULO_SIN_EVALUACION);
    expect(v.sinEvaluacion).not.toBeNull();
    expect(v.sinEvaluacion!.titulo).toBe('Tu programa no trae evaluación de laboratorio');
    expect(v.pestanas).toEqual([]);
    expect(v.pestanaInicial).toBeNull();
    expect(v.genetica.estado).toBe('no_incluida');
  });

  it('copy: sin raya larga ni palabras rojas', () => {
    for (const s of cadenas({ ...v, voz: null })) {
      expect(s.includes(EM_DASH)).toBe(false);
      expect(palabrasRojasEn(s)).toEqual([]);
    }
  });

  it('programa con un marcador sin estado: grupo "Otras medidas" y sin etiqueta de estado', () => {
    const o = programaCrudo();
    o.marcadores.grupos = [{ nombre: 'Báscula', marcadores: [marcador({ key: 'peso', nombre: 'Peso', valor: 62, unidad: 'kg' })] }];
    const x = perfilDesdeDocumento(valido(o));
    expect(x.conEvaluacion).toBe(true);
    expect(x.sinEvaluacion).toBeNull();
    expect(x.grupos.length).toBe(1);
    expect(x.grupos[0].titulo).toBe('Otras medidas');
    expect(x.grupos[0].marcadores[0].etiqueta).toBeNull();
    expect(x.grupos[0].marcadores[0].valorTexto).toBe('62 kg');
    expect(x.pestanas).toEqual(['marcadores']);
    expect(x.titulo).toBe(TITULO_ENTREGA_1);
  });
});

describe('inicialDe', () => {
  it('primera letra en mayuscula, con acento; null si no empieza con letra', () => {
    expect(inicialDe('ángel')).toBe('Á');
    expect(inicialDe('  omar')).toBe('O');
    expect(inicialDe('1abc')).toBeNull();
    expect(inicialDe('')).toBeNull();
    expect(inicialDe(null)).toBeNull();
  });
  it('sin nombre preferido usable cae al del perfil', () => {
    const o = eliteCrudo();
    o.cliente.nombre_preferido = '.';
    expect(perfilDesdeDocumento(valido(o), { nombrePerfil: 'beto' }).inicial).toBe('B');
  });
});

describe('estadoPerfil', () => {
  it('cargando, no se pudo leer (con su motivo), sin documento y documento son distintos', () => {
    expect(estadoPerfil(null).tipo).toBe('cargando');
    expect(estadoPerfil({ ok: false })).toEqual({ tipo: 'no_se_pudo_leer', motivo: 'lectura' });
    expect(estadoPerfil({ ok: false, motivo: 'formato' })).toEqual({ tipo: 'no_se_pudo_leer', motivo: 'formato' });
    expect(estadoPerfil({ ok: true, evaluacion: null }).tipo).toBe('sin_documento');
    expect(estadoPerfil({ ok: true, evaluacion: elite() }).tipo).toBe('documento');
  });
  it('la tarjeta sin documento usa la voz', () => {
    expect(textosSinDocumento({ documento: 'tu evaluación' }).titulo).toBe('Tu perfil se arma con tu evaluación');
    expect(textosSinDocumento({ documento: 'tu programa' }).titulo).toBe('Tu perfil se arma con tu programa');
    for (const s of cadenas(textosSinDocumento({ documento: 'tu programa' }))) {
      expect(s.includes(EM_DASH)).toBe(false);
      expect(palabrasRojasEn(s)).toEqual([]);
    }
  });
});

describe('detalleMarcador', () => {
  it('dentro del laboratorio y fuera de donde te queremos: el aviso, y la geometria en orden', () => {
    const d = detalleMarcador(marcador({
      key: 'glucosa_en_ayuno', nombre: 'Glucosa', valor: 95, unidad: 'mg/dL',
      rango_lab: { min: 70, max: 99 }, objetivo: { min: 75, max: 90 }, estado: 'sub', evidencia: 2, nota: 'Tuya.',
    }));
    expect(d.labOkNoNuestro).toBe(true);
    expect(d.avisoLabOk).toBe(TEXTO_LAB_OK_NO_NUESTRO);
    const b = d.barra!;
    expect(b.lab!.desde < b.objetivo!.desde).toBe(true);
    expect(b.objetivo!.hasta < b.punto).toBe(true);
    expect(b.punto < b.lab!.hasta).toBe(true);
    for (const x of [b.lab!.desde, b.lab!.hasta, b.objetivo!.desde, b.objetivo!.hasta, b.punto]) {
      expect(x >= 0 && x <= 1).toBe(true);
    }
    expect(b.etiquetaLab).toBe('Laboratorio: 70 a 99');
    expect(b.etiquetaObjetivo).toBe('Donde te queremos: 75 a 90');
    expect(d.evidencia).toBe('Dentro del laboratorio, fuera del criterio funcional');
    expect(d.lecturaPersonal).toBe('Tuya.');
    expect(d.lecturaGeneral).not.toBeNull();
    expect(d.valorTexto).toBe('95 mg/dL');
  });

  it('sin rango del laboratorio no hay aviso, aunque este fuera del objetivo', () => {
    const d = detalleMarcador(marcador({ key: 'ggt', nombre: 'GGT', valor: 67, objetivo: { min: null, max: 30 }, estado: 'att' }));
    expect(d.labOkNoNuestro).toBe(false);
    expect(d.avisoLabOk).toBeNull();
    expect(d.barra!.lab).toBeNull();
    expect(d.barra!.objetivo!.desde).toBe(0);
    expect(d.barra!.punto > d.barra!.objetivo!.hasta).toBe(true);
    expect(d.barra!.etiquetaObjetivo).toBe('Donde te queremos: hasta 30');
  });

  it('dentro de los dos rangos: sin aviso', () => {
    const d = detalleMarcador(marcador({ key: 'x', nombre: 'X', valor: 80, rango_lab: { min: 70, max: 99 }, objetivo: { min: 75, max: 90 } }));
    expect(d.labOkNoNuestro).toBe(false);
  });

  it('sin valor o sin ningun rango, no hay barra', () => {
    expect(detalleMarcador(marcador({ key: 'x', nombre: 'X', objetivo: { min: 1, max: 2 } })).barra).toBeNull();
    expect(detalleMarcador(marcador({ key: 'x', nombre: 'X', valor: 3 })).barra).toBeNull();
  });

  it('un objetivo de un solo punto no rompe la geometria', () => {
    const b = detalleMarcador(marcador({ key: 'x', nombre: 'X', valor: 5, objetivo: { min: 5, max: 5 } })).barra!;
    expect(Number.isFinite(b.punto)).toBe(true);
    expect(b.max > b.min).toBe(true);
  });

  it('el dominio no baja de cero para medidas positivas', () => {
    const b = detalleMarcador(marcador({ key: 'x', nombre: 'X', valor: 1, objetivo: { min: 2, max: 40 } })).barra!;
    expect(b.min).toBe(0);
  });

  it('estimado se dice en el valor; en un programa sin estado no hay etiqueta', () => {
    const d = detalleMarcador(marcador({ key: 'x', nombre: 'X', valor: 3, unidad: 'kg', estimado: true }), { programa: true });
    expect(d.valorTexto).toBe('3 kg (estimado)');
    expect(d.etiqueta).toBeNull();
  });

  it('lectura general por alias (ggt) y null si no hay ficha escrita', () => {
    expect(lecturaGeneralDe('ggt')).not.toBeNull();
    expect(lecturaGeneralDe('no_existe_esta_clave')).toBeNull();
  });
});

describe('sistemasDeMarcador', () => {
  it('la matriz dice el sistema de una llave; una llave desconocida no cae en ninguno', () => {
    expect(sistemasDeMarcador('homair').includes('metabolismo')).toBe(true);
    expect(sistemasDeMarcador('nada_que_ver')).toEqual([]);
  });
});

describe('vincularMarcadorPlan', () => {
  const doc = elite();
  const marcadores = doc.marcadores.grupos.flatMap((g) => g.marcadores).concat(doc.composicion.filas);
  const porKey = (k: string) => marcadores.find((m) => m.key === k)!;
  const suplementos: SuplementoParaVinculo[] = doc.suplementos.map((s, i) => ({ id: `s${i}`, nombre: s.nombre, razon: s.por_que }));
  const practicas: PracticaParaVinculo[] = [
    { key: 'caminata_postprandial', nombre: 'Caminata después de comer', raices: ['resistencia_insulina'], marcadores: ['glucosa_postprandial_2h'] },
    { key: 'ayuno_x', nombre: 'Ventana de comida', raices: [], marcadores: ['HOMA-IR', 'insulina_ayunas'] },
    { key: 'sin_nada', nombre: 'Algo sin relacion', raices: ['otra'], marcadores: ['VO2max'] },
  ];
  const insumos: InsumosVinculo = { suplementos, practicas, palancas: doc.cierre.palancas };

  it('HOMA-IR: practica por llave primero, luego por nombre', () => {
    const r = vincularMarcadorPlan(porKey('homair'), insumos);
    expect(r.noSePudoLeer).toEqual([]);
    expect(r.vinculos[0].tipo).toBe('practica');
    expect(r.vinculos[0].id).toBe('practica:caminata_postprandial');
    expect(r.vinculos[0].fuerza).toBe('llave');
    expect(r.vinculos[0].ruta).toBe(RUTAS_PERFIL.plan);
    expect(r.vinculos[1].id).toBe('practica:ayuno_x');
    expect(r.vinculos[1].fuerza).toBe('nombre');
    expect(r.vinculos.some((v) => v.id === 'practica:sin_nada')).toBe(false);
    expect(r.vinculos[0].etiquetaFuerza).toBe(ETIQUETA_FUERZA.llave);
  });

  it('vitamina D: su suplemento sí; ni el de B12 ni la K2 (cuyo porque dice "acompaña a la vitamina D")', () => {
    const r = vincularMarcadorPlan(porKey('vitamina_d'), insumos);
    const nombres = r.vinculos.filter((v) => v.tipo === 'suplemento').map((v) => v.titulo);
    expect(nombres).toEqual(['Vitamina D3']);
    const d3 = r.vinculos.find((v) => v.titulo === 'Vitamina D3')!;
    expect(d3.ruta).toBe(RUTAS_PERFIL.suplementos);
    expect(d3.fuerza).toBe('texto');
  });

  it('B12: el suplemento de B12, no el de vitamina D', () => {
    const r = vincularMarcadorPlan(porKey('vitamina_b12'), insumos);
    const nombres = r.vinculos.map((v) => v.titulo);
    expect(nombres.includes('Vitamina B12 sublingual')).toBe(true);
    expect(nombres.includes('Vitamina D3')).toBe(false);
  });

  it('GGT: la palanca que la nombra por sus siglas', () => {
    const r = vincularMarcadorPlan(porKey('ggt'), insumos);
    expect(r.vinculos.some((v) => v.id === 'palanca:1' && v.tipo === 'palanca' && v.ruta === RUTAS_PERFIL.programa)).toBe(true);
  });

  it('trigliceridos (grasa en sangre) no se ligan a la palanca de la grasa de los organos', () => {
    const r = vincularMarcadorPlan(porKey('trigliceridos'), insumos);
    expect(r.vinculos.some((v) => v.tipo === 'palanca')).toBe(false);
  });

  it('la grasa alrededor de los organos si se liga a su palanca (frase completa)', () => {
    const r = vincularMarcadorPlan(porKey('grasa_visceral'), insumos);
    expect(r.vinculos.map((v) => v.id)).toEqual(['palanca:2']);
  });

  it('el porque de un suplemento no liga: solo su nombre', () => {
    const r = vincularMarcadorPlan(porKey('sueno_deep'), insumos);
    expect(r.vinculos.some((v) => v.tipo === 'suplemento')).toBe(false);
    const mg = vincularMarcadorPlan(porKey('magnesio'), insumos);
    expect(mg.vinculos.filter((v) => v.tipo === 'suplemento').map((v) => v.titulo)).toEqual(['Magnesio (glicinato)']);
  });

  it('en toda la muestra, cada vinculo de texto es uno que se puede defender', () => {
    const esperados: Record<string, string[]> = {
      ggt: ['palanca:1'],
      grasa_visceral: ['palanca:2'],
      vitamina_d: ['suplemento:s1'],
      magnesio: ['suplemento:s0'],
      vitamina_b12: ['suplemento:s4'],
    };
    const sinPracticas = { ...insumos, practicas: [] };
    for (const m of marcadores) {
      const ids = vincularMarcadorPlan(m, sinPracticas).vinculos.map((v) => v.id);
      expect([m.key, ids]).toEqual([m.key, esperados[m.key] ?? []]);
    }
  });

  it('sin vinculo: lista vacia (no se inventa)', () => {
    const r = vincularMarcadorPlan(porKey('estatura'), insumos);
    expect(r.vinculos).toEqual([]);
  });

  it('una parte que no se leyo se dice, y lo demas sigue', () => {
    const r = vincularMarcadorPlan(porKey('ggt'), { ...insumos, suplementos: null });
    expect(r.noSePudoLeer).toEqual(['suplementos']);
    expect(r.vinculos.some((v) => v.tipo === 'palanca')).toBe(true);
    expect(avisoVinculosNoLeidos(r.noSePudoLeer)).toBe('No pudimos leer tus suplementos para ver qué mueve este marcador.');
    const r2 = vincularMarcadorPlan(porKey('ggt'), { ...insumos, suplementos: null, practicas: null });
    expect(avisoVinculosNoLeidos(r2.noSePudoLeer)).toBe('No pudimos leer tus suplementos ni tus prácticas para ver qué mueve este marcador.');
    expect(avisoVinculosNoLeidos([])).toBeNull();
  });

  it('una misma cosa aparece una vez, con su vinculo mas fuerte', () => {
    const doble: PracticaParaVinculo = { key: 'doble', nombre: 'Doble', raices: ['resistencia_insulina'], marcadores: ['HOMA-IR'] };
    const r = vincularMarcadorPlan(porKey('homair'), { ...insumos, practicas: [doble, doble] });
    const d = r.vinculos.filter((v) => v.id === 'practica:doble');
    expect(d.length).toBe(1);
    expect(d[0].fuerza).toBe('llave');
  });
});

describe('textoNombraMarcador, nombreDeSuplementoNombraMarcador y siglasDe', () => {
  const N = (key: string, nombre: string) => ({ key, nombre });
  it('siglas solo si el parentesis es un codigo corto sin espacios', () => {
    expect(siglasDe('Enzima del hígado (GGT)')).toEqual(['ggt']);
    expect(siglasDe('Resistencia (HOMA-IR)')).toEqual(['homa', 'ir']);
    expect(siglasDe('Inflamación (PCR convencional)')).toEqual([]);
    expect(siglasDe('Marcador de daño en tus vasos (homocisteína)')).toEqual([]);
  });
  it('si: siglas, llave-codigo o dos palabras seguidas', () => {
    expect(textoNombraMarcador(N('ggt', 'Enzima del hígado (GGT)'), 'GGT a las 8 semanas')).toBe(true);
    expect(textoNombraMarcador(N('homair', 'Resistencia a la insulina'), 'Baja tu HOMAIR')).toBe(true);
    expect(textoNombraMarcador(N('x', 'Sueño profundo'), 'Mas sueño profundo cada noche')).toBe(true);
  });
  it('no: una sola palabra, aunque sea la del marcador', () => {
    expect(textoNombraMarcador(N('ggt', 'Enzima del hígado (GGT)'), 'Cuida tu hígado')).toBe(false);
    expect(textoNombraMarcador(N('peso', 'Peso'), 'Empiezas con poco peso en la barra')).toBe(false);
    expect(textoNombraMarcador(N('hierro', 'Hierro'), 'Tomar lejos del hierro')).toBe(false);
    expect(textoNombraMarcador(N('pcr', 'Inflamación (PCR convencional)'), 'Baja la inflamación')).toBe(false);
    expect(textoNombraMarcador(N('x', 'Tiroides (TSH)'), 'Cuida tu tiroides')).toBe(false);
    expect(textoNombraMarcador(N('trigliceridos', 'Triglicéridos (grasa en sangre)'), 'Grasa alrededor de los órganos')).toBe(false);
    expect(textoNombraMarcador(N('x', 'Magnesio'), '')).toBe(false);
  });
  it('no: vitaminas con otra letra', () => {
    expect(textoNombraMarcador(N('vitamina_a', 'Vitamina A'), 'Vitamina D en 18.7')).toBe(false);
    expect(textoNombraMarcador(N('vitamina_e', 'Vitamina E'), 'Vitamina B12 sublingual')).toBe(false);
    expect(textoNombraMarcador(N('x', 'Vitamina B12'), 'Vitamina D3')).toBe(false);
    expect(textoNombraMarcador(N('vitamina_d', 'Vitamina D'), 'Vitamina D3')).toBe(true);
    expect(textoNombraMarcador(N('vitamina_a', 'Vitamina A'), 'Vitamina A con la comida')).toBe(true);
    expect(textoNombraMarcador(N('vitamina_a', 'Vitamina A'), 'Toma tu vitamina a la misma hora')).toBe(false);
    expect(nombreDeSuplementoNombraMarcador(N('vitamina_a', 'Vitamina A'), 'Toma tu vitamina a la misma hora')).toBe(false);
    expect(textoNombraMarcador(N('x', 'Vitamina B12'), 'vitamina b12 sublingual')).toBe(true);
  });
  it('no: mencion negada, de compania o de distancia', () => {
    expect(textoNombraMarcador(N('vitamina_d', 'Vitamina D'), 'Acompaña a la vitamina D.')).toBe(false);
    expect(textoNombraMarcador(N('x', 'Sueño profundo'), 'sin freno no hay sueño profundo')).toBe(false);
    expect(textoNombraMarcador(N('ggt', 'Enzima (GGT)'), 'Tomar lejos de la GGT')).toBe(false);
    expect(textoNombraMarcador(N('colesterol_ldl', 'Colesterol (LDL)'), 'El LDL no es el objetivo')).toBe(false);
    expect(textoNombraMarcador(N('colesterol_ldl', 'Colesterol (LDL)'), 'Baja tu LDL con fibra')).toBe(true);
  });
  it('suplemento: por su nombre; una palabra solo si es el nutriente que lo nombra', () => {
    expect(nombreDeSuplementoNombraMarcador(N('magnesio', 'Magnesio'), 'Magnesio (glicinato)')).toBe(true);
    expect(nombreDeSuplementoNombraMarcador(N('hierro', 'Hierro'), 'Hierro bisglicinato')).toBe(true);
    expect(nombreDeSuplementoNombraMarcador(N('hierro', 'Hierro'), 'Vitamina C para el hierro')).toBe(false);
    expect(nombreDeSuplementoNombraMarcador(N('vitamina_d', 'Vitamina D'), 'Vitamina K2')).toBe(false);
    expect(nombreDeSuplementoNombraMarcador(N('vitamina_d', 'Vitamina D'), 'Vitamina D3')).toBe(true);
  });
  it('la letra que sigue a "vitamina" siempre cuenta', () => {
    expect(tokensVinculo('Vitamina A').map((x) => x.util)).toEqual([true, true]);
    expect(tokensVinculo('vitamina a la').map((x) => x.util)).toEqual([true, false, false]);
    expect(tokensVinculo('a la').some((x) => x.util)).toBe(false);
  });
});

describe('marcadorDelParametro', () => {
  const v = perfilDesdeDocumento(elite());
  it('el nombre del parametro es estable', () => {
    expect(PARAM_MARCADOR).toBe('marcador');
  });
  it('solo una llave que el documento trae; texto o lista', () => {
    expect(marcadorDelParametro('ggt', v)).toBe('ggt');
    expect(marcadorDelParametro(['homair', 'x'], v)).toBe('homair');
    expect(marcadorDelParametro('no_existe', v)).toBeNull();
    expect(marcadorDelParametro(undefined, v)).toBeNull();
    expect(marcadorDelParametro('ggt', null)).toBeNull();
  });
});

describe('imagen del heroe', () => {
  it('sale del banco sin persona de HOY y es estable por semilla', () => {
    const banco = new Set<string>(Object.values(IMAGENES_PROGRAMA_SIN_PERSONA).flat());
    for (const k of IMAGENES_PERFIL_SIN_PERSONA) expect(banco.has(k)).toBe(true);
    expect(imagenPerfilKey('u-2026-10-08')).toBe(imagenPerfilKey('u-2026-10-08'));
    expect(IMAGENES_PERFIL_SIN_PERSONA.includes(imagenPerfilKey(undefined))).toBe(true);
  });
  it('PerfilHero carga exactamente esos archivos y ningun otro', () => {
    const fuente = readFileSync(resolve(process.cwd(), 'src/components/v4/perfil/PerfilHero.tsx'), 'utf8');
    const cargadas = [...fuente.matchAll(/require\('@\/assets\/images\/([^']+)'\)/g)].map((m) => m[1]).sort();
    const esperadas = IMAGENES_PERFIL_SIN_PERSONA.map((k) => `hoy-extra/tu-dia/${k}.webp`).sort();
    expect(cargadas).toEqual(esperadas);
  });
});
