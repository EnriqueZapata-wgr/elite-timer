/**
 * Yo — "¿Cómo voy?" Dashboard personal del usuario.
 *
 * Scores de salud, composición corporal, cronotipo, quizzes, acciones.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useAuth } from '@/src/contexts/auth-context';
import { getDashboardData, type DashboardData } from '@/src/services/dashboard-service';
import { generateMasterHealthReport, type MasterHealthReport, type DomainScore, type Recommendation } from '@/src/services/health-score-engine';
import { calculateDailyHealthScore, type DailyHealthScore } from '@/src/services/daily-health-score';
import { isWearableAvailable, getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, SEMANTIC, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';

const TEAL = CATEGORY_COLORS.metrics;

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

  if (loading) {
    /* Skeleton de carga — reemplaza ActivityIndicator */
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <SkeletonLoader variant="circle" width={60} height={60} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader variant="text-line" width="60%" />
              <SkeletonLoader variant="text-line" width="40%" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SkeletonLoader variant="stat-card" />
            <SkeletonLoader variant="stat-card" />
          </View>
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" height={60} />
        </View>
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
      >
        {/* ══ 1. HEADER ══ */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <View style={st.header}>
            <View style={st.avatarRing}>
              <LinearGradient colors={[ATP_BRAND.lime, ATP_BRAND.teal2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatarGradient}>
                <View style={st.avatarInner}>
                  <EliteText style={st.avatarText}>{initials}</EliteText>
                </View>
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={st.headerName}>{userName}</EliteText>
              {memberSince ? <EliteText variant="caption" style={st.headerSince}>Miembro desde {memberSince}</EliteText> : null}
              {cm && (
                <View style={[st.chronoPill, { backgroundColor: withOpacity(cm.color, 0.12) }]}>
                  <Ionicons name={cm.icon as any} size={14} color={cm.color} />
                  <EliteText variant="caption" style={[st.chronoPillText, { color: cm.color }]}>{cm.name}</EliteText>
                </View>
              )}
            </View>
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={st.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ══ DAILY HEALTH SCORE ══ */}
        {dailyScore && (
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <SectionLabel>SCORE DEL DÍA</SectionLabel>
            <DailyScoreCard score={dailyScore} />
          </Animated.View>
        )}

        {/* ══ WEARABLE DATA ══ */}
        {wearableData && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <SectionLabel>DISPOSITIVO</SectionLabel>
            <View style={st.wearableCard}>
              <View style={st.wearableGrid}>
                {wearableData.steps != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="footsteps-outline" size={18} color={SEMANTIC.success} />
                    <EliteText style={st.wearableValue}>{wearableData.steps.toLocaleString()}</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>Pasos</EliteText>
                  </View>
                )}
                {wearableData.restingHR != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="heart-outline" size={18} color={SEMANTIC.error} />
                    <EliteText style={st.wearableValue}>{wearableData.restingHR}</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>FC reposo</EliteText>
                  </View>
                )}
                {wearableData.hrv != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="pulse-outline" size={18} color={CATEGORY_COLORS.mind} />
                    <EliteText style={st.wearableValue}>{wearableData.hrv}</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>HRV</EliteText>
                  </View>
                )}
                {wearableData.sleep?.totalHours != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="moon-outline" size={18} color={SEMANTIC.info} />
                    <EliteText style={st.wearableValue}>{wearableData.sleep.totalHours}h</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>Sueño</EliteText>
                  </View>
                )}
                {wearableData.spo2 != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="water-outline" size={18} color={CATEGORY_COLORS.metrics} />
                    <EliteText style={st.wearableValue}>{wearableData.spo2}%</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>SpO2</EliteText>
                  </View>
                )}
                {wearableData.activeMinutes != null && (
                  <View style={st.wearableItem}>
                    <Ionicons name="flame-outline" size={18} color={CATEGORY_COLORS.optimization} />
                    <EliteText style={st.wearableValue}>{wearableData.activeMinutes}</EliteText>
                    <EliteText variant="caption" style={st.wearableLabel}>Min activos</EliteText>
                  </View>
                )}
              </View>
              {wearableData.source && (
                <EliteText variant="caption" style={st.wearableSource}>
                  Fuente: {wearableData.source}
                </EliteText>
              )}
            </View>
          </Animated.View>
        )}

        {/* ══ 2. SALUD FUNCIONAL ══ */}
        <SectionLabel>SALUD FUNCIONAL</SectionLabel>

        {healthLoading ? (
          <View style={{ gap: Spacing.sm }}>
            <SkeletonLoader variant="card" height={100} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <SkeletonLoader variant="stat-card" />
              <SkeletonLoader variant="stat-card" />
            </View>
          </View>
        ) : healthReport ? (
          <>
            {/* Hero score */}
            <View style={st.heroScoreCard}>
              <View style={st.heroScoreRow}>
                <EliteText style={[st.heroScoreValue, { color: healthReport.functionalHealth.color }]}>
                  {healthReport.functionalHealth.value}
                </EliteText>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
                    Salud Funcional
                  </EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>
                    {healthReport.functionalHealth.level} · {healthReport.evaluationQuality.completedSources}/{healthReport.evaluationQuality.totalSources} fuentes
                  </EliteText>
                </View>
              </View>
              <View style={st.heroBar}>
                <View style={[st.heroBarFill, { width: `${healthReport.functionalHealth.value}%`, backgroundColor: healthReport.functionalHealth.color }]} />
              </View>
            </View>

            {/* Age + Aging rate cards */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }} style={[st.ageCard, { flex: 1 }]}>
                <Ionicons name="fitness-outline" size={16} color={healthReport.biologicalAge.delta && healthReport.biologicalAge.delta < 0 ? SEMANTIC.success : healthReport.biologicalAge.value ? SEMANTIC.warning : TEXT_COLORS.muted} />
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>Edad biológica</EliteText>
                <EliteText style={[st.ageValue, { color: healthReport.biologicalAge.delta && healthReport.biologicalAge.delta < 0 ? SEMANTIC.success : healthReport.biologicalAge.value ? SEMANTIC.warning : TEXT_COLORS.muted }]}>
                  {healthReport.biologicalAge.value ? Math.round(healthReport.biologicalAge.value) : '—'}
                </EliteText>
                {healthReport.biologicalAge.delta !== null && (
                  <EliteText variant="caption" style={{ color: healthReport.biologicalAge.delta < 0 ? SEMANTIC.success : SEMANTIC.error, fontSize: FontSizes.xs }}>
                    {healthReport.biologicalAge.delta > 0 ? '+' : ''}{healthReport.biologicalAge.delta} vs {healthReport.biologicalAge.chronologicalAge}
                  </EliteText>
                )}
              </AnimatedPressable>

              <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }} style={[st.ageCard, { flex: 1 }]}>
                <Ionicons name="hourglass-outline" size={16} color={healthReport.agingRate.color} />
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>Envejecimiento</EliteText>
                <EliteText style={[st.ageValue, { color: healthReport.agingRate.color }]}>
                  {healthReport.agingRate.value ? healthReport.agingRate.value.toFixed(2) + 'x' : '—'}
                </EliteText>
                <EliteText variant="caption" style={{ color: healthReport.agingRate.color, fontSize: FontSizes.xs }}>
                  {healthReport.agingRate.label}
                </EliteText>
              </AnimatedPressable>
            </View>

            {/* Domains */}
            <View style={{ marginTop: Spacing.md }}>
              <EliteText variant="caption" style={[st.sectionLabel, { marginTop: 0, marginBottom: Spacing.sm }]}>DOMINIOS</EliteText>
              {healthReport.functionalHealth.domains.map((d, i) => (
                <View key={d.domain} style={st.domainRow}>
                  <Ionicons name={d.icon as any} size={14} color={d.color} />
                  <EliteText variant="caption" style={st.domainLabel}>{d.label}</EliteText>
                  <View style={st.domainBarBg}>
                    <View style={[st.domainBarFill, { width: `${d.score}%`, backgroundColor: d.color }]} />
                  </View>
                  <EliteText variant="caption" style={[st.domainPct, { color: d.color }]}>{d.score}</EliteText>
                </View>
              ))}
            </View>

            {/* Recommendations to improve evaluation */}
            {healthReport.recommendations.toImproveEvaluation.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <EliteText variant="caption" style={[st.sectionLabel, { marginTop: 0, marginBottom: Spacing.sm }]}>
                  MEJORA TU EVALUACIÓN ({healthReport.evaluationQuality.completedSources}/{healthReport.evaluationQuality.totalSources})
                </EliteText>
                {healthReport.recommendations.toImproveEvaluation.slice(0, 3).map((rec, i) => (
                  <StaggerItem key={rec.id} index={i}>
                    <AnimatedPressable onPress={() => { haptic.light(); router.push(rec.route as any); }} style={st.recCard}>
                      <Ionicons name={rec.icon as any} size={18} color={rec.impact === 'critical' ? SEMANTIC.error : SEMANTIC.warning} />
                      <View style={{ flex: 1 }}>
                        <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>{rec.title}</EliteText>
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>{rec.impactLabel}</EliteText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={TEXT_COLORS.muted} />
                    </AnimatedPressable>
                  </StaggerItem>
                ))}
              </View>
            )}

            {/* Protocol impact */}
            {healthReport.recommendations.protocolImpact.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <EliteText variant="caption" style={[st.sectionLabel, { marginTop: 0, marginBottom: Spacing.sm }]}>PROTOCOLOS</EliteText>
                {healthReport.recommendations.protocolImpact.slice(0, 3).map((p, i) => (
                  <View key={p.protocolName} style={st.protoCard}>
                    <Ionicons name={p.isActive ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={p.isActive ? SEMANTIC.success : ATP_BRAND.lime} />
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>{p.protocolName}</EliteText>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>
                        {p.estimatedImpact} · {p.timeToImpact}
                      </EliteText>
                    </View>
                    {!p.isActive && (
                      <AnimatedPressable onPress={() => { haptic.light(); router.push('/protocol-explorer' as any); }} style={st.protoActivateBtn}>
                        <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.bold }}>Activar</EliteText>
                      </AnimatedPressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* ══ 3. COMPOSICIÓN CORPORAL ══ */}
        <Animated.View entering={FadeInUp.delay(450).springify()}>
          <SectionLabel>COMPOSICIÓN CORPORAL</SectionLabel>
          {comp ? (
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }} style={st.compCard}>
              <CompStat label="Peso" value={comp.weight_kg != null ? `${comp.weight_kg}` : '—'} unit="kg" color={TEXT_COLORS.primary} />
              <View style={st.compDivider} />
              <CompStat label="Grasa" value={comp.body_fat_pct != null ? `${comp.body_fat_pct}` : '—'} unit="%" color={fatColor ?? TEXT_COLORS.muted} />
              <View style={st.compDivider} />
              <CompStat label="Músculo" value={comp.muscle_mass_pct != null ? `${comp.muscle_mass_pct}` : '—'} unit="%" color={muscleColor ?? TEXT_COLORS.muted} />
              <View style={st.compDivider} />
              <CompStat label="Visceral" value={comp.visceral_fat != null ? `${comp.visceral_fat}` : '—'} unit="" color={visceralColor ?? TEXT_COLORS.muted} />
            </AnimatedPressable>
          ) : (
            <View style={st.compEmptyRow}>
              {[
                { icon: 'scale-outline', label: 'Peso', sub: 'kg' },
                { icon: 'flame-outline', label: 'Grasa', sub: '%' },
                { icon: 'barbell-outline', label: 'Músculo', sub: '%' },
                { icon: 'shield-outline', label: 'Visceral', sub: '' },
              ].map((item, i) => (
                <View key={item.label} style={st.compEmptyCard}>
                  <Ionicons name={item.icon as any} size={20} color={TEXT_COLORS.muted} />
                  <EliteText variant="caption" style={st.compEmptyLabel}>{item.label}</EliteText>
                  <EliteText style={st.compEmptyValue}>—</EliteText>
                </View>
              ))}
            </View>
          )}
          {/* Botón evaluar salud */}
          <AnimatedPressable onPress={() => { haptic.light(); router.push('/health-input' as any); }} style={st.evalBtn}>
            <Ionicons name="clipboard-outline" size={16} color={TEAL} />
            <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>
              Completar evaluación de salud
            </EliteText>
            <Ionicons name="chevron-forward" size={14} color={TEAL} />
          </AnimatedPressable>
        </Animated.View>

        {/* ══ 4. CRONOTIPO (hero card) ══ */}
        <Animated.View entering={FadeInUp.delay(550).springify()}>
          <SectionLabel>MI CRONOTIPO</SectionLabel>
          {chrono && cm ? (
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/quiz/chronotype' as any); }}>
              <LinearGradient
                colors={[ATP_BRAND.lime + '12', ATP_BRAND.teal2 + '08', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.chronoHero}
              >
                <View style={st.chronoTop}>
                  <View style={[st.chronoIconWrap, { backgroundColor: withOpacity(cm.color, 0.15) }]}>
                    <Ionicons name={cm.icon as any} size={28} color={cm.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[st.chronoName, { color: cm.color }]}>{cm.name}</EliteText>
                    <EliteText variant="caption" style={st.chronoDesc}>{cm.desc}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.muted} />
                </View>
                {/* Timeline horizontal */}
                <View style={st.chronoTimeline}>
                  {[
                    { icon: 'sunny-outline', label: 'Despertar', time: chrono.wake_time?.slice(0, 5), color: SEMANTIC.success },
                    { icon: 'barbell-outline', label: 'Entreno', time: chrono.peak_physical_start?.slice(0, 5), color: CATEGORY_COLORS.fitness },
                    { icon: 'bulb-outline', label: 'Foco', time: chrono.peak_focus_start?.slice(0, 5), color: CATEGORY_COLORS.mind },
                    { icon: 'moon-outline', label: 'Dormir', time: chrono.sleep_time?.slice(0, 5), color: SEMANTIC.info },
                  ].map((t, i, arr) => (
                    <View key={t.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={st.chronoTimeItem}>
                        <View style={[st.chronoTimeDot, { backgroundColor: t.color + '25' }]}>
                          <Ionicons name={t.icon as any} size={14} color={t.color} />
                        </View>
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>{t.label}</EliteText>
                        <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: FontSizes.sm, fontFamily: Fonts.bold }}>{t.time}</EliteText>
                      </View>
                      {i < arr.length - 1 && <View style={st.chronoTimeConnector} />}
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/quiz/chronotype' as any); }}>
              <LinearGradient
                colors={[ATP_BRAND.lime + '15', ATP_BRAND.teal2 + '08', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.chronoInvite}
              >
                <View style={st.chronoInviteIcon}>
                  <EliteText style={{ fontSize: FontSizes.display }}>🧬</EliteText>
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={st.chronoInviteTitle}>Descubre tu cronotipo</EliteText>
                  <EliteText variant="caption" style={st.chronoInviteSub}>10 preguntas · 2 minutos</EliteText>
                </View>
                <Ionicons name="arrow-forward" size={20} color={ATP_BRAND.lime} />
              </LinearGradient>
            </AnimatedPressable>
          )}
        </Animated.View>

        {/* ══ 5. QUIZZES (2 columnas) ══ */}
        <Animated.View entering={FadeInUp.delay(650).springify()}>
          <SectionLabel>QUIZZES</SectionLabel>
          <View style={st.quizGrid}>
            <QuizCard emoji="🧬" label="Cronotipo" done={!!chrono} onPress={() => router.push('/quiz/chronotype' as any)} />
            <QuizCard emoji="⚡" label="Energía" disabled />
            <QuizCard emoji="😴" label="Sueño" disabled />
            <QuizCard emoji="🧠" label="Estrés" disabled />
          </View>
        </Animated.View>

        {/* ══ 6. ACCIONES RÁPIDAS ══ */}
        <Animated.View entering={FadeInUp.delay(750).springify()}>
          <SectionLabel>ACCIONES</SectionLabel>
          <View style={{ gap: Spacing.sm }}>
            <ActionCard icon="flask-outline" label="Mi Salud" sub="Sube tus estudios" color={CATEGORY_COLORS.metrics} onPress={() => router.push('/my-health' as any)} />
            <ActionCard icon="heart-circle-outline" label="Check-in" sub="¿Cómo te sientes?" color={CATEGORY_COLORS.mind} onPress={() => router.push('/checkin' as any)} />
            <ActionCard icon="journal-outline" label="Journal" sub="Reflexión del día" color={CATEGORY_COLORS.optimization} disabled />
          </View>
        </Animated.View>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </View>
  );
}

// === SUB-COMPONENTES ===

function SectionLabel({ children }: { children: string }) {
  return <EliteText variant="caption" style={st.sectionLabel}>{children}</EliteText>;
}

function CompStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={st.compStat}>
      <EliteText variant="caption" style={st.compStatLabel}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
        <EliteText style={[st.compStatValue, { color }]}>{value}</EliteText>
        {unit ? <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>{unit}</EliteText> : null}
      </View>
    </View>
  );
}

function QuizCard({ emoji, label, done, disabled, onPress }: {
  emoji: string; label: string; done?: boolean; disabled?: boolean; onPress?: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={() => { haptic.selection(); onPress?.(); }}
      disabled={disabled}
      style={[
        st.quizCard,
        done && { backgroundColor: SEMANTIC.success + '10', borderColor: SEMANTIC.success + '30' },
        disabled && { opacity: 0.4 },
      ]}
    >
      <EliteText style={{ fontSize: 20 }}>{emoji}</EliteText>
      <EliteText variant="body" style={[st.quizCardLabel, done && { color: SEMANTIC.success }]}>{label}</EliteText>
      {done && <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success} />}
      {disabled && (
        <View style={st.quizCardSoonBadge}>
          <EliteText variant="caption" style={st.quizCardSoonText}>Pronto</EliteText>
        </View>
      )}
    </AnimatedPressable>
  );
}

// === DAILY SCORE CARD ===

/** Etiquetas en español para cada componente */
const COMPONENT_LABELS: Record<string, string> = {
  sleep: 'Sueño',
  activity: 'Actividad',
  nutrition: 'Nutrición',
  stress: 'Estrés',
  recovery: 'Recuperación',
  compliance: 'Protocolo',
};

/** Arco SVG circular de progreso */
function ScoreCircle({ score, color, size = 100 }: { score: number; color: string; size?: number }) {
  const strokeWidth = 8;
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
          stroke={SURFACES.cardLight}
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
      <EliteText style={[dsSt.circleScore, { color }]}>{score}</EliteText>
    </View>
  );
}

/** Barra de progreso mini para cada componente */
function ComponentBar({ label, score, color }: { label: string; score: number; color: string }) {
  const fillColor = score >= 70 ? '#A8E02A' : score >= 40 ? '#EF9F27' : '#E24B4A';
  return (
    <View style={dsSt.compBarRow}>
      <EliteText variant="caption" style={dsSt.compBarLabel}>{label}</EliteText>
      <View style={dsSt.compBarBg}>
        <View style={[dsSt.compBarFill, { width: `${Math.min(100, score)}%`, backgroundColor: fillColor }]} />
      </View>
      <EliteText variant="caption" style={[dsSt.compBarValue, { color: fillColor }]}>{score}</EliteText>
    </View>
  );
}

/** Card hero del Daily Health Score */
function DailyScoreCard({ score }: { score: DailyHealthScore }) {
  const components = score.components;
  // Orden: fila 1 (sueño, actividad, nutrición), fila 2 (estrés, recuperación, protocolo)
  const keys: (keyof typeof components)[] = ['sleep', 'activity', 'nutrition', 'stress', 'recovery', 'compliance'];

  return (
    <View style={dsSt.card}>
      {/* Fila superior: círculo + nivel */}
      <View style={dsSt.heroRow}>
        <ScoreCircle score={score.overall} color={score.color} size={100} />
        <View style={dsSt.heroInfo}>
          <EliteText style={[dsSt.levelText, { color: score.color }]}>{score.level}</EliteText>
          <EliteText variant="caption" style={dsSt.levelSub}>Score diario de salud</EliteText>
        </View>
      </View>

      {/* Grid 3×2 de componentes */}
      <View style={dsSt.compGrid}>
        {keys.map((key) => (
          <View key={key} style={dsSt.compCell}>
            <ComponentBar label={COMPONENT_LABELS[key]} score={components[key].score} color={score.color} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionCard({ icon, label, sub, color, onPress, disabled }: {
  icon: string; label: string; sub: string; color: string; onPress?: () => void; disabled?: boolean;
}) {
  return (
    <AnimatedPressable onPress={() => { haptic.light(); onPress?.(); }} disabled={disabled} style={[st.actionCard, { borderLeftColor: color }, disabled && { opacity: 0.4 }]}>
      <View style={[st.actionIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText variant="body" style={st.actionLabel}>{label}</EliteText>
        <EliteText variant="caption" style={st.actionSub}>{sub}</EliteText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={TEXT_COLORS.muted} />
    </AnimatedPressable>
  );
}

// === ESTILOS ===

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
  },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  avatarRing: { width: 64, height: 64, borderRadius: Radius.pill },
  avatarGradient: { width: 64, height: 64, borderRadius: Radius.pill, padding: 3 },
  avatarInner: { flex: 1, borderRadius: Radius.pill, backgroundColor: SURFACES.base, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 20 },
  headerName: { fontFamily: Fonts.bold, fontSize: FontSizes.xxl, color: TEXT_COLORS.primary },
  headerSince: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: 2 },
  settingsBtn: { padding: Spacing.sm },
  chronoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 },
  chronoPillText: { color: TEXT_COLORS.primary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // Section labels
  sectionLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2, marginTop: Spacing.xl, marginBottom: Spacing.sm },

  // Health master
  heroScoreCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md,
  },
  heroScoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroScoreValue: { fontSize: 48, fontFamily: Fonts.extraBold },
  heroBar: { height: 6, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, overflow: 'hidden', marginTop: Spacing.sm },
  heroBarFill: { height: '100%', borderRadius: Radius.xs },
  ageCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, alignItems: 'center', gap: 2,
  },
  ageValue: { fontSize: FontSizes.display, fontFamily: Fonts.extraBold },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  domainLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, width: 85 },
  domainBarBg: { flex: 1, height: 4, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, overflow: 'hidden' },
  domainBarFill: { height: '100%', borderRadius: Radius.xs },
  domainPct: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, width: 28, textAlign: 'right' },
  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.sm + 2,
    borderWidth: 0.5, borderColor: SURFACES.border, marginBottom: Spacing.xs,
  },
  protoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.sm + 2,
    borderWidth: 0.5, borderColor: SURFACES.border, marginBottom: Spacing.xs,
  },
  protoActivateBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: ATP_BRAND.lime + '40',
  },

  // Composition (with data)
  compCard: {
    flexDirection: 'row', backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, justifyContent: 'space-around', alignItems: 'center',
  },
  compDivider: { width: 1, height: 30, backgroundColor: SURFACES.border },
  compStat: { alignItems: 'center' },
  compStatLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginBottom: 2 },
  compStatValue: { fontSize: 20, fontFamily: Fonts.bold },
  // Composition (empty)
  compEmptyRow: { flexDirection: 'row', gap: 8 },
  compEmptyCard: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.sm, alignItems: 'center', gap: 4,
  },
  compEmptyLabel: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs },
  compEmptyValue: { color: TEXT_COLORS.muted, fontSize: FontSizes.xl, fontFamily: Fonts.bold },

  // Chronotype hero
  chronoHero: { borderRadius: Radius.md, borderWidth: 1, borderColor: ATP_BRAND.lime + '20', padding: Spacing.md, overflow: 'hidden' },
  chronoTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  chronoIconWrap: { width: 56, height: 56, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chronoName: { fontFamily: Fonts.extraBold, fontSize: 22 },
  chronoDesc: { color: TEXT_COLORS.secondary, fontSize: FontSizes.md, marginTop: 2 },
  chronoTimeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 0.5, borderTopColor: SURFACES.border, paddingTop: Spacing.md },
  chronoTimeItem: { alignItems: 'center', gap: 3 },
  chronoTimeDot: { width: 30, height: 30, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  chronoTimeConnector: { width: 16, height: 1, backgroundColor: SURFACES.border, marginTop: 14 },
  // Chronotype invite
  chronoInvite: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: ATP_BRAND.lime + '30', padding: Spacing.lg, overflow: 'hidden' },
  chronoInviteIcon: { width: 56, height: 56, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime + '15', alignItems: 'center', justifyContent: 'center' },
  chronoInviteTitle: { fontFamily: Fonts.bold, color: ATP_BRAND.lime, fontSize: FontSizes.xl },
  chronoInviteSub: { color: TEXT_COLORS.secondary, fontSize: FontSizes.md, marginTop: 2 },

  // Quizzes (2 columnas)
  quizGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quizCard: {
    width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  quizCardLabel: { flex: 1, color: TEXT_COLORS.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  quizCardSoonBadge: { backgroundColor: SURFACES.disabled, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill },
  quizCardSoonText: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, fontFamily: Fonts.bold },

  // Actions
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    borderLeftWidth: 3, padding: Spacing.md,
  },
  actionIcon: { width: 40, height: 40, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: Fonts.semiBold, color: TEXT_COLORS.primary, fontSize: FontSizes.md },
  actionSub: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: 1 },

  // Wearable data card
  wearableCard: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
  },
  wearableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  wearableItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
  },
  wearableValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
  },
  wearableLabel: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.xs,
  },
  wearableSource: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
    paddingTop: Spacing.xs,
  },

  // Eval button
  evalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },
});

// === ESTILOS: Daily Score Card ===

const dsSt = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  circleScore: {
    fontSize: FontSizes.mega,
    fontFamily: Fonts.extraBold,
  },
  heroInfo: {
    flex: 1,
  },
  levelText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
  },
  levelSub: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  // Grid de componentes (3×2)
  compGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
    paddingTop: Spacing.md,
  },
  compCell: {
    width: '30%',
    flexGrow: 1,
  },
  // Barra de componente individual
  compBarRow: {
    gap: 2,
  },
  compBarLabel: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  compBarBg: {
    height: 4,
    backgroundColor: SURFACES.cardLight,
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  compBarFill: {
    height: '100%',
    borderRadius: Radius.xs,
  },
  compBarValue: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    textAlign: 'right',
  },
});
