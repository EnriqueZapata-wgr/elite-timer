/**
 * Yo — "¿Cómo voy?" Dashboard personal del usuario.
 *
 * Scores de salud, composición corporal, cronotipo, quizzes, acciones.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { getDashboardData, type DashboardData } from '@/src/services/dashboard-service';
import { generateMasterHealthReport, type MasterHealthReport } from '@/src/services/health-score-engine';
import { calculateDailyHealthScore, type DailyHealthScore } from '@/src/services/daily-health-score';
import { isWearableAvailable, getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, SEMANTIC } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';

// === CONSTANTES ===

const CHRONO_META: Record<string, { icon: string; color: string; name: string; desc: string }> = {
  lion: { icon: 'sunny-outline', color: '#EF9F27', name: 'León', desc: 'Madrugador natural' },
  bear: { icon: 'leaf-outline', color: '#a8e02a', name: 'Oso', desc: 'Ritmo solar' },
  wolf: { icon: 'moon-outline', color: '#7F77DD', name: 'Lobo', desc: 'Noctámbulo creativo' },
  dolphin: { icon: 'water-outline', color: '#5B9BD5', name: 'Delfín', desc: 'Mente activa' },
};

// === COMPONENTE ===

export default function YoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthReport, setHealthReport] = useState<MasterHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [dailyScore, setDailyScore] = useState<DailyHealthScore | null>(null);
  const [wearableData, setWearableData] = useState<WearableData | null>(null);

  const loadData = useCallback(async () => {
    try { setData(await getDashboardData()); } catch { /* silenciar */ }
    setLoading(false);
    setRefreshing(false);
    // Cargar Daily Health Score
    try {
      if (user?.id) {
        const score = await calculateDailyHealthScore(user.id);
        setDailyScore(score);
      }
    } catch { /* degradar graciosamente */ }
    // Cargar datos de wearable
    try {
      const today = new Date().toISOString().split('T')[0];
      const available = await isWearableAvailable();
      if (available) {
        const data = await getWearableDataForDate(today);
        if (data) setWearableData(data);
      }
    } catch { /* wearable no disponible */ }
    // Cargar reporte maestro de salud
    try {
      if (user?.id) {
        setHealthLoading(true);
        const report = await generateMasterHealthReport(user.id);
        setHealthReport(report);
        setHealthLoading(false);
      }
    } catch { setHealthLoading(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const userName = user?.user_metadata?.full_name || data?.profile?.full_name || user?.email?.split('@')[0] || 'Atleta';
  const memberSince = data?.profile?.created_at
    ? new Date(data.profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : '';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const comp = data?.composition;
  const chrono = data?.chronotype;
  const cm = chrono ? CHRONO_META[chrono.chronotype] : null;

  // Colores composición
  const fatColor = comp?.body_fat_pct != null ? (comp.body_fat_pct < 20 ? SEMANTIC.success : comp.body_fat_pct < 28 ? SEMANTIC.warning : SEMANTIC.error) : null;
  const muscleColor = comp?.muscle_mass_pct != null ? (comp.muscle_mass_pct > 38 ? SEMANTIC.success : comp.muscle_mass_pct > 30 ? SEMANTIC.warning : SEMANTIC.error) : null;
  const visceralColor = comp?.visceral_fat != null ? (comp.visceral_fat < 7 ? SEMANTIC.success : comp.visceral_fat < 13 ? SEMANTIC.warning : SEMANTIC.error) : null;

  // Helper: color por score
  const scoreColor = (v: number) => v >= 70 ? '#a8e02a' : v >= 40 ? '#EF9F27' : '#E24B4A';

  // Dominios ordenados por score (mayor primero)
  const sortedDomains = healthReport?.functionalHealth?.domains
    ? [...healthReport.functionalHealth.domains].sort((a, b) => b.score - a.score)
    : [];

  // Overall score: preferir dailyScore, fallback a healthReport
  const overallScore = dailyScore?.overall ?? healthReport?.functionalHealth?.value ?? 0;
  const overallLevel = dailyScore?.level ?? healthReport?.functionalHealth?.level ?? '';
  const overallColor = dailyScore?.color ?? healthReport?.functionalHealth?.color ?? '#555';

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={{ padding: 16, gap: 14 }}>
          {/* Top bar skeleton */}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <SkeletonLoader variant="circle" width={44} height={44} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader variant="text-line" width="30%" />
            </View>
            <SkeletonLoader variant="text-line" width={70} />
          </View>
          {/* Score circle skeleton */}
          <SkeletonLoader variant="card" height={260} />
          {/* Age cards skeleton */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonLoader variant="stat-card" />
            <SkeletonLoader variant="stat-card" />
          </View>
          <SkeletonLoader variant="card" height={80} />
          <SkeletonLoader variant="card" height={60} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
      >
        {/* ═══════════════════════════════════════════
            1. TOP BAR — Avatar + "YO" + Chronotype pill
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <View style={s.topBar}>
            {/* Avatar */}
            <View style={s.avatar}>
              <LinearGradient colors={[ATP_BRAND.lime, ATP_BRAND.teal2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarGrad}>
                <View style={s.avatarInner}>
                  <EliteText style={s.avatarText}>{initials}</EliteText>
                </View>
              </LinearGradient>
            </View>

            {/* Título */}
            <EliteText style={s.topTitle}>YO</EliteText>

            <View style={{ flex: 1 }} />

            {/* Chronotype pill */}
            {cm ? (
              <AnimatedPressable onPress={() => { haptic.light(); router.push('/quiz/chronotype' as any); }} style={[s.chronoPill, { borderColor: cm.color + '60' }]}>
                <Ionicons name={cm.icon as any} size={13} color={cm.color} />
                <EliteText style={[s.chronoPillText, { color: cm.color }]}>{cm.name.toUpperCase()}</EliteText>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={s.settingsBtn}>
                <Ionicons name="settings-outline" size={20} color={TEXT_COLORS.muted} />
              </AnimatedPressable>
            )}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            2. OVERALL SCORE CARD — Circle + 6 mini scores
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={s.scoreCard}>
            {/* Círculo grande */}
            <View style={s.scoreCircleWrap}>
              <ScoreCircle score={overallScore} color={overallColor} size={180} />
            </View>

            {/* Level text */}
            <EliteText style={[s.scoreLevel, { color: overallColor }]}>
              {overallLevel.toUpperCase()}
            </EliteText>

            {/* 6 mini scores: 3x2 grid */}
            {dailyScore && (
              <View style={s.miniScoreGrid}>
                {([
                  { key: 'sleep' as const, abbr: 'SLP' },
                  { key: 'recovery' as const, abbr: 'RCV' },
                  { key: 'compliance' as const, abbr: 'PRT' },
                  { key: 'activity' as const, abbr: 'ACT' },
                  { key: 'nutrition' as const, abbr: 'NUT' },
                  { key: 'stress' as const, abbr: 'STR' },
                ]).map((item) => {
                  const val = dailyScore.components[item.key]?.score ?? 0;
                  const c = scoreColor(val);
                  return (
                    <View key={item.key} style={s.miniScoreItem}>
                      <EliteText style={s.miniScoreLabel}>{item.abbr}</EliteText>
                      <EliteText style={[s.miniScoreValue, { color: c }]}>{val}</EliteText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            3. AGE CARDS — Biological Age + Aging Rate
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={s.ageRow}>
            {/* Biological Age */}
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }} style={s.ageCard}>
              <EliteText style={s.ageLabel}>BIOLOGICAL AGE</EliteText>
              <EliteText style={[s.ageBigNum, {
                color: healthReport?.biologicalAge?.delta != null && healthReport.biologicalAge.delta < 0
                  ? SEMANTIC.success
                  : healthReport?.biologicalAge?.value ? SEMANTIC.warning : TEXT_COLORS.muted
              }]}>
                {healthReport?.biologicalAge?.value ? Math.round(healthReport.biologicalAge.value) : '--'}
              </EliteText>
              {healthReport?.biologicalAge?.delta != null && (
                <EliteText style={[s.ageSub, {
                  color: healthReport.biologicalAge.delta < 0 ? SEMANTIC.success : SEMANTIC.error
                }]}>
                  {healthReport.biologicalAge.delta > 0 ? '+' : ''}{healthReport.biologicalAge.delta} vs {healthReport.biologicalAge.chronologicalAge}
                </EliteText>
              )}
            </AnimatedPressable>

            {/* Aging Rate */}
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }} style={s.ageCard}>
              <EliteText style={s.ageLabel}>AGING RATE</EliteText>
              <EliteText style={[s.ageBigNum, { color: healthReport?.agingRate?.color ?? TEXT_COLORS.muted }]}>
                {healthReport?.agingRate?.value ? healthReport.agingRate.value.toFixed(2) + 'x' : '--'}
              </EliteText>
              <EliteText style={[s.ageSub, { color: healthReport?.agingRate?.color ?? TEXT_COLORS.muted }]}>
                {healthReport?.agingRate?.label ?? ''}
              </EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            4. IMPROVE EVALUATION — Green-tinted card
            ═══════════════════════════════════════════ */}
        {healthReport && healthReport.recommendations.toImproveEvaluation.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <View style={s.improveCard}>
              <View style={s.improveHeader}>
                <View style={s.improveIconWrap}>
                  <Ionicons name="flash" size={14} color={ATP_BRAND.lime} />
                </View>
                <EliteText style={s.improveTitle}>MEJORA TU EVALUACIÓN</EliteText>
              </View>
              {healthReport.recommendations.toImproveEvaluation.slice(0, 2).map((rec) => (
                <AnimatedPressable key={rec.id} onPress={() => { haptic.light(); router.push(rec.route as any); }} style={s.improveRow}>
                  <Ionicons name={rec.icon as any} size={16} color={rec.impact === 'critical' ? SEMANTIC.error : SEMANTIC.warning} />
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.improveRecTitle}>{rec.title}</EliteText>
                    <EliteText style={s.improveRecSub}>{rec.impactLabel}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={TEXT_COLORS.muted} />
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════
            5. SYNC STATUS — Wearable source + last sync
            ═══════════════════════════════════════════ */}
        {wearableData && (
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <View style={s.syncCard}>
              <Ionicons name="watch-outline" size={16} color={SEMANTIC.success} />
              <EliteText style={s.syncSource}>{wearableData.source ?? 'Wearable'}</EliteText>
              <View style={{ flex: 1 }} />
              <Ionicons name="checkmark-circle" size={14} color={SEMANTIC.success} />
              <EliteText style={s.syncTime}>
                {wearableData.lastSync
                  ? new Date(wearableData.lastSync).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  : 'Sincronizado'}
              </EliteText>
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════
            6. HEALTH DOMAINS — Horizontal bars sorted by score
            ═══════════════════════════════════════════ */}
        {sortedDomains.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <View style={s.domainsCard}>
              <EliteText style={s.domainsTitle}>DOMINIOS DE SALUD</EliteText>
              {sortedDomains.map((d) => (
                <View key={d.domain} style={s.domainRow}>
                  <View style={s.domainIconWrap}>
                    <Ionicons name={d.icon as any} size={13} color={d.color} />
                  </View>
                  <EliteText style={s.domainLabel}>{d.label}</EliteText>
                  <View style={s.domainBarBg}>
                    <View style={[s.domainBarFill, { width: `${Math.min(100, d.score)}%`, backgroundColor: d.color }]} />
                  </View>
                  <EliteText style={[s.domainPct, { color: d.color }]}>{d.score}</EliteText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════
            7. BODY COMPOSITION — 4 cards in 2x2 grid
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <EliteText style={s.sectionTitle}>COMPOSICIÓN CORPORAL</EliteText>
          <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }}>
            <View style={s.compGrid}>
              {/* Body Fat % */}
              <View style={s.compCard}>
                <EliteText style={s.compLabel}>BODY FAT</EliteText>
                <EliteText style={[s.compValue, { color: fatColor ?? TEXT_COLORS.muted }]}>
                  {comp?.body_fat_pct != null ? `${comp.body_fat_pct}` : '--'}
                </EliteText>
                <EliteText style={s.compUnit}>%</EliteText>
              </View>

              {/* Lean Mass */}
              <View style={s.compCard}>
                <EliteText style={s.compLabel}>LEAN MASS</EliteText>
                <EliteText style={[s.compValue, { color: muscleColor ?? TEXT_COLORS.muted }]}>
                  {comp?.muscle_mass_pct != null ? `${comp.muscle_mass_pct}` : '--'}
                </EliteText>
                <EliteText style={s.compUnit}>%</EliteText>
              </View>

              {/* Visceral Fat */}
              <View style={s.compCard}>
                <EliteText style={s.compLabel}>VISCERAL FAT</EliteText>
                <EliteText style={[s.compValue, { color: visceralColor ?? TEXT_COLORS.muted }]}>
                  {comp?.visceral_fat != null ? `${comp.visceral_fat}` : '--'}
                </EliteText>
                <EliteText style={s.compUnit}> </EliteText>
              </View>

              {/* BMR */}
              <View style={s.compCard}>
                <EliteText style={s.compLabel}>BMR</EliteText>
                <EliteText style={[s.compValue, { color: TEXT_COLORS.muted }]}>
                  {(comp as any)?.bmr != null ? `${(comp as any).bmr}` : '--'}
                </EliteText>
                <EliteText style={s.compUnit}>kcal</EliteText>
              </View>
            </View>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </View>
  );
}

// === SUB-COMPONENTES ===

/** Arco SVG circular de progreso */
function ScoreCircle({ score, color, size = 180 }: { score: number; color: string; size?: number }) {
  const strokeWidth = size >= 150 ? 10 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Fondo del arco */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1a1a1a"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Arco de progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Score dentro del círculo */}
      <EliteText style={{ fontSize: size >= 150 ? 48 : 28, fontFamily: Fonts.extraBold, color }}>{score}</EliteText>
      <EliteText style={{ fontSize: 11, fontFamily: Fonts.semiBold, color: '#555', letterSpacing: 1, marginTop: -2 }}>/ 100</EliteText>
    </View>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  // Root & scroll
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    paddingHorizontal: Spacing.md,
  },

  // ── 1. Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
  },
  avatarGrad: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: Radius.pill,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: ATP_BRAND.lime,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  topTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: '#fff',
    letterSpacing: 2,
  },
  chronoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chronoPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
  },
  settingsBtn: {
    padding: Spacing.xs,
  },

  // ── 2. Overall Score Card ──
  scoreCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  scoreCircleWrap: {
    marginBottom: Spacing.sm,
  },
  scoreLevel: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  miniScoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: '#1a1a1a',
    paddingTop: Spacing.md,
  },
  miniScoreItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  miniScoreLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  miniScoreValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
  },

  // ── 3. Age Cards ──
  ageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  ageCard: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  ageLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  ageBigNum: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    lineHeight: 42,
  },
  ageSub: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },

  // ── 4. Improve Evaluation ──
  improveCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1a2a1a',
    padding: Spacing.md,
    marginTop: 12,
  },
  improveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  improveIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#a8e02a15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  improveTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: ATP_BRAND.lime,
    letterSpacing: 1.5,
  },
  improveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#1a1a1a',
  },
  improveRecTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  improveRecSub: {
    fontSize: FontSizes.xs,
    color: '#555',
    marginTop: 1,
  },

  // ── 5. Sync Status ──
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  syncSource: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  syncTime: {
    fontSize: FontSizes.xs,
    color: '#555',
    fontFamily: Fonts.semiBold,
  },

  // ── 6. Health Domains ──
  domainsCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: Spacing.md,
    marginTop: 12,
  },
  domainsTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  domainIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainLabel: {
    color: '#888',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    width: 80,
  },
  domainBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  domainBarFill: {
    height: '100%',
    borderRadius: Radius.xs,
  },
  domainPct: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    width: 28,
    textAlign: 'right',
  },

  // ── 7. Body Composition ──
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#555',
    letterSpacing: 1.5,
    marginTop: Spacing.lg,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  compGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  compLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  compValue: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    lineHeight: 34,
  },
  compUnit: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#555',
    letterSpacing: 1,
  },
});
