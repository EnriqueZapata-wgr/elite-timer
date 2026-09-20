/**
 * ATP 3.0, ruta 2.0: reglas de suplementos y ayuno en el prompt de ARGOS.
 * Candado: la leyenda fija, la lista negra y las exclusiones de ayuno no se
 * pueden perder en silencio. Si un test truena, se arregla el bloque.
 */
import { describe, it, expect } from 'vitest';
import {
  buildSuplementosAyunoInjection,
  LEYENDA_SUPLEMENTOS,
  LISTA_NEGRA_SUPLEMENTOS,
  EXCLUSIONES_AYUNO,
  AVISO_AYUNO,
  RENGLON_PLAN_EQUIPO,
  RENGLON_VENTANA_EQUIPO,
} from '@/src/services/argos-suplementos-ayuno-core';
import { ENCABEZADO_PLAN_EQUIPO, REGLA_PLAN_SUPLEMENTOS } from '@/src/services/argos-suplementos-plan-core';

describe('buildSuplementosAyunoInjection', () => {
  const bloque = buildSuplementosAyunoInjection();

  it('lleva la leyenda fija textual del informe legal (seccion 8)', () => {
    expect(bloque).toContain(LEYENDA_SUPLEMENTOS);
    expect(LEYENDA_SUPLEMENTOS).toContain('Los suplementos no son medicamentos');
    // 2026-09-20: la leyenda dejo de decir "diagnosticada" (palabra roja); ahora habla de "condición de salud".
    expect(LEYENDA_SUPLEMENTOS).toContain('condición de salud');
  });

  it('habla en "puedes considerar", nunca en orden', () => {
    expect(bloque).toContain('puedes considerar');
    expect(bloque).toContain('rangos comúnmente usados');
    expect(bloque).toContain('nunca "toma X mg"');
  });

  it('lista negra completa', () => {
    for (const s of ['efedrina', 'yohimbina', 'DMAA', 'SARMs']) {
      expect(LISTA_NEGRA_SUPLEMENTOS).toContain(s);
      expect(bloque).toContain(s);
    }
    expect(bloque).toContain('megadosis');
  });

  it('ayuno: ventanas 12:12 a 16:8 y nada prolongado', () => {
    expect(bloque).toContain('12:12');
    expect(bloque).toContain('16:8');
    expect(bloque).toContain('ayunos prolongados');
  });

  /**
   * 20-sep-2026: el detalle Elite manda "Ventana de alimentación: HH:MM a
   * HH:MM" como plan del equipo, y este bloque decía "solo de 12:12 a 16:8"
   * sin excepción. Dos órdenes obligatorias en choque sobre un plan firmado.
   * Ahora la ventana del plan manda; lo de 12:12 a 16:8 es solo fuera del plan.
   */
  it('ayuno: la ventana que fijó el plan del equipo manda; 12:12 a 16:8 es solo fuera del plan', () => {
    expect(RENGLON_VENTANA_EQUIPO).toBe('Ventana de alimentación');
    const iAyuno = bloque.indexOf('Ayuno:');
    expect(iAyuno).toBeGreaterThan(0);
    const capaAyuno = bloque.slice(iAyuno);
    expect(capaAyuno).toContain(`renglón "${RENGLON_VENTANA_EQUIPO}" con horas), esa manda`);
    expect(capaAyuno).toContain('explícala tal cual, como plan de su equipo');
    // La regla general queda explícitamente acotada a lo que no fijó el plan.
    expect(capaAyuno).toContain('Fuera del plan, solo ventanas comunes, de 12:12 a 16:8');
    expect(capaAyuno.indexOf('esa manda')).toBeLessThan(capaAyuno.indexOf('12:12'));
  });

  it('ayuno: las cuatro exclusiones del informe legal', () => {
    expect(EXCLUSIONES_AYUNO).toHaveLength(4);
    for (const e of ['menores', 'embarazo', 'lactancia', 'diabetes tipo 1', 'insulina', 'trastornos alimentarios']) {
      expect(bloque).toContain(e);
    }
    expect(bloque).toContain(AVISO_AYUNO);
  });

  it('no vincula suplementos con enfermedad y no usa palabras rojas afirmativas', () => {
    expect(bloque).toContain('nunca con una enfermedad');
    // La leyenda fija ya no usa "diagnosticada"; nada del bloque debe usarla.
    const sinLeyenda = bloque.replace(LEYENDA_SUPLEMENTOS, '');
    for (const roja of ['diagnostic', 'diagnóstic', 'tratamiento', 'terapéutic', 'previene', 'cura ']) {
      expect(sinLeyenda.toLowerCase()).not.toContain(roja);
    }
  });

  it('corto y sin em dashes', () => {
    expect(bloque.length).toBeLessThan(1500);
    expect(bloque).not.toContain('—');
  });
});

/**
 * 20-sep-2026: la excepción del plan Elite. El caso: Omar pregunta "por qué
 * me pusiste magnesio". El contexto trae "Plan de suplementos de tu equipo
 * (asignado por Enrique Zapata): Magnesio (glicinato): ..., noche. Por qué:
 * ...". ARGOS lo explica como plan de su equipo, con la dosis y el momento
 * escritos, sin "puedes considerar" y con la leyenda una vez al final.
 */
describe('la excepción del plan del equipo', () => {
  const bloque = buildSuplementosAyunoInjection();

  it('las dos capas apuntan al MISMO renglón del contexto', () => {
    expect(RENGLON_PLAN_EQUIPO).toBe(ENCABEZADO_PLAN_EQUIPO);
    expect(bloque).toContain(`renglón "${RENGLON_PLAN_EQUIPO}"`);
    expect(REGLA_PLAN_SUPLEMENTOS).toContain(`"${ENCABEZADO_PLAN_EQUIPO}"`);
  });

  it('lo del plan se explica como plan de su equipo, con dosis y momento, sin muletilla', () => {
    const iPlan = bloque.indexOf('Del plan de su equipo');
    const iFuera = bloque.indexOf('Fuera de ese plan:');
    expect(iPlan).toBeGreaterThan(0);
    expect(iFuera).toBeGreaterThan(iPlan);
    const capaPlan = bloque.slice(iPlan, iFuera);
    expect(capaPlan).toContain('tal como están escritos');
    expect(capaPlan).toContain('tu plan dice X mg en la noche');
    expect(capaPlan).toContain('Sin "puedes considerar"');
    expect(capaPlan).toContain('sin cambiar dosis ni agregar nada');
    expect(capaPlan).toContain('Si dice "dosis sin fijar", no la inventes');
  });

  it('la leyenda va una vez al final para el plan; cada sugerencia para lo de fuera', () => {
    const iFuera = bloque.indexOf('Fuera de ese plan:');
    const capaPlan = bloque.slice(0, iFuera);
    const capaFuera = bloque.slice(iFuera);
    expect(capaPlan).toContain('la leyenda va UNA vez al final de la respuesta, no en cada mención');
    expect(capaFuera).toContain('Cierra CADA sugerencia de suplemento con esta leyenda');
    // La leyenda textual sigue apareciendo (LGS 216), y una sola vez en el bloque.
    expect(bloque.split(LEYENDA_SUPLEMENTOS).length - 1).toBe(1);
  });

  it('la regla general ("puedes considerar", categorías) queda SOLO para lo que no está en el plan', () => {
    const iFuera = bloque.indexOf('Fuera de ese plan:');
    const capaFuera = bloque.slice(iFuera);
    expect(capaFuera).toContain('Di "puedes considerar"');
    expect(capaFuera).toContain('Sugiere categorías');
  });
});
