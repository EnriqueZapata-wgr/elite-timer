/**
 * ARGOS Personality — voz textual + presencia de ARGOS.
 * Sprint MAGIA ARGOS (#94/#95/#66). T3 (voz/tono) + T5 (time-aware).
 *
 * Este módulo es la "voz" de ARGOS a nivel de UI (greetings, refuerzos,
 * celebraciones) y también aporta un sufijo de personalidad que se inyecta
 * en el system prompt del LLM (capa de PRESENCIA, aditiva — NO reemplaza el
 * voice_config dinámico del coach-engine ni el prompt largo del Braverman
 * premium, que se dejan intactos).
 *
 * Diseño:
 *  - Puro y testeable: nada de imports nativos ni de acceso a red.
 *  - La hora se resuelve en zona América/Ciudad de México (patrón v6), pero
 *    la fuente de hora es inyectable para tests deterministas.
 *
 * NOTA DE COPY: las frases son BORRADOR de Fable. Enrique/Mariana validan el
 * wording final antes de Founders M1 (marcadas en el buzón de entrega).
 */

// ── Franja horaria ────────────────────────────────────────────────────────

export type TimeOfDay =
  | 'early_morning' // 04–07
  | 'morning'       // 07–11
  | 'noon'          // 11–14
  | 'afternoon'     // 14–17
  | 'evening'       // 17–20
  | 'night'         // 20–23
  | 'late_night';   // 23–04

/**
 * Bucketiza una hora local (0–23) en la franja de ARGOS. Pura y testeable
 * (mismo patrón que hoyBgBucket). Los límites siguen la spec T5.
 */
export function bucketTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 4 && hour < 7) return 'early_morning';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 23) return 'night';
  return 'late_night'; // 23:00–03:59
}

/**
 * Hora (0–23) en zona América/Ciudad de México. Usa Intl con hourCycle h23
 * para que la medianoche devuelva 0 y no 24 (patrón v6 establecido).
 */
export function getMexicoCityHour(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const hour = parseInt(hourPart, 10);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

/** Franja horaria actual (o de una fecha dada) en Ciudad de México. */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  return bucketTimeOfDay(getMexicoCityHour(date));
}

/**
 * Clave de greeting simplificada (mañana/tarde/noche) para el mapa ARGOS_VOICE.
 * Colapsa las 7 franjas finas de TimeOfDay en los 4 momentos de saludo.
 */
export type GreetingSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export function greetingSlot(tod: TimeOfDay): GreetingSlot {
  switch (tod) {
    case 'early_morning':
    case 'morning':
      return 'morning';
    case 'noon':
    case 'afternoon':
      return 'afternoon';
    case 'evening':
      return 'evening';
    case 'night':
    case 'late_night':
    default:
      return 'night';
  }
}

// ── Voz de ARGOS ────────────────────────────────────────────────────────────
// {nombre} se sustituye con formatVoiceLine. Mantener frases CORTAS y directas:
// ingeniería + ciencia como analogías, cercano pero no empalagoso, nunca
// condescendiente (ver filosofía de comunicación de Enrique).

export const ARGOS_VOICE = {
  greeting: {
    morning: [
      'Buenos días, {nombre}. Vamos por otro día.',
      '{nombre}, ¿cómo amaneciste?',
      'Buenos días. Ya estoy listo cuando tú lo estés.',
      'Arranca el sistema, {nombre}. Hoy sumamos.',
    ],
    afternoon: [
      'Vamos a media máquina, {nombre}. ¿Cómo va el día?',
      '{nombre}, buen momento para recalibrar.',
      'Tarde productiva, {nombre}. Sigo aquí.',
    ],
    evening: [
      'Cae la tarde, {nombre}. Buen momento para cerrar fuerte.',
      '{nombre}, ¿cómo cerramos el día?',
      'Última carga del día, {nombre}. Aprovéchala.',
    ],
    night: [
      'Es de noche, {nombre}. El descanso también es entrenamiento.',
      '{nombre}, hora de bajar revoluciones.',
      'Buenas noches, {nombre}. Mañana seguimos.',
    ],
  } as Record<GreetingSlot, string[]>,

  // Al completar hábitos / acciones efectivas.
  encouragement: [
    'Eso cuenta. Acción efectiva registrada.',
    'Un electrón más al sistema. Sigue.',
    'Consistencia sobre intensidad. Vas bien.',
    'Sumado. El proceso se construye así, un dato a la vez.',
  ],

  // Al detectar drops en métricas / racha en riesgo.
  concern: [
    'Vi una caída en tus datos. No es alarma, es señal. Ajustemos.',
    'Algo bajó respecto a tu línea base. Hablemos de qué pasó.',
    'Tu sistema pide atención hoy. Prioricemos recuperación.',
  ],

  // Al alcanzar hitos: rachas, PRs, rangos.
  celebration: [
    'Eso es un récord tuyo. Documentado. Bien hecho, {nombre}.',
    'Nuevo hito, {nombre}. El proceso está rindiendo.',
    'Racha sostenida. Esto ya no es suerte, es método.',
  ],
} as const;

// ── Selección sin repetición ────────────────────────────────────────────────

/**
 * Elige una variante del pool evitando las que están en `recent`. Si todas
 * están recientes (pool pequeño), cae al pool completo. `rand` inyectable para
 * tests deterministas.
 */
export function pickVariant(
  pool: readonly string[],
  recent: readonly string[] = [],
  rand: () => number = Math.random,
): string {
  if (pool.length === 0) return '';
  const fresh = pool.filter((p) => !recent.includes(p));
  const source = fresh.length > 0 ? fresh : pool;
  const idx = Math.min(source.length - 1, Math.floor(rand() * source.length));
  return source[idx];
}

/**
 * Rotador con memoria: mantiene las últimas `keepLast` frases usadas por
 * categoría para no repetir. Runtime-only (no persiste — memoria persistente
 * es #92, fuera de scope).
 */
export class VoiceRotator {
  private recentByCategory: Record<string, string[]> = {};

  constructor(private readonly keepLast: number = 3) {}

  pick(category: string, pool: readonly string[], rand: () => number = Math.random): string {
    const recent = this.recentByCategory[category] ?? [];
    const choice = pickVariant(pool, recent, rand);
    this.recentByCategory[category] = [...recent, choice].slice(-this.keepLast);
    return choice;
  }

  /** Expuesto para tests: las frases recientes de una categoría. */
  getRecent(category: string): readonly string[] {
    return this.recentByCategory[category] ?? [];
  }
}

// ── Templating ──────────────────────────────────────────────────────────────

/**
 * Sustituye {nombre} (y colapsa el saludo si no hay nombre para no dejar
 * comas huérfanas: "Buenos días, ." → "Buenos días."). Trim final.
 */
export function formatVoiceLine(line: string, vars: { nombre?: string }): string {
  const nombre = (vars.nombre ?? '').trim();
  let out = line.replace(/\{nombre\}/g, nombre);
  if (!nombre) {
    // Limpia comas/vocativos huérfanos que quedaban antes/después del nombre.
    out = out
      .replace(/^\s*,\s*/, '') // coma inicial huérfana ("{nombre}, ¿...")
      .replace(/,\s*\./g, '.')
      .replace(/,\s*\?/g, '?')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*$/g, '');
  }
  return out.trim();
}

/** Saludo listo-para-mostrar según la hora (México) y el nombre del usuario. */
export function buildGreeting(
  nombre: string | undefined,
  date: Date = new Date(),
  rotator?: VoiceRotator,
): string {
  const slot = greetingSlot(getTimeOfDay(date));
  const pool = ARGOS_VOICE.greeting[slot];
  const line = rotator ? rotator.pick(`greeting:${slot}`, pool) : pickVariant(pool);
  return formatVoiceLine(line, { nombre });
}

// ── Inyección de personalidad en el system prompt del LLM (capa PRESENCIA) ───

/**
 * Sufijo de PRESENCIA para el system prompt. Es aditivo: no redefine la
 * identidad del coach ni el tono del voice_config, solo aporta el "quién está
 * hablando ahora mismo" (nombre + tono). El contexto temporal vive en su propia
 * capa (buildTimeContextInjection, T5). Mantener BREVE — cada token aquí compite
 * con el contexto real del usuario.
 *
 * El texto es directriz para el modelo, no copy visible al usuario.
 */
export function buildPersonalityInjection(opts: {
  nombre?: string;
}): string {
  const nombre = (opts.nombre ?? '').trim();
  const lines: string[] = ['\n\n## PRESENCIA (capa de tono, no reemplaza reglas)'];
  if (nombre) {
    lines.push(
      `- El usuario se llama ${nombre}. Úsalo con naturalidad cuando aporte cercanía, sin abusar.`,
    );
  }
  lines.push(
    '- Directo y cercano, nunca empalagoso ni condescendiente. Frases cortas cuando el usuario está en flujo.',
    '- Usa analogías de ingeniería y ciencia cuando aclaren, no como adorno.',
    '- Si conoces un dato reciente del usuario, refiérelo con naturalidad ("ayer batiste tu récord de agua").',
  );
  return lines.join('\n');
}

// ── Contexto temporal (T5 time-aware) ────────────────────────────────────────

/** Descripción breve del momento del día (para inyección en el prompt). */
function describeTimeOfDay(tod: TimeOfDay): string {
  switch (tod) {
    case 'early_morning':
      return '- Es de madrugada/muy temprano en Ciudad de México: el usuario probablemente arranca su rutina. Prioriza hidratación, luz y activación suave.';
    case 'morning':
      return '- Es de mañana en Ciudad de México: buen momento para entrenar fuerte, planear el día y desayuno/hidratación.';
    case 'noon':
      return '- Es mediodía en Ciudad de México: ventana de energía alta; comida principal y foco en tareas demandantes.';
    case 'afternoon':
      return '- Es media tarde en Ciudad de México: útil para recalibrar, movilidad y evitar bajones de glucosa.';
    case 'evening':
      return '- Cae la tarde en Ciudad de México: cierre del día; empieza a bajar estímulos y prepara la recuperación.';
    case 'night':
      return '- Es de noche en Ciudad de México: prioriza descanso, no sugieras cardio intenso ni cafeína.';
    case 'late_night':
    default:
      return '- Es muy noche/madrugada en Ciudad de México: el usuario debería dormir. Evita planes de esfuerzo; enfoca sueño y recuperación.';
  }
}

/**
 * Inyección de CONTEXTO TEMPORAL para el system prompt del LLM (T5). Le dice a
 * ARGOS qué momento del día es en Ciudad de México y cómo debe adaptar sus
 * recomendaciones. Directriz para el modelo, no copy visible.
 */
export function buildTimeContextInjection(date: Date = new Date()): string {
  const tod = getTimeOfDay(date);
  return `\n\n## CONTEXTO TEMPORAL (Ciudad de México)\n${describeTimeOfDay(tod)}\nAjusta tono y recomendaciones a este momento del día. No propongas acciones fuera de lugar para la hora (ej. entrenamiento pesado de madrugada).`;
}
