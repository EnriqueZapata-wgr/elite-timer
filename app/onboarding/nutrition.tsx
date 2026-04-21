/**
 * Onboarding Block 4 — Nutricion (5 preguntas).
 * Captura patron alimenticio, fuentes de proteina, restricciones,
 * experiencia con ayuno y relacion con la comida.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { QuizQuestion } from '@/src/components/onboarding/QuizQuestion';
import { InsightCard } from '@/src/components/onboarding/InsightCard';
import { useAuth } from '@/src/contexts/auth-context';
import { saveNutritionData, saveBlockAnswers, completeStep } from '@/src/services/onboarding-service';
import { haptic } from '@/src/utils/haptics';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === PREGUNTAS ===

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'n1',
    text: '¿Cuantas comidas/snacks haces al dia?',
    type: 'single_select',
    options: [
      { id: 'a', text: '1-2 comidas' },
      { id: 'b', text: '3 comidas' },
      { id: 'c', text: '3 comidas + snacks' },
      { id: 'd', text: 'Picoteo todo el dia' },
    ],
  },
  {
    id: 'n2',
    text: '¿Que tipo de proteina comes mas?',
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi_select',
    options: [
      { id: 'chicken', text: 'Pollo/pavo' },
      { id: 'red_meat', text: 'Res/cerdo' },
      { id: 'fish', text: 'Pescado/mariscos' },
      { id: 'egg', text: 'Huevo' },
      { id: 'plant', text: 'Legumbres/tofu' },
      { id: 'low', text: 'Poca proteina' },
    ],
  },
  {
    id: 'n3',
    text: '¿Hay alimentos que te caen mal o evitas?',
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi_select',
    options: [
      { id: 'gluten', text: 'Gluten/trigo' },
      { id: 'dairy', text: 'Lacteos' },
      { id: 'seafood', text: 'Mariscos' },
      { id: 'none', text: 'Nada en particular' },
      { id: 'unknown', text: 'No se, no he identificado' },
    ],
  },
  {
    id: 'n4',
    text: '¿Practicas o has practicado ayuno intermitente?',
    type: 'single_select',
    options: [
      { id: 'regular', text: 'Si, regularmente' },
      { id: 'tried', text: 'Lo he probado' },
      { id: 'interested', text: 'Me interesa' },
      { id: 'not_interested', text: 'No me interesa' },
    ],
  },
  {
    id: 'n5',
    text: '¿Como describirias tu relacion con la comida?',
    type: 'single_select',
    options: [
      { id: 'healthy', text: 'Saludable y consciente' },
      { id: 'ok', text: 'Como bien pero no me fijo' },
      { id: 'struggle', text: 'Lucho con antojos o comer emocional' },
      { id: 'restrictive', text: 'Restricciones que me causan estres' },
    ],
  },
];

// === COMPONENTE PRINCIPAL ===

export default function OnboardingNutritionScreen() {
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
      await saveData();
      setPhase('insight');
    }
  }

  async function saveData() {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Guardar respuestas crudas del bloque
      await saveBlockAnswers(user.id, 'nutrition', answers);

      // Guardar campos estructurados
      await saveNutritionData(user.id, {
        mealsPerDay: answers.n1 as string,
        proteinSources: (answers.n2 as string[]) ?? [],
        foodRestrictions: (answers.n3 as string[]) ?? [],
        fastingExperience: answers.n4 as string,
        foodRelationship: answers.n5 as string,
      });
    } catch (e) {
      console.warn('Error saving nutrition data:', e);
    }
    setSaving(false);
  }

  async function handleContinue() {
    if (!user?.id) return;
    const nextRoute = await completeStep(user.id, 'nutrition');
    router.replace(nextRoute as any);
  }

  // === INSIGHT PHASE ===
  if (phase === 'insight') {
    return (
      <InsightCard
        icon="nutrition-outline"
        color="#5B9BD5"
        title="Nutricion mapeada"
        description="Con esto, ARGOS ya sabe que recetas generarte, que alimentos evitar, y como estructurar tu ventana de alimentacion."
        onContinue={handleContinue}
      />
    );
  }

  // === QUESTIONS PHASE ===
  return (
    <OnboardingShell step={5}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={styles.title}>Nutricion</EliteText>
          <EliteText style={styles.subtitle}>
            Conocer tus habitos alimenticios nos permite personalizar tu plan.
          </EliteText>
        </Animated.View>

        <QuizQuestion
          question={question}
          answer={currentAnswer}
          onAnswer={handleAnswer}
          animKey={animKey}
        />

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
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#666', marginBottom: 24 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#a8e02a', borderRadius: Radius.lg,
    paddingVertical: 16, marginTop: Spacing.xl,
  },
  nextBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  progressLabel: { color: '#444', fontSize: 11, textAlign: 'right', marginTop: Spacing.sm },
});
