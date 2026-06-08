/** Cuestionario Hábitos. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'exercise_freq', text: '¿Cuántos días a la semana entrenas?', options: [
    { label: '0', value: '0' }, { label: '1–2', value: '1-2' }, { label: '3–4', value: '3-4' }, { label: '5 o más', value: '5+' },
  ] },
  { parameter_key: 'alcohol', text: 'Consumo de alcohol', options: [
    { label: 'Diario', value: 'diario' }, { label: 'Fines de semana', value: 'finde' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'smoking', text: '¿Fumas?', options: [
    { label: 'Sí, diario', value: 'diario' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Exfumador', value: 'ex' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'screens_before_bed', text: 'Pantallas antes de dormir', options: [
    { label: 'Siempre', value: 'siempre' }, { label: 'Casi siempre', value: 'casi' }, { label: 'A veces', value: 'aveces' }, { label: 'Casi nunca', value: 'casi_nunca' },
  ] },
  { parameter_key: 'processed_food', text: 'Comida procesada en tu dieta', options: [
    { label: 'Mayoría', value: 'alta' }, { label: 'Bastante', value: 'media' }, { label: 'Poca', value: 'baja' }, { label: 'Casi nada', value: 'minima' },
  ] },
];

export default function HabitosQ() {
  return <QuestionnaireScreen domain="habitos" title="Hábitos" questions={QUESTIONS} pillar="mind" />;
}
