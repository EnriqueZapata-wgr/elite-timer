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
 * CIERRE-1 — los dos chips que enseñan que la orbe también NAVEGA.
 *
 * Los seis de arriba son preguntas de contenido, todas. Nada en la app le
 * dice al usuario que la orbe es además el buscador: puede pedirle que lo
 * lleve a cualquiera de las 192 rutas del bundle y eso cuesta 0 protones y no
 * consume cuota, porque `decidirTurnoNav` resuelve ANTES de llamar al modelo.
 * La capacidad estaba construida y probada, y era invisible.
 *
 * El copy no es decorativo: `detectarIntencionNavegacion` busca el disparador
 * al ARRANQUE del texto normalizado, así que estas dos frases están escritas
 * para empezar con uno válido ("donde" y "llevame", ambos en DISPARADORES_NAV).
 * `normalizar` tira los signos, así que el "¿" inicial no estorba. Enseñan la
 * sintaxis que el resolvedor espera sin un solo tutorial: el usuario ve que
 * funcionó y generaliza solo.
 *
 * Si se editan, tienen que seguir arrancando con un disparador y NO contener
 * ninguna frase de VETOS_NAV, o caen al chat y entonces sí cobran.
 */
export const NAV_SUGGESTIONS: ChatSuggestion[] = [
  { label: '¿Dónde registro mis análisis?', icon: 'navigate-outline' },
  { label: 'Llévame a mi ayuno', icon: 'compass-outline' },
];

/**
 * Arma los chips del día: primero lo vivo (insight, ayuno, comidas, cierre),
 * luego los dos de navegación, luego relleno de los defaults sin repetir
 * icono. Siempre devuelve CHAT_SUGGESTIONS_COUNT.
 *
 * CIERRE-1: los de navegación tienen lugar RESERVADO. Si se dejaran al final
 * de la lista de relleno, un día con muchas señales vivas los empujaría fuera
 * del corte de seis y volverían a ser invisibles justo los días en que el
 * usuario más usa el chat.
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

  // Las señales vivas no pueden ocupar los seis lugares: se les recorta a lo
  // que deja libre la cuota reservada de navegación.
  const vivas = out.slice(0, CHAT_SUGGESTIONS_COUNT - NAV_SUGGESTIONS.length);
  const conNav = [...vivas, ...NAV_SUGGESTIONS];

  for (const d of DEFAULT_SUGGESTIONS) {
    if (conNav.length >= CHAT_SUGGESTIONS_COUNT) break;
    if (conNav.some((s) => s.icon === d.icon)) continue;
    conNav.push(d);
  }
  return conNav.slice(0, CHAT_SUGGESTIONS_COUNT);
}
