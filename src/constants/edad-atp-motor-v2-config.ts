/**
 * Motor Edad ATP v2 — configuración CONGELADA (pesos + factores de anclaje + caps +
 * thresholds de hábitos + curva universal score→edad). Verificado contra el Excel
 * maestro `EDAD_ATP_Motor_v1.0.xlsx` y el gate de 4 pacientes (fixtures_4_pacientes.json).
 *
 * Arquitectura por áreas ciegas (README del Excel):
 *   1. Cada área (5) calcula UNA edad parcial CIEGA (sin saber la cronológica).
 *   2. Cada edad parcial se ANCLA a la cronológica con un factor por confiabilidad.
 *   3. Promedio ponderado de las 5 áreas ajustadas.
 *   4. Modulador de hábitos (0.95 a 1.10).
 *   5. Cap final [20, 100].
 *
 * NO modificar sin re-validar contra los 4 fixtures (tolerancia integral ±1.0 año).
 */

/** Pesos de las 5 áreas en el promedio ponderado. Suman 1.0. */
export const MOTOR_V2_PESOS_AREAS = {
  labs: 0.25,
  composicion: 0.15,
  fitness: 0.2,
  cognicion: 0.15,
  riesgos: 0.25,
} as const;

/** Factor de anclaje por área: edad_aj = cron + (edad_ciega − cron) × factor. */
export const MOTOR_V2_FACTORES_ANCLAJE = {
  labs: 0.75, // PhenoAge validado (NHANES) — confiable
  composicion: 0.7, // báscula objetiva + FFMI
  fitness: 0.65, // tests in-app con motivación variable
  cognicion: 0.55, // subjetivos ruidosos — salvaguarda
  riesgos: 0.75, // mayoría labs duros + sub-bloques diluidos
} as const;

/** Caps absolutos de la Edad ATP integral. */
export const MOTOR_V2_CAPS = { min: 20, max: 100 } as const;

/**
 * Cognición v2.1 — latencia añadida por captura en pantalla táctil (display + touch
 * sampling) vs el botón físico de Der & Deary 2006. Se RESTA al RT medido antes de
 * mapear a edad: un RT de teléfono NO es comparable a uno de laboratorio.
 * Valor de ARRANQUE — Enrique + Mariana lo calibran con datos reales.
 */
export const RT_TOUCH_LATENCY_MS = 65;

export type MotorAreaKey = keyof typeof MOTOR_V2_PESOS_AREAS;

/**
 * Factor multiplicador de hábitos aplicado a la edad pre-modulador, según el score
 * de hábitos 0-100 (hoja 7_Habitos_Modulador): ≥80→0.95, 60-79→1.0, 40-59→1.05, <40→1.10.
 */
export function getHabitosFactor(scoreHabitos: number): number {
  if (scoreHabitos >= 80) return 0.95;
  if (scoreHabitos >= 60) return 1.0;
  if (scoreHabitos >= 40) return 1.05;
  return 1.1;
}

/**
 * Curva universal score→edad ciega (piecewise), idéntica al Excel (hojas 3/4/6).
 * Score alto = edad joven. Replicada EXACTAMENTE: cualquier cambio rompe el gate.
 */
export function scoreToEdadCiega(score: number): number {
  if (score >= 95) return 22;
  if (score >= 90) return 28 - ((score - 90) / 5) * 6;
  if (score >= 80) return 33 - ((score - 80) / 10) * 5;
  if (score >= 70) return 42 - ((score - 70) / 10) * 9;
  if (score >= 60) return 50 - ((score - 60) / 10) * 8;
  if (score >= 50) return 60 - ((score - 50) / 10) * 10;
  if (score >= 40) return 70 - ((score - 40) / 10) * 10;
  if (score >= 30) return 80 - ((score - 30) / 10) * 10;
  return Math.min(100, 90 + ((30 - score) / 30) * 10);
}

/** Ancla una edad ciega a la cronológica con el factor de confiabilidad del área. */
export function anclarEdad(edadCiega: number, cron: number, factor: number): number {
  return cron + (edadCiega - cron) * factor;
}
