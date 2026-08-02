/**
 * MB-19.2 ENTREGA — el censo de iconos.
 *
 * Es el equivalente de `npm run censo`, pero para dibujos: recorre app/ y src/
 * y falla si algún archivo que NO sea de chrome dibuja una función del
 * registro con un Ionicon directo o con un emoji. Sin esto, la deuda que este
 * run pagó (cuatro registros paralelos, cuatro divergencias) vuelve sola.
 *
 * Cuatro candados:
 *   1. Todo icono declarado en los registros resuelve en el mapa (runtime,
 *      sella los `as any` que el compilador no ve).
 *   2. Los archivos de registro no contienen dibujos: ni Ionicons ni emoji.
 *   3. Ningún archivo pasa un emoji de función en posición `icon`.
 *   4. Ratchet de glifos: los usos directos de glifos de función quedan
 *      congelados en el inventario auditado. Un uso nuevo = o <AppIcon> o
 *      entrada consciente al inventario.
 *
 * Exclusiones deliberadas del ratchet (documentadas, no lista blanca ciega):
 *   · `ellipse-outline` y `heart-outline`: demasiado genéricos — son radios,
 *     bullets y likes de chrome en decenas de pantallas; su versión-función
 *     (ciclo, emociones) ya está protegida por los candados 1 y 2.
 *   · `❤️` a secas: los dominios de Edad ATP (cardiovascular) lo usan como
 *     contenido propio; el emoji que dibujaba cardio (`❤️‍🔥`) SÍ está vetado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';
import { APP_REGISTRY } from '../app-registry';
import { PUERTAS, DESTINOS_TODOS } from '../salud-puertas';
import { ELECTRON_WEIGHTS } from '../electrons';
import { HOY_CARD_SPECS } from '../hoy-cards';
import { ALL_BOOLEAN_OPTIONS, ALL_QUANT_OPTIONS } from '@/src/services/hoy/day-booleans';
import { GLYPH_INVENTORY } from './icon-censo-inventario';

// ─── El árbol que se recorre ────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const FILES = [...walk('app'), ...walk('src')].map((f) => f.split(sep).join('/'));
const read = (f: string) => readFileSync(f, 'utf8');

// ─── 1. Los registros solo declaran nombres que existen ────────────────────

describe('los registros declaran nombres lógicos, no dibujos', () => {
  const REGISTROS: [string, { icon: string }[]][] = [
    ['APP_REGISTRY', APP_REGISTRY],
    ['PUERTAS', PUERTAS],
    ['DESTINOS_TODOS', DESTINOS_TODOS],
    ['ELECTRON_WEIGHTS', Object.values(ELECTRON_WEIGHTS)],
    ['HOY_CARD_SPECS', HOY_CARD_SPECS],
    ['ALL_BOOLEAN_OPTIONS', ALL_BOOLEAN_OPTIONS],
    ['ALL_QUANT_OPTIONS', ALL_QUANT_OPTIONS],
  ];

  it.each(REGISTROS)('%s: todo icono resuelve en el mapa', (_nombre, entradas) => {
    for (const e of entradas) {
      expect(hasAppIcon(e.icon), `"${e.icon}" no está en app-icon-names`).toBe(true);
    }
  });
});

// ─── 2. Los archivos de registro no contienen dibujos ──────────────────────

// `electrons.ts` NO está en la lista de Ionicons porque ELECTRON_RANKS conserva
// los suyos a propósito: son insignias de rango (Partícula→Supernova), no
// funciones del registro. Sus ELECTRON_WEIGHTS quedan sellados por el candado 1
// (runtime) y por el tipo AppIconName (compile).
const REGISTRY_FILES_SIN_IONICON = [
  'src/constants/app-registry.ts',
  'src/constants/salud-puertas.ts',
  'src/constants/hoy-cards.ts',
  'src/services/hoy/day-booleans.ts',
];

const REGISTRY_FILES_SIN_EMOJI = [...REGISTRY_FILES_SIN_IONICON, 'src/constants/electrons.ts'];

describe('los archivos de registro están limpios', () => {
  it.each(REGISTRY_FILES_SIN_IONICON)('%s no contiene Ionicons', (file) => {
    // Un string '-outline' en un registro es un Ionicon de contrabando.
    const ionicon = read(file).match(/["'][a-z-]+-outline["']/g) ?? [];
    expect(ionicon, `Ionicons directos en ${file}`).toEqual([]);
  });

  it.each(REGISTRY_FILES_SIN_EMOJI)('%s no contiene emoji', (file) => {
    const emoji = read(file).match(/\p{Extended_Pictographic}/gu) ?? [];
    // Se veta el archivo completo (datos Y comentarios), salvo señalética de
    // texto (⚠ ✓) que no dibuja nada.
    const reales = emoji.filter((e) => !['⚠', '✓'].includes(e));
    expect(reales, `emoji en ${file}`).toEqual([]);
  });
});

// ─── 3. Emojis de función vetados en posición `icon` ────────────────────────

/** Los emojis que este run retiró de los registros Y que solo pueden significar
 * una función del lanzador. Si uno reaparece asignado a un `icon`, alguien
 * está dibujando una función a mano otra vez.
 *
 * Fuera de la lista, a conciencia: 💪 🧬 🥗 🌙 🌿 🫀 📊 ❤️ — también nombran
 * DOMINIOS de contenido (dominios de Edad ATP, sistemas funcionales, tipos de
 * upload) y ahí son legítimos. Los registros igual no pueden usarlos: el
 * candado 2 los veta completos. */
const EMOJIS_VETADOS = [
  '🧘', '💊', '💧', '🍳', '⏳', '🚶', '❄️', '🔴', '🌬', '🚫',
  '📵', '📓', '🗂', '☀️', '❤️‍🔥',
];

describe('emojis de función', () => {
  it('ninguno vuelve a una posición icon', () => {
    const violaciones: string[] = [];
    for (const f of FILES) {
      const lines = read(f).split('\n');
      lines.forEach((line, i) => {
        if (!/\bicon\w*\s*[:=]/.test(line)) return;
        for (const e of EMOJIS_VETADOS) {
          if (line.includes(e)) violaciones.push(`${f}:${i + 1} usa ${e}`);
        }
      });
    }
    expect(violaciones).toEqual([]);
  });
});

// ─── 4. Ratchet de glifos de función ────────────────────────────────────────

/** Todos los rellenos del mapa + los tres glifos divergentes que este run mató. */
const GLIFOS_DE_FUNCION = [
  'flower-outline', 'cloud-outline', 'book-outline', 'moon-outline',
  'grid-outline', 'medal-outline', 'barbell-outline', 'pulse-outline',
  'body-outline', 'trophy-outline', 'ribbon-outline', 'restaurant-outline',
  'water-outline', 'hourglass-outline', 'medkit-outline', 'reader-outline',
  'cart-outline', 'sunny-outline', 'analytics-outline', 'flame-outline',
  'flask-outline', 'clipboard-outline', 'settings-outline', 'today-outline',
  'stats-chart-outline', 'trending-up-outline', 'folder-open-outline',
  'snow-outline', 'leaf-outline', 'wine-outline', 'glasses-outline',
  'footsteps-outline', 'nutrition-outline', 'phone-portrait-outline',
  'git-network-outline', 'bar-chart-outline', 'document-text-outline',
  'list-outline', 'checkbox-outline', 'bandage-outline',
  'medical-outline', 'heart-half-outline', 'heart-circle-outline',
];

describe('ratchet de glifos', () => {
  it('los usos directos de glifos de función coinciden con el inventario auditado', () => {
    const pares: string[] = [];
    for (const f of FILES) {
      if (f.includes('app-icon-map')) continue; // el mapa ES el lugar del dibujo
      const src = read(f);
      for (const g of GLIFOS_DE_FUNCION) {
        if (src.includes(`'${g}'`) || src.includes(`"${g}"`)) pares.push(`${f}::${g}`);
      }
    }
    pares.sort();
    // Diferencias legibles: qué apareció y qué murió.
    const inventario = new Set(GLYPH_INVENTORY);
    const nuevos = pares.filter((p) => !inventario.has(p));
    const muertos = GLYPH_INVENTORY.filter((p) => !pares.includes(p));
    expect(nuevos, 'glifo de función dibujado a mano — usa <AppIcon> o inventaría a conciencia').toEqual([]);
    expect(muertos, 'el inventario arrastra pares que ya no existen — pódalo').toEqual([]);
  });
});
