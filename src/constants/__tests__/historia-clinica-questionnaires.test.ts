import { describe, it, expect } from 'vitest';
import {
  HC_QUESTIONNAIRES,
  HC_BY_ID,
  HC_INTEGRAL_ID,
  HC_BASE_IDS,
  HC_AREA_IDS,
} from '@/src/constants/historia-clinica-questionnaires';

describe('HC_QUESTIONNAIRES — integridad estructural', () => {
  it('IDs únicos', () => {
    const ids = HC_QUESTIONNAIRES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada cuestionario tiene título, blurb, icon, color y preguntas no vacías', () => {
    for (const q of HC_QUESTIONNAIRES) {
      expect(q.title.length).toBeGreaterThan(0);
      expect(q.blurb.length).toBeGreaterThan(0);
      expect(q.icon.length).toBeGreaterThan(0);
      expect(q.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(q.questions.length).toBeGreaterThan(0);
    }
  });

  it('cada pregunta tiene id, texto y al menos 2 opciones; opciones con id/text únicos', () => {
    for (const q of HC_QUESTIONNAIRES) {
      const qIds = new Set<string>();
      for (const question of q.questions) {
        expect(question.id.length).toBeGreaterThan(0);
        expect(qIds.has(question.id)).toBe(false);
        qIds.add(question.id);
        expect(question.text.length).toBeGreaterThan(0);
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        const optIds = q.questions ? new Set(question.options.map((o) => o.id)) : new Set();
        expect(optIds.size).toBe(question.options.length);
        for (const o of question.options) expect(o.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('HC_BY_ID resuelve todos los cuestionarios', () => {
    for (const q of HC_QUESTIONNAIRES) {
      expect(HC_BY_ID[q.id]).toBe(q);
    }
  });
});

describe('Extensión F2 — integral + 9 sub-áreas', () => {
  it('el levantamiento integral existe y es choncho (>= 8 preguntas)', () => {
    const integral = HC_BY_ID[HC_INTEGRAL_ID];
    expect(integral).toBeDefined();
    expect(integral.questions.length).toBeGreaterThanOrEqual(8);
  });

  it('las 9 sub-áreas (10 ids con 2 variantes hormonales) existen', () => {
    for (const id of HC_AREA_IDS) {
      expect(HC_BY_ID[id]).toBeDefined();
    }
    // hormonal por sexo: ambas variantes presentes
    expect(HC_AREA_IDS).toContain('salud_hormonal_h');
    expect(HC_AREA_IDS).toContain('salud_hormonal_m');
    // inmunológica: veces/año que enferma
    expect(HC_BY_ID['salud_inmunologica'].questions.some((q) => q.id === 'veces_enferma')).toBe(true);
    expect(HC_BY_ID['salud_inmunologica'].questions.some((q) => q.id === 'antibioticos')).toBe(true);
  });

  it('los 5 levantamientos base siguen presentes', () => {
    for (const id of HC_BASE_IDS) {
      expect(HC_BY_ID[id]).toBeDefined();
    }
  });

  it('integral, base y áreas no se solapan en IDs', () => {
    const all = [HC_INTEGRAL_ID, ...HC_BASE_IDS, ...HC_AREA_IDS];
    expect(new Set(all).size).toBe(all.length);
  });
});
