/**
 * MoodPlane — el plano continuo 12x12 del Mood Meter (MB-15).
 *
 * Reemplaza a MoodGrid (4 tarjetas → lista de píldoras en scroll): era un paso
 * intermedio que abandonó lo espacial, que es justo lo que da el valor. Aquí
 * la posición ES el significado: eje horizontal = agrado, eje vertical =
 * energía. Se recorre arrastrando y se acerca con pinch, como How We Feel.
 *
 * LAS CUATRO REGLAS DEL BRIEF (cada una por un fracaso real en device):
 *  1. CERO SVG: las celdas son View, las palabras son Text de React Native
 *     (react-native-svg no pinta texto en Android en este proyecto).
 *  2. UNA sola transformación nativa sobre el contenedor: scale + translate
 *     en shared values. El transform escala el subárbol COMPLETO, palabras
 *     incluidas: sin matemática de fuente, sin etiquetas condicionales, sin
 *     cálculo de si cabe. A zoom bajo se ven chiquitas y eso está bien.
 *  3. El toque son Pressable reales por celda: dentro de un contenedor
 *     transformado responden a cualquier zoom, sin hit-testing inverso.
 *  4. El color sale de la POSICIÓN (col >= 7 agradable, fila >= 7 energía),
 *     nunca de la emoción (emotion-plane-core).
 *
 * Las coordenadas gridCol/gridRow las revisó Enrique una por una (bdb818c):
 * no se recalculan ni se derivan de energy/intensity.
 */
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction, withTiming, withDecay,
  cancelAnimation, interpolate, Extrapolation, Easing, runOnJS, FadeIn,
} from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { EMOTIONS, QUADRANTS, type Emotion, type QuadrantKey } from '@/src/data/emotions-library';
import { QUADRANT_FEEL } from '@/src/data/emotion-grid-config';
import {
  PLANE_SIZE, PLANE_FONT_SIZE, PLANE_FONT_LINE_HEIGHT, PLANE_CELL_PAD_H,
  cellRect, cellCenter, planeCellColor, planeFitScale, clampScale, clampAxis,
  cameraFor, quadrantCenter, PLANE_MIN_SCALE,
  QUADRANT_ZOOM_FACTOR, FOCUS_ZOOM_FACTOR,
} from '@/src/services/emotion-plane-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { BG, TEXT, withOpacity } from '@/src/constants/brand';

const EASE_OUT = Easing.out(Easing.cubic);
/** Rango del fundido de las etiquetas de cuadrante, relativo al fit. */
const LABEL_FADE_START = 1.12;
const LABEL_FADE_END = 1.7;

export interface MoodPlaneHandle {
  /** Encuadra la cámara en la celda de la emoción (búsqueda / preselección). */
  focusEmotion: (emotionId: string) => void;
}

interface Props {
  selectedIds: string[];
  onEmotionPress: (e: Emotion) => void;
}

/** Posición de cada etiqueta de cuadrante sobre el mapa general. */
const OVERLAY_QUADRANTS: { q: QuadrantKey; top: boolean; right: boolean }[] = [
  { q: 'high_unpleasant', top: true, right: false },
  { q: 'high_pleasant', top: true, right: true },
  { q: 'low_unpleasant', top: false, right: false },
  { q: 'low_pleasant', top: false, right: true },
];

export const MoodPlane = forwardRef<MoodPlaneHandle, Props>(function MoodPlane(
  { selectedIds, onEmotionPress },
  ref,
) {
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const ready = viewport.w > 0 && viewport.h > 0;
  const fit = ready ? planeFitScale(viewport.w, viewport.h) : PLANE_MIN_SCALE;
  // El plano completo SIEMPRE alcanzable, también si el canvas del device es
  // más chico que 0.6 * PLANE_SIZE.
  const minScale = Math.min(PLANE_MIN_SCALE, fit);

  const scale = useSharedValue(fit);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pinchLast = useSharedValue(1);
  const placed = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  // pointerEvents de las etiquetas: cruza a JS solo al cruzar el umbral.
  const [labelsShown, setLabelsShown] = useState(true);

  const animateTo = useCallback((cam: { scale: number; tx: number; ty: number }, durationMs: number) => {
    cancelAnimation(scale);
    cancelAnimation(tx);
    cancelAnimation(ty);
    scale.value = withTiming(cam.scale, { duration: durationMs, easing: EASE_OUT });
    tx.value = withTiming(cam.tx, { duration: durationMs, easing: EASE_OUT });
    ty.value = withTiming(cam.ty, { duration: durationMs, easing: EASE_OUT });
  }, [scale, tx, ty]);

  const focusEmotion = useCallback((emotionId: string) => {
    if (!placed.current) {
      pendingFocus.current = emotionId;
      return;
    }
    const e = EMOTIONS.find((em) => em.id === emotionId);
    if (!e) return;
    const c = cellCenter(e.gridCol, e.gridRow);
    animateTo(cameraFor(c.x, c.y, fit * FOCUS_ZOOM_FACTOR, viewport.w, viewport.h, minScale), 480);
  }, [animateTo, fit, viewport, minScale]);

  useImperativeHandle(ref, () => ({ focusEmotion }), [focusEmotion]);

  // Colocación inicial: el mapa general completo, centrado. Sin animación.
  useEffect(() => {
    if (!ready || placed.current) return;
    placed.current = true;
    const cam = cameraFor(PLANE_SIZE / 2, PLANE_SIZE / 2, fit, viewport.w, viewport.h, minScale);
    scale.value = cam.scale;
    tx.value = cam.tx;
    ty.value = cam.ty;
    // Una preselección (Exploración) pudo llegar antes del primer layout.
    if (pendingFocus.current) {
      const id = pendingFocus.current;
      pendingFocus.current = null;
      focusEmotion(id);
    }
  }, [ready, fit, viewport, minScale, scale, tx, ty, focusEmotion]);

  // ═══ GESTOS — todo el camino en worklets, nunca cruza a JS por frame. ═══

  const pan = useMemo(() => Gesture.Pan()
    // El pinch es DUEÑO de los dos dedos: sin esto, pan y pinch escriben el
    // mismo shared value y pelean (D.1 · MB-10, verificado en device).
    .maxPointers(1)
    .minDistance(6)
    .onBegin(() => {
      // Interrumpible: touch-down agarra el plano donde está.
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(scale);
    })
    .onChange((e) => {
      const content = PLANE_SIZE * scale.value;
      tx.value = clampAxis(tx.value + e.changeX, content, viewport.w);
      ty.value = clampAxis(ty.value + e.changeY, content, viewport.h);
    })
    .onEnd((e) => {
      // Momentum clampeado: el plano nunca sale de la pantalla.
      const content = PLANE_SIZE * scale.value;
      if (content > viewport.w) {
        tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.996, clamp: [viewport.w - content, 0] });
      }
      if (content > viewport.h) {
        ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.996, clamp: [viewport.h - content, 0] });
      }
    }), [viewport, scale, tx, ty]);

  const pinch = useMemo(() => Gesture.Pinch()
    .onBegin(() => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(scale);
    })
    .onStart(() => {
      pinchLast.value = 1;
    })
    .onUpdate((e) => {
      // Factor incremental (no acumulado): compone con el pan simultáneo sin
      // saltos. El zoom ancla el punto medio de los dedos (focal).
      const k = e.scale / pinchLast.value;
      pinchLast.value = e.scale;
      const sPrev = scale.value;
      const sNext = clampScale(sPrev * k, minScale);
      const k2 = sNext / sPrev;
      scale.value = sNext;
      const content = PLANE_SIZE * sNext;
      tx.value = clampAxis(e.focalX - (e.focalX - tx.value) * k2, content, viewport.w);
      ty.value = clampAxis(e.focalY - (e.focalY - ty.value) * k2, content, viewport.h);
    }), [viewport, minScale, scale, tx, ty, pinchLast]);

  const gesture = useMemo(() => Gesture.Simultaneous(pinch, pan), [pinch, pan]);

  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // Las etiquetas de cuadrante pertenecen al mapa general: se funden al
  // acercar y regresan al alejar. Opacidad en hilo de UI; el pointerEvents
  // cruza a JS solo cuando el umbral se cruza.
  const labelFade = useAnimatedStyle(() => ({
    opacity: interpolate(
      scale.value,
      [fit * LABEL_FADE_START, fit * LABEL_FADE_END],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }), [fit]);

  useAnimatedReaction(
    () => scale.value < fit * LABEL_FADE_END,
    (show, prev) => {
      if (show !== prev) runOnJS(setLabelsShown)(show);
    },
    [fit],
  );

  const handleCellPress = useCallback((e: Emotion) => {
    haptic.light();
    onEmotionPress(e);
  }, [onEmotionPress]);

  const zoomToQuadrant = useCallback((q: QuadrantKey) => {
    haptic.light();
    const c = quadrantCenter(q);
    animateTo(cameraFor(c.x, c.y, fit * QUADRANT_ZOOM_FACTOR, viewport.w, viewport.h, minScale), 420);
  }, [animateTo, fit, viewport, minScale]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Rectángulo de reposo del plano en pantalla (mapa general): las etiquetas
  // viven encima de ese rectángulo, FUERA del contenedor transformado.
  const restSize = PLANE_SIZE * fit;
  const restLeft = (viewport.w - restSize) / 2;
  const restTop = (viewport.h - restSize) / 2;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.canvas}
        onLayout={(ev) => setViewport({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}
        collapsable={false}
      >
        {ready && (
          <Animated.View entering={FadeIn.duration(180)} style={styles.canvasFill}>
            <Animated.View style={[styles.plane, planeStyle]}>
              {EMOTIONS.map((e) => (
                <PlaneCell
                  key={e.id}
                  emotion={e}
                  selected={selectedSet.has(e.id)}
                  onPress={handleCellPress}
                />
              ))}
            </Animated.View>

            <Animated.View
              style={[
                styles.labelOverlay,
                { left: restLeft, top: restTop, width: restSize, height: restSize },
                labelFade,
                { pointerEvents: labelsShown ? 'box-none' : 'none' },
              ]}
            >
              {OVERLAY_QUADRANTS.map(({ q, top, right }) => (
                <View
                  key={q}
                  style={[styles.labelHalf, { top: top ? 0 : '50%', left: right ? '50%' : 0 }]}
                  pointerEvents="box-none"
                >
                  <Pressable
                    onPress={() => zoomToQuadrant(q)}
                    style={styles.labelChip}
                    accessibilityRole="button"
                    accessibilityLabel={QUADRANT_FEEL[q]}
                  >
                    <EliteText style={[styles.labelText, { color: QUADRANTS[q].color }]}>
                      {QUADRANT_FEEL[q]}
                    </EliteText>
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
});

// ═══ La celda: un Pressable real con la palabra en Text (reglas 1 y 3). ═══

const PlaneCell = memo(function PlaneCell({ emotion, selected, onPress }: {
  emotion: Emotion;
  selected: boolean;
  onPress: (e: Emotion) => void;
}) {
  const rect = cellRect(emotion.gridCol, emotion.gridRow);
  return (
    <Pressable
      onPress={() => onPress(emotion)}
      style={[
        styles.cell,
        {
          left: rect.left, top: rect.top, width: rect.size, height: rect.size,
          backgroundColor: planeCellColor(emotion.gridCol, emotion.gridRow),
        },
        selected && styles.cellSelected,
      ]}
      accessibilityRole="button"
      accessibilityLabel={emotion.label}
      accessibilityState={{ selected }}
    >
      {/* allowFontScaling off: es un rótulo de mapa a tipografía de maqueta;
          la accesibilidad la dan el zoom, la búsqueda y la hoja de definición. */}
      <EliteText allowFontScaling={false} style={styles.cellLabel}>
        {emotion.label}
      </EliteText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  canvas: { flex: 1, overflow: 'hidden' },
  canvasFill: { flex: 1 },

  plane: {
    position: 'absolute',
    width: PLANE_SIZE,
    height: PLANE_SIZE,
    // La cámara traslada/escala desde la esquina: pantalla = mundo * s + t.
    transformOrigin: 'top left',
  },
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PLANE_CELL_PAD_H,
    borderRadius: 5,
    // Borde constante (transparente) → seleccionar no re-acomoda la palabra.
    borderWidth: 1.4,
    borderColor: 'transparent',
  },
  cellSelected: { borderColor: TEXT.primary },
  cellLabel: {
    color: TEXT.primary,
    fontFamily: Fonts.semiBold,
    fontSize: PLANE_FONT_SIZE,
    lineHeight: PLANE_FONT_LINE_HEIGHT,
    textAlign: 'center',
  },

  // Etiquetas de cuadrante — pantalla fija, fuera del transform (no escalan).
  labelOverlay: { position: 'absolute' },
  labelHalf: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelChip: {
    maxWidth: '86%',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(BG.screen, 0.62),
  },
  labelText: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
});
