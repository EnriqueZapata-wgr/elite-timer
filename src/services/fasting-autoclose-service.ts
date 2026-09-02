/**
 * Cierre automático del ayuno olvidado: el SERVICIO (31-ago-2026).
 *
 * Backlog 15.3: "el ayuno olvidado solo se cierra si abres la pantalla; se
 * puede cerrar dos veces el mismo ayuno". La regla vivía dentro de
 * app/fasting.tsx. Ahora la decisión es pura (fasting-autoclose-core) y este
 * servicio la ejecuta, y lo llaman:
 *   · compileDay (day-compiler.ts): corre al arrancar la app y en cada
 *     `day_changed`, así que el olvidado se cierra aunque nadie abra Ayuno.
 *   · la pantalla de Ayuno, al enfocarse y en el tick del cronómetro.
 *
 * IDEMPOTENTE: las mutaciones filtran `status = 'active'` (fasting-service),
 * así que si dos llamadores llegan a la vez, el primero cierra y el segundo
 * ve `already_closed` y no cambia ni la hora de fin ni crea otra fila. El
 * electrón de 120 h se otorga con llave (user, source, día) y también se
 * dedupica solo.
 *
 * Nunca borra nada: cancelar es un cambio de estado, no un DELETE.
 */
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { getFastingTier } from '@/src/constants/electrons';
import * as fastingService from '@/src/services/fasting-service';
import {
  decidirCierre, MAX_FAST_HOURS,
  HUELLA_AUTOCIERRE_KEY, serializarHuella, eventoDejaHuella,
} from '@/src/services/fasting-autoclose-core';

export type EventoReconcile =
  /** Había ayuno activo y sigue activo (o no había ninguno). */
  | 'ninguno'
  /** Entre 120 y 144 h: se cerró como completado a 120 h exactas. */
  | 'cerrado_en_limite'
  /** Más de 144 h: se canceló, no cuenta como ayuno. */
  | 'cancelado_olvidado'
  /** fast_start corrupto: se canceló. */
  | 'cancelado_invalido'
  /** Otro llamador lo cerró primero. No se tocó nada. */
  | 'ya_cerrado'
  /** La mutación falló: el ayuno sigue activo para poder reintentar. */
  | 'fallo';

export interface ResultadoReconcile {
  /** El ayuno activo tras reconciliar. null si no hay o si se cerró. */
  fast: fastingService.FastingLog | null;
  evento: EventoReconcile;
  /** Horas transcurridas cuando se evaluó (null si el inicio era basura). */
  horas: number | null;
  /** id del ayuno evaluado (cerrado o no), para limpiar su storage local. null si no había. */
  fastId: string | null;
}

/**
 * 4EP 31-ago: si el cierre lo hizo el compilador de HOY, la pantalla de Ayuno
 * tiene que poder mostrar el aviso §2.5 después. Se deja huella; la pantalla
 * la lee y la borra. Un fallo al escribirla no tumba el cierre.
 */
async function dejarHuella(fastId: string, evento: string): Promise<void> {
  if (!eventoDejaHuella(evento)) return;
  try {
    await AsyncStorage.setItem(
      HUELLA_AUTOCIERRE_KEY,
      serializarHuella({ fastId, evento, cuando: new Date().toISOString() }),
    );
  } catch (e) {
    logWarn('[fasting-autoclose] no se pudo dejar huella (no fatal):', e);
  }
}

/**
 * Lee el ayuno activo y aplica la política de cierre. Segura de llamar tantas
 * veces como se quiera. `emitir` controla si avisa a HOY por eventos cuando
 * algo cambió (la pantalla de Ayuno sí; el compilador no lo necesita porque
 * ya está recompilando, pero un electrón nuevo sí se anuncia siempre).
 */
export async function reconciliarAyunoActivo(
  userId: string,
  opts?: { emitir?: boolean; ahoraMs?: number },
): Promise<ResultadoReconcile> {
  const fast = await fastingService.getActiveFast(userId);
  if (!fast) return { fast: null, evento: 'ninguno', horas: null, fastId: null };
  const fastId = fast.id;

  const d = decidirCierre(fast.fast_start, opts?.ahoraMs ?? Date.now());

  if (d.accion === 'mantener') return { fast, evento: 'ninguno', horas: d.horas, fastId };

  if (d.accion === 'cancelar') {
    const r = await fastingService.cancelActiveFast(fast.id);
    if (!r.ok && r.reason === 'already_closed') return { fast: null, evento: 'ya_cerrado', horas: d.horas, fastId };
    if (!r.ok) {
      logWarn('[fasting-autoclose] cancelar falló:', r.message);
      return { fast, evento: 'fallo', horas: d.horas, fastId };
    }
    const evento: EventoReconcile = d.motivo === 'olvidado' ? 'cancelado_olvidado' : 'cancelado_invalido';
    await dejarHuella(fastId, evento);
    if (opts?.emitir) DeviceEventEmitter.emit('day_changed');
    return { fast: null, evento, horas: d.horas, fastId };
  }

  // cerrar_en_limite
  const r = await fastingService.autoCloseAtLimit({ fastId: fast.id, hours: d.horas, fastEnd: d.fin });
  if (!r.ok && r.reason === 'already_closed') return { fast: null, evento: 'ya_cerrado', horas: d.horas, fastId };
  if (!r.ok) {
    logWarn('[fasting-autoclose] cierre a limite falló:', r.message);
    return { fast, evento: 'fallo', horas: d.horas, fastId };
  }
  // El electrón se dedupica por (user, source, día) dentro de awardBooleanElectron.
  try {
    const tier = getFastingTier(MAX_FAST_HOURS);
    if (tier) {
      await awardBooleanElectron(userId, tier);
      DeviceEventEmitter.emit('electrons_changed');
    }
  } catch (e) {
    logWarn('[fasting-autoclose] electrón de 120 h falló (no fatal):', e);
  }
  await dejarHuella(fastId, 'cerrado_en_limite');
  if (opts?.emitir) DeviceEventEmitter.emit('day_changed');
  return { fast: null, evento: 'cerrado_en_limite', horas: d.horas, fastId };
}
