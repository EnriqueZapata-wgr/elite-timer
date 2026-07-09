/**
 * AtpSplash — splash cinemático (Sprint ONBOARDING épico T2).
 *
 * Overlay absoluto que toma el relevo del splash NATIVO de Expo sin salto:
 * mismo asset (splash-icon.png, 280px) y mismo fondo negro. Por eso el logo
 * arranca con opacidad 1 (el fade-in de 0 provocaría un flash de negro) y la
 * fase de entrada se expresa como breath-in de escala.
 *
 * Secuencia y copy en src/constants/splash.ts (testeado). Reanimated 4.
 * Cambiar el asset del splash nativo requeriría build nativo (regla 10) —
 * este overlay logra la cinemática solo con JS/OTA.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Fonts } from '@/constants/theme';
import {
  SPLASH_LOGO_FADE_MS,
  SPLASH_TAGLINE_FADE_MS,
  SPLASH_DISSOLVE_MS,
  SPLASH_TAGLINE,
  splashTaglineStartMs,
  splashDissolveStartMs,
  splashTotalMs,
} from '@/src/constants/splash';

// Mismo ancho que el splash nativo (app.json → imageWidth: 280).
const LOGO_SIZE = Math.min(280, Math.round(Dimensions.get('window').width * 0.72));

interface Props {
  /** Se llama al terminar el dissolve — el padre desmonta el overlay. */
  onFinish: () => void;
}

export function AtpSplash({ onFinish }: Props) {
  const [done, setDone] = useState(false);
  const logoScale = useSharedValue(1);
  const taglineOpacity = useSharedValue(0);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    // Breath: inhala sutil durante la fase de logo, exhala hacia el reposo.
    logoScale.value = withSequence(
      withTiming(1.04, { duration: SPLASH_LOGO_FADE_MS, easing: Easing.out(Easing.ease) }),
      withTiming(1.0, { duration: splashTotalMs() - SPLASH_LOGO_FADE_MS, easing: Easing.inOut(Easing.ease) }),
    );
    taglineOpacity.value = withDelay(
      splashTaglineStartMs(),
      withTiming(1, { duration: SPLASH_TAGLINE_FADE_MS, easing: Easing.out(Easing.ease) }),
    );
    rootOpacity.value = withDelay(
      splashDissolveStartMs(),
      withTiming(0, { duration: SPLASH_DISSOLVE_MS, easing: Easing.inOut(Easing.ease) }),
    );
    const t = setTimeout(() => setDone(true), splashTotalMs());
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desmonta vía el padre DESPUÉS del dissolve (evita cortar la animación).
  useEffect(() => {
    if (done) onFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <Animated.View style={[styles.root, rootStyle]} pointerEvents="auto">
      <Animated.View style={logoStyle}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={taglineStyle}>
        <EliteText style={styles.tagline}>{SPLASH_TAGLINE}</EliteText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  tagline: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#888',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AtpSplash;
