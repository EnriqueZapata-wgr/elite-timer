/**
 * MB-31A · Pieza 5 — el candado de los tokens de tema.
 *
 *   1 · Cada token existe en los DOS temas (falta uno y truena).
 *   2 · El contraste de los pares del manual se CALCULA (WCAG real) y
 *       truena si alguno baja de su nivel — protege también los cambios
 *       futuros, no solo los valores de hoy.
 *   4 · Los colores de sección NO se tematizan: son los diez del manual,
 *       exactos, sin variante por tema.
 *  10 · La card editorial no cambia entre temas salvo su borde (candado
 *       espejo sobre el fuente, mismo patrón que el espejo Kotlin).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  THEME_DARK, THEME_LIGHT, ATP_BRAND, OSCURO, RAMPAS_OSCURAS, ELEVATION, BG, SURFACES, PILL,
} from '@/src/constants/brand';
import { ACERO_OSCURO } from '@/src/constants/flags';
import { SECCION_COLORS, textoSobreSeccion } from '@/src/constants/concept-colors';
import { contrastRatio, relativeLuminance } from '@/src/utils/contrast';

describe('1 · paridad de tokens', () => {
  it('los dos temas tienen EXACTAMENTE las mismas llaves', () => {
    expect(Object.keys(THEME_LIGHT).sort()).toEqual(Object.keys(THEME_DARK).sort());
  });

  it('ningún token viene vacío', () => {
    for (const t of [THEME_DARK, THEME_LIGHT]) {
      for (const [k, v] of Object.entries(t)) {
        expect(typeof v === 'string' && v.length > 0, `${t.kind}.${k}`).toBe(true);
      }
    }
  });
});

describe('2 · los contrastes del manual, calculados', () => {
  // [nombre, fg, bg, mínimo] — los pares del cap. 3.6 con su nivel.
  const PARES: [string, string, string, number][] = [
    ['claro: texto / card (AAA)', THEME_LIGHT.texto, THEME_LIGHT.card, 7],
    ['claro: texto / fondo', THEME_LIGHT.texto, THEME_LIGHT.fondo, 7],
    ['claro: texto / hundido', THEME_LIGHT.texto, THEME_LIGHT.hundido, 7],
    ['claro: texto / flotante', THEME_LIGHT.texto, THEME_LIGHT.flotante, 7],
    ['claro: secundario / card (AA)', THEME_LIGHT.textoSecundario, THEME_LIGHT.card, 4.5],
    ['claro: secundario / fondo (AA)', THEME_LIGHT.textoSecundario, THEME_LIGHT.fondo, 4.5],
    ['claro: tenue / card (solo texto grande)', THEME_LIGHT.textoTenue, THEME_LIGHT.card, 3],
    ['claro: negro / lima (AAA)', THEME_LIGHT.textoSobreLima, ATP_BRAND.lime, 7],
    ['claro: teal calibrado / card (AA)', THEME_LIGHT.tealTexto, THEME_LIGHT.card, 4.5],
    ['claro: teal calibrado / fondo (AA)', THEME_LIGHT.tealTexto, THEME_LIGHT.fondo, 4.5],
    ['claro: error / card (AA)', THEME_LIGHT.error, THEME_LIGHT.card, 4.5],
    ['claro: info / card (AA)', THEME_LIGHT.info, THEME_LIGHT.card, 4.5],
    ['oscuro: texto / card (AAA)', THEME_DARK.texto, THEME_DARK.card, 7],
    ['oscuro: texto / fondo (AAA)', THEME_DARK.texto, THEME_DARK.fondo, 7],
    ['oscuro: secundario / card (AA)', THEME_DARK.textoSecundario, THEME_DARK.card, 4.5],
    ['oscuro: negro / lima (AAA)', THEME_DARK.textoSobreLima, ATP_BRAND.lime, 7],
    ['oscuro: teal / card (AA)', THEME_DARK.tealTexto, THEME_DARK.card, 4.5],
    ['oscuro: error / card (AA)', THEME_DARK.error, THEME_DARK.card, 4.5],
  ];

  it.each(PARES)('%s', (_nombre, fg, bg, minimo) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimo);
  });

  it('los números del manual siguen siendo los del manual (±0.05)', () => {
    expect(contrastRatio(THEME_LIGHT.texto, THEME_LIGHT.card)).toBeCloseTo(15.75, 1);
    expect(contrastRatio(THEME_LIGHT.textoSecundario, THEME_LIGHT.card)).toBeCloseTo(6.54, 1);
    expect(contrastRatio(THEME_LIGHT.textoTenue, THEME_LIGHT.card)).toBeCloseTo(3.19, 1);
    expect(contrastRatio(THEME_LIGHT.textoSobreLima, ATP_BRAND.lime)).toBeCloseTo(13.36, 1);
    expect(contrastRatio(THEME_LIGHT.tealTexto, THEME_LIGHT.card)).toBeCloseTo(5.56, 1);
    expect(contrastRatio(THEME_LIGHT.tealTexto, THEME_LIGHT.fondo)).toBeCloseTo(4.96, 1);
    expect(contrastRatio('#FFFFFF', SECCION_COLORS.ayuno)).toBeCloseTo(6.42, 1);
  });
});

// ─── ACERO (22-ago-2026) · el candado de la rampa oscura ──────────────────
//
// El candado viejo decía que el lienzo de quien no elige tema era #000000
// para siempre. El dueño cambió esa decisión: el negro puro se lee demasiado
// profundo. Aquí se REAPUNTA al valor nuevo, y de paso se refuerza, porque lo
// que de verdad hay que proteger no es un hex: es que la escalera de
// elevación no se invierta. Ese es el modo de falla que un cambio de lienzo
// introduce y que ningún test cubría.

describe('ACERO 1 · la escalera de elevación no se invierte NUNCA', () => {
  // Se prueban LAS DOS rampas, no solo la vigente: apagar la bandera tampoco
  // puede dejar una escalera rota.
  it.each(RAMPAS_OSCURAS.map((r, i) => [i === 0 ? 'negro' : 'acero', r] as const))(
    'rampa %s: fondo < chrome < card < flotante < popover',
    (_nombre, r) => {
      const escalones = [r.fondo, r.chrome, r.card, r.flotante, r.popover];
      const lums = escalones.map((c) => relativeLuminance(c));
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i], `el escalón ${i} no es más claro que el ${i - 1}`).toBeGreaterThan(lums[i - 1]);
      }
    },
  );

  it.each(RAMPAS_OSCURAS.map((r, i) => [i === 0 ? 'negro' : 'acero', r] as const))(
    'rampa %s: el campo se HUNDE respecto a la card (es su único trabajo)',
    (_nombre, r) => {
      expect(relativeLuminance(r.campo)).toBeLessThan(relativeLuminance(r.card));
    },
  );

  it.each(RAMPAS_OSCURAS.map((r, i) => [i === 0 ? 'negro' : 'acero', r] as const))(
    'rampa %s: cada borde se despega de la superficie que contornea',
    (_nombre, r) => {
      const pares: [string, string, string][] = [
        ['borde de card', r.bordeCard, r.card],
        ['borde de campo', r.bordeCampo, r.campo],
        ['borde de píldora', r.bordePildora, r.chrome],
        ['borde marcado', r.bordeMarcado, r.flotante],
        ['borde de popover', r.bordePopover, r.popover],
      ];
      for (const [nombre, borde, superficie] of pares) {
        // Y además el borde tiene que ser MÁS CLARO, no solo distinto: un
        // borde más oscuro que su superficie lee como sombra, no como filo.
        expect(relativeLuminance(borde), `${nombre} no es más claro que su superficie`)
          .toBeGreaterThan(relativeLuminance(superficie));
        expect(contrastRatio(borde, superficie), `${nombre} desaparece`).toBeGreaterThan(1.04);
      }
    },
  );
});

describe('ACERO 2 · un solo lugar decide el color del oscuro', () => {
  it('la rampa vigente es la que dice la bandera', () => {
    expect(OSCURO.fondo).toBe(ACERO_OSCURO ? '#0F1114' : '#000000');
    expect(OSCURO.card).toBe(ACERO_OSCURO ? '#1A1D22' : '#121212');
    expect(OSCURO.campo).toBe(ACERO_OSCURO ? '#0A0C0F' : '#0a0a0a');
  });

  it('los tokens de superficie SALEN de la rampa, no de un hex suelto', () => {
    // Si alguien vuelve a escribir un gris a mano en brand.ts, esto truena.
    expect(THEME_DARK.fondo).toBe(OSCURO.fondo);
    expect(THEME_DARK.card).toBe(OSCURO.card);
    expect(THEME_DARK.hundido).toBe(OSCURO.campo);
    expect(THEME_DARK.flotante).toBe(OSCURO.flotante);
    expect(THEME_DARK.borde).toBe(OSCURO.bordeCard);
    expect(THEME_DARK.bordeMarcado).toBe(OSCURO.bordeMarcado);
    expect(BG.screen).toBe(OSCURO.fondo);
    expect(BG.card).toBe(OSCURO.card);
    expect(BG.input).toBe(OSCURO.campo);
    expect(ELEVATION[0].bg).toBe(OSCURO.fondo);
    expect(ELEVATION[1].bg).toBe(OSCURO.card);
    expect(ELEVATION[2].bg).toBe(OSCURO.flotante);
    expect(ELEVATION[3].bg).toBe(OSCURO.popover);
  });

  it('el chrome vive SOBRE el lienzo, así que no puede ser el campo', () => {
    // El bug que este desacople evita: tab bar y píldoras de filtro se
    // pintaban con el mismo valor que un campo hundido. Con el lienzo en
    // negro puro daba igual; con el lienzo en acero quedaban por DEBAJO del
    // fondo sobre el que flotan.
    expect(SURFACES.base).toBe(OSCURO.chrome);
    expect(PILL.bg).toBe(OSCURO.chrome);
    expect(relativeLuminance(OSCURO.chrome)).toBeGreaterThan(relativeLuminance(OSCURO.fondo));
  });
});

describe('ACERO 3 · los números del oscuro, calculados', () => {
  it('el texto sobre el lienzo y sobre la card sigue muy por encima de AAA', () => {
    expect(contrastRatio(THEME_DARK.texto, THEME_DARK.fondo)).toBeGreaterThanOrEqual(18);
    expect(contrastRatio(THEME_DARK.texto, THEME_DARK.card)).toBeGreaterThanOrEqual(16);
  });

  it('los del manual cap. 4, medidos el 22-ago-2026 (±0.05)', () => {
    if (!ACERO_OSCURO) return; // con la bandera apagada rigen los de siempre
    expect(contrastRatio(THEME_DARK.texto, THEME_DARK.fondo)).toBeCloseTo(18.91, 1);
    expect(contrastRatio(THEME_DARK.texto, THEME_DARK.card)).toBeCloseTo(16.90, 1);
    expect(contrastRatio(THEME_DARK.textoSecundario, THEME_DARK.card)).toBeCloseTo(4.77, 1);
    expect(contrastRatio(ATP_BRAND.lime, THEME_DARK.fondo)).toBeCloseTo(12.03, 1);
  });
});

describe('4 · los colores de sección no se tematizan', () => {
  it('son los DIEZ del manual 3.3, exactos, únicos para los dos temas', () => {
    expect(SECCION_COLORS).toEqual({
      fitness: '#A8E02A',
      nutricion: '#5B9BD5',
      agua: '#60A5FA',
      ayuno: '#6B46C1',
      sol: '#FBBF24',
      mente: '#7F77DD',
      sueno: '#818CF8',
      cardio: '#E74C3C',
      suplementos: '#EF9F27',
      ciclo: '#D4537E',
    });
  });

  it('textoSobreSeccion no recibe tema: la firma es (seccion) y nada más', () => {
    // El candado estructural: la decisión de texto-sobre-relleno no puede
    // bifurcarse por tema porque la función ni siquiera conoce el tema.
    expect(textoSobreSeccion.length).toBe(1);
  });
});

describe('10 · la card editorial no cambia entre temas (salvo su borde)', () => {
  const SRC = readFileSync('src/components/hoy/EditorialCard.tsx', 'utf8');

  it('el velo del texto sigue siendo el degradado negro de siempre', () => {
    expect(SRC).toContain("['transparent', 'rgba(0,0,0,0.55)']");
  });

  it('el texto encima sigue anclado al blanco del oscuro (TEXT.primary), no al tema', () => {
    expect(SRC).toContain('color: TEXT.primary');
  });

  it('lo ÚNICO condicionado al tema es el borde', () => {
    const condicionales = SRC.match(/t\.kind\s*===\s*'light'/g) ?? [];
    expect(condicionales).toHaveLength(1);
    // ...y esa única condición habla del borde editorial.
    expect(SRC).toMatch(/t\.kind === 'light'\s*\n?\s*\?\s*\{\s*borderWidth: 1, borderColor: t\.bordeEditorial\s*\}/);
  });

  it('los tokens de borde editorial sí difieren (en claro se despega del acero)', () => {
    expect(THEME_DARK.bordeEditorial).toBe('transparent');
    expect(THEME_LIGHT.bordeEditorial).toBe(THEME_LIGHT.borde);
  });
});
