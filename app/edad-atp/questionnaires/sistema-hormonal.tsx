/** Cuestionario Sistema hormonal. Copy MVP — // TODO Mariana Sprint 5: validar
 *  (incl. preguntas específicas por sexo + fase del ciclo en mujeres). */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'libido', text: '¿Cómo está tu libido últimamente?', options: [
    { label: 'Muy baja', value: 'muy_baja' }, { label: 'Baja', value: 'baja' }, { label: 'Normal', value: 'normal' }, { label: 'Alta', value: 'alta' },
  ] },
  { parameter_key: 'morning_energy', text: 'Energía al despertar', options: [
    { label: 'Nula', value: 'nula' }, { label: 'Baja', value: 'baja' }, { label: 'Buena', value: 'buena' }, { label: 'Excelente', value: 'excelente' },
  ] },
  { parameter_key: 'mood_stability', text: 'Estabilidad de tu estado de ánimo', options: [
    { label: 'Muy variable', value: 'variable' }, { label: 'Irritable', value: 'irritable' }, { label: 'Estable', value: 'estable' }, { label: 'Muy estable', value: 'muy_estable' },
  ] },
  { parameter_key: 'stress_recovery', text: '¿Te recuperas bien del estrés?', options: [
    { label: 'Nada', value: 'nada' }, { label: 'Poco', value: 'poco' }, { label: 'Bien', value: 'bien' }, { label: 'Muy bien', value: 'muy_bien' },
  ] },
  { parameter_key: 'body_temp', text: '¿Sientes frío con frecuencia (manos/pies)?', options: [
    { label: 'Siempre', value: 'siempre' }, { label: 'A veces', value: 'aveces' }, { label: 'Raro', value: 'raro' }, { label: 'Nunca', value: 'nunca' },
  ] },
];

export default function SistemaHormonalQ() {
  return <QuestionnaireScreen domain="sistema_hormonal" title="Hormonal" questions={QUESTIONS} pillar="health" />;
}
