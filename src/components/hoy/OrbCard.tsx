/**
 * OrbCard — el reporte de la orbe en TAREAS (MB-20 Pieza 1.6).
 *
 * Se COLAPSA, no se descarta (decisión textual del brief). Escaneable en
 * menos de 5 segundos: qué ve ARGOS hoy y a dónde ir por el desarrollo.
 * La orbe se dibuja quieta (reducedMotion): en una card la respiración no
 * se ve y solo gasta batería.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, View, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { loadOrbCardCollapsed, saveOrbCardCollapsed } from '@/src/services/hoy/orb-card-store';
import { ARGOS_INSIGHT_CHANGED_EVENT } from '@/src/services/argos-insight-cache';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';

interface Props {
  userId?: string;
}

export function OrbCard({ userId }: Props) {
  const router = useRouter();
  const [insight, setInsight] = useState<string | null>(null);
  // null = memoria del día sin leer aún: no se pinta nada hasta saberlo, para
  // no parpadear colapsada antes de abrirse (el store responde async).
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  // HOY genera+cachea el insight (argos_daily_insights); aquí solo se lee.
  // La lectura NO es de una sola vez: en la primera entrada del día la card
  // montaba antes de que la generación terminara, se quedaba en null y el tab
  // nunca se desmonta. Se relee al enfocar y con cada señal de cambio.
  const refresh = useCallback(async () => {
    if (!userId) return;
    const today = getLocalToday();
    const [col, res] = await Promise.all([
      loadOrbCardCollapsed(today),
      supabase
        .from('argos_daily_insights')
        .select('insight')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
    ]);
    setCollapsed(col);
    if (res.error) { logWarn('[OrbCard] insight query failed', res.error); return; }
    setInsight(res.data?.insight ? String(res.data.insight) : null);
  }, [userId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    const s1 = DeviceEventEmitter.addListener('day_changed', refresh);
    const s2 = DeviceEventEmitter.addListener(ARGOS_INSIGHT_CHANGED_EVENT, refresh);
    return () => { s1.remove(); s2.remove(); };
  }, [refresh]);

  function toggle() {
    if (collapsed === null) return;
    haptic.light();
    const next = !collapsed;
    setCollapsed(next);
    saveOrbCardCollapsed(getLocalToday(), next);
  }

  if (!insight || collapsed === null) return null;

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
