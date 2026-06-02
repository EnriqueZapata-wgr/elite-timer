import { describe, it, expect, vi } from 'vitest';

// goal-tree importa supabase + anthropic-client (→ expo-constants). Los mockeamos
// para no cargar react-native/expo en el entorno node.
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/services/anthropic-client', () => ({ callAnthropic: vi.fn() }));

import { extractJson, progressToTrafficLight } from '../goal-tree';

describe('goal-tree — extractJson (pure)', () => {
  it('parsea JSON crudo', () => {
    expect(JSON.parse(extractJson('{"a":1}'))).toEqual({ a: 1 });
  });

  it('tolera fences markdown ```json', () => {
    expect(JSON.parse(extractJson('```json\n{"a":1}\n```'))).toEqual({ a: 1 });
  });

  it('throw cuando no hay JSON', () => {
    expect(() => extractJson('texto sin JSON')).toThrow();
  });
});

describe('goal-tree — progressToTrafficLight (pure, ratio 0-1)', () => {
  it('0.9 → verde', () => {
    expect(progressToTrafficLight(0.9)).toBe('verde');
  });

  it('0.6 → amarillo', () => {
    expect(progressToTrafficLight(0.6)).toBe('amarillo');
  });

  it('0.3 → rojo', () => {
    expect(progressToTrafficLight(0.3)).toBe('rojo');
  });
});
