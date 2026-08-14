/**
 * OLA 4 · Runtime del runner físico (Anexo C, pieza 4).
 *
 * El catálogo de src/constants/assessments/physical.ts dice QUÉ se mide; aquí
 * se resuelve DÓNDE aterriza y de dónde se lee el último valor. Cada rama llama
 * al servicio que ya escribía esa medición: no hay un insert nuevo en este
 * archivo, solo el despacho.
 */
import {
  saveFunctionalTests, getLatestFunctionalTests,
  saveHealthMeasurement, getLatestHealthMeasurement,
} from '@/src/services/edad-atp/capture-service';
import { saveKinematicTest, getLatestKinematicTests } from '@/src/services/edad-atp/kinematic-tests-service';
import type { PhysicalTest } from '@/src/constants/assessments/physical';

export type SaveOutcome = { ok: boolean; error?: string };

/** El último valor capturado, para la insignia de "ya tienes este dato". */
export async function readLatest(test: PhysicalTest, userId: string): Promise<number | null> {
  if (!test.save) return null;
  try {
    switch (test.save.via) {
      case 'kinematic': {
        const map = await getLatestKinematicTests(userId);
        return map[test.save.testKey]?.value ?? null;
      }
      case 'functional-test': {
        const map = await getLatestFunctionalTests(userId);
        return map[test.save.testKey]?.value ?? null;
      }
      case 'health-measurement': {
        const row = await getLatestHealthMeasurement(userId);
        const v = row?.[test.save.column];
        return typeof v === 'number' ? v : null;
      }
    }
  } catch {
    // Sin histórico la captura funciona igual: la insignia es cortesía.
    return null;
  }
}

export async function persistMeasure(
  test: PhysicalTest, userId: string, value: number, note?: string,
): Promise<SaveOutcome> {
  if (!test.save) return { ok: false, error: 'Este test no declara dónde guarda.' };
  switch (test.save.via) {
    case 'kinematic':
      return saveKinematicTest(userId, test.save.testKey, value, test.save.unit, note);
    case 'functional-test':
      return saveFunctionalTests(userId, [{ test_key: test.save.testKey, value_primary: value }]);
    case 'health-measurement':
      return saveHealthMeasurement(userId, { [test.save.column]: value });
  }
}
