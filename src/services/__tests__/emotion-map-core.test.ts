/**
 * Tests del núcleo puro del mapa 2D de emociones (MB-4 · Bloque 1).
 */
import { describe, it, expect } from 'vitest';
import {
  computeEmotionMapLayout, normX, normY, toWorld, toNorm, colorAtPoint,
  emotionGradient, mixHex, quadrantAtPoint, searchEmotions, QUADRANT_CENTERS,
  MIN_SEP, WORLD_W, WORLD_H, fnv1a,
} from '../emotion-map-core';
import { EMOTIONS } from '../../data/emotions-library';

describe('coordenadas del spec', () => {
  it('y = (energy - 5.5) / 4.5', () => {
    expect(normY(10)).toBeCloseTo(1);
    expect(normY(1)).toBeCloseTo(-1);
    expect(normY(5.5)).toBeCloseTo(0);
  });

  it('x lleva signo del cuadrante y magnitud de la intensidad', () => {
    expect(normX('high_pleasant', 10)).toBeCloseTo(1);
    expect(normX('low_pleasant', 5)).toBeCloseTo(0.5);
    expect(normX('high_unpleasant', 10)).toBeCloseTo(-1);
    expect(normX('low_unpleasant', 3)).toBeCloseTo(-0.3);
  });

  it('toWorld/toNorm son inversas', () => {
    const { wx, wy } = toWorld(0.4, -0.7);
    const { nx, ny } = toNorm(wx, wy);
    expect(nx).toBeCloseTo(0.4);
    expect(ny).toBeCloseTo(-0.7);
  });
});

describe('layout del mapa completo (144 emociones)', () => {
  const layout = computeEmotionMapLayout(EMOTIONS);

  it('coloca las 144 emociones', () => {
    expect(layout.points).toHaveLength(EMOTIONS.length);
    expect(EMOTIONS).toHaveLength(144);
  });

  it('es DETERMINISTA: dos corridas → mismo mapa exacto', () => {
    const again = computeEmotionMapLayout(EMOTIONS);
    expect(again).toEqual(layout);
    // Y también con el array fuente en otro orden (no depende del orden del input).
    const shuffled = [...EMOTIONS].reverse();
    expect(computeEmotionMapLayout(shuffled)).toEqual(layout);
  });

  it('ninguna emoción queda escondida: separación mínima entre todos los pares', () => {
    for (let i = 0; i < layout.points.length; i++) {
      for (let j = i + 1; j < layout.points.length; j++) {
        const a = layout.points[i];
        const b = layout.points[j];
        const d = Math.hypot(a.wx - b.wx, a.wy - b.wy);
        expect(d, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(MIN_SEP - 1);
      }
    }
  });

  it('el offset anticolisión NUNCA cambia una emoción de lado (agradable/desagradable)', () => {
    for (const p of layout.points) {
      const emotion = EMOTIONS.find((e) => e.id === p.id)!;
      const pleasant = emotion.quadrant === 'high_pleasant' || emotion.quadrant === 'low_pleasant';
      if (pleasant) expect(p.wx, p.id).toBeGreaterThan(WORLD_W / 2);
      else expect(p.wx, p.id).toBeLessThan(WORLD_W / 2);
    }
  });

  it('todos los puntos quedan dentro del mundo', () => {
    for (const p of layout.points) {
      expect(p.wx).toBeGreaterThanOrEqual(0);
      expect(p.wx).toBeLessThanOrEqual(WORLD_W);
      expect(p.wy).toBeGreaterThanOrEqual(0);
      expect(p.wy).toBeLessThanOrEqual(WORLD_H);
    }
  });

  it('reporta los solapes exactos para revisión humana', () => {
    // Sabemos que hay emociones con misma (energía, intensidad, cuadrante):
    // p. ej. panicked y enraged (10,10 high_unpleasant).
    expect(layout.overlaps.length).toBeGreaterThan(0);
    const panicGroup = layout.overlaps.find((g) => g.ids.includes('panicked'));
    expect(panicGroup?.ids).toContain('enraged');
    // Todo grupo reportado tiene 2+ miembros.
    for (const g of layout.overlaps) expect(g.ids.length).toBeGreaterThanOrEqual(2);
  });

  it('la energía manda en el orden vertical (a grandes rasgos)', () => {
    const byId = new Map(layout.points.map((p) => [p.id, p]));
    // enraged (energy 10) queda claramente más arriba que annoyed (energy 6).
    expect(byId.get('enraged')!.wy).toBeLessThan(byId.get('annoyed')!.wy);
    // quiet (energy 1) queda abajo de restored (energy 5).
    expect(byId.get('quiet')!.wy).toBeGreaterThan(byId.get('restored')!.wy);
  });
});

describe('color continuo del plano', () => {
  it('mixHex interpola en RGB', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#00ff00', 0)).toBe('#ff0000');
    expect(mixHex('#ff0000', '#00ff00', 1)).toBe('#00ff00');
  });

  it('las esquinas del plano caen en la familia de color decidida', () => {
    // Alta·agradable → lima (verde-amarillo: G domina).
    const [rHP, gHP] = hex3(colorAtPoint(1, 1));
    expect(gHP).toBeGreaterThan(rHP * 0.8);
    // Alta·desagradable → coral (R domina).
    const [rHU, gHU, bHU] = hex3(colorAtPoint(-1, 1));
    expect(rHU).toBeGreaterThan(gHU);
    expect(rHU).toBeGreaterThan(bHU);
    // Baja·agradable → teal (G y B arriba de R).
    const [rLP, gLP, bLP] = hex3(colorAtPoint(1, -1));
    expect(gLP).toBeGreaterThan(rLP);
    expect(bLP).toBeGreaterThan(rLP);
    // Baja·desagradable → violeta (B domina sobre G).
    const [rLU, gLU, bLU] = hex3(colorAtPoint(-1, -1));
    expect(bLU).toBeGreaterThan(gLU);
    expect(bLU).toBeGreaterThan(rLU * 0.7);
  });

  it('es continuo: puntos vecinos tienen colores vecinos', () => {
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const x1 = -1 + (2 * i) / steps;
      const x2 = -1 + (2 * (i + 1)) / steps;
      const d = rgbDist(colorAtPoint(x1, 0.3), colorAtPoint(x2, 0.3));
      expect(d).toBeLessThan(60); // sin saltos bruscos
    }
  });

  it('emotionGradient devuelve dos colores distintos (degradado local real)', () => {
    const [top, bottom] = emotionGradient(0.5, 0.2);
    expect(top).not.toBe(bottom);
  });
});

describe('utilidades', () => {
  it('quadrantAtPoint mapea los 4 cuadrantes', () => {
    expect(quadrantAtPoint(0.5, 0.5)).toBe('high_pleasant');
    expect(quadrantAtPoint(-0.5, 0.5)).toBe('high_unpleasant');
    expect(quadrantAtPoint(0.5, -0.5)).toBe('low_pleasant');
    expect(quadrantAtPoint(-0.5, -0.5)).toBe('low_unpleasant');
  });

  it('QUADRANT_CENTERS caen dentro de su cuadrante', () => {
    for (const [q, c] of Object.entries(QUADRANT_CENTERS)) {
      expect(quadrantAtPoint(c.nx, c.ny)).toBe(q);
    }
  });

  it('buscador: acentos y mayúsculas no importan; label pesa más que descripción', () => {
    const porAnsia = searchEmotions(EMOTIONS, 'ANSIEDAD');
    expect(porAnsia[0]?.id).toBe('anxious');
    const conAcento = searchEmotions(EMOTIONS, 'ánimo');
    expect(conAcento.length).toBeGreaterThan(0);
    expect(searchEmotions(EMOTIONS, 'x')).toHaveLength(0); // < 2 chars
  });

  it('fnv1a es estable', () => {
    expect(fnv1a('furia')).toBe(fnv1a('furia'));
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });
});

function hex3(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbDist(a: string, b: string): number {
  const [r1, g1, b1] = hex3(a);
  const [r2, g2, b2] = hex3(b);
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}
