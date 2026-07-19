/**
 * ArgosOrb (MB-4 J2) — esfera translúcida lime→teal que respira. Presencia de
 * ARGOS estilo Siri/Dynamic Island: materia de energía, no mascota.
 *
 * 4 estados (spec): idle (respira ~4s) · escuchando (se abre) · pensando (rota
 * el núcleo) · hablando (waveform reactiva). Motion en argos-orb-core (puro,
 * testeado). reduced-motion → pulso mínimo por opacidad, no se apaga.
 *
 * SVG (react-native-svg) + Reanimated 4 — cero dep nueva, doctrina no-Frankenstein.
 * Colores desde tokens brand.ts (lime/teal). Sobre fondo oscuro (dark-only V2.0).
 *
 * NOTA 60fps: escala/rotación/opacidad corren en el UI thread (Reanimated shared
 * values). La waveform de 'hablando' se muestrea con una fase animada. Si en
 * device gama media no llega a 60fps, simplificar (menos barras) antes que jankear.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, AccessibilityInfo, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import {
  orbSpecForState, waveformBars, ORB_LIME, ORB_TEAL,
  type ArgosOrbState,
} from './argos-orb-core';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  state?: ArgosOrbState;
  size?: number;
  style?: ViewStyle;
  /** Fuerza reduced-motion (para tests/preview); si se omite se lee del sistema. */
  reducedMotion?: boolean;
}

const WAVE_BARS = 5;

export function ArgosOrb({ state = 'idle', size = 160, style, reducedMotion }: Props) {
  // Accesibilidad: respetar reduce-motion del sistema si no se fuerza por prop.
  const [sysReduced, setSysReduced] = useState(false);
  useEffect(() => {
    if (reducedMotion !== undefined) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setSysReduced(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setSysReduced(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, [reducedMotion]);
  const reduced = reducedMotion ?? sysReduced;

  const spec = orbSpecForState(state, reduced);

  // Fase de respiración 0→1 en loop (ida y vuelta con easing).
  const breath = useSharedValue(0);
  // Fase de rotación 0→1.
  const spin = useSharedValue(0);
  // Fase de la waveform 0→1.
  const wave = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(spin);
    cancelAnimation(wave);
    if (!spec.animated) {
      breath.value = 0.5; spin.value = 0; wave.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: spec.breathMs / 2, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    if (spec.rotate) {
      spin.value = withRepeat(withTiming(1, { duration: spec.rotateMs, easing: Easing.linear }), -1, false);
    }
    if (spec.waveform) {
      wave.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduced]);

  // Escala de la esfera (respiración).
  const sphereStyle = useAnimatedStyle(() => {
    const t = spec.scaleMin + (spec.scaleMax - spec.scaleMin) * breath.value;
    return { transform: [{ scale: t }] };
  });

  // Halo/glow (opacidad respirando).
  const glowStyle = useAnimatedStyle(() => {
    const o = spec.glowMin + (spec.glowMax - spec.glowMin) * breath.value;
    return { opacity: o };
  });

  // Rotación del núcleo (pensando).
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const r = size / 2;
  const gid = 'argosOrbGrad';

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Halo */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="argosOrbGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ORB_LIME} stopOpacity={0.5} />
              <Stop offset="60%" stopColor={ORB_TEAL} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={ORB_TEAL} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill="url(#argosOrbGlow)" />
        </Svg>
      </Animated.View>

      {/* Esfera translúcida (respira) */}
      <Animated.View style={sphereStyle}>
        <Animated.View style={coreStyle}>
          <Svg width={size * 0.72} height={size * 0.72}>
            <Defs>
              <RadialGradient id={gid} cx="38%" cy="34%" r="70%">
                <Stop offset="0%" stopColor="#EAFFC0" stopOpacity={0.95} />
                <Stop offset="45%" stopColor={ORB_LIME} stopOpacity={0.7} />
                <Stop offset="100%" stopColor={ORB_TEAL} stopOpacity={0.55} />
              </RadialGradient>
            </Defs>
            <Circle cx={size * 0.36} cy={size * 0.36} r={size * 0.35} fill={`url(#${gid})`} />
            {/* Brillo especular (glass) */}
            <Circle cx={size * 0.27} cy={size * 0.25} r={size * 0.07} fill="#ffffff" opacity={0.35} />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Waveform (solo hablando) */}
      {spec.waveform && (
        <View style={styles.waveRow} pointerEvents="none">
          {Array.from({ length: WAVE_BARS }).map((_, i) => (
            <WaveBar key={i} index={i} size={size} wave={wave} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Una barra de la waveform; su altura sigue waveformBars(fase). */
function WaveBar({ index, size, wave }: { index: number; size: number; wave: SharedValue<number> }) {
  const barW = size * 0.045;
  const maxH = size * 0.34;
  const h = useDerivedValue(() => {
    const bars = waveformBars(WAVE_BARS, wave.value);
    return Math.max(barW, bars[index] * maxH);
  });
  const animatedProps = useAnimatedProps(() => ({
    height: h.value,
    y: (maxH - h.value) / 2,
  }));
  return (
    <Svg width={barW} height={maxH} style={{ marginHorizontal: barW * 0.4 }}>
      <AnimatedRect x={0} width={barW} rx={barW / 2} fill={ORB_LIME} animatedProps={animatedProps} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  waveRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
