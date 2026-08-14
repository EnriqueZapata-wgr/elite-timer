/**
 * OLA 4 · Registry de evaluaciones (Anexo C, pieza 1).
 *
 * REGLA DE ORO: el catálogo no se toca. Este archivo NO copia preguntas:
 * las deriva de los bancos que ya existen (functional-quizzes,
 * historia-clinica-questionnaires) o las referencia por descriptor. Si alguien
 * agrega un quiz funcional o una categoría de historia clínica, aparece solo
 * en el hub. Cero preguntas perdidas, cero listas paralelas que se despeguen.
 *
 * Módulo PURO: sin supabase, sin react-native, sin expo-router.
 */
import { ALL_FUNCTIONAL_QUIZZES } from '@/src/constants/functional-quizzes';
import { HC_QUESTIONNAIRES } from '@/src/constants/historia-clinica-questionnaires';
import type { Assessment } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Sección FUNCIONAL · los 5 cuestionarios de medicina funcional (banco const)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derivados de ALL_FUNCTIONAL_QUIZZES para que el registry nunca se despegue
 * del catálogo. Persisten en functional_quiz_results y otorgan electrón.
 */
const FUNCIONALES: Assessment[] = ALL_FUNCTIONAL_QUIZZES.map((q) => ({
  id: q.id,
  kind: 'quiz',
  title: q.name,
  subtitle: q.subtitle,
  section: 'funcional',
  icon: 'clipboard-outline',
  color: q.color,
  estimatedMinutes: q.estimatedMinutes,
  bank: { kind: 'const', module: 'functional-quizzes', key: q.id },
  branching: { kind: 'linear' },
  score: { kind: 'weights' },
  persist: {
    table: 'functional_quiz_results',
    matchColumn: 'quiz_id',
    matchValue: q.id,
    dateColumn: 'completed_at',
    completion: { rule: 'flag', column: 'is_complete' },
    resumable: true,
  },
  result: { kind: 'inline' },
  onComplete: [
    { effect: 'electron', source: 'functional_quiz' },
    { effect: 'emit', event: 'electrons_changed' },
  ],
  route: `/tests/q/${q.id}`,
  legacyRoutes: [`/functional-quiz?quiz_id=${q.id}`],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Sección FUNCIONAL · Braverman (pantalla propia) y cronotipo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Braverman se queda con pantalla propia y se justifica: 313 preguntas en dos
 * partes, retroceso cruzado, intro cinemático y cross fade anti parpadeo.
 * Parametrizarlo costaría más que mantenerlo. Está en el registry para que el
 * hub lo pinte como hero y lea su completado igual que todo lo demás.
 */
const BRAVERMAN: Assessment = {
  id: 'braverman',
  kind: 'special',
  title: 'Test de Braverman',
  subtitle: 'Perfil de neurotransmisores: dopamina, acetilcolina, GABA y serotonina',
  section: 'funcional',
  highlight: 'hero',
  icon: 'flash-outline',
  color: '#c084fc',
  estimatedMinutes: 25,
  bank: { kind: 'const', module: 'braverman-questions' },
  branching: { kind: 'linear' },
  score: { kind: 'weights' },
  persist: {
    table: 'braverman_results',
    dateColumn: 'completed_at',
    completion: { rule: 'flag', column: 'is_complete' },
    resumable: true,
  },
  result: { kind: 'inline' },
  // Braverman ya está en su destino final: no se mueve.
  live: true,
  route: '/braverman',
};

/**
 * Cronotipo: banco en quiz_templates, resultado con vida propia porque la
 * persona lo consulta después (horarios pico, ventana de sueño).
 * Conserva el contenido completo de CHRONO_INFO: es contenido, no código.
 */
const CRONOTIPO: Assessment = {
  id: 'cronotipo',
  kind: 'quiz',
  title: 'Cronotipo',
  subtitle: 'León, oso, lobo o delfín: tu ritmo circadiano y tus horarios óptimos',
  section: 'funcional',
  icon: 'sunny-outline',
  color: '#fbbf24',
  estimatedMinutes: 5,
  bank: { kind: 'db', table: 'quiz_templates', column: 'slug', value: 'chronotype' },
  branching: { kind: 'linear' },
  score: { kind: 'sum-max', tieBreak: ['bear', 'lion', 'wolf', 'dolphin'] },
  persist: {
    table: 'user_chronotype',
    mirrors: [{ table: 'quiz_results', matchColumn: 'quiz_id', matchValue: 'chronotype' }],
    dateColumn: 'updated_at',
    completion: { rule: 'row-exists' },
    resumable: false,
  },
  result: { kind: 'route', route: '/tests/resultado/cronotipo' },
  onComplete: [{ effect: 'emit', event: 'chronotype_changed' }],
  route: '/tests/q/cronotipo',
  legacyRoutes: ['/quiz/chronotype', '/edad-atp/tests/chronotype', '/my-chronotype'],
};

/**
 * Quiz de estilo de vida: banco en la tabla `quizzes`, puntúa por promedio
 * acotado y su efecto es asignar protocolos. Gana resume gratis al entrar al
 * motor, que hoy no tiene.
 */
const LIFESTYLE: Assessment = {
  id: 'db-lifestyle_assessment',
  kind: 'quiz',
  title: 'Evaluación de estilo de vida',
  subtitle: 'Levanta tus dominios y te sugiere protocolos',
  section: 'funcional',
  icon: 'list-outline',
  color: '#5B9BD5',
  estimatedMinutes: 8,
  bank: { kind: 'db', table: 'quizzes', column: 'quiz_id', value: 'lifestyle_assessment' },
  branching: { kind: 'linear' },
  score: { kind: 'avg-clamp', min: 0, max: 100 },
  persist: {
    table: 'quiz_responses',
    matchColumn: 'quiz_id',
    matchValue: 'lifestyle_assessment',
    dateColumn: 'completed_at',
    completion: { rule: 'not-null', column: 'completed_at' },
    resumable: true,
  },
  result: { kind: 'inline' },
  onComplete: [{ effect: 'protocols' }],
  route: '/tests/q/db-lifestyle_assessment',
  legacyRoutes: ['/quiz-take?quiz_id=lifestyle_assessment'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sección CLÍNICO · Cuestionario Maestro + historia clínica
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El Cuestionario Maestro ya corre sobre master-quiz-core, que es puro: su
 * core ES el motor. Ramifica por género, deep dives y skipWhen, y su
 * completado se calcula en memoria, no con una bandera en la tabla.
 */
const MAESTRO: Assessment = {
  id: 'maestro',
  kind: 'quiz',
  title: 'Cuestionario Maestro ATP',
  subtitle: 'Tu mapa y tu brújula: levanta tu fenotipo completo y sugiere tus 5 intervenciones',
  section: 'clinico',
  highlight: 'master',
  icon: 'sparkles',
  color: '#A8E02A',
  estimatedMinutes: 20,
  bank: { kind: 'const', module: 'master-quiz-bank' },
  branching: { kind: 'visibility', core: 'master-quiz-core' },
  score: { kind: 'phenotype' },
  persist: {
    table: 'user_master_quiz',
    completion: { rule: 'pure' },
    resumable: true,
  },
  result: { kind: 'inline' },
  onComplete: [{ effect: 'emit', event: 'master_quiz_changed' }],
  route: '/tests/q/maestro',
  legacyRoutes: ['/salud/cuestionario-maestro'],
};

/**
 * Historia clínica: cada categoría del catálogo es una entrada. Se derivan de
 * HC_QUESTIONNAIRES (incluye Fitzpatrick, que se anexa al final del catálogo).
 * Guardan en historia_clinica.data[categoria] como JSONB.
 */
const CLINICOS: Assessment[] = HC_QUESTIONNAIRES.map((q) => ({
  id: `hc-${q.id}`,
  kind: 'quiz',
  title: q.title,
  subtitle: q.blurb,
  section: 'clinico',
  icon: q.icon,
  color: q.color,
  bank: { kind: 'const', module: 'historia-clinica', key: q.id },
  branching: { kind: 'linear' },
  score: { kind: 'none' },
  persist: {
    table: 'historia_clinica',
    dateColumn: 'updated_at',
    completion: { rule: 'json-key', column: 'data', key: q.id },
    resumable: true,
  },
  result: { kind: 'inline' },
  route: `/tests/q/hc-${q.id}`,
  legacyRoutes: [`/historia-clinica/${q.id}`],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Sección EDAD ATP · los 9 cuestionarios por dominio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hoy son 9 wrappers de 24 líneas en app/edad-atp/questionnaires/*, cada uno
 * con su arreglo de preguntas inline. El banco se mueve a constants en la
 * pieza del runner; aquí ya quedan registrados con su dominio y su tabla.
 */
const EDAD_DOMAINS: { domain: string; title: string; icon: string; color: string }[] = [
  { domain: 'sueno', title: 'Sueño', icon: 'moon-outline', color: '#818cf8' },
  { domain: 'metabolismo', title: 'Metabolismo', icon: 'flame-outline', color: '#f59e0b' },
  { domain: 'habitos', title: 'Hábitos', icon: 'repeat-outline', color: '#22c55e' },
  { domain: 'cardiovascular', title: 'Cardiovascular', icon: 'heart-outline', color: '#ef4444' },
  { domain: 'inflamacion', title: 'Inflamación', icon: 'thermometer-outline', color: '#f97316' },
  { domain: 'inmunidad', title: 'Inmunidad', icon: 'shield-outline', color: '#06b6d4' },
  { domain: 'renal_micronutrientes', title: 'Renal y micronutrientes', icon: 'water-outline', color: '#3b82f6' },
  { domain: 'vitalidad', title: 'Vitalidad', icon: 'pulse-outline', color: '#a855f7' },
  { domain: 'sistema_hormonal', title: 'Sistema hormonal', icon: 'sync-outline', color: '#ec4899' },
];

/** Ruta vieja del wrapper: el dominio usa guion bajo, la carpeta usaba guion. */
const legacyQuestionnairePath = (domain: string) => `/edad-atp/questionnaires/${domain.replace(/_/g, '-')}`;

const EDAD: Assessment[] = EDAD_DOMAINS.map((d) => ({
  id: `edad-${d.domain}`,
  kind: 'quiz',
  title: d.title,
  section: 'edad',
  icon: d.icon,
  color: d.color,
  estimatedMinutes: 3,
  bank: { kind: 'const', module: 'edad-questionnaires', key: d.domain },
  branching: { kind: 'linear' },
  score: { kind: 'domain-parameters', domain: d.domain },
  persist: {
    table: 'edad_atp_questionnaire_responses',
    matchColumn: 'domain',
    matchValue: d.domain,
    dateColumn: 'measured_at',
    completion: { rule: 'match-exists' },
    resumable: true,
  },
  result: { kind: 'inline' },
  route: `/tests/q/edad-${d.domain}`,
  legacyRoutes: [legacyQuestionnairePath(d.domain)],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Sección FÍSICO · los 9 tests que hoy son 11 wrappers y 3 hubs
// ─────────────────────────────────────────────────────────────────────────────

/** Atajo: los físicos comparten casi toda la forma. */
function physical(a: {
  id: string;
  title: string;
  subtitle: string;
  mode: 'stopwatch' | 'capture' | 'reactive';
  icon: string;
  color: string;
  unit: string;
  table: string;
  testKey: string;
  mirrors?: { table: string; matchColumn?: string; matchValue?: string }[];
  legacyRoutes: string[];
}): Assessment {
  return {
    id: a.id,
    kind: 'physical',
    title: a.title,
    subtitle: a.subtitle,
    section: 'fisico',
    mode: a.mode,
    icon: a.icon,
    color: a.color,
    bank: { kind: 'none' },
    score: { kind: 'measure', unit: a.unit },
    persist: {
      table: a.table,
      matchColumn: 'test_key',
      matchValue: a.testKey,
      mirrors: a.mirrors,
      dateColumn: 'measured_at',
      completion: { rule: 'match-exists' },
      resumable: false,
    },
    result: { kind: 'inline' },
    route: `/tests/run/${a.id}`,
    legacyRoutes: a.legacyRoutes,
  };
}

/** Espejo que ya hace saveKinematicTest: escribe en las dos tablas. */
const KINEMATIC_MIRROR = (testKey: string) => [
  { table: 'fitness_kinematic_tests', matchColumn: 'test_key', matchValue: testKey },
];

const FISICOS: Assessment[] = [
  physical({
    id: 'plank', title: 'Plank', subtitle: 'Plancha isométrica: aguanta con forma estricta',
    mode: 'stopwatch', icon: 'body-outline', color: '#22D3EE', unit: 's',
    table: 'edad_atp_functional_tests', testKey: 'plank', mirrors: KINEMATIC_MIRROR('plank'),
    legacyRoutes: ['/edad-atp/test-plank'],
  }),
  physical({
    id: 'bolt', title: 'BOLT', subtitle: 'Tolerancia al CO2: cuánto aguantas sin aire tras exhalar',
    mode: 'stopwatch', icon: 'cloud-outline', color: '#38bdf8', unit: 's',
    table: 'edad_atp_functional_tests', testKey: 'bolt', mirrors: KINEMATIC_MIRROR('bolt'),
    legacyRoutes: ['/edad-atp/test-bolt'],
  }),
  physical({
    id: 'cooper', title: 'Cooper 12 minutos', subtitle: 'Distancia en 12 minutos: estima tu VO2max',
    mode: 'capture', icon: 'walk-outline', color: '#f97316', unit: 'm',
    table: 'edad_atp_functional_tests', testKey: 'cooper_12min',
    legacyRoutes: ['/edad-atp/tests/cooper'],
  }),
  physical({
    id: 'push-ups', title: 'Push-ups máximas', subtitle: 'Repeticiones sin romper la forma',
    mode: 'capture', icon: 'barbell-outline', color: '#eab308', unit: 'reps',
    table: 'edad_atp_functional_tests', testKey: 'push_ups_max',
    legacyRoutes: ['/edad-atp/tests/push-ups'],
  }),
  physical({
    id: 'balance', title: 'Equilibrio en un pie', subtitle: 'Segundos de pie sobre una pierna, ojos abiertos',
    mode: 'capture', icon: 'accessibility-outline', color: '#14b8a6', unit: 's',
    table: 'edad_atp_functional_tests', testKey: 'one_leg_balance',
    legacyRoutes: ['/edad-atp/tests/balance'],
  }),
  physical({
    id: 'old-man', title: 'Old Man Test', subtitle: 'Sentarte y levantarte del piso sin apoyarte, de 0 a 10',
    mode: 'capture', icon: 'accessibility-outline', color: '#a78bfa', unit: 'pts',
    table: 'edad_atp_functional_tests', testKey: 'old_man_test', mirrors: KINEMATIC_MIRROR('old_man_test'),
    legacyRoutes: ['/edad-atp/test-old-man'],
  }),
  physical({
    id: 'recovery-hr', title: 'Recovery HR', subtitle: 'Cuánto baja tu pulso al minuto de parar',
    mode: 'capture', icon: 'heart-outline', color: '#fb7185', unit: 'bpm',
    table: 'edad_atp_functional_tests', testKey: 'recovery_hr', mirrors: KINEMATIC_MIRROR('recovery_hr'),
    legacyRoutes: ['/edad-atp/test-recovery-hr'],
  }),
  physical({
    id: 'grip', title: 'Fuerza de agarre', subtitle: 'Dinamómetro: de los marcadores que mejor predicen longevidad',
    mode: 'capture', icon: 'hand-left-outline', color: '#84cc16', unit: 'kg',
    table: 'edad_atp_functional_tests', testKey: 'grip_strength',
    legacyRoutes: ['/edad-atp/composition?focus=grip'],
  }),
  physical({
    id: 'reaction-time', title: 'Tiempo de reacción', subtitle: 'El teléfono es el instrumento: toca en cuanto cambie',
    mode: 'reactive', icon: 'flash-outline', color: '#7F77DD', unit: 'ms',
    table: 'edad_atp_functional_tests', testKey: 'reaction_time_choice',
    legacyRoutes: ['/edad-atp/tests/reaction-time', '/edad-atp/cognitive'],
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// El registry
// ─────────────────────────────────────────────────────────────────────────────

export const ASSESSMENTS: Assessment[] = [
  BRAVERMAN,
  ...FUNCIONALES,
  CRONOTIPO,
  LIFESTYLE,
  MAESTRO,
  ...CLINICOS,
  ...EDAD,
  ...FISICOS,
];

export const ASSESSMENT_BY_ID: Record<string, Assessment> =
  Object.fromEntries(ASSESSMENTS.map((a) => [a.id, a]));

/** Orden y copy de las 4 secciones colapsables del hub. */
export const SECTION_META = [
  { id: 'funcional', title: 'Funcional', blurb: 'Cómo está funcionando tu cuerpo por dentro' },
  { id: 'clinico', title: 'Clínico', blurb: 'Tu historia: lo que traes, lo que trajiste y lo que heredaste' },
  { id: 'edad', title: 'Edad ATP', blurb: 'Los cuestionarios que alimentan tu edad biológica' },
  { id: 'fisico', title: 'Físico', blurb: 'Lo que se mide con el cuerpo, no con palabras' },
] as const;
