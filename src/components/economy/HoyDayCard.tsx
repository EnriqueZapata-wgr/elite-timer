/**
 * HoyDayCard — Tarjeta nueva del HOY (decisión Enrique 22-jun): reemplaza el círculo viejo
 * "37 ELECTRONES" + "7.3 de 20.0 BAJA CARGA" por una UI clara con:
 *   - "+X E- ganados" (subset del día desde electron_transactions WHERE today)
 *   - Barra de carga (% hábitos completados del día — viene de electronProgress)
 *   - Label de carga ("BAJA"/"MEDIA"/"ALTA" según pct)
 *
 * Razón: el sistema viejo (electronProgress earned/possible) y el nuevo (electron_balance)
 * mostraban dos contadores distintos con el mismo nombre y confundían. Esta card unifica.
 *
 * Tap → /economy/admin (mismo destino que la pill superior).
 * Self-gated por LAB_ECONOMY_ENABLED: si OFF, no renderiza (HOY queda con el viejo).
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { LAB_ECONOMY_ENABLED } from '@/src/services/economy/economy-config';
import { getLocalToday } from '@/src/utils/date-helpers';
import { TEXT, ELEVATION, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  /** Porcentaje del día completado (0-100). Viene de day.electronProgress.percentage. */
  percentage: number;
}

export function HoyDayCard({ percentage }: Props) {
  const { user } = useAuth();
  const [earnedToday, setEarnedToday] = useState<number>(0);
  const barWidth = useSharedValue(0);

  const load = useCallback(async () => {
    if (!LAB_ECONOMY_ENABLED || !user?.id) return;
    // Sum de E- ganados hoy (transacciones positivas creadas hoy).
    const today = getLocalToday();
    const { data } = await supabase
      .from('electron_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .gt('amount', 0);
    const total = (data ?? []).reduce((acc: number, t: any) => acc + (t.amount ?? 0), 0);
    setEarnedToday(total);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (!LAB_ECONOMY_ENABLED) return;
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  // Anima la barra al cambiar el porcentaje.
  const animatedBar = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));
  useFocusEffect(useCallback(() => {
    barWidth.value = withTiming(Math.min(100, Math.max(0, percentage)), { duration: 600 });
  }, [percentage]));

  if (!LAB_ECONOMY_ENABLED) return null;

  const loadLabel = labelForPct(percentage);
  const loadColor = colorForPct(percentage);

  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); router.push('/economy/admin' as any); }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <EliteText style={styles.title}>TU DÍA</EliteText>
        <Ionicons name="chevron-forward" size={14} color={TEXT.secondary} />
      </View>

      <View style={styles.numRow}>
        <EliteText style={[styles.earnedNum, { color: ATP_BRAND.lime }]}>
          +{earnedToday}
        </EliteText>
        <EliteText style={styles.earnedLabel}>E- ganados</EliteText>
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: loadColor }, animatedBar]} />
      </View>

      <View style={styles.footerRow}>
        <EliteText style={[styles.pctText, { color: loadColor }]}>{Math.round(percentage)}%</EliteText>
        <EliteText style={[styles.loadLabel, { color: loadColor }]}>{loadLabel}</EliteText>
      </View>
    </AnimatedPressable>
  );
}

function labelForPct(pct: number): string {
  if (pct >= 80) return 'CARGA ALTA';
  if (pct >= 50) return 'CARGA MEDIA';
  if (pct >= 20) return 'CARGA BAJA';
  return 'SIN CARGA';
}

function colorForPct(pct: number): string {
  if (pct >= 80) return ATP_BRAND.lime;
  if (pct >= 50) return '#ffd166';
  if (pct >= 20) return '#ff8b66';
  return '#ff5577';
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: TEXT.secondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.2,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  earnedNum: {
    fontFamily: Fonts.bold,
    fontSize: 48,
    lineHeight: 52,
  },
  earnedLabel: {
    color: TEXT.secondary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  barTrack: {
    height: 8,
    backgroundColor: ELEVATION[2].border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pctText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  loadLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.2,
  },
});
