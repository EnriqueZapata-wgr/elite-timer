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
 *   · `ellipse-outline`: demasiado genérico — radios y bullets de chrome en
 *     decenas de pantallas; su versión-función ya está protegida por los
 *     candados 1 y 2.
 *   · `help-circle-outline`: es el fallback del propio mapa (glifo de "icono
 *     no encontrado"), no una función del registro.
 *   · `❤️` a secas: los dominios de Edad ATP (cardiovascular) lo usan como
 *     contenido propio; el emoji que dibujaba cardio (`❤️‍🔥`) SÍ está vetado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';
import { ICON_PATHS } from '@/src/components/ui/icons/icon-paths';
import { APP_REGISTRY } from '../app-registry';
import { PUERTAS, DESTINOS_TODOS } from '../salud-puertas';
import { ELECTRON_WEIGHTS } from '../electrons';
import { ALL_BOOLEAN_OPTIONS, ALL_QUANT_OPTIONS } from '@/src/services/hoy/day-booleans';
import { ACTIVITY_META } from '@/src/components/mente/mente-hub-core';
import { CATEGORY_COPY } from '@/src/services/mente-streaks-core';
import { TAB_BAR_ICONS } from '../tab-bar';
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
    ['ALL_BOOLEAN_OPTIONS', ALL_BOOLEAN_OPTIONS],
    ['ALL_QUANT_OPTIONS', ALL_QUANT_OPTIONS],
    ['ACTIVITY_META', Object.values(ACTIVITY_META)],
    ['CATEGORY_COPY', Object.values(CATEGORY_COPY)],
    ['TAB_BAR_ICONS', Object.values(TAB_BAR_ICONS).flatMap((t) => [
      { icon: t.reposo }, { icon: t.activo },
    ])],
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
  'src/constants/tab-bar.ts',
  'src/services/hoy/day-booleans.ts',
  'src/components/mente/mente-hub-core.ts',
  'src/services/mente-streaks-core.ts',
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

// MB-28A cerró el set: el mapa ya no tiene UN SOLO Ionicon. El .tsx no es
// importable bajo node (monta SVG), así que se lee como texto, igual que el
// resto del censo.
const MAP_SRC = read('src/components/ui/app-icon-map.tsx');

/** Exclusiones documentadas en el header (genéricos). `help-circle-outline`
 * fue el fallback del mapa hasta MB-28A (hoy es svg('fallback')); sigue aquí
 * como chrome genérico de ayuda, no como función. */
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

/** Los Ionicons que el MONTAJE del set SVG sacó del mapa (dos tandas: el
 * montaje original y el cierre de MB-28A, que sustituyó los 22 últimos + el
 * fallback). Ya no se derivan (todos los nombres lógicos dibujan con
 * `svg(...)` o componente de trazo), pero siguen vetados: un
 * `ion('flower-outline')` nuevo dibujando Meditar a mano es la misma deuda
 * de siempre. */
const REEMPLAZADOS_POR_SVG = [
  'flower-outline', 'cloud-outline', 'book-outline', 'moon-outline',
  'grid-outline', 'medal-outline', 'barbell-outline', 'pulse-outline',
  'body-outline', 'ribbon-outline', 'restaurant-outline', 'water-outline',
  'hourglass-outline', 'medkit-outline', 'reader-outline', 'cart-outline',
  'sunny-outline', 'analytics-outline', 'flame-outline', 'ellipse-outline',
  'flask-outline', 'clipboard-outline', 'settings-outline',
  // ── Tanda MB-28A ──
  'today-outline', 'stats-chart-outline', 'trending-up-outline',
  'folder-open-outline', 'snow-outline', 'leaf-outline', 'wine-outline',
  'glasses-outline', 'footsteps-outline', 'nutrition-outline',
  'phone-portrait-outline', 'git-network-outline', 'bar-chart-outline',
  'document-text-outline', 'list-outline', 'checkbox-outline',
  'bandage-outline',
];

const GLIFOS_DE_FUNCION = [
  ...new Set([...REEMPLAZADOS_POR_SVG, ...DIVERGENTES, ...LEGACY_OUTLINE]),
].filter((g) => !EXCLUIDOS.has(g));

describe('ratchet de glifos', () => {
  it('el mapa no tiene un solo Ionicon (ratchet MB-28A: cerrado)', () => {
    // La mezcla de familias crecía sola porque cada MB metía sus iconos en
    // Ionicon. Desde MB-28A el mapa dibuja TODO con el set SVG: un Ionicon
    // nuevo aquí (import, factory ion() o nombre '-outline') truena.
    expect(MAP_SRC, 'el mapa importa Ionicons otra vez').not.toContain('Ionicons');
    expect(MAP_SRC, 'el factory ion() volvió al mapa').not.toMatch(/\bion\(/);
    expect(MAP_SRC, 'hay un nombre de Ionicon en el mapa').not.toContain('-outline');
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

// ─── 5. El set SVG montado: asset ↔ mapa, sin divergencia ni invisibles ─────

// El montaje copió cada trazado de assets/icons/ a icon-paths.ts (datos puros,
// importables aquí). Este candado impide que diverjan: si un SVG cambia y el
// path montado no, truena; si alguien monta un asset 100% de trazo por el
// factory de relleno (saldría negro — el footgun de color), truena también.
describe('el set SVG está montado y no diverge de assets/icons', () => {
  const SVG_DIR = 'assets/icons';
  const assets = readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg')).sort();

  /** Los dos assets 100% de trazo del set: entran como componente a mano. */
  const TRAZO: Record<string, string> = {
    '1rm': 'src/components/ui/icons/Icon1Rm.tsx',
    emociones: 'src/components/ui/icons/IconEmociones.tsx',
  };

  it('el set completo está en el repo (56 SVG)', () => {
    // 33 del montaje original + los 22 de MB-28A + el fallback ('question').
    expect(assets.length).toBe(56);
  });

  it.each(assets)('%s montado sin divergencia', (file) => {
    const name = file.replace(/\.svg$/, '');
    const src = read(`${SVG_DIR}/${file}`);
    if (TRAZO[name]) {
      // Footgun de color: el asset pinta con stroke, no con fill. Va por
      // componente (stroke="currentColor" + color en el root), NUNCA por
      // icon-paths — si el color solo entrara por fill, saldría negro.
      expect(src).toContain('stroke="currentColor"');
      expect(name in ICON_PATHS, `${name} es de trazo: no va en icon-paths`).toBe(false);
      const comp = read(TRAZO[name]);
      expect(comp).toContain('stroke="currentColor"');
      expect(comp).toContain('color={color}');
      return;
    }
    // Relleno: un solo path con fill=currentColor, copiado 1:1 al montaje.
    expect(src, `${file} no pinta con fill=currentColor`).toMatch(/<svg [^>]*fill="currentColor"/);
    const d = src.match(/<path d="([^"]+)"\/>/)?.[1];
    expect(d, `${file}: no pude extraer su path`).toBeTruthy();
    expect(ICON_PATHS[name as keyof typeof ICON_PATHS], `${file} diverge de icon-paths.ts`).toBe(d);
  });

  it('cada glifo de relleno del set está enchufado en el mapa', () => {
    for (const name of Object.keys(ICON_PATHS)) {
      expect(MAP_SRC, `svg('${name}') no está en app-icon-map`).toContain(`svg('${name}')`);
    }
  });

  it('los de trazo entran como componente, nunca por el factory de relleno', () => {
    expect(MAP_SRC).toContain('emociones: IconEmociones');
    expect(MAP_SRC).toContain('rm: Icon1Rm');
    expect(MAP_SRC).not.toContain("svg('emociones')");
    expect(MAP_SRC).not.toContain("svg('1rm')");
  });

  it('el factory de relleno pasa el color por el root + currentColor', () => {
    expect(MAP_SRC).toContain('color={color}');
    expect(MAP_SRC).toContain('fill="currentColor"');
  });
});
