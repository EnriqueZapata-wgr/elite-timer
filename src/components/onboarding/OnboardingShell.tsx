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
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, Spacing } from '@/constants/theme';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {onBack ? (
            <AnimatedPressable
              onPress={() => { haptic.light(); onBack(); }}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#888" />
            </AnimatedPressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <EliteText style={styles.stepText}>PASO {step} DE {totalSteps}</EliteText>
          {onSkip ? (
            <AnimatedPressable onPress={() => { haptic.light(); onSkip(); }} hitSlop={12}>
              <EliteText style={styles.skipText}>{ONBOARDING_COPY.common.skip}</EliteText>
            </AnimatedPressable>
          ) : null}
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, fillStyle]} />
        </View>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
    color: '#a8e02a',
    letterSpacing: 2,
  },
  skipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#666',
    letterSpacing: 1,
    paddingVertical: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#a8e02a',
  },
});
