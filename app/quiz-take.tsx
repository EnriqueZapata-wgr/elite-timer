/**
 * QuizTakeScreen — Pantalla para responder un quiz diagnóstico.
 *
 * Flujo: Intro → Preguntas (una por pantalla) → Resultados con recomendaciones.
 * Recibe quiz_id como parámetro de ruta.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { BackButton } from '@/src/components/ui/BackButton';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/contexts/auth-context';
import {
  getQuiz, calculateDomainScores, evaluateRecommendations,
  saveQuizResponse, activateRecommendedProtocols,
  type QuizData, type QuizQuestion, type QuizRecommendation,
} from '@/src/services/quiz-engine-service';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, SURFACES, TEXT_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';

// Color principal de la pantalla
const TEAL = CATEGORY_COLORS.metrics;

export default function QuizTakeScreen() {
  const router = useRouter();
  const { quiz_id } = useLocalSearchParams<{ quiz_id: string }>();
  const { user } = useAuth();

  // === ESTADO ===
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'intro' | 'question' | 'results'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({});
  const [domainScores, setDomainScores] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>([]);
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());
  const [activating, setActivating] = useState(false);

  // === CARGAR QUIZ ===
  useEffect(() => {
    if (!quiz_id) return;
    (async () => {
      try {
        const data = await getQuiz(quiz_id);
        setQuiz(data);
      } catch {
        Alert.alert('Error', 'No se pudo cargar el cuestionario.');
      } finally {
        setLoading(false);
      }
    })();
  }, [quiz_id]);

  // === HANDLERS ===

  /** Seleccionar opción en pregunta actual */
  const handleSelect = (optionIndex: number) => {
    if (!quiz) return;
    haptic.light();
    const question = quiz.questions[currentQ];
    if (question.question_type === 'single_select') {
      setAnswers(prev => ({ ...prev, [question.question_id]: optionIndex }));
    } else {
      // multi_select — toggle
      setAnswers(prev => {
        const current = (prev[question.question_id] as number[]) ?? [];
        const next = current.includes(optionIndex)
          ? current.filter(i => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [question.question_id]: next };
      });
    }
  };

  /** Verificar si una opción está seleccionada */
  const isSelected = (optionIndex: number): boolean => {
    if (!quiz) return false;
    const question = quiz.questions[currentQ];
    const answer = answers[question.question_id];
    if (answer === undefined) return false;
    return Array.isArray(answer) ? answer.includes(optionIndex) : answer === optionIndex;
  };

  /** Avanzar a la siguiente pregunta o finalizar */
  const handleNext = async () => {
    if (!quiz) return;
    haptic.light();
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      // Última pregunta — calcular resultados
      const scores = calculateDomainScores(quiz.questions, answers);
      setDomainScores(scores);
      const recs = await evaluateRecommendations(scores, quiz.protocol_mapping, quiz.max_recommendations);
      setRecommendations(recs);
      // Seleccionar todas las recomendaciones por defecto
      setSelectedRecs(new Set(recs.map(r => r.protocol_key)));
      setStep('results');
    }
  };

  /** Retroceder a la pregunta anterior */
  const handlePrev = () => {
    haptic.light();
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  /** Toggle de recomendación seleccionada */
  const toggleRec = (key: string) => {
    haptic.light();
    setSelectedRecs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Aceptar recomendaciones y activar protocolos */
  const handleAccept = async () => {
    if (!quiz || !user) return;
    setActivating(true);
    try {
      const accepted = recommendations.filter(r => selectedRecs.has(r.protocol_key));
      // Guardar respuesta del quiz
      await saveQuizResponse(
        user.id, quiz.quiz_id, answers, domainScores,
        recommendations.map(r => r.protocol_key),
        accepted.map(r => r.protocol_key),
      );
      // Activar protocolos seleccionados
      const count = await activateRecommendedProtocols(user.id, accepted);
      haptic.success();
      if (count > 0) {
        Alert.alert('Listo', `Se activaron ${count} protocolo${count > 1 ? 's' : ''}.`);
      }
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'No se pudieron activar los protocolos.');
    } finally {
      setActivating(false);
    }
  };

  /** Color de la barra de score según nivel */
  const scoreBarColor = (score: number): string => {
    if (score < 40) return SEMANTIC.error;
    if (score < 70) return SEMANTIC.warning;
    return SEMANTIC.success;
  };

  // === LOADING ===
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <SkeletonLoader variant="text-line" width="50%" />
          <View style={{ height: Spacing.lg }} />
          <SkeletonLoader variant="card" />
          <View style={{ height: Spacing.md }} />
          <SkeletonLoader variant="card" />
        </View>
      </SafeAreaView>
    );
  }

  // === SIN QUIZ ===
  if (!quiz) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.centered}>
          <EliteText variant="body" style={{ color: TEXT_COLORS.secondary }}>
            Cuestionario no encontrado.
          </EliteText>
        </View>
      </SafeAreaView>
    );
  }

  // === FASE 1: INTRO ===
  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText
              variant="title"
              style={[styles.quizTitle, { color: TEAL }]}
            >
              {quiz.name}
            </EliteText>

            <EliteText variant="body" style={styles.description}>
              {quiz.description}
            </EliteText>

            <View style={styles.metaRow}>
              <Ionicons name="help-circle-outline" size={16} color={TEXT_COLORS.secondary} />
              <EliteText variant="label" style={styles.metaText}>
                {quiz.questions.length} preguntas · ~{quiz.estimated_time_min} min
              </EliteText>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <AnimatedPressable onPress={() => { haptic.light(); setStep('question'); }} style={styles.primaryBtn}>
            <EliteText variant="subtitle" style={styles.primaryBtnText}>
              Comenzar
            </EliteText>
            <Ionicons name="arrow-forward" size={20} color={TEXT_COLORS.onAccent} />
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // === FASE 2: PREGUNTAS ===
  if (step === 'question') {
    const question = quiz.questions[currentQ];
    const progress = (currentQ + 1) / quiz.questions.length;
    const hasAnswer = answers[question.question_id] !== undefined;
    const isMulti = question.question_type === 'multi_select';
    const isLast = currentQ === quiz.questions.length - 1;

    return (
      <SafeAreaView style={styles.container}>
        {/* Barra de progreso */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <EliteText variant="label" style={styles.progressLabel}>
            {currentQ + 1} de {quiz.questions.length}
          </EliteText>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Animated.View
            key={currentQ}
            entering={FadeInRight.duration(300)}
            exiting={FadeOutLeft.duration(200)}
          >
            <EliteText variant="subtitle" style={styles.questionText}>
              {question.question_text}
            </EliteText>

            {isMulti && (
              <EliteText variant="caption" style={styles.multiHint}>
                Puedes seleccionar varias opciones
              </EliteText>
            )}

            <View style={styles.optionsContainer}>
              {question.options.map((option, idx) => {
                const selected = isSelected(idx);
                return (
                  <StaggerItem key={idx} index={idx} delay={40}>
                    <AnimatedPressable
                      onPress={() => handleSelect(idx)}
                      style={[
                        styles.optionCard,
                        selected && styles.optionCardSelected,
                      ]}
                    >
                      {/* Indicador radio / checkbox */}
                      <View style={[
                        styles.optionIndicator,
                        isMulti ? styles.checkbox : styles.radio,
                        selected && styles.indicatorSelected,
                      ]}>
                        {selected && (
                          <Ionicons name="checkmark" size={14} color={TEXT_COLORS.onAccent} />
                        )}
                      </View>

                      <EliteText
                        variant="body"
                        style={[styles.optionText, selected && styles.optionTextSelected]}
                      >
                        {option.text}
                      </EliteText>
                    </AnimatedPressable>
                  </StaggerItem>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Navegación inferior */}
        <View style={styles.navBar}>
          <Pressable
            onPress={handlePrev}
            disabled={currentQ === 0}
            style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={currentQ === 0 ? TEXT_COLORS.muted : TEXT_COLORS.primary}
            />
            <EliteText
              variant="label"
              style={{ color: currentQ === 0 ? TEXT_COLORS.muted : TEXT_COLORS.primary }}
            >
              Anterior
            </EliteText>
          </Pressable>

          <AnimatedPressable
            onPress={handleNext}
            disabled={!hasAnswer}
            style={[styles.nextBtn, !hasAnswer && { opacity: 0.4 }]}
          >
            <EliteText variant="label" style={{ color: TEXT_COLORS.onAccent }}>
              {isLast ? 'Ver resultados' : 'Siguiente'}
            </EliteText>
            <Ionicons name="arrow-forward" size={16} color={TEXT_COLORS.onAccent} />
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // === FASE 3: RESULTADOS ===
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText variant="title" style={[styles.quizTitle, { color: TEAL }]}>
            Tus resultados
          </EliteText>

          {/* Scores por dominio */}
          <View style={styles.scoresSection}>
            {Object.entries(domainScores).map(([domain, score], idx) => (
              <StaggerItem key={domain} index={idx}>
                <View style={styles.scoreRow}>
                  <EliteText variant="label" style={styles.domainLabel}>
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </EliteText>
                  <View style={styles.barContainer}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${score}%`, backgroundColor: scoreBarColor(score) },
                        ]}
                      />
                    </View>
                    <EliteText variant="label" style={[styles.scoreValue, { color: scoreBarColor(score) }]}>
                      {score}/100
                    </EliteText>
                  </View>
                </View>
              </StaggerItem>
            ))}
          </View>

          {/* Recomendaciones */}
          {recommendations.length > 0 && (
            <View style={styles.recsSection}>
              <EliteText variant="subtitle" style={styles.recsTitle}>
                Protocolos recomendados
              </EliteText>

              {recommendations.map((rec, idx) => {
                const active = selectedRecs.has(rec.protocol_key);
                return (
                  <StaggerItem key={rec.protocol_key} index={idx} delay={60}>
                    <View style={styles.recCard}>
                      <View style={styles.recInfo}>
                        <EliteText variant="body" style={styles.recName}>
                          {rec.template_name ?? rec.protocol_key.replace(/_/g, ' ')}
                        </EliteText>
                      </View>
                      <Pressable
                        onPress={() => toggleRec(rec.protocol_key)}
                        style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                      >
                        <EliteText
                          variant="label"
                          style={{ color: active ? TEXT_COLORS.onAccent : TEXT_COLORS.secondary }}
                        >
                          {active ? 'Activado' : 'Activar'}
                        </EliteText>
                      </Pressable>
                    </View>
                  </StaggerItem>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Botones inferiores */}
      <View style={styles.bottomBar}>
        <AnimatedPressable
          onPress={handleAccept}
          disabled={activating || selectedRecs.size === 0}
          style={[styles.primaryBtn, (activating || selectedRecs.size === 0) && { opacity: 0.5 }]}
        >
          <EliteText variant="subtitle" style={styles.primaryBtnText}>
            {activating ? 'Activando...' : 'Aceptar recomendaciones'}
          </EliteText>
        </AnimatedPressable>

        <Pressable
          onPress={() => { haptic.light(); router.push('/protocol-explorer' as any); }}
          style={styles.textLink}
        >
          <EliteText variant="label" style={{ color: TEAL }}>
            Explorar más protocolos →
          </EliteText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Intro
  quizTitle: {
    fontSize: FontSizes.hero,
    marginBottom: Spacing.md,
  },
  description: {
    color: TEXT_COLORS.secondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    color: TEXT_COLORS.secondary,
  },

  // Progreso
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: SURFACES.cardLight,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.pill,
  },
  progressLabel: {
    color: TEXT_COLORS.secondary,
    minWidth: 50,
    textAlign: 'right',
  },

  // Preguntas
  questionText: {
    fontSize: FontSizes.xl,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  multiHint: {
    color: TEXT_COLORS.muted,
    marginBottom: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  optionCardSelected: {
    borderColor: ATP_BRAND.lime,
    borderWidth: 1.5,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06),
  },
  optionIndicator: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SURFACES.disabled,
  },
  radio: {
    borderRadius: 11,
  },
  checkbox: {
    borderRadius: Radius.xs,
  },
  indicatorSelected: {
    backgroundColor: ATP_BRAND.lime,
    borderColor: ATP_BRAND.lime,
  },
  optionText: {
    flex: 1,
    color: TEXT_COLORS.primary,
  },
  optionTextSelected: {
    color: ATP_BRAND.lime,
    fontFamily: Fonts.semiBold,
  },

  // Navegación de preguntas
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: ATP_BRAND.lime,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },

  // Resultados — scores
  scoresSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  scoreRow: {
    gap: Spacing.xs,
  },
  domainLabel: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold,
    textTransform: 'capitalize',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: SURFACES.cardLight,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  scoreValue: {
    minWidth: 48,
    textAlign: 'right',
    fontFamily: Fonts.semiBold,
  },

  // Resultados — recomendaciones
  recsSection: {
    marginTop: Spacing.md,
  },
  recsTitle: {
    marginBottom: Spacing.md,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  recName: {
    color: TEXT_COLORS.primary,
  },
  toggleBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SURFACES.disabled,
  },
  toggleBtnActive: {
    backgroundColor: ATP_BRAND.lime,
    borderColor: ATP_BRAND.lime,
  },

  // Botones inferiores
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime,
    paddingVertical: Spacing.md,
    borderRadius: Radius.card,
    gap: Spacing.sm,
  },
  primaryBtnText: {
    color: TEXT_COLORS.onAccent,
    fontSize: FontSizes.lg,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
