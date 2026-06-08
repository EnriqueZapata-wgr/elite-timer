/** Cuestionario Inmunidad. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'infections_per_year', text: '¿Cuántas veces te enfermas al año?', options: [
    { label: '6 o más', value: '6+' }, { label: '4–5', value: '4-5' }, { label: '2–3', value: '2-3' }, { label: '0–1', value: '0-1' },
  ] },
  { parameter_key: 'wound_healing', text: '¿Cómo cicatrizan tus heridas?', options: [
    { label: 'Muy lento', value: 'muy_lento' }, { label: 'Lento', value: 'lento' }, { label: 'Normal', value: 'normal' }, { label: 'Rápido', value: 'rapido' },
  ] },
  { parameter_key: 'gut_health', text: 'Salud digestiva general', options: [
    { label: 'Mala', value: 'mala' }, { label: 'Regular', value: 'regular' }, { label: 'Buena', value: 'buena' }, { label: 'Excelente', value: 'excelente' },
  ] },
  { parameter_key: 'autoimmune', text: '¿Diagnóstico autoinmune?', options: [
    { label: 'Sí, activo', value: 'activo' }, { label: 'Sí, controlado', value: 'controlado' }, { label: 'Sospecha', value: 'sospecha' }, { label: 'No', value: 'no' },
  ] },
  { parameter_key: 'recovery_after_training', text: 'Frecuencia de enfermarte tras entrenar duro', options: [
    { label: 'Siempre', value: 'siempre' }, { label: 'A veces', value: 'aveces' }, { label: 'Raro', value: 'raro' }, { label: 'Nunca', value: 'nunca' },
  ] },
];

export default function InmunidadQ() {
  return <QuestionnaireScreen domain="inmunidad" title="Inmunidad" questions={QUESTIONS} pillar="health" />;
}
