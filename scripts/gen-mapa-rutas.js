#!/usr/bin/env node
/**
 * gen-mapa-rutas — el mapa de rutas de ATP, generado desde `app/`.
 *
 * POR QUÉ EXISTE, Y POR QUÉ SIRVE DOS VECES
 *
 * Expo Router ya define las rutas con la estructura de carpetas. Escribir ese
 * listado a mano sería trabajo duplicado que se pudre en una semana. Este
 * script lo deriva del sistema de archivos, así que una pantalla nueva entra
 * sola al mapa.
 *
 * El mismo mapa alimenta DOS cosas que parecían no tener relación:
 *
 *  1. AUDIT VISUAL (Maestro): el recorrido salta directo a cada ruta con
 *     deep link, sin navegar menús. Es lo que vuelve viable recorrer ~190
 *     pantallas sin que nadie toque el teléfono.
 *
 *  2. ARGOS COMO NAVEGADOR: para que ARGOS pueda decir "te llevo" y abrir la
 *     pantalla, necesita saber qué rutas existen. Este archivo es esa fuente.
 *     Se consume desde el cliente para armar la tool de navegación.
 *
 * USO
 *   node scripts/gen-mapa-rutas.js            # escribe src/constants/app-routes.generated.ts
 *   node scripts/gen-mapa-rutas.js --maestro  # además escribe los flujos .maestro/
 *   node scripts/gen-mapa-rutas.js --print    # solo imprime, no escribe
 */

const fs = require('fs');
const path = require('path');
const { ejemplosDe, variantesDe, SIN_FUENTE } = require('./ejemplos-rutas');

const RAIZ = path.resolve(__dirname, '..');
const APP_DIR = path.join(RAIZ, 'app');

/** Archivos que no son pantallas navegables. */
function esPantalla(nombre) {
  if (!nombre.endsWith('.tsx')) return false;
  if (nombre.startsWith('+')) return false;       // +not-found, +html
  if (nombre === '_layout.tsx') return false;
  return true;
}

/**
 * Ruta de Expo Router desde la ruta de archivo.
 *  app/(tabs)/index.tsx              -> /
 *  app/(tabs)/salud.tsx              -> /salud
 *  app/salud/intervenciones/index.tsx-> /salud/intervenciones
 *  app/edad-atp/sub-edad/[key].tsx   -> /edad-atp/sub-edad/[key]   (dinámica)
 */
function aRuta(relPath) {
  let r = relPath.split(path.sep).join('/').replace(/\.tsx$/, '');
  r = r.replace(/\((?:[^)]+)\)\//g, ''); // los grupos (tabs) no aparecen en la URL
  r = r.replace(/(^|\/)index$/, '');
  return '/' + r.replace(/^\/+/, '');
}

function* recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(completo);
    else if (esPantalla(e.name)) yield completo;
  }
}

/**
 * Saca la descripción de la pantalla de su propio encabezado.
 *
 * La convención del repo es abrir cada pantalla con un docblock del estilo
 * `/** Hidratación — Registro de agua con meta diaria... `. Eso ya es la
 * explicación de la pantalla escrita por quien la construyó, así que en vez
 * de inventar un catálogo aparte (que nace desactualizado), lo cosechamos.
 *
 * Es la semilla de lo que ARGOS necesita para EXPLICAR una pantalla, no solo
 * para navegar a ella. Lo que salga pobre se edita a mano después.
 */
function descripcionDe(archivo) {
  let texto;
  try {
    texto = fs.readFileSync(archivo, 'utf8');
  } catch {
    return null;
  }
  // Se lee el archivo COMPLETO y luego se exige que el docblock ARRANQUE arriba.
  // Antes se leían 1200 caracteres y se buscaba el bloque dentro de esa ventana:
  // cualquier pantalla con encabezado largo perdía su cierre `*/`, no había match
  // y nacía sin descripción. Así se cayó /checkin del catálogo que consume ARGOS,
  // en silencio. El tope sigue existiendo, pero ahora aplica al INICIO del bloque,
  // que es lo que de verdad distingue "encabezado del archivo" de "comentario de
  // una función a la mitad".
  const m = texto.match(/\/\*\*([\s\S]*?)\*\//);
  if (!m || m.index > 1200) return null;
  const lineas = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*+\s?/, '').trim())
    .filter(Boolean);
  if (!lineas.length) return null;
  // La primera línea con contenido es el título/resumen. Dos como máximo:
  // más que eso ya es historia de implementación, no explicación de uso.
  const resumen = lineas.slice(0, 2).join(' ').trim();
  return resumen.length > 240 ? resumen.slice(0, 237) + '...' : resumen;
}


/**
 * ¿Este archivo es un ALIAS (redirect) y a dónde manda?
 *
 * Un alias es un stub que existe solo para no romper deep links viejos:
 * contiene un <Redirect> o un router.replace y mide poco (los 54 del repo
 * miden 3 a 25 líneas; el techo de 60 deja fuera cualquier pantalla real que
 * use replace dentro de un flujo). Se detecta aquí, en el generador, porque
 * es el único lugar que ya lee todos los archivos: una lista a mano naceria
 * desactualizada.
 *
 * POR QUÉ IMPORTA (medido en el barrido del 19-ago-2026): 54 de las 200 rutas de ese día eran alias, y el resolvedor de ARGOS los puntuaba como destinos
 * distintos. Seis rutas distintas llevaban a /tests y se repartían el puntaje
 * entre ellas. Con esta marca, el resolvedor los excluye del índice y le
 * regala sus palabras al destino real.
 *
 * Devuelve { esAlias, destino }: destino null cuando se calcula en runtime
 * y no se puede leer estático.
 */
function aliasDe(archivo) {
  let texto;
  try { texto = fs.readFileSync(archivo, 'utf8'); } catch { return { esAlias: false, destino: null }; }
  const lineas = texto.split('\n').length;
  const esRedirect = /<Redirect\b/.test(texto) || /router\.replace\(/.test(texto) || /useRouter\(\)\.replace\(/.test(texto);
  if (!esRedirect || lineas > 60) return { esAlias: false, destino: null };
  const m = texto.match(/href=\{?["'`](\/[^"'`}]+)/) ||
            texto.match(/href=\{\{\s*pathname:\s*["'`](\/[^"'`]+)/) ||
            texto.match(/replace\(\s*["'`](\/[^"'`]+)/) ||
            texto.match(/replace\(\s*\{\s*pathname:\s*["'`](\/[^"'`]+)/);
  if (!m) return { esAlias: true, destino: null };
  let destino = m[1];
  // Un redirect por objeto con params NO es un duplicado 1:1: el alias carga
  // información propia (/lista-compra abre la pestaña Lista de /cocina). El
  // param se anexa como query para que el consumidor distinga alias puro
  // (destino sin '?') de alias con carga (destino con '?').
  if (!destino.includes('?')) {
    const pm = texto.match(/params:\s*\{\s*(\w+):\s*["'`]([^"'`]+)/);
    if (pm) destino += `?${pm[1]}=${pm[2]}`;
  }
  return { esAlias: true, destino };
}

function construirMapa() {
  const estaticas = [];
  const dinamicas = [];
  for (const archivo of recorrer(APP_DIR)) {
    const rel = path.relative(APP_DIR, archivo);
    const ruta = aRuta(rel);
    const ali = aliasDe(archivo);
    const entrada = {
      ruta,
      archivo: 'app/' + rel.split(path.sep).join('/'),
      desc: descripcionDe(archivo),
      esAlias: ali.esAlias,
      destinoAlias: ali.destino,
    };
    if (ruta.includes('[')) dinamicas.push(entrada);
    else estaticas.push(entrada);
  }
  // Dedup: varios archivos pueden resolver a la misma URL (típico: app/index.tsx
  // y app/(tabs)/index.tsx apuntan a '/'). Para navegar y para capturar, la
  // ruta es lo único que importa, así que la primera gana.
  const unicas = (lista) => {
    const vistas = new Set();
    return lista.filter((e) => (vistas.has(e.ruta) ? false : vistas.add(e.ruta)));
  };
  estaticas.sort((a, b) => a.ruta.localeCompare(b.ruta));
  dinamicas.sort((a, b) => a.ruta.localeCompare(b.ruta));
  return { estaticas: unicas(estaticas), dinamicas: unicas(dinamicas) };
}

/** Nombre de archivo seguro para una captura. */
function slug(ruta) {
  return (ruta === '/' ? 'hoy' : ruta.slice(1)).replace(/[^a-zA-Z0-9]+/g, '-');
}

/**
 * La lista que recorre el barrido visual: rutas CONCRETAS, ya abribles.
 *
 * Aquí es donde el mapa deja de ser un catálogo y se vuelve un recorrido. Una
 * ruta con corchetes no se puede abrir con un deep link, así que se le dan sus
 * valores reales (los que viven en el código, ver scripts/ejemplos-rutas.js) y
 * se convierte en tantas entradas como valores tenga. Lo mismo con las
 * pantallas de pestañas: cada pestaña es su propia entrada.
 *
 * Antes de esto el barrido solo veía las estáticas, y lo más nuevo de la app
 * (reportes por dominio, el motor de cuestionarios, packs, fichas del centro)
 * nunca había salido en una captura.
 */
function listaDeBarrido(mapa) {
  const ejemplos = ejemplosDe(RAIZ, mapa.dinamicas.map((e) => e.ruta));
  const entradas = [];

  for (const e of mapa.estaticas) {
    entradas.push({ ruta: e.ruta, archivo: e.archivo, tipo: 'estatica' });
  }

  for (const d of mapa.dinamicas) {
    const info = ejemplos[d.ruta];
    if (!info) continue; // está en SIN_FUENTE: documentada, no se puede abrir sin datos reales
    const params = d.ruta.match(/\[[^\]]+\]/g) || [];
    if (params.length !== 1) {
      throw new Error(
        `[gen-mapa-rutas] ${d.ruta} tiene ${params.length} parámetros y el barrido solo sabe\n` +
        `  sustituir uno. Hay que decidir cómo se combinan antes de meterla al recorrido.`
      );
    }
    for (const v of info.valores) {
      entradas.push({
        ruta: d.ruta.replace(/\[[^\]]+\]/, v),
        archivo: d.archivo,
        tipo: 'dinamica',
        plantilla: d.ruta,
      });
    }
  }

  for (const v of variantesDe(RAIZ, mapa.estaticas.map((e) => e.ruta))) {
    const base = mapa.estaticas.find((e) => e.ruta === v.base);
    entradas.push({
      ruta: v.ruta,
      archivo: base ? base.archivo : null,
      tipo: 'variante',
      plantilla: v.base,
    });
  }

  entradas.sort((a, b) => a.ruta.localeCompare(b.ruta));
  const conSlug = entradas.map((e) => ({ ...e, slug: slug(e.ruta) }));

  // Dos pantallas no pueden escribir el mismo png: la segunda pisa a la
  // primera y el barrido reporta más capturas de las que de verdad tiene.
  // Con las rutas concretas el slug ya sale distinto solo (reports-nutricion
  // contra reports-labs), pero esto lo fija: si algún día un cambio de slug
  // las vuelve a juntar, revienta aquí y no en la carpeta de capturas.
  const vistos = new Map();
  const choques = [];
  for (const e of conSlug) {
    if (vistos.has(e.slug)) choques.push(`  ${e.slug}.png <- ${vistos.get(e.slug)}  y  ${e.ruta}`);
    else vistos.set(e.slug, e.ruta);
  }
  if (choques.length) {
    throw new Error(
      `[gen-mapa-rutas] Estas rutas escribirían la misma captura:\n${choques.join('\n')}`
    );
  }

  return { entradas: conSlug, ejemplos };
}

function escribirConstante({ estaticas, dinamicas }, scheme) {
  const destino = path.join(RAIZ, 'src', 'constants', 'app-routes.generated.ts');
  const cuerpo = `/**
 * GENERADO por scripts/gen-mapa-rutas.js. NO editar a mano.
 *
 * El mapa de rutas de la app. Lo consume el audit visual (Maestro) y, sobre
 * todo, ARGOS: para poder llevar al usuario a una pantalla necesita saber
 * qué pantallas existen.
 *
 * Regenerar:  node scripts/gen-mapa-rutas.js
 */
export const APP_SCHEME = ${JSON.stringify(scheme)};

/** Rutas sin parámetros: se pueden abrir tal cual. */
export const APP_ROUTES: readonly string[] = [
${estaticas.map((e) => `  ${JSON.stringify(e.ruta)},`).join('\n')}
];

/** Rutas que necesitan un parámetro. ARGOS debe resolverlo antes de navegar. */
export const APP_ROUTES_DYNAMIC: readonly string[] = [
${dinamicas.map((e) => `  ${JSON.stringify(e.ruta)},`).join('\n')}
];

/**
 * ALIAS: rutas que existen solo para no romper deep links viejos. Cada una
 * redirige al destino indicado (null = el destino se calcula en runtime y no
 * se puede leer estático). El resolvedor de ARGOS las EXCLUYE de su índice y
 * le suma sus palabras al destino real; el barrido visual las sigue
 * recorriendo para verificar que la redirección vive.
 */
export const APP_ROUTE_ALIASES: Readonly<Record<string, string | null>> = {
${estaticas.filter((e) => e.esAlias).map((e) => `  ${JSON.stringify(e.ruta)}: ${JSON.stringify(e.destinoAlias)},`).join('\n')}
};

/**
 * Qué hace cada pantalla, cosechado del encabezado de su propio archivo.
 *
 * Es la semilla del conocimiento que ARGOS necesita para EXPLICAR la app, no
 * solo para navegarla. Viene del código, así que no se desactualiza sola; lo
 * que salga pobre se mejora editando el docblock de la pantalla, que es donde
 * debe vivir.
 *
 * 🚨 NO SE LE ENTREGA CRUDO AL USUARIO. Estos textos están escritos por y para
 * desarrollo: traen números de migración, claves de sprint (MB-32, #47) y
 * nombres propios del equipo. Antes de que ARGOS los use en una respuesta hay
 * que pasarlos por una limpieza de copy. Sirven como CONTEXTO para el modelo,
 * nunca como texto a citar.
 */
export const APP_ROUTE_DESCRIPTIONS: Readonly<Record<string, string>> = {
${estaticas.filter((e) => e.desc).map((e) => `  ${JSON.stringify(e.ruta)}: ${JSON.stringify(e.desc)},`).join('\n')}
};
`;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, cuerpo, 'utf8');
  return destino;
}

function escribirFlujoRutas(entradas, scheme, tema) {
  const dir = path.join(RAIZ, '.maestro');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `10-rutas-${tema}.yaml`);
  const pasos = entradas
    .map((e) => `- openLink: ${scheme}://${e.ruta.replace(/^\//, '')}\n` +
                `- waitForAnimationToEnd:\n    timeout: 4000\n` +
                `- takeScreenshot: capturas/${tema}/${e.slug}`)
    .join('\n');
  const cuerpo = `# GENERADO por scripts/gen-mapa-rutas.js. NO editar a mano.
#
# Recorre TODAS las pantallas con deep link y dispara una captura por pantalla,
# incluidas las rutas con parámetro ya resueltas. No navega menús: salta
# directo, que es lo que hace viable pasar por ~${entradas.length} pantallas sin
# que nadie toque el teléfono.
#
# Antes de correr esto, deja la app en tema ${tema.toUpperCase()}.
appId: com.atpperformance.app
---
- launchApp:
    clearState: false
${pasos}
`;
  fs.writeFileSync(archivo, cuerpo, 'utf8');
  return archivo;
}

function main() {
  const args = process.argv.slice(2);
  const appJson = JSON.parse(fs.readFileSync(path.join(RAIZ, 'app.json'), 'utf8'));
  const scheme = appJson.expo?.scheme || 'atp';
  const mapa = construirMapa();
  const barrido = listaDeBarrido(mapa);

  console.log(`  ${mapa.estaticas.length} rutas estáticas`);
  console.log(`  ${mapa.dinamicas.length} rutas con parámetro (ARGOS las resuelve antes de navegar)`);
  console.log(`  ${barrido.entradas.length} pantallas en el barrido visual (dinámicas ya expandidas)`);
  console.log(`  scheme: ${scheme}://`);

  for (const [plantilla, info] of Object.entries(barrido.ejemplos)) {
    const cola = info.omitidos ? `  (${info.omitidos} omitidas: ${info.porQue})` : '';
    console.log(`    ${plantilla} -> ${info.valores.length} de ${info.total}${cola}`);
  }
  for (const [ruta, razon] of Object.entries(SIN_FUENTE)) {
    console.log(`    ${ruta} -> fuera del barrido: ${razon}`);
  }

  if (args.includes('--print')) {
    barrido.entradas.forEach((e) => console.log('   ', e.ruta));
    return;
  }

  console.log('\n  escrito: ' + path.relative(RAIZ, escribirConstante(mapa, scheme)));

  // JSON plano para el barrido con adb (PowerShell lo lee directo, sin
  // depender de Node ni de TypeScript en tiempo de corrida).
  //
  // Las rutas van CONCRETAS: `/reports/glucosa`, no `/reports/[dominio]`. El
  // script de PowerShell no tiene que saber nada de parámetros; sigue siendo
  // un bucle que abre lo que le den.
  const destinoJson = path.join(RAIZ, '.maestro', 'rutas.json');
  fs.mkdirSync(path.dirname(destinoJson), { recursive: true });
  fs.writeFileSync(destinoJson, JSON.stringify({
    scheme,
    generado: new Date().toISOString(),
    resumen: {
      estaticas: barrido.entradas.filter((e) => e.tipo === 'estatica').length,
      dinamicas: barrido.entradas.filter((e) => e.tipo === 'dinamica').length,
      variantes: barrido.entradas.filter((e) => e.tipo === 'variante').length,
    },
    // Lo que quedó fuera, a la vista. Un barrido que omite cosas sin decirlo
    // es lo mismo que un barrido incompleto.
    fuera: {
      ...SIN_FUENTE,
      ...Object.fromEntries(
        Object.entries(barrido.ejemplos)
          .filter(([, i]) => i.omitidos)
          .map(([p, i]) => [p, `${i.omitidos} de ${i.total} omitidas: ${i.porQue}`])
      ),
    },
    rutas: barrido.entradas,
  }, null, 2), 'utf8');
  console.log('  escrito: ' + path.relative(RAIZ, destinoJson));
  if (args.includes('--maestro')) {
    for (const tema of ['oscuro', 'claro']) {
      console.log('  escrito: ' + path.relative(RAIZ, escribirFlujoRutas(barrido.entradas, scheme, tema)));
    }
  }
}

main();
