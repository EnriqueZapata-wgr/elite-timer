/**
 * ARGOS Context — lógica pura del contexto del usuario (MB-21 Pieza 7).
 *
 * buildContextPrompt arma el prompt con ~25 bloques de datos del usuario
 * (nombre, labs, glucosa, ciclo, emociones...). Vivía privado en
 * argos-service sin un solo test; aquí es puro y testeable en node.
 *
 * También vive aquí LA decisión del gate de consentimiento de memoria:
 * canLoadRichContext. Ese gate es lo que impide mandar datos de salud al
 * modelo sin permiso — y su política ante fallo es FAIL-CLOSED.
 */

import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';

export interface PersonalRecord {
  exercise: string;
  estimated1rm: number;
  weight: number;
  reps: number;
}

export interface UserContext {
  name: string;
  age?: number;
  gender?: string;
  chronotype?: string;
  /** Cuándo se determinó el cronotipo (user_chronotype.updated_at). */
  chronotypeUpdatedAt?: string;
  activeProtocol?: string;
  todayElectrons?: { earned: number; total: number };
  recentNutrition?: {
    todayCalories: number;
    todayProtein: number;
    mealsToday: number;
    avgCalories3d: number;
  };
  recentExercise?: { sessionsThisWeek: number };
  personalRecords?: PersonalRecord[];
  recentGlucose?: {
    lastValue: number;
    lastContext: string;
    readings: number;
  };
  currentFastingStatus?: {
    isFasting: boolean;
    hoursElapsed: number;
    targetHours: number;
    /** Pieza 3: la comparación contra la meta viene YA calculada. */
    ratioMeta?: number;
    /** Frase lista ("1.6 veces la meta" / "68% de la meta"). El modelo narra, no calcula. */
    comparacionMeta?: string;
  };
  rank?: string;
  bravermanProfile?: {
    dominant: string;
    primaryDeficiency: string;
    deficiencyLevel: string;
    /** braverman_results.completed_at — sin esto el modelo lo cita como hecho de hoy. */
    completedAt?: string;
  };
  functionalQuizzes?: {
    quiz: string;
    scores: Record<string, number>;
    issues: string[];
    completedAt?: string;
  }[];
  recentMindSessions?: {
    meditationDaysLast7: number;
    breathworkDaysLast7: number;
    avgMinutes: number;
  };
  recentJournal?: {
    entriesLast7: number;
    lastEntryDate: string | null;
    dominantTag: string | null;
  };
  recentMood?: {
    avgPleasantness: number;
    trend: 'up' | 'down' | 'stable';
    lastCheckInAt: string | null;
    checkInsLast7: number;
  };
  /** H.4 (MB-10): el check-in de HOY entra al contexto — solo el de hoy.
   *  El expediente de otros días NO viaja (límite duro del módulo). */
  todayEmotion?: {
    quadrant: string;
    labels: string[];
  };
  cycleInfo?: {
    cycleDay: number;
    currentPhase: string;
    // null = la fecha estimada ya venció y no hay registro de inicio nuevo.
    nextPeriodEstimate: string | null;
    diasDeRetraso?: number;
  };
  recentBodyMeasurements?: {
    lastWeightKg: number | null;
    lastBodyFatPct: number | null;
    weightTrend30d: 'up' | 'down' | 'stable' | 'no_data';
    lastMeasuredAt: string;
  };
  recentLabs?: {
    keyMarkers: { name: string; value: number; unit: string }[];
    lastUpdated: string;
  };
  /**
   * El expediente de labs COMPLETO, ya comprimido por `argos-labs-core` desde
   * `lab_values`. Cuando está presente sustituye a `recentLabs`, que solo veía
   * once columnas fijas de la tabla ancha vieja y un único estudio.
   */
  labsExpediente?: {
    lineas: string[];
    /** Fecha de la medición más reciente del expediente, para el sello. */
    ultimaMedicion: string;
  };
  todaySupplements?: {
    taken: string[];
    pending: string[];
  };
  hydrationStats?: {
    last7dAvgMl: number;
    todayProgressPct: number;
  };
  currentHealthScore?: {
    score: number;
    calculatedAt: string;
  };
  /** IMPL-03 · sueño de las últimas 7 noches (sleep_nights, fuente externa). */
  sleepContext?: {
    nightsLast7: number;
    avgHours: number;
    avgScore: number | null;
    lastNightDate: string;
    lastNightHours: number;
    trend: 'up' | 'down' | 'stable';
    /** sleep_cycle | health_connect | healthkit */
    source: string;
  };
  /** IMPL-03 · Edad ATP integral y sub-edades (edad_atp_calculations). */
  edadAtpContext?: {
    edadIntegral: number;
    edadCronologica: number | null;
    subEdades: { area: string; valor: number }[];
    calculatedAt: string;
  };
  /** IMPL-03 · qué tiene hoy en la agenda y qué ya cerró. */
  agendaContext?: {
    total: number;
    completed: number;
    pendingNames: string[];
    nextName: string | null;
    nextTime: string | null;
  };
  /** IMPL-03 · adherencia de hábitos 7 días y racha (daily_electrons). */
  adherenceContext?: {
    pctLast7: number;
    daysWithActivity: number;
    currentStreak: number;
  };
}

/**
 * #132 F3.4 / MB-21 P7 — el gate de consentimiento de memoria persistente.
 *
 * FAIL-CLOSED: si el servicio de consentimiento falla (query rota, red, lo
 * que sea), NO se puede verificar el permiso → el contexto rico NO se carga.
 * Antes era fail-open ("consent default es ON"): un usuario que REVOCÓ su
 * consentimiento veía sus datos de salud viajar al modelo cada vez que la
 * query de consent fallara. El costo del cierre es un turno menos
 * personalizado; el costo de la apertura era mandar salud sin permiso.
 */
export async function canLoadRichContext(hasConsent: () => Promise<boolean>): Promise<boolean> {
  try {
    return await hasConsent();
  } catch {
    return false;
  }
}

// === VIGENCIA DE LOS DATOS (Pieza 1) ===
//
// EL BUG QUE ESTO ENTIERRA: ARGOS leyó una deficiencia de GABA de un Braverman
// de hace tres meses y la citó como hecho de hoy, encadenada como causa de la
// energía de hoy. El contexto entregaba el rasgo sin decir CUÁNDO se midió, y
// sin fecha el modelo asume presente. La fecha y la regla de uso viajan pegadas
// al dato — no dependen de que el cerebro cacheado se acuerde.

export type NivelVigencia = 'reciente' | 'tendencia' | 'caducado';

/** Más de este número de días: el rasgo ya no se cita en presente. */
export const VIGENCIA_DIAS_TENDENCIA = 60;
/** Más de este número de días: el rasgo se marca como posiblemente desactualizado. */
export const VIGENCIA_DIAS_CADUCADO = 180;

export interface Vigencia {
  nivel: NivelVigencia;
  dias: number;
  /** Fecha del dato en YYYY-MM-DD. */
  fecha: string;
  /** Antigüedad en lenguaje natural: "hace 3 meses". */
  antiguedad: string;
}

/**
 * Días transcurridos entre la fecha del dato y hoy (zona local).
 * Acepta YYYY-MM-DD o timestamp ISO. Devuelve null si la fecha no es usable.
 */
export function diasDesde(fechaISO: string | null | undefined, hoy?: string): number | null {
  if (!fechaISO || typeof fechaISO !== 'string') return null;
  const ref = parseLocalDate(hoy || getLocalToday());
  const dato = parseLocalDate(fechaISO.length >= 10 ? fechaISO.slice(0, 10) : fechaISO);
  const ms = dato.getTime();
  if (!Number.isFinite(ms) || !Number.isFinite(ref.getTime())) return null;
  const dias = Math.floor((ref.getTime() - ms) / (24 * 60 * 60 * 1000));
  // Fecha futura (reloj del dispositivo movido, dato importado mal): se trata
  // como recién medida, nunca como antigüedad negativa.
  return dias < 0 ? 0 : dias;
}

/** Antigüedad en lenguaje natural es-MX. */
export function describirAntiguedad(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 14) return `hace ${dias} días`;
  if (dias < 60) {
    const semanas = Math.round(dias / 7);
    return `hace ${semanas} semanas`;
  }
  if (dias < 365) {
    const meses = Math.round(dias / 30.44);
    return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }
  const anios = Math.round(dias / 365.25);
  return `hace ${anios} ${anios === 1 ? 'año' : 'años'}`;
}

/** Clasifica un dato por su antigüedad. Devuelve null si no hay fecha usable. */
export function evaluarVigencia(fechaISO: string | null | undefined, hoy?: string): Vigencia | null {
  const dias = diasDesde(fechaISO, hoy);
  if (dias === null) return null;
  const nivel: NivelVigencia =
    dias > VIGENCIA_DIAS_CADUCADO ? 'caducado'
    : dias > VIGENCIA_DIAS_TENDENCIA ? 'tendencia'
    : 'reciente';
  return {
    nivel,
    dias,
    fecha: (fechaISO as string).slice(0, 10),
    antiguedad: describirAntiguedad(dias),
  };
}

export interface OpcionesVigencia {
  /** Verbo del dato: "medido" (default), "contestado", "determinado", "calculada". */
  verbo?: string;
  /** Qué invitar a repetir cuando el dato caducó. */
  reevaluar?: string;
  /** Hoy inyectable para tests. */
  hoy?: string;
}

/**
 * Pega al valor su fecha, su antigüedad en lenguaje natural y la regla de uso
 * que corresponde a esa antigüedad. Si no hay fecha, el valor pasa intacto:
 * fail-soft, un bloque sin fecha nunca debe tumbar el contexto entero.
 */
export function conVigencia(
  valor: string,
  fechaISO: string | null | undefined,
  opts: OpcionesVigencia = {},
): string {
  const v = evaluarVigencia(fechaISO, opts.hoy);
  if (!v) return valor;
  const verbo = opts.verbo || 'medido';
  const sello = `${verbo} ${v.antiguedad}, ${v.fecha}`;
  if (v.nivel === 'reciente') return `${valor} [${sello}]`;
  if (v.nivel === 'tendencia') {
    return `${valor} [${sello} — NO lo digas en presente ni como causa de hoy: es una tendencia observada en esa fecha]`;
  }
  const repetir = opts.reevaluar || 'repetir la evaluación';
  return `${valor} [${sello} — posiblemente desactualizado: no lo afirmes como cierto hoy e invita a ${repetir}]`;
}

// === LAS REGLAS, JUNTAS Y DICHAS UNA VEZ (VOZ-2) ===
//
// EL PROBLEMA QUE ESTO ENTIERRA: el dueño usó su app y dijo "no me encanta cómo
// habla, es raro, los parches y candados lo están dejando chueco". Tenía razón y
// se puede señalar el mecanismo: había seis imperativos marcados "(obligatoria)"
// intercalados ENTRE los datos, uno por bloque. El prompt le decía a ARGOS
// "ferritina 90" y acto seguido le gritaba una regla, luego otro dato, luego
// otro grito. Un texto así se lee cosido porque está cosido.
//
// NO SE QUITÓ NINGUNA REGLA DE FONDO. La de vigencia, la de aritmética, la de
// labs con fase del ciclo, la del dato emocional y la de Edad ATP existen por
// bugs reales que ya nos costaron caro, y siguen enteras. Lo que cambió es
// dónde viven: un solo bloque al final, después de los datos, con el
// "obligatorio" dicho una vez en el encabezado en vez de seis veces adentro.
//
// Van al FINAL a propósito: las que se refieren a algo "indicado arriba" siguen
// siendo ciertas, y un modelo obedece mejor la instrucción que acaba de leer.

/** La regla general de vigencia. Solo viaja si algún dato salió fechado. */
export const REGLA_VIGENCIA_GLOBAL =
  'REGLA DE VIGENCIA: cada dato trae entre corchetes cuándo se midió. ' +
  `Un rasgo de más de ${VIGENCIA_DIAS_TENDENCIA} días NUNCA se cita en presente ("tienes X") ni se encadena ` +
  'como causa de lo que pasa hoy: se menciona como tendencia observada, con su fecha. ' +
  `Más de ${VIGENCIA_DIAS_CADUCADO} días: trátalo como posiblemente desactualizado e invita a repetir la evaluación. ` +
  'Si un dato no trae fecha, no asumas que es de hoy.';

/** Pieza 3: con "25.3h de 16h" el modelo concluyó "más del doble". Es 1.6 veces. */
export const REGLA_ARITMETICA =
  'REGLA DE ARITMÉTICA: las comparaciones numéricas ya vienen calculadas. ' +
  'Úsalas tal cual; no calcules múltiplos, porcentajes ni diferencias por tu cuenta.';

/** H.4 (MB-10): el check-in de hoy calibra el tono, no abre un expediente. */
export const REGLA_EMOCIONAL =
  'REGLAS DEL DATO EMOCIONAL: usa el estado de HOY solo para calibrar tono y recomendaciones. ' +
  'NO diagnosticas ni interpretas patrones emocionales como condición clínica. ' +
  'NUNCA mencionas el historial o expediente emocional de otros días salvo que el cliente lo pregunte explícitamente. ' +
  'Si detectas señales sostenidas de malestar profundo, sugiere apoyo profesional, no lo resuelves tú.';

/** IMPL-03: una estimación educativa no es un resultado clínico. */
export const REGLA_EDAD_ATP =
  'REGLA EDAD ATP: es una estimación educativa de hábitos y marcadores, ' +
  'NO un diagnóstico ni una medida de esperanza de vida. Nunca la presentes como resultado clínico.';

/** IMPL-03: el sueño lo mide un aparato ajeno y ATP no lo audita. */
export const REGLA_FUENTE_EXTERNA =
  'REGLA DE FUENTE EXTERNA: el sueño lo mide el dispositivo del cliente, es dato NO verificado por ATP. ' +
  'Repórtalo como lo que reportó el aparato, nunca como medición propia.';

/**
 * E-9 (MB-12): un valor hormonal fuera de fase no significa lo mismo.
 * Solo viaja cuando hay labs Y ciclo activo, y la fase entra interpolada para
 * que la regla no dependa de que el modelo la busque en otro renglón.
 */
export function reglaLabsCiclo(fase: string): string {
  return (
    'REGLA LABS + CICLO: en mujeres con ciclo activo, interpreta los labs EN CONTEXTO de la fase ' +
    `del ciclo indicada arriba (fase ${fase}): hormonas (estradiol, progesterona, LH/FSH), ` +
    'ferritina/hierro y marcadores inflamatorios varían por fase. Si la fase hace ambiguo un valor, dilo y ' +
    'sugiere repetir la medición en la fase adecuada; no concluyas con un dato fuera de contexto.'
  );
}

export function buildContextPrompt(ctx: UserContext): string {
  const parts: string[] = [];
  // Las reglas se juntan aquí y se dicen UNA vez al final. `regla` deduplica:
  // labs+ciclo salía dos veces cuando había expediente y resumen viejo.
  const reglas: string[] = [];
  const regla = (texto: string) => {
    if (!reglas.includes(texto)) reglas.push(texto);
  };
  // Si ningún dato viaja fechado, la regla global son ~55 tokens que no
  // aplican a nada. `sellar` avisa cuando de verdad se estampó una fecha.
  let hayFechas = false;
  const sellar = (valor: string, fecha: string | null | undefined, opts?: OpcionesVigencia) => {
    const out = conVigencia(valor, fecha, opts);
    if (out !== valor) hayFechas = true;
    return out;
  };
  if (ctx.name) parts.push(`Usuario: ${ctx.name}`);
  if (ctx.age) parts.push(`Edad: ${ctx.age} años`);
  if (ctx.gender) parts.push(`Género: ${ctx.gender}`);
  if (ctx.chronotype) {
    parts.push(sellar(`Cronotipo: ${ctx.chronotype}`, ctx.chronotypeUpdatedAt, {
      verbo: 'determinado',
      reevaluar: 'volver a contestar el test de cronotipo',
    }));
  }
  if (ctx.activeProtocol) parts.push(`Protocolo activo: ${ctx.activeProtocol}`);
  if (ctx.rank) parts.push(`Rango: ${ctx.rank}`);
  if (ctx.todayElectrons) {
    parts.push(`Electrones hoy: ${ctx.todayElectrons.earned}/${ctx.todayElectrons.total}`);
  }
  if (ctx.recentNutrition) {
    const n = ctx.recentNutrition;
    parts.push(`Nutrición hoy: ${n.todayCalories} kcal, ${n.todayProtein}g proteína, ${n.mealsToday} comidas`);
    parts.push(`Promedio 3 días: ${n.avgCalories3d} kcal/día`);
  }
  if (ctx.recentExercise) {
    parts.push(`Ejercicio: ${ctx.recentExercise.sessionsThisWeek} sesiones esta semana`);
  }
  if (ctx.personalRecords?.length) {
    const prSummary = ctx.personalRecords.slice(0, 5).map(pr =>
      `${pr.exercise}: ${pr.estimated1rm}kg 1RM`
    ).join(', ');
    parts.push(`Récords (top 5): ${prSummary}`);
  }
  if (ctx.recentGlucose) {
    const g = ctx.recentGlucose;
    parts.push(`Última glucosa: ${g.lastValue} mg/dL (${g.lastContext})`);
  }
  if (ctx.currentFastingStatus?.isFasting) {
    const f = ctx.currentFastingStatus;
    // Pieza 3: la comparación contra la meta llega calculada. Cuando el modelo
    // hacía la división él solo, 25.3h contra 16h le salía "más del doble".
    const comp = f.comparacionMeta || compararConMeta(f.hoursElapsed, f.targetHours);
    parts.push(`Ayuno activo: ${f.hoursElapsed}h de ${f.targetHours}h objetivo (${comp})`);
    regla(REGLA_ARITMETICA);
  }
  if (ctx.bravermanProfile) {
    const b = ctx.bravermanProfile;
    parts.push(sellar(
      `Perfil Braverman: Naturaleza dominante ${b.dominant}, deficiencia principal ${b.primaryDeficiency} (${b.deficiencyLevel})`,
      b.completedAt,
      { verbo: 'test contestado', reevaluar: 'repetir el test Braverman' },
    ));
  }
  if (ctx.functionalQuizzes?.length) {
    const quizSummary = ctx.functionalQuizzes.map(q => {
      const issues = q.issues.length > 0 ? q.issues.join(', ') : 'sin alertas';
      return sellar(`${q.quiz}: ${issues}`, q.completedAt, {
        verbo: 'contestado',
        reevaluar: 'volver a contestar esa evaluación',
      });
    }).join(' | ');
    parts.push(`Evaluaciones funcionales: ${quizSummary}`);
  }
  if ((ctx as any).uvData) {
    const uv = (ctx as any).uvData;
    parts.push(`UV actual: ${uv.current} (máx hoy: ${uv.max} a las ${uv.maxTime})`);
    if (uv.vitaminDWindow) parts.push(`Ventana vitamina D: ${uv.vitaminDWindow.start}-${uv.vitaminDWindow.end}`);
    if (uv.dangerousFrom) parts.push(`Protección necesaria: ${uv.dangerousFrom}-${uv.dangerousUntil}`);
  }
  if (ctx.recentMindSessions) {
    const m = ctx.recentMindSessions;
    parts.push(`Mente 7d: ${m.meditationDaysLast7}d meditación, ${m.breathworkDaysLast7}d respiración, ${m.avgMinutes} min/sesión`);
  }
  if (ctx.recentJournal) {
    const j = ctx.recentJournal;
    const tag = j.dominantTag ? `, tema dominante: ${j.dominantTag}` : '';
    parts.push(`Journal 7d: ${j.entriesLast7} entradas (última ${j.lastEntryDate})${tag}`);
  }
  if (ctx.recentMood) {
    const m = ctx.recentMood;
    parts.push(`Mood 7d: ${m.checkInsLast7} check-ins, promedio agrado ${m.avgPleasantness}/10, tendencia ${m.trend}`);
  }
  if (ctx.todayEmotion) {
    // H.4 (MB-10): el estado de HOY calibra las recomendaciones — con límites
    // DUROS que viajan pegados al dato (no dependen del cerebro cacheado).
    parts.push(`Estado emocional de HOY (check-in): ${ctx.todayEmotion.labels.join(', ')} (zona ${ctx.todayEmotion.quadrant})`);
    regla(REGLA_EMOCIONAL);
  }
  if (ctx.cycleInfo) {
    const c = ctx.cycleInfo;
    parts.push(
      c.nextPeriodEstimate
        ? `Ciclo: día ${c.cycleDay} (fase ${c.currentPhase}), próximo periodo ~${c.nextPeriodEstimate}`
        : `Ciclo: día ${c.cycleDay} (fase ${c.currentPhase}), periodo estimado vencido hace ${c.diasDeRetraso ?? 0} días y sin registro de inicio nuevo`,
    );
  }
  if (ctx.recentBodyMeasurements) {
    const b = ctx.recentBodyMeasurements;
    const w = b.lastWeightKg !== null ? `${b.lastWeightKg}kg` : 's/d';
    const bf = b.lastBodyFatPct !== null ? `, ${b.lastBodyFatPct}% grasa` : '';
    parts.push(sellar(
      `Última medición corporal: ${w}${bf}, tendencia peso ${b.weightTrend30d}`,
      b.lastMeasuredAt,
      { verbo: 'medido', reevaluar: 'volver a pesarse y medirse' },
    ));
  }
  // El expediente completo gana sobre el resumen viejo de once columnas: si
  // ambos vinieran, mostrar los dos sería contradecirse a sí mismo.
  if (ctx.labsExpediente) {
    // El sello de vigencia va en el ENCABEZADO, no al final del bloque: pegado
    // abajo quedaría después de la regla dura y se leería como parte de ella.
    const [encabezado, ...resto] = ctx.labsExpediente.lineas;
    parts.push(sellar(encabezado, ctx.labsExpediente.ultimaMedicion, {
      verbo: 'muestra más reciente tomada',
      reevaluar: 'repetir el laboratorio',
    }));
    if (resto.length > 0) parts.push(resto.join('\n'));
    if (ctx.cycleInfo) regla(reglaLabsCiclo(ctx.cycleInfo.currentPhase));
  } else if (ctx.recentLabs) {
    const markers = ctx.recentLabs.keyMarkers.map(m => `${m.name} ${m.value}${m.unit}`).join(', ');
    parts.push(sellar(`Labs: ${markers}`, ctx.recentLabs.lastUpdated, {
      verbo: 'muestra tomada',
      reevaluar: 'repetir el laboratorio',
    }));
    if (ctx.cycleInfo) regla(reglaLabsCiclo(ctx.cycleInfo.currentPhase));
  }
  if (ctx.todaySupplements) {
    const s = ctx.todaySupplements;
    const t = s.taken.length > 0 ? s.taken.join(', ') : 'ninguno';
    const p = s.pending.length > 0 ? s.pending.join(', ') : 'ninguno';
    parts.push(`Suplementos hoy: tomados [${t}], pendientes [${p}]`);
  }
  if (ctx.hydrationStats) {
    const h = ctx.hydrationStats;
    parts.push(`Hidratación: ${h.todayProgressPct}% meta hoy, promedio 7d ${h.last7dAvgMl}ml/día`);
  }
  // === IMPL-03 · los cuatro bloques nuevos ===
  if (ctx.sleepContext) {
    const s = ctx.sleepContext;
    const score = s.avgScore !== null ? `, calma promedio ${s.avgScore}/100` : '';
    parts.push(
      `Sueño 7d: ${s.nightsLast7} noches registradas, promedio ${s.avgHours} h${score}, tendencia ${s.trend}. ` +
      `Última noche ${s.lastNightHours} h [registrado ${s.lastNightDate}]. Fuente externa: ${s.source}.`,
    );
    regla(REGLA_FUENTE_EXTERNA);
  }
  if (ctx.edadAtpContext) {
    const e = ctx.edadAtpContext;
    const sub = e.subEdades.length > 0
      ? ` Sub-edades: ${e.subEdades.map(x => `${x.area} ${x.valor}`).join(', ')}.`
      : '';
    const crono = e.edadCronologica !== null ? ` (edad cronológica ${e.edadCronologica})` : '';
    parts.push(sellar(
      `Edad ATP integral: ${e.edadIntegral}${crono}.${sub}`,
      e.calculatedAt,
      { verbo: 'calculada', reevaluar: 'actualizar sus datos y recalcular la Edad ATP' },
    ));
    regla(REGLA_EDAD_ATP);
  }
  if (ctx.agendaContext) {
    const a = ctx.agendaContext;
    const pend = a.pendingNames.length > 0 ? a.pendingNames.join(', ') : 'nada pendiente';
    const sig = a.nextName ? ` Siguiente: ${a.nextName}${a.nextTime ? ` a las ${a.nextTime}` : ''}.` : '';
    parts.push(`Agenda de hoy: ${a.completed} de ${a.total} completados. Pendientes: ${pend}.${sig}`);
  }
  if (ctx.adherenceContext) {
    const ad = ctx.adherenceContext;
    parts.push(
      `Adherencia 7d: ${ad.pctLast7}% de hábitos completados, ${ad.daysWithActivity} de 7 días con actividad, ` +
      `racha actual ${ad.currentStreak} ${ad.currentStreak === 1 ? 'día' : 'días'}`,
    );
  }
  if (ctx.currentHealthScore) {
    const hs = ctx.currentHealthScore;
    parts.push(sellar(`Health Score: ${hs.score}`, hs.calculatedAt, { verbo: 'calculado' }));
  }
  if (parts.length === 0) return '';
  // La de vigencia va primero de las reglas y solo si algún dato salió fechado:
  // sin fechas son ~55 tokens que no aplican a nada.
  if (hayFechas) reglas.unshift(REGLA_VIGENCIA_GLOBAL);
  const bloqueReglas = reglas.length > 0
    ? `\n\n## CÓMO USAR ESTOS DATOS (obligatorio)\n${reglas.map((r) => `- ${r}`).join('\n')}`
    : '';
  return `\n\n## DATOS ACTUALES DEL USUARIO\n${parts.join('\n')}${bloqueReglas}`;
}

// === ARITMÉTICA FUERA DEL MODELO (Pieza 3) ===
//
// EL BUG QUE ESTO ENTIERRA: con "25.3h de 16h objetivo" el modelo concluyó
// "más del doble". Es 1.6 veces. El modelo narra, no calcula: la comparación
// entra al prompt ya resuelta.

/** Redondeo a un decimal sin arrastrar ruido de punto flotante. */
function unDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Frase lista de comparación contra una meta en horas. Devuelve cadena vacía
 * si la meta no sirve para comparar (0, negativa o no numérica).
 */
export function compararConMeta(actual: number, meta: number): string {
  if (!Number.isFinite(actual) || !Number.isFinite(meta) || meta <= 0) return '';
  const ratio = actual / meta;
  if (ratio >= 1) {
    const exceso = unDecimal(actual - meta);
    const veces = unDecimal(ratio);
    return exceso === 0
      ? 'meta cumplida exacta'
      : `${veces} veces la meta, ${exceso} h por encima`;
  }
  const falta = unDecimal(meta - actual);
  return `${Math.round(ratio * 100)}% de la meta, faltan ${falta} h`;
}
