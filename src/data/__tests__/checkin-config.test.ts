/**
 * MB-17 — config del check-in que sobrevivió al retiro de la rueda.
 *
 * Las claves de BODY_ZONES dejan de ser solo UI: desde la mig 245 son los
 * valores que se guardan en emotional_checkins.body_zone. Cambiar una clave
 * rompe el historial de todos — este test lo cementa.
 */
import { describe, it, expect } from 'vitest';
import { BODY_ZONES, bodyZoneLabel, NAMING_MECHANISM_LINE } from '../checkin-config';
import { EMOTIONS } from '../emotions-library';

describe('BODY_ZONES — las cuatro zonas del cuerpo', () => {
  it('las claves son estables (valores de BD desde la mig 245)', () => {
    expect(BODY_ZONES.map((z) => z.key)).toEqual(['pecho', 'cabeza', 'estomago', 'apagado']);
  });

  it('cada zona acota a familias que existen (máx 3, nunca diagnostica)', () => {
    const families = new Set(EMOTIONS.map((e) => e.family));
    for (const z of BODY_ZONES) {
      expect(z.families.length).toBeGreaterThan(0);
      expect(z.families.length).toBeLessThanOrEqual(3);
      for (const fam of z.families) {
        expect(families.has(fam), `${z.key} → ${fam}`).toBe(true);
      }
    }
  });

  it('cada zona habla lenguaje de cuerpo: label y detail no vacíos', () => {
    for (const z of BODY_ZONES) {
      expect(z.label.length).toBeGreaterThan(3);
      expect(z.detail.length).toBeGreaterThan(10);
    }
  });
});

describe('bodyZoneLabel — la etiqueta corta del historial', () => {
  it('resuelve las cuatro claves guardadas', () => {
    expect(bodyZoneLabel('pecho')).toBe('Pecho apretado');
    expect(bodyZoneLabel('cabeza')).toBe('Cabeza y mandíbula');
    expect(bodyZoneLabel('estomago')).toBe('Estómago y garganta');
    expect(bodyZoneLabel('apagado')).toBe('Todo apagado');
  });

  it('paso saltado o clave desconocida → null, jamás se inventa', () => {
    expect(bodyZoneLabel(null)).toBeNull();
    expect(bodyZoneLabel(undefined)).toBeNull();
    expect(bodyZoneLabel('')).toBeNull();
    expect(bodyZoneLabel('rodilla')).toBeNull();
  });
});

describe('la línea del mecanismo (Lieberman 2007)', () => {
  it('existe y no trae em dash (copy de usuario)', () => {
    expect(NAMING_MECHANISM_LINE.length).toBeGreaterThan(20);
    expect(NAMING_MECHANISM_LINE.includes('—')).toBe(false);
  });
});
