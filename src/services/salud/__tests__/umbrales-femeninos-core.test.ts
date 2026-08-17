/**
 * El motor legacy no tenía UN SOLO test, y por eso pudo pasar dos meses
 * calificando a las mujeres con la vara de los hombres sin que nada se pusiera
 * rojo. Estos tests cubren el puente a la matriz V6.
 *
 * La regla que protegen: NO SE INVENTA NINGÚN UMBRAL. Cada número que sale de
 * `RANGOS_FEMENINOS_V6` tiene que ser trazable a `MATRIZ_MUJERES`, y si alguien
 * escribe uno a mano el test lo tumba.
 */
import { describe, it, expect } from 'vitest';
import {
  RANGOS_FEMENINOS_V6,
  PARAMETROS_CON_V6_PROPIA,
  PENDIENTES_DE_FIRMA_CLINICA,
  rangoFemeninoV6,
} from '../umbrales-femeninos-core';
import { MATRIZ_MUJERES, MATRIZ_HOMBRES } from '@/src/constants/edad-atp-matriz-v7-v6';
import { DOMAINS } from '@/src/data/functional-health-engine';

const banda = (matriz: typeof MATRIZ_MUJERES, dominio: string, clave: string) =>
  matriz[dominio]?.params.find((p) => p.key === clave)?.bandLimits;

describe('umbrales femeninos V6 — trazabilidad', () => {
  it('cada arreglo es la banda de MATRIZ_MUJERES invertida, sin un número propio', () => {
    for (const [legacyKey, arreglo] of Object.entries(RANGOS_FEMENINOS_V6)) {
      const [dominio, clave] = PARAMETROS_CON_V6_PROPIA[legacyKey];
      const v6 = banda(MATRIZ_MUJERES, dominio, clave);
      expect(v6, `${legacyKey} no existe en la matriz V6`).toBeDefined();
      expect(arreglo).toEqual([...v6!].reverse());
    }
  });

  it('solo entra el parámetro cuya banda V6 difiere de la V7', () => {
    for (const legacyKey of Object.keys(RANGOS_FEMENINOS_V6)) {
      const [dominio, clave] = PARAMETROS_CON_V6_PROPIA[legacyKey];
      expect(banda(MATRIZ_MUJERES, dominio, clave)).not.toEqual(banda(MATRIZ_HOMBRES, dominio, clave));
    }
  });

  it('todas las claves del puente existen de verdad en el motor legacy', () => {
    const claves = new Set(DOMAINS.flatMap((d) => d.parameters.map((p) => p.key)));
    for (const legacyKey of Object.keys(PARAMETROS_CON_V6_PROPIA)) {
      expect(claves.has(legacyKey), `${legacyKey} no existe en DOMAINS`).toBe(true);
    }
  });

  it('el puente mapea al dominio correcto, que es donde un mapa plano se rompe', () => {
    // En la V6, `testosterona_total` existe en sistema hormonal con ventana
    // 0.2 a 0.55 ng/ml y TAMBIÉN en sueño con 7 a 13, que es escala de hombre.
    // Un mapa plano clave→clave se habría quedado con la primera declaración.
    expect(PARAMETROS_CON_V6_PROPIA.testosterone_total[0]).toBe('sistema_hormonal');
    expect(RANGOS_FEMENINOS_V6.testosterone_total?.[3]).toBe(0.55);
    // `ferritina` también vive en dos dominios con bandas distintas.
    expect(banda(MATRIZ_MUJERES, 'inflamacion', 'ferritina'))
      .not.toEqual(banda(MATRIZ_MUJERES, 'renal_micronutrientes', 'ferritina'));
    expect(PARAMETROS_CON_V6_PROPIA.ferritin[0]).toBe('inflamacion');
  });

  it('cubre los 15 parámetros medidos y ninguno de los tres que esperan firma', () => {
    expect(Object.keys(RANGOS_FEMENINOS_V6)).toHaveLength(15);
    for (const pendiente of Object.keys(PENDIENTES_DE_FIRMA_CLINICA)) {
      expect(RANGOS_FEMENINOS_V6[pendiente]).toBeUndefined();
    }
  });
});

describe('rangoFemeninoV6 — el caso que duele', () => {
  it('testosterona total deja de leerse en rango de hombre', () => {
    // El legacy declaraba la ventana óptima de una mujer en 7 a 12 ng/ml, que es
    // de hombre. La V6 la pone en 0.2 a 0.55.
    const t = rangoFemeninoV6('testosterone_total', [null, null, null, 12, 7, 6, 4.5, 3]);
    expect(t).toEqual([0.91, 0.9, 0.7, 0.55, 0.2, 0.15, 0.11, 0.1]);
  });

  it('devuelve el arreglo original tal cual cuando la matriz no declara umbral propio', () => {
    const original = [null, null, null, 10, 9, 7, 6, 5];
    expect(rangoFemeninoV6('wakeup_energy', original)).toBe(original);
  });

  it('no toca los tres que esperan firma clínica', () => {
    const original = [null, null, null, 100, 170, 200, 250, 280];
    expect(rangoFemeninoV6('ldh', original)).toBe(original);
    expect(rangoFemeninoV6('hematocrit', original)).toBe(original);
    expect(rangoFemeninoV6('body_fat_pct', original)).toBe(original);
  });
});
