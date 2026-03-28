/**
 * Yo — "¿Cómo voy?" Dashboard personal del usuario.
 *
 * Muestra scores de salud, composición corporal, cronotipo,
 * quizzes y acciones rápidas.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { getDashboardData, type DashboardData } from '@/src/services/dashboard-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, SEMANTIC, CATEGORY_COLORS } from '@/src/constants/brand';

// === CONSTANTES ===

const CHRONO_META: Record<string, { emoji: string; name: string; desc: string }> = {
  lion: { emoji: '🦁', name: 'León', desc: 'Madrugador natural' },
  bear: { emoji: '🐻', name: 'Oso', desc: 'Ritmo solar' },
  wolf: { emoji: '🐺', name: 'Lobo', desc: 'Noctámbulo creativo' },
  dolphin: { emoji: '🐬', name: 'Delfín', desc: 'Mente activa' },
};

// === COMPONENTE ===

export default function YoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const d = await getDashboardData();
      setData(d);
    } catch { /* silenciar */ }
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
  const chronoMeta = chrono ? CHRONO_META[chrono.chronotype] : null;

  // Colores funcionales para composición
  const fatColor = comp?.body_fat_pct != null
    ? (comp.body_fat_pct < 20 ? SEMANTIC.success : comp.body_fat_pct < 28 ? SEMANTIC.warning : SEMANTIC.error)
    : TEXT_COLORS.muted;
  const muscleColor = comp?.muscle_mass_pct != null
    ? (comp.muscle_mass_pct > 38 ? SEMANTIC.success : comp.muscle_mass_pct > 30 ? SEMANTIC.warning : SEMANTIC.error)
    : TEXT_COLORS.muted;
  const visceralColor = comp?.visceral_fat != null
    ? (comp.visceral_fat < 7 ? SEMANTIC.success : comp.visceral_fat < 13 ? SEMANTIC.warning : SEMANTIC.error)
    : TEXT_COLORS.muted;

  if (loading) {
    return (
      <ScreenContainer centered>
        <ActivityIndicator size="large" color={ATP_BRAND.lime} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer centered={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
      >
        {/* ══ SECCIÓN 1: Header ══ */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={s.header}>
            <View style={s.avatar}>
              <EliteText style={s.avatarText}>{initials}</EliteText>
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={s.headerName}>{userName}</EliteText>
              {memberSince ? (
                <EliteText variant="caption" style={s.headerSince}>Miembro desde {memberSince}</EliteText>
              ) : null}
              {chronoMeta && (
                <View style={s.chronoPill}>
                  <EliteText style={{ fontSize: 14 }}>{chronoMeta.emoji}</EliteText>
                  <EliteText variant="caption" style={s.chronoPillText}>{chronoMeta.name}</EliteText>
                </View>
              )}
            </View>
            <AnimatedPressable onPress={() => router.push('/settings')} style={s.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ══ SECCIÓN 2: Scores de salud ══ */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <SectionLabel>SCORES DE SALUD</SectionLabel>
          <View style={s.scoresGrid}>
            <ScoreCard
              label="Edad biológica"
              value={hs?.biologicalAge ? Math.round(hs.biologicalAge).toString() : '—'}
              unit="años"
              color={hs?.biologicalAge && data?.chronologicalAge
                ? (hs.biologicalAge < data.chronologicalAge ? SEMANTIC.success : SEMANTIC.error)
                : TEXT_COLORS.muted}
              onPress={() => router.push('/my-health' as any)}
            />
            <ScoreCard
              label="Salud funcional"
              value={hs?.functionalHealthScore ? Math.round(hs.functionalHealthScore).toString() : '—'}
              unit="/100"
              color={hs?.functionalHealthScore
                ? (hs.functionalHealthScore > 80 ? SEMANTIC.success : hs.functionalHealthScore > 60 ? SEMANTIC.warning : SEMANTIC.error)
                : TEXT_COLORS.muted}
              progress={hs?.functionalHealthScore ? hs.functionalHealthScore / 100 : 0}
              onPress={() => router.push('/my-health' as any)}
            />
            <ScoreCard
              label="Envejecimiento"
              value={hs?.agingRate ? hs.agingRate.toFixed(2) : '—'}
              unit="x"
              color={hs?.agingRate
                ? (hs.agingRate < 1.0 ? SEMANTIC.success : hs.agingRate < 1.1 ? SEMANTIC.warning : SEMANTIC.error)
                : TEXT_COLORS.muted}
              onPress={() => router.push('/my-health' as any)}
            />
            <ScoreCard
              label="Calidad eval."
              value={hs?.evaluationQuality != null ? Math.round(hs.evaluationQuality).toString() : '—'}
              unit="%"
              color={hs?.evaluationQuality
                ? (hs.evaluationQuality > 70 ? SEMANTIC.success : hs.evaluationQuality > 40 ? SEMANTIC.warning : SEMANTIC.error)
                : TEXT_COLORS.muted}
              progress={hs?.evaluationQuality ? hs.evaluationQuality / 100 : 0}
              onPress={() => router.push('/my-health' as any)}
            />
          </View>
          {!hs && (
            <EliteText variant="caption" style={s.emptyHint}>Sube tus labs para calcular tus scores</EliteText>
          )}
        </Animated.View>

        {/* ══ SECCIÓN 3: Composición corporal ══ */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <SectionLabel>COMPOSICIÓN CORPORAL</SectionLabel>
          {comp ? (
            <AnimatedPressable onPress={() => router.push('/my-health' as any)} style={s.compCard}>
              <CompStat label="Peso" value={comp.weight_kg != null ? `${comp.weight_kg}` : '—'} unit="kg" color={TEXT_COLORS.primary} />
              <View style={s.compDivider} />
              <CompStat label="Grasa" value={comp.body_fat_pct != null ? `${comp.body_fat_pct}` : '—'} unit="%" color={fatColor} />
              <View style={s.compDivider} />
              <CompStat label="Músculo" value={comp.muscle_mass_pct != null ? `${comp.muscle_mass_pct}` : '—'} unit="%" color={muscleColor} />
              <View style={s.compDivider} />
              <CompStat label="Visceral" value={comp.visceral_fat != null ? `${comp.visceral_fat}` : '—'} unit="" color={visceralColor} />
            </AnimatedPressable>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="body-outline" size={24} color={TEXT_COLORS.muted} />
              <EliteText variant="caption" style={s.emptyCardText}>Tu coach registrará esto en consulta</EliteText>
            </View>
          )}
        </Animated.View>

        {/* ══ SECCIÓN 4: Cronotipo ══ */}
        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <SectionLabel>MI CRONOTIPO</SectionLabel>
          {chrono && chronoMeta ? (
            <AnimatedPressable onPress={() => router.push('/quiz/chronotype' as any)} style={s.chronoCard}>
              <View style={s.chronoTop}>
                <EliteText style={s.chronoEmoji}>{chronoMeta.emoji}</EliteText>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.chronoName}>{chronoMeta.name}</EliteText>
                  <EliteText variant="caption" style={s.chronoDesc}>{chronoMeta.desc}</EliteText>
                </View>
              </View>
              <View style={s.chronoTimeline}>
                <ChronoTime icon="sunny-outline" label="Despertar" time={chrono.wake_time?.slice(0, 5)} color={SEMANTIC.success} />
                <ChronoTime icon="barbell-outline" label="Entreno" time={chrono.peak_physical_start?.slice(0, 5)} color={CATEGORY_COLORS.fitness} />
                <ChronoTime icon="bulb-outline" label="Foco" time={chrono.peak_focus_start?.slice(0, 5)} color={CATEGORY_COLORS.mind} />
                <ChronoTime icon="moon-outline" label="Dormir" time={chrono.sleep_time?.slice(0, 5)} color={SEMANTIC.info} />
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={() => router.push('/quiz/chronotype' as any)} style={s.chronoInvite}>
              <View style={s.chronoInviteIcon}>
                <EliteText style={{ fontSize: 28 }}>🧬</EliteText>
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={s.chronoInviteTitle}>Descubre tu cronotipo</EliteText>
                <EliteText variant="caption" style={s.chronoInviteSub}>10 preguntas · 2 minutos</EliteText>
              </View>
              <Ionicons name="arrow-forward" size={18} color={ATP_BRAND.lime} />
            </AnimatedPressable>
          )}
        </Animated.View>

        {/* ══ SECCIÓN 5: Quizzes ══ */}
        <Animated.View entering={FadeInUp.delay(360).springify()}>
          <SectionLabel>QUIZZES</SectionLabel>
          <View style={s.quizGrid}>
            <QuizPill
              emoji="🧬"
              label="Cronotipo"
              done={!!chrono}
              onPress={() => router.push('/quiz/chronotype' as any)}
            />
            <QuizPill emoji="⚡" label="Energía" done={false} disabled />
            <QuizPill emoji="😴" label="Sueño" done={false} disabled />
            <QuizPill emoji="🧠" label="Estrés" done={false} disabled />
          </View>
        </Animated.View>

        {/* ══ SECCIÓN 6: Acciones rápidas ══ */}
        <Animated.View entering={FadeInUp.delay(440).springify()}>
          <SectionLabel>ACCIONES</SectionLabel>
          <View style={s.actionsRow}>
            <ActionBtn icon="flask-outline" label="Mi Salud" color={CATEGORY_COLORS.metrics} onPress={() => router.push('/my-health' as any)} />
            <ActionBtn icon="heart-circle-outline" label="Check-in" color={CATEGORY_COLORS.mind} onPress={() => router.push('/checkin' as any)} />
            <ActionBtn icon="journal-outline" label="Journal" color={CATEGORY_COLORS.optimization} disabled />
          </View>
        </Animated.View>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === SUB-COMPONENTES ===

function SectionLabel({ children }: { children: string }) {
  return (
    <EliteText variant="caption" style={s.sectionLabel}>{children}</EliteText>
  );
}

function ScoreCard({ label, value, unit, color, progress, onPress }: {
  label: string; value: string; unit: string; color: string; progress?: number; onPress?: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={s.scoreCard}>
      <EliteText variant="caption" style={s.scoreCardLabel}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <EliteText style={[s.scoreCardValue, { color }]}>{value}</EliteText>
        <EliteText variant="caption" style={s.scoreCardUnit}>{unit}</EliteText>
      </View>
      {progress != null && progress > 0 && (
        <View style={s.miniBar}>
          <View style={[s.miniBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </AnimatedPressable>
  );
}

function CompStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={s.compStat}>
      <EliteText variant="caption" style={s.compStatLabel}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
        <EliteText style={[s.compStatValue, { color }]}>{value}</EliteText>
        {unit ? <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>{unit}</EliteText> : null}
      </View>
    </View>
  );
}

function ChronoTime({ icon, label, time, color }: { icon: string; label: string; time: string; color: string }) {
  return (
    <View style={s.chronoTimeItem}>
      <Ionicons name={icon as any} size={14} color={color} />
      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>{label}</EliteText>
      <EliteText variant="caption" style={[s.chronoTimeValue, { color }]}>{time}</EliteText>
    </View>
  );
}

function QuizPill({ emoji, label, done, disabled, onPress }: {
  emoji: string; label: string; done: boolean; disabled?: boolean; onPress?: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[s.quizPill, done && s.quizPillDone, disabled && { opacity: 0.4 }]}
    >
      <EliteText style={{ fontSize: 16 }}>{emoji}</EliteText>
      <EliteText variant="caption" style={[s.quizPillLabel, done && { color: SEMANTIC.success }]}>{label}</EliteText>
      {done && <Ionicons name="checkmark-circle" size={14} color={SEMANTIC.success} />}
      {disabled && <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>Pronto</EliteText>}
    </AnimatedPressable>
  );
}

function ActionBtn({ icon, label, color, onPress, disabled }: {
  icon: string; label: string; color: string; onPress?: () => void; disabled?: boolean;
}) {
  return (
    <AnimatedPressable onPress={onPress} disabled={disabled} style={[s.actionBtn, disabled && { opacity: 0.4 }]}>
      <View style={[s.actionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <EliteText variant="caption" style={s.actionLabel}>{label}</EliteText>
    </AnimatedPressable>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ATP_BRAND.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 18 },
  headerName: { fontFamily: Fonts.bold, fontSize: 20, color: TEXT_COLORS.primary },
  headerSince: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },
  settingsBtn: { padding: Spacing.sm },
  chronoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACES.card,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  chronoPillText: { color: TEXT_COLORS.primary, fontSize: 11, fontFamily: Fonts.semiBold },

  // Section labels
  sectionLabel: {
    color: TEXT_COLORS.secondary,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Scores grid
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scoreCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
  },
  scoreCardLabel: { color: TEXT_COLORS.secondary, fontSize: 11, marginBottom: 4 },
  scoreCardValue: { fontSize: 28, fontFamily: Fonts.extraBold },
  scoreCardUnit: { color: TEXT_COLORS.muted, fontSize: 12 },
  miniBar: {
    height: 3,
    backgroundColor: SURFACES.cardLight,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 2 },
  emptyHint: { color: TEXT_COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: Spacing.sm },

  // Composition
  compCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  compDivider: { width: 1, height: 30, backgroundColor: SURFACES.border },
  compStat: { alignItems: 'center' },
  compStatLabel: { color: TEXT_COLORS.secondary, fontSize: 10, marginBottom: 2 },
  compStatValue: { fontSize: 20, fontFamily: Fonts.bold },
  emptyCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCardText: { color: TEXT_COLORS.muted, fontSize: 12 },

  // Chronotype
  chronoCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
  },
  chronoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  chronoEmoji: { fontSize: 36 },
  chronoName: { fontFamily: Fonts.bold, fontSize: 18, color: TEXT_COLORS.primary },
  chronoDesc: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },
  chronoTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
    paddingTop: Spacing.sm,
  },
  chronoTimeItem: { alignItems: 'center', gap: 2 },
  chronoTimeValue: { fontSize: 12, fontFamily: Fonts.bold },
  chronoInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: ATP_BRAND.lime + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ATP_BRAND.lime + '30',
    padding: Spacing.md,
  },
  chronoInviteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ATP_BRAND.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chronoInviteTitle: { fontFamily: Fonts.bold, color: ATP_BRAND.lime, fontSize: 15 },
  chronoInviteSub: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },

  // Quizzes
  quizGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quizPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACES.card,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  quizPillDone: { borderColor: SEMANTIC.success + '40' },
  quizPillLabel: { color: TEXT_COLORS.primary, fontSize: 11, fontFamily: Fonts.semiBold, flex: 1 },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: TEXT_COLORS.secondary, fontSize: 11 },
});
