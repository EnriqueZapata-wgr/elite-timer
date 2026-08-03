/**
 * OrbCard — el reporte de la orbe en TAREAS (MB-20 Pieza 1.6).
 *
 * Se COLAPSA, no se descarta (decisión textual del brief). Escaneable en
 * menos de 5 segundos: qué ve ARGOS hoy y a dónde ir por el desarrollo.
 * La orbe se dibuja quieta (reducedMotion): en una card la respiración no
 * se ve y solo gasta batería.
 */
import { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { loadOrbCardCollapsed, saveOrbCardCollapsed } from '@/src/services/hoy/orb-card-store';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';

interface Props {
  userId?: string;
}

export function OrbCard({ userId }: Props) {
  const router = useRouter();
  const [insight, setInsight] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const today = getLocalToday();

  useEffect(() => {
    loadOrbCardCollapsed(today).then(setCollapsed);
  }, [today]);

  useEffect(() => {
    if (!userId) return;
    // HOY ya genera+cachea el insight (argos_daily_insights); aquí solo se lee.
    supabase
      .from('argos_daily_insights')
      .select('insight')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { logWarn('[OrbCard] insight query failed', error); return; }
        if (data?.insight) setInsight(String(data.insight));
      });
  }, [userId, today]);

  function toggle() {
    haptic.light();
    const next = !collapsed;
    setCollapsed(next);
    saveOrbCardCollapsed(today, next);
  }

  if (!insight) return null;

  return (
    <View style={s.card}>
      <Pressable onPress={toggle} style={s.header} accessibilityRole="button">
        <View style={s.headerLeft}>
          <ArgosOrb size={20} reducedMotion />
          <EliteText style={s.label}>ARGOS</EliteText>
        </View>
        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={TEXT.muted} />
      </Pressable>
      {!collapsed && (
        <>
          <EliteText style={s.insight} numberOfLines={6}>{insight}</EliteText>
          <Pressable
            onPress={() => { haptic.light(); router.push('/notifications'); }}
            style={({ pressed }) => [s.verMas, pressed && { opacity: 0.6 }]}
          >
            <EliteText style={s.verMasText}>Ver explicación</EliteText>
            <Ionicons name="chevron-forward" size={12} color={ATP_BRAND.lime} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(168,224,42,0.05)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    color: ATP_BRAND.lime,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  insight: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginTop: 10,
  },
  verMas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
  },
  verMasText: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
});
