/**
 * Yo — "¿Cómo voy?" Grid de categorías de bienestar.
 *
 * Cada card navega al detalle de esa categoría.
 * Fitness es la única activa por ahora, las demás son "Próximamente".
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';
import { getUserChronotype, type ChronotypeData } from '@/src/services/quiz-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS } from '@/src/constants/brand';
import { INTERVENTION_TYPES, type InterventionType } from '@/src/constants/categories';

// === CATEGORÍAS (derivadas de la fuente única) ===

interface Category {
  key: InterventionType;
  label: string;
  icon: string;
  color: string;
  active: boolean;
}

const CATEGORIES: Category[] = (
  ['fitness', 'nutrition', 'mind', 'optimization', 'metrics', 'rest'] as InterventionType[]
).map(k => ({
  key: k,
  label: INTERVENTION_TYPES[k].label,
  icon: INTERVENTION_TYPES[k].icon,
  color: INTERVENTION_TYPES[k].color,
  active: k === 'fitness' || k === 'mind' || k === 'metrics',
}));

// === COMPONENTE ===

export default function YoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });
  const [chronotype, setChronotype] = useState<ChronotypeData | null>(null);
  const [chronoLoaded, setChronoLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getWeeklyStats().then(setWeekStats).catch(() => {});
      getUserChronotype().then(c => { setChronotype(c); setChronoLoaded(true); }).catch(() => setChronoLoaded(true));
    }, [])
  );

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';

  const getSubtitle = (cat: Category): string => {
    if (cat.key === 'fitness') {
      return `${weekStats.workouts} sesion${weekStats.workouts !== 1 ? 'es' : ''} esta semana`;
    }
    return 'Próximamente';
  };

  const handleCardPress = (cat: Category) => {
    if (cat.key === 'fitness') {
      router.push('/personal-records');
    } else if (cat.key === 'mind') {
      router.push('/mind-hub');
    } else if (cat.key === 'metrics') {
      router.push('/my-health');
    } else {
      Alert.alert(cat.label, 'Próximamente');
    }
  };

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <View>
              <EliteText style={styles.title}>YO</EliteText>
              <EliteText variant="body" style={styles.userName}>{userName}</EliteText>
              <EliteText variant="caption" style={styles.score}>ATP Score: --</EliteText>
            </View>
            <AnimatedPressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ── Cronotipo ── */}
        {chronoLoaded && (
          <Animated.View entering={FadeInUp.delay(80).springify()}>
            {chronotype ? (
              <AnimatedPressable onPress={() => router.push('/quiz/chronotype' as any)} style={styles.chronoCard}>
                <EliteText style={styles.chronoEmoji}>
                  {chronotype.chronotype === 'lion' ? '🦁' : chronotype.chronotype === 'bear' ? '🐻' : chronotype.chronotype === 'wolf' ? '🐺' : '🐬'}
                </EliteText>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.chronoName}>
                    {chronotype.chronotype === 'lion' ? 'León' : chronotype.chronotype === 'bear' ? 'Oso' : chronotype.chronotype === 'wolf' ? 'Lobo' : 'Delfín'}
                  </EliteText>
                  <EliteText variant="caption" style={styles.chronoSub}>
                    Despertar {chronotype.wake_time?.slice(0, 5)} · Dormir {chronotype.sleep_time?.slice(0, 5)}
                  </EliteText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </AnimatedPressable>
            ) : (
              <AnimatedPressable onPress={() => router.push('/quiz/chronotype' as any)} style={styles.chronoInvite}>
                <View style={styles.chronoInviteLeft}>
                  <EliteText style={{ fontSize: 28 }}>🧬</EliteText>
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.chronoInviteTitle}>Descubre tu cronotipo</EliteText>
                  <EliteText variant="caption" style={styles.chronoInviteSub}>
                    ¿León, oso, lobo o delfín? Optimiza tus horarios.
                  </EliteText>
                </View>
                <Ionicons name="arrow-forward" size={18} color={ATP_BRAND.lime} />
              </AnimatedPressable>
            )}
          </Animated.View>
        )}

        {/* ── Grid de categorías ── */}
        <View style={styles.grid}>
          {CATEGORIES.map((cat, idx) => (
            <Animated.View
              key={cat.key}
              entering={(idx % 2 === 0 ? FadeInLeft : FadeInRight).delay(100 + idx * 80).duration(400).springify()}
              style={styles.gridItem}
            >
              <GradientCard
                color={cat.color}
                onPress={() => handleCardPress(cat)}
                style={[styles.card, !cat.active && styles.cardInactive]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardIconRow}>
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    {!cat.active && (
                      <View style={styles.comingSoonBadge}>
                        <EliteText variant="caption" style={styles.comingSoonText}>PRONTO</EliteText>
                      </View>
                    )}
                  </View>
                  <EliteText variant="body" style={[styles.cardLabel, { color: cat.color }]}>
                    {cat.label}
                  </EliteText>
                  <EliteText variant="caption" style={[
                    styles.cardSubtitle,
                    cat.active && { color: cat.color },
                  ]}>
                    {getSubtitle(cat)}
                  </EliteText>
                </View>

                {cat.active && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.cardChevron} />
                )}
              </GradientCard>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
    letterSpacing: 4,
  },
  userName: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  score: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  settingsBtn: { padding: Spacing.sm },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
  card: {
    minHeight: 110,
  },
  cardInactive: {
    opacity: 0.5,
  },
  cardBody: {
    padding: 20,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  cardChevron: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  comingSoonBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  comingSoonText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  // Cronotipo
  chronoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  chronoEmoji: { fontSize: 32 },
  chronoName: { fontFamily: Fonts.bold, color: Colors.textPrimary, fontSize: 16 },
  chronoSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  chronoInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: ATP_BRAND.lime + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ATP_BRAND.lime + '30',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  chronoInviteLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ATP_BRAND.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chronoInviteTitle: { fontFamily: Fonts.bold, color: ATP_BRAND.lime, fontSize: 15 },
  chronoInviteSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
});
