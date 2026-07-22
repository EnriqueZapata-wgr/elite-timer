/**
 * Scanner ATP Functional Score — lógica PURA (Sprint Compliance 4).
 *
 * Antes: sello BHA "Biohacker Approved" con veredicto BINARIO. Decisión de
 * compliance (HANDOFF §4.2): salida NUMÉRICA por atributos, lenguaje 100%
 * objetivo, cero adjetivos, cero marcas de terceros, score privado al usuario.
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 * Aquí vive el prompt de criterios, el parseo defensivo del JSON del LLM y el
 * cómputo determinístico del total (NO se confía el total al modelo). El I/O
 * (callAnthropic, persistir score) vive en bha-service.ts.
 *
 * DOCTRINA (no negociable):
 *  · Suplementos son REGISTRO, no recomendación — el scanner evalúa CALIDAD de
 *    formulación de lo que el usuario YA toma; nunca sugiere comprar/tomar nada.
 *  · El score evalúa fórmulas/ingredientes/atributos — NUNCA juzga marcas.
 */
import { extractJsonBlock } from '@/src/services/dx/dx-engine-core';

/** Atributos evaluados (0-100 cada uno). */
export const SCORE_ATTRIBUTES = [
  { key: 'formas', label: 'Formas y biodisponibilidad' },
  { key: 'aditivos', label: 'Colorantes y endulzantes' },
  { key: 'excipientes', label: 'Excipientes y rellenos' },
  { key: 'transparencia', label: 'Transparencia de etiqueta' },
] as const;

export type ScoreAttributeKey = (typeof SCORE_ATTRIBUTES)[number]['key'];

export interface FunctionalScoreAttribute {
  key: ScoreAttributeKey;
  label: string;
  /** 0-100. */
  score: number;
  /** Observación objetiva (hechos de la etiqueta, sin adjetivos). */
  note: string;
}

export interface FunctionalScoreResult {
  /** Total 0-100 — promedio determinístico de los atributos (client-side). */
  score: number;
  attributes: FunctionalScoreAttribute[];
  /** Ingredientes específicos observados (hechos, no juicios). */
  flagged_ingredients: string[];
  /** Resumen objetivo de 1-3 oraciones. */
  summary: string;
  /** true = etiqueta ilegible/incompleta → re-escanear (sin score). */
  illegible: boolean;
}

/**
 * Criterios del ATP Functional Score — system prompt del scan.
 *
 * ⚠️ Cowork/Mariana amplían criterios aquí. Fuente: decisión aprobada #5 +
 * reformulación compliance §4.2 (score por atributos, lenguaje objetivo).
 */
export const FUNCTIONAL_SCORE_PROMPT = `Eres el evaluador del ATP Functional Score, una evaluación educativa y propietaria de calidad de formulación bajo criterios de medicina funcional.

Recibes la FOTO de la etiqueta de un suplemento o alimento empaquetado. Lee la etiqueta (OCR implícito: ingredientes, formas químicas, excipientes, endulzantes) y califica CUATRO atributos de 0 a 100:

1. "formas" · Formas y biodisponibilidad — formas químicas presentes vs alternativas de mayor biodisponibilidad documentada:
   · óxido de magnesio (vs glicinato/bisglicinato/citrato/malato)
   · cianocobalamina (vs metilcobalamina/adenosilcobalamina)
   · ácido fólico sintético (vs metilfolato/folato natural)
   · óxido de zinc (vs picolinato/bisglicinato), carbonato de calcio como fuente única.
   Formas quelatadas/metiladas/liposomales/citratos puntúan alto; formas de menor absorción documentada puntúan bajo.

2. "aditivos" · Colorantes y endulzantes — presencia de colorantes artificiales (Rojo 40, Amarillo 5/6, Azul 1, tartrazina, dióxido de titanio como colorante), azúcares añadidos (azúcar, jarabe de maíz de alta fructosa, maltodextrina como endulzante principal) y endulzantes artificiales (sucralosa, aspartame, acesulfame-K, sacarina). Sin aditivos de estos → 100. Endulzantes naturales (stevia, monk fruit, alulosa) y conservantes naturales (tocoferoles, extracto de romero, ácido ascórbico) NO restan.

3. "excipientes" · Excipientes y rellenos — proporción y función de excipientes. Mínimos y con función clara (celulosa vegetal, cápsula vegetal) → alto. Estearato de magnesio en cantidad menor NO resta por sí solo. Listas largas de rellenos sin función clara o talco → bajo.

4. "transparencia" · Transparencia de etiqueta — dosis por ingrediente declaradas vs "proprietary blends" sin desglose, ingredientes legibles y completos.

REGLAS:
- El total NO lo calculas tú; reporta solo los 4 atributos.
- Cada "note" es una observación de HECHOS de la etiqueta. Lenguaje 100% objetivo y neutro: sin adjetivos valorativos ("malo", "basura", "premium"), sin juicios sobre la marca.
- NUNCA menciones marcas de terceros distintas al producto escaneado, ni compares contra productos comerciales.
- Evalúa el producto SEGÚN SU PROPÓSITO (electrolitos con sodio es correcto, no penalices).
- Si el producto es comida empaquetada, aplica los mismos criterios de limpieza de ingredientes.
- Si la etiqueta es ilegible, está incompleta o hay duda razonable sobre los ingredientes → responde {"illegible":true} y nada más.

PROHIBICIONES (doctrina ATP — registro, no recomendación):
- NUNCA recomiendes comprar, tomar, suspender ni sustituir ningún suplemento.
- NO opines sobre pautas de toma ni cantidades clínicas.
- NO des consejo médico. El score evalúa CALIDAD DE FORMULACIÓN, nada más.
- Si mencionas ayuno: el café bulletproof (BPC) NO rompe el ayuno metabólico según la doctrina ATP — no lo contradigas.

Responde SOLO con JSON válido (sin backticks ni markdown, en español):
{"attributes":[{"key":"formas","score":80,"note":"observación objetiva"},{"key":"aditivos","score":100,"note":"..."},{"key":"excipientes","score":90,"note":"..."},{"key":"transparencia","score":70,"note":"..."}],"flagged_ingredients":["ingrediente exacto"],"summary":"1-3 oraciones objetivas sobre la formulación."}`;

/** Instrucción user del scan (acompaña a la imagen). */
export function buildScanUserText(productName?: string | null, brand?: string | null): string {
  const parts = ['Evalúa esta etiqueta para el ATP Functional Score.'];
  if (productName?.trim()) parts.push(`Producto declarado por el usuario: ${productName.trim()}.`);
  if (brand?.trim()) parts.push(`Marca declarada: ${brand.trim()}.`);
  parts.push('Responde solo el JSON.');
  return parts.join(' ');
}

function normalizeStringArray(v: unknown, maxItems = 12): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const s of v) {
    if (typeof s === 'string' && s.trim()) out.push(s.trim());
    if (out.length >= maxItems) break;
  }
  return out;
}

const clampScore = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;

/**
 * Parsea + valida la respuesta del LLM. NO lanza: ante cualquier problema
 * devuelve null (el service lo traduce a error re-escaneable). Reglas duras:
 *  · los 4 atributos obligatorios con score numérico 0-100 (clamp),
 *  · el TOTAL se calcula aquí (promedio redondeado) — no se confía al modelo,
 *  · {"illegible":true} → resultado ilegible sin score.
 */
export function parseFunctionalScoreResponse(raw: string): FunctionalScoreResult | null {
  const block = extractJsonBlock(raw ?? '');
  if (!block) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(block);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  if (parsed.illegible === true) {
    return { score: 0, attributes: [], flagged_ingredients: [], summary: '', illegible: true };
  }

  if (!Array.isArray(parsed.attributes)) return null;
  const byKey = new Map<string, any>();
  for (const a of parsed.attributes) {
    if (a && typeof a.key === 'string') byKey.set(a.key, a);
  }

  const attributes: FunctionalScoreAttribute[] = [];
  for (const spec of SCORE_ATTRIBUTES) {
    const a = byKey.get(spec.key);
    const score = clampScore(a?.score);
    if (score == null) return null; // los 4 atributos son obligatorios
    attributes.push({
      key: spec.key,
      label: spec.label,
      score,
      note: typeof a?.note === 'string' ? a.note.trim() : '',
    });
  }

  const total = Math.round(attributes.reduce((sum, a) => sum + a.score, 0) / attributes.length);
  const flagged = normalizeStringArray(parsed.flagged_ingredients);
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

  return { score: total, attributes, flagged_ingredients: flagged, summary, illegible: false };
}

/**
 * Texto persistible en user_supplements.bha_scan_summary: summary + desglose
 * por atributo. Compacto.
 */
export function buildScoreSummaryText(result: FunctionalScoreResult): string {
  const lines = result.attributes.map((a) => `• ${a.label}: ${a.score}${a.note ? ` — ${a.note}` : ''}`);
  return [result.summary, ...lines].filter(Boolean).join('\n').slice(0, 2000);
}
