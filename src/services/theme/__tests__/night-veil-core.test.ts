/**
 * MB-31A · Pieza 5 — el velo nocturno in-app.
 *
 *   8 · El filtro es INDEPENDIENTE del tema: encendido sobre claro, el
 *       resultado sigue siendo claro entibiado — no oscuro.
 *   9 · El filtro no rompe AA en NINGÚN punto de su curva (se muestrea
 *       minuto a minuto, del arranque del ámbar al fin de la ventana).
 *
 * Extra: la curva del velo es LA curva única (night-curve), la misma que
 * serializa el filtro de sistema y de la que cuelga la paleta del buró.
 */
import { describe, it, expect } from 'vitest';
import { THEME_DARK, THEME_LIGHT } from '@/src/constants/brand';
import {
  NIGHT_FILTER_RAMP,
  NIGHT_FILTER_END_MINUTES,
  NIGHT_FILTER_FALLBACK_CUTOFF,
  NIGHT,
} from '@/src/constants/night-curve';
import {
  NIGHT_FILTER_RAMP as RAMP_DEL_SISTEMA,
} from '@/src/services/night-filter-core';
import { NIGHT as NIGHT_DEL_BURO } from '@/src/services/sleep/night-palette';
import {
  veilColorAt,
  veilPassesAA,
  clampVeilForTheme,
  parejasProtegidas,
} from '@/src/services/theme/night-veil-core';
import { compositeOver, contrastRatio, hexToRgb, relativeLuminance } from '@/src/utils/contrast';

const CUTOFF = NIGHT_FILTER_FALLBACK_CUTOFF; // 21:45

/** Todos los minutos de la ventana activa, envueltos al día siguiente. */
function minutosDeLaVentana(): number[] {
  const out: number[] = [];
  for (let rel = NIGHT_FILTER_RAMP[0].at; ; rel++) {
    const abs = (((CUTOFF + rel) % 1440) + 1440) % 1440;
    out.push(abs);
    if (abs === NIGHT_FILTER_END_MINUTES) break; // 05:00, fin de ventana
  }
  return out;
}

describe('la curva es UNA (manual 3.7: una sola curva, tres usos)', () => {
  it('el filtro de sistema re-exporta exactamente la rampa de night-curve', () => {
    expect(RAMP_DEL_SISTEMA).toBe(NIGHT_FILTER_RAMP);
  });

  it('la paleta del buró re-exporta exactamente el NIGHT de night-curve', () => {
    expect(NIGHT_DEL_BURO).toBe(NIGHT);
  });
});

describe('8 · el velo es independiente del tema', () => {
  it('a plena noche, el claro entibiado SIGUE siendo claro (no lo fuerza a oscuro)', () => {
    const velo = veilColorAt(2 * 60, CUTOFF, THEME_LIGHT); // 02:00, rojo pleno
    expect(velo).not.toBeNull();
    const cardVelada = compositeOver(velo!, hexToRgb(THEME_LIGHT.card));
    const cardOscura = relativeLuminance(THEME_DARK.card);
    // La card clara con velo conserva una luminancia de tema claro:
    // muy por encima de cualquier superficie del oscuro.
    expect(relativeLuminance(cardVelada)).toBeGreaterThan(0.35);
    expect(relativeLuminance(cardVelada)).toBeGreaterThan(cardOscura * 10);
  });

  it('el mismo velo actúa sobre el oscuro sin volverlo claro', () => {
    const velo = veilColorAt(2 * 60, CUTOFF, THEME_DARK);
    expect(velo).not.toBeNull();
    const cardVelada = compositeOver(velo!, hexToRgb(THEME_DARK.card));
    expect(relativeLuminance(cardVelada)).toBeLessThan(0.2);
  });

  it('fuera de la ventana no hay velo, en ningún tema', () => {
    expect(veilColorAt(14 * 60, CUTOFF, THEME_LIGHT)).toBeNull();
    expect(veilColorAt(14 * 60, CUTOFF, THEME_DARK)).toBeNull();
  });

  it('el tono del velo es el de la curva (cálido), no un gris que apague', () => {
    const velo = veilColorAt(CUTOFF, CUTOFF, THEME_LIGHT)!;
    expect(velo.r).toBeGreaterThan(velo.g);
    expect(velo.g).toBeGreaterThan(velo.b);
  });
});

describe('9 · el velo no rompe AA en ningún punto de la curva', () => {
  const minutos = minutosDeLaVentana();

  it.each([['claro', THEME_LIGHT] as const, ['oscuro', THEME_DARK] as const])(
    'tema %s: todos los pares protegidos pasan, minuto a minuto',
    (_nombre, tema) => {
      for (const m of minutos) {
        const velo = veilColorAt(m, CUTOFF, tema);
        if (!velo) continue;
        for (const { fg, bg, min } of parejasProtegidas(tema)) {
          const ratio = contrastRatio(
            compositeOver(velo, hexToRgb(fg)),
            compositeOver(velo, hexToRgb(bg)),
          );
          expect(ratio, `minuto ${m}, ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(min);
        }
      }
    },
  );

  it('el clamp de verdad recorta: el rojo pleno crudo ROMPE AA y el velado no', () => {
    const rojoCrudo = { r: 255, g: 60, b: 0, a: 0.34 };
    // Crudo, el rojo del final de la rampa rompe el secundario en ambos temas…
    expect(veilPassesAA(rojoCrudo, THEME_LIGHT)).toBe(false);
    expect(veilPassesAA(rojoCrudo, THEME_DARK)).toBe(false);
    // …y el clamp devuelve el MISMO tono con alpha menor que sí pasa.
    for (const tema of [THEME_LIGHT, THEME_DARK]) {
      const velado = clampVeilForTheme(rojoCrudo, tema);
      expect(velado.r).toBe(rojoCrudo.r);
      expect(velado.g).toBe(rojoCrudo.g);
      expect(velado.b).toBe(rojoCrudo.b);
      expect(velado.a).toBeLessThan(rojoCrudo.a);
      expect(velado.a).toBeGreaterThan(0.05); // se limita, no se apaga
      expect(veilPassesAA(velado, tema)).toBe(true);
    }
  });

  it('el ámbar suave del arranque pasa entero en oscuro; en claro se recorta apenas', () => {
    const ambar = { r: 255, g: 191, b: 0, a: 0.1 };
    // Oscuro: holgura de sobra (secundario 5.29 de base).
    expect(veilPassesAA(ambar, THEME_DARK)).toBe(true);
    // Claro: el tenue (3.19) casi no tiene holgura sobre su piso de 3.0 —
    // el clamp recorta un poco el alpha pero el velo sigue existiendo.
    const velado = clampVeilForTheme(ambar, THEME_LIGHT);
    expect(velado.a).toBeGreaterThan(0.04);
    expect(velado.a).toBeLessThanOrEqual(ambar.a);
    expect(veilPassesAA(velado, THEME_LIGHT)).toBe(true);
  });
});
