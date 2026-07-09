/**
 * ArgosAvatar — símbolo animado de ARGOS con 3 estados (T1 Sprint MAGIA ARGOS).
 *
 *   idle     → respiración sutil + halo tenue estable
 *   thinking → pulsos rápidos + shimmer del halo
 *   speaking → onda de barras audio-like sobre el orbe
 *
 * Doctrina NO-FRANKENSTEIN (ver ProtonOrb): Reanimated 4, tokens de brand.ts,
 * sin dependencias nuevas. Símbolo geométrico compuesto con Views (anillo +
 * núcleo), no assets externos.
 */
import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { ATP_BRAND } from '@/src/constants/brand';
import {
  avatarSpecForState,
  barCountForVariant,
  barDelay,
  clampAvatarSize,
  type ArgosAvatarState,
  type ArgosAvatarVariant,
} from './argos-avatar-core';

interface Props {
  state?: ArgosAvatarState;
  size?: number;
  variant?: ArgosAvatarVariant;
  color?: string;
  style?: ViewStyle;
}

const MAX_BARS = 5;

export function ArgosAvatar({
  state = 'idle',
  size = 32,
  variant = 'compact',
  color = ATP_BRAND.lime,
  style,
}: Props) {
  const d = clampAvatarSize(size);
  const spec = avatarSpecForState(state);
  const barCount = Math.min(MAX_BARS, barCountForVariant(variant));

  const pulse = useSharedValue(1);
  const glow = useSharedValue(spec.glowMin);

  // Hooks incondicionales: siempre creamos MAX_BARS shared values y renderizamos
  // solo `barCount` de ellos.
  const b0 = useSharedValue(0.4);
  const b1 = useSharedValue(0.4);
  const b2 = useSharedValue(0.4);
  const b3 = useSharedValue(0.4);
  const b4 = useSharedValue(0.4);
  const bars = [b0, b1, b2, b3, b4];

  // Respiro + halo: reinician al cambiar de estado.
  useEffect(() => {
    cancelAnimation(pulse);
    cancelAnimation(glow);
    pulse.value = 1;
    pulse.value = withRepeat(
      withSequence(
        withTiming(spec.scaleTo, { duration: spec.scaleDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: spec.scaleDuration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    glow.value = spec.glowMin;
    glow.value = withRepeat(
      withSequence(
        withTiming(spec.glowMax, { duration: spec.glowDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(spec.glowMin, { duration: spec.glowDuration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(glow);
    };
    // spec deriva de state; state es la única dependencia real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Onda de barras: solo activa en 'speaking'. En otros estados, colapsa a reposo.
  useEffect(() => {
    bars.forEach((bar, i) => {
      cancelAnimation(bar);
      if (spec.bars && i < barCount) {
        bar.value = 0.4;
        bar.value = withDelay(
          barDelay(i),
          withRepeat(
            withSequence(
              withTiming(1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.4, { duration: 320, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            true,
          ),
        );
      } else {
        bar.value = withTiming(0.4, { duration: 200 });
      }
    });
    return () => bars.forEach((bar) => cancelAnimation(bar));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, variant]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const barStyles = [
    useAnimatedStyle(() => ({ transform: [{ scaleY: b0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b2.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b3.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b4.value }] })),
  ];

  const coreSize = d * 0.78;
  const ringSize = d * 0.5;
  const barWidth = Math.max(2, d * 0.06);
  const barHeight = d * 0.42;

  return (
    <View
      style={[{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="ARGOS"
    >
      {/* Halo */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: d / 2, backgroundColor: color }, haloStyle]}
      />
      {/* Núcleo */}
      <Animated.View
        style={[
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: `${color}22`,
            borderWidth: Math.max(1, d * 0.045),
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          coreStyle,
        ]}
      >
        {spec.bars ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: barHeight }}>
            {Array.from({ length: barCount }).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  {
                    width: barWidth,
                    height: barHeight,
                    marginHorizontal: barWidth * 0.4,
                    borderRadius: barWidth / 2,
                    backgroundColor: color,
                  },
                  barStyles[i],
                ]}
              />
            ))}
          </View>
        ) : (
          // Marca geométrica: anillo + núcleo (abstracción del "ojo" ARGOS).
          <View
            style={{
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: Math.max(1, d * 0.05),
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: ringSize * 0.4,
                height: ringSize * 0.4,
                borderRadius: ringSize * 0.2,
                backgroundColor: color,
              }}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default ArgosAvatar;
