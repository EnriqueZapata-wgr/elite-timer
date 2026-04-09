/**
 * Reports — Pantalla de reportes (estilo Oura) con graficas:
 *   - Selector de periodo (Semana / Mes / 3 Meses / Todo)
 *   - Nutricion (calorias diarias + promedios)
 *   - Hidratacion (ml diarios)
 *   - Ejercicio (sesiones, volumen, PRs)
 *   - Compliance (% diario de cumplimiento)
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart, SimpleLineChart } from '@/src/components/charts/SimpleCharts';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, PILLAR_GRADIENTS } from '@/src/constants/brand';
import {
  getNutritionReport,
  getHydrationReport,
  getExerciseReport,
  getComplianceReport,
  getFastingReport,
  type ReportPeriod,
  type NutritionReport,
  type HydrationReport,
  type ExerciseReport,
  type ComplianceReport,
  type FastingReport,
} from '@/src/services/reports-service';

const LIME = CATEGORY_COLORS.fitness;
const BLUE = CATEGORY_COLORS.nutrition;
const HYDRATION_BLUE = '#38bdf8';
const AMBER = '#fbbf24';

const HYDRATION_GRADIENT = { start: 'rgba(56,189,248,0.10)', end: 'rgba(56,189,248,0.02)' };
const FASTING_GRADIENT = { start: 'rgba(251,191,36,0.10)', end: 'rgba(251,191,36,0.02)' };
const COMPLIANCE_GRADIENT = { start: 'rgba(168,224,42,0.10)', end: 'rgba(168,224,42,0.02)' };

type PeriodLabel = 'Semana' | 'Mes' | '3 Meses' | 'Todo';
const PERIOD_LABELS: readonly PeriodLabel[] = ['Semana', 'Mes', '3 Meses', 'Todo'];
const LABEL_TO_KEY: Record<PeriodLabel, ReportPeriod> = {
  'Semana': 'week',
  'Mes': 'month',
  '3 Meses': '3month',
  'Todo': 'all',
};

export default function ReportsScreen() {
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>('Semana');
  const period = LABEL_TO_KEY[periodLabel];

  const [nutrition, setNutrition] = useState<NutritionReport>({ daily: [], avgCalories: 0, avgProtein: 0, avgScore: 0 });
  const [hydration, setHydration] = useState<HydrationReport>({ daily: [], avgMl: 0 });
  const [exercise, setExercise] = useState<ExerciseReport>({ sessionsPerWeek: 0, totalVolumeKg: 0, prsThisPeriod: 0, cardioSessions: 0 });
  const [compliance, setCompliance] = useState<ComplianceReport>({ daily: [], avgPct: 0 });
  const [fasting, setFasting] = useState<FastingReport>({ totalFasts: 0, avgHours: 0, longestFast: 0, fastsPerWeek: 0, daily: [] });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      getNutritionReport(period),
      getHydrationReport(period),
      getExerciseReport(period),
      getComplianceReport(period),
      getFastingReport(period),
    ]).then(([n, h, e, c, f]) => {
      setNutrition(n);
      setHydration(h);
      setExercise(e);
      setCompliance(c);
      setFasting(f);
    }).finally(() => setLoading(false));
  }, [period]));

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Reportes" />

      {/* Selector de periodo */}
      <View style={s.periodWrap}>
        <FilterPills options={PERIOD_LABELS} selected={periodLabel} onSelect={setPeriodLabel} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {loading && (
          <View style={s.loadingBox}>
            <EliteText style={s.loadingText}>Cargando reporte…</EliteText>
          </View>
        )}

        {/* NUTRICION */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.cardSpacing}>
          <GradientCard gradient={PILLAR_GRADIENTS.nutrition}>
            <View style={s.chartHeader}>
              <Ionicons name="nutrition-outline" size={20} color={BLUE} />
              <EliteText style={s.chartTitle}>NUTRICIÓN</EliteText>
            </View>

            <View style={s.statsRow}>
              <Stat value={nutrition.avgCalories || '—'} label="kcal/día" />
              <Stat value={`${nutrition.avgProtein || '—'}g`} label="proteína" />
              <Stat value={nutrition.avgScore || '—'} label="score" />
            </View>

            {nutrition.daily.length > 0 && (
              <SimpleBarChart data={nutrition.daily} color={BLUE} unit="" target={2000} />
            )}
          </GradientCard>
        </Animated.View>

        {/* HIDRATACION */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={s.cardSpacing}>
          <GradientCard gradient={HYDRATION_GRADIENT}>
            <View style={s.chartHeader}>
              <Ionicons name="water-outline" size={20} color={HYDRATION_BLUE} />
              <EliteText style={s.chartTitle}>HIDRATACIÓN</EliteText>
            </View>

            <View style={s.statsRow}>
              <Stat value={hydration.avgMl > 0 ? `${(hydration.avgMl / 1000).toFixed(1)}L` : '—'} label="promedio" />
            </View>

            {hydration.daily.length > 0 && (
              <SimpleBarChart data={hydration.daily} color={HYDRATION_BLUE} unit="ml" target={2500} />
            )}
          </GradientCard>
        </Animated.View>

        {/* AYUNO */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={s.cardSpacing}>
          <GradientCard gradient={FASTING_GRADIENT}>
            <View style={s.chartHeader}>
              <Ionicons name="timer-outline" size={20} color={AMBER} />
              <EliteText style={s.chartTitle}>AYUNO</EliteText>
            </View>

            <View style={s.statsRow}>
              <Stat value={fasting.avgHours > 0 ? `${fasting.avgHours}h` : '—'} label="promedio" />
              <Stat value={fasting.longestFast > 0 ? `${fasting.longestFast}h` : '—'} label="más largo" />
              <Stat value={fasting.fastsPerWeek > 0 ? `${fasting.fastsPerWeek}` : '—'} label="por sem" />
            </View>

            {fasting.daily.length > 0 && fasting.daily.some(d => d.value > 0) && (
              <SimpleBarChart data={fasting.daily} color={AMBER} unit="h" target={16} />
            )}
          </GradientCard>
        </Animated.View>

        {/* EJERCICIO */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.cardSpacing}>
          <GradientCard gradient={PILLAR_GRADIENTS.fitness}>
            <View style={s.chartHeader}>
              <Ionicons name="barbell-outline" size={20} color={LIME} />
              <EliteText style={s.chartTitle}>EJERCICIO</EliteText>
            </View>

            <View style={s.statsRow}>
              <Stat value={exercise.sessionsPerWeek} label="sesiones/sem" />
              <Stat value={exercise.totalVolumeKg > 0 ? `${(exercise.totalVolumeKg / 1000).toFixed(1)}t` : '—'} label="volumen" />
              <Stat value={exercise.prsThisPeriod} label="PRs" />
              <Stat value={exercise.cardioSessions} label="cardio" />
            </View>
          </GradientCard>
        </Animated.View>

        {/* COMPLIANCE */}
        <Animated.View entering={FadeInUp.delay(250).springify()} style={s.cardSpacing}>
          <GradientCard gradient={COMPLIANCE_GRADIENT}>
            <View style={s.chartHeader}>
              <Ionicons name="checkmark-done-outline" size={20} color={LIME} />
              <EliteText style={s.chartTitle}>COMPLIANCE</EliteText>
            </View>

            <View style={s.statsRow}>
              <Stat value={compliance.avgPct > 0 ? `${compliance.avgPct}%` : '—'} label="promedio" />
            </View>

            {compliance.daily.length > 0 && (
              compliance.daily.length >= 14 ? (
                <SimpleLineChart data={compliance.daily} color={LIME} target={80} />
              ) : (
                <SimpleBarChart data={compliance.daily} color={LIME} unit="%" target={80} />
              )
            )}
          </GradientCard>
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

// === STAT ITEM ===
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={s.stat}>
      <EliteText style={s.statValue}>{value}</EliteText>
      <EliteText style={s.statLabel}>{label.toUpperCase()}</EliteText>
    </View>
  );
}

// === ESTILOS ===
const s = StyleSheet.create({
  // Selector de periodo
  periodWrap: {
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },

  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  loadingBox: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },

  // Chart cards (wrapper para el GradientCard)
  cardSpacing: {
    marginBottom: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  chartTitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 2,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  stat: {
    flex: 1,
    minWidth: 70,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  statLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
});
