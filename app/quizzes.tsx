/**
 * Quizzes — ATP TESTS
 *
 * Braverman (hero card) + 5 evaluaciones funcionales.
 * Sin quizzes legacy de DB.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { ALL_FUNCTIONAL_QUIZZES } from '@/src/constants/functional-quizzes';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { supabase } from '@/src/lib/supabase';

const BRAVERMAN_COLOR = '#c084fc';

export default function QuizzesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [functionalCompletedMap, setFunctionalCompletedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  const loadCompletionStatus = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('functional_quiz_results')
        .select('quiz_id, completed_at')
        .eq('user_id', user.id)
        .eq('is_complete', true)
        .order('completed_at', { ascending: false });
      if (data) {
        const completed: Record<string, string> = {};
        for (const r of data) {
          if (!completed[r.quiz_id] && r.completed_at) {
            completed[r.quiz_id] = r.completed_at;
          }
        }
        setFunctionalCompletedMap(completed);
      }
    } catch { /* silenciar */ }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="tests" title="TESTS" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Responde evaluaciones para recibir protocolos personalizados
          </EliteText>
        </Animated.View>

        {/* ── Braverman Hero Card ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <GradientCard
            color={BRAVERMAN_COLOR}
            onPress={() => { haptic.medium(); router.push('/braverman' as any); }}
            style={s.heroCard}
          >
            <View style={s.heroContent}>
              <View style={s.heroIconWrap}>
                <EliteText style={{ fontSize: 28 }}>🧬</EliteText>
              </View>
              <View style={s.heroInfo}>
                <EliteText style={s.heroName}>Test de Braverman</EliteText>
                <EliteText variant="caption" style={s.heroDesc} numberOfLines={2}>
                  Perfil de neurotransmisores · 313 preguntas · ~20 min
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.secondary} />
            </View>
          </GradientCard>
        </Animated.View>

        {/* ── Evaluaciones Funcionales ── */}
        <View style={s.listSection}>
          <EliteText variant="caption" style={s.sectionLabel}>
            EVALUACIONES FUNCIONALES
          </EliteText>

          {ALL_FUNCTIONAL_QUIZZES.map((fq, idx) => {
            const isCompleted = !!functionalCompletedMap[fq.id];

            return (
              <StaggerItem key={fq.id} index={idx}>
                <GradientCard
                  color={fq.color}
                  onPress={() => {
                    haptic.light();
                    router.push({ pathname: '/functional-quiz' as any, params: { quiz_id: fq.id } });
                  }}
                  style={s.quizCard}
                >
                  <View style={s.quizCardContent}>
                    <View style={[s.quizIconWrap, { backgroundColor: withOpacity(fq.color, 0.15) }]}>
                      <EliteText style={{ fontSize: 22 }}>{fq.emoji}</EliteText>
                    </View>
                    <View style={s.quizInfo}>
                      <EliteText style={s.quizName}>{fq.name}</EliteText>
                      <EliteText variant="caption" style={[s.metaText, { marginBottom: 2 }]} numberOfLines={1}>
                        {fq.subtitle}
                      </EliteText>
                      <View style={s.quizMeta}>
                        <EliteText variant="caption" style={s.metaText}>
                          {fq.questions.length} preguntas
                        </EliteText>
                        <EliteText variant="caption" style={s.metaDot}> · </EliteText>
                        <EliteText variant="caption" style={s.metaText}>
                          ~{fq.estimatedMinutes} min
                        </EliteText>
                      </View>
                    </View>
                    {isCompleted ? (
                      <View style={s.completedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color={fq.color} />
                        <EliteText variant="caption" style={[s.completedDate, { color: fq.color }]}>
                          {formatDate(functionalCompletedMap[fq.id])}
                        </EliteText>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.secondary} />
                    )}
                  </View>
                </GradientCard>
              </StaggerItem>
            );
          })}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.md,
  },
  subtitle: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },

  // Braverman hero
  heroCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: withOpacity(BRAVERMAN_COLOR, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: BRAVERMAN_COLOR,
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: FontSizes.sm,
    color: TEXT_COLORS.secondary,
  },

  // Sección lista
  listSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    color: TEXT_COLORS.secondary,
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.xs,
  },

  // Quiz card
  quizCard: {
    padding: Spacing.md,
  },
  quizCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quizIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizInfo: {
    flex: 1,
  },
  quizName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: TEXT_COLORS.primary,
    marginBottom: 2,
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.xs,
  },
  metaDot: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
  },

  // Completed
  completedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  completedDate: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
});
