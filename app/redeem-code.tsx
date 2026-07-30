/**
 * TENGO UN CÓDIGO — canje de códigos de activación (MB-13 · PIEZA 1).
 *
 * Para el founder que pagó en la web, el invitado o la cortesía de soporte.
 * El servidor decide todo (RPC redeem_activation_code); aquí solo se
 * teclea el código y se muestra el resultado con copy propio por caso.
 */
import { useState } from 'react';
import { DeviceEventEmitter, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useSubscription, SUBSCRIPTION_CHANGED_EVENT } from '@/src/hooks/useSubscription';
import {
  redeemActivationCode,
  type RedeemCodeResult,
} from '@/src/services/subscription/subscription-service';
import type { Tier } from '@/src/services/subscription/tier-logic';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, SEMANTIC, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const TIER_LABELS: Record<Tier, string> = {
  free: 'ATP Free',
  base: 'ATP Base',
  pro: 'ATP Pro',
  clinician: 'ATP Clínico',
};

/** Copy por resultado del RPC. Cada caso dice algo distinto a propósito. */
const ERROR_COPY: Record<string, string> = {
  not_found: 'No encontramos ese código. Revisa que esté escrito igual que en tu correo o mensaje.',
  expired: 'Este código ya venció. Pide uno nuevo a quien te lo envió.',
  exhausted: 'Este código ya alcanzó su límite de usos.',
  already_redeemed: 'Ya habías canjeado este código en esta cuenta. No necesitas activarlo otra vez.',
  not_authenticated: 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.',
  network_error: 'No pudimos validar el código. Revisa tu conexión e intenta de nuevo.',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function RedeemCodeScreen() {
  const { refresh } = useSubscription();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeemCodeResult | null>(null);

  const canSubmit = code.trim().length >= 4 && !busy;

  async function onRedeem() {
    if (!canSubmit) return;
    haptic.medium();
    setBusy(true);
    setResult(null);
    const res = await redeemActivationCode(code);
    setBusy(false);
    setResult(res);
    if (res.status === 'ok') {
      // Éxito confirmado por el servidor: solo entonces celebra.
      haptic.success();
      // Refresca tier en memoria en toda la app, sin reiniciar.
      DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
      DeviceEventEmitter.emit('day_changed');
      refresh();
    } else {
      haptic.error();
    }
  }

  const success = result?.status === 'ok';
  const errorCopy = result && !success ? ERROR_COPY[result.status] ?? ERROR_COPY.network_error : null;

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Tengo un código" onBack={() => router.back()} />
      <View style={styles.content}>

        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <EliteText style={styles.subtitle}>
            Si compraste en la web o te invitaron, aquí lo activas.
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.card}>
          <EliteText style={styles.inputLabel}>TU CÓDIGO</EliteText>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => { setCode(t.toUpperCase()); if (result) setResult(null); }}
            placeholder="ATP-XXXX-XXXX"
            placeholderTextColor={TEXT.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            editable={!busy && !success}
            returnKeyType="done"
            onSubmitEditing={onRedeem}
          />

          {!success && (
            <AnimatedPressable
              onPress={onRedeem}
              disabled={!canSubmit}
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
            >
              <EliteText style={styles.ctaText}>
                {busy ? 'Activando…' : 'Activar código'}
              </EliteText>
            </AnimatedPressable>
          )}
        </Animated.View>

        {errorCopy && (
          <Animated.View entering={FadeInUp.springify()} style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} style={{ marginTop: 1 }} />
            <EliteText style={styles.errorText}>{errorCopy}</EliteText>
          </Animated.View>
        )}

        {success && result && (
          <Animated.View entering={FadeInUp.springify()} style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={28} color={ATP_BRAND.lime} />
            <EliteText style={styles.successTitle}>
              Listo. Tu plan {result.tier ? TIER_LABELS[result.tier] : 'nuevo'} ya está activo.
            </EliteText>
            <EliteText style={styles.successDetail}>
              {result.expiresAt
                ? `Vigente hasta el ${formatDate(result.expiresAt)}.`
                : 'Sin fecha de vencimiento.'}
            </EliteText>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.back(); }}
              style={[styles.cta, styles.ctaStretch]}
            >
              <EliteText style={styles.ctaText}>Continuar</EliteText>
            </AnimatedPressable>
          </Animated.View>
        )}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: TEXT.tertiary,
    letterSpacing: 2,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    letterSpacing: 2,
    color: TEXT.primary,
  },
  cta: {
    marginTop: Spacing.xs,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaStretch: { alignSelf: 'stretch', marginTop: Spacing.sm },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000', letterSpacing: 0.5 },
  errorCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: withOpacity(SEMANTIC.error, 0.08),
    borderColor: withOpacity(SEMANTIC.error, 0.3),
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.primary,
    lineHeight: 19,
  },
  successCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  successTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: TEXT.primary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  successDetail: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    textAlign: 'center',
  },
});
