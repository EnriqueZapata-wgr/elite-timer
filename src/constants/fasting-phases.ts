/**
 * Fases metabólicas del ayuno — FUENTE ÚNICA (MB-8 · Track F.1).
 *
 * ⚠️ VENTANAS PROVISIONALES. Las horas de cada fase las define Enrique con
 * su protocolo de ayuno (R and D) — estos defaults vienen de las zonas que
 * ya traía la app (fasting.tsx pre-MB-8) y NO están validados. Cambiar las
 * ventanas = editar SOLO este archivo.
 *
 * `now` narra qué pasa en el cuerpo durante la fase; `next` prepara la
 * siguiente. Copy con mecanismo, sin siglas sin presentar (doctrina Mente).
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
    hours: 0,
    label: 'Fase alimentada',
    description: 'Digestión y absorción de nutrientes',
    now: 'Tu cuerpo digiere y absorbe la última comida. La insulina (la hormona que guarda energía) está alta y tus células almacenan.',
    color: '#22c55e',
    icon: 'restaurant-outline',
  },
  {
    hours: 4,
    label: 'Postabsorción',
    description: 'La glucosa baja, empiezas a usar reservas',
    now: 'Terminó la digestión. La glucosa en sangre baja y tu cuerpo empieza a jalar de sus reservas en vez de la comida.',
    color: '#38bdf8',
    icon: 'trending-down-outline',
  },
  {
    hours: 8,
    label: 'Glucogenólisis',
    description: 'Tu hígado libera glucógeno almacenado',
    now: 'Tu hígado libera glucógeno — la glucosa que tenía guardada — para mantener estable tu energía sin comer.',
    color: '#60a5fa',
    icon: 'flash-outline',
  },
  {
    hours: 12,
    label: 'Cetosis temprana',
    description: 'Empiezas a quemar grasa como combustible',
    now: 'Las reservas de glucosa se agotan y tu cuerpo cambia de combustible: empieza a quemar grasa y a producir cetonas.',
    color: '#a8e02a',
    icon: 'flame-outline',
  },
  {
    hours: 16,
    label: 'Autofagia',
    description: 'Tus células reciclan componentes dañados',
    now: 'Arranca la autofagia: tus células detectan la pausa y reciclan componentes dañados para construir piezas nuevas.',
    color: '#f59e0b',
    icon: 'refresh-outline',
  },
  {
    hours: 24,
    label: 'Autofagia profunda',
    description: 'Reparación celular intensa + hormona de crecimiento',
    now: 'La reparación celular se intensifica y sube la hormona de crecimiento, que protege tu músculo mientras ayunas.',
    color: '#f97316',
    icon: 'shield-outline',
  },
  {
    hours: 36,
    label: 'Reparación inmune',
    description: 'Tu sistema inmune se regenera',
    now: 'Tu cuerpo recicla células inmunes viejas y activa la producción de nuevas. Hidratación y electrolitos son clave aquí.',
    color: '#c084fc',
    icon: 'medkit-outline',
  },
  {
    hours: 48,
    label: 'Reset metabólico',
    description: 'La sensibilidad a la insulina se restaura a fondo',
    now: 'Reset profundo: tus células vuelven a responder bien a la insulina, la base de la flexibilidad metabólica que ATP persigue.',
    color: '#ec4899',
    icon: 'nuclear-outline',
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
