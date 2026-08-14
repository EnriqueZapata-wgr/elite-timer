/**
 * OLA 4 · Estado de completado de las evaluaciones (Anexo C, pieza 2).
 *
 * Hoy cada hub reimplementa su propia consulta: quizzes.tsx lee
 * functional_quiz_results, el hub de Edad ATP lee otra tabla, el de pruebas
 * cinemáticas otra. Seis hubs, seis maneras de preguntar lo mismo.
 *
 * Aquí queda UNA sola forma: se planea una consulta por tabla (no una por
 * evaluación) y la regla de completado se aplica en memoria. Módulo PURO:
 * sin supabase y sin react, para poder testear la lógica que importa.
 */
import { ASSESSMENTS } from '@/src/constants/assessments/registry';
import type { Assessment } from '@/src/constants/assessments/types';

/** Renglón genérico tal como vuelve de la base. */
export type Row = Record<string, unknown>;

export interface CompletionQuery {
  table: string;
  /** Columnas que hay que traer para resolver todas las reglas de esa tabla. */
  columns: string[];
}

export interface CompletionState {
  done: boolean;
  /** Fecha de la última vez, en ISO, si la tabla la guarda. */
  date?: string;
}

export type CompletionMap = Record<string, CompletionState>;

/**
 * Una consulta por tabla, con la unión de columnas que piden las evaluaciones
 * que viven ahí. Las que se calculan puro (el Maestro) no generan consulta.
 */
export function completionQueries(list: Assessment[] = ASSESSMENTS): CompletionQuery[] {
  const byTable = new Map<string, Set<string>>();

  for (const a of list) {
    const p = a.persist;
    if (p.completion.rule === 'pure') continue;

    const cols = byTable.get(p.table) ?? new Set<string>();
    if (p.matchColumn) cols.add(p.matchColumn);
    if (p.dateColumn) cols.add(p.dateColumn);
    if (p.completion.rule === 'flag') cols.add(p.completion.column);
    if (p.completion.rule === 'not-null') cols.add(p.completion.column);
    if (p.completion.rule === 'json-key') cols.add(p.completion.column);
    byTable.set(p.table, cols);
  }

  return [...byTable.entries()]
    .map(([table, cols]) => ({ table, columns: [...cols].sort() }))
    .sort((a, b) => a.table.localeCompare(b.table));
}

/** La fecha más reciente de un conjunto de renglones, si hay columna de fecha. */
function latestDate(rows: Row[], dateColumn?: string): string | undefined {
  if (!dateColumn) return undefined;
  let best: string | undefined;
  for (const r of rows) {
    const v = r[dateColumn];
    if (typeof v !== 'string') continue;
    if (best === undefined || v > best) best = v;
  }
  return best;
}

/** Los renglones de esa tabla que le pertenecen a esta evaluación. */
function ownRows(rows: Row[], a: Assessment): Row[] {
  const { matchColumn, matchValue } = a.persist;
  if (!matchColumn || matchValue === undefined) return rows;
  return rows.filter((r) => r[matchColumn] === matchValue);
}

/**
 * Aplica la regla de completado de cada evaluación sobre los renglones ya
 * traídos. `rowsByTable` viene de ejecutar completionQueries().
 *
 * Las evaluaciones puras (el Maestro) no aparecen aquí: su completado lo
 * resuelve master-quiz-core, que necesita el género de la persona.
 */
export function reduceCompletion(
  rowsByTable: Record<string, Row[]>,
  list: Assessment[] = ASSESSMENTS,
): CompletionMap {
  const out: CompletionMap = {};

  for (const a of list) {
    const rule = a.persist.completion;
    if (rule.rule === 'pure') continue;

    const rows = ownRows(rowsByTable[a.persist.table] ?? [], a);
    let hits: Row[];

    switch (rule.rule) {
      case 'flag':
        hits = rows.filter((r) => r[rule.column] === true);
        break;
      case 'not-null':
        hits = rows.filter((r) => r[rule.column] != null);
        break;
      case 'row-exists':
      case 'match-exists':
        hits = rows;
        break;
      case 'json-key': {
        hits = rows.filter((r) => {
          const blob = r[rule.column];
          if (!blob || typeof blob !== 'object') return false;
          const value = (blob as Record<string, unknown>)[rule.key];
          if (value == null) return false;
          // Una categoría contestada guarda al menos una respuesta.
          if (typeof value === 'object') return Object.keys(value as object).length > 0;
          return true;
        });
        break;
      }
    }

    out[a.id] = hits.length > 0
      ? { done: true, date: latestDate(hits, a.persist.dateColumn) }
      : { done: false };
  }

  return out;
}

/** Cuántas de una lista están completadas: alimenta el contador por sección. */
export function countDone(map: CompletionMap, list: Assessment[]): number {
  return list.filter((a) => map[a.id]?.done).length;
}

/** Fecha corta en es-MX para la fila del hub. */
export function formatCompletionDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
