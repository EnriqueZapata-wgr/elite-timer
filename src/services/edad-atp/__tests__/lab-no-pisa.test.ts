/**
 * MB-29 P6.3 — ningún laboratorio se pisa al subir uno nuevo.
 *
 * ═══ EL CANDADO SE RE-APUNTA, NO SE AFLOJA (22-ago-2026) ═══
 *
 * Este archivo decía: "la escritura es upsert con ignoreDuplicates, el
 * duplicado exacto se ignora, jamás se sobreescribe". Esa forma protegía el
 * histórico, pero abría dos agujeros que se comieron datos reales:
 *
 *  · Con el ORIGEN dentro de la llave de conflicto, el mismo dato del mismo
 *    día podía vivir tres veces (una por etiqueta de origen) y cuál alimentaba
 *    el motor era el orden en que Postgres devolviera las filas. En la cuenta
 *    de pruebas convivieron un colesterol total de 672 y uno de 172. Ver la
 *    migración 307.
 *
 *  · `ignoreDuplicates` descartaba en SILENCIO la corrección. Corregir un
 *    valor en la pantalla no corregía el motor.
 *
 * Lo que este archivo protege sigue siendo lo mismo: que nadie escriba a
 * lab_values de una forma que permita dos verdades al mismo tiempo. Lo que
 * cambia es dónde vive la regla. Ahora está en la base (migración 308: índice
 * único parcial + función lab_valor_guardar), y el candado de aquí es que el
 * servicio NO escriba directo a la tabla. Un insert, upsert, update o delete
 * a mano desde TypeScript vuelve a abrir el agujero, porque se salta la regla.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    rpc: (fn: string, params?: any) => state.fake.rpc(fn, params),
  },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import {
  insertCanonicalBiomarkers,
  insertLabValuesFromRaw,
} from '@/src/services/edad-atp/lab-values-service';

beforeEach(() => {
  state.fake = makeFakeSupabase({ lab_values: { data: null, error: null } });
});

function escriturasLabValues() {
  return state.fake.calls.filter((c: any) => c.table === 'lab_values');
}

const ESCRITURAS_DIRECTAS = ['insert', 'upsert', 'update', 'delete'];

describe('insertCanonicalBiomarkers (captura manual)', () => {
  it('escribe por la función de la base, no contra la tabla', async () => {
    const r = await insertCanonicalBiomarkers(
      'u1',
      [{ parameter_key: 'hba1c', value: 5.8, unit: '%' }],
      { source: 'manual', measuredAt: '2026-08-01' },
    );
    expect(r.ok).toBe(true);
    expect(state.fake.rpcCalls).toHaveLength(1);
    const [llamada] = state.fake.rpcCalls;
    expect(llamada.fn).toBe('lab_valor_guardar');
    // hba1c se guarda en decimal (conversión UNA vez, en el borde de escritura).
    expect(llamada.params.p_value).toBeCloseTo(0.058);
    expect(llamada.params.p_parameter_key).toBe('hba1c');
    expect(llamada.params.p_measured_at).toBe('2026-08-01');
    expect(r.inserted).toBe(1);
  });

  // 4EP GRAVE-3 — SON DOS PREGUNTAS DISTINTAS.
  //
  // "Lo escribió una persona" da autoridad para corregir cualquier cosa.
  // "Está fuera de rango y lo sostiene" es lo que se protege contra parsers.
  // La primera versión las mezclaba en un solo booleano, y eso blindaba TODO
  // lo capturado a mano: después, subir el PDF del mismo estudio no podía
  // corregir nada, ni siquiera un dedazo de la propia persona.
  it('un valor extremo que la persona sostiene queda protegido contra parsers', async () => {
    // La excepción que Enrique preguntó el 21-ago: colesterol de 620 en una
    // hipercolesterolemia familiar, que el extractor lee mal y ella corrige.
    await insertCanonicalBiomarkers(
      'u1', [{ parameter_key: 'colesterol_total', value: 620 }],
      { source: 'manual', escritoPorHumano: true },
    );
    expect(state.fake.rpcCalls[0].params.p_es_humano).toBe(true);
    expect(state.fake.rpcCalls[0].params.p_fuera_confirmado).toBe(true);
  });

  it('un valor NORMAL capturado a mano no se blinda: el PDF puede corregirlo', async () => {
    await insertCanonicalBiomarkers(
      'u1', [{ parameter_key: 'colesterol_total', value: 180 }],
      { source: 'manual', escritoPorHumano: true },
    );
    expect(state.fake.rpcCalls[0].params.p_es_humano).toBe(true);
    expect(state.fake.rpcCalls[0].params.p_fuera_confirmado).toBe(false);
  });

  it('lo que escribe un extractor nunca se marca como humano', async () => {
    await insertLabValuesFromRaw('u1', { glucose: 101 }, { source: 'upload_extract' });
    expect(state.fake.rpcCalls[0].params.p_es_humano).toBe(false);
    expect(state.fake.rpcCalls[0].params.p_fuera_confirmado).toBe(false);
  });

  it('jamás escribe DIRECTO sobre lab_values', async () => {
    await insertCanonicalBiomarkers('u1', [{ parameter_key: 'glucose', value: 95 }], { source: 'manual' });
    const metodos = escriturasLabValues().map((c: any) => c.method);
    for (const m of ESCRITURAS_DIRECTAS) expect(metodos).not.toContain(m);
  });
});

describe('insertLabValuesFromRaw (PDF/foto parseado)', () => {
  it('mismo contrato que la captura manual: todo por la función de la base', async () => {
    const r = await insertLabValuesFromRaw('u1', { glucose: 101 }, { source: 'upload_extract', measuredAt: '2026-08-01' });
    expect(r.ok).toBe(true);
    expect(state.fake.rpcCalls.map((c: any) => c.fn)).toEqual(['lab_valor_guardar']);
    const metodos = escriturasLabValues().map((c: any) => c.method);
    for (const m of ESCRITURAS_DIRECTAS) expect(metodos).not.toContain(m);
  });

  it('el error de la base no se traga: ok false y el caller se entera', async () => {
    state.fake = makeFakeSupabase(
      { lab_values: { data: null, error: null } },
      'user-test',
      { lab_valor_guardar: { data: null, error: { message: 'RLS' } } },
    );
    const r = await insertLabValuesFromRaw('u1', { glucose: 101 }, { source: 'upload_extract' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('RLS');
  });

  it('distingue lo escrito de lo que ya estaba igual', async () => {
    // El conteo que ve la persona sale de aquí. Antes se le decía "N valores
    // guardados" con N = lo que se intentó, aunque no hubiera entrado nada.
    state.fake = makeFakeSupabase(
      { lab_values: { data: null, error: null } },
      'user-test',
      { lab_valor_guardar: [
        { data: 'escrito', error: null },
        { data: 'sin_cambio', error: null },
        { data: 'protegido', error: null },
      ] },
    );
    const r = await insertLabValuesFromRaw(
      'u1', { glucose: 101, creatinine: 0.9, hdl: 55 },
      { source: 'upload_extract', measuredAt: '2026-08-01' },
    );
    expect(r.ok).toBe(true);
    expect(r.inserted).toBe(1);
    expect(r.sinCambio).toBe(1);
    expect(r.protegidos).toBe(1);
  });
});
