/**
 * TypingIndicator — "ARGOS está pensando..." (F2.3 #93, extraído en MB-21 P4).
 * Tres puntos con pulso escalonado (efecto de ola).
 */
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { ATP_BRAND, BG, BORDER, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

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
  return <Animated.View style={[s.dot, style]} />;
}

export function TypingIndicator() {
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

const s = StyleSheet.create({
  bubble: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BG.input, borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 14, alignSelf: 'flex-start', maxWidth: '70%',
    borderWidth: 1, borderColor: BORDER.card,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ATP_BRAND.lime },
  label: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular },
});
