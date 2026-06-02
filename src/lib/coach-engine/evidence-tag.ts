// Coach Engine — Etiquetado de Nivel de Evidencia
// Brief §3 — Jerarquía de evidencia (5 niveles).
// System prompt Bloque 3: toda recomendación clínico-colindante lleva
// "[Nivel N]" interno que rige cuánta confianza se expresa al cliente.

import { supabase } from '@/src/lib/supabase';
import type { EvidenceLevel } from './types';

/** Patrón canónico de etiqueta de evidencia: "[Nivel N]" (N = 1..5). */
const EVIDENCE_TAG_REGEX = /\[Nivel\s+([1-5])\]/i;

/** Entrada del catálogo curado de evidencia (tabla evidence_catalog, sin RLS de owner). */
export interface EvidenceCatalogEntry {
  id: string;
  claim: string;
  level: EvidenceLevel;
  mechanism_evidence: string | null;
  human_evidence: string | null;
  category: string | null;
}

/**
 * Detecta si un texto del coach ya incluye la etiqueta "[Nivel N]".
 * Implementa el formato de cita del Bloque 3 ("[Nivel N]" al inicio o en línea).
 */
export function hasEvidenceTag(text: string): boolean {
  return EVIDENCE_TAG_REGEX.test(text);
}

/**
 * Extrae el nivel de evidencia (1..5) embebido en el texto, o null si no hay tag.
 * Implementa el parseo del marcador del Bloque 3.
 */
export function extractEvidenceLevel(text: string): EvidenceLevel | null {
  const match = text.match(EVIDENCE_TAG_REGEX);
  if (!match) return null;
  return Number(match[1]) as EvidenceLevel;
}

/**
 * Valida que una recomendación clínico-colindante lleve etiqueta de nivel.
 * Bloque 3 obliga a citar nivel; este enforcement marca el GAP de etiqueta
 * sin reescribir el texto (la decisión de re-pedir al LLM queda en el caller).
 */
export async function enforceEvidenceTag(
  text: string,
): Promise<{ valid: boolean; missing?: string }> {
  if (hasEvidenceTag(text)) return { valid: true };
  return { valid: false, missing: 'evidence-level-tag' };
}

/**
 * Busca un claim en el catálogo curado de evidencia por tópico aproximado.
 * Bloque 3 / jerarquía de fuentes: alimenta la cita de nivel con contenido
 * curado. NOTA: evidence_catalog no tiene columna `topic`; se busca por
 * `claim` y `category` (ver flag en COWORK_REPORT).
 */
export async function lookupEvidenceInCatalog(
  topic: string,
): Promise<EvidenceCatalogEntry | null> {
  const pattern = `%${topic}%`;
  const { data, error } = await supabase
    .from('evidence_catalog')
    .select('id, claim, level, mechanism_evidence, human_evidence, category')
    .or(`claim.ilike.${pattern},category.ilike.${pattern}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`evidence-tag: lookupEvidenceInCatalog failed — ${error.message}`);
  }
  return (data as EvidenceCatalogEntry) ?? null;
}

// TEST: hasEvidenceTag('Esto tiene [Nivel 3] evidencia') === true
// TEST: hasEvidenceTag('Sin tag') === false
// TEST: extractEvidenceLevel('[Nivel 5]') === 5
// TEST: extractEvidenceLevel('sin nivel') === null
// TEST: enforceEvidenceTag('Recomendación sin tag') resolves { valid: false, missing: 'evidence-level-tag' }
// TEST: enforceEvidenceTag('[Nivel 1] sólida') resolves { valid: true }
// INTEGRATION TEST: lookupEvidenceInCatalog('metilfolato') → entrada o null vía Supabase
