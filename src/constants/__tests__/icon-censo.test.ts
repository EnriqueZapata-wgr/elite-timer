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

// Los rellenos vigentes se DERIVAN del mapa: si el mapa cambia, el ratchet
// cambia solo. El .tsx no es importable bajo node (monta Ionicons y SVG), así
// que se lee como texto, igual que el resto del censo.
const MAP_SRC = read('src/components/ui/app-icon-map.tsx');
const FILLS = [...new Set([...MAP_SRC.matchAll(/\bion\('([a-z-]+)'\)/g)].map((m) => m[1]))];

/** Exclusiones documentadas en el header (genéricos) + el fallback del mapa. */
const EXCLUIDOS = new Set(['ellipse-outline', 'help-circle-outline']);

/** Divergencias que MB-19.2 mató: ya no están en el mapa, siguen vetadas. */
const DIVERGENTES = [
  'trophy-outline', 'medical-outline', 'heart-half-outline', 'heart-circle-outline',
];

/** Glifos que dibujaban funciones ANTES del enchufe (evidencia: 58ed030).
 * Un archivo nuevo que los use ya no pasa verde. `flash-outline` queda fuera
 * a conciencia: es insignia de rango en ELECTRON_RANKS y chrome de energía en
 * ~18 archivos, y no hay evidencia de que haya dibujado una función. */
const LEGACY_OUTLINE = [
  'timer-outline', 'document-outline', 'calendar-outline', 'eye-outline',
  'sparkles-outline', 'journal-outline',
];

/** Rellenos pelones pre-enchufe (el mapa de AgendaMiniCard). Chocan con IDs
 * legítimos ('water' es electrón, 'barbell' es equipo), así que solo se cazan
 * ligados a posición icon/name. Punto ciego documentado: un ternario
 * `name={x ? 'water' : 'moon'}` no matchea; hoy hay cero casos así. */
const LEGACY_FILL = [
  'restaurant', 'barbell', 'bicycle', 'leaf', 'medkit', 'moon', 'water',
  'sunny', 'partly-sunny',
];

const GLIFOS_DE_FUNCION = [
  ...FILLS.filter((g) => !EXCLUIDOS.has(g)),
  ...DIVERGENTES,
  ...LEGACY_OUTLINE,
];

describe('ratchet de glifos', () => {
  it('la derivación del mapa funciona (guard del regex)', () => {
    expect(FILLS).toContain('flower-outline');
    expect(FILLS.length).toBeGreaterThanOrEqual(38);
  });

  it('los usos de glifos de función coinciden con el inventario auditado', () => {
    // Se cuentan USOS, no pares archivo-glifo: un segundo uso del mismo glifo
    // en un archivo ya inventariado también es un uso nuevo que auditar.
    // Formato: 'archivo::glifo' = 1 uso; 'archivo::glifo::xN' = N usos.
    const usos: string[] = [];
    const count = (src: string, needle: string) => src.split(needle).length - 1;
    for (const f of FILES) {
      if (f.includes('app-icon-map')) continue; // el mapa ES el lugar del dibujo
      const src = read(f);
      for (const g of GLIFOS_DE_FUNCION) {
        const n = count(src, `'${g}'`) + count(src, `"${g}"`);
        if (n === 1) usos.push(`${f}::${g}`);
        else if (n > 1) usos.push(`${f}::${g}::x${n}`);
      }
      for (const g of LEGACY_FILL) {
        const n = (src.match(new RegExp(`(?:\\bicon\\w*|\\bname)\\s*[:=]\\s*["']${g}["']`, 'g')) ?? []).length;
        if (n === 1) usos.push(`${f}::${g}`);
        else if (n > 1) usos.push(`${f}::${g}::x${n}`);
      }
    }
    usos.sort();
    // Diferencias legibles: qué apareció y qué murió.
    const inventario = new Set(GLYPH_INVENTORY);
    const nuevos = usos.filter((p) => !inventario.has(p));
    const muertos = GLYPH_INVENTORY.filter((p) => !usos.includes(p));
    expect(nuevos, 'glifo de función dibujado a mano — usa <AppIcon> o inventaría a conciencia').toEqual([]);
    expect(muertos, 'el inventario arrastra usos que ya no existen — pódalo').toEqual([]);
  });
});
