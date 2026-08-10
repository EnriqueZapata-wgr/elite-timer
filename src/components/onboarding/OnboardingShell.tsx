/**
 * OnboardingShell — Wrapper compartido para todas las pantallas de onboarding.
 *
 * Sprint ONBOARDING épico T3: progress line continua que SE LLENA con
 * animación (Reanimated 4) al entrar a cada paso — arranca en la fracción
 * del paso anterior para que el avance se vea, no se adivine. Back button
 * opcional + skip opcional con label discreto.
 */
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, Spacing } from '@/constants/theme';
import { ATP_BRAND, PILL } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { ONBOARDING_COPY } from '@/src/constants/onboarding-copy';

interface Props {
  step: number;
  totalSteps?: number;
  /** Si se provee, muestra un botón "atrás" en el header. */
  onBack?: () => void;
  /** Si se provee, muestra "Saltar" a la derecha (la pantalla pone el confirm). */
  onSkip?: () => void;
  children: React.ReactNode;
}

/** Duración del llenado de la línea al entrar a un paso. */
const PROGRESS_FILL_MS = 550;

export function OnboardingShell({ step, totalSteps = 9, onBack, onSkip, children }: Props) {
  // MB-31B: el shell ES el marco de todo el onboarding — abre el scope
  // (ThemeReady) una sola vez y pinta fondo/barra por tema. Un usuario nuevo
  // sin preferencia ve el oscuro de siempre; quien vuelve en claro (p.ej.
  // reconfigurar voz) ya no queda a fuerza en negro.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  // La línea arranca donde quedó el paso anterior y se llena hasta el actual.
  const progress = useSharedValue(Math.max(0, (step - 1) / totalSteps));

  useEffect(() => {
    progress.value = withTiming(step / totalSteps, {
      duration: PROGRESS_FILL_MS,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, totalSteps]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <ThemeReady>
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View style={styles.topRow}>
          {onBack ? (
            <AnimatedPressable
              onPress={() => { haptic.light(); onBack(); }}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={tokens.textoSecundario} />
            </AnimatedPressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          {/* El lima como texto solo en oscuro (regla 1 del manual 3.6). */}
          <EliteText style={[styles.stepText, { color: dark ? ATP_BRAND.lime : tokens.tealTexto }]}>
            PASO {step} DE {totalSteps}
          </EliteText>
          {onSkip ? (
            <AnimatedPressable onPress={() => { haptic.light(); onSkip(); }} hitSlop={12}>
              <EliteText style={[styles.skipText, { color: dark ? PILL.textColor : tokens.textoSecundario }]}>
                {ONBOARDING_COPY.common.skip}
              </EliteText>
            </AnimatedPressable>
          ) : null}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: dark ? PILL.borderColor : tokens.hundido }]}>
          <Animated.View style={[styles.progressFill, fillStyle]} />
        </View>
      </View>
      {children}
    </SafeAreaView>
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingTop: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    width: 28,
    height: 28,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    letterSpacing: 2,
  },
  skipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1,
    paddingVertical: 4,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ATP_BRAND.lime,
  },
});
