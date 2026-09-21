/**
 * RoutineEngine sobre reloj-core (bloque TIMERS): el motor LEE el tiempo de
 * `ahora` inyectado, no cuenta ticks. Se prueba llamando sincronizar(ahoraMs)
 * a mano, sin setInterval ni fake timers.
 *
 * Correr: node scripts/run-tests-sin-vitest.js src/engine/__tests__/engine-reloj.test.ts
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RoutineEngine } from '../RoutineEngine';
import { flattenRoutine } from '../flatten';
import { TABATA_ROUTINE } from '../testData';
import type { EngineCallbacks, EngineState, ExecutionStep, ExecutionStats } from '../types';

const T0 = 1_700_000_000_000;

// play() arma un setInterval real; sin destroy() el proceso del runner sin
// vitest se queda vivo. Cada test suelta lo que armó.
const vivos: RoutineEngine[] = [];
afterEach(() => { for (const e of vivos) e.destroy(); vivos.length = 0; });

function step(i: number, type: ExecutionStep['type'], durationSeconds: number): ExecutionStep {
  return {
    stepIndex: i, blockId: `b${i}`, type, label: `${type} ${i}`, durationSeconds,
    color: null, soundStart: 'start', soundEnd: 'end', notes: '', isRestBetween: false,
    context: { breadcrumb: [], rounds: [], depth: 0 },
  };
}

function armar(steps: ExecutionStep[]) {
  const ticks: number[] = [];
  const estados: EngineState[] = [];
  const cambios: string[] = [];
  const habla: string[] = [];
  const sonidos: string[] = [];
  let stats: ExecutionStats | null = null;
  const cb: EngineCallbacks = {
    onTick: (r) => { ticks.push(r); },
    onStateChange: (s) => { estados.push(s); },
    onStepChange: (s) => { cambios.push(s.label); },
    onComplete: (st) => { stats = st; },
    onSpeak: (t) => { habla.push(t); },
    onSound: (s) => { sonidos.push(s); },
  };
  let ahora = T0;
  const engine = new RoutineEngine(steps, cb, { ahora: () => ahora });
  vivos.push(engine);
  return {
    engine, ticks, estados, cambios, habla, sonidos,
    stats: () => stats,
    en: (ms: number) => { ahora = T0 + ms; engine.sincronizar(T0 + ms); },
    mover: (ms: number) => { ahora = T0 + ms; },
  };
}

// Tabata: 8 × (work 20 s + rest 10 s) sin trailing rest = 15 steps, 230 s.
const tabata = () => armar(flattenRoutine(TABATA_ROUTINE));

describe('RoutineEngine: arranque', () => {
  it('antes de play muestra la duración completa y no emite nada', () => {
    const t = tabata();
    expect(t.engine.getRemainingSeconds(T0 + 5_000)).toBe(20);
    t.en(5_000);
    expect(t.ticks).toEqual([]);
    expect(t.engine.getState()).toBe('idle');
  });

  it('play anuncia el step y arranca el reloj; el primer poll emite la duración completa', () => {
    const t = tabata();
    t.engine.play();
    expect(t.estados).toEqual(['running']);
    expect(t.habla[0]).toBe('Work, 1 de 8');
    expect(t.sonidos).toEqual(['default']);
    t.en(250);
    expect(t.ticks).toEqual([20]);
  });

  it('el mismo segundo no se emite dos veces (poll de 250 ms, tick por segundo)', () => {
    const t = tabata();
    t.engine.play();
    t.en(250); t.en(500); t.en(750); t.en(1_000); t.en(1_250);
    expect(t.ticks).toEqual([20, 19]);
  });
});

describe('RoutineEngine: countdown y fin de step exacto', () => {
  it('habla 3-2-1 una sola vez por segundo y suena el countdown', () => {
    const t = tabata();
    t.engine.play();
    t.en(17_000); t.en(17_250); t.en(18_000); t.en(19_000); t.en(19_999);
    expect(t.habla.slice(1)).toEqual(['3', '2', '1']);
    expect(t.sonidos.filter((s) => s === 'countdown')).toHaveLength(3);
    expect(t.ticks).toEqual([3, 2, 1]);
  });

  it('a los 20 s exactos cierra el work sin mostrar 0: suena fin, cambia a rest y emite 10', () => {
    const t = tabata();
    t.engine.play();
    t.en(19_999);
    t.en(20_000);
    expect(t.cambios).toEqual(['Rest']);
    expect(t.ticks).toEqual([1, 10]);
    expect(t.ticks).not.toContain(0);
    expect(t.engine.getCurrentStepNumber()).toBe(2);
  });

  it('lo que sobra del step anterior ya va descontado en el nuevo (sin desfase acumulado)', () => {
    const t = tabata();
    t.engine.play();
    t.en(20_400);
    expect(t.engine.getRemainingSeconds(T0 + 20_400)).toBe(10);
    expect(t.engine.getRemainingSeconds(T0 + 30_000)).toBe(0);
    t.en(30_000);
    expect(t.engine.getCurrentStepNumber()).toBe(3);
  });
});

describe('RoutineEngine: pausa y reanuda sin perder tiempo', () => {
  it('en pausa el reloj no avanza aunque pasen minutos', () => {
    const t = tabata();
    t.engine.play();
    t.en(5_000);
    t.engine.pause();
    expect(t.engine.getState()).toBe('paused');
    t.en(120_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(15);
    expect(t.engine.getRemainingSeconds(T0 + 120_000)).toBe(15);
  });

  it('al reanudar sigue desde donde quedó', () => {
    const t = tabata();
    t.engine.play();
    t.en(5_000);
    t.engine.pause();
    t.mover(120_000);
    t.engine.play();
    t.en(122_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(13);
    expect(t.engine.getCurrentStepNumber()).toBe(1);
  });
});

describe('RoutineEngine: salto de reloj (90 s en segundo plano)', () => {
  it('al volver avanza de golpe los 3 rounds cubiertos y aterriza en el work del round 4', () => {
    const t = tabata();
    t.engine.play();
    t.en(250);
    t.en(90_000);
    // 90 s = 3 rounds de 30 s → steps 0..5 cerrados → step 6 (work, round 4)
    expect(t.engine.getCurrentStepNumber()).toBe(7);
    expect(t.cambios).toEqual(['Work']);
    expect(t.habla[t.habla.length - 1]).toBe('Work, 4 de 8');
    expect(t.ticks[t.ticks.length - 1]).toBe(20);
  });

  it('solo suena UN fin de step al cruzar varios, no uno por cada step saltado', () => {
    const t = tabata();
    t.engine.play();
    t.en(90_000);
    // start del step 0 + end del primer step cerrado + start del step donde aterriza
    expect(t.sonidos).toEqual(['default', 'default', 'default']);
  });

  it('a mitad de step: [30,20,20,60], poll a 10 s y 90 s de fondo aterriza en el step 4 con 30 restantes', () => {
    const t = armar([step(0, 'work', 30), step(1, 'rest', 20), step(2, 'work', 20), step(3, 'rest', 60)]);
    t.engine.play();
    t.en(10_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(20);
    t.en(100_000);
    // 100 s cubren 30 + 20 + 20 = 70 s y dejan 30 s corridos del step 4 (60 s).
    expect(t.engine.getCurrentStepNumber()).toBe(4);
    expect(t.ticks[t.ticks.length - 1]).toBe(30);
    expect(t.engine.getRemainingSeconds(T0 + 100_000)).toBe(30);
    // Un solo onStepChange (el del step donde aterriza) y un solo sonido de fin.
    expect(t.cambios).toEqual(['rest 3']);
    expect(t.sonidos.filter((x) => x === 'end')).toHaveLength(1);
    expect(t.sonidos).toEqual(['start', 'end', 'start']);
    expect(t.engine.getState()).toBe('running');
  });

  it('si el salto pasa el final, la rutina completa y la duración real es la del cierre', () => {
    const t = tabata();
    t.engine.play();
    t.en(600_000);
    expect(t.engine.getState()).toBe('completed');
    const st = t.stats();
    expect(st).not.toBeNull();
    expect(st!.actualDurationSeconds).toBe(230);
    expect(st!.stepsCompleted).toBe(15);
    expect(st!.stepsSkipped).toBe(0);
    expect(t.habla[t.habla.length - 1]).toBe('Rutina completada. Excelente trabajo.');
  });
});

describe('RoutineEngine: reloj del sistema hacia atrás (ajuste NTP)', () => {
  it('el step se congela en lo que llevaba y no vuelve a su duración completa', () => {
    const t = tabata();
    t.engine.play();
    t.en(10_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(10);
    // El sistema retrocede 5 s: sin re-anclaje el work volvía a marcar 20.
    t.en(5_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(10);
    expect(t.engine.getRemainingSeconds(T0 + 5_000)).toBe(10);
    t.en(8_000);
    expect(t.ticks).toEqual([10, 7]);
    expect(t.engine.getCurrentStepNumber()).toBe(1);
  });
});

describe('RoutineEngine: fin exacto de la rutina', () => {
  it('completa justo a los 230 s y no antes', () => {
    const t = tabata();
    t.engine.play();
    t.en(229_999);
    expect(t.engine.getState()).toBe('running');
    t.en(230_000);
    expect(t.engine.getState()).toBe('completed');
    expect(t.stats()!.totalDurationSeconds).toBe(230);
    expect(t.stats()!.actualDurationSeconds).toBe(230);
    expect(t.engine.getProgress()).toBe(1);
  });

  it('con pausas, la duración real incluye la pausa (reloj de pared) pero los steps no', () => {
    const t = tabata();
    t.engine.play();
    t.en(10_000);
    t.engine.pause();
    t.mover(70_000);
    t.engine.play();
    t.en(290_000);
    expect(t.engine.getState()).toBe('completed');
    expect(t.stats()!.actualDurationSeconds).toBe(290);
  });
});

describe('RoutineEngine: skip, restart step y restart', () => {
  it('skip en pausa deja el nuevo step con su duración completa y play lo arranca desde ahí', () => {
    const t = tabata();
    t.engine.play();
    t.en(5_000);
    t.engine.pause();
    t.engine.skip();
    expect(t.engine.getCurrentStepNumber()).toBe(2);
    expect(t.engine.getRemainingSeconds(T0 + 50_000)).toBe(10);
    expect(t.stats()).toBeNull();
    t.mover(50_000);
    t.engine.play();
    t.en(54_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(6);
  });

  it('skip corriendo anuncia el step nuevo y cuenta como saltado', () => {
    const t = tabata();
    t.engine.play();
    t.en(5_000);
    t.engine.skip();
    expect(t.cambios).toEqual(['Rest']);
    expect(t.habla[t.habla.length - 1]).toBe('Rest, 1 de 8');
    t.en(5_250);
    expect(t.ticks[t.ticks.length - 1]).toBe(10);
    t.en(600_000);
    expect(t.stats()!.stepsSkipped).toBe(1);
    expect(t.stats()!.stepsCompleted).toBe(14);
  });

  it('restartCurrentStep vuelve a la duración completa del step en curso', () => {
    const t = tabata();
    t.engine.play();
    t.en(12_000);
    t.engine.restartCurrentStep();
    expect(t.ticks[t.ticks.length - 1]).toBe(20);
    expect(t.engine.getRemainingSeconds(T0 + 12_000)).toBe(20);
    t.en(13_000);
    expect(t.ticks[t.ticks.length - 1]).toBe(19);
  });

  it('restart vuelve a idle con el reloj en cero', () => {
    const t = tabata();
    t.engine.play();
    t.en(45_000);
    t.engine.restart();
    expect(t.engine.getState()).toBe('idle');
    expect(t.engine.getCurrentStepNumber()).toBe(1);
    expect(t.engine.getRemainingSeconds(T0 + 45_000)).toBe(20);
    expect(t.engine.getProgress()).toBe(0);
  });
});

describe('RoutineEngine: fronteras raras', () => {
  it('steps de 0 s no cuelgan el motor: se cruzan de inmediato', () => {
    const t = armar([step(0, 'prep', 0), step(1, 'prep', 0), step(2, 'work', 5)]);
    t.engine.play();
    t.en(250);
    expect(t.engine.getCurrentStepNumber()).toBe(3);
    expect(t.ticks[t.ticks.length - 1]).toBe(5);
    t.en(5_000);
    expect(t.engine.getState()).toBe('completed');
  });

  it('sin steps, play no hace nada', () => {
    const t = armar([]);
    t.engine.play();
    expect(t.engine.getState()).toBe('idle');
    expect(t.estados).toEqual([]);
  });

  it('el progreso del step es fraccional y acotado a 1', () => {
    const t = armar([step(0, 'work', 10)]);
    t.engine.play();
    t.mover(2_500);
    expect(t.engine.getCurrentStepProgress()).toBe(0.25);
    t.mover(50_000);
    expect(t.engine.getCurrentStepProgress()).toBe(1);
  });

  it('las callbacks se pueden espiar con vi.fn (contrato del hook)', () => {
    const onTick = vi.fn();
    const cb: EngineCallbacks = {
      onTick, onStateChange: vi.fn(), onStepChange: vi.fn(), onComplete: vi.fn(), onSpeak: vi.fn(), onSound: vi.fn(),
    };
    const e = new RoutineEngine([step(0, 'work', 3)], cb, { ahora: () => T0 });
    vivos.push(e);
    e.play();
    e.sincronizar(T0 + 1_000);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick.mock.calls[0][0]).toBe(2);
  });
});
