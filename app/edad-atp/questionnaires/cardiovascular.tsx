/** Cuestionario Cardiovascular. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'cardio_freq', text: '¿Haces ejercicio cardiovascular?', options: [
    { label: 'Nunca', value: 'nunca' }, { label: '1× semana', value: '1' }, { label: '2–3× semana', value: '2-3' }, { label: '4 o más', value: '4+' },
  ] },
  { parameter_key: 'breathlessness', text: '¿Te falta el aire subiendo escaleras?', options: [
    { label: 'Siempre', value: 'siempre' }, { label: 'A veces', value: 'aveces' }, { label: 'Raramente', value: 'raro' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'family_history', text: 'Historia familiar de enfermedad cardiovascular', options: [
    { label: 'Sí, temprana (<55)', value: 'temprana' }, { label: 'Sí, tardía', value: 'tardia' }, { label: 'No', value: 'no' }, { label: 'No sé', value: 'desconocido' },
  ] },
  { parameter_key: 'bp_known', text: '¿Conoces tu presión arterial?', options: [
    { label: 'Alta', value: 'alta' }, { label: 'Limítrofe', value: 'limitrofe' }, { label: 'Normal', value: 'normal' }, { label: 'No sé', value: 'desconocido' },
  ] },
  { parameter_key: 'palpitations', text: '¿Sientes palpitaciones en reposo?', options: [
    { label: 'Frecuente', value: 'frecuente' }, { label: 'A veces', value: 'aveces' }, { label: 'Raro', value: 'raro' }, { label: 'Nunca', value: 'nunca' },
  ] },
];

export default function CardiovascularQ() {
  return <QuestionnaireScreen domain="cardiovascular" title="Cardiovascular" questions={QUESTIONS} pillar="health" />;
}
