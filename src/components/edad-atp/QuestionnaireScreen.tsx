/**
 * QuestionnaireScreen — cuerpo reutilizable de un cuestionario de dominio.
 * Recibe el dominio + preguntas; maneja estado, guardado y navegación.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { QuestionnaireQuestion, type QuestionOption } from './QuestionnaireQuestion';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveQuestionnaireResponses, type QuestionnaireResponse } from '@/src/services/edad-atp/capture-service';
import { Spacing } from '@/constants/theme';

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

  // Pre-cargar respuestas previas para permitir revisar/editar.
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase
      .from('edad_atp_questionnaire_responses')
      .select('parameter_key, value_text')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .then(({ data, error }) => {
        // MB-11 A (mismo linaje): supabase-js no lanza en 4xx — sin este check
        // el fallo se leería como "cuestionario sin contestar" y se piso todo.
        if (error) { logWarn('[EdadATP] questionnaire_responses preload failed', error); return; }
        if (!data?.length) return;
        const prev: Record<string, string> = {};
        for (const r of data as any[]) if (r.value_text != null) prev[r.parameter_key] = r.value_text;
        setAnswers(prev);
      });
  }, [user?.id, domain]));

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
        <GradientCTA
          label={saving ? 'GUARDANDO…' : 'GUARDAR RESPUESTAS'}
          onPress={handleSave}
          disabled={saving}
          pillar={pillar === 'rest' ? 'sleep' : pillar}
          style={styles.saveBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 120 },
  saveBtn: { marginTop: Spacing.sm },
});
