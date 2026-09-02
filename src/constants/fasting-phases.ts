/**
 * Fases metabólicas del ayuno — FUENTE ÚNICA (MB-8 · Track F.1 → MB-9 · Track D).
 *
 * ⚠️ MB-9 · Track D (P0): se RETIRARON las cuatro fases sin respaldo que la app
 * publicaba con reloj ("Autofagia · 16 h", "Autofagia profunda · 24 h",
 * "Reparación inmune · 36 h", "Reset metabólico · 48 h"). No existe una hora
 * confirmada de autofagia en humanos: el flujo autofágico casi no se puede medir
 * en personas vivas y las cifras que circulan vienen de animales o de marcadores
 * extrapolados. Publicar una hora es afirmar lo que no está establecido.
 *
 * La escalera de abajo se basa en literatura primaria (Cahill 2006 · de Cabo &
 * Mattson 2019). **La autofagia se puede nombrar como proceso que el ayuno
 * favorece, pero NUNCA con reloj.** Detalle y fuentes en
 * `R and D/RESEARCH_FASES_AYUNO_ATP_2026-07-26.md`.
 *
 * ⚠️ VENTANAS ORIENTATIVAS, no relojes. El momento del cambio depende de la
 * dieta previa, la actividad física, la última comida y la salud metabólica.
 * Enrique valida las ventanas finales. Cambiar las ventanas = editar SOLO este
 * archivo.
 *
 * 31-ago-2026 (backlog 15.5 / F-9): cada `hours` de abajo es una afirmación
 * fisiológica y ninguna está firmada. Todas llevan `PENDIENTE FIRMA MARIANA`
 * con su fuente según RESEARCH_FASES_AYUNO_ATP_2026-07-26.md. No se cambió ni
 * se confirmó ninguna. La pantalla las pinta como "aproximado". Discrepancia
 * que Mariana debe resolver: la investigación ubica la cetosis nutricional
 * (BHB >= 0.5 mmol/L) "después de ~24 h" y la tabla de fases la abre a las 18.
 *
 * `now` narra qué pasa en el cuerpo durante la fase. Copy con mecanismo, sin
 * siglas sin presentar (doctrina Mente).
 */
import type { Ionicons } from '@expo/vector-icons';

export interface FastingPhase {
  /** Hora de entrada a la fase (inclusive). */
  hours: number;
  label: string;
  /** Resumen de una línea (pastilla / listas). */
  description: string;
  /** Narrativa de la fase — qué está pasando ahora en tu cuerpo. */
  now: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const FASTING_PHASES: FastingPhase[] = [
  {
    // PENDIENTE FIRMA MARIANA · 0-4 h · fuente: Cahill 2006 (Annu Rev Nutr 26:1-22).
    hours: 0,
    label: 'Fase alimentada',
    description: 'Digestión y absorción de nutrientes',
    now: 'Tu cuerpo digiere y absorbe la última comida. La insulina (la hormona que guarda energía) está alta y tus células almacenan.',
    color: '#22c55e',
    icon: 'restaurant-outline',
  },
  {
    // PENDIENTE FIRMA MARIANA · 4-12 h · fuente: Cahill 2006.
    hours: 4,
    label: 'Postabsorción',
    description: 'Cae la insulina, tu hígado suelta glucógeno',
    now: 'Terminó la digestión. La insulina baja y tu hígado empieza a soltar el glucógeno que tenía guardado, para mantener estable tu energía sin comer.',
    color: '#38bdf8',
    icon: 'trending-down-outline',
  },
  {
    // PENDIENTE FIRMA MARIANA · 12-18 h · fuente: de Cabo & Mattson 2019 (NEJM
    // 381:2541), que ubican la depleción de glucógeno a partir de las 10-14 h.
    hours: 12,
    label: 'Cambio metabólico',
    description: 'El glucógeno se agota, entra la grasa',
    now: 'El glucógeno del hígado se agota y tu cuerpo cambia de combustible: arranca la lipólisis (quema de grasa) y empieza a producir cetonas.',
    color: '#a8e02a',
    icon: 'swap-horizontal-outline',
  },
  {
    // PENDIENTE FIRMA MARIANA · 18-48 h · fuente: de Cabo & Mattson 2019 y
    // Cahill 2006. OJO: la investigación dice que la cetosis nutricional suele
    // establecerse DESPUÉS de ~24 h; aquí abre a las 18. No se tocó.
    hours: 18,
    label: 'Cetosis',
    description: 'Las cetonas se vuelven tu combustible',
    now: 'Las cetonas suben y se vuelven combustible relevante para tu cerebro y tu músculo. El ayuno favorece procesos de reciclaje celular (autofagia); su momento exacto en humanos no está establecido.',
    color: '#f59e0b',
    icon: 'flame-outline',
  },
  {
    // PENDIENTE FIRMA MARIANA · 48-72 h+ · fuente: Cahill 2006 (ahorro de proteína).
    hours: 48,
    label: 'Ayuno prolongado',
    description: 'La grasa domina · requiere acompañamiento',
    now: 'La grasa domina como combustible y tu cuerpo protege el músculo ahorrando proteína. A partir de aquí el ayuno prolongado requiere acompañamiento.',
    color: '#f97316',
    icon: 'shield-outline',
  },
];

/** Fase actual según horas transcurridas. */
export function getCurrentPhase(hours: number): FastingPhase {
  let phase = FASTING_PHASES[0];
  for (const p of FASTING_PHASES) {
    if (hours >= p.hours) phase = p;
  }
  return phase;
}

/** Siguiente fase (null si ya estás en la última). */
export function getNextPhase(hours: number): FastingPhase | null {
  for (const p of FASTING_PHASES) {
    if (p.hours > hours) return p;
  }
  return null;
}
