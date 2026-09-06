/**
 * Tests del esquema elite_v3 (ruta 3.1). Se corren con
 * `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/elite-v3-core.test.ts`.
 *
 * Candados que este test protege (no aflojar; si el contrato cambia, la razon
 * va escrita aqui): el ejemplo real anonimizado pasa; estado sin valor,
 * evidencia fuera de 1..4, palabra roja en texto de usuario, em dash, seccion
 * faltante y dosis negativa se rechazan; el resumen para ARGOS cabe en 1,800
 * caracteres sin palabras rojas; el plan de suplementos mapea a las columnas
 * reales de user_supplements (055 + 167 + 312).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ELITE_SECCIONES,
  RESUMEN_ARGOS_MAX,
  esEliteV3,
  marcadoresDe,
  nivelCalidadEliteV3,
  palabrasRojasEn,
  resumenParaArgos,
  suplementosAFilas,
  validarEliteV3,
  type EliteV3,
} from '../elite-v3-core';

// Se lee del disco (precedente: tarea-images-contrato.test.ts): el cwd es la
// raiz del repo tanto en vitest como en el runner sin vitest.
const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

/** Copia profunda para mutar sin tocar el ejemplo importado. */
function clon(): Record<string, any> {
  return JSON.parse(JSON.stringify(ejemplo));
}

function erroresDe(obj: unknown): string[] {
  const r = validarEliteV3(obj);
  return r.ok ? [] : r.errores;
}

describe('validarEliteV3 con el ejemplo real anonimizado', () => {
  it('el DX de O. pasa completo', () => {
    const r = validarEliteV3(ejemplo);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    expect(r.ok).toBe(true);
  });

  it('trae las 15 secciones y los conteos del documento cuadran con las filas', () => {
    const r = validarEliteV3(ejemplo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const e = r.valor;
    for (const s of ELITE_SECCIONES) expect((e as unknown as Record<string, unknown>)[s]).toBeDefined();
    const filas = e.marcadores.grupos.flatMap((g) => g.marcadores);
    expect(filas).toHaveLength(28);
    const porEstado = { att: 0, sub: 0, opt: 0 };
    for (const m of filas) if (m.estado) porEstado[m.estado] += 1;
    expect(porEstado).toEqual(e.conteo.mueven_tu_caso);
    expect(e.genetica.hallazgos).toHaveLength(e.conteo.hallazgos_adn as number);
    expect(e.sistemas).toHaveLength(10);
    expect(e.cruces.lista).toHaveLength(6);
    expect(e.cliente.nombre_preferido).toBe('O.');
  });

  it('los marcadores estimados van con flag, fuente ctx y sin la etiqueta en el nombre', () => {
    const est = marcadoresDe(ejemplo as unknown as EliteV3).filter((m) => m.estimado);
    expect(est).toHaveLength(2);
    for (const m of est) {
      expect(m.fuente).toContain('ctx');
      expect(m.nombre).not.toMatch(/ESTIMAD/);
    }
  });

  it('nivel de calidad 5 con genetica, 4 sin ella', () => {
    expect(nivelCalidadEliteV3(ejemplo as unknown as EliteV3)).toBe(5);
    const sin = clon();
    sin.genetica.hallazgos = [];
    delete sin.interpretado_por.genetica;
    const r = validarEliteV3(sin);
    expect(r.ok).toBe(true);
    if (r.ok) expect(nivelCalidadEliteV3(r.valor)).toBe(4);
  });
});

describe('validarEliteV3 rechaza', () => {
  it('estado sin valor', () => {
    const o = clon();
    o.marcadores.grupos[0].marcadores[0].valor = null;
    const err = erroresDe(o);
    expect(err.length).toBeGreaterThan(0);
    expect(err.some((x) => x.includes('estado: debe ser null cuando valor es null'))).toBe(true);
  });

  it('evidencia 5', () => {
    const o = clon();
    o.marcadores.grupos[2].marcadores[0].evidencia = 5;
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('evidencia debe ser 1..4'))).toBe(true);
  });

  it('palabra roja en un texto de usuario', () => {
    const o = clon();
    o.sistemas[0].por_que = 'Esto es un diagnóstico de tu metabolismo.';
    const err = erroresDe(o);
    expect(err.some((x) => x.startsWith('sistemas[0].por_que') && x.includes('diagnostico'))).toBe(true);
  });

  it('palabra roja se permite solo en medico.pendientes[].con_quien', () => {
    const o = clon();
    o.medico.pendientes[0].con_quien = 'Tu médico tratante decide el tratamiento';
    expect(erroresDe(o)).toEqual([]);
    o.medico.pendientes[0].por_que = 'Para definir tratamiento';
    expect(erroresDe(o).some((x) => x.startsWith('medico.pendientes[0].por_que'))).toBe(true);
  });

  it('em dash', () => {
    const o = clon();
    o.cierre.palancas[0].como = 'Bajar el alcohol \u2014 y medir GGT';
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('em dash'))).toBe(true);
  });

  it('seccion faltante', () => {
    const o = clon();
    delete o.braverman;
    expect(erroresDe(o)).toContain('braverman: seccion faltante');
    const o2 = clon();
    o2.suplementos = null;
    expect(erroresDe(o2)).toContain('suplementos: seccion faltante');
  });

  it('dosis negativa', () => {
    const o = clon();
    o.suplementos[0].dosis_cantidad = -400;
    o.suplementos[0].dosis_unidad = 'mg';
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('suplementos[0].dosis_cantidad'))).toBe(true);
    const o2 = clon();
    o2.suplementos[0].unidades_por_toma = -1;
    expect(erroresDe(o2).some((x) => x.includes('suplementos[0].unidades_por_toma'))).toBe(true);
  });

  it('lo que no es objeto, schema distinto y genetica sin firma', () => {
    expect(validarEliteV3(null).ok).toBe(false);
    expect(validarEliteV3('elite').ok).toBe(false);
    const o = clon();
    o.schema = 'elite_v2';
    expect(erroresDe(o).some((x) => x.startsWith('schema'))).toBe(true);
    const o2 = clon();
    delete o2.interpretado_por.genetica;
    expect(erroresDe(o2).some((x) => x.includes('interpretado_por.genetica'))).toBe(true);
  });

  it('palancas deben ser exactamente tres', () => {
    const o = clon();
    o.cierre.palancas.pop();
    expect(erroresDe(o)).toContain('cierre.palancas: exactamente tres');
  });
});

describe('palabrasRojasEn', () => {
  it('detecta la lista del informe legal sin importar acentos ni mayusculas', () => {
    expect(palabrasRojasEn('Te diagnosticamos')).toEqual(['diagnostico']);
    expect(palabrasRojasEn('un Chequeo anual')).toEqual(['chequeo']);
    expect(palabrasRojasEn('esto previene y cura')).toEqual(['previene', 'cura']);
    expect(palabrasRojasEn('efecto terapéutico')).toEqual(['terapeutico']);
    expect(palabrasRojasEn('clínicamente validado')).toEqual(['clinicamente validado']);
    expect(palabrasRojasEn('tu médico de IA')).toEqual(['medico de IA']);
    expect(palabrasRojasEn('receta médica')).toEqual(['receta medica']);
  });

  it('no dispara con palabras vecinas legitimas', () => {
    expect(palabrasRojasEn('procura dormir; tu médico tratante; curva de glucosa; dirección clínica')).toEqual([]);
  });
});

describe('resumenParaArgos', () => {
  it('cabe en 1,800 caracteres, sin palabras rojas ni em dashes, y dice lo esencial', () => {
    const r = resumenParaArgos(ejemplo as unknown as EliteV3);
    expect(r.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(r.length).toBeGreaterThan(400);
    expect(palabrasRojasEn(r)).toEqual([]);
    expect(r.includes('\u2014')).toBe(false);
    expect(r).toContain('O.');
    // 13 de sangre y sueno mas 2 de composicion (grasa y grasa visceral).
    expect(r).toContain('Piden accion (15)');
    expect(r).toContain('Enzima del hígado (GGT) 67 (objetivo hasta 30)');
    expect(r).toContain('Hilo: Alcohol aparece en 6 de 6 cruces');
    expect(r).toContain('Palancas: 1) Tu hígado y el alcohol; 2)');
    expect(r).toContain('Cruces: 1) Tu hígado te está avisando');
    expect(r).toContain('Pendiente de medir: Estudio de apnea del sueño');
    expect(r).toContain('Magnesio (glicinato) dosis sin fijar (evening)');
  });

  it('con nombres larguisimos acorta las listas con un conteo, nunca a media frase', () => {
    const o = clon();
    for (const g of o.marcadores.grupos) for (const m of g.marcadores) m.nombre = m.nombre + ' ' + 'x'.repeat(120);
    for (const cr of o.cruces.lista) cr.titulo = cr.titulo + ' ' + 'y'.repeat(200);
    const r = resumenParaArgos(o as unknown as EliteV3);
    expect(r.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(r).toMatch(/Piden accion \(15\): .*\(\+\d+ mas\)\./);
    expect(r).toContain('Palancas: 1)');
    expect(r).toContain('Plan de suplementos: Magnesio');
    expect(r.endsWith('.')).toBe(true);
  });
});

describe('suplementosAFilas', () => {
  it('mapea a las columnas de user_supplements con source coach e is_plan true', () => {
    const filas = suplementosAFilas(ejemplo as unknown as EliteV3, 'user-123');
    expect(filas).toHaveLength(6);
    const mg = filas[0];
    expect(mg).toMatchObject({
      user_id: 'user-123', name: 'Magnesio (glicinato)', timing: 'evening', source: 'coach', is_plan: true, is_active: true,
      amount_per_unit: null, amount_unit: null, units_per_dose: null, notes: null,
    });
    // Raya de sin dato (SIN_DATO de adherencia-core), la unica excepcion al candado de em dashes.
    expect(mg.dosage).toBe('\u2014');
    expect(mg.reason).toContain('Corrige el nivel bajo');
    // Sin hora fijada en el manual: default 'morning' de la columna (055).
    expect(filas[1].timing).toBe('morning');
    expect(filas[1].notes).toContain('K2');
  });

  it('con dosis completa arma el texto de la ficha y respeta la unidad', () => {
    const o = clon();
    o.suplementos[0] = { ...o.suplementos[0], dosis_cantidad: 400, dosis_unidad: 'mg', unidades_por_toma: 2, duracion: '12 semanas', advertencia: 'No con antiácidos' };
    const r = validarEliteV3(o);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [f] = suplementosAFilas(r.valor, 'u');
    expect(f.dosage).toBe('2 por toma de 400 mg');
    expect(f.amount_per_unit).toBe(400);
    expect(f.amount_unit).toBe('mg');
    expect(f.units_per_dose).toBe(2);
    expect(f.notes).toBe('Duracion: 12 semanas. No con antiácidos');
  });
});

describe('esEliteV3', () => {
  it('reconoce sources_snapshot con elite_v3 y rechaza el resto', () => {
    expect(esEliteV3({ elite_v3: ejemplo })).toBe(true);
    expect(esEliteV3({ elite_v3: { schema: 'otro' } })).toBe(false);
    expect(esEliteV3({ labs: {} })).toBe(false);
    expect(esEliteV3(null)).toBe(false);
    expect(esEliteV3(ejemplo)).toBe(false);
  });
});
