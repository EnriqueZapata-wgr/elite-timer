/**
 * AJUSTES › SUSCRIPCIÓN — estado del plan, renovación, gestión e historial.
 *
 * La cancelación real vive en Apple/Google (no se puede cancelar in-app por
 * política de stores): el botón confirma y deep-linkea a la gestión de
 * suscripciones. Historial desde subscription_events (webhook de Cowork).
 */
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import {
  fetchSubscriptionEvents,
  type SubscriptionEvent,
} from '@/src/services/subscription/subscription-service';
import { formatBoostRemaining, type Tier } from '@/src/services/subscription/tier-logic';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import type { AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const TIER_LABELS: Record<Tier, string> = {
  free: 'ATP Free',
  base: 'ATP Base',
  pro: 'ATP Pro',
  clinician: 'ATP Clínico',
};

// MB-31B: el color del tier es TEXTO — en claro ni el lima (1.34) ni el teal
// de marca llegan como letra; ahí usan el teal calibrado (regla 1/2).
const tierColor = (tier: Tier, t: AppThemeTokens): string => {
  if (t.kind === 'dark') {
    return { free: t.textoSecundario, base: t.texto, pro: ATP_BRAND.lime, clinician: ATP_BRAND.teal1 }[tier];
  }
  return { free: t.textoSecundario, base: t.texto, pro: t.tealTexto, clinician: t.tealTexto }[tier];
};

const EVENT_LABELS: Record<string, string> = {
  INITIAL_PURCHASE: 'Compra inicial',
  RENEWAL: 'Renovación',
  CANCELLATION: 'Cancelación programada',
  UNCANCELLATION: 'Reactivación',
  NON_RENEWING_PURCHASE: 'Compra única',
  SUBSCRIPTION_PAUSED: 'Suscripción pausada',
  EXPIRATION: 'Expiración',
  BILLING_ISSUE: 'Problema de cobro',
  PRODUCT_CHANGE: 'Cambio de plan',
  TRANSFER: 'Transferencia',
  TEMPORARY_ENTITLEMENT_GRANT: 'Acceso temporal',
  TEST: 'Evento de prueba',
};

const STORE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SubscriptionSettingsScreen() {
  const { user } = useAuth();
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const thTenue = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const {
    tier, effectiveTier, boost, customerInfo, offerings, restore, isLoading,
  } = useSubscription();
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [restoring, setRestoring] = useState(false);

  useFocusEffect(useCallback(() => {
    if (user?.id) fetchSubscriptionEvents(user.id).then(setEvents);
  }, [user?.id]));

  // Entitlement activo más relevante (para renovación/trial)
  const activeEntitlement = customerInfo
    ? Object.values(customerInfo.entitlements.active)[0] ?? null
    : null;
  const inTrial = activeEntitlement?.periodType === 'TRIAL';
  const trialDaysLeft = inTrial && activeEntitlement?.expirationDate
    ? Math.max(0, Math.ceil(
        (new Date(activeEntitlement.expirationDate).getTime() - Date.now()) / 86_400_000,
      ))
    : null;

  // Monto de renovación: precio del product del entitlement activo
  const renewalPrice = (() => {
    if (!activeEntitlement || !offerings?.current) return null;
    const pkg = offerings.current.availablePackages.find(
      (p) => p.product.identifier === activeEntitlement.productIdentifier,
    );
    return pkg?.product.priceString ?? null;
  })();

  const managementUrl = customerInfo?.managementURL ?? STORE_SUBSCRIPTIONS_URL;

  function onManagePayment() {
    haptic.medium();
    if (managementUrl) Linking.openURL(managementUrl);
  }

  function onCancel() {
    haptic.medium();
    Alert.alert(
      'Cancelar suscripción',
      `La cancelación se gestiona en ${Platform.OS === 'ios' ? 'Apple' : 'Google'}. Mantienes acceso hasta el fin del periodo pagado.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Ir a gestionar',
          style: 'destructive',
          onPress: () => { if (managementUrl) Linking.openURL(managementUrl); },
        },
      ],
    );
  }

  async function onRestore() {
    if (restoring) return;
    haptic.medium();
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    if (result.success) {
      haptic.success();
      Alert.alert('Compras restauradas', 'Tu suscripción quedó sincronizada.');
    } else {
      Alert.alert('Restaurar compras', result.error ?? 'No encontramos compras en esta cuenta.');
    }
  }

  const hasPaidPlan = tier !== 'free';

  return (
    <Screen edges={[]} themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title="Suscripción" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Tier actual ── */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={[styles.tierCard, thCard]}>
          <EliteText style={[styles.tierLabel, thTenue]}>TU PLAN</EliteText>
          <EliteText style={[styles.tierName, { color: tierColor(effectiveTier, tokens) }]}>
            {isLoading ? '…' : TIER_LABELS[effectiveTier]}
          </EliteText>
          {inTrial && trialDaysLeft !== null && (
            <View style={[styles.trialBadge, !dark && { backgroundColor: ATP_BRAND.lime }]}>
              <EliteText style={[styles.trialText, !dark && { color: tokens.textoSobreLima }]}>
                Trial · {trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`}
              </EliteText>
            </View>
          )}
          {boost.active && boost.expiresAt && (
            <View style={styles.boostRow}>
              <Ionicons name="flash" size={14} color={dark ? ATP_BRAND.lime : tokens.tealTexto} />
              <EliteText style={[styles.boostText, !dark && { color: tokens.tealTexto }]}>
                Boost Pro activo · {formatBoostRemaining(boost.expiresAt)} restantes
              </EliteText>
            </View>
          )}
          {!hasPaidPlan && !boost.active && (
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/paywall'); }}
              style={styles.upgradeCta}
            >
              <EliteText style={styles.upgradeCtaText}>Ver planes</EliteText>
            </AnimatedPressable>
          )}
        </Animated.View>

        {/* ── Renovación y gestión (solo con plan de pago) ── */}
        {hasPaidPlan && (
          <Animated.View entering={FadeInUp.delay(90).springify()}>
            <EliteText style={[styles.sectionTitle, thTenue]}>GESTIÓN</EliteText>
            <View style={[styles.card, thCard]}>
              <View style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Próxima renovación</EliteText>
                <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                  {activeEntitlement?.willRenew === false
                    ? `Termina el ${formatDate(activeEntitlement?.expirationDate)}`
                    : `${formatDate(activeEntitlement?.expirationDate)}${renewalPrice ? ` · ${renewalPrice}` : ''}`}
                </EliteText>
              </View>
              <View style={[styles.divider, { backgroundColor: tokens.borde }]} />
              <AnimatedPressable onPress={onManagePayment} style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Método de pago</EliteText>
                <View style={styles.rowRight}>
                  <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                    Gestionar en {Platform.OS === 'ios' ? 'Apple' : 'Google'}
                  </EliteText>
                  <Ionicons name="open-outline" size={14} color={tokens.textoSecundario} />
                </View>
              </AnimatedPressable>
              <View style={[styles.divider, { backgroundColor: tokens.borde }]} />
              <AnimatedPressable onPress={onCancel} style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.error }]}>
                  Cancelar suscripción
                </EliteText>
                <Ionicons name="chevron-forward" size={16} color={tokens.error} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}

        {/* ── Canje de código (MB-13: puente de pago web / cortesías) ── */}
        <Animated.View entering={FadeInUp.delay(110).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.push('/redeem-code'); }}
            style={[styles.card, thCard]}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Tengo un código</EliteText>
                <EliteText style={[styles.eventDate, thTenue]}>
                  Si compraste en la web o te invitaron, aquí lo activas.
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.textoSecundario} />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Restaurar ── */}
        <Animated.View entering={FadeInUp.delay(130).springify()}>
          <AnimatedPressable onPress={onRestore} disabled={restoring} style={styles.restoreBtn}>
            <EliteText style={[styles.restoreText, { color: tokens.textoSecundario }]}>
              {restoring ? 'Restaurando…' : 'Restaurar compras'}
            </EliteText>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Historial ── */}
        <Animated.View entering={FadeInUp.delay(170).springify()}>
          <EliteText style={[styles.sectionTitle, thTenue]}>HISTORIAL DE PAGOS</EliteText>
          {events.length === 0 ? (
            <View style={[styles.card, thCard]}>
              <EliteText style={[styles.emptyText, thTenue]}>
                Sin movimientos todavía. Aquí verás tus compras y renovaciones.
              </EliteText>
            </View>
          ) : (
            <View style={[styles.card, thCard]}>
              {events.map((ev, i) => (
                <View key={ev.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: tokens.borde }]} />}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </EliteText>
                      <EliteText style={[styles.eventDate, thTenue]}>{formatDate(ev.processed_at)}</EliteText>
                    </View>
                    {ev.price_usd !== null && (
                      <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                        ${ev.price_usd.toFixed(2)} {ev.currency ?? 'USD'}
                      </EliteText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80, gap: Spacing.lg },
  tierCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  tierName: { fontFamily: Fonts.extraBold, fontSize: FontSizes.display },
  trialBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  trialText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  boostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  boostText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
  upgradeCta: {
    marginTop: Spacing.sm,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
  },
  upgradeCtaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: TEXT_COLORS.onAccent },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.md },
  rowValue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  eventDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ELEVATION[1].border },
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  restoreText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
});
