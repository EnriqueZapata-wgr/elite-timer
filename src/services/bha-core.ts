/**
 * Scanner BHA (Biohacker Approved) — lógica PURA (Sprint SUPS+BHA, Bloque 4).
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 * Aquí vive el prompt de criterios, el parseo defensivo del JSON del LLM y la
 * normalización del resultado. El I/O (callAnthropic, persistir sello) vive en
 * bha-service.ts.
 *
 * DOCTRINA (no negociable):
 *  · Suplementos son REGISTRO, no recomendación — el scanner evalúa CALIDAD de
 *    lo que el usuario YA toma; nunca sugiere comprar/tomar nada.
 *  · Veredicto BINARIO (approved/rejected). Cero base de datos precurada:
 *    LLM multimodal + OCR implícito aplicando los criterios de Mariana.
 */
import { extractJsonBlock } from '@/src/services/dx/dx-engine-core';

export type BhaVerdict = 'approved' | 'rejected';

export interface BhaScanResult {
  verdict: BhaVerdict;
  /** Razones del veredicto (bullets cortos, en español). */
  reasons: string[];
  /** Ingredientes específicos que dispararon flags. */
  flagged_ingredients: string[];
  /** Resumen de 1-3 oraciones. */
  summary: string;
}

/**
 * Criterios del sello BHA — system prompt del scan.
 *
 * ⚠️ Cowork/Mariana amplían criterios aquí. Fuente actual: decisión aprobada #5
 * (FABLE_DECISIONES_APROBADAS_2026-07-11). La memoria doctrinal extendida
 * `project_biohacker_approved_bha_scanner` no estaba disponible al construirlo;
 * cuando Cowork la recupere, se agregan criterios a las listas RECHAZAN/APRUEBAN
 * sin tocar el resto del prompt.
 */
export const BHA_CRITERIA_PROMPT = `Eres el evaluador del sello BHA (Biohacker Approved) de ATP, bajo criterios de medicina funcional de Mariana Zapata (PhD en Ciencias Biomédicas).

Recibes la FOTO de la etiqueta de un suplemento o alimento empaquetado. Lee la etiqueta (OCR implícito: ingredientes, formas químicas, excipientes, endulzantes) y emite un veredicto BINARIO.

CRITERIOS QUE RECHAZAN (cualquiera presente → rejected):
- Colorantes artificiales (ej. Rojo 40, Amarillo 5/6, Azul 1, tartrazina, dióxido de titanio como colorante).
- Azúcares añadidos (azúcar, jarabe de maíz de alta fructosa, maltodextrina como endulzante principal).
- Endulzantes artificiales: sucralosa, aspartame, acesulfame-K, sacarina.
- Formas baratas / baja biodisponibilidad cuando existen formas superiores:
  · óxido de magnesio (vs glicinato/bisglicinato/citrato/malato)
  · cianocobalamina (vs metilcobalamina/adenosilcobalamina)
  · ácido fólico sintético (vs metilfolato/folato natural)
  · óxido de zinc (vs picolinato/bisglicinato), carbonato de calcio como fuente única.
- Rellenos innecesarios EXCESIVOS (talco, lista larga de excipientes sin función clara).

CRITERIOS QUE APRUEBAN:
- Formas quelatadas / premium (bisglicinatos, metiladas, liposomales, citratos/malatos).
- Conservantes naturales OK (tocoferoles, extracto de romero, ácido ascórbico).
- Excipientes mínimos razonables (celulosa vegetal, cápsula vegetal, estearato de magnesio en cantidad menor NO rechaza por sí solo).
- Endulzantes naturales razonables (stevia, monk fruit, alulosa) NO rechazan por sí solos.

REGLAS DEL VEREDICTO:
- BINARIO: 'approved' o 'rejected'. Sin términos medios.
- Si la etiqueta es ilegible, está incompleta o hay duda razonable sobre los ingredientes → 'rejected' con reason exacta: "etiqueta ilegible, re-escanea".
- Evalúa el producto SEGÚN SU PROPÓSITO (electrolitos con sodio es correcto, no penalices).
- Si el producto es comida empaquetada, aplica los mismos criterios de limpieza de ingredientes.

PROHIBICIONES (doctrina ATP — registro, no recomendación):
- NUNCA recomiendes comprar, tomar, suspender ni sustituir ningún suplemento.
- NO opines sobre dosis clínicas ni pautas de toma.
- NO des consejo médico. El sello evalúa CALIDAD DE FORMULACIÓN, nada más.
- Si mencionas ayuno: el café bulletproof (BPC) NO rompe el ayuno metabólico según la doctrina ATP — no lo contradigas.

Responde SOLO con JSON válido (sin backticks ni markdown, en español):
{"verdict":"approved","reasons":["razón corta 1","razón corta 2"],"flagged_ingredients":["ingrediente exacto"],"summary":"1-3 oraciones que expliquen el veredicto."}`;

/** Instrucción user del scan (acompaña a la imagen). */
export function buildBhaUserText(productName?: string | null, brand?: string | null): string {
  const parts = ['Evalúa esta etiqueta para el sello BHA.'];
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

/**
 * Parsea + valida la respuesta del LLM. NO lanza: ante cualquier problema
 * devuelve null (el service lo traduce a error re-escaneable). Reglas duras:
 *  · verdict SOLO 'approved'|'rejected' (veredicto binario, no confía en el modelo),
 *  · reasons/flagged_ingredients → arrays de strings limpios,
 *  · summary → string (fallback: primera reason o '').
 */
export function parseBhaResponse(raw: string): BhaScanResult | null {
  const block = extractJsonBlock(raw ?? '');
  if (!block) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(block);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const verdict = parsed.verdict;
  if (verdict !== 'approved' && verdict !== 'rejected') return null;

  const reasons = normalizeStringArray(parsed.reasons);
  const flagged = normalizeStringArray(parsed.flagged_ingredients);
  const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
    ? parsed.summary.trim()
    : (reasons[0] ?? '');

  return { verdict, reasons, flagged_ingredients: flagged, summary };
}

/**
 * Texto persistible en user_supplements.bha_scan_summary (razones del sello).
 * Summary + bullets de reasons, compacto.
 */
export function buildBhaSummaryText(result: BhaScanResult): string {
  const bullets = result.reasons.map((r) => `• ${r}`).join('\n');
  return [result.summary, bullets].filter(Boolean).join('\n').slice(0, 2000);
}

/** ¿El scan indica etiqueta ilegible (pedir re-escaneo)? */
export function isIllegibleLabel(result: BhaScanResult): boolean {
  return result.verdict === 'rejected'
    && result.reasons.some((r) => r.toLowerCase().includes('ilegible'));
}
