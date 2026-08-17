/**
 * El logo montado no diverge del asset.
 *
 * Mismo candado que el censo de iconos aplica al set SVG, aplicado a la marca:
 * `assets/images/Logo-vertical_ATP_*.svg` es la FUENTE DE VERDAD y
 * `logo-atp-geometria.ts` su copia montable. Si el asset cambia y la copia no,
 * esto truena y alguien regenera. Sin esto, la app dibujaría una marca que ya
 * no es la marca, y nadie se enteraría hasta ver un pantallazo.
 *
 * También sella las dos decisiones que se tomaron al montarlo:
 *  · los dos archivos son el MISMO dibujo salvo el fill de `.cls-1` (el
 *    logotipo "ATP"), que es justo lo que aquí entra por parámetro;
 *  · la firma vectorizada NO se monta (DESIGN_SYSTEM.md: es la bajada de otra
 *    época, "usar el ícono sin firma" hasta resolverlo con la autora del
 *    manual). Si alguien la agrega, el conteo de paths truena y tiene que venir
 *    a explicar por qué.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LOGO_ATP_ANILLO_TRAZO,
  LOGO_ATP_GRADIENTES,
  LOGO_ATP_LETRAS,
  LOGO_ATP_LOGOTIPO,
  LOGO_ATP_LOGOTIPO_TRANSFORM,
  LOGO_ATP_MOLECULA,
  LOGO_ATP_RATIO,
  LOGO_ATP_TE,
  LOGO_ATP_VIEWBOX,
} from '../logo-atp-geometria';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const asset = (v: 'N' | 'B') =>
  readFileSync(join(ROOT, 'assets', 'images', `Logo-vertical_ATP_1024x1024_${v}.svg`), 'utf8');

const N = asset('N');
const B = asset('B');

describe('los dos assets son el mismo dibujo salvo el logotipo', () => {
  it('solo difieren en la regla .cls-1 del bloque <style>', () => {
    // Si esto falla, el logo claro y el oscuro dejaron de ser el mismo arte y
    // montar UNA geometría con el color por parámetro ya no sería correcto.
    expect(N.replace('.cls-1{fill:#1d1d1b;}', 'X')).toBe(B.replace('.cls-1{fill:#fff;}', 'X'));
  });

  it('los colores del logotipo salen de esas dos reglas, no de un ojo', () => {
    expect(N).toContain(`.cls-1{fill:${LOGO_ATP_LOGOTIPO.claro};}`);
    // El asset abrevia el blanco; el montaje lo escribe completo.
    expect(B).toContain('.cls-1{fill:#fff;}');
    expect(LOGO_ATP_LOGOTIPO.oscuro).toBe('#ffffff');
  });
});

describe('el logotipo ATP se monta 1:1', () => {
  it('las tres letras existen verbatim en el asset', () => {
    for (const d of [...LOGO_ATP_LETRAS, LOGO_ATP_TE]) {
      expect(N, 'un path del logotipo diverge del asset').toContain(`d="${d}"`);
    }
  });

  it('la A y la P son .cls-1 (color del tema) y la T es el degradado', () => {
    for (const d of LOGO_ATP_LETRAS) {
      expect(N).toContain(`<path class="cls-1" d="${d}"`);
    }
    expect(N).toContain(`<path class="cls-2" d="${LOGO_ATP_TE}"`);
  });

  it('el transform es el del asset', () => {
    expect(N).toContain(`transform="${LOGO_ATP_LOGOTIPO_TRANSFORM}"`);
  });
});

describe('la firma vectorizada NO se monta', () => {
  it('el asset trae 24 paths y el montaje solo los 3 del logotipo', () => {
    // Los otros 21 son las letras de "ACTIVA TU ENERGÍA Y SALUD" (medido:
    // y 847..885, debajo del logotipo). Quedan fuera a propósito.
    const paths = N.match(/<path\b/g) ?? [];
    expect(paths.length).toBe(24);
    expect([...LOGO_ATP_LETRAS, LOGO_ATP_TE].length).toBe(3);
  });

  it('el viewBox recorta la firma', () => {
    // El asset mide 885.71 de alto; el montaje corta en 785, que es donde
    // termina el logotipo. Si alguien vuelve a abrirlo hasta 885, la firma
    // reaparece sola.
    expect(N).toContain('viewBox="0 0 912.5 885.71"');
    expect(LOGO_ATP_VIEWBOX).toBe('116 0 665 785');
    expect(Math.abs(LOGO_ATP_RATIO - 785 / 665) < 1e-9).toBe(true);
  });
});

describe('la molécula se monta 1:1', () => {
  it('los 13 elementos existen verbatim en el asset', () => {
    expect(LOGO_ATP_MOLECULA.length).toBe(13);
    for (const e of LOGO_ATP_MOLECULA) {
      if (e.tipo === 'rect') {
        expect(N, `rect ${e.x},${e.y} diverge`).toContain(
          `x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" transform="${e.transform}"`,
        );
      } else if (e.tipo === 'circulo') {
        expect(N, `circle ${e.cx},${e.cy} diverge`).toContain(`cx="${e.cx}" cy="${e.cy}" r="${e.r}"`);
      } else {
        expect(N, `ellipse ${e.cx},${e.cy} diverge`).toContain(
          `cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"`,
        );
      }
    }
  });

  it('los rellenos planos salen del asset', () => {
    const planos = LOGO_ATP_MOLECULA.flatMap((e) =>
      'fill' in e && !e.fill.startsWith('url(') ? [e.fill] : [],
    );
    // Ocho nodos de color plano; los otros tres llevan degradado.
    expect(planos.length).toBe(8);
    for (const c of planos) expect(N, `${c} no está en el asset`).toContain(`fill:${c};`);
    expect(N).toContain(`stroke:${LOGO_ATP_ANILLO_TRAZO};`);
  });

  it('los cuatro degradados y todos sus stops salen del asset', () => {
    expect(LOGO_ATP_GRADIENTES.length).toBe(4);
    for (const g of LOGO_ATP_GRADIENTES) {
      expect(N).toContain(`x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"`);
      if ('gradientTransform' in g) expect(N).toContain(`gradientTransform="${g.gradientTransform}"`);
      for (const s of g.stops) {
        expect(N, `stop ${s.offset}/${s.color} diverge`).toContain(
          `<stop offset="${s.offset}" stop-color="${s.color}"/>`,
        );
      }
    }
  });
});
