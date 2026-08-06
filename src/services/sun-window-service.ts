/**
 * sun-window-service (MB-26 Pieza 6) — la ventana buena de vitamina D de HOY.
 *
 * La app ya sabe tu ventana por tu ubicación (uv-service: fetchUVData →
 * vitaminDWindow; la pantalla /solar la muestra). Este servicio la pone al
 * alcance del compile con tres reglas:
 *
 *  · CACHE por día: una consulta buena vale todo el día; la negativa (sin
 *    permiso, sin red, sin dato) se reintenta tras un rato, no en loop.
 *  · TIMEOUT corto: el compile no espera al GPS — si el dato no llega a
 *    tiempo devuelve null y el sol cae a despertar + 30 (habit-times-core,
 *    fuente 'uv_fallback'). NUNCA un hábito sin hora.
 *  · Si el dato llega DESPUÉS de haber servido el fallback, se emite
 *    'electrons_changed' UNA vez: el HOY recompila y el sol se recoloca
 *    solo. El cache corta cualquier loop (el recompile ya pega al cache).
 */
import { DeviceEventEmitter } from 'react-native';
import { getLocalToday } from '@/src/utils/date-helpers';
import { fetchUVData, getCurrentLocation } from '@/src/services/uv-service';

const REINTENTO_NEGATIVO_MS = 10 * 60 * 1000;
const TIMEOUT_COMPILE_MS = 3000;

let cacheDia: { date: string; inicio: string } | null = null;
let negativoHasta = 0;
let enVuelo: Promise<string | null> | null = null;
let fallbackServido = false;

async function consultar(today: string): Promise<string | null> {
  try {
    const loc = await getCurrentLocation();
    if (!loc) return null;
    const data = await fetchUVData(loc.latitude, loc.longitude);
    const inicio = data?.vitaminDWindow?.start ?? null;
    if (inicio) cacheDia = { date: today, inicio };
    return inicio;
  } catch {
    return null;
  }
}

/**
 * Inicio ('HH:MM') de la ventana de vitamina D de hoy, o null si no hay
 * dato a tiempo. No lanza jamás.
 */
export async function getUvInicioHoy(timeoutMs = TIMEOUT_COMPILE_MS): Promise<string | null> {
  const today = getLocalToday();
  if (cacheDia?.date === today) return cacheDia.inicio;
  if (!enVuelo) {
    if (Date.now() < negativoHasta) return null;
    enVuelo = consultar(today).then((inicio) => {
      enVuelo = null;
      if (inicio) {
        if (fallbackServido) {
          // El día ya se compiló con la hora de respaldo: un recompile y
          // el sol cae en su ventana real. El cache evita el loop.
          fallbackServido = false;
          DeviceEventEmitter.emit('electrons_changed');
        }
      } else {
        negativoHasta = Date.now() + REINTENTO_NEGATIVO_MS;
      }
      return inicio;
    });
  }
  const resultado = await Promise.race([
    enVuelo,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
  if (resultado == null) fallbackServido = true;
  return resultado;
}
