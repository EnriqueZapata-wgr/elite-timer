/**
 * master-quiz-core — guards del motor de ramificación + scoring (Mega-Sprint D).
 * Incluye la integración real con personalize-interventions (fenotipo consumible).
 */
import { describe, it, expect } from 'vitest';
import {
  orderedVisible, nextQuestion, isVisible, computeProgress, isComplete,
  scoreToPhenotype, activatedFollowUps, quizPhenotypeToMotorPhenotype, type QuizContext,
} from '../master-quiz-core';
import { MASTER_QUIZ_BY_CODE } from '@/src/constants/master-quiz-bank';
import { personalizeInterventions } from '@/src/services/interventions/personalize-interventions';

const MALE: QuizContext = { gender: 'male', age: 40 };
const FEMALE: QuizContext = { gender: 'female', age: 34 };

// ── Ramificación por género (SKIP) ───────────────────────────────────────────

describe('ramificación por género', () => {
  it('mujer VE las secciones femeninas (ciclo/embarazo), hombre NO', () => {
    const female = orderedVisible({}, FEMALE).map((q) => q.code);
    const male = orderedVisible({}, MALE).map((q) => q.code);
    // D9.4b (estado reproductivo · femaleOnly) + D6.4 (anticonceptivos · femaleOnly)
    expect(female).toContain('D9.4b');
    expect(female).toContain('D6.4');
    expect(male).not.toContain('D9.4b');
    expect(male).not.toContain('D6.4');
    // D12.3 (eréctil · maleOnly) al revés
    expect(male).toContain('D12.3');
    expect(female).not.toContain('D12.3');
  });

  it('isVisible respeta femaleOnly/maleOnly', () => {
    expect(isVisible(MASTER_QUIZ_BY_CODE['D9.4b'], {}, MALE)).toBe(false);
    expect(isVisible(MASTER_QUIZ_BY_CODE['D9.4b'], {}, FEMALE)).toBe(true);
  });
});

// ── Deep-dive (aparecen sólo si la respuesta lo dispara) ─────────────────────

describe('deep-dive', () => {
  it('los follow-ups NO aparecen sin la respuesta que los dispara', () => {
    const base = orderedVisible({}, MALE).map((q) => q.code);
    expect(base).not.toContain('D1.2.a'); // insomnio follow-up
    expect(base).not.toContain('D8.1.a'); // GLP-1 follow-up
  });

  it('insomnio de mantenimiento activa las sub-preguntas D1.2.a/b', () => {
    const answers = { 'D1.2': 'mantenimiento' };
    expect([...activatedFollowUps(answers)]).toEqual(expect.arrayContaining(['D1.2.a', 'D1.2.b']));
    expect(orderedVisible(answers, MALE).map((q) => q.code)).toContain('D1.2.a');
  });

  it('GLP-1 activa la sub-pregunta de motivación/anhedonia (edición Enrique)', () => {
    const answers = { 'D8.1': 'si' };
    expect(orderedVisible(answers, MALE).map((q) => q.code)).toContain('D8.1.b');
  });
});

// ── nextQuestion + progreso + completar ──────────────────────────────────────

describe('navegación y progreso', () => {
  it('nextQuestion(null) da la primera; salta las respondidas', () => {
    const first = nextQuestion({}, null, MALE);
    expect(first?.code).toBe('D1.1');
    const next = nextQuestion({ 'D1.1': 3 }, 'D1.1', MALE);
    expect(next?.code).toBe('D1.2');
  });

  it('progreso es dinámico (hombre y mujer ven distinto total)', () => {
    const pMale = computeProgress({}, MALE, 'D1.1');
    const pFemale = computeProgress({}, FEMALE, 'D1.1');
    expect(pFemale.totalVisible).not.toBe(pMale.totalVisible);
    expect(pMale.sectionTotal).toBeGreaterThan(10);
  });

  it('isComplete=false al inicio, true cuando todo lo visible está respondido/omitido', () => {
    expect(isComplete({}, MALE)).toBe(false);
    const all: Record<string, unknown> = {};
    for (const q of orderedVisible({}, MALE)) all[q.code] = 1;
    // con las base respondidas puede haber follow-ups nuevos (deep-dive) → recomputa
    let guard = 0;
    while (!isComplete(all, MALE) && guard++ < 5) {
      for (const q of orderedVisible(all, MALE)) if (!(q.code in all)) all[q.code] = 1;
    }
    expect(isComplete(all, MALE)).toBe(true);
  });
});

// ── C1 · Padecimientos: contraindicación SOLO si ACTIVO ──────────────────────

describe('C1 · padecimientos activo vs resuelto (contraindicación solo si activo)', () => {
  it('hipertensión RESUELTA no dispara flag (caso Enrique)', () => {
    const p = scoreToPhenotype({ 'D9.2': [{ condition: 'hipertension', status: 'resuelto', year: 2019 }] });
    expect(p.contraindications).not.toContain('hipertension');
    expect(p.historicalConditions).toContainEqual({ condition: 'hipertension', status: 'resuelto' });
  });

  it('cáncer EN REMISIÓN no dispara flag (caso Mariana)', () => {
    const p = scoreToPhenotype({ 'D9.2': [{ condition: 'cancer', status: 'remision' }] });
    expect(p.contraindications).not.toContain('cancer');
    expect(p.historicalConditions.some((h) => h.condition === 'cancer')).toBe(true);
  });

  it('diabetes tipo 1 ACTIVA sí dispara flag', () => {
    const p = scoreToPhenotype({ 'D9.2': [{ condition: 'diabetes_tipo_1', status: 'activo' }] });
    expect(p.contraindications).toContain('diabetes_tipo_1');
  });
});

// ── C2 · Embarazo/lactancia estado actual ────────────────────────────────────

describe('C2 · estado reproductivo actual dispara flags', () => {
  it('embarazada → flag embarazo; lactando → flag lactancia', () => {
    expect(scoreToPhenotype({ 'D9.4b': 'embarazada' }).contraindications).toContain('embarazo');
    expect(scoreToPhenotype({ 'D9.4b': 'lactando' }).contraindications).toContain('lactancia');
  });
  it('"buscando embarazo" NO dispara flag de exclusión', () => {
    expect(scoreToPhenotype({ 'D9.4b': 'buscando' }).contraindications).not.toContain('embarazo');
  });
});

// ── Scoring → dx_levels + roots + goals ──────────────────────────────────────

describe('scoreToPhenotype', () => {
  it('energía baja → dx energia bajo + cortisol_matutino_bajo', () => {
    const p = scoreToPhenotype({ 'D1.1': 1 });
    expect(p.dxLevels.find((d) => d.system === 'energia')?.level).toBe(1);
    expect(p.activatedRoots).toContain('cortisol_matutino_bajo');
  });
  it('insomnio de mantenimiento → sueño bajo + adrenalina_nocturna', () => {
    const p = scoreToPhenotype({ 'D1.2': 'mantenimiento' });
    expect(p.dxLevels.find((d) => d.system === 'sueno')?.level).toBe(2);
    expect(p.activatedRoots).toContain('adrenalina_nocturna');
  });
  it('objetivos B.1 → goals en vocabulario del motor', () => {
    const p = scoreToPhenotype({ 'B.1': ['mas_energia', 'dormir_mejor'] });
    expect(p.goals).toEqual(['mas_energia', 'dormir_mejor']);
  });
});

// ── Integración real: el fenotipo alimenta el motor (NO se toca el motor) ─────

describe('integración con personalize-interventions', () => {
  it('el fenotipo del cuestionario produce un top 5 del motor', () => {
    const answers = {
      'D1.1': 2, 'D1.2': 'mantenimiento', 'D1.6': 4, 'D11.1': 8,
      'B.1': ['dormir_mejor', 'mas_energia'],
      'D9.4b': 'ninguna',
    };
    const quiz = scoreToPhenotype(answers);
    const motor = quizPhenotypeToMotorPhenotype(quiz, 'u1', 'female', 34);
    const rx = personalizeInterventions(motor);
    expect(rx.length).toBeGreaterThan(0);
    expect(rx.length).toBeLessThanOrEqual(5);
    // ranks válidos + universales presentes
    rx.forEach((r, i) => expect(r.rank).toBe(i + 1));
  });

  it('embarazada → el motor NO prescribe intervenciones contraindicadas en embarazo', () => {
    const quiz = scoreToPhenotype({ 'D9.4b': 'embarazada', 'B.1': ['vitalidad_general'] });
    const motor = quizPhenotypeToMotorPhenotype(quiz, 'u2', 'female', 31);
    expect(motor.profile.pregnancy).toBe(true);
    const rx = personalizeInterventions(motor);
    for (const r of rx) {
      expect((r.intervention.contraindications ?? [])).not.toContain('embarazo');
    }
  });
});
