/**
 * MoodGrid — la cuadrícula del check-in (MB-14 · Pieza 1).
 *
 * Reemplaza a la rueda COMO PUERTA del check-in (EmotionWheel queda intacto
 * para la etapa de exploración): en dispositivo real la rueda no pintaba una
 * sola etiqueta y el toque directo no respondía. Aquí no hay nada que pelear:
 * el nombre es <Text> de React Native (visible siempre, también en Android),
 * el toque es Pressable, y el color lo define la celda.
 *
 * Dos pantallas:
 *  1. Cuatro tarjetas grandes, dos por dos. Describen la sensación, no la
 *     jerga (nadie sabe qué es valencia ni arousal).
 *  2. Las 36 emociones del cuadrante en celdas. El fondo es UN TONO DEL COLOR
 *     DEL CUADRANTE, más intenso a mayor intensidad de la emoción — nunca el
 *     color propio de la emoción (fix de la incoherencia: había amarillos
 *     dentro de la sección roja).
 */
import { useState, useImperativeHandle, forwardRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EMOTIONS, QUADRANTS, type Emotion, type QuadrantKey } from '@/src/data/emotions-library';
import { GRID_ROWS, QUADRANT_FEEL } from '@/src/data/emotion-grid-config';
import { emotionsForQuadrant, cellTone } from '@/src/services/emotion-grid-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { TEXT, withOpacity } from '@/src/constants/brand';

export interface MoodGridHandle {
  /** Abre el cuadrante de la emoción (búsqueda / preselección de Exploración). */
  focusEmotion: (emotionId: string) => void;
}

interface Props {
  selectedIds: string[];
  onEmotionPress: (e: Emotion) => void;
}

export const MoodGrid = forwardRef<MoodGridHandle, Props>(function MoodGrid(
  { selectedIds, onEmotionPress },
  ref,
) {
  const [viewQuadrant, setViewQuadrant] = useState<QuadrantKey | null>(null);

  useImperativeHandle(ref, () => ({
    focusEmotion: (emotionId: string) => {
      const e = EMOTIONS.find((em) => em.id === emotionId);
      if (e) setViewQuadrant(e.quadrant);
    },
  }));

  // ═══ Pantalla uno: los cuatro cuadrantes. Nada más. ═══
  if (viewQuadrant === null) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={styles.quadWrap}>
        {GRID_ROWS.map((row) => (
          <View key={row[0]} style={styles.quadRow}>
            {row.map((q) => {
              const color = QUADRANTS[q].color;
              return (
                <Pressable
                  key={q}
                  onPress={() => { haptic.light(); setViewQuadrant(q); }}
                  style={({ pressed }) => [
                    styles.quadCard,
                    {
                      backgroundColor: withOpacity(color, pressed ? 0.3 : 0.16),
                      borderColor: withOpacity(color, 0.45),
                    },
                  ]}
                >
                  <View style={[styles.quadDot, { backgroundColor: color }]} />
                  <EliteText style={styles.quadFeel}>{QUADRANT_FEEL[q]}</EliteText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    );
  }

  // ═══ Pantalla dos: las 36 emociones del cuadrante ═══
  const qColor = QUADRANTS[viewQuadrant].color;
  const cells = emotionsForQuadrant(viewQuadrant);
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.cellsFlex}>
      <Pressable
        onPress={() => { haptic.light(); setViewQuadrant(null); }}
        style={styles.backRow}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={18} color={TEXT.secondary} />
        <EliteText variant="caption" style={[styles.backFeel, { color: qColor }]}>
          {QUADRANT_FEEL[viewQuadrant]}
        </EliteText>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cellsContent}>
        <View style={styles.cellsWrap}>
          {cells.map((e) => {
            const selected = selectedIds.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => onEmotionPress(e)}
                style={[
                  styles.cell,
                  { backgroundColor: cellTone(viewQuadrant, e.intensity) },
                  selected && styles.cellSelected,
                ]}
              >
                <EliteText style={[styles.cellLabel, selected && styles.cellLabelSelected]}>
                  {e.label}
                </EliteText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Pantalla uno — 2x2 a pantalla completa
  quadWrap: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  quadRow: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  quadCard: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    padding: Spacing.md, justifyContent: 'flex-end', gap: Spacing.sm,
  },
  quadDot: { width: 14, height: 14, borderRadius: 7 },
  quadFeel: {
    color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.bold, lineHeight: 24,
  },

  // Pantalla dos — celdas del cuadrante
  cellsFlex: { flex: 1 },
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  backFeel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  cellsContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.xl },
  cellsWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: Spacing.xs + 2,
  },
  cell: {
    width: '48.8%', minHeight: 48, justifyContent: 'center',
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm + 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cellSelected: { borderColor: TEXT.primary },
  cellLabel: { color: TEXT.primary, fontSize: FontSizes.md, lineHeight: 20 },
  cellLabelSelected: { fontFamily: Fonts.bold },
});
