/**
 * OLA 4 · Tests de los adapters del motor único.
 *
 * Lo que se protege: que las cuatro formas de pregunta caben en InputType sin
 * perder nada, y que cada scorer da lo mismo que daba su motor original.
 * scoreAvgClamp y scoreSumMax replican código que hoy no tiene ninguna prueba.
 */
import { describe, it, expect } from 'vitest';
import {
  fromFunctionalQuiz,
  scoreFunctional,
  fromDbQuiz,
  scoreAvgClamp,
  fromChronotypeQuiz,
  scoreSumMax,
  fromMasterQuiz,
  type DbQuizQuestion,
  type ChronoQuestion,
} from '../adapters';
import { ALL_FUNCTIONAL_QUIZZES, SLEEP_QUIZ } from '@/src/constants/functional-quizzes';
import { MASTER_QUIZ_QUESTIONS } from '@/src/constants/master-quiz-bank';

const INPUT_TYPES = [
  'visual_scale', 'single', 'multi', 'number',
  'toggle', 'text', 'condition_status', 'repro_status',
];

describe('adapters · InputType cubre los 4 motores', () => {
  it('los 5 funcionales se normalizan sin perder una sola pregunta', () => {
    for (const quiz of ALL_FUNCTIONAL_QUIZZES) {
      const unified = fromFunctionalQuiz(quiz);
      expect(unified, quiz.id).toHaveLength(quiz.questions.length);
      for (const q of unified) {
        expect(INPUT_TYPES).toContain(q.type);
        expect(q.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('el booleano de los funcionales es un toggle y conserva el por qué importa', () => {
    const unified = fromFunctionalQuiz(SLEEP_QUIZ);
    expect(unified[0].type).toBe('toggle');
    expect(unified[0].code).toBe(SLEEP_QUIZ.questions[0].id);
    // El rootCause es el flash que hoy enseña functional-quiz: no se pierde.
    expect(unified[0].why).toBe(SLEEP_QUIZ.questions[0].rootCause);
    expect(unified[0].options).toHaveLength(2);
  });

  it('single_select es single y multi_select es multi', () => {
    const preguntas: DbQuizQuestion[] = [
      { question_id: 1, question_text: '¿Cómo duermes?', question_type: 'single_select', options: [{ text: 'Bien', scores: { sleep: 80 } }] },
      { question_id: 2, question_text: '¿Qué te pasa?', question_type: 'multi_select', options: [{ text: 'Estrés', scores: { stress: 70 } }] },
    ];
    const unified = fromDbQuiz(preguntas);
    expect(unified[0].type).toBe('single');
    expect(unified[1].type).toBe('multi');
    // El valor de la opción es su índice, como ya se guarda en quiz_responses.
    expect(unified[0].options).toEqual([{ value: '0', label: 'Bien' }]);
  });

  it('el cronotipo también es single', () => {
    const preguntas: ChronoQuestion[] = [
      { id: 'q1', text: '¿A qué hora despiertas?', options: [{ id: 'a', text: 'Temprano', scores: { lion: 2 } }] },
    ];
    const unified = fromChronotypeQuiz(preguntas);
    expect(unified[0].type).toBe('single');
    expect(unified[0].options).toEqual([{ value: 'a', label: 'Temprano' }]);
  });

  it('el banco maestro ya viene en InputType: no necesita traducción', () => {
    for (const q of MASTER_QUIZ_QUESTIONS) expect(INPUT_TYPES, q.code).toContain(q.type);
    const unified = fromMasterQuiz(MASTER_QUIZ_QUESTIONS);
    expect(unified).toHaveLength(MASTER_QUIZ_QUESTIONS.length);
    expect(unified[0].code).toBe(MASTER_QUIZ_QUESTIONS[0].code);
  });
});

describe('scoreFunctional · pesos y umbrales', () => {
  it('solo lo contestado como cierto suma', () => {
    const { domainScores } = scoreFunctional(SLEEP_QUIZ, { S01: true, S02: false });
    // S01 es cortisol con peso 2.
    expect(domainScores['cortisol']).toBe(2);
    expect(domainScores['circadian']).toBe(0);
  });

  it('sin respuestas no se activa ningún insight', () => {
    const { activeInsights } = scoreFunctional(SLEEP_QUIZ, {});
    expect(activeInsights).toHaveLength(0);
  });

  it('el insight se activa al alcanzar su umbral, no antes', () => {
    // Cortisol: umbral 3. S01 pesa 2, S02 pesa 1.
    const casi = scoreFunctional(SLEEP_QUIZ, { S01: true });
    expect(casi.activeInsights.map((i) => i.domain)).not.toContain('cortisol');

    const justo = scoreFunctional(SLEEP_QUIZ, { S01: true, S02: true });
    expect(justo.domainScores['cortisol']).toBe(3);
    expect(justo.activeInsights.map((i) => i.domain)).toContain('cortisol');
  });

  it('todos los dominios del catálogo arrancan declarados en cero', () => {
    const { domainScores } = scoreFunctional(SLEEP_QUIZ, {});
    for (const d of SLEEP_QUIZ.domains) expect(domainScores[d.id], d.id).toBe(0);
  });
});

describe('scoreAvgClamp · promedio acotado', () => {
  const preguntas: DbQuizQuestion[] = [
    { question_id: 1, question_text: 'a', question_type: 'single_select', options: [
      { text: 'malo', scores: { sleep: 20 } }, { text: 'bueno', scores: { sleep: 80 } },
    ] },
    { question_id: 2, question_text: 'b', question_type: 'single_select', options: [
      { text: 'malo', scores: { sleep: 40 } },
    ] },
  ];

  it('promedia entre preguntas del mismo dominio', () => {
    expect(scoreAvgClamp(preguntas, { 1: 1, 2: 0 })).toEqual({ sleep: 60 });
  });

  it('lo no contestado no cuenta en el promedio', () => {
    expect(scoreAvgClamp(preguntas, { 1: 0 })).toEqual({ sleep: 20 });
  });

  it('multi_select suma todas las opciones elegidas', () => {
    const multi: DbQuizQuestion[] = [
      { question_id: 1, question_text: 'a', question_type: 'multi_select', options: [
        { text: 'x', scores: { stress: 100 } }, { text: 'y', scores: { stress: 0 } },
      ] },
    ];
    expect(scoreAvgClamp(multi, { 1: [0, 1] })).toEqual({ stress: 50 });
  });

  it('acota fuera de rango en vez de dejar pasar un score imposible', () => {
    const raro: DbQuizQuestion[] = [
      { question_id: 1, question_text: 'a', question_type: 'single_select', options: [
        { text: 'x', scores: { d: 500 } }, { text: 'y', scores: { d: -70 } },
      ] },
    ];
    expect(scoreAvgClamp(raro, { 1: 0 })).toEqual({ d: 100 });
    expect(scoreAvgClamp(raro, { 1: 1 })).toEqual({ d: 0 });
  });

  it('un índice inexistente no revienta', () => {
    expect(scoreAvgClamp(preguntas, { 1: 99 })).toEqual({});
  });

  it('sin respuestas devuelve vacío', () => {
    expect(scoreAvgClamp(preguntas, {})).toEqual({});
  });
});

describe('scoreSumMax · cronotipo', () => {
  const TIE = ['bear', 'lion', 'wolf', 'dolphin'];
  const preguntas: ChronoQuestion[] = [
    { id: 'q1', text: 'a', options: [
      { id: 'a', text: 'x', scores: { lion: 3 } }, { id: 'b', text: 'y', scores: { wolf: 3 } },
    ] },
    { id: 'q2', text: 'b', options: [
      { id: 'a', text: 'x', scores: { lion: 1 } }, { id: 'b', text: 'y', scores: { bear: 5 } },
    ] },
  ];

  it('suma por animal y gana el mayor', () => {
    const { scores, result } = scoreSumMax(preguntas, { q1: 'a', q2: 'a' }, TIE);
    expect(scores['lion']).toBe(4);
    expect(result).toBe('lion');
  });

  it('el desempate es declarado, no accidental', () => {
    // lion 3 contra wolf 3: gana el que va antes en el orden de desempate.
    const empate: ChronoQuestion[] = [
      { id: 'q1', text: 'a', options: [{ id: 'a', text: 'x', scores: { lion: 3, wolf: 3 } }] },
    ];
    expect(scoreSumMax(empate, { q1: 'a' }, TIE).result).toBe('lion');
    // Y con el oso empatado, gana el oso porque encabeza la lista.
    const empate2: ChronoQuestion[] = [
      { id: 'q1', text: 'a', options: [{ id: 'a', text: 'x', scores: { lion: 3, bear: 3 } }] },
    ];
    expect(scoreSumMax(empate2, { q1: 'a' }, TIE).result).toBe('bear');
  });

  it('todos los animales quedan declarados aunque nadie los sume', () => {
    const { scores } = scoreSumMax(preguntas, { q1: 'a' }, TIE);
    for (const k of TIE) expect(scores[k], k).toBeDefined();
    expect(scores['dolphin']).toBe(0);
  });

  it('una opción que no existe se ignora sin tumbar el cálculo', () => {
    const { result } = scoreSumMax(preguntas, { q1: 'zzz', q2: 'b' }, TIE);
    expect(result).toBe('bear');
  });

  it('sin respuestas cae al primero del desempate, no a undefined', () => {
    expect(scoreSumMax(preguntas, {}, TIE).result).toBe('bear');
  });
});
