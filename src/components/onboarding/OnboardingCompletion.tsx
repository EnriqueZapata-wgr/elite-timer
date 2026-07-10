/**
 * OnboardingCompletion — celebración al aterrizar en HOY (Sprint ONBOARDING épico T5).
 *
 * Overlay global (montado en app/_layout.tsx) que observa el pathname: cuando
 * el usuario llega a HOY ('/') con una celebración encolada por Meet ARGOS,
 * muestra "Bienvenido, {nombre}. Aquí empieza." + partículas suaves lima y
 * se desvanece en ~2s. pointerEvents="none": nunca bloquea la interacción.
 *
 * Editorial B/N + lima — partículas sutiles, NO confetti cumpleañero.
 * Timing/specs/copy en onboarding-completion-core.ts (puro, testeado).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Fonts } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import {
  celebrationTitle,
  celebrationTotalMs,
  celebrationParticles,
  consumeOnboardingCelebration,
  CELEBRATION_FADE_IN_MS,
  CELEBRATION_FADE_OUT_MS,
  CELEBRATION_SUBTITLE,
  type CelebrationParticle,
} from './onboarding-completion-core';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLES = celebrationParticles();

export function OnboardingCompletion() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  // Consume la cola solo al llegar a HOY (raíz de tabs).
  useEffect(() => {
    if (pathname !== '/') return;
    const queued = consumeOnboardingCelebration();
    if (queued !== null) setName(queued);
  }, [pathname]);

  if (name === null) return null;
  return <CelebrationOverlay name={name} onDone={() => setName(null)} />;
}

function CelebrationOverlay({ name, onDone }: { name: string; onDone: () => void }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: CELEBRATION_FADE_IN_MS, easing: Easing.out(Easing.ease) }),
      withDelay(
        celebrationTotalMs() - CELEBRATION_FADE_IN_MS - CELEBRATION_FADE_OUT_MS,
        withTiming(0, { duration: CELEBRATION_FADE_OUT_MS, easing: Easing.inOut(Easing.ease) }),
      ),
    );
    const t = setTimeout(onDone, celebrationTotalMs());
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.root, rootStyle]} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Particle key={i} spec={p} />
      ))}
      <View style={styles.textBlock}>
        <EliteText style={styles.title}>{celebrationTitle(name)}</EliteText>
        <EliteText style={styles.subtitle}>{CELEBRATION_SUBTITLE}</EliteText>
      </View>
    </Animated.View>
  );
}

function Particle({ spec }: { spec: CelebrationParticle }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      spec.delayMs,
      withTiming(1, { duration: spec.riseMs, easing: Easing.out(Easing.quad) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    // Sube desde el tercio inferior y se desvanece al final del ascenso.
    opacity: spec.peakOpacity * (1 - t.value * t.value),
    transform: [
      { translateY: -t.value * SCREEN_H * 0.38 },
      { translateX: t.value * spec.drift },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: spec.x * SCREEN_W,
          top: SCREEN_H * 0.72,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    elevation: 9000,
  },
  textBlock: { alignItems: 'center', paddingHorizontal: 32 },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: ATP_BRAND.lime,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  particle: {
    position: 'absolute',
    backgroundColor: ATP_BRAND.lime,
  },
});

export default OnboardingCompletion;
