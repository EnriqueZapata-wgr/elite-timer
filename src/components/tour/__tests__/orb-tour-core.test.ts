/**
 * El guion del tour de la orbe (MB-20 Pieza 4) — es el copy más leído de toda
 * la app: sus reglas se blindan aquí, no en una nota.
 */
import { describe, it, expect } from 'vitest';
import { ORB_TOUR_STEPS, ORB_TOUR_DONE_KEY } from '@/src/components/tour/orb-tour-core';

const TAB_ROUTES = new Set(['/', '/kit', '/salud', '/tribu']);

describe('guion del tour', () => {
  it('son 12 pasos, uno por concepto, con ids únicos', () => {
    expect(ORB_TOUR_STEPS.length).toBe(12);
    expect(new Set(ORB_TOUR_STEPS.map((s) => s.id)).size).toBe(12);
  });

  it('cada paso vive en un tab real', () => {
    for (const s of ORB_TOUR_STEPS) {
      expect(TAB_ROUTES.has(s.route), `${s.id} → ${s.route}`).toBe(true);
    }
  });

  it('cero em dash en copy de usuario y frases cortas', () => {
    for (const s of ORB_TOUR_STEPS) {
      expect(s.copy.includes('—'), `em dash en ${s.id}`).toBe(false);
      expect(s.copy.length, `copy largo en ${s.id}`).toBeLessThanOrEqual(150);
    }
  });

  it('el paso 2 enseña la regla de DOS tipos (MB-20.5): palomea o abre', () => {
    // Si esto truena, la app está enseñando lo contrario de lo que hace.
    const gestos = ORB_TOUR_STEPS.find((s) => s.id === 'gestos')!;
    expect(gestos.copy).toMatch(/^Un toque palomea los hábitos y abre las funciones/);
    expect(gestos.copy).toContain('Mantener presionado abre el módulo');
    expect(gestos.copy).toContain('Pruébalo aquí mismo');
  });

  it('las siglas se explican la primera vez', () => {
    const electrones = ORB_TOUR_STEPS.find((s) => s.id === 'electrones')!;
    expect(electrones.copy).toContain('electrones (e-)');
    expect(electrones.copy).toContain('protones (H+)');
  });

  it('empieza en el día y termina con la orbe', () => {
    expect(ORB_TOUR_STEPS[0].route).toBe('/');
    expect(ORB_TOUR_STEPS[ORB_TOUR_STEPS.length - 1].id).toBe('orbe');
  });

  it('la llave es NUEVA a propósito (el carrusel viejo usaba otra)', () => {
    expect(ORB_TOUR_DONE_KEY).not.toBe('@atp/tour_completed');
  });
});
