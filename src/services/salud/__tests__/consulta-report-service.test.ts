/**
 * MB-29 P6.6 — consulta-report-service con supabase-fake (deuda B2: cada
 * MB agrega los tests de servicio de lo que tocó).
 *
 * Contratos:
 *  - FAIL-CLOSED en datos: si CUALQUIER lectura trae { error } (supabase-js
 *    no lanza en 4xx), gather devuelve null y NO se genera documento a
 *    medias frente a un médico.
 *  - El ciclo entra SOLO por getCycleInfo (el gate de sexo + modo propio
 *    vive ahí): el servicio jamás consulta tablas de ciclo por su cuenta.
 *    La mutación que meta un .from('cycle_periods') truena aquí.
 *  - Los datos del rango se mapean con su forma (labs sin measured_at se
 *    filtran; compleciones cuentan por intervención).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from '@/src/services/__tests__/supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  cycleInfo: null as any,
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: { from: (t: string) => state.fake.from(t) },
}));
vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));
// El gate de ciclo ES getCycleInfo: aquí se controla lo que devuelve y se
// afirma que el servicio no lo brinca.
vi.mock('@/src/services/cycle-service', () => ({
  getCycleInfo: async () => state.cycleInfo,
}));

import { gatherConsultaInput } from '@/src/services/salud/consulta-report-service';
import { getLocalToday } from '@/src/utils/date-helpers';

/**
 * 22-ago-2026 — FECHAS RELATIVAS, NO CLAVADAS.
 *
 * Esta prueba fijaba un periodo del 18 al 22 de julio contra una ventana de
 * 30 días que se mueve con el calendario. El 22 de agosto la ventana empieza
 * el 23 de julio, así que el periodo quedó fuera y la prueba se puso roja
 * sola, sin que nadie tocara el código. Una prueba con fecha de caducidad no
 * es un candado: es una alarma que va a sonar el día equivocado y va a hacer
 * que alguien la desactive. Ahora las fechas se calculan desde hoy.
 */
function haceDias(n: number): string {
  const d = new Date(`${getLocalToday()}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const OK = { data: [], error: null };

function tablasOk(overrides: Record<string, any> = {}) {
  return {
    glucose_logs: OK,
    ketones_logs: OK,
    health_measurements: OK,
    lab_values: OK,
    user_symptoms: OK,
    padecimientos: OK,
    padecimiento_episodios: OK,
    user_interventions: OK,
    intervention_completions: OK,
    ...overrides,
  };
}

beforeEach(() => {
  state.cycleInfo = null;
});

describe('gatherConsultaInput', () => {
  it('feliz: junta las fuentes y arma el input del rango', async () => {
    state.fake = makeFakeSupabase(
      tablasOk({
        glucose_logs: { data: [{ date: '2026-08-01', value_mg_dl: 95, context: 'fasting' }], error: null },
        lab_values: {
          data: [
            { parameter_key: 'hba1c', value: 0.058, measured_at: '2026-06-20' },
            { parameter_key: 'glucose', value: 101, measured_at: null },
          ],
          error: null,
        },
        user_interventions: {
          data: [{
            // Llave REAL del catálogo: resolveRows tira las desconocidas.
            id: 'ui-1', user_id: 'u1', intervention_key: 'exposicion_solar_matutina', status: 'active',
            priority: 1, source_dx_id: null, is_custom: false, is_universal: true,
            custom_definition: null, custom_time: null, computed_time: null,
            custom_notes: null, custom_dose: null, activated_at: '2026-07-01T00:00:00Z',
          }], error: null,
        },
        intervention_completions: {
          data: [
            { user_intervention_id: 'ui-1', date: '2026-08-01' },
            { user_intervention_id: 'ui-1', date: '2026-08-02' },
          ], error: null,
        },
      }),
    );
    const input = await gatherConsultaInput('u1', 'Paty', 30);
    expect(input).not.toBeNull();
    expect(input!.glucose).toHaveLength(1);
    // Labs sin measured_at se filtran: una fila coja no entra al documento.
    expect(input!.labs).toHaveLength(1);
    expect(input!.intervenciones).toHaveLength(1);
    expect(input!.intervenciones[0].completedDays).toBe(2);
    expect(input!.cycle).toBeNull();
  });

  it('FAIL-CLOSED: un {error} en cualquier lectura → null, sin documento a medias', async () => {
    state.fake = makeFakeSupabase(
      tablasOk({ glucose_logs: { data: null, error: { message: 'RLS' } } }),
    );
    expect(await gatherConsultaInput('u1', '', 30)).toBeNull();
  });

  it('FAIL-CLOSED también en compleciones (la segunda vuelta)', async () => {
    state.fake = makeFakeSupabase(
      tablasOk({
        user_interventions: {
          data: [{
            id: 'ui-1', user_id: 'u1', intervention_key: 'exposicion_solar_matutina', status: 'active',
            priority: 1, source_dx_id: null, is_custom: false, is_universal: true,
            custom_definition: null, custom_time: null, computed_time: null,
            custom_notes: null, custom_dose: null, activated_at: null,
          }], error: null,
        },
        intervention_completions: { data: null, error: { message: 'boom' } },
      }),
    );
    expect(await gatherConsultaInput('u1', '', 30)).toBeNull();
  });

  it('el ciclo entra SOLO por getCycleInfo: cero tablas de ciclo directas', async () => {
    state.fake = makeFakeSupabase(tablasOk());
    state.cycleInfo = {
      phaseInfo: { label: 'Lútea' },
      currentDay: 21,
      cycleLen: 28,
      periods: [{ start_date: haceDias(12), end_date: haceDias(8) }],
    };
    const input = await gatherConsultaInput('u1', '', 30);
    expect(input!.cycle).toEqual({
      phaseLabel: 'Lútea',
      currentDay: 21,
      cycleLen: 28,
      periods: [{ start: haceDias(12), end: haceDias(8) }],
    });
    // La mutación que consulte ciclo por fuera del gate truena aquí.
    for (const tabla of ['cycle_periods', 'cycle_settings', 'cycle_daily_logs', 'user_app_modes']) {
      expect(state.fake.queried, `el servicio consultó ${tabla} directo`).not.toContain(tabla);
    }
  });

  it('getCycleInfo null (sin sexo female o sin modo propio) → cycle null', async () => {
    state.fake = makeFakeSupabase(tablasOk());
    state.cycleInfo = null;
    const input = await gatherConsultaInput('u1', '', 30);
    expect(input!.cycle).toBeNull();
  });
});
