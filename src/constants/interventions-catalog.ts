/**
 * Catálogo de Intervenciones ATP — fuente de verdad curada (constants, git-versionado).
 *
 * Doctrina (scope 2026-07-11 + decisiones aprobadas):
 *  - En ATP NO se recomiendan suplementos ni fármacos. Las intervenciones son
 *    hábitos / prácticas / rituales / técnicas de medicina y nutrición funcional.
 *  - El motor cruza las `roots` de cada intervención contra las raíces del DX del
 *    user y sugiere con semáforo. El user activa libremente (sin límite).
 *  - Cada MODALIDAD es una intervención distinta (comparten filosofía, no
 *    implementación): "Ayuno 16:8" ≠ "Ayuno 18:6". Se enlazan con `family`.
 *  - El user puede crear intervenciones CUSTOM (no viven aquí; viven en
 *    user_interventions.custom_definition).
 *
 * ⚠️ ESTADO: catálogo semilla / placeholder. Mariana + Enrique curan el set real
 * en `09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE.md` → Cowork lo convierte aquí.
 * Los UNIVERSALES (isUniversal) son el fallback garantizado para que ningún user
 * quede con protocolo vacío mientras el catálogo se llena.
 */
import type { InterventionCategory, InterventionRoot } from './intervention-vocab';

export type Priority = 1 | 2 | 3; // 1 🔴 P1 · 2 🟡 P2 · 3 🟢 P3 (default; el motor re-prioriza)
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
export type EvidenceLevel = 'N1' | 'N2' | 'N3' | 'N4';

export interface Intervention {
  /** Key estable, snake_case. Referenciado por user_interventions.intervention_key. */
  key: string;
  /** Nombre corto que ve el user (≤50 chars). */
  name: string;
  /** Cómo se hace — 1 línea accionable. */
  how: string;
  /** Beneficio — por qué funciona (1-2 líneas). */
  benefit: string;
  /** Categorías (para qué sirve) — múltiples. */
  categories: InterventionCategory[];
  /** Raíces que ataca — múltiples. [] para universales fijas sin raíz específica. */
  roots: InterventionRoot[];
  /** Regla clínica en lenguaje normal ("cuándo asignarla"). */
  assignRule: string;
  /** Prioridad default 🔴🟡🟢. */
  priority: Priority;
  /** Familia de modalidades (p.ej. 'ayuno'); las modalidades comparten familia. */
  family?: string;
  /** Universal: fallback garantizado / circadiano. */
  isUniversal?: boolean;
  /** Universal circadiano: el timing se calcula desde user_chronotype (no fijo). */
  circadian?: 'sleep' | 'eat';
  /** Momento del día sugerido (para timing e íconos). */
  timeOfDay?: TimeOfDay;
  /** Info científica / bibliografía / "considerar consultar con tu nutriólogo". */
  scientificInfo?: string;
  /** Nivel de evidencia (jerarquía ARGOS). */
  evidenceLevel?: EvidenceLevel;
}

export const INTERVENTIONS_CATALOG: Intervention[] = [
  // ── UNIVERSALES (fallback garantizado · adicional #8 decisiones aprobadas) ──
  {
    key: 'hidratacion_matutina',
    name: 'Hidratación matutina',
    how: 'Bebe 500 ml de agua al despertar, antes de café o comida.',
    benefit: 'Rehidrata tras el ayuno nocturno, activa el tránsito intestinal y la energía matinal.',
    categories: ['hidratacion', 'energia'],
    roots: [],
    assignRule: 'Universal — todos.',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'morning',
  },
  {
    key: 'exposicion_solar_matutina',
    name: 'Exposición solar 10 min (7-9am)',
    how: 'Sal a luz solar directa entre 7-9am, ojos abiertos sin lentes de sol, 10 min continuos.',
    benefit: 'Ancla el ritmo circadiano, dispara cortisol matutino sano y mejora la melatonina 14h después.',
    categories: ['sueno', 'hormonal', 'energia', 'piel', 'cognitivo'],
    roots: ['cortisol_matutino_bajo', 'ritmo_circadiano_desregulado', 'deficit_exposicion_solar', 'deficit_sueno_profundo'],
    assignRule: 'Universal — especialmente insomnio de conciliación, fatiga matutina, vitamina D baja.',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
  },
  {
    key: 'recordatorio_dormir',
    name: 'Hora de dormir',
    how: 'Inicia tu rutina de sueño a la hora que tu cronotipo marca como óptima.',
    benefit: 'Consolida el sueño profundo respetando tu ventana circadiana.',
    categories: ['sueno', 'ritual'],
    roots: ['ritmo_circadiano_desregulado', 'deficit_sueno_profundo'],
    assignRule: 'Universal — timing calculado desde user_chronotype.',
    priority: 1,
    isUniversal: true,
    circadian: 'sleep',
  },
  {
    key: 'recordatorio_comer',
    name: 'Ventana de alimentación',
    how: 'Abre y cierra tu ventana de comida en el horario que marca tu cronotipo.',
    benefit: 'Ordena la señalización metabólica alineando la comida con tu reloj biológico.',
    categories: ['metabolismo', 'ritual'],
    roots: ['ritmo_circadiano_desregulado'],
    assignRule: 'Universal — timing calculado desde user_chronotype.',
    priority: 2,
    isUniversal: true,
    circadian: 'eat',
  },
  {
    // ⚠️ PENDING confirmación Enrique (adicional #8). Incluida como universal
    // suave; el motor puede excluirla si se decide que no es universal.
    key: 'apagar_pantallas_noche',
    name: 'Apagar pantallas 30 min antes de dormir',
    how: 'Corta pantallas (o usa modo cálido) 30 min antes de tu hora de dormir.',
    benefit: 'Reduce la luz azul nocturna que suprime melatonina y retrasa el sueño.',
    categories: ['sueno'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado'],
    assignRule: 'Universal (pending confirmación) — reforzar en insomnio de conciliación.',
    priority: 2,
    isUniversal: true,
    timeOfDay: 'night',
  },

  // ── CURADAS (placeholder — ejemplos del catálogo doctrinal, pending Mariana) ──
  {
    key: 'pausas_activas_60min',
    name: 'Pausas activas cada 60 min',
    how: 'Cada hora: levántate, 2 min de estiramiento cervical + puntitas + respiración diafragmática 5 ciclos.',
    benefit: 'Reduce tensión postural crónica, restaura flujo linfático y resetea el foco cognitivo.',
    categories: ['movimiento', 'ritual', 'cognitivo', 'cardiovascular'],
    roots: ['sedentarismo', 'sarcopenia', 'ritmo_circadiano_desregulado'],
    assignRule: 'Trabajo sentado >6h/día, dolor lumbar/cervical, o caídas de foco vespertino.',
    priority: 2,
  },
  {
    key: 'ayuno_16_8',
    name: 'Ayuno 16:8 con carbos densos en cena',
    how: 'Ventana de comida 12:00-20:00. Cena con carbos densos (papa, camote, arroz) 3h antes de dormir.',
    benefit: 'Regula insulina diurna y mejora el sueño profundo (serotonina→melatonina de carbos nocturnos).',
    categories: ['metabolismo', 'sueno', 'hormonal', 'inflamacion'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'deficit_sueno_profundo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Adulto con signos de resistencia a la insulina, HOMA-IR elevado, cortisol matutino OK, sin TCA previos.',
    priority: 2,
    family: 'ayuno',
    scientificInfo: 'Ayuno intermitente en resistencia a la insulina. Considerar consultar con tu nutriólogo antes de iniciar.',
    evidenceLevel: 'N2',
  },
  {
    key: 'ayuno_14_10',
    name: 'Ayuno 14:10 (suave)',
    how: 'Ventana de comida de 10h. Versión más suave, apta para mujeres en fase folicular.',
    benefit: 'Beneficio metabólico con menor estrés hormonal que ventanas más agresivas.',
    categories: ['metabolismo', 'hormonal'],
    roots: ['hiperinsulinemia', 'resistencia_insulina'],
    assignRule: 'Primer acercamiento al ayuno, mujeres en fase folicular, o quien no tolera 16:8.',
    priority: 2,
    family: 'ayuno',
    scientificInfo: 'Considerar consultar con tu nutriólogo antes de iniciar.',
  },
  {
    key: 'ayuno_18_6',
    name: 'Ayuno 18:6 (agresivo)',
    how: 'Ventana de comida de 6h. Versión más agresiva para resistencia a la insulina establecida.',
    benefit: 'Mayor presión sobre la sensibilidad a la insulina en perfiles que ya toleran 16:8.',
    categories: ['metabolismo', 'inflamacion'],
    roots: ['hiperinsulinemia', 'resistencia_insulina'],
    assignRule: 'Hombres con resistencia establecida que ya toleran 16:8; nunca con TCA previos.',
    priority: 3,
    family: 'ayuno',
    scientificInfo: 'Considerar consultar con tu nutriólogo antes de iniciar.',
  },
];

// ── Índices de acceso ────────────────────────────────────────────────────────

export const INTERVENTION_BY_KEY: Record<string, Intervention> =
  Object.fromEntries(INTERVENTIONS_CATALOG.map(i => [i.key, i]));

/** Universales garantizados (fallback cuando el DX no arroja raíces o el catálogo es chico). */
export const UNIVERSAL_INTERVENTIONS: Intervention[] =
  INTERVENTIONS_CATALOG.filter(i => i.isUniversal);
