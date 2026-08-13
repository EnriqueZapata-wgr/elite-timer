/**
 * hiit-presets-core — la puerta INTERVALOS construye rutinas de puro tiempo
 * (Ola 2 Fitness PR2). El contrato importante: NINGÚN preset trae
 * matrix_slug, así que el árbitro del runner las manda al modo timer de
 * /session (routineUsesClipRunner === false).
 */
import { describe, it, expect } from 'vitest';
import { buildPresetRoutine, HIIT_PRESETS } from '../hiit-presets-core';
import { routineUsesClipRunner } from '../routine-bridge-core';
import { flattenRoutine } from '@/src/engine/flatten';

describe('buildPresetRoutine', () => {
  it('Tabata: grupo de 8 rondas con trabajo 20s y descanso 10s', () => {
    const r = buildPresetRoutine('Tabata clásico', { work: '20', rest: '10', rounds: '8' });
    expect(r.mode).toBe('timer');
    expect(r.blocks).toHaveLength(1);
    const grupo = r.blocks[0];
    expect(grupo.type).toBe('group');
    expect(grupo.rounds).toBe(8);
    expect(grupo.children).toHaveLength(2);
    expect(grupo.children![0]).toMatchObject({ type: 'work', duration_seconds: 20 });
    expect(grupo.children![1]).toMatchObject({ type: 'rest', duration_seconds: 10 });
  });

  it('EMOM: intervalos de 60s sin descanso intercalado', () => {
    const r = buildPresetRoutine('EMOM 10 min', { work: '60', rest: '0', rounds: '10' });
    const grupo = r.blocks[0];
    expect(grupo.rounds).toBe(10);
    expect(grupo.children).toHaveLength(1);
    expect(grupo.children![0]).toMatchObject({ type: 'work', duration_seconds: 60 });
  });

  it('AMRAP: un solo bloque de duración corrida', () => {
    const r = buildPresetRoutine('AMRAP 15 min', { duration: '900' });
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatchObject({ type: 'work', duration_seconds: 900, rounds: 1 });
  });

  it('cada preset del catálogo aplana a steps ejecutables', () => {
    for (const p of HIIT_PRESETS) {
      const r = buildPresetRoutine(p.name, p.params);
      const steps = flattenRoutine(r);
      expect(steps.length, `${p.name} sin steps`).toBeGreaterThan(0);
      expect(steps.every((s) => s.durationSeconds > 0)).toBe(true);
    }
  });

  it('ningún preset trae matriz: el árbitro los manda al modo timer', () => {
    for (const p of HIIT_PRESETS) {
      const r = buildPresetRoutine(p.name, p.params);
      expect(routineUsesClipRunner(r), `${p.name} no debe usar el runner con clip`).toBe(false);
    }
  });
});
