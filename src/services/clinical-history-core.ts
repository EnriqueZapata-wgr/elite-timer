/**
 * Historia Clínica — núcleo PURO (sin react-native/supabase) para que la
 * lógica de agrupado y resumen ejecutivo sea testeable con vitest.
 * El I/O vive en clinical-history-service.ts (mismo patrón que
 * parameter-chart-model.ts vs ParameterChart.tsx).
 */
import {
  FUNCTIONAL_SYSTEMS,
  FUNCTIONAL_SYSTEM_BY_KEY,
  type FunctionalSystemKey,
} from '@/src/constants/functional-systems';

export interface ClinicalSymptom {
  id: string;
  user_id: string;
  system_key: FunctionalSystemKey;
  name: string;
  severity: number;
  notes: string | null;
  status: 'active' | 'resolved';
  first_seen: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SymptomLog {
  id: string;
  symptom_id: string;
  severity: number;
  note: string | null;
  logged_at: string;
}

export type SymptomsBySystem = Record<FunctionalSystemKey, ClinicalSymptom[]>;

/** Agrupa síntomas por sistema funcional, en el orden canónico de la matriz. */
export function groupSymptomsBySystem(symptoms: ClinicalSymptom[]): SymptomsBySystem {
  const out = {} as SymptomsBySystem;
  for (const sys of FUNCTIONAL_SYSTEMS) out[sys.key] = [];
  for (const s of symptoms) {
    if (out[s.system_key]) out[s.system_key].push(s);
  }
  return out;
}

export interface ExecutiveSummary {
  totalActive: number;
  totalResolved: number;
  /** Sistema con mayor carga (suma de severidades activas); null sin síntomas */
  focusSystem: FunctionalSystemKey | null;
  /** Línea legible para el header del expediente */
  headline: string;
}

/**
 * Resumen ejecutivo determinístico del expediente (sin IA): total de síntomas
 * activos, sistema con mayor carga y una línea legible para el header.
 */
export function buildExecutiveSummary(symptoms: ClinicalSymptom[]): ExecutiveSummary {
  const active = symptoms.filter(s => s.status === 'active');
  const resolved = symptoms.filter(s => s.status === 'resolved');

  if (active.length === 0) {
    return {
      totalActive: 0,
      totalResolved: resolved.length,
      focusSystem: null,
      headline: resolved.length > 0
        ? `Sin síntomas activos · ${resolved.length} resuelto${resolved.length === 1 ? '' : 's'}`
        : 'Expediente limpio — registra síntomas para construir tu historia',
    };
  }

  const load = new Map<FunctionalSystemKey, number>();
  for (const s of active) {
    load.set(s.system_key, (load.get(s.system_key) ?? 0) + s.severity);
  }
  let focusSystem: FunctionalSystemKey = active[0].system_key;
  let max = -1;
  // Orden canónico de la matriz para desempates estables
  for (const sys of FUNCTIONAL_SYSTEMS) {
    const v = load.get(sys.key) ?? 0;
    if (v > max) { max = v; focusSystem = sys.key; }
  }

  const sysName = FUNCTIONAL_SYSTEM_BY_KEY[focusSystem].name;
  return {
    totalActive: active.length,
    totalResolved: resolved.length,
    focusSystem,
    headline: `${active.length} síntoma${active.length === 1 ? '' : 's'} activo${active.length === 1 ? '' : 's'} · mayor carga en ${sysName}`,
  };
}
