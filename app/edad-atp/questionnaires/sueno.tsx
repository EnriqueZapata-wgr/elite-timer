/** Cuestionario Sueño. Copy MVP — // TODO Mariana Sprint 5: validar. */
import { QuestionnaireScreen, type DomainQuestion } from '@/src/components/edad-atp/QuestionnaireScreen';

const QUESTIONS: DomainQuestion[] = [
  { parameter_key: 'sleep_hours', text: '¿Cuántas horas duermes por noche?', options: [
    { label: '< 5', value: '<5' }, { label: '5–6', value: '5-6' }, { label: '7–8', value: '7-8' }, { label: '> 8', value: '>8' },
  ] },
  { parameter_key: 'sleep_latency', text: '¿Cuánto tardas en dormirte?', options: [
    { label: '> 45 min', value: '>45' }, { label: '20–45 min', value: '20-45' }, { label: '10–20 min', value: '10-20' }, { label: '< 10 min', value: '<10' },
  ] },
  { parameter_key: 'awakenings', text: 'Despertares nocturnos', options: [
    { label: '3 o más', value: '3+' }, { label: '1–2', value: '1-2' }, { label: 'Raro', value: 'raro' }, { label: 'Ninguno', value: 'ninguno' },
  ] },
  { parameter_key: 'morning_feeling', text: 'Al despertar te sientes…', options: [
    { label: 'Agotado', value: 'agotado' }, { label: 'Cansado', value: 'cansado' }, { label: 'Bien', value: 'bien' }, { label: 'Renovado', value: 'renovado' },
  ] },
  { parameter_key: 'snoring_apnea', text: '¿Roncas o te han notado apneas?', options: [
    { label: 'Sí, apneas', value: 'apneas' }, { label: 'Ronquido fuerte', value: 'ronquido' }, { label: 'Leve', value: 'leve' }, { label: 'No', value: 'no' },
  ] },
];

export default function SuenoQ() {
  return <QuestionnaireScreen domain="sueno" title="Sueño" questions={QUESTIONS} pillar="rest" />;
}
