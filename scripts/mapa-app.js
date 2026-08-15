#!/usr/bin/env node
/**
 * mapa-app — junta TODO lo que sabemos de cada pantalla en un solo lugar.
 *
 * POR QUÉ EXISTE
 * Decisión de Enrique, 12-ago-2026: antes de simplificar la app hay que verla
 * completa. No se puede decidir qué se sube de nivel, qué se agrupa y qué se
 * esconde sin las 187 pantallas juntas y con sus números al lado.
 *
 * Este script NO opina. Junta lo medible y deja las columnas de criterio
 * vacías, porque esas son de Enrique:
 *   ¿liberada para producto final? · tema · función · accesibilidad · bugs · diseño
 *
 * Lo que sí deriva solo:
 *   ruta, archivo, sección, profundidad en toques desde un tab,
 *   quién la enlaza, a qué enlaza, colores clavados a mano (críticos y total),
 *   líneas de código, y si tiene captura en cada tema y cuánto pesa.
 *
 * SALIDA
 *   .maestro/mapa-app.json  — insumo del Excel y del visor HTML
 *
 * USO
 *   node scripts/mapa-app.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const TABS = ['/', '/salud', '/yo', '/tribu', '/kit'];
const CAPTURAS = path.join(RAIZ, '.maestro', 'capturas');

const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, '.maestro', 'rutas.json'), 'utf8'));
const rutas = mapa.rutas.map((r) => r.ruta);

// ─── Colores clavados a mano, agrupados por archivo ──────────────────────────
let coloresPorArchivo = {};
try {
  const salida = execFileSync('node', [path.join(RAIZ, 'scripts', 'audit-colores.js'), '--json'], {
    encoding: 'utf8', maxBuffer: 40 * 1024 * 1024,
  });
  for (const h of JSON.parse(salida)) {
    const c = (coloresPorArchivo[h.archivo] ||= { total: 0, criticos: 0 });
    c.total++;
    if (h.prioridad === 3) c.criticos++;
  }
} catch (e) {
  console.error('  aviso: no se pudo correr audit-colores, las columnas de color van vacias');
}

// ─── Grafo de navegación (mismo criterio que profundidad-rutas) ──────────────
const salidas = new Map(rutas.map((r) => [r, new Set()]));
const entradas = new Map(rutas.map((r) => [r, new Set()]));

for (const r of mapa.rutas) {
  let texto;
  try { texto = fs.readFileSync(path.join(RAIZ, r.archivo), 'utf8'); } catch { continue; }
  for (const destino of rutas) {
    if (destino === r.ruta || destino === '/') continue;
    const esc = destino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`['"\`]${esc}(['"\`?/])`).test(texto)) {
      salidas.get(r.ruta).add(destino);
      entradas.get(destino).add(r.ruta);
    }
  }
}

// BFS desde los tabs
const profundidad = new Map();
let frontera = TABS.filter((t) => salidas.has(t));
frontera.forEach((t) => profundidad.set(t, 0));
let nivel = 0;
while (frontera.length) {
  nivel++;
  const sig = [];
  for (const a of frontera) {
    for (const b of salidas.get(a) ?? []) {
      if (!profundidad.has(b)) { profundidad.set(b, nivel); sig.push(b); }
    }
  }
  frontera = sig;
}

// ─── Capturas disponibles ────────────────────────────────────────────────────
function temasDisponibles() {
  try {
    return fs.readdirSync(CAPTURAS, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch { return []; }
}
const temas = temasDisponibles();

function captura(tema, slug) {
  const p = path.join(CAPTURAS, tema, `${slug}.png`);
  try {
    const st = fs.statSync(p);
    return { existe: true, kb: Math.round(st.size / 1024), rel: `capturas/${tema}/${slug}.png` };
  } catch { return { existe: false, kb: 0, rel: null }; }
}

// ─── Armar las filas ─────────────────────────────────────────────────────────
const filas = mapa.rutas.map((r) => {
  let lineas = 0;
  try {
    lineas = fs.readFileSync(path.join(RAIZ, r.archivo), 'utf8').split('\n').length;
  } catch { /* nada */ }

  const color = coloresPorArchivo[r.archivo] || { total: 0, criticos: 0 };
  const prof = profundidad.has(r.ruta) ? profundidad.get(r.ruta) : null;

  const caps = {};
  for (const t of temas) caps[t] = captura(t, r.slug);

  return {
    ruta: r.ruta,
    slug: r.slug,
    archivo: r.archivo,
    // Seccion = carpeta real. Una ruta de UN solo segmento no pertenece a
    // ninguna seccion: vive plana en la raiz. Distinguirlo importa, porque el
    // primer intento agrupo por primer segmento y salieron 105 "secciones"
    // para 187 pantallas, o sea ninguna agrupacion.
    seccion: r.ruta === '/'
      ? '(hoy)'
      : (r.ruta.split('/').filter(Boolean).length > 1 ? r.ruta.split('/')[1] : '(raiz plana)'),
    segmentos: r.ruta === '/' ? 0 : r.ruta.split('/').filter(Boolean).length,
    profundidad: prof,                       // null = sin camino trazable
    enlazadaDesde: [...entradas.get(r.ruta)],
    enlazaA: [...salidas.get(r.ruta)],
    lineas,
    coloresCriticos: color.criticos,
    coloresTotal: color.total,
    capturas: caps,
    // Columnas de criterio: se llenan a mano en el Excel.
    liberada: '',
    tema: '',
    funcion: '',
    accesibilidad: '',
    bugs: '',
    diseno: '',
    notas: '',
  };
});

const destino = path.join(RAIZ, '.maestro', 'mapa-app.json');
fs.writeFileSync(destino, JSON.stringify({
  generado: new Date().toISOString(),
  temas,
  tabs: TABS,
  filas,
}, null, 2), 'utf8');

// ─── Resumen en consola ──────────────────────────────────────────────────────
const conCamino = filas.filter((f) => f.profundidad !== null).length;
const someras = filas.filter((f) => f.profundidad !== null && f.profundidad <= 2).length;
console.log('');
console.log(`  ${filas.length} pantallas mapeadas`);
console.log(`  ${someras} a dos toques o menos de un tab`);
console.log(`  ${conCamino - someras} a tres toques o mas`);
console.log(`  ${filas.length - conCamino} sin camino trazable desde el archivo de pantalla`);
console.log(`  temas con capturas: ${temas.join(', ') || 'ninguno'}`);
console.log(`  colores criticos totales: ${filas.reduce((s, f) => s + f.coloresCriticos, 0)}`);
console.log('');
console.log('  escrito: .maestro/mapa-app.json');
console.log('');
