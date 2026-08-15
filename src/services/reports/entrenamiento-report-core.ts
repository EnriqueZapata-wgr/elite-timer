/**
 * Entrenamiento Report Core (NOCHE-REP) — lógica PURA del reporte de
 * entrenamiento: volumen por día, progresión de fuerza y adherencia al plan.
 *
 * Sin react-native y sin supabase: corre en node y se prueba en node.
 *
 * DOS DECISIONES QUE VALE LA PENA DEJAR ESCRITAS.
 *
 * 1. EL VOLUMEN SE SUMA DE LOS SETS, NO DE LA SESIÓN. workout_sessions ya trae
 *    volume_kg precalculado al cerrar, pero solo existe para las sesiones que
 *    se cerraron con la pantalla de sesión. Los sets sueltos de exercise_logs
 *    (que es como se registró fuerza durante meses) quedarían fuera y el
 *    reporte diría menos volumen del que la persona de verdad levantó. Se suma
 *    de los sets, que es la fuente completa.
 *
 * 2. NO SE ESTIMA UN 1RM AQUÍ. personal_records ya guarda estimated_1rm con la
 *    fórmula que usa el resto de la app. Estimarlo otra vez con otra fórmula
 *    daría dos números distintos de la misma marca, que es exactamente lo que
 *    la doctrina de "un dato vive en un solo lugar" prohíbe. Este core LEE el
 *    1RM que ya existe y calcula el delta contra la marca anterior.
 */

// ── Entradas (formas mínimas de lo que devuelve Supabase) ────────────────

/** Un set registrado. `date` es la fecha LOCAL del cliente. */
export interface SetRow {
  date: string | null;
  reps: number | null;
  weight_kg: number | null;
  exercise_name?: string | null;
}

/** Una sesión de fuerza cerrada. */
export interface SessionRow {
  id: string;
  date: string;
  routine_name: string | null;
  duration_seconds: number | null;
  exercises_count: number | null;
  sets_count: number | null;
  volume_kg: number | null;
  prs_count: number | null;
  source: string | null;
}

/** Una sesión de cardio. */
export interface CardioRow {
  date: string;
  discipline: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
}

/** Una marca personal, con el 1RM que ya calculó quien la guardó. */
export interface PrRow {
  achieved_at: string;
  exercise_name: string | null;
  weight_kg: number | null;
  rep_range: number | null;
  estimated_1rm: number | null;
}

// ── Volumen ──────────────────────────────────────────────────────────────

export interface VolumenDia {
  date: string;
  /** Kilos movidos ese día: suma de reps × peso de cada set. */
  kg: number;
  sets: number;
}

/**
 * Volumen por día, en orden cronológico. Un set sin peso (peso corporal, o
 * carga no anotada) suma al conteo de sets pero NO inventa kilos: contarlo
 * como cero es honesto, contarlo como un peso supuesto sería mentir.
 */
export function volumenPorDia(sets: readonly SetRow[]): VolumenDia[] {
  const acc = new Map<string, VolumenDia>();
  for (const s of sets) {
    if (!s.date) continue;
    const dia = acc.get(s.date) ?? { date: s.date, kg: 0, sets: 0 };
    dia.sets += 1;
    const reps = s.reps ?? 0;
    const peso = s.weight_kg ?? 0;
    if (reps > 0 && peso > 0) dia.kg += reps * peso;
    acc.set(s.date, dia);
  }
  return [...acc.values()]
    .map((d) => ({ ...d, kg: Math.round(d.kg) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ResumenVolumen {
  totalKg: number;
  totalSets: number;
  diasEntrenados: number;
  /** El día de más kilos del rango. null si nunca se movió peso. */
  mejorDia: VolumenDia | null;
}

export function resumenVolumen(dias: readonly VolumenDia[]): ResumenVolumen {
  let totalKg = 0;
  let totalSets = 0;
  let mejorDia: VolumenDia | null = null;
  for (const d of dias) {
    totalKg += d.kg;
    totalSets += d.sets;
    if (d.kg > 0 && (!mejorDia || d.kg > mejorDia.kg)) mejorDia = d;
  }
  return { totalKg, totalSets, diasEntrenados: dias.length, mejorDia };
}

// ── Progresión de fuerza ─────────────────────────────────────────────────

export interface ProgresionEjercicio {
  ejercicio: string;
  /** El 1RM más reciente del rango. */
  actual: number;
  actualFecha: string;
  /** El 1RM de la marca anterior dentro del rango. null si es la primera. */
  anterior: number | null;
  /** actual - anterior. null si no hay con qué comparar. */
  delta: number | null;
  marcas: number;
}

/** Sin marca anterior no se dibuja una flecha: se dice que es la primera. */
export const SIN_COMPARACION = 'Primera marca del rango';

/**
 * Progresión por ejercicio, ordenada por el delta más grande primero: lo que
 * subió es lo que la persona quiere ver arriba. Las marcas sin 1RM registrado
 * se ignoran para el delta pero siguen contando como marcas.
 */
export function progresionDeFuerza(prs: readonly PrRow[]): ProgresionEjercicio[] {
  const porEjercicio = new Map<string, PrRow[]>();
  for (const pr of prs) {
    const nombre = (pr.exercise_name ?? '').trim();
    if (!nombre) continue;
    const lista = porEjercicio.get(nombre) ?? [];
    lista.push(pr);
    porEjercicio.set(nombre, lista);
  }

  const salida: ProgresionEjercicio[] = [];
  for (const [ejercicio, lista] of porEjercicio) {
    const orden = [...lista].sort((a, b) => a.achieved_at.localeCompare(b.achieved_at));
    const conRm = orden.filter((p) => p.estimated_1rm != null && p.estimated_1rm > 0);
    if (conRm.length === 0) continue;
    const ultimo = conRm[conRm.length - 1];
    const previo = conRm.length > 1 ? conRm[conRm.length - 2] : null;
    const actual = Math.round(ultimo.estimated_1rm as number);
    const anterior = previo ? Math.round(previo.estimated_1rm as number) : null;
    salida.push({
      ejercicio,
      actual,
      actualFecha: ultimo.achieved_at,
      anterior,
      delta: anterior == null ? null : actual - anterior,
      marcas: orden.length,
    });
  }
  return salida.sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity));
}

// ── Adherencia al plan ───────────────────────────────────────────────────

export interface AdherenciaPlan {
  /** Días de entrenamiento que la persona se propuso por semana. */
  metaSemanal: number;
  /** Sesiones que de verdad hizo en el rango (fuerza + cardio, sin doble conteo por día). */
  hechas: number;
  /** Sesiones que tocaban en el rango, según la meta. */
  esperadas: number;
  /** hechas / esperadas en porcentaje, tope 100. */
  pct: number;
  /** Sin meta declarada no se inventa una: se dice y ya. */
  tieneMeta: boolean;
}

export const SIN_META_COPY =
  'Todavía no fijas cuántos días quieres entrenar por semana. Sin esa meta no hay contra qué comparar, y suponerla sería medirte con una vara que no elegiste.';

/**
 * Adherencia al plan. Cuenta DÍAS con entrenamiento, no sesiones: dos sesiones
 * el mismo día no valen por dos días de un plan de cuatro por semana.
 *
 * `diasDelRango` null (el rango 'Todo') se resuelve con los días que van del
 * primer registro a hoy, que es el único periodo del que se puede responder.
 */
export function adherenciaAlPlan(
  diasConEntreno: readonly string[],
  metaSemanal: number | null,
  diasDelRango: number | null,
): AdherenciaPlan {
  const dias = new Set(diasConEntreno.filter(Boolean));
  const hechas = dias.size;
  if (metaSemanal == null || metaSemanal <= 0) {
    return { metaSemanal: 0, hechas, esperadas: 0, pct: 0, tieneMeta: false };
  }
  const cubiertos = diasDelRango ?? diasCubiertos([...dias]);
  const esperadas = Math.max(1, Math.round((cubiertos / 7) * metaSemanal));
  const pct = Math.min(100, Math.round((hechas / esperadas) * 100));
  return { metaSemanal, hechas, esperadas, pct, tieneMeta: true };
}

/** Días entre el primer y el último registro, contando ambos. 0 si no hay. */
export function diasCubiertos(fechas: readonly string[]): number {
  if (fechas.length === 0) return 0;
  const orden = [...fechas].sort();
  const ini = Date.parse(`${orden[0]}T00:00:00`);
  const fin = Date.parse(`${orden[orden.length - 1]}T00:00:00`);
  if (Number.isNaN(ini) || Number.isNaN(fin)) return 0;
  return Math.round((fin - ini) / 86_400_000) + 1;
}

// ── Duración ─────────────────────────────────────────────────────────────

/** Segundos a "1h 12min" / "45min". Sin dato devuelve null, no un cero falso. */
export function formatDuracion(segundos: number | null | undefined): string | null {
  if (segundos == null || segundos <= 0) return null;
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${h}h` : `${h}h ${resto}min`;
}
