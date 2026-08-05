/**
 * ARGOS Chat — sugerencias del estado vacío (MB-21 Pieza 4.4).
 *
 * Antes: seis chips hardcodeados, iguales para todos, todos los días. Ahora
 * proponen algo DE HOY: lo que registraste, lo que falta, lo que ARGOS notó
 * (el insight diario — la misma fuente que la card de la orbe en TAREAS).
 * Las señales las carga argos-suggestions.ts; aquí solo la decisión, pura.
 *
 * NOTA censo de iconos: los glifos de este archivo están inventariados a
 * conciencia en icon-censo-inventario.ts (son chips de prompt, no lanzadores
 * de función del registro).
 */

export interface TodaySignals {
  /** ¿Hay insight diario de ARGOS para hoy? (argos_daily_insights). */
  hasInsight: boolean;
  /** ¿Hay un ayuno activo ahora mismo? */
  fastingActive: boolean;
  /** Comidas registradas hoy. Null = no se pudo saber. */
  mealsToday: number | null;
  /** Electrones ganados hoy. Null = no se pudo saber. */
  electronsEarned: number | null;
  /** Hora local (0-23) — cambia el ángulo de la propuesta. */
  hour: number;
}

export interface ChatSuggestion {
  label: string;
  icon: string;
}

/** Cuántos chips pinta el estado vacío. */
export const CHAT_SUGGESTIONS_COUNT = 6;

/** A partir de esta hora la propuesta es cerrar el día, no arrancarlo. */
export const EVENING_HOUR = 17;

/** A partir de esta hora "no has registrado comidas" ya es señal, no madrugada. */
export const MEALS_MATTER_FROM_HOUR = 11;

/** Los seis de siempre — relleno cuando el día aún no dice nada. */
export const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  { label: '¿Qué debería comer?', icon: 'restaurant-outline' },
  { label: '¿Cómo mejorar mi sueño?', icon: 'moon-outline' },
  { label: 'Genera una rutina para hoy', icon: 'barbell-outline' },
  { label: '¿Cómo va mi progreso?', icon: 'trending-up-outline' },
  { label: 'Interpreta mi glucosa', icon: 'analytics-outline' },
  { label: 'Receta alta en proteína', icon: 'nutrition-outline' },
];

/**
 * Arma los chips del día: primero lo vivo (insight, ayuno, comidas, cierre),
 * luego relleno de los defaults sin repetir icono. Siempre devuelve
 * CHAT_SUGGESTIONS_COUNT.
 */
export function buildTodaySuggestions(signals: TodaySignals): ChatSuggestion[] {
  const out: ChatSuggestion[] = [];

  // Lo que ARGOS notó — la misma fuente que la card de la orbe en TAREAS.
  if (signals.hasInsight) {
    out.push({ label: 'Explícame lo que notaste hoy de mí', icon: 'sparkles-outline' });
  }
  if (signals.fastingActive) {
    out.push({ label: '¿Cómo va mi ayuno?', icon: 'hourglass-outline' });
  }
  if (signals.mealsToday != null) {
    if (signals.mealsToday === 0 && !signals.fastingActive && signals.hour >= MEALS_MATTER_FROM_HOUR) {
      out.push({ label: 'No he registrado comidas. ¿Qué me recomiendas?', icon: 'restaurant-outline' });
    } else if (signals.mealsToday > 0) {
      out.push({ label: '¿Cómo voy con mi nutrición hoy?', icon: 'nutrition-outline' });
    }
  }
  if (signals.electronsEarned != null && signals.hour >= EVENING_HOUR) {
    out.push({ label: '¿Qué me falta para cerrar el día?', icon: 'moon-outline' });
  }

  for (const d of DEFAULT_SUGGESTIONS) {
    if (out.length >= CHAT_SUGGESTIONS_COUNT) break;
    if (out.some((s) => s.icon === d.icon)) continue;
    out.push(d);
  }
  return out.slice(0, CHAT_SUGGESTIONS_COUNT);
}
