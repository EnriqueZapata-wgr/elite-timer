/**
 * MB-28C P8 — logAudioSession: la sesión y el electrón siguen su camino
 * (Pieza 1 no lo tocó; este contrato lo deja amarrado).
 *
 * - La sesión SIEMPRE se registra en mind_sessions (salvo binaural).
 * - El type respeta el CHECK de la mig 049 Y alimenta Rachas (Pieza 7):
 *   meditacion/descanso/mantra/visualizacion → 'meditation';
 *   respiracion → 'breathing'.
 * - El electrón solo con escucha efectiva ≥80%, por awardPracticeElectron
 *   (el camino de siempre) — nunca sin sesión registrada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AudioPiece } from '@/src/services/mente-audio-service-types';

const state = vi.hoisted(() => ({
  inserts: [] as { table: string; payload: any }[],
  insertError: null as unknown,
  awards: [] as { userId: string; source: string }[],
  awardResult: 'awarded_first' as string,
}));

vi.mock('react-native', () => ({
  DeviceEventEmitter: { emit: () => {} },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        state.inserts.push({ table, payload });
        return Promise.resolve({ error: state.insertError });
      },
    }),
  },
}));
vi.mock('@/src/services/electron-service', () => ({
  awardPracticeElectron: async (userId: string, source: string) => {
    state.awards.push({ userId, source });
    return state.awardResult;
  },
}));

import { logAudioSession } from '@/src/services/mente-audio-service';

function piece(overrides: Partial<AudioPiece> = {}): AudioPiece {
  return {
    id: 'p1', slug: 'gratitud', titulo: 'Gratitud', subtitulo: null,
    categoria: 'meditacion', duracion_seg: 600, voz: null, imagen_path: null,
    orden: 1, tier: 'base', hard_gate: false,
    ...overrides,
  } as AudioPiece;
}

beforeEach(() => {
  state.inserts = [];
  state.insertError = null;
  state.awards = [];
  state.awardResult = 'awarded_first';
});

describe('logAudioSession — sesión + electrón', () => {
  it('≥80% efectivo: registra mind_sessions type meditation Y otorga el e-', async () => {
    const out = await logAudioSession('u1', piece(), 540); // 90%
    expect(out).toBe('awarded_first');
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe('mind_sessions');
    expect(state.inserts[0].payload).toMatchObject({
      user_id: 'u1',
      type: 'meditation',
      template_id: 'audio_gratitud',
      duration_seconds: 540,
    });
    expect(state.awards).toEqual([{ userId: 'u1', source: 'meditation' }]);
  });

  it('<80%: la sesión SÍ se registra, el e- NO se pide', async () => {
    const out = await logAudioSession('u1', piece(), 300); // 50%
    expect(out).toBe('not_eligible');
    expect(state.inserts).toHaveLength(1);
    expect(state.awards).toHaveLength(0);
  });

  it('mantra, visualización y descanso cuentan como meditation (alimentan su Racha)', async () => {
    for (const categoria of ['mantra', 'visualizacion', 'descanso'] as const) {
      state.inserts = [];
      await logAudioSession('u1', piece({ categoria }), 600);
      expect(state.inserts[0].payload.type, categoria).toBe('meditation');
    }
  });

  it('respiración registra type breathing y el e- sale como breathwork', async () => {
    await logAudioSession('u1', piece({ categoria: 'respiracion' }), 600);
    expect(state.inserts[0].payload.type).toBe('breathing');
    expect(state.awards).toEqual([{ userId: 'u1', source: 'breathwork' }]);
  });

  it('binaural: jamás mind_sessions ni electrón', async () => {
    const out = await logAudioSession('u1', piece({ categoria: 'binaural' }), 600);
    expect(out).toBe('not_eligible');
    expect(state.inserts).toHaveLength(0);
    expect(state.awards).toHaveLength(0);
  });

  it('si el insert falla NO se otorga electrón (nunca e- sin sesión)', async () => {
    state.insertError = { message: 'RLS' };
    const out = await logAudioSession('u1', piece(), 600);
    expect(out).toBe('session_error');
    expect(state.awards).toHaveLength(0);
  });
});
