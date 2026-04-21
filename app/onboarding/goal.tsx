/**
 * Onboarding Block 1 — Tu objetivo.
 * 3 preguntas: objetivo principal, intentos previos, motivacion.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { QuizQuestion } from '@/src/components/onboarding/QuizQuestion';
import { InsightCard } from '@/src/components/onboarding/InsightCard';
import { useAuth } from '@/src/contexts/auth-context';
import { saveGoalData, saveBlockAnswers, completeStep } from '@/src/services/onboarding-service';
import { haptic } from '@/src/utils/haptics';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === PREGUNTAS ===

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'goal',
    text: '¿Cual es tu objetivo principal?',
    type: 'single_select',
    options: [
      { id: 'energy', text: 'Tener mas energia y rendimiento', icon: 'flash-outline' },
      { id: 'fat_loss', text: 'Perder grasa y mejorar composicion', icon: 'body-outline' },
      { id: 'stress', text: 'Reducir estres y dormir mejor', icon: 'moon-outline' },
      { id: 'longevity', text: 'Optimizar mi salud para longevidad', icon: 'heart-outline' },
      { id: 'muscle', text: 'Ganar masa muscular y fuerza', icon: 'barbell-outline' },
    ],
  },
  {
    id: 'attempts',
    text: '¿Que has intentado antes?',
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi_select',
    options: [
      { id: 'diets', text: 'Dietas restrictivas' },
      { id: 'apps', text: 'Apps de fitness o nutricion' },
      { id: 'coaching', text: 'Coaching o nutriologo' },
      { id: 'fasting', text: 'Ayuno intermitente' },
      { id: 'supplements', text: 'Suplementacion' },
      { id: 'nothing', text: 'Nada, es mi primera vez' },
    ],
  },
  {
    id: 'motivation',
    text: '¿Que tan motivado/a estas para hacer cambios reales?',
    type: 'single_select',
    options: [
      { id: '1', text: 'Apenas explorando' },
      { id: '2', text: 'Quiero empezar pronto' },
      { id: '3', text: 'Estoy listo/a para comprometerme' },
      { id: '4', text: 'Totalmente decidido/a, sin excusas' },
    ],
  },
];

export default function OnboardingGoalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [phase, setPhase] = useState<'questions' | 'insight'>('questions');
  const [saving, setSaving] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const question = QUESTIONS[currentQ];
  const currentAnswer = answers[question.id];
  const hasAnswer = currentAnswer !== undefined &&
    (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : true);

  function handleAnswer(answer: Answer) {
    setAnswers(prev => ({ ...prev, [question.id]: answer }));
  }

  async function handleNext() {
    haptic.light();
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
      setAnimKey(prev => prev + 1);
    } else {
      // Guardar y mostrar insight
      await saveData();
      setPhase('insight');
    }
  }

  async function saveData() {
    if (!user?.id) return;
    setSaving(true);
    try {
      const goal = answers.goal as string;
      const attempts = (answers.attempts as string[]) ?? [];
      const motivation = parseInt(answers.motivation as string, 10) || 3;

      await saveGoalData(user.id, {
        primaryGoal: goal,
        previousAttempts: attempts,
        motivationLevel: motivation,
      });
      await saveBlockAnswers(user.id, 'goal', answers);
    } catch (e) {
      console.warn('Error saving goal data:', e);
    }
    setSaving(false);
  }

  async function handleContinue() {
    if (!user?.id) return;
    const nextRoute = await completeStep(user.id, 'goal');
    router.replace(nextRoute as any);
  }

  // === INSIGHT PHASE ===
  if (phase === 'insight') {
    const goalLabels: Record<string, string> = {
      energy: 'Mas energia',
      fat_loss: 'Perder grasa',
      stress: 'Reducir estres',
      longevity: 'Longevidad',
      muscle: 'Ganar musculo',
    };
    const goalLabel = goalLabels[answers.goal as string] || 'Tu objetivo';

    return (
      <InsightCard
        icon="flash-outline"
        title={`Objetivo: ${goalLabel}`}
        description="ATP no es una dieta ni un plan generico. Es un sistema que se adapta a tu biologia. Vamos a conocer tu reloj interno."
        onContinue={handleContinue}
      />
    );
  }

  // === QUESTIONS PHASE ===
  return (
    <OnboardingShell step={2}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={styles.title}>Tu objetivo</EliteText>
        </Animated.View>

        <QuizQuestion
          question={question}
          answer={currentAnswer}
          onAnswer={handleAnswer}
          animKey={animKey}
        />

        {/* Boton siguiente */}
        {hasAnswer && (
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <AnimatedPressable
              onPress={handleNext}
              disabled={saving}
              style={styles.nextBtn}
            >
              <EliteText style={styles.nextBtnText}>
                {currentQ < QUESTIONS.length - 1 ? 'Siguiente' : 'Continuar'}
              </EliteText>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Progress label */}
        <EliteText style={styles.progressLabel}>
          {currentQ + 1} / {QUESTIONS.length}
        </EliteText>

        <View style={{ height: 60 }} />
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: 24 },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginBottom: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a8e02a',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginTop: Spacing.xl,
  },
  nextBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  progressLabel: {
    color: '#444',
    fontSize: 11,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
});
