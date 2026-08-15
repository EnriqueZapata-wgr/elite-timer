import { describe, it, expect } from 'vitest';
import {
  NBACK_CONFIG, cellToRowCol, stimuliCountFor, trialDurationMs,
  generateRound, scoreChannel, evaluateRound, startingN, nextStreak,
  badgeForBestN, challengeDay, resolvePressIndex,
} from '../nback-core';

/** RNG determinista (LCG) para tests reproducibles. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('cellToRowCol (grid 3×3 sin centro)', () => {
  it('mapea las 8 celdas saltando el crosshair [1,1]', () => {
    const cells = Array.from({ length: 8 }, (_, i) => cellToRowCol(i));
    expect(cells).toEqual([
      [0, 0], [0, 1], [0, 2],
      [1, 0],         [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);
    // Ninguna celda cae en el centro.
    expect(cells.some(([r, c]) => r === 1 && c === 1)).toBe(false);
  });
});

describe('timing (V1.5.1 #3: 3.3s por trial a 1x — #44-2 era 3s, Enrique la sintió rápida)', () => {
  it('3300ms a 1x; speed divide', () => {
    expect(trialDurationMs(1)).toBe(3300);
    expect(trialDurationMs(1.5)).toBe(2200);
    expect(trialDurationMs(2)).toBe(1650);
    expect(trialDurationMs(0)).toBe(3300);  // guard
    expect(trialDurationMs(NaN)).toBe(3300);
  });
});

describe('generateRound', () => {
  it('estímulos = 20 + N; canales dentro de rango', () => {
    const round = generateRound(3, makeRng(42));
    expect(round.positions.length).toBe(stimuliCountFor(3));
    expect(round.positions.length).toBe(23);
    expect(round.positions.every(p => p >= 0 && p < 8)).toBe(true);
    expect(round.letters.every(l => l >= 0 && l < NBACK_CONFIG.LETTERS.length)).toBe(true);
  });

  it('fuerza ≥6 matches por canal y los matches son consistentes con la secuencia', () => {
    for (const seed of [1, 7, 99, 1234]) {
      for (const n of [1, 2, 4]) {
        const round = generateRound(n, makeRng(seed));
        const vCount = round.visualMatches.filter(Boolean).length;
        const aCount = round.audioMatches.filter(Boolean).length;
        expect(vCount).toBeGreaterThanOrEqual(NBACK_CONFIG.FORCED_MATCHES_PER_CHANNEL);
        expect(aCount).toBeGreaterThanOrEqual(NBACK_CONFIG.FORCED_MATCHES_PER_CHANNEL);
        // Verdad derivada de la secuencia, no de la lista de forzados.
        round.visualMatches.forEach((m, i) => {
          expect(m).toBe(i >= n && round.positions[i] === round.positions[i - n]);
        });
        // Los primeros n trials jamás son match.
        for (let i = 0; i < n; i++) {
          expect(round.visualMatches[i]).toBe(false);
          expect(round.audioMatches[i]).toBe(false);
        }
      }
    }
  });
});

describe('scoreChannel (hit/miss/false → accuracy = hits/(total+falses))', () => {
  it('todo correcto → 100%', () => {
    const matches = [false, false, true, false, true];
    const pressed = [false, false, true, false, true];
    const s = scoreChannel(matches, pressed);
    expect(s).toMatchObject({ total: 2, hits: 2, misses: 0, falses: 0, accuracy: 1 });
  });

  it('misses y false positives bajan el accuracy', () => {
    const matches = [false, true, true, false, true, false];
    const pressed = [false, true, false, true, true, false];
    const s = scoreChannel(matches, pressed);
    // hits=2 (i1,i4), miss=1 (i2), false=1 (i3) → 2/(3+1) = 0.5
    expect(s).toMatchObject({ total: 3, hits: 2, misses: 1, falses: 1 });
    expect(s.accuracy).toBeCloseTo(0.5);
  });

  it('sin matches y sin presses → 100% (no castigar el silencio correcto)', () => {
    expect(scoreChannel([false, false], [false, false]).accuracy).toBe(1);
  });

  it('sin matches pero con false positives → 0%', () => {
    expect(scoreChannel([false, false], [true, false]).accuracy).toBe(0);
  });
});

describe('evaluateRound (referencia 75/90 — supersede 80/50 del spec viejo)', () => {
  it('ambos ≥90% → sube N (sin techo)', () => {
    expect(evaluateRound(0.9, 0.95, 3)).toMatchObject({ promoted: true, demoted: false, nextN: 4 });
    expect(evaluateRound(1, 1, 8).nextN).toBe(9);
  });

  it('cualquiera <75% → baja N con piso en 1', () => {
    expect(evaluateRound(0.74, 0.95, 3)).toMatchObject({ promoted: false, demoted: true, nextN: 2 });
    expect(evaluateRound(0.9, 0.5, 3).nextN).toBe(2);
    expect(evaluateRound(0.1, 0.1, 1)).toMatchObject({ demoted: false, nextN: 1 }); // piso: no baja de 1
  });

  it('zona intermedia → se mantiene', () => {
    expect(evaluateRound(0.8, 0.85, 3)).toMatchObject({ promoted: false, demoted: false, nextN: 3 });
    expect(evaluateRound(0.75, 0.89, 2).nextN).toBe(2); // 75 exacto no baja; 89 no sube
  });
});

describe('startingN (decisión #44-1: tutorial + resume_mode)', () => {
  it('primera vez (0 sesiones) → N=1 forzado sin importar el modo', () => {
    expect(startingN(0, 4, 6, 'last')).toBe(1);
    expect(startingN(0, 4, 6, 'best')).toBe(1);
  });

  it("resume_mode: 'last' → current, 'best' → best, 'restart' → 1", () => {
    expect(startingN(10, 3, 5, 'last')).toBe(3);
    expect(startingN(10, 3, 5, 'best')).toBe(5);
    expect(startingN(10, 3, 5, 'restart')).toBe(1);
  });
});

describe('nextStreak (días con ≥1 round)', () => {
  it('primera sesión → 1; mismo día → conserva; ayer → +1; hueco → 1', () => {
    expect(nextStreak(null, '2026-07-23', 0)).toBe(1);
    expect(nextStreak('2026-07-23', '2026-07-23', 4)).toBe(4);
    expect(nextStreak('2026-07-22', '2026-07-23', 4)).toBe(5);
    expect(nextStreak('2026-07-20', '2026-07-23', 9)).toBe(1);
  });

  it('cruza fin de mes/año sin desfase', () => {
    expect(nextStreak('2026-07-31', '2026-08-01', 2)).toBe(3);
    expect(nextStreak('2026-12-31', '2027-01-01', 6)).toBe(7);
  });

  /**
   * DEUDA 2026-08-15 · los dos casos donde la copia muerta de
   * `src/services/mente/nback-core.ts` discrepaba de esta. Se fijan aquí para
   * que la racha no vuelva a depender de cuál de los dos archivos importaste.
   */
  it('una fecha guardada en el FUTURO conserva la racha, no la borra', () => {
    // Se practica en Tokio (día 16) y se aterriza en México, donde es 15.
    // La copia muerta devolvía 1: le quitaba 11 días a quien cruzó un meridiano.
    expect(nextStreak('2026-08-16', '2026-08-15', 11)).toBe(11);
    // Y si además la racha venía en 0, el piso sigue siendo 1: nunca 0.
    expect(nextStreak('2026-08-16', '2026-08-15', 0)).toBe(1);
  });

  it('racha en 0 con sesión ayer cuenta los DOS días, no uno', () => {
    // Estado imposible salvo dato corrupto. Si hubo sesión ayer y hay sesión
    // hoy, son dos días: recortar a 1 le come un día a alguien que sí practicó.
    expect(nextStreak('2026-07-22', '2026-07-23', 0)).toBe(2);
  });

  it('el caso sano no cambia: la racha normal sigue sumando de uno en uno', () => {
    // El candado de que la mejora de arriba no infló nada más.
    expect(nextStreak('2026-07-22', '2026-07-23', 1)).toBe(2);
    expect(nextStreak('2026-07-22', '2026-07-23', 30)).toBe(31);
  });
});

describe('resolvePressIndex (V1.5: gracia de press tardío)', () => {
  const G = NBACK_CONFIG.GRACE_PRESS_MS;

  it('press dentro de la gracia se acredita al trial anterior si estaba libre', () => {
    expect(resolvePressIndex(5, 100, G, false)).toBe(4);
    expect(resolvePressIndex(5, G, G, false)).toBe(4); // límite inclusive
  });

  it('press después de la gracia se queda en el trial actual', () => {
    expect(resolvePressIndex(5, G + 1, G, false)).toBe(5);
    expect(resolvePressIndex(5, 2000, G, false)).toBe(5);
  });

  it('si el trial anterior ya registró press, no roba el crédito', () => {
    expect(resolvePressIndex(5, 100, G, true)).toBe(5);
  });

  it('el trial 0 nunca redirige (no hay anterior)', () => {
    expect(resolvePressIndex(0, 10, G, false)).toBe(0);
  });

  it('elapsed no-finito degrada al trial actual', () => {
    expect(resolvePressIndex(3, Number.NaN, G, false)).toBe(3);
    expect(resolvePressIndex(3, Number.POSITIVE_INFINITY, G, false)).toBe(3);
  });
});

describe('badges + challenge (decisión #44-5 / reto 20 días)', () => {
  it('escalera de badges por best N', () => {
    expect(badgeForBestN(1).label).toBe('Novato');
    expect(badgeForBestN(2).label).toBe('Aprendiz');
    expect(badgeForBestN(6).label).toBe('Maestro');
    expect(badgeForBestN(11).label).toBe('Élite');
  });

  it('día del reto se capea a 20', () => {
    expect(challengeDay(0)).toBe(0);
    expect(challengeDay(7)).toBe(7);
    expect(challengeDay(25)).toBe(20);
  });
});
