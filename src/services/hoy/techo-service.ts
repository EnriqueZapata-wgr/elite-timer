/**
 * techo-service (MB-26 Pieza 3) — la evaluación del techo con datos reales.
 *
 * Las puertas de encendido (hoy-habitos, ficha del Centro, aplicar pack)
 * llaman evaluarTechoEncendido ANTES de encender: si el resultado rebasa
 * los 8 renglones, la UI avisa y ofrece candidatos a reposo. Fail-open:
 * si algo no se puede leer se devuelve null y el encendido sigue — el
 * techo es guía, no candado, y un fallo de red jamás bloquea al usuario.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import { getHabitStates } from '@/src/services/hoy/habit-states-service';
import { estadosPorKey } from '@/src/services/hoy/habit-states-core';
import { getHistorialBooleanos } from '@/src/services/hoy/graduacion-service';
import { ultimasFechas } from '@/src/services/hoy/graduacion-core';
import {
  candidatosAReposo, evaluarEncendido, renglonesDeHoy,
} from '@/src/services/hoy/techo-core';

export interface AvisoTecho {
  total: number;
  techo: number;
  /** Candidatos a reposo, del más abandonado al menos. */
  candidatos: { key: string; name: string }[];
}

/**
 * null = no rebasa el techo (o no se pudo evaluar): la puerta enciende
 * normal. Con aviso, la puerta muestra las opciones y respeta la decisión.
 */
export async function evaluarTechoEncendido(
  userId: string,
  nuevos: string[],
): Promise<AvisoTecho | null> {
  try {
    const hoy = getLocalToday();
    const [prefs, stateRows, historial] = await Promise.all([
      getInstallPrefs(userId),
      getHabitStates(userId),
      getHistorialBooleanos(userId, ultimasFechas(hoy, 35)[0]),
    ]);
    if (!prefs) return null; // sin lectura confiable no hay aviso que valga
    const estados = estadosPorKey(stateRows);
    const ev = evaluarEncendido(prefs, estados, nuevos);
    if (!ev.excede) return null;
    const activos = renglonesDeHoy(prefs, estados);
    const candidatos = candidatosAReposo(activos, historial ?? {}, hoy, nuevos).map((key) => ({
      key,
      name: ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key,
    }));
    return { total: ev.total, techo: ev.techo, candidatos };
  } catch {
    return null;
  }
}
