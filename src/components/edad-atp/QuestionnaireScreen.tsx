/**
 * QuestionnaireScreen — cuerpo reutilizable de un cuestionario de dominio.
 * Recibe el dominio + preguntas; maneja estado, guardado y navegación.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { QuestionnaireQuestion, type QuestionOption } from './QuestionnaireQuestion';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveQuestionnaireResponses, type QuestionnaireResponse } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

export type DomainQuestion = { parameter_key: string; text: string; options: QuestionOption[] };

interface Props {
  domain: string;
  title: string;
  questions: DomainQuestion[];
  pillar?: 'metrics' | 'health' | 'nutrition' | 'fitness' | 'mind' | 'rest';
}

export function QuestionnaireScreen({ domain, title, questions, pillar = 'metrics' }: Props) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user?.id) return;
    const responses: QuestionnaireResponse[] = questions
      .filter((q) => answers[q.parameter_key] != null)
      .map((q) => ({ parameter_key: q.parameter_key, value_text: answers[q.parameter_key] }));
    if (responses.length === 0) { Alert.alert('Sin respuestas', 'Contesta al menos una pregunta.'); return; }
    setSaving(true);
    const result = await saveQuestionnaireResponses(user.id, domain, responses);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudieron guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_QUESTIONNAIRE_COMPLETED, { domain });
    haptic.success();
    Alert.alert('', 'Respuestas guardadas ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar={pillar} title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        {questions.map((q) => (
          <QuestionnaireQuestion
            key={q.parameter_key}
            text={q.text}
            options={q.options}
            selected={answers[q.parameter_key]}
            onSelect={(v) => setAnswers((p) => ({ ...p, [q.parameter_key]: v }))}
          />
        ))}
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar respuestas'}</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 120 },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
