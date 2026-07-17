/**
 * master-quiz-bank — banco de preguntas del Cuestionario Maestro ATP (Mega-Sprint D).
 *
 * 13 dimensiones + BONUS objetivos. Cada pregunta declara su tipo de input, sus
 * reglas de ramificación (skip / deep-dive / femaleOnly) y su mapeo al fenotipo
 * (dx_levels / roots / contraindicaciones). PURO (sin react-native/supabase) →
 * el motor de ramificación y el scoring lo consumen y se testean node-only.
 *
 * Ediciones firmadas por Enrique (v2 2026-07-16) aplicadas:
 *  A · globales: español MX, siglas explicadas en línea, ejemplos concretos,
 *      helper "(selecciona todas las que apliquen)" en multiselect.
 *  B · puntuales: D1.7 ejemplos, D2.3 +lepulse/garmin, D2.4 "no lo sé", D5.3
 *      "bebidas alcohólicas", D5.4 SPLIT tabaco/vapeo, D9.5 chips, B.5 expandida,
 *      deep-dive GLP-1 (motivación/anhedonia).
 *  C1 · padecimientos con estado (activo/remisión/resuelto) — tipo 'condition_status'.
 *  C2 · embarazo/lactancia estado ACTUAL (D9.4b) — dispara flags, no la historia.
 *
 * [PEND-MARIANA]: listas clínicas parametrizables (padecimientos, contraindicaciones,
 * depleciones anticonceptivos, framing sensible). Marcadas con PEND_MARIANA para que
 * Mariana las cierre sin re-tocar arquitectura. Ver arrays *_PEND_MARIANA abajo.
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

export type SectionId =
  | 'd1_estado_cuerpo' | 'd2_composicion' | 'd3_piel_unas_cabello' | 'd4_salud_bucal'
  | 'd5_consumo' | 'd6_medicamentos' | 'd7_suplementos' | 'd8_intervenciones'
  | 'd9_antecedentes' | 'd10_exposiciones' | 'd11_contexto_vida' | 'd12_sexualidad'
  | 'd13_proposito' | 'bonus_objetivos';

export type InputType =
  | 'visual_scale'      // 1-5 con etiquetas de extremos
  | 'single'           // una opción (radio)
  | 'multi'            // chips múltiples
  | 'number'           // numérico + unidad
  | 'toggle'           // sí/no
  | 'text'             // texto libre
  | 'condition_status' // C1 · lista con estado activo/remisión/resuelto por ítem
  | 'repro_status';    // C2 · estado reproductivo actual (dispara flags)

export interface QuizOption {
  value: string;
  label: string;
}

/** Estado de un padecimiento (C1 · mismo modelo que user_symptoms mig 202). */
export type ConditionStatus = 'activo' | 'remision' | 'resuelto';

export interface MasterQuizQuestion {
  code: string;              // 'D1.1'
  section: SectionId;
  text: string;
  type: InputType;
  /** Opciones (single/multi/condition_status). */
  options?: QuizOption[];
  min?: number;
  max?: number;
  unit?: string;
  /** Escala visual: etiqueta del extremo bajo y alto. */
  scaleLabels?: [string, string];
  /** Multiselect → mostrar "(selecciona todas las que apliquen)" (edición A.4). */
  multiHelper?: boolean;
  /** Micro-copy "¿por qué te preguntamos esto?" (educa mientras trackea). */
  why?: string;
  /** Placeholder / ayuda del input. */
  placeholder?: string;
  /** Preguntas sensibles → ofrecer "Prefiero no responder". */
  allowPreferNot?: boolean;
  /** SKIP por género (solo mujeres). */
  femaleOnly?: boolean;
  /** SKIP por género (solo hombres). */
  maleOnly?: boolean;
  /** Códigos de sub-preguntas deep-dive a insertar según la respuesta. */
  deepDive?: { when: (answer: unknown) => boolean; followUps: string[] };
  /** SKIP dinámico según respuestas previas (ej. "no fuma" → skip intensidad). */
  skipWhen?: (answers: Record<string, unknown>) => boolean;
  /** Es una sub-pregunta deep-dive (no aparece en el flujo base). */
  isFollowUp?: boolean;
  /** La lista de opciones espera cierre clínico de Mariana. */
  pendMariana?: boolean;
}

export interface MasterQuizSectionMeta {
  id: SectionId;
  title: string;
  emoji: string;
  intro: string;
}

// ── Listas parametrizables [PEND-MARIANA] ────────────────────────────────────
// Mariana cierra el CONTENIDO de estas listas sin tocar la arquitectura del quiz.

/** [PEND-MARIANA #1] Padecimientos crónicos (D9.2). Lista base editable. */
export const PADECIMIENTOS_PEND_MARIANA: QuizOption[] = [
  { value: 'hipertension', label: 'Hipertensión (presión alta)' },
  { value: 'diabetes_tipo_1', label: 'Diabetes tipo 1' },
  { value: 'diabetes_tipo_2', label: 'Diabetes tipo 2' },
  { value: 'hipotiroidismo', label: 'Hipotiroidismo' },
  { value: 'hipertiroidismo', label: 'Hipertiroidismo' },
  { value: 'hashimoto', label: 'Hashimoto (tiroiditis autoinmune)' },
  { value: 'autoinmune_otra', label: 'Otra autoinmune (lupus, artritis reumatoide, Crohn…)' },
  { value: 'fibromialgia', label: 'Fibromialgia' },
  { value: 'migrana', label: 'Migraña' },
  { value: 'sop', label: 'SOP (síndrome de ovario poliquístico)' },
  { value: 'endometriosis', label: 'Endometriosis' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'ansiedad', label: 'Trastorno de ansiedad' },
  { value: 'tdah', label: 'TDAH' },
  { value: 'cancer', label: 'Cáncer (cualquier tipo)' },
];

/** [PEND-MARIANA #2] Contraindicaciones extra que Mariana puede sumar a padecimientos. */
export const CONTRAINDICACIONES_PEND_MARIANA: QuizOption[] = [
  { value: 'epilepsia', label: 'Epilepsia' },
  { value: 'marcapasos', label: 'Marcapasos' },
  { value: 'anticoagulantes', label: 'Uso de anticoagulantes' },
  { value: 'insuficiencia_renal', label: 'Insuficiencia renal' },
  { value: 'insuficiencia_hepatica', label: 'Insuficiencia hepática' },
];

/** [PEND-MARIANA #3] Depleciones por anticonceptivos (D6.4). Mapeo editable. */
export const ANTICONCEPTIVO_DEPLECIONES_PEND_MARIANA: string[] = [
  'vitamina_b6', 'folato', 'zinc', 'magnesio',
];

// ── Meta de secciones ────────────────────────────────────────────────────────

export const MASTER_QUIZ_SECTIONS: MasterQuizSectionMeta[] = [
  { id: 'd1_estado_cuerpo', emoji: '🩺', title: 'Estado actual del cuerpo', intro: 'Cuéntanos cómo se siente tu cuerpo HOY. No hay respuestas malas — solo estás dibujando tu punto de partida.' },
  { id: 'd2_composicion', emoji: '📏', title: 'Composición corporal', intro: 'Datos que ATP necesita para tu Edad ATP y para calibrar recomendaciones de nutrición y fitness.' },
  { id: 'd3_piel_unas_cabello', emoji: '✨', title: 'Piel, uñas y cabello', intro: 'Tu piel, uñas y cabello son ventanas al interior. Cambios sutiles nos dicen mucho de tu bioquímica.' },
  { id: 'd4_salud_bucal', emoji: '🦷', title: 'Salud bucal', intro: 'La boca es puerta al sistema digestivo, endocrino e inflamatorio. Data que casi nadie te pregunta pero es oro.' },
  { id: 'd5_consumo', emoji: '🍔', title: 'Hábitos de consumo', intro: 'Sin juicio. Solo dibujamos tu patrón real para poder personalizar.' },
  { id: 'd6_medicamentos', emoji: '💊', title: 'Medicamentos', intro: 'Necesitamos saber qué tomas para evitar interacciones y contraindicaciones. Esta información SOLO la ve ATP, NUNCA se comparte.' },
  { id: 'd7_suplementos', emoji: '🧪', title: 'Suplementos', intro: 'Los suplementos son parte de tu bioquímica. Vamos a mapearlos para que no dupliques y para que veas qué te falta.' },
  { id: 'd8_intervenciones', emoji: '💉', title: 'Intervenciones estéticas y metabólicas', intro: 'Cada vez más gente usa péptidos, GLP-1 (medicamentos tipo Ozempic) y terapias hormonales. Necesitamos saber para calibrar tu protocolo.' },
  { id: 'd9_antecedentes', emoji: '🏥', title: 'Antecedentes y traumas', intro: 'Tu historia médica es parte de tu epigenética. Un evento hace 20 años sigue modulando genes hoy.' },
  { id: 'd10_exposiciones', emoji: '🌍', title: 'Exposiciones ambientales', intro: 'Tu ambiente es tu epigenética invisible. Aire, agua, químicos, cosméticos: todo moldea tu expresión genética.' },
  { id: 'd11_contexto_vida', emoji: '💼', title: 'Contexto de vida', intro: 'El estrés no es solo psicológico — es epigenético. El contexto donde vives moldea tu bioquímica diaria.' },
  { id: 'd12_sexualidad', emoji: '💜', title: 'Sexualidad y libido', intro: 'La libido y la función sexual son biomarcadores hormonales potentes. Puedes saltar esta sección si prefieres — pero es data valiosa.' },
  { id: 'd13_proposito', emoji: '🌟', title: 'Propósito y significado', intro: 'Las poblaciones más longevas del mundo (Blue Zones) tienen algo en común: sentido de propósito claro. No es esotérico, es epigenética.' },
  { id: 'bonus_objetivos', emoji: '🎯', title: 'Tus objetivos', intro: 'Última sección. Con esto ATP calibra prioridades y sabe qué te haría feliz mover primero.' },
];

// ── Banco de preguntas ───────────────────────────────────────────────────────

const yn: QuizOption[] = [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }];
const freqScale: [string, string] = ['nunca', 'constantemente'];

export const MASTER_QUIZ_QUESTIONS: MasterQuizQuestion[] = [
  // ── D1 · Estado del cuerpo ──
  { code: 'D1.1', section: 'd1_estado_cuerpo', type: 'visual_scale', min: 1, max: 5, scaleLabels: ['agotado', 'energizado'],
    text: '¿Cómo describirías tu energía la MAYORÍA de días?',
    why: 'La energía es la primera señal de si tus mitocondrias y tu tiroides están al 100.' },
  { code: 'D1.2', section: 'd1_estado_cuerpo', type: 'single',
    text: '¿Cómo duermes en promedio?',
    options: [
      { value: 'profundo', label: 'Duermo profundo y despierto listo' },
      { value: 'no_descanso', label: 'Duermo pero no descanso' },
      { value: 'mantenimiento', label: 'Me despierto a media noche' },
      { value: 'conciliacion', label: 'No logro dormirme' },
      { value: 'poco_funciono', label: 'Duermo poco pero funciono' },
    ],
    deepDive: { when: (a) => a === 'mantenimiento' || a === 'conciliacion', followUps: ['D1.2.a', 'D1.2.b'] } },
  { code: 'D1.2.a', section: 'd1_estado_cuerpo', type: 'single', isFollowUp: true,
    text: '¿A qué hora sueles despertarte o batallar para dormir?',
    options: [{ value: 'antes_3', label: 'Antes de las 3am' }, { value: '3_5', label: 'Entre 3 y 5am' }, { value: 'al_dormir', label: 'Al intentar dormirme' }] },
  { code: 'D1.2.b', section: 'd1_estado_cuerpo', type: 'single', isFollowUp: true,
    text: 'Cuando despiertas, ¿piensas mucho o solo despiertas?',
    options: [{ value: 'pienso', label: 'La mente no para' }, { value: 'solo_despierto', label: 'Solo despierto' }] },
  { code: 'D1.3', section: 'd1_estado_cuerpo', type: 'multi', multiHelper: true,
    text: '¿Cómo va tu digestión?',
    options: [
      { value: 'regular', label: 'Regular' }, { value: 'hinchazon', label: 'Hinchazón frecuente' },
      { value: 'estrenimiento', label: 'Estreñimiento' }, { value: 'diarrea', label: 'Diarrea' },
      { value: 'reflujo', label: 'Reflujo / acidez' }, { value: 'gases', label: 'Gases' },
      { value: 'dolor', label: 'Dolor abdominal' }, { value: 'perfecto', label: 'Todo perfecto' },
    ] },
  { code: 'D1.4', section: 'd1_estado_cuerpo', type: 'multi', multiHelper: true,
    text: '¿Sueles tener dolores físicos crónicos (más de 3 meses)?',
    options: [
      { value: 'cabeza', label: 'Cabeza' }, { value: 'espalda', label: 'Espalda baja' },
      { value: 'cuello', label: 'Cuello' }, { value: 'articulaciones', label: 'Articulaciones' },
      { value: 'muscular', label: 'Muscular general' }, { value: 'ninguno', label: 'No tengo' },
    ] },
  { code: 'D1.5', section: 'd1_estado_cuerpo', type: 'visual_scale', min: 1, max: 5, scaleLabels: ['apático', 'radiante'],
    text: '¿Cómo describirías tu estado de ánimo de las últimas 2-4 semanas?' },
  { code: 'D1.6', section: 'd1_estado_cuerpo', type: 'visual_scale', min: 1, max: 5, scaleLabels: freqScale,
    text: '¿Tienes ansiedad o pensamientos que "no puedes apagar"?' },
  { code: 'D1.7', section: 'd1_estado_cuerpo', type: 'number', min: 0, max: 8, unit: 'veces',
    text: 'En un día promedio, ¿cuántas veces necesitas un estimulante para funcionar?',
    // Edición B: ejemplos de estimulantes.
    why: 'Cuenta café, té, mate, pre-entreno, nicotina y bebidas energéticas. Necesitar muchos apunta a cortisol matutino bajo o tiroides lenta.' },

  // ── D2 · Composición ──
  { code: 'D2.1', section: 'd2_composicion', type: 'number', min: 20, max: 300, unit: 'kg', text: 'Peso actual' },
  { code: 'D2.2', section: 'd2_composicion', type: 'number', min: 100, max: 250, unit: 'cm', text: 'Altura' },
  { code: 'D2.3', section: 'd2_composicion', type: 'single',
    text: '¿Tienes acceso a una báscula inteligente?',
    // Edición B: +lepulse, +garmin.
    why: 'Marcas comunes: Withings, Renpho, Xiaomi, Lepulse, Garmin. Si sí, luego te pedimos % de grasa y músculo.',
    options: [{ value: 'si', label: 'Sí, tengo báscula inteligente' }, { value: 'no', label: 'No' }],
    deepDive: { when: (a) => a === 'si', followUps: ['D2.3.a'] } },
  { code: 'D2.3.a', section: 'd2_composicion', type: 'number', min: 3, max: 60, unit: '% grasa', isFollowUp: true,
    text: '¿Cuál es tu % de grasa corporal según tu báscula?' },
  { code: 'D2.4', section: 'd2_composicion', type: 'number', min: 40, max: 200, unit: 'cm',
    text: 'Circunferencia de cintura (a la altura del ombligo)',
    // Edición B: opción "no lo sé".
    why: 'Es el mejor predictor de riesgo cardiometabólico, más que el peso. Si no la sabes ahora, puedes llenarla más tarde.',
    allowPreferNot: true, placeholder: 'No lo sé / llenar más tarde' },
  { code: 'D2.5', section: 'd2_composicion', type: 'single',
    text: '¿Cómo se ha comportado tu peso en los últimos 6 meses?',
    options: [
      { value: 'estable', label: 'Estable' }, { value: 'subi_2_5', label: 'Subí 2-5 kg' },
      { value: 'subi_mas5', label: 'Subí más de 5 kg' }, { value: 'baje_2_5', label: 'Bajé 2-5 kg' },
      { value: 'baje_mas5', label: 'Bajé más de 5 kg' }, { value: 'fluctua', label: 'Fluctúa mucho' },
    ] },

  // ── D3 · Piel/uñas/cabello ──
  { code: 'D3.1', section: 'd3_piel_unas_cabello', type: 'multi', multiHelper: true,
    text: '¿Cómo describirías tu piel?',
    options: [
      { value: 'sana', label: 'Sana' }, { value: 'acne', label: 'Acné' }, { value: 'rosacea', label: 'Rosácea' },
      { value: 'seca', label: 'Seca' }, { value: 'grasa', label: 'Grasa o mixta' }, { value: 'eczema', label: 'Eczema' },
      { value: 'psoriasis', label: 'Psoriasis' }, { value: 'manchas', label: 'Manchas' }, { value: 'envejecimiento', label: 'Envejecimiento acelerado' },
    ] },
  { code: 'D3.2', section: 'd3_piel_unas_cabello', type: 'visual_scale', min: 1, max: 5, scaleLabels: freqScale,
    text: '¿Te salen ronchas, urticaria o "granitos" con frecuencia?' },
  { code: 'D3.3', section: 'd3_piel_unas_cabello', type: 'multi', multiHelper: true,
    text: '¿Cómo están tus uñas?',
    options: [
      { value: 'sanas', label: 'Sanas' }, { value: 'quebradizas', label: 'Se rompen fácil' },
      { value: 'lineas', label: 'Líneas horizontales' }, { value: 'manchas_blancas', label: 'Manchas blancas' },
      { value: 'amarillentas', label: 'Amarillentas' }, { value: 'cuticula_seca', label: 'Cutícula seca' },
    ] },
  { code: 'D3.4', section: 'd3_piel_unas_cabello', type: 'multi', multiHelper: true,
    text: '¿Cómo está tu cabello?',
    options: [
      { value: 'fuerte', label: 'Fuerte y brillante' }, { value: 'caida', label: 'Se cae más de lo normal' },
      { value: 'sin_brillo', label: 'Sin brillo' }, { value: 'textura', label: 'Cambio de textura reciente' },
      { value: 'canas', label: 'Encanece antes de tiempo' }, { value: 'coronilla', label: 'Adelgaza en la coronilla' },
    ] },
  { code: 'D3.5', section: 'd3_piel_unas_cabello', type: 'toggle', options: yn,
    text: '¿Te salen moretones fácilmente (sin recordar el golpe)?' },
  { code: 'D3.6', section: 'd3_piel_unas_cabello', type: 'single',
    text: '¿Cicatrizas rápido o lento?',
    options: [{ value: 'rapido', label: 'Rápido' }, { value: 'normal', label: 'Normal' }, { value: 'lento', label: 'Lento' }, { value: 'muy_lento', label: 'Muy lento' }] },

  // ── D4 · Salud bucal ──
  { code: 'D4.1', section: 'd4_salud_bucal', type: 'single',
    text: '¿Te sangran las encías al cepillarte?',
    options: [
      { value: 'nunca', label: 'Nunca' }, { value: 'a_veces', label: 'A veces' },
      { value: 'casi_siempre', label: 'Casi siempre' }, { value: 'periodontitis', label: 'Sí, y tengo periodontitis diagnosticada' },
    ] },
  { code: 'D4.2', section: 'd4_salud_bucal', type: 'visual_scale', min: 1, max: 5, scaleLabels: freqScale,
    text: '¿Te salen aftas o "fuegos" bucales con frecuencia?' },
  { code: 'D4.3', section: 'd4_salud_bucal', type: 'single',
    text: '¿Cómo es tu aliento matutino?',
    options: [{ value: 'fresco', label: 'Fresco' }, { value: 'normal', label: 'Normal' }, { value: 'mal_pese', label: 'Mal aliento pese a cepillar' }, { value: 'persistente', label: 'Mal aliento persistente' }] },
  { code: 'D4.4', section: 'd4_salud_bucal', type: 'toggle', options: yn,
    text: '¿Tienes empastes metálicos (amalgamas), coronas metal-porcelana o implantes metálicos en la boca?',
    why: 'Las amalgamas pueden contener mercurio. Es un flag para valorar detox, no una alarma.' },
  { code: 'D4.5', section: 'd4_salud_bucal', type: 'single',
    text: '¿Cuándo fue tu última visita al dentista?',
    options: [{ value: 'menos_6', label: 'Hace menos de 6 meses' }, { value: '6_12', label: 'Hace 6-12 meses' }, { value: '1_2', label: 'Hace 1-2 años' }, { value: 'mas_2', label: 'Hace más de 2 años' }] },

  // ── D5 · Consumo ──
  { code: 'D5.1', section: 'd5_consumo', type: 'single',
    text: '¿Cómo describirías tu alimentación de la mayoría de los días?',
    options: [
      { value: 'real_food', label: 'Comida real, cocino casi todo' }, { value: 'mixta', label: 'Mixta, algo procesado' },
      { value: 'procesados', label: 'Procesados frecuentes' }, { value: 'fast_food', label: 'Comida rápida frecuente' },
      { value: 'restaurantes', label: 'Restaurantes frecuente' },
    ] },
  { code: 'D5.2', section: 'd5_consumo', type: 'number', min: 0, max: 8, unit: 'litros', text: '¿Cuánta agua bebes en un día promedio?' },
  { code: 'D5.3', section: 'd5_consumo', type: 'number', min: 0, max: 50, unit: 'bebidas/sem',
    // Edición B: "bebidas alcohólicas" explícito.
    text: '¿Cuántas bebidas alcohólicas tomas por SEMANA en promedio?',
    why: 'Cuenta cervezas, copas de vino o destilados. Sin juicio — el alcohol afecta hígado, sueño y ayuno.',
    deepDive: { when: (a) => typeof a === 'number' && a >= 7, followUps: ['D5.3.a'] } },
  { code: 'D5.3.a', section: 'd5_consumo', type: 'single', isFollowUp: true,
    text: 'Al día siguiente de beber, ¿cómo te sientes?',
    options: [{ value: 'igual', label: 'Igual' }, { value: 'peor', label: 'Peor (cansado, niebla mental)' }, { value: 'considerado_reducir', label: 'He considerado reducir' }] },
  // Edición B: D5.4 SPLIT en tabaco (D5.4) y vapeo (D5.4b).
  { code: 'D5.4', section: 'd5_consumo', type: 'single',
    text: 'Tabaco · ¿fumas cigarros?',
    options: [{ value: 'nunca', label: 'Nunca' }, { value: 'ex', label: 'Ex-fumador' }, { value: 'ocasional', label: 'Ocasional social' }, { value: 'diario', label: 'Diario' }] },
  { code: 'D5.4b', section: 'd5_consumo', type: 'single',
    text: 'Vapeo · ¿usas vaper o cigarro electrónico?',
    why: 'El vapeo es un caso distinto al tabaco: otros compuestos, otro efecto pulmonar.',
    options: [{ value: 'nunca', label: 'Nunca' }, { value: 'ex', label: 'Ex-vapeador' }, { value: 'ocasional', label: 'Ocasional' }, { value: 'diario', label: 'Diario' }] },
  { code: 'D5.5', section: 'd5_consumo', type: 'single',
    text: 'Cafeína · ¿a qué hora tomas tu última dosis del día?',
    options: [{ value: 'manana', label: 'Solo en la mañana' }, { value: 'mediodia', label: 'Hasta el mediodía' }, { value: 'tarde', label: 'Por la tarde (después de las 2pm)' }, { value: 'noche', label: 'Por la noche' }, { value: 'no_tomo', label: 'No tomo cafeína' }] },
  { code: 'D5.6', section: 'd5_consumo', type: 'single', allowPreferNot: true,
    text: '¿Consumes marihuana, CBD u otras sustancias recreativas?',
    why: 'Sin juicio — solo ATP lo sabe. Nos ayuda a entender tu sueño, ansiedad y recuperación.',
    options: [{ value: 'nunca', label: 'Nunca' }, { value: 'ocasional', label: 'Ocasional' }, { value: 'frecuente', label: 'Frecuente' }, { value: 'diario', label: 'Diario' }] },
  { code: 'D5.7', section: 'd5_consumo', type: 'number', min: 1, max: 8, unit: 'comidas',
    text: '¿Cuántas comidas haces al día normalmente?',
    why: 'Con esto estimamos tu ventana de alimentación real.' },

  // ── D6 · Medicamentos ──
  { code: 'D6.1', section: 'd6_medicamentos', type: 'toggle', options: yn,
    text: '¿Tomas algún medicamento recetado actualmente?',
    deepDive: { when: (a) => a === 'si', followUps: ['D6.1.a'] } },
  { code: 'D6.1.a', section: 'd6_medicamentos', type: 'text', isFollowUp: true,
    text: '¿Cuáles? Escribe el nombre, la dosis y hace cuánto lo tomas.',
    placeholder: 'Ej. Metformina 850mg, hace 2 años' },
  { code: 'D6.2', section: 'd6_medicamentos', type: 'multi', multiHelper: true,
    text: '¿Tomas medicamentos de venta libre con regularidad?',
    why: 'IBP = inhibidores de bomba de protones (antiácidos como omeprazol). Su uso crónico afecta la absorción de nutrientes.',
    options: [
      { value: 'ibuprofeno', label: 'Ibuprofeno' }, { value: 'paracetamol', label: 'Paracetamol' },
      { value: 'antihistaminicos', label: 'Antihistamínicos' }, { value: 'ibp', label: 'Antiácidos IBP (omeprazol y similares)' },
      { value: 'laxantes', label: 'Laxantes' }, { value: 'melatonina', label: 'Melatonina de venta libre' },
      { value: 'ninguno', label: 'Ninguno' },
    ] },
  { code: 'D6.3', section: 'd6_medicamentos', type: 'toggle', options: yn,
    text: '¿Has tomado antibióticos por más de 30 días en el último año?',
    why: 'Los antibióticos prolongados alteran tu microbiota; puede necesitar un protocolo restaurativo.' },
  { code: 'D6.4', section: 'd6_medicamentos', type: 'single', femaleOnly: true,
    text: '¿Usas anticonceptivos hormonales?',
    // [PEND-MARIANA #3]: las depleciones B6/folato/zinc/magnesio se mapean en el scoring.
    options: [
      { value: 'no', label: 'No' }, { value: 'pildora', label: 'Píldora' }, { value: 'diu_hormonal', label: 'DIU hormonal' },
      { value: 'implante', label: 'Implante' }, { value: 'inyeccion', label: 'Inyección' }, { value: 'otro', label: 'Otro' },
    ] },

  // ── D7 · Suplementos ──
  { code: 'D7.1', section: 'd7_suplementos', type: 'toggle', options: yn,
    text: '¿Tomas suplementos actualmente?',
    why: 'Los mapeamos para que no dupliques y para ver qué te falta.',
    deepDive: { when: (a) => a === 'si', followUps: ['D7.1.a'] } },
  { code: 'D7.1.a', section: 'd7_suplementos', type: 'text', isFollowUp: true,
    text: '¿Cuáles tomas? Nómbralos con su dosis si la sabes.',
    placeholder: 'Ej. Vitamina D 5000 UI, Magnesio 400mg' },
  { code: 'D7.2', section: 'd7_suplementos', type: 'multi', multiHelper: true,
    text: '¿Alguno de estos suplementos populares tomas o has tomado?',
    options: [
      { value: 'creatina', label: 'Creatina' }, { value: 'ashwagandha', label: 'Ashwagandha' },
      { value: 'nmn_nr', label: 'NMN / NR' }, { value: 'colageno', label: 'Colágeno' },
      { value: 'omega3', label: 'Omega-3' }, { value: 'multi', label: 'Multivitamínico' },
      { value: 'vit_d', label: 'Vitamina D' }, { value: 'magnesio', label: 'Magnesio' },
      { value: 'probioticos', label: 'Probióticos' }, { value: 'ninguno', label: 'Ninguno' },
    ] },

  // ── D8 · Intervenciones ──
  { code: 'D8.1', section: 'd8_intervenciones', type: 'toggle', options: yn,
    text: '¿Usas o has usado péptidos o GLP-1 (semaglutida/Ozempic, tirzepatida, BPC-157, ipamorelina…)?',
    why: 'GLP-1 = medicamentos tipo Ozempic para bajar de peso o glucosa. Afectan tu ayuno, ejercicio y nutrición.',
    // Edición B: deep-dive GLP-1 con motivación/anhedonia.
    deepDive: { when: (a) => a === 'si', followUps: ['D8.1.a', 'D8.1.b'] } },
  { code: 'D8.1.a', section: 'd8_intervenciones', type: 'text', isFollowUp: true,
    text: '¿Cuál usas o usaste, a qué dosis y por cuánto tiempo?', placeholder: 'Ej. Ozempic 0.5mg, 6 meses' },
  { code: 'D8.1.b', section: 'd8_intervenciones', type: 'visual_scale', min: 1, max: 5, isFollowUp: true, scaleLabels: ['aplanada', 'alta'],
    text: '¿Cómo sientes tu motivación general últimamente?',
    why: 'Los GLP-1 pueden aplanar la motivación o el placer (anhedonia). Es una señal clínica que ATP vigila.' },
  { code: 'D8.2', section: 'd8_intervenciones', type: 'toggle', options: yn,
    text: '¿Estás en terapia de reemplazo hormonal? (TRT de testosterona o HRT de hormonas)',
    why: 'TRT = terapia de reemplazo de testosterona. HRT = terapia de reemplazo hormonal (estrógeno/progesterona).' },
  { code: 'D8.3', section: 'd8_intervenciones', type: 'single',
    text: '¿Has hecho tratamientos para bajar de peso?',
    options: [{ value: 'no', label: 'No' }, { value: 'glp1', label: 'Sí, con medicamentos tipo Ozempic' }, { value: 'bariatrica', label: 'Sí, cirugía bariátrica' }, { value: 'otros', label: 'Sí, otros' }],
    deepDive: { when: (a) => a === 'glp1' || a === 'bariatrica', followUps: ['D8.1.b'] } },
  { code: 'D8.4', section: 'd8_intervenciones', type: 'toggle', options: yn,
    text: '¿Tratamientos estéticos invasivos con impacto hormonal o inflamatorio? (fillers extensivos, cirugías estéticas)' },

  // ── D9 · Antecedentes ──
  { code: 'D9.1', section: 'd9_antecedentes', type: 'multi', multiHelper: true,
    text: '¿Cirugías previas?',
    why: 'Algunas cambian el metabolismo (ej. sin vesícula ajustamos cómo comes grasas).',
    options: [
      { value: 'apendice', label: 'Apéndice' }, { value: 'vesicula', label: 'Vesícula' }, { value: 'tiroides', label: 'Tiroides' },
      { value: 'ginecologicas', label: 'Ginecológicas' }, { value: 'bariatrica', label: 'Bariátrica' },
      { value: 'cardiacas', label: 'Cardíacas' }, { value: 'ortopedicas', label: 'Ortopédicas' }, { value: 'ninguna', label: 'Ninguna' },
    ] },
  // C1 · Padecimientos con ESTADO (activo/remisión/resuelto).
  { code: 'D9.2', section: 'd9_antecedentes', type: 'condition_status', pendMariana: true,
    text: '¿Padecimientos crónicos diagnosticados? Marca cada uno con su estado actual.',
    why: 'Historia no es lo mismo que estado actual: una hipertensión o un cáncer en remisión NO deben limitar tu protocolo si ya no están activos.',
    // options = PADECIMIENTOS_PEND_MARIANA (se inyecta en la UI/scoring).
    options: PADECIMIENTOS_PEND_MARIANA },
  { code: 'D9.3', section: 'd9_antecedentes', type: 'multi', multiHelper: true,
    text: '¿Antecedentes familiares directos (padres o hermanos)?',
    options: [
      { value: 'diabetes', label: 'Diabetes' }, { value: 'cardiovascular', label: 'Cardiovascular temprana' },
      { value: 'alzheimer', label: 'Alzheimer o demencia' }, { value: 'cancer', label: 'Cáncer' },
      { value: 'autoinmune', label: 'Autoinmune' }, { value: 'adicciones', label: 'Adicciones' },
      { value: 'longevidad', label: 'Longevidad extrema' }, { value: 'ninguno', label: 'Ninguno' },
    ] },
  // C2 · Estado reproductivo ACTUAL (dispara flags embarazo/lactancia). Temprana.
  { code: 'D9.4b', section: 'd9_antecedentes', type: 'repro_status', femaleOnly: true, allowPreferNot: true,
    text: '¿Cuál es tu situación actual?',
    why: 'Esto define qué intervenciones son seguras HOY. No es tu historia, es tu estado presente.',
    options: [
      { value: 'embarazada', label: 'Embarazada' }, { value: 'lactando', label: 'Lactando' },
      { value: 'buscando', label: 'Buscando embarazo' }, { value: 'ninguna', label: 'Ninguna de estas' },
    ] },
  { code: 'D9.4', section: 'd9_antecedentes', type: 'single', femaleOnly: true,
    text: '¿Has tenido embarazos?',
    options: [{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }],
    deepDive: { when: (a) => a === 'si', followUps: ['D9.4.a'] } },
  { code: 'D9.4.a', section: 'd9_antecedentes', type: 'number', min: 0, max: 15, unit: 'embarazos', isFollowUp: true,
    text: '¿Cuántos embarazos has tenido?' },
  // Edición B: D9.5 de campo libre → chips + otro.
  { code: 'D9.5', section: 'd9_antecedentes', type: 'multi', multiHelper: true,
    text: '¿Traumas físicos importantes en tu historia?',
    why: 'TCE = traumatismo craneoencefálico (golpe fuerte en la cabeza). Pueden dejar inflamación residual.',
    options: [
      { value: 'accidente', label: 'Accidente grave' }, { value: 'tce', label: 'Golpe fuerte en la cabeza (TCE)' },
      { value: 'fractura', label: 'Fractura mayor' }, { value: 'cirugia_trauma', label: 'Cirugía por trauma' },
      { value: 'ninguno', label: 'Ninguno' }, { value: 'otro', label: 'Otro' },
    ] },
  { code: 'D9.6', section: 'd9_antecedentes', type: 'single', allowPreferNot: true, pendMariana: true,
    text: '¿Traumas emocionales activos o no resueltos que estén afectando tu vida hoy?',
    // [PEND-MARIANA #4]: framing sensible final.
    options: [
      { value: 'no', label: 'No' }, { value: 'terapia', label: 'Sí, y estoy en terapia' },
      { value: 'sin_acompanamiento', label: 'Sí, sin acompañamiento' },
    ] },

  // ── D10 · Exposiciones ──
  { code: 'D10.1', section: 'd10_exposiciones', type: 'single',
    text: '¿En qué tipo de ambiente vives principalmente?',
    options: [{ value: 'ciudad_grande', label: 'Ciudad grande' }, { value: 'ciudad_mediana', label: 'Ciudad mediana' }, { value: 'pueblo', label: 'Pueblo' }, { value: 'rural', label: 'Rural' }] },
  { code: 'D10.2', section: 'd10_exposiciones', type: 'toggle', options: yn,
    text: '¿Alguien fuma en tu casa? (humo de segunda mano)' },
  { code: 'D10.3', section: 'd10_exposiciones', type: 'single',
    text: '¿Filtras el agua que bebes o cocinas?',
    options: [
      { value: 'osmosis', label: 'Sí, ósmosis inversa' }, { value: 'carbon', label: 'Filtro de carbón' },
      { value: 'hervida', label: 'Solo hervida' }, { value: 'tap', label: 'Directa de la llave' }, { value: 'botella', label: 'Botella' },
    ] },
  { code: 'D10.4', section: 'd10_exposiciones', type: 'single',
    text: '¿Cuántas horas al día pasas frente a pantallas con luz azul?',
    options: [{ value: '2_4', label: '2-4 horas' }, { value: '4_8', label: '4-8 horas' }, { value: '8_12', label: '8-12 horas' }, { value: 'mas12', label: 'Más de 12 horas' }] },
  { code: 'D10.5', section: 'd10_exposiciones', type: 'single',
    text: '¿Cuántas horas al día pasas al aire libre (sin techo)?',
    options: [{ value: 'menos30', label: 'Menos de 30 min' }, { value: '30_60', label: '30-60 min' }, { value: '1_2', label: '1-2 horas' }, { value: 'mas2', label: 'Más de 2 horas' }] },
  { code: 'D10.6', section: 'd10_exposiciones', type: 'multi', multiHelper: true,
    text: '¿Qué productos aplicas en tu piel o cabello a diario?',
    why: 'Muchos cosméticos convencionales traen disruptores endocrinos (ftalatos, parabenos, aluminio).',
    options: [
      { value: 'maquillaje', label: 'Maquillaje' }, { value: 'cremas', label: 'Cremas hidratantes' },
      { value: 'perfume', label: 'Perfume' }, { value: 'desodorante', label: 'Desodorante convencional' },
      { value: 'champu', label: 'Champús comerciales' }, { value: 'filtro_solar', label: 'Filtro solar diario' },
      { value: 'clean', label: 'Productos "clean" u orgánicos' }, { value: 'casi_nada', label: 'Poco o casi nada' },
    ] },
  { code: 'D10.7', section: 'd10_exposiciones', type: 'multi', multiHelper: true,
    text: '¿En qué cocinas mayormente?',
    why: 'PFAS = compuestos del antiadherente (teflón). Junto al aluminio, son exposiciones a vigilar.',
    options: [
      { value: 'hierro', label: 'Sartén de hierro' }, { value: 'acero', label: 'Acero inoxidable' },
      { value: 'ceramica', label: 'Cerámica' }, { value: 'teflon', label: 'Antiadherente (teflón)' },
      { value: 'aluminio', label: 'Aluminio' }, { value: 'vidrio', label: 'Vidrio' },
    ] },

  // ── D11 · Contexto de vida ──
  { code: 'D11.1', section: 'd11_contexto_vida', type: 'visual_scale', min: 1, max: 10, scaleLabels: ['relajado', 'al límite'],
    text: '¿Cómo describirías tu nivel de estrés general del último mes?' },
  { code: 'D11.2', section: 'd11_contexto_vida', type: 'toggle', options: yn,
    text: '¿Trabajas en turnos rotativos o nocturnos?' },
  { code: 'D11.3', section: 'd11_contexto_vida', type: 'number', min: 0, max: 100, unit: 'horas/sem',
    text: '¿Cuántas horas trabajas típicamente por semana?' },
  { code: 'D11.4', section: 'd11_contexto_vida', type: 'visual_scale', min: 1, max: 5, scaleLabels: ['conflictivas', 'nutritivas'],
    text: '¿Cómo describirías tus relaciones cercanas (pareja, familia, amigos)?',
    why: 'La calidad de tus vínculos es uno de los predictores más fuertes de longevidad (Blue Zones).' },
  { code: 'D11.5', section: 'd11_contexto_vida', type: 'single',
    text: '¿Viajas con jetlag (más de 3 husos horarios) con frecuencia?',
    options: [{ value: 'nunca', label: 'Nunca' }, { value: 'mensual', label: 'Mensual' }, { value: 'trimestral', label: 'Trimestral' }, { value: 'anual', label: 'Anual' }] },
  { code: 'D11.6', section: 'd11_contexto_vida', type: 'visual_scale', min: 1, max: 5, allowPreferNot: true, scaleLabels: ['difícil', 'nutritivo'],
    text: '¿Cómo describirías tu ambiente familiar de infancia? (opcional)',
    why: 'Las experiencias adversas en la infancia (ACE) predicen inflamación en la adultez. Puedes saltarla.' },

  // ── D12 · Sexualidad ──
  { code: 'D12.1', section: 'd12_sexualidad', type: 'visual_scale', min: 1, max: 5, allowPreferNot: true, scaleLabels: ['ausente', 'alto'],
    text: '¿Cómo describirías tu libido o deseo sexual actualmente?' },
  { code: 'D12.2', section: 'd12_sexualidad', type: 'single', allowPreferNot: true,
    text: '¿Notas cambios en tu libido en los últimos 6 meses?',
    options: [{ value: 'subio', label: 'Subió' }, { value: 'bajo', label: 'Bajó' }, { value: 'estable', label: 'Estable' }, { value: 'fluctua', label: 'Fluctúa mucho' }],
    deepDive: { when: (a) => a === 'bajo', followUps: ['D12.2.a'] } },
  { code: 'D12.2.a', section: 'd12_sexualidad', type: 'single', isFollowUp: true, allowPreferNot: true,
    text: '¿La baja coincidió con algún evento?',
    options: [{ value: 'medicamento', label: 'Un medicamento nuevo' }, { value: 'estres', label: 'Más estrés' }, { value: 'no_se', label: 'No lo sé' }] },
  { code: 'D12.3', section: 'd12_sexualidad', type: 'visual_scale', min: 1, max: 5, maleOnly: true, allowPreferNot: true, scaleLabels: ['sin problemas', 'dificultad frecuente'],
    text: '¿Cómo está tu función eréctil?' },
  { code: 'D12.4', section: 'd12_sexualidad', type: 'visual_scale', min: 1, max: 5, femaleOnly: true, allowPreferNot: true, scaleLabels: ['sin problemas', 'dificultades'],
    text: '¿Cómo está tu función sexual y placer (lubricación, dolor)?' },

  // ── D13 · Propósito ──
  { code: 'D13.1', section: 'd13_proposito', type: 'visual_scale', min: 1, max: 5, scaleLabels: ['perdido', 'con propósito claro'],
    text: '¿Sientes que tu vida tiene un propósito o significado claro?' },
  { code: 'D13.2', section: 'd13_proposito', type: 'multi', multiHelper: true,
    text: '¿Practicas algo espiritual o contemplativo con regularidad?',
    options: [
      { value: 'meditacion', label: 'Meditación' }, { value: 'oracion', label: 'Oración' }, { value: 'yoga', label: 'Yoga' },
      { value: 'naturaleza', label: 'Contemplación en la naturaleza' }, { value: 'ritual', label: 'Ritual en grupo' }, { value: 'nada', label: 'Nada regular' },
    ] },
  { code: 'D13.3', section: 'd13_proposito', type: 'number', min: 0, max: 40, unit: 'horas/sem',
    text: '¿Cuánto tiempo pasas en la naturaleza a la semana?' },
  { code: 'D13.4', section: 'd13_proposito', type: 'visual_scale', min: 1, max: 5, scaleLabels: ['aislado', 'tribu fuerte'],
    text: '¿Cuentas con una red comunitaria significativa (amigos cercanos, grupo, tribu)?' },

  // ── BONUS · Objetivos ──
  { code: 'B.1', section: 'bonus_objetivos', type: 'multi', multiHelper: true,
    text: 'Elige hasta 3 objetivos principales',
    options: [
      { value: 'mas_energia', label: 'Más energía' }, { value: 'dormir_mejor', label: 'Dormir mejor' },
      { value: 'bajar_grasa', label: 'Bajar de grasa' }, { value: 'ganar_musculo', label: 'Ganar músculo' },
      { value: 'foco_concentracion', label: 'Mejor concentración y foco' }, { value: 'salud_mental', label: 'Mejor salud mental' },
      { value: 'longevidad', label: 'Longevidad' }, { value: 'mejor_libido', label: 'Mejor libido' },
      { value: 'reducir_dolor', label: 'Reducir dolor' }, { value: 'vitalidad_general', label: 'Vitalidad general' },
    ] },
  { code: 'B.2', section: 'bonus_objetivos', type: 'text',
    text: '¿Cuál es TU dolor mayor hoy? Lo que más te frustra de tu salud.',
    placeholder: 'Escríbelo con tus palabras' },
  { code: 'B.3', section: 'bonus_objetivos', type: 'multi', multiHelper: true,
    text: '¿Qué estás dispuesto a cambiar por lograr tus objetivos?',
    why: 'ATP no te recomendará cosas que no estás dispuesto a hacer.',
    options: [
      { value: 'alimentacion', label: 'Cambiar mi alimentación' }, { value: 'alcohol', label: 'Reducir alcohol' },
      { value: 'tabaco', label: 'Dejar el tabaco' }, { value: 'ejercicio', label: 'Ejercitarme consistente' },
      { value: 'dormir_temprano', label: 'Dormir más temprano' }, { value: 'sol', label: 'Salir al sol' },
      { value: 'meditar', label: 'Meditar' }, { value: 'suplementar', label: 'Suplementar disciplinado' },
      { value: 'todo', label: 'Todo lo que sea necesario' },
    ] },
  { code: 'B.4', section: 'bonus_objetivos', type: 'single',
    text: '¿En qué plazo esperas ver cambios?',
    why: 'Los cambios reales toman mínimo 90 días. Calibramos expectativas contigo.',
    options: [{ value: '2sem', label: 'En 2 semanas' }, { value: '1mes', label: 'En 1 mes' }, { value: '3meses', label: 'En 3 meses' }, { value: '6meses', label: 'En 6 meses' }, { value: 'sin_prisa', label: 'Es un viaje largo, sin prisa' }] },
  // Edición B: B.5 expandida a marketing/adquisición + churn.
  { code: 'B.5', section: 'bonus_objetivos', type: 'single',
    text: '¿Cómo llegaste a ATP?',
    options: [{ value: 'recomendacion', label: 'Me la recomendaron' }, { value: 'redes', label: 'Redes sociales' }, { value: 'busqueda', label: 'Buscando en internet' }, { value: 'enrique', label: 'Por Enrique / la marca' }, { value: 'otro', label: 'Otro' }] },
  { code: 'B.6', section: 'bonus_objetivos', type: 'single',
    text: '¿Qué casi te frena de empezar?',
    options: [{ value: 'precio', label: 'El precio' }, { value: 'tiempo', label: 'La falta de tiempo' }, { value: 'dudas', label: 'Dudas de si funciona' }, { value: 'intentos', label: 'Ya intenté otras cosas' }, { value: 'nada', label: 'Nada, entré directo' }] },
  { code: 'B.7', section: 'bonus_objetivos', type: 'text',
    text: '¿Qué esperas que ATP haga por ti? (opcional)',
    placeholder: 'Tu expectativa en una frase' },
];

/** Lookup rápido por código. */
export const MASTER_QUIZ_BY_CODE: Record<string, MasterQuizQuestion> =
  Object.fromEntries(MASTER_QUIZ_QUESTIONS.map((q) => [q.code, q]));

/** Objetivos (B.1) → categorías del motor (mismo mapa que USER_GOAL_TO_CATEGORIES). */
export const BONUS_GOAL_VALUES = [
  'mas_energia', 'dormir_mejor', 'bajar_grasa', 'ganar_musculo', 'foco_concentracion',
  'salud_mental', 'longevidad', 'mejor_libido', 'reducir_dolor', 'vitalidad_general',
] as const;
