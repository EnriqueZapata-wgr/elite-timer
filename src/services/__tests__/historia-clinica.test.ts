import { describe, it, expect } from 'vitest';
import { completedCategories } from '@/src/services/historia-clinica-helpers';
import { HC_QUESTIONNAIRES, HC_BY_ID } from '@/src/constants/historia-clinica-questionnaires';

describe('historia-clinica — banco de cuestionarios', () => {
  it('tiene al menos los 4 cuestionarios prioritarios', () => {
    const ids = HC_QUESTIONNAIRES.map(q => q.id);
    for (const req of ['padecimientos_personales', 'padecimientos_familiares', 'tratamientos', 'salud_bucal']) {
      expect(ids).toContain(req);
    }
  });

  it('cada pregunta tiene id único y ≥2 opciones', () => {
    for (const q of HC_QUESTIONNAIRES) {
      const ids = new Set<string>();
      for (const question of q.questions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(ids.has(question.id)).toBe(false);
        ids.add(question.id);
        const optIds = new Set(question.options.map(o => o.id));
        expect(optIds.size).toBe(question.options.length); // option ids únicos
      }
    }
  });

  it('HC_BY_ID indexa todos los cuestionarios', () => {
    expect(Object.keys(HC_BY_ID).length).toBe(HC_QUESTIONNAIRES.length);
    expect(HC_BY_ID['salud_bucal']?.title).toBeTruthy();
  });
});

describe('historia-clinica — completedCategories', () => {
  it('solo cuenta categorías con respuestas no vacías', () => {
    const done = completedCategories({
      padecimientos_personales: { condiciones: ['hta'] },
      salud_bucal: {},                       // vacía → no cuenta
      tratamientos: { medicamentos: 'yes' },
    });
    expect(done.has('padecimientos_personales')).toBe(true);
    expect(done.has('tratamientos')).toBe(true);
    expect(done.has('salud_bucal')).toBe(false);
    expect(done.size).toBe(2);
  });

  it('objeto vacío → set vacío', () => {
    expect(completedCategories({}).size).toBe(0);
  });
});
