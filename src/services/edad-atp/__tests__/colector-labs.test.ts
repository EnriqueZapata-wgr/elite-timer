/**
 * EL COLECTOR DE LABORATORIOS — candados del paso intermedio y del paso final.
 *
 * Este archivo cubre lo que hasta el 22-ago-2026 no tenía NADA debajo. El mapa
 * del flujo lo dejó claro: siete de los nueve defectos conocidos vivían en el
 * pegamento entre extracción, confirmación y escritura, y ese pegamento no
 * tenía una sola prueba. saveConfirmedLabValues, materializarRevision,
 * loadReviewFromDb y la ruta del coach corrían a ciegas.
 *
 * Cada bloque de aquí nombra el defecto que cierra.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captura = vi.hoisted(() => ({
  rpcs: [] as Array<{ fn: string; params: any }>,
  tablas: [] as Array<{ tabla: string; metodo: string; args: any[] }>,
  respuestas: {} as Record<string, any>,
  rpcRespuesta: { data: { escritos: 0, sin_cambio: 0, protegidos: 0 }, error: null } as any,
}));

vi.mock('@/src/lib/supabase', () => {
  const hacerBuilder = (tabla: string) => {
    const b: any = new Proxy(function () {}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          const r = captura.respuestas[tabla] ?? { data: null, error: null };
          const p = Promise.resolve(r);
          return p.then.bind(p);
        }
        return (...args: any[]) => {
          captura.tablas.push({ tabla, metodo: String(prop), args });
          return b;
        };
      },
    });
    return b;
  };
  return {
    supabase: {
      from: (tabla: string) => hacerBuilder(tabla),
      rpc: async (fn: string, params: any) => {
        captura.rpcs.push({ fn, params });
        return captura.rpcRespuesta;
      },
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    },
  };
});
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));
vi.mock('@sentry/react-native', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('@/src/services/storage-signed-url', () => ({ getFreshSignedUrl: async () => 'https://x' }));
vi.mock('@/src/services/anthropic-client', () => ({
  callAnthropic: vi.fn(), extractResponseText: vi.fn(), uploadFileToAnthropicViaProxy: vi.fn(),
}));
vi.mock('@/src/services/argos-service', () => ({ getArgosCallMetadata: async () => ({}) }));

import { saveConfirmedLabValues, materializarRevision, type LabReviewPayload } from '@/src/services/lab-service';

function item(key: string, valor: number, extra: Partial<any> = {}) {
  return {
    key, rawValue: valor, valueCanonical: valor,
    unitInDocument: null, unitCanonical: 'mg/dL',
    conversionMethod: 'identity' as const, confidence: 'high' as const,
    rawTextSnippet: null, passedValidation: true, ...extra,
  };
}

beforeEach(() => {
  captura.rpcs = [];
  captura.tablas = [];
  captura.respuestas = {
    lab_uploads: { data: { id: 'up1', user_id: 'u1', extracted_data: {} }, error: null },
    lab_results: { data: { id: 'lr1' }, error: null },
    lab_revision: { data: [], error: null },
  };
  captura.rpcRespuesta = { data: { escritos: 2, sin_cambio: 0, protegidos: 0 }, error: null };
});

// ─── DEFECTO 1: confirmar dos veces creaba dos registros ────────────────────
describe('el estudio queda CONFIRMADO, no a medio camino', () => {
  it('la aprobación pasa por la función transaccional, no por escrituras sueltas', async () => {
    const res = await saveConfirmedLabValues('up1', [{ key: 'glucose', value: 95 }], { labDate: '2026-05-01' });
    expect('error' in res).toBe(false);
    const aprobaciones = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    expect(aprobaciones).toHaveLength(1);
    expect(aprobaciones[0].params.p_upload_id).toBe('up1');
    expect(aprobaciones[0].params.p_lab_result_id).toBe('lr1');
    // El estado del upload lo mueve la función, en la misma transacción que
    // escribe. Si lo moviera la app por su cuenta, volvería a haber dos pasos
    // que pueden quedar desalineados: es justo lo que producía el defecto.
    const updatesUpload = captura.tablas.filter(
      (c) => c.tabla === 'lab_uploads' && c.metodo === 'update' && c.args[0]?.status === 'extracted',
    );
    expect(updatesUpload).toHaveLength(0);
  });
});

// ─── DEFECTO 2: corregir un valor no corregía el motor ──────────────────────
describe('la corrección llega al motor', () => {
  it('el valor corregido viaja a la base tal como lo dejó la persona', async () => {
    await saveConfirmedLabValues('up1', [{ key: 'glucose', value: 172 }], { labDate: '2026-05-01' });
    const [aprob] = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    const glucosa = aprob.params.p_valores.find((v: any) => v.parameter_key === 'glucosa_en_ayuno');
    expect(glucosa.value).toBe(172);
  });

  it('lo que la persona corrigió se guarda con SU procedencia, no como del PDF', async () => {
    // La 307 pudo reconstruir el incidente del colesterol porque el origen
    // distinguía quién había escrito cada fila. Aplanarlo todo a lab_pdf tira
    // esa pista justo donde más falta hace.
    await saveConfirmedLabValues('up1', [
      { key: 'glucose', value: 172 },
      { key: 'creatinine', value: 0.9 },
    ], { labDate: '2026-05-01', editadas: ['glucose'] });
    const [aprob] = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    const porClave = Object.fromEntries(
      aprob.params.p_valores.map((v: any) => [v.parameter_key, v]),
    );
    expect(porClave['glucosa_en_ayuno'].source).toBe('manual');
    expect(porClave['glucosa_en_ayuno'].es_humano).toBe(true);
    expect(porClave['creatinina_serica'].source).toBe('lab_pdf');
    expect(porClave['creatinina_serica'].es_humano).toBe(false);
  });

  it('dos claves del documento que caen en el mismo dato canónico no se escriben dos veces', async () => {
    // Escribir las dos sería volver a tener dos versiones del mismo dato, que
    // es exactamente lo que esta arquitectura existe para impedir.
    await saveConfirmedLabValues('up1', [
      { key: 'glucose', value: 90 },
      { key: 'glucosa_en_ayuno', value: 95 },
    ], { labDate: '2026-05-01' });
    const [aprob] = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    const claves = aprob.params.p_valores.map((v: any) => v.parameter_key);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

// ─── DEFECTO 3: la pantalla decía "guardado" aunque fallara ─────────────────
describe('si la escritura falla, se dice', () => {
  it('devuelve error y NO deja el estudio fantasma en el expediente', async () => {
    captura.rpcRespuesta = { data: null, error: { message: 'RLS' } };
    const res = await saveConfirmedLabValues('up1', [{ key: 'glucose', value: 95 }], { labDate: '2026-05-01' });
    expect('error' in res).toBe(true);
    // La fila ancha entró antes que los valores. Si los valores no entran, esa
    // fila se borra: un lab_results sin lab_values es un estudio que el motor
    // no puede leer y que la persona sí ve.
    const borrados = captura.tablas.filter((c) => c.tabla === 'lab_results' && c.metodo === 'delete');
    expect(borrados).toHaveLength(1);
  });

  it('el conteo que se devuelve viene de la base, no de lo que se intentó', async () => {
    captura.rpcRespuesta = { data: { escritos: 1, sin_cambio: 3, protegidos: 2 }, error: null };
    const res = await saveConfirmedLabValues('up1', [
      { key: 'glucose', value: 95 }, { key: 'creatinine', value: 0.9 },
    ], { labDate: '2026-05-01' });
    if ('error' in res) throw new Error('no debió fallar');
    expect(res.escritos).toBe(1);
    expect(res.sinCambio).toBe(3);
    expect(res.protegidos).toBe(2);
    expect(res.extractedCount).toBe(4); // escritos + los que ya estaban igual
  });
});

// ─── DEFECTO 6: dos estudios de fechas distintas se fundían ─────────────────
describe('cada dato conserva su fecha', () => {
  it('la fecha por dato gana sobre la del lote', async () => {
    await saveConfirmedLabValues('up1', [
      { key: 'glucose', value: 95 },
      { key: 'creatinine', value: 0.9 },
    ], {
      labDate: '2026-05-01',
      fechasPorItem: { creatinine: '2026-02-14' },
    });
    const [aprob] = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    const porClave = Object.fromEntries(
      aprob.params.p_valores.map((v: any) => [v.parameter_key, v.measured_at]),
    );
    expect(porClave['glucosa_en_ayuno']).toBe('2026-05-01');
    expect(porClave['creatinina_serica']).toBe('2026-02-14');
  });
});

// ─── LA EXCEPCIÓN DEL 21-AGO: el extremo real tecleado a mano ───────────────
describe('un valor fuera de rango que la persona confirma, se respeta', () => {
  it('pasa la validación y viaja marcado como confirmado por humano', async () => {
    // Colesterol total de 620 en una hipercolesterolemia familiar: el
    // validador lo rechazaría, pero la persona lo escribió mirando su hoja.
    const res = await saveConfirmedLabValues('up1', [{ key: 'total_cholesterol', value: 620 }], {
      labDate: '2026-05-01',
      confirmadosFueraDeRango: ['total_cholesterol'],
    });
    expect('error' in res).toBe(false);
    const [aprob] = captura.rpcs.filter((c) => c.fn === 'lab_revision_aprobar');
    expect(aprob.params.p_valores).toHaveLength(1);
    // 4EP GRAVE-3: son dos preguntas distintas. "Lo escribió una persona" da
    // autoridad para corregir; "está fuera de rango y lo sostiene" es lo que
    // se protege contra los parsers. Mezclarlas blindaba valores normales.
    expect(aprob.params.p_valores[0].es_humano).toBe(true);
    expect(aprob.params.p_valores[0].fuera_confirmado).toBe(true);
  });

  it('sin esa confirmación, el mismo valor se rechaza', async () => {
    const res = await saveConfirmedLabValues('up1', [{ key: 'total_cholesterol', value: 620 }], {
      labDate: '2026-05-01',
    });
    expect('error' in res).toBe(true);
  });
});

// ─── EL PASO INTERMEDIO: la extracción aterriza en la base ──────────────────
describe('el placeholder temporal', () => {
  const payload = (): LabReviewPayload => ({
    uploadId: 'up1', userId: 'u1', labName: 'Chopo', labDate: '2026-05-01',
    items: [item('glucose', 95), item('creatinine', 0.9)],
    derived: [], otherValues: [],
  });

  it('reemplaza lo anterior en vez de acumular versiones del mismo dato', async () => {
    const r = await materializarRevision(payload());
    expect(r.ok).toBe(true);
    expect(r.filas).toBe(2);
    const borrados = captura.tablas.filter((c) => c.tabla === 'lab_revision' && c.metodo === 'delete');
    expect(borrados).toHaveLength(1);
    const insertados = captura.tablas.filter((c) => c.tabla === 'lab_revision' && c.metodo === 'insert');
    expect(insertados).toHaveLength(1);
    expect(insertados[0].args[0]).toHaveLength(2);
  });

  it('cada fila lleva SU fecha, no la del lote', async () => {
    const p = payload();
    p.fechasPorItem = { creatinine: '2026-02-14' };
    await materializarRevision(p);
    const [ins] = captura.tablas.filter((c) => c.tabla === 'lab_revision' && c.metodo === 'insert');
    const filas = ins.args[0] as any[];
    expect(filas.find((f) => f.parameter_key === 'glucose').measured_at).toBe('2026-05-01');
    expect(filas.find((f) => f.parameter_key === 'creatinine').measured_at).toBe('2026-02-14');
  });

  it('si no se puede guardar el temporal, se dice, pero no se tumba la revisión', async () => {
    // Perder la red no puede costarle a la persona el estudio que acaba de
    // subir: la revisión sigue viva en memoria, como antes.
    captura.respuestas.lab_revision = { data: null, error: { message: 'sin red' } };
    const r = await materializarRevision(payload());
    expect(r.ok).toBe(false);
    expect(r.error).toContain('sin red');
  });
});
