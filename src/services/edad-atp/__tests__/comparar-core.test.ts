/**
 * comparar-core (ATP 3.0, ruta 2.5): emparejar fechas de estudio y decir si
 * cada marcador mejoro, empeoro o sigue igual contra su ventana funcional.
 */
import { describe, it, expect } from 'vitest';
import {
  fechasDeEstudio, fechasPorDefecto, valorEnFecha, flechaDe, emparejar,
  resumirComparacion, fraseComparacion, formateaDelta, ventanaDe,
} from '../comparar-core';

// Hombres, matriz V7: colesterol_ldl ventana 80 a 120; colesterol_hdl 60 a 100.
const VENTANA = { lo: 80, hi: 120 };

describe('flechaDe', () => {
  it('acercarse a la ventana es mejorar aunque el numero baje', () => {
    expect(flechaDe(190, 150, VENTANA)).toBe('mejoro');
  });
  it('entrar a la ventana es mejorar', () => {
    expect(flechaDe(150, 100, VENTANA)).toBe('mejoro');
  });
  it('alejarse de la ventana es empeorar aunque el numero suba', () => {
    expect(flechaDe(100, 160, VENTANA)).toBe('empeoro');
  });
  it('por debajo de la ventana, subir hacia ella es mejorar', () => {
    expect(flechaDe(50, 70, VENTANA)).toBe('mejoro');
  });
  it('dos valores dentro de la ventana son igual aunque cambie el numero', () => {
    expect(flechaDe(90, 110, VENTANA)).toBe('igual');
  });
  it('mismo valor es igual', () => {
    expect(flechaDe(150, 150, VENTANA)).toBe('igual');
  });
  it('sin ventana conocida no hay juicio', () => {
    expect(flechaDe(10, 20, null)).toBe('sin_juicio');
  });
});

describe('fechasDeEstudio y fechasPorDefecto', () => {
  const series = {
    colesterol_ldl: [
      { value: 150, measured_at: '2026-01-10' },
      { value: 130, measured_at: '2026-04-15' },
      { value: null, measured_at: '2026-08-01' },
    ],
    colesterol_hdl: [
      { value: 55, measured_at: '2026-04-15' },
      { value: 62, measured_at: '2026-07-20' },
    ],
  };
  it('lista las fechas distintas con valor real, de reciente a antigua', () => {
    expect(fechasDeEstudio(series)).toEqual(['2026-07-20', '2026-04-15', '2026-01-10']);
  });
  it('una fecha con puros null no es un estudio', () => {
    expect(fechasDeEstudio(series)).not.toContain('2026-08-01');
  });
  it('por defecto compara las dos mas recientes, la anterior como A', () => {
    expect(fechasPorDefecto(fechasDeEstudio(series))).toEqual({ a: '2026-04-15', b: '2026-07-20' });
  });
  it('con un solo estudio no hay comparacion', () => {
    expect(fechasPorDefecto(['2026-01-10'])).toBeNull();
    expect(fechasPorDefecto([])).toBeNull();
  });
});

describe('valorEnFecha', () => {
  it('toma el ultimo valor real de ese dia y null si no hay', () => {
    const puntos = [
      { value: 1, measured_at: '2026-01-10' },
      { value: null, measured_at: '2026-01-10' },
      { value: 3, measured_at: '2026-01-10' },
    ];
    expect(valorEnFecha(puntos, '2026-01-10')).toBe(3);
    expect(valorEnFecha(puntos, '2026-02-10')).toBeNull();
    expect(valorEnFecha(undefined, '2026-02-10')).toBeNull();
  });
});

describe('emparejar', () => {
  const series = {
    colesterol_ldl: [
      { value: 190, measured_at: '2026-01-10' },
      { value: 150, measured_at: '2026-04-15' },
    ],
    colesterol_hdl: [
      { value: 70, measured_at: '2026-01-10' },
      { value: 50, measured_at: '2026-04-15' },
    ],
    // Solo en el estudio B: sin par, sin flecha.
    colesterol_total: [
      { value: 210, measured_at: '2026-04-15' },
    ],
    // Un null en B no cuenta como valor: queda sin par.
    bilirrubina: [
      { value: 0.8, measured_at: '2026-01-10' },
      { value: null, measured_at: '2026-04-15' },
    ],
    // Sin banda en la matriz: se reporta la diferencia sin juicio.
    marcador_inventado: [
      { value: 10, measured_at: '2026-01-10' },
      { value: 12, measured_at: '2026-04-15' },
    ],
  };
  const filas = emparejar('male', series, '2026-01-10', '2026-04-15');

  it('las filas con par van primero, alfabetico; las sin par al final', () => {
    expect(filas.map((f) => f.key)).toEqual([
      'colesterol_hdl', 'colesterol_ldl', 'marcador_inventado', 'bilirrubina', 'colesterol_total',
    ]);
  });
  it('mejoro y empeoro se leen contra la ventana', () => {
    const ldl = filas.find((f) => f.key === 'colesterol_ldl');
    expect(ldl?.flecha).toBe('mejoro');
    expect(ldl?.delta).toBe(-40);
    const hdl = filas.find((f) => f.key === 'colesterol_hdl');
    expect(hdl?.flecha).toBe('empeoro');
    expect(hdl?.delta).toBe(-20);
  });
  it('sin direccion conocida hay diferencia pero no flecha de juicio', () => {
    const inv = filas.find((f) => f.key === 'marcador_inventado');
    expect(inv?.flecha).toBe('sin_juicio');
    expect(inv?.delta).toBe(2);
  });
  it('un valor null o ausente deja la fila sin par', () => {
    const bil = filas.find((f) => f.key === 'bilirrubina');
    expect(bil?.valorA).toBe(0.8);
    expect(bil?.valorB).toBeNull();
    expect(bil?.flecha).toBeNull();
    expect(bil?.delta).toBeNull();
    const tot = filas.find((f) => f.key === 'colesterol_total');
    expect(tot?.valorA).toBeNull();
    expect(tot?.valorB).toBe(210);
    expect(tot?.flecha).toBeNull();
  });
  it('resume y redacta sin hablar de numeros que suben', () => {
    const r = resumirComparacion(filas);
    expect(r).toEqual({ mejoraron: 1, empeoraron: 1, igual: 0, sinJuicio: 1, sinPar: 2 });
    expect(fraseComparacion(r)).toBe('1 se acercó a tu ventana, 1 se alejó.');
    expect(fraseComparacion({ mejoraron: 2, empeoraron: 0, igual: 3, sinJuicio: 0, sinPar: 0 }))
      .toBe('2 se acercaron a tu ventana, 3 se mantienen.');
  });
  it('un marcador solo en un estudio no rompe cuando la fecha no existe en la otra serie', () => {
    const solo = emparejar('male', { colesterol_ldl: [{ value: 150, measured_at: '2026-01-10' }] }, '2026-01-10', '2026-04-15');
    expect(solo).toHaveLength(1);
    expect(solo[0].flecha).toBeNull();
  });
});

describe('frases y formato', () => {
  it('sin marcadores compartidos lo dice', () => {
    expect(fraseComparacion({ mejoraron: 0, empeoraron: 0, igual: 0, sinJuicio: 0, sinPar: 3 }))
      .toBe('Estos dos estudios no comparten marcadores.');
  });
  it('solo sin juicio lo dice', () => {
    expect(fraseComparacion({ mejoraron: 0, empeoraron: 0, igual: 0, sinJuicio: 2, sinPar: 0 }))
      .toContain('ninguno con rango funcional');
  });
  it('formateaDelta pone signo y decimales por magnitud', () => {
    expect(formateaDelta(-40)).toBe('-40');
    expect(formateaDelta(2.345)).toBe('+2.3');
    expect(formateaDelta(0.123)).toBe('+0.12');
    expect(formateaDelta(0)).toBe('0.00');
  });
  it('ventanaDe devuelve la ventana funcional de la matriz o null', () => {
    expect(ventanaDe('male', 'colesterol_ldl')).toEqual({ lo: 80, hi: 120 });
    expect(ventanaDe('male', 'marcador_inventado')).toBeNull();
  });
});
