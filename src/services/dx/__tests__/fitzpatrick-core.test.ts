import { describe, it, expect } from 'vitest';
import {
  FITZPATRICK_HC_ID,
  FITZPATRICK_POINTS,
  FITZPATRICK_ROMAN,
  SOLAR_DOSE_LABELS,
  fitzpatrickTypeFromScore,
  personalizeInterventionHow,
  scoreFitzpatrick,
} from '@/src/services/dx/fitzpatrick-core';
import { HC_BY_ID } from '@/src/constants/historia-clinica-questionnaires';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import type { TestAnswers } from '@/src/components/tests/test-question-types';

/** Respuestas con el índice de opción `idx` (0-4) en cada pregunta. */
function answersAtIndex(idx: number): TestAnswers {
  return Object.fromEntries(
    Object.entries(FITZPATRICK_POINTS).map(([qid, opts]) => {
      const optionId = Object.entries(opts).find(([, pts]) => pts === idx)![0];
      return [qid, optionId];
    }),
  );
}

describe('FITZPATRICK_POINTS ↔ cuestionario HC — sin drift', () => {
  const questionnaire = HC_BY_ID[FITZPATRICK_HC_ID];

  it('el cuestionario fitzpatrick existe en HC_QUESTIONNAIRES', () => {
    expect(questionnaire).toBeDefined();
    expect(questionnaire.questions).toHaveLength(6);
  });

  it('cada pregunta del cuestionario tiene su mapa de puntos con exactamente las mismas opciones', () => {
    for (const q of questionnaire.questions) {
      const points = FITZPATRICK_POINTS[q.id];
      expect(points, `falta mapa de puntos para pregunta ${q.id}`).toBeDefined();
      expect(Object.keys(points).sort()).toEqual(q.options.map((o) => o.id).sort());
    }
    expect(Object.keys(FITZPATRICK_POINTS)).toHaveLength(questionnaire.questions.length);
  });

  it('cada pregunta puntúa 0-4 sin repetidos (escala Fitzpatrick)', () => {
    for (const points of Object.values(FITZPATRICK_POINTS)) {
      expect(Object.values(points).sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it('las preguntas son obligatorias y de selección única (el scoring exige respuesta completa)', () => {
    for (const q of questionnaire.questions) {
      expect(q.multi).toBeFalsy();
      expect(q.optional).toBeFalsy();
    }
  });
});

describe('scoreFitzpatrick', () => {
  it('todas las opciones mínimas → 0; todas las máximas → 24', () => {
    expect(scoreFitzpatrick(answersAtIndex(0))).toBe(0);
    expect(scoreFitzpatrick(answersAtIndex(4))).toBe(24);
  });

  it('mezcla intermedia suma correcto', () => {
    const answers = answersAtIndex(2); // 6 × 2 = 12
    expect(scoreFitzpatrick(answers)).toBe(12);
  });

  it('null si falta una respuesta o hay opción desconocida', () => {
    const incomplete = answersAtIndex(1);
    delete incomplete.freckles;
    expect(scoreFitzpatrick(incomplete)).toBeNull();

    const unknown = answersAtIndex(1);
    unknown.eye_color = 'no_existe';
    expect(scoreFitzpatrick(unknown)).toBeNull();
  });
});

describe('fitzpatrickTypeFromScore — boundaries del spec (0-24 → I-VI)', () => {
  it.each([
    [0, 1], [4, 1],
    [5, 2], [9, 2],
    [10, 3], [14, 3],
    [15, 4], [19, 4],
    [20, 5], [22, 5],
    [23, 6], [24, 6],
  ])('%i puntos → tipo %i', (score, type) => {
    expect(fitzpatrickTypeFromScore(score)).toBe(type);
  });
});

describe('dosis solar y personalización de how', () => {
  it('hay dosis y numeral romano para los 6 fototipos', () => {
    for (let t = 1; t <= 6; t++) {
      expect(SOLAR_DOSE_LABELS[t]).toBeTruthy();
      expect(FITZPATRICK_ROMAN[t - 1]).toBeTruthy();
    }
  });

  it('exposicion_solar_matutina existe en el catálogo y se personaliza con la dosis del fototipo', () => {
    const def = INTERVENTION_BY_KEY['exposicion_solar_matutina'];
    expect(def).toBeDefined();
    const how = personalizeInterventionHow('exposicion_solar_matutina', def.how, 3);
    expect(how).toContain('fototipo III');
    expect(how).toContain(SOLAR_DOSE_LABELS[3]);
    expect(how).not.toBe(def.how);
  });

  it('sin fototipo (null) o fuera de rango devuelve el how genérico intacto', () => {
    expect(personalizeInterventionHow('exposicion_solar_matutina', 'generico', null)).toBe('generico');
    expect(personalizeInterventionHow('exposicion_solar_matutina', 'generico', 0)).toBe('generico');
    expect(personalizeInterventionHow('exposicion_solar_matutina', 'generico', 7)).toBe('generico');
  });

  it('otras intervenciones pasan intactas', () => {
    expect(personalizeInterventionHow('hidratacion_matutina', 'como es', 3)).toBe('como es');
  });
});
