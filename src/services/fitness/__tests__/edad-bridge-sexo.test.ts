/**
 * 2026-09-21 (SEXO NUNCA ASUMIDO): el puente Fitness → Edad ATP sin sexo en
 * el perfil. Archivo aparte y puro (sin vi.mock) para que corra también con
 * `node scripts/run-tests-sin-vitest.js`; los mismos casos viven además en
 * edad-bridge-core.test.ts junto al resto del puente.
 */
import { describe, it, expect } from 'vitest';
import {
  tierAFunctionalEntries, computeTierBProjection,
  sesionTraeBenchmarksTierB, avisosDeSexoDelPuente, rutaDelAviso,
  AVISO_PUSHUPS_SIN_SEXO, AVISO_PROYECCION_SIN_SEXO,
  type SessionSetLike,
} from '@/src/services/fitness/edad-bridge-core';
import { AVISO_PERFIL_ILEGIBLE, RUTA_PERFIL } from '@/src/services/salud/sexo-core';

const set = (slug: string, reps: number, weightKg: number | null = null): SessionSetLike => ({ slug, reps, weightKg });

describe('puente Fitness → Edad ATP sin sexo', () => {
  it('Tier A: push-ups se omite con su aviso, plank sí entra, nada lanza', () => {
    // Antes el servicio hacía `sexo ?? 'female'` y el aviso hablaba de la
    // norma femenina a quien nunca dijo su sexo.
    const r = tierAFunctionalEntries([set('push-up', 30), set('hand-plank', 60)], null);
    expect(r.entries).toEqual([{ test_key: 'plank', value_primary: 60 }]);
    expect(r.avisos.length).toBe(1);
    expect(r.avisos[0]).toBe(AVISO_PUSHUPS_SIN_SEXO);
    expect(r.avisos[0]).toContain('perfil');
  });

  it('Tier B: sin sexo no hay proyección (antes `sexo ?? \'male\'` proyectaba con targets de hombre)', () => {
    const conSexo = computeTierBProjection([set('barbell-deadlift', 1, 160), set('pull-ups', 8)], 80, 'male');
    expect(conSexo.detalle.length).toBeGreaterThan(0);
    const sinSexo = computeTierBProjection([set('barbell-deadlift', 1, 160), set('pull-ups', 8)], 80, null);
    expect(sinSexo.detalle).toEqual([]);
    expect(sinSexo.years).toBe(0);
    expect(sinSexo.texto).toBeNull();
  });

  it('el copy manda al perfil y no trae em dash', () => {
    for (const c of [AVISO_PUSHUPS_SIN_SEXO, AVISO_PROYECCION_SIN_SEXO]) {
      expect(c).toContain('perfil');
      expect(c.includes('—')).toBe(false);
    }
  });
});

describe('avisos de sexo del puente (ronda de arreglos)', () => {
  const curls = [set('dumbbell-curl', 12, 14), set('cable-triceps-pushdown', 12, 25)];
  const conBenchmark = [set('barbell-deadlift', 1, 160), set('dumbbell-curl', 12, 14)];

  it('una sesión sin benchmarks Tier B no trae benchmarks; una con peso muerto sí', () => {
    expect(sesionTraeBenchmarksTierB(curls)).toBe(false);
    expect(sesionTraeBenchmarksTierB(conBenchmark)).toBe(true);
    expect(sesionTraeBenchmarksTierB([])).toBe(false);
  });

  it('sin sexo, una sesión de curls NO recibe el aviso de proyección (no había nada que proyectar)', () => {
    expect(avisosDeSexoDelPuente([], curls, null, false)).toEqual([]);
  });

  it('sin sexo, una sesión con benchmark Tier B sí recibe el aviso de proyección, una sola vez', () => {
    const a = avisosDeSexoDelPuente([], conBenchmark, null, false);
    expect(a).toEqual([AVISO_PROYECCION_SIN_SEXO]);
    const b = avisosDeSexoDelPuente([AVISO_PROYECCION_SIN_SEXO], conBenchmark, null, false);
    expect(b.filter((x) => x === AVISO_PROYECCION_SIN_SEXO).length).toBe(1);
  });

  it('con sexo, los avisos de Tier A pasan tal cual y no se agrega nada', () => {
    expect(avisosDeSexoDelPuente(['x'], conBenchmark, 'female', false)).toEqual(['x']);
    expect(avisosDeSexoDelPuente([], conBenchmark, 'male', false)).toEqual([]);
  });

  it('regla 7: perfil ILEGIBLE no dice "tu perfil no lo tiene", pide reintentar (uno solo)', () => {
    const a = avisosDeSexoDelPuente([AVISO_PUSHUPS_SIN_SEXO], conBenchmark, null, true);
    expect(a).toEqual([AVISO_PERFIL_ILEGIBLE]);
    expect(a.includes(AVISO_PUSHUPS_SIN_SEXO)).toBe(false);
    expect(a.includes(AVISO_PROYECCION_SIN_SEXO)).toBe(false);
  });

  it('regla 7: perfil ilegible y sesión de curls sin nada por sexo → ningún aviso; los ajenos al sexo se conservan', () => {
    expect(avisosDeSexoDelPuente([], curls, null, true)).toEqual([]);
    const otro = 'No se pudo registrar el benchmark en tu Edad ATP. Se reintenta en tu próxima sesión.';
    expect(avisosDeSexoDelPuente([otro], curls, null, true)).toEqual([otro]);
  });

  it('los avisos que piden completar el perfil son tocables hacia /profile; el resto no', () => {
    expect(rutaDelAviso(AVISO_PUSHUPS_SIN_SEXO)).toBe(RUTA_PERFIL);
    expect(rutaDelAviso(AVISO_PROYECCION_SIN_SEXO)).toBe(RUTA_PERFIL);
    expect(rutaDelAviso(AVISO_PERFIL_ILEGIBLE)).toBeNull();
    expect(rutaDelAviso('No se pudo registrar el benchmark en tu Edad ATP.')).toBeNull();
  });
});
