/** Cuestionario Metabolismo. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'meals_per_day', text: '¿Cuántas ingestas haces al día?', options: [
    { label: '1 (OMAD)', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }, { label: '5 o más', value: '5+' },
  ] },
  { parameter_key: 'fasting_habit', text: '¿Ayunas habitualmente?', options: [
    { label: 'No', value: 'no' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Ayuno intermitente regular', value: 'if_regular' }, { label: 'IF + OMAD', value: 'if_omad' },
  ] },
  { parameter_key: 'metabolic_flexibility', text: 'Tu flexibilidad metabólica subjetiva', options: [
    { label: 'Mala', value: 'mala' }, { label: 'Regular', value: 'regular' }, { label: 'Buena', value: 'buena' }, { label: 'Excelente', value: 'excelente' },
  ] },
  { parameter_key: 'sugar_cravings', text: '¿Con qué frecuencia tienes antojos de azúcar?', options: [
    { label: 'Varias veces al día', value: 'alta' }, { label: 'Diario', value: 'media' }, { label: 'Ocasional', value: 'baja' }, { label: 'Casi nunca', value: 'minima' },
  ] },
  { parameter_key: 'post_meal_energy', text: 'Energía después de comer', options: [
    { label: 'Bajón fuerte', value: 'bajon' }, { label: 'Algo de sueño', value: 'leve' }, { label: 'Estable', value: 'estable' }, { label: 'Con energía', value: 'energico' },
  ] },
];

export default function MetabolismoQ() {
  return <QuestionnaireScreen domain="metabolismo" title="Metabolismo" questions={QUESTIONS} pillar="nutrition" />;
}
