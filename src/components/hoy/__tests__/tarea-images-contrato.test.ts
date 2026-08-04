/**
 * MB-20.5 P4 — las 21 cards tienen foto, y el contrato lo vigila.
 *
 * TAREA_IMAGES lleva 18 llaves; las otras tres (cardio, ciclo y romper
 * ayuno) resuelven en el wrapper con los pickers determinísticos de siempre
 * (cardio-01/02, ciclo-01/02/03, ayuno.webp). Ninguna card del universo HOY
 * puede caer al degradado con glifo.
 *
 * tarea-images no se importa (sus require() de assets no pasan el resolver
 * node de vitest — mismo criterio que image-rotation): el contrato se lee
 * del SOURCE y los assets se verifican EN DISCO, que es lo que Metro va a
 * empaquetar.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TAREA_MOMENTO } from '@/src/services/hoy/tareas-core';

const leer = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const imagenes = leer('src/components/hoy/tarea-images.ts');
const rotacion = leer('src/utils/image-rotation.ts');

/** Llaves del Record TAREA_IMAGES (solo su bloque — MOMENTO_BAND_IMAGES
 * también tiene `clave: require(...)` y no debe contar). */
const bloqueTareaImages = imagenes.match(/const TAREA_IMAGES[^{]+\{([\s\S]*?)\n\};/)![1];
const TAREA_IMAGES_KEYS = [...bloqueTareaImages.matchAll(/^ {2}(\w+): require\(/gm)].map((m) => m[1]);

/** Todo require('@/assets/…') de un source. */
const requires = (src: string) => [...src.matchAll(/require\('(@\/assets\/[^']+)'\)/g)].map((m) => m[1]);

describe('MB-20.5 P4 · todas las cards son editoriales de verdad', () => {
  it('cada asset requerido existe en disco (lo que Metro va a empaquetar)', () => {
    const todos = [...requires(imagenes), ...requires(rotacion)];
    expect(todos.length).toBeGreaterThan(20);
    for (const ruta of todos) {
      expect(existsSync(resolve(process.cwd(), ruta.replace('@/', ''))), ruta).toBe(true);
    }
  });

  it('los 20 hábitos del universo HOY resuelven foto: TAREA_IMAGES o su picker', () => {
    // Las tres que no viven en el Record van por el wrapper (rotación).
    const porPicker = new Set(['cardio', 'period_log']);
    for (const key of Object.keys(TAREA_MOMENTO)) {
      expect(
        TAREA_IMAGES_KEYS.includes(key) || porPicker.has(key),
        `${key} caería al degradado con glifo`,
      ).toBe(true);
    }
  });

  it('la card 21 (romper ayuno, agenda-*) tiene su foto asignada', () => {
    expect(imagenes).toMatch(/key\.startsWith\('agenda-'\).*require\('@\/assets\/images\/hoy-extra\/ayuno\.webp'\)/);
  });

  it('cardio y ciclo usan el mismo mecanismo de rotación por día que las demás', () => {
    expect(imagenes).toMatch(/key === 'cardio'.*pickCardioImage\(seedKey\)/);
    expect(imagenes).toMatch(/key === 'period_log'.*pickHabitImage\('ciclo', seedKey\)/);
    // Y los pools rotan de verdad: 2 de cardio, 3 de ciclo.
    expect(rotacion).toContain('cardio-01.webp');
    expect(rotacion).toContain('cardio-02.webp');
    for (const v of ['ciclo-01.webp', 'ciclo-02.webp', 'ciclo-03.webp']) {
      expect(rotacion).toContain(v);
    }
  });

  it('el guard del propio test: la extracción de llaves no está rota', () => {
    expect(TAREA_IMAGES_KEYS.length).toBe(18);
    expect(TAREA_IMAGES_KEYS).toContain('sunlight');
    expect(TAREA_IMAGES_KEYS).not.toContain('cardio');
  });
});
