/**
 * Yo — "¿Cómo voy?" Dashboard personal del usuario.
 *
 * Scores de salud, composición corporal, cronotipo, quizzes, acciones.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SubEdadConstellation } from '@/src/components/edad-atp/SubEdadConstellation';
import { useAuth } from '@/src/contexts/auth-context';
import { getDashboardData, type DashboardData } from '@/src/services/dashboard-service';
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { calculateDailyHealthScore, type DailyHealthScore } from '@/src/services/daily-health-score';
import { isWearableAvailable, getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, SEMANTIC, CARD, PILLAR_GRADIENTS } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { ElectronBadge } from '@/src/components/ui/ElectronBadge';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { isAdmin } from '@/src/constants/admin-config';

/** Disciplina ATP — etiqueta cualitativa motivacional por tramo (nunca "reprobado"). */
function disciplinaLabel(v: number): string {
  if (v >= 80) return 'En racha';
  if (v >= 60) return 'Constante';
  if (v >= 40) return 'Retomando el ritmo';
  return 'Arrancando';
}
/** Color motivacional (sin rojo de "fallo"): lime alto, ámbar medio, azul suave bajo. */
function disciplinaColor(v: number): string {
  if (v >= 60) return ATP_BRAND.lime;
  if (v >= 35) return '#EF9F27';
  return '#5B9BD5';
}

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
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edadResult, setEdadResult] = useState<EdadAtpV2Result | null>(null);
  const [edadCE, setEdadCE] = useState(0);
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
      const today = getLocalToday();
      const available = await isWearableAvailable();
      if (available) {
        const data = await getWearableDataForDate(today);
        if (data) setWearableData(data);
      }
    } catch { /* wearable no disponible */ }
    // Cargar Edad ATP v2 (número estrella) — solo calcula si hay evaluación suficiente.
    try {
      if (user?.id) {
        const ce = await computeCE(user.id);
        setEdadCE(ce.ce_integral);
        if (ce.ce_integral >= 30) setEdadResult(await computeEdadAtpV2(user.id));
        else setEdadResult(null);
      }
    } catch { /* degradar graciosamente */ }
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));
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

  // Solo las métricas con dato real (Mariana screenshot 4: no mostrar "--" cuando hay datos,
  // ni la card vacía cuando no hay ninguno).
  const compFields = [
    { label: 'GRASA CORPORAL', value: comp?.body_fat_pct, unit: '%', color: fatColor ?? TEXT_COLORS.muted },
    { label: 'MASA MAGRA', value: comp?.muscle_mass_pct, unit: '%', color: muscleColor ?? TEXT_COLORS.muted },
    { label: 'GRASA VISCERAL', value: comp?.visceral_fat, unit: ' ', color: visceralColor ?? TEXT_COLORS.muted },
    { label: 'BMR', value: (comp as any)?.bmr, unit: 'kcal', color: TEXT_COLORS.muted },
  ].filter((f) => f.value != null);

  // Disciplina ATP = adherencia semanal de hábitos/recuperación (dailyScore). NO es salud de
  // fondo (eso es Edad ATP). Se presenta como momentum, sin número-calificación.
  const momentum = dailyScore?.overall ?? 0;
  const momentumColor = disciplinaColor(momentum);
  const RING = 48, RING_SW = 5, RING_R = (RING - RING_SW) / 2, RING_C = 2 * Math.PI * RING_R;

  if (loading) {
    return (
      <TabScreen>
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
      </TabScreen>
    );
  }

  return (
    <TabScreen>
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
            {/* Avatar + "YO" → Perfil (Mariana #1: nombre/edad/sexo no se encontraban). */}
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push('/profile' as any); }}
              style={s.identityTap}
            >
              <UserAvatar
                uri={user?.user_metadata?.avatar_url}
                name={user?.user_metadata?.full_name || user?.email || initials}
              />
              <EliteText style={s.topTitle}>YO</EliteText>
            </AnimatedPressable>
            <ElectronBadge />

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
            2. EDAD ATP — Constellation (número estrella) o CTA
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.health} padding={20} style={s.scoreCardWrap}>
            {edadResult ? (
              <SubEdadConstellation result={edadResult} onPressCenter={() => router.push('/edad-atp/result-preview' as any)} />
            ) : (
              <AnimatedPressable onPress={() => { haptic.medium(); router.push('/edad-atp' as any); }} style={s.edadCta}>
                <EliteText style={s.edadCtaTitle}>Calcula tu Edad ATP</EliteText>
                <EliteText style={s.edadCtaSub}>Evaluación {Math.round(edadCE)}% · toca para completar →</EliteText>
              </AnimatedPressable>
            )}
            {/* Card de Edad ATP limpia: solo la constelación + número + cronológica.
                La gamificación (electrones/rango) y las 6 métricas diarias viven en HOY. */}
          </GradientCard>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            2b. DISCIPLINA ATP — momentum de hábitos esta semana (no punitivo, #7)
            ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <AnimatedPressable onPress={() => { haptic.light(); router.push('/reports' as any); }} style={s.disciplinaCard}>
            {/* Anillo que se llena — sin número de "calificación". */}
            <Svg width={RING} height={RING}>
              <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="#1a1a1a" strokeWidth={RING_SW} fill="none" />
              <Circle
                cx={RING / 2} cy={RING / 2} r={RING_R}
                stroke={momentumColor} strokeWidth={RING_SW} fill="none" strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - Math.max(0.04, Math.min(1, momentum / 100)))}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <View style={{ flex: 1 }}>
              <EliteText style={s.disciplinaLabel}>DISCIPLINA ATP</EliteText>
              <EliteText style={[s.disciplinaState, { color: momentumColor }]}>{disciplinaLabel(momentum)}</EliteText>
              <EliteText style={s.disciplinaSub}>Qué tan al día vas con tus hábitos esta semana</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT_COLORS.muted} />
          </AnimatedPressable>
        </Animated.View>

        {/* Edad Biológica / Ritmo del modelo viejo (health-score-engine) ELIMINADO:
            la Edad ATP v2 (constellation arriba) es ahora el gold standard. */}

        {/* Botón de Reportes — acceso al hub de gráficas */}
        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/reports' as any); }}
            style={s.reportsBtn}
          >
            <Ionicons name="bar-chart-outline" size={16} color={ATP_BRAND.lime} />
            <EliteText style={s.reportsBtnText}>VER REPORTES</EliteText>
            <Ionicons name="chevron-forward" size={14} color={ATP_BRAND.lime} />
          </AnimatedPressable>
        </Animated.View>

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
            7. BODY COMPOSITION — solo métricas con dato (sin "--")
            ═══════════════════════════════════════════ */}
        {compFields.length > 0 && (
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <SectionTitle style={s.sectionTitleSpacing}>COMPOSICIÓN CORPORAL</SectionTitle>

          <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-health' as any); }}>
            <View style={s.compGrid}>
              {compFields.map((f) => (
                <View key={f.label} style={s.compCard}>
                  <EliteText style={s.compLabel}>{f.label}</EliteText>
                  <EliteText style={[s.compValue, { color: f.color }]}>{`${f.value}`}</EliteText>
                  <EliteText style={s.compUnit}>{f.unit}</EliteText>
                </View>
              ))}
            </View>
          </AnimatedPressable>
        </Animated.View>
        )}

        {/* ═══════════════════════════════════════════
            8. CONNECT WEARABLE BANNER
            ═══════════════════════════════════════════ */}
        {!wearableData && (
          <Animated.View entering={FadeInUp.delay(550).springify()}>
            <AnimatedPressable style={s.connectBanner} onPress={() => { haptic.light(); router.push('/settings'); }}>
              <Ionicons name="watch-outline" size={20} color={ATP_BRAND.lime} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.connectBannerTitle}>Conecta tu dispositivo</EliteText>
                <EliteText style={s.connectBannerDesc}>Apple Watch, Oura, Garmin para mejorar tus scores</EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#555" />
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Admin: Feedback Dashboard */}
        {isAdmin(user?.id) && (
          <Animated.View entering={FadeInUp.delay(600).springify()} style={{ paddingHorizontal: Spacing.md }}>
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/feedback-dashboard' as any); }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 14, backgroundColor: '#0a0a0a', borderRadius: 14, marginTop: Spacing.md,
                borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
              }}>
                <Ionicons name="bug-outline" size={20} color="#ef4444" />
                <EliteText style={{ color: '#ef4444', fontSize: 14, fontFamily: Fonts.semiBold }}>
                  Feedback Dashboard (Admin)
                </EliteText>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </TabScreen>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
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
  identityTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  scoreCardWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  edadCta: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 6,
  },
  edadCtaTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: '#fff',
  },
  edadCtaSub: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: ATP_BRAND.lime,
  },
  // ── 2b. Disciplina ATP (momentum, no punitivo) ──
  disciplinaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD.bg,
    borderRadius: CARD.borderRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  disciplinaLabel: {
    fontSize: 10, fontFamily: Fonts.bold, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase',
  },
  disciplinaState: { fontSize: FontSizes.md, fontFamily: Fonts.extraBold, marginTop: 1 },
  disciplinaSub: { fontSize: FontSizes.xs, color: '#555', marginTop: 1 },

  // ── Reportes button ──
  reportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(168,224,42,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  reportsBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: ATP_BRAND.lime,
    letterSpacing: 2,
  },

  // ── 5. Sync Status ──
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD.bg,
    borderRadius: 14,
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

  // ── 7. Body Composition ──
  sectionTitleSpacing: {
    marginTop: Spacing.lg,
  },
  compGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: CARD.bg,
    borderRadius: CARD.borderRadius,
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

  // ── 8. Connect Wearable Banner ──
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0d1a0a',
    borderRadius: CARD.borderRadius,
    padding: Spacing.md,
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.15)',
  },
  connectBannerTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  connectBannerDesc: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 2,
  },
});
