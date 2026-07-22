/**
 * Prompt de dx_generation — ARGOS sintetiza "Mi Diagnóstico Funcional".
 *
 * Sin imports de supabase/RN (lógica pura de construcción de prompt; el motor
 * la testea indirectamente y podría testearse en node). La salida es JSON
 * ESTRICTO — el cliente NO confía en el modelo: dx-engine-core valida las
 * raíces contra el vocabulario controlado y clampa severity/confidence.
 */
import {
  INTERVENTION_ROOTS,
  ROOT_LABELS,
  type InterventionRoot,
} from '@/src/constants/intervention-vocab';

/** Datos ya cosechados que se le entregan al modelo (fail-soft: todo opcional). */
export interface DxPromptContext {
  /** Nivel de calidad 1-5 ya calculado (contexto para calibrar confianza). */
  qualityLevel: number;
  /** JSONB de historia_clinica.data (levantamientos por categoría). */
  historiaClinica?: Record<string, unknown> | null;
  clinicalSymptoms?: { name: string; system_key?: string; severity?: number; status?: string }[];
  symptomsAislados?: { tag: string; severity?: number | null }[];
  padecimientos?: {
    name: string;
    category?: string;
    is_chronic?: boolean;
    episodeCount?: number;
  }[];
  labs?: { parameter_key: string; value?: number; measured_at?: string }[];
  braverman?: { dominant_type?: string | null; primary_deficiency?: string | null } | null;
  quizzes?: { quiz_id: string; domain_scores?: unknown }[];
  supplements?: { name: string }[];
}

function rootVocabList(): string {
  return (INTERVENTION_ROOTS as readonly InterventionRoot[])
    .map((k) => `  - ${k} (${ROOT_LABELS[k]})`)
    .join('\n');
}

/** System + user prompt del motor DX. Español es-MX. Salida JSON estricto. */
export function buildDxPrompt(context: DxPromptContext): { system: string; user: string } {
  const system = `Eres ARGOS, el sistema de inteligencia en salud funcional de ATP, con formación en medicina funcional.
Tu tarea: sintetizar "Mi Mapa Funcional" del usuario a partir de sus fuentes (levantamientos, síntomas, padecimientos, laboratorios, Braverman, quizzes y suplementos).

## FORMATO DE SALIDA (OBLIGATORIO)
Devuelve ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, sin \`\`\` fences. Estructura EXACTA:
{
  "roots_detected": [
    { "root_key": "<clave del vocabulario>", "severity": <entero 1-5>, "confidence": <0.0-1.0>, "sources": ["<fuente breve>", ...] }
  ],
  "summary_text": "<síntesis en español, 120-220 palabras>"
}

## VOCABULARIO CONTROLADO DE RAÍCES (root_key)
Usa EXCLUSIVAMENTE estas claves. Cualquier raíz fuera de esta lista será descartada por el sistema:
${rootVocabList()}

## REGLAS NO NEGOCIABLES
1. root_key SOLO del vocabulario de arriba. Si dudas entre dos, elige la más sustentada por los datos. Nunca inventes claves.
2. "Falta de data ≠ ausencia": NUNCA afirmes que una condición está ausente por no tener el dato. Si una raíz es plausible pero poco sustentada, INCLÚYELA con confidence BAJO (p.ej. 0.2-0.4) en vez de omitirla; y NUNCA declares en summary_text que "no hay" un problema por falta de medición.
3. severity = qué tan marcada está la raíz según los datos (1 leve … 5 severa). confidence = qué tan sólida es la evidencia disponible (0 nula … 1 contundente). Son independientes.
4. Cita en "sources" las fuentes reales que usaste (p.ej. "síntomas digestivos", "Braverman: déficit GABA", "labs: glucosa").
5. Medicina funcional: causas raíz sobre síntomas. NO diagnostiques enfermedades ni receta fármacos. Esto es optimización de rendimiento, no medicina clínica.
6. Español es-MX, tono claro y cálido. Ordena roots_detected de mayor a menor severity.
7. Si hay pocas fuentes (nivel de calidad bajo), sé conservador: menos raíces, confidence más bajo, y en summary_text invita a completar más levantamientos.`;

  const hc = context.historiaClinica && Object.keys(context.historiaClinica).length
    ? JSON.stringify(context.historiaClinica)
    : '(sin levantamientos)';

  const symptoms = context.clinicalSymptoms?.length
    ? context.clinicalSymptoms
        .map((s) => `${s.name}${s.system_key ? ` [${s.system_key}]` : ''}${s.severity ? ` sev ${s.severity}` : ''}${s.status ? ` (${s.status})` : ''}`)
        .join('; ')
    : '(ninguno)';

  const aislados = context.symptomsAislados?.length
    ? context.symptomsAislados.map((s) => `${s.tag}${s.severity ? ` sev ${s.severity}` : ''}`).join('; ')
    : '(ninguno)';

  const padecimientos = context.padecimientos?.length
    ? context.padecimientos
        .map((p) => `${p.name}${p.category ? ` [${p.category}]` : ''}${p.is_chronic ? ' crónico' : ''}${p.episodeCount ? ` · ${p.episodeCount} episodio(s)` : ''}`)
        .join('; ')
    : '(ninguno)';

  const labs = context.labs?.length
    ? context.labs.map((l) => `${l.parameter_key}=${l.value ?? '?'}`).join('; ')
    : '(sin laboratorios)';

  const braverman = context.braverman
    ? `dominante=${context.braverman.dominant_type ?? '?'}, déficit principal=${context.braverman.primary_deficiency ?? '?'}`
    : '(sin test Braverman)';

  const quizzes = context.quizzes?.length
    ? context.quizzes.map((q) => q.quiz_id).join('; ')
    : '(sin quizzes)';

  const supplements = context.supplements?.length
    ? context.supplements.map((s) => s.name).join('; ')
    : '(ninguno)';

  const user = `Nivel de calidad de datos actual: ${context.qualityLevel}/5.

LEVANTAMIENTOS (historia clínica):
${hc}

SÍNTOMAS CLÍNICOS (por sistema): ${symptoms}
SÍNTOMAS AISLADOS (quick-tap): ${aislados}
PADECIMIENTOS: ${padecimientos}
LABORATORIOS: ${labs}
BRAVERMAN: ${braverman}
QUIZZES FUNCIONALES: ${quizzes}
SUPLEMENTOS ACTIVOS: ${supplements}

Sintetiza mi Mapa Funcional siguiendo las reglas. Devuelve SOLO el JSON.`;

  return { system, user };
}
