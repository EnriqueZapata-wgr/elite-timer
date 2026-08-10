/**
 * TypingIndicator — "ARGOS está pensando..." (F2.3 #93, extraído en MB-21 P4).
 * Tres puntos con pulso escalonado (efecto de ola).
 */
import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.25);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 320 }),
        withTiming(0.25, { duration: 320 }),
      ),
      -1,
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[st.dot, style]} />;
}

export function TypingIndicator() {
  // MB-31B remate: componente compartido — lee el scope, no el tema global
  // (regla de tránsito: fuera de <ThemeReady> sigue oscuro).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.bubble}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TypingDot delay={0} />
        <TypingDot delay={160} />
        <TypingDot delay={320} />
      </View>
      <Text style={s.label}>ARGOS está pensando...</Text>
    </View>
  );
}

// El punto es lima como RELLENO (identidad ARGOS): estático en los dos modos.
const st = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ATP_BRAND.lime },
});

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  bubble: {
    // Misma superficie que la burbuja de ARGOS (MessageBubble.bubbleArgos).
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.card, borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 14, alignSelf: 'flex-start', maxWidth: '70%',
    borderWidth: 1, borderColor: t.borde,
  },
  label: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.regular },
});
