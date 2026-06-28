/**
 * AgendaPreviewCard (#v13g F3) — bloque en HOY (entre TU DÍA y DESPERTAR) que vincula con /agenda.
 * Muestra "AGENDA DE HOY" + próximos 3 eventos (compactos) y navega a /agenda al tap. Auto-genera
 * los eventos del día (idempotente) para sentirse viva. Estado vacío → CTA configurar.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { AgendaMiniCard } from '@/src/components/agenda/AgendaMiniCard';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import { generateAgendaEvents, getAgendaForDate, type AgendaEventInstance } from '@/src/services/agenda-service';

interface Props {
  userId?: string;
}

export function AgendaPreviewCard({ userId }: Props) {
  const [events, setEvents] = useState<AgendaEventInstance[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!userId) { setLoaded(true); return; }
      await generateAgendaEvents(userId, getLocalToday()); // idempotente
      const list = await getAgendaForDate(userId, getLocalToday());
      if (active) { setEvents(list); setLoaded(true); }
    })();
    const sub = DeviceEventEmitter.addListener('day_changed', async () => {
      if (!userId) return;
      const list = await getAgendaForDate(userId, getLocalToday());
      if (active) setEvents(list);
    });
    return () => { active = false; sub.remove(); };
  }, [userId]));

  const nowMs = Date.now();
  const upcoming = events.filter((e) => e.status === 'pending' && new Date(e.scheduledAt).getTime() >= nowMs);
  const preview = (upcoming.length > 0 ? upcoming : events).slice(0, 3);
  const go = () => { haptic.light(); router.push('/agenda' as any); };

  // No renderizar nada hasta el primer load (evita parpadeo del estado vacío).
  if (!loaded) return null;

  return (
    <AnimatedPressable onPress={go} style={styles.card}>
      <View style={styles.header}>
        <EliteText style={styles.title}>AGENDA DE HOY</EliteText>
        <View style={styles.chipRow}>
          <EliteText style={styles.chip}>
            {events.length === 0 ? 'Configurar' : `${upcoming.length} próximos`}
          </EliteText>
          <Ionicons name="chevron-forward" size={14} color={ATP_BRAND.lime} />
        </View>
      </View>

      {events.length === 0 ? (
        <EliteText style={styles.emptyText}>Crea eventos o configura tu protocolo y cronotipo para verlos aquí.</EliteText>
      ) : (
        <View style={styles.list}>
          {preview.map((ev) => (
            <AgendaMiniCard key={ev.id} event={ev} compact seedKey={userId} onTap={go} />
          ))}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E0E0E', borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: 'rgba(168,224,42,0.25)',
    padding: Spacing.md, marginTop: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  list: { gap: 0 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18 },
});
