/**
 * Guía de Laboratorios — contenido (Sprint LABS GUÍA DESCARGABLE T1).
 */
import { describe, it, expect } from 'vitest';
import {
  LABS_GUIDE_META,
  LABS_GUIDE_INTRO,
  LABS_PACKAGES,
  LABS_COMERCIALES,
  LABS_PREPARACION,
  LABS_DESPUES,
} from '../labs-guide-content';

describe('labs-guide-content · estructura', () => {
  it('tiene los 5 paquetes del brief con ids únicos', () => {
    expect(LABS_PACKAGES.map(p => p.id)).toEqual(
      ['base', 'metabolico', 'hormonal_m', 'hormonal_f', 'longevidad'],
    );
    expect(new Set(LABS_PACKAGES.map(p => p.id)).size).toBe(5);
  });

  it('cada paquete tiene nombre, precio MXN, para-quién y estudios no vacíos', () => {
    for (const p of LABS_PACKAGES) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.priceRange).toMatch(/MXN/);
      expect(p.priceRange).toMatch(/\$/);
      expect(p.forWho.trim().length).toBeGreaterThan(0);
      expect(p.labs.length).toBeGreaterThanOrEqual(4);
      for (const lab of p.labs) expect(lab.trim().length).toBeGreaterThan(0);
    }
  });

  it('los paquetes hormonales están segmentados por sexo y el resto aplica a todos', () => {
    expect(LABS_PACKAGES.find(p => p.id === 'hormonal_m')?.sex).toBe('male');
    expect(LABS_PACKAGES.find(p => p.id === 'hormonal_f')?.sex).toBe('female');
    expect(LABS_PACKAGES.find(p => p.id === 'hormonal_f')?.note).toMatch(/ciclo/i);
    for (const id of ['base', 'metabolico', 'longevidad']) {
      expect(LABS_PACKAGES.find(p => p.id === id)?.sex).toBeUndefined();
    }
  });

  it('el paquete Longevidad cubre los 5 marcadores nuevos de PhenoAge + PCR-us', () => {
    const labs = LABS_PACKAGES.find(p => p.id === 'longevidad')!.labs.join(' ');
    for (const marker of ['Albúmina', 'Fosfatasa alcalina', 'Leucocitos', 'MCV', 'RDW', 'Proteína C reactiva']) {
      expect(labs).toContain(marker);
    }
  });

  it('labs comerciales México presentes (Chopo, Salud Digna, Ruiz, Licy)', () => {
    const names = LABS_COMERCIALES.map(l => l.name).join(' ');
    for (const lab of ['Chopo', 'Salud Digna', 'Ruiz', 'Licy']) {
      expect(names).toContain(lab);
    }
  });

  it('preparación cubre ayuno, hora y ciclo; disclaimer presente y no prescriptivo', () => {
    const prep = LABS_PREPARACION.join(' ');
    expect(prep).toMatch(/[Aa]yuno/);
    expect(prep).toMatch(/mañana/);
    expect(prep).toMatch(/ciclo/);
    expect(LABS_GUIDE_META.disclaimer).toMatch(/no es una orden médica/i);
    expect(LABS_GUIDE_INTRO.why.length).toBeGreaterThanOrEqual(2);
    expect(LABS_DESPUES.steps.length).toBeGreaterThanOrEqual(3);
  });
});
