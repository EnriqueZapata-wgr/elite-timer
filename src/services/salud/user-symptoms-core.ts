/**
 * user-symptoms-core — lógica PURA del modelo unificado de síntomas (B3).
 * Sin supabase/react-native → testeable node-only. El servicio hace el I/O.
 *
 * Un solo modelo de síntoma (fusión de clinical_symptoms + aislados):
 *  · system_key opcional (null = síntoma suelto).
 *  · started_at / resolved_at → duración calculada.
 *  · is_active: activo vs resuelto.
 */
import type { FunctionalSystemKey } from '@/src/constants/functional-systems';

export interface UserSymptom {
  id: string;
  user_id: string;
  name: string;
  severity: number;                 // 1-5
  system_key: FunctionalSystemKey | null;
  started_at: string;               // ISO
  resolved_at: string | null;       // ISO o null (activo)
  is_active: boolean;
  note: string | null;
  source_kind: 'sistema' | 'aislado';
  created_at: string;
  updated_at: string;
}

export interface NewSymptomInput {
  name: string;
  severity: number;
  system_key?: FunctionalSystemKey | null;
  note?: string | null;
  started_at?: string;              // default: ahora (lo pone el servicio)
}

export const SYMPTOM_NAME_MAX_LEN = 80;
export const SYMPTOM_NOTE_MAX_LEN = 280;

/** Valida y normaliza el input de un síntoma nuevo. */
export function validateSymptomInput(input: NewSymptomInput): { ok: boolean; error?: string } {
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'Escribe qué sientes.' };
  if (name.length > SYMPTOM_NAME_MAX_LEN) return { ok: false, error: 'El nombre es muy largo.' };
  if (!Number.isInteger(input.severity) || input.severity < 1 || input.severity > 5) {
    return { ok: false, error: 'La severidad va de 1 a 5.' };
  }
  if (input.note && input.note.length > SYMPTOM_NOTE_MAX_LEN) {
    return { ok: false, error: 'La nota es muy larga.' };
  }
  return { ok: true };
}

/** Duración en días entre started_at y resolved_at (o ahora si sigue activo). */
export function durationDays(symptom: Pick<UserSymptom, 'started_at' | 'resolved_at'>, now: Date): number {
  const start = new Date(symptom.started_at);
  if (isNaN(start.getTime())) return 0;
  const end = symptom.resolved_at ? new Date(symptom.resolved_at) : now;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return Math.max(0, days);
}

/** Etiqueta legible de duración: "3 días", "hoy", "2 semanas", "1 mes". */
export function durationLabel(symptom: Pick<UserSymptom, 'started_at' | 'resolved_at'>, now: Date): string {
  const days = durationDays(symptom, now);
  if (days === 0) return 'hoy';
  if (days === 1) return '1 día';
  if (days < 14) return `${days} días`;
  if (days < 60) return `${Math.floor(days / 7)} semanas`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 mes' : `${months} meses`;
}

/** Agrupa por sistema (solo los que tienen system_key). Los sueltos van aparte. */
export function groupBySystem(symptoms: UserSymptom[]): Record<string, UserSymptom[]> {
  const out: Record<string, UserSymptom[]> = {};
  for (const s of symptoms) {
    if (!s.system_key) continue;
    (out[s.system_key] ??= []).push(s);
  }
  return out;
}

/** Partición activos / resueltos (activos primero, por severidad desc). */
export function partitionByStatus(symptoms: UserSymptom[]): { active: UserSymptom[]; resolved: UserSymptom[] } {
  const active = symptoms.filter((s) => s.is_active).sort((a, b) => b.severity - a.severity);
  const resolved = symptoms
    .filter((s) => !s.is_active)
    .sort((a, b) => (b.resolved_at ?? '').localeCompare(a.resolved_at ?? ''));
  return { active, resolved };
}

// ── Reconstrucción de los dos conjuntos que el DX espera (crítico) ───────────

/**
 * El dx-engine consumía DOS conjuntos separados (por sistema activos + aislados).
 * Estos helpers los reconstruyen desde user_symptoms para que el DX calcule IGUAL:
 *  · dxSystemSymptoms: activos CON system_key (peso medio).
 *  · dxAisladoSymptoms: los 'aislado' recientes (peso bajo), límite 50.
 */
export function dxSystemSymptoms(symptoms: UserSymptom[]): { name: string; system_key: string; severity: number }[] {
  return symptoms
    .filter((s) => s.is_active && s.system_key)
    .map((s) => ({ name: s.name, system_key: s.system_key as string, severity: s.severity }));
}

export function dxAisladoSymptoms(symptoms: UserSymptom[], limit = 50): { tag: string; severity: number }[] {
  return symptoms
    .filter((s) => s.source_kind === 'aislado' || !s.system_key)
    .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))
    .slice(0, limit)
    .map((s) => ({ tag: s.name, severity: s.severity }));
}
