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
import { describe, it, expect } from 'vitest';
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
  ALIAS_RUTA,
} from '../argos-nav-resolver-core';
import { APP_ROUTES, APP_ROUTES_DYNAMIC } from '@/src/constants/app-routes.generated';
import {
  esPlantilla,
  expandirPlantilla,
  expandirTodas,
  plantillasHuerfanas,
  PLANTILLAS_SIN_EXPANSION,
} from '../argos-nav-dinamicas-core';
import { ASSESSMENTS } from '@/src/constants/assessments';

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

describe('intentos reales en es-MX', () => {
  const casos: [string, string][] = [
    ['quiero registrar lo que comí', '/food-log'],
    ['dónde apunto el agua que tomé', '/hydration'],
    ['llévame a mi glucosa', '/glucose-log'],
    ['quiero meditar', '/meditation'],
    ['ejercicios de respiración', '/breathing'],
    ['abre mi journal', '/journal'],
    ['dónde veo mi cronotipo', '/my-chronotype'],
    ['quiero ver mi edad biológica', '/edad-atp'],
    ['el test de braverman', '/braverman'],
    ['mis suplementos', '/supplements'],
    ['dónde anoto mi peso', '/medidas'],
    ['quiero ver mi expediente', '/salud/mi-expediente'],
    ['mis síntomas', '/salud/mis-sintomas'],
    ['la lista del super', '/lista-compra'],
    ['configurar notificaciones', '/settings/notifications'],
    ['quiero cambiar el tema a modo oscuro', '/settings/experiencia'],
    ['dónde está mi suscripción', '/settings/subscription'],
    // PREMIUM (16-ago-2026): aquí iba ['cómo gano protones', '/economy/how-to-earn'].
    // La pantalla se borró y con ella su sinónimo: reconocer la frase para no
    // poder llevar a nadie a ningún lado es peor que no reconocerla.
    ['mi historial de electrones', '/economy/history'],
    ['quiero instalar más funciones', '/centro'],
    ['ver mis hábitos', '/hoy-habitos'],
    ['el ranking de la comunidad', '/comunidad/ranking'],
    ['mi ficha de emergencia', '/ficha-emergencia'],
    ['conectar con health connect', '/settings/salud-conexion'],
    ['el filtro nocturno', '/night-filter'],
    ['mis rutinas', '/my-routines'],
    ['la biblioteca de ejercicios', '/exercise-library'],
    ['mi ciclo menstrual', '/cycle'],
  ];

  for (const [frase, ruta] of casos) {
    it(`"${frase}" -> ${ruta}`, () => esperarRuta(frase, ruta));
  }
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

describe('rutas vetadas', () => {
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

describe('integridad del catalogo (candado)', () => {
  it('toda ruta con titulo curado existe de verdad', () => {
    const todas = new Set<string>([...APP_ROUTES, ...APP_ROUTES_DYNAMIC]);
    const fantasmas = Object.keys(TITULOS_RUTA).filter((r) => !todas.has(r));
    expect(fantasmas, 'titulos apuntando a rutas que ya no existen').toEqual([]);
  });

  it('todo alias apunta a una ruta que existe de verdad', () => {
    const todas = new Set<string>([...APP_ROUTES, ...APP_ROUTES_DYNAMIC]);
    const fantasmas = Object.keys(ALIAS_RUTA).filter((r) => !todas.has(r));
    expect(fantasmas, 'alias apuntando a rutas que ya no existen').toEqual([]);
  });

  it('ningun alias apunta a una ruta vetada (seria inalcanzable)', () => {
    const muertos = Object.keys(ALIAS_RUTA).filter((r) => rutaVetada(r));
    expect(muertos, 'alias hacia rutas que ARGOS nunca abrira').toEqual([]);
  });

  it('el indice cubre practicamente toda la app', () => {
    // NAV-2: la cuenta cambió de forma. Antes eran las estáticas más los 10
    // MOLDES; ahora son las estáticas más las rutas RESUELTAS. Un molde no es un
    // destino y ya no ocupa un renglón del catálogo.
    const estaticas = APP_ROUTES.filter((r) => !rutaVetada(r)).length;
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
