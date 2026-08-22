import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captura las filas insertadas para verificar el batch, y las llamadas a la
// función de la base, que es por donde pasa el espejo a lab_values desde la
// migración 308.
const inserted: any[] = [];
const rpcs: any[] = [];
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (rows: any[]) => {
        inserted.push(rows);
        return Promise.resolve({ error: null });
      },
    }),
    rpc: async (fn: string, params: any) => {
      rpcs.push({ fn, params });
      return { data: 'escrito', error: null };
    },
  },
}));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { saveBiomarkers } from '../capture-service';

describe('capture-service — saveBiomarkers', () => {
  beforeEach(() => { inserted.length = 0; rpcs.length = 0; });

  it('inserta una fila por biomarcador con source=manual', async () => {
    const r = await saveBiomarkers('u1', [
      { key: 'albumin', value: 5.28, unit: 'g/dL' },
      { key: 'glucose', value: 90, unit: 'mg/dL' },
    ]);
    expect(r.ok).toBe(true);
    expect(inserted).toHaveLength(1);
    const rows = inserted[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ user_id: 'u1', biomarker_key: 'albumin', value: 5.28, unit: 'g/dL', source: 'manual' });
    expect(rows[0].measured_at).toBeTruthy();
  });

  it('lista vacía → ok sin insertar', async () => {
    const r = await saveBiomarkers('u1', []);
    expect(r.ok).toBe(true);
    expect(inserted).toHaveLength(0);
  });

  // 22-ago-2026 — LA FECHA DEL ESTUDIO, NO LA DE HOY.
  //
  // Esta pantalla estampaba new Date() sin preguntar, así que un estudio de
  // marzo tecleado en agosto entraba como si fuera de agosto y se volvía el
  // valor vigente por encima del reciente. measured_at es lo que ordena la
  // serie: equivocarlo cambia qué número alimenta la Edad ATP.
  it('respeta la fecha del estudio en las dos tablas', async () => {
    const r = await saveBiomarkers('u1', [{ key: 'glucose', value: 90, unit: 'mg/dL' }], '2026-03-15');
    expect(r.ok).toBe(true);
    expect(inserted[0][0].measured_at).toBe('2026-03-15');
    expect(rpcs[0].params.p_measured_at).toBe('2026-03-15');
  });

  it('sin fecha, hoy: capturar lo que acabas de recoger sigue siendo lo normal', async () => {
    await saveBiomarkers('u1', [{ key: 'glucose', value: 90, unit: 'mg/dL' }]);
    expect(inserted[0][0].measured_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // La persona que teclea su hoja es la autoridad sobre su propio dato y puede
  // corregir lo que sea. Pero la PROTECCIÓN contra parsers se pone solo sobre
  // el valor que de verdad cae fuera del rango clínico: marcar todo lo
  // capturado a mano como intocable dejaba al PDF sin poder corregir nada.
  it('lo capturado a mano se marca como escrito por un humano', async () => {
    await saveBiomarkers('u1', [{ key: 'glucose', value: 90, unit: 'mg/dL' }]);
    expect(rpcs[0].params.p_es_humano).toBe(true);
  });

  it('pero un valor NORMAL no se blinda contra correcciones', async () => {
    await saveBiomarkers('u1', [{ key: 'glucose', value: 90, unit: 'mg/dL' }]);
    expect(rpcs[0].params.p_fuera_confirmado).toBe(false);
  });

  it('y uno fuera de rango sí, que es la excepción del 21-ago', async () => {
    // Glucosa de 600: el validador la rechazaría, pero la persona la escribió
    // mirando su hoja. Ningún parser la puede pisar después.
    await saveBiomarkers('u1', [{ key: 'glucose', value: 600, unit: 'mg/dL' }]);
    expect(rpcs[0].params.p_fuera_confirmado).toBe(true);
  });

  // Antes se devolvía ok aunque el espejo fallara: la pantalla decía
  // "guardado" y el motor se quedaba sin el dato.
  it('si el espejo a lab_values falla, saveBiomarkers NO dice que guardó', async () => {
    const original = rpcs.length;
    const supa: any = (await import('@/src/lib/supabase')).supabase;
    const previo = supa.rpc;
    supa.rpc = async () => ({ data: null, error: { message: 'RLS' } });
    const r = await saveBiomarkers('u1', [{ key: 'glucose', value: 90, unit: 'mg/dL' }]);
    supa.rpc = previo;
    expect(original).toBe(0);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('RLS');
  });
});
