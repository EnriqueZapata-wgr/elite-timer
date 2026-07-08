/**
 * Historia Clínica — cuestionario individual (T3/HC5).
 * Renderiza <TestQuestionScreen> con el banco de preguntas de la categoría (param) y guarda
 * las respuestas en historia_clinica.data[category] al completar.
 */
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { TestQuestionScreen, type TestAnswers } from '@/src/components/tests/TestQuestionScreen';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Spacing } from '@/constants/theme';
import { HC_BY_ID } from '@/src/constants/historia-clinica-questionnaires';
import { loadHistoriaClinica, saveHistoriaClinicaCategory } from '@/src/services/historia-clinica-service';

export default function HistoriaClinicaCategory() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { user } = useAuth();
  const questionnaire = category ? HC_BY_ID[category] : undefined;
  const [initial, setInitial] = useState<TestAnswers | null>(null);

  useEffect(() => {
    if (!user?.id || !category) { setInitial({}); return; }
    loadHistoriaClinica(user.id).then(d => setInitial(d[category] ?? {}));
  }, [user?.id, category]);

  if (!questionnaire) {
    return (
      <Screen>
        <PillarHeader pillar="health" title="Historia Clínica" />
        <View style={{ padding: Spacing.lg }}>
          <EliteText variant="caption">Cuestionario no encontrado.</EliteText>
        </View>
      </Screen>
    );
  }

  if (initial === null) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={questionnaire.color} />
        </View>
      </Screen>
    );
  }

  const handleComplete = async (answers: TestAnswers) => {
    if (!user?.id) { router.back(); return; }
    try {
      await saveHistoriaClinicaCategory(user.id, questionnaire.id, answers);
      haptic.success();
      Alert.alert('', `${questionnaire.title} guardado.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    }
  };

  return (
    <TestQuestionScreen
      title={questionnaire.title}
      subtitle={`${questionnaire.questions.length} preguntas`}
      questions={questionnaire.questions}
      accent={questionnaire.color}
      submitLabel="Guardar respuestas"
      initialAnswers={initial}
      onComplete={handleComplete}
    />
  );
}
