/**
 * Reports — Hub de reportes en GradientCard: Identidad, Calendario de
 * adherencia, Electrones, Nutrición, Hidratación, Ayuno, Ejercicio, Glucosa,
 * Compliance, Mente y Ciclo.
 *
 * MB-11 C (SPEC Zero→ATP): toggle Semana/Mes/Año, calendario con puntos por
 * métrica, barras meta-cumplida, stats de identidad y secciones
 * personalizables (reordenar + prender/apagar, @atp/reports_sections).
 */
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { AdherenceCalendar } from '@/src/components/reports/AdherenceCalendar';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { useAuth } from '@/src/contexts/auth-context';
import { getMonthAdherence } from '@/src/services/reports/adherence-calendar-service';
import { shiftMonth, type FlagsByDate } from '@/src/services/reports/adherence-calendar-core';
import {
  effectiveOrder, isHidden, moveSection, toggleSection, parsePrefs,
  EMPTY_PREFS, type SectionPrefs,
} from '@/src/services/reports/report-prefs-core';
import {
  generateAndShareConsultaReport,
  CONSULTA_RANGES,
  type ConsultaRangeDays,
} from '@/src/services/salud/consulta-report-service';
import {
  getNutritionReport, getHydrationReport, getExerciseReport,
  getComplianceReport, getFastingReport, getElectronReport, getGlucoseReport,
  getMindReport, getCycleReport, getIdentityStats,
  type ReportPeriod, type NutritionReport, type HydrationReport,
  type ExerciseReport, type ComplianceReport, type FastingReport,
  type ElectronReport, type GlucoseReport, type MindReport, type CycleReport,
  type IdentityStats,
} from '@/src/services/reports-service';

const LIME = '#a8e02a';
const BLUE = '#38bdf8';
const AMBER = '#fbbf24';
const ORANGE = '#fb923c';

type PeriodLabel = 'Semana' | 'Mes' | 'Año' | 'Todo';
const PERIOD_LABELS: readonly PeriodLabel[] = ['Semana', 'Mes', 'Año', 'Todo'];
const LABEL_TO_KEY: Record<PeriodLabel, ReportPeriod> = {
  'Semana': 'week', 'Mes': 'month', 'Año': 'year', 'Todo': 'all',
};

// #5 Batch 2: las cards de YO llegan con foco (?period=month) en vez de aterrizar
// genérico. Param → PeriodLabel inicial (inválido/ausente → Semana).
// '3month' quedó fuera de las pills (MB-11 C: Semana/Mes/Año) — deep links
// viejos caen a Mes.
const KEY_TO_LABEL: Record<string, PeriodLabel> = {
  week: 'Semana', month: 'Mes', '3month': 'Mes', year: 'Año', all: 'Todo',
};

/** Secciones personalizables, en su orden default. */
const SECTION_KEYS = [
  'calendario', 'electrones', 'nutricion', 'hidratacion', 'ayuno',
  'ejercicio', 'glucosa', 'compliance', 'mente', 'ciclo',
] as const;
type SectionKey = typeof SECTION_KEYS[number];

const SECTION_NAMES: Record<SectionKey, string> = {
  calendario: 'Calendario', electrones: 'Electrones', nutricion: 'Nutrición',
  hidratacion: 'Hidratación', ayuno: 'Ayuno', ejercicio: 'Ejercicio',
  glucosa: 'Glucosa', compliance: 'Compliance', mente: 'Mente', ciclo: 'Ciclo',
};

const PREFS_KEY = '@atp/reports_sections';

export default function ReportsScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const { user } = useAuth();
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>(
    KEY_TO_LABEL[params.period ?? ''] ?? 'Semana',
  );
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
  const [identity, setIdentity] = useState<IdentityStats | null>(null);
  const [loading, setLoading] = useState(true);

  // MB-29 P1 (H3): el reporte para el médico — rango elegible + PDF.
  const [consultaRange, setConsultaRange] = useState<ConsultaRangeDays>(30);
  const [consultaSharing, setConsultaSharing] = useState(false);
  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  const handleConsulta = useCallback(async () => {
    if (consultaSharing || !user?.id) return;
    haptic.medium();
    setConsultaSharing(true);
    try {
      const result = await generateAndShareConsultaReport(user.id, firstName, consultaRange);
      if (result === 'unavailable') {
        Alert.alert(
          'Tu versión aún no comparte PDF',
          'Este teléfono trae una versión de la app sin el módulo de PDF. Llega con la próxima actualización de la tienda.',
        );
      } else if (result === 'error') {
        Alert.alert(
          'No se pudo generar',
          'No pudimos leer todos tus registros en este momento. Nada se generó a medias: intenta de nuevo en un momento.',
        );
      }
    } finally {
      setConsultaSharing(false);
    }
  }, [consultaSharing, user?.id, firstName, consultaRange]);

  // MB-11 C: calendario de adherencia (mes visible + flags por día).
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [calFlags, setCalFlags] = useState<FlagsByDate>({});
  const atCurrentMonth = calYear === now.getFullYear() && calMonth0 === now.getMonth();

  // MB-11 C: preferencias de secciones (orden + ocultas) + modo edición.
  const [prefs, setPrefs] = useState<SectionPrefs>(EMPTY_PREFS);
  const [editMode, setEditMode] = useState(false);
  const order = effectiveOrder(SECTION_KEYS, prefs);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => { const p = parsePrefs(raw); if (p) setPrefs(p); })
      .catch(() => {});
  }, []);

  function savePrefs(next: SectionPrefs) {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }

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
      getIdentityStats(),
    ]).then(([el, nu, hy, fa, ex, gl, co, mi, cy, id]) => {
      setElectrons(el); setNutrition(nu); setHydration(hy);
      setFasting(fa); setExercise(ex); setGlucose(gl); setCompliance(co);
      setMind(mi); setCycle(cy); setIdentity(id);
    }).finally(() => setLoading(false));
  }, [period]));

  // Flags del mes visible (independiente del período de las gráficas).
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    getMonthAdherence(user.id, calYear, calMonth0)
      .then((f) => { if (alive) setCalFlags(f); })
      .catch(() => { if (alive) setCalFlags({}); });
    return () => { alive = false; };
  }, [user?.id, calYear, calMonth0]);

  function shiftCalendar(delta: -1 | 1) {
    const [y, m] = shiftMonth(calYear, calMonth0, delta);
    setCalYear(y); setCalMonth0(m);
  }

  // ── Secciones personalizables (MB-11 C). null = sin datos y no se pinta. ──
  const sections: Record<SectionKey, () => ReactNode> = {
    calendario: () => (
      <GradientCard gradient={{ start: 'rgba(26,188,156,0.08)', end: 'rgba(26,188,156,0.02)' }}>
        <SectionHeader icon="calendar-number-outline" color={ATP_BRAND.teal} title="CALENDARIO" />
        <AdherenceCalendar
          year={calYear} month0={calMonth0} flags={calFlags}
          onShift={shiftCalendar} atCurrentMonth={atCurrentMonth}
        />
      </GradientCard>
    ),
    electrones: () => (
      <GradientCard gradient={{ start: 'rgba(168,224,42,0.10)', end: 'rgba(168,224,42,0.02)' }}>
        <SectionHeader icon="flash" color={LIME} title="ELECTRONES" />
        <View style={s.statsRow}>
          <Stat value={`${electrons.avgPerDay} ⚡`} label="promedio/día" />
          <Stat value={`${electrons.total} ⚡`} label="total" />
          <Stat value={`${electrons.bestDay} ⚡`} label="mejor día" />
        </View>
        {electrons.daily.length > 0 && <SimpleBarChart data={electrons.daily} color={LIME} />}
      </GradientCard>
    ),
    nutricion: () => (
      <GradientCard gradient={PILLAR_GRADIENTS.nutrition}>
        <SectionHeader icon="restaurant-outline" color={BLUE} title="NUTRICIÓN" />
        <View style={s.statsRow}>
          <Stat value={`${nutrition.avgCalories}`} label="kcal/día" />
          <Stat value={`${nutrition.avgProtein}g`} label="proteína" />
        </View>
        {nutrition.daily.length > 0 && <SimpleBarChart data={nutrition.daily} color={BLUE} target={2000} />}
      </GradientCard>
    ),
    hidratacion: () => (
      <GradientCard gradient={{ start: 'rgba(96,165,250,0.10)', end: 'rgba(96,165,250,0.02)' }}>
        <SectionHeader icon="water-outline" color="#60a5fa" title="HIDRATACIÓN" />
        <Stat value={hydration.avgMl > 0 ? `${(hydration.avgMl / 1000).toFixed(1)}L/día` : '—'} label="promedio" />
        {/* MB-11 C: barra a color = meta cumplida, gris = no llegó */}
        {hydration.daily.length > 0 && <SimpleBarChart data={hydration.daily} color="#60a5fa" target={2500} colorByTarget />}
      </GradientCard>
    ),
    ayuno: () => (
      <GradientCard gradient={{ start: 'rgba(251,191,36,0.10)', end: 'rgba(251,191,36,0.02)' }}>
        <SectionHeader icon="timer-outline" color={AMBER} title="AYUNO" />
        <View style={s.statsRow}>
          <Stat value={`${fasting.totalFasts}`} label="sesiones" />
          <Stat value={fasting.avgHours > 0 ? `${fasting.avgHours}h` : '—'} label="promedio" />
          <Stat value={fasting.longestFast > 0 ? `${fasting.longestFast}h` : '—'} label="más largo" />
        </View>
        {fasting.daily.some(d => d.value > 0) && <SimpleBarChart data={fasting.daily} color={AMBER} target={16} colorByTarget />}
      </GradientCard>
    ),
    ejercicio: () => (
      <GradientCard gradient={PILLAR_GRADIENTS.fitness}>
        <SectionHeader icon="barbell-outline" color={LIME} title="EJERCICIO" />
        <View style={s.statsRow}>
          <Stat value={`${exercise.sessionsPerWeek}`} label="sesiones/sem" />
          <Stat value={exercise.totalVolumeKg > 0 ? `${(exercise.totalVolumeKg / 1000).toFixed(1)}t` : '—'} label="volumen" />
          <Stat value={`${exercise.prsThisPeriod}`} label="PRs" />
          <Stat value={`${exercise.cardioSessions}`} label="cardio" />
        </View>
      </GradientCard>
    ),
    glucosa: () => glucose.readings > 0 ? (
      <GradientCard gradient={{ start: 'rgba(251,146,60,0.10)', end: 'rgba(251,146,60,0.02)' }}>
        <SectionHeader icon="analytics-outline" color={ORANGE} title="GLUCOSA" />
        <View style={s.statsRow}>
          <Stat value={glucose.avgFasting > 0 ? `${glucose.avgFasting}` : '—'} label="ayuno mg/dL" />
          <Stat value={glucose.avgPostMeal > 0 ? `${glucose.avgPostMeal}` : '—'} label="post-comida" />
          <Stat value={`${glucose.readings}`} label="lecturas" />
        </View>
        {glucose.daily.length > 0 && <SimpleBarChart data={glucose.daily} color={ORANGE} />}
      </GradientCard>
    ) : null,
    compliance: () => (
      <GradientCard gradient={{ start: 'rgba(168,224,42,0.08)', end: 'rgba(168,224,42,0.02)' }}>
        <SectionHeader icon="checkmark-done-outline" color={LIME} title="COMPLIANCE" />
        <Stat value={compliance.avgPct > 0 ? `${compliance.avgPct}%` : '—'} label="promedio" />
        {/* target 75 = ADHERENCE_THRESHOLD (adherence-service) */}
        {compliance.daily.length > 0 && <SimpleBarChart data={compliance.daily} color={LIME} target={75} colorByTarget />}
      </GradientCard>
    ),
    mente: () => (mind.breathingSessions + mind.meditationSessions + mind.journalEntries) > 0 ? (
      <GradientCard gradient={{ start: 'rgba(192,132,252,0.08)', end: 'rgba(192,132,252,0.02)' }}>
        <SectionHeader icon="flower-outline" color="#c084fc" title="MENTE" />
        <View style={s.statsRow}>
          <Stat value={`${mind.breathingSessions}`} label="respiraciones" />
          <Stat value={`${mind.meditationSessions}`} label="meditaciones" />
          <Stat value={`${mind.totalMinutes}`} label="min totales" />
          <Stat value={`${mind.journalEntries}`} label="journal" />
        </View>
      </GradientCard>
    ) : null,
    ciclo: () => cycle.logsCount > 0 ? (
      <GradientCard gradient={{ start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.02)' }}>
        <SectionHeader icon="calendar-outline" color="#fb7185" title="CICLO" />
        <View style={s.statsRow}>
          <Stat value={`${cycle.periodDays}`} label="días periodo" />
          {cycle.avgEnergy > 0 && <Stat value={`${cycle.avgEnergy}`} label="energía prom" />}
          {cycle.avgMood > 0 && <Stat value={`${cycle.avgMood}`} label="humor prom" />}
          <Stat value={`${cycle.logsCount}`} label="registros" />
        </View>
      </GradientCard>
    ) : null,
  };

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Reportes" />
      <View style={s.pillsRow}>
        <View style={{ flex: 1 }}>
          <FilterPills options={PERIOD_LABELS} selected={periodLabel} onSelect={setPeriodLabel} />
        </View>
        {/* MB-11 C: personalizar — reordenar y prender/apagar secciones */}
        <AnimatedPressable
          onPress={() => { haptic.light(); setEditMode(e => !e); }}
          style={[s.gearBtn, editMode && s.gearBtnActive]}
        >
          <Ionicons name="options-outline" size={18} color={editMode ? '#000' : TEXT.secondary} />
        </AnimatedPressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {loading && <EliteText style={s.loadingText}>Cargando...</EliteText>}

        {/* IDENTIDAD — tu historia completa, siempre arriba (MB-11 C) */}
        <Animated.View entering={FadeInUp.delay(30).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(26,188,156,0.10)', end: 'rgba(26,188,156,0.02)' }}>
            <SectionHeader icon="person-outline" color={ATP_BRAND.teal} title="IDENTIDAD" />
            <View style={s.statsRow}>
              <Stat value={identity?.streakCurrent != null ? `${identity.streakCurrent}d` : '—'} label="racha" />
              <Stat value={identity?.streakLongest != null ? `${identity.streakLongest}d` : '—'} label="racha récord" />
              <Stat value={identity?.totalFasts != null ? `${identity.totalFasts}` : '—'} label="ayunos" />
              <Stat value={identity?.longestFastH != null && identity.longestFastH > 0 ? `${identity.longestFastH}h` : '—'} label="ayuno récord" />
              <Stat value={identity?.totalWorkouts != null ? `${identity.totalWorkouts}` : '—'} label="entrenos" />
            </View>
            {identity != null && identity.totalFasts === 0 && identity.totalWorkouts === 0 && (
              <EliteText style={s.emptyHint}>
                Tu historia empieza hoy: cada entreno y cada ayuno que registres se quedan aquí.
              </EliteText>
            )}
          </GradientCard>
        </Animated.View>

        {/* PARA TU CONSULTA — MB-29 P1 (H3): fija, es el trabajo que el
            perfil de glucosa nos contrata. Solo datos, cero interpretación. */}
        <Animated.View entering={FadeInUp.delay(45).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(29,158,117,0.12)', end: 'rgba(29,158,117,0.02)' }}>
            <SectionHeader icon="document-text-outline" color={ATP_BRAND.teal} title="PARA TU CONSULTA" />
            <EliteText style={s.consultaBody}>
              Un PDF con lo que registraste en el rango que elijas: mediciones, laboratorios,
              síntomas e intervenciones. Sin interpretar nada: la lectura la hace tu médico.
            </EliteText>
            <View style={s.consultaRangeRow}>
              {CONSULTA_RANGES.map((d) => (
                <AnimatedPressable
                  key={d}
                  onPress={() => { haptic.light(); setConsultaRange(d); }}
                  style={[s.consultaRangePill, consultaRange === d && s.consultaRangePillActive]}
                >
                  <EliteText style={[s.consultaRangeText, consultaRange === d && s.consultaRangeTextActive]}>
                    {d} días
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
            <AnimatedPressable
              onPress={handleConsulta}
              disabled={consultaSharing}
              style={[s.consultaCta, consultaSharing && s.consultaCtaDisabled]}
            >
              <Ionicons name="share-outline" size={16} color="#000" />
              <EliteText style={s.consultaCtaText}>
                {consultaSharing ? 'Generando…' : 'Generar y compartir PDF'}
              </EliteText>
            </AnimatedPressable>
          </GradientCard>
        </Animated.View>

        {order.map((key, i) => {
          const k = key as SectionKey;
          const hidden = isHidden(prefs, k);
          if (hidden && !editMode) return null;
          const content = sections[k]();
          if (content == null && !editMode) return null;
          return (
            <Animated.View key={k} entering={FadeInUp.delay(60 + i * 30).springify()} style={s.cardWrap}>
              {editMode && (
                <View style={s.editRow}>
                  <EliteText style={s.editName}>{SECTION_NAMES[k]}</EliteText>
                  <View style={s.editControls}>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs({ ...prefs, order: moveSection(order, k, -1) }); }} style={s.editBtn}>
                      <Ionicons name="chevron-up" size={16} color={TEXT.secondary} />
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs({ ...prefs, order: moveSection(order, k, 1) }); }} style={s.editBtn}>
                      <Ionicons name="chevron-down" size={16} color={TEXT.secondary} />
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs(toggleSection({ ...prefs, order }, k)); }} style={s.editBtn}>
                      <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={hidden ? TEXT.tertiary : LIME} />
                    </AnimatedPressable>
                  </View>
                </View>
              )}
              {!hidden && (content ?? (
                // En modo edición una sección sin datos se anuncia, no desaparece.
                <EliteText style={s.emptyHint}>{SECTION_NAMES[k]}: sin datos en este período.</EliteText>
              ))}
            </Animated.View>
          );
        })}

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

  // MB-11 C: pills + botón personalizar
  pillsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: 4, paddingRight: Spacing.md },
  gearBtn: { padding: 8, borderRadius: 999, borderWidth: 1, borderColor: '#2A2A2A' },
  gearBtnActive: { backgroundColor: LIME, borderColor: LIME },
  // MB-11 C: fila de edición por sección (reordenar / ocultar)
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  editName: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#fff', letterSpacing: 1 },
  editControls: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  emptyHint: { fontSize: FontSizes.sm, color: '#888', fontFamily: Fonts.regular, lineHeight: 18, marginTop: 4 },

  // MB-29 P1: card del reporte para la consulta
  consultaBody: { fontSize: FontSizes.sm, color: TEXT.secondary, fontFamily: Fonts.regular, lineHeight: 19, marginBottom: Spacing.sm },
  consultaRangeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  consultaRangePill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#2A2A2A' },
  consultaRangePillActive: { backgroundColor: 'rgba(29,158,117,0.18)', borderColor: ATP_BRAND.teal },
  consultaRangeText: { fontSize: FontSizes.sm, color: TEXT.secondary, fontFamily: Fonts.semiBold },
  consultaRangeTextActive: { color: '#fff' },
  consultaCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingVertical: 12 },
  consultaCtaDisabled: { opacity: 0.7 },
  consultaCtaText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000' },

  cardWrap: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 65 },
  statValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: '#fff' },
  statLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: '#888', letterSpacing: 1, marginTop: 2 },
});
