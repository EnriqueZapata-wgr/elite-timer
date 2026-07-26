/**
 * emom-core (MB-5 Bloque 1) — clasificación de carga y prescripción X×X.
 * Los rangos son propuesta a vetar por Enrique; estos tests fijan el contrato.
 */
import { describe, it, expect } from 'vitest';
import { parseEquipoRequisitos, type NivelEjercicio, type Cualidad } from '@/src/constants/exercise-matrix';
import {
  emomClaseDe,
  emomPrescripcionDe,
  emomTiempoSeg,
  EMOM_RANGOS,
  type EmomExercise,
} from '../emom-core';

function ex(over: {
  cargable?: boolean;
  equipo?: string;
  cualidades?: Cualidad[];
  nivel?: NivelEjercicio;
}): EmomExercise {
  return {
    cargable: over.cargable ?? false,
    equipoRequisitos: parseEquipoRequisitos(over.equipo ?? 'Peso corporal'),
    cualidades: over.cualidades ?? ['metabólico'],
    nivel: over.nivel ?? 'Principiante',
  };
}

describe('emomClaseDe', () => {
  it('barra/mancuerna cargable → cargable (la carga hace el trabajo)', () => {
    expect(emomClaseDe(ex({ cargable: true, equipo: 'Barra', cualidades: ['fuerza'] }))).toBe('cargable');
    expect(emomClaseDe(ex({ cargable: true, equipo: 'Mancuerna / Kettlebell', cualidades: ['fuerza'] }))).toBe('cargable');
    expect(emomClaseDe(ex({ cargable: true, equipo: 'Máquina', cualidades: ['hipertrofia'] }))).toBe('cargable');
  });

  it('dominadas (Barra fija, cargable vía lastre) → corporal_alta, NO cargable', () => {
    expect(emomClaseDe(ex({ cargable: true, equipo: 'Barra fija', cualidades: ['fuerza', 'hipertrofia'], nivel: 'Intermedio' }))).toBe('corporal_alta');
  });

  it('push-ups / dips → corporal_alta (peso corporal exigente)', () => {
    expect(emomClaseDe(ex({ equipo: 'Peso corporal', cualidades: ['hipertrofia', 'resistencia'] }))).toBe('corporal_alta');
    expect(emomClaseDe(ex({ equipo: 'Paralelas', cualidades: ['fuerza'], nivel: 'Intermedio' }))).toBe('corporal_alta');
  });

  it('mountain climbers / crunch (metabólico principiante) → corporal_baja', () => {
    expect(emomClaseDe(ex({ equipo: 'Peso corporal', cualidades: ['metabólico', 'resistencia'], nivel: 'Principiante' }))).toBe('corporal_baja');
  });

  it('peso corporal de nivel Intermedio+ cuenta como alta demanda aunque sea metabólico', () => {
    expect(emomClaseDe(ex({ equipo: 'Peso corporal', cualidades: ['metabólico'], nivel: 'Intermedio' }))).toBe('corporal_alta');
  });
});

describe('emomPrescripcionDe', () => {
  it('cargable: 6-12 reps (default 8) · 6-12 rondas (default 10)', () => {
    const p = emomPrescripcionDe(ex({ cargable: true, equipo: 'Barra', cualidades: ['fuerza'] }));
    expect(p).toMatchObject({ clase: 'cargable', reps: 8, repsMin: 6, repsMax: 12, rondas: 10 });
  });

  it('corporal_baja: reps altas (20-40, default 25) y más rondas (8-15)', () => {
    const p = emomPrescripcionDe(ex({ cualidades: ['metabólico'], nivel: 'Principiante' }), 'intermedio');
    expect(p).toMatchObject({ clase: 'corporal_baja', reps: 25, repsMin: 20, repsMax: 40, rondasMin: 8, rondasMax: 15 });
  });

  it('principiante arranca en el piso del rango (filosofía del 8×8 previo)', () => {
    const p = emomPrescripcionDe(ex({ cargable: true, equipo: 'Barra', cualidades: ['fuerza'] }), 'principiante');
    expect(p.reps).toBe(EMOM_RANGOS.cargable.repsMin);
    expect(p.rondas).toBe(EMOM_RANGOS.cargable.rondasMin);
  });

  it('los defaults viven dentro de su propio rango (invariante de todos los rangos)', () => {
    for (const r of Object.values(EMOM_RANGOS)) {
      expect(r.reps).toBeGreaterThanOrEqual(r.repsMin);
      expect(r.reps).toBeLessThanOrEqual(r.repsMax);
      expect(r.rondas).toBeGreaterThanOrEqual(r.rondasMin);
      expect(r.rondas).toBeLessThanOrEqual(r.rondasMax);
    }
  });
});

describe('emomTiempoSeg', () => {
  it('N minutos + 1 de serie de paga', () => {
    expect(emomTiempoSeg(10)).toBe(660);
    expect(emomTiempoSeg(8)).toBe(540);
  });
});
