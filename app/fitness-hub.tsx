/**
 * Fitness Hub — Centro completo de Fitness con 4 tabs:
 *   - Fuerza:    benchmarks + variantes + registrar + historial
 *   - Cardio:    4 disciplinas + ultima sesion + PRs
 *   - Movilidad: ultima evaluacion + tests + score
 *   - HIIT:      presets de Tabata/EMOM/AMRAP + crear personalizado
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, CARD } from '@/src/constants/brand';
import {
  getBenchmarksWithVariants,
  getLastCardioSessions,
  getCardioRecordsByDiscipline,
  getLastMobilityAssessment,
  formatDuration,
  formatPace,
  type BenchmarkExercise,
  type CardioDiscipline,
  type CardioSession,
  type CardioRecord,
  type MobilityAssessment,
} from '@/src/services/fitness-service';
import { getWeeklyStats } from '@/src/services/exercise-service';

const LIME = CATEGORY_COLORS.fitness;
type TabLabel = 'Fuerza' | 'Cardio' | 'Movilidad' | 'HIIT';
const TAB_LABELS: readonly TabLabel[] = ['Fuerza', 'Cardio', 'Movilidad', 'HIIT'];

export default function FitnessHubScreen() {
  const [activeTab, setActiveTab] = useState<TabLabel>('Fuerza');

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Fitness" />

      <ResumenHoy />

      <View style={s.tabsWrap}>
        <FilterPills options={TAB_LABELS} selected={activeTab} onSelect={setActiveTab} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {activeTab === 'Fuerza'    && <StrengthTab key="strength" />}
        {activeTab === 'Cardio'    && <CardioTab    key="cardio" />}
        {activeTab === 'Movilidad' && <MobilityTab  key="mobility" />}
        {activeTab === 'HIIT'      && <HIITTab      key="hiit" />}
        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────
// RESUMEN DE HOY
// ─────────────────────────────────────────────────────
function ResumenHoy() {
  const [stats, setStats] = useState<{ workouts: number; volumeKg: number; prs: number }>({ workouts: 0, volumeKg: 0, prs: 0 });

  useFocusEffect(useCallback(() => {
    getWeeklyStats().then(s => setStats({ workouts: s.workouts, volumeKg: s.volumeKg, prs: s.prs }));
  }, []));

  return (
    <Animated.View entering={FadeInUp.delay(50).springify()} style={s.summaryCard}>
      <EliteText style={s.summaryTitle}>RESUMEN DE LA SEMANA</EliteText>
      <View style={s.summaryRow}>
        <View style={s.summaryStat}>
          <EliteText style={s.summaryValue}>{stats.workouts}</EliteText>
          <EliteText style={s.summaryLabel}>SESIONES</EliteText>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryStat}>
          <EliteText style={s.summaryValue}>{stats.volumeKg > 0 ? `${(stats.volumeKg / 1000).toFixed(1)}t` : '0'}</EliteText>
          <EliteText style={s.summaryLabel}>VOLUMEN</EliteText>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryStat}>
          <EliteText style={s.summaryValue}>{stats.prs}</EliteText>
          <EliteText style={s.summaryLabel}>PRs</EliteText>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────
// TAB FUERZA
// ─────────────────────────────────────────────────────
function StrengthTab() {
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
    <View>
      <SectionTitle>BENCHMARKS</SectionTitle>

      {loading && (
        <View style={s.emptyState}>
          <EliteText style={s.emptyDesc}>Cargando…</EliteText>
        </View>
      )}

      {!loading && benchmarks.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="barbell-outline" size={36} color="#333" />
          <EliteText style={s.emptyTitle}>Sin benchmarks aun</EliteText>
          <EliteText style={s.emptyDesc}>Ejecuta la migracion 036 en Supabase para sembrarlos.</EliteText>
        </View>
      )}

      {benchmarks.map((ex, idx) => (
        <Animated.View key={ex.id} entering={FadeInUp.delay(50 + idx * 30).springify()}>
          <AnimatedPressable
            style={s.benchmarkCard}
            onPress={() => { haptic.light(); router.push({ pathname: '/log-exercise', params: { exerciseId: ex.id } } as any); }}
          >
            <View style={s.benchmarkHeader}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.benchmarkName}>{ex.name_es}</EliteText>
                {ex.muscle_groups && ex.muscle_groups.length > 0 && (
                  <EliteText style={s.benchmarkMuscles}>{ex.muscle_groups.slice(0, 3).join(' · ').toUpperCase()}</EliteText>
                )}
              </View>
              <View style={s.benchmarkPRBox}>
                <EliteText style={s.benchmarkPR}>{ex.currentPR != null ? `${ex.currentPR}kg` : '—'}</EliteText>
                <EliteText style={s.benchmarkPRLabel}>PR</EliteText>
              </View>
            </View>

            {ex.variants.length > 0 && (
              <View style={s.variantsRow}>
                {ex.variants.slice(0, 4).map(v => (
                  <View key={v.id} style={s.variantChip}>
                    <EliteText style={s.variantChipText}>{v.name_es}</EliteText>
                  </View>
                ))}
                {ex.variants.length > 4 && (
                  <View style={s.variantChip}>
                    <EliteText style={s.variantChipText}>+{ex.variants.length - 4}</EliteText>
                  </View>
                )}
              </View>
            )}
          </AnimatedPressable>
        </Animated.View>
      ))}

      <AnimatedPressable
        style={s.ctaButton}
        onPress={() => { haptic.medium(); router.push('/log-exercise'); }}
      >
        <Ionicons name="add-circle-outline" size={20} color="#000" />
        <EliteText style={s.ctaText}>REGISTRAR EJERCICIO</EliteText>
      </AnimatedPressable>

      <AnimatedPressable
        style={s.ctaButtonGhost}
        onPress={() => { haptic.light(); router.push('/personal-records'); }}
      >
        <Ionicons name="trophy-outline" size={18} color={LIME} />
        <EliteText style={s.ctaTextGhost}>VER TODOS LOS PRs</EliteText>
      </AnimatedPressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// TAB CARDIO
// ─────────────────────────────────────────────────────
const DISCIPLINES: { key: CardioDiscipline; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'running',  name: 'Correr',   icon: 'walk-outline' },
  { key: 'cycling',  name: 'Ciclismo', icon: 'bicycle-outline' },
  { key: 'swimming', name: 'Natacion', icon: 'water-outline' },
  { key: 'rowing',   name: 'Remo',     icon: 'boat-outline' },
];

function CardioTab() {
  const router = useRouter();
  const [lastByDiscipline, setLastByDiscipline] = useState<Record<CardioDiscipline, CardioSession | null>>({
    running: null, cycling: null, swimming: null, rowing: null, other: null,
  });
  const [recordsByDiscipline, setRecordsByDiscipline] = useState<Record<CardioDiscipline, CardioRecord[]>>({
    running: [], cycling: [], swimming: [], rowing: [], other: [],
  });

  useFocusEffect(useCallback(() => {
    Promise.all([getLastCardioSessions(), getCardioRecordsByDiscipline()])
      .then(([last, recs]) => {
        setLastByDiscipline(last);
        setRecordsByDiscipline(recs);
      });
  }, []));

  return (
    <View>
      <SectionTitle>DISCIPLINAS</SectionTitle>

      {DISCIPLINES.map((d, i) => {
        const last = lastByDiscipline[d.key];
        const records = recordsByDiscipline[d.key] ?? [];

        return (
          <Animated.View key={d.key} entering={FadeInUp.delay(50 + i * 40).springify()}>
            <AnimatedPressable
              style={s.disciplineCard}
              onPress={() => { haptic.light(); router.push({ pathname: '/log-cardio', params: { discipline: d.key } } as any); }}
            >
              <View style={s.disciplineHeader}>
                <Ionicons name={d.icon} size={22} color={LIME} />
                <EliteText style={s.disciplineName}>{d.name}</EliteText>
              </View>

              {last && last.distance_meters && last.duration_seconds ? (
                <EliteText style={s.disciplineLast}>
                  Última: {(last.distance_meters / 1000).toFixed(2)} km en {formatDuration(last.duration_seconds)}
                  {last.avg_pace_seconds_per_km ? ` · ${formatPace(last.avg_pace_seconds_per_km)}` : ''}
                </EliteText>
              ) : (
                <EliteText style={s.disciplineEmpty}>Sin sesiones registradas</EliteText>
              )}

              {records.length > 0 && (
                <View style={s.prsRow}>
                  {records.slice(0, 5).map(pr => (
                    <View key={pr.id} style={s.prChip}>
                      <EliteText style={s.prChipLabel}>{pr.distance_label}</EliteText>
                      <EliteText style={s.prChipValue}>{formatDuration(pr.best_time_seconds)}</EliteText>
                    </View>
                  ))}
                </View>
              )}
            </AnimatedPressable>
          </Animated.View>
        );
      })}

      <AnimatedPressable
        style={s.ctaButton}
        onPress={() => { haptic.medium(); router.push('/log-cardio' as any); }}
      >
        <Ionicons name="add-circle-outline" size={20} color="#000" />
        <EliteText style={s.ctaText}>REGISTRAR SESION CARDIO</EliteText>
      </AnimatedPressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// TAB MOVILIDAD
// ─────────────────────────────────────────────────────
function MobilityTab() {
  const router = useRouter();
  const [last, setLast] = useState<MobilityAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    getLastMobilityAssessment().then(d => { setLast(d); setLoaded(true); });
  }, []));

  if (!loaded) {
    return <View style={s.emptyState}><EliteText style={s.emptyDesc}>Cargando…</EliteText></View>;
  }

  if (!last) {
    return (
      <View>
        <View style={s.emptyState}>
          <Ionicons name="body-outline" size={40} color="#333" />
          <EliteText style={s.emptyTitle}>Sin evaluacion de movilidad</EliteText>
          <EliteText style={s.emptyDesc}>Evalua tu movilidad para identificar areas de mejora.</EliteText>
        </View>
        <AnimatedPressable
          style={s.ctaButton}
          onPress={() => { haptic.medium(); router.push('/mobility-assessment' as any); }}
        >
          <Ionicons name="clipboard-outline" size={20} color="#000" />
          <EliteText style={s.ctaText}>HACER EVALUACION</EliteText>
        </AnimatedPressable>
      </View>
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
    { label: 'Rotacion toracica', value: `${last.thoracic_rotation_l ?? '—'} / ${last.thoracic_rotation_r ?? '—'}` },
  ];

  return (
    <View>
      <SectionTitle>{`ÚLTIMA EVALUACIÓN · ${dateLabel.toUpperCase()}`}</SectionTitle>

      <View style={s.mobilityScoreCard}>
        <View>
          <EliteText style={s.mobilityScore}>{last.overall_score?.toFixed(1) ?? '—'}</EliteText>
          <EliteText style={s.mobilityScoreLabel}>SCORE GENERAL /10</EliteText>
        </View>
        <Ionicons name="body-outline" size={40} color={LIME} />
      </View>

      <View style={s.benchmarkCard}>
        {rows.map((r, i) => (
          <View key={i} style={s.mobilityRow}>
            <EliteText style={s.mobilityLabel}>{r.label}</EliteText>
            <EliteText style={s.mobilityValue}>{r.value}</EliteText>
          </View>
        ))}
      </View>

      <AnimatedPressable
        style={s.ctaButton}
        onPress={() => { haptic.medium(); router.push('/mobility-assessment' as any); }}
      >
        <Ionicons name="clipboard-outline" size={20} color="#000" />
        <EliteText style={s.ctaText}>NUEVA EVALUACIÓN</EliteText>
      </AnimatedPressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// TAB HIIT
// ─────────────────────────────────────────────────────
interface HIITPreset {
  name: string;
  description: string;
  metaText: string;
  params: Record<string, string>;
}

const HIIT_PRESETS: HIITPreset[] = [
  {
    name: 'Tabata clasico',
    description: '20s maximo esfuerzo / 10s descanso x 8 rondas',
    metaText: '20/10 x 8 · 4 min',
    params: { mode: 'tabata', work: '20', rest: '10', rounds: '8' },
  },
  {
    name: 'EMOM 10 min',
    description: 'Every Minute On the Minute — 1 ejercicio cada minuto',
    metaText: '10 min',
    params: { mode: 'emom', duration: '600' },
  },
  {
    name: 'AMRAP 15 min',
    description: 'As Many Rounds As Possible en 15 minutos',
    metaText: '15 min',
    params: { mode: 'amrap', duration: '900' },
  },
  {
    name: '30/30 x 10',
    description: '30s trabajo / 30s descanso x 10 rondas',
    metaText: '30/30 x 10 · 10 min',
    params: { mode: 'intervals', work: '30', rest: '30', rounds: '10' },
  },
];

function HIITTab() {
  const router = useRouter();

  const startPreset = (preset: HIITPreset) => {
    haptic.medium();
    router.push({ pathname: '/timer', params: preset.params } as any);
  };

  return (
    <View>
      <SectionTitle>WORKOUTS</SectionTitle>

      {HIIT_PRESETS.map((preset, i) => (
        <Animated.View key={preset.name} entering={FadeInUp.delay(50 + i * 40).springify()}>
          <AnimatedPressable style={s.hiitCard} onPress={() => startPreset(preset)}>
            <View style={{ flex: 1 }}>
              <EliteText style={s.hiitName}>{preset.name}</EliteText>
              <EliteText style={s.hiitDesc}>{preset.description}</EliteText>
              <EliteText style={s.hiitMeta}>{preset.metaText}</EliteText>
            </View>
            <View style={s.playBtnSmall}>
              <Ionicons name="play" size={14} color="#000" />
            </View>
          </AnimatedPressable>
        </Animated.View>
      ))}

      <AnimatedPressable
        style={s.ctaButtonGhost}
        onPress={() => { haptic.light(); router.push('/builder'); }}
      >
        <Ionicons name="create-outline" size={18} color={LIME} />
        <EliteText style={s.ctaTextGhost}>CREAR HIIT PERSONALIZADO</EliteText>
      </AnimatedPressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Resumen
  summaryCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: CARD.borderColor,
  },
  summaryTitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  summaryDivider: {
    width: 0.5,
    height: 32,
    backgroundColor: '#1a1a1a',
  },

  // Tabs
  tabsWrap: {
    marginTop: Spacing.md,
  },

  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  // Benchmark card
  benchmarkCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
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
  benchmarkPRBox: {
    alignItems: 'flex-end',
  },
  benchmarkPR: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: LIME,
  },
  benchmarkPRLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
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
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  variantChipText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },

  // Cardio
  disciplineCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  disciplineName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  disciplineLast: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
  },
  disciplineEmpty: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  prsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  prChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    alignItems: 'center',
  },
  prChipLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  prChipValue: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: LIME,
  },

  // Mobility
  mobilityScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  mobilityScore: {
    fontSize: FontSizes.mega,
    fontFamily: Fonts.bold,
    color: LIME,
  },
  mobilityScoreLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  mobilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
  },
  mobilityLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
  },
  mobilityValue: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
  },

  // HIIT
  hiitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  hiitName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  hiitDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
    marginTop: 2,
  },
  hiitMeta: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: LIME,
    letterSpacing: 1,
    marginTop: 4,
  },
  playBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CTA
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
    backgroundColor: '#0a0a0a',
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

  // Empty state
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
