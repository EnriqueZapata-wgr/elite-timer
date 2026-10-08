/**
 * mi-plan-service (7-oct-2026, Mi plan). El IO de la pantalla "Mi plan" y de
 * su tarjeta en HOY. La regla vive en mi-plan-core.ts con test; aqui solo se
 * junta la materia prima.
 *
 * Solo LEE. Mi plan no tiene caminos de escritura: lo propio se cambia en su
 * editor de siempre y lo que fijo el coach no se toca desde la app del
 * cliente (decision del dueno, 7-oct-2026).
 *
 * Cada parte es una lectura independiente y DICE si fallo (`Lectura<T>`):
 * supabase-js no lanza en 4xx, asi que cada `error` se revisa. Una parte que
 * falla no tumba a las demas; por eso nada de `Promise.all` que rechace: cada
 * lector atrapa lo suyo y devuelve `{ ok: false }`.
 *
 * Se reusan los servicios que ya existen donde ya distinguen "no se pudo
 * leer" de "no hay" (getAsignaciones, getPlanDelCoachResultado,
 * leerEvaluacionEliteVigente). Las practicas y las preferencias se leen aqui
 * porque sus lectores de siempre (getMyProtocol, getUserSchedule) devuelven
 * vacio o un default cuando fallan, y en esta pantalla un fallo no puede
 * verse como "no tienes nada".
 *
 * Las preferencias y el cronotipo alimentan varias partes (habitos, metas,
 * sueno, horas de las practicas): dentro de UNA llamada se leen una sola vez.
 *
 * 8-oct-2026 (revisión en frío):
 *  - Cada parte corre contra un tope (juntarLecturas, 8 s) y las dos lecturas
 *    compartidas contra uno mas corto (6 s). Antes se esperaba a todas sin
 *    limite y UNA consulta colgada dejaba la pantalla y la tarjeta en blanco.
 *  - Los estados de los habitos sin leer son un fallo de la parte de habitos,
 *    no "todos activos" (habitosDeLecturas).
 *  - Este es el UNICO archivo de Mi plan que nombra la columna cruda de las
 *    horas de los habitos (goals.habit_times). Se la entrega al lector de la
 *    casa (horasDeHabitos -> parseHabitTimeEntry) y el core solo ve entradas
 *    validas. El candado de mb27-contratos lo tiene declarado.
 *
 * 8-oct-2026 (nivel 2): las practicas se leen pidiendo `assigned_by` (quien
 * las asigno desde el programa, migracion 329) con la caida del constructor
 * de practicas (leerConCaidaDeAsignacion): si la base todavia no tiene la
 * columna, se relee con el select de siempre y ninguna llega como asignada.
 * Un error de verdad sigue siendo "no se pudo leer", nunca una lista vacia.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getAsignaciones } from '@/src/services/fitness/plan-semanal-service';
import { esRutinaDeCoach } from '@/src/services/fitness/plan-semanal-core';
import { primerNombre } from '@/src/services/fitness/today-session-core';
import { getPlanDelCoachResultado } from '@/src/services/nutrition-service';
import { metasDelPlan } from '@/src/services/nutrition/plan-comidas-core';
import { getHabitStates } from '@/src/services/hoy/habit-states-service';
import { DEFAULT_BOOLEANS } from '@/src/services/hoy/day-booleans';
import { leerEvaluacionEliteVigente } from '@/src/services/hoy/elite-hoy-service';
import {
  leerConCaidaDeAsignacion, type UserInterventionRow,
} from '@/src/services/interventions/intervention-service-core';
import {
  conTope, GATE_DESCONOCIDO, habitosDeLecturas, horasDeHabitos, juntarLecturas, LECTURA_FALLIDA, LECTURA_ILEGIBLE,
  lecturaOk, metasDeGoals, necesitaGate, PARTES_TODAS, planDeEvaluacion, practicasDeFilas, TOPE_COMPARTIDA_MS,
  ventanaDeSueno,
  type CronotipoIn, type GateHabitos, type InsumosPlan, type Lectura, type ParteKey, type PlanAlimentacionIn,
  type PrefsHabitosIn, type SuplementoPlanRow, type TareaLectura,
} from './mi-plan-core';

/** Mismo default que install-service: lo que la app usa cuando la fila aun no existe. */
const DEFAULT_QUANTS = ['protein', 'water'];

interface PrefsDia {
  booleans: string[];
  quants: string[];
  goals: Record<string, unknown>;
}

/** user_day_preferences, diciendo si fallo. Sin fila = los defaults de la app, que es lo que HOY pinta. */
async function leerPrefs(userId: string): Promise<Lectura<PrefsDia>> {
  try {
    const { data, error } = await supabase
      .from('user_day_preferences')
      .select('active_boolean_electrons, active_quantitative_electrons, goals')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logWarn('[mi-plan] preferencias no se pudieron leer', error);
      return LECTURA_FALLIDA;
    }
    const fila = (data ?? {}) as {
      active_boolean_electrons?: unknown; active_quantitative_electrons?: unknown; goals?: unknown;
    };
    return lecturaOk({
      booleans: Array.isArray(fila.active_boolean_electrons) ? (fila.active_boolean_electrons as string[]) : [...DEFAULT_BOOLEANS],
      quants: Array.isArray(fila.active_quantitative_electrons) ? (fila.active_quantitative_electrons as string[]) : DEFAULT_QUANTS,
      goals: fila.goals && typeof fila.goals === 'object' ? (fila.goals as Record<string, unknown>) : {},
    });
  } catch (e) {
    logWarn('[mi-plan] preferencias no se pudieron leer', e);
    return LECTURA_FALLIDA;
  }
}

/** user_chronotype (columnas planas). `ok` con null = la persona no tiene cronotipo. */
async function leerCronotipo(userId: string): Promise<Lectura<CronotipoIn | null>> {
  try {
    const { data, error } = await supabase
      .from('user_chronotype')
      .select('wake_time, sleep_time, chronotype, raw_scores')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logWarn('[mi-plan] cronotipo no se pudo leer', error);
      return LECTURA_FALLIDA;
    }
    if (!data) return lecturaOk(null);
    const fila = data as Record<string, unknown>;
    return lecturaOk({
      wake_time: typeof fila.wake_time === 'string' ? fila.wake_time : null,
      sleep_time: typeof fila.sleep_time === 'string' ? fila.sleep_time : null,
      chronotype: typeof fila.chronotype === 'string' ? fila.chronotype : null,
      raw_scores: (fila.raw_scores ?? null) as CronotipoIn['raw_scores'],
    });
  } catch (e) {
    logWarn('[mi-plan] cronotipo no se pudo leer', e);
    return LECTURA_FALLIDA;
  }
}

/**
 * Los coaches activos de la cuenta: id -> primer nombre. El mismo join que
 * usan Entrenar y Comida (coach_clients -> profiles), aqui sin filtrar por un
 * coach para resolver todas las filas de la semana con una sola lectura.
 * Fail-soft: sin nombre la fila dice "Lo fijó tu coach".
 */
async function leerNombresDeCoach(userId: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('coach_clients')
      .select('coach_id, coach:profiles!coach_clients_coach_id_fkey(full_name)')
      .eq('client_id', userId)
      .eq('status', 'active');
    if (error || !data) return {};
    const out: Record<string, string> = {};
    for (const fila of data as Array<{
      coach_id?: string | null;
      coach?: { full_name?: string | null } | { full_name?: string | null }[] | null;
    }>) {
      const coach = Array.isArray(fila.coach) ? fila.coach[0] : fila.coach;
      const nombre = primerNombre(coach?.full_name ?? null);
      if (fila.coach_id && nombre) out[fila.coach_id] = nombre;
    }
    return out;
  } catch {
    return {};
  }
}

/** Cuanto se espera el nombre del coach antes de seguir sin el. */
const TOPE_NOMBRES_MS = 4000;

async function leerRutinas(userId: string): Promise<Pick<InsumosPlan, 'rutinas' | 'coachPorId'>> {
  try {
    // getAsignaciones: null = no se pudo leer (y ya sirve el cache del dia si lo hay).
    const rows = await getAsignaciones(userId);
    if (rows === null) return { rutinas: LECTURA_FALLIDA };
    // El nombre solo se busca si de verdad hay algo asignado por otra persona.
    // 8-oct-2026 (revisión en frío): con su propio tope. El nombre es adorno
    // (sin el la fila dice "tu coach"); si esa lectura se cuelga no puede
    // llevarse las rutinas, que ya se leyeron.
    const coachPorId = rows.some(esRutinaDeCoach)
      ? await conTope(leerNombresDeCoach(userId), TOPE_NOMBRES_MS, {})
      : {};
    return { rutinas: lecturaOk(rows), coachPorId };
  } catch (e) {
    logWarn('[mi-plan] rutinas no se pudieron leer', e);
    return { rutinas: LECTURA_FALLIDA };
  }
}

async function leerSuplementos(userId: string): Promise<Lectura<SuplementoPlanRow[]>> {
  try {
    const { data, error } = await supabase
      // select('*') como la agenda: trae is_plan sin romper en un remoto que aun no tenga la columna.
      .from('user_supplements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) {
      logWarn('[mi-plan] suplementos no se pudieron leer', error);
      return LECTURA_FALLIDA;
    }
    return lecturaOk(((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      name: typeof r.name === 'string' ? r.name : null,
      timing: typeof r.timing === 'string' ? r.timing : null,
      dose_times: r.dose_times,
      dose_pattern: typeof r.dose_pattern === 'string' ? r.dose_pattern : null,
      source: typeof r.source === 'string' ? r.source : null,
      is_plan: typeof r.is_plan === 'boolean' ? r.is_plan : null,
      is_active: typeof r.is_active === 'boolean' ? r.is_active : null,
    })));
  } catch (e) {
    logWarn('[mi-plan] suplementos no se pudieron leer', e);
    return LECTURA_FALLIDA;
  }
}

async function leerPracticas(
  userId: string,
  chrono: Promise<Lectura<CronotipoIn | null>>,
): Promise<InsumosPlan['practicas']> {
  try {
    const { data, error } = await leerConCaidaDeAsignacion<unknown>((columnas) => supabase
      .from('user_interventions')
      .select(columnas)
      .eq('user_id', userId)
      .eq('status', 'active'));
    if (error) {
      logWarn('[mi-plan] practicas no se pudieron leer', error);
      return LECTURA_FALLIDA;
    }
    return lecturaOk(practicasDeFilas((data ?? []) as unknown as UserInterventionRow[], await chrono));
  } catch (e) {
    logWarn('[mi-plan] practicas no se pudieron leer', e);
    return LECTURA_FALLIDA;
  }
}

/**
 * La compuerta de los habitos que no son para todas las personas (8-oct-2026,
 * revisión en frío). Los mismos dos datos, de las mismas dos tablas, con los
 * que HOY decide si ofrece el registro del ciclo (day-compiler: el sexo
 * biologico del perfil y el modo de la app Ciclo). Fail-soft igual que alla:
 * un dato que no se pudo leer queda en null, y sin sexo conocido el habito no
 * se lista. Nunca se asume.
 */
async function leerGateHabitos(userId: string): Promise<GateHabitos> {
  try {
    const [perfil, ciclo] = await Promise.all([
      supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
      supabase.from('user_app_modes').select('mode').eq('user_id', userId).eq('app_key', 'ciclo').maybeSingle(),
    ]);
    const sexo = (perfil.data as { biological_sex?: unknown } | null)?.biological_sex;
    const modo = (ciclo.data as { mode?: unknown } | null)?.mode;
    return {
      sexoBiologico: typeof sexo === 'string' ? sexo : null,
      modoCiclo: typeof modo === 'string' ? modo : null,
    };
  } catch (e) {
    logWarn('[mi-plan] la compuerta de habitos no se pudo leer; se trata como desconocida', e);
    return GATE_DESCONOCIDO;
  }
}

async function leerHabitos(
  userId: string,
  prefs: Promise<Lectura<PrefsDia>>,
  chrono: Promise<Lectura<CronotipoIn | null>>,
): Promise<InsumosPlan['habitos']> {
  try {
    const [p, estados, c] = await Promise.all([prefs, getHabitStates(userId), chrono]);
    if (!p.ok) return LECTURA_FALLIDA;
    const entrada: PrefsHabitosIn = {
      booleans: p.dato.booleans,
      quants: p.dato.quants,
      // Lo crudo de la base pasa por el lector de la casa antes de salir de aqui.
      horas: horasDeHabitos(p.dato.goals.habit_times),
      wakeTime: p.dato.goals.wake_time,
      sleepTime: p.dato.goals.sleep_time,
    };
    // La compuerta solo se lee si hay un habito encendido que la necesita.
    const gate = necesitaGate(entrada) ? await leerGateHabitos(userId) : GATE_DESCONOCIDO;
    // 8-oct-2026 (revisión en frío): `estados === null` (no se pudieron leer)
    // ya no es "todos activos"; habitosDeLecturas lo vuelve fallo de esta
    // parte. HOY sigue con su convencion: aqui un habito en reposo que se
    // listara como activo tambien se contaba en la tarjeta.
    return habitosDeLecturas(lecturaOk(entrada), estados, c, gate);
  } catch (e) {
    logWarn('[mi-plan] habitos no se pudieron leer', e);
    return LECTURA_FALLIDA;
  }
}

async function leerPlanAlimentacion(userId: string): Promise<InsumosPlan['planAlimentacion']> {
  try {
    const r = await getPlanDelCoachResultado(userId);
    if (!r.ok) return LECTURA_FALLIDA;
    if (!r.plan) return lecturaOk<PlanAlimentacionIn | null>(null);
    const { plan, comidas, coachNombre, propio } = r.plan;
    const fija = (v: unknown) => Number.isFinite(Number(v)) && Number(v) > 0;
    return lecturaOk<PlanAlimentacionIn | null>({
      nombre: plan.name ?? null,
      metas: metasDelPlan(plan),
      comidas,
      propio,
      coachNombre,
      fijaProteina: fija(plan.protein_target),
      fijaAgua: fija(plan.water_target),
    });
  } catch (e) {
    logWarn('[mi-plan] plan de alimentacion no se pudo leer', e);
    return LECTURA_FALLIDA;
  }
}

async function leerEvaluacion(userId: string, forzar: boolean): Promise<InsumosPlan['evaluacion']> {
  try {
    const r = await leerEvaluacionEliteVigente(userId, { forzar });
    // 8-oct-2026 (revisión en frío): 'formato' viaja aparte. La fila existe y
    // esta version de la app no la entiende: reintentar no la arregla.
    if (!r.ok) return r.motivo === 'formato' ? LECTURA_ILEGIBLE : LECTURA_FALLIDA;
    return lecturaOk(r.evaluacion ? planDeEvaluacion(r.evaluacion) : null);
  } catch (e) {
    logWarn('[mi-plan] evaluacion no se pudo leer', e);
    return LECTURA_FALLIDA;
  }
}

export interface OpcionesMiPlan {
  /** Que partes leer. Por defecto, todas. La tarjeta de HOY pide PARTES_RESUMEN. */
  partes?: readonly ParteKey[];
  /** Salta la cache de 60 s de la evaluacion (Reintentar, jalar hacia abajo). */
  forzar?: boolean;
}

/**
 * Lee las partes pedidas, en paralelo, cada una con su propio desenlace.
 * Nunca rechaza: lo que fallo llega como `{ ok: false }` en SU parte. Las
 * partes no pedidas no vienen (undefined), y la pantalla no pinta su seccion.
 *
 * 8-oct-2026 (revisión en frío): cada parte corre contra su tope
 * (juntarLecturas). Antes todas escribian sobre un mismo objeto y se esperaba
 * a la ultima sin limite; ahora cada tarea entrega su trozo, y la que no
 * llega a tiempo deja SU parte como "no se pudo leer" sin frenar a las demas.
 * Lo que llegue despues del tope se descarta: nada escribe sobre un resultado
 * que ya se entrego a la pantalla.
 */
export async function leerMiPlan(userId: string, opts: OpcionesMiPlan = {}): Promise<InsumosPlan> {
  const pedidas = new Set<ParteKey>(opts.partes ?? PARTES_TODAS);
  const quiere = (p: ParteKey) => pedidas.has(p);

  // Lecturas compartidas: una sola vez por llamada, y solo si alguien las usa.
  // Con tope propio, mas corto que el de una parte: si se cuelgan, cada parte
  // que las usa todavia alcanza a armarse sabiendo que eso no se pudo leer.
  let prefsP: Promise<Lectura<PrefsDia>> | null = null;
  let chronoP: Promise<Lectura<CronotipoIn | null>> | null = null;
  const prefs = () => (prefsP ??= conTope<Lectura<PrefsDia>>(leerPrefs(userId), TOPE_COMPARTIDA_MS, LECTURA_FALLIDA));
  const chrono = () => (
    chronoP ??= conTope<Lectura<CronotipoIn | null>>(leerCronotipo(userId), TOPE_COMPARTIDA_MS, LECTURA_FALLIDA)
  );

  const tareas: TareaLectura[] = [];
  if (quiere('rutinas')) tareas.push({ partes: ['rutinas'], lectura: leerRutinas(userId) });
  if (quiere('suplementos')) {
    tareas.push({ partes: ['suplementos'], lectura: leerSuplementos(userId).then((r) => ({ suplementos: r })) });
  }
  if (quiere('practicas')) {
    tareas.push({ partes: ['practicas'], lectura: leerPracticas(userId, chrono()).then((r) => ({ practicas: r })) });
  }
  if (quiere('habitos')) {
    tareas.push({ partes: ['habitos'], lectura: leerHabitos(userId, prefs(), chrono()).then((r) => ({ habitos: r })) });
  }
  if (quiere('planAlimentacion')) {
    tareas.push({
      partes: ['planAlimentacion'],
      lectura: leerPlanAlimentacion(userId).then((r) => ({ planAlimentacion: r })),
    });
  }
  if (quiere('metas')) {
    tareas.push({
      partes: ['metas'],
      lectura: prefs().then((p) => ({ metas: p.ok ? lecturaOk(metasDeGoals(p.dato.goals)) : LECTURA_FALLIDA })),
    });
  }
  if (quiere('sueno')) {
    tareas.push({
      partes: ['sueno'],
      lectura: Promise.all([prefs(), chrono()]).then(([p, c]) => ({
        sueno: ventanaDeSueno(p.ok ? lecturaOk<unknown>(p.dato.goals) : LECTURA_FALLIDA, c),
      })),
    });
  }
  if (quiere('evaluacion')) {
    tareas.push({
      partes: ['evaluacion'],
      lectura: leerEvaluacion(userId, opts.forzar === true).then((r) => ({ evaluacion: r })),
    });
  }
  // Los lectores ya atrapan lo suyo; juntarLecturas es el cinturon: una tarea
  // que lanza o que no llega deja sus partes como fallo, nunca como "no pedida".
  return juntarLecturas(tareas);
}
