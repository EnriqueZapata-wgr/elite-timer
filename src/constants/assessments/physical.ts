/**
 * OLA 4 · Los tests físicos como DATOS (Anexo C, pieza 4).
 *
 * Nueve tests vivían en once archivos de ruta cuyo contenido real eran cinco
 * cadenas de texto y un rango: título, cómo se hace, cómo se puntúa, unidad y
 * mínimo/máximo. Eso no es una pantalla, es una entrada de catálogo. Aquí
 * quedan como datos y el runner los pinta.
 *
 * Lo que NO se movió es el destino de cada medición, y no por descuido:
 * los tres caminos de guardado que existen hoy son distintos de verdad y cada
 * uno alimenta una lectura distinta del motor v2. Verificado contra el código
 * que escribe, no contra el anexo:
 *
 *   kinematic          → edad_atp_functional_tests + fitness_kinematic_tests
 *   functional-test    → edad_atp_functional_tests
 *   health-measurement → health_measurements (columna propia)
 *
 * DOS CORRECCIONES AL ANEXO, con el código como árbitro:
 *  1. El equilibrio en un pie NO se guarda como 'one_leg_balance'. Esa es la
 *     llave legacy que el motor lee como alias; la que se escribe hoy es
 *     'test_de_equilibrio_en_un_pie'. Escribir la vieja habría partido en dos
 *     el histórico de quien ya lo capturó.
 *  2. Cooper y agarre no viven en edad_atp_functional_tests: Cooper aterriza en
 *     health_measurements.vo2max_estimate, que es la fuente que el motor lee
 *     como vo2max_ml_kg_min, y el agarre en health_measurements.grip_strength_kg,
 *     donde ya lo escribe la pantalla de composición.
 */
import type { KinematicTestKey, KinematicUnit } from '@/src/services/edad-atp/kinematic-tests-service';
import type { PhysicalMode } from './types';

/** Un campo del formulario de captura. */
export interface CaptureField {
  key: string;
  label: string;
  unit: string;
  helper?: string;
  min: number;
  max: number;
  integer?: boolean;
  /** Opcional: no bloquea el guardado si va vacío. */
  optional?: boolean;
  /** Muestra la insignia con el último valor capturado. */
  showLatest?: boolean;
}

/** A dónde va la medición. Cada rama es un servicio que ya existe. */
export type PhysicalSave =
  | { via: 'kinematic'; testKey: KinematicTestKey; unit: KinematicUnit }
  | { via: 'functional-test'; testKey: string }
  | { via: 'health-measurement'; column: 'vo2max_estimate' | 'grip_strength_kg' };

/** Resultado de combinar los campos en el único número que se guarda. */
export interface DeriveResult {
  value?: number;
  /** Nota que acompaña la fila (los kinemáticos la guardan). */
  note?: string;
  /** Línea que se pinta bajo los campos mientras se captura. */
  caption?: string;
  /** Si viene, no se guarda y esto es lo que se le dice a la persona. */
  problem?: string;
}

export interface PhysicalTest {
  id: string;
  mode: PhysicalMode;
  title: string;
  /** Cómo se hace, en dos o tres renglones. */
  intro: string;
  helpLabel: string;
  helpTitle: string;
  helpBody: string;
  /** stopwatch: tope de seguridad del cronómetro. */
  maxSeconds?: number;
  /** capture: los campos que se llenan. */
  fields?: CaptureField[];
  /** capture: de los campos al valor guardado. Sin esto, gana el primer campo. */
  derive?: (values: Record<string, number | null>) => DeriveResult;
  save?: PhysicalSave;
  /** Sufijo de la confirmación: "180 s guardados". */
  savedUnit?: string;
}

/** VO2max (ml/kg/min) por la fórmula de Cooper (1968). */
function vo2FromDistance(meters: number): number | null {
  if (!Number.isFinite(meters) || meters < 505 || meters > 5000) return null;
  return Math.round(((meters - 504.9) / 44.73) * 10) / 10;
}

export const PHYSICAL_TESTS: PhysicalTest[] = [
  // ── cronómetro: la app mide ───────────────────────────────────────────────
  {
    id: 'plank',
    mode: 'stopwatch',
    title: 'Plank',
    intro: 'Plancha con técnica estricta: antebrazos y puntas de los pies, cuerpo en línea recta. Toca Empezar y aguanta; detén cuando rompas la forma.',
    helpLabel: '¿Cómo se hace?',
    helpTitle: '¿Cómo se hace el Plank?',
    helpBody: '1. Antebrazos al piso, codos bajo los hombros.\n2. Cuerpo en línea recta: cabeza, cadera y talones alineados.\n3. Abdomen y glúteos contraídos, sin hundir la cadera.\n4. Aguanta el máximo tiempo con buena forma. Detén al perder la línea.',
    maxSeconds: 600,
    save: { via: 'kinematic', testKey: 'plank', unit: 'seconds' },
    savedUnit: 's',
  },
  {
    id: 'bolt',
    mode: 'stopwatch',
    title: 'BOLT',
    intro: 'Mide tu tolerancia al CO2 (control respiratorio). Respira normal, exhala normal, tápate la nariz y toca Empezar. Detén a la PRIMERA urgencia de respirar: no aguantes al máximo.',
    helpLabel: '¿Cómo se hace?',
    helpTitle: '¿Qué mide el BOLT?',
    helpBody: 'El BOLT estima tu tolerancia al CO2 y la eficiencia de tu respiración.\n\n1. Siéntate y respira normal un minuto.\n2. Tras una exhalación NORMAL (no forzada), tápate la nariz.\n3. Cronometra hasta la PRIMERA señal real de querer respirar (no el máximo aguante).\n4. Suelta y respira normal. >40s = excelente; <20s = mejorable.',
    maxSeconds: 120,
    save: { via: 'kinematic', testKey: 'bolt', unit: 'seconds' },
    savedUnit: 's',
  },

  // ── captura: la persona mide afuera y trae el número ──────────────────────
  {
    id: 'cooper',
    mode: 'capture',
    title: 'Cooper 12 min',
    intro: 'Cómo hacerlo: en pista o caminadora, corre o camina la MAYOR distancia posible en 12 minutos. Hazlo cuando quieras: aquí solo capturas tu resultado.',
    helpLabel: '¿Cómo se calcula?',
    helpTitle: 'Test de Cooper (1968)',
    helpBody: 'VO2max estimado = (metros − 504.9) / 44.73.\n\nSi tu wearable o una prueba de esfuerzo ya te dio el VO2max directo, ese gana sobre el estimado por distancia: es una medición, no una estimación.',
    fields: [
      { key: 'meters', label: 'Distancia en 12 min', unit: 'm', min: 505, max: 5000, helper: 'Metros recorridos (pista de 400 m: vueltas × 400)' },
      { key: 'vo2', label: 'VO2max directo', unit: 'ml/kg/min', min: 10, max: 100, optional: true, showLatest: true, helper: 'Opcional: de tu wearable o prueba de esfuerzo. Si lo llenas, gana.' },
    ],
    derive: (v) => {
      const direct = v.vo2;
      if (direct != null) {
        const value = Math.round(direct * 10) / 10;
        return { value, caption: `VO2max: ${value} ml/kg/min` };
      }
      const estimated = v.meters != null ? vo2FromDistance(v.meters) : null;
      if (estimated == null) return { problem: 'Ingresa los metros recorridos en 12 min (505 a 5000) o un VO2max directo.' };
      return { value: estimated, caption: `VO2max estimado: ${estimated} ml/kg/min` };
    },
    save: { via: 'health-measurement', column: 'vo2max_estimate' },
    savedUnit: 'ml/kg/min',
  },
  {
    id: 'push-ups',
    mode: 'capture',
    title: 'Push-ups máximas',
    intro: 'Cómo hacerlo: máximo de lagartijas CONTINUAS con buena técnica (pecho casi al piso, cuerpo en línea). Sin pausas largas. Captura aquí tu resultado.',
    helpLabel: '¿Qué cuenta como buena técnica?',
    helpTitle: 'Push-ups máximas',
    helpBody: 'Cuerpo en línea recta de cabeza a talones, sin hundir la cadera.\n\nBaja hasta que el pecho quede casi al piso y sube hasta extender los codos.\n\nCuentan las CONTINUAS: al primer descanso largo se acabó la serie.',
    fields: [
      { key: 'reps', label: 'Lagartijas continuas', unit: 'reps', min: 1, max: 200, integer: true, showLatest: true },
    ],
    save: { via: 'functional-test', testKey: 'push_ups_max' },
    savedUnit: 'reps',
  },
  {
    id: 'balance',
    mode: 'capture',
    title: 'Equilibrio en un pie',
    intro: 'Cómo hacerlo: descalzo y con los ojos cerrados, párate en un pie. Cronometra hasta que el pie libre toque el piso.',
    helpLabel: '¿Por qué con ojos cerrados?',
    helpTitle: 'Equilibrio en un pie',
    helpBody: 'Con los ojos abiertos la vista compensa y el test deja de medir lo que importa: el equilibrio propioceptivo y vestibular.\n\n1. Descalzo, en piso firme, junto a algo donde apoyarte si hace falta.\n2. Cierra los ojos y levanta un pie.\n3. Detén el cronómetro cuando el pie libre toque el piso o abras los ojos.',
    fields: [
      { key: 'seconds', label: 'Balance 1 pie', unit: 's', min: 1, max: 600, showLatest: true, helper: 'Ojos cerrados, descalzo.' },
    ],
    // La llave que escribe hoy la app. 'one_leg_balance' es solo alias de lectura.
    save: { via: 'functional-test', testKey: 'test_de_equilibrio_en_un_pie' },
    savedUnit: 's',
  },
  {
    id: 'old-man',
    mode: 'capture',
    title: 'Old Man Test',
    intro: 'Sin usar manos, siéntate en el piso y vuelve a ponerte de pie. Empiezas con 10 puntos y restas 1 por cada apoyo (mano, rodilla, antebrazo) o pérdida de equilibrio.',
    helpLabel: '¿Cómo se puntúa?',
    helpTitle: 'Sit-Rise Test (Brito 2014)',
    helpBody: 'Desde de pie, baja a sentarte en el piso con piernas cruzadas y vuelve a levantarte, sin usar manos, rodillas, antebrazos ni costados como apoyo.\n\nEmpiezas con 10 puntos:\n• −1 por cada apoyo de mano, rodilla o antebrazo.\n• −1 si pierdes el equilibrio.\n\nPredictor validado de mortalidad por todas las causas. 10/10 = óptimo.',
    fields: [
      { key: 'points', label: 'Puntaje sit-rise', unit: 'pts (0-10)', min: 0, max: 10, integer: true, showLatest: true, helper: '10 = sin ningún apoyo. Resta 1 por cada mano, rodilla o antebrazo apoyado.' },
    ],
    save: { via: 'kinematic', testKey: 'old_man_test', unit: 'points' },
    savedUnit: 'pts',
  },
  {
    id: 'recovery-hr',
    mode: 'capture',
    title: 'Recovery HR',
    intro: 'Mide cuánto baja tu pulso en 1 minuto tras un esfuerzo intenso. Mayor caída significa mejor recuperación cardiaca.',
    helpLabel: '¿Cómo medir?',
    helpTitle: '¿Cómo medir la recuperación?',
    helpBody: '1. Haz un esfuerzo intenso (sprint, escaleras, burpees) hasta acercarte a tu FC máxima.\n2. Apunta tu FC justo al terminar (FC pico).\n3. Descansa quieto exactamente 1 minuto.\n4. Apunta tu FC de nuevo.\n\nMedición: reloj deportivo, pulsioxímetro, o tu pulso manual 15s × 4.\nCaída = FC pico − FC 1min. 40 BPM o más = excelente.',
    fields: [
      { key: 'peak', label: 'FC al pico de esfuerzo', unit: 'BPM', min: 40, max: 220, helper: 'Justo al terminar el esfuerzo intenso' },
      { key: 'rest', label: 'FC tras 1 min de descanso', unit: 'BPM', min: 40, max: 220, showLatest: true, helper: 'Exactamente 1 minuto después' },
    ],
    derive: (v) => {
      if (v.peak == null || v.rest == null) return { problem: 'Ingresa ambas frecuencias (40 a 220 BPM).' };
      const delta = Math.round(v.peak - v.rest);
      if (delta <= 0) return { problem: 'La FC de descanso debe ser menor que la de pico: la caída tiene que ser positiva.' };
      const grade = delta >= 40 ? ' · excelente' : delta >= 25 ? ' · buena' : '';
      return {
        value: delta,
        note: `pico ${Math.round(v.peak)} / 1min ${Math.round(v.rest)}`,
        caption: `Caída: ${delta} BPM${grade}`,
      };
    },
    save: { via: 'kinematic', testKey: 'recovery_hr', unit: 'bpm' },
    savedUnit: 'BPM de caída',
  },
  {
    id: 'grip',
    mode: 'capture',
    title: 'Fuerza de agarre',
    intro: 'Cómo hacerlo: de pie, codo a 90 grados y pegado al cuerpo, aprieta el dinamómetro con toda tu fuerza 3 segundos. Captura tu mejor intento de tres.',
    helpLabel: '¿Por qué importa el agarre?',
    helpTitle: 'Fuerza de agarre',
    helpBody: 'Es de los marcadores que mejor predicen longevidad y funcionalidad, porque resume fuerza total y estado neuromuscular en un solo número fácil de medir.\n\nNecesitas un dinamómetro de mano (el Camry EH101 ronda los 25 dólares).\n\n1. De pie, brazo pegado al cuerpo y codo a 90 grados.\n2. Aprieta con toda tu fuerza 3 segundos.\n3. Descansa 30 segundos entre intentos. Captura el mejor de tres.',
    fields: [
      { key: 'kg', label: 'Fuerza de agarre', unit: 'kg', min: 5, max: 100, showLatest: true, helper: 'Mejor intento de tres, mano dominante.' },
    ],
    save: { via: 'health-measurement', column: 'grip_strength_kg' },
    savedUnit: 'kg',
  },

  // ── reactivo: el teléfono ES el instrumento ───────────────────────────────
  {
    id: 'reaction-time',
    mode: 'reactive',
    title: 'Tiempo de reacción',
    intro: 'El único test donde el teléfono es el instrumento: toca en cuanto el círculo cambie.',
    helpLabel: '',
    helpTitle: '',
    helpBody: '',
  },
];

export const PHYSICAL_BY_ID: Record<string, PhysicalTest> =
  Object.fromEntries(PHYSICAL_TESTS.map((p) => [p.id, p]));

export function getPhysicalTest(id: string): PhysicalTest | undefined {
  return PHYSICAL_BY_ID[id];
}
