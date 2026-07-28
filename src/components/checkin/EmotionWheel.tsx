/**
 * EmotionWheel — la rueda de 3 anillos, nueva puerta principal del check-in
 * (MB-10 · Track A). Prototipo validado por Enrique.
 *
 * - 6 núcleos → 13 familias → 144 emociones (jerarquía en emotion-wheel-config,
 *   layout en emotion-wheel-core: arco proporcional, 2.5° por emoción).
 * - Revelado por nivel (A.3): lejos solo se leen los núcleos; tocar un núcleo
 *   mete la cámara a su sector y aparecen sus familias; tocar una familia
 *   revela sus emociones. El resto NO desaparece: se apaga.
 * - Salto de niveles (A.4): cualquier anillo es tocable desde cualquier nivel.
 * - La animación de cámara NUNCA bloquea el siguiente toque.
 * - El mundo se renderiza GRANDE (WHEEL_WORLD) y la cámara lo escala hacia
 *   abajo: en nivel 2 la escala es ~1 y el texto llega nítido.
 * - Contador "N aquí" (A.5): señal de "voy bien, se está acotando".
 */
import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EMOTIONS, type Emotion, type EmotionFamily } from '@/src/data/emotions-library';
import {
  getWheelLayout, sectorFocus, coreLabelMode, familyLabelVisible, emotionLabelVisible,
  radialTextTransform, annularSectorPath, wheelPoint, findEmotionSector, findFamilySector,
  WHEEL_WORLD, CORE_R0, CORE_R1, FAM_R0, FAM_R1, EMO_R0, EMO_R1,
  CORE_FONT_WIDE, CORE_FONT_NARROW, FAM_FONT, EMO_FONT, LEVEL_ZOOM,
  type WheelLevel, type WheelSector, type WheelEmotionSector,
} from '@/src/services/emotion-wheel-core';
import type { EmotionCore } from '@/src/data/emotion-wheel-config';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { BG, BORDER, TEXT, withOpacity } from '@/src/constants/brand';

interface RingPaths {
  cores: string[];
  families: string[];
  emotions: string[];
}
let cachedPaths: RingPaths | null = null;
function getPaths(): RingPaths {
  if (!cachedPaths) {
    const l = getWheelLayout();
    cachedPaths = {
      cores: l.cores.map((s) => annularSectorPath(CORE_R0, CORE_R1, s.startDeg, s.endDeg)),
      families: l.families.map((s) => annularSectorPath(FAM_R0, FAM_R1, s.startDeg, s.endDeg)),
      emotions: l.emotions.map((s) => annularSectorPath(EMO_R0, EMO_R1, s.startDeg, s.endDeg)),
    };
  }
  return cachedPaths;
}

const EMOTION_BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));
const CAMERA_MS = 460;
const EASING = Easing.out(Easing.cubic);

/** Opacidades de relleno: enfocado · resto del anillo ("se apaga") · base. */
const FILL = { focused: 0.52, base: 0.30, dimmed: 0.10 };

export interface WheelFocusState {
  level: WheelLevel;
  core: EmotionCore | null;
  family: EmotionFamily | null;
}

export interface EmotionWheelHandle {
  /** Entra al nivel 2 de la familia de esa emoción (búsqueda · mapa · cuerpo). */
  focusEmotion: (id: string) => void;
  /** Entra al nivel 2 de una familia (puerta del cuerpo). */
  focusFamily: (family: EmotionFamily) => void;
  /** Vuelve al nivel 0. */
  reset: () => void;
}

interface Props {
  selectedIds?: string[];
  onEmotionPress?: (e: Emotion) => void;
  onFocusChange?: (state: WheelFocusState) => void;
}

export const EmotionWheel = memo(forwardRef<EmotionWheelHandle, Props>(function EmotionWheel(
  { selectedIds = [], onEmotionPress, onFocusChange },
  ref,
) {
  const layout = getWheelLayout();
  const paths = getPaths();
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [focus, setFocus] = useState<WheelFocusState>({ level: 0, core: null, family: null });

  const fit = viewport.w > 0 ? Math.min(viewport.w, viewport.h) / WHEEL_WORLD : 0.2;

  // Cámara: punto focal del mundo + multiplicador de zoom (sobre fit).
  const fx = useSharedValue(WHEEL_WORLD / 2);
  const fy = useSharedValue(WHEEL_WORLD / 2);
  const zoomMul = useSharedValue(1);

  const worldStyle = useAnimatedStyle(() => {
    const s = fit * zoomMul.value;
    return {
      transform: [
        { translateX: viewport.w / 2 - fx.value * s },
        { translateY: viewport.h / 2 - fy.value * s },
        { scale: s },
      ],
    };
  }, [fit, viewport]);

  const applyFocus = useCallback((next: WheelFocusState, midDeg: number) => {
    setFocus(next);
    onFocusChange?.(next);
    const target = sectorFocus(midDeg, next.level);
    // withTiming arranca del valor presentado → un toque a media animación
    // simplemente redirige la cámara, nunca bloquea (A.5).
    fx.value = withTiming(target.fx, { duration: CAMERA_MS, easing: EASING });
    fy.value = withTiming(target.fy, { duration: CAMERA_MS, easing: EASING });
    zoomMul.value = withTiming(target.zoomMul, { duration: CAMERA_MS, easing: EASING });
  }, [onFocusChange, fx, fy, zoomMul]);

  const focusCore = useCallback((s: WheelSector) => {
    haptic.light();
    applyFocus({ level: 1, core: s.core, family: null }, s.midDeg);
  }, [applyFocus]);

  const focusFamilySector = useCallback((s: WheelSector) => {
    haptic.light();
    applyFocus({ level: 2, core: s.core, family: s.family ?? null }, s.midDeg);
  }, [applyFocus]);

  const goUp = useCallback(() => {
    haptic.light();
    if (focus.level === 2 && focus.core) {
      const core = layout.cores.find((c) => c.core === focus.core)!;
      applyFocus({ level: 1, core: focus.core, family: null }, core.midDeg);
    } else {
      applyFocus({ level: 0, core: null, family: null }, 0);
    }
  }, [focus, layout, applyFocus]);

  useImperativeHandle(ref, () => ({
    focusEmotion: (id) => {
      const s = findEmotionSector(layout, id);
      if (!s || !s.family) return;
      const fam = findFamilySector(layout, s.family);
      if (fam) applyFocus({ level: 2, core: fam.core, family: s.family }, fam.midDeg);
    },
    focusFamily: (family) => {
      const fam = findFamilySector(layout, family);
      if (fam) applyFocus({ level: 2, core: fam.core, family }, fam.midDeg);
    },
    reset: () => applyFocus({ level: 0, core: null, family: null }, 0),
  }), [layout, applyFocus]);

  const handleEmotionPress = useCallback((s: WheelEmotionSector) => {
    const e = EMOTION_BY_ID.get(s.emotionId);
    if (!e) return;
    haptic.light();
    onEmotionPress?.(e);
  }, [onEmotionPress]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Escala OBJETIVO del nivel actual: decide qué etiquetas se pintan (A.3).
  const targetScale = fit * LEVEL_ZOOM[focus.level];

  // Contador "N aquí" (A.5).
  const count = useMemo(() => {
    if (focus.level === 2 && focus.family) return layout.families.find((f) => f.family === focus.family)?.count ?? 0;
    if (focus.level === 1 && focus.core) return layout.cores.find((c) => c.core === focus.core)?.count ?? 0;
    return layout.emotions.length;
  }, [focus, layout]);

  const backLabel = useMemo(() => {
    if (focus.level === 2 && focus.core) return layout.cores.find((c) => c.core === focus.core)?.label ?? '';
    if (focus.level === 1) return 'Toda la rueda';
    return '';
  }, [focus, layout]);

  const sectorAlpha = useCallback((s: WheelSector): number => {
    if (s.kind === 'emotion' && selectedSet.has(s.key)) return 0.95;
    if (focus.level === 0) return FILL.base;
    if (focus.level === 1) return s.core === focus.core ? FILL.focused : FILL.dimmed;
    // Nivel 2: la familia enfocada brilla; su núcleo respira; el resto se apaga.
    if (s.family && s.family === focus.family) return FILL.focused;
    if (s.core === focus.core) return 0.18;
    return FILL.dimmed;
  }, [focus, selectedSet]);

  return (
    <View
      style={styles.viewport}
      onLayout={(ev) => setViewport({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}
    >
      <Animated.View style={[styles.world, worldStyle]}>
        <Svg width={WHEEL_WORLD} height={WHEEL_WORLD} viewBox={`0 0 ${WHEEL_WORLD} ${WHEEL_WORLD}`}>
          {/* ═══ Anillo interior: NÚCLEOS ═══ */}
          {layout.cores.map((s, i) => (
            <Path
              key={s.key}
              d={paths.cores[i]}
              fill={withOpacity(s.color, sectorAlpha(s))}
              stroke={BG.screen}
              strokeWidth={2}
              onPress={() => focusCore(s)}
            />
          ))}

          {/* ═══ Anillo medio: FAMILIAS ═══ */}
          {layout.families.map((s, i) => (
            <Path
              key={s.key}
              d={paths.families[i]}
              fill={withOpacity(s.color, sectorAlpha(s))}
              stroke={BG.screen}
              strokeWidth={2}
              onPress={() => focusFamilySector(s)}
            />
          ))}

          {/* ═══ Anillo exterior: EMOCIONES (tocable desde cualquier nivel · A.4) ═══ */}
          {layout.emotions.map((s, i) => (
            <Path
              key={s.key}
              d={paths.emotions[i]}
              fill={withOpacity(s.color, sectorAlpha(s))}
              stroke={selectedSet.has(s.emotionId) ? TEXT.primary : BG.screen}
              strokeWidth={selectedSet.has(s.emotionId) ? 3 : 1}
              onPress={() => handleEmotionPress(s)}
            />
          ))}

          {/* ═══ Etiquetas de NÚCLEO — siempre; horizontal si cabe, radial si no ═══ */}
          {layout.cores.map((s) => {
            const mode = coreLabelMode(s);
            if (mode === 'hidden') return null;
            const alpha = focus.level === 0 || s.core === focus.core ? 0.95 : 0.35;
            if (mode === 'horizontal') {
              const p = wheelPoint(s.midDeg, (CORE_R0 + CORE_R1) / 2);
              return (
                <SvgText
                  key={`lbl-${s.key}`}
                  x={p.x}
                  y={p.y + CORE_FONT_WIDE * 0.35}
                  fontSize={CORE_FONT_WIDE}
                  fontFamily={Fonts.extraBold}
                  fill={withOpacity(TEXT.primary, alpha)}
                  textAnchor="middle"
                >
                  {s.label}
                </SvgText>
              );
            }
            const t = radialTextTransform(s.midDeg);
            const p = wheelPoint(s.midDeg, CORE_R0 + 12);
            return (
              <SvgText
                key={`lbl-${s.key}`}
                fontSize={CORE_FONT_NARROW}
                fontFamily={Fonts.extraBold}
                fill={withOpacity(TEXT.primary, alpha)}
                textAnchor={t.anchor}
                transform={`translate(${p.x}, ${p.y}) rotate(${t.rotateDeg})`}
                y={CORE_FONT_NARROW * 0.35}
              >
                {s.label}
              </SvgText>
            );
          })}

          {/* ═══ Etiquetas de FAMILIA — solo las del núcleo enfocado, solo si caben ═══ */}
          {focus.level >= 1 && layout.families.map((s) => {
            if (s.core !== focus.core) return null;
            if (!familyLabelVisible(s, targetScale)) return null;
            const t = radialTextTransform(s.midDeg);
            const p = wheelPoint(s.midDeg, FAM_R0 + 10);
            const alpha = focus.level === 1 || s.family === focus.family ? 0.95 : 0.4;
            return (
              <SvgText
                key={`lbl-${s.key}`}
                fontSize={FAM_FONT}
                fontFamily={Fonts.bold}
                fill={withOpacity(TEXT.primary, alpha)}
                textAnchor={t.anchor}
                transform={`translate(${p.x}, ${p.y}) rotate(${t.rotateDeg})`}
                y={FAM_FONT * 0.35}
              >
                {s.label}
              </SvgText>
            );
          })}

          {/* ═══ Etiquetas de EMOCIÓN — solo la familia enfocada, solo si caben ═══ */}
          {focus.level === 2 && layout.emotions.map((s) => {
            if (s.family !== focus.family) return null;
            if (!emotionLabelVisible(s, targetScale)) return null;
            const t = radialTextTransform(s.midDeg);
            const p = wheelPoint(s.midDeg, EMO_R0 + 8);
            return (
              <SvgText
                key={`lbl-${s.key}`}
                fontSize={EMO_FONT}
                fontFamily={Fonts.semiBold}
                fill={withOpacity(TEXT.primary, selectedSet.has(s.emotionId) ? 1 : 0.92)}
                textAnchor={t.anchor}
                transform={`translate(${p.x}, ${p.y}) rotate(${t.rotateDeg})`}
                y={EMO_FONT * 0.35}
              >
                {s.label}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ═══ Overlay fijo: contador "N aquí" (A.5) + subir de nivel ═══ */}
      <View style={styles.hud} pointerEvents="box-none">
        {focus.level > 0 && (
          <Pressable onPress={goUp} style={styles.backChip} hitSlop={8}>
            <Ionicons name="chevron-back" size={14} color={TEXT.secondary} />
            <EliteText variant="caption" style={styles.backText}>{backLabel}</EliteText>
          </Pressable>
        )}
        <View style={styles.countChip}>
          <EliteText variant="caption" style={styles.countText}>
            {count} aquí
          </EliteText>
        </View>
      </View>
    </View>
  );
}));

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  world: {
    position: 'absolute',
    width: WHEEL_WORLD,
    height: WHEEL_WORLD,
    transformOrigin: 'top left',
  },
  hud: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: withOpacity(BG.card, 0.85),
    borderWidth: 0.5,
    borderColor: BORDER.card,
  },
  backText: { color: TEXT.secondary, fontSize: FontSizes.sm },
  countChip: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: withOpacity(BG.card, 0.85),
    borderWidth: 0.5,
    borderColor: BORDER.card,
  },
  countText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
