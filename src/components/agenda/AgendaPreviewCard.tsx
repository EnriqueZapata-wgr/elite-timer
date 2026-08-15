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
import { RestrictionsBanner } from '@/src/components/agenda/RestrictionsBanner';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import { generateAgendaEvents, getAgendaForDate, getRestrictionsForDate, type AgendaEventInstance } from '@/src/services/agenda-service';

interface Props {
  userId?: string;
}

export function AgendaPreviewCard({ userId }: Props) {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  // MB-31B: el lima como LETRA solo vive en oscuro (regla 3); en claro el
  // acento de texto es el teal calibrado.
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const [events, setEvents] = useState<AgendaEventInstance[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!userId) { setLoaded(true); return; }
      await generateAgendaEvents(userId, getLocalToday()); // idempotente
      const [list, restr] = await Promise.all([
        getAgendaForDate(userId, getLocalToday()),
        getRestrictionsForDate(userId, getLocalToday()),
      ]);
      if (active) { setEvents(list); setRestrictions(restr); setLoaded(true); }
    })();
    const sub = DeviceEventEmitter.addListener('day_changed', async () => {
      if (!userId) return;
      const [list, restr] = await Promise.all([
        getAgendaForDate(userId, getLocalToday()),
        getRestrictionsForDate(userId, getLocalToday()),
      ]);
      if (active) { setEvents(list); setRestrictions(restr); }
    });
    return () => { active = false; sub.remove(); };
  }, [userId]));

  const nowMs = Date.now();
  const upcoming = events.filter((e) => e.status === 'pending' && new Date(e.scheduledAt).getTime() >= nowMs);
  const preview = (upcoming.length > 0 ? upcoming : events).slice(0, 3);
  const go = () => { haptic.light(); router.push('/agenda'); };

  // No renderizar nada hasta el primer load (evita parpadeo del estado vacío).
  if (!loaded) return null;

  return (
    <AnimatedPressable onPress={go} style={[styles.card, { backgroundColor: t.hundido }]}>
      {/* Fondo gradient sutil de profundidad. */}
      <LinearGradient colors={[t.card, t.hundido]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <EliteText style={[styles.title, { color: t.texto }]}>AGENDA DE HOY</EliteText>
        <View style={styles.chip}>
          <EliteText style={[styles.chipText, { color: acento }]}>
            {events.length === 0 ? 'Configurar' : `${upcoming.length} próximos`}
          </EliteText>
          <Ionicons name="chevron-forward" size={13} color={acento} />
        </View>
      </View>

      {/* #v13i D — prohibiciones del día (versión compacta). */}
      {restrictions.length > 0 ? (
        <View style={styles.bannerWrap}>
          <RestrictionsBanner restrictions={restrictions} compact />
        </View>
      ) : null}

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={36} color={t.sinDatos} />
          <EliteText style={[styles.emptyText, { color: t.textoSecundario }]}>Crea eventos o configura tu protocolo y cronotipo para verlos aquí.</EliteText>
          <View style={styles.emptyCta}><EliteText style={[styles.emptyCtaText, { color: t.textoSobreLima }]}>CONFIGURAR AGENDA</EliteText></View>
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

// MB-31B: colores neutros (card bg, title, chipText, emptyText, emptyCtaText)
// salieron de aqui — se aplican inline con `t`/`acento` arriba. Lo que queda
// es layout + los rellenos/tintes de marca intencionales (borde lima, chip
// lima translucido, CTA lima) que son iguales en los dos temas.
const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card, overflow: 'hidden',
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.lime,
    padding: Spacing.lg, marginTop: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(168,224,42,0.12)', borderWidth: 0.5, borderColor: 'rgba(168,224,42,0.35)',
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  bannerWrap: { marginBottom: Spacing.sm },
  list: {},
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18, textAlign: 'center' },
  emptyCta: { marginTop: Spacing.xs, backgroundColor: ATP_BRAND.lime, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  emptyCtaText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
});
