/**
 * Report Prefs Core (MB-11 C · SPEC Zero→ATP) — lógica pura de las gráficas
 * personalizables del hub de reportes: el usuario reordena secciones y las
 * prende/apaga. "Guiado no prisionero" aplicado a los datos.
 *
 * La persistencia (AsyncStorage @atp/reports_sections) vive en la pantalla;
 * aquí solo transformaciones puras.
 */

export interface SectionPrefs {
  /** Orden preferido (keys conocidas; las desconocidas se ignoran). */
  order: string[];
  /** Secciones apagadas. */
  hidden: string[];
}

export const EMPTY_PREFS: SectionPrefs = { order: [], hidden: [] };

/**
 * Orden efectivo: el guardado filtrado a keys vigentes + las keys nuevas del
 * default apendeadas donde el default las pone. Sobrevive a agregar/quitar
 * secciones entre versiones sin corromper la preferencia.
 */
export function effectiveOrder(defaults: readonly string[], prefs: SectionPrefs | null): string[] {
  const known = new Set(defaults);
  const saved = (prefs?.order ?? []).filter((k) => known.has(k));
  const seen = new Set(saved);
  for (const k of defaults) if (!seen.has(k)) saved.push(k);
  return saved;
}

export function isHidden(prefs: SectionPrefs | null, key: string): boolean {
  return !!prefs?.hidden.includes(key);
}

/** Mueve `key` una posición (dir -1 arriba / +1 abajo). Fuera de rango = no-op. */
export function moveSection(order: string[], key: string, dir: -1 | 1): string[] {
  const i = order.indexOf(key);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function toggleSection(prefs: SectionPrefs, key: string): SectionPrefs {
  const hidden = prefs.hidden.includes(key)
    ? prefs.hidden.filter((k) => k !== key)
    : [...prefs.hidden, key];
  return { ...prefs, hidden };
}

/** Parse defensivo de lo guardado (JSON de AsyncStorage). Basura → null. */
export function parsePrefs(raw: string | null): SectionPrefs | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.order) || !Array.isArray(v.hidden)) return null;
    return {
      order: v.order.filter((k: unknown) => typeof k === 'string'),
      hidden: v.hidden.filter((k: unknown) => typeof k === 'string'),
    };
  } catch {
    return null;
  }
}
