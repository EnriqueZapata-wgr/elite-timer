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
// 31-ago-2026: una sola definición de "ya llegué a la meta" para toda la app.
import { metaAlcanzada } from '@/src/services/fasting-cumplido-core';
// 20-sep-2026: el plan de suplementos completo (dosis, momento, porqué, nota).
import {
  construirBloquePlanSuplementos,
  reglaPlanSuplementos,
  type PlanSuplementosArgos,
} from '@/src/services/argos-suplementos-plan-core';
// 8-oct-2026 (nivel 2): para saber si el bloque del documento es el de un programa.
import { esBloquePrograma } from '@/src/services/argos-elite-contexto-core';
import { esDetallePrograma } from '@/src/services/argos-elite-detalle-core';
// 21-sep-2026: la regla de "lo que hablaron antes" (memoria de conversaciones).
import { REGLA_MEMORIA_CONVERSACIONES } from '@/src/services/argos-memoria-core';
// 13-oct-2026 (wearables, bloque A): tendencias solo dentro del tramo de una
// misma fuente, y los vitales del día con su procedencia.
import {
  tendenciaEnTramo,
  fuenteParaTramo,
  type ClaveVital,
  type DireccionTendencia,
  type MetricaVital,
} from '@/src/services/health/vitales-core';
import { HRV_VENTANA_PARCIAL, nombreDeFuente, RANGO_DE_LA_CASA } from '@/src/services/health/procedencia-core';

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
  /**
   * 13.2 (31-ago-2026): `total` era un 20 clavado en código. Ahora es null
   * cuando no hay denominador honesto; el prompt entonces solo dice cuántos
   * se ganaron. El conteo de HÁBITOS (lo que HOY pinta) va en `habitosHoy`.
   */
  todayElectrons?: { earned: number; total: number | null };
  /** 13.2 · los hábitos del renglón de HOY, con la misma derivación (argos-habitos-hoy-core). */
  habitosHoy?: {
    total: number;
    hechos: number;
    nombresHechos: string[];
    nombresPendientes: string[];
  };
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
  /**
   * ATP 3.0 (ruta 3.6): la evaluación Elite del usuario, ya armada como bloque
   * por `argos-elite-contexto-core` (encabezado + resumen). Presente solo si
   * existe la evaluación y el flag ARGOS_LEE_EVALUACION_ELITE está encendido.
   * 8-oct-2026 (nivel 2): también el de un programa (mismo documento con
   * `tipo: 'programa'`), con su propio encabezado; ver esBloquePrograma.
   */
  evaluacionElite?: {
    bloque: string;
    /**
     * 20-sep-2026: segundo bloque (alimentación, entrenamiento, genética,
     * sistemas con score, porqués), armado por `argos-elite-detalle-core`.
     * Aparte del resumen: el resumen no se toca.
     */
    detalle?: string;
  };
  todaySupplements?: {
    taken: string[];
    pending: string[];
  };
  /**
   * 20-sep-2026: el plan de suplementos completo (`user_supplements` con
   * reason, dosage, timing, notes, source, is_active). Antes solo viajaban
   * los nombres y "por qué me pusiste magnesio" se contestaba inventando.
   */
  planSuplementos?: PlanSuplementosArgos;
  /**
   * 20-sep-2026: bloques que FALLARON al leerse en este turno (no los vacíos),
   * en lenguaje llano ("la evaluación Elite"). Antes iban a Sentry y el
   * modelo contestaba como si el dato no existiera. "No se pudo leer" y "no
   * hay datos" son cosas distintas y las dos tienen que llegar al modelo.
   */
  fuentesNoLeidas?: string[];
  /**
   * 21-sep-2026: lo que hablaron en conversaciones previas, ya resumido por
   * argos-memoria-core (bloque "LO QUE HABLARON ANTES"). Solo lo pide el chat
   * y solo detrás del gate de consentimiento: sin permiso no existe.
   */
  memoriaConversaciones?: string;
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
    /** Promedio de horas de TODAS las noches (ver `composicion`: de qué fuente vino cada una). */
    avgHours: number;
    /**
     * 13-oct-2026: calma promedio de ATP, SOLO con noches cuyo score es de la
     * sesión propia (fuentes.score === 'sleep_cycle'). El score de una marca
     * nunca entra aquí: va en `scoresDeMarca`.
     */
    avgScore: number | null;
    /** Noches con que se calculó `avgScore`. */
    avgScoreNoches?: number;
    /**
     * Score de sueño de cada marca, aparte y nunca promediado entre fuentes.
     * `fuente` null = no se sabe de dónde vino: entonces solo el último valor.
     */
    scoresDeMarca?: { fuente: string | null; promedio: number | null; ultimo: number; noches: number }[];
    /** Cuántas de las noches del promedio de horas vino de cada fuente (más reciente primero). */
    composicion?: { fuente: string | null; noches: number }[];
    lastNightDate: string;
    lastNightHours: number;
    /**
     * 13-oct-2026: calculada SOLO con el tramo reciente de la misma fuente.
     * 'no_se_calcula' si ese tramo tiene menos de 4 noches (no es 'stable').
     */
    trend: 'up' | 'down' | 'stable' | 'no_se_calcula';
    /** Fuente real de la duración de la última noche (sleep_cycle, health_connect, oura, mixto...). */
    source: string;
    /** Noches del tramo de la misma fuente con que se calculó (o no alcanzó) la tendencia. */
    trendNoches?: number;
    /** Fuente de ese tramo. */
    trendFuente?: string | null;
    /** Si la línea se cortó por cambio de fuente: fecha desde la que se compara. */
    trendCortadaDesde?: string | null;
    /** La fuente que había antes del corte. */
    fuenteAnterior?: string | null;
  };
  /**
   * 13-oct-2026 (wearables, bloque A): los vitales del día de
   * health_os_daily, cada uno con su procedencia y su tendencia en el tramo
   * de la misma fuente. Solo existe si la base ya tiene la 344 y hay al menos
   * un valor. `aplica_rango_casa` viaja en el dato: el prompt no razona marcas.
   */
  vitalesContext?: {
    metricas: VitalArgos[];
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

/** Un vital del día tal como viaja a ARGOS (vitalesContext). */
export interface VitalArgos {
  clave: ClaveVital;
  valor: number;
  fecha: string;
  fuente: string | null;
  metodo: 'rmssd' | 'sdnn' | null;
  aplica_rango_casa: boolean;
  tendencia: DireccionTendencia;
  /** Días del tramo de la misma fuente. */
  tendenciaDias: number;
  /** Fuente del tramo (null si no se sabe, p. ej. 'mixto'). */
  tendenciaFuente: string | null;
  /** Si la línea se cortó por cambio de fuente: fecha desde la que se compara. */
  cortadaDesde: string | null;
  fuenteAnterior: string | null;
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

/**
 * 20-sep-2026: el gate con memoria de sesión.
 *
 * EL PROBLEMA: fail-closed puro dejaba a un cliente Elite sin nombre ni
 * evaluación en cuanto la consulta de consentimiento fallaba una vez (red,
 * timeout), y encima oyendo "Todavía no te conozco lo suficiente". Para
 * quien YA se verificó con consentimiento en esta sesión, una consulta
 * fallida no es una revocación: es una consulta fallida.
 *
 * LA REGLA: la respuesta del servicio manda siempre (sí abre, no cierra y
 * borra la memoria). Solo ante FALLO se consulta la memoria: abierto si en
 * esta sesión ya se verificó que sí, cerrado si nunca se verificó. El costo
 * es que una revocación hecha en OTRO dispositivo, con la red caída aquí,
 * tarda en verse hasta que la consulta vuelva a responder; el beneficio es
 * que un cliente con permiso no pierde su contexto por una falla de red.
 */
export type RespuestaConsentimiento = { ok: true; permitido: boolean } | { ok: false };

/** Usuarios verificados CON consentimiento en esta sesión. Vive lo que viva el bundle. */
const verificadosConConsentimiento = new Set<string>();

export async function consultarConsentimiento(hasConsent: () => Promise<boolean>): Promise<RespuestaConsentimiento> {
  try {
    return { ok: true, permitido: await hasConsent() };
  } catch {
    return { ok: false };
  }
}

/** Puro: decide con la respuesta y con si ya se había verificado antes. */
export function decidirContextoRico(respuesta: RespuestaConsentimiento, yaVerificadoAntes: boolean): boolean {
  if (respuesta.ok) return respuesta.permitido;
  return yaVerificadoAntes;
}

/**
 * El gate completo: consulta, decide y actualiza la memoria. Fail-open solo
 * para quien ya tuvo contexto cargado; fail-closed para quien nunca lo tuvo.
 */
export async function puedeCargarContextoRico(userId: string, hasConsent: () => Promise<boolean>): Promise<boolean> {
  const respuesta = await consultarConsentimiento(hasConsent);
  const permitido = decidirContextoRico(respuesta, verificadosConConsentimiento.has(userId));
  if (respuesta.ok) {
    if (respuesta.permitido) verificadosConConsentimiento.add(userId);
    else verificadosConConsentimiento.delete(userId);
  }
  return permitido;
}

/** Para tests y para el cierre de sesión: olvida a un usuario (o a todos). */
export function olvidarVerificacionConsentimiento(userId?: string): void {
  if (userId) verificadosConConsentimiento.delete(userId);
  else verificadosConConsentimiento.clear();
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
    return `${valor} [${sello}; NO lo digas en presente ni como causa de hoy: es una tendencia observada en esa fecha]`;
  }
  const repetir = opts.reevaluar || 'repetir la evaluación';
  return `${valor} [${sello}; posiblemente desactualizado: no lo afirmes como cierto hoy e invita a ${repetir}]`;
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

/**
 * 13.2 (31-ago-2026): cuando pregunten "cuántos hábitos llevo", la respuesta
 * es el conteo de HÁBITOS, no el de electrones ni el de la agenda. Sin esta
 * regla el modelo elegía cualquiera de los tres renglones y se contradecía
 * con la pantalla.
 */
export const REGLA_HABITOS_HOY =
  'REGLA HÁBITOS DE HOY: si el cliente pregunta cuántos hábitos lleva o le faltan, contesta con el renglón ' +
  '"Hábitos de hoy" (es lo mismo que ve en su pantalla HOY). Los electrones y la agenda son otras cuentas; ' +
  'no las mezcles con los hábitos.';

/**
 * 20-sep-2026: nombres en lenguaje llano de los bloques del contexto, para
 * decirle al modelo qué NO se pudo leer. Un bloque sin traducción viaja con
 * su clave, que igual se entiende.
 */
export const NOMBRES_DE_BLOQUES: Readonly<Record<string, string>> = {
  'perfil': 'tu perfil (nombre)',
  'perfil-extendido': 'tu edad y sexo',
  'cronotipo': 'tu cronotipo',
  'protocolo-activo': 'tu protocolo activo',
  'electrones-hoy': 'los electrones de hoy',
  'habitos-hoy': 'los hábitos de hoy',
  'nutricion-3d': 'la nutrición reciente',
  'ejercicio-semana': 'el ejercicio de la semana',
  'records-personales': 'tus récords',
  'glucosa': 'la glucosa',
  'ayuno-actual': 'el ayuno actual',
  'rango-electrones': 'tu rango',
  'braverman': 'tu perfil Braverman',
  'quizzes-funcionales': 'tus evaluaciones funcionales',
  'uv-atp-sol': 'el UV de hoy',
  'sesiones-mente-7d': 'las sesiones de mente',
  'journal-7d': 'el journal',
  'mood-7d': 'los check-ins emocionales',
  'ciclo-menstrual': 'el ciclo',
  'medidas-corporales': 'las medidas corporales',
  'labs': 'los laboratorios',
  // 8-oct-2026 (nivel 2): si la lectura fallo no se sabe si es Elite o un
  // programa; la frase es verdad para los dos y al cliente de programa nunca
  // se le dice "Elite".
  'evaluacion-elite': 'la evaluación o el programa con su coach',
  'suplementos-hoy': 'los suplementos de hoy',
  'plan-suplementos': 'el plan de suplementos',
  'hidratacion': 'la hidratación',
  'health-score': 'el Health Score',
  'sueno-7n': 'el sueño',
  'vitales-wearable': 'los vitales del wearable',
  'edad-atp': 'la Edad ATP',
  'agenda-hoy': 'la agenda de hoy',
  'adherencia-racha': 'la adherencia y la racha',
  'memoria-conversaciones': 'las conversaciones previas',
};

export function nombreDeBloque(clave: string): string {
  return NOMBRES_DE_BLOQUES[clave] ?? clave;
}

/**
 * La línea que viaja al modelo cuando algo no se pudo leer. Una sola voz,
 * dirigida al modelo: "no pude leer" es el contexto hablando de sí mismo, y
 * "el usuario" es quien pregunta. Antes mezclaba "tu perfil" (voz al usuario)
 * con "si te preguntan" (voz al modelo) en la misma frase.
 */
export function lineaFuentesNoLeidas(fuentes: string[]): string {
  return `En este turno no pude leer: ${fuentes.join(', ')}. Si el usuario pregunta por eso, dilo tal cual y no inventes.`;
}

/**
 * 20-sep-2026: "no se pudo leer" no es "no hay datos". La frase canónica del
 * cerebro ("Todavía no te conozco lo suficiente") es para quien no tiene
 * datos; un cliente con evaluación cuya lectura falló NO la debe oír.
 */
export const REGLA_FUENTES_NO_LEIDAS =
  'REGLA DE FUENTES NO LEÍDAS: el renglón "En este turno no pude leer" lista datos que EXISTEN pero no se pudieron leer ahora. ' +
  'Si preguntan por alguno, di que en este momento no lo pudiste leer y que lo intenten de nuevo en un rato; no lo inventes ' +
  'y no digas "Todavía no te conozco lo suficiente", porque no es falta de datos, es una lectura que falló.';

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

// ── 13-oct-2026 (wearables, bloque A): tendencias por fuente y vitales ──
//
// Revisión en frío (13-oct-2026): el prompt no lleva literales crudos de la
// base ('oura', 'health_connect', 'mixto') ni banderas tipo
// aplica_rango_casa. Cada dato se explica solo, en español, con el nombre
// que la persona reconoce (nombreDeFuente). Son DATOS, no reglas nuevas. Los
// objetos del contexto sí conservan los literales y las banderas: son el
// contrato del lector.

/** Umbral del sueño: media hora entre la mitad reciente y la vieja (el de siempre). */
const UMBRAL_SUENO_HORAS = 0.5;

const SIN_FUENTE = nombreDeFuente(null);

/** El nombre de una fuente conocida, o null si no se sabe de dónde vino. */
function nombreConocido(fuente: string | null | undefined): string | null {
  const n = nombreDeFuente(fuente);
  return n === SIN_FUENTE ? null : n;
}

/** "1 noche", "3 noches", "1 día", "4 días". */
function cuenta(n: number, unidad: 'noches' | 'días'): string {
  return `${n} ${n === 1 ? unidad.replace(/s$/, '') : unidad}`;
}

/**
 * La tendencia de horas de sueño, SOLO dentro del tramo reciente de la misma
 * fuente (de la noche más nueva a la más vieja). `fuente` es la fuente real
 * de la duración de cada noche (Noche.fuentes.duration_minutes). Si el
 * tramo tiene menos de 4 noches, 'no_se_calcula'.
 */
export function tendenciaSuenoArgos(
  noches: readonly { fecha: string; horas: number; fuente: string | null }[],
): {
  trend: 'up' | 'down' | 'stable' | 'no_se_calcula';
  trendNoches: number;
  trendFuente: string | null;
  trendCortadaDesde: string | null;
  fuenteAnterior: string | null;
} {
  const t = tendenciaEnTramo(
    noches.map((n) => ({ fecha: n.fecha, valor: n.horas, fuente: fuenteParaTramo(n.fuente) })),
    { tipo: 'absoluto', valor: UMBRAL_SUENO_HORAS },
  );
  const trend = t.direccion === 'sube' ? 'up' : t.direccion === 'baja' ? 'down' : t.direccion === 'estable' ? 'stable' : 'no_se_calcula';
  return {
    trend,
    trendNoches: t.puntos,
    trendFuente: t.fuente,
    trendCortadaDesde: t.cortada ? t.desde : null,
    fuenteAnterior: t.cortada ? t.fuenteAnterior : null,
  };
}

/** Una noche ya unificada, lo que ARGOS necesita de ella. La más reciente primero. */
export interface NocheParaArgos {
  fecha: string;
  minutos: number;
  /** Fuente real de la duración (Noche.fuentes.duration_minutes). */
  fuenteMinutos: string | null;
  score: number | null;
  /** Fuente real del score (Noche.fuentes.score). */
  fuenteScore: string | null;
  /** Fuente de la noche (Noche.fuente): respaldo si la duración no trae la suya. */
  fuenteNoche: string;
}

const promedioEntero = (xs: number[]) => Math.round(xs.reduce((s, v) => s + v, 0) / xs.length);

/**
 * El bloque de sueño de ARGOS, puro.
 *  · avgHours: todas las noches, con su composición por fuente declarada.
 *  · Calma de ATP (avgScore): SOLO noches con score de la sesión propia.
 *  · Score de cada marca: aparte, por fuente, nunca promediado entre fuentes.
 *    Uno sin fuente identificada no se promedia (podrían ser aparatos
 *    distintos): solo viaja el último.
 *  · Tendencia: solo en el tramo reciente de la misma fuente.
 * null si no hay noches.
 */
export function construirSleepContext(noches: readonly NocheParaArgos[]): NonNullable<UserContext['sleepContext']> | null {
  const validas = noches.filter((n) => typeof n.minutos === 'number' && Number.isFinite(n.minutos));
  if (validas.length === 0) return null;
  const horas = validas.map((n) => n.minutos / 60);
  const avgHours = Math.round((horas.reduce((s, h) => s + h, 0) / horas.length) * 10) / 10;

  const composicion: { fuente: string | null; noches: number }[] = [];
  for (const n of validas) {
    const f = fuenteParaTramo(n.fuenteMinutos);
    const ya = composicion.find((c) => c.fuente === f);
    if (ya) ya.noches += 1;
    else composicion.push({ fuente: f, noches: 1 });
  }

  const conScore = validas.filter((n) => typeof n.score === 'number' && Number.isFinite(n.score));
  const calma = conScore.filter((n) => n.fuenteScore === 'sleep_cycle').map((n) => n.score as number);
  // Por fuente, en el orden en que aparecen (la más reciente primero).
  const porMarca = new Map<string | null, number[]>();
  for (const n of conScore) {
    if (n.fuenteScore === 'sleep_cycle') continue;
    const f = fuenteParaTramo(n.fuenteScore);
    const valores = porMarca.get(f) ?? [];
    valores.push(n.score as number);
    porMarca.set(f, valores);
  }
  const scoresDeMarca = [...porMarca.entries()].map(([fuente, valores]) => ({
    fuente,
    promedio: fuente === null ? null : promedioEntero(valores),
    ultimo: valores[0],
    noches: valores.length,
  }));

  const ultima = validas[0];
  return {
    nightsLast7: validas.length,
    avgHours,
    avgScore: calma.length > 0 ? promedioEntero(calma) : null,
    avgScoreNoches: calma.length,
    scoresDeMarca,
    composicion,
    lastNightDate: ultima.fecha,
    lastNightHours: Math.round((ultima.minutos / 60) * 10) / 10,
    ...tendenciaSuenoArgos(validas.map((n) => ({ fecha: n.fecha, horas: n.minutos / 60, fuente: n.fuenteMinutos }))),
    source: ultima.fuenteMinutos ?? ultima.fuenteNoche ?? 'externo',
  };
}

/** De MetricaVital (vitales-core) a lo que viaja en vitalesContext. */
export function vitalesArgosDesde(metricas: readonly MetricaVital[]): VitalArgos[] {
  return metricas.map((m) => ({
    clave: m.clave,
    valor: m.valor,
    fecha: m.fecha,
    fuente: m.fuente,
    metodo: m.metodo,
    aplica_rango_casa: m.aplicaRangoCasa,
    tendencia: m.tendencia.direccion,
    tendenciaDias: m.tendencia.puntos,
    tendenciaFuente: m.tendencia.fuente,
    cortadaDesde: m.tendencia.cortada ? m.tendencia.desde : null,
    fuenteAnterior: m.tendencia.cortada ? m.tendencia.fuenteAnterior : null,
  }));
}

const DIRECCION_EN_ESPANOL: Readonly<Record<string, string>> = {
  up: 'sube', down: 'baja', stable: 'estable', no_se_calcula: 'no_se_calcula',
  sube: 'sube', baja: 'baja', estable: 'estable',
};

/**
 * "tendencia sube sobre 5 noches de Oura", "tendencia no se calcula (3
 * noches de Oura, antes Health Connect, se cortó)". Dato, no instrucción.
 * Con `fuente` en undefined se omite (la línea ya la dijo junto al valor).
 */
function textoTendencia(
  direccion: string,
  n: number,
  unidad: 'noches' | 'días',
  fuente: string | null | undefined,
  cortada: boolean,
  fuenteAnterior: string | null | undefined,
): string {
  const deFuente = cuenta(n, unidad) + (fuente === undefined ? '' : ` de ${nombreDeFuente(fuente)}`);
  const antes = `antes ${nombreConocido(fuenteAnterior) ?? 'otra fuente'}, se cortó`;
  const dir = DIRECCION_EN_ESPANOL[direccion] ?? direccion;
  if (dir === 'no_se_calcula') return `tendencia no se calcula (${deFuente}${cortada ? `, ${antes}` : ''})`;
  return `tendencia ${dir} sobre ${deFuente}${cortada ? ` (${antes})` : ''}`;
}

/** La línea de sueño de 7 días, en español y con cada fuente nombrada. */
export function lineaSueno(s: NonNullable<UserContext['sleepContext']>): string {
  let comp = '';
  if (s.composicion && s.composicion.length === 1) comp = ` de ${nombreDeFuente(s.composicion[0].fuente)}`;
  else if (s.composicion && s.composicion.length > 1) {
    comp = ` (${s.composicion.map((c) => `${c.noches} de ${nombreDeFuente(c.fuente)}`).join(', ')})`;
  }
  const piezas = [`promedio ${s.avgHours} h en ${cuenta(s.nightsLast7, 'noches')}${comp}`];
  if (s.avgScore !== null) {
    const n = typeof s.avgScoreNoches === 'number' ? `, ${cuenta(s.avgScoreNoches, 'noches')}` : '';
    piezas.push(`calma promedio ${s.avgScore}/100 (${nombreDeFuente('sleep_cycle')}${n})`);
  }
  for (const g of s.scoresDeMarca ?? []) {
    const marca = nombreConocido(g.fuente);
    piezas.push(marca && g.promedio !== null
      ? `score de sueño de ${marca}, promedio ${g.promedio}/100 en ${cuenta(g.noches, 'noches')} (escala de ${marca}, no de ATP)`
      : `score de sueño de ${SIN_FUENTE}, el último ${g.ultimo}/100 (escala de la marca, no de ATP)`);
  }
  piezas.push(typeof s.trendNoches === 'number'
    ? textoTendencia(s.trend, s.trendNoches, 'noches', s.trendFuente, !!s.trendCortadaDesde, s.fuenteAnterior)
    : `tendencia ${DIRECCION_EN_ESPANOL[s.trend] ?? s.trend}`);
  return (
    `Sueño 7d: ${piezas.join(', ')}. ` +
    `Última noche ${s.lastNightHours} h [registrado ${s.lastNightDate}]. Fuente externa: ${nombreDeFuente(s.source)}.`
  );
}

const NOMBRE_VITAL: Readonly<Record<'fc_reposo' | 'respiracion' | 'temp_desviacion', { nombre: string; unidad: string }>> = {
  fc_reposo: { nombre: 'FC en reposo', unidad: ' lpm' },
  respiracion: { nombre: 'respiración dormido', unidad: ' rpm' },
  temp_desviacion: { nombre: 'temperatura de piel vs su base', unidad: ' °C' },
};

const NO_SE_COMPARA = 'no se compara con el rango de la casa, solo con su propia línea';

/** Un vital dicho en español, con su procedencia explicada (sin banderas crudas). */
function textoVital(m: VitalArgos, fecha: string): string {
  const marca = nombreConocido(m.fuente);
  const deDonde = marca ?? SIN_FUENTE;
  switch (m.clave) {
    case 'hrv_rmssd': {
      if (m.aplica_rango_casa) {
        return `HRV RMSSD ${m.valor} ms${fecha} (${deDonde}, noche completa; rango de la casa: ${RANGO_DE_LA_CASA.hrv_ms})`;
      }
      if (marca && m.fuente && HRV_VENTANA_PARCIAL.includes(m.fuente)) {
        return `HRV RMSSD ${m.valor} ms${fecha} (${marca}, solo una parte de la noche; ${NO_SE_COMPARA})`;
      }
      return `HRV RMSSD ${m.valor} ms${fecha} (${deDonde}; ${NO_SE_COMPARA})`;
    }
    case 'hrv_sdnn':
      return `variabilidad SDNN${marca ? ` de ${marca}` : ''} ${m.valor} ms${fecha} ` +
        `(${marca ? '' : `${SIN_FUENTE}; `}otra medida: no se compara con la RMSSD ni con ningún rango, solo con su propio SDNN)`;
    case 'spo2':
      return `oxigenación de noche ${m.valor} %${fecha} (${deDonde}; no es un oxímetro médico; sin rango de la casa)`;
    case 'readiness':
      return marca
        ? `score del día de ${marca} ${m.valor}/100${fecha} (escala de ${marca}, no de ATP)`
        : `score del día ${m.valor}/100${fecha} (${SIN_FUENTE})`;
    default: {
      const e = NOMBRE_VITAL[m.clave];
      const valor = m.clave === 'temp_desviacion' && m.valor > 0 ? `+${m.valor}` : `${m.valor}`;
      return `${e.nombre} ${valor}${e.unidad}${fecha} (${deDonde}; sin rango de la casa)`;
    }
  }
}

/**
 * Una sola línea compacta con los vitales del día. Cada métrica dice de qué
 * aparato vino, si se compara o no con el rango de la casa (y cuál es), y su
 * tendencia en el tramo de la misma fuente. La fecha va una vez si todas
 * coinciden.
 */
export function lineaVitales(metricas: readonly VitalArgos[]): string {
  const fechas = new Set(metricas.map((m) => m.fecha));
  const unaFecha = fechas.size === 1 ? metricas[0]?.fecha : null;
  const piezas = metricas.map((m) => {
    const tendencia = textoTendencia(
      m.tendencia, m.tendenciaDias, 'días',
      // La fuente del tramo solo se repite si no es la misma del valor (p. ej. 'mixto').
      m.tendenciaFuente === m.fuente ? undefined : m.tendenciaFuente,
      m.cortadaDesde !== null, m.fuenteAnterior,
    );
    return `${textoVital(m, unaFecha ? '' : ` [registrado ${m.fecha}]`)}, ${tendencia}`;
  });
  const fecha = unaFecha ? ` [registrado ${unaFecha}]` : '';
  return `Vitales del reloj o anillo (los mide el aparato, ATP no los verifica)${fecha}: ${piezas.join('; ')}.`;
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
    const te = ctx.todayElectrons;
    parts.push(te.total != null
      ? `Electrones hoy: ${te.earned}/${te.total}`
      : `Electrones ganados hoy: ${te.earned}`);
  }
  if (ctx.habitosHoy) {
    // 13.2: ESTE es el número que HOY pinta ("N hábitos activos", palomas).
    // Antes ARGOS solo tenía electrones (otro universo) y agenda (otra lista).
    const h = ctx.habitosHoy;
    const hechos = h.nombresHechos.length > 0 ? ` Hechos: ${h.nombresHechos.join(', ')}.` : '';
    const pend = h.nombresPendientes.length > 0 ? ` Pendientes: ${h.nombresPendientes.join(', ')}.` : '';
    parts.push(
      `Hábitos de hoy (los mismos que ve en HOY): ${h.hechos} de ${h.total} hechos.${hechos}${pend}`,
    );
    regla(REGLA_HABITOS_HOY);
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
  // ATP 3.0 (ruta 3.6): la evaluación Elite va ANTES de los labs. El
  // encabezado la declara fuente principal para suplementos, alimentación y
  // prioridades; lo que sigue (expediente crudo) la complementa, no la pisa.
  if (ctx.evaluacionElite?.bloque) {
    parts.push(ctx.evaluacionElite.bloque);
  }
  // 20-sep-2026: el detalle va pegado al resumen (misma fuente, mismo equipo).
  if (ctx.evaluacionElite?.detalle) {
    parts.push(ctx.evaluacionElite.detalle);
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
  // 20-sep-2026: el plan completo (dosis, momento, porqué, nota, pausados).
  // La regla viaja con el dato para que el insight diario, que no lleva el
  // bloque SUPLEMENTOS Y AYUNO, también respete el plan del equipo.
  if (ctx.planSuplementos) {
    const bloquePlan = construirBloquePlanSuplementos(ctx.planSuplementos);
    if (bloquePlan) {
      parts.push(bloquePlan);
      // 8-oct-2026 (nivel 2): a un cliente de programa la regla le nombra su
      // programa, no "la evaluación". Sin bloque del documento, la de siempre.
      const esProg = esBloquePrograma(ctx.evaluacionElite?.bloque) || esDetallePrograma(ctx.evaluacionElite?.detalle);
      regla(reglaPlanSuplementos(esProg ? 'programa' : 'elite'));
    }
  }
  if (ctx.hydrationStats) {
    const h = ctx.hydrationStats;
    parts.push(`Hidratación: ${h.todayProgressPct}% meta hoy, promedio 7d ${h.last7dAvgMl}ml/día`);
  }
  // === IMPL-03 · los cuatro bloques nuevos ===
  if (ctx.sleepContext) {
    const s = ctx.sleepContext;
    // 13-oct-2026: fuentes con nombre de persona, calma de ATP aparte del
    // score de cada marca, composición del promedio y tendencia por fuente.
    parts.push(lineaSueno(s));
    regla(REGLA_FUENTE_EXTERNA);
  }
  // 13-oct-2026: vitales del wearable. Una línea de DATOS; el flag de rango
  // de la casa y el método viajan en el dato, sin reglas nuevas.
  if (ctx.vitalesContext && ctx.vitalesContext.metricas.length > 0) {
    parts.push(lineaVitales(ctx.vitalesContext.metricas));
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
  // 20-sep-2026: lo que falló al leerse va al FINAL de los datos, dicho una
  // vez, y su regla junto a las demás. Antes se registraba en Sentry y al
  // modelo no le llegaba nada: con labs sí y evaluación no, contestaba como
  // si el cliente no tuviera evaluación.
  // 21-sep-2026: lo que hablaron en conversaciones previas va al final de los
  // datos, con su regla junto a las demás: sirve para continuidad, no para
  // repetirlo, y lo que el usuario dice hoy manda sobre la memoria.
  if (ctx.memoriaConversaciones) {
    parts.push(ctx.memoriaConversaciones);
    regla(REGLA_MEMORIA_CONVERSACIONES);
  }
  if (ctx.fuentesNoLeidas && ctx.fuentesNoLeidas.length > 0) {
    parts.push(lineaFuentesNoLeidas(ctx.fuentesNoLeidas));
    regla(REGLA_FUENTES_NO_LEIDAS);
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
  if (metaAlcanzada(actual, meta)) {
    const exceso = unDecimal(actual - meta);
    const veces = unDecimal(ratio);
    return exceso === 0
      ? 'meta cumplida exacta'
      : `${veces} veces la meta, ${exceso} h por encima`;
  }
  const falta = unDecimal(meta - actual);
  return `${Math.round(ratio * 100)}% de la meta, faltan ${falta} h`;
}
