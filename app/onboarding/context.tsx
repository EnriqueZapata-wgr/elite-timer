/**
 * Onboarding Block 5 — Contexto de vida (3 preguntas).
 * Captura horas sedentarias, equipo disponible, tiempo disponible al dia.
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
import { saveContextData, saveBlockAnswers, completeStep } from '@/src/services/onboarding-service';
import { haptic } from '@/src/utils/haptics';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === MAPPINGS ===

const sedentaryMap: Record<string, number> = { a: 11, b: 8, c: 4.5, d: 2 };
const timeMap: Record<string, number> = { a: 22, b: 45, c: 90, d: 150 };

const timeLabelMap: Record<string, string> = {
  a: '15-30 min',
  b: '30-60 min',
  c: '1-2 horas',
  d: 'mas de 2 horas',
};

const equipmentLabelMap: Record<string, string> = {
  gym: 'gym completo',
  dumbbells: 'mancuernas',
  bodyweight: 'peso corporal',
  bands: 'bandas elasticas',
  park: 'parque/barras',
};

// === PREGUNTAS ===

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'c1',
    text: '¿Cuantas horas al dia pasas sentado/a?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Mas de 10h' },
      { id: 'b', text: '6-10h' },
      { id: 'c', text: '3-6h' },
      { id: 'd', text: 'Menos de 3h' },
    ],
  },
  {
    id: 'c2',
    text: '¿Tienes acceso a gym o equipo?',
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi_select',
    options: [
      { id: 'gym', text: 'Gym completo' },
      { id: 'dumbbells', text: 'Mancuernas en casa' },
      { id: 'bodyweight', text: 'Solo mi cuerpo' },
      { id: 'bands', text: 'Bandas elasticas' },
      { id: 'park', text: 'Parque/barras' },
    ],
  },
  {
    id: 'c3',
    text: '¿Cuanto tiempo puedes dedicar a tu salud diariamente?',
    type: 'single_select',
    options: [
      { id: 'a', text: '15-30 min' },
      { id: 'b', text: '30-60 min' },
      { id: 'c', text: '1-2 horas' },
      { id: 'd', text: 'Mas de 2 horas' },
    ],
  },
];

// === COMPONENTE PRINCIPAL ===

export default function OnboardingContextScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [phase, setPhase] = useState<'questions' | 'insight'>('questions');
  const [saving, setSaving] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [insightText, setInsightText] = useState('');

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
      await saveBlockAnswers(user.id, 'context', answers);

      const timeAnswer = answers.c3 as string;
      const equipAnswer = (answers.c2 as string[]) ?? [];

      // Guardar campos estructurados
      await saveContextData(user.id, {
        sedentaryHours: sedentaryMap[answers.c1 as string] ?? 8,
        equipmentAccess: equipAnswer,
        timeAvailableMin: timeMap[timeAnswer] ?? 45,
      });

      // Generar texto del insight
      const timeLabel = timeLabelMap[timeAnswer] || '30-60 min';
      const equipLabels = equipAnswer.map(e => equipmentLabelMap[e] || e);
      const equipText = equipLabels.length > 0
        ? equipLabels.join(', ')
        : 'lo que tengas disponible';

      setInsightText(
        `Perfecto. ARGOS adaptara la intensidad y duracion de tus rutinas a tu realidad: ${timeLabel} con ${equipText}.`
      );
    } catch (e) {
      console.warn('Error saving context data:', e);
    }
    setSaving(false);
  }

  async function handleContinue() {
    if (!user?.id) return;
    const nextRoute = await completeStep(user.id, 'context');
    router.replace(nextRoute as any);
  }

  // === INSIGHT PHASE ===
  if (phase === 'insight') {
    return (
      <InsightCard
        icon="fitness-outline"
        color="#EF9F27"
        title="Contexto capturado"
        description={insightText}
        onContinue={handleContinue}
      />
    );
  }

  // === QUESTIONS PHASE ===
  return (
    <OnboardingShell step={6}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={styles.title}>Tu contexto</EliteText>
          <EliteText style={styles.subtitle}>
            Para adaptar tu plan a tu estilo de vida real.
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
