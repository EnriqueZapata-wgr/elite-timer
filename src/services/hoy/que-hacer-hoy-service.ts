/**
 * "Qué hacer hoy": el IO (ATP 3.0, 6-sep-2026, ruta 2.2). La elección vive en
 * que-hacer-hoy-core.ts con test; aquí se junta la materia prima y se
 * registra el cumplido.
 *
 * Fuente de las acciones: las intervenciones personalizadas que la persona
 * YA tiene en `user_interventions` (activas y sugeridas). Pausadas y
 * descartadas no entran: revivirlas sería pisar su decisión (regla 1). Los
 * marcadores fuera de ventana salen del mismo lector estricto del hero, y el
 * puente parameter_key -> nombre de catálogo es LAB_MARKER_MAP, que ya
 * existe en prescription-core.
 *
 * Cumplido: el mismo camino que "Mi protocolo" (logCompletion:
 * intervention_completions + electrón 'intervention' + emits). Los hábitos
 * base son llaves del catálogo; si la persona todavía no tiene fila para
 * esa llave se crea como 'suggested' (igual que hace el sync de
 * /salud/intervenciones, sin pisar nada: ignoreDuplicates) y luego se
 * registra. Así el cumplido siempre suma electrones.
 *
 * 20-sep-2026 (cliente Elite): si hay evaluacion `elite_v3` vigente, la terna
 * se arma desde su plan (elite-hoy-core): la toma de suplementos del plan de
 * Enrique, sus palancas del cierre y, si queda lugar, lo de siempre elegido
 * por el `estado` que Enrique puso a cada marcador (no por la matriz V7). Si
 * la evaluacion no se pudo leer, la terna lo dice (regla 7); si hay fila y
 * no valida, cae a lo de siempre con aviso.
 *
 * 20-sep-2026 (ronda de arreglos, A7): el fallo de `functional_dx` solo es
 * fatal cuando no sabemos que no hay plan (falloEvaluacionEsFatal, con
 * test): Elite, evaluacion vista por el hook, o nivel/existencia sin leer.
 * Si el nivel se leyo, no es Elite y el hook confirmo que no hay evaluacion,
 * sigue lo de siempre. El objetivo (user_packs) y los suplementos del plan
 * solo se leen cuando hay evaluacion.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { UNIVERSAL_INTERVENTIONS, INTERVENTION_BY_KEY, type Intervention } from '@/src/constants/interventions-catalog';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import { LAB_MARKER_MAP } from '@/src/services/interventions/prescription-core';
import { getTodayCompletions, logCompletion } from '@/src/services/interventions/intervention-service';
import { resolveInterventionDef, type UserInterventionRowLike } from '@/src/services/interventions/intervention-engine-core';
import { leerSexoYLabs, marcadoresDesdeCanon } from './hero-laboratorios-service';
import {
  elegirQueHacerHoy, habitosBaseSinExcluidas, HABITOS_BASE_KEYS,
  type AccionHoy, type CandidatoHoy, type MarcadorFuera,
} from './que-hacer-hoy-core';
import {
  componerTernaElite, falloEvaluacionEsFatal, marcadoresFueraDeEvaluacion,
  type NivelHoy, type ObjetivoHoy, type SuplementoHoy,
} from './elite-hoy-core';
import { leerEvaluacionEliteVigente, leerObjetivoActivo, leerSuplementosDeHoy } from './elite-hoy-service';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';

type StatusFila = 'active' | 'suggested' | 'paused' | 'dismissed';

interface FilaHoy extends UserInterventionRowLike {
  id: string;
  status: StatusFila;
  priority: number;
}

/** Biomarcadores que el catálogo liga a una intervención (impacto + reglas de laboratorio). */
export function marcadoresDeCatalogo(def: Intervention | undefined): string[] {
  if (!def) return [];
  const out = new Set<string>(def.epigeneticImpact?.biomarkers ?? []);
  for (const r of def.recommendationRules?.boostIf ?? []) {
    if (r.source === 'lab') out.add(r.marker);
  }
  return [...out];
}

function candidatoDeFila(f: FilaHoy): CandidatoHoy | null {
  const def = resolveInterventionDef(f);
  if (!def) return null;
  return {
    key: f.intervention_key,
    nombre: def.name,
    como: def.how,
    prioridad: f.priority,
    origen: f.status === 'active' ? 'activa' : 'sugerida',
    userInterventionId: f.id,
    marcadores: marcadoresDeCatalogo(INTERVENTION_BY_KEY[f.intervention_key]),
  };
}

function candidatoBase(def: Intervention): CandidatoHoy {
  return {
    key: def.key, nombre: def.name, como: def.how, prioridad: def.priority,
    origen: 'base', userInterventionId: null, marcadores: marcadoresDeCatalogo(def),
  };
}

/** Los tres hábitos base, resueltos desde el catálogo (sin inventar copy). */
export function habitosBase(): CandidatoHoy[] {
  const out: CandidatoHoy[] = [];
  for (const key of HABITOS_BASE_KEYS) {
    const def = INTERVENTION_BY_KEY[key];
    if (def) out.push(candidatoBase(def));
  }
  return out;
}

/** Las demás universales del catálogo (relleno cuando un base está pausado o descartado). */
export function universalesDeRelleno(): CandidatoHoy[] {
  const base = new Set<string>(HABITOS_BASE_KEYS);
  return UNIVERSAL_INTERVENTIONS.filter((d) => !base.has(d.key)).map(candidatoBase);
}

/** Marcadores fuera de la ventana óptima, con los nombres con los que el catálogo los conoce. */
async function leerMarcadoresFuera(userId: string, opts?: { forzar?: boolean }): Promise<MarcadorFuera[]> {
  // 20-sep-2026: misma lectura (cacheada unos segundos) que el hero. Con
  // `sexo` null (perfil sin sexo) no se juzga ningun rango: todo sale
  // sin_banda y la terna se elige por prioridad, sin asumir un sexo.
  const { sexo, canon } = await leerSexoYLabs(userId, opts);
  const out: MarcadorFuera[] = [];
  for (const m of marcadoresDesdeCanon(sexo, canon)) {
    if (m.estado !== 'atencion' && m.estado !== 'aceptable') continue;
    const puente = LAB_MARKER_MAP[m.key]?.marker;
    out.push({
      key: m.key,
      nombres: puente ? [puente] : [],
      etiqueta: getLabParamMeta(m.key).display_name,
      estado: m.estado,
    });
  }
  return out;
}

/** TODAS las filas de la persona: activas y sugeridas son candidatas; pausadas y descartadas, exclusiones. */
async function leerFilas(userId: string): Promise<FilaHoy[]> {
  const { data, error } = await supabase
    .from('user_interventions')
    .select('id, intervention_key, status, priority, is_custom, custom_definition')
    .eq('user_id', userId);
  if (error) throw new Error(`[que-hacer-hoy] user_interventions: ${error.message}`);
  return (data ?? []) as unknown as FilaHoy[];
}

function esCandidata(f: FilaHoy): boolean {
  return f.status === 'active' || f.status === 'suggested';
}

/** Los marcadores de la evaluacion con el puente al catalogo (LAB_MARKER_MAP) sumado a sus nombres. */
function marcadoresFueraConPuente(e: EliteV3): MarcadorFuera[] {
  return marcadoresFueraDeEvaluacion(e).map((m) => {
    const puente = LAB_MARKER_MAP[m.key]?.marker;
    return puente ? { ...m, nombres: [...m.nombres, puente] } : m;
  });
}

export interface ResultadoQueHacerHoy {
  acciones: AccionHoy[];
  /** La evaluacion Elite vigente si la hay; null si no (o si hay fila y no valida). */
  evaluacion: EliteV3 | null;
  /** El objetivo activo con su senal, solo se lee con evaluacion. */
  objetivo: ObjetivoHoy | null;
}

/**
 * Las tres acciones de hoy. Rechaza si no se pudieron leer las
 * intervenciones (regla 7). Los labs son complemento: si fallan, se eligen
 * por prioridad y se avisa en el log, porque una tarjeta sin "por qué" es
 * mejor que una tarjeta que no carga.
 *
 * 20-sep-2026: con evaluacion Elite, rechaza tambien si no se pudo leer la
 * evaluacion o el plan de suplementos: una terna sin lo suyo le diria en
 * silencio a un cliente que no tiene plan.
 */
export async function cargarQueHacerHoy(
  userId: string,
  opts?: { forzar?: boolean; nivel?: NivelHoy },
): Promise<ResultadoQueHacerHoy> {
  // Las lecturas que no dependen de la evaluacion salen en paralelo con ella.
  const eliteP = leerEvaluacionEliteVigente(userId, { forzar: opts?.forzar });
  const filasP = leerFilas(userId);
  const hechasP = getTodayCompletions(userId);
  const fueraP = leerMarcadoresFuera(userId, { forzar: opts?.forzar }).catch((e) => {
    logWarn('[que-hacer-hoy] labs no se pudieron leer; se elige por prioridad', e);
    return [] as MarcadorFuera[];
  });
  // Si abajo se lanza antes de esperar estas, que su rechazo no quede huerfano.
  filasP.catch(() => {});
  hechasP.catch(() => {});

  const elite = await eliteP;
  if (!elite.ok && elite.motivo === 'lectura') {
    if (falloEvaluacionEsFatal(opts?.nivel)) throw new Error('[que-hacer-hoy] evaluacion Elite: no se pudo leer');
    logWarn('[que-hacer-hoy] functional_dx no se pudo leer; nivel leido, sin plan: sigue lo de siempre');
  }
  if (!elite.ok && elite.motivo === 'formato') logWarn('[que-hacer-hoy] hay evaluacion Elite y no valida; la terna cae a lo de siempre');
  const evaluacion = elite.ok ? elite.evaluacion : null;

  // Suplementos del plan y objetivo (user_packs): solo con evaluacion.
  const [filas, hechas, fueraLabs, suplementos, objetivo] = await Promise.all([
    filasP,
    hechasP,
    fueraP,
    evaluacion
      ? leerSuplementosDeHoy(userId).catch((e) => {
        logWarn('[que-hacer-hoy] suplementos del plan no se pudieron leer', e);
        return null as SuplementoHoy[] | null;
      })
      : Promise.resolve(null as SuplementoHoy[] | null),
    evaluacion ? leerObjetivoActivo(userId) : Promise.resolve(null as ObjetivoHoy | null),
  ]);
  if (evaluacion && suplementos === null) throw new Error('[que-hacer-hoy] plan de suplementos: no se pudo leer');

  const candidatos = filas.filter(esCandidata).map(candidatoDeFila).filter((c): c is CandidatoHoy => c != null);
  // Regla 1: lo que la persona pausó o descartó no vuelve como hábito base.
  const excluidas = new Set(filas.filter((f) => !esCandidata(f)).map((f) => f.intervention_key));
  // Con evaluacion, el juez de "fuera de ventana" es el estado de Enrique.
  const fuera = evaluacion ? marcadoresFueraConPuente(evaluacion) : fueraLabs;
  const deSiempre = elegirQueHacerHoy(candidatos, fuera, habitosBaseSinExcluidas(habitosBase(), excluidas, universalesDeRelleno()), hechas);
  const acciones = evaluacion ? componerTernaElite(evaluacion, suplementos ?? [], deSiempre) : deSiempre;
  return { acciones, evaluacion, objetivo: evaluacion ? objetivo : null };
}

/**
 * Asegura la fila de user_interventions para una llave del catálogo y
 * devuelve su id. Si la fila ya existe pausada o descartada devuelve null:
 * registrar un cumplido ahí sería revivir en silencio lo que la persona
 * apagó (regla 1).
 */
async function asegurarFila(userId: string, key: string): Promise<string | null> {
  const def = INTERVENTION_BY_KEY[key];
  if (!def) return null;
  // ignoreDuplicates: si ya existe (con cualquier status) no se toca.
  const { error } = await supabase
    .from('user_interventions')
    .upsert(
      {
        user_id: userId, intervention_key: key, status: 'suggested',
        priority: def.priority, is_universal: !!def.isUniversal, source_dx_id: null, computed_time: null,
      },
      { onConflict: 'user_id,intervention_key', ignoreDuplicates: true },
    );
  if (error) { logWarn('[que-hacer-hoy] no se pudo crear la fila base', error); return null; }
  const { data, error: e2 } = await supabase
    .from('user_interventions')
    .select('id, status')
    .eq('user_id', userId)
    .eq('intervention_key', key)
    .maybeSingle();
  if (e2) { logWarn('[que-hacer-hoy] no se pudo releer la fila base', e2); return null; }
  const fila = data as { id: string; status: StatusFila } | null;
  if (!fila) return null;
  if (fila.status === 'paused' || fila.status === 'dismissed') {
    logWarn('[que-hacer-hoy] la llave está pausada o descartada; no se registra', { key });
    return null;
  }
  return fila.id;
}

/** Registra el cumplido de hoy (electrón incluido). false si no quedó registrado. */
export async function registrarCumplidoHoy(userId: string, accion: AccionHoy): Promise<boolean> {
  try {
    const id = accion.userInterventionId ?? (await asegurarFila(userId, accion.key));
    if (!id) return false;
    return await logCompletion(userId, id);
  } catch (e) {
    logWarn('[que-hacer-hoy] registrar cumplido lanzó', e);
    return false;
  }
}
