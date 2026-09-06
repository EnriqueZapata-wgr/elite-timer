/**
 * Aviso del día 7 (ATP 3.0, 5-sep-2026, ruta 2.8): el IO.
 *
 * Al completar el onboarding (`completeV2Step` escribe 'completed'), si la
 * persona es Free se agenda UNA notificación local para siete días después a
 * las 10:00 locales, con deep link a `/paywall?contexto=dia7`. Si antes se
 * vuelve miembro (compra, restauración, código), se cancela.
 *
 * Patrón de `app-avisos-service`: notificación one-shot (DATE) con identifier
 * propio y fijo (`aviso-dia7`), y JAMÁS `cancelAllScheduledNotificationsAsync`
 * (#28: agenda, avisos por app y esto conviven; cada sistema cancela SOLO lo
 * suyo). Aquí no hace falta AsyncStorage: al tener identifier fijo, cancelar
 * es cancelar ese id.
 *
 * Permiso: NO se pide aquí. El onboarding acaba de pedirlo en su pantalla de
 * notificaciones; si la persona dijo que no, se respeta y no hay aviso.
 *
 * La decisión (a quién, cuándo) vive en aviso-dia7-core con test.
 */
import * as Notifications from 'expo-notifications';
import { warn as logWarn } from '@/src/lib/logger';
import { fetchEffectiveTier } from '@/src/services/subscription/subscription-service';
import {
  AVISO_DIA7_CUERPO,
  AVISO_DIA7_ID,
  AVISO_DIA7_TITULO,
  AVISO_DIA7_URL,
  debeProgramarAvisoDia7,
  fechaAvisoDia7,
} from './aviso-dia7-core';

/**
 * Programa el aviso si corresponde. Fail-soft: cualquier fallo se registra y
 * no interrumpe el cierre del onboarding, que es lo que importa en ese momento.
 */
export async function programarAvisoDia7(userId: string): Promise<'programado' | 'omitido'> {
  try {
    const [lectura, permiso] = await Promise.all([
      fetchEffectiveTier(userId),
      Notifications.getPermissionsAsync(),
    ]);
    const decision = debeProgramarAvisoDia7({
      tier: lectura.tier,
      nivelNoSePudoLeer: lectura.noSePudoLeer,
      permisoConcedido: permiso.status === 'granted',
    });
    if (!decision) return 'omitido';
    // Reprogramar reemplaza: dos onboardings (cuenta nueva en el mismo
    // teléfono) no dejan dos avisos.
    await cancelarAvisoDia7();
    await Notifications.scheduleNotificationAsync({
      identifier: AVISO_DIA7_ID,
      content: {
        title: AVISO_DIA7_TITULO,
        body: AVISO_DIA7_CUERPO,
        sound: true,
        data: { url: AVISO_DIA7_URL },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fechaAvisoDia7(new Date()) },
    });
    return 'programado';
  } catch (e) {
    logWarn('[aviso-dia7] no se pudo programar', e);
    return 'omitido';
  }
}

/** Cancela SOLO el aviso del día 7. Idempotente: si no existe, no pasa nada. */
export async function cancelarAvisoDia7(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(AVISO_DIA7_ID);
  } catch {
    /* ya no existe o el módulo no está: nada que cancelar */
  }
}
