/**
 * salud-secciones-store — qué secciones de SALUD dejó abiertas el usuario.
 *
 * OLA6 PIEZA A: las tres puertas dejaron de ser rutas. El tab SALUD ya no
 * manda a un cascarón de 19 líneas: abre la sección ahí mismo. Cómo la dejó
 * cada quien es preferencia local, igual que el modo denso: no hay nada que
 * sincronizar ni que consultar en el servidor.
 *
 * Default: HOY abierta y el resto cerradas. Lo de hoy es lo que se consulta
 * todos los días; el expediente se llena una vez.
 *
 * El núcleo (`mergeSecciones`) es puro para poder verificarlo sin AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'salud_secciones_abiertas_v1';

export type SeccionKey = 'hoy' | 'datos' | 'evolucion' | 'expediente' | 'ciclo';

export type SeccionesAbiertas = Record<SeccionKey, boolean>;

/** HOY abierta; el resto cerradas. */
export const SECCIONES_DEFAULT: SeccionesAbiertas = {
  hoy: true,
  datos: false,
  evolucion: false,
  expediente: false,
  ciclo: false,
};

const CLAVES: SeccionKey[] = ['hoy', 'datos', 'evolucion', 'expediente', 'ciclo'];

/**
 * Núcleo puro: mezcla lo guardado con el default. Basura, claves nuevas o
 * ausentes caen al default en vez de tronar (el usuario no pierde su pantalla
 * porque cambiamos el shape).
 */
export function mergeSecciones(raw: unknown): SeccionesAbiertas {
  const out: SeccionesAbiertas = { ...SECCIONES_DEFAULT };
  if (!raw || typeof raw !== 'object') return out;
  for (const k of CLAVES) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

export async function loadSeccionesAbiertas(): Promise<SeccionesAbiertas> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return mergeSecciones(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...SECCIONES_DEFAULT };
  }
}

export async function saveSeccionesAbiertas(state: SeccionesAbiertas): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia: la próxima vez recibe con HOY abierta */
  }
}
