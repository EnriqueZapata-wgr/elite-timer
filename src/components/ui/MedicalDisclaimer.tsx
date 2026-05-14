/**
 * MedicalDisclaimer — Disclaimer legal pie de pantalla por feature.
 * Source: Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md
 * NOTA: textos pendientes firma final por Dra. Mariana Zapata, PhD.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';

export type DisclaimerFeature =
  | 'global' | 'solar' | 'supplements' | 'glucose' | 'health'
  | 'braverman' | 'quiz' | 'fasting' | 'cycle' | 'genetics'
  | 'argos' | 'interpretation' | 'nutrition';

const DISCLAIMERS: Record<DisclaimerFeature, string> = {
  global: 'ATP es una herramienta educativa de bienestar. La información y recomendaciones no constituyen diagnóstico, tratamiento, ni sustituyen consulta con profesional de salud. Antes de iniciar suplementos, cambios dietéticos o protocolos, consulta a tu médico, especialmente si tienes condiciones preexistentes, estás embarazada, lactando, o tomando medicamentos.',
  solar: 'La exposición solar guiada se basa en investigación sobre síntesis de vitamina D. No sustituye recomendaciones de tu dermatólogo. Si tienes piel sensible, antecedentes de melanoma, condiciones fotosensibles, o tomas medicamentos fotosensibilizantes, consulta a un especialista. Conoce tu fototipo.',
  supplements: 'Las sugerencias de suplementación son orientativas, no son prescripciones. Consulta a tu médico antes de iniciar cualquier suplemento, especialmente si tomas medicamentos.',
  glucose: 'ATP no diagnostica diabetes ni prediabetes. Los rangos funcionales mostrados son orientativos. Si tus mediciones son consistentemente anómalas, consulta a tu médico.',
  health: 'Los biomarcadores y edad biológica son estimaciones basadas en investigación pública. No reemplazan evaluación clínica. Consulta tus laboratorios con tu médico.',
  braverman: 'El Test de Braverman es un cuestionario de auto-reporte sobre patrones cognitivos y de comportamiento. No diagnostica trastornos. Si experimentas síntomas significativos de ansiedad, depresión, insomnio o dolor crónico, consulta a un profesional de salud mental.',
  quiz: 'Este quiz es educativo. No sustituye evaluación médica. Si los síntomas persisten o empeoran, consulta a un especialista.',
  fasting: 'El ayuno intermitente no es para todos. Personas con diabetes, embarazadas, lactando, con trastornos alimentarios actuales o pasados, niños, adolescentes y adultos mayores deben consultar a su médico antes. Si te sientes mareado, débil, o presentas síntomas inusuales, rompe el ayuno y busca atención.',
  cycle: 'Las predicciones de ciclo son estimaciones basadas en tu historial. No son método anticonceptivo. Tus datos están encriptados y nunca se comparten.',
  genetics: 'ATP Genética interpreta tu RAW de pruebas comerciales. Es educativa, no diagnóstico, no predice enfermedades específicas, ni reemplaza asesoramiento genético profesional.',
  argos: 'ARGOS es un asistente educativo basado en IA. No es médico. Para preocupaciones de salud, consulta a un profesional. En emergencia, contacta servicios médicos.',
  interpretation: 'Esta interpretación es preparada por la Dra. Mariana Zapata, PhD. Es educativa y orientativa. No constituye diagnóstico, tratamiento, ni reemplaza consulta con genetista clínico.',
  nutrition: 'ATP estima macros y orienta tu nutrición. No sustituye atención de nutriólogo profesional. Para condiciones específicas (diabetes, enfermedad renal, trastornos alimentarios), consulta especialista.',
};

interface Props { feature: DisclaimerFeature; compact?: boolean; }

export function MedicalDisclaimer({ feature, compact = false }: Props) {
  return (
    <View style={s.container}>
      <EliteText style={s.text} numberOfLines={compact ? 2 : undefined}>
        {DISCLAIMERS[feature]}
      </EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, marginTop: 24, marginBottom: 32 },
  text: { color: '#666', fontSize: 11, lineHeight: 16, textAlign: 'left' },
});
