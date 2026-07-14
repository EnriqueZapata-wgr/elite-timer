/**
 * Historia Clínica — cuestionario individual (T3/HC5).
 * Renderiza <TestQuestionScreen> con el banco de preguntas de la categoría (param) y guarda
 * las respuestas en historia_clinica.data[category] al completar.
 */
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
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
import {
  FITZPATRICK_HC_ID,
  FITZPATRICK_ROMAN,
  SOLAR_DOSE_LABELS,
  fitzpatrickTypeFromScore,
  scoreFitzpatrick,
} from '@/src/services/dx/fitzpatrick-core';
import { saveSkinType } from '@/src/services/dx/fitzpatrick-service';

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
      // Fitzpatrick: además de guardar respuestas, persiste el fototipo calculado en
      // profiles.skin_type (misma columna que ATP SOL) y refresca la card UV del HOY.
      if (questionnaire.id === FITZPATRICK_HC_ID) {
        const score = scoreFitzpatrick(answers);
        if (score !== null) {
          const type = fitzpatrickTypeFromScore(score);
          await saveSkinType(user.id, type);
          DeviceEventEmitter.emit('fototipo_changed');
          Alert.alert(
            `Fototipo ${FITZPATRICK_ROMAN[type - 1]}`,
            `Tu dosis de sol matutino: ${SOLAR_DOSE_LABELS[type]}. Ya quedó personalizada en ATP SOL, tu card UV del HOY y Mi Protocolo.\n\nSi tienes antecedentes de melanoma, fotosensibilidad por medicamentos o una enfermedad autoinmune con fotosensibilidad, consulta con tu dermatólogo antes de iniciar exposición solar sostenida.`,
            [{ text: 'OK', onPress: () => router.back() }],
          );
          return;
        }
      }
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
