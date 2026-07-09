import { describe, it, expect } from 'vitest';
import {
  phaseIndexAt,
  secondsToNextPrompt,
  validateMeditationTemplate,
  isSilenceSession,
} from '@/src/services/meditation-core';
import { MEDITATION_LIBRARY } from '@/src/data/meditation-library';

const PHASES = [
  { startSeconds: 0, text: 'Cierra los ojos.' },
  { startSeconds: 60, text: 'Respira.' },
  { startSeconds: 180, text: 'Regresa.' },
];

describe('phaseIndexAt — scheduling de prompts (T3)', () => {
  it('devuelve la fase activa según el tiempo transcurrido', () => {
    expect(phaseIndexAt(0, PHASES)).toBe(0);
    expect(phaseIndexAt(59, PHASES)).toBe(0);
    expect(phaseIndexAt(60, PHASES)).toBe(1);
    expect(phaseIndexAt(179, PHASES)).toBe(1);
    expect(phaseIndexAt(180, PHASES)).toBe(2);
    expect(phaseIndexAt(9999, PHASES)).toBe(2);
  });
});

describe('secondsToNextPrompt', () => {
  it('cuenta regresiva al siguiente prompt; null cuando ya no hay', () => {
    expect(secondsToNextPrompt(0, PHASES)).toBe(60);
    expect(secondsToNextPrompt(100, PHASES)).toBe(80);
    expect(secondsToNextPrompt(200, PHASES)).toBeNull();
  });
});

describe('validateMeditationTemplate', () => {
  it('acepta un template válido', () => {
    expect(validateMeditationTemplate({ durationMinutes: 5, phases: PHASES })).toBe(true);
  });
  it('rechaza fases desordenadas, fuera de rango o sin texto', () => {
    expect(validateMeditationTemplate({
      durationMinutes: 5,
      phases: [{ startSeconds: 60, text: 'b' }, { startSeconds: 30, text: 'a' }],
    })).toBe(false);
    expect(validateMeditationTemplate({
      durationMinutes: 1,
      phases: [{ startSeconds: 0, text: 'a' }, { startSeconds: 90, text: 'fuera' }],
    })).toBe(false);
    expect(validateMeditationTemplate({
      durationMinutes: 5,
      phases: [{ startSeconds: 0, text: '' }],
    })).toBe(false);
    expect(validateMeditationTemplate({ durationMinutes: 0, phases: PHASES })).toBe(false);
    expect(validateMeditationTemplate({ durationMinutes: 5, phases: [] })).toBe(false);
  });
});

describe('MEDITATION_LIBRARY — biblioteca real (T3)', () => {
  it('incluye las 4 sesiones de silencio (5/10/15/20 min)', () => {
    const ids = MEDITATION_LIBRARY.map(m => m.id);
    expect(ids).toContain('silence-5');
    expect(ids).toContain('silence-10');
    expect(ids).toContain('silence-15');
    expect(ids).toContain('silence-20');
  });

  it('cubre los tipos guiados requeridos: body scan, focus, sleep-prep, mindfulness', () => {
    const types = new Set(MEDITATION_LIBRARY.map(m => m.type));
    expect(types.has('body_scan')).toBe(true);
    expect(types.has('focus')).toBe(true);
    expect(types.has('mindfulness')).toBe(true);
    // sleep prep = body scan nocturno (categoría rest)
    expect(MEDITATION_LIBRARY.some(m => m.category === 'rest')).toBe(true);
  });

  it('TODOS los templates son estructuralmente válidos (prompts cronológicos, dentro del timer)', () => {
    for (const m of MEDITATION_LIBRARY) {
      expect(validateMeditationTemplate(m), m.id).toBe(true);
    }
  });

  it('ids únicos y al menos 12 sesiones (4 silencio + 8+ guiadas)', () => {
    const ids = MEDITATION_LIBRARY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(12);
  });

  it('isSilenceSession distingue silencio de guiadas', () => {
    expect(isSilenceSession({ type: 'silence' })).toBe(true);
    expect(isSilenceSession({ type: 'mindfulness' })).toBe(false);
  });

  it('las sesiones de silencio solo tienen prompts de apertura y cierre', () => {
    for (const m of MEDITATION_LIBRARY.filter(x => x.type === 'silence')) {
      expect(m.phases).toHaveLength(2);
      expect(m.phases[0].startSeconds).toBe(0);
    }
  });
});
