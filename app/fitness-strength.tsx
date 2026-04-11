/**
 * Fitness Strength — Pantalla dedicada a benchmarks de fuerza.
 *
 * Sale del fitness-hub: muestra 6 ejercicios benchmark con sus
 * variantes y el PR actual del usuario. Tap en card -> log-exercise.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, CARD, PILLAR_GRADIENTS } from '@/src/constants/brand';
import {
  getBenchmarksWithVariants,
  type BenchmarkExercise,
} from '@/src/services/fitness-service';

const LIME = CATEGORY_COLORS.fitness;

export default function FitnessStrengthScreen() {
  const router = useRouter();
  const [benchmarks, setBenchmarks] = useState<BenchmarkExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    getBenchmarksWithVariants()
      .then(setBenchmarks)
      .finally(() => setLoading(false));
  }, []));

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Fuerza" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>BENCHMARKS</SectionTitle>

        {loading && (
          <View style={s.emptyState}>
            <EliteText style={s.emptyDesc}>Cargando…</EliteText>
          </View>
        )}

        {!loading && benchmarks.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="barbell-outline" size={36} color="#333" />
            <EliteText style={s.emptyTitle}>Sin benchmarks aún</EliteText>
            <EliteText style={s.emptyDesc}>Ejecuta la migración 036 en Supabase para sembrarlos.</EliteText>
          </View>
        )}

        {benchmarks.map((ex, idx) => (
          <Animated.View key={ex.id} entering={FadeInUp.delay(50 + idx * 30).springify()}>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/log-exercise', params: { exerciseId: ex.id } } as any); }}
              style={s.benchmarkWrap}
            >
              <GradientCard gradient={PILLAR_GRADIENTS.fitness} accentColor={LIME} accentPosition="left">
                <View style={s.benchmarkHeader}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.benchmarkName}>{ex.name_es}</EliteText>
                    {ex.muscle_groups && ex.muscle_groups.length > 0 && (
                      <EliteText style={s.benchmarkMuscles}>{ex.muscle_groups.slice(0, 3).join(' · ').toUpperCase()}</EliteText>
                    )}
                    {/* PR con ícono trophy */}
                    {ex.currentPR != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="trophy" size={14} color="#fbbf24" />
                        <EliteText style={{ color: '#fbbf24', fontSize: 13, fontFamily: Fonts.bold }}>
                          {ex.currentPR}kg
                        </EliteText>
                        {ex.estimated1RM != null && (
                          <EliteText style={{ color: '#888', fontSize: 11 }}>
                            · {ex.estimated1RM}kg 1RM
                          </EliteText>
                        )}
                      </View>
                    )}
                  </View>
                  {/* Botón registrar */}
                  <AnimatedPressable onPress={() => {
                    haptic.medium();
                    router.push({ pathname: '/log-exercise', params: { exerciseId: ex.id } } as any);
                  }}>
                    <View style={{ backgroundColor: 'rgba(168,224,42,0.15)', borderRadius: 12, padding: 10 }}>
                      <Ionicons name="add" size={20} color={LIME} />
                    </View>
                  </AnimatedPressable>
                </View>

                {/* Variantes tappables */}
                {ex.variants.length > 0 && (
                  <View style={s.variantsRow}>
                    {ex.variants.slice(0, 5).map(v => (
                      <AnimatedPressable
                        key={v.id}
                        onPress={() => { haptic.light(); router.push({ pathname: '/log-exercise', params: { exerciseId: v.id } } as any); }}
                      >
                        <View style={s.variantChip}>
                          <EliteText style={s.variantChipText}>{v.name_es}</EliteText>
                        </View>
                      </AnimatedPressable>
                    ))}
                    {ex.variants.length > 5 && (
                      <View style={s.variantChip}>
                        <EliteText style={s.variantChipText}>+{ex.variants.length - 5}</EliteText>
                      </View>
                    )}
                  </View>
                )}
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}

        <AnimatedPressable style={s.ctaButton} onPress={() => { haptic.medium(); router.push('/log-exercise'); }}>
          <Ionicons name="add-circle-outline" size={20} color="#000" />
          <EliteText style={s.ctaText}>REGISTRAR EJERCICIO</EliteText>
        </AnimatedPressable>

        <AnimatedPressable style={s.ctaButtonGhost} onPress={() => { haptic.light(); router.push('/personal-records'); }}>
          <Ionicons name="trophy-outline" size={18} color={LIME} />
          <EliteText style={s.ctaTextGhost}>VER TODOS LOS PRs</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  benchmarkWrap: { marginBottom: Spacing.sm },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  benchmarkName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  benchmarkMuscles: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  variantChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(168,224,42,0.10)',
  },
  variantChipText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: LIME,
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: LIME,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1.5,
  },
  ctaButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: CARD.bg,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.3)',
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  ctaTextGhost: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: LIME,
    letterSpacing: 1.5,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  emptyDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
