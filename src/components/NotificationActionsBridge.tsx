/**
 * MB-30B Pieza 2 — bridge invisible de acciones de notificación (patrón
 * RevenueCatSync). Registra las categorías con botones al montar y atiende
 * las respuestas: en vivo (listener) y en frío (respuesta guardada por el
 * SO cuando la app estaba muerta, con dedup).
 *
 * La navegación (acciones que abren la app, p. ej. "Escribir ahora") se
 * resuelve aquí porque el router vive en React; el registro de datos vive
 * en notification-actions.ts y SIEMPRE va por los writers canónicos.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/auth-context';
import {
  registerNotificationCategories,
  handleNotificationResponse,
  handleInitialNotificationResponse,
  markResponseHandled,
} from '@/src/services/notification-actions';

export function NotificationActionsBridge() {
  const { user } = useAuth();

  useEffect(() => {
    registerNotificationCategories();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // Dedup: lo que atiende el listener no debe re-atenderse en frío.
      await markResponseHandled(response);
      const { openRoute } = await handleNotificationResponse(userId, response);
      if (openRoute) router.push(openRoute as never);
    });
    handleInitialNotificationResponse(userId).then(({ openRoute }) => {
      if (openRoute) router.push(openRoute as never);
    });
    return () => sub.remove();
  }, [user?.id]);

  return null;
}
