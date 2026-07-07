/**
 * Disclaimers médicos — fuente única de copy + versión (#42).
 *
 * Source: Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md
 * TODO(#42): el doc físico no existe en el repo; este copy vivía en
 * MedicalDisclaimer.tsx con nota "pendiente firma final por Dra. Mariana
 * Zapata, PhD". Cuando Mariana firme la versión final, actualizar aquí y
 * hacer bump de MEDICAL_DISCLAIMER_VERSION (re-solicita aceptación a todos).
 */

export const MEDICAL_DISCLAIMER_VERSION = '1.0';

export type DisclaimerFeature =
  | 'global' | 'solar' | 'supplements' | 'glucose' | 'health'
  | 'braverman' | 'quiz' | 'fasting' | 'cycle' | 'genetics'
  | 'argos' | 'interpretation' | 'nutrition';

export const DISCLAIMERS: Record<DisclaimerFeature, string> = {
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

/** Secciones legibles para el modal (título + feature key). */
export const DISCLAIMER_SECTIONS: { title: string; feature: DisclaimerFeature }[] = [
  { title: 'Alcance general', feature: 'global' },
  { title: 'ARGOS (asistente IA)', feature: 'argos' },
  { title: 'Laboratorios y biomarcadores', feature: 'health' },
  { title: 'Glucosa', feature: 'glucose' },
  { title: 'Tests y evaluaciones', feature: 'braverman' },
  { title: 'Suplementos', feature: 'supplements' },
  { title: 'Ayuno', feature: 'fasting' },
  { title: 'Nutrición', feature: 'nutrition' },
  { title: 'Ciclo menstrual', feature: 'cycle' },
  { title: 'Exposición solar', feature: 'solar' },
];

/**
 * Lógica PURA del gate (#42): debe mostrarse el modal si nunca aceptó o si
 * aceptó una versión anterior a la vigente.
 */
export function mustShowDisclaimer(
  acceptedAt: string | null | undefined,
  acceptedVersion: string | null | undefined,
  currentVersion: string = MEDICAL_DISCLAIMER_VERSION,
): boolean {
  if (!acceptedAt) return true;
  return acceptedVersion !== currentVersion;
}
