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
import { THEME_DARK, THEME_LIGHT, ATP_BRAND } from '@/src/constants/brand';
import { SECCION_COLORS, textoSobreSeccion } from '@/src/constants/concept-colors';
import { contrastRatio } from '@/src/utils/contrast';

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
