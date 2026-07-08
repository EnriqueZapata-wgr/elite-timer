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
  /**
   * #136: acción resoluble inline desde la card (optimistic update en HOY)
   * en vez de navegar — p. ej. registrar un vaso de agua con un tap.
   */
  quickAction?: { type: 'water'; amountMl: number };
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
    // #136: piso 11h (spec) + techo 20h — no empujamos "rompe el ayuno" de noche
    condition: (c) => c.fastingActive && c.hour >= 11 && c.hour <= 20,
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
    // #136: ventana 8-20h (a las 21h+ ya no tiene sentido empujar agua) y
    // copy time-aware: "primer vaso" a las 7pm sonaba absurdo (bug Enrique).
    condition: (c) => !c.fastingActive && c.hour >= 8 && c.hour <= 20 && c.waterMl <= 0,
    make: (c) => ({
      title: c.hour < 12 ? 'Bebe tu primer vaso de agua' : 'Aún sin agua registrada hoy',
      subtitle: c.hour < 12
        ? 'Cero ml registrados hoy. La hidratación mueve todo lo demás.'
        : 'Un vaso ahora — la hidratación mueve todo lo demás.',
      cta: 'Registrar 250 ml',
      quickAction: { type: 'water', amountMl: 250 },
    }),
  },
  {
    id: 'proteina-pendiente',
    // #136: techo 20h — sin nag de proteína a las 10pm
    condition: (c) => !c.fastingActive && c.hour >= 11 && c.hour <= 20 && c.proteinG <= 0,
    make: () => ({
      title: 'Agrega proteína ahora',
      subtitle: 'Sin proteína registrada hoy — tu masa muscular la pide.',
      cta: 'Registrar',
      route: '/food-register',
    }),
  },
  {
    id: 'sol-pendiente',
    // #136: ventana 6-11h (spec) — la luz que regula cortisol es la matutina
    condition: (c) => !c.sunDone && c.hour >= 6 && c.hour <= 11,
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
      cta: 'Registrar 250 ml',
      quickAction: { type: 'water', amountMl: 250 },
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
    // #136: desde las 20h (spec) — a las 19h todavía compite con cena/cierre
    condition: (c) => c.hour >= 20 && c.hour < 23 && !c.meditationDone && !c.journalDone,
    make: () => ({
      title: 'Cierra el día en calma',
      subtitle: 'Meditación corta + journal: descarga la mente antes de dormir.',
      cta: 'Meditar',
      route: '/meditation',
    }),
  },
  {
    id: 'noche-pantallas',
    // #136: 21-22h — antes disparaba 21-23 y 0-5am; la madrugada ahora la
    // cubre el fallback "duerme" (empujar lentes rojos a las 3am era ruido)
    condition: (c) => c.hour >= 21 && c.hour <= 22,
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

/**
 * #136 F1.2: fallback contextual empático por franja horaria — si ninguna
 * regla fuerte matchea, en vez de forzar una débil acompañamos el momento.
 */
export function getContextualFallback(hour: number): HeroRecommendation {
  if (hour >= 6 && hour < 11) {
    return {
      id: 'fallback-manana',
      title: 'Buen día. ¿Qué te propones hoy?',
      subtitle: 'Una intención escrita vale más que diez en la cabeza.',
      cta: 'Journal',
      route: '/journal',
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      id: 'fallback-mediodia',
      title: '¿Cómo estás llevando el día?',
      subtitle: '2 minutos de check-in y ajustas la tarde a tiempo.',
      cta: 'Check-in',
      route: '/checkin',
    };
  }
  if (hour >= 15 && hour < 19) {
    return {
      id: 'fallback-tarde',
      title: 'Cierre productivo. Pausa consciente.',
      subtitle: 'Tres respiraciones profundas resetean tu sistema nervioso.',
      cta: 'Respirar',
      route: '/breathing',
    };
  }
  if (hour >= 19 && hour < 23) {
    return {
      id: 'fallback-noche',
      title: 'Prepara tu descanso',
      subtitle: 'La calidad de mañana se decide esta noche.',
      cta: 'Meditar',
      route: '/meditation',
    };
  }
  // 23h-6am: lo único correcto que recomendar
  return {
    id: 'fallback-madrugada',
    title: 'Tu mejor protocolo ahora es dormir',
    subtitle: 'El sueño profundo es donde se construye todo lo demás.',
  };
}

/** Primera regla que matchea gana. Nunca devuelve null. */
export function getHeroRecommendation(ctx: HeroContext): HeroRecommendation {
  for (const rule of HERO_RULES) {
    if (rule.condition(ctx)) {
      return { id: rule.id, ...rule.make(ctx) };
    }
  }
  return getContextualFallback(ctx.hour);
}

/** Ventana de cache para no cambiar la recomendación de forma errática. */
export const HERO_CACHE_MS = 15 * 60 * 1000;
