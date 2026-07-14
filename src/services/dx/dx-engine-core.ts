/**
 * Mi Diagnóstico Funcional — lógica PURA del motor (Fase 2).
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 * Aquí vive TODO lo determinístico y auditable:
 *   · parseo + validación de la respuesta JSON de ARGOS (raíces controladas,
 *     clamp de severity/confidence, dedup) — mitiga alucinación (riesgo #3),
 *   · derivación de DxSourcePresence desde conteos/booleans de la cosecha,
 *   · decisión de frescura del cache (¿hay cosecha nueva desde la versión vigente?).
 *
 * El I/O (queries a Supabase, callAnthropic, persistir versión, emitir evento)
 * vive en dx-engine.ts, que NO se testea en node.
 */
import { isValidRoot, type InterventionRoot } from '@/src/constants/intervention-vocab';
import {
  HC_BASE_IDS,
  HC_INTEGRAL_ID,
  HC_AREA_IDS,
} from '@/src/constants/historia-clinica-questionnaires';
import type { DxSourcePresence } from './dx-quality-core';

/** Una raíz detectada ya validada contra el vocabulario controlado. */
export interface DxRoot {
  root_key: InterventionRoot;
  /** 1-5 (entero). */
  severity: number;
  /** 0-1. */
  confidence: number;
  /** Fuentes que sustentan la raíz (texto libre corto de ARGOS). */
  sources: string[];
}

export interface ParsedDx {
  roots: DxRoot[];
  summary_text: string;
}

/** Clampea severity a entero 1-5 (default 3 si no es número finito). */
export function clampSeverity(v: unknown): number {
  if (v == null || v === '') return 3;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Clampea confidence a 0-1 (default 0.5 si no es número finito). */
export function clampConfidence(v: unknown): number {
  if (v == null || v === '') return 0.5;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/**
 * Extrae el primer bloque JSON de un string (tolera ```json fences y prosa
 * alrededor). Devuelve el substring del `{` inicial al `}` balanceado, o null.
 */
export function extractJsonBlock(raw: string): string | null {
  if (!raw) return null;
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeSources(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const s of v) {
    if (typeof s === 'string' && s.trim()) out.push(s.trim());
  }
  return out;
}

/**
 * Parsea + valida la respuesta de ARGOS. NO lanza: ante cualquier problema
 * devuelve roots=[] y el summary que se haya podido rescatar.
 *
 * Reglas duras aplicadas aquí (no confían en el modelo):
 *  · root_key SOLO del vocabulario controlado (isValidRoot) — el resto se descarta.
 *  · dedup por root_key (gana la primera aparición).
 *  · severity → entero 1-5, confidence → 0-1 (clamp).
 */
export function parseArgosDxResponse(raw: string): ParsedDx {
  const empty: ParsedDx = { roots: [], summary_text: '' };
  const block = extractJsonBlock(raw ?? '');
  if (!block) return empty;

  let parsed: any;
  try {
    parsed = JSON.parse(block);
  } catch {
    return empty;
  }
  if (!parsed || typeof parsed !== 'object') return empty;

  const summary_text = typeof parsed.summary_text === 'string' ? parsed.summary_text.trim() : '';

  const rawRoots = Array.isArray(parsed.roots_detected) ? parsed.roots_detected : [];
  const seen = new Set<string>();
  const roots: DxRoot[] = [];
  for (const r of rawRoots) {
    if (!r || typeof r !== 'object') continue;
    const key = (r as any).root_key;
    if (typeof key !== 'string' || !isValidRoot(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    roots.push({
      root_key: key,
      severity: clampSeverity((r as any).severity),
      confidence: clampConfidence((r as any).confidence),
      sources: normalizeSources((r as any).sources),
    });
  }

  return { roots, summary_text };
}

// ── Derivación de presencia de fuentes (para computeDxQuality) ───────────────

/** Señales crudas cosechadas por el motor (conteos + booleans). */
export interface RawSourceSignals {
  hasBasicHistory: boolean;
  hasIntegralQuestionnaire: boolean;
  areaQuestionnairesCount: number;
  hasConsistentHabits: boolean;
  labsCount: number;
  geneticsCount: number;
  // Densidad real de data (hotfix 2da pasada): lo que el motor ya cosechaba
  // para el prompt ahora también puntúa el nivel de calidad.
  bravermanDone: boolean;
  quizzesCount: number;
  /** clinical_symptoms activos + síntomas aislados. */
  symptomsCount: number;
  padecimientosCount: number;
  supplementsCount: number;
}

/** Traduce las señales crudas al shape que consume computeDxQuality. */
export function deriveSourcePresence(s: RawSourceSignals): DxSourcePresence {
  return {
    hasBasicHistory: s.hasBasicHistory,
    hasIntegralQuestionnaire: s.hasIntegralQuestionnaire,
    areaQuestionnairesCount: Math.max(0, s.areaQuestionnairesCount | 0),
    hasConsistentHabits: s.hasConsistentHabits,
    hasLabs: s.labsCount > 0,
    hasGenetics: s.geneticsCount > 0,
    hasBraverman: s.bravermanDone,
    quizzesCount: Math.max(0, s.quizzesCount | 0),
    symptomsCount: Math.max(0, s.symptomsCount | 0),
    padecimientosCount: Math.max(0, s.padecimientosCount | 0),
    supplementsCount: Math.max(0, s.supplementsCount | 0),
  };
}

/**
 * Cuenta cuántas sub-áreas (de la lista controlada) están completas, dado el
 * set de categorías respondidas en historia_clinica.
 */
export function countCompletedAreas(completedKeys: string[], areaKeys: readonly string[]): number {
  const done = new Set(completedKeys);
  let n = 0;
  for (const k of areaKeys) if (done.has(k)) n++;
  return n;
}

// ── Frescura de cache ────────────────────────────────────────────────────────

/**
 * ¿La versión vigente sigue siendo válida (no hay cosecha nueva)?
 *  · Sin DX previo → false (hay que generar).
 *  · Sin timestamp de fuentes (nada cargado) → true (nada que resintetizar).
 *  · fresh sii el dato más reciente NO es posterior a la creación del DX vigente.
 */
export function isDxFresh(
  currentDxCreatedAt: string | null,
  maxSourceTimestamp: string | null,
): boolean {
  if (!currentDxCreatedAt) return false;
  if (!maxSourceTimestamp) return true;
  const dxT = new Date(currentDxCreatedAt).getTime();
  const srcT = new Date(maxSourceTimestamp).getTime();
  if (!Number.isFinite(dxT) || !Number.isFinite(srcT)) return false;
  return srcT <= dxT;
}

/**
 * Reconstruye DxSourcePresence desde el sources_snapshot persistido (Card A).
 * Pura → evita recosechar Supabase sólo para mostrar el "qué te falta".
 */
export function presenceFromSnapshot(snapshot: unknown): DxSourcePresence {
  const s = (snapshot ?? {}) as any;
  const completed: string[] = Array.isArray(s?.levantamientos?.completed)
    ? s.levantamientos.completed.filter((x: unknown) => typeof x === 'string')
    : [];
  const baseDone = (HC_BASE_IDS as readonly string[]).some((id) => completed.includes(id));
  const count = (v: unknown): number => Number((v as any)?.count ?? 0) || 0;
  return deriveSourcePresence({
    hasBasicHistory: baseDone || completed.length > 0,
    hasIntegralQuestionnaire: completed.includes(HC_INTEGRAL_ID),
    areaQuestionnairesCount: countCompletedAreas(completed, HC_AREA_IDS),
    hasConsistentHabits: completed.includes('habitos_nutricionales'),
    labsCount: count(s?.labs),
    geneticsCount: 0,
    bravermanDone: s?.braverman?.present === true,
    quizzesCount: count(s?.quizzes),
    symptomsCount: count(s?.sintomas) + count(s?.sintomas_aislados),
    padecimientosCount: count(s?.padecimientos),
    supplementsCount: count(s?.suplementos),
  });
}

// ── Regalo del 1er DX (DX F4) ────────────────────────────────────────────────

/**
 * Regla de negocio del swap (F4): todo user que NUNCA ha generado un
 * functional_dx recibe su primera generación GRATIS (regalo de bienvenida al
 * modelo DX→Intervenciones). El cobro es server-side por requestType
 * (argos-proxy lee proton_action_costs), así que la gratuidad se implementa
 * con un action_key dedicado seedeado a 0 H+ (migración 186).
 */
export const DX_GENERATION_FIRST_ACTION_KEY = 'dx_generation_first';

/**
 * requestType a usar en la generación: primera vez (sin ningún functional_dx,
 * vigente o histórico — la tabla es append-only) → action gratuito.
 */
export function resolveDxGenerationAction(
  hasAnyDx: boolean,
  paidActionKey: string,
): string {
  return hasAnyDx ? paidActionKey : DX_GENERATION_FIRST_ACTION_KEY;
}

/**
 * Aplica la regla al quote de la UI: primera generación → costo 0 +
 * isFirstFree (la Card A muestra "Tu primer diagnóstico es un regalo").
 */
export function applyFirstFreeQuote(
  baseCost: number,
  hasAnyDx: boolean,
): { cost: number; isFirstFree: boolean } {
  if (hasAnyDx) return { cost: baseCost, isFirstFree: false };
  return { cost: 0, isFirstFree: true };
}

/** Máximo timestamp ISO de una lista (ignora null/inválidos). null si vacía. */
export function maxTimestamp(timestamps: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  let bestIso: string | null = null;
  for (const t of timestamps) {
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (!Number.isFinite(ms)) continue;
    if (best === null || ms > best) {
      best = ms;
      bestIso = t;
    }
  }
  return bestIso;
}
