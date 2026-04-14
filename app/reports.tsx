/**
 * Reports — Hub de reportes con 7 secciones en GradientCard:
 * Electrones, Nutrición, Hidratación, Ayuno, Ejercicio, Glucosa, Compliance.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import {
  getNutritionReport, getHydrationReport, getExerciseReport,
  getComplianceReport, getFastingReport, getElectronReport, getGlucoseReport,
  getMindReport, getCycleReport,
  type ReportPeriod, type NutritionReport, type HydrationReport,
  type ExerciseReport, type ComplianceReport, type FastingReport,
  type ElectronReport, type GlucoseReport, type MindReport, type CycleReport,
} from '@/src/services/reports-service';

const LIME = '#a8e02a';
const BLUE = '#38bdf8';
const AMBER = '#fbbf24';
const ORANGE = '#fb923c';

type PeriodLabel = 'Semana' | 'Mes' | '3 Meses' | 'Todo';
const PERIOD_LABELS: readonly PeriodLabel[] = ['Semana', 'Mes', '3 Meses', 'Todo'];
const LABEL_TO_KEY: Record<PeriodLabel, ReportPeriod> = {
  'Semana': 'week', 'Mes': 'month', '3 Meses': '3month', 'Todo': 'all',
};

export default function ReportsScreen() {
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>('Semana');
  const period = LABEL_TO_KEY[periodLabel];

  const [electrons, setElectrons] = useState<ElectronReport>({ daily: [], avgPerDay: 0, total: 0, bestDay: 0 });
  const [nutrition, setNutrition] = useState<NutritionReport>({ daily: [], avgCalories: 0, avgProtein: 0, avgScore: 0 });
  const [hydration, setHydration] = useState<HydrationReport>({ daily: [], avgMl: 0 });
  const [fasting, setFasting] = useState<FastingReport>({ totalFasts: 0, avgHours: 0, longestFast: 0, fastsPerWeek: 0, daily: [] });
  const [exercise, setExercise] = useState<ExerciseReport>({ sessionsPerWeek: 0, totalVolumeKg: 0, prsThisPeriod: 0, cardioSessions: 0 });
  const [glucose, setGlucose] = useState<GlucoseReport>({ daily: [], avgFasting: 0, avgPostMeal: 0, readings: 0 });
  const [compliance, setCompliance] = useState<ComplianceReport>({ daily: [], avgPct: 0 });
  const [mind, setMind] = useState<MindReport>({ breathingSessions: 0, meditationSessions: 0, totalMinutes: 0, journalEntries: 0, checkins: 0 });
  const [cycle, setCycle] = useState<CycleReport>({ periodDays: 0, avgEnergy: 0, avgMood: 0, logsCount: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      getElectronReport(period),
      getNutritionReport(period),
      getHydrationReport(period),
      getFastingReport(period),
      getExerciseReport(period),
      getGlucoseReport(period),
      getComplianceReport(period),
      getMindReport(period),
      getCycleReport(period),
    ]).then(([el, nu, hy, fa, ex, gl, co, mi, cy]) => {
      setElectrons(el); setNutrition(nu); setHydration(hy);
      setFasting(fa); setExercise(ex); setGlucose(gl); setCompliance(co);
      setMind(mi); setCycle(cy);
    }).finally(() => setLoading(false));
  }, [period]));

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Reportes" />
      <View style={{ paddingTop: Spacing.sm, paddingBottom: 4 }}>
        <FilterPills options={PERIOD_LABELS} selected={periodLabel} onSelect={setPeriodLabel} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {loading && <EliteText style={s.loadingText}>Cargando...</EliteText>}

        {/* ELECTRONES */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(168,224,42,0.10)', end: 'rgba(168,224,42,0.02)' }}>
            <SectionHeader icon="flash" color={LIME} title="ELECTRONES" />
            <View style={s.statsRow}>
              <Stat value={`${electrons.avgPerDay} ⚡`} label="promedio/día" />
              <Stat value={`${electrons.total} ⚡`} label="total" />
              <Stat value={`${electrons.bestDay} ⚡`} label="mejor día" />
            </View>
            {electrons.daily.length > 0 && <SimpleBarChart data={electrons.daily} color={LIME} />}
          </GradientCard>
        </Animated.View>

        {/* NUTRICIÓN */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.cardWrap}>
          <GradientCard gradient={PILLAR_GRADIENTS.nutrition}>
            <SectionHeader icon="restaurant-outline" color={BLUE} title="NUTRICIÓN" />
            <View style={s.statsRow}>
              <Stat value={`${nutrition.avgCalories}`} label="kcal/día" />
              <Stat value={`${nutrition.avgProtein}g`} label="proteína" />
            </View>
            {nutrition.daily.length > 0 && <SimpleBarChart data={nutrition.daily} color={BLUE} target={2000} />}
          </GradientCard>
        </Animated.View>

        {/* HIDRATACIÓN */}
        <Animated.View entering={FadeInUp.delay(110).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(96,165,250,0.10)', end: 'rgba(96,165,250,0.02)' }}>
            <SectionHeader icon="water-outline" color="#60a5fa" title="HIDRATACIÓN" />
            <Stat value={hydration.avgMl > 0 ? `${(hydration.avgMl / 1000).toFixed(1)}L/día` : '—'} label="promedio" />
            {hydration.daily.length > 0 && <SimpleBarChart data={hydration.daily} color="#60a5fa" target={2500} />}
          </GradientCard>
        </Animated.View>

        {/* AYUNO */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(251,191,36,0.10)', end: 'rgba(251,191,36,0.02)' }}>
            <SectionHeader icon="timer-outline" color={AMBER} title="AYUNO" />
            <View style={s.statsRow}>
              <Stat value={`${fasting.totalFasts}`} label="sesiones" />
              <Stat value={fasting.avgHours > 0 ? `${fasting.avgHours}h` : '—'} label="promedio" />
              <Stat value={fasting.longestFast > 0 ? `${fasting.longestFast}h` : '—'} label="más largo" />
            </View>
            {fasting.daily.some(d => d.value > 0) && <SimpleBarChart data={fasting.daily} color={AMBER} target={16} />}
          </GradientCard>
        </Animated.View>

        {/* EJERCICIO */}
        <Animated.View entering={FadeInUp.delay(170).springify()} style={s.cardWrap}>
          <GradientCard gradient={PILLAR_GRADIENTS.fitness}>
            <SectionHeader icon="barbell-outline" color={LIME} title="EJERCICIO" />
            <View style={s.statsRow}>
              <Stat value={`${exercise.sessionsPerWeek}`} label="sesiones/sem" />
              <Stat value={exercise.totalVolumeKg > 0 ? `${(exercise.totalVolumeKg / 1000).toFixed(1)}t` : '—'} label="volumen" />
              <Stat value={`${exercise.prsThisPeriod}`} label="PRs" />
              <Stat value={`${exercise.cardioSessions}`} label="cardio" />
            </View>
          </GradientCard>
        </Animated.View>

        {/* GLUCOSA */}
        {glucose.readings > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.cardWrap}>
            <GradientCard gradient={{ start: 'rgba(251,146,60,0.10)', end: 'rgba(251,146,60,0.02)' }}>
              <SectionHeader icon="analytics-outline" color={ORANGE} title="GLUCOSA" />
              <View style={s.statsRow}>
                <Stat value={glucose.avgFasting > 0 ? `${glucose.avgFasting}` : '—'} label="ayuno mg/dL" />
                <Stat value={glucose.avgPostMeal > 0 ? `${glucose.avgPostMeal}` : '—'} label="post-comida" />
                <Stat value={`${glucose.readings}`} label="lecturas" />
              </View>
              {glucose.daily.length > 0 && <SimpleBarChart data={glucose.daily} color={ORANGE} />}
            </GradientCard>
          </Animated.View>
        )}

        {/* COMPLIANCE */}
        <Animated.View entering={FadeInUp.delay(230).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(168,224,42,0.08)', end: 'rgba(168,224,42,0.02)' }}>
            <SectionHeader icon="checkmark-done-outline" color={LIME} title="COMPLIANCE" />
            <Stat value={compliance.avgPct > 0 ? `${compliance.avgPct}%` : '—'} label="promedio" />
            {compliance.daily.length > 0 && <SimpleBarChart data={compliance.daily} color={LIME} />}
          </GradientCard>
        </Animated.View>

        {/* MENTE */}
        {(mind.breathingSessions + mind.meditationSessions + mind.journalEntries) > 0 && (
          <Animated.View entering={FadeInUp.delay(250).springify()} style={s.cardWrap}>
            <GradientCard gradient={{ start: 'rgba(192,132,252,0.08)', end: 'rgba(192,132,252,0.02)' }}>
              <SectionHeader icon="flower-outline" color="#c084fc" title="MENTE" />
              <View style={s.statsRow}>
                <Stat value={`${mind.breathingSessions}`} label="respiraciones" />
                <Stat value={`${mind.meditationSessions}`} label="meditaciones" />
                <Stat value={`${mind.totalMinutes}`} label="min totales" />
                <Stat value={`${mind.journalEntries}`} label="journal" />
              </View>
            </GradientCard>
          </Animated.View>
        )}

        {/* CICLO */}
        {cycle.logsCount > 0 && (
          <Animated.View entering={FadeInUp.delay(270).springify()} style={s.cardWrap}>
            <GradientCard gradient={{ start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.02)' }}>
              <SectionHeader icon="calendar-outline" color="#fb7185" title="CICLO" />
              <View style={s.statsRow}>
                <Stat value={`${cycle.periodDays}`} label="días periodo" />
                {cycle.avgEnergy > 0 && <Stat value={`${cycle.avgEnergy}`} label="energía prom" />}
                {cycle.avgMood > 0 && <Stat value={`${cycle.avgMood}`} label="humor prom" />}
                <Stat value={`${cycle.logsCount}`} label="registros" />
              </View>
            </GradientCard>
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ icon, color, title }: { icon: string; color: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={color} />
      <EliteText style={s.sectionTitle}>{title}</EliteText>
    </View>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={s.stat}>
      <EliteText style={s.statValue}>{value}</EliteText>
      <EliteText style={s.statLabel}>{label}</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  loadingText: { color: '#888', fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.lg },

  cardWrap: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 65 },
  statValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: '#fff' },
  statLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: '#888', letterSpacing: 1, marginTop: 2 },
});
