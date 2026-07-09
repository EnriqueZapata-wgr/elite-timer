/**
 * ArgosAvatar — símbolo de ARGOS con 5 estados DRAMÁTICOS (T1 MAGIA ARGOS 2.0).
 *
 *   offline     → bullseye estático gris (sin vida, sin animación)
 *   idle        → círculos concéntricos lima respirando desfasados (alive)
 *   thinking    → olas azules en movimiento (senoidal fluyendo)
 *   speaking    → estrella lima brillante pulsante + rayos expandiéndose
 *   unavailable → tache X rojo tenue (aparece con leve rotación)
 *
 * Cambio de FORMA + COLOR por estado — distinguible a golpe de vista
 * (feedback Enrique: la v1 era "demasiado sutil, casi igual").
 *
 * Doctrina NO-FRANKENSTEIN: SVG (react-native-svg, ya en el proyecto) +
 * Reanimated 4. Sin Lottie, sin GIFs, sin dependencias nuevas. Transición
 * entre estados: crossfade ~280ms (FadeIn/FadeOut sobre el shape keyed).
 */
import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Line as SvgLine } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  avatarSpecForState,
  barCountForVariant,
  barDelay,
  clampAvatarSize,
  crossLines,
  rayLines,
  ringRadii,
  starPath,
  STATE_TRANSITION_MS,
  type ArgosAvatarState,
  type ArgosAvatarVariant,
} from './argos-avatar-core';

interface Props {
  state?: ArgosAvatarState;
  /** Default 40 (subido del 32 de v1 — más presencia). */
  size?: number;
  variant?: ArgosAvatarVariant;
  style?: ViewStyle;
}

const MAX_BARS = 7;
const RING_COUNT = 3;
const RAY_COUNT = 8;

export function ArgosAvatar({
  state = 'idle',
  size = 40,
  variant = 'compact',
  style,
}: Props) {
  const d = clampAvatarSize(size);
  const spec = avatarSpecForState(state);
  const barCount = Math.min(MAX_BARS, barCountForVariant(variant));

  // Hooks incondicionales: presupuesto fijo de shared values para TODOS los
  // estados; cada estado activa solo los suyos.
  const glow = useSharedValue(spec.glowMin);
  const pulse = useSharedValue(1);      // escala del shape central
  const spin = useSharedValue(0);       // grados — entrada del tache
  const rays = useSharedValue(0);       // 0..1 — expansión de rayos (speaking)
  const r0 = useSharedValue(1);
  const r1 = useSharedValue(1);
  const r2 = useSharedValue(1);
  const rings = [r0, r1, r2];
  const b0 = useSharedValue(0.3);
  const b1 = useSharedValue(0.3);
  const b2 = useSharedValue(0.3);
  const b3 = useSharedValue(0.3);
  const b4 = useSharedValue(0.3);
  const b5 = useSharedValue(0.3);
  const b6 = useSharedValue(0.3);
  const bars = [b0, b1, b2, b3, b4, b5, b6];

  useEffect(() => {
    const all = [glow, pulse, spin, rays, ...rings, ...bars];
    all.forEach(cancelAnimation);

    // Reset a reposo
    pulse.value = 1;
    spin.value = 0;
    rays.value = 0;

    // Halo: respira entre glowMin y glowMax (estático si min === max)
    glow.value = withTiming(spec.glowMin, { duration: 200 });
    if (spec.animated && spec.glowMax > spec.glowMin) {
      glow.value = withRepeat(
        withSequence(
          withTiming(spec.glowMax, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
          withTiming(spec.glowMin, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }

    switch (spec.shape) {
      case 'rings':
        // Respiración desfasada por anillo — el "alive" del idle.
        rings.forEach((ring, i) => {
          ring.value = 1;
          ring.value = withDelay(
            i * 300,
            withRepeat(
              withSequence(
                withTiming(1.1, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
              ),
              -1,
              false,
            ),
          );
        });
        break;
      case 'waves':
        // Ola senoidal: cada barra sube/baja con delay escalonado → fluye.
        bars.forEach((bar, i) => {
          bar.value = 0.3;
          if (i < barCount) {
            bar.value = withDelay(
              barDelay(i),
              withRepeat(
                withSequence(
                  withTiming(1, { duration: spec.cycleMs, easing: Easing.inOut(Easing.sin) }),
                  withTiming(0.3, { duration: spec.cycleMs, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                false,
              ),
            );
          }
        });
        break;
      case 'star':
        // Estrella pulsante + rayos que respiran hacia afuera (breath outward).
        pulse.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        rays.value = withRepeat(
          withTiming(1, { duration: spec.cycleMs * 2.2, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        );
        break;
      case 'cross':
        // Aparece con leve rotación (spec Enrique) y queda con pulso mínimo.
        spin.value = -14;
        spin.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.back(1.6)) });
        pulse.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: spec.cycleMs, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        break;
      case 'bullseye':
      default:
        // offline: nada se mueve.
        break;
    }

    return () => { all.forEach(cancelAnimation); };
    // spec/barCount derivan de state/variant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, variant]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { rotate: `${spin.value}deg` }],
  }));
  // Rayos: emanan (escala 0.8→1.25) mientras se desvanecen (0.9→0).
  const raysStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - rays.value),
    transform: [{ scale: 0.8 + 0.45 * rays.value }],
  }));
  const ringStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: r0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: r1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: r2.value }] })),
  ];
  const barStyles = [
    useAnimatedStyle(() => ({ transform: [{ scaleY: b0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b2.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b3.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b4.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b5.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scaleY: b6.value }] })),
  ];

  // ─── Geometría ───
  const c = d / 2;
  const stroke = Math.max(1.5, d * 0.05);
  const radii = ringRadii(d * 0.42 - stroke / 2, RING_COUNT);
  const barWidth = Math.max(2, d * 0.08);
  const barGap = Math.max(2, d * 0.045);
  const barHeight = d * 0.52;
  const starOuter = d * 0.3;
  const starInner = starOuter * 0.45;
  const star = starPath(c, c, starOuter, starInner);
  const raySegs = rayLines(c, c, d * 0.37, d * 0.47, RAY_COUNT);
  const [cross1, cross2] = crossLines(c, c, d * 0.26);
  const crossStroke = Math.max(2.5, d * 0.09);

  function renderShape() {
    switch (spec.shape) {
      case 'bullseye':
        return (
          <Svg width={d} height={d}>
            {radii.map((r, i) => (
              <Circle key={i} cx={c} cy={c} r={r} stroke={spec.color} strokeWidth={stroke} fill="none" opacity={0.9 - i * 0.15} />
            ))}
            <Circle cx={c} cy={c} r={Math.max(1.5, d * 0.045)} fill={spec.color} />
          </Svg>
        );
      case 'rings':
        return (
          <View style={{ width: d, height: d }}>
            {radii.map((r, i) => (
              <Animated.View key={i} style={[StyleSheet.absoluteFill, ringStyles[i]]}>
                <Svg width={d} height={d}>
                  <Circle cx={c} cy={c} r={r} stroke={spec.color} strokeWidth={stroke} fill="none" opacity={1 - i * 0.22} />
                </Svg>
              </Animated.View>
            ))}
            <View style={[StyleSheet.absoluteFill, s.center]}>
              <View style={{ width: d * 0.1, height: d * 0.1, borderRadius: d * 0.05, backgroundColor: spec.color }} />
            </View>
          </View>
        );
      case 'waves':
        return (
          <View style={[s.center, { width: d, height: d, flexDirection: 'row', gap: barGap }]}>
            {Array.from({ length: barCount }).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  { width: barWidth, height: barHeight, borderRadius: barWidth / 2, backgroundColor: spec.color },
                  barStyles[i],
                ]}
              />
            ))}
          </View>
        );
      case 'star':
        return (
          <View style={{ width: d, height: d }}>
            <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
              <Svg width={d} height={d}>
                {raySegs.map((l, i) => (
                  <SvgLine key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={spec.color} strokeWidth={Math.max(1.5, d * 0.035)} strokeLinecap="round" />
                ))}
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, coreStyle]}>
              <Svg width={d} height={d}>
                <Path d={star} fill={spec.color} />
              </Svg>
            </Animated.View>
          </View>
        );
      case 'cross':
        return (
          <Animated.View style={[{ width: d, height: d }, coreStyle]}>
            <Svg width={d} height={d}>
              <SvgLine x1={cross1.x1} y1={cross1.y1} x2={cross1.x2} y2={cross1.y2} stroke={spec.color} strokeWidth={crossStroke} strokeLinecap="round" />
              <SvgLine x1={cross2.x1} y1={cross2.y1} x2={cross2.x2} y2={cross2.y2} stroke={spec.color} strokeWidth={crossStroke} strokeLinecap="round" />
            </Svg>
          </Animated.View>
        );
      default:
        return null;
    }
  }

  return (
    <View
      style={[{ width: d, height: d }, s.center, style]}
      accessibilityRole="image"
      accessibilityLabel={`ARGOS (${state})`}
    >
      {/* Halo de color por estado */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: d / 2, backgroundColor: spec.glowColor }, haloStyle]}
      />
      {/* Shape keyed por estado → crossfade en cada transición */}
      <Animated.View
        key={state}
        entering={FadeIn.duration(STATE_TRANSITION_MS)}
        exiting={FadeOut.duration(STATE_TRANSITION_MS * 0.7)}
      >
        {renderShape()}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

export default ArgosAvatar;
