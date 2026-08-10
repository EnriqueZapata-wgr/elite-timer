/**
 * MB-31A · Pieza 2 — las tres reglas que el modo claro obliga (manual 3.6).
 *
 * El candado CALCULA el contraste real con la fórmula WCAG (contrast.ts),
 * no compara strings: si alguien recalibra un token y el par baja de su
 * nivel, esto truena aunque el hex "se vea bonito".
 *
 *   1 · El lima NUNCA es texto en claro (1.34: invisible). Es relleno con
 *       negro encima (13.36), barra o indicador.
 *   2 · El teal de marca #1ABC9C tampoco (2.06). Texto de acento en claro
 *       usa la variante calibrada #086A5E (5.56 card / 4.96 fondo).
 *   3 · Nueve de diez secciones llevan texto NEGRO como relleno; la única
 *       excepción es ayuno (#6B46C1) con blanco. Y ninguna sirve de LETRA
 *       sobre claro salvo ayuno.
 */
import { describe, it, expect } from 'vitest';
import { ATP_BRAND, THEME_LIGHT, THEME_DARK } from '@/src/constants/brand';
import { SECCION_COLORS, textoSobreSeccion, type SeccionKey } from '@/src/constants/concept-colors';
import { contrastRatio } from '@/src/utils/contrast';

const AA = 4.5;

describe('Regla 1 — el lima jamás es texto en modo claro', () => {
  it('el lima contra las superficies claras es ilegible (por eso la regla)', () => {
    expect(contrastRatio(ATP_BRAND.lime, THEME_LIGHT.card)).toBeLessThan(1.5); // 1.34
    expect(contrastRatio(ATP_BRAND.lime, THEME_LIGHT.fondo)).toBeLessThan(1.5);
  });

  it('ningún rol de texto del tema claro es el lima', () => {
    const rolesDeTexto = [
      THEME_LIGHT.texto, THEME_LIGHT.textoSecundario, THEME_LIGHT.textoTenue,
      THEME_LIGHT.tealTexto, THEME_LIGHT.error, THEME_LIGHT.info, THEME_LIGHT.sinDatos,
    ];
    for (const c of rolesDeTexto) {
      expect(c.toUpperCase()).not.toBe(ATP_BRAND.lime.toUpperCase());
    }
  });

  it('el lima como RELLENO con negro encima sí funciona (AAA)', () => {
    expect(contrastRatio(THEME_LIGHT.textoSobreLima, ATP_BRAND.lime)).toBeGreaterThan(13); // 13.36
  });
});

describe('Regla 2 — el teal de marca tampoco es texto en claro', () => {
  it('#1ABC9C contra card clara no llega ni a texto grande (2.06)', () => {
    expect(contrastRatio(ATP_BRAND.teal, THEME_LIGHT.card)).toBeLessThan(3);
  });

  it('el acento de texto claro es la variante calibrada, y pasa AA en card y fondo', () => {
    expect(THEME_LIGHT.tealTexto.toUpperCase()).not.toBe(ATP_BRAND.teal.toUpperCase());
    expect(contrastRatio(THEME_LIGHT.tealTexto, THEME_LIGHT.card)).toBeGreaterThanOrEqual(AA);   // 5.56
    expect(contrastRatio(THEME_LIGHT.tealTexto, THEME_LIGHT.fondo)).toBeGreaterThanOrEqual(AA);  // 4.96
  });

  it('en oscuro el teal de marca sigue siendo el acento de texto (no se toca)', () => {
    expect(THEME_DARK.tealTexto.toUpperCase()).toBe(ATP_BRAND.teal.toUpperCase());
  });
});

describe('Regla 3 — el texto encima de un relleno de sección ya está decidido', () => {
  const secciones = Object.keys(SECCION_COLORS) as SeccionKey[];

  it('son las diez del manual', () => {
    expect(secciones).toHaveLength(10);
  });

  it('el texto decidido pasa AA sobre CADA relleno (calculado)', () => {
    for (const s of secciones) {
      const ratio = contrastRatio(textoSobreSeccion(s), SECCION_COLORS[s]);
      expect(ratio, `${s}: ${textoSobreSeccion(s)} sobre ${SECCION_COLORS[s]}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('ayuno es la ÚNICA con blanco encima; el negro no le alcanza', () => {
    const blancas = secciones.filter((s) => textoSobreSeccion(s) === '#FFFFFF');
    expect(blancas).toEqual(['ayuno']);
    // La razón medida: negro sobre ayuno se queda corto (3.27 < 4.5).
    expect(contrastRatio('#000000', SECCION_COLORS.ayuno)).toBeLessThan(AA);
  });

  it('como LETRA sobre claro solo pasa ayuno; las otras nueve fallan AA', () => {
    for (const s of secciones) {
      const comoTexto = contrastRatio(SECCION_COLORS[s], THEME_LIGHT.card);
      if (s === 'ayuno') {
        expect(comoTexto).toBeGreaterThanOrEqual(AA); // 5.49
      } else {
        expect(comoTexto, `${s} como texto sobre card clara`).toBeLessThan(AA);
      }
    }
  });
});
