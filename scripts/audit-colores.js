#!/usr/bin/env node
/**
 * audit-colores — caza los colores clavados a mano que rompen el tema claro.
 *
 * POR QUÉ EXISTE
 * La migración de temas está prácticamente hecha: 197 archivos jalan del
 * theme context y solo 2 usan THEME_DARK directo. Entonces los bugs del tema
 * claro NO son pantallas sin migrar. Son literales de color sueltos dentro de
 * pantallas ya migradas: un '#FFFFFF' en un StyleSheet, un 'rgba(0,0,0,0.5)'
 * en una sombra. Esos nunca voltean con el tema, por definición.
 *
 * Y eso se detecta sin abrir la app y sin una sola captura de pantalla.
 *
 * USO
 *   node scripts/audit-colores.js              # reporte legible
 *   node scripts/audit-colores.js --json       # para pipearlo a otra cosa
 *   node scripts/audit-colores.js --top 20     # solo los peores archivos
 *   node scripts/audit-colores.js --ci         # exit 1 si hay hallazgos nuevos
 *
 * QUÉ NO HACE
 * No juzga si el color se ve bien. Dice dónde hay un color que el tema no
 * puede tocar. El ojo sigue siendo tuyo, pero sobre 30 renglones en vez de
 * sobre 194 pantallas.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const CARPETAS = ['app', 'src', 'components'];

// Archivos que TIENEN que declarar colores: son la fuente del tema.
// Si agregas un archivo de tokens nuevo, métele aquí o lo vas a ver de rojo.
const EXENTOS = [
  'src/constants/brand.ts',
  'src/contexts/theme-context.tsx',
  'src/components/onboarding/onboarding-theme.ts',
  'src/theme/',
  'src/constants/colors',
  // 21-ago-2026 — los archivos cuyo TRABAJO es definir colores. Marcarlos es
  // como marcar un diccionario por contener palabras: aquí el color no está
  // "clavado a mano", está declarado, que es lo que queremos. Lo que sí hay
  // que revisar en ellos es si cada color contrasta en los dos temas, y eso
  // no lo dice este detector: lo dicen los candados de contraste.
  'src/constants/concept-colors.ts',
  'src/constants/electrons.ts',
  'src/constants/categories.ts',
  'src/constants/salud-puertas.ts',
  // El logo y su gradiente son la marca, dibujada en SVG: por definición no
  // cambia con el tema.
  'src/components/ui/brand/',
];

const ARCHIVO_BASE = path.join(__dirname, 'audit-colores-base.json');

const ES_TEST = /(__tests__|\.test\.|\.spec\.)/;
const EXT_VALIDAS = new Set(['.ts', '.tsx']);

// Hex de 3, 6 u 8 dígitos, y rgb()/rgba() con números.
const RE_COLOR = /(#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\brgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\))/g;

// Un color 100% transparente no pinta nada, así que no es bug de tema.
const INOCUOS = new Set(['transparent', '#0000', '#00000000', 'rgba(0,0,0,0)']);

function esExento(rel) {
  const norm = rel.split(path.sep).join('/');
  return EXENTOS.some((e) => norm.startsWith(e) || norm.includes(e));
}

function* recorrer(dir) {
  let entradas;
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entradas) {
    const completo = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.expo') continue;
      yield* recorrer(completo);
    } else if (EXT_VALIDAS.has(path.extname(e.name))) {
      yield completo;
    }
  }
}

/**
 * Contexto del hallazgo. Sirve para priorizar: un color dentro de un
 * StyleSheet es casi siempre un bug de tema; uno dentro de un SVG o de un
 * gradiente de marca puede ser intencional.
 */
function clasificar(linea, lineasPrevias) {
  const l = linea.toLowerCase();
  const bloque = lineasPrevias.join('\n').toLowerCase();

  // 21-ago-2026 — DOS CLASES QUE NO SON BUG, Y QUE INFLABAN EL NÚMERO.
  //
  // Sin esto el reporte decía 975 críticos y la mitad no lo eran. Un número
  // que asusta y no se puede trabajar es peor que no medir: se ignora entero.
  //
  // 1) El color YA cambia con el tema. Vive dentro de un ternario que mira el
  //    tema (t.kind === 'dark' ? A : B, dark ? A : B, isDark ? …). Son dos
  //    literales, sí, pero el tema los voltea, que es justo lo que pedimos.
  if (/\b(t\.kind\s*===|iskind|isdark|\bdark\s*\?)/.test(l)) return 'ya cambia con el tema';
  //
  // 2) El color es un DATO, no cromo: la identidad de una categoría (proteína
  //    azul, grasa naranja), que es la misma en claro y en oscuro a propósito.
  //    Se reconocen porque viven en una definición con etiqueta o llave.
  if (
    /\bcolor\s*:/.test(l) &&
    /\b(label|key|id|name|title|titulo|abbr|icon|emoji|unit|subtitle|offset|stop)\s*:/.test(l)
  ) {
    return 'color de dato';
  }

  if (/\b(backgroundcolor|bordercolor|shadowcolor)\b/.test(l)) return 'fondo/borde';
  if (/\bcolor\s*:/.test(l)) return 'texto';
  if (/(stroke|fill)\s*[:=]/.test(l)) return 'svg';
  if (/(gradient|colors\s*=\{)/.test(l) || /lineargradient/.test(bloque)) return 'gradiente';
  if (/(tintcolor|iconcolor)/.test(l)) return 'icono';
  return 'otro';
}

// Los que casi siempre son bug de tema, contra los que suelen ser marca.
// Prioridad 0 = no es hallazgo, se cuenta aparte para poder auditar el filtro.
const PRIORIDAD = {
  'fondo/borde': 3,
  texto: 3,
  icono: 2,
  gradiente: 1,
  svg: 1,
  otro: 2,
  'ya cambia con el tema': 0,
  'color de dato': 0,
};

function analizar() {
  const hallazgos = [];
  for (const carpeta of CARPETAS) {
    const base = path.join(RAIZ, carpeta);
    if (!fs.existsSync(base)) continue;
    for (const archivo of recorrer(base)) {
      const rel = path.relative(RAIZ, archivo);
      if (esExento(rel) || ES_TEST.test(rel)) continue;
      const lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
      lineas.forEach((linea, i) => {
        if (linea.trimStart().startsWith('//') || linea.trimStart().startsWith('*')) return;
        const matches = linea.match(RE_COLOR);
        if (!matches) return;
        for (const color of matches) {
          if (INOCUOS.has(color.toLowerCase().replace(/\s/g, ''))) continue;
          const tipo = clasificar(linea, lineas.slice(Math.max(0, i - 6), i));
          hallazgos.push({
            archivo: rel.split(path.sep).join('/'),
            linea: i + 1,
            color,
            tipo,
            prioridad: PRIORIDAD[tipo],
            fragmento: linea.trim().slice(0, 110),
          });
        }
      });
    }
  }
  return hallazgos;
}

function main() {
  const args = process.argv.slice(2);
  const hallazgos = analizar();

  if (args.includes('--json')) {
    // OJO: aquí vivía un process.exit(0) y truncaba la salida. console.log a
    // una tubería es asíncrono, y exit no espera el vaciado: quien consumiera
    // el JSON recibía un string a medias. Se sale por return y ya.
    console.log(JSON.stringify(hallazgos));
    return;
  }

  const porArchivo = new Map();
  for (const h of hallazgos) {
    if (!porArchivo.has(h.archivo)) porArchivo.set(h.archivo, []);
    porArchivo.get(h.archivo).push(h);
  }

  const idxTop = args.indexOf('--top');
  const top = idxTop >= 0 ? parseInt(args[idxTop + 1], 10) : Infinity;

  const orden = [...porArchivo.entries()]
    .map(([archivo, hs]) => ({
      archivo,
      total: hs.length,
      criticos: hs.filter((h) => h.prioridad === 3).length,
      hs,
    }))
    .sort((a, b) => b.criticos - a.criticos || b.total - a.total)
    .slice(0, top);

  const totalCriticos = hallazgos.filter((h) => h.prioridad === 3).length;

  console.log('');
  console.log('  AUDIT DE COLOR CLAVADO A MANO');
  console.log('  ' + '='.repeat(60));
  console.log(`  ${hallazgos.length} literales de color en ${porArchivo.size} archivos`);
  console.log(`  ${totalCriticos} en fondo, borde o texto (los que rompen el tema claro)`);
  console.log('');
  console.log('  Por tipo:');
  const porTipo = {};
  for (const h of hallazgos) porTipo[h.tipo] = (porTipo[h.tipo] || 0) + 1;
  for (const [t, n] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(5)}  ${t}`);
  }
  console.log('');
  console.log('  ' + '='.repeat(60));
  console.log('  ARCHIVOS, peor primero');
  console.log('');

  for (const { archivo, total, criticos, hs } of orden) {
    console.log(`  ${archivo}  (${total} colores, ${criticos} críticos)`);
    for (const h of hs.filter((x) => x.prioridad === 3).slice(0, 6)) {
      console.log(`     ${archivo}:${h.linea}  ${h.color}  [${h.tipo}]`);
      console.log(`        ${h.fragmento}`);
    }
    if (criticos > 6) console.log(`     ... y ${criticos - 6} críticos más en este archivo`);
    console.log('');
  }

  if (args.includes('--sellar')) return sellar(orden);
  if (args.includes('--ci')) return revisarContraBase(orden);
}

/**
 * TRINQUETE (21-ago-2026).
 *
 * Antes `--ci` reventaba si había UN solo hallazgo, y hay cientos: el candado
 * nacía rojo y por lo tanto nadie lo corría. Un candado que no puede pasar no
 * es un candado, es un adorno.
 *
 * Ahora compara contra una línea base sellada por archivo. Pasa si nadie
 * empeoró; revienta si un archivo sube o si aparece uno nuevo con color
 * clavado. La deuda vieja se puede pagar cuando toque, pero no crece. Y
 * cuando bajas un archivo, te lo dice, para que selles el nuevo piso.
 */
function sellar(orden) {
  const base = {};
  for (const { archivo, criticos } of orden) if (criticos > 0) base[archivo] = criticos;
  fs.writeFileSync(
    ARCHIVO_BASE,
    JSON.stringify(
      {
        _lee_esto:
          'Línea base del audit de color: cuántos colores críticos tolera cada archivo HOY. ' +
          'No es una meta, es un techo. `--ci` revienta si un archivo sube o si aparece uno nuevo. ' +
          'Cuando bajes un archivo, vuelve a sellar con `node scripts/audit-colores.js --sellar` ' +
          'para que el piso nuevo quede fijo y nadie lo deshaga.',
        _sellado: new Date().toISOString().slice(0, 10),
        archivos: base,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`  Línea base sellada: ${Object.keys(base).length} archivos con deuda.`);
  console.log(`  ${ARCHIVO_BASE}`);
}

function revisarContraBase(orden) {
  let base;
  try {
    base = JSON.parse(fs.readFileSync(ARCHIVO_BASE, 'utf8')).archivos || {};
  } catch {
    console.log('  No hay línea base. Séllala con: node scripts/audit-colores.js --sellar');
    process.exit(1);
  }
  const peores = [];
  const mejores = [];
  for (const { archivo, criticos } of orden) {
    if (criticos === 0) continue;
    const techo = base[archivo] ?? 0;
    if (criticos > techo) peores.push({ archivo, criticos, techo });
    else if (criticos < techo) mejores.push({ archivo, criticos, techo });
  }
  for (const { archivo, criticos, techo } of peores) {
    console.log(`  SUBIÓ  ${archivo}: ${techo} → ${criticos}`);
  }
  for (const { archivo, criticos, techo } of mejores) {
    console.log(`  bajó   ${archivo}: ${techo} → ${criticos}  (vuelve a sellar)`);
  }
  if (peores.length) {
    console.log('');
    console.log('  Hay color clavado NUEVO. Usa los tokens del tema, o si de verdad');
    console.log('  no cambia con el tema, di por qué en el propio renglón.');
    process.exit(1);
  }
  console.log('  Sin color clavado nuevo.');
}

main();
