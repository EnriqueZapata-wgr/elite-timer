/**
 * useWearableToday — la salud del día que YA midió el teléfono (CIERRE-3).
 *
 * QUÉ CAMBIÓ Y POR QUÉ
 * Este hook apuntaba a `wearable-service`, un stub que devolvía `null` en las
 * cinco funciones y llevaba escrito "DESACTIVADO TEMPORALMENTE" desde MB-11.
 * Mientras tanto NOCHE-1 encendió HealthKit y Health Connect por otro camino
 * (health_os_daily), así que había una fachada muerta apuntando a un servicio
 * muerto al lado de una integración viva. El stub se borró: dejar apagado algo
 * que ya funciona por otro lado es cómo se vuelve a perder el dato.
 *
 * Ahora lee la MISMA fuente que el día (health-read-service), o sea que la
 * pantalla y el compilador no pueden discrepar: si HOY dice 8,412 pasos, este
 * hook dice 8,412 pasos, y los dos respetan igual que lo que la persona
 * escribió a mano manda sobre lo que midió la máquina.
 *
 * Sigue habiendo UNA promesa por fecha cacheada a nivel de módulo: quien llegue
 * segundo comparte el vuelo del primero.
 */
import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { LECTURA_VACIA, type LecturaDelDia } from '@/src/services/health/health-read-core';
import { leerSaludDelDia } from '@/src/services/health/health-read-service';

let cacheDate: string | null = null;
let cachePromise: Promise<LecturaDelDia> | null = null;

/**
 * Una llamada por fecha, compartida entre pantallas. Nunca rechaza: sin sesión
 * o sin datos devuelve la lectura vacía, donde cada métrica es
 * `{ valor: null, fuente: 'sin_dato' }` — ausencia explícita, no un cero.
 */
export function fetchWearableToday(): Promise<LecturaDelDia> {
  const today = getLocalToday();
  if (cacheDate !== today || !cachePromise) {
    cacheDate = today;
    cachePromise = (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return LECTURA_VACIA;
        return await leerSaludDelDia(userId, today);
      } catch {
        return LECTURA_VACIA;
      }
    })();
  }
  return cachePromise;
}

/** Olvida el vuelo cacheado. Para después de una sync manual. */
export function invalidarSaludDelDia(): void {
  cacheDate = null;
  cachePromise = null;
}

export function useWearableToday(): LecturaDelDia {
  const [data, setData] = useState<LecturaDelDia>(LECTURA_VACIA);
  useEffect(() => {
    let alive = true;
    fetchWearableToday().then((l) => { if (alive) setData(l); });
    return () => { alive = false; };
  }, []);
  return data;
}
