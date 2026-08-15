#!/usr/bin/env node
/**
 * rutas-huerfanas — qué pantallas existen pero nadie puede alcanzar.
 *
 * POR QUÉ EXISTE
 * Enrique, al ver el barrido visual del 12-ago-2026: "hay muchas pantallas que
 * yo no sé cómo acceder". Si el autor de la app no sabe llegar, un usuario
 * tampoco. Con 187 rutas y 5 tabs, la pregunta no es cuántas pantallas hay,
 * es cuántas están conectadas.
 *
 * Esto es requisito para hacer la app esbelta SIN perder nada: primero saber
 * qué está suelto, después decidir si se conecta, se esconde o se borra.
 *
 * QUÉ CUENTA COMO ENLACE
 *   router.push('/ruta')      router.replace('/ruta')     router.navigate('/ruta')
 *   <Link href="/ruta">       href: '/ruta'               '/ruta' en un objeto de config
 * Se ignoran las referencias dentro del propio archivo de la pantalla (una
 * pantalla que se menciona a sí misma no está enlazada por nadie).
 *
 * USO
 *   node scripts/rutas-huerfanas.js
 *   node scripts/rutas-huerfanas.js --json
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const CARPETAS = ['app', 'src', 'components'];
const EXT = new Set(['.ts', '.tsx']);

function* recorrer(dir) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entradas) {
    const c = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.expo', '__tests__'].includes(e.name)) continue;
      yield* recorrer(c);
    } else if (EXT.has(path.extname(e.name))) {
      yield c;
    }
  }
}

const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, '.maestro', 'rutas.json'), 'utf8'));

// Índice: ruta -> archivos que la mencionan (sin contar su propia pantalla).
const enlaces = new Map(mapa.rutas.map((r) => [r.ruta, new Set()]));

// El archivo que IMPLEMENTA cada ruta, para excluir auto-referencias.
const implementa = new Map();
for (const r of mapa.rutas) {
  const base = r.ruta === '/' ? 'index' : r.ruta.slice(1);
  implementa.set(r.ruta, base);
}

const archivos = [...recorrer(path.join(RAIZ, 'app')), ...recorrer(path.join(RAIZ, 'src'))];
const componentes = fs.existsSync(path.join(RAIZ, 'components'))
  ? [...recorrer(path.join(RAIZ, 'components'))] : [];

for (const archivo of [...archivos, ...componentes]) {
  const rel = path.relative(RAIZ, archivo).split(path.sep).join('/');
  let texto;
  try { texto = fs.readFileSync(archivo, 'utf8'); } catch { continue; }

  for (const r of mapa.rutas) {
    if (r.ruta === '/') continue; // la raíz siempre es alcanzable (es el tab HOY)
    // El archivo que implementa la ruta no cuenta como enlace hacia sí mismo.
    const propio = rel.startsWith('app/' + implementa.get(r.ruta));
    if (propio) continue;
    // Buscamos la ruta como literal entre comillas, con o sin query/params.
    const esc = r.ruta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`['"\`]${esc}(['"\`?/])`);
    if (re.test(texto)) enlaces.get(r.ruta).add(rel);
  }
}

const huerfanas = mapa.rutas
  .filter((r) => r.ruta !== '/' && enlaces.get(r.ruta).size === 0)
  .map((r) => r.ruta);

const conectadas = mapa.rutas.length - huerfanas.length - 1;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ huerfanas, conectadas, total: mapa.rutas.length }, null, 2));
  process.exit(0);
}

console.log('');
console.log('  RUTAS HUERFANAS · pantallas que existen y nadie enlaza');
console.log('  ' + '='.repeat(60));
console.log(`  ${mapa.rutas.length} rutas en total`);
console.log(`  ${conectadas} con al menos un enlace entrante`);
console.log(`  ${huerfanas.length} SIN un solo enlace en todo el codigo`);
console.log('');

// Agrupar por primer segmento: ayuda a ver si una seccion entera quedo suelta.
const porSeccion = {};
for (const h of huerfanas) {
  const sec = h.split('/')[1] || '(raiz)';
  (porSeccion[sec] ||= []).push(h);
}
for (const [sec, lista] of Object.entries(porSeccion).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${sec}  (${lista.length})`);
  lista.forEach((l) => console.log(`     ${l}`));
  console.log('');
}

console.log('  OJO: "huerfana" no significa "borrar". Significa que hoy solo se');
console.log('  llega por deep link. Puede ser intencional (pantalla de sistema),');
console.log('  puede ser una que se te olvido conectar, o puede ser muerta.');
console.log('  La decision es de producto, el inventario es de aqui.');
console.log('');
