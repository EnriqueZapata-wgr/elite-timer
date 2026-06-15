/**
 * Capa 3 del parser v2 — procesamiento post-LLM (función pura, testeable).
 *
 * Toma los items crudos del LLM ({key, value, unit_in_document, confidence,
 * raw_text_snippet}) y los corre por el pipeline:
 *   Capa 2   normalizar a unidad canónica (normalizeLabValue)
 *   Capa 2.5 auto-derivar params calculados (autoDeriveParams)
 *   Capa 3   validar contra rangos clínicos absolutos (isLabValueValid)
 *
 * Devuelve la lista lista para la pantalla de confirmación (Capa 4). NO escribe a DB.
 */
import { normalizeLabValue } from '@/src/constants/lab-unit-converters';
import { isLabValueValid, LAB_ABSOLUTE_RANGES } from '@/src/constants/lab-clinical-ranges';
import { autoDeriveParams } from '@/src/services/edad-atp/auto-derive-service';

export type Confidence = 'high' | 'medium' | 'low';

export interface RawParserItem {
  key: string;
  value: number;
  unit_in_document?: string | null;
  confidence?: Confidence;
  raw_text_snippet?: string;
}

export interface ProcessedItem {
  key: string;
  rawValue: number;
  valueCanonical: number;
  unitInDocument: string | null;
  unitCanonical: string;
  conversionMethod: 'explicit' | 'heuristic' | 'identity';
  confidence: Confidence;
  rawTextSnippet: string | null;
  passedValidation: boolean;
  /** Rango clínico absoluto del biomarker, si existe (para mostrar al usuario). */
  range?: { min: number; max: number; unit: string };
}

export interface DerivedItem {
  key: string;
  value: number;
}

/** Candidato de un biomarker detectado en una foto concreta (multi-foto). */
export interface DupCandidate {
  value: number;
  unit: string;
  sourceLabel: string;
  confidence: Confidence;
  passedValidation: boolean;
}

export interface ProcessParserResult {
  items: ProcessedItem[];
  derived: DerivedItem[];
}

/** ¿Hay que mostrar la pantalla de confirmación? Solo si algo no es high+válido. */
export function needsConfirmation(result: ProcessParserResult): boolean {
  return result.items.some((it) => it.confidence !== 'high' || !it.passedValidation);
}

export function processParserItems(raw: RawParserItem[]): ProcessParserResult {
  const items: ProcessedItem[] = [];

  for (const item of raw ?? []) {
    if (!item || typeof item.key !== 'string') continue;
    const rawValue = item.value;
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;

    // Capa 2: normalizar a unidad canónica.
    const normalized = normalizeLabValue(item.key, rawValue, item.unit_in_document ?? null);

    // Confianza: explícito > heurístico. Si se usó heurística y el LLM dijo "high", bajar a "medium".
    let confidence: Confidence = item.confidence ?? 'medium';
    if (normalized.method === 'heuristic' && confidence === 'high') confidence = 'medium';

    items.push({
      key: item.key,
      rawValue,
      valueCanonical: normalized.value,
      unitInDocument: item.unit_in_document ?? null,
      unitCanonical: normalized.unitTo,
      conversionMethod: normalized.method,
      confidence,
      rawTextSnippet: item.raw_text_snippet ?? null,
      passedValidation: isLabValueValid(item.key, normalized.value),
      range: LAB_ABSOLUTE_RANGES[item.key],
    });
  }

  // Capa 2.5: auto-derivar a partir de los valores canónicos (último gana si hay duplicados).
  const valuesMap: Record<string, number> = {};
  for (const it of items) valuesMap[it.key] = it.valueCanonical;
  const derivedMap = autoDeriveParams(valuesMap);
  const derived: DerivedItem[] = Object.entries(derivedMap).map(([key, value]) => ({ key, value }));

  return { items, derived };
}
