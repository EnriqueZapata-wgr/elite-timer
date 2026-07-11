/**
 * Motor de Intervenciones — núcleo PURO y DETERMINÍSTICO (doctrina Humby: el
 * match NO usa IA). Sin react-native/supabase → testeable con vitest.
 *
 * El I/O (leer DX, persistir sugeridas, activar) vive en intervention-service.ts
 * (Fase 3). ARGOS solo agrega, opcionalmente, la narrativa "por qué" encima del
 * resultado (requestType intervention_rationale) — nunca decide el match.
 *
 * Piezas:
 *  - resolveInterventionDef(row): resuelve la definición de una intervención del
 *    user, venga del catálogo curado o de custom_definition. Deja HOY/AGENDA/UI
 *    agnósticos a la fuente.
 *  - matchInterventions(dxRoots, profile): cruza raíces del DX contra el catálogo,
 *    devuelve { universals, suggestions } jerarquizadas por semáforo.
 *  - computeUniversalTime(circadian, schedule): timing de universales circadianos.
 */
import {
  INTERVENTIONS_CATALOG,
  INTERVENTION_BY_KEY,
  UNIVERSAL_INTERVENTIONS,
  type Intervention,
  type Priority,
} from '@/src/constants/interventions-catalog';
import type { InterventionCategory, InterventionRoot } from '@/src/constants/intervention-vocab';

// ── Definición resuelta (fuente-agnóstica) ───────────────────────────────────

export interface ResolvedInterventionDef {
  key: string;
  name: string;
  how: string;
  benefit: string;
  categories: InterventionCategory[];
  roots: InterventionRoot[];
  isCustom: boolean;
}

/** Forma mínima de una fila de user_interventions que el resolver necesita. */
export interface UserInterventionRowLike {
  intervention_key: string;
  is_custom?: boolean;
  custom_definition?: Partial<ResolvedInterventionDef> | null;
}

/**
 * Resuelve la definición de una intervención del user: del catálogo si el key es
 * curado; de custom_definition si es custom. Devuelve null si no se puede resolver
 * (key desconocido sin definición custom → dato corrupto, se ignora aguas arriba).
 */
export function resolveInterventionDef(
  row: UserInterventionRowLike,
): ResolvedInterventionDef | null {
  if (row.is_custom) {
    const d = row.custom_definition;
    if (!d || !d.name) return null;
    return {
      key: row.intervention_key,
      name: d.name,
      how: d.how ?? '',
      benefit: d.benefit ?? '',
      categories: d.categories ?? [],
      roots: d.roots ?? [],
      isCustom: true,
    };
  }
  const cat = INTERVENTION_BY_KEY[row.intervention_key];
  if (!cat) return null;
  return {
    key: cat.key,
    name: cat.name,
    how: cat.how,
    benefit: cat.benefit,
    categories: cat.categories,
    roots: cat.roots,
    isCustom: false,
  };
}

// ── Match DX → intervenciones ────────────────────────────────────────────────

export interface DxRoot {
  root_key: InterventionRoot;
  severity: number;      // 1-5
  confidence?: number;   // 0-1 (default 1)
}

export interface UserProfileLike {
  age?: number;
  sex?: 'male' | 'female' | null;
  chronotype?: string | null;
}

export interface ScoredIntervention {
  intervention: Intervention;
  score: number;
  matchedRoots: InterventionRoot[];
}

export interface MatchResult {
  /** Universales: siempre presentes (fallback garantizado). */
  universals: Intervention[];
  /** Sugeridas: intervenciones curadas cuyas raíces intersecan el DX, jerarquizadas. */
  suggestions: ScoredIntervention[];
}

const PRIORITY_WEIGHT: Record<Priority, number> = { 1: 3, 2: 2, 3: 1 };

/**
 * Cruza las raíces del DX contra el catálogo. Determinístico:
 *  - Universales → siempre (independiente del DX).
 *  - Sugeridas → curadas (no universales) con al menos una raíz en común con el DX.
 *  - Score = base por prioridad clínica + Σ (severidad × confianza) de raíces en común.
 *  - Orden: score desc, luego prioridad asc (🔴 antes que 🟢), luego nombre.
 *  - GATING CLÍNICO: entradas con `requiresClinicalValidation` (pendientes de firma
 *    de Mariana — task #9, ella quita el flag al firmar) NUNCA salen del motor:
 *    ni en `suggestions` ni en `universals`. El user SÍ puede tenerlas/activarlas
 *    manualmente (resolveInterventionDef las resuelve normal — data existente intacta).
 */
export function matchInterventions(
  dxRoots: DxRoot[],
  _profile: UserProfileLike = {},
  catalog: Intervention[] = INTERVENTIONS_CATALOG,
): MatchResult {
  const rootSeverity = new Map<InterventionRoot, number>();
  for (const r of dxRoots) {
    const weighted = r.severity * (r.confidence ?? 1);
    // si la misma raíz llega repetida, nos quedamos con la de mayor peso
    rootSeverity.set(r.root_key, Math.max(rootSeverity.get(r.root_key) ?? 0, weighted));
  }

  const universals = catalog.filter(i => i.isUniversal && !i.requiresClinicalValidation);

  const suggestions: ScoredIntervention[] = [];
  for (const iv of catalog) {
    if (iv.isUniversal) continue;
    if (iv.requiresClinicalValidation) continue; // gating clínico: no se sugiere activamente
    const matchedRoots = iv.roots.filter(r => rootSeverity.has(r));
    if (matchedRoots.length === 0) continue;
    let score = PRIORITY_WEIGHT[iv.priority] * 10;
    for (const r of matchedRoots) score += rootSeverity.get(r) ?? 0;
    suggestions.push({ intervention: iv, score, matchedRoots });
  }

  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.intervention.priority !== b.intervention.priority) {
      return a.intervention.priority - b.intervention.priority;
    }
    return a.intervention.name.localeCompare(b.intervention.name);
  });

  return { universals, suggestions };
}

// ── Timing de universales circadianos ────────────────────────────────────────

export interface ChronotypeSchedule {
  wake_time?: string | null;  // 'HH:MM'
  sleep_time?: string | null; // 'HH:MM'
}

/** Minutos de preparación antes de dormir (inicio de rutina de sueño). dx-f3: 30 → 60. */
export const SLEEP_PREP_MINUTES = 60;

/**
 * Calcula el HH:MM de un universal circadiano desde el horario del cronotipo.
 *  - 'sleep' → SLEEP_PREP_MINUTES antes de sleep_time (inicio de rutina de sueño).
 *  - 'eat'   → wake_time (apertura de ventana de alimentación).
 * Devuelve null si falta el horario base (el motor deja computed_time en null).
 */
export function computeUniversalTime(
  circadian: 'sleep' | 'eat',
  schedule: ChronotypeSchedule,
): string | null {
  if (circadian === 'eat') return schedule.wake_time ?? null;
  const sleep = schedule.sleep_time;
  if (!sleep) return null;
  return subtractMinutes(sleep, SLEEP_PREP_MINUTES);
}

/** Resta minutos a un 'HH:MM' con wrap de 24h. Exportada para tests. */
export function subtractMinutes(hhmm: string, minutes: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  let total = h * 60 + min - minutes;
  total = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Re-export para conveniencia de los consumidores (Fase 3). */
export { UNIVERSAL_INTERVENTIONS };
