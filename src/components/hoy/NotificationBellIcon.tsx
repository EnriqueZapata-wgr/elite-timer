/**
 * NotificationBellIcon (AGENDA-COMPLETE F3 · HARDENING T3) — campana del header del HOY
 * con badge real (user_notifications sin leer, migración 150). Tap → /notifications.
 * Se refresca al enfocar la pantalla, con el evento 'notifications_changed' (emitido
 * por user-notifications-service al marcar leídas) y al RECIBIR un push con la app en
 * foreground (T3: antes el badge no se enteraba hasta re-enfocar).
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { countUnreadInbox } from '@/src/services/user-notifications-service';
import { bellBadgeLabel } from './notification-bell-core';
import { Colors, Fonts } from '@/constants/theme';

export function NotificationBellIcon() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    if (!user?.id) { setUnread(0); return; }
    countUnreadInbox(user.id).then(setUnread).catch(() => setUnread(0));
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('notifications_changed', load);
    // T3: push recibido con la app abierta → el badge se actualiza al instante
    // (dispatch-agenda-notifications inserta la row de inbox ANTES del push).
    const pushSub = Notifications.addNotificationReceivedListener(() => load());
    return () => { sub.remove(); pushSub.remove(); };
  }, [load]));

  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); router.push('/notifications'); }}
      style={styles.icon}
    >
      <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
      {bellBadgeLabel(unread) ? (
        <View style={styles.badge}>
          <EliteText style={styles.badgeText}>{bellBadgeLabel(unread)}</EliteText>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#a8e02a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#000', fontSize: 9, fontFamily: Fonts.bold, lineHeight: 12 },
});
