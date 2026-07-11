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

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSIÓN LEVANTAMIENTOS (DX+Intervenciones F2) — cuestionario INTEGRAL choncho
// + 9 sub-áreas funcionales. Alimentan el nivel de calidad del DX (integral → L2,
// ≥3 áreas + hábitos → L3). Ramificación con optional/multi (no bloquean avance).
//
// ⚠️ FLAG MARIANA: validar — preguntas de captura funcional propuestas por CC
// (IFM toolkit, NAQ, MSQ, ATP protocol). NO diagnósticas.
// ═══════════════════════════════════════════════════════════════════════════

const FREQ_4 = [
  { id: 'nunca', text: 'Nunca / casi nunca' },
  { id: 'a_veces', text: 'A veces' },
  { id: 'seguido', text: 'Seguido' },
  { id: 'siempre', text: 'Casi siempre' },
];

const HC_EXTENSION: HCQuestionnaire[] = [
  // ── INTEGRAL (choncho, ramificado) ─────────────────────────────────────────
  {
    id: 'integral',
    title: 'Levantamiento integral',
    blurb: 'La foto completa: energía, sueño, digestión, ánimo, estilo de vida',
    icon: 'body-outline',
    color: '#A8E02A',
    questions: [
      {
        id: 'motivo_principal',
        text: '¿Qué es lo que MÁS te gustaría resolver con ATP?',
        options: [
          { id: 'energia', text: 'Tener más energía' },
          { id: 'peso', text: 'Composición corporal / peso' },
          { id: 'digestion', text: 'Digestión' },
          { id: 'sueno', text: 'Dormir mejor' },
          { id: 'estres', text: 'Estrés / ansiedad' },
          { id: 'hormonal', text: 'Equilibrio hormonal' },
          { id: 'rendimiento', text: 'Rendimiento físico/mental' },
          { id: 'otro', text: 'Otro' },
        ],
      },
      {
        id: 'energia_dia',
        text: '¿Cómo es tu energía a lo largo del día?',
        options: [
          { id: 'estable', text: 'Estable todo el día' },
          { id: 'baja_am', text: 'Me cuesta arrancar en la mañana' },
          { id: 'crash_pm', text: 'Caída fuerte en la tarde' },
          { id: 'siempre_baja', text: 'Baja casi siempre' },
        ],
      },
      {
        id: 'sueno_calidad',
        text: '¿Cómo duermes normalmente?',
        options: [
          { id: 'bien', text: 'Bien, despierto descansado' },
          { id: 'cuesta_conciliar', text: 'Me cuesta conciliar' },
          { id: 'despertares', text: 'Me despierto en la madrugada' },
          { id: 'no_reparador', text: 'Duermo pero no descanso' },
        ],
      },
      {
        id: 'horas_sueno',
        text: '¿Cuántas horas duermes en promedio?',
        options: [
          { id: 'menos_5', text: 'Menos de 5' },
          { id: '5_6', text: '5 a 6' },
          { id: '7_8', text: '7 a 8' },
          { id: 'mas_8', text: 'Más de 8' },
        ],
      },
      {
        id: 'estres_nivel',
        text: '¿Qué tan estresado te sientes la mayoría de los días?',
        options: [
          { id: 'bajo', text: 'Bajo' },
          { id: 'medio', text: 'Medio' },
          { id: 'alto', text: 'Alto' },
          { id: 'muy_alto', text: 'Muy alto / al límite' },
        ],
      },
      {
        id: 'digestion_general',
        text: '¿Cómo va tu digestión en general?',
        options: [
          { id: 'bien', text: 'Sin quejas' },
          { id: 'regular', text: 'Más o menos' },
          { id: 'mal', text: 'Molestias frecuentes' },
        ],
      },
      {
        id: 'ejercicio_frecuencia',
        text: '¿Con qué frecuencia entrenas?',
        options: [
          { id: 'nada', text: 'No entreno' },
          { id: '1_2', text: '1-2 veces/semana' },
          { id: '3_4', text: '3-4 veces/semana' },
          { id: '5_mas', text: '5+ veces/semana' },
        ],
      },
      {
        id: 'alimentacion_estilo',
        text: '¿Cómo describirías tu alimentación?',
        options: [
          { id: 'procesada', text: 'Mucho procesado / comida rápida' },
          { id: 'mixta', text: 'Mixta' },
          { id: 'real', text: 'Comida real, casera' },
          { id: 'estricta', text: 'Muy cuidada / protocolo específico' },
        ],
      },
      {
        id: 'sustancias',
        text: '¿Consumes alguna de estas de forma habitual?',
        multi: true, optional: true,
        options: [
          { id: 'cafe', text: 'Café / cafeína' },
          { id: 'alcohol', text: 'Alcohol' },
          { id: 'tabaco', text: 'Tabaco / vape' },
          { id: 'azucar', text: 'Azúcar / dulces' },
          { id: 'ninguna', text: 'Ninguna' },
        ],
      },
      {
        id: 'animo_general',
        text: '¿Cómo ha estado tu ánimo últimamente?',
        options: [
          { id: 'bien', text: 'Estable y positivo' },
          { id: 'variable', text: 'Variable' },
          { id: 'bajo', text: 'Bajo / desmotivado' },
          { id: 'ansioso', text: 'Ansioso / irritable' },
        ],
      },
      {
        id: 'objetivo_plazo',
        text: '¿En qué plazo te gustaría ver cambios?',
        optional: true,
        options: [
          { id: 'ya', text: 'Lo antes posible' },
          { id: 'meses', text: 'En unos meses, sostenible' },
          { id: 'largo', text: 'Es un proyecto de largo plazo' },
        ],
      },
    ],
  },

  // ── Sub-área: Digestiva ─────────────────────────────────────────────────────
  {
    id: 'salud_digestiva',
    title: 'Salud digestiva',
    blurb: 'Tránsito, distensión, reflujo, tolerancias',
    icon: 'nutrition-outline',
    color: '#EF9F27',
    questions: [
      { id: 'evacuaciones', text: '¿Cómo son tus evacuaciones?', options: [
        { id: 'diaria_bien', text: 'Diarias y bien formadas' },
        { id: 'estrenimiento', text: 'Estreñimiento (< 1/día)' },
        { id: 'diarrea', text: 'Sueltas / diarrea' },
        { id: 'alterna', text: 'Alterna entre ambas' },
      ] },
      { id: 'distension', text: '¿Te inflamas o distiendes después de comer?', options: FREQ_4 },
      { id: 'reflujo', text: '¿Tienes reflujo o acidez?', options: FREQ_4 },
      { id: 'gases', text: '¿Gases o eructos frecuentes?', options: FREQ_4 },
      { id: 'intolerancias', text: '¿Notas malestar con algún alimento?', multi: true, optional: true, options: [
        { id: 'lacteos', text: 'Lácteos' },
        { id: 'gluten', text: 'Gluten / trigo' },
        { id: 'legumbres', text: 'Legumbres' },
        { id: 'fodmap', text: 'Cebolla/ajo/coles' },
        { id: 'ninguno', text: 'Ninguno' },
      ] },
    ],
  },

  // ── Sub-área: Sueño ─────────────────────────────────────────────────────────
  {
    id: 'salud_sueno',
    title: 'Salud del sueño',
    blurb: 'Conciliación, despertares, descanso, ritmo',
    icon: 'moon-outline',
    color: '#7F77DD',
    questions: [
      { id: 'conciliar', text: '¿Cuánto tardas en dormirte?', options: [
        { id: 'rapido', text: 'Menos de 15 min' },
        { id: 'medio', text: '15-30 min' },
        { id: 'lento', text: '30-60 min' },
        { id: 'muy_lento', text: 'Más de 1 hora' },
      ] },
      { id: 'despertares', text: '¿Te despiertas durante la noche?', options: FREQ_4 },
      { id: 'pantallas_noche', text: '¿Usas pantallas la última hora antes de dormir?', options: FREQ_4 },
      { id: 'descanso', text: 'Al despertar, ¿te sientes descansado?', options: FREQ_4 },
      { id: 'horario_regular', text: '¿Tu horario de dormir es regular?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Piel ──────────────────────────────────────────────────────────
  {
    id: 'salud_piel',
    title: 'Salud de la piel',
    blurb: 'Acné, resequedad, sensibilidad, señales sistémicas',
    icon: 'sparkles-outline',
    color: '#F472B6',
    questions: [
      { id: 'condiciones_piel', text: '¿Tienes alguna de estas?', multi: true, optional: true, options: [
        { id: 'acne', text: 'Acné' },
        { id: 'eczema', text: 'Eczema / dermatitis' },
        { id: 'rosacea', text: 'Rosácea / enrojecimiento' },
        { id: 'psoriasis', text: 'Psoriasis' },
        { id: 'ninguna', text: 'Ninguna' },
      ] },
      { id: 'resequedad', text: '¿Sientes la piel reseca o tirante?', options: FREQ_4 },
      { id: 'grasa', text: '¿Piel grasa o poros marcados?', options: FREQ_4 },
      { id: 'brotes_estres', text: '¿Empeora con estrés o ciertos alimentos?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Metabólica ────────────────────────────────────────────────────
  {
    id: 'salud_metabolica',
    title: 'Salud metabólica',
    blurb: 'Antojos, energía tras comer, peso, glucosa',
    icon: 'flame-outline',
    color: '#F97316',
    questions: [
      { id: 'antojos', text: '¿Tienes antojos de azúcar o carbohidratos?', options: FREQ_4 },
      { id: 'energia_post_comida', text: 'Después de comer, ¿te da sueño o bajón?', options: FREQ_4 },
      { id: 'hambre_frecuente', text: '¿Sientes hambre a las 2-3 horas de comer?', options: FREQ_4 },
      { id: 'grasa_abdominal', text: '¿Acumulas grasa sobre todo en el abdomen?', options: YES_NO },
      { id: 'peso_reciente', text: '¿Cómo ha cambiado tu peso el último año?', options: [
        { id: 'estable', text: 'Estable' },
        { id: 'subio', text: 'Subió' },
        { id: 'bajo', text: 'Bajó sin proponérmelo' },
        { id: 'fluctua', text: 'Fluctúa mucho' },
      ] },
    ],
  },

  // ── Sub-área: Hormonal (hombre) ─────────────────────────────────────────────
  {
    id: 'salud_hormonal_h',
    title: 'Salud hormonal (hombres)',
    blurb: 'Libido, energía, fuerza, recuperación',
    icon: 'male-outline',
    color: '#38BDF8',
    questions: [
      { id: 'libido', text: '¿Cómo está tu libido?', options: [
        { id: 'alta', text: 'Alta' },
        { id: 'normal', text: 'Normal' },
        { id: 'baja', text: 'Baja' },
        { id: 'muy_baja', text: 'Muy baja / ausente' },
      ] },
      { id: 'erecciones_matutinas', text: '¿Tienes erecciones matutinas con regularidad?', options: FREQ_4 },
      { id: 'fuerza', text: '¿Has notado pérdida de fuerza o masa muscular?', options: YES_NO },
      { id: 'motivacion', text: '¿Cómo está tu motivación e iniciativa?', options: [
        { id: 'alta', text: 'Alta' },
        { id: 'normal', text: 'Normal' },
        { id: 'baja', text: 'Baja' },
      ] },
      { id: 'recuperacion', text: '¿Te recuperas bien tras entrenar?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Hormonal (mujer) ──────────────────────────────────────────────
  {
    id: 'salud_hormonal_m',
    title: 'Salud hormonal (mujeres)',
    blurb: 'Ciclo, SPM, energía, señales cíclicas',
    icon: 'female-outline',
    color: '#D4537E',
    questions: [
      { id: 'ciclo_regular', text: '¿Tu ciclo menstrual es regular?', options: [
        { id: 'regular', text: 'Regular (~28 días)' },
        { id: 'irregular', text: 'Irregular' },
        { id: 'ausente', text: 'Ausente' },
        { id: 'menopausia', text: 'Menopausia / posmenopausia' },
      ] },
      { id: 'spm', text: '¿Qué tan intenso es tu SPM (síndrome premenstrual)?', options: [
        { id: 'nulo', text: 'Nulo o leve' },
        { id: 'moderado', text: 'Moderado' },
        { id: 'intenso', text: 'Intenso' },
      ] },
      { id: 'dolor_menstrual', text: '¿Tienes dolor menstrual (cólicos)?', options: FREQ_4 },
      { id: 'retencion', text: '¿Retención de líquidos o sensibilidad en senos antes del periodo?', options: FREQ_4 },
      { id: 'animo_ciclico', text: '¿Tu ánimo cambia mucho según la fase del ciclo?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Inflamación ───────────────────────────────────────────────────
  {
    id: 'inflamacion',
    title: 'Inflamación',
    blurb: 'Dolores, hinchazón, recuperación, señales sistémicas',
    icon: 'thermometer-outline',
    color: '#EF4444',
    questions: [
      { id: 'dolores_articulares', text: '¿Tienes dolores articulares o musculares sin causa clara?', options: FREQ_4 },
      { id: 'rigidez_matutina', text: '¿Rigidez o entumecimiento al despertar?', options: FREQ_4 },
      { id: 'hinchazon', text: '¿Notas hinchazón (cara, manos, tobillos)?', options: FREQ_4 },
      { id: 'lesiones', text: '¿Te lesionas o tardas en sanar con frecuencia?', options: FREQ_4 },
      { id: 'niebla_mental', text: '¿Niebla mental o dificultad para concentrarte?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Hábitos nutricionales ─────────────────────────────────────────
  {
    id: 'habitos_nutricionales',
    title: 'Hábitos nutricionales',
    blurb: 'Comidas, hidratación, procesados, vegetales',
    icon: 'restaurant-outline',
    color: '#22C55E',
    questions: [
      { id: 'comidas_dia', text: '¿Cuántas comidas haces al día?', options: [
        { id: '1_2', text: '1-2' },
        { id: '3', text: '3' },
        { id: '4_5', text: '4-5' },
        { id: 'picoteo', text: 'Picoteo todo el día' },
      ] },
      { id: 'vegetales', text: '¿Comes verduras en cada comida principal?', options: FREQ_4 },
      { id: 'proteina', text: '¿Incluyes proteína en cada comida?', options: FREQ_4 },
      { id: 'procesados', text: '¿Con qué frecuencia comes ultraprocesados?', options: FREQ_4 },
      { id: 'agua', text: '¿Cuánta agua tomas al día?', options: [
        { id: 'poca', text: 'Menos de 1 L' },
        { id: 'media', text: '1-2 L' },
        { id: 'buena', text: 'Más de 2 L' },
      ] },
      { id: 'horario_comidas', text: '¿Comes a horarios regulares?', options: FREQ_4 },
    ],
  },

  // ── Sub-área: Antecedentes heredopatológicos ────────────────────────────────
  {
    id: 'antecedentes_heredopatologicos',
    title: 'Antecedentes heredopatológicos',
    blurb: 'Carga familiar por sistema (padres, abuelos, hermanos)',
    icon: 'git-network-outline',
    color: '#F59E0B',
    questions: [
      { id: 'metabolico', text: 'Familiares directos con: (metabólico)', multi: true, optional: true, options: [
        { id: 'diabetes', text: 'Diabetes' },
        { id: 'obesidad', text: 'Obesidad' },
        { id: 'tiroides', text: 'Tiroides' },
        { id: 'ninguna', text: 'Ninguna' },
      ] },
      { id: 'cardiovascular', text: 'Familiares directos con: (cardiovascular)', multi: true, optional: true, options: [
        { id: 'infarto', text: 'Infarto / cardiopatía' },
        { id: 'hta', text: 'Hipertensión' },
        { id: 'acv', text: 'Derrame' },
        { id: 'ninguna', text: 'Ninguna' },
      ] },
      { id: 'oncologico', text: 'Familiares directos con cáncer', options: YES_NO },
      { id: 'mental_neuro', text: 'Familiares con: (mente / neuro)', multi: true, optional: true, options: [
        { id: 'depresion', text: 'Depresión / ansiedad' },
        { id: 'alzheimer', text: 'Alzheimer / demencia' },
        { id: 'adicciones', text: 'Adicciones' },
        { id: 'ninguna', text: 'Ninguna' },
      ] },
      { id: 'autoinmune', text: 'Familiares con enfermedad autoinmune', options: YES_NO },
    ],
  },

  // ── Sub-área: Inmunológica ──────────────────────────────────────────────────
  {
    id: 'salud_inmunologica',
    title: 'Salud inmunológica',
    blurb: 'Frecuencia de infecciones y uso de antibióticos',
    icon: 'shield-checkmark-outline',
    color: '#1D9E75',
    questions: [
      { id: 'veces_enferma', text: '¿Cuántas veces te enfermas al año (gripe, infecciones)?', options: [
        { id: 'rara', text: '0-1 (casi nunca)' },
        { id: 'pocas', text: '2-3' },
        { id: 'varias', text: '4-6' },
        { id: 'muchas', text: 'Más de 6' },
      ] },
      { id: 'duracion', text: 'Cuando te enfermas, ¿cuánto tardas en recuperarte?', options: [
        { id: 'rapido', text: 'Pocos días' },
        { id: 'normal', text: 'Una semana' },
        { id: 'lento', text: 'Más de 2 semanas' },
      ] },
      { id: 'antibioticos', text: '¿Cuántas veces al año usas antibióticos?', options: [
        { id: 'cero', text: 'Ninguna' },
        { id: 'una_dos', text: '1-2' },
        { id: 'tres_mas', text: '3 o más' },
      ] },
      { id: 'infecciones_recurrentes', text: '¿Tienes infecciones recurrentes?', multi: true, optional: true, options: [
        { id: 'urinarias', text: 'Urinarias' },
        { id: 'respiratorias', text: 'Respiratorias / sinusitis' },
        { id: 'hongos', text: 'Hongos / candidiasis' },
        { id: 'herpes', text: 'Herpes / fuegos' },
        { id: 'ninguna', text: 'Ninguna' },
      ] },
      { id: 'alergias_estacionales', text: '¿Tienes alergias estacionales o rinitis?', options: FREQ_4 },
    ],
  },
];

HC_QUESTIONNAIRES.push(...HC_EXTENSION);

/** ID del levantamiento integral (peso alto: sube el DX a nivel 2). */
export const HC_INTEGRAL_ID = 'integral';

/** IDs de los 5 levantamientos base (historia clínica básica → nivel 1). */
export const HC_BASE_IDS = [
  'padecimientos_personales',
  'padecimientos_familiares',
  'tratamientos',
  'salud_bucal',
  'sintomas_cronicos',
] as const;

/**
 * IDs de las 9 sub-áreas funcionales (cuentan para el nivel 3 del DX).
 * salud_hormonal_h / salud_hormonal_m son variantes por sexo (cualquiera cuenta).
 */
export const HC_AREA_IDS = [
  'salud_digestiva',
  'salud_sueno',
  'salud_piel',
  'salud_metabolica',
  'salud_hormonal_h',
  'salud_hormonal_m',
  'inflamacion',
  'habitos_nutricionales',
  'antecedentes_heredopatologicos',
  'salud_inmunologica',
] as const;

export const HC_BY_ID: Record<string, HCQuestionnaire> =
  Object.fromEntries(HC_QUESTIONNAIRES.map(q => [q.id, q]));
