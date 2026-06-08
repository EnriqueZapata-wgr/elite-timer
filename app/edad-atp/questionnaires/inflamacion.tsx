/** Cuestionario Inflamación. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'joint_pain', text: '¿Dolor articular o muscular frecuente?', options: [
    { label: 'Diario', value: 'diario' }, { label: 'Frecuente', value: 'frecuente' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'bloating', text: 'Hinchazón / distensión abdominal', options: [
    { label: 'Diario', value: 'diario' }, { label: 'Frecuente', value: 'frecuente' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Nunca', value: 'nunca' },
  ] },
  { parameter_key: 'skin_issues', text: 'Problemas de piel (acné, rojeces, eccema)', options: [
    { label: 'Frecuentes', value: 'frecuentes' }, { label: 'A veces', value: 'aveces' }, { label: 'Raro', value: 'raro' }, { label: 'No', value: 'no' },
  ] },
  { parameter_key: 'allergies', text: 'Alergias o sensibilidades activas', options: [
    { label: 'Varias', value: 'varias' }, { label: 'Una', value: 'una' }, { label: 'Leves', value: 'leves' }, { label: 'Ninguna', value: 'ninguna' },
  ] },
  { parameter_key: 'recovery_illness', text: '¿Cuánto tardas en recuperarte de un resfriado?', options: [
    { label: '> 2 semanas', value: '>2sem' }, { label: '~1 semana', value: '1sem' }, { label: 'Pocos días', value: 'dias' }, { label: 'Casi no me enfermo', value: 'minimo' },
  ] },
];

export default function InflamacionQ() {
  return <QuestionnaireScreen domain="inflamacion" title="Inflamación" questions={QUESTIONS} pillar="health" />;
}
