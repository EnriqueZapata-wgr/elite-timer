/**
 * day-state-core (Batch 4 · #30 · F1) — UN estado hecho/no-hecho del día.
 *
 * HOY y AGENDA derivan ambos de Mi Protocolo, pero leían el estado "hecho" de
 * fuentes distintas (intervention_completions / actividad verificada vs
 * agenda_event_logs.status) → dos verdades del mismo día = drift. Este núcleo
 * puro colapsa las fuentes con un merge OR determinístico: hecho en CUALQUIER
 * superficie ⇒ hecho en todas. Nunca des-marca (la instancia pending no pisa
 * una compleción real — dato del user sagrado).
 */
import { canonicalConcept } from '@/src/services/interventions/intervention-agenda-core';

/** Instancia diaria de agenda_event_logs (join con agenda_events). */
export interface DayLogEntry {
  name: string;
  interventionKey?: string | null;
  status: string; // pending | completed | skipped | snoozed
}

/** Índice de "hecho" derivado de los logs del día. */
export interface DoneIndex {
  /** intervention_keys con instancia completed. */
  keys: Set<string>;
  /** conceptos canónicos (nombre) con instancia completed. */
  concepts: Set<string>;
}

export function buildDoneIndex(logs: DayLogEntry[]): DoneIndex {
  const keys = new Set<string>();
  const concepts = new Set<string>();
  for (const log of logs) {
    if (log.status !== 'completed') continue;
    if (log.interventionKey) keys.add(log.interventionKey);
    if (log.name) concepts.add(canonicalConcept(log.name));
  }
  return { keys, concepts };
}

export interface DoneMergeableItem {
  name: string;
  completed: boolean;
  /** intervention_key si el item viene del motor (opcional). */
  interventionKey?: string | null;
}

/**
 * Merge OR in-place: marca `completed=true` los items cuyo key o concepto tenga
 * instancia completed en los logs del día. Items ya completed quedan intactos
 * (nunca des-marca). Devuelve la misma referencia para encadenar.
 */
export function applyDoneFromLogs<T extends DoneMergeableItem>(items: T[], idx: DoneIndex): T[] {
  for (const item of items) {
    if (item.completed) continue;
    if (item.interventionKey && idx.keys.has(item.interventionKey)) {
      item.completed = true;
      continue;
    }
    if (item.name && idx.concepts.has(canonicalConcept(item.name))) {
      item.completed = true;
    }
  }
  return items;
}
