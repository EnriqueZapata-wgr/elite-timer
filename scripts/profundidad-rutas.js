#!/usr/bin/env node
/**
 * profundidad-rutas — a cuántos toques está cada pantalla desde los tabs.
 *
 * POR QUÉ EXISTE
 * Enrique, viendo el barrido visual del 12-ago-2026: "hay muchas pantallas que
 * yo no sé cómo acceder". El primer intento midió rutas huérfanas y salió CERO:
 * las 187 están enlazadas desde algún lado. Entonces el problema no es que
 * estén sueltas, es que están ENTERRADAS.
 *
 * Una pantalla a cuatro toques de un tab existe pero es invisible. Esta es la
 * medida honesta de por qué la app se siente compleja, y el insumo para
 * decidir qué se sube de nivel, qué se agrupa y qué se esconde a propósito.
 *
 * CÓMO SE MIDE
 * Grafo dirigido: la ruta A apunta a la ruta B si el archivo que implementa A
 * menciona a B como literal. BFS desde los cinco tabs. La profundidad es el
 * mínimo de saltos, o sea el mejor camino posible, no el que el usuario
 * encuentra. El número real que vive el usuario es peor que este.
 *
 * USO
 *   node scripts/profundidad-rutas.js
 *   node scripts/profundidad-rutas.js --json
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
// Las cinco salas del tab bar (ver `app/(tabs)/_layout.tsx`). La profundidad se
// mide DESDE aquí: una frontera con una ruta muerta (`/yo`, borrada en
// `ba42730`) mide desde una puerta que ya no abre nadie.
const TABS = ['/', '/kit', '/argos', '/salud', '/tribu'];

const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, '.maestro', 'rutas.json'), 'utf8'));
const rutas = mapa.rutas.map((r) => r.ruta);

// --- Grafo: de qué ruta salen enlaces hacia cuáles -------------------------
// Se lee el archivo de la pantalla MAS los componentes que importa de forma
// directa no se siguen: con el archivo de la pantalla alcanza para el orden de
// magnitud, y seguir imports haría de esto un bundler.
const salidas = new Map(rutas.map((r) => [r, new Set()]));

for (const r of mapa.rutas) {
  const abs = path.join(RAIZ, r.archivo);
  let texto;
  try { texto = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  for (const destino of rutas) {
    if (destino === r.ruta || destino === '/') continue;
    const esc = destino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`['"\`]${esc}(['"\`?/])`).test(texto)) salidas.get(r.ruta).add(destino);
  }
}

// --- BFS desde los tabs ----------------------------------------------------
const profundidad = new Map();
let frontera = TABS.filter((t) => salidas.has(t));
frontera.forEach((t) => profundidad.set(t, 0));

let nivel = 0;
while (frontera.length) {
  nivel++;
  const siguiente = [];
  for (const actual of frontera) {
    for (const vecino of salidas.get(actual) ?? []) {
      if (!profundidad.has(vecino)) {
        profundidad.set(vecino, nivel);
        siguiente.push(vecino);
      }
    }
  }
  frontera = siguiente;
}

const inalcanzables = rutas.filter((r) => !profundidad.has(r));

// --- Reporte ---------------------------------------------------------------
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    profundidad: Object.fromEntries(profundidad),
    inalcanzables,
  }, null, 2));
  process.exit(0);
}

const porNivel = {};
for (const [r, d] of profundidad) (porNivel[d] ||= []).push(r);

console.log('');
console.log('  PROFUNDIDAD DE NAVEGACION · toques desde un tab');
console.log('  ' + '='.repeat(62));
console.log(`  ${rutas.length} rutas | 5 tabs de entrada`);
console.log('');

for (const d of Object.keys(porNivel).map(Number).sort((a, b) => a - b)) {
  const etiqueta = d === 0 ? 'los tabs' : `${d} toque${d > 1 ? 's' : ''}`;
  console.log(`  Nivel ${d}  (${etiqueta}): ${porNivel[d].length} pantallas`);
}
if (inalcanzables.length) {
  console.log(`  SIN CAMINO desde ningun tab: ${inalcanzables.length} pantallas`);
}
console.log('');

const profundas = Object.keys(porNivel).map(Number).filter((d) => d >= 3).sort((a, b) => b - a);
if (profundas.length) {
  console.log('  ' + '='.repeat(62));
  console.log('  A TRES O MAS TOQUES · aqui vive el "no se como llegar"');
  console.log('');
  for (const d of profundas) {
    console.log(`  --- ${d} toques (${porNivel[d].length}) ---`);
    porNivel[d].sort().forEach((r) => console.log(`     ${r}`));
    console.log('');
  }
}

if (inalcanzables.length) {
  console.log('  ' + '='.repeat(62));
  console.log('  SIN CAMINO desde los tabs · solo por deep link');
  console.log('');
  inalcanzables.sort().forEach((r) => console.log(`     ${r}`));
  console.log('');
}

console.log('  NOTA: esta es la profundidad del MEJOR camino posible. Lo que');
console.log('  vive el usuario es peor, porque tiene que adivinar cual es.');
console.log('');
