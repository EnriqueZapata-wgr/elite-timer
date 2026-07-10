/**
 * Meet ARGOS — primer contacto post-onboarding (T6 MAGIA ARGOS · T1 ONBOARDING épico).
 *
 * Secuencia cinemática de 5 pantallas (Propuesta A, guion en
 * src/constants/argos-meet-copy.ts — ⚠️ approval Mariana para cambios):
 * typing effect en las primeras 3, auto-avance ~6-8s o tap para adelantar,
 * avatar sube de intensidad (idle → speaking) y pasa a fondo en la 4ta.
 *
 * Al terminar, marca profiles.argos_introduced_at (migración 163) y libera
 * el floating button cross-app. Se muestra UNA vez, tras el onboarding v2
 * (o vía MeetArgosGate para usuarios existentes con flag NULL).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ArgosAvatar } from '@/src/components/argos/ArgosAvatar';
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';
import { markArgosIntroduced } from '@/src/services/argos-intro-service';
import { queueOnboardingCelebration } from '@/src/components/onboarding/onboarding-completion-core';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import {
  MEET_SCREENS,
  MEET_TYPING_MS_PER_CHAR,
  MEET_TRANSITION_MS,
  MEET_CTA_DELAY_MS,
  MEET_CTA_LABEL,
  MEET_TAP_HINT,
  resolveMeetText,
  meetScreenDwellMs,
} from '@/src/constants/argos-meet-copy';

/** Tamaño base del avatar; cada pantalla lo escala (progresión de presencia). */
const AVATAR_BASE = 150;

export default function MeetArgosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIntroduced } = useArgosPresence();
  const [index, setIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  const screen = MEET_SCREENS[index];
  const fullText = resolveMeetText(screen.text, firstName);
  const revealed = !screen.typing || typedChars >= fullText.length;
  const isLast = index === MEET_SCREENS.length - 1;

  // Avatar: transición suave de escala/opacidad entre pantallas.
  const avatarScale = useSharedValue(MEET_SCREENS[0].avatarScale);
  const avatarOpacity = useSharedValue(MEET_SCREENS[0].avatarOpacity);
  useEffect(() => {
    avatarScale.value = withTiming(screen.avatarScale, { duration: 450, easing: Easing.inOut(Easing.ease) });
    avatarOpacity.value = withTiming(screen.avatarOpacity, { duration: 450 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [{ scale: avatarScale.value }],
  }));

  // Typing effect (~40ms/char) en las pantallas marcadas.
  useEffect(() => {
    setTypedChars(0);
    if (!screen.typing) return;
    const iv = setInterval(() => {
      setTypedChars(prev => {
        if (prev >= fullText.length) {
          clearInterval(iv);
          return prev;
        }
        return prev + 1;
      });
    }, MEET_TYPING_MS_PER_CHAR);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Auto-avance: reveal + hold (la última pantalla espera el CTA).
  useEffect(() => {
    const dwell = meetScreenDwellMs(screen, firstName);
    if (dwell <= 0) return;
    const t = setTimeout(() => setIndex(i => Math.min(i + 1, MEET_SCREENS.length - 1)), dwell);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Última pantalla: pausa dramática antes del botón.
  useEffect(() => {
    if (!isLast) return;
    const t = setTimeout(() => setCtaVisible(true), MEET_CTA_DELAY_MS);
    return () => clearTimeout(t);
  }, [isLast]);

  /** Tap en pantalla: completa el typing, o adelanta a la siguiente. */
  function handleTap() {
    if (loading) return;
    if (!revealed) {
      setTypedChars(fullText.length);
      return;
    }
    if (!isLast) {
      haptic.light();
      setIndex(i => i + 1);
    }
  }

  async function begin() {
    if (loading) return;
    setLoading(true);
    haptic.success();
    // Marca la intro (best-effort) y libera el floating de inmediato.
    if (user?.id) {
      try { await markArgosIntroduced(user.id); } catch { /* fail-open */ }
    }
    setIntroduced(true);
    // T5: el overlay global la consume al aterrizar en HOY.
    queueOnboardingCelebration(firstName);
    router.replace('/(tabs)' as any);
  }

  const visibleText = screen.typing ? fullText.slice(0, typedChars) : fullText;

  return (
    <Pressable style={{ flex: 1 }} onPress={handleTap} accessibilityRole="button">
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.center}>
          <Animated.View entering={FadeIn.duration(600)} style={avatarStyle}>
            <ArgosAvatar state={screen.avatarState} size={AVATAR_BASE} variant="full" />
          </Animated.View>

          <Animated.View
            key={screen.key}
            entering={FadeInUp.duration(MEET_TRANSITION_MS)}
            exiting={FadeOut.duration(MEET_TRANSITION_MS * 0.6)}
            style={s.textWrap}
          >
            <EliteText style={screen.textVariant === 'hero' ? s.hero : s.body}>
              {visibleText}
            </EliteText>
          </Animated.View>
        </View>

        <View style={s.bottomBar}>
          {isLast && ctaVisible ? (
            <Animated.View entering={FadeInUp.duration(500)}>
              <AnimatedPressable style={s.cta} onPress={begin} disabled={loading}>
                <EliteText style={s.ctaText}>{loading ? 'Un momento…' : MEET_CTA_LABEL}</EliteText>
              </AnimatedPressable>
            </Animated.View>
          ) : index === 0 && revealed ? (
            <Animated.View entering={FadeIn.duration(600)}>
              <EliteText style={s.tapHint}>{MEET_TAP_HINT}</EliteText>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  textWrap: { minHeight: 120, justifyContent: 'flex-start', paddingHorizontal: Spacing.sm },
  hero: {
    fontSize: 30, fontFamily: Fonts.bold, color: '#fff',
    textAlign: 'center', lineHeight: 40,
  },
  body: {
    fontSize: FontSizes.lg, fontFamily: Fonts.regular, color: '#ddd',
    textAlign: 'center', lineHeight: 30,
  },
  bottomBar: { paddingBottom: 24, minHeight: 80, justifyContent: 'flex-end' },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  tapHint: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#444',
    textAlign: 'center', letterSpacing: 1, paddingBottom: 8,
  },
});
