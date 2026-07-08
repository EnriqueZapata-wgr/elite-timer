/**
 * ARGOS Recipes cross-módulo (#96, marathon F7) — lógica PURA.
 * Traduce labs/preferencias/objetivo/ciclo a un bloque de contexto para
 * el prompt de recetas. Sin imports de supabase/RN (testeable en node).
 *
 * Criterio medicina funcional: rangos FUNCIONALES (no de laboratorio
 * convencional), comida primero. FLAG validación Mariana pendiente.
 */

export interface BiomarkerReading {
  key: string;
  value: number;
  unit: string;
}

interface BiomarkerRule {
  key: string;
  /** true si el valor está fuera de rango funcional */
  applies: (value: number) => boolean;
  priority: (value: number, unit: string) => string;
}

const BIOMARKER_RULES: BiomarkerRule[] = [
  {
    key: 'ferritin',
    applies: (v) => v < 30,
    priority: (v, u) => `Ferritina baja (${v} ${u}): prioriza hierro heme — res, hígado, sardinas — acompañado de vitamina C`,
  },
  {
    key: 'vitamin_d',
    applies: (v) => v < 30,
    priority: (v, u) => `Vitamina D baja (${v} ${u}): pescados grasos (salmón, sardinas), huevo entero, setas`,
  },
  {
    key: 'glucose',
    applies: (v) => v > 100,
    priority: (v, u) => `Glucosa en ayunas elevada (${v} ${u}): receta low-carb, cero azúcares añadidos ni harinas`,
  },
  {
    key: 'hba1c',
    applies: (v) => v > 5.7,
    priority: (v, u) => `HbA1c elevada (${v}${u === '%' ? '%' : ` ${u}`}): control glucémico — low-carb, fibra alta`,
  },
  {
    key: 'insulin',
    applies: (v) => v > 10,
    priority: (v, u) => `Insulina elevada (${v} ${u}): más proteína y fibra, menos carbohidratos de rápida absorción`,
  },
  {
    key: 'hdl',
    applies: (v) => v < 40,
    priority: (v, u) => `HDL bajo (${v} ${u}): grasas buenas — aguacate, aceite de oliva, pescado graso`,
  },
  {
    key: 'triglycerides',
    applies: (v) => v > 150,
    priority: (v, u) => `Triglicéridos altos (${v} ${u}): recorta carbohidratos refinados; suma omega-3`,
  },
];

/** Prioridades alimentarias derivadas de biomarcadores fuera de rango funcional. */
export function biomarkerFoodPriorities(readings: BiomarkerReading[]): string[] {
  const priorities: string[] = [];
  for (const rule of BIOMARKER_RULES) {
    const reading = readings.find((r) => r.key === rule.key);
    if (reading && Number.isFinite(reading.value) && rule.applies(reading.value)) {
      priorities.push(rule.priority(reading.value, reading.unit));
    }
  }
  return priorities;
}

/** Guía nutricional por fase del ciclo (solo mujeres con fase conocida). */
export function cycleNutritionHint(phase: string | null): string | null {
  switch (phase) {
    case 'menstrual':
      return 'Fase menstrual: refuerza hierro (carnes rojas, lentejas) y magnesio; platos cálidos y reconfortantes';
    case 'follicular':
    case 'ovulation':
      return 'Fase folicular/ovulación: buena tolerancia a carbohidratos — OK camote, arroz, fruta alrededor del entrenamiento';
    case 'luteal':
      return 'Fase lútea: baja carbohidratos refinados, sube magnesio (cacao, semillas de calabaza) y proteína saciante';
    default:
      return null;
  }
}

export interface AdvancedContextInput {
  dietType: string | null;
  allergies: string[];
  dislikes: string | null;
  primaryGoal: string | null;
  biomarkerPriorities: string[];
  cycleHint: string | null;
}

/**
 * Bloque de contexto avanzado para el system prompt de generateRecipe.
 * Devuelve null si no hay NADA que aportar (usa el flujo normal).
 */
export function buildAdvancedRecipeContext(input: AdvancedContextInput): string | null {
  const lines: string[] = [];
  if (input.dietType && input.dietType !== 'omnivore') {
    lines.push(`- Dieta del usuario: ${input.dietType}. RESPÉTALA estrictamente.`);
  }
  if (input.allergies.length > 0) {
    lines.push(`- ALERGIAS (prohibido incluirlas): ${input.allergies.join(', ')}.`);
  }
  if (input.dislikes && input.dislikes.trim().length > 0) {
    lines.push(`- No le gusta: ${input.dislikes.trim()}. Evítalo.`);
  }
  if (input.primaryGoal) {
    lines.push(`- Objetivo principal: ${input.primaryGoal}. Alinea macros a este objetivo.`);
  }
  for (const p of input.biomarkerPriorities) {
    lines.push(`- LAB: ${p}.`);
  }
  if (input.cycleHint) {
    lines.push(`- CICLO: ${input.cycleHint}.`);
  }
  if (lines.length === 0) return null;
  return `PERSONALIZACIÓN AVANZADA (datos reales del usuario — tienen prioridad sobre lo genérico):\n${lines.join('\n')}`;
}
