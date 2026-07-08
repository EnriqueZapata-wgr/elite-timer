/**
 * HERO recomendación dinámica (#68, sprint polish V1.3) — motor PURO de
 * reglas locales. Sin supabase/react-native: HOY arma el contexto (casi todo
 * ya vive en CompiledDay) y esto decide QUÉ decirle al usuario ahora.
 *
 * Reglas declarativas en orden de prioridad: la PRIMERA que matchea gana.
 * Fallback editorial garantizado al final (nunca devuelve null).
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface HeroContext {
  hour: number;              // 0-23 local
  score: number;             // % electrones (0-100)
  streak: number;            // racha actual en días (0 = sin racha)
  waterMl: number;
  waterTargetMl: number;
  proteinG: number;
  proteinTargetG: number;
  sunDone: boolean;
  meditationDone: boolean;
  journalDone: boolean;
  fastingActive: boolean;
  sex: 'male' | 'female' | null;
  cyclePhase: CyclePhase | null;      // solo si mujer + modalidad regular
  /** cronológica − integral: >0 = más joven que tu edad. null = sin cálculo. */
  edadAtpDelta: number | null;
}

export interface HeroRecommendation {
  id: string;
  title: string;
  subtitle: string;
  cta?: string;
  route?: string;
}

interface HeroRule {
  id: string;
  condition: (c: HeroContext) => boolean;
  make: (c: HeroContext) => Omit<HeroRecommendation, 'id'>;
}

const morning = (c: HeroContext) => c.hour >= 5 && c.hour < 11;
const midday = (c: HeroContext) => c.hour >= 11 && c.hour < 15;
const afternoon = (c: HeroContext) => c.hour >= 15 && c.hour < 19;
const evening = (c: HeroContext) => c.hour >= 19 && c.hour < 23;

/**
 * Orden = prioridad (la primera que matchea gana):
 * 1) acciones puntuales pendientes (agua/proteína/sol/ayuno) — lo más accionable
 * 2) contexto de ciclo (si aplica)
 * 3) rachas
 * 4) Edad ATP
 * 5) contexto horario genérico
 * 6) fallback
 */
export const HERO_RULES: HeroRule[] = [
  // ── Ayuno ──
  {
    id: 'ayuno-manana',
    condition: (c) => c.fastingActive && morning(c),
    make: () => ({
      title: 'Ayuno activo — no lo rompas todavía',
      subtitle: 'Tu ventana sigue abierta. Hidrátate y aguanta la ola.',
      cta: 'Ver ayuno',
      route: '/fasting',
    }),
  },
  {
    id: 'ayuno-romper',
    condition: (c) => c.fastingActive && (midday(c) || afternoon(c)),
    make: () => ({
      title: 'Rompe el ayuno con proteína',
      subtitle: 'Primer alimento: proteína + grasa buena, no azúcar.',
      cta: 'Registrar comida',
      route: '/food-register',
    }),
  },

  // ── Hábitos faltantes hoy ──
  {
    id: 'agua-pendiente',
    condition: (c) => !c.fastingActive && c.hour >= 10 && c.waterMl <= 0,
    make: () => ({
      title: 'Bebe tu primer vaso de agua',
      subtitle: 'Cero ml registrados hoy. La hidratación mueve todo lo demás.',
      cta: 'Registrar agua',
      route: '/hydration',
    }),
  },
  {
    id: 'proteina-pendiente',
    condition: (c) => !c.fastingActive && c.hour >= 11 && c.proteinG <= 0,
    make: () => ({
      title: 'Agrega proteína ahora',
      subtitle: 'Sin proteína registrada hoy — tu masa muscular la pide.',
      cta: 'Registrar',
      route: '/food-register',
    }),
  },
  {
    id: 'sol-pendiente',
    condition: (c) => !c.sunDone && morning(c) && c.hour >= 7,
    make: () => ({
      title: 'Sal 10 minutos al sol',
      subtitle: 'Luz matutina = cortisol bien puesto + vitamina D + mejor sueño.',
      cta: 'ATP SOL',
      route: '/solar',
    }),
  },
  {
    id: 'agua-mitad',
    condition: (c) => afternoon(c) && c.waterTargetMl > 0 && c.waterMl < c.waterTargetMl * 0.5,
    make: (c) => ({
      title: 'Vas abajo en hidratación',
      subtitle: `${Math.round(c.waterMl)} de ${Math.round(c.waterTargetMl)} ml — recupera antes de la noche.`,
      cta: 'Registrar agua',
      route: '/hydration',
    }),
  },

  // ── Ciclo (mujer + fase conocida) ──
  {
    id: 'ciclo-menstrual',
    condition: (c) => c.sex === 'female' && c.cyclePhase === 'menstrual',
    make: () => ({
      title: 'Escucha tu cuerpo',
      subtitle: 'Fase menstrual: nutrición extra en hierro y descanso sin culpa.',
      cta: 'Ver ciclo',
      route: '/cycle',
    }),
  },
  {
    id: 'ciclo-folicular',
    condition: (c) => c.sex === 'female' && (c.cyclePhase === 'follicular' || c.cyclePhase === 'ovulation') && (morning(c) || midday(c)),
    make: () => ({
      title: 'Fase de energía alta',
      subtitle: 'Folicular: tu mejor momento para entrenamiento intenso.',
      cta: 'Entrenar',
      route: '/fitness-hub',
    }),
  },
  {
    id: 'ciclo-lutea',
    condition: (c) => c.sex === 'female' && c.cyclePhase === 'luteal' && (afternoon(c) || evening(c)),
    make: () => ({
      title: 'Cuida el descanso',
      subtitle: 'Fase lútea: considera baja intensidad y más magnesio.',
      cta: 'Ver ciclo',
      route: '/cycle',
    }),
  },

  // ── Rachas ──
  {
    id: 'racha-fuerte',
    condition: (c) => c.streak >= 7 && c.score < 100,
    make: (c) => ({
      title: `🔥 Racha de ${c.streak} días`,
      subtitle: 'No la pierdas — cierra tus electrones de hoy.',
    }),
  },
  {
    id: 'racha-nueva',
    condition: (c) => c.streak === 0 && c.score < 40 && (afternoon(c) || evening(c)),
    make: () => ({
      title: 'Nuevo día, nueva racha',
      subtitle: 'Ayer quedó atrás. Un electrón ahora y estás de vuelta.',
    }),
  },

  // ── Edad ATP ──
  {
    id: 'edad-atp-pendiente',
    condition: (c) => c.edadAtpDelta == null && (midday(c) || afternoon(c)),
    make: () => ({
      title: 'Conoce tu Edad ATP',
      subtitle: 'Completa tus tests y biomarcadores para calcularla.',
      cta: 'Ir a Edad ATP',
      route: '/edad-atp',
    }),
  },
  {
    id: 'edad-atp-mayor',
    condition: (c) => c.edadAtpDelta != null && c.edadAtpDelta < -0.5,
    make: () => ({
      title: 'Foco en biomarcadores esta semana',
      subtitle: 'Tu Edad ATP va arriba de tu edad — hay palancas claras que mover.',
      cta: 'Ver Edad ATP',
      route: '/edad-atp',
    }),
  },
  {
    id: 'edad-atp-joven',
    condition: (c) => c.edadAtpDelta != null && c.edadAtpDelta >= 0.5 && morning(c),
    make: (c) => ({
      title: `Sigues joven — ${Math.abs(Math.round(c.edadAtpDelta!))} año${Math.abs(Math.round(c.edadAtpDelta!)) === 1 ? '' : 's'} abajo`,
      subtitle: 'Tu Edad ATP está debajo de tu edad. Mantén el ritmo.',
    }),
  },

  // ── Contexto horario genérico ──
  {
    id: 'manana-arranque',
    condition: (c) => morning(c) && c.score < 30,
    make: () => ({
      title: 'Empieza tu día con sol y proteína',
      subtitle: 'Los primeros 90 minutos marcan el tono metabólico del día.',
    }),
  },
  {
    id: 'mediodia-checkin',
    condition: (c) => midday(c) && !c.meditationDone,
    make: () => ({
      title: 'Check-in de medio día',
      subtitle: '2 minutos: ¿cómo va tu energía? Ajusta la tarde a tiempo.',
      cta: 'Check-in',
      route: '/checkin',
    }),
  },
  {
    id: 'tarde-ejercicio',
    condition: (c) => afternoon(c) && c.score < 70,
    make: () => ({
      title: 'Ejercicio de la tarde',
      subtitle: 'Ventana ideal de fuerza: tu temperatura corporal está en pico.',
      cta: 'Entrenar',
      route: '/fitness-hub',
    }),
  },
  {
    id: 'noche-mente',
    condition: (c) => evening(c) && !c.meditationDone && !c.journalDone,
    make: () => ({
      title: 'Cierra el día en calma',
      subtitle: 'Meditación corta + journal: descarga la mente antes de dormir.',
      cta: 'Meditar',
      route: '/meditation',
    }),
  },
  {
    id: 'noche-pantallas',
    condition: (c) => c.hour >= 21 || c.hour < 5,
    make: () => ({
      title: 'Reduce pantallas y luz azul',
      subtitle: 'Lentes rojos o modo noche: protege tu melatonina.',
    }),
  },
  {
    id: 'dia-completo',
    condition: (c) => c.score >= 90,
    make: (c) => ({
      title: 'Día casi perfecto',
      subtitle: c.streak > 1 ? `Racha de ${c.streak} días y ${c.score}% de carga. Así se ve la consistencia.` : `${c.score}% de carga. Así se ve un gran día.`,
    }),
  },
];

/** Fallback editorial si ninguna regla matchea. */
const FALLBACK: HeroRecommendation = {
  id: 'fallback',
  title: 'Tu sistema operativo está corriendo',
  subtitle: 'Cada electrón que completas hoy es rendimiento mañana.',
};

/** Primera regla que matchea gana. Nunca devuelve null. */
export function getHeroRecommendation(ctx: HeroContext): HeroRecommendation {
  for (const rule of HERO_RULES) {
    if (rule.condition(ctx)) {
      return { id: rule.id, ...rule.make(ctx) };
    }
  }
  return FALLBACK;
}

/** Ventana de cache para no cambiar la recomendación de forma errática. */
export const HERO_CACHE_MS = 15 * 60 * 1000;
