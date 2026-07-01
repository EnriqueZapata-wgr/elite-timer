/**
 * AgendaPreviewCard (#v13h — rediseño editorial) — bloque en HOY que vincula con /agenda.
 * Muestra "AGENDA DE HOY" + próximos 3 eventos (compactos) y navega a /agenda al tap. Auto-genera
 * los eventos del día (idempotente) para sentirse viva. Estado vacío → icono + copy + CTA lima.
 * Lenguaje visual: fondo gradient sutil + acento lateral lima + chip pill de próximos.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
      {/* Fondo gradient sutil de profundidad. */}
      <LinearGradient colors={['#151515', '#0A0A0A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <EliteText style={styles.title}>AGENDA DE HOY</EliteText>
        <View style={styles.chip}>
          <EliteText style={styles.chipText}>
            {events.length === 0 ? 'Configurar' : `${upcoming.length} próximos`}
          </EliteText>
          <Ionicons name="chevron-forward" size={13} color={ATP_BRAND.lime} />
        </View>
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={36} color="rgba(255,255,255,0.2)" />
          <EliteText style={styles.emptyText}>Crea eventos o configura tu protocolo y cronotipo para verlos aquí.</EliteText>
          <View style={styles.emptyCta}><EliteText style={styles.emptyCtaText}>CONFIGURAR AGENDA</EliteText></View>
        </View>
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
    borderRadius: Radius.card, overflow: 'hidden',
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.lime,
    backgroundColor: '#0A0A0A',
    padding: Spacing.lg, marginTop: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(168,224,42,0.12)', borderWidth: 0.5, borderColor: 'rgba(168,224,42,0.35)',
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill,
  },
  chipText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  list: {},
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18, textAlign: 'center' },
  emptyCta: { marginTop: Spacing.xs, backgroundColor: ATP_BRAND.lime, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  emptyCtaText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
});
