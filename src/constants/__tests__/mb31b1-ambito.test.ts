/**
 * MB-31B1 · Pieza 3 — los candados del ámbito B1 (el marco y el día).
 *
 *  1 · RATCHET: ningún archivo de la lista B1 puede tener un hex NEUTRO a
 *      mano (canales iguales: #000, #fff, #888, #0a0a0a…) ni un valor de
 *      token de tema escrito como literal (#121212, #E9EEF1…). Los colores
 *      de MARCA y de SECCIÓN sí pueden quedarse: el ratchet distingue por
 *      canales, no por lista blanca. La lista se enumera del disco: una
 *      pantalla nueva en estas carpetas entra sola al ratchet.
 *  2 · CONTRASTE CALCULADO (WCAG real, utilidad de MB-31A) de los pares
 *      NUEVOS que este ámbito introdujo — los del manual ya los cuida
 *      theme-tokens.test.ts.
 *  3 · CARD EDITORIAL: las tres superficies editoriales del ámbito
 *      (TareaCard, MomentoBanda, AgendaMiniCard) no cambian entre temas —
 *      velo/gradiente oscuro constante y UNA sola condición de tema, la del
 *      borde (candado espejo, mismo patrón que EditorialCard en MB-31A).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  THEME_DARK, THEME_LIGHT, CATEGORY_COLORS, ATP_BRAND, RAMPAS_OSCURAS,
} from '@/src/constants/brand';
import { SECCION_COLORS } from '@/src/constants/concept-colors';
import { contrastRatio } from '@/src/utils/contrast';

// ─── 1 · RATCHET ───────────────────────────────────────────────────────────

/** La lista B1 del brief: (tabs)/*, _layout, agenda, centro/*, packs/*,
 *  settings (hub + subpantallas) y onboarding (v2 + voice-config). */
function listaB1(): string[] {
  // Tambien .ts: un modulo puro que escribe un hex de token a mano hace el
  // mismo dano que una pantalla, y hasta hoy ese era un punto ciego del
  // candado (las cuatro tablas de estado clinico vivian ahi y no las veia).
  const dir = (d: string) =>
    readdirSync(d)
      .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map((f) => `${d}/${f}`);
  return [
    ...dir('app/(tabs)'),
    'app/_layout.tsx',
    'app/agenda.tsx',
    'app/settings.tsx',
    ...dir('app/centro'),
    ...dir('app/packs'),
    ...dir('app/settings'),
    ...dir('app/onboarding/v2'),
    'app/onboarding/voice-config.tsx',
  ];
}

/** Quita comentarios (los briefs y refs tipo `#137` viven ahí). */
function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** ¿El hex es NEUTRO (canales iguales)? Acepta #RGB(A) y #RRGGBB(AA). */
function esNeutro(hex: string): boolean {
  let v = hex.slice(1);
  if (v.length === 4) v = v.slice(0, 3);
  if (v.length === 8) v = v.slice(0, 6);
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  if (v.length !== 6) return false;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return r === g && g === b;
}

function normaliza(hex: string): string {
  let v = hex.slice(1).toLowerCase();
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  return `#${v}`;
}

/** Marca y sección son IDENTIDAD: pueden vivir como literal (el ratchet
 *  distingue). #5B9BD5 y #1ABC9C son a la vez token e identidad — ganan
 *  como identidad. */
const IDENTIDAD = new Set(
  [
    ...Object.values(CATEGORY_COLORS),
    ...Object.values(SECCION_COLORS),
    ATP_BRAND.lime, ATP_BRAND.teal, ATP_BRAND.teal1, ATP_BRAND.amber,
    ...ATP_BRAND.moleculeGradient,
  ].map((v) => normaliza(v)),
);

/** Valores de token de tema: tampoco se escriben como literal en pantallas.
 *
 *  ACERO (22-ago-2026): entran LAS DOS rampas oscuras, no solo la vigente.
 *  Mirando solo los tokens vivos, mover la bandera desarmaría medio candado:
 *  los doce grises de la rampa dormida dejarían de estar bloqueados, y los
 *  del acero NO son neutros, así que se colarían sin que nadie se enterara. */
const VALORES_TOKEN = new Set(
  [
    ...Object.values(THEME_DARK),
    ...Object.values(THEME_LIGHT),
    ...RAMPAS_OSCURAS.flatMap((r) => Object.values(r)),
  ]
    .filter((v): v is string => typeof v === 'string' && v.startsWith('#'))
    .map((v) => normaliza(v))
    .filter((v) => !IDENTIDAD.has(v)),
);

describe('1 · ratchet B1: cero hex neutro a mano en la lista', () => {
  it.each(listaB1())('%s', (file) => {
    const src = sinComentarios(readFileSync(file, 'utf8'));
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const ofensas = hexes.filter(
      (h) => esNeutro(h) || VALORES_TOKEN.has(normaliza(h)),
    );
    expect(ofensas, `hex neutro/token a mano: ${ofensas.join(', ')}`).toEqual([]);
  });
});

// ─── 2 · CONTRASTE CALCULADO de los pares nuevos de B1 ─────────────────────

describe('2 · pares nuevos del ámbito, calculados (no comparación de strings)', () => {
  // [nombre, fg, bg, mínimo]
  const PARES: [string, string, string, number][] = [
    // Regla 3 del manual: el teal de coach (sección) como RELLENO lleva negro.
    ['negro sobre teal coach (relleno de sección)', '#000000', CATEGORY_COLORS.metrics, 4.5],
    // Chips/inputs hundidos en claro: el texto secundario debe leerse ahí.
    ['claro: secundario sobre hundido (chips, inputs)', THEME_LIGHT.textoSecundario, THEME_LIGHT.hundido, 4.5],
    // Botón destructivo en claro: fondo = token de error, texto blanco.
    ['claro: blanco sobre error (botón destructivo)', ATP_BRAND.white, THEME_LIGHT.error, 4.5],
    // Hojas flotantes en claro (TimeWheelPicker, modales de agenda): el teal
    // calibrado como título/acento sobre flotante.
    ['claro: teal calibrado sobre flotante', THEME_LIGHT.tealTexto, THEME_LIGHT.flotante, 4.5],
    // OptionCard/las fichas: teal calibrado como glifo sobre hundido claro.
    ['claro: teal calibrado sobre hundido', THEME_LIGHT.tealTexto, THEME_LIGHT.hundido, 4.5],
    // Texto principal claro sobre hundido (inputs del onboarding).
    ['claro: texto sobre hundido', THEME_LIGHT.texto, THEME_LIGHT.hundido, 7],
  ];

  it.each(PARES)('%s', (_nombre, fg, bg, minimo) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimo);
  });
});

// ─── 3 · las editoriales del ámbito no cambian entre temas ─────────────────

describe('3 · card editorial del ámbito: oscura en los dos temas, solo el borde', () => {
  const EDITORIALES: [string, string, RegExp][] = [
    // [archivo, velo/gradiente oscuro constante, condición única = borde]
    [
      'src/components/hoy/TareaCard.tsx',
      "['transparent', 'rgba(0,0,0,0.62)']",
      /t\.kind === 'light' && \{ borderWidth: 1, borderColor: t\.bordeEditorial \}/,
    ],
    [
      'src/components/hoy/MomentoBanda.tsx',
      "['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.30)']",
      /t\.kind === 'light' && \{ borderWidth: 1, borderColor: t\.bordeEditorial \}/,
    ],
    [
      'src/components/agenda/AgendaMiniCard.tsx',
      "['#151515', '#0E0E0E']",
      /t\.kind === 'light' && \{ borderColor: t\.bordeEditorial \}/,
    ],
  ];

  it.each(EDITORIALES)('%s: el velo oscuro es constante', (file, velo) => {
    expect(readFileSync(file, 'utf8')).toContain(velo);
  });

  it.each(EDITORIALES)('%s: lo ÚNICO condicionado al tema es el borde', (file, _velo, borde) => {
    const src = readFileSync(file, 'utf8');
    const condiciones = src.match(/kind\s*===\s*'light'/g) ?? [];
    expect(condiciones).toHaveLength(1);
    expect(src).toMatch(borde);
  });
});
