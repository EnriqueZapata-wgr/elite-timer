/** Cuestionario Renal y micronutrientes. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'water_intake', text: '¿Cuánta agua bebes al día?', options: [
    { label: '< 1 L', value: '<1' }, { label: '1–2 L', value: '1-2' }, { label: '2–3 L', value: '2-3' }, { label: '> 3 L', value: '>3' },
  ] },
  { parameter_key: 'urine_color', text: 'Color habitual de tu orina', options: [
    { label: 'Oscura', value: 'oscura' }, { label: 'Amarilla', value: 'amarilla' }, { label: 'Clara', value: 'clara' }, { label: 'Transparente', value: 'transparente' },
  ] },
  { parameter_key: 'supplements', text: '¿Tomas suplementos de micronutrientes?', options: [
    { label: 'Ninguno', value: 'ninguno' }, { label: '1–2', value: '1-2' }, { label: '3–5', value: '3-5' }, { label: 'Protocolo completo', value: 'protocolo' },
  ] },
  { parameter_key: 'cramps', text: '¿Calambres musculares?', options: [
    { label: 'Frecuentes', value: 'frecuentes' }, { label: 'A veces', value: 'aveces' }, { label: 'Raro', value: 'raro' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'salt_intake', text: 'Consumo de sal / sodio', options: [
    { label: 'Muy alto', value: 'muy_alto' }, { label: 'Alto', value: 'alto' }, { label: 'Moderado', value: 'moderado' }, { label: 'Bajo', value: 'bajo' },
  ] },
];

export default function RenalMicronutrientesQ() {
  return <QuestionnaireScreen domain="renal_micronutrientes" title="Renal / Micro" questions={QUESTIONS} pillar="health" />;
}
