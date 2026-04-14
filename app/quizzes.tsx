/**
 * Quizzes — Lista de evaluaciones disponibles.
 *
 * Muestra cada quiz como card. El lifestyle_assessment tiene un hero card especial.
 * Los completados muestran check + fecha.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { BackButton } from '@/src/components/ui/BackButton';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { getAvailableQuizzes, getLastQuizResponse, type QuizData } from '@/src/services/quiz-engine-service';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';

const TEAL = CATEGORY_COLORS.metrics;

// Mapeo de iconos por tipo de quiz (sin emojis)
const QUIZ_ICONS: Record<string, { icon: string; color: string }> = {
  lifestyle_assessment: { icon: 'analytics-outline', color: ATP_BRAND.lime },
  sleep_assessment: { icon: 'moon-outline', color: CATEGORY_COLORS.mind },
  energy_metabolism_assessment: { icon: 'flash-outline', color: CATEGORY_COLORS.optimization },
  stress_assessment: { icon: 'pulse-outline', color: CATEGORY_COLORS.mind },
  digestion_assessment: { icon: 'nutrition-outline', color: CATEGORY_COLORS.nutrition },
  pain_mobility_assessment: { icon: 'body-outline', color: CATEGORY_COLORS.fitness },
};

// Icono por defecto para quizzes sin mapeo
const DEFAULT_QUIZ_ICON = { icon: 'help-circle-outline', color: TEAL };

export default function QuizzesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const available = await getAvailableQuizzes();
      setQuizzes(available);

      // Verificar cuáles ha completado el usuario
      if (user?.id) {
        const completed: Record<string, string> = {};
        for (const q of available) {
          const response = await getLastQuizResponse(user.id, q.quiz_id);
          if (response?.completed_at) {
            completed[q.quiz_id] = response.completed_at;
          }
        }
        setCompletedMap(completed);
      }
    } catch {
      // silenciar errores
    } finally {
      setLoading(false);
    }
  };

  const navigateToQuiz = (quizId: string) => {
    haptic.light();
    router.push({ pathname: '/quiz-take' as any, params: { quiz_id: quizId } });
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getIcon = (quizId: string) => QUIZ_ICONS[quizId] ?? DEFAULT_QUIZ_ICON;

  // Separar hero quiz (lifestyle_assessment) del resto
  const heroQuiz = quizzes.find(q => q.quiz_id === 'lifestyle_assessment');
  const otherQuizzes = quizzes.filter(q => q.quiz_id !== 'lifestyle_assessment');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.header}>
          <BackButton />
          <EliteText style={styles.title}>EVALUACIONES</EliteText>
          <View style={{ width: 44 }} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <EliteText variant="caption" style={styles.subtitle}>
            Responde evaluaciones para recibir protocolos personalizados
          </EliteText>
        </Animated.View>

        {/* ── Hero Card: Lifestyle Assessment ── */}
        {heroQuiz && (
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <GradientCard
              color={ATP_BRAND.lime}
              onPress={() => navigateToQuiz(heroQuiz.quiz_id)}
              style={styles.heroCard}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="analytics-outline" size={36} color={ATP_BRAND.lime} />
                </View>
                <View style={styles.heroInfo}>
                  <EliteText style={styles.heroName}>{heroQuiz.name}</EliteText>
                  <EliteText variant="caption" style={styles.heroDesc} numberOfLines={2}>
                    {heroQuiz.description}
                  </EliteText>
                  <View style={styles.heroMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="help-circle-outline" size={14} color={TEXT_COLORS.secondary} />
                      <EliteText variant="caption" style={styles.metaText}>
                        {heroQuiz.questions?.length ?? '?'} preguntas
                      </EliteText>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={TEXT_COLORS.secondary} />
                      <EliteText variant="caption" style={styles.metaText}>
                        ~{heroQuiz.estimated_time_min} min
                      </EliteText>
                    </View>
                  </View>
                </View>
                {completedMap[heroQuiz.quiz_id] ? (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={ATP_BRAND.lime} />
                    <EliteText variant="caption" style={styles.completedDate}>
                      {formatDate(completedMap[heroQuiz.quiz_id])}
                    </EliteText>
                  </View>
                ) : (
                  <View style={styles.heroCta}>
                    <Ionicons name="arrow-forward" size={20} color={ATP_BRAND.lime} />
                  </View>
                )}
              </View>
            </GradientCard>
          </Animated.View>
        )}

        {/* ── Lista de quizzes ── */}
        {otherQuizzes.length > 0 && (
          <View style={styles.listSection}>
            <EliteText variant="caption" style={styles.sectionLabel}>
              EVALUACIONES DISPONIBLES
            </EliteText>

            {otherQuizzes.map((quiz, idx) => {
              const { icon, color } = getIcon(quiz.quiz_id);
              const isCompleted = !!completedMap[quiz.quiz_id];

              return (
                <StaggerItem key={quiz.quiz_id} index={idx}>
                  <GradientCard
                    color={color}
                    onPress={() => navigateToQuiz(quiz.quiz_id)}
                    style={styles.quizCard}
                  >
                    <View style={styles.quizCardContent}>
                      <View style={[styles.quizIconWrap, { backgroundColor: withOpacity(color, 0.15) }]}>
                        <Ionicons name={icon as any} size={24} color={color} />
                      </View>
                      <View style={styles.quizInfo}>
                        <EliteText style={styles.quizName}>{quiz.name}</EliteText>
                        <View style={styles.quizMeta}>
                          <EliteText variant="caption" style={styles.metaText}>
                            {quiz.questions?.length ?? '?'} preguntas
                          </EliteText>
                          <EliteText variant="caption" style={styles.metaDot}> · </EliteText>
                          <EliteText variant="caption" style={styles.metaText}>
                            ~{quiz.estimated_time_min} min
                          </EliteText>
                        </View>
                      </View>
                      {isCompleted ? (
                        <View style={styles.completedBadgeSmall}>
                          <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                          <EliteText variant="caption" style={styles.completedDateSmall}>
                            {formatDate(completedMap[quiz.quiz_id])}
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
        )}

        {/* ── Estado vacío ── */}
        {!loading && quizzes.length === 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color={TEAL} />
            <EliteText variant="body" style={styles.emptyTitle}>Sin evaluaciones disponibles</EliteText>
            <EliteText variant="caption" style={styles.emptySubtitle}>
              Las evaluaciones se agregan desde el panel de tu coach
            </EliteText>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ATP_BRAND.black,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    letterSpacing: 3,
  },
  subtitle: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  // Hero card
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
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: FontSizes.sm,
    color: TEXT_COLORS.secondary,
    marginBottom: Spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroCta: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Meta items
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.xs,
  },
  metaDot: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
  },

  // Completed badge
  completedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  completedDate: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  completedBadgeSmall: {
    alignItems: 'center',
    gap: 2,
  },
  completedDateSmall: {
    color: TEAL,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
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

  // Estado vacío
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    color: TEXT_COLORS.primary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    color: TEXT_COLORS.secondary,
    textAlign: 'center',
  },
});
