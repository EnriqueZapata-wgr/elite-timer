/**
 * Plan de suplementos — lógica PURA (MB-2: unificación de las 2 puertas de scan).
 *
 * Dedupe por nombre: las dos puertas de alta desde scan (BhaScanSheet del
 * header y food-scan modo suplemento) no deben crear fichas duplicadas.
 * La coincidencia es por nombre NORMALIZADO (case/acentos/espacios), no
 * exacta — "magnesio glicinato" == "Magnesio  Glicinato".
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 */

/** Normaliza un nombre para comparación: trim + lower + sin acentos + espacios colapsados. */
export function normalizeSupplementName(name: string | null | undefined): string {
  if (typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PlanSupplementRow {
  id: string;
  name: string;
}

/** Ficha existente cuyo nombre coincide (normalizado) con `name`, o null. */
export function findSupplementByName<T extends PlanSupplementRow>(
  name: string,
  existing: readonly T[],
): T | null {
  const target = normalizeSupplementName(name);
  if (!target) return null;
  return existing.find((s) => normalizeSupplementName(s.name) === target) ?? null;
}
