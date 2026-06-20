/**
 * Cuestionarios de Historia Clínica (T3 + HC5).
 *
 * ⚠️ FLAG MARIANA: preguntas propuestas por CC basadas en estándares de medicina funcional
 * (IFM toolkit, NAQ — Nutritional Assessment Questionnaire, MSQ — Medical Symptoms Questionnaire,
 * historia clínica estándar). Mariana valida/afina después. NO son diagnósticas: son de captura.
 *
 * Cada categoría → un cuestionario que usa <TestQuestionScreen>. Las respuestas se guardan en
 * historia_clinica.data[category] como JSONB { [questionId]: optionId | optionId[] }.
 */
import type { TestQuestion } from '@/src/components/tests/test-question-types';

export interface HCQuestionnaire {
  id: string;
  title: string;
  /** Texto corto para la card del índice. */
  blurb: string;
  icon: string;        // Ionicons name
  color: string;       // hex acento
  questions: TestQuestion[];
}

// Opción reutilizable sí/no/no_se
const YES_NO = [
  { id: 'yes', text: 'Sí' },
  { id: 'no', text: 'No' },
  { id: 'unknown', text: 'No sé' },
];

export const HC_QUESTIONNAIRES: HCQuestionnaire[] = [
  // ── 1. Padecimientos personales ──────────────────────────────────────────
  {
    id: 'padecimientos_personales',
    title: 'Padecimientos personales',
    blurb: 'Condiciones diagnosticadas que tienes o has tenido',
    icon: 'medkit-outline',
    color: '#ef4444',
    questions: [
      {
        id: 'condiciones',
        text: '¿Te han diagnosticado alguna de estas condiciones?',
        multi: true, optional: true,
        options: [
          { id: 'hta', text: 'Hipertensión arterial' },
          { id: 'dm2', text: 'Diabetes tipo 2 / prediabetes' },
          { id: 'hipotiroidismo', text: 'Hipotiroidismo' },
          { id: 'hipertiroidismo', text: 'Hipertiroidismo' },
          { id: 'dislipidemia', text: 'Colesterol / triglicéridos altos' },
          { id: 'higado_graso', text: 'Hígado graso' },
          { id: 'sop', text: 'Síndrome de ovario poliquístico (SOP)' },
          { id: 'autoinmune', text: 'Enfermedad autoinmune' },
          { id: 'depresion_ansiedad', text: 'Depresión / ansiedad' },
          { id: 'ninguna', text: 'Ninguna' },
        ],
      },
      {
        id: 'cirugias',
        text: '¿Te han hecho alguna cirugía mayor?',
        options: YES_NO,
      },
      {
        id: 'alergias',
        text: '¿Tienes alergias conocidas (alimentos, medicamentos, ambientales)?',
        options: YES_NO,
      },
    ],
  },

  // ── 2. Padecimientos familiares ──────────────────────────────────────────
  {
    id: 'padecimientos_familiares',
    title: 'Antecedentes familiares',
    blurb: 'Condiciones en padres, abuelos y hermanos',
    icon: 'people-outline',
    color: '#f59e0b',
    questions: [
      {
        id: 'familiares_cardiometabolico',
        text: '¿Algún familiar directo (padres, abuelos, hermanos) tiene o tuvo esto?',
        hint: 'Cardiometabólico',
        multi: true, optional: true,
        options: [
          { id: 'infarto', text: 'Infarto / enfermedad cardiaca' },
          { id: 'hta', text: 'Hipertensión' },
          { id: 'dm2', text: 'Diabetes' },
          { id: 'acv', text: 'Derrame cerebral' },
          { id: 'obesidad', text: 'Obesidad' },
          { id: 'ninguna', text: 'Ninguna' },
        ],
      },
      {
        id: 'familiares_otros',
        text: '¿Y alguna de estas?',
        hint: 'Oncológico / autoinmune / neurológico',
        multi: true, optional: true,
        options: [
          { id: 'cancer', text: 'Cáncer' },
          { id: 'autoinmune', text: 'Enfermedad autoinmune' },
          { id: 'tiroides', text: 'Problemas de tiroides' },
          { id: 'alzheimer', text: 'Alzheimer / demencia' },
          { id: 'osteoporosis', text: 'Osteoporosis' },
          { id: 'ninguna', text: 'Ninguna' },
        ],
      },
    ],
  },

  // ── 3. Tratamientos actuales ─────────────────────────────────────────────
  {
    id: 'tratamientos',
    title: 'Tratamientos actuales',
    blurb: 'Medicamentos, suplementos y terapias que tomas hoy',
    icon: 'bandage-outline',
    color: '#1D9E75',
    questions: [
      {
        id: 'medicamentos',
        text: '¿Tomas medicamentos de forma regular?',
        options: YES_NO,
      },
      {
        id: 'tipos_medicamentos',
        text: '¿De qué tipo?',
        multi: true, optional: true,
        options: [
          { id: 'presion', text: 'Para la presión' },
          { id: 'glucosa', text: 'Para la glucosa' },
          { id: 'tiroides', text: 'Para la tiroides' },
          { id: 'colesterol', text: 'Para el colesterol (estatinas)' },
          { id: 'animo', text: 'Antidepresivos / ansiolíticos' },
          { id: 'hormonal', text: 'Anticonceptivos / terapia hormonal' },
          { id: 'otro', text: 'Otro' },
          { id: 'ninguno', text: 'Ninguno' },
        ],
      },
      {
        id: 'suplementos',
        text: '¿Tomas suplementos o vitaminas?',
        options: YES_NO,
      },
      {
        id: 'terapias',
        text: '¿Estás en alguna terapia (psicológica, física, etc.)?',
        options: YES_NO,
      },
    ],
  },

  // ── 4. Salud bucal ───────────────────────────────────────────────────────
  {
    id: 'salud_bucal',
    title: 'Salud bucal',
    blurb: 'Amalgamas, encías, bruxismo — clave en medicina funcional',
    icon: 'happy-outline',
    color: '#60a5fa',
    questions: [
      {
        id: 'amalgamas',
        text: '¿Tienes amalgamas (tapaduras de metal/plata)?',
        options: YES_NO,
      },
      {
        id: 'caries',
        text: '¿Tienes caries sin tratar actualmente?',
        options: YES_NO,
      },
      {
        id: 'encias',
        text: '¿Te sangran las encías al cepillarte?',
        options: [
          { id: 'never', text: 'Nunca' },
          { id: 'sometimes', text: 'A veces' },
          { id: 'often', text: 'Frecuentemente' },
        ],
      },
      {
        id: 'bruxismo',
        text: '¿Aprietas o rechinas los dientes (bruxismo)?',
        options: YES_NO,
      },
      {
        id: 'endodoncias',
        text: '¿Tienes endodoncias (tratamientos de conducto)?',
        options: YES_NO,
      },
    ],
  },

  // ── 5. Síntomas crónicos ─────────────────────────────────────────────────
  {
    id: 'sintomas_cronicos',
    title: 'Síntomas crónicos',
    blurb: 'Molestias frecuentes de las últimas semanas (estilo MSQ)',
    icon: 'pulse-outline',
    color: '#c084fc',
    questions: [
      {
        id: 'energia',
        text: '¿Cómo está tu energía la mayoría de los días?',
        options: [
          { id: 'alta', text: 'Alta y estable' },
          { id: 'media', text: 'Más o menos' },
          { id: 'baja', text: 'Baja / me arrastro' },
          { id: 'crash', text: 'Picos y caídas fuertes' },
        ],
      },
      {
        id: 'digestivo',
        text: '¿Tienes molestias digestivas frecuentes?',
        multi: true, optional: true,
        options: [
          { id: 'inflamacion', text: 'Inflamación / distensión' },
          { id: 'estrenimiento', text: 'Estreñimiento' },
          { id: 'diarrea', text: 'Diarrea' },
          { id: 'reflujo', text: 'Reflujo / acidez' },
          { id: 'gases', text: 'Gases' },
          { id: 'ninguna', text: 'Ninguna' },
        ],
      },
      {
        id: 'dolores',
        text: '¿Tienes dolores recurrentes?',
        multi: true, optional: true,
        options: [
          { id: 'cabeza', text: 'Dolor de cabeza / migraña' },
          { id: 'articular', text: 'Dolor articular' },
          { id: 'muscular', text: 'Dolor muscular' },
          { id: 'espalda', text: 'Dolor de espalda' },
          { id: 'ninguno', text: 'Ninguno' },
        ],
      },
      {
        id: 'sueno',
        text: '¿Cómo duermes?',
        options: [
          { id: 'bien', text: 'Bien, despierto descansado' },
          { id: 'cuesta_dormir', text: 'Me cuesta conciliar el sueño' },
          { id: 'despierto', text: 'Despierto en la madrugada' },
          { id: 'no_reparador', text: 'Duermo pero no descanso' },
        ],
      },
    ],
  },
];

export const HC_BY_ID: Record<string, HCQuestionnaire> =
  Object.fromEntries(HC_QUESTIONNAIRES.map(q => [q.id, q]));
