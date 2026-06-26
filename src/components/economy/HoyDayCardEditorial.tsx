/**
 * HoyDayCardEditorial (#v13d 2.7) — upgrade editorial de la card "TU DÍA" del HOY.
 *
 * Misma lógica que HoyDayCard (E- ganados hoy desde electron_transactions + barra de carga del
 * día), pero con tratamiento editorial: imagen B/N de fondo (carpeta `agenda/despertar` — "el día
 * que empieza", rotación seed-determinística por día/usuario), gradient overlay + velo, y tipografía
 * display grande para el número. Si no hay imagen → cae a gradient sólido (mismo patrón EditorialCard).
 *
 * Tap → /economy/admin (igual que el legacy). Self-gated por LAB_ECONOMY_ENABLED.
 *
 * El legacy `HoyDayCard` se conserva hasta confirmar que el editorial pega (se borra en follow-up).
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter, Image, type ImageSourcePropType } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { LAB_ECONOMY_ENABLED } from '@/src/services/economy/economy-config';
import { getLocalToday } from '@/src/utils/date-helpers';
import { pickAgendaImage } from '@/src/utils/agenda-image-picker';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  /** Porcentaje del día completado (0-100). Viene de day.electronProgress.percentage. */
  percentage: number;
  /** Seed para rotación determinística de la imagen (ej. userId): misma img toda la sesión del día. */
  seedKey?: string;
}

const DAWN_GRADIENT: [string, string] = ['#F59E0B', '#312E81'];

export function HoyDayCardEditorial({ percentage, seedKey }: Props) {
  const { user } = useAuth();
  const [earnedToday, setEarnedToday] = useState<number>(0);
  const barWidth = useSharedValue(0);

  const load = useCallback(async () => {
    if (!LAB_ECONOMY_ENABLED || !user?.id) return;
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

  const animatedBar = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));
  useFocusEffect(useCallback(() => {
    barWidth.value = withTiming(Math.min(100, Math.max(0, percentage)), { duration: 600 });
  }, [percentage]));

  if (!LAB_ECONOMY_ENABLED) return null;

  const loadLabel = labelForPct(percentage);
  const loadColor = colorForPct(percentage);
  const image: ImageSourcePropType | undefined = pickAgendaImage('despertar', `${seedKey ?? ''}-tudia-${getLocalToday()}`);

  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); router.push('/economy/admin' as any); }}
      style={styles.card}
    >
      {/* Fondo B/N (despertar) o placeholder gradient. width/height explícitos por el bug de
          RN con aspectRatio en el padre (ver EditorialCard). */}
      {image ? (
        <Image source={image} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: DAWN_GRADIENT[0], opacity: 0.25 }]} />
      )}
      <LinearGradient
        colors={image ? [`${DAWN_GRADIENT[0]}CC`, `${DAWN_GRADIENT[1]}1A`] : DAWN_GRADIENT}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, !image && { opacity: 0.9 }]}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <EliteText style={styles.title}>TU DÍA</EliteText>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
        </View>

        <View style={styles.bottom}>
          <View style={styles.numRow}>
            <EliteText style={[styles.earnedNum, { color: ATP_BRAND.lime }]}>+{earnedToday}</EliteText>
            <EliteText style={styles.earnedLabel}>E- ganados hoy</EliteText>
          </View>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { backgroundColor: loadColor }, animatedBar]} />
          </View>
          <View style={styles.footerRow}>
            <EliteText style={[styles.pctText, { color: loadColor }]}>{Math.round(percentage)}%</EliteText>
            <EliteText style={[styles.loadLabel, { color: loadColor }]}>{loadLabel}</EliteText>
          </View>
        </View>
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
    width: '100%',
    aspectRatio: 16 / 9,
    marginTop: Spacing.lg,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
  bottom: { gap: Spacing.xs },
  numRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  earnedNum: { fontFamily: Fonts.bold, fontSize: FontSizes.display, lineHeight: FontSizes.display + 4 },
  earnedLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: Spacing.xs },
  barFill: { height: '100%', borderRadius: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  pctText: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  loadLabel: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1.2 },
});
