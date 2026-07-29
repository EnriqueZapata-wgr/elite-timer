/**
 * MB-14 · Pieza 3 — la frase al cierre y sus tres reglas.
 *
 *  1. Sin nombre de autor (toda voz en la app es de ATP).
 *  2. Contextual al cuadrante + rotación determinista por fecha local.
 *  3. Con señal de crisis NO hay frase — se replica el gate exacto de
 *     checkin.tsx (crisisSelected via isCrisisOrigin), igual que en el
 *     harness A-5 de MB-12.
 *
 * Extra de entrega: cero em dash en copy de usuario.
 */
import { describe, it, expect } from 'vitest';
import { CLOSING_PHRASES, closingPhraseForDate } from '../checkin-closing-phrases';
import { QUADRANTS, type QuadrantKey } from '../emotions-library';
import { isCrisisOrigin } from '../../services/emotion-navigation-core';

const ALL_QUADRANTS = Object.keys(QUADRANTS) as QuadrantKey[];

describe('los bancos por cuadrante', () => {
  it('hay banco para los cuatro cuadrantes, de 8 a 10 frases', () => {
    for (const q of ALL_QUADRANTS) {
      const bank = CLOSING_PHRASES[q];
      expect(bank.length).toBeGreaterThanOrEqual(8);
      expect(bank.length).toBeLessThanOrEqual(10);
    }
  });

  it('cortas: una o dos líneas, nunca un párrafo', () => {
    for (const q of ALL_QUADRANTS) {
      for (const phrase of CLOSING_PHRASES[q]) {
        expect(phrase.length).toBeGreaterThan(0);
        expect(phrase.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it('SIN nombre de autor — la frase se sostiene sola', () => {
    const authors = /s[eé]neca|marco aurelio|epicteto|arist[oó]teles|plat[oó]n|nietzsche|freud|jung|confucio|buda|gandhi|einstein/i;
    for (const q of ALL_QUADRANTS) {
      for (const phrase of CLOSING_PHRASES[q]) {
        expect(phrase).not.toMatch(authors);
      }
    }
  });

  it('cero em dash (ni en dash) en copy de usuario', () => {
    for (const q of ALL_QUADRANTS) {
      for (const phrase of CLOSING_PHRASES[q]) {
        expect(phrase).not.toMatch(/[—–]/);
      }
    }
  });
});

describe('rotación determinista por fecha local', () => {
  it('mismo día + mismo cuadrante → la MISMA frase (verificación 7 del brief)', () => {
    for (const q of ALL_QUADRANTS) {
      const a = closingPhraseForDate(q, '2026-07-29');
      const b = closingPhraseForDate(q, '2026-07-29');
      expect(a).toBe(b);
      expect(CLOSING_PHRASES[q]).toContain(a);
    }
  });

  it('la frase ROTA entre días (no se queda pegada una sola)', () => {
    for (const q of ALL_QUADRANTS) {
      const seen = new Set<string>();
      for (let d = 1; d <= 30; d++) {
        seen.add(closingPhraseForDate(q, `2026-08-${String(d).padStart(2, '0')}`));
      }
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it('cuadrantes distintos no rotan en fase: el mismo día da encuadres distintos', () => {
    // A quien nombró enojo le toca un encuadre distinto que a quien nombró
    // tristeza: bancos separados, y la semilla incluye el cuadrante.
    const day = '2026-07-29';
    const phrases = ALL_QUADRANTS.map((q) => closingPhraseForDate(q, day));
    expect(new Set(phrases).size).toBe(ALL_QUADRANTS.length);
  });
});

describe('la regla que no se negocia: con crisis NO hay frase', () => {
  /** Réplica exacta del gate de checkin.tsx (mismo patrón que el harness A-5). */
  function closingPhraseView(selectedEmotions: string[], quadrant: QuadrantKey | null) {
    const crisisSelected = selectedEmotions.some(isCrisisOrigin);
    const phraseVisible = !crisisSelected && quadrant !== null;
    return { crisisSelected, phraseVisible };
  }

  it('"Sin esperanza" (hopeless): acompañamiento sin frase de cierre', () => {
    const { crisisSelected, phraseVisible } = closingPhraseView(['hopeless'], 'low_unpleasant');
    expect(crisisSelected).toBe(true);
    expect(phraseVisible).toBe(false);
  });

  it('cualquier emoción de crisis suprime la frase, aunque haya otra normal', () => {
    for (const id of ['hopeless', 'depressed', 'trapped', 'empty', 'helpless', 'numb', 'abandoned', 'panicked']) {
      expect(closingPhraseView([id], 'low_unpleasant').phraseVisible).toBe(false);
      expect(closingPhraseView(['sad', id], 'low_unpleasant').phraseVisible).toBe(false);
    }
  });

  it('emoción normal: sí hay frase, del banco de su cuadrante', () => {
    const { phraseVisible } = closingPhraseView(['sad'], 'low_unpleasant');
    expect(phraseVisible).toBe(true);
    const phrase = closingPhraseForDate('low_unpleasant', '2026-07-29');
    expect(CLOSING_PHRASES.low_unpleasant).toContain(phrase);
  });
});
