/**
 * Health read service (CIERRE-3) — la capa con I/O del lector de salud.
 *
 * NOCHE-1 dejó `health_os_daily` llenándose y a nadie leyéndola: el usuario
 * conectaba su teléfono, veía "sincronizado" y en la app no pasaba nada. Este
 * archivo es la puerta de salida de esa tabla.
 *
 * Tres tablas, una lectura:
 *  · health_measurements  → lo que la persona escribió a mano
 *  · sleep_nights         → la noche, ya resuelta entre sesión propia e import
 *  · health_os_daily      → lo que midió la máquina
 *
 * Quién gana lo decide health-read-core (puro, con tests). Aquí solo se trae
 * el dato y se paga el premio. Ninguna de estas consultas escribe nada en las
 * tablas de la persona: la separación de la migración 264 se conserva intacta.
 *
 * FAIL-SOFT en todo: una tabla que no responde es `null`, no una excepción.
 * El día se compila igual sin datos de salud, exactamente como antes.
 */
import { DeviceEventEmitter } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import {
  LECTURA_VACIA,
  armarLectura,
  premiosWearable,
  type FilasDelDia,
  type LecturaDelDia,
} from './health-read-core';

/**
 * Las tres filas del día. Un solo Promise.all para que el llamador gaste UNA
 * entrada de su propia paralelización y no tres.
 *
 * `night_date` es la fecha del DESPERTAR (convención de sleep_nights, ver
 * argos-service): la noche de hoy es la que terminó esta mañana, así que la
 * fecha es la misma y no hay que restar un día.
 */
export async function leerFilasDelDia(userId: string, fecha: string): Promise<FilasDelDia> {
  try {
    const [manualRes, nocheRes, maquinaRes] = await Promise.all([
      supabase
        .from('health_measurements')
        .select('steps_daily, sleep_hours, resting_hr, weight_kg')
        .eq('user_id', userId).eq('date', fecha).maybeSingle(),
      supabase
        .from('sleep_nights')
        .select('duration_minutes, source')
        .eq('user_id', userId).eq('night_date', fecha).maybeSingle(),
      supabase
        .from('health_os_daily')
        .select('steps, sleep_minutes, resting_hr, weight_kg, source')
        .eq('user_id', userId).eq('date', fecha).maybeSingle(),
    ]);
    // supabase-js no lanza en 4xx: una tabla ausente en remoto llega como
    // {error} y se degrada a null, que es "no sé", no "no hay".
    return {
      manual: manualRes.error ? null : (manualRes.data as FilasDelDia['manual']),
      noche: nocheRes.error ? null : (nocheRes.data as FilasDelDia['noche']),
      maquina: maquinaRes.error ? null : (maquinaRes.data as FilasDelDia['maquina']),
    };
  } catch (e) {
    logWarn('[health-read] leerFilasDelDia', e);
    return { manual: null, noche: null, maquina: null };
  }
}

/** La lectura del día ya resuelta. Nunca rechaza. */
export async function leerSaludDelDia(userId: string, fecha: string): Promise<LecturaDelDia> {
  try {
    return armarLectura(await leerFilasDelDia(userId, fecha));
  } catch (e) {
    logWarn('[health-read] leerSaludDelDia', e);
    return LECTURA_VACIA;
  }
}

/**
 * Paga los premios de evidencia wearable de esta lectura.
 *
 * Las reglas `steps_wearable` y `sleep_wearable` viven en award-rules.ts desde
 * el día uno y nunca se dispararon porque no existía la fuente. Ahora existe.
 *
 * FIRE-AND-FORGET a propósito: el día no puede depender de que el award
 * responda. El cap de 1/día y la clave de idempotencia (usuario + fecha) hacen
 * que compilar el día veinte veces pague una sola vez; el servidor es el que
 * lleva la cuenta, no el cliente.
 */
export function pagarPremiosWearable(
  lectura: LecturaDelDia,
  userId: string,
  fecha: string,
): void {
  const premios = premiosWearable(lectura, userId, fecha);
  if (premios.length === 0) return;
  for (const p of premios) {
    fireElectronAward({
      habit_type: p.habitType,
      evidence_tier: 'wearable',
      idempotency_key: p.idempotencyKey,
      local_date: p.localDate,
    });
  }
  // Regla 5 de CLAUDE.md: después de tocar electrones, avisar. El award es
  // asíncrono y puede no acreditar nada (cap ya consumido); el evento solo
  // pide un refresco, y un refresco de más no rompe nada.
  DeviceEventEmitter.emit('electrons_changed');
}

/**
 * Dispara la sync automática si la persona la activó y hoy no ha corrido.
 *
 * `syncAutomaticaSiAplica` existía en health-platform-service y NADIE la
 * llamaba: el interruptor de "sincronizar sola" se guardaba y no hacía nada,
 * así que los datos solo entraban si el usuario iba a Ajustes y tocaba el
 * botón a mano. Este es el único llamador.
 *
 * Import dinámico: health-platform-service evalúa `require` de los módulos
 * nativos al cargarse. Diferirlo hasta que de verdad haga falta evita meter
 * esa evaluación en el arranque de todo el que compile un día.
 */
export function sincronizarEnSegundoPlano(userId: string): void {
  void (async () => {
    try {
      const mod = await import('./health-platform-service');
      await mod.syncAutomaticaSiAplica(userId);
    } catch (e) {
      logWarn('[health-read] sync en segundo plano', e);
    }
  })();
}
