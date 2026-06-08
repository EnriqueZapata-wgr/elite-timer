/** Cuestionario Vitalidad. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'daily_energy', text: 'Tu energía a lo largo del día', options: [
    { label: 'Muy baja', value: 'muy_baja' }, { label: 'Baja', value: 'baja' }, { label: 'Buena', value: 'buena' }, { label: 'Alta', value: 'alta' },
  ] },
  { parameter_key: 'motivation', text: 'Tu motivación / impulso', options: [
    { label: 'Nula', value: 'nula' }, { label: 'Baja', value: 'baja' }, { label: 'Buena', value: 'buena' }, { label: 'Alta', value: 'alta' },
  ] },
  { parameter_key: 'mental_clarity', text: 'Claridad mental / foco', options: [
    { label: 'Niebla', value: 'niebla' }, { label: 'Regular', value: 'regular' }, { label: 'Buena', value: 'buena' }, { label: 'Excelente', value: 'excelente' },
  ] },
  { parameter_key: 'afternoon_crash', text: '¿Tienes bajón por la tarde?', options: [
    { label: 'Severo', value: 'severo' }, { label: 'Moderado', value: 'moderado' }, { label: 'Leve', value: 'leve' }, { label: 'No', value: 'no' },
  ] },
  { parameter_key: 'recovery', text: 'Recuperación tras esfuerzo físico', options: [
    { label: 'Muy lenta', value: 'muy_lenta' }, { label: 'Lenta', value: 'lenta' }, { label: 'Normal', value: 'normal' }, { label: 'Rápida', value: 'rapida' },
  ] },
];

export default function VitalidadQ() {
  return <QuestionnaireScreen domain="vitalidad" title="Vitalidad" questions={QUESTIONS} pillar="mind" />;
}
