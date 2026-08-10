/**
 * MB-32 — bridge invisible de los widgets (patrón NotificationActionsBridge).
 *
 * Tres responsabilidades, cero UI:
 *  1. REPLAY al arrancar: si un tap del widget quedó encolado sin drenarse
 *     (el servicio headless no alcanzó a correr), se ejecuta ahora — llega
 *     tarde pero por el mismo camino (doctrina cold start MB-30B).
 *  2. AppState → active: belt del mismo replay al volver del background.
 *  3. Logout: los widgets se limpian (quedan en "Abre ATP") — un widget con
 *     los hábitos de una sesión muerta es una fuga de datos en la pantalla
 *     de inicio.
 *
 * El PUSH de snapshots no vive aquí: va piggyback en el loadDay de HOY
 * (misma fuente única, cero queries extra).
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { drainWidgetActions } from '@/src/services/widgets/widget-actions';
import { clearWidgets } from '@/src/services/widgets/widget-sync-service';

export function WidgetSyncBridge() {
  const { user } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (prevUserId.current && !userId) {
      clearWidgets();
    }
    prevUserId.current = userId;
    if (!userId) return;

    drainWidgetActions().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') drainWidgetActions().catch(() => {});
    });
    return () => sub.remove();
  }, [user?.id]);

  return null;
}
