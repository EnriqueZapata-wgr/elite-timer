/**
 * TestQuestionScreen — motor reusable de cuestionarios estilo Braverman.
 * 1 pregunta por pantalla, progress bar, transición SlideInRight, haptic por selección.
 * Soporta opción única (radio) y multi-selección (checkbox). Extraído del patrón de
 * app/quiz/chronotype.tsx para reusar en cuestionarios de Historia Clínica (T3) y tests.
 *
 * Doctrina NO-FRANKENSTEIN: design tokens del brand, animaciones 250ms, sin números mágicos.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, Radius } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS } from '@/src/constants/brand';
import type { TestOption, TestQuestion, TestAnswers } from '@/src/components/tests/test-question-types';

export type { TestOption, TestQuestion, TestAnswers } from '@/src/components/tests/test-question-types';

interface Props {
  title: string;
  subtitle?: string;
  questions: TestQuestion[];
  onComplete: (answers: TestAnswers) => void | Promise<void>;
  submitLabel?: string;
  /** Color de acento (default lime del brand). */
  accent?: string;
  /** Respuestas previas para pre-llenar (ej. re-visitar un cuestionario ya respondido). */
  initialAnswers?: TestAnswers;
}

export function TestQuestionScreen({ title, subtitle, questions, onComplete, submitLabel = 'Guardar', accent = ATP_BRAND.lime, initialAnswers }: Props) {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>(initialAnswers ?? {});
  const [questionKey, setQuestionKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const total = questions.length;
  const question = questions[currentQ];
  const raw = answers[question?.id];
  const selectedSingle = typeof raw === 'string' ? raw : undefined;
  const selectedMulti = Array.isArray(raw) ? raw : [];
  const hasAnswer = question?.multi ? (question.optional || selectedMulti.length > 0) : !!selectedSingle;
  const progress = ((currentQ + (hasAnswer ? 1 : 0)) / total) * 100;
  const isLast = currentQ >= total - 1;

  const selectSingle = (optId: string) => {
    haptic.light();
    setAnswers(prev => ({ ...prev, [question.id]: optId }));
  };

  const toggleMulti = (optId: string) => {
    haptic.light();
    setAnswers(prev => {
      const cur = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : [];
      const next = cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId];
      return { ...prev, [question.id]: next };
    });
  };

  const advance = async () => {
    if (!isLast) {
      haptic.medium();
      setCurrentQ(q => q + 1);
      setQuestionKey(k => k + 1);
      return;
    }
    // Última → completar.
    setSubmitting(true);
    try { await onComplete(answers); }
    finally { setSubmitting(false); }
  };

  if (!question) return null;

  const isSelected = (optId: string) =>
    question.multi ? selectedMulti.includes(optId) : selectedSingle === optId;

  return (
    <ScreenContainer centered={false}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(50).springify()}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color={accent} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <EliteText style={styles.headerTitle}>{title}</EliteText>
            {subtitle ? <EliteText variant="caption" style={styles.headerSub}>{subtitle}</EliteText> : null}
          </View>
        </View>
      </Animated.View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accent }]} />
      </View>
      <EliteText variant="caption" style={styles.progressLabel}>{currentQ + 1} / {total}</EliteText>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View key={questionKey} entering={SlideInRight.duration(250).springify()}>
          <EliteText style={styles.questionText}>{question.text}</EliteText>
          {question.hint ? <EliteText variant="caption" style={styles.hint}>{question.hint}</EliteText> : null}
          {question.multi ? <EliteText variant="caption" style={styles.hint}>Selecciona todas las que apliquen</EliteText> : null}

          <View style={styles.options}>
            {question.options.map((opt, idx) => {
              const sel = isSelected(opt.id);
              return (
                <Animated.View key={opt.id} entering={FadeInUp.delay(80 + idx * 50).springify()}>
                  <AnimatedPressable
                    onPress={() => (question.multi ? toggleMulti(opt.id) : selectSingle(opt.id))}
                    style={[styles.optionCard, sel && { borderColor: accent, backgroundColor: `${accent}12` }]}
                  >
                    <View style={[
                      styles.indicator,
                      question.multi ? styles.checkbox : styles.radio,
                      sel && { borderColor: accent },
                    ]}>
                      {sel && (question.multi
                        ? <Ionicons name="checkmark" size={14} color={accent} />
                        : <View style={[styles.radioDot, { backgroundColor: accent }]} />)}
                    </View>
                    <EliteText variant="body" style={[styles.optionText, sel && { color: accent }]}>{opt.text}</EliteText>
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {hasAnswer && (
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <AnimatedPressable onPress={advance} disabled={submitting} style={[styles.nextBtn, { backgroundColor: accent }, submitting && { opacity: 0.5 }]}>
              <EliteText variant="body" style={styles.nextBtnText}>
                {isLast ? (submitting ? 'Guardando…' : submitLabel) : 'Siguiente'}
              </EliteText>
              {!isLast && <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />}
            </AnimatedPressable>
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backBtn: { padding: 4 },
  headerTitle: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: 20 },
  headerSub: { color: TEXT_COLORS.muted, marginTop: 2 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: SURFACES.cardLight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { color: TEXT_COLORS.muted, marginTop: Spacing.xs, marginBottom: Spacing.md },
  content: { paddingBottom: Spacing.xl },
  questionText: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: 22, lineHeight: 30, marginBottom: Spacing.sm },
  hint: { color: TEXT_COLORS.muted, marginBottom: Spacing.sm },
  options: { gap: Spacing.sm, marginTop: Spacing.sm },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: SURFACES.border,
    backgroundColor: SURFACES.card,
  },
  indicator: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: SURFACES.border },
  radio: { borderRadius: 12 },
  checkbox: { borderRadius: 6 },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  optionText: { flex: 1, color: TEXT_COLORS.secondary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: Radius.md, marginTop: Spacing.lg,
  },
  nextBtnText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold },
});
