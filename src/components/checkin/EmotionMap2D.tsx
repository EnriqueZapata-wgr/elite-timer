/**
 * EmotionMap2D — plano continuo deslizable con las 144 emociones (MB-4 · Bloque 1).
 *
 * - Pan libre en vertical y horizontal + pinch zoom. Los círculos se salen de
 *   los bordes del viewport: sensación de plano infinito, no de grilla.
 * - El color de cada emoción ES su posición (interpolación continua de la
 *   paleta ATP en emotion-map-core, cero hex crudo).
 * - Selección = la forma SE TRANSFORMA: el círculo colapsa a núcleo y le nace
 *   un orbital con su electrón girando — lenguaje molecular propio de ATP
 *   (energía celular), no el de la referencia.
 * - Vista alejada (zoom-out): labels se ocultan y aparecen los 4 cuadrantes
 *   como zonas tocables para saltar.
 * - La cámara es controlable desde fuera (ref) — la navegación emocional del
 *   Bloque 2 la usa para desplazarse por el plano con el usuario mirando.
 */
import {
  forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  Easing, runOnJS, ZoomIn, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { EMOTIONS, QUADRANTS, type Emotion, type QuadrantKey } from '@/src/data/emotions-library';
import {
  computeEmotionMapLayout, emotionGradient, colorAtPoint, isLightColor,
  QUADRANT_CENTERS, toWorld, WORLD_W, WORLD_H, NODE_SIZE,
  type EmotionMapLayout,
} from '@/src/services/emotion-map-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes } from '@/constants/theme';
import { TEXT, TEXT_COLORS, withOpacity } from '@/src/constants/brand';

// Layout determinista: se computa UNA vez por proceso (mismo seed = mismo mapa).
let cachedLayout: EmotionMapLayout | null = null;
export function getEmotionMapLayout(): EmotionMapLayout {
  if (!cachedLayout) cachedLayout = computeEmotionMapLayout(EMOTIONS);
  return cachedLayout;
}

const EMOTION_BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

// ═══ Cámara ═══
export const ZOOM_LANDING = 0.8;   // aterrizaje: se ve la zona, no el océano
export const ZOOM_MAX = 1.35;
const OVERVIEW_LABEL_CUTOFF = 0.42; // debajo de esto los labels no aportan
const OVERSCROLL = 90;              // margen elástico al arrastrar más allá del mundo

export interface EmotionMapHandle {
  /** Desliza la cámara hasta una emoción (la navegación del Bloque 2 vive de esto). */
  centerOnEmotion: (id: string, opts?: { zoom?: number; durationMs?: number }) => void;
  centerOnQuadrant: (q: QuadrantKey) => void;
  /** Vista alejada del plano completo para orientarse y saltar de zona. */
  zoomOut: () => void;
}

interface Props {
  /** Cuadrante de aterrizaje: el mapa abre AQUÍ, nunca en el centro del océano. */
  initialQuadrant?: QuadrantKey;
  /** Emoción(es) seleccionada(s) — su forma se transforma a orbital. */
  selectedIds?: string[];
  /** Cadena de navegación (Bloque 2): estas emociones se destacan, el resto baja. */
  highlightIds?: string[];
  onEmotionPress?: (e: Emotion) => void;
  /** false → cámara solo controlada por ref (modo navegación guiada). */
  interactive?: boolean;
}

export const EmotionMap2D = forwardRef<EmotionMapHandle, Props>(function EmotionMap2D(
  { initialQuadrant, selectedIds = [], highlightIds, onEmotionPress, interactive = true },
  ref,
) {
  const layout = getEmotionMapLayout();
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [overview, setOverview] = useState(false);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(ZOOM_LANDING);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const savedScale = useSharedValue(ZOOM_LANDING);
  const placed = useRef(false);

  const fitScale = viewport.w > 0
    ? Math.min(viewport.w / WORLD_W, viewport.h / WORLD_H)
    : 0.2;

  const clampTx = useCallback((v: number, s: number) => {
    'worklet';
    const min = viewport.w - WORLD_W * s - OVERSCROLL;
    const max = OVERSCROLL;
    if (min > max) return (viewport.w - WORLD_W * s) / 2;
    return Math.min(max, Math.max(min, v));
  }, [viewport.w]);

  const clampTy = useCallback((v: number, s: number) => {
    'worklet';
    const min = viewport.h - WORLD_H * s - OVERSCROLL;
    const max = OVERSCROLL;
    if (min > max) return (viewport.h - WORLD_H * s) / 2;
    return Math.min(max, Math.max(min, v));
  }, [viewport.h]);

  const setOverviewSafe = useCallback((on: boolean) => {
    setOverview((prev) => (prev === on ? prev : on));
  }, []);

  const animateTo = useCallback((wx: number, wy: number, targetScale: number, durationMs = 480) => {
    if (viewport.w === 0) return;
    const s = Math.max(fitScale, Math.min(ZOOM_MAX, targetScale));
    const easing = Easing.out(Easing.cubic); // entra suave, nunca ease-in
    scale.value = withTiming(s, { duration: durationMs, easing });
    tx.value = withTiming(clampTx(viewport.w / 2 - wx * s, s), { duration: durationMs, easing });
    ty.value = withTiming(clampTy(viewport.h / 2 - wy * s, s), { duration: durationMs, easing });
    setOverviewSafe(s < OVERVIEW_LABEL_CUTOFF);
  }, [viewport, fitScale, clampTx, clampTy, scale, tx, ty, setOverviewSafe]);

  useImperativeHandle(ref, () => ({
    centerOnEmotion: (id, opts) => {
      const p = layout.points.find((pt) => pt.id === id);
      if (!p) return;
      animateTo(p.wx, p.wy, opts?.zoom ?? ZOOM_LANDING, opts?.durationMs ?? 480);
    },
    centerOnQuadrant: (q) => {
      const c = QUADRANT_CENTERS[q];
      const { wx, wy } = toWorld(c.nx, c.ny);
      animateTo(wx, wy, ZOOM_LANDING);
    },
    zoomOut: () => {
      const { wx, wy } = toWorld(0, 0);
      animateTo(wx, wy, fitScale, 420);
    },
  }), [layout, animateTo, fitScale]);

  // Aterrizaje inicial: en la zona del cuadrante elegido (sin animación).
  useEffect(() => {
    if (viewport.w === 0 || placed.current) return;
    placed.current = true;
    const c = QUADRANT_CENTERS[initialQuadrant ?? 'high_pleasant'];
    const { wx, wy } = toWorld(c.nx, c.ny);
    tx.value = clampTx(viewport.w / 2 - wx * ZOOM_LANDING, ZOOM_LANDING);
    ty.value = clampTy(viewport.h / 2 - wy * ZOOM_LANDING, ZOOM_LANDING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(interactive)
    .minDistance(6)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = clampTx(savedTx.value + e.translationX, scale.value);
      ty.value = clampTy(savedTy.value + e.translationY, scale.value);
    }), [interactive, clampTx, clampTy, savedTx, savedTy, tx, ty, scale]);

  const pinch = useMemo(() => Gesture.Pinch()
    .enabled(interactive)
    .onStart(() => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const s = Math.max(fitScale * 0.9, Math.min(ZOOM_MAX, savedScale.value * e.scale));
      const k = s / savedScale.value;
      scale.value = s;
      tx.value = clampTx(e.focalX - (e.focalX - savedTx.value) * k, s);
      ty.value = clampTy(e.focalY - (e.focalY - savedTy.value) * k, s);
    })
    .onEnd(() => {
      runOnJS(setOverviewSafe)(scale.value < OVERVIEW_LABEL_CUTOFF);
    }), [interactive, fitScale, clampTx, clampTy, savedScale, savedTx, savedTy, tx, ty, scale, setOverviewSafe]);

  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const highlightSet = highlightIds ? new Set(highlightIds) : null;
  const selectedSet = new Set(selectedIds);

  const handlePress = useCallback((e: Emotion) => {
    haptic.light();
    onEmotionPress?.(e);
  }, [onEmotionPress]);

  const jumpToQuadrant = useCallback((q: QuadrantKey) => {
    haptic.light();
    const c = QUADRANT_CENTERS[q];
    const { wx, wy } = toWorld(c.nx, c.ny);
    animateTo(wx, wy, ZOOM_LANDING);
  }, [animateTo]);

  return (
    <View
      style={styles.viewport}
      onLayout={(ev) => setViewport({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.world, worldStyle]}>
          {layout.points.map((p) => {
            const emotion = EMOTION_BY_ID.get(p.id);
            if (!emotion) return null;
            const dimmed = highlightSet ? !highlightSet.has(p.id) && !selectedSet.has(p.id) : false;
            return (
              <MapNode
                key={p.id}
                emotion={emotion}
                wx={p.wx}
                wy={p.wy}
                nx={p.nx}
                ny={p.ny}
                selected={selectedSet.has(p.id)}
                dimmed={dimmed}
                showLabel={!overview}
                onPress={handlePress}
              />
            );
          })}

          {/* Zonas de salto — solo en vista alejada */}
          {overview && (
            <>
              {(Object.keys(QUADRANTS) as QuadrantKey[]).map((q) => {
                const c = QUADRANT_CENTERS[q];
                const { wx, wy } = toWorld(c.nx, c.ny);
                const zoneColor = colorAtPoint(c.nx, c.ny);
                return (
                  <Animated.View
                    key={q}
                    entering={FadeIn.duration(220)}
                    style={[styles.zone, { left: wx - ZONE_W / 2, top: wy - ZONE_H / 2 }]}
                  >
                    <Pressable onPress={() => jumpToQuadrant(q)} style={styles.zonePress}>
                      <EliteText style={[styles.zoneLabel, { color: zoneColor }]}>
                        {QUADRANTS[q].label}
                      </EliteText>
                      <EliteText style={styles.zoneHint}>Toca para entrar</EliteText>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const ZONE_W = 620;
const ZONE_H = 300;

// ═══ Nodo de emoción ═══

interface NodeProps {
  emotion: Emotion;
  wx: number;
  wy: number;
  nx: number;
  ny: number;
  selected: boolean;
  dimmed: boolean;
  showLabel: boolean;
  onPress: (e: Emotion) => void;
}

const MapNode = memo(function MapNode({ emotion, wx, wy, nx, ny, selected, dimmed, showLabel, onPress }: NodeProps) {
  const [gTop, gBottom] = useMemo(() => emotionGradient(nx, ny), [nx, ny]);
  const base = useMemo(() => colorAtPoint(nx, ny), [nx, ny]);
  const labelColor = isLightColor(base) ? TEXT_COLORS.onAccent : TEXT.primary;

  return (
    <View
      style={[styles.node, { left: wx - NODE_SIZE / 2, top: wy - NODE_SIZE / 2 }, dimmed && styles.nodeDimmed]}
      pointerEvents={dimmed ? 'none' : 'auto'}
    >
      <Pressable onPress={() => onPress(emotion)} style={styles.nodePress} disabled={selected}>
        {selected ? (
          <OrbitalMark color={base} gradient={[gTop, gBottom]} />
        ) : (
          <LinearGradient colors={[gTop, gBottom]} style={styles.circle}>
            {showLabel && (
              <EliteText numberOfLines={3} style={[styles.nodeLabel, { color: labelColor }]}>
                {emotion.label}
              </EliteText>
            )}
          </LinearGradient>
        )}
      </Pressable>
      {selected && showLabel && (
        <EliteText numberOfLines={2} style={[styles.selectedLabel, { color: base }]}>
          {emotion.label}
        </EliteText>
      )}
    </View>
  );
});

/**
 * La forma seleccionada — lenguaje molecular ATP: el círculo colapsa a núcleo
 * y le nace un orbital con su electrón girando. (No es el lenguaje de formas
 * de la referencia: es el vocabulario de energía celular de la propia app.)
 */
function OrbitalMark({ color, gradient }: { color: string; gradient: [string, string] }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 5200, easing: Easing.linear }), -1, false);
  }, [spin]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <View style={styles.orbitalWrap}>
      {/* Halo del núcleo */}
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        style={[styles.orbitalHalo, { backgroundColor: withOpacity(color, 0.18) }]}
      />
      {/* Núcleo (el círculo colapsado) */}
      <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.nucleusShadowless}>
        <LinearGradient colors={gradient} style={styles.nucleus} />
      </Animated.View>
      {/* Orbital + electrón girando */}
      <Animated.View entering={ZoomIn.delay(60).springify().damping(12)} style={[styles.orbitRing, { borderColor: withOpacity(color, 0.75) }, orbitStyle]}>
        <View style={[styles.electron, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  world: {
    position: 'absolute',
    width: WORLD_W,
    height: WORLD_H,
    // La cámara escala/traslada desde la esquina para que la matemática sea directa.
    transformOrigin: 'top left',
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    alignItems: 'center',
  },
  nodeDimmed: { opacity: 0.16 },
  nodePress: { width: NODE_SIZE, height: NODE_SIZE },
  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  nodeLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  selectedLabel: {
    position: 'absolute',
    top: NODE_SIZE + 2,
    width: NODE_SIZE + 60,
    marginLeft: -30,
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },

  // Orbital (selección)
  orbitalWrap: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalHalo: {
    position: 'absolute',
    width: NODE_SIZE + 26,
    height: NODE_SIZE + 26,
    borderRadius: (NODE_SIZE + 26) / 2,
  },
  nucleusShadowless: { position: 'absolute' },
  nucleus: {
    width: NODE_SIZE * 0.46,
    height: NODE_SIZE * 0.46,
    borderRadius: (NODE_SIZE * 0.46) / 2,
  },
  orbitRing: {
    position: 'absolute',
    width: NODE_SIZE + 10,
    height: NODE_SIZE + 10,
    borderRadius: (NODE_SIZE + 10) / 2,
    borderWidth: 2,
  },
  electron: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Vista alejada: zonas por cuadrante
  zone: {
    position: 'absolute',
    width: ZONE_W,
    height: ZONE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonePress: { alignItems: 'center', gap: 10 },
  zoneLabel: {
    fontSize: 44,
    lineHeight: 52,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  zoneHint: {
    color: TEXT.secondary,
    fontSize: 24,
    fontFamily: Fonts.semiBold,
  },
});
