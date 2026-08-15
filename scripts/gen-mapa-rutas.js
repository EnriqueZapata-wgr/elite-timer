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
    texto = fs.readFileSync(archivo, 'utf8').slice(0, 1200);
  } catch {
    return null;
  }
  const m = texto.match(/\/\*\*([\s\S]*?)\*\//);
  if (!m) return null;
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

function construirMapa() {
  const estaticas = [];
  const dinamicas = [];
  for (const archivo of recorrer(APP_DIR)) {
    const rel = path.relative(APP_DIR, archivo);
    const ruta = aRuta(rel);
    const entrada = {
      ruta,
      archivo: 'app/' + rel.split(path.sep).join('/'),
      desc: descripcionDe(archivo),
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

function escribirFlujoRutas({ estaticas }, scheme, tema) {
  const dir = path.join(RAIZ, '.maestro');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `10-rutas-${tema}.yaml`);
  const pasos = estaticas
    .map((e) => `- openLink: ${scheme}://${e.ruta.replace(/^\//, '')}\n` +
                `- waitForAnimationToEnd:\n    timeout: 4000\n` +
                `- takeScreenshot: capturas/${tema}/${slug(e.ruta)}`)
    .join('\n');
  const cuerpo = `# GENERADO por scripts/gen-mapa-rutas.js. NO editar a mano.
#
# Recorre TODAS las rutas estáticas con deep link y dispara una captura por
# pantalla. No navega menús: salta directo, que es lo que hace viable pasar
# por ~${estaticas.length} pantallas sin que nadie toque el teléfono.
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

  console.log(`  ${mapa.estaticas.length} rutas estáticas`);
  console.log(`  ${mapa.dinamicas.length} rutas con parámetro (ARGOS las resuelve antes de navegar)`);
  console.log(`  scheme: ${scheme}://`);

  if (args.includes('--print')) {
    mapa.estaticas.forEach((e) => console.log('   ', e.ruta));
    console.log('\n  Con parámetro:');
    mapa.dinamicas.forEach((e) => console.log('   ', e.ruta));
    return;
  }

  console.log('\n  escrito: ' + path.relative(RAIZ, escribirConstante(mapa, scheme)));

  // JSON plano para el barrido con adb (PowerShell lo lee directo, sin
  // depender de Node ni de TypeScript en tiempo de corrida).
  const destinoJson = path.join(RAIZ, '.maestro', 'rutas.json');
  fs.mkdirSync(path.dirname(destinoJson), { recursive: true });
  fs.writeFileSync(destinoJson, JSON.stringify({
    scheme,
    rutas: mapa.estaticas.map((e) => ({ ruta: e.ruta, slug: slug(e.ruta), archivo: e.archivo })),
  }, null, 2), 'utf8');
  console.log('  escrito: ' + path.relative(RAIZ, destinoJson));
  if (args.includes('--maestro')) {
    for (const tema of ['oscuro', 'claro']) {
      console.log('  escrito: ' + path.relative(RAIZ, escribirFlujoRutas(mapa, scheme, tema)));
    }
  }
}

main();
