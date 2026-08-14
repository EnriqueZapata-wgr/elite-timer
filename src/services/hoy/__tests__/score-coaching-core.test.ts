import { describe, it, expect } from 'vitest';
import {
  COACHING_ROUTES,
  topScoreMover,
} from '@/src/services/hoy/score-coaching-core';

const bool = (source: string, weight: number, completed = false, name = source) =>
  ({ source, name, weight, completed });
const quant = (source: string, weight: number, current: number, target: number, name = source) =>
  ({ source, name, weight, current, target });

describe('topScoreMover — la acción pendiente que más mueve el score (MB-1.5 §3)', () => {
  it('elige el booleano pendiente de mayor weight con ruta', () => {
    const top = topScoreMover(
      [bool('sunlight', 1.5), bool('meditation', 2.5), bool('breathwork', 1.0)],
      [],
    );
    expect(top).toMatchObject({ source: 'meditation', route: '/meditation', remainingWeight: 2.5 });
  });

  it('los completados no compiten', () => {
    const top = topScoreMover(
      [bool('meditation', 2.5, true), bool('sunlight', 1.5)],
      [],
    );
    expect(top?.source).toBe('sunlight');
  });

  it('toggles sin pantalla (cold_shower, grounding, etc.) NO son candidatos aunque pesen más', () => {
    const top = topScoreMover(
      [bool('cold_shower', 3.0), bool('grounding', 1.5), bool('sunlight', 1.5)],
      [],
    );
    expect(top?.source).toBe('sunlight');
  });

  it('cuantitativo: weight restante proporcional a lo que falta de la meta', () => {
    // steps weight 3.0 al 50% → 1.5 restante; protein 2.0 al 0% → 2.0 restante
    const top = topScoreMover(
      [],
      [quant('steps', 3.0, 5000, 10000), quant('protein', 2.0, 0, 120)],
    );
    // La proteína manda a /food-log: la nutrición de nueve pantallas se
    // juntó en cuatro y /food-register quedó como redirect.
    expect(top).toMatchObject({ source: 'protein', route: '/food-log', remainingWeight: 2 });
  });

  it('cuantitativo con meta cumplida o target 0 no compite', () => {
    const top = topScoreMover(
      [bool('journal', 1.0)],
      [quant('water', 1.5, 2000, 2000), quant('steps', 3.0, 0, 0)],
    );
    expect(top?.source).toBe('journal');
  });

  it('mezcla booleano vs cuantitativo: gana el mayor restante', () => {
    // meditation 2.5 pendiente vs steps 3.0 al 20% → 2.4 → gana meditation
    const top = topScoreMover(
      [bool('meditation', 2.5)],
      [quant('steps', 3.0, 2000, 10000)],
    );
    expect(top?.source).toBe('meditation');
  });

  it('empate → primera en orden de entrada (orden del día compilado)', () => {
    const top = topScoreMover(
      [bool('sunlight', 1.5), bool('grounding', 1.5), bool('nback', 1.5, false, 'N-Back')],
      [],
    );
    expect(top?.source).toBe('sunlight');
  });

  it('día completo (o sin candidatas navegables) → null', () => {
    expect(topScoreMover([], [])).toBeNull();
    expect(topScoreMover([bool('meditation', 2.5, true)], [])).toBeNull();
    expect(topScoreMover([bool('cold_shower', 3.0)], [])).toBeNull();
  });

  it('todas las rutas del mapa apuntan a destino con formato de ruta', () => {
    for (const route of Object.values(COACHING_ROUTES)) {
      expect(route.startsWith('/')).toBe(true);
    }
  });
});
