/**
 * RateLimitCard — límite diario de ARGOS con salida transaccional (T5 MAGIA 2.0).
 *
 * Doctrina: no forzar upgrade — ofrecer la transacción. Cuando el proxy
 * devuelve rate_limited con boost_option, la card ofrece "Activar Boost por
 * 500 H+ · 24h" (RPC atómico activate_pro_boost) con paywall como secundario.
 * Sin boost_option (pro/clinician) solo informa el reset.
 *
 * COPY tentativo — revisar con Enrique post-sprint.
 */
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useSubscription } from '@/src/hooks/useSubscription';
import { formatFull } from '@/src/services/economy/format';
import { canOfferBoost, formatResetWait, type RateLimitInfo } from '@/src/services/argos-rate-limit-core';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, ELEVATION, SEMANTIC, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  info: RateLimitInfo;
  /** El boost quedó activo — el caller re-habilita el chat (avatar → idle). */
  onBoostActivated?: () => void;
}

export function RateLimitCard({ info, onBoostActivated }: Props) {
  const { activateBoost } = useSubscription();
  const analytics = useAnalytics();
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  const wait = formatResetWait(info.resetsAt);
  const boost = info.boostOption;

  async function onActivate() {
    if (busy || !boost) return;
    setBusy(true);
    haptic.medium();
    const result = await activateBoost();
    setBusy(false);
    if (result.success) {
      // T5 HARDENING: funnel core — boost activado desde el rate limit.
      analytics.track(ATP_EVENTS.BOOST_ACTIVATED, { source: 'rate_limit_card' });
      haptic.success();
      setActivated(true);
      onBoostActivated?.();
      return;
    }
    haptic.warning();
    if (result.error === 'insufficient_h_plus') {
      Alert.alert(
        'Te faltan H+',
        `Necesitas ${formatFull(boost.costHPlus)} H+ y tienes ${formatFull(result.hPlusRemaining)}. Convierte tus E- o completa tu día para ganar más.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/convert' as any) },
        ],
      );
    } else if (result.error === 'rate_limit_exceeded') {
      Alert.alert(
        'Límite semanal de boosts',
        result.message ?? 'Máximo 3 boosts por semana. Considera ATP Pro para acceso ilimitado.',
        [
          { text: 'Entendido', style: 'cancel' },
          { text: 'Ver ATP Pro', onPress: () => router.push('/paywall' as any) },
        ],
      );
    } else if (result.error === 'already_active') {
      // El boost ya corre (p. ej. activado desde otra pantalla) — re-habilitar.
      setActivated(true);
      onBoostActivated?.();
    } else {
      Alert.alert('Algo no salió', 'No pudimos activar el boost. Intenta de nuevo en unos minutos.');
    }
  }

  // ── Boost recién activado: confirmación + invitación a reintentar ──
  if (activated) {
    return (
      <Animated.View entering={FadeInUp.springify()} style={[s.card, s.cardActive]}>
        <View style={s.iconCircleActive}>
          <Ionicons name="flash" size={16} color="#000" />
        </View>
        <View style={s.body}>
          <EliteText style={s.titleActive}>Boost Pro activo</EliteText>
          <EliteText style={s.sub}>24 horas sin límite. Reenvía tu pregunta.</EliteText>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.springify()} style={s.card}>
      <View style={s.headerRow}>
        <View style={s.iconCircle}>
          <Ionicons name="hourglass-outline" size={16} color={SEMANTIC.error} />
        </View>
        <View style={s.body}>
          <EliteText style={s.title}>
            Llegaste al límite diario ({info.usedToday}/{info.limitDaily})
          </EliteText>
          <EliteText style={s.sub}>
            {wait
              ? `Se renueva en ${wait} (00:00 UTC)${boost ? ' — o sigue ahora mismo:' : '.'}`
              : boost ? 'Sigue ahora mismo:' : 'Se renueva mañana.'}
          </EliteText>
        </View>
      </View>

      {boost && (
        <>
          <AnimatedPressable onPress={onActivate} disabled={busy} style={s.boostBtn}>
            <Ionicons name="flash" size={16} color="#000" />
            <EliteText style={s.boostBtnText}>
              {busy ? 'Activando…' : `Activar Boost por ${formatFull(boost.costHPlus)} H+ · ${boost.durationHours}h`}
            </EliteText>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/paywall' as any); }}
            style={s.secondaryBtn}
          >
            <EliteText style={s.secondaryText}>O suscríbete para acceso permanente →</EliteText>
          </AnimatedPressable>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: withOpacity(SEMANTIC.error, 0.35),
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
    alignSelf: 'stretch',
  },
  cardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withOpacity(SEMANTIC.error, 0.12),
  },
  iconCircleActive: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime,
    marginRight: Spacing.sm,
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  titleActive: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: ATP_BRAND.lime },
  sub: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  boostBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 4 },
  secondaryText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
});

export default RateLimitCard;
