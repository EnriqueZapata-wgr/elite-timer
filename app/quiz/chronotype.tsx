/**
 * Quiz de Cronotipo — ¿Eres león, oso, lobo o delfín?
 *
 * 10 preguntas con animaciones, resultado visual con scores y horarios.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, FadeIn, ZoomIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Colors, Spacing, Fonts, Radius } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, SEMANTIC, CATEGORY_COLORS } from '@/src/constants/brand';
import { supabase } from '@/src/lib/supabase';
import {
  getQuizTemplate, submitQuizResult, saveUserChronotype,
  calculateChronotypeScores, determineChronotype,
  type QuizTemplate, type QuizQuestion, type Chronotype, type ChronotypeInfo,
} from '@/src/services/quiz-service';

// === CONSTANTES ===

const ANIMAL_COLORS: Record<Chronotype, string> = {
  lion: '#F5A623',
  bear: '#8B6914',
  wolf: '#7F77DD',
  dolphin: '#5B9BD5',
};

const ANIMAL_EMOJIS: Record<Chronotype, string> = {
  lion: '🦁', bear: '🐻', wolf: '🐺', dolphin: '🐬',
};

const ANIMAL_NAMES: Record<Chronotype, string> = {
  lion: 'León', bear: 'Oso', wolf: 'Lobo', dolphin: 'Delfín',
};

// === COMPONENTE ===

type Phase = 'quiz' | 'result';

export default function ChronotypeQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const [quiz, setQuiz] = useState<QuizTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>('quiz');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Chronotype>('bear');
  const [saving, setSaving] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);

  useEffect(() => {
    getQuizTemplate('chronotype')
      .then(t => { setQuiz(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ScreenContainer centered>
        <ActivityIndicator size="large" color={ATP_BRAND.lime} />
      </ScreenContainer>
    );
  }

  if (!quiz) {
    return (
      <ScreenContainer centered>
        <EliteText variant="body" style={{ color: TEXT_COLORS.secondary }}>
          Quiz no disponible. Ejecuta la migración 025.
        </EliteText>
        <AnimatedPressable onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <EliteText variant="body" style={{ color: ATP_BRAND.lime }}>Volver</EliteText>
        </AnimatedPressable>
      </ScreenContainer>
    );
  }

  const questions = quiz.questions as QuizQuestion[];
  const total = questions.length;
  const question = questions[currentQ];
  const selected = answers[question?.id];
  const progress = ((currentQ + (selected ? 1 : 0)) / total) * 100;

  // === HANDLERS ===

  const selectOption = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
  };

  const nextQuestion = () => {
    if (currentQ < total - 1) {
      setCurrentQ(prev => prev + 1);
      setQuestionKey(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const s = calculateChronotypeScores(questions, answers);
    const r = determineChronotype(s);
    setScores(s);
    setResult(r);
    setPhase('result');
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      const schedules = quiz.scoring_logic?.chronotype_schedules;
      const schedule = schedules?.[result] as ChronotypeInfo | undefined;
      if (schedule) {
        await submitQuizResult(quiz.id, answers, scores, result, { schedule });
        await saveUserChronotype(result, schedule, scores);
      }
      // Update onboarding step
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ onboarding_step: 'chronotype' }).eq('id', user.id).then(() => {}, () => {});
      }
      // If from onboarding, continue to quiz integral
      const fromOnboarding = params?.from === 'onboarding';
      if (fromOnboarding) {
        router.replace('/quiz-take?quiz_id=lifestyle_assessment&from=onboarding' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      if (__DEV__) console.error('[chronotype save]', err);
    }
    setSaving(false);
  };

  const handleRetry = () => {
    setPhase('quiz');
    setCurrentQ(0);
    setAnswers({});
    setScores({});
    setQuestionKey(prev => prev + 1);
  };

  // === RENDER: QUIZ ===

  if (phase === 'quiz') {
    return (
      <ScreenContainer centered={false}>
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={ATP_BRAND.lime} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <EliteText style={styles.headerTitle}>Descubre tu cronotipo</EliteText>
              <EliteText variant="caption" style={styles.headerSub}>
                {total} preguntas · 2 minutos
              </EliteText>
            </View>
          </View>
        </Animated.View>

        {/* Barra de progreso */}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <EliteText variant="caption" style={styles.progressLabel}>
          {currentQ + 1} / {total}
        </EliteText>

        {/* Pregunta */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.quizContent}>
          <Animated.View key={questionKey} entering={SlideInRight.duration(250).springify()}>
            <EliteText style={styles.questionText}>{question.text}</EliteText>

            <View style={styles.optionsContainer}>
              {question.options.map((opt, idx) => {
                const isSelected = selected === opt.id;
                return (
                  <Animated.View key={opt.id} entering={FadeInUp.delay(100 + idx * 60).springify()}>
                    <AnimatedPressable
                      onPress={() => selectOption(opt.id)}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionSelected,
                      ]}
                    >
                      <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                        {isSelected && <View style={styles.optionRadioDot} />}
                      </View>
                      <EliteText variant="body" style={[
                        styles.optionText,
                        isSelected && { color: ATP_BRAND.lime },
                      ]}>
                        {opt.text}
                      </EliteText>
                    </AnimatedPressable>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {/* Botón siguiente */}
          {selected && (
            <Animated.View entering={FadeInUp.delay(50).springify()}>
              <AnimatedPressable onPress={nextQuestion} style={styles.nextBtn}>
                <EliteText variant="body" style={styles.nextBtnText}>
                  {currentQ < total - 1 ? 'Siguiente' : 'Ver mi resultado'}
                </EliteText>
                <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />
              </AnimatedPressable>
            </Animated.View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  // === RENDER: RESULTADO ===

  const maxScore = total * 3;
  const schedules = quiz.scoring_logic?.chronotype_schedules;
  const schedule = schedules?.[result] as ChronotypeInfo | undefined;
  const animals: Chronotype[] = ['lion', 'bear', 'wolf', 'dolphin'];

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultContent}>
        {/* Step indicator (onboarding) */}
        {params?.from === 'onboarding' && (
          <View style={{ marginBottom: Spacing.md }}>
            <EliteText variant="caption" style={{ color: ATP_BRAND.lime, letterSpacing: 2, fontSize: 11 }}>PASO 2 DE 3</EliteText>
            <View style={{ height: 4, backgroundColor: SURFACES.cardLight, borderRadius: 2, marginTop: Spacing.xs, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: '66%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 }} />
            </View>
          </View>
        )}
        {/* Animal reveal */}
        <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.revealContainer}>
          <EliteText style={styles.revealEmoji}>{ANIMAL_EMOJIS[result]}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <EliteText style={[styles.revealName, { color: ANIMAL_COLORS[result] }]}>
            {ANIMAL_NAMES[result]}
          </EliteText>
          <EliteText variant="body" style={styles.revealDesc}>
            {schedule?.description ?? ''}
          </EliteText>
        </Animated.View>

        {/* Score bars */}
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.scoresSection}>
          {animals.map(animal => {
            const s = scores[animal] ?? 0;
            const pct = maxScore > 0 ? Math.round((s / maxScore) * 100) : 0;
            const isWinner = animal === result;
            return (
              <View key={animal} style={styles.scoreRow}>
                <EliteText variant="caption" style={[styles.scoreAnimal, isWinner && { color: ANIMAL_COLORS[animal] }]}>
                  {ANIMAL_EMOJIS[animal]} {ANIMAL_NAMES[animal]}
                </EliteText>
                <View style={styles.scoreBarBg}>
                  <View style={[styles.scoreBarFill, { width: `${pct}%`, backgroundColor: ANIMAL_COLORS[animal] }]} />
                </View>
                <EliteText variant="caption" style={[styles.scorePct, isWinner && { color: ANIMAL_COLORS[animal] }]}>
                  {pct}%
                </EliteText>
              </View>
            );
          })}
        </Animated.View>

        {/* Tu día ideal */}
        {schedule && (
          <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.scheduleSection}>
            <EliteText variant="label" style={styles.scheduleTitle}>TU DÍA IDEAL</EliteText>
            <View style={styles.scheduleGrid}>
              <ScheduleRow icon="sunny-outline" label="Despertar" time={schedule.wake_time} color={ATP_BRAND.lime} />
              <ScheduleRow icon="barbell-outline" label="Entrenamiento" time={schedule.peak_physical_start} color={CATEGORY_COLORS.fitness} />
              <ScheduleRow icon="bulb-outline" label="Pico mental" time={`${schedule.peak_focus_start} - ${schedule.peak_focus_end}`} color={CATEGORY_COLORS.mind} />
              <ScheduleRow icon="restaurant-outline" label="Última comida" time={schedule.wind_down_time > schedule.sleep_time ? '20:00' : formatMealTime(schedule.wind_down_time)} color={CATEGORY_COLORS.nutrition} />
              <ScheduleRow icon="moon-outline" label="Wind down" time={schedule.wind_down_time} color={CATEGORY_COLORS.rest} />
              <ScheduleRow icon="bed-outline" label="Dormir" time={schedule.sleep_time} color={SEMANTIC.info} />
            </View>
          </Animated.View>
        )}

        {/* Botones */}
        <Animated.View entering={FadeInUp.delay(1000).springify()} style={styles.resultActions}>
          <AnimatedPressable onPress={handleActivate} style={styles.activateBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={TEXT_COLORS.onAccent} />
            ) : (
              <>
                <Ionicons name={params?.from === 'onboarding' ? 'arrow-forward' : 'flash'} size={18} color={TEXT_COLORS.onAccent} />
                <EliteText variant="body" style={styles.activateBtnText}>
                  {params?.from === 'onboarding' ? 'Continuar a evaluación →' : 'Activar mi cronotipo'}
                </EliteText>
              </>
            )}
          </AnimatedPressable>

          <AnimatedPressable onPress={handleRetry} style={styles.retryBtn}>
            <Ionicons name="refresh-outline" size={16} color={TEXT_COLORS.secondary} />
            <EliteText variant="caption" style={styles.retryText}>Repetir quiz</EliteText>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === HELPERS ===

function formatMealTime(windDown: string): string {
  const [h, m] = windDown.split(':').map(Number);
  const mealH = h - 2;
  return `${mealH < 10 ? '0' : ''}${mealH}:${m < 10 ? '0' : ''}${m}`;
}

function ScheduleRow({ icon, label, time, color }: { icon: string; label: string; time: string; color: string }) {
  return (
    <View style={styles.scheduleRow}>
      <Ionicons name={icon as any} size={18} color={color} />
      <EliteText variant="body" style={styles.scheduleLabel}>{label}</EliteText>
      <EliteText style={[styles.scheduleTime, { color }]}>{time}</EliteText>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: ATP_BRAND.lime,
    letterSpacing: 1,
  },
  headerSub: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },

  // Progress
  progressBar: {
    height: 4,
    backgroundColor: SURFACES.cardLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 2,
  },
  progressLabel: {
    color: TEXT_COLORS.muted,
    fontSize: 11,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },

  // Quiz content
  quizContent: { paddingBottom: Spacing.xxl },
  questionText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    lineHeight: 28,
    marginBottom: Spacing.lg,
  },

  // Options
  optionsContainer: { gap: Spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: SURFACES.card,
    borderWidth: 1,
    borderColor: SURFACES.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  optionSelected: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: ATP_BRAND.lime + '10',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: SURFACES.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: { borderColor: ATP_BRAND.lime },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ATP_BRAND.lime,
  },
  optionText: {
    flex: 1,
    color: TEXT_COLORS.primary,
    fontSize: 15,
  },

  // Next button
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: Spacing.xl,
  },
  nextBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },

  // Result
  resultContent: { paddingTop: Spacing.xl, alignItems: 'center' },
  revealContainer: { marginBottom: Spacing.md },
  revealEmoji: { fontSize: 80, textAlign: 'center' },
  revealName: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    letterSpacing: 3,
  },
  revealDesc: {
    color: TEXT_COLORS.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },

  // Scores
  scoresSection: {
    width: '100%',
    marginTop: Spacing.xl,
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  scoreAnimal: { color: TEXT_COLORS.secondary, fontSize: 13, width: 80 },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: SURFACES.cardLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scorePct: { color: TEXT_COLORS.muted, fontSize: 12, width: 35, textAlign: 'right' },

  // Schedule
  scheduleSection: {
    width: '100%',
    marginTop: Spacing.lg,
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
  },
  scheduleTitle: {
    color: ATP_BRAND.lime,
    letterSpacing: 3,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  scheduleGrid: { gap: Spacing.sm },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scheduleLabel: { flex: 1, color: TEXT_COLORS.secondary, fontSize: 14 },
  scheduleTime: { fontFamily: Fonts.bold, fontSize: 15 },

  // Actions
  resultActions: { width: '100%', marginTop: Spacing.xl, gap: Spacing.md, alignItems: 'center' },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
  },
  activateBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  retryText: { color: TEXT_COLORS.secondary, fontSize: 13 },
});
