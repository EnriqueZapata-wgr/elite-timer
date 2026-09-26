/**
 * Candado del navegador de ARGOS (NOCHE-ARGOS).
 *
 * Lo que este archivo protege no es el algoritmo, es el CONTRATO: ARGOS navega
 * cuando está seguro y PREGUNTA cuando no. Un cambio que suba la tasa de acierto
 * pero empiece a adivinar en los casos ambiguos rompe el producto, no lo mejora.
 *
 * Las frases de abajo están escritas como las diría el usuario, en es-MX, con
 * muletillas incluidas. Si alguna deja de resolver, la tabla de alias es lo
 * primero que hay que mirar.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolverDestino,
  validarRutaPropuesta,
  rutaVetada,
  tokenizar,
  normalizar,
  singularizar,
  limpiarDescripcion,
  tituloDe,
  tituloDesdeRuta,
  obtenerIndice,
  RUTAS_VETADAS,
  TITULOS_RUTA,
  aliasRuta,
  ALIAS_RUTA_BASE,
  ALIAS_SALAS_ELITE_DX,
  esAliasPuro,
} from '../argos-nav-resolver-core';
// 26-sep-2026 (una app, dos modos): el resolvedor ya no lee una constante al
// cargar; lee el modo de la cuenta al llamar. Las pruebas recorren LOS DOS
// modos en vez de ramificar sobre la bandera, que solo probaba uno.
import { fijarModoPorCuenta, reiniciarModoParaPruebas } from '@/src/services/modo-app/modo-app-estado';
import type { ModoApp } from '@/src/services/modo-app/modo-app-core';
import { APP_ROUTES,
  APP_ROUTE_ALIASES, APP_ROUTES_DYNAMIC } from '@/src/constants/app-routes.generated';
import {
  esPlantilla,
  expandirPlantilla,
  expandirTodas,
  plantillasHuerfanas,
  PLANTILLAS_SIN_EXPANSION,
} from '../argos-nav-dinamicas-core';
import { ASSESSMENTS } from '@/src/constants/assessments';

const MODOS: readonly ModoApp[] = ['elite_dx', 'atp'];

/** Fija el modo antes de cada prueba del describe y lo deja limpio despues. */
function enModo(modo: ModoApp): void {
  beforeEach(() => {
    reiniciarModoParaPruebas();
    fijarModoPorCuenta(modo);
  });
  afterEach(() => reiniciarModoParaPruebas());
}

/** Atajo: exige que una frase resuelva a una ruta exacta, sin preguntar. */
function esperarRuta(frase: string, ruta: string) {
  const r = resolverDestino(frase);
  expect(r.tipo, `"${frase}" deberia resolver a ${ruta} y dio ${JSON.stringify(r)}`).toBe('resuelta');
  if (r.tipo === 'resuelta') expect(r.ruta, `"${frase}"`).toBe(ruta);
}

describe('normalizacion y tokenizado', () => {
  it('quita acentos, mayusculas y puntuacion', () => {
    expect(normalizar('¿Dónde veo mis ANÁLISIS?')).toBe('donde veo mis analisis');
  });

  it('la enie colapsa a n (sueno y sueño son el mismo token)', () => {
    expect(normalizar('sueño')).toBe('sueno');
  });

  it('tira muletillas de navegacion y deja solo lo que discrimina', () => {
    expect(tokenizar('llévame a donde registro el ayuno')).toEqual(['registro', 'ayuno']);
    expect(tokenizar('¿dónde veo mis análisis?')).toEqual(['analisis']);
  });

  it('conserva siglas cortas que si significan algo', () => {
    expect(tokenizar('cuanto uv me falta')).toContain('uv');
    expect(tokenizar('quiero ver el sol')).toContain('sol');
  });

  it('una consulta de puras muletillas se queda sin tokens', () => {
    expect(tokenizar('llévame a donde quiero ver eso')).toEqual([]);
  });

  it('singulariza para que habito y habitos sean el mismo token', () => {
    expect(singularizar('habitos')).toBe('habito');
    expect(singularizar('sintomas')).toBe('sintoma');
    expect(singularizar('electrones')).toBe('electron');
  });

  it('NO le corta la s a las palabras invariables en -is', () => {
    expect(singularizar('analisis')).toBe('analisis');
    expect(singularizar('crisis')).toBe('crisis');
  });

  it('deja en paz las palabras cortas', () => {
    expect(singularizar('labs')).toBe('labs');
    expect(singularizar('mas')).toBe('mas');
  });

  it('el singularizado se aplica igual a consulta e indice', () => {
    // Si solo se aplicara de un lado, plural y singular darian distinto.
    expect(resolverDestino('mis hábitos')).toEqual(resolverDestino('mi hábito'));
  });
});

describe('limpieza del ruido de tickets en las descripciones', () => {
  it('borra codigos de sprint, piezas y nombres de archivo', () => {
    const sucio = 'Mis hábitos del HOY (MB-12 · E-3) — la puerta perdida. Ver hoy-habitos.tsx Pieza 4 Sprint OLA3 Anexo D #v13h';
    const limpio = limpiarDescripcion(sucio);
    expect(limpio).not.toMatch(/MB-12/);
    expect(limpio).not.toMatch(/Pieza 4/);
    expect(limpio).not.toMatch(/Sprint/);
    expect(limpio).not.toMatch(/Anexo D/);
    expect(limpio).not.toMatch(/#v13h/);
    expect(limpio).not.toMatch(/hoy-habitos\.tsx/);
    // pero el contenido util sobrevive
    expect(limpio).toMatch(/hábitos/);
    expect(limpio).toMatch(/puerta perdida/);
  });
});

describe('los intentos del brief resuelven sin preguntar', () => {
  it('"llévame a donde registro el ayuno"', () => {
    esperarRuta('llévame a donde registro el ayuno', '/fasting');
  });

  it('"dónde veo mis análisis"', () => {
    esperarRuta('dónde veo mis análisis', '/edad-atp/labs');
  });
});

for (const modo of MODOS) describe(`intentos reales en es-MX (modo ${modo})`, () => {
  enModo(modo);
  const casos: [string, string][] = [
    ['quiero registrar lo que comí', '/food-log'],
    ['dónde apunto el agua que tomé', '/hydration'],
    ['llévame a mi glucosa', '/glucose-log'],
    ['quiero meditar', '/meditation'],
    ['ejercicios de respiración', '/breathing'],
    ['abre mi journal', '/journal'],
    // ALIAS-1: /my-chronotype es un alias con destino conocido y ya no entra
    // al indice; sus palabras se donaron al destino real. La expectativa nueva
    // es estrictamente mejor: directo a la pantalla, sin pasar por el stub.
    ['dónde veo mi cronotipo', '/tests/resultado/cronotipo'],
    ['quiero ver mi edad biológica', '/edad-atp'],
    ['el test de braverman', '/braverman'],
    ['mis suplementos', '/supplements'],
    ['dónde anoto mi peso', '/medidas'],
    ['quiero ver mi expediente', '/salud/mi-expediente'],
    ['mis síntomas', '/salud/mis-sintomas'],
    ['la lista del super', '/lista-compra'],
    // CUATRO-OJOS (20-ago): estas tres frases viven en ALIAS_RUTA de rutas que
    // ahora son alias excluidos del indice. Clavan que la donacion de
    // vocabulario funciona: si alguien la rompe, estas fallan primero.
    ['entrenar ahora', '/fitness-hub'],
    ['quiero salir a correr', '/log-cardio'],
    // 'mis cuestionarios' NO se prueba: gana /tests/q/maestro por su corpus
    // propio, y eso ya pasaba ANTES de excluir alias (verificado corriendo la
    // frase contra el indice viejo). 'quizzes' solo vive en la donacion.
    ['mis quizzes', '/tests'],
    ['configurar notificaciones', '/settings/notifications'],
    ['quiero cambiar el tema a modo oscuro', '/settings/experiencia'],
    ['dónde está mi suscripción', '/settings/subscription'],
    // PREMIUM (16-ago-2026): aquí iba ['cómo gano protones', '/economy/how-to-earn'].
    // La pantalla se borró y con ella su sinónimo: reconocer la frase para no
    // poder llevar a nadie a ningún lado es peor que no reconocerla.
    ['mi historial de electrones', '/economy/history'],
    ['quiero instalar más funciones', '/centro'],
    ['ver mis hábitos', '/hoy-habitos'],
    // 25-sep-2026: en Elite DX la comunidad habia salido de la app y este caso
    // solo corria en 'atp'. 26-sep-2026 (Elite DX no pierde funciones): vuelve
    // a correr en LOS DOS modos, sin ramificar.
    ['el ranking de la comunidad', '/comunidad/ranking'],
    ['mi ficha de emergencia', '/ficha-emergencia'],
    ['conectar con health connect', '/settings/salud-conexion'],
    ['el filtro nocturno', '/night-filter'],
    ['mis rutinas', '/my-routines'],
    ['la biblioteca de ejercicios', '/exercise-library'],
    ['mi ciclo menstrual', '/cycle'],
    // 7-sep-2026 (pivote limpio): "Mi Protocolo" dejó de ser pantalla y su ruta
    // es alias 1:1 de /agenda. Su vocabulario NO se tiró: se quedó en ALIAS_RUTA
    // y el índice se lo dona al destino real. Estas dos frases clavan esa
    // donación: si alguien la rompe, fallan aquí y no en el device, donde se
    // vería como ARGOS quedándose mudo ante palabras que la gente sí usa.
    ['que estoy haciendo', '/agenda'],
    ['mis intervenciones', '/agenda'],
  ];

  for (const [frase, ruta] of casos) {
    it(`"${frase}" -> ${ruta}`, () => esperarRuta(frase, ruta));
  }
});

describe('modo elite_dx (25-sep-2026; por cuenta desde el 26-sep)', () => {
  enModo('elite_dx');
  it('las salas nuevas se alcanzan por su nombre', () => {
    esperarRuta('mi programa', '/programa');
    esperarRuta('mi progreso', '/progreso');
    esperarRuta('mi constancia', '/progreso');
    esperarRuta('mis herramientas', '/tu');
    esperarRuta('mi servicio', '/tu');
  });
  // 26-sep-2026 (Elite DX no pierde funciones): este bloque decia "las salas
  // retiradas no se ofrecen". El criterio se invirtio a proposito por decision
  // del dueno: Elite DX es todo lo de la ATP mas el programa.
  it('las salas de la ATP completa siguen abiertas para ARGOS', () => {
    for (const r of ['/kit', '/salud', '/tribu', '/comunidad/ranking', '/comunidad/amigos', '/comunidad/ajustes']) {
      expect(rutaVetada(r), r).toBeNull();
      expect(validarRutaPropuesta(r).tipo, r).toBe('resuelta');
    }
    const rutas = new Set(obtenerIndice().map((e) => e.ruta));
    for (const r of ['/kit', '/salud', '/tribu', '/comunidad/ranking']) expect(rutas.has(r), r).toBe(true);
    expect(rutaVetada('/salud/evaluacion-elite')).toBeNull();
  });
  it('los alias que desembocan en esas salas ya no se vetan', () => {
    // Antes se vetaban por su destino (/health-hub -> /salud).
    expect(APP_ROUTE_ALIASES['/health-hub']).toBe('/salud');
    expect(rutaVetada('/health-hub')).toBeNull();
    for (const [alias, destino] of Object.entries(APP_ROUTE_ALIASES)) {
      if (typeof destino !== 'string') continue;
      const base = destino.split('?')[0];
      if (!['/kit', '/salud', '/tribu'].includes(base) && !base.startsWith('/comunidad')) continue;
      expect(rutaVetada(alias), `${alias} -> ${destino}`).toBeNull();
    }
  });
  it('las frases de las salas de siempre llegan a donde llegan en la ATP completa', () => {
    esperarRuta('el ranking de la comunidad', '/comunidad/ranking');
    esperarRuta('ranking', '/comunidad/ranking');
    esperarRuta('tribu', '/tribu');
    esperarRuta('mis amigos', '/comunidad/amigos');
    esperarRuta('perfil publico', '/comunidad/ajustes');
    esperarRuta('ecosistema', '/kit');
    esperarRuta('salud funcional', '/salud/diagnostico');
    esperarRuta('como voy', '/salud/evolucion');
    // "mis apps" y "sala atp" nunca resolvieron solas, tampoco en la ATP
    // completa (el tag ya preguntaba entre la sala y "ordenar apps"). Lo que se
    // exige es que la sala ATP vuelva a estar entre las opciones.
    for (const f of ['mis apps', 'sala atp']) {
      const r = resolverDestino(f);
      expect(r.tipo, f).toBe('ambigua');
      if (r.tipo === 'ambigua') expect(r.candidatos.map((c) => c.ruta), f).toContain('/kit');
    }
    // El hub de SALUD tampoco resolvia solo en la ATP; vuelve a ofrecerse.
    const hub = resolverDestino('hub de salud');
    expect(hub.tipo === 'ambigua' ? hub.candidatos.map((c) => c.ruta) : [], 'hub de salud').toContain('/salud');
  });
  it('el catalogo a mano es el completo mas las salas nuevas', () => {
    const tabla = aliasRuta();
    for (const r of Object.keys(ALIAS_SALAS_ELITE_DX)) expect(r in tabla, r).toBe(true);
    for (const r of Object.keys(ALIAS_RUTA_BASE)) {
      expect(r in tabla, r).toBe(true);
      expect(tabla[r], r).toEqual(ALIAS_RUTA_BASE[r]);
    }
    expect(Object.keys(tabla).length).toBe(Object.keys(ALIAS_SALAS_ELITE_DX).length + Object.keys(ALIAS_RUTA_BASE).length);
    for (const r of Object.keys(tabla)) expect(rutaVetada(r), r).toBeNull();
  });
});

/**
 * 26-sep-2026 (Elite DX no pierde funciones): el candado de paridad. Toda
 * frase del catalogo a mano (y todo titulo curado) que en la ATP completa
 * resuelve a X, en Elite DX tiene que resolver a X o, como minimo, ofrecer X
 * PRIMERO al preguntar. Las unicas frases que cambian de desenlace estan
 * nombradas abajo; si la lista crece, alguien le quito algo a Elite DX sin
 * decidirlo.
 */
describe('paridad: Elite DX no pierde ningun destino de la ATP completa (26-sep-2026)', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  afterEach(() => reiniciarModoParaPruebas());
  // Choques con el NOMBRE de una sala de Elite DX. ARGOS pregunta (contrato:
  // no adivina) y el destino de la ATP va primero en las opciones.
  //  - "cuenta": TU se titula "Tu cuenta" y su docblock dice "tu cuenta ... y
  //    ajustes"; las dos lecturas son legitimas.
  //  - "Progreso de Mente": la sala PROGRESO se lleva la palabra "progreso".
  const PREGUNTA_CON_EL_DESTINO_ATP_PRIMERO = new Set(['cuenta', 'mi cuenta', 'Tu cuenta', 'Progreso de Mente']);
  it('lo que resuelve en la ATP resuelve igual en Elite DX (o se ofrece primero)', () => {
    const frases = new Set<string>();
    for (const lista of Object.values(ALIAS_RUTA_BASE)) for (const f of lista) frases.add(f);
    for (const t of Object.values(TITULOS_RUTA)) frases.add(t);
    fijarModoPorCuenta('atp');
    const enAtp = new Map([...frases].map((f) => [f, resolverDestino(f)] as const));
    fijarModoPorCuenta('elite_dx');
    const cambiadas: string[] = [];
    const perdidas: string[] = [];
    for (const f of frases) {
      const a = enAtp.get(f)!;
      if (a.tipo !== 'resuelta') continue;
      const e = resolverDestino(f);
      if (e.tipo === 'resuelta' && e.ruta === a.ruta) continue;
      cambiadas.push(f);
      const primera = e.tipo === 'ambigua' ? e.candidatos[0]?.ruta : null;
      if (primera !== a.ruta) perdidas.push(`${f}: ATP ${a.ruta}, Elite ${JSON.stringify(e)}`);
    }
    expect(perdidas, 'destinos de la ATP que Elite DX ya no ofrece').toEqual([]);
    expect(cambiadas.sort()).toEqual([...PREGUNTA_CON_EL_DESTINO_ATP_PRIMERO].sort());
  });
});

describe('modo atp: la ATP completa, como en el tag v3.0-pre-elite-dx (26-sep-2026)', () => {
  enModo('atp');
  it('las salas de Elite DX no se ofrecen (sus rutas mandan a HOY o a fuerza)', () => {
    expect(rutaVetada('/programa')).not.toBeNull();
    expect(rutaVetada('/tu')).not.toBeNull();
    expect(rutaVetada('/progreso')).not.toBeNull();
    const rutas = new Set(obtenerIndice().map((e) => e.ruta));
    expect(rutas.has('/programa')).toBe(false);
    expect(rutas.has('/tu')).toBe(false);
    expect(rutas.has('/progreso')).toBe(false);
    expect(validarRutaPropuesta('/programa').tipo).toBe('bloqueada');
  });
  it('las salas de siempre siguen abiertas', () => {
    expect(rutaVetada('/kit')).toBeNull();
    expect(rutaVetada('/salud')).toBeNull();
    expect(rutaVetada('/tribu')).toBeNull();
    expect(rutaVetada('/comunidad/ranking')).toBeNull();
    const rutas = new Set(obtenerIndice().map((e) => e.ruta));
    expect(rutas.has('/salud')).toBe(true);
    expect(rutas.has('/tribu')).toBe(true);
  });
  it('el catalogo a mano es el de antes, sin las salas nuevas', () => {
    expect(aliasRuta()).toBe(ALIAS_RUTA_BASE);
    for (const r of Object.keys(ALIAS_SALAS_ELITE_DX)) expect(r in aliasRuta(), r).toBe(false);
  });
  it('"mi programa" no lleva a una sala que en este modo no existe', () => {
    const r = resolverDestino('mi programa');
    expect(r.tipo === 'resuelta' && r.ruta === '/programa').toBe(false);
  });
  it('"progreso" sigue donandose a fuerza, como cuando /progreso era la tab vieja', () => {
    const fuerza = obtenerIndice().find((e) => e.ruta === '/fitness-strength');
    expect(fuerza).toBeTruthy();
    expect((fuerza!.pesos.get('progreso') ?? 0) > 0).toBe(true);
  });
});

describe('cambio de modo con la app abierta (26-sep-2026)', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  afterEach(() => reiniciarModoParaPruebas());
  it('el indice y el catalogo se rehacen al cambiar de modo, sin tirar la memo a mano', () => {
    fijarModoPorCuenta('elite_dx');
    const elite = new Set(obtenerIndice().map((e) => e.ruta));
    expect(elite.has('/programa')).toBe(true);
    expect(rutaVetada('/programa')).toBeNull();
    // 26-sep-2026 (Elite DX no pierde funciones): /salud ya no distingue los
    // modos; esta abierta en los dos.
    expect(elite.has('/salud')).toBe(true);
    expect(rutaVetada('/salud')).toBeNull();

    fijarModoPorCuenta('atp');
    const atp = new Set(obtenerIndice().map((e) => e.ruta));
    expect(atp.has('/programa')).toBe(false);
    expect(rutaVetada('/programa')).not.toBeNull();
    expect(atp.has('/salud')).toBe(true);
    expect(rutaVetada('/salud')).toBeNull();
    expect('/programa' in aliasRuta()).toBe(false);

    fijarModoPorCuenta('elite_dx');
    expect(new Set(obtenerIndice().map((e) => e.ruta)).has('/programa')).toBe(true);
    expect('/programa' in aliasRuta()).toBe(true);
  });
});

describe('el contrato: preguntar en vez de adivinar', () => {
  it('una consulta sin tokens utiles no inventa destino', () => {
    const r = resolverDestino('llévame a donde quiero ver eso');
    expect(r.tipo).toBe('sin_resultado');
  });

  it.each([
    'quiero pedir una pizza hawaiana',
    'necesito un abogado',
    'cuanto cuesta un coche',
    'hola como estas',
    'el clima de mañana',
  ])('no inventa destino para %s', (frase) => {
    expect(resolverDestino(frase).tipo).toBe('sin_resultado');
  });

  it('una palabra suelta reconocida NO basta si el resto de la frase no pega', () => {
    // 'pedir' llego a arrastrar toda la frase hacia la guia de laboratorios.
    const r = resolverDestino('quiero pedir una pizza hawaiana');
    expect(r.tipo).toBe('sin_resultado');
  });

  it('las palabras que la app no conoce NO castigan una frase clara', () => {
    // 'apunto' y 'tome' no existen en el indice: son ruido del hablante.
    const r = resolverDestino('dónde apunto el agua que tomé');
    expect(r.tipo).toBe('resuelta');
    if (r.tipo === 'resuelta') expect(r.ruta).toBe('/hydration');
  });

  it('cadena vacia devuelve sin_resultado y no truena', () => {
    expect(resolverDestino('').tipo).toBe('sin_resultado');
    expect(resolverDestino('   ').tipo).toBe('sin_resultado');
  });

  it('cuando es ambigua ofrece candidatos reales, no basura', () => {
    // "historial" toca varias pantallas de historial a proposito.
    const r = resolverDestino('historial');
    if (r.tipo === 'ambigua') {
      expect(r.candidatos.length).toBeGreaterThan(1);
      expect(r.candidatos.length).toBeLessThanOrEqual(3);
      for (const c of r.candidatos) {
        // NAV-2: el catálogo de candidatos válidos son las estáticas MÁS las
        // expandidas. Las plantillas con corchetes ya NO cuentan como destino.
        const expandidas = new Set(expandirTodas().map((e) => e.ruta));
        expect(APP_ROUTES.includes(c.ruta) || expandidas.has(c.ruta)).toBe(true);
        expect(c.titulo.length).toBeGreaterThan(0);
      }
    } else {
      // Si resolvio, que al menos sea una pantalla de historial de verdad.
      expect(r.tipo).toBe('resuelta');
    }
  });

  it('el resultado es estable: la misma frase da lo mismo siempre', () => {
    const a = resolverDestino('mis análisis de laboratorio');
    const b = resolverDestino('mis análisis de laboratorio');
    expect(a).toEqual(b);
  });
});

for (const modo of MODOS) describe(`rutas vetadas (modo ${modo})`, () => {
  enModo(modo);
  it('el onboarding completo esta vetado por prefijo', () => {
    expect(rutaVetada('/onboarding/v2/welcome')).toBeTruthy();
    expect(rutaVetada('/onboarding/voice-config')).toBeTruthy();
  });

  it('dev, admin, auth y paywall estan vetados', () => {
    for (const r of ['/dev', '/settings/dev', '/economy/admin', '/login', '/paywall']) {
      expect(rutaVetada(r), r).toBeTruthy();
    }
  });

  it('una ruta normal NO esta vetada', () => {
    expect(rutaVetada('/fasting')).toBeNull();
    expect(rutaVetada('/settings/privacy')).toBeNull();
  });

  it('ninguna vetada entra al indice de busqueda', () => {
    const rutas = new Set(obtenerIndice().map((e) => e.ruta));
    for (const r of RUTAS_VETADAS.keys()) expect(rutas.has(r), r).toBe(false);
    expect(rutas.has('/onboarding/v2/welcome')).toBe(false);
  });

  it('ARGOS no llega al login ni pidiendolo de frente', () => {
    const r = validarRutaPropuesta('/login');
    expect(r.tipo).toBe('bloqueada');
  });
});

describe('validacion de la ruta que propone el modelo', () => {
  it('acepta una ruta que existe', () => {
    const r = validarRutaPropuesta('/fasting');
    expect(r.tipo).toBe('resuelta');
    if (r.tipo === 'resuelta') expect(r.ruta).toBe('/fasting');
  });

  it('RECHAZA una ruta alucinada que suena plausible', () => {
    expect(validarRutaPropuesta('/mis-analisis').tipo).toBe('sin_resultado');
    expect(validarRutaPropuesta('/ayuno').tipo).toBe('sin_resultado');
    expect(validarRutaPropuesta('/salud/laboratorios').tipo).toBe('sin_resultado');
  });

  it('tolera basura sin truenar', () => {
    expect(validarRutaPropuesta(null).tipo).toBe('sin_resultado');
    expect(validarRutaPropuesta(undefined).tipo).toBe('sin_resultado');
    expect(validarRutaPropuesta('').tipo).toBe('sin_resultado');
    expect(validarRutaPropuesta('no soy una ruta').tipo).toBe('sin_resultado');
  });

  it('limpia query, hash y diagonal final', () => {
    const r = validarRutaPropuesta('/fasting?foo=1#bar');
    expect(r.tipo).toBe('resuelta');
    if (r.tipo === 'resuelta') expect(r.ruta).toBe('/fasting');
  });

  it('una ruta dinamica pide el dato en vez de navegar a ciegas', () => {
    const r = validarRutaPropuesta('/packs/[packKey]');
    expect(r.tipo).toBe('requiere_dato');
    if (r.tipo === 'requiere_dato') expect(r.parametro).toBe('packKey');
  });
});

describe('titulos de usuario', () => {
  it('nunca devuelve el docblock crudo', () => {
    for (const ruta of APP_ROUTES) {
      const t = tituloDe(ruta);
      expect(t.length, ruta).toBeLessThan(60);
      expect(t, ruta).not.toMatch(/—/); // cero em dash en copy de usuario
      expect(t, ruta).not.toMatch(/\b(MB|OLA|FIX|QW)-?\d/);
    }
  });

  it('el prettify del slug es legible', () => {
    expect(tituloDesdeRuta('/salud/mis-datos')).toBe('Mis datos');
    expect(tituloDesdeRuta('/')).toBe('HOY');
    expect(tituloDesdeRuta('/packs/[packKey]')).toBe('PackKey');
  });
});

for (const modo of MODOS) describe(`integridad del catalogo (candado, modo ${modo})`, () => {
  enModo(modo);
  it('toda ruta con titulo curado existe de verdad', () => {
    const todas = new Set<string>([...APP_ROUTES, ...APP_ROUTES_DYNAMIC]);
    const fantasmas = Object.keys(TITULOS_RUTA).filter((r) => !todas.has(r));
    expect(fantasmas, 'titulos apuntando a rutas que ya no existen').toEqual([]);
  });

  it('todo alias apunta a una ruta que existe de verdad', () => {
    const todas = new Set<string>([...APP_ROUTES, ...APP_ROUTES_DYNAMIC]);
    const fantasmas = Object.keys(aliasRuta()).filter((r) => !todas.has(r));
    expect(fantasmas, 'alias apuntando a rutas que ya no existen').toEqual([]);
  });

  it('ningun alias apunta a una ruta vetada (seria inalcanzable)', () => {
    const muertos = Object.keys(aliasRuta()).filter((r) => rutaVetada(r));
    expect(muertos, 'alias hacia rutas que ARGOS nunca abrira').toEqual([]);
  });

  it('el vocabulario a mano de un alias excluido siempre tiene a quien donarse', () => {
    // CUATRO-OJOS (20-ago): si una clave de ALIAS_RUTA es un alias 1:1 puro,
    // su vocabulario se dona al destino. Eso exige que el destino sea una
    // ruta real y no vetada; si no, las palabras mueren en silencio.
    const huerfanos = Object.keys(aliasRuta())
      .filter((r) => esAliasPuro(r))
      .filter((r) => {
        const base = (APP_ROUTE_ALIASES[r] as string).split('?')[0];
        return !APP_ROUTES.includes(base) || rutaVetada(base);
      });
    expect(huerfanos, 'vocabulario a mano sin destino al que donarse').toEqual([]);
  });

  it('el indice cubre practicamente toda la app', () => {
    // NAV-2: la cuenta cambió de forma. Antes eran las estáticas más los 10
    // MOLDES; ahora son las estáticas más las rutas RESUELTAS. Un molde no es un
    // destino y ya no ocupa un renglón del catálogo.
    // ALIAS-1: los alias con destino conocido ya no ocupan renglon propio
    // (donan sus palabras al destino). Los de destino en runtime se quedan.
    const estaticas = APP_ROUTES.filter(
      (r) => !rutaVetada(r) && !esAliasPuro(r),
    ).length;
    const expandidas = expandirTodas().filter((e) => !rutaVetada(e.ruta)).length;
    expect(obtenerIndice().length).toBe(estaticas + expandidas);
  });
});

// ---------------------------------------------------------------------------
// NAV-2 · el bug: ARGOS ofrecía moldes de ruta
// ---------------------------------------------------------------------------

describe('NAV-2 · ninguna plantilla llega nunca al usuario', () => {
  it('el indice no contiene una sola ruta con corchetes', () => {
    for (const e of obtenerIndice()) {
      expect(esPlantilla(e.ruta), `${e.ruta} entró al índice con corchetes`).toBe(false);
    }
  });

  it('ninguna entrada del indice queda marcada como dinamica', () => {
    expect(obtenerIndice().filter((e) => e.dinamica)).toEqual([]);
  });

  it('ninguna consulta, por rara que sea, devuelve una ruta con corchetes', () => {
    const frases = [
      'reporte', 'reportes', 'mi reporte', 'pack', 'packs', 'paquete',
      'test', 'tests', 'evaluacion', 'cuestionario', 'perfil', 'centro',
      'intervencion', 'lab', 'historia clinica', 'sub edad', 'id', 'dato',
      'llevame a mi reporte', 'abre un pack', 'quiero un test',
    ];
    for (const f of frases) {
      const r = resolverDestino(f);
      if (r.tipo === 'resuelta') expect(esPlantilla(r.ruta), f).toBe(false);
      if (r.tipo === 'ambigua') for (const c of r.candidatos) expect(esPlantilla(c.ruta), f).toBe(false);
      if (r.tipo === 'sin_resultado') for (const s of r.sugerencias) expect(esPlantilla(s.ruta), f).toBe(false);
      // `requiere_dato` ya no puede salir del camino local: no hay moldes indexados.
      expect(r.tipo).not.toBe('requiere_dato');
    }
  });

  it('toda plantilla esta decidida: o se expande o esta declarada como excluida', () => {
    expect(plantillasHuerfanas(), 'plantillas sin decisión, se colarían al índice').toEqual([]);
  });

  it('cada exclusion trae su motivo escrito, no un TODO', () => {
    for (const [plantilla, motivo] of PLANTILLAS_SIN_EXPANSION) {
      expect(typeof motivo, plantilla).toBe('string');
      expect(motivo.length, `${plantilla} sin motivo de verdad`).toBeGreaterThan(30);
    }
  });
});

describe('NAV-2 · las rutas resueltas son destinos de verdad', () => {
  it('todas las expansiones existen sin corchetes y con titulo', () => {
    const todas = expandirTodas();
    expect(todas.length).toBeGreaterThan(40);
    for (const e of todas) {
      expect(esPlantilla(e.ruta), e.ruta).toBe(false);
      expect(e.titulo.trim().length, e.ruta).toBeGreaterThan(0);
      expect(e.titulo, `${e.ruta} muestra el nombre del parámetro como título`).not.toMatch(/^(PackKey|Id|Key|Dominio|Category|AppKey|UserId)$/);
    }
  });

  it('no se duplica una ruta que ya era estatica', () => {
    for (const e of expandirTodas()) {
      expect(APP_ROUTES.includes(e.ruta.split('?')[0]), `${e.ruta} duplica una estática`).toBe(false);
    }
  });

  it('los 14 dominios de reportes son navegables por nombre', () => {
    const rutas = expandirPlantilla('/reports/[dominio]').map((e) => e.ruta);
    expect(rutas).toHaveLength(14);
    expect(rutas).toContain('/reports/ayuno');
    expect(rutas).toContain('/reports/glucosa');
  });

  it('llevame a mi reporte de ayuno aterriza en el reporte de ayuno', () => {
    esperarRuta('llévame a mi reporte de ayuno', '/reports/ayuno');
  });

  it('el modelo puede proponer la ruta concreta y ya no se rechaza', () => {
    const r = validarRutaPropuesta('/reports/ayuno');
    expect(r.tipo).toBe('resuelta');
  });

  it('el modelo propone el molde y la consulta resuelve el parametro', () => {
    const r = validarRutaPropuesta('/reports/[dominio]', 'llévame a mi reporte de ayuno');
    expect(r.tipo).toBe('resuelta');
    if (r.tipo === 'resuelta') expect(r.ruta).toBe('/reports/ayuno');
  });

  it('el molde sin consulta ya no es un callejon: trae opciones', () => {
    const r = validarRutaPropuesta('/packs/[packKey]');
    expect(r.tipo).toBe('requiere_dato');
    if (r.tipo === 'requiere_dato') {
      expect(r.opciones?.length).toBeGreaterThan(0);
      for (const o of r.opciones ?? []) expect(esPlantilla(o.ruta)).toBe(false);
    }
  });

  it('ninguna evaluacion se ofrece por una ruta del motor que no este viva', () => {
    const noVivas = ASSESSMENTS.filter((a) => !a.live).map((a) => a.route);
    const ofrecidas = new Set(expandirTodas().map((e) => e.ruta));
    for (const r of noVivas) {
      expect(ofrecidas.has(r), `${r} no está viva y se estaba ofreciendo`).toBe(false);
    }
  });

  it('las evaluaciones que no estan vivas se ofrecen por su pantalla original', () => {
    const ofrecidas = new Set(expandirTodas().map((e) => e.ruta.split('?')[0]));
    const hc = ASSESSMENTS.filter((a) => a.section === 'clinico' && !a.live);
    expect(hc.length).toBeGreaterThan(0);
    for (const a of hc) {
      const legacy = a.legacyRoutes?.[0]?.split('?')[0];
      expect(legacy, a.id).toBeTruthy();
      expect(ofrecidas.has(legacy!) || APP_ROUTES.includes(legacy!), `${a.id} sin destino vivo`).toBe(true);
    }
  });
});
