/**
 * Emotion Profile Core — perfil emocional del periodo, lógica PURA
 * (MB-4 · Bloque 5).
 *
 * ⚠️ LA REGLA QUE LO HACE HONESTO: esto NO es una etiqueta fija. Es una FOTO
 * del periodo analizado — cambia cuando tú cambias, y se recalcula solo.
 * Nada de "tú eres X": el copy habla de cómo ESTUVISTE, no de quién eres.
 * (Doctrina: motivar sin encasillar.)
 *
 * Requiere un mínimo de registros; antes de eso se explica qué falta.
 * Sin imports de RN/supabase → Vitest node.
 */
import type { HistoryCheckin } from './emotion-history-core';
import { buildDayMoods, buildMosaic, localDayKey } from './emotion-history-core';

/** Mínimo de check-ins en el periodo para armar un perfil honesto. */
export const MIN_CHECKINS_FOR_PROFILE = 10;
/** Ventana del perfil (días). */
export const PROFILE_PERIOD_DAYS = 30;

export type QuadrantShare = { quadrant: string; pct: number };
export type Variability = 'estable' | 'medio' | 'oscilante';
export type DayMoment = 'mañana' | 'tarde' | 'noche';

export interface ArchetypeDef {
  key: string;
  name: string;
  /** Tagline en pasado/periodo — nunca "eres". */
  tagline: string;
}

/**
 * Arquetipos por mezcla dominante del PERIODO. Tono test de personalidad
 * (atractivo, compartible) pero el nombre describe un clima, no una persona.
 */
export const ARCHETYPES: Record<string, ArchetypeDef> = {
  high_pleasant: {
    key: 'high_pleasant',
    name: 'Reactor solar',
    tagline: 'Este periodo tu energía estuvo arriba y de tu lado. Combustible del bueno.',
  },
  low_pleasant: {
    key: 'low_pleasant',
    name: 'Marea en calma',
    tagline: 'Estos días dominó la serenidad. Sostener eso también es rendimiento.',
  },
  high_unpleasant: {
    key: 'high_unpleasant',
    name: 'Tormenta eléctrica',
    tagline: 'Hubo mucha carga estos días. La energía estuvo — la dirección es lo que se entrena.',
  },
  low_unpleasant: {
    key: 'low_unpleasant',
    name: 'Invierno interno',
    tagline: 'Fue un periodo de baja. Los inviernos también terminan — y registrarlo ya es moverse.',
  },
  mixed: {
    key: 'mixed',
    name: 'Espectro completo',
    tagline: 'Recorriste todo el mapa este periodo. Sentir variado no es inestabilidad: es información.',
  },
};

export interface EmotionProfile {
  status: 'ready' | 'insufficient';
  /** Cuando falta data: cuántos van y cuántos se necesitan. */
  have: number;
  needed: number;
  periodDays: number;
  daysCovered: number;
  archetype: ArchetypeDef | null;
  quadrantMix: QuadrantShare[];
  topEmotions: { emotionId: string; count: number }[];
  variability: Variability | null;
  /** Momento del día con mejor ánimo (si hay señal suficiente). */
  bestMoment: DayMoment | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Umbral de dominancia: un cuadrante manda si acumula 45%+ del periodo. */
export const DOMINANCE_PCT = 45;
/** Mínimo de check-ins por franja horaria para hablar de "mejor momento". */
export const MIN_PER_MOMENT = 4;

export function momentOfDay(iso: string): DayMoment {
  const h = new Date(iso).getHours();
  if (h < 12) return 'mañana';
  if (h < 19) return 'tarde';
  return 'noche';
}

export function computeEmotionProfile(
  checkins: HistoryCheckin[],
  periodDays: number = PROFILE_PERIOD_DAYS,
): EmotionProfile {
  const have = checkins.length;
  const base: EmotionProfile = {
    status: 'insufficient',
    have,
    needed: MIN_CHECKINS_FOR_PROFILE,
    periodDays,
    daysCovered: new Set(checkins.map((c) => localDayKey(c.created_at))).size,
    archetype: null,
    quadrantMix: [],
    topEmotions: [],
    variability: null,
    bestMoment: null,
  };
  if (have < MIN_CHECKINS_FOR_PROFILE) return base;

  // ── Mezcla de cuadrantes ──
  const counts = new Map<string, number>();
  for (const c of checkins) counts.set(c.quadrant, (counts.get(c.quadrant) ?? 0) + 1);
  const quadrantMix: QuadrantShare[] = [...counts.entries()]
    .map(([quadrant, n]) => ({ quadrant, pct: round1((n / have) * 100) }))
    .sort((a, b) => b.pct - a.pct || (a.quadrant < b.quadrant ? -1 : 1));

  const dominant = quadrantMix[0];
  const archetype = dominant.pct >= DOMINANCE_PCT
    ? ARCHETYPES[dominant.quadrant] ?? ARCHETYPES.mixed
    : ARCHETYPES.mixed;

  // ── Variabilidad (desviación estándar del ánimo diario, escala 1-10) ──
  const dayMoods = buildDayMoods(checkins);
  let variability: Variability = 'medio';
  if (dayMoods.length >= 3) {
    const mean = dayMoods.reduce((s, d) => s + d.pleasantness, 0) / dayMoods.length;
    const sd = Math.sqrt(
      dayMoods.reduce((s, d) => s + (d.pleasantness - mean) ** 2, 0) / dayMoods.length,
    );
    variability = sd < 1.2 ? 'estable' : sd > 2.4 ? 'oscilante' : 'medio';
  }

  // ── Mejor momento del día (solo con señal suficiente por franja) ──
  const byMoment = new Map<DayMoment, number[]>();
  for (const c of checkins) {
    const p = typeof c.pleasantness === 'number' && c.pleasantness > 0
      ? c.pleasantness
      : (c.quadrant === 'high_pleasant' || c.quadrant === 'low_pleasant' ? 7 : 3);
    const m = momentOfDay(c.created_at);
    const arr = byMoment.get(m) ?? [];
    arr.push(p);
    byMoment.set(m, arr);
  }
  const momentAvgs = [...byMoment.entries()]
    .filter(([, vals]) => vals.length >= MIN_PER_MOMENT)
    .map(([m, vals]) => ({ m, avg: vals.reduce((s, v) => s + v, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg || (a.m < b.m ? -1 : 1));
  const bestMoment = momentAvgs.length >= 2 ? momentAvgs[0].m : null;

  return {
    ...base,
    status: 'ready',
    archetype,
    quadrantMix,
    topEmotions: buildMosaic(checkins).slice(0, 3),
    variability,
    bestMoment,
  };
}

/** Texto compartible (Share nativo) — foto del periodo, jamás etiqueta. */
export function buildShareText(profile: EmotionProfile): string {
  if (profile.status !== 'ready' || !profile.archetype) return '';
  return [
    `Mi clima emocional de los últimos ${profile.periodDays} días en ATP: ${profile.archetype.name}.`,
    profile.archetype.tagline,
    'No es quién soy — es cómo estuve. Y se mueve.',
  ].join(' ');
}
