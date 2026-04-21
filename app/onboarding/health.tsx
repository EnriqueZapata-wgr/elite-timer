/**
 * Onboarding Block 3 — Salud funcional (10 preguntas de causa raiz).
 * Detecta: resistencia insulina, fatiga adrenal, disbiosis, inflamacion, estres.
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
import {
  saveBlockAnswers, saveHealthData, completeStep,
  calculateFunctionalFlags, detectIssues,
} from '@/src/services/onboarding-service';
import { haptic } from '@/src/utils/haptics';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === PREGUNTAS — Medicina funcional ===

const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'h1',
    text: '¿Te despiertas entre 1 y 3 AM frecuentemente?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Si, casi siempre' },
      { id: 'b', text: 'A veces (2-3 veces/semana)' },
      { id: 'c', text: 'Rara vez' },
      { id: 'd', text: 'No, duermo de corrido' },
    ],
  },
  {
    id: 'h2',
    text: '¿Necesitas cafe o estimulantes para funcionar en la manana?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'No funciono sin cafe' },
      { id: 'b', text: 'Necesito 1-2 tazas para arrancar' },
      { id: 'c', text: 'Lo tomo por gusto, no por necesidad' },
      { id: 'd', text: 'No tomo cafe ni estimulantes' },
    ],
  },
  {
    id: 'h3',
    text: 'Despues de comer, ¿te da sueno o necesitas acostarte?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Siempre, es muy notorio' },
      { id: 'b', text: 'Frecuentemente' },
      { id: 'c', text: 'Solo con comidas pesadas' },
      { id: 'd', text: 'Nunca, mantengo energia' },
    ],
  },
  {
    id: 'h4',
    text: '¿Tienes antojos intensos de azucar, pan o carbohidratos?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Diariamente, me cuesta resistirlos' },
      { id: 'b', text: 'Varias veces por semana' },
      { id: 'c', text: 'Ocasionalmente' },
      { id: 'd', text: 'Casi nunca' },
    ],
  },
  {
    id: 'h5',
    text: '¿Tu abdomen se inflama durante el dia, especialmente despues de comer?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Si, diariamente' },
      { id: 'b', text: 'Frecuentemente' },
      { id: 'c', text: 'Ocasionalmente con ciertos alimentos' },
      { id: 'd', text: 'Nunca' },
    ],
  },
  {
    id: 'h6',
    text: '¿Sientes que tu mente no para, sobre todo antes de dormir?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Si, no puedo "apagar" mi cerebro' },
      { id: 'b', text: 'Frecuentemente me cuesta relajarme' },
      { id: 'c', text: 'A veces, pero logro dormir' },
      { id: 'd', text: 'Duermo tranquilo/a' },
    ],
  },
  {
    id: 'h7',
    text: '¿Cuantos dias a la semana haces ejercicio estructurado?',
    type: 'single_select',
    options: [
      { id: 'a', text: '0 — no hago ejercicio' },
      { id: 'b', text: '1-2 dias' },
      { id: 'c', text: '3-4 dias' },
      { id: 'd', text: '5+ dias' },
    ],
  },
  {
    id: 'h8',
    text: '¿Tienes dolor cronico en articulaciones, espalda o cuello?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Si, diariamente me limita' },
      { id: 'b', text: 'Frecuentemente' },
      { id: 'c', text: 'Solo despues de esfuerzo fisico' },
      { id: 'd', text: 'No' },
    ],
  },
  {
    id: 'h9',
    text: '¿Como esta tu piel? (acne, resequedad, manchas, rosacea)',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Varios problemas frecuentes' },
      { id: 'b', text: 'Algun problema ocasional' },
      { id: 'c', text: 'Generalmente bien' },
      { id: 'd', text: 'Piel sana, sin problemas' },
    ],
  },
  {
    id: 'h10',
    text: '¿Con que frecuencia te enfermas (gripa, infecciones)?',
    type: 'single_select',
    options: [
      { id: 'a', text: 'Mas de 4 veces al ano' },
      { id: 'b', text: '2-4 veces al ano' },
      { id: 'c', text: '1-2 veces al ano' },
      { id: 'd', text: 'Casi nunca' },
    ],
  },
];

export default function OnboardingHealthScreen() {
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
      const flags = calculateFunctionalFlags(answers as Record<string, string>);
      const issues = detectIssues(flags);

      await saveBlockAnswers(user.id, 'health', answers);
      await saveHealthData(user.id, flags, issues.map(i => i.key));

      // Generar texto de insight basado en issues detectados
      if (issues.length > 0) {
        const topIssues = issues.slice(0, 3).map(i => i.label.toLowerCase()).join(', ');
        setInsightText(`ARGOS detecto senales de: ${topIssues}. Tus protocolos se ajustaran para abordar estas causas raiz de forma integrativa.`);
      } else {
        setInsightText('Tus indicadores de salud funcional lucen bien. ARGOS optimizara tu plan para mantener y potenciar tu rendimiento.');
      }
    } catch (e) {
      console.warn('Error saving health data:', e);
    }
    setSaving(false);
  }

  async function handleContinue() {
    if (!user?.id) return;
    const nextRoute = await completeStep(user.id, 'health');
    router.replace(nextRoute as any);
  }

  // === INSIGHT ===
  if (phase === 'insight') {
    return (
      <InsightCard
        icon="pulse-outline"
        color="#ef4444"
        title="Analisis funcional"
        description={insightText}
        onContinue={handleContinue}
      />
    );
  }

  // === QUESTIONS ===
  return (
    <OnboardingShell step={4}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={styles.title}>Salud funcional</EliteText>
          <EliteText style={styles.subtitle}>
            Preguntas que un medico funcional haria en tu primera consulta.
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
                {currentQ < QUESTIONS.length - 1 ? 'Siguiente' : 'Ver analisis'}
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
