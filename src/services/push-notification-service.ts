/**
 * Push notification service (#v13g F6) — registro del expo push token del device en
 * user_notification_tokens (la Edge Function dispatch-agenda-notifications los lee para enviar).
 *
 * Permisos: `prompt: false` (default) NO pide permiso si no está concedido — registra el token solo
 * si el usuario ya aceptó (ej. en onboarding). `prompt: true` sí solicita (onboarding / primer
 * evento con notify). Así el login NO dispara un prompt inesperado.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

/** ¿El usuario ya concedió permiso de notificaciones? (no solicita). */
export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Registra el expo push token del device. Devuelve el token o null (no es device físico, sin
 * permiso, o error). Idempotente (upsert por user+token).
 */
export async function registerForPushNotificationsAsync(
  userId: string,
  opts: { prompt?: boolean } = {},
): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // los emuladores no reciben push real

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      if (!opts.prompt) return null; // no molestar si no se pidió explícitamente solicitar
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // projectId desde app.json (extra.eas.projectId) — no hardcodear.
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await supabase.from('user_notification_tokens').upsert({
      user_id: userId,
      expo_push_token: tokenData.data,
      platform: Platform.OS,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,expo_push_token' });

    return tokenData.data;
  } catch (e) {
    logWarn('[push] registerForPushNotificationsAsync failed', e);
    return null;
  }
}
