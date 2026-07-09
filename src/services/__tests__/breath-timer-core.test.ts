import { describe, it, expect } from 'vitest';
import {
  advanceBreathSecond,
  phaseColor,
  phaseTargetScale,
  templateTotalSeconds,
  validateBreathingTemplate,
  INITIAL_STEP,
  type BreathStep,
} from '@/src/services/breath-timer-core';
import { BREATHING_LIBRARY, type BreathingTemplate } from '@/src/data/breathing-library';

const MINI = {
  cycles: 2,
  phases: [
    { action: 'inhale' as const, seconds: 2, label: 'Inhala' },
    { action: 'exhale' as const, seconds: 1, label: 'Exhala' },
  ],
};

function runTicks(
  n: number,
  template: Pick<BreathingTemplate, 'cycles' | 'phases'> = MINI,
): { step: BreathStep; events: string[] } {
  let step = INITIAL_STEP;
  const events: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = advanceBreathSecond(step, template);
    events.push(r.event);
    if (r.event === 'completed') return { step, events };
    step = r.next;
  }
  return { step, events };
}

describe('advanceBreathSecond — máquina de estados (T2)', () => {
  it('tick dentro de la fase incrementa segundos', () => {
    const { next, event } = advanceBreathSecond(INITIAL_STEP, MINI);
    expect(event).toBe('tick');
    expect(next).toEqual({ cycleIdx: 0, phaseIdx: 0, secondsInPhase: 1 });
  });

  it('al agotar la fase avanza a la siguiente (phase_advanced)', () => {
    const { step, events } = runTicks(2);
    expect(events).toEqual(['tick', 'phase_advanced']);
    expect(step).toEqual({ cycleIdx: 0, phaseIdx: 1, secondsInPhase: 0 });
  });

  it('al agotar la última fase avanza de ciclo (cycle_advanced)', () => {
    const { step, events } = runTicks(3);
    expect(events[2]).toBe('cycle_advanced');
    expect(step).toEqual({ cycleIdx: 1, phaseIdx: 0, secondsInPhase: 0 });
  });

  it('al agotar el último ciclo completa', () => {
    // ciclo = 3 ticks (2s inhala + 1s exhala) → 2 ciclos completan al 6º tick
    const { events } = runTicks(10);
    expect(events[events.length - 1]).toBe('completed');
    expect(events.filter(e => e === 'completed')).toHaveLength(1);
    expect(events).toHaveLength(6);
  });

  it('la duración simulada coincide con templateTotalSeconds para TODA la biblioteca', () => {
    for (const t of BREATHING_LIBRARY) {
      const total = templateTotalSeconds(t);
      const { events } = runTicks(total + 10, t);
      expect(events).toHaveLength(total);
      expect(events[events.length - 1]).toBe('completed');
    }
  });
});

describe('phaseColor — cambio de color por fase (requisito Enrique)', () => {
  it('verde inhala / azul retención / naranja exhala — todos distintos', () => {
    expect(phaseColor('inhale')).toBe('#A8E02A');
    expect(phaseColor('hold')).toBe('#5B9BD5');
    expect(phaseColor('exhale')).toBe('#EF9F27');
    const colors = ['inhale', 'hold', 'exhale', 'hold_empty'].map(a => phaseColor(a as any));
    expect(new Set(colors).size).toBe(4);
  });
});

describe('phaseTargetScale — anillo que respira', () => {
  it('crece al inhalar, decrece al exhalar, se mantiene en retención', () => {
    expect(phaseTargetScale('inhale')).toBeGreaterThan(1);
    expect(phaseTargetScale('exhale')).toBe(1);
    expect(phaseTargetScale('hold')).toBeNull();
    expect(phaseTargetScale('hold_empty')).toBeNull();
  });
});

describe('validateBreathingTemplate', () => {
  it('acepta templates válidos y rechaza malformados', () => {
    expect(validateBreathingTemplate(MINI)).toBe(true);
    expect(validateBreathingTemplate({ cycles: 0, phases: MINI.phases })).toBe(false);
    expect(validateBreathingTemplate({ cycles: 3, phases: [] })).toBe(false);
    expect(validateBreathingTemplate({ cycles: 3, phases: [{ action: 'inhale', seconds: 0, label: 'x' }] })).toBe(false);
  });
});

describe('BREATHING_LIBRARY — biblioteca real (T2)', () => {
  it('incluye las 4 técnicas del sprint: 4-7-8, box, coherencia 5-5, wim hof lite', () => {
    const ids = BREATHING_LIBRARY.map(t => t.id);
    expect(ids).toContain('478-relaxation');
    expect(ids).toContain('box-4');
    expect(ids).toContain('coherent-5');
    expect(ids).toContain('wim-hof-lite');
  });

  it('todas las técnicas son estructuralmente válidas y con metadata completa', () => {
    for (const t of BREATHING_LIBRARY) {
      expect(validateBreathingTemplate(t), t.id).toBe(true);
      expect(['principiante', 'intermedio', 'avanzado']).toContain(t.level);
      expect(t.benefit.length).toBeGreaterThan(0);
      expect(t.closingMessage.length).toBeGreaterThan(0);
    }
  });

  it('ids únicos', () => {
    const ids = BREATHING_LIBRARY.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('coherencia 5-5: fases simétricas de 5s', () => {
    const c = BREATHING_LIBRARY.find(t => t.id === 'coherent-5')!;
    expect(c.phases).toHaveLength(2);
    expect(c.phases.every(p => p.seconds === 5)).toBe(true);
  });

  it('wim hof lite: avanzado + contraindicaciones de embarazo y cardíacas', () => {
    const wh = BREATHING_LIBRARY.find(t => t.id === 'wim-hof-lite')!;
    expect(wh.level).toBe('avanzado');
    const joined = (wh.contraindications ?? []).join(' ').toLowerCase();
    expect(joined).toContain('embarazo');
    expect(joined).toContain('card');
    expect(joined).toContain('agua');
  });
});
