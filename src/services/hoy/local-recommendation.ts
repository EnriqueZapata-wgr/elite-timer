/**
 * local-recommendation — mensaje contextual del Hero Agenda card SIN llamar a ARGOS (gratis,
 * instantáneo, offline). 20 reglas declarativas cubren el ~80% de los casos del día; el resto
 * cae a un mensaje por defecto. Función PURA (sin React Native ni supabase) → 100% testeable.
 */

/** Evento mínimo que necesita la recomendación (subset de AgendaItem de day-compiler). */
export interface AgendaEventLike {
  category: string;            // 'meal' | 'exercise' | 'rhythm' | 'mind' | 'supplement' | 'recovery' | …
  name: string;                // título visible, ej. "Desayuno", "Luz solar"
  defaultMessage?: string;
}

export interface RecommendationContext {
  hour: number;                // hora local 0-23
  fastingHours?: number;       // horas de ayuno acumuladas
  fastingTarget?: number;      // meta de ayuno (h)
  proteinConsumed?: number;    // g de proteína hoy
  proteinTarget?: number;      // meta de proteína (g)
  waterConsumed?: number;      // ml de agua hoy
  waterTarget?: number;        // meta de agua (ml)
  exerciseDoneToday?: boolean;
  sunriseHour?: number;
  sunsetHour?: number;
}

const has = (name: string, ...words: string[]) => {
  const n = name.toLowerCase();
  return words.some((w) => n.includes(w));
};

/** Genera el mensaje local para un evento dado el contexto del día. */
export function generateLocalRecommendation(event: AgendaEventLike, ctx: RecommendationContext): string {
  const cat = event.category;

  // ── Comidas ──
  if (cat === 'meal' && has(event.name, 'desayuno', 'romper', 'ayuno')) {
    const fh = ctx.fastingHours ?? 0;
    const ft = ctx.fastingTarget ?? 0;
    if (ft > 0 && fh >= ft) return `Es momento de romper tu ayuno, vas en ${Math.round(fh)}h`;
    if (ft > 0) return `Falta para tu ventana, vas en ${Math.round(fh)}h de ${ft}h`;
    return 'Arranca el día con una comida con buena proteína';
  }
  if (cat === 'meal' && has(event.name, 'comida', 'almuerzo')) {
    const missing = (ctx.proteinTarget ?? 0) - (ctx.proteinConsumed ?? 0);
    if (missing > 0) return `Asegura ${Math.round(missing)}g de proteína en esta comida`;
    return 'Vas bien con tu proteína de hoy ✓';
  }
  if (cat === 'meal' && has(event.name, 'cena')) {
    return 'Cena ligero y temprano para dormir mejor';
  }
  if (cat === 'meal' && has(event.name, 'agua', 'hidrat')) {
    const missing = (ctx.waterTarget ?? 0) - (ctx.waterConsumed ?? 0);
    if (missing > 250) return `Te faltan ${Math.round(missing)}ml para tu meta de agua`;
    return 'Casi llegas a tu meta de agua 💧';
  }

  // ── Ejercicio ──
  if (cat === 'exercise') {
    if (ctx.exerciseDoneToday) return 'Ya entrenaste hoy — recupera y muévete suave';
    if (has(event.name, 'cardio')) return 'Zona 2 hoy: ritmo cómodo, nariz, sin reventar';
    if (has(event.name, 'fuerza', 'push', 'pull', 'pierna')) return 'Energía en pico — dale con todo, técnica primero';
    return 'Muévete: hasta 10 min cuentan';
  }

  // ── Ritmo circadiano ──
  if (cat === 'rhythm' && has(event.name, 'sol', 'luz')) {
    const sr = ctx.sunriseHour ?? 7;
    const ss = ctx.sunsetHour ?? 19;
    if (ctx.hour < sr) return 'Falta para tu ventana de sol de la mañana';
    if (ctx.hour > ss) return 'El sol ya bajó, mejor mañana en la AM';
    if (ctx.hour < 10) return 'Estás en ventana óptima de luz matutina 🌞';
    return 'Aprovecha la luz natural ahora 🌞';
  }
  if (cat === 'rhythm' && has(event.name, 'lentes', 'rojo')) {
    const ss = ctx.sunsetHour ?? 19;
    if (ctx.hour >= ss - 1) return 'Ponte los lentes rojos: baja la luz azul para dormir';
    return 'Cerca del atardecer, prepara tus lentes rojos';
  }
  if (cat === 'rhythm' && has(event.name, 'grounding')) {
    return 'Pies en el pasto unos minutos — reconecta';
  }

  // ── Mente ──
  if (cat === 'mind' && has(event.name, 'medita')) return 'Unos minutos de meditación bajan el ruido mental';
  if (cat === 'mind' && has(event.name, 'breath', 'respira')) return 'Respira: 4 segundos dentro, 6 fuera';
  if (cat === 'mind' && has(event.name, 'check')) return 'Tómate 1 minuto para registrar cómo te sientes';

  // ── Recuperación ──
  if (cat === 'recovery' && has(event.name, 'frío', 'frio', 'baño')) return 'Baño frío: 1-3 min, respira lento al entrar';
  if (cat === 'recovery') return 'Prioriza recuperación: tu cuerpo lo agradece';

  // ── Suplementos ──
  if (cat === 'supplement') return 'Revisa tus suplementos de este momento del día';

  // ── Métrica (UV, etc.) ──
  if (cat === 'metric' && has(event.name, 'uv')) {
    const ss = ctx.sunsetHour ?? 19;
    if (ctx.hour > ss) return 'El sol ya bajó — revisa el UV mañana';
    return 'Revisa el índice UV antes de exponerte';
  }

  // ── Fallback por hora del día ──
  if (event.defaultMessage) return event.defaultMessage;
  if (ctx.hour < 12) return 'Sigue tu plan de la mañana';
  if (ctx.hour < 18) return 'Vas a la mitad del día — mantén el ritmo';
  return 'Cierra bien el día, prepárate para descansar';
}
