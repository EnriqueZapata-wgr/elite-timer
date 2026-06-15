/**
 * Kinematic Tests Service — captura de los 4 tests cinemáticos de fitness
 * (plank, BOLT, old_man_test, recovery_hr) que completan el área Fitness del motor v2.
 *
 * INTEGRACIÓN CON EL MOTOR (decisión overnight, conservadora):
 * el motor v2 YA lee estos 4 por passthrough desde `edad_atp_functional_tests`
 * (MOTOR_PASSTHROUGH_FT_KEYS = ['...','plank','bolt','recovery_hr','old_man_test']) y el
 * adapter los mapea a plank_s/bolt_s/recovery_hr/old_man_test. Por eso este servicio
 * escribe en AMBAS tablas:
 *   1) `edad_atp_functional_tests` (FUENTE DEL MOTOR — lo crítico para que Edad ATP se mueva),
 *   2) `fitness_kinematic_tests` (expediente dedicado, migración 074 — best-effort).
 * Así NO tocamos motor/adapter/source-map (cero riesgo) y los valores llegan al motor por
 * el camino ya probado en captura-flujo-motor.test.ts. Ver flag en COWORK_REPORT.md.
 *
 * UNIDADES (reconciliadas contra el scorer del motor en area-fitness-service):
 *   plank        → segundos (scorePlank: 180s = 100)
 *   bolt         → segundos (scoreBOLT: 40s = 100)
 *   old_man_test → PUNTOS 0–10 sit-rise (scoreOldMan: 10 pts = 100) — NO segundos. Ver flag.
 *   recovery_hr  → delta bpm = FC pico − FC a 1 min (scoreRecoveryHR: 40 = 100)
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLatestFunctionalTests } from '@/src/services/edad-atp/capture-service';

export type KinematicTestKey = 'plank' | 'bolt' | 'old_man_test' | 'recovery_hr';
export type KinematicUnit = 'seconds' | 'bpm' | 'points';

export interface KinematicMeta {
  key: KinematicTestKey;
  label: string;
  unit: KinematicUnit;
  min: number;
  max: number;
  mode: 'timer' | 'points' | 'delta';
}

/** Catálogo único de los 4 tests (rangos alineados al scorer del motor). */
export const KINEMATIC_TESTS: KinematicMeta[] = [
  { key: 'plank', label: 'Plank', unit: 'seconds', min: 1, max: 600, mode: 'timer' },
  { key: 'bolt', label: 'BOLT', unit: 'seconds', min: 1, max: 120, mode: 'timer' },
  { key: 'old_man_test', label: 'Old Man Test', unit: 'points', min: 0, max: 10, mode: 'points' },
  { key: 'recovery_hr', label: 'Recovery HR', unit: 'bpm', min: 1, max: 180, mode: 'delta' },
];

export const KINEMATIC_KEYS: KinematicTestKey[] = KINEMATIC_TESTS.map((t) => t.key);

export function kinematicMeta(testKey: KinematicTestKey): KinematicMeta | undefined {
  return KINEMATIC_TESTS.find((t) => t.key === testKey);
}

/** Valida un valor contra el rango del test (función pura, testeable). */
export function validateKinematic(testKey: KinematicTestKey, value: number): { ok: boolean; error?: string } {
  const meta = kinematicMeta(testKey);
  if (!meta) return { ok: false, error: 'Test desconocido' };
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, error: 'Valor inválido' };
  if (value < meta.min || value > meta.max) {
    return { ok: false, error: `Fuera de rango (${meta.min}–${meta.max} ${meta.unit})` };
  }
  return { ok: true };
}

export type SaveResult = { ok: boolean; error?: string };

/**
 * Guarda un test cinemático. Escribe primero a la fuente del motor (lo crítico) y luego
 * a la tabla dedicada (best-effort hasta que corra la migración 074).
 */
export async function saveKinematicTest(
  userId: string,
  testKey: KinematicTestKey,
  value: number,
  unit: KinematicUnit,
  notes?: string,
): Promise<SaveResult> {
  const v = validateKinematic(testKey, value);
  if (!v.ok) return { ok: false, error: v.error };

  // 1) FUENTE DEL MOTOR — passthrough lee edad_atp_functional_tests por test_key.
  const { error: ftErr } = await supabase.from('edad_atp_functional_tests').insert({
    user_id: userId,
    test_key: testKey,
    value_primary: value,
    measured_at: new Date().toISOString(),
  });
  if (ftErr) {
    logWarn('[kinematic] motor-source insert failed:', ftErr);
    return { ok: false, error: ftErr.message };
  }

  // 2) Expediente dedicado (tabla 074). Si la migración aún no corre, NO rompe el guardado.
  try {
    const { error: ktErr } = await supabase.from('fitness_kinematic_tests').insert({
      user_id: userId,
      test_key: testKey,
      value,
      unit,
      notes: notes ?? null,
    });
    if (ktErr) logWarn('[kinematic] fitness_kinematic_tests insert falló (¿migración 074 pendiente?):', ktErr);
  } catch (e) {
    logWarn('[kinematic] fitness_kinematic_tests excepción:', e);
  }

  return { ok: true };
}

/**
 * Último valor por test_key. Prefiere la tabla dedicada; si no existe/está vacía, cae a la
 * fuente del motor (edad_atp_functional_tests). Devuelve solo los 4 keys cinemáticos.
 */
export async function getLatestKinematicTests(
  userId: string,
): Promise<Record<string, { value: number; measured_at: string }>> {
  const out: Record<string, { value: number; measured_at: string }> = {};

  // Tabla dedicada (best-effort).
  try {
    const { data, error } = await supabase
      .from('fitness_kinematic_tests')
      .select('test_key, value, measured_at')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false });
    if (!error && data) {
      for (const r of data as any[]) {
        if (out[r.test_key] === undefined && r.value != null) {
          out[r.test_key] = { value: Number(r.value), measured_at: r.measured_at };
        }
      }
    }
  } catch (e) {
    logWarn('[kinematic] getLatest dedicada falló:', e);
  }

  // Relleno desde la fuente del motor para cualquier key faltante.
  try {
    const ft = await getLatestFunctionalTests(userId);
    for (const k of KINEMATIC_KEYS) {
      if (out[k] === undefined && ft[k]) out[k] = ft[k];
    }
  } catch (e) {
    logWarn('[kinematic] getLatest fallback falló:', e);
  }

  return out;
}
