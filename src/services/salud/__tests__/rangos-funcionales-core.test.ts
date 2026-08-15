/**
 * CIERRE-3 — el candado de la fuente única de rangos.
 *
 * El legacy `functional-health-engine` no tenía UN SOLO test automatizado, y por
 * eso pudo vivir años con una IgG cuyo rango óptimo empezaba en 80 en vez de 800.
 * Este archivo existe para que la consolidación no herede esa costumbre.
 *
 * Los casos de abajo no son inventados: son los que la auditoría encontró
 * pintándose distinto en el panel del coach y en ATP Labs.
 */
import { describe, expect, it } from 'vitest';

import {
  BIO_A_MATRIZ,
  COLUMNAS_LAB_SIN_BANDA,
  COLUMNA_A_MATRIZ,
  CUERPO_A_MATRIZ,
  RANGOS_SOLO_EN_LEGACY,
  direccionDe,
  evaluarCampo,
  nivelDeScore,
} from '../rangos-funcionales-core';
import type { Sex } from '@/src/types/edad-atp-v2';

const lab = (col: string, v: number | null, sex: Sex = 'male') =>
  evaluarCampo(COLUMNA_A_MATRIZ, col, v, sex);
const bio = (f: string, v: number, sex: Sex = 'male') => evaluarCampo(BIO_A_MATRIZ, f, v, sex);
const cuerpo = (f: string, v: number, sex: Sex = 'male') => evaluarCampo(CUERPO_A_MATRIZ, f, v, sex);

describe('los desacuerdos que la auditoría encontró en pantalla', () => {
  it('VO2 de 55 está en la ventana (el panel decía Aceptable)', () => {
    expect(bio('vo2_max', 55)).toEqual({ nivel: 'optimo', direccion: 'en_rango' });
  });

  it('IgG de 900 es óptima y una de 700 NO lo es', () => {
    // El legacy daba verde a todo el intervalo [80, 1200] por un cero perdido.
    expect(lab('igg', 900).nivel).toBe('optimo');
    expect(lab('igg', 700).nivel).not.toBe('optimo');
  });

  it('la testosterona se lee por sexo, no con los umbrales del hombre', () => {
    // El legacy copiaba los umbrales masculinos al array femenino.
    expect(lab('testosterone', 8, 'male').nivel).toBe('optimo');
    expect(lab('testosterone', 8, 'female').nivel).not.toBe('optimo');
    expect(lab('testosterone', 0.35, 'female').nivel).toBe('optimo');
  });
});

describe('conversiones de unidad — la matriz habla en fracción y la base en porcentaje', () => {
  it('hba1c de 5.2% es óptima', () => {
    // CANDADO DE COMA FLOTANTE: 5.2/100 = 0.052000000000000005, que es MAYOR
    // que el techo 0.052 de la banda óptima. Sin el redondeo, una hba1c
    // perfecta se pinta "Aceptable ↑" por un error de 5e-18.
    expect(lab('hba1c', 5.2)).toEqual({ nivel: 'optimo', direccion: 'en_rango' });
  });

  it('hba1c de 6.5% se sale', () => {
    expect(lab('hba1c', 6.5).nivel).toBe('fuera_de_rango');
  });

  it('hematocrito, rdw, grasa y músculo entran en porcentaje', () => {
    // Sin conversión, comparar 42 contra bandas de 0.38 a 0.44 daría
    // "fuera de rango" a todo el mundo, siempre.
    expect(lab('hematocrit', 42).nivel).toBe('optimo');
    expect(lab('rdw', 12).nivel).toBe('optimo');
    expect(cuerpo('body_fat_pct', 12).nivel).toBe('optimo');
    expect(cuerpo('muscle_mass_pct', 45).nivel).toBe('optimo');
  });
});

describe('nivel y dirección', () => {
  it('traduce los cinco scores posibles de la matriz', () => {
    expect(nivelDeScore(100)).toBe('optimo');
    expect(nivelDeScore(80)).toBe('aceptable');
    expect(nivelDeScore(50)).toBe('riesgo');
    expect(nivelDeScore(25)).toBe('critico');
    expect(nivelDeScore(0)).toBe('fuera_de_rango');
    expect(nivelDeScore(null)).toBe('sin_banda');
  });

  it('la dirección distingue los dos ceros del score', () => {
    // score9Bands devuelve 0 por arriba y por abajo; sin esto la flecha miente.
    const bandas = [75, 80, 90, 100, 115, 120, 129, 140];
    expect(direccionDe(110, bandas)).toBe('en_rango');
    expect(direccionDe(200, bandas)).toBe('arriba');
    expect(direccionDe(50, bandas)).toBe('abajo');
  });

  it('sin banda óptima definida no hay dirección', () => {
    expect(direccionDe(10, [1, 2, 3, null, null, 6, 7, 8])).toBeNull();
  });

  it('glucosa: óptimo, arriba, abajo y fuera', () => {
    expect(lab('glucose', 80)).toEqual({ nivel: 'optimo', direccion: 'en_rango' });
    expect(lab('glucose', 95).direccion).toBe('arriba');
    expect(lab('glucose', 60).direccion).toBe('abajo');
    expect(lab('glucose', 300)).toEqual({ nivel: 'fuera_de_rango', direccion: 'arriba' });
  });

  it('la presión arterial llega a la matriz', () => {
    expect(bio('blood_pressure_sys', 110).nivel).toBe('optimo');
    expect(bio('blood_pressure_dia', 70).nivel).toBe('optimo');
  });
});

describe('lo que se arregla gratis y lo que no se inventa', () => {
  it('seis columnas que siempre decían "Sin dato" ya tienen puente', () => {
    // El mapa viejo apuntaba a claves que no existían ni en el legacy.
    for (const c of ['lh', 'cpk', 'urea', 'transferrin', 'iron_saturation', 'iron_binding']) {
      expect(COLUMNA_A_MATRIZ[c], `${c} sin puente a la matriz`).toBeDefined();
    }
  });

  it('lo que la matriz no define responde sin_banda, nunca un rango prestado', () => {
    for (const c of COLUMNAS_LAB_SIN_BANDA) {
      expect(lab(c, 10).nivel, `${c} debería ser sin_banda`).toBe('sin_banda');
    }
  });

  it('una columna desconocida o un valor nulo no inventan veredicto', () => {
    expect(lab('columna_que_no_existe', 5).nivel).toBe('sin_banda');
    expect(lab('glucose', null).nivel).toBe('sin_banda');
  });

  it('los rangos que solo existían en el legacy quedan anotados, no borrados', () => {
    expect(RANGOS_SOLO_EN_LEGACY.map((r) => r.claveLegacy)).toEqual([
      'sleep_quality',
      'water_liters',
    ]);
    for (const r of RANGOS_SOLO_EN_LEGACY) {
      expect(r.umbralesLegacy.length, `${r.claveLegacy} sin sus 8 umbrales`).toBe(8);
      expect(r.nota.length).toBeGreaterThan(0);
    }
  });
});
