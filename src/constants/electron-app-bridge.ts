/**
 * electron-app-bridge (MB-19.2 · 2.4) — la tabla de traducción que no existía.
 *
 * Las llaves del registro de apps son español (`meditar`, `hidratacion`) y las
 * de los electrones inglés (`meditation`, `water`). MB-20 necesita saber qué
 * fila de TAREAS corresponde a qué electrón; hasta hoy ese conocimiento vivía
 * repartido en mapeos ad-hoc (CARD_TO_ELECTRON del HOY, `installable` del
 * registro). Aquí vive UNA vez, con test.
 *
 * Módulo de datos puros: el import de ElectronSource es de tipo y se borra en
 * compilación. Testeable en node sin montar nada.
 */
import type { ElectronSource } from '@/src/constants/electrons';

/**
 * Electrón → app que lo practica o lo registra (llave de APP_REGISTRY).
 *
 * Los que NO aparecen son los hábitos sin app (PIEZA 2.3): se practican, no se
 * abren — baño frío, grounding, sin alcohol, lentes rojos, pasos, sin
 * procesados, off-pantallas — más `functional_quiz`, que vive en TESTS y no
 * tiene app en la sala. Esa lista está protegida por test: agregar un electrón
 * sin decidir su app rompe en CI, no en el device.
 */
export const ELECTRON_TO_APP: Partial<Record<ElectronSource, string>> = {
  // Mente
  meditation: 'meditar',
  breathwork: 'respirar',
  checkin: 'emociones',
  journal: 'journal',
  sleep: 'sueno',
  nback: 'nback',
  // Cuerpo
  strength: 'entrenar',
  cardio: 'cardio',
  // Hábitos diarios
  protein: 'comida',
  water: 'hidratacion',
  supplements: 'suplementos',
  fasting_12h: 'ayuno',
  fasting_16h: 'ayuno',
  fasting_24h: 'ayuno',
  // Salud
  sunlight: 'sol',
  sun_awareness: 'sol',
  glucose_log: 'glucosa',
  ketones_log: 'cetonas',
  period_log: 'ciclo',
  lab_upload: 'labs',
};

/** Electrones que deliberadamente NO tienen app (espejo exacto del mapa de arriba). */
export const ELECTRONS_SIN_APP: ElectronSource[] = [
  'cold_shower', 'grounding', 'no_alcohol', 'red_glasses', 'steps',
  'no_processed_foods', 'screen_time_cutoff', 'functional_quiz',
  // 7-sep-2026 (pivote limpio): 'intervention' apuntaba a la app 'protocolos',
  // que se retiró del registro con la pantalla "Mi Protocolo". La práctica NO
  // se retiró: se sigue palomeando y sigue pesando 1.5 electrones. Pasa a esta
  // lista porque es lo que ya es: un hábito que se practica, no una pantalla
  // que se abre. Sin app no hay ruta inventada en la fila de TAREAS.
  'intervention',
];

/** La app de un electrón, o null si es un hábito sin app. */
export function appForElectron(source: ElectronSource): string | null {
  return ELECTRON_TO_APP[source] ?? null;
}

/** Los electrones de una app (ej. 'ayuno' → los tres tiers de ayuno). */
export function electronsForApp(appKey: string): ElectronSource[] {
  return (Object.keys(ELECTRON_TO_APP) as ElectronSource[])
    .filter((source) => ELECTRON_TO_APP[source] === appKey);
}
