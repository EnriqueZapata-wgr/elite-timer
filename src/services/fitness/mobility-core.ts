/**
 * Mobility core (MB-3.6 Bloque 2) — núcleo PURO de la evaluación de movilidad.
 *
 * Los 7 tests que persiste `mobility_assessments` (migración 036: 4 bilaterales
 * → 11 columnas + overall). Aquí viven las definiciones guiadas (qué es, cómo
 * se hace, anclas de puntuación — doctrina: guiar con ejemplos, explicar
 * siglas), la normalización a 0-10 y la comparación contra la evaluación
 * anterior. Cero RN/Supabase — testeable en Vitest node-only.
 *
 * Honestidad del score: los tests 0-10 son AUTO-puntuados con anclas (no hay
 * medición instrumental); los de cm (toe touch, knee-to-wall) sí son medida
 * física real. La lectura lo refleja: "tu auto-evaluación", no "tu medición".
 */

export type MobilityTestKey =
  | 'deep_squat' | 'overhead_squat' | 'toe_touch' | 'shoulder_rotation'
  | 'hip_flexion' | 'ankle_dorsiflexion' | 'thoracic_rotation';

export interface MobilityAnchor {
  /** Valor 0-10 representativo del ancla (el usuario elige el más cercano). */
  valor: number;
  texto: string;
}

export interface MobilityTestSpec {
  key: MobilityTestKey;
  nombre: string;
  /** Qué mide y por qué importa (1-2 frases, sin siglas sin explicar). */
  porQue: string;
  /** Pasos concretos para hacer el test en casa. */
  comoSeHace: string[];
  medida: 'escala' | 'cm';
  bilateral: boolean;
  /** Solo para medida 'escala': anclas que guían la auto-puntuación. */
  anclas?: MobilityAnchor[];
  /** Solo para medida 'cm': etiqueta de la unidad y hint del signo. */
  unidadHint?: string;
  icono: string;
}

export const MOBILITY_TESTS: MobilityTestSpec[] = [
  {
    key: 'deep_squat',
    nombre: 'Sentadilla profunda',
    porQue: 'Mide la movilidad global de tobillos, rodillas y caderas trabajando juntas. Es la base de casi todo el tren inferior.',
    comoSeHace: [
      'Descalzo, pies al ancho de hombros.',
      'Baja lo más profundo que puedas SIN despegar los talones.',
      'Mantén el pecho erguido y los brazos al frente.',
      'Quédate abajo 3 segundos y evalúa cómo se sintió.',
    ],
    medida: 'escala',
    bilateral: false,
    anclas: [
      { valor: 2, texto: 'No bajo de 90° o me caigo hacia atrás' },
      { valor: 5, texto: 'Bajo profundo pero talones se despegan o me redondeo' },
      { valor: 8, texto: 'Profunda y estable, con esfuerzo' },
      { valor: 10, texto: 'Profunda, talones al piso, espalda recta, sin esfuerzo' },
    ],
    icono: 'body-outline',
  },
  {
    key: 'overhead_squat',
    nombre: 'Sentadilla con brazos arriba',
    porQue: 'La misma sentadilla con los brazos extendidos sobre la cabeza — expone limitaciones de hombros y espalda alta que la sentadilla normal esconde.',
    comoSeHace: [
      'Brazos estirados sobre la cabeza, como sosteniendo un palo.',
      'Baja a la sentadilla manteniendo los brazos ALINEADOS con las orejas.',
      'Si los brazos se van al frente o la espalda se arquea, ahí está tu límite.',
    ],
    medida: 'escala',
    bilateral: false,
    anclas: [
      { valor: 2, texto: 'Los brazos se caen al frente apenas empiezo a bajar' },
      { valor: 5, texto: 'Bajo a medias antes de perder los brazos arriba' },
      { valor: 8, texto: 'Sentadilla profunda con brazos arriba, con esfuerzo' },
      { valor: 10, texto: 'Profunda, brazos junto a las orejas, sin compensar' },
    ],
    icono: 'accessibility-outline',
  },
  {
    key: 'toe_touch',
    nombre: 'Tocar los pies',
    porQue: 'Mide la cadena posterior completa: isquiotibiales, glúteos y espalda baja. Medida física real en centímetros.',
    comoSeHace: [
      'De pie, piernas estiradas (rodillas sin doblar).',
      'Flexiona el tronco hacia el frente, brazos colgando.',
      'Mide: si PASAS de tus pies, cuenta los cm que pasas (positivo). Si NO llegas, los cm que te faltan (negativo). Llegar justo = 0.',
    ],
    medida: 'cm',
    bilateral: false,
    unidadHint: 'cm — positivo si pasas de tus pies, negativo si te faltan',
    icono: 'arrow-down-outline',
  },
  {
    key: 'shoulder_rotation',
    nombre: 'Rotación de hombro',
    porQue: 'Mide la rotación interna y externa del hombro — clave para empujar y jalar sin pellizcos. Se evalúa cada lado por separado.',
    comoSeHace: [
      'Lleva una mano por ENCIMA del hombro hacia la espalda (como rascarte la espalda alta).',
      'Lleva la otra por DEBAJO hacia arriba (como subir un cierre).',
      'Intenta que los dedos se toquen detrás de la espalda.',
      'Evalúa cada lado (cambia qué brazo va arriba).',
    ],
    medida: 'escala',
    bilateral: true,
    anclas: [
      { valor: 2, texto: 'Mis manos quedan a más de 20 cm una de otra' },
      { valor: 5, texto: 'Quedan a unos 5-15 cm' },
      { valor: 8, texto: 'Las puntas de los dedos se rozan' },
      { valor: 10, texto: 'Los dedos se enganchan sin esfuerzo' },
    ],
    icono: 'sync-outline',
  },
  {
    key: 'hip_flexion',
    nombre: 'Flexión de cadera',
    porQue: 'Mide cuánto sube tu pierna con la rodilla estirada — isquiotibiales y control de cadera, cada lado por separado.',
    comoSeHace: [
      'Acostado boca arriba, piernas estiradas.',
      'Sube una pierna RECTA lo más alto que puedas (la otra queda pegada al piso).',
      'Observa el ángulo que alcanza sin doblar la rodilla ni despegar la otra pierna.',
      'Repite con la otra pierna.',
    ],
    medida: 'escala',
    bilateral: true,
    anclas: [
      { valor: 2, texto: 'Menos de 45° (apenas despega)' },
      { valor: 5, texto: 'Cerca de 60-70°' },
      { valor: 8, texto: 'Cerca de 90° (vertical)' },
      { valor: 10, texto: 'Más de 90° sin compensar' },
    ],
    icono: 'trending-up-outline',
  },
  {
    key: 'ankle_dorsiflexion',
    nombre: 'Tobillo contra pared (knee-to-wall)',
    porQue: 'Mide la dorsiflexión del tobillo (cuánto avanza la rodilla sobre el pie) — el limitante escondido de tu sentadilla. Medida física real, cada lado.',
    comoSeHace: [
      'Descalzo, frente a una pared. Punta del pie a unos 10 cm de la pared.',
      'Sin despegar el TALÓN, lleva la rodilla a tocar la pared.',
      'Aleja el pie hasta encontrar la distancia MÁXIMA a la que la rodilla aún toca.',
      'Mide esa distancia punta-a-pared en cm. Repite con el otro pie.',
    ],
    medida: 'cm',
    bilateral: true,
    unidadHint: 'cm de la punta del pie a la pared (10+ cm es buena señal)',
    icono: 'resize-outline',
  },
  {
    key: 'thoracic_rotation',
    nombre: 'Rotación torácica',
    porQue: 'Mide el giro de la espalda alta — sin él, la rotación la roban la lumbar y los hombros. Cada lado por separado.',
    comoSeHace: [
      'Siéntate en una silla, pies plantados, un palo o toalla cruzada sobre el pecho abrazada.',
      'Gira el tronco a un lado SIN mover la cadera.',
      'Observa cuánto giras (90° = el palo apunta perpendicular al frente).',
      'Repite al otro lado.',
    ],
    medida: 'escala',
    bilateral: true,
    anclas: [
      { valor: 2, texto: 'Giro menos de 30°' },
      { valor: 5, texto: 'Cerca de 45°' },
      { valor: 8, texto: 'Cerca de 60°' },
      { valor: 10, texto: 'Cerca de 80-90° sin mover cadera' },
    ],
    icono: 'repeat-outline',
  },
];

/** Shape de captura (espejo de las 11 columnas de mobility_assessments). */
export interface MobilityInput {
  deep_squat: number | null;
  overhead_squat: number | null;
  toe_touch_cm: number | null;
  shoulder_rotation_l: number | null;
  shoulder_rotation_r: number | null;
  hip_flexion_l: number | null;
  hip_flexion_r: number | null;
  ankle_dorsiflexion_l_cm: number | null;
  ankle_dorsiflexion_r_cm: number | null;
  thoracic_rotation_l: number | null;
  thoracic_rotation_r: number | null;
}

export const EMPTY_MOBILITY_INPUT: MobilityInput = {
  deep_squat: null, overhead_squat: null, toe_touch_cm: null,
  shoulder_rotation_l: null, shoulder_rotation_r: null,
  hip_flexion_l: null, hip_flexion_r: null,
  ankle_dorsiflexion_l_cm: null, ankle_dorsiflexion_r_cm: null,
  thoracic_rotation_l: null, thoracic_rotation_r: null,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Toe touch cm → 0-10. Transparente y lineal: 0 cm (llegar justo) = 8;
 * +5 cm (palmas más allá) = 10; −10 cm = 4; −20 cm o peor = 0.
 */
export function scoreToeTouch(cm: number): number {
  return Math.round(clamp(8 + cm * 0.4, 0, 10) * 10) / 10;
}

/**
 * Knee-to-wall cm → 0-10. Estándar práctico: ~12 cm = rango completo (10);
 * escala lineal hacia 0.
 */
export function scoreAnkle(cm: number): number {
  return Math.round(clamp((cm * 10) / 12, 0, 10) * 10) / 10;
}

export interface TestScore {
  key: MobilityTestKey;
  /** 0-10 (promedio de lados si es bilateral); null si no se capturó. */
  score: number | null;
  /** Diferencia |izq−der| relevante (≥2 pts o ≥2 cm) — señal de asimetría. */
  asimetria: boolean;
}

function media(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.round(((a + b) / 2) * 10) / 10;
}

function asimetriaRelevante(a: number | null, b: number | null, umbral: number): boolean {
  return a != null && b != null && Math.abs(a - b) >= umbral;
}

/** Normaliza la captura a un score 0-10 por test (+ flag de asimetría). */
export function scoresPorTest(input: MobilityInput): TestScore[] {
  const ankleL = input.ankle_dorsiflexion_l_cm != null ? scoreAnkle(input.ankle_dorsiflexion_l_cm) : null;
  const ankleR = input.ankle_dorsiflexion_r_cm != null ? scoreAnkle(input.ankle_dorsiflexion_r_cm) : null;
  return [
    { key: 'deep_squat', score: input.deep_squat, asimetria: false },
    { key: 'overhead_squat', score: input.overhead_squat, asimetria: false },
    {
      key: 'toe_touch',
      score: input.toe_touch_cm != null ? scoreToeTouch(input.toe_touch_cm) : null,
      asimetria: false,
    },
    {
      key: 'shoulder_rotation',
      score: media(input.shoulder_rotation_l, input.shoulder_rotation_r),
      asimetria: asimetriaRelevante(input.shoulder_rotation_l, input.shoulder_rotation_r, 2),
    },
    {
      key: 'hip_flexion',
      score: media(input.hip_flexion_l, input.hip_flexion_r),
      asimetria: asimetriaRelevante(input.hip_flexion_l, input.hip_flexion_r, 2),
    },
    {
      key: 'ankle_dorsiflexion',
      score: media(ankleL, ankleR),
      asimetria: asimetriaRelevante(input.ankle_dorsiflexion_l_cm, input.ankle_dorsiflexion_r_cm, 2),
    },
    {
      key: 'thoracic_rotation',
      score: media(input.thoracic_rotation_l, input.thoracic_rotation_r),
      asimetria: asimetriaRelevante(input.thoracic_rotation_l, input.thoracic_rotation_r, 2),
    },
  ];
}

/** Promedio (1 decimal) de los tests capturados; null si no hay ninguno. */
export function overallMobilityScore(input: MobilityInput): number | null {
  const scores = scoresPorTest(input).map((t) => t.score).filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export type MobilityReading = 'excelente' | 'buena' | 'funcional' | 'limitada';

/** Lectura honesta por bandas (0-10). */
export function lecturaDe(score: number): MobilityReading {
  if (score >= 8.5) return 'excelente';
  if (score >= 7) return 'buena';
  if (score >= 5) return 'funcional';
  return 'limitada';
}

export interface MobilityComparison {
  deltaOverall: number | null;
  porTest: { key: MobilityTestKey; delta: number | null }[];
}

/** Delta actual − anterior por test y overall (null donde falte alguno). */
export function compararEvaluaciones(actual: MobilityInput, anterior: MobilityInput): MobilityComparison {
  const a = scoresPorTest(actual);
  const b = new Map(scoresPorTest(anterior).map((t) => [t.key, t.score]));
  const oA = overallMobilityScore(actual);
  const oB = overallMobilityScore(anterior);
  return {
    deltaOverall: oA != null && oB != null ? Math.round((oA - oB) * 10) / 10 : null,
    porTest: a.map((t) => {
      const prev = b.get(t.key) ?? null;
      return {
        key: t.key,
        delta: t.score != null && prev != null ? Math.round((t.score - prev) * 10) / 10 : null,
      };
    }),
  };
}
