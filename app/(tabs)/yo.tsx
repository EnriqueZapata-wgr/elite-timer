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
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useAuth } from '@/src/contexts/auth-context';
import { getDashboardData, type DashboardData } from '@/src/services/dashboard-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, SEMANTIC, CATEGORY_COLORS } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';

// === CONSTANTES ===

const CHRONO_META: Record<string, { emoji: string; name: string; desc: string }> = {
  lion: { emoji: '🦁', name: 'León', desc: 'Madrugador natural' },
  bear: { emoji: '🐻', name: 'Oso', desc: 'Ritmo solar' },
  wolf: { emoji: '🐺', name: 'Lobo', desc: 'Noctámbulo creativo' },
  dolphin: { emoji: '🐬', name: 'Delfín', desc: 'Mente activa' },
};

const SCORE_META = [
  { key: 'bio', label: 'Edad biológica', icon: 'fitness-outline', accent: CATEGORY_COLORS.mind },
  { key: 'func', label: 'Salud funcional', icon: 'heart-outline', accent: ATP_BRAND.teal2 },
  { key: 'aging', label: 'Envejecimiento', icon: 'hourglass-outline', accent: SEMANTIC.warning },
  { key: 'eval', label: 'Calidad eval.', icon: 'clipboard-outline', accent: ATP_BRAND.green1 },
] as const;

// === COMPONENTE ===

export default function YoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try { setData(await getDashboardData()); } catch { /* silenciar */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const userName = user?.user_metadata?.full_name || data?.profile?.full_name || user?.email?.split('@')[0] || 'Atleta';
  const memberSince = data?.profile?.created_at
    ? new Date(data.profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : '';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const hs = data?.healthScore;
  const comp = data?.composition;
  const chrono = data?.chronotype;
  const cm = chrono ? CHRONO_META[chrono.chronotype] : null;

  // Valores de scores
  const scoreValues = {
    bio: hs?.biologicalAge ? Math.round(hs.biologicalAge).toString() : null,
    func: hs?.functionalHealthScore ? Math.round(hs.functionalHealthScore).toString() : null,
    aging: hs?.agingRate ? hs.agingRate.toFixed(2) : null,
    eval: hs?.evaluationQuality != null ? Math.round(hs.evaluationQuality).toString() : null,
  };
  const scoreUnits = { bio: 'años', func: '/100', aging: 'x', eval: '%' };
  const scoreColors = {
    bio: hs?.biologicalAge && data?.chronologicalAge ? (hs.biologicalAge < data.chronologicalAge ? SEMANTIC.success : SEMANTIC.error) : null,
    func: hs?.functionalHealthScore ? (hs.functionalHealthScore > 80 ? SEMANTIC.success : hs.functionalHealthScore > 60 ? SEMANTIC.warning : SEMANTIC.error) : null,
    aging: hs?.agingRate ? (hs.agingRate < 1.0 ? SEMANTIC.success : hs.agingRate < 1.1 ? SEMANTIC.warning : SEMANTIC.error) : null,
    eval: hs?.evaluationQuality ? (hs.evaluationQuality > 70 ? SEMANTIC.success : hs.evaluationQuality > 40 ? SEMANTIC.warning : SEMANTIC.error) : null,
  };
  const scoreProgress = {
    bio: 0, func: hs?.functionalHealthScore ? hs.functionalHealthScore / 100 : 0,
    aging: 0, eval: hs?.evaluationQuality ? hs.evaluationQuality / 100 : 0,
  };

  // Colores composición
  const fatColor = comp?.body_fat_pct != null ? (comp.body_fat_pct < 20 ? SEMANTIC.success : comp.body_fat_pct < 28 ? SEMANTIC.warning : SEMANTIC.error) : null;
  const muscleColor = comp?.muscle_mass_pct != null ? (comp.muscle_mass_pct > 38 ? SEMANTIC.success : comp.muscle_mass_pct > 30 ? SEMANTIC.warning : SEMANTIC.error) : null;
  const visceralColor = comp?.visceral_fat != null ? (comp.visceral_fat < 7 ? SEMANTIC.success : comp.visceral_fat < 13 ? SEMANTIC.warning : SEMANTIC.error) : null;

  if (loading) {
    /* Skeleton de carga — reemplaza ActivityIndicator */
    return (
      <ScreenContainer centered={false}>
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
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer centered={false}>
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
                <View style={[st.chronoPill, { backgroundColor: CATEGORY_COLORS.optimization + '20' }]}>
                  <EliteText style={{ fontSize: 14 }}>{cm.emoji}</EliteText>
                  <EliteText variant="caption" style={st.chronoPillText}>{cm.name}</EliteText>
                </View>
              )}
            </View>
            <AnimatedPressable onPress={() => { haptic.light(); router.push('/settings'); }} style={st.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ══ 2. SCORES DE SALUD ══ */}
        <SectionLabel>SCORES DE SALUD</SectionLabel>
        <View style={st.scoresGrid}>
          {SCORE_META.map((sm, idx) => {
            const val = scoreValues[sm.key as keyof typeof scoreValues];
            const color = scoreColors[sm.key as keyof typeof scoreColors];
            const prog = scoreProgress[sm.key as keyof typeof scoreProgress];
            const unit = scoreUnits[sm.key as keyof typeof scoreUnits];
            return (
              <View key={sm.key} style={st.scoreCardWrap}>
                <StaggerItem index={idx} delay={80}>
                  <AnimatedPressable onPress={() => { haptic.selection(); router.push('/my-health' as any); }} style={[st.scoreCard, { borderLeftColor: sm.accent }]}>
                    <View style={st.scoreCardHeader}>
                      <Ionicons name={sm.icon as any} size={val ? 16 : 36} color={val ? sm.accent : sm.accent + '40'} />
                      <EliteText variant="caption" style={[st.scoreCardLabel, { color: sm.accent }]}>{sm.label}</EliteText>
                    </View>
                    {val ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                          <EliteText style={[st.scoreCardValue, { color: color ?? sm.accent }]}>{val}</EliteText>
                          <EliteText variant="caption" style={st.scoreCardUnit}>{unit}</EliteText>
                        </View>
                        {prog > 0 && (
                          <View style={st.miniBar}>
                            <View style={[st.miniBarFill, { width: `${Math.min(prog * 100, 100)}%`, backgroundColor: color ?? sm.accent }]} />
                          </View>
                        )}
                      </>
                    ) : (
                      <EliteText variant="caption" style={st.scoreCardEmpty}>Sube labs</EliteText>
                    )}
                  </AnimatedPressable>
                </StaggerItem>
              </View>
            );
          })}
        </View>

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
                  <EliteText style={st.chronoEmoji}>{cm.emoji}</EliteText>
                  <View style={{ flex: 1 }}>
                    <EliteText style={st.chronoName}>{cm.name}</EliteText>
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
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 9 }}>{t.label}</EliteText>
                        <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: 12, fontFamily: Fonts.bold }}>{t.time}</EliteText>
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
                  <EliteText style={{ fontSize: 32 }}>🧬</EliteText>
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
    </ScreenContainer>
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
        {unit ? <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>{unit}</EliteText> : null}
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
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  avatarRing: { width: 64, height: 64, borderRadius: Radius.pill },
  avatarGradient: { width: 64, height: 64, borderRadius: Radius.pill, padding: 3 },
  avatarInner: { flex: 1, borderRadius: Radius.pill, backgroundColor: SURFACES.base, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 20 },
  headerName: { fontFamily: Fonts.bold, fontSize: 24, color: TEXT_COLORS.primary },
  headerSince: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },
  settingsBtn: { padding: Spacing.sm },
  chronoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 },
  chronoPillText: { color: TEXT_COLORS.primary, fontSize: 12, fontFamily: Fonts.semiBold },

  // Section labels
  sectionLabel: { color: TEXT_COLORS.secondary, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2, marginTop: Spacing.xl, marginBottom: Spacing.sm },

  // Scores
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scoreCardWrap: { width: '48%', flexGrow: 1 },
  scoreCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    borderLeftWidth: 3, padding: Spacing.md,
  },
  scoreCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scoreCardLabel: { fontSize: 11, fontFamily: Fonts.semiBold },
  scoreCardValue: { fontSize: 32, fontFamily: Fonts.extraBold },
  scoreCardUnit: { color: TEXT_COLORS.muted, fontSize: 12 },
  scoreCardEmpty: { color: TEXT_COLORS.muted, fontSize: 12, marginTop: 4 },
  miniBar: { height: 3, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, marginTop: Spacing.sm, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: Radius.xs },

  // Composition (with data)
  compCard: {
    flexDirection: 'row', backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, justifyContent: 'space-around', alignItems: 'center',
  },
  compDivider: { width: 1, height: 30, backgroundColor: SURFACES.border },
  compStat: { alignItems: 'center' },
  compStatLabel: { color: TEXT_COLORS.secondary, fontSize: 10, marginBottom: 2 },
  compStatValue: { fontSize: 20, fontFamily: Fonts.bold },
  // Composition (empty)
  compEmptyRow: { flexDirection: 'row', gap: 8 },
  compEmptyCard: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.sm, alignItems: 'center', gap: 4,
  },
  compEmptyLabel: { color: TEXT_COLORS.muted, fontSize: 10 },
  compEmptyValue: { color: TEXT_COLORS.muted, fontSize: 18, fontFamily: Fonts.bold },

  // Chronotype hero
  chronoHero: { borderRadius: Radius.md, borderWidth: 1, borderColor: ATP_BRAND.lime + '20', padding: Spacing.md, overflow: 'hidden' },
  chronoTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  chronoEmoji: { fontSize: 48 },
  chronoName: { fontFamily: Fonts.extraBold, fontSize: 22, color: TEXT_COLORS.primary },
  chronoDesc: { color: TEXT_COLORS.secondary, fontSize: 13, marginTop: 2 },
  chronoTimeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 0.5, borderTopColor: SURFACES.border, paddingTop: Spacing.md },
  chronoTimeItem: { alignItems: 'center', gap: 3 },
  chronoTimeDot: { width: 30, height: 30, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  chronoTimeConnector: { width: 16, height: 1, backgroundColor: SURFACES.border, marginTop: 14 },
  // Chronotype invite
  chronoInvite: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: ATP_BRAND.lime + '30', padding: Spacing.lg, overflow: 'hidden' },
  chronoInviteIcon: { width: 56, height: 56, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime + '15', alignItems: 'center', justifyContent: 'center' },
  chronoInviteTitle: { fontFamily: Fonts.bold, color: ATP_BRAND.lime, fontSize: 17 },
  chronoInviteSub: { color: TEXT_COLORS.secondary, fontSize: 13, marginTop: 2 },

  // Quizzes (2 columnas)
  quizGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quizCard: {
    width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  quizCardLabel: { flex: 1, color: TEXT_COLORS.primary, fontSize: 14, fontFamily: Fonts.semiBold },
  quizCardSoonBadge: { backgroundColor: SURFACES.disabled, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill },
  quizCardSoonText: { color: TEXT_COLORS.muted, fontSize: 9, fontFamily: Fonts.bold },

  // Actions
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    borderLeftWidth: 3, padding: Spacing.md,
  },
  actionIcon: { width: 40, height: 40, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: Fonts.semiBold, color: TEXT_COLORS.primary, fontSize: 14 },
  actionSub: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 1 },
});
