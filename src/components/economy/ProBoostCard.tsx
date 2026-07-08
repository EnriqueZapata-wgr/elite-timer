/**
 * ProBoostCard — Boost H+ (Task #133): 24h de ATP Pro pagadas con Protones.
 *
 * Estados:
 *  - tier base sin boost  → card promo con balance H+ y CTA "Activar boost"
 *  - boost activo         → countdown "⚡ ARGOS Pro activo · 23h 15m restantes"
 *  - cualquier otro caso  → null (Pro/Clínico ya lo tienen; free no ve la card)
 *
 * El débito + rate limit (3/semana) es atómico en el RPC activate_pro_boost.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { getProtonBalance } from '@/src/services/economy/proton-service';
import { formatFull } from '@/src/services/economy/format';
import { PRO_BOOST_COST_H_PLUS } from '@/src/services/subscription/subscription-service';
import { formatBoostRemaining } from '@/src/services/subscription/tier-logic';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export function ProBoostCard() {
  const { user } = useAuth();
  const { tier, boost, activateBoost, isLoading } = useSubscription();
  const [hPlus, setHPlus] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-render por minuto para que el countdown avance
  const [, setTick] = useState(0);

  const loadBalance = useCallback(() => {
    if (!user?.id) return;
    getProtonBalance(user.id).then((b) => setHPlus(b.current_protons)).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    loadBalance();
    const sub = DeviceEventEmitter.addListener('balance_changed', loadBalance);
    return () => sub.remove();
  }, [loadBalance]);

  useEffect(() => {
    if (!boost.active) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [boost.active]);

  async function doActivate() {
    if (busy) return;
    setBusy(true);
    const result = await activateBoost();
    setBusy(false);
    if (result.success) {
      haptic.success();
      setHPlus(result.hPlusRemaining);
      return;
    }
    haptic.warning();
    if (result.error === 'insufficient_h_plus') {
      Alert.alert(
        'Te faltan H+',
        `Necesitas ${formatFull(PRO_BOOST_COST_H_PLUS)} H+ y tienes ${formatFull(result.hPlusRemaining)}. Convierte tus E- o completa tu día para ganar más.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/convert' as any) },
        ],
      );
    } else if (result.error === 'rate_limit_exceeded') {
      Alert.alert(
        'Límite semanal',
        result.message ?? 'Máximo 3 boosts por semana. Considera ATP Pro para acceso ilimitado.',
        [
          { text: 'Entendido', style: 'cancel' },
          { text: 'Ver ATP Pro', onPress: () => router.push('/paywall' as any) },
        ],
      );
    } else if (result.error === 'already_active') {
      Alert.alert('Boost activo', result.message ?? 'Ya tienes un boost activo.');
    } else {
      Alert.alert('Algo no salió', 'No pudimos activar el boost. Intenta de nuevo en unos minutos.');
    }
  }

  function onActivatePress() {
    haptic.medium();
    const balance = hPlus ?? 0;
    if (balance < PRO_BOOST_COST_H_PLUS) {
      haptic.warning();
      Alert.alert(
        'Te faltan H+',
        `Necesitas ${formatFull(PRO_BOOST_COST_H_PLUS)} H+ y tienes ${formatFull(balance)}. Convierte tus E- o completa tu día para ganar más.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/convert' as any) },
        ],
      );
      return;
    }
    Alert.alert(
      'Activar Boost Pro',
      `Usarás ${formatFull(PRO_BOOST_COST_H_PLUS)} H+ · Te quedarán ${formatFull(balance - PRO_BOOST_COST_H_PLUS)} H+.\n\n24 horas de ARGOS Pro sin límites.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Activar', onPress: doActivate },
      ],
    );
  }

  if (isLoading) return null;

  // ── Boost activo: countdown ──
  if (boost.active && boost.expiresAt) {
    return (
      <Animated.View entering={FadeInUp.delay(130).springify()} style={styles.wrapper}>
        <View style={[styles.card, styles.cardActive]}>
          <View style={styles.iconCircleActive}>
            <Ionicons name="flash" size={18} color="#000" />
          </View>
          <View style={styles.body}>
            <EliteText style={styles.titleActive}>ARGOS Pro activo</EliteText>
            <EliteText style={styles.subtitle}>
              {formatBoostRemaining(boost.expiresAt)} restantes · disfruta el poder completo
            </EliteText>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── Solo Base sin boost ve la promo ──
  if (tier !== 'base') return null;

  return (
    <Animated.View entering={FadeInUp.delay(130).springify()} style={styles.wrapper}>
      <AnimatedPressable onPress={onActivatePress} disabled={busy} style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="flash-outline" size={18} color={ATP_BRAND.lime} />
        </View>
        <View style={styles.body}>
          <EliteText style={styles.title}>Prueba ARGOS Pro por 24 horas</EliteText>
          <EliteText style={styles.subtitle}>
            {formatFull(PRO_BOOST_COST_H_PLUS)} H+
            {hPlus !== null ? ` · Tienes ${formatFull(hPlus)} H+` : ''}
          </EliteText>
        </View>
        <EliteText style={styles.cta}>{busy ? '…' : 'Activar →'}</EliteText>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  cardActive: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
  },
  iconCircleActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime,
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  titleActive: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: ATP_BRAND.lime },
  subtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary },
  cta: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
});
