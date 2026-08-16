/**
 * Candados del expediente de labs que ve ARGOS.
 *
 * El caso que originó todo esto es el primer test: magnesio con cuatro
 * mediciones a lo largo de años tiene que llegar al cerebro CON su serie. El
 * contexto viejo leía once columnas fijas de la tabla ancha y magnesio no era
 * una de ellas, así que la pregunta del dueño no tenía respuesta posible.
 */
import { describe, it, expect } from 'vitest';
import { construirHistorias, resumirLabs, type MedicionLab } from '@/src/services/reports/labs-report-core';
import {
  construirBloqueLabs,
  lineaDetalle,
  recortarSerie,
  serieCompacta,
  mesDe,
  MAX_PUNTOS_SERIE,
} from '@/src/services/argos-labs-core';

/** La serie real del dueño, tal como está en la base. */
const MAGNESIO: MedicionLab[] = [
  { parameter_key: 'magnesio', value: 1.85, measured_at: '2023-09-22', source: 'lab_pdf' },
  { parameter_key: 'magnesio', value: 1.81, measured_at: '2024-11-04', source: 'lab_pdf' },
  { parameter_key: 'magnesio', value: 1.81, measured_at: '2025-06-18', source: 'lab_pdf' },
  { parameter_key: 'magnesio', value: 1.97, measured_at: '2026-06-12', source: 'lab_pdf' },
];

function bloqueDe(mediciones: MedicionLab[], sexo: 'male' | 'female' = 'male', fase: string | null = null) {
  const historias = construirHistorias(mediciones, sexo, fase);
  return { historias, bloque: construirBloqueLabs(historias, resumirLabs(historias)) };
}

describe('el caso que originó el arreglo', () => {
  it('magnesio llega al cerebro con sus cuatro mediciones y sus años', () => {
    const { bloque } = bloqueDe(MAGNESIO);
    const texto = bloque!.lineas.join('\n');
    expect(texto).toContain('1.85');
    expect(texto).toContain('1.97');
    expect(texto).toContain('2023-09');
    expect(texto).toContain('2026-06');
    expect(texto).toContain('4 mediciones');
  });

  it('el encabezado declara el tamaño real del expediente', () => {
    const { bloque } = bloqueDe(MAGNESIO);
    expect(bloque!.lineas[0]).toContain('1 biomarcadores');
    expect(bloque!.lineas[0]).toContain('4 mediciones');
  });
});

describe('nada queda invisible', () => {
  it('un parámetro fuera del corte de detalle igual aparece por nombre', () => {
    const muchos: MedicionLab[] = Array.from({ length: 12 }, (_, i) => ({
      parameter_key: `param_${i}`,
      value: 10 + i,
      measured_at: '2026-01-01',
      source: 'lab_pdf',
    }));
    const historias = construirHistorias(muchos, 'male', null);
    const bloque = construirBloqueLabs(historias, resumirLabs(historias), 5)!;
    expect(bloque.detallados).toBe(5);
    expect(bloque.soloNombre).toBe(7);
    const texto = bloque.lineas.join('\n');
    // Los 12 nombres tienen que estar, detallados o no.
    for (const h of historias) expect(texto).toContain(h.nombre);
  });

  it('sin biomarcadores no se arma bloque en vez de armar uno vacío', () => {
    expect(construirBloqueLabs([], resumirLabs([]))).toBeNull();
  });
});

describe('la regla que evita el dato incompleto dicho con confianza', () => {
  it('el bloque cierra declarando que la lista es completa', () => {
    const { bloque } = bloqueDe(MAGNESIO);
    const ultima = bloque!.lineas[bloque!.lineas.length - 1];
    expect(ultima).toContain('REGLA LABS');
    expect(ultima).toContain('expediente COMPLETO');
    expect(ultima).toContain('no está cargado');
  });
});

describe('cero rangos inventados', () => {
  it('un parámetro sin banda en la matriz se declara pendiente, no se le pone número', () => {
    const historias = construirHistorias(
      [{ parameter_key: 'parametro_que_no_existe_en_matriz', value: 42, measured_at: '2026-01-01', source: 'manual' }],
      'male',
      null,
    );
    expect(historias[0].ventana).toBeNull();
    expect(lineaDetalle(historias[0])).toContain('pendiente de rango funcional');
  });
});

describe('recorte de serie', () => {
  it('conserva el primero y los más recientes, y declara el hueco', () => {
    const puntos = Array.from({ length: 10 }, (_, i) => i);
    const { visibles, omitidos } = recortarSerie(puntos, 6);
    expect(visibles).toHaveLength(6);
    expect(visibles[0]).toBe(0); // el ancla del inicio nunca se pierde
    expect(visibles[visibles.length - 1]).toBe(9); // el más reciente tampoco
    expect(omitidos).toBe(4);
  });

  it('sin recorte no inventa hueco', () => {
    const { visibles, omitidos } = recortarSerie([1, 2, 3], MAX_PUNTOS_SERIE);
    expect(visibles).toEqual([1, 2, 3]);
    expect(omitidos).toBe(0);
  });

  it('la serie recortada marca el hueco en el texto', () => {
    const muchas: MedicionLab[] = Array.from({ length: 9 }, (_, i) => ({
      parameter_key: 'magnesio',
      value: 1.8 + i / 100,
      measured_at: `20${18 + i}-06-01`,
      source: 'lab_pdf',
    }));
    const historias = construirHistorias(muchas, 'male', null);
    expect(serieCompacta(historias[0])).toContain('más');
  });
});

describe('doctrina de ciclo', () => {
  it('un marcador hormonal de mujer viaja con su nota de fase', () => {
    const { bloque } = bloqueDe(
      [{ parameter_key: 'estradiol', value: 45, measured_at: '2026-06-01', source: 'lab_pdf' }],
      'female',
      'luteal',
    );
    expect(bloque!.lineas.join('\n').toLowerCase()).toContain('lútea');
  });

  it('si no se conoce la fase, se declara el hueco en vez de callarlo', () => {
    const historias = construirHistorias(
      [{ parameter_key: 'estradiol', value: 45, measured_at: '2026-06-01', source: 'lab_pdf' }],
      'female',
      null,
    );
    expect(historias[0].ciclo.show).toBe(true);
    expect(historias[0].ciclo.phaseKnown).toBe(false);
    expect(lineaDetalle(historias[0])).toContain(historias[0].ciclo.note);
  });

  it('en hombres no se cuela nota de ciclo', () => {
    const historias = construirHistorias(
      [{ parameter_key: 'estradiol', value: 25, measured_at: '2026-06-01', source: 'lab_pdf' }],
      'male',
      null,
    );
    expect(historias[0].ciclo.show).toBe(false);
  });
});

describe('formato', () => {
  it('la fecha se comprime a mes', () => {
    expect(mesDe('2026-06-12')).toBe('2026-06');
  });

  it('una sola medición no finge comparación', () => {
    const historias = construirHistorias(
      [{ parameter_key: 'magnesio', value: 1.9, measured_at: '2026-06-12', source: 'lab_pdf' }],
      'male',
      null,
    );
    const linea = lineaDetalle(historias[0]);
    expect(linea).toContain('medición única');
    expect(linea).not.toContain('se acercó');
    expect(linea).not.toContain('se alejó');
  });
});
