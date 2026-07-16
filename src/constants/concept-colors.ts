/**
 * concept-colors — fuente ÚNICA de color por CONCEPTO cross-app (Sprint 2 E).
 *
 * Audit Cowork 2026-07-14 §3: suplementos / fitness / nutrición tenían 2-3
 * paletas distintas según pantalla (HOY vs Hábitos vs electrón). Un concepto =
 * UN color en toda la app. Canónicos alineados a los colores de categoría del
 * design system (brand.ts §1 — "no inventar colores"): fitness lima, nutrition
 * azul, optimization/suplementos naranja, mind morado.
 *
 * Consumidores: hoy-cards.ts (gradients de cards), habits-portal.tsx (pilares),
 * electrons.ts (color del electrón). Al agregar una pantalla con estos
 * conceptos, leer de AQUÍ — nunca hardcodear el hex en la pantalla.
 */

export interface ConceptColor {
  /** Color sólido: iconos, acentos, electrones, badges. */
  color: string;
  /** Gradient de card editorial [start, end]. */
  gradient: [string, string];
}

export const CONCEPT_COLORS = {
  // ── Los 3 offenders del audit (antes 2-3 paletas c/u) ──
  /** Canónico naranja optimization (antes: morado en HOY, lima en electrón). */
  suplementos: { color: '#EF9F27', gradient: ['#EF9F27', '#C0392B'] },
  /** Canónico lima fitness (antes: rojo en HOY). Aplica a FUERZA. */
  fitness: { color: '#A8E02A', gradient: ['#A8E02A', '#27AE60'] },
  /** Canónico azul nutrition (antes: naranja-rojo en HOY, azul claro en electrón). */
  nutricion: { color: '#5B9BD5', gradient: ['#5B9BD5', '#3B82F6'] },

  // ── Ya coherentes cross-app — migrados para que TODO lea de aquí ──
  agua: { color: '#60A5FA', gradient: ['#3498DB', '#1ABC9C'] },
  ayuno: { color: '#6B46C1', gradient: ['#6B46C1', '#1E3A8A'] },
  sol: { color: '#FBBF24', gradient: ['#FFD700', '#FFA500'] },
  mente: { color: '#7F77DD', gradient: ['#7F77DD', '#6C3483'] },
  sueno: { color: '#818CF8', gradient: ['#3B82F6', '#1E3A8A'] },
  cardio: { color: '#E74C3C', gradient: ['#E74C3C', '#FFA500'] },
} satisfies Record<string, ConceptColor>;

export type ConceptKey = keyof typeof CONCEPT_COLORS;
