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
  useSharedValue, useAnimatedStyle, useAnimatedReaction, withTiming, withRepeat,
  withDecay, withSpring, cancelAnimation, interpolate, Extrapolation,
  Easing, runOnJS, ZoomIn, FadeIn, type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { EMOTIONS, QUADRANTS, type Emotion, type QuadrantKey } from '@/src/data/emotions-library';
import {
  computeEmotionMapLayout, emotionGradient, colorAtPoint, isLightColor,
  QUADRANT_CENTERS, toWorld, quadrantLandingWorld, WORLD_W, WORLD_H, WORLD_PAD, NODE_SIZE,
  CENTER_X, CENTER_Y, CALM_R0, EXPLORATION_CENTER_LABEL,
  type EmotionMapLayout,
} from '@/src/services/emotion-map-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { BG, TEXT, TEXT_COLORS, withOpacity } from '@/src/constants/brand';

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
const LABEL_FADE_RANGE = 0.14;      // los labels se desvanecen por worklet alrededor del corte
// LOD (A.4): alejado se ven solo los landmarks; el resto se revela al acercar.
// D.2/D.3 (MB-10, device test): el cribado a 0.12 leía como ROTO (casi todo
// negro con dos brillantes) y las burbujas tardaban en aparecer → piso de
// opacidad arriba y revelado más temprano/corto.
const REVEAL_CUTOFF = 0.48;         // arriba de esto las NO-representativas se revelan
const REVEAL_RANGE = 0.10;          // rango del fundido por worklet
const LOD_MIN_OPACITY = 0.45;       // jerarquía, no apagón: el fondo se LEE
const RUBBER_C = 0.55;              // constante de resistencia de la liga (rubber-band iOS)
// Snap-back de zoom: amortiguamiento ~crítico, sin rebote (apple-design §4).
const SETTLE_SPRING = { damping: 30, stiffness: 260, mass: 1, overshootClamping: true } as const;

// ═══ Liga progresiva en bordes — un tope duro se lee como "se congeló";
// la resistencia progresiva se lee como "responde, pero aquí ya no hay más". ═══

function rubberband(overshoot: number, dim: number): number {
  'worklet';
  return (overshoot * dim * RUBBER_C) / (dim + RUBBER_C * overshoot);
}

/** Inversa exacta de rubberband — agarrar el plano a media liga no salta. */
function invRubberband(r: number, dim: number): number {
  'worklet';
  const capped = Math.min(r, dim * 0.999);
  return (capped * dim) / (RUBBER_C * (dim - capped));
}

function rubberMap(v: number, min: number, max: number, dim: number): number {
  'worklet';
  if (v < min) return min - rubberband(min - v, dim);
  if (v > max) return max + rubberband(v - max, dim);
  return v;
}

function invRubberMap(v: number, min: number, max: number, dim: number): number {
  'worklet';
  if (v < min) return min - invRubberband(min - v, dim);
  if (v > max) return max + invRubberband(v - max, dim);
  return v;
}

/** Región que la cámara está mostrando (B.6 MB-7): cuadrante real o vista alejada. */
export type MapRegion = QuadrantKey | 'overview';

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
  /**
   * B.6 (MB-7): notifica la región real bajo el centro del viewport. Se deriva
   * en worklet y solo cruza a JS cuando la región CAMBIA (no por frame).
   */
  onRegionChange?: (region: MapRegion) => void;
  /** false → cámara solo controlada por ref (modo navegación guiada). */
  interactive?: boolean;
}

export const EmotionMap2D = memo(forwardRef<EmotionMapHandle, Props>(function EmotionMap2D(
  { initialQuadrant, selectedIds = [], highlightIds, onEmotionPress, onRegionChange, interactive = true },
  ref,
) {
  const layout = getEmotionMapLayout();
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [overview, setOverview] = useState(false);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(ZOOM_LANDING);
  // Cámara "cruda" (sin liga): el gesto acumula aquí y la vista presenta
  // rubberMap(raw). Pan y pinch componen sobre el mismo estado sin pelearse.
  const rawTx = useSharedValue(0);
  const rawTy = useSharedValue(0);
  const pinchLast = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const panActive = useSharedValue(false);
  const placed = useRef(false);

  const fitScale = viewport.w > 0
    ? Math.min(viewport.w / WORLD_W, viewport.h / WORLD_H)
    : 0.2;

  // Límites reales del mundo (sin margen): la liga da el "give", el reposo es al ras.
  const boundsX = useCallback((s: number): [number, number] => {
    'worklet';
    const min = viewport.w - WORLD_W * s;
    if (min > 0) return [min / 2, min / 2]; // mundo más chico que el viewport → centrado
    return [min, 0];
  }, [viewport.w]);

  const boundsY = useCallback((s: number): [number, number] => {
    'worklet';
    const min = viewport.h - WORLD_H * s;
    if (min > 0) return [min / 2, min / 2];
    return [min, 0];
  }, [viewport.h]);

  const setOverviewSafe = useCallback((on: boolean) => {
    setOverview((prev) => (prev === on ? prev : on));
  }, []);

  const animateTo = useCallback((wx: number, wy: number, targetScale: number, durationMs = 480) => {
    if (viewport.w === 0) return;
    const s = Math.max(fitScale, Math.min(ZOOM_MAX, targetScale));
    const easing = Easing.out(Easing.cubic); // entra suave, nunca ease-in
    const [minX, maxX] = boundsX(s);
    const [minY, maxY] = boundsY(s);
    // withTiming arranca del valor presentado → un dedo la interrumpe sin salto.
    scale.value = withTiming(s, { duration: durationMs, easing });
    tx.value = withTiming(Math.min(maxX, Math.max(minX, viewport.w / 2 - wx * s)), { duration: durationMs, easing });
    ty.value = withTiming(Math.min(maxY, Math.max(minY, viewport.h / 2 - wy * s)), { duration: durationMs, easing });
    setOverviewSafe(s < OVERVIEW_LABEL_CUTOFF);
  }, [viewport, fitScale, boundsX, boundsY, scale, tx, ty, setOverviewSafe]);

  useImperativeHandle(ref, () => ({
    centerOnEmotion: (id, opts) => {
      const p = layout.points.find((pt) => pt.id === id);
      if (!p) return;
      animateTo(p.wx, p.wy, opts?.zoom ?? ZOOM_LANDING, opts?.durationMs ?? 480);
    },
    centerOnQuadrant: (q) => {
      const { wx, wy } = quadrantLandingWorld(q);
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
    const { wx, wy } = quadrantLandingWorld(initialQuadrant ?? 'high_pleasant');
    const [minX, maxX] = boundsX(ZOOM_LANDING);
    const [minY, maxY] = boundsY(ZOOM_LANDING);
    tx.value = Math.min(maxX, Math.max(minX, viewport.w / 2 - wx * ZOOM_LANDING));
    ty.value = Math.min(maxY, Math.max(minY, viewport.h / 2 - wy * ZOOM_LANDING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  // ═══ Gestos — el camino del gesto NUNCA cruza al hilo de JS. ═══
  // Touch-down agarra el plano donde está (cancela inercia), el tracking es 1:1
  // sobre la cámara cruda, y al soltar la velocidad se entrega a withDecay.

  const pan = useMemo(() => Gesture.Pan()
    .enabled(interactive)
    // 🔴 D.1 (MB-10): el pinch es DUEÑO de los gestos de dos dedos. Sin este
    // límite, al pellizcar el centroide se movía y el pan sumaba su delta a
    // rawTx/rawTy mientras el pinch aplicaba su anclaje focal — dos modelos
    // escribiendo la misma variable → deriva a la esquina.
    .maxPointers(1)
    .minDistance(6)
    .onBegin(() => {
      // Respuesta en touch-down: si venía con inercia, se engancha aquí mismo.
      cancelAnimation(tx);
      cancelAnimation(ty);
    })
    .onStart(() => {
      panActive.value = true;
      const [minX, maxX] = boundsX(scale.value);
      const [minY, maxY] = boundsY(scale.value);
      rawTx.value = invRubberMap(tx.value, minX, maxX, viewport.w);
      rawTy.value = invRubberMap(ty.value, minY, maxY, viewport.h);
    })
    .onChange((e) => {
      const [minX, maxX] = boundsX(scale.value);
      const [minY, maxY] = boundsY(scale.value);
      rawTx.value += e.changeX;
      rawTy.value += e.changeY;
      tx.value = rubberMap(rawTx.value, minX, maxX, viewport.w);
      ty.value = rubberMap(rawTy.value, minY, maxY, viewport.h);
    })
    .onEnd((e) => {
      // Momentum: proyección de inercia estilo iOS + liga en los bordes.
      // Los límites se computan con la escala legal (por si el pinch quedó en liga).
      const sNow = Math.max(fitScale, Math.min(ZOOM_MAX, scale.value));
      const [minX, maxX] = boundsX(sNow);
      const [minY, maxY] = boundsY(sNow);
      tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.998, clamp: [minX, maxX], rubberBandEffect: true });
      ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.998, clamp: [minY, maxY], rubberBandEffect: true });
    })
    .onFinalize(() => {
      panActive.value = false;
    }), [interactive, viewport, fitScale, boundsX, boundsY, rawTx, rawTy, tx, ty, scale, panActive]);

  const pinch = useMemo(() => Gesture.Pinch()
    .enabled(interactive)
    .onBegin(() => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(scale);
    })
    .onStart(() => {
      pinchLast.value = 1;
      const [minX, maxX] = boundsX(scale.value);
      const [minY, maxY] = boundsY(scale.value);
      rawTx.value = invRubberMap(tx.value, minX, maxX, viewport.w);
      rawTy.value = invRubberMap(ty.value, minY, maxY, viewport.h);
    })
    .onUpdate((e) => {
      // Factor incremental (no acumulado desde onStart): compone con el pan
      // simultáneo sin saltos y siempre parte del valor presentado.
      const k = e.scale / pinchLast.value;
      pinchLast.value = e.scale;
      const sPrev = scale.value;
      let sNext = sPrev * k;
      // Liga también en el zoom: pasar el límite resiste, no corta.
      if (sNext > ZOOM_MAX) sNext = ZOOM_MAX + rubberband(sNext - ZOOM_MAX, 0.25);
      else if (sNext < fitScale) sNext = fitScale - rubberband(fitScale - sNext, fitScale * 0.35);
      const k2 = sNext / sPrev;
      focalX.value = e.focalX;
      focalY.value = e.focalY;
      rawTx.value = e.focalX - (e.focalX - rawTx.value) * k2;
      rawTy.value = e.focalY - (e.focalY - rawTy.value) * k2;
      scale.value = sNext;
      const [minX, maxX] = boundsX(sNext);
      const [minY, maxY] = boundsY(sNext);
      tx.value = rubberMap(rawTx.value, minX, maxX, viewport.w);
      ty.value = rubberMap(rawTy.value, minY, maxY, viewport.h);
    })
    .onEnd(() => {
      const sTarget = Math.max(fitScale, Math.min(ZOOM_MAX, scale.value));
      const [minX, maxX] = boundsX(sTarget);
      const [minY, maxY] = boundsY(sTarget);
      const sNow = scale.value;
      if (sTarget !== sNow) {
        // El zoom quedó en la zona de liga → regresa al límite alrededor del
        // focal, arrancando del valor presentado (amortiguamiento ~crítico).
        scale.value = withSpring(sTarget, SETTLE_SPRING);
        if (!panActive.value) {
          const k = sTarget / sNow;
          const txT = Math.min(maxX, Math.max(minX, focalX.value - (focalX.value - tx.value) * k));
          const tyT = Math.min(maxY, Math.max(minY, focalY.value - (focalY.value - ty.value) * k));
          cancelAnimation(tx);
          cancelAnimation(ty);
          tx.value = withSpring(txT, SETTLE_SPRING);
          ty.value = withSpring(tyT, SETTLE_SPRING);
        }
      } else if (!panActive.value) {
        // Zoom válido pero la traslación pudo quedar fuera de los nuevos límites
        // (pinch puro sin pan que la regrese con decay).
        if (tx.value < minX || tx.value > maxX) {
          tx.value = withSpring(Math.min(maxX, Math.max(minX, tx.value)), SETTLE_SPRING);
        }
        if (ty.value < minY || ty.value > maxY) {
          ty.value = withSpring(Math.min(maxY, Math.max(minY, ty.value)), SETTLE_SPRING);
        }
      }
      // Único cruce a JS: AL TERMINAR el gesto (flip gradiente/plano + zonas).
      runOnJS(setOverviewSafe)(sTarget < OVERVIEW_LABEL_CUTOFF);
    }), [interactive, viewport, fitScale, boundsX, boundsY, rawTx, rawTy, tx, ty, scale, pinchLast, focalX, focalY, panActive, setOverviewSafe]);

  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  // B.6 (MB-7): región real bajo el centro del viewport, derivada EN el worklet.
  // Solo cruza a JS cuando la región cambia (cruzar de cuadrante / entrar a
  // overview) — nunca por frame. En overview no se nombra un cuadrante.
  useAnimatedReaction(
    () => {
      if (viewport.w === 0) return null;
      if (scale.value < OVERVIEW_LABEL_CUTOFF) return 'overview' as MapRegion;
      const s = scale.value;
      const cx = (viewport.w / 2 - tx.value) / s;
      const cy = (viewport.h / 2 - ty.value) / s;
      const usableW = WORLD_W - WORLD_PAD * 2;
      const usableH = WORLD_H - WORLD_PAD * 2;
      const nx = ((cx - WORLD_PAD) / usableW) * 2 - 1;
      const ny = 1 - ((cy - WORLD_PAD) / usableH) * 2;
      if (ny >= 0) return (nx >= 0 ? 'high_pleasant' : 'high_unpleasant') as MapRegion;
      return (nx >= 0 ? 'low_pleasant' : 'low_unpleasant') as MapRegion;
    },
    (cur, prev) => {
      if (cur && cur !== prev && onRegionChange) runOnJS(onRegionChange)(cur);
    },
    [viewport, onRegionChange],
  );

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
    const { wx, wy } = quadrantLandingWorld(q);
    animateTo(wx, wy, ZOOM_LANDING);
  }, [animateTo]);

  return (
    <View
      style={styles.viewport}
      onLayout={(ev) => setViewport({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.world, worldStyle]}>
          {/* D.5 (MB-10): el claro central queda como origen de los ejes — con
              su presencia visual pero SIN nombre. El texto vive en una
              constante editable (EXPLORATION_CENTER_LABEL); vacía ⇒ no se pinta. */}
          <View
            pointerEvents="none"
            style={[
              styles.calmCore,
              { left: CENTER_X - CALM_R0, top: CENTER_Y - CALM_R0, width: CALM_R0 * 2, height: CALM_R0 * 2, borderRadius: CALM_R0 },
            ]}
          >
            {EXPLORATION_CENTER_LABEL.length > 0 && (
              <EliteText style={styles.calmLabel}>{EXPLORATION_CENTER_LABEL}</EliteText>
            )}
          </View>

          {/* Las burbujas se montan UNA vez y solo se transforma el contenedor —
              el gesto no vuelve a tocar el hilo de JS (adiós culling reactivo,
              que re-renderizaba las 144 a media navegación). */}
          {layout.points.map((p) => {
            const emotion = EMOTION_BY_ID.get(p.id);
            if (!emotion) return null;
            const isSelected = selectedSet.has(p.id);
            const dimmed = highlightSet ? !highlightSet.has(p.id) && !isSelected : false;
            return (
              <MapNode
                key={p.id}
                emotion={emotion}
                wx={p.wx}
                wy={p.wy}
                nx={p.nx}
                ny={p.ny}
                size={p.size}
                representative={p.representative}
                selected={isSelected}
                dimmed={dimmed}
                cameraScale={scale}
                flat={overview}
                onPress={handlePress}
              />
            );
          })}

          {/* Zonas de salto — solo en vista alejada */}
          {overview && (
            <>
              {(Object.keys(QUADRANTS) as QuadrantKey[]).map((q) => {
                const c = QUADRANT_CENTERS[q];
                const { wx, wy } = quadrantLandingWorld(q);
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
}));

const ZONE_W = 620;
const ZONE_H = 300;

// ═══ Nodo de emoción ═══

interface NodeProps {
  emotion: Emotion;
  wx: number;
  wy: number;
  nx: number;
  ny: number;
  /** Diámetro de la burbuja (escala con intensidad · MB-9 Track A). */
  size: number;
  /** Landmark: visible en vista alejada. Las demás se revelan al acercar (LOD). */
  representative: boolean;
  selected: boolean;
  dimmed: boolean;
  /** Escala de la cámara — los labels se desvanecen en worklet, sin setState. */
  cameraScale: SharedValue<number>;
  /** Al asentarse en vista alejada → color plano (sin LinearGradient). */
  flat: boolean;
  onPress: (e: Emotion) => void;
}

const MapNode = memo(function MapNode({ emotion, wx, wy, nx, ny, size, representative, selected, dimmed, cameraScale, flat, onPress }: NodeProps) {
  const [gTop, gBottom] = useMemo(() => emotionGradient(nx, ny), [nx, ny]);
  const base = useMemo(() => colorAtPoint(nx, ny), [nx, ny]);
  const labelColor = isLightColor(base) ? TEXT_COLORS.onAccent : TEXT.primary;

  // Estilos dependientes del tamaño de burbuja (intensidad).
  const dyn = useMemo(() => ({
    node: { left: wx - size / 2, top: wy - size / 2, width: size },
    press: { width: size, height: size },
    circle: { width: size, height: size, borderRadius: size / 2 },
  }), [wx, wy, size]);

  // Opacidad del label derivada de la escala EN el hilo de UI: alejarse los
  // funde, acercarse los revela — sin cruzar a JS a media navegación.
  const labelFade = useAnimatedStyle(() => ({
    opacity: interpolate(
      cameraScale.value,
      [OVERVIEW_LABEL_CUTOFF, OVERVIEW_LABEL_CUTOFF + LABEL_FADE_RANGE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // LOD (A.4): las NO-representativas se funden al alejar y se revelan al
  // acercar; los landmarks (y la selección) siempre a opacidad plena. En hilo
  // de UI: la revelación no cruza a JS a media navegación.
  const lodFade = useAnimatedStyle(() => {
    if (representative || selected) return { opacity: 1 };
    return {
      opacity: interpolate(
        cameraScale.value,
        [REVEAL_CUTOFF, REVEAL_CUTOFF + REVEAL_RANGE],
        [LOD_MIN_OPACITY, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  // Alejado, una burbuja no-landmark no debe robar el toque destinado a las zonas.
  const tappable = !dimmed && (representative || selected || !flat);

  return (
    <Animated.View
      style={[
        styles.node,
        dyn.node,
        dimmed && styles.nodeDimmed,
        // B.4 (MB-7): el átomo y su etiqueta se dibujan POR ENCIMA de las
        // vecinas — sin esto los hermanos posteriores cortaban el label
        // ("n éxtasis" en vez de "En éxtasis").
        selected && styles.nodeSelected,
        lodFade,
      ]}
      pointerEvents={tappable ? 'auto' : 'none'}
    >
      <Pressable onPress={() => onPress(emotion)} style={dyn.press} disabled={selected}>
        {selected ? (
          <OrbitalMark color={base} gradient={[gTop, gBottom]} size={size} />
        ) : flat ? (
          // Vista alejada asentada: el gradiente es invisible a ese tamaño →
          // color plano, 0 LinearGradient.
          <View style={[styles.circle, dyn.circle, { backgroundColor: base }]} />
        ) : (
          <LinearGradient colors={[gTop, gBottom]} style={[styles.circle, dyn.circle]}>
            <Animated.View style={labelFade}>
              <EliteText numberOfLines={3} style={[styles.nodeLabel, { color: labelColor }]}>
                {emotion.label}
              </EliteText>
            </Animated.View>
          </LinearGradient>
        )}
      </Pressable>
      {selected && !flat && (
        <Animated.View style={[styles.selectedLabelWrap, { top: size + 2 }, labelFade]}>
          <EliteText numberOfLines={2} style={[styles.selectedLabel, { color: base }]}>
            {emotion.label}
          </EliteText>
        </Animated.View>
      )}
    </Animated.View>
  );
});

/**
 * La forma seleccionada — lenguaje molecular ATP: el círculo colapsa a núcleo
 * y le nace un orbital con su electrón girando. (No es el lenguaje de formas
 * de la referencia: es el vocabulario de energía celular de la propia app.)
 */
function OrbitalMark({ color, gradient, size = NODE_SIZE }: { color: string; gradient: [string, string]; size?: number }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 5200, easing: Easing.linear }), -1, false);
  }, [spin]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  // Dimensiones del átomo derivadas del tamaño de la burbuja (intensidad).
  const dyn = useMemo(() => {
    const halo = size + 26;
    const nucleus = size * 0.46;
    const ring = size + 10;
    return {
      wrap: { width: size, height: size },
      halo: { width: halo, height: halo, borderRadius: halo / 2 },
      nucleus: { width: nucleus, height: nucleus, borderRadius: nucleus / 2 },
      ring: { width: ring, height: ring, borderRadius: ring / 2 },
    };
  }, [size]);

  return (
    <View style={[styles.orbitalWrap, dyn.wrap]}>
      {/* Halo del núcleo */}
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        style={[styles.orbitalHalo, dyn.halo, { backgroundColor: withOpacity(color, 0.18) }]}
      />
      {/* Núcleo (el círculo colapsado) */}
      <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.nucleusShadowless}>
        <LinearGradient colors={gradient} style={[styles.nucleus, dyn.nucleus]} />
      </Animated.View>
      {/* Orbital + electrón girando */}
      <Animated.View entering={ZoomIn.delay(60).springify().damping(12)} style={[styles.orbitRing, dyn.ring, { borderColor: withOpacity(color, 0.75) }, orbitStyle]}>
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
  nodeSelected: { zIndex: 30 },
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
  selectedLabelWrap: {
    position: 'absolute',
    width: NODE_SIZE + 60,
    left: -30,
  },

  // Zona CALMA — el centro del circumplejo es destino (A.1), un núcleo tenue.
  calmCore: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: withOpacity(TEXT.primary, 0.10),
    backgroundColor: withOpacity(TEXT.primary, 0.03),
  },
  calmLabel: {
    fontSize: 40,
    letterSpacing: 6,
    fontFamily: Fonts.semiBold,
    color: withOpacity(TEXT.primary, 0.28),
  },
  selectedLabel: {
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
  // B.8 (MB-7): el rótulo lleva su propio soporte translúcido — sin él
  // competía sin contraste contra el enjambre de burbujas.
  zonePress: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 44,
    paddingVertical: 28,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(BG.input, 0.78),
  },
  zoneLabel: {
    fontSize: 44,
    lineHeight: 52,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  zoneHint: {
    color: TEXT.primary,
    fontSize: 24,
    fontFamily: Fonts.semiBold,
    opacity: 0.75,
  },
});
