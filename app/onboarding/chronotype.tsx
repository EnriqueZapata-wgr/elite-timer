/**
 * Onboarding Block 2 — Cronotipo reducido (7 preguntas).
 * Determina lion/bear/wolf/dolphin, guarda en user_chronotype,
 * muestra insight con horarios recomendados.
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
import { saveBlockAnswers, completeStep } from '@/src/services/onboarding-service';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === TIPOS DE CRONOTIPO ===

type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin';

interface ChronoSchedule {
  wake: string;
  sleep: string;
  peak_physical: string;
  peak_focus_start: string;
  peak_focus_end: string;
  wind_down: string;
}

const SCHEDULES: Record<Chronotype, ChronoSchedule> = {
  lion:    { wake: '05:30', sleep: '21:30', peak_physical: '06:00', peak_focus_start: '08:00', peak_focus_end: '12:00', wind_down: '20:30' },
  bear:    { wake: '07:00', sleep: '23:00', peak_physical: '07:30', peak_focus_start: '10:00', peak_focus_end: '14:00', wind_down: '22:00' },
  wolf:    { wake: '08:00', sleep: '00:00', peak_physical: '17:00', peak_focus_start: '17:00', peak_focus_end: '21:00', wind_down: '23:00' },
  dolphin: { wake: '06:30', sleep: '23:30', peak_physical: '15:00', peak_focus_start: '10:00', peak_focus_end: '12:00', wind_down: '22:00' },
};

const CHRONO_META: Record<Chronotype, { emoji: string; name: string }> = {
  lion:    { emoji: '\uD83E\uDD81', name: 'Leon' },
  bear:    { emoji: '\uD83D\uDC3B', name: 'Oso' },
  wolf:    { emoji: '\uD83D\uDC3A', name: 'Lobo' },
  dolphin: { emoji: '\uD83D\uDC2C', name: 'Delfin' },
};

// === SCORING ===

// Cada pregunta asigna puntos a cada cronotipo segun la opcion elegida.
// Formato: scores[opcionId] = { lion, bear, wolf, dolphin }
type ScoreMap = Record<string, Record<Chronotype, number>>;

const QUESTION_SCORES: Record<string, ScoreMap> = {
  q1: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 2 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 1 },
    d: { lion: 0, bear: 0, wolf: 2, dolphin: 0 },
  },
  q2: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 2 },
    c: { lion: 0, bear: 1, wolf: 2, dolphin: 1 },
    d: { lion: 0, bear: 0, wolf: 3, dolphin: 0 },
  },
  q3: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 1 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 1, wolf: 0, dolphin: 2 },
  },
  q4: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
  q5: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
  q6: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 0, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 0, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
  q7: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 0, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 0, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
};

function computeChronotype(answers: Record<string, Answer>): Chronotype {
  const totals: Record<Chronotype, number> = { lion: 0, bear: 0, wolf: 0, dolphin: 0 };
  for (const [qId, scoreMap] of Object.entries(QUESTION_SCORES)) {
    const answer = answers[qId] as string;
    if (!answer || !scoreMap[answer]) continue;
    const scores = scoreMap[answer];
    totals.lion += scores.lion;
    totals.bear += scores.bear;
    totals.wolf += scores.wolf;
    totals.dolphin += scores.dolphin;
  }
  // El cronotipo con mayor puntaje gana
  let best: Chronotype = 'bear';
  let bestScore = -1;
  for (const [key, val] of Object.entries(totals)) {
    if (val > bestScore) {
      bestScore = val;
      best = key as Chronotype;
    }
  }
  return best;
}

// === PREGUNTAS ===

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'q1',
    text: 'Sin alarma, ¿a que hora despertarias?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Antes de las 6' },
      { id: 'b', text: '6 a 7' },
      { id: 'c', text: '7 a 8:30' },
      { id: 'd', text: 'Despues de las 8:30' },
    ],
  },
  {
    id: 'q2',
    text: '¿Cuando es tu pico de energia mental?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Manana temprano (6-9)' },
      { id: 'b', text: 'Media manana (9-1)' },
      { id: 'c', text: 'Tarde (2-6)' },
      { id: 'd', text: 'Noche (7-11)' },
    ],
  },
  {
    id: 'q3',
    text: '¿Cuando preferirias entrenar?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Amanecer (5-7)' },
      { id: 'b', text: 'Manana (7-10)' },
      { id: 'c', text: 'Tarde (4-7)' },
      { id: 'd', text: 'Me da igual' },
    ],
  },
  {
    id: 'q4',
    text: '¿Como es tu sueno?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Me duermo facil, despierto antes de alarma' },
      { id: 'b', text: 'Duermo bien, necesito alarma' },
      { id: 'c', text: 'Me cuesta dormirme y despertar' },
      { id: 'd', text: 'Sueno ligero, despierto facil' },
    ],
  },
  {
    id: 'q5',
    text: '¿Cuando te da hambre por primera vez?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Al despertar' },
      { id: 'b', text: '1-2 horas despues' },
      { id: 'c', text: 'Hasta media manana' },
      { id: 'd', text: 'Impredecible' },
    ],
  },
  {
    id: 'q6',
    text: 'Fin de semana libre, ¿que haces?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Madrugo igual' },
      { id: 'b', text: 'Dia balanceado' },
      { id: 'c', text: 'Duermo hasta tarde' },
      { id: 'd', text: 'Despierto temprano aunque no quiera' },
    ],
  },
  {
    id: 'q7',
    text: 'Tu horario ideal de comidas:',
    type: 'single_select',
    options: [
      { id: 'a', text: '6am / 12pm / 6pm' },
      { id: 'b', text: '7:30am / 1pm / 7:30pm' },
      { id: 'c', text: '10am / 3pm / 9pm+' },
      { id: 'd', text: 'Irregular' },
    ],
  },
];

// === COMPONENTE PRINCIPAL ===

export default function OnboardingChronotypeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [phase, setPhase] = useState<'questions' | 'insight'>('questions');
  const [saving, setSaving] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [result, setResult] = useState<Chronotype>('bear');

  const question = QUESTIONS[currentQ];
  const currentAnswer = answers[question.id];
  const hasAnswer = currentAnswer !== undefined;

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
      const chrono = computeChronotype(answers);
      setResult(chrono);
      const schedule = SCHEDULES[chrono];

      // Guardar respuestas del bloque
      await saveBlockAnswers(user.id, 'chronotype', answers);

      // Guardar en tabla user_chronotype
      await supabase.from('user_chronotype').upsert({
        user_id: user.id,
        chronotype: chrono,
        wake_time: schedule.wake,
        sleep_time: schedule.sleep,
        peak_physical: schedule.peak_physical,
        peak_focus_start: schedule.peak_focus_start,
        peak_focus_end: schedule.peak_focus_end,
        wind_down: schedule.wind_down,
      });
    } catch (e) {
      console.warn('Error saving chronotype data:', e);
    }
    setSaving(false);
  }

  async function handleContinue() {
    if (!user?.id) return;
    const nextRoute = await completeStep(user.id, 'chronotype');
    router.replace(nextRoute as any);
  }

  // === INSIGHT PHASE ===
  if (phase === 'insight') {
    const meta = CHRONO_META[result];
    const schedule = SCHEDULES[result];

    return (
      <InsightCard
        icon="moon-outline"
        color="#7c3aed"
        title={`${meta.emoji} Eres ${meta.name}`}
        description={`ARGOS ajustara tu agenda: entrenamiento a las ${schedule.peak_physical}, pico mental ${schedule.peak_focus_start}-${schedule.peak_focus_end}.`}
        onContinue={handleContinue}
      />
    );
  }

  // === QUESTIONS PHASE ===
  return (
    <OnboardingShell step={3}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={styles.title}>Tu cronotipo</EliteText>
          <EliteText style={styles.subtitle}>
            Descubre tu reloj biologico para optimizar entrenamiento, alimentacion y descanso.
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
                {currentQ < QUESTIONS.length - 1 ? 'Siguiente' : 'Ver resultado'}
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
