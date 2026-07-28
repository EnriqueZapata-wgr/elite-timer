/**
 * Tests del núcleo puro de la RUEDA de emociones (MB-10 · Track A).
 *
 * Lo que blindan (delivery del brief):
 *  - Cada emoción recibe EXACTAMENTE el mismo arco (2.5°) — ninguna es más
 *    difícil de tocar que otra.
 *  - El arco de núcleos y familias es proporcional a su contenido.
 *  - La jerarquía del config cubre las 144 sin huecos ni repetidos.
 *  - Ninguna etiqueta se pinta si no cabe o no se lee (regla, no promesa).
 *  - El texto radial nunca queda de cabeza.
 */
import { describe, it, expect } from 'vitest';
import {
  buildWheelLayout, validateWheelConfig, wheelPoint, annularSectorPath,
  radialTextTransform, labelIsReadable, radialLabelFits, coreLabelMode,
  familyLabelVisible, emotionLabelVisible, sectorFocus, findEmotionSector,
  findFamilySector,
  DEG_PER_EMOTION, WHEEL_WORLD, WHEEL_CX, WHEEL_CY,
  CORE_R0, CORE_R1, FAM_R0, FAM_R1, EMO_R0, EMO_R1,
  LEVEL_ZOOM, FAM_FONT, EMO_FONT, MIN_LABEL_SCREEN_PX,
} from '../emotion-wheel-core';
import { WHEEL_CORES, BODY_ZONES, BODY_GATE_DISCLAIMER, FAMILY_LABELS } from '../../data/emotion-wheel-config';
import { EMOTIONS } from '../../data/emotions-library';

const layout = buildWheelLayout(EMOTIONS);

describe('config de la rueda — jerarquía completa y sin repetidos', () => {
  it('valida sin errores contra la librería real', () => {
    expect(validateWheelConfig(EMOTIONS)).toEqual([]);
  });

  it('los 6 núcleos de Willcox, las 13 familias, las 144 emociones', () => {
    expect(layout.cores).toHaveLength(6);
    expect(layout.families).toHaveLength(13);
    expect(layout.emotions).toHaveLength(144);
  });

  it('la tabla del brief: emociones por núcleo', () => {
    const byCore = new Map(layout.cores.map((c) => [c.key, c.count]));
    expect(byCore.get('enojo')).toBe(12);
    expect(byCore.get('miedo')).toBe(18);
    expect(byCore.get('tristeza')).toBe(42); // vergüenza cuelga de tristeza
    expect(byCore.get('alegria')).toBe(33);
    expect(byCore.get('fuerza')).toBe(8);
    expect(byCore.get('paz')).toBe(31);
  });
});

describe('A.2 · arco proporcional al contenido', () => {
  it('cada emoción recibe EXACTAMENTE el mismo arco (2.5°)', () => {
    expect(DEG_PER_EMOTION).toBeCloseTo(2.5, 10);
    for (const s of layout.emotions) {
      expect(s.endDeg - s.startDeg, s.emotionId).toBeCloseTo(DEG_PER_EMOTION, 9);
    }
  });

  it('el arco de cada núcleo/familia = sus emociones × 2.5°', () => {
    for (const c of layout.cores) {
      expect(c.endDeg - c.startDeg, c.key).toBeCloseTo(c.count * DEG_PER_EMOTION, 9);
    }
    for (const f of layout.families) {
      expect(f.endDeg - f.startDeg, f.key).toBeCloseTo(f.count * DEG_PER_EMOTION, 9);
    }
    // Los casos del brief: 42 emociones ≈ 105°, 8 emociones = 20°.
    const tristeza = layout.cores.find((c) => c.key === 'tristeza')!;
    expect(tristeza.endDeg - tristeza.startDeg).toBeCloseTo(105, 9);
    const fuerza = layout.cores.find((c) => c.key === 'fuerza')!;
    expect(fuerza.endDeg - fuerza.startDeg).toBeCloseTo(20, 9);
  });

  it('cobertura completa: 360° contiguos, sin huecos ni traslapes, en los 3 anillos', () => {
    for (const ring of [layout.cores, layout.families, layout.emotions]) {
      const sorted = [...ring].sort((a, b) => a.startDeg - b.startDeg);
      expect(sorted[0].startDeg).toBeCloseTo(0, 9);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].startDeg, sorted[i].key).toBeCloseTo(sorted[i - 1].endDeg, 9);
      }
      expect(sorted[sorted.length - 1].endDeg).toBeCloseTo(360, 9);
    }
  });

  it('memoria espacial del plano: agradable a la DERECHA, desagradable a la IZQUIERDA', () => {
    // Mitades exactas: 72 y 72 → el horario parte en 180°.
    for (const s of layout.emotions) {
      const e = EMOTIONS.find((em) => em.id === s.emotionId)!;
      const pleasant = e.quadrant === 'high_pleasant' || e.quadrant === 'low_pleasant';
      if (pleasant) expect(s.endDeg, s.emotionId).toBeLessThanOrEqual(180 + 1e-9);
      else expect(s.startDeg, s.emotionId).toBeGreaterThanOrEqual(180 - 1e-9);
    }
  });

  it('es determinista: dos corridas → mismo layout, sin importar el orden del input', () => {
    expect(buildWheelLayout(EMOTIONS)).toEqual(layout);
    expect(buildWheelLayout([...EMOTIONS].reverse())).toEqual(layout);
  });

  it('cada emoción vive dentro del arco de su familia, y esta dentro de su núcleo', () => {
    for (const s of layout.emotions) {
      const fam = layout.families.find((f) => f.family === s.family)!;
      expect(s.startDeg, s.emotionId).toBeGreaterThanOrEqual(fam.startDeg - 1e-9);
      expect(s.endDeg, s.emotionId).toBeLessThanOrEqual(fam.endDeg + 1e-9);
      const core = layout.cores.find((c) => c.key === s.core)!;
      expect(s.startDeg).toBeGreaterThanOrEqual(core.startDeg - 1e-9);
      expect(s.endDeg).toBeLessThanOrEqual(core.endDeg + 1e-9);
    }
  });
});

describe('geometría', () => {
  it('wheelPoint: 0° = 12 en punto, 90° = 3 en punto (horario de reloj)', () => {
    const top = wheelPoint(0, 100);
    expect(top.x).toBeCloseTo(WHEEL_CX);
    expect(top.y).toBeCloseTo(WHEEL_CY - 100);
    const right = wheelPoint(90, 100);
    expect(right.x).toBeCloseTo(WHEEL_CX + 100);
    expect(right.y).toBeCloseTo(WHEEL_CY);
  });

  it('annularSectorPath produce un path cerrado con dos arcos', () => {
    const p = annularSectorPath(100, 200, 0, 45);
    expect(p).toMatch(/^M /);
    expect(p).toMatch(/Z$/);
    expect((p.match(/A /g) ?? []).length).toBe(2);
  });

  it('los anillos no se traslapan y crecen hacia afuera', () => {
    expect(CORE_R0).toBeLessThan(CORE_R1);
    expect(CORE_R1).toBeLessThan(FAM_R0);
    expect(FAM_R1).toBeLessThan(EMO_R0);
    expect(EMO_R1).toBeLessThanOrEqual(WHEEL_WORLD / 2);
  });
});

describe('A.5 · texto radial que nunca se lee de cabeza', () => {
  it('mitad derecha: rotación en (-90, 90], ancla start', () => {
    for (const deg of [1, 45, 90, 135, 179]) {
      const t = radialTextTransform(deg);
      expect(t.anchor, `${deg}°`).toBe('start');
      expect(t.rotateDeg).toBeGreaterThan(-90);
      expect(t.rotateDeg).toBeLessThanOrEqual(90);
    }
  });

  it('mitad izquierda: se voltea (ancla end) y la rotación sigue legible', () => {
    for (const deg of [181, 225, 270, 315, 359]) {
      const t = radialTextTransform(deg);
      expect(t.anchor, `${deg}°`).toBe('end');
      expect(t.rotateDeg).toBeGreaterThan(-90);
      expect(t.rotateDeg).toBeLessThanOrEqual(90);
    }
  });

  it('3 y 9 en punto quedan horizontales', () => {
    expect(radialTextTransform(90).rotateDeg).toBeCloseTo(0);
    expect(radialTextTransform(270).rotateDeg).toBeCloseTo(0);
  });
});

describe('A.3 · etiquetas solo si caben y solo si se leen', () => {
  // Escalas realistas: viewport ~370px sobre mundo 1440 → fit ≈ 0.257.
  const FIT = 370 / WHEEL_WORLD;

  it('nivel 0: los núcleos se leen, familias y emociones NO (se ocultan)', () => {
    const scale0 = FIT * LEVEL_ZOOM[0];
    for (const c of layout.cores) {
      expect(coreLabelMode(c), c.key).not.toBe('hidden');
    }
    expect(labelIsReadable(FAM_FONT, scale0)).toBe(false);
    expect(labelIsReadable(EMO_FONT, scale0)).toBe(false);
  });

  it('nivel 1: TODAS las familias caben y se leen a su zoom', () => {
    const scale1 = FIT * LEVEL_ZOOM[1];
    for (const f of layout.families) {
      expect(familyLabelVisible(f, scale1), f.key).toBe(true);
    }
    // Emociones aún no: se revelan en nivel 2.
    const anyEmotion = layout.emotions[0];
    expect(emotionLabelVisible(anyEmotion, scale1)).toBe(false);
  });

  it('nivel 2: TODAS las emociones caben y se leen a su zoom (nada encimado)', () => {
    const scale2 = FIT * LEVEL_ZOOM[2];
    for (const s of layout.emotions) {
      expect(emotionLabelVisible(s, scale2), s.emotionId).toBe(true);
    }
  });

  it('la regla de legibilidad es de pantalla, no de mundo', () => {
    expect(labelIsReadable(MIN_LABEL_SCREEN_PX, 1)).toBe(true);
    expect(labelIsReadable(MIN_LABEL_SCREEN_PX, 0.5)).toBe(false);
    expect(labelIsReadable(100, 0.05)).toBe(false);
  });

  it('radialLabelFits rechaza sectores demasiado angostos o cortos', () => {
    expect(radialLabelFits('Palabra', 20, 0.5, FAM_R0, FAM_R1)).toBe(false); // arco fino
    expect(radialLabelFits('Etiqueta larguísima imposible', 20, 30, FAM_R0, FAM_R0 + 40)).toBe(false); // radial corto
    expect(radialLabelFits('Calma', FAM_FONT, 30, FAM_R0, FAM_R1)).toBe(true);
  });
});

describe('cámara por sector', () => {
  it('nivel 0 centra el mundo completo', () => {
    const f = sectorFocus(123, 0);
    expect(f.fx).toBe(WHEEL_CX);
    expect(f.fy).toBe(WHEEL_CY);
    expect(f.zoomMul).toBe(LEVEL_ZOOM[0]);
  });

  it('niveles 1 y 2 enfocan sobre el radio medio del sector con más zoom', () => {
    const f1 = sectorFocus(90, 1);
    const f2 = sectorFocus(90, 2);
    expect(f1.zoomMul).toBe(LEVEL_ZOOM[1]);
    expect(f2.zoomMul).toBe(LEVEL_ZOOM[2]);
    // A 90° (3 en punto) el foco cae a la derecha del centro.
    expect(f1.fx).toBeGreaterThan(WHEEL_CX);
    expect(f2.fx).toBeGreaterThan(f1.fx);
  });
});

describe('búsqueda de sectores (puertas: búsqueda, cuerpo, mapa)', () => {
  it('encuentra el sector de una emoción y de una familia', () => {
    const s = findEmotionSector(layout, 'anxious');
    expect(s?.family).toBe('miedo');
    expect(s?.core).toBe('miedo');
    const f = findFamilySector(layout, 'calma');
    expect(f?.core).toBe('paz');
    expect(f?.count).toBe(22);
  });

  it('devuelve null para ids inexistentes', () => {
    expect(findEmotionSector(layout, 'nope')).toBeNull();
  });
});

describe('el orden de núcleos respeta el config (editar el config = editar la rueda)', () => {
  it('los núcleos aparecen en el orden del config, contiguos desde las 12', () => {
    const keys = layout.cores.map((c) => c.key);
    expect(keys).toEqual(WHEEL_CORES.map((c) => c.key));
  });
});

describe('Track B · la puerta del cuerpo (zonas → familias candidatas)', () => {
  it('toda zona apunta a familias REALES de la rueda (1 a 3, sin repetidos)', () => {
    for (const z of BODY_ZONES) {
      expect(z.families.length, z.key).toBeGreaterThanOrEqual(1);
      expect(z.families.length, z.key).toBeLessThanOrEqual(3);
      expect(new Set(z.families).size, z.key).toBe(z.families.length);
      for (const fam of z.families) {
        expect(findFamilySector(layout, fam), `${z.key} → ${fam}`).not.toBeNull();
        expect(FAMILY_LABELS[fam], fam).toBeTruthy();
      }
    }
  });

  it('acota, no diagnostica: el disclaimer existe y las zonas hablan cuerpo, no clínica', () => {
    expect(BODY_GATE_DISCLAIMER.length).toBeGreaterThan(10);
    for (const z of BODY_ZONES) {
      expect(z.label.length, z.key).toBeGreaterThan(0);
      expect(z.detail.length, z.key).toBeGreaterThan(0);
    }
  });

  it('la puerta ACOTA (ninguna zona abarca todas las familias) y las 4 zonas del brief existen', () => {
    const allFams = new Set(EMOTIONS.map((e) => e.family));
    for (const z of BODY_ZONES) {
      expect(z.families.length, z.key).toBeLessThan(allFams.size);
    }
    expect(BODY_ZONES.map((z) => z.key)).toEqual(['pecho', 'cabeza', 'estomago', 'apagado']);
  });
});
