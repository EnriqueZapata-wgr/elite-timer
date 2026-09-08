/**
 * consola-service — lo unico de la consola que toca la red (8-sep-2026).
 *
 * Toda la logica de decidir vive en consola-core.ts (con test). Aqui solo se
 * lee Supabase y se arma el objeto que la pantalla pinta.
 *
 * REGLA 7 DE LA CASA: supabase-js NO lanza en 4xx. Devuelve `{data:null,error}`.
 * Cada consulta chequea `error` y cualquier error corta la lectura con
 * `estado: 'error'`, que la pantalla pinta como "no se pudo leer" con
 * reintentar. Nunca como "este cliente no tiene datos": confundir un fallo de
 * red con un cliente sin registros es exactamente el cero falso que esta
 * consola existe para evitar.
 *
 * EL CANDADO: no hay ningun filtro de privilegio escrito aqui que valga. Lo
 * que decide que puede leer Enrique es RLS: cada tabla de datos de salud tiene
 * una politica que exige una fila ACTIVA en `coach_clients` con
 * `coach_id = auth.uid()`. Si alguien llegara a esta pantalla sin ser el, sus
 * consultas vuelven vacias del servidor. `esAdminDeConsola` es solo la puerta
 * de interfaz. Ver supabase/migrations/323_consola_coach.sql.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { MASTER_QUIZ_BY_CODE } from '@/src/constants/master-quiz-bank';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import {
  VENTANA_ADHERENCIA_DIAS,
  adherenciaIntervenciones,
  estaExcluido,
  diasEntre as diasEntreFechas,
  restarDias,
  senalDeVida,
  type ClienteConsola,
  type FuenteSenal,
  type Novedad,
} from './consola-core';

export type Lectura<T> = { estado: 'ok'; datos: T } | { estado: 'error' };

/** Solo la fecha de un timestamp de Postgres. Null si no hay. */
function soloFecha(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

/** Dias de calendario, ambos extremos incluidos. */
function diasDesde(desde: string, hasta: string): number {
  return diasEntreFechas(desde, hasta) + 1;
}

/** La fecha maxima de una lista de filas {user_id, <campo>}, por cliente. */
function maxPorCliente(filas: readonly Record<string, unknown>[], campo: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of filas) {
    const uid = typeof f.user_id === 'string' ? f.user_id : null;
    const fecha = soloFecha(f[campo]);
    if (!uid || !fecha) continue;
    const prev = out.get(uid);
    if (!prev || fecha > prev) out.set(uid, fecha);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Puerta de interfaz
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ¿El servidor reconoce a esta sesión como admin?
 *
 * Se pregunta con el RPC `is_admin()`, que es EXACTAMENTE el predicado que la
 * base evalúa para dejar dar de alta un cliente (`coach_clients_insert_solo_admin`,
 * migración 323). A propósito no se usa otra fuente: si la interfaz preguntara
 * por `admin_users` y el servidor exigiera `profiles.role`, el día que las dos
 * se separen Enrique se queda fuera de su propia consola sin saber por qué, o
 * peor, entra y ninguna alta le funciona.
 *
 * `is_admin()` es SECURITY DEFINER y lee `profiles.role`. Esa columna dejó de
 * ser escribible por el rol de la app en la migración 323 sección 3: antes
 * cualquiera se nombraba admin a sí mismo con una consulta y este chequeo no
 * valía nada.
 *
 * Ante cualquier error se responde `false`. En una pantalla con datos de salud
 * de terceros, la duda cierra.
 */
export async function esAdminDeConsola(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      logWarn('[consola] no se pudo verificar admin', error);
      return false;
    }
    return data === true;
  } catch (e) {
    logWarn('[consola] verificación de admin sin red', e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// La lista
// ─────────────────────────────────────────────────────────────────────────────

interface FilaPerfil {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string | null;
  tier_expires_at: string | null;
  is_test: boolean | null;
}

/**
 * Todos los clientes de Enrique con lo que la consola necesita.
 *
 * Una consulta por tabla con `.in('user_id', ids)`, no una por cliente: con
 * diez clientes serian setenta viajes y la pantalla se abre entre consultas.
 */
export async function cargarClientes(coachId: string): Promise<Lectura<ClienteConsola[]>> {
  try {
    const hoy = getLocalToday();
    const desde = restarDias(hoy, VENTANA_ADHERENCIA_DIAS - 1);

    // 1. La relacion. Es la misma que RLS exige para dejar leer lo demas.
    const vinculos = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', coachId)
      .eq('status', 'active');
    if (vinculos.error) {
      logWarn('[consola] no se pudieron leer los vinculos', vinculos.error);
      return { estado: 'error' };
    }
    const ids = Array.from(new Set(
      ((vinculos.data ?? []) as { client_id: string }[])
        .map((r) => r.client_id)
        .filter((id) => id && id !== coachId && !estaExcluido(id)),
    ));
    if (ids.length === 0) return { estado: 'ok', datos: [] };

    // 2. Todo lo demas, en paralelo.
    const [
      perfiles, dx, intervenciones, completados, suplementos,
      quiz, labs, sintomas, comida, agua, electrones, argos, mente, tomas,
    ] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, tier, tier_expires_at, is_test').in('id', ids),
      supabase.from('functional_dx')
        .select('user_id, version, created_at, esElite:sources_snapshot->elite_v3->schema')
        .in('user_id', ids).order('created_at', { ascending: true }),
      supabase.from('user_interventions').select('id, user_id, activated_at').in('user_id', ids).eq('status', 'active'),
      supabase.from('intervention_completions')
        .select('user_id, user_intervention_id, date').in('user_id', ids).eq('completed', true).gte('date', desde),
      supabase.from('user_supplements').select('user_id').in('user_id', ids).eq('is_active', true),
      supabase.from('user_master_quiz').select('user_id, question_code, answer, answered_at').in('user_id', ids),
      supabase.from('lab_uploads').select('user_id, uploaded_at').in('user_id', ids),
      supabase.from('user_symptoms').select('user_id, created_at').in('user_id', ids),
      supabase.from('food_logs').select('user_id, date').in('user_id', ids),
      supabase.from('hydration_logs').select('user_id, created_at').in('user_id', ids),
      supabase.from('electron_logs').select('user_id, date').in('user_id', ids),
      supabase.from('argos_daily_usage').select('user_id, usage_date').in('user_id', ids),
      supabase.from('mind_sessions').select('user_id, date').in('user_id', ids),
      supabase.from('supplement_logs').select('user_id, date').in('user_id', ids).eq('taken', true),
    ]);

    const fallo = [perfiles, dx, intervenciones, completados, suplementos, quiz,
      labs, sintomas, comida, agua, electrones, argos, mente, tomas].find((r) => r.error);
    if (fallo?.error) {
      logWarn('[consola] una lectura de la lista fallo', fallo.error);
      return { estado: 'error' };
    }

    // 3. Indexar.
    const porPerfil = new Map<string, FilaPerfil>();
    for (const p of (perfiles.data ?? []) as unknown as FilaPerfil[]) porPerfil.set(p.id, p);

    const evaluacionPorCliente = new Map<string, { version: number; fecha: string }>();
    const dxPorCliente = new Map<string, string>();
    const evalNovedad = new Map<string, string>();
    for (const d of (dx.data ?? []) as unknown as
      { user_id: string; version: number; created_at: string; esElite: unknown }[]) {
      const fecha = soloFecha(d.created_at);
      if (!fecha) continue;
      const prevDx = dxPorCliente.get(d.user_id);
      if (!prevDx || fecha > prevDx) dxPorCliente.set(d.user_id, fecha);
      // `esElite` es la proyeccion de sources_snapshot->elite_v3->schema: solo
      // trae valor si esa fila ES una evaluacion Elite del generador.
      if (d.esElite === null || d.esElite === undefined) continue;
      const prev = evaluacionPorCliente.get(d.user_id);
      if (!prev || d.version > prev.version) evaluacionPorCliente.set(d.user_id, { version: d.version, fecha });
      const prevN = evalNovedad.get(d.user_id);
      if (!prevN || fecha > prevN) evalNovedad.set(d.user_id, fecha);
    }

    const intervPorCliente = new Map<string, { id: string; activadaEl: string | null }[]>();
    for (const i of (intervenciones.data ?? []) as unknown as
      { id: string; user_id: string; activated_at: string | null }[]) {
      const arr = intervPorCliente.get(i.user_id) ?? [];
      arr.push({ id: i.id, activadaEl: soloFecha(i.activated_at) });
      intervPorCliente.set(i.user_id, arr);
    }

    const compPorCliente = new Map<string, { intervencionId: string; fecha: string }[]>();
    for (const c of (completados.data ?? []) as unknown as
      { user_id: string; user_intervention_id: string; date: string }[]) {
      const arr = compPorCliente.get(c.user_id) ?? [];
      arr.push({ intervencionId: c.user_intervention_id, fecha: c.date });
      compPorCliente.set(c.user_id, arr);
    }

    const supsPorCliente = new Map<string, number>();
    for (const s of (suplementos.data ?? []) as unknown as { user_id: string }[]) {
      supsPorCliente.set(s.user_id, (supsPorCliente.get(s.user_id) ?? 0) + 1);
    }

    const objetivosPorCliente = new Map<string, string[]>();
    const quizPorCliente = new Map<string, string>();
    const opcionesB1 = MASTER_QUIZ_BY_CODE['B.1']?.options ?? [];
    for (const q of (quiz.data ?? []) as unknown as
      { user_id: string; question_code: string; answer: unknown; answered_at: string }[]) {
      const fecha = soloFecha(q.answered_at);
      if (fecha) {
        const prev = quizPorCliente.get(q.user_id);
        if (!prev || fecha > prev) quizPorCliente.set(q.user_id, fecha);
      }
      if (q.question_code !== 'B.1' || !Array.isArray(q.answer)) continue;
      const etiquetas = (q.answer as unknown[])
        .map((v) => opcionesB1.find((o) => o.value === String(v))?.label ?? String(v))
        .slice(0, 3);
      objetivosPorCliente.set(q.user_id, etiquetas);
    }

    const labsPorCliente = maxPorCliente((labs.data ?? []) as Record<string, unknown>[], 'uploaded_at');
    const sintPorCliente = maxPorCliente((sintomas.data ?? []) as Record<string, unknown>[], 'created_at');
    const comidaPorCliente = maxPorCliente((comida.data ?? []) as Record<string, unknown>[], 'date');
    const aguaPorCliente = maxPorCliente((agua.data ?? []) as Record<string, unknown>[], 'created_at');
    const elecPorCliente = maxPorCliente((electrones.data ?? []) as Record<string, unknown>[], 'date');
    const argosPorCliente = maxPorCliente((argos.data ?? []) as Record<string, unknown>[], 'usage_date');
    const mentePorCliente = maxPorCliente((mente.data ?? []) as Record<string, unknown>[], 'date');
    const tomasPorCliente = maxPorCliente((tomas.data ?? []) as Record<string, unknown>[], 'date');
    const compFechaPorCliente = new Map<string, string>();
    for (const [uid, arr] of compPorCliente) {
      const max = arr.reduce((a, b) => (b.fecha > a ? b.fecha : a), arr[0]?.fecha ?? '');
      if (max) compFechaPorCliente.set(uid, max);
    }

    // 4. Armar.
    const datos: ClienteConsola[] = [];
    for (const id of ids) {
      const p = porPerfil.get(id);
      // Sin fila de perfil no se inventa un cliente: RLS puede haberla negado.
      if (!p || p.is_test) continue;

      const fuentes: FuenteSenal[] = [
        { fuente: 'intervenciones', fecha: compFechaPorCliente.get(id) ?? null },
        { fuente: 'electrones', fecha: elecPorCliente.get(id) ?? null },
        { fuente: 'ARGOS', fecha: argosPorCliente.get(id) ?? null },
        { fuente: 'comida', fecha: comidaPorCliente.get(id) ?? null },
        { fuente: 'agua', fecha: aguaPorCliente.get(id) ?? null },
        { fuente: 'suplementos', fecha: tomasPorCliente.get(id) ?? null },
        { fuente: 'mente', fecha: mentePorCliente.get(id) ?? null },
        { fuente: 'sintomas', fecha: sintPorCliente.get(id) ?? null },
        { fuente: 'laboratorios', fecha: labsPorCliente.get(id) ?? null },
        { fuente: 'cuestionario', fecha: quizPorCliente.get(id) ?? null },
      ];
      const senal = senalDeVida(fuentes, hoy);
      // La salvaguarda del cero falso: ¿dejo ALGUN rastro dentro de la misma
      // ventana con la que se mide la adherencia?
      const huboSenal = senal.estado === 'ok' && senal.fecha >= desde;

      const novedades: Novedad[] = [];
      const lab = labsPorCliente.get(id);
      if (lab) novedades.push({ tipo: 'laboratorios', fecha: lab, texto: 'Subió laboratorios' });
      const ev = evalNovedad.get(id);
      if (ev) novedades.push({ tipo: 'evaluacion', fecha: ev, texto: 'Evaluación cargada' });
      const si = sintPorCliente.get(id);
      if (si) novedades.push({ tipo: 'sintomas', fecha: si, texto: 'Registró síntomas' });
      const qz = quizPorCliente.get(id);
      if (qz) novedades.push({ tipo: 'cuestionario', fecha: qz, texto: 'Contestó el cuestionario' });
      novedades.sort((a, b) => b.fecha.localeCompare(a.fecha));

      datos.push({
        id,
        nombre: (p.full_name ?? '').trim() || (p.email ?? '').trim() || 'Sin nombre',
        email: p.email ?? '',
        tier: p.tier,
        accesoVence: soloFecha(p.tier_expires_at),
        evaluacion: evaluacionPorCliente.get(id) ?? null,
        dxFecha: dxPorCliente.get(id) ?? null,
        suplementosActivos: supsPorCliente.get(id) ?? 0,
        objetivos: objetivosPorCliente.get(id) ?? [],
        senal,
        adherencia: adherenciaIntervenciones(
          intervPorCliente.get(id) ?? [], compPorCliente.get(id) ?? [], hoy, huboSenal,
        ),
        novedades,
      });
    }

    return { estado: 'ok', datos };
  } catch (e) {
    logWarn('[consola] la lista no se pudo leer', e);
    return { estado: 'error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// El detalle de uno
// ─────────────────────────────────────────────────────────────────────────────

export interface IntervencionDetalle {
  id: string;
  nombre: string;
  /** Dias marcados dentro de la ventana. */
  marcados: number;
  /** Dias que se le podian pedir en la ventana. */
  esperados: number;
  /** Ultima vez que la marco, o null si nunca en la ventana. */
  ultima: string | null;
}

export interface SuplementoDetalle {
  nombre: string;
  dosis: string | null;
  patron: string | null;
}

export interface DetalleCliente {
  intervenciones: IntervencionDetalle[];
  suplementos: SuplementoDetalle[];
}

/**
 * El desglose que Enrique abre cuando ya sabe A QUIEN le habla y quiere saber
 * DE QUE. Se lee aparte de la lista porque la lista no lo necesita y son dos
 * consultas mas por cliente.
 */
export async function cargarDetalle(clientId: string): Promise<Lectura<DetalleCliente>> {
  try {
    const hoy = getLocalToday();
    const desde = restarDias(hoy, VENTANA_ADHERENCIA_DIAS - 1);
    const [intervenciones, completados, suplementos] = await Promise.all([
      supabase.from('user_interventions')
        .select('id, intervention_key, custom_definition, activated_at')
        .eq('user_id', clientId).eq('status', 'active'),
      supabase.from('intervention_completions')
        .select('user_intervention_id, date')
        .eq('user_id', clientId).eq('completed', true).gte('date', desde),
      supabase.from('user_supplements')
        .select('name, dosage, dose_pattern')
        .eq('user_id', clientId).eq('is_active', true).order('name'),
    ]);
    const fallo = [intervenciones, completados, suplementos].find((r) => r.error);
    if (fallo?.error) {
      logWarn('[consola] el detalle no se pudo leer', fallo.error);
      return { estado: 'error' };
    }

    const porIntervencion = new Map<string, Set<string>>();
    for (const c of (completados.data ?? []) as unknown as
      { user_intervention_id: string; date: string }[]) {
      const set = porIntervencion.get(c.user_intervention_id) ?? new Set<string>();
      set.add(c.date);
      porIntervencion.set(c.user_intervention_id, set);
    }

    const filas = (intervenciones.data ?? []) as unknown as {
      id: string; intervention_key: string;
      custom_definition: { name?: string } | null; activated_at: string | null;
    }[];

    const lista: IntervencionDetalle[] = filas.map((iv) => {
      const dias = porIntervencion.get(iv.id) ?? new Set<string>();
      const activada = soloFecha(iv.activated_at);
      const arranque = activada && activada > desde ? activada : desde;
      const esperados = Math.max(0, Math.min(VENTANA_ADHERENCIA_DIAS, diasDesde(arranque, hoy)));
      const ordenadas = Array.from(dias).sort();
      return {
        id: iv.id,
        nombre: INTERVENTION_BY_KEY[iv.intervention_key]?.name
          ?? iv.custom_definition?.name
          ?? iv.intervention_key,
        marcados: dias.size,
        esperados,
        ultima: ordenadas.length > 0 ? ordenadas[ordenadas.length - 1] : null,
      };
    });
    // Primero lo que menos se esta haciendo: es de lo que hay que hablar.
    lista.sort((a, b) => (a.marcados / Math.max(1, a.esperados)) - (b.marcados / Math.max(1, b.esperados)));

    const sups = ((suplementos.data ?? []) as unknown as
      { name: string; dosage: string | null; dose_pattern: string | null }[])
      .map((s) => ({ nombre: s.name, dosis: s.dosage, patron: s.dose_pattern }));

    return { estado: 'ok', datos: { intervenciones: lista, suplementos: sups } };
  } catch (e) {
    logWarn('[consola] detalle sin red', e);
    return { estado: 'error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vincular
// ─────────────────────────────────────────────────────────────────────────────

export interface Candidato {
  id: string;
  nombre: string;
  email: string;
  tier: string | null;
}

/**
 * Personas con cuenta que TODAVIA no estan vinculadas a Enrique. Es la lista
 * para dar de alta a los que van entrando: mientras no exista la fila en
 * `coach_clients`, RLS no le deja ver un solo dato de salud suyo.
 *
 * Se muestra solo nombre, correo y nivel: nada de salud. Fuera quedan las
 * cuentas de prueba, el propio Enrique, los perfiles excluidos por nombre
 * (Mariana) y cualquiera que sea coach de alguien mas.
 */
export async function cargarCandidatos(coachId: string): Promise<Lectura<Candidato[]>> {
  try {
    const [perfiles, vinculos] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, tier, is_test'),
      supabase.from('coach_clients').select('coach_id, client_id'),
    ]);
    if (perfiles.error || vinculos.error) {
      logWarn('[consola] candidatos no se pudieron leer', perfiles.error ?? vinculos.error);
      return { estado: 'error' };
    }
    const yaMios = new Set<string>();
    const sonCoach = new Set<string>();
    for (const v of (vinculos.data ?? []) as { coach_id: string; client_id: string }[]) {
      sonCoach.add(v.coach_id);
      if (v.coach_id === coachId) yaMios.add(v.client_id);
    }
    const datos = ((perfiles.data ?? []) as unknown as FilaPerfil[])
      .filter((p) => !p.is_test && p.id !== coachId && !estaExcluido(p.id)
        && !yaMios.has(p.id) && !sonCoach.has(p.id))
      .map((p) => ({
        id: p.id,
        nombre: (p.full_name ?? '').trim() || (p.email ?? '').trim() || 'Sin nombre',
        email: p.email ?? '',
        tier: p.tier,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { estado: 'ok', datos };
  } catch (e) {
    logWarn('[consola] candidatos sin red', e);
    return { estado: 'error' };
  }
}

/** Da de alta el vinculo. Sin el, RLS no deja leer nada de esa persona. */
export async function vincularCliente(coachId: string, clientId: string): Promise<boolean> {
  if (estaExcluido(clientId) || clientId === coachId) return false;
  try {
    const { error } = await supabase
      .from('coach_clients')
      .insert({ coach_id: coachId, client_id: clientId, status: 'active' });
    if (error) {
      logWarn('[consola] no se pudo vincular', error);
      return false;
    }
    return true;
  } catch (e) {
    logWarn('[consola] vincular sin red', e);
    return false;
  }
}
