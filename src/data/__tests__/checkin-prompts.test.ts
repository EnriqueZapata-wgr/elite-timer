import { describe, it, expect } from 'vitest';
import {
  CHECKIN_PROMPTS,
  promptForDate,
  buildCheckinJournalEntry,
} from '@/src/data/checkin-prompts';

describe('CHECKIN_PROMPTS — prompts del día (T4)', () => {
  it('hay exactamente 10 prompts, únicos y no vacíos', () => {
    expect(CHECKIN_PROMPTS).toHaveLength(10);
    expect(new Set(CHECKIN_PROMPTS).size).toBe(10);
    CHECKIN_PROMPTS.forEach(p => expect(p.trim().length).toBeGreaterThan(0));
  });
});

describe('promptForDate — rotación determinista', () => {
  it('la misma fecha siempre devuelve el mismo prompt', () => {
    expect(promptForDate('2026-07-10')).toBe(promptForDate('2026-07-10'));
  });

  it('días consecutivos avanzan por la lista (sin repetir hasta agotar los 10)', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 10; d++) {
      seen.add(promptForDate(`2026-07-${String(d).padStart(2, '0')}`));
    }
    expect(seen.size).toBe(10);
  });

  it('ciclo completo: día N y día N+10 devuelven el mismo prompt', () => {
    expect(promptForDate('2026-07-01')).toBe(promptForDate('2026-07-11'));
  });

  it('fecha inválida cae al primer prompt (no crashea)', () => {
    expect(promptForDate('garbage')).toBe(CHECKIN_PROMPTS[0]);
  });
});

describe('buildCheckinJournalEntry — puente check-in → journal', () => {
  const BASE = {
    userId: 'u1',
    date: '2026-07-10',
    quadrant: 'low_pleasant',
    emotionLabels: ['Tranquilo', 'Agradecido'],
    note: '  Hoy me sentí en paz.  ',
    prompt: '¿Cómo está tu cuerpo ahora mismo?',
  };

  it('con nota → row completa con tag checkin + cuadrante + emociones', () => {
    const row = buildCheckinJournalEntry(BASE)!;
    expect(row).not.toBeNull();
    expect(row.user_id).toBe('u1');
    expect(row.date).toBe('2026-07-10');
    expect(row.journal_type).toBe('checkin');
    expect(row.content).toBe('Hoy me sentí en paz.'); // trimmed
    expect(row.prompt).toBe(BASE.prompt);
    expect(row.tags).toEqual(['checkin', 'low_pleasant', 'Tranquilo', 'Agradecido']);
  });

  it('sin nota (o solo espacios) → null: no se crea entrada de journal', () => {
    expect(buildCheckinJournalEntry({ ...BASE, note: '' })).toBeNull();
    expect(buildCheckinJournalEntry({ ...BASE, note: '   ' })).toBeNull();
  });

  it('máximo 2 emociones en tags', () => {
    const row = buildCheckinJournalEntry({ ...BASE, emotionLabels: ['a', 'b', 'c'] })!;
    expect((row.tags as string[]).length).toBe(4); // checkin + quadrant + 2
  });
});
