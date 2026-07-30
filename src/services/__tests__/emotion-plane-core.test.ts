/**
 * MB-15 — el plano 12x12 con zoom.
 *
 * Cubre lo que el device test no puede automatizar:
 *  - las coordenadas de bdb818c son una biyección completa (144 emociones ↔
 *    144 celdas, sin encimarse: el defecto original de la espiral es
 *    imposible por construcción),
 *  - posición y quadrant coinciden en las 144 (el brief lo verificó a mano;
 *    esto lo cementa),
 *  - el COLOR sale de la POSICIÓN: ningún amarillo/verde en la mitad
 *    izquierda, ningún rojo/azul en la derecha (regla 4),
 *  - los clamps de cámara: la escala respeta 0.6-4.5 y el desplazamiento
 *    nunca saca el plano de la pantalla (regla del comportamiento),
 *  - la palabra más larga cabe en una línea de la celda a la tipografía base
 *    (regla 2: cero matemática de fuente en runtime → el tamaño estático
 *    tiene que aguantar la biblioteca completa).
 */
import { describe, it, expect } from 'vitest';
import {
  PLANE_GRID, PLANE_CELL, PLANE_SIZE, PLANE_CELL_GAP, PLANE_CELL_PAD_H,
  PLANE_FONT_SIZE, PLANE_MIN_SCALE, PLANE_MAX_SCALE,
  PLANE_TONE_MIN, PLANE_TONE_MAX,
  cellRect, cellCenter, isPleasantCol, isHighRow, quadrantFromCell,
  planeToneOpacity, planeCellColor, planeFitScale, clampScale, clampAxis,
  cameraFor, quadrantCenter, QUADRANT_ZOOM_FACTOR, FOCUS_ZOOM_FACTOR,
} from '../emotion-plane-core';
import { EMOTIONS, QUADRANTS, type QuadrantKey } from '../../data/emotions-library';

const ALL_QUADRANTS = Object.keys(QUADRANTS) as QuadrantKey[];

describe('las coordenadas de bdb818c — fuente de verdad, biyección completa', () => {
  it('las 144 emociones ocupan 144 celdas únicas dentro del 12x12', () => {
    expect(EMOTIONS).toHaveLength(144);
    const seen = new Set<string>();
    for (const e of EMOTIONS) {
      expect(e.gridCol).toBeGreaterThanOrEqual(1);
      expect(e.gridCol).toBeLessThanOrEqual(PLANE_GRID);
      expect(e.gridRow).toBeGreaterThanOrEqual(1);
      expect(e.gridRow).toBeLessThanOrEqual(PLANE_GRID);
      expect(Number.isInteger(e.gridCol)).toBe(true);
      expect(Number.isInteger(e.gridRow)).toBe(true);
      seen.add(`${e.gridCol},${e.gridRow}`);
    }
    // 144 únicas en un plano de 144 celdas = ninguna vacía, ninguna encimada.
    expect(seen.size).toBe(144);
  });

  it('posición y quadrant coinciden en las 144 (si mañana se mueve una palabra, este test avisa)', () => {
    for (const e of EMOTIONS) {
      expect(quadrantFromCell(e.gridCol, e.gridRow)).toBe(e.quadrant);
    }
  });

  it('las anclas del device test 6 están donde el brief las espera', () => {
    const byId = new Map(EMOTIONS.map((e) => [e.id, e]));
    const hopeless = byId.get('hopeless')!;   // "Sin esperanza" — abajo izquierda
    const ecstatic = byId.get('ecstatic')!;   // "En éxtasis" — arriba derecha
    const calm = byId.get('calm')!;           // "En calma" — abajo derecha
    const panicked = byId.get('panicked')!;   // "En pánico" — arriba izquierda
    expect(isPleasantCol(hopeless.gridCol)).toBe(false);
    expect(isHighRow(hopeless.gridRow)).toBe(false);
    expect(isPleasantCol(ecstatic.gridCol)).toBe(true);
    expect(isHighRow(ecstatic.gridRow)).toBe(true);
    expect(isPleasantCol(calm.gridCol)).toBe(true);
    expect(isHighRow(calm.gridRow)).toBe(false);
    expect(isPleasantCol(panicked.gridCol)).toBe(false);
    expect(isHighRow(panicked.gridRow)).toBe(true);
  });
});

describe('regla 4 — el color sale de la POSICIÓN, no de la emoción', () => {
  const family = (col: number, row: number) => QUADRANTS[quadrantFromCell(col, row)].color;

  it('el hex base de cada celda es el de su cuadrante posicional', () => {
    for (const e of EMOTIONS) {
      expect(planeCellColor(e.gridCol, e.gridRow).startsWith(family(e.gridCol, e.gridRow))).toBe(true);
    }
  });

  it('nada amarillo ni verde a la izquierda, nada rojo ni azul a la derecha', () => {
    const yellow = QUADRANTS.high_pleasant.color;
    const green = QUADRANTS.low_pleasant.color;
    const red = QUADRANTS.high_unpleasant.color;
    const blue = QUADRANTS.low_unpleasant.color;
    for (let col = 1; col <= PLANE_GRID; col++) {
      for (let row = 1; row <= PLANE_GRID; row++) {
        const c = planeCellColor(col, row);
        if (col <= 6) {
          expect(c.startsWith(yellow)).toBe(false);
          expect(c.startsWith(green)).toBe(false);
        } else {
          expect(c.startsWith(red)).toBe(false);
          expect(c.startsWith(blue)).toBe(false);
        }
      }
    }
  });

  it('el tono varía con la distancia al centro, dentro del rango legible', () => {
    // Centro (celdas 6/7) suave, esquina intensa; monótono hacia afuera.
    expect(planeToneOpacity(6, 7)).toBe(PLANE_TONE_MIN);
    expect(planeToneOpacity(1, 12)).toBe(PLANE_TONE_MAX);
    expect(planeToneOpacity(12, 1)).toBe(PLANE_TONE_MAX);
    for (let col = 7; col < PLANE_GRID; col++) {
      expect(planeToneOpacity(col + 1, 7)).toBeGreaterThanOrEqual(planeToneOpacity(col, 7));
    }
    for (const e of EMOTIONS) {
      const o = planeToneOpacity(e.gridCol, e.gridRow);
      expect(o).toBeGreaterThanOrEqual(PLANE_TONE_MIN);
      expect(o).toBeLessThanOrEqual(PLANE_TONE_MAX);
    }
  });
});

describe('geometría base — fila 1 abajo, celdas dentro del plano', () => {
  it('cellRect: la fila 12 arriba (top 0) y la fila 1 abajo', () => {
    expect(cellRect(1, 12).top).toBe(PLANE_CELL_GAP / 2);
    expect(cellRect(1, 1).top).toBe((PLANE_GRID - 1) * PLANE_CELL + PLANE_CELL_GAP / 2);
    expect(cellRect(1, 12).left).toBe(PLANE_CELL_GAP / 2);
    expect(cellRect(12, 12).left).toBe((PLANE_GRID - 1) * PLANE_CELL + PLANE_CELL_GAP / 2);
  });

  it('toda celda queda contenida en el plano', () => {
    for (const e of EMOTIONS) {
      const r = cellRect(e.gridCol, e.gridRow);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.left + r.size).toBeLessThanOrEqual(PLANE_SIZE);
      expect(r.top + r.size).toBeLessThanOrEqual(PLANE_SIZE);
    }
  });

  it('cellCenter es el centro del rect', () => {
    for (const [col, row] of [[1, 1], [6, 7], [12, 12]] as const) {
      const r = cellRect(col, row);
      const c = cellCenter(col, row);
      expect(c.x).toBeCloseTo(r.left + r.size / 2, 6);
      expect(c.y).toBeCloseTo(r.top + r.size / 2, 6);
    }
  });
});

describe('regla 2 — tipografía estática que aguanta la biblioteca completa', () => {
  it('la palabra más larga cabe en una línea de la celda a tamaño base', () => {
    const words = EMOTIONS.flatMap((e) => e.label.split(' '));
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
    // Heurística conservadora de ancho de glifo (Poppins ~0.6 em): si alguien
    // agrega una palabra más larga que "arrepentimiento", este test truena
    // ANTES que el device (una palabra partida a media celda a zoom 4.5).
    const usable = PLANE_CELL - PLANE_CELL_GAP - PLANE_CELL_PAD_H * 2;
    expect(longest.length * 0.6 * PLANE_FONT_SIZE).toBeLessThanOrEqual(usable);
  });
});

describe('cámara — clamps que no dejan sacar el plano de la pantalla', () => {
  const VW = 360;
  const VH = 480;

  it('la escala respeta los límites del brief (0.6 a 4.5)', () => {
    expect(PLANE_MIN_SCALE).toBe(0.6);
    expect(PLANE_MAX_SCALE).toBe(4.5);
    expect(clampScale(0.01)).toBe(PLANE_MIN_SCALE);
    expect(clampScale(99)).toBe(PLANE_MAX_SCALE);
    expect(clampScale(2)).toBe(2);
    // El fit del device puede bajar el piso (el plano completo siempre alcanzable).
    expect(clampScale(0.5, 0.5)).toBe(0.5);
  });

  it('planeFitScale hace visible el plano completo en ambos ejes', () => {
    const s = planeFitScale(VW, VH);
    expect(PLANE_SIZE * s).toBeLessThanOrEqual(VW);
    expect(PLANE_SIZE * s).toBeLessThanOrEqual(VH);
    // Y en un canvas apaisado también.
    const s2 = planeFitScale(700, 300);
    expect(PLANE_SIZE * s2).toBeLessThanOrEqual(300);
  });

  it('clampAxis: contenido grande → los bordes nunca entran a la pantalla', () => {
    const content = 1000;
    expect(clampAxis(50, content, VW)).toBe(0);                 // borde izq nunca > 0
    expect(clampAxis(-9999, content, VW)).toBe(VW - content);   // borde der nunca < viewport
    expect(clampAxis(-300, content, VW)).toBe(-300);            // dentro del rango, intacto
  });

  it('clampAxis: contenido chico → centrado y fijo (no se deja en negro)', () => {
    expect(clampAxis(-500, 200, VW)).toBe((VW - 200) / 2);
    expect(clampAxis(500, 200, VW)).toBe((VW - 200) / 2);
  });

  it('cameraFor centra el punto pedido cuando hay espacio y clampea en bordes', () => {
    const fit = planeFitScale(VW, VH);
    // Centro del plano a fit → el plano queda centrado en el viewport.
    const cam = cameraFor(PLANE_SIZE / 2, PLANE_SIZE / 2, fit, VW, VH);
    expect(cam.tx).toBeCloseTo((VW - PLANE_SIZE * fit) / 2, 6);
    expect(cam.ty).toBeCloseTo((VH - PLANE_SIZE * fit) / 2, 6);
    // Esquina a zoom alto → clampeado exactamente al borde, sin negro.
    const corner = cameraFor(0, 0, 4, VW, VH);
    expect(corner.tx).toBe(0);
    expect(corner.ty).toBe(0);
    const far = cameraFor(PLANE_SIZE, PLANE_SIZE, 4, VW, VH);
    expect(far.tx).toBe(VW - PLANE_SIZE * 4);
    expect(far.ty).toBe(VH - PLANE_SIZE * 4);
    // La escala pedida fuera de rango también se clampea.
    expect(cameraFor(0, 0, 99, VW, VH).scale).toBe(PLANE_MAX_SCALE);
  });

  it('el atajo de cuadrante encuadra el centro del cuadrante correcto', () => {
    const fit = planeFitScale(VW, VH);
    const s = fit * QUADRANT_ZOOM_FACTOR;
    for (const q of ALL_QUADRANTS) {
      const c = quadrantCenter(q);
      const cam = cameraFor(c.x, c.y, s, VW, VH);
      // El centro del cuadrante aterriza en el centro del viewport (módulo clamp).
      const screenX = c.x * cam.scale + cam.tx;
      const screenY = c.y * cam.scale + cam.ty;
      expect(Math.abs(screenX - VW / 2)).toBeLessThanOrEqual(VW / 2);
      expect(Math.abs(screenY - VH / 2)).toBeLessThanOrEqual(VH / 2);
    }
    // Y los centros están en el cuadrante que dicen ser.
    expect(quadrantCenter('high_unpleasant').x).toBeLessThan(PLANE_SIZE / 2);
    expect(quadrantCenter('high_unpleasant').y).toBeLessThan(PLANE_SIZE / 2);
    expect(quadrantCenter('low_pleasant').x).toBeGreaterThan(PLANE_SIZE / 2);
    expect(quadrantCenter('low_pleasant').y).toBeGreaterThan(PLANE_SIZE / 2);
  });

  it('los factores de zoom de atajo/foco quedan dentro del rango en devices reales', () => {
    // fit típico: canvas 320-500 pt → fit 0.6-0.95. Ni el atajo ni el foco
    // deben pedir más que PLANE_MAX_SCALE (cameraFor clampea igual, pero el
    // gesto no debe nacer ya clampeado).
    for (const vw of [320, 360, 412, 500]) {
      const fit = planeFitScale(vw, vw + 120);
      expect(fit * QUADRANT_ZOOM_FACTOR).toBeLessThanOrEqual(PLANE_MAX_SCALE);
      expect(fit * FOCUS_ZOOM_FACTOR).toBeLessThanOrEqual(PLANE_MAX_SCALE);
    }
  });
});
