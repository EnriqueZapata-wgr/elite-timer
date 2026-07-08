/**
 * Braverman PREMIUM (#90) — lógica pura: proporciones + prompt.
 * Sin imports de supabase/RN (testeable en vitest node).
 */

export type NeuroKey = 'dopamine' | 'acetylcholine' | 'gaba' | 'serotonin';

export const NEURO_LABELS: Record<NeuroKey, string> = {
  dopamine: 'Dopamina',
  acetylcholine: 'Acetilcolina',
  gaba: 'GABA',
  serotonin: 'Serotonina',
};

export interface NeuroScores {
  dopamine: number;
  acetylcholine: number;
  gaba: number;
  serotonin: number;
}

export interface NeuroProportion {
  key: NeuroKey;
  label: string;
  pct: number;
}

/**
 * Proporciones normalizadas (suman exactamente 100, método del mayor residuo),
 * ordenadas descendente. Con todo en 0 devuelve 25/25/25/25.
 */
export function computeProportions(scores: NeuroScores): NeuroProportion[] {
  const keys: NeuroKey[] = ['dopamine', 'acetylcholine', 'gaba', 'serotonin'];
  const total = keys.reduce((sum, k) => sum + Math.max(0, scores[k] || 0), 0);
  if (total <= 0) {
    return keys.map((k) => ({ key: k, label: NEURO_LABELS[k], pct: 25 }));
  }
  const raw = keys.map((k) => ({
    key: k,
    exact: (Math.max(0, scores[k] || 0) / total) * 100,
  }));
  const floored = raw.map((r) => ({ ...r, pct: Math.floor(r.exact) }));
  let remainder = 100 - floored.reduce((sum, r) => sum + r.pct, 0);
  // reparte el residuo a los mayores decimales
  const byResidual = [...floored].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; i < byResidual.length && remainder > 0; i++, remainder--) {
    byResidual[i].pct += 1;
  }
  return floored
    .map((r) => ({ key: r.key, label: NEURO_LABELS[r.key], pct: r.pct }))
    .sort((a, b) => b.pct - a.pct);
}

/** "62% Dopamina, 22% Acetilcolina, 10% GABA, 6% Serotonina" */
export function formatProportions(proportions: NeuroProportion[]): string {
  return proportions.map((p) => `${p.pct}% ${p.label}`).join(', ');
}

export interface PremiumPromptInput {
  dominance: NeuroProportion[];
  deficiency: NeuroProportion[];
  dominantLabel: string;
  primaryDeficiencyLabel: string;
  deficiencyLevel: string | null;
  age: number | null;
  sex: string | null;
}

/** System + user prompt del reporte premium. Markdown editorial en español. */
export function buildPremiumReportPrompt(input: PremiumPromptInput): { system: string; user: string } {
  const system = `Eres ARGOS, el sistema de IA de rendimiento humano de ATP, con formación en medicina funcional.
Genera un REPORTE PREMIUM del test de Braverman (evaluación de neurotransmisores).

REGLAS:
- Español, tono editorial premium: directo, cálido, sin tecnicismos innecesarios.
- Medicina funcional: causas raíz, nutrición y estilo de vida primero. NO recetes fármacos.
- NO diagnostiques enfermedades. Esto es optimización de rendimiento, no medicina clínica.
- Basa TODO en las proporciones reales que te doy — cita los porcentajes.
- Formato: markdown con estas secciones EXACTAS (usa ## para cada una):

## Tu perfil dominante
(proporciones específicas + qué significa la combinación, no solo la dominante)

## Análisis por naturaleza
(para las 2 naturalezas más altas: fortalezas, vulnerabilidades, patrones de comportamiento típicos)

## Tu deficiencia principal
(qué se siente en el día a día, señales tempranas de que se agrava)

## Recomendaciones específicas
(4 sub-bloques: **Nutrientes clave** · **Suplementos target** · **Estilo de ejercicio** · **Prácticas mentales** — específicos para SU perfil, no genéricos)

## Compatibilidad con tu perfil ATP
(cómo usar HOY, protocolos y hábitos de ATP para trabajar este perfil; cierra con una línea memorable)

Extensión total: 600-900 palabras.`;

  const user = `Mi resultado del test de Braverman (313 preguntas):

DOMINANCIA: ${formatProportions(input.dominance)}
Naturaleza dominante: ${input.dominantLabel}

DEFICIENCIAS: ${formatProportions(input.deficiency)}
Deficiencia principal: ${input.primaryDeficiencyLabel}${input.deficiencyLevel ? ` (nivel: ${input.deficiencyLevel})` : ''}

${input.age ? `Edad: ${input.age} años. ` : ''}${input.sex ? `Sexo: ${input.sex === 'female' ? 'mujer' : 'hombre'}.` : ''}

Genera mi reporte premium.`;

  return { system, user };
}
