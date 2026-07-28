/**
 * useWearableToday — fuente única del dato de wearable del día (MB-11 B.3).
 *
 * getWearableDataForDate() se pedía por separado en HOY, YO y Sueño, cada
 * pantalla con su propio estado y su propia llamada. Ahora hay UNA promesa
 * por fecha, cacheada a nivel de módulo: quien llegue segundo comparte el
 * vuelo del primero (mismo dato, una llamada).
 *
 * El servicio hoy es un stub → null (fail-soft). Cuando HealthKit/Health
 * Connect se reactive, todos los consumidores muestran datos reales sin
 * más cambios.
 */
import { useEffect, useState } from 'react';
import {
  isWearableAvailable,
  getWearableDataForDate,
  type WearableData,
} from '@/src/services/wearable-service';
import { getLocalToday } from '@/src/utils/date-helpers';

let cacheDate: string | null = null;
let cachePromise: Promise<WearableData | null> | null = null;

/** Una llamada por fecha, compartida entre pantallas. Nunca rechaza. */
export function fetchWearableToday(): Promise<WearableData | null> {
  const today = getLocalToday();
  if (cacheDate !== today || !cachePromise) {
    cacheDate = today;
    cachePromise = (async () => {
      try {
        if (!(await isWearableAvailable())) return null;
        return await getWearableDataForDate(today);
      } catch {
        // Sin wearable → null explícito: "sin datos", no un cero disfrazado.
        return null;
      }
    })();
  }
  return cachePromise;
}

export function useWearableToday(): WearableData | null {
  const [data, setData] = useState<WearableData | null>(null);
  useEffect(() => {
    let alive = true;
    fetchWearableToday().then((w) => { if (alive && w) setData(w); });
    return () => { alive = false; };
  }, []);
  return data;
}
