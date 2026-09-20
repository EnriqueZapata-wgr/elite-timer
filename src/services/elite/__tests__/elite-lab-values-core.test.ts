// 20-sep-2026 (migracion 324): los marcadores de la evaluacion Elite llegan a
// lab_values con clave canonica, sin estimados y sin inventar unidades.
import { describe, it, expect } from 'vitest';
import {
  claveCanonicaDeLaboratorio,
  fechaMedicionDeToma,
  labValuesDeEvaluacion,
} from '@/src/services/elite/elite-lab-values-core';
import type { EliteMarcador, EliteV3 } from '@/src/services/elite/elite-v3-core';

function marcador(p: Partial<EliteMarcador> & { key: string }): EliteMarcador {
  return {
    nombre: p.key,
    valor: 1,
    unidad: null,
    rango_lab: null,
    objetivo: null,
    estado: null,
    fuente: ['lab'],
    evidencia: null,
    estimado: false,
    ...p,
  };
}

/** Solo lo que labValuesDeEvaluacion lee: grupos de marcadores y filas de composicion. */
function evaluacionCon(grupos: EliteMarcador[], composicion: EliteMarcador[] = []): EliteV3 {
  return {
    marcadores: { intro: null, grupos: [{ nombre: 'Grupo', marcadores: grupos }], notas: [] },
    composicion: { reparto: null, filas: composicion },
  } as unknown as EliteV3;
}

describe('claveCanonicaDeLaboratorio', () => {
  it('una clave canonica de laboratorio pasa tal cual', () => {
    expect(claveCanonicaDeLaboratorio('glucosa_en_ayuno')).toEqual({ ok: true, key: 'glucosa_en_ayuno' });
    expect(claveCanonicaDeLaboratorio('tsh')).toEqual({ ok: true, key: 'tsh' });
    expect(claveCanonicaDeLaboratorio('homair')).toEqual({ ok: true, key: 'homair' });
  });
  it('resuelve alias del formato Omar y claves inglesas del mapa canonico', () => {
    expect(claveCanonicaDeLaboratorio('homa_ir')).toEqual({ ok: true, key: 'homair' });
    expect(claveCanonicaDeLaboratorio('pcr_ultrasensible')).toEqual({ ok: true, key: 'proteina_c_reactiva_cuantitativa_pcr' });
    expect(claveCanonicaDeLaboratorio('testosterone')).toEqual({ ok: true, key: 'testosterona_total' });
  });
  it('lo que no es laboratorio se dice con ese nombre, no como clave desconocida', () => {
    expect(claveCanonicaDeLaboratorio('grasa_corporal')).toEqual({ ok: false, motivo: 'no_es_laboratorio' });
    expect(claveCanonicaDeLaboratorio('relacion_trigliceridos_hdl')).toEqual({ ok: false, motivo: 'no_es_laboratorio' });
    expect(claveCanonicaDeLaboratorio('sueno_deep')).toEqual({ ok: false, motivo: 'no_es_laboratorio' });
  });
  it('una clave que nadie conoce se omite, no se adivina', () => {
    expect(claveCanonicaDeLaboratorio('osmolalidad')).toEqual({ ok: false, motivo: 'sin_clave_canonica' });
    expect(claveCanonicaDeLaboratorio('peso')).toEqual({ ok: false, motivo: 'sin_clave_canonica' });
  });
});

describe('labValuesDeEvaluacion', () => {
  it('escribe los laboratorios con valor y deja fuera estimados, nulos y lo que no es laboratorio', () => {
    const e = evaluacionCon([
      marcador({ key: 'glucosa_en_ayuno', nombre: 'Azucar en ayuno', valor: 87, unidad: 'mg/dL' }),
      marcador({ key: 'vitamina_d', nombre: 'Vitamina D', valor: 18.7 }),
      marcador({ key: 'sueno_deep', nombre: 'Sueno profundo', valor: 13, unidad: '%', estimado: true }),
      marcador({ key: 'osmolalidad', nombre: 'Osmolalidad', valor: 272.1 }),
      marcador({ key: 'ferritina', nombre: 'Ferritina', valor: null }),
    ], [
      marcador({ key: 'grasa_corporal', nombre: '% Grasa', valor: 26.6, unidad: '%' }),
    ]);
    const r = labValuesDeEvaluacion(e);
    expect(r.filas.map((f) => f.parameter_key)).toEqual(['glucosa_en_ayuno', 'vitamina_d']);
    expect(r.filas[0]).toEqual({ parameter_key: 'glucosa_en_ayuno', value: 87, unit: 'mg/dL', nombre: 'Azucar en ayuno', key_documento: 'glucosa_en_ayuno' });
    // Sin unidad en el documento, la unidad queda en null: no se supone la de la matriz.
    expect(r.filas[1].unit).toBeNull();
    expect(r.omitidos).toEqual([
      { key: 'sueno_deep', nombre: 'Sueno profundo', motivo: 'estimado' },
      { key: 'osmolalidad', nombre: 'Osmolalidad', motivo: 'sin_clave_canonica' },
      { key: 'ferritina', nombre: 'Ferritina', motivo: 'sin_valor' },
      { key: 'grasa_corporal', nombre: '% Grasa', motivo: 'no_es_laboratorio' },
    ]);
  });

  it('ggt y AST se desdoblan en todas sus claves hermanas, como al escribir un PDF', () => {
    const r = labValuesDeEvaluacion(evaluacionCon([
      marcador({ key: 'ggt', nombre: 'GGT', valor: 67 }),
      marcador({ key: 'transaminasa_glutamico_oxalacetica_ast', nombre: 'AST', valor: 49 }),
    ]));
    expect(r.filas.map((f) => f.parameter_key)).toEqual([
      'gama_glutamil_transferasa', 'ggt',
      'transaminasa_glutamico_oxalacetica_ast', 'transaminasa_g_oxalacetica_ast_tgo',
    ]);
    expect(r.filas.every((f) => f.key_documento === 'ggt' || f.key_documento === 'transaminasa_glutamico_oxalacetica_ast')).toBe(true);
  });

  it('hba1c entra en fraccion decimal, como el resto de lab_values', () => {
    const r = labValuesDeEvaluacion(evaluacionCon([marcador({ key: 'hba1c', nombre: 'HbA1c', valor: 5.2, unidad: '%' })]));
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].value).toBe(0.052);
  });

  it('dos marcadores que resuelven a la misma clave: se queda el primero', () => {
    const r = labValuesDeEvaluacion(evaluacionCon([
      marcador({ key: 'homair', nombre: 'HOMA', valor: 3.39 }),
      marcador({ key: 'homa_ir', nombre: 'HOMA repetido', valor: 9 }),
    ]));
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].value).toBe(3.39);
  });
});

describe('fechaMedicionDeToma', () => {
  it('con dia exacto no asume nada', () => {
    expect(fechaMedicionDeToma('2026-05-14')).toEqual({ measured_at: '2026-05-14', diaAsumido: false });
  });
  it('solo con mes usa el dia 1 y lo dice', () => {
    expect(fechaMedicionDeToma('2026-05')).toEqual({ measured_at: '2026-05-01', diaAsumido: true });
  });
  it('lo que no es fecha devuelve null', () => {
    expect(fechaMedicionDeToma('mayo 2026')).toBeNull();
  });
});
