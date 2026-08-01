/**
 * atp-room-core — la lógica PURA de la sala ATP (MB-19 PIEZA 2).
 *
 * Los tres órdenes, el contador de aperturas y la card editorial del momento.
 * Sin React, sin AsyncStorage, sin fechas implícitas: todo lo que depende del
 * reloj se recibe por parámetro. Así se testea de verdad.
 *
 * El conteo de aperturas es DATO DEL USUARIO: vive en su teléfono, no se
 * infiere ni se manda a ningún lado. Aquí solo se ordena.
 */
import type { AppEntry, AppSection } from '@/src/constants/app-registry';
import { SECTION_ORDER, SECTION_LABELS } from '@/src/constants/app-registry';

export type AtpOrder = 'categoria' | 'frecuencia' | 'mio';

export const ATP_ORDERS: readonly AtpOrder[] = ['categoria', 'frecuencia', 'mio'] as const;

export const ORDER_LABELS: Record<AtpOrder, string> = {
  categoria: 'Categoría',
  frecuencia: 'Frecuencia',
  mio: 'Mío',
};

/** Una apertura registrada por app. `last` es epoch ms. */
export interface AppUsageEntry {
  count: number;
  last: number;
}

export type AppUsage = Record<string, AppUsageEntry>;

/** El orden personalizado: llaves fijadas arriba, luego el resto. */
export interface CustomOrder {
  /** Llaves en el orden que eligió el usuario. Las que falten van al final. */
  keys: string[];
}

export const EMPTY_ORDER: CustomOrder = { keys: [] };

// ─────────────────────────────────────────────────────────────────────────────
// Conteo de aperturas
// ─────────────────────────────────────────────────────────────────────────────

/** Suma una apertura. Devuelve un objeto nuevo (no muta). */
export function bumpUsage(usage: AppUsage, key: string, nowMs: number): AppUsage {
  const prev = usage[key];
  return { ...usage, [key]: { count: (prev?.count ?? 0) + 1, last: nowMs } };
}

/**
 * Más usadas arriba. Empata por la más reciente, y si sigue empatado por el
 * orden del registro: sin esto la cuadrícula bailaría entre renders.
 */
export function sortByFrequency(apps: AppEntry[], usage: AppUsage): AppEntry[] {
  const rank = new Map(apps.map((a, i) => [a.key, i]));
  return [...apps].sort((a, b) => {
    const ua = usage[a.key], ub = usage[b.key];
    const ca = ua?.count ?? 0, cb = ub?.count ?? 0;
    if (cb !== ca) return cb - ca;
    const la = ua?.last ?? 0, lb = ub?.last ?? 0;
    if (lb !== la) return lb - la;
    return (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Orden personalizado ("Mío")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica el orden del usuario. Las apps que no estén en la lista van al final
 * en el orden del registro: una app nueva aparece, no desaparece.
 */
export function applyCustomOrder(apps: AppEntry[], order: CustomOrder): AppEntry[] {
  const pos = new Map(order.keys.map((k, i) => [k, i]));
  const inOrder = apps.filter((a) => pos.has(a.key)).sort((a, b) => pos.get(a.key)! - pos.get(b.key)!);
  const rest = apps.filter((a) => !pos.has(a.key));
  return [...inOrder, ...rest];
}

/** Normaliza: siembra el orden con las apps visibles y tira llaves muertas. */
export function reconcileOrder(order: CustomOrder, apps: AppEntry[]): CustomOrder {
  const valid = new Set(apps.map((a) => a.key));
  const kept = order.keys.filter((k) => valid.has(k));
  const missing = apps.map((a) => a.key).filter((k) => !kept.includes(k));
  return { keys: [...kept, ...missing] };
}

/** Sube (-1) o baja (+1) una app. En los extremos no hace nada. */
export function moveInOrder(order: CustomOrder, key: string, dir: -1 | 1): CustomOrder {
  const keys = [...order.keys];
  const i = keys.indexOf(key);
  if (i < 0) return order;
  const j = i + dir;
  if (j < 0 || j >= keys.length) return order;
  [keys[i], keys[j]] = [keys[j], keys[i]];
  return { keys };
}

/** Fija una app hasta arriba. */
export function pinToTop(order: CustomOrder, key: string): CustomOrder {
  const keys = order.keys.filter((k) => k !== key);
  return { keys: [key, ...keys] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agrupación por sección
// ─────────────────────────────────────────────────────────────────────────────

export interface AppGroup {
  section: AppSection;
  label: string;
  apps: AppEntry[];
}

/** Las secciones con contenido, en el orden de render. Las vacías no se dibujan. */
export function groupBySection(apps: AppEntry[]): AppGroup[] {
  return SECTION_ORDER
    .map((section) => ({ section, label: SECTION_LABELS[section], apps: apps.filter((a) => a.section === section) }))
    .filter((g) => g.apps.length > 0);
}

/** Resuelve la lista final según el orden elegido. Categoría se agrupa aparte. */
export function orderedApps(apps: AppEntry[], order: AtpOrder, usage: AppUsage, custom: CustomOrder): AppEntry[] {
  if (order === 'frecuencia') return sortByFrequency(apps, usage);
  if (order === 'mio') return applyCustomOrder(apps, custom);
  return apps;
}

// ─────────────────────────────────────────────────────────────────────────────
// La card editorial del momento (2.1)
// ─────────────────────────────────────────────────────────────────────────────

export type MomentKey = 'amanecer' | 'medio-dia' | 'atardecer' | 'noche';

/** El momento del día por hora local. Es la base de la rotación: hora, no azar. */
export function momentOfDay(hour: number): MomentKey {
  if (hour >= 5 && hour < 11) return 'amanecer';
  if (hour >= 11 && hour < 16) return 'medio-dia';
  if (hour >= 16 && hour < 21) return 'atardecer';
  return 'noche';
}

export interface EditorialPick {
  /** La app a la que invita. */
  appKey: string;
  title: string;
  subtitle: string;
  /** Qué foto usar: el momento del día. */
  moment: MomentKey;
  /** Cuál variante de ese momento (determinística, ver pickImageIndex). */
  variant: number;
  /** true si la invitación es a retomar algo abandonado. */
  isComeback: boolean;
}

/** Días sin abrir a partir de los cuales una app cuenta como abandonada. */
export const COMEBACK_DAYS = 7;

const MOMENT_INVITE: Record<MomentKey, { appKey: string; title: string; subtitle: string }> = {
  amanecer: { appKey: 'sol', title: 'Tu ventana de sol', subtitle: 'Los primeros minutos de luz del día' },
  'medio-dia': { appKey: 'comida', title: 'Hora de comer', subtitle: 'Registra tu comida con una foto' },
  atardecer: { appKey: 'entrenar', title: 'Te toca moverte', subtitle: 'Tu sesión de hoy te está esperando' },
  noche: { appKey: 'meditar', title: 'Baja el ritmo', subtitle: 'Unos minutos antes de dormir' },
};

/**
 * UNA card, elegida por contexto. Nunca al azar y nunca un carrusel.
 *
 * Orden de prioridad:
 *   1. Un hábito que sí usabas y llevas más de una semana sin abrir. Retomarlo
 *      vale más que cualquier sugerencia genérica del reloj.
 *   2. La invitación del momento del día.
 *   3. Si esa app no está disponible para este usuario, la primera instalable.
 */
export function pickEditorial(
  apps: AppEntry[],
  usage: AppUsage,
  nowMs: number,
  hour: number
): EditorialPick | null {
  if (apps.length === 0) return null;
  const moment = momentOfDay(hour);
  const variant = pickVariantIndex(nowMs);
  const available = new Set(apps.map((a) => a.key));

  // 1 · El abandonado con más historia.
  const cutoff = nowMs - COMEBACK_DAYS * 24 * 60 * 60 * 1000;
  const comeback = apps
    .filter((a) => a.installable && (usage[a.key]?.count ?? 0) > 0 && (usage[a.key]?.last ?? 0) < cutoff)
    .sort((a, b) => (usage[b.key]!.count - usage[a.key]!.count) || (usage[b.key]!.last - usage[a.key]!.last))[0];

  if (comeback) {
    const dias = Math.floor((nowMs - usage[comeback.key]!.last) / (24 * 60 * 60 * 1000));
    return {
      appKey: comeback.key,
      title: `Retoma ${comeback.label}`,
      subtitle: `Llevas ${dias} días sin abrirla`,
      moment,
      variant,
      isComeback: true,
    };
  }

  // 2 · La invitación del momento.
  const invite = MOMENT_INVITE[moment];
  if (available.has(invite.appKey)) {
    return { ...invite, moment, variant, isComeback: false };
  }

  // 3 · Red de seguridad: nunca dejar la card vacía.
  const fallback = apps.find((a) => a.installable) ?? apps[0];
  return {
    appKey: fallback.key,
    title: fallback.label,
    subtitle: 'Empieza por aquí',
    moment,
    variant,
    isComeback: false,
  };
}

/**
 * Qué foto del momento toca. Cambia con el día, no con cada render: si rotara
 * al azar, la pantalla parpadearía distinta en cada entrada.
 */
export function pickVariantIndex(nowMs: number, variants = 4): number {
  const dia = Math.floor(nowMs / (24 * 60 * 60 * 1000));
  return ((dia % variants) + variants) % variants;
}
