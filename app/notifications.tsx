/**
 * /notifications (AGENDA-COMPLETE F3) — inbox de notificaciones in-app.
 * Historial de user_notifications (recordatorios de agenda + futuros tipos) con marcar
 * leída al tap (+ navegar a data.route) y "Marcar leídas" global. Arriba, fijado, el
 * INSIGHT ARGOS del día (antes vivía en el modal de la campana del HOY — se preserva aquí).
 * Estilo editorial: mismo patrón que /agenda (gradient + título grande + fecha lima).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  listNotifications, markNotificationRead, markAllNotificationsRead, type UserNotification,
} from '@/src/services/user-notifications-service';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';

/** "hace 5 min" / "hace 2 h" / "ayer" / "3 jul". */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  const date = new Date(iso);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<UserNotification[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    const [list, insightRow] = await Promise.all([
      listNotifications(userId),
      (async () => {
        try {
          const { data } = await supabase.from('argos_daily_insights').select('insight')
            .eq('user_id', userId).eq('date', getLocalToday()).maybeSingle();
          return data;
        } catch { return null; }
      })(),
    ]);
    setItems(list);
    setInsight((insightRow as any)?.insight ?? '');
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const unreadCount = items.filter((n) => !n.readAt).length;

  const handleTap = async (n: UserNotification) => {
    haptic.light();
    if (!userId) return;
    if (!n.readAt) {
      // Optimista: marcar leída en UI ya; la persistencia emite 'notifications_changed'.
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      await markNotificationRead(userId, n.id);
    }

    // Deep link resolution (fix mini-#121):
    // 1) route explícito en data.route → prioridad
    // 2) fallback por tipo de notif (agenda_reminder → /agenda, etc.)
    // 3) sin match → NO navega (queda en /notifications, no cae silencioso a HOY)
    const rawRoute = typeof n.data?.route === 'string' ? n.data.route : null;
    const eventId = typeof n.data?.eventId === 'string' ? n.data.eventId : null;

    let target: string | null = rawRoute;
    if (!target) {
      // Fallback por tipo (futuros tipos: lab_ready → /(tabs)/mi-atp, insight → /argos-chat, etc.)
      if (n.type === 'agenda_reminder') target = '/agenda';
    }

    if (!target) return; // Sin destino → quedarse en /notifications

    try {
      // Object form de expo-router: navega correcto con params opcionales
      if (eventId && target === '/agenda') {
        router.push({ pathname: '/agenda', params: { event: eventId } } as any);
      } else {
        router.push(target as any);
      }
    } catch (err) {
      // Falla de navegación → quedarse en /notifications (no caer silencioso a HOY)
      console.warn('[notifications] navigation failed:', err);
    }
  };

  const handleMarkAll = async () => {
    if (!userId || unreadCount === 0) return;
    haptic.medium();
    setItems((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })));
    await markAllNotificationsRead(userId);
  };

  return (
    <Screen>
      <LinearGradient colors={['#000000', '#0A0A0A', '#000000']} style={StyleSheet.absoluteFill} />

      <View style={styles.headerRow}>
        <BackButton onPress={() => router.back()} />
        {unreadCount > 0 ? (
          <Pressable style={styles.chip} onPress={handleMarkAll}>
            <EliteText style={styles.chipText}>Marcar leídas ({unreadCount})</EliteText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.titleBlock}>
        <EliteText style={styles.title}>NOTIFICACIONES</EliteText>
        <EliteText style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
        </EliteText>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ATP_BRAND.lime} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* INSIGHT ARGOS del día — fijado arriba (preservado del modal viejo de la campana). */}
          {insight ? (
            <Pressable style={styles.insightCard} onPress={() => { haptic.light(); router.push('/argos-chat' as any); }}>
              <View style={styles.insightIcon}>
                <Ionicons name="eye" size={14} color={ATP_BRAND.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={styles.insightLabel}>INSIGHT ARGOS</EliteText>
                <EliteText style={styles.insightText}>{insight}</EliteText>
              </View>
            </Pressable>
          ) : null}

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.2)" />
              <EliteText style={styles.emptyTitle}>No tienes notificaciones</EliteText>
              <EliteText style={styles.emptyText}>
                Configura recordatorios en tu agenda para no perderte nada.
              </EliteText>
            </View>
          ) : (
            items.map((n) => {
              const unread = !n.readAt;
              return (
                <Pressable key={n.id} style={[styles.item, unread && styles.itemUnread]} onPress={() => handleTap(n)}>
                  {unread ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
                  <View style={{ flex: 1 }}>
                    <EliteText style={[styles.itemTitle, unread && styles.itemTitleUnread]}>{n.title}</EliteText>
                    <EliteText style={styles.itemBody}>{n.body}</EliteText>
                  </View>
                  <EliteText style={styles.itemTime}>{relativeTime(n.createdAt)}</EliteText>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(168,224,42,0.12)', borderWidth: 0.5, borderColor: 'rgba(168,224,42,0.4)',
    paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.pill,
  },
  chipText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  titleBlock: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.md },
  title: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 2 },
  subtitle: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 3, marginTop: 3 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  insightCard: {
    flexDirection: 'row', gap: 12, padding: Spacing.md, borderRadius: Radius.card,
    backgroundColor: 'rgba(168,224,42,0.06)', borderWidth: 1, borderColor: 'rgba(168,224,42,0.12)',
    marginBottom: Spacing.md,
  },
  insightIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(168,224,42,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  insightLabel: { color: ATP_BRAND.lime, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.5 },
  insightText: { color: '#ccc', fontSize: FontSizes.sm, lineHeight: 20, marginTop: 4, fontFamily: Fonts.regular },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  itemUnread: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ATP_BRAND.lime, marginTop: 6 },
  dotPlaceholder: { width: 7, height: 7, marginTop: 6 },
  itemTitle: { color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  itemTitleUnread: { color: '#fff' },
  itemBody: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2, lineHeight: 19 },
  itemTime: { color: 'rgba(255,255,255,0.35)', fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
});
