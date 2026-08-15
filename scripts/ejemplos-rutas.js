#!/usr/bin/env node
/**
 * ejemplos-rutas — de dónde saca el barrido los valores de las rutas dinámicas.
 *
 * EL PROBLEMA QUE RESUELVE
 *
 * El barrido visual abre cada pantalla por deep link. Una ruta como
 * `/reports/[dominio]` no se puede abrir: hay que darle un valor. Hasta hoy el
 * barrido simplemente las saltaba, y por eso las pantallas más nuevas de la app
 * (los 14 dominios de reportes, el motor de cuestionarios, los packs, las
 * fichas del centro) nunca habían salido en una captura.
 *
 * POR QUÉ NO SE ESCRIBEN LOS VALORES A MANO
 *
 * Una lista escrita a mano nace correcta y se pudre en la primera semana: nace
 * un dominio nuevo, nadie se acuerda de este archivo, y la pantalla nueva es
 * justo la que no se fotografía. Así que aquí NO hay valores; hay direcciones.
 * Cada entrada dice en qué archivo del código vive la lista buena y con qué
 * patrón se lee. Si mañana nace un dominio, el barrido lo recoge solo.
 *
 * POR QUÉ CON EXPRESIONES REGULARES Y NO IMPORTANDO EL MÓDULO
 *
 * Estas listas viven en TypeScript, y `node` no lo lee. Importarlas pediría
 * transpilar en tiempo de corrida (typescript + un hook de require + resolver
 * el alias `@/`): más piezas que se pueden romper, y ninguna disponible cuando
 * el repo corre desde un worktree sin node_modules. El barrido tiene que seguir
 * siendo simple. Leer el archivo y sacar los literales no depende de nada.
 *
 * El precio de esa decisión es que un patrón se puede quedar viejo. Por eso
 * TODO aquí falla RUIDOSO: si un archivo no está, o si un patrón deja de
 * encontrar algo, esto revienta con el nombre del archivo y qué esperaba. Un
 * barrido que se calla y captura de menos es peor que uno que no arranca.
 */

const fs = require('fs');
const path = require('path');

/**
 * De dónde sale cada lista de valores.
 *
 * Varias entradas pueden apuntar a la misma `plantilla`: el motor de
 * cuestionarios junta cuatro catálogos distintos bajo `/tests/q/[id]`.
 *
 * Campos:
 *   plantilla — la ruta con corchetes, tal cual la genera gen-mapa-rutas.
 *   archivo   — la fuente de verdad, relativa a la raíz del repo.
 *   bloque    — opcional: acota la búsqueda a un pedazo del archivo. Se usa el
 *               grupo 1 si existe, si no el match completo.
 *   patron    — global (con /g). El grupo 1 es el valor.
 *   prefijo   — lo que el código le pega al valor para armar el id.
 *   tope      — cuántos entran al barrido. Sin tope, entran todos.
 *   porQue    — por qué hay tope, para que nadie lo quite sin pensarlo.
 */
const FUENTES = [
  {
    // Los 14 dominios de reportes. El union type manda: REPORT_DOMAINS está
    // declarado como Record<ReportDomainKey, ...>, así que TypeScript no deja
    // que exista un dominio que no esté en esta lista. Es imposible que se
    // desincronice sin que `tsc` grite antes.
    plantilla: '/reports/[dominio]',
    archivo: 'src/services/reports/report-domain-core.ts',
    bloque: /export type ReportDomainKey =([\s\S]*?);/,
    patron: /'([a-z_]+)'/g,
  },
  {
    // Los packs de estilo de vida y los paquetes de salud viven en dos arreglos
    // del mismo archivo y se juntan en PACK_BY_KEY, que es lo que consume la
    // pantalla. Leer los `key:` del archivo cubre los dos arreglos de una.
    plantilla: '/packs/[packKey]',
    archivo: 'src/constants/packs.ts',
    patron: /^ {4}key: '([^']+)',/gm,
  },
  {
    // Las apps del centro: una entrada por app instalable.
    plantilla: '/centro/[appKey]',
    archivo: 'src/constants/app-registry.ts',
    patron: /^ {2}\{ key: '([^']+)'/gm,
  },

  // ── El motor único de cuestionarios: cuatro catálogos, una sola pantalla ──
  {
    // Los 5 funcionales. En el registry se derivan con `id: q.id`, sin prefijo.
    plantilla: '/tests/q/[id]',
    archivo: 'src/constants/functional-quizzes.ts',
    patron: /^ {2}id: '([^']+)',/gm,
    prefijo: '',
  },
  {
    // Los 16 de historia clínica. El registry les pega `hc-` (registry.ts:212).
    plantilla: '/tests/q/[id]',
    archivo: 'src/constants/historia-clinica-questionnaires.ts',
    patron: /^ {4}id: '([^']+)',/gm,
    prefijo: 'hc-',
  },
  {
    // Los 9 de Edad ATP. El registry les pega `edad-` (registry.ts:258).
    plantilla: '/tests/q/[id]',
    archivo: 'src/constants/assessments/registry.ts',
    bloque: /const EDAD_DOMAINS[\s\S]*?\n\];/,
    patron: /domain: '([^']+)'/g,
    prefijo: 'edad-',
  },
  {
    // Los sueltos que el registry escribe con su ruta literal: cronotipo,
    // lifestyle, maestro. Se leen de la ruta misma, así que no hay que saber
    // cómo se llaman.
    plantilla: '/tests/q/[id]',
    archivo: 'src/constants/assessments/registry.ts',
    patron: /route: '\/tests\/q\/([^']+)'/g,
  },

  {
    // Los 9 tests físicos. reaction-time sale más adelante, en la lista de
    // exclusiones del barrido: es un test reactivo que arranca solo.
    plantilla: '/tests/run/[id]',
    archivo: 'src/constants/assessments/registry.ts',
    bloque: /const FISICOS: Assessment\[\] = \[[\s\S]*?\n\];/,
    patron: /^ {4}id: '([^']+)', title:/gm,
  },
  {
    // Las 5 sub-edades. El union type es la lista completa.
    plantilla: '/edad-atp/sub-edad/[key]',
    archivo: 'src/types/edad-atp-v2.ts',
    bloque: /export type SubEdadKey =([^;]*);/,
    patron: /'([a-z]+)'/g,
  },
  {
    // La ruta vieja de historia clínica: redirige al motor de /tests/q/hc-*.
    // Con dos alcanza para ver que la redirección sigue viva; capturar las 16
    // sería fotografiar 16 veces la misma pantalla de destino.
    plantilla: '/historia-clinica/[category]',
    archivo: 'src/constants/historia-clinica-questionnaires.ts',
    patron: /^ {4}id: '([^']+)',/gm,
    tope: 2,
    porQue: 'redirige al motor de cuestionarios; con dos se ve que la redirección vive',
  },
  {
    // Las intervenciones del catálogo son 88, pero la pantalla no lee el
    // catálogo: lee la intervención ASIGNADA al usuario en la base. Las que no
    // están asignadas pintan todas el mismo estado vacío, así que 88 capturas
    // serían 85 copias del mismo png.
    plantilla: '/salud/intervenciones/[key]',
    archivo: 'src/constants/interventions-catalog.ts',
    patron: /^ {4}key: '([^']+)',/gm,
    tope: 3,
    porQue: 'la pantalla lee lo asignado al usuario, no el catálogo; el resto es el mismo estado vacío',
  },
];

/**
 * Rutas dinámicas que NO se pueden expandir, y por qué.
 *
 * Existe a propósito: si mañana nace una ruta dinámica y nadie le da fuente,
 * el generador falla en vez de saltársela en silencio. Saltársela en silencio
 * es exactamente el agujero que este archivo vino a tapar.
 */
const SIN_FUENTE = {
  '/comunidad/perfil/[userId]':
    'el id es un UUID de un usuario real de Supabase: no hay lista en el código',
};

/**
 * Pantallas que cambian de contenido según un parámetro de query.
 *
 * Un solo parámetro por variante, a propósito: un `&` dentro de la URL que se
 * le pasa a `adb shell am start` se lo come el shell y la ruta llega partida.
 * Si algún día hace falta combinar dos, hay que escaparlo, y eso ya no es
 * simple.
 */
const VARIANTES = [
  {
    // /cocina tiene 3 pestañas y el barrido solo veía la primera.
    ruta: '/cocina',
    param: 'tab',
    archivo: 'app/cocina.tsx',
    bloque: /type TabId =([^;]*);/,
    patron: /'([a-z]+)'/g,
  },
  {
    // Los métodos ATP viven dentro de la biblioteca, en su segunda pestaña.
    ruta: '/exercise-library',
    param: 'tab',
    archivo: 'app/exercise-library.tsx',
    bloque: /const \[tab, setTab\] = useState<([^>]*)>/,
    patron: /'([a-z]+)'/g,
  },
  {
    // Los 3 sensores de registro de comida. Ninguno abre la cámara al montar:
    // eso se corrigió y se verifica en PhotoSensor (la cámara pide gesto).
    ruta: '/food-log',
    param: 'sensor',
    archivo: 'app/food-log.tsx',
    bloque: /const SENSORES[\s\S]*?\n\];/,
    patron: /id: '([a-z]+)'/g,
  },
];

/** Lee un archivo fuente, o explica exactamente qué falta. */
function leer(raiz, relativo) {
  const abs = path.join(raiz, relativo);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `[ejemplos-rutas] No encuentro ${relativo}.\n` +
      `  De ahí salen los valores de una ruta dinámica del barrido.\n` +
      `  Si el archivo se movió o se renombró, actualiza scripts/ejemplos-rutas.js.`
    );
  }
  return fs.readFileSync(abs, 'utf8');
}

/** Saca los valores de una fuente. Vacío es error, nunca lista vacía. */
function valoresDe(raiz, f) {
  let texto = leer(raiz, f.archivo);
  if (f.bloque) {
    const m = texto.match(f.bloque);
    if (!m) {
      throw new Error(
        `[ejemplos-rutas] En ${f.archivo} ya no encuentro el bloque de ${f.plantilla || f.ruta}.\n` +
        `  Buscaba: ${f.bloque}\n` +
        `  El código se movió. Ajusta el patrón en scripts/ejemplos-rutas.js.`
      );
    }
    texto = m[1] !== undefined ? m[1] : m[0];
  }
  const out = [];
  for (const m of texto.matchAll(f.patron)) {
    const v = (f.prefijo || '') + m[1];
    if (!out.includes(v)) out.push(v);
  }
  if (!out.length) {
    throw new Error(
      `[ejemplos-rutas] En ${f.archivo} el patrón de ${f.plantilla || f.ruta} no encontró nada.\n` +
      `  Buscaba: ${f.patron}\n` +
      `  O cambió la forma del archivo, o la lista se quedó vacía. Revisa cuál.`
    );
  }
  return out;
}

/**
 * Centinela del motor de cuestionarios.
 *
 * Los ids de /tests/q se arman pegándole un prefijo al id de cada catálogo, y
 * ese prefijo vive en el registry, no aquí. Si alguien agrega un quinto
 * catálogo con un prefijo nuevo, arriba no se entera y el barrido capturaría
 * 32 cuestionarios creyendo que son todos.
 *
 * Esto compara los prefijos que el registry USA de verdad contra los que este
 * archivo DECLARA. Si aparece uno nuevo, revienta y dice cuál.
 */
function verificarPrefijosDeCuestionarios(raiz) {
  const texto = leer(raiz, 'src/constants/assessments/registry.ts');
  const usados = new Set();
  for (const m of texto.matchAll(/\/tests\/q\/([a-z-]*)\$\{/g)) usados.add(m[1]);
  const declarados = new Set(
    FUENTES.filter((f) => f.plantilla === '/tests/q/[id]').map((f) => f.prefijo || '')
  );
  const huerfanos = [...usados].filter((p) => !declarados.has(p));
  if (huerfanos.length) {
    throw new Error(
      `[ejemplos-rutas] El registry arma ids de /tests/q con prefijos que el barrido no conoce: ` +
      huerfanos.map((p) => `"${p}"`).join(', ') + '\n' +
      `  Hay un catálogo de cuestionarios nuevo. Agrégalo a FUENTES en scripts/ejemplos-rutas.js\n` +
      `  apuntando a su archivo, con ese prefijo.`
    );
  }
}

/**
 * Resuelve los ejemplos de todas las rutas dinámicas.
 *
 * `dinamicas` son las rutas con corchetes que encontró gen-mapa-rutas en app/.
 * Toda ruta dinámica tiene que estar en FUENTES o en SIN_FUENTE: una que no
 * esté en ninguna de las dos es una pantalla nueva que nadie registró, y eso
 * se avisa, no se ignora.
 */
function ejemplosDe(raiz, dinamicas) {
  verificarPrefijosDeCuestionarios(raiz);

  const porPlantilla = new Map();
  for (const f of FUENTES) {
    const previo = porPlantilla.get(f.plantilla) || { valores: [], tope: undefined, porQue: null };
    for (const v of valoresDe(raiz, f)) {
      if (!previo.valores.includes(v)) previo.valores.push(v);
    }
    if (f.tope !== undefined) {
      previo.tope = previo.tope === undefined ? f.tope : Math.min(previo.tope, f.tope);
      previo.porQue = f.porQue || previo.porQue;
    }
    porPlantilla.set(f.plantilla, previo);
  }

  const huerfanas = (dinamicas || []).filter(
    (r) => !porPlantilla.has(r) && !SIN_FUENTE[r]
  );
  if (huerfanas.length) {
    throw new Error(
      `[ejemplos-rutas] Hay rutas dinámicas que el barrido no sabe abrir:\n` +
      huerfanas.map((r) => `    ${r}`).join('\n') + '\n' +
      `  Agrega su fuente de valores a FUENTES en scripts/ejemplos-rutas.js, o\n` +
      `  déjala documentada en SIN_FUENTE si de verdad no se puede abrir sin datos reales.`
    );
  }

  const salida = {};
  for (const [plantilla, info] of porPlantilla) {
    const usados = info.tope === undefined ? info.valores : info.valores.slice(0, info.tope);
    salida[plantilla] = {
      valores: usados,
      total: info.valores.length,
      omitidos: info.valores.length - usados.length,
      porQue: info.porQue,
    };
  }
  return salida;
}

/** Resuelve las variantes por query param. Devuelve rutas ya concretas. */
function variantesDe(raiz, estaticas) {
  const set = new Set(estaticas || []);
  const salida = [];
  for (const v of VARIANTES) {
    if (set.size && !set.has(v.ruta)) {
      throw new Error(
        `[ejemplos-rutas] La variante ${v.ruta}?${v.param}= apunta a una pantalla que ya no existe.\n` +
        `  Quítala de VARIANTES en scripts/ejemplos-rutas.js.`
      );
    }
    for (const valor of valoresDe(raiz, v)) {
      salida.push({ ruta: `${v.ruta}?${v.param}=${valor}`, base: v.ruta });
    }
  }
  return salida;
}

module.exports = { FUENTES, SIN_FUENTE, VARIANTES, ejemplosDe, variantesDe, valoresDe };
