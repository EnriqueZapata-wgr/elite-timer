/**
 * /onboarding/notifications (AGENDA-COMPLETE F2) — pedir permiso de push al cierre del
 * onboarding, entre voice-config y summary. Sin recordatorios la agenda es solo una
 * pantalla que hay que abrir; con push se vuelve asistente. "Ahora no" → skip sin
 * fricción (hay fallback inline en /agenda al configurar un recordatorio).
 */
import { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { registerForPushNotificationsAsync } from '@/src/services/push-notification-service';
import { completeStep } from '@/src/services/onboarding-service';
import { ATP_BRAND } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// Imagen editorial B/N (reuso: misma familia visual que las cards del HOY).
const heroImage = require('@/assets/images/hoy-extra/screen-cutoff.png');

export default function NotificationsOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const continueToSummary = async () => {
    try {
      if (user?.id) await completeStep(user.id, 'notifications');
    } catch { /* el paso no bloquea: summary cierra el onboarding igual */ }
    router.replace('/onboarding/summary' as any);
  };

  const handleActivate = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    haptic.medium();
    try {
      // prompt:true → dispara el permiso del OS y registra el token en user_notification_tokens.
      const token = await registerForPushNotificationsAsync(user.id, { prompt: true });
      if (token) haptic.success();
    } catch { /* rechazo o error del OS: seguimos — hay fallback inline en /agenda */ }
    await continueToSummary();
  };

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    haptic.light();
    await continueToSummary();
  };

  return (
    <OnboardingShell step={9}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrap}>
          <Image source={heroImage} style={styles.image} resizeMode="cover" />
          <View style={styles.imageOverlay} />
          <View style={styles.bellBadge}>
            <Ionicons name="notifications" size={26} color="#000" />
          </View>
        </View>

        <EliteText style={styles.title}>Activa recordatorios</EliteText>
        <EliteText style={styles.copy}>
          ARGOS te avisará cuando toque cada acción de tu protocolo. Sin recordatorios,
          la app funciona pero pierde el 60% de su poder.
        </EliteText>

        <View style={styles.actions}>
          <AnimatedPressable style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleActivate} disabled={busy}>
            <EliteText style={styles.primaryText}>Activar recordatorios</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={[styles.secondaryBtn, busy && styles.btnDisabled]} onPress={handleSkip} disabled={busy}>
            <EliteText style={styles.secondaryText}>Ahora no</EliteText>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  imageWrap: {
    height: 220, borderRadius: Radius.card, overflow: 'hidden', marginBottom: Spacing.xl,
    backgroundColor: '#121212', alignItems: 'center', justifyContent: 'flex-end',
  },
  image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined, opacity: 0.85 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  bellBadge: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  title: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 0.5, marginBottom: Spacing.sm },
  copy: { color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 24 },
  actions: { marginTop: 'auto', paddingTop: Spacing.xl, gap: Spacing.sm },
  primaryBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime },
  primaryText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.md },
  secondaryBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  secondaryText: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  btnDisabled: { opacity: 0.5 },
});
