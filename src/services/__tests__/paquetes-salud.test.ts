/**
 * MB-29 P6.5 — activar un paquete de salud instala su grupo completo POR EL
 * CAMINO DE SIEMPRE (installApp / installAppGridOnly), sin mecanismo
 * paralelo. El barrido de nombres (cero padecimientos) vive en
 * packs-registry.test.ts y ya cubre PAQUETES_SALUD.
 *
 * Dos capas:
 *  · Plan puro: para cada paquete, TODA app de `instala` sale del plan por
 *    una de las dos vías de instalación (ninguna se queda fuera).
 *  · Servicio: aplicarPack ejecuta esas vías con las apps del paquete —
 *    la mutación que instale por otro lado (o deje apps sin instalar)
 *    truena aquí.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  installed: [] as string[],
  gridOnly: [] as string[],
}));

// pack-service emite eventos al prescribir (casos de uso, paso 5b), así que
// ahora importa react-native. Sin este mock vitest intenta parsear el
// fuente Flow de react-native y la suite ni siquiera colecta. Es el mismo
// mock que ya usan los otros nueve tests de servicios que emiten.
vi.mock('react-native', () => ({ DeviceEventEmitter: { emit: vi.fn() } }));
vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));
vi.mock('@/src/services/hoy/install-service', () => ({
  installApp: async (_u: string, app: string) => { state.installed.push(app); return { ok: true }; },
  installAppGridOnly: async (_u: string, app: string) => { state.gridOnly.push(app); return { ok: true }; },
}));
vi.mock('@/src/services/hoy/electron-prefs-service', () => ({
  getElectronPrefs: async () => ({ booleans: [], quants: [] }),
  setElectronPrefs: async () => ({ ok: true }),
  applyElectronToggle: (list: string[], key: string, on: boolean) =>
    on ? [...list.filter((k) => k !== key), key] : list.filter((k) => k !== key),
}));
vi.mock('@/src/services/hoy/habit-times-service', () => ({
  setHabitTimeRegla: async () => true,
}));
vi.mock('@/src/services/hoy/habit-states-service', () => ({
  reactivarHabitos: async () => {},
}));
vi.mock('@/src/services/protein-goal-service', () => ({
  setProteinGoalG: async () => true,
  DEFAULT_PROTEIN_GOAL_G: 120,
}));
vi.mock('@/src/services/hydration-service', () => ({
  setUserWaterGoal: async () => true,
  HYDRATION_DEFAULTS: { waterGoalMl: 2500 },
}));
vi.mock('@/src/services/fasting-service', () => ({
  setFastingGoalHours: async () => true,
  DEFAULT_FASTING_GOAL_HOURS: 16,
}));
vi.mock('@/src/services/app-avisos-service', () => ({
  getAppAviso: async () => ({ enabled: false, time: '08:00' }),
  updateAppAviso: async () => ({ ok: true }),
}));

import { PAQUETES_SALUD } from '@/src/constants/packs';
import { buildPackPlan } from '@/src/services/pack-core';
import { aplicarPack } from '@/src/services/pack-service';

beforeEach(() => {
  state.installed = [];
  state.gridOnly = [];
  state.fake = makeFakeSupabase({
    user_packs: { data: [], error: null },
    // Usuario con todo apagado: si algo ya estuviera encendido, el motor lo
    // omite por idempotencia (contrato de reconcilarPack, no de este test).
    user_day_preferences: {
      data: {
        active_boolean_electrons: [],
        active_quantitative_electrons: [],
        installed_apps: [],
        goals: {},
      },
      error: null,
    },
  });
});

describe('plan puro: nada de `instala` se queda fuera', () => {
  it.each(PAQUETES_SALUD.map((p) => [p.key] as const))('%s', (key) => {
    const pack = PAQUETES_SALUD.find((p) => p.key === key)!;
    const plan = buildPackPlan(key, 'con_todo', '07:00', '23:00');
    const porInstalar = [...plan.installFull, ...plan.installGrid].sort();
    expect(porInstalar).toEqual([...pack.instala].sort());
  });
});

describe('aplicarPack: el camino de installApp, sin atajos', () => {
  it('cuidar-glucosa instala su grupo completo de un jalón', async () => {
    const pack = PAQUETES_SALUD.find((p) => p.key === 'cuidar-glucosa')!;
    const r = await aplicarPack('u1', 'cuidar-glucosa', {
      intensidad: 'con_todo', despertar: '07:00', dormir: '23:00',
    });
    expect(r.ok).toBe(true);
    const instaladas = [...state.installed, ...state.gridOnly].sort();
    expect(instaladas).toEqual([...pack.instala].sort());
    // El registro queda en user_packs (idempotencia + memoria de ARGOS).
    expect(state.fake.calls.some((c: any) => c.table === 'user_packs' && c.method === 'upsert')).toBe(true);
  });

  it.each(PAQUETES_SALUD.map((p) => [p.key] as const))(
    '%s: cada app pasa por una vía de instalación',
    async (key) => {
      const pack = PAQUETES_SALUD.find((p) => p.key === key)!;
      const r = await aplicarPack('u1', key, { intensidad: 'con_todo', despertar: '06:30', dormir: '22:30' });
      expect(r.ok).toBe(true);
      const instaladas = new Set([...state.installed, ...state.gridOnly]);
      for (const app of pack.instala) {
        expect(instaladas.has(app), `${key} dejó "${app}" sin instalar`).toBe(true);
      }
    },
  );
});
