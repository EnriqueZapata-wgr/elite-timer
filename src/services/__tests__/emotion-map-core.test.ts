/**
 * Tests del núcleo puro del mapa 2D de emociones (MB-4 · Bloque 1).
 */
import { describe, it, expect } from 'vitest';
import {
  computeEmotionMapLayout, normX, normY, toWorld, toNorm, colorAtPoint,
  emotionGradient, mixHex, quadrantAtPoint, searchEmotions, QUADRANT_CENTERS,
  WORLD_W, WORLD_H, NODE_SIZE, fnv1a,
  visibleWorldBox, isInWorldBox,
  CENTER_X, CENTER_Y, QUADRANT_SECTORS, REPRESENTATIVE_IDS,
  nodeSizeForIntensity, radiusForIntensity, angleForEmotion, quadrantLandingWorld,
} from '../emotion-map-core';
import { EMOTIONS, type QuadrantKey } from '../../data/emotions-library';

/** Ángulo (grados 0-360, CCW desde +x) de un punto de mundo respecto al centro. */
function worldAngle(wx: number, wy: number): number {
  const a = (Math.atan2(CENTER_Y - wy, wx - CENTER_X) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

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

describe('circumplejo polar (MB-9 · Track A) — layout de las 144', () => {
  const layout = computeEmotionMapLayout(EMOTIONS);
  const byId = new Map(layout.points.map((p) => [p.id, p]));
  const emById = new Map(EMOTIONS.map((e) => [e.id, e]));

  it('coloca las 144 emociones', () => {
    expect(layout.points).toHaveLength(EMOTIONS.length);
    expect(EMOTIONS).toHaveLength(144);
  });

  it('A.3 · es DETERMINISTA: dos corridas → mismo mapa exacto (snapshot vivo)', () => {
    const again = computeEmotionMapLayout(EMOTIONS);
    expect(again).toEqual(layout);
    // Y también con el array fuente en otro orden (no depende del orden del input).
    const shuffled = [...EMOTIONS].reverse();
    expect(computeEmotionMapLayout(shuffled)).toEqual(layout);
  });

  it('A.2 · CERO colisiones: ningún par a distancia < r1+r2 (radios reales)', () => {
    for (let i = 0; i < layout.points.length; i++) {
      for (let j = i + 1; j < layout.points.length; j++) {
        const a = layout.points[i];
        const b = layout.points[j];
        const d = Math.hypot(a.wx - b.wx, a.wy - b.wy);
        // r1 + r2 = (size_a + size_b)/2. El gap se resta como tolerancia.
        expect(d, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual((a.size + b.size) / 2 - 1);
      }
    }
  });

  it('A.2 · monotonía: nadie termina en radio menor que otra de intensidad estrictamente menor', () => {
    for (const a of layout.points) {
      for (const b of layout.points) {
        const ia = emById.get(a.id)!.intensity;
        const ib = emById.get(b.id)!.intensity;
        if (ia < ib) {
          expect(a.radius, `${a.id}(i${ia}) vs ${b.id}(i${ib})`).toBeLessThanOrEqual(b.radius + 1e-6);
        }
      }
    }
  });

  it('A.2 · ningún deslizamiento cruza de cuadrante: el ángulo se queda en su sector', () => {
    for (const p of layout.points) {
      const q = emById.get(p.id)!.quadrant;
      const [lo, hi] = QUADRANT_SECTORS[q];
      const ang = worldAngle(p.wx, p.wy);
      expect(ang, p.id).toBeGreaterThanOrEqual(lo - 0.5);
      expect(ang, p.id).toBeLessThanOrEqual(hi + 0.5);
    }
  });

  it('el diámetro escala con la intensidad (las de adentro son más chicas)', () => {
    expect(nodeSizeForIntensity(1)).toBeLessThan(nodeSizeForIntensity(10));
    for (const p of layout.points) {
      const i = emById.get(p.id)!.intensity;
      expect(p.size).toBeCloseTo(nodeSizeForIntensity(i));
    }
    // radio también monótono con la intensidad (base).
    expect(radiusForIntensity(1)).toBeLessThan(radiusForIntensity(10));
  });

  it('el centro es la CALMA: ninguna burbuja invade el radio interior', () => {
    for (const p of layout.points) {
      expect(p.radius, p.id).toBeGreaterThanOrEqual(radiusForIntensity(1) - 1e-6);
    }
  });

  it('valencia = lado: agradable a la derecha del centro, desagradable a la izquierda', () => {
    for (const p of layout.points) {
      const q = emById.get(p.id)!.quadrant;
      const pleasant = q === 'high_pleasant' || q === 'low_pleasant';
      if (pleasant) expect(p.wx, p.id).toBeGreaterThan(CENTER_X);
      else expect(p.wx, p.id).toBeLessThan(CENTER_X);
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

  it('reporta los solapes de posición base para revisión humana', () => {
    // panicked y enraged comparten (energía 10, intensidad 10, high_unpleasant)
    // → misma posición polar base.
    expect(layout.overlaps.length).toBeGreaterThan(0);
    const panicGroup = layout.overlaps.find((g) => g.ids.includes('panicked'));
    expect(panicGroup?.ids).toContain('enraged');
    for (const g of layout.overlaps) expect(g.ids.length).toBeGreaterThanOrEqual(2);
  });

  it('A.4 · los landmarks (LOD) existen y son un subconjunto propio', () => {
    for (const id of REPRESENTATIVE_IDS) {
      expect(EMOTIONS.some((e) => e.id === id), id).toBe(true);
      expect(byId.get(id)!.representative).toBe(true);
    }
    const reps = layout.points.filter((p) => p.representative);
    expect(reps.length).toBe(REPRESENTATIVE_IDS.size);
    expect(reps.length).toBeLessThan(layout.points.length);
  });

  it('la energía manda la verticalidad dentro del cuadrante', () => {
    // enraged (energy 10) queda más arriba que annoyed (energy 6), ambos hu.
    expect(byId.get('enraged')!.wy).toBeLessThan(byId.get('annoyed')!.wy);
  });

  it('el aterrizaje de cada cuadrante cae en su propio sector', () => {
    for (const q of Object.keys(QUADRANT_SECTORS) as QuadrantKey[]) {
      const { wx, wy } = quadrantLandingWorld(q);
      const [lo, hi] = QUADRANT_SECTORS[q];
      const ang = worldAngle(wx, wy);
      expect(ang, q).toBeGreaterThanOrEqual(lo);
      expect(ang, q).toBeLessThanOrEqual(hi);
    }
  });

  it('angleForEmotion respeta los límites del sector', () => {
    for (const e of EMOTIONS) {
      const [lo, hi] = QUADRANT_SECTORS[e.quadrant];
      const a = angleForEmotion(e.quadrant, e.energy);
      expect(a, e.id).toBeGreaterThanOrEqual(lo);
      expect(a, e.id).toBeLessThanOrEqual(hi);
    }
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

describe('MB-4.1 · Bloque C — culling por viewport (perf del mapa)', () => {
  it('la caja visible corresponde a lo que la cámara muestra en pantalla', () => {
    // Cámara centrada en el origen del mundo, escala 1, viewport 400×800.
    const box = visibleWorldBox(400, 800, 0, 0, 1, 0);
    // Con tx=ty=0, s=1: pantalla (0..400, 0..800) = mundo (0..400, 0..800).
    expect(box.minX).toBeCloseTo(0);
    expect(box.maxX).toBeCloseTo(400);
    expect(box.minY).toBeCloseTo(0);
    expect(box.maxY).toBeCloseTo(800);
  });

  it('el margen expande la caja en px de mundo por los cuatro lados', () => {
    const box = visibleWorldBox(400, 800, 0, 0, 1, 50);
    expect(box.minX).toBeCloseTo(-50);
    expect(box.maxX).toBeCloseTo(450);
    expect(box.maxY).toBeCloseTo(850);
  });

  it('al alejar (scale pequeña) la caja abarca TODO el mundo → nada se cullea', () => {
    // fitScale aproximado para ver el mundo entero en un viewport chico.
    const s = Math.min(400 / WORLD_W, 800 / WORLD_H);
    const box = visibleWorldBox(400, 800, 0, 0, s);
    // Las 144 posiciones caen dentro de la caja (vista alejada = render de todo, plano).
    const layout = computeEmotionMapLayout(EMOTIONS);
    for (const p of layout.points) {
      expect(isInWorldBox(p.wx, p.wy, box), p.id).toBe(true);
    }
  });

  it('al acercar (ZOOM_LANDING) se cullea la mayoría: menos gradientes vivos', () => {
    // Cámara centrada en un cuadrante a zoom de aterrizaje.
    const s = 0.8;
    const c = QUADRANT_CENTERS.high_unpleasant;
    const { wx, wy } = toWorld(c.nx, c.ny);
    const tx = 200 - wx * s; // viewport.w/2 - wx*s
    const ty = 400 - wy * s;
    const box = visibleWorldBox(400, 800, tx, ty, s);
    const layout = computeEmotionMapLayout(EMOTIONS);
    const visibles = layout.points.filter((p) => isInWorldBox(p.wx, p.wy, box));
    expect(visibles.length).toBeGreaterThan(0);
    expect(visibles.length).toBeLessThan(layout.points.length); // NO son las 144
  });

  it('isInWorldBox respeta los bordes (incluye el margen, excluye lo lejano)', () => {
    const box = visibleWorldBox(400, 800, 0, 0, 1, NODE_SIZE * 3);
    expect(isInWorldBox(200, 400, box)).toBe(true);   // centro
    expect(isInWorldBox(-1000, 400, box)).toBe(false); // muy a la izquierda
    expect(isInWorldBox(200, 5000, box)).toBe(false);  // muy abajo
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
