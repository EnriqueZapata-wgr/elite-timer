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
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { isAdmin } from '@/src/constants/admin-config';
import { YoEditorialSection } from '@/src/components/yo/YoEditorialSection';
import { supabase } from '@/src/lib/supabase';

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
  // #yo-editorial: sexo biológico para las variantes -el/-ella (DashboardData no lo trae).
  const [bioSex, setBioSex] = useState<string | null>(null);

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
    // Sexo biológico para imágenes -el/-ella (default male en el picker si falta).
    try {
      if (user?.id) {
        const { data: cp } = await supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle();
        setBioSex((cp as any)?.biological_sex ?? null);
      }
    } catch { /* sin perfil — el picker cae a male */ }
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
            {/* 2.6: ElectronBadge eliminado — el banner persistente (TabScreen) ya muestra E-/H+/Rank. */}

            <View style={{ flex: 1 }} />

            {/* 2.4: pill cronotipo eliminado (redundante con la card CRONOTIPO del feed editorial).
                Queda el acceso a settings. */}
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={s.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color={TEXT_COLORS.muted} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* #yo-editorial 4.3: feed editorial (9 cards) — reemplaza Edad ATP (constelación),
            Disciplina (anillo), botón Ver Reportes y Composición (grid 2x2). */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ marginTop: Spacing.md }}>
          <YoEditorialSection
            sex={bioSex}
            chronotype={chrono?.chronotype}
            edadResult={edadResult}
            composition={comp}
            momentum={momentum}
          />
        </Animated.View>

        {/* #yo-editorial 4.3: DISCIPLINA (anillo) y botón VER REPORTES eliminados — ahora son
            cards editoriales (DISCIPLINA con barra de progreso, VER REPORTES) en YoEditorialSection. */}

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


        {/* #yo-editorial 4.3: COMPOSICIÓN CORPORAL (grid 2x2) eliminada — ahora es EditorialCard
            hero (sex-aware) en YoEditorialSection. */}

        {/* ═══════════════════════════════════════════
            8. CONNECT WEARABLE BANNER
            ═══════════════════════════════════════════ */}
        {!wearableData && (
          <Animated.View entering={FadeInUp.delay(550).springify()}>
            <AnimatedPressable style={s.connectBanner} onPress={() => { haptic.light(); router.push('/settings'); }}>
              <Ionicons name="watch-outline" size={20} color="#888" />
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
