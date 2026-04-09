/**
 * Fitness Mobility — Pantalla dedicada a la evaluacion de movilidad.
 *
 * Sale del fitness-hub: muestra el score general y los 7 tests
 * de la ultima evaluacion guardada.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  getLastMobilityAssessment,
  type MobilityAssessment,
} from '@/src/services/fitness-service';

const PURPLE = '#c084fc';
const PURPLE_GRADIENT = { start: 'rgba(192,132,252,0.10)', end: 'rgba(192,132,252,0.02)' };

export default function FitnessMobilityScreen() {
  const router = useRouter();
  const [last, setLast] = useState<MobilityAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    getLastMobilityAssessment().then(d => { setLast(d); setLoaded(true); });
  }, []));

  if (!loaded) {
    return (
      <Screen>
        <PillarHeader pillar="fitness" title="Movilidad" />
        <View style={s.emptyState}>
          <EliteText style={s.emptyDesc}>Cargando…</EliteText>
        </View>
      </Screen>
    );
  }

  if (!last) {
    return (
      <Screen>
        <PillarHeader pillar="fitness" title="Movilidad" />
        <View style={s.content}>
          <View style={s.emptyState}>
            <Ionicons name="body-outline" size={48} color="#333" />
            <EliteText style={s.emptyTitle}>Sin evaluación de movilidad</EliteText>
            <EliteText style={s.emptyDesc}>
              Evalúa tu movilidad para identificar áreas de mejora.
            </EliteText>
          </View>
          <AnimatedPressable
            style={s.ctaButton}
            onPress={() => { haptic.medium(); router.push('/mobility-assessment' as any); }}
          >
            <Ionicons name="clipboard-outline" size={20} color="#000" />
            <EliteText style={s.ctaText}>HACER EVALUACIÓN</EliteText>
          </AnimatedPressable>
        </View>
      </Screen>
    );
  }

  const dateLabel = new Date(last.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

  const rows: { label: string; value: string }[] = [
    { label: 'Sentadilla profunda', value: last.deep_squat != null ? `${last.deep_squat}/10` : '—' },
    { label: 'Overhead squat', value: last.overhead_squat != null ? `${last.overhead_squat}/10` : '—' },
    { label: 'Toe touch', value: last.toe_touch_cm != null ? `${last.toe_touch_cm}cm` : '—' },
    { label: 'Hombro izq / der', value: `${last.shoulder_rotation_l ?? '—'} / ${last.shoulder_rotation_r ?? '—'}` },
    { label: 'Cadera izq / der', value: `${last.hip_flexion_l ?? '—'} / ${last.hip_flexion_r ?? '—'}` },
    { label: 'Tobillo izq / der', value: `${last.ankle_dorsiflexion_l_cm ?? '—'} / ${last.ankle_dorsiflexion_r_cm ?? '—'} cm` },
    { label: 'Rotación torácica', value: `${last.thoracic_rotation_l ?? '—'} / ${last.thoracic_rotation_r ?? '—'}` },
  ];

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Movilidad" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>{`ÚLTIMA EVALUACIÓN · ${dateLabel.toUpperCase()}`}</SectionTitle>

        <GradientCard gradient={PURPLE_GRADIENT} accentColor={PURPLE} accentPosition="left" style={s.scoreCardWrap}>
          <View style={s.scoreCardRow}>
            <View>
              <EliteText style={[s.scoreNum, { color: PURPLE }]}>
                {last.overall_score?.toFixed(1) ?? '—'}
              </EliteText>
              <EliteText style={s.scoreLabel}>SCORE GENERAL /10</EliteText>
            </View>
            <Ionicons name="body-outline" size={48} color={PURPLE} />
          </View>
        </GradientCard>

        <GradientCard gradient={PURPLE_GRADIENT} style={s.testsCardWrap}>
          {rows.map((r, i) => (
            <View key={i} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <EliteText style={s.rowLabel}>{r.label}</EliteText>
              <EliteText style={s.rowValue}>{r.value}</EliteText>
            </View>
          ))}
        </GradientCard>

        <AnimatedPressable
          style={s.ctaButton}
          onPress={() => { haptic.medium(); router.push('/mobility-assessment' as any); }}
        >
          <Ionicons name="clipboard-outline" size={20} color="#000" />
          <EliteText style={s.ctaText}>NUEVA EVALUACIÓN</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  scoreCardWrap: { marginBottom: Spacing.sm },
  scoreCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreNum: {
    fontSize: FontSizes.mega,
    fontFamily: Fonts.bold,
  },
  scoreLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  testsCardWrap: { marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
  },
  rowValue: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: PURPLE,
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
