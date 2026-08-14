/**
 * OLA 4 · Tests del estado de completado.
 *
 * Lo que se protege: una consulta por tabla (no una por evaluación) y que cada
 * regla de completado se resuelva igual que como lo hacía su hub original.
 */
import { describe, it, expect } from 'vitest';
import {
  completionQueries,
  reduceCompletion,
  countDone,
  formatCompletionDate,
  type Row,
} from '../completion';
import { ASSESSMENTS } from '@/src/constants/assessments/registry';
import { assessmentsBySection, getAssessment } from '@/src/constants/assessments';

describe('completionQueries · una consulta por tabla', () => {
  it('agrupa por tabla en vez de por evaluación', () => {
    const queries = completionQueries();
    const tables = queries.map((q) => q.table);
    expect(new Set(tables).size).toBe(tables.length);
    // Muchas más evaluaciones que tablas: ahí está el ahorro.
    expect(queries.length).toBeLessThan(ASSESSMENTS.length);
  });

  it('los 5 funcionales caben en una sola consulta', () => {
    const q = completionQueries().find((x) => x.table === 'functional_quiz_results');
    expect(q).toBeDefined();
    expect(q!.columns).toEqual(['completed_at', 'is_complete', 'quiz_id']);
  });

  it('trae la columna que cada regla necesita', () => {
    const byTable = Object.fromEntries(completionQueries().map((q) => [q.table, q.columns]));
    expect(byTable['historia_clinica']).toContain('data');
    expect(byTable['edad_atp_functional_tests']).toContain('test_key');
    expect(byTable['edad_atp_questionnaire_responses']).toContain('domain');
    expect(byTable['quiz_responses']).toContain('completed_at');
  });

  it('el Maestro no genera consulta porque su completado es puro', () => {
    expect(completionQueries().map((q) => q.table)).not.toContain('user_master_quiz');
  });
});

describe('reduceCompletion · cada regla', () => {
  it('flag: solo cuenta is_complete en true', () => {
    const rows: Row[] = [
      { quiz_id: 'sleep_functional', is_complete: true, completed_at: '2026-08-01T10:00:00Z' },
      { quiz_id: 'energy_functional', is_complete: false, completed_at: null },
    ];
    const map = reduceCompletion({ functional_quiz_results: rows });
    expect(map['sleep_functional'].done).toBe(true);
    expect(map['sleep_functional'].date).toBe('2026-08-01T10:00:00Z');
    expect(map['energy_functional'].done).toBe(false);
  });

  it('flag: un avance a medias no cuenta como terminado', () => {
    const rows: Row[] = [{ quiz_id: 'pain_functional', is_complete: false, completed_at: null }];
    expect(reduceCompletion({ functional_quiz_results: rows })['pain_functional'].done).toBe(false);
  });

  it('flag: se queda con la fecha más reciente de varios intentos', () => {
    const rows: Row[] = [
      { quiz_id: 'stress_functional', is_complete: true, completed_at: '2026-01-05T00:00:00Z' },
      { quiz_id: 'stress_functional', is_complete: true, completed_at: '2026-07-30T00:00:00Z' },
    ];
    expect(reduceCompletion({ functional_quiz_results: rows })['stress_functional'].date)
      .toBe('2026-07-30T00:00:00Z');
  });

  it('not-null: quiz_responses no tiene is_complete, se mide por completed_at', () => {
    const done = reduceCompletion({
      quiz_responses: [{ quiz_id: 'lifestyle_assessment', completed_at: '2026-03-03T00:00:00Z' }],
    });
    expect(done['db-lifestyle_assessment'].done).toBe(true);

    const notDone = reduceCompletion({
      quiz_responses: [{ quiz_id: 'lifestyle_assessment', completed_at: null }],
    });
    expect(notDone['db-lifestyle_assessment'].done).toBe(false);
  });

  it('row-exists: basta con que exista el renglón del cronotipo', () => {
    expect(reduceCompletion({ user_chronotype: [{ updated_at: '2026-02-02T00:00:00Z' }] })['cronotipo'].done).toBe(true);
    expect(reduceCompletion({ user_chronotype: [] })['cronotipo'].done).toBe(false);
  });

  it('match-exists: el test_key decide de quién es el renglón', () => {
    const map = reduceCompletion({
      edad_atp_functional_tests: [
        { test_key: 'plank', measured_at: '2026-05-05T00:00:00Z' },
        { test_key: 'bolt', measured_at: '2026-05-06T00:00:00Z' },
      ],
    });
    expect(map['plank'].done).toBe(true);
    expect(map['bolt'].date).toBe('2026-05-06T00:00:00Z');
    expect(map['cooper'].done).toBe(false);
    expect(map['reaction-time'].done).toBe(false);
  });

  it('json-key: una categoría clínica cuenta cuando su llave trae respuestas', () => {
    const map = reduceCompletion({
      historia_clinica: [{
        updated_at: '2026-04-04T00:00:00Z',
        data: { fitzpatrick: { q1: 'yes' }, salud_bucal: {} },
      }],
    });
    expect(map['hc-fitzpatrick'].done).toBe(true);
    expect(map['hc-fitzpatrick'].date).toBe('2026-04-04T00:00:00Z');
    // Llave presente pero vacía no es una categoría contestada.
    expect(map['hc-salud_bucal'].done).toBe(false);
    expect(map['hc-tratamientos'].done).toBe(false);
  });

  it('json-key aguanta data nula sin reventar', () => {
    const map = reduceCompletion({ historia_clinica: [{ data: null, updated_at: null }] });
    expect(map['hc-fitzpatrick'].done).toBe(false);
  });

  it('sin datos, nada aparece como completado', () => {
    const map = reduceCompletion({});
    for (const a of ASSESSMENTS) {
      if (a.persist.completion.rule === 'pure') continue;
      expect(map[a.id].done, a.id).toBe(false);
    }
  });

  it('el Maestro se queda fuera del mapa: lo resuelve el core puro', () => {
    expect(reduceCompletion({})['maestro']).toBeUndefined();
    expect(getAssessment('maestro')!.persist.completion).toEqual({ rule: 'pure' });
  });
});

describe('helpers del hub', () => {
  it('countDone cuenta por sección', () => {
    const map = reduceCompletion({
      functional_quiz_results: [
        { quiz_id: 'sleep_functional', is_complete: true, completed_at: '2026-08-01T00:00:00Z' },
        { quiz_id: 'energy_functional', is_complete: true, completed_at: '2026-08-02T00:00:00Z' },
      ],
    });
    expect(countDone(map, assessmentsBySection('funcional'))).toBe(2);
    expect(countDone(map, assessmentsBySection('fisico'))).toBe(0);
  });

  it('formatCompletionDate da fecha corta y tolera basura', () => {
    expect(formatCompletionDate('2026-08-01T10:00:00Z')).toBeTruthy();
    expect(formatCompletionDate(undefined)).toBeUndefined();
    expect(formatCompletionDate('no es fecha')).toBeUndefined();
  });
});
