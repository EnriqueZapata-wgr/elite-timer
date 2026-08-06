/**
 * pack-service — el motor de packs, capa con efectos (MB-25 Pieza 2).
 *
 * Ejecuta el plan que decide pack-core por los caminos que YA existen:
 * installApp / installAppGridOnly (instalar = activar, MB-20),
 * electron-prefs (hábitos sin app), habit-times (horas), los writers de
 * metas (proteína, agua, ayuno) y updateAppAviso (avisos por app, con el
 * maestro general mandando). Cero rutas paralelas.
 *
 * Si un paso falla a media activación se reporta el estado real, paso por
 * paso: nunca dejamos al usuario creyendo que tiene un pack a medias sin
 * saberlo.
 *
 * Registro en user_packs (migración 254): la fila guarda pack, intensidad
 * y horario. Con ella pack-core reconstruye el plan de la activación
 * anterior y la re-activación no pisa lo que el usuario cambió a mano.
 * ⚠️ Clase {error}: supabase-js no lanza en 4xx — cada lectura se revisa.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { PACK_BY_KEY, type PackIntensidad } from '@/src/constants/packs';
import {
  buildPackPlan,
  esHoraValida,
  packActivo,
  planDeFila,
  reconcilarPack,
  writesAlDesactivar,
  type EstadoActual,
  type PackPlan,
  type PackWrites,
  type UserPackRow,
} from '@/src/services/pack-core';
import { installApp, installAppGridOnly, uninstallApp } from '@/src/services/hoy/install-service';
import {
  getElectronPrefs,
  setElectronPrefs,
  applyElectronToggle,
} from '@/src/services/hoy/electron-prefs-service';
import { setHabitTimeRegla } from '@/src/services/hoy/habit-times-service';
import { parseHabitTimeEntry } from '@/src/services/hoy/habit-times-core';
import { reactivarHabitos } from '@/src/services/hoy/habit-states-service';
import { DEFAULT_BOOLEANS, ALL_BOOLEAN_OPTIONS, ALL_QUANT_OPTIONS } from '@/src/services/hoy/day-booleans';
import { setProteinGoalG, DEFAULT_PROTEIN_GOAL_G } from '@/src/services/protein-goal-service';
import { setUserWaterGoal, HYDRATION_DEFAULTS } from '@/src/services/hydration-service';
import { setFastingGoalHours, DEFAULT_FASTING_GOAL_HOURS } from '@/src/services/fasting-service';
import { getAppAviso, updateAppAviso } from '@/src/services/app-avisos-service';
import type { InstallPrefs } from '@/src/services/hoy/install-core';

// ─── Lectura del registro ───────────────────────────────────────────────────

/** null = FALLO de lectura (clase {error}): no confundir con "sin packs". */
export async function getUserPacks(userId: string): Promise<UserPackRow[] | null> {
  const { data, error } = await supabase
    .from('user_packs')
    .select('pack_key, intensidad, wake_time, sleep_time, active, activated_at')
    .eq('user_id', userId);
  if (error) {
    logWarn('[packs] read failed', error);
    return null;
  }
  return (data ?? []) as UserPackRow[];
}

/** El pack activo del usuario, o null (también null si la lectura falló). */
export async function getPackActivo(userId: string): Promise<UserPackRow | null> {
  return packActivo(await getUserPacks(userId));
}

// ─── Estado actual (para reconciliar) ───────────────────────────────────────

async function leerEstadoActual(userId: string, avisoApps: string[]): Promise<EstadoActual | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('active_boolean_electrons, active_quantitative_electrons, installed_apps, goals')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[packs] estado read failed', error);
    return null;
  }
  const goals = (data?.goals as Record<string, unknown>) ?? {};
  const prefs: InstallPrefs = {
    booleans: (data?.active_boolean_electrons as string[]) ?? [...DEFAULT_BOOLEANS],
    quants: (data?.active_quantitative_electrons as string[]) ?? ['protein', 'water'],
    installedApps: (data?.installed_apps as string[]) ?? [],
  };
  // MB-26 P5: las entradas pueden ser fijas 'HH:MM' o reglas — ambas
  // cuentan para el reconcile (una fija manual JAMÁS se pisa).
  const habitTimes: EstadoActual['habitTimes'] = {};
  const ht = goals.habit_times as Record<string, unknown> | undefined;
  if (ht) {
    for (const [k, v] of Object.entries(ht)) {
      const entry = parseHabitTimeEntry(v);
      if (entry != null) habitTimes[k] = entry;
    }
  }
  const num = (v: unknown, def: number) => (typeof v === 'number' && v > 0 ? v : def);
  const metas = {
    proteina_g: num(goals.protein_goal_g, DEFAULT_PROTEIN_GOAL_G),
    agua_ml: num(goals.water_goal_ml, HYDRATION_DEFAULTS.waterGoalMl),
    ayuno_h: num(goals.fasting_hours, DEFAULT_FASTING_GOAL_HOURS),
  };
  const avisos: EstadoActual['avisos'] = {};
  for (const app of avisoApps) {
    // Fail-soft: si la lectura falla, getAppAviso devuelve defaults
    // (disabled) y el reconcile lo tratará como "sin aviso".
    avisos[app as keyof EstadoActual['avisos']] = await getAppAviso(userId, app as never);
  }
  return { prefs, habitTimes, metas, avisos };
}

// ─── Activar ────────────────────────────────────────────────────────────────

export type PasoActivacion = 'apps' | 'habitos' | 'horas' | 'metas' | 'avisos' | 'registro';

export interface PasoResultado {
  paso: PasoActivacion;
  ok: boolean;
  /** Qué falló exactamente, en lenguaje del usuario. */
  detalle?: string;
}

export interface ResultadoActivacion {
  /** true solo si TODOS los pasos entraron. */
  ok: boolean;
  plan: PackPlan | null;
  escrituras: PackWrites | null;
  pasos: PasoResultado[];
}

function fallo(paso: PasoActivacion, detalle: string): ResultadoActivacion {
  return { ok: false, plan: null, escrituras: null, pasos: [{ paso, ok: false, detalle }] };
}

/**
 * Activa un pack: instala, enciende, ancla horas, fija metas, configura
 * avisos y registra. Idempotente y respetuoso de lo manual (pack-core).
 * UN pack activo a la vez: el anterior queda inactivo pero NADA suyo se
 * desinstala — solo se re-sintoniza. Preguntar antes de cambiar es trabajo
 * de la UI; aquí ya se ejecuta.
 */
export async function activatePack(
  userId: string,
  packKey: string,
  opts: { intensidad: PackIntensidad; despertar: string; dormir: string },
): Promise<ResultadoActivacion> {
  const pack = PACK_BY_KEY[packKey];
  if (!pack) return fallo('registro', 'Ese pack no existe en esta versión.');
  if (!esHoraValida(opts.despertar) || !esHoraValida(opts.dormir)) {
    return fallo('registro', 'El horario no es válido.');
  }

  // Sin el registro no hay idempotencia: si no podemos leerlo (red o
  // migración 254 pendiente), NO se toca nada y se dice claro.
  const rows = await getUserPacks(userId);
  if (rows === null) {
    return fallo('registro', 'No pude leer tu registro de packs. Nada se tocó. Intenta de nuevo en un momento.');
  }
  const estado = await leerEstadoActual(userId, pack.avisos.map((a) => a.app));
  if (estado === null) {
    return fallo('registro', 'No pude leer tu configuración actual. Nada se tocó. Intenta de nuevo en un momento.');
  }

  const filaPrevia = rows.find((r) => r.pack_key === packKey) ?? null;
  const previo = filaPrevia ? planDeFila(filaPrevia) : null;
  const plan = buildPackPlan(packKey, opts.intensidad, opts.despertar, opts.dormir);
  const escrituras = reconcilarPack(plan, previo, estado);
  const pasos: PasoResultado[] = [];

  // MB-26 P1: aplicar un pack ENCIENDE sus hábitos — los que estuvieran
  // graduados o en reposo vuelven a activo antes de cualquier escritura.
  // Sin esto el filtro de estados seguiría quitando sus renglones y el
  // pack quedaría "aplicado" sin aparecer (toggle silencioso clase checkin).
  await reactivarHabitos(userId, plan.encendidos);

  // 1 · Apps: el camino de siempre. installApp enciende su hábito;
  //     installAppGridOnly solo suma a la cuadrícula.
  {
    const fallidas: string[] = [];
    for (const app of escrituras.installApps) {
      const r = await installApp(userId, app);
      if (!r.ok) fallidas.push(app);
    }
    for (const app of escrituras.gridApps) {
      const r = await installAppGridOnly(userId, app);
      if (!r.ok) fallidas.push(app);
    }
    pasos.push(
      fallidas.length === 0
        ? { paso: 'apps', ok: true }
        : { paso: 'apps', ok: false, detalle: `No se pudieron instalar: ${fallidas.join(', ')}.` },
    );
  }

  // 2 · Hábitos sin app (electron-prefs). Se relee DESPUÉS de instalar:
  //     installApp acaba de reescribir las mismas listas.
  {
    let ok = true;
    let detalle: string | undefined;
    if (escrituras.bools.length > 0 || escrituras.quants.length > 0) {
      const prefs = await getElectronPrefs(userId);
      if (!prefs) {
        ok = false;
        detalle = 'No pude leer tus hábitos actuales.';
      } else {
        let booleans = prefs.booleans;
        let quants = prefs.quants;
        const canonBool = ALL_BOOLEAN_OPTIONS.map((o) => o.key);
        const canonQuant = ALL_QUANT_OPTIONS.map((o) => o.key);
        for (const b of escrituras.bools) booleans = applyElectronToggle(booleans, b, true, canonBool);
        for (const q of escrituras.quants) quants = applyElectronToggle(quants, q, true, canonQuant);
        const r = await setElectronPrefs(userId, { booleans, quants });
        if (!r.ok) {
          ok = false;
          detalle = 'No se pudieron encender todos los hábitos.';
        }
      }
    }
    pasos.push({ paso: 'habitos', ok, ...(detalle ? { detalle } : {}) });
  }

  // 3 · Horas ancladas a tu vida — como REGLA (MB-26 P5): el compile las
  //     vuelve absolutas cada día; viajar o cambiar tu despertar las
  //     recorre solas y el pack no las reescribe cuando cambia tu vida.
  {
    const fallidas: string[] = [];
    for (const [src, regla] of Object.entries(escrituras.habitReglas)) {
      const ok = await setHabitTimeRegla(userId, src, regla);
      if (!ok) fallidas.push(src);
    }
    pasos.push(
      fallidas.length === 0
        ? { paso: 'horas', ok: true }
        : { paso: 'horas', ok: false, detalle: `Horas sin guardar: ${fallidas.join(', ')}.` },
    );
  }

  // 4 · Metas, por sus writers de siempre.
  {
    const fallidas: string[] = [];
    for (const m of escrituras.metas) {
      let ok = false;
      try {
        if (m.tipo === 'proteina_g') ok = await setProteinGoalG(userId, m.valor);
        else if (m.tipo === 'agua_ml') ok = await setUserWaterGoal(userId, m.valor);
        else ok = await setFastingGoalHours(userId, m.valor);
      } catch (e) {
        logWarn('[packs] meta write failed', e);
      }
      if (!ok) fallidas.push(m.tipo);
    }
    pasos.push(
      fallidas.length === 0
        ? { paso: 'metas', ok: true }
        : { paso: 'metas', ok: false, detalle: `Metas sin fijar: ${fallidas.join(', ')}.` },
    );
  }

  // 5 · Avisos. El maestro general sigue mandando (planAppAviso); sin
  //     permiso de notificaciones el aviso no queda a medias.
  {
    let sinPermiso = false;
    const fallidas: string[] = [];
    for (const a of escrituras.avisos) {
      const r = await updateAppAviso(userId, a.app, { enabled: true, time: a.time });
      if (!r.ok) {
        if (r.reason === 'permission') sinPermiso = true;
        else fallidas.push(a.app);
      }
    }
    const ok = !sinPermiso && fallidas.length === 0;
    pasos.push({
      paso: 'avisos',
      ok,
      ...(ok
        ? {}
        : {
            detalle: sinPermiso
              ? 'Sin permiso de notificaciones no hay avisos. Puedes darlo en Ajustes cuando quieras.'
              : `Avisos sin configurar: ${fallidas.join(', ')}.`,
          }),
    });
  }

  // 6 · Registro: UN pack activo a la vez. El anterior queda inactivo,
  //     nada suyo se toca.
  {
    let ok = true;
    let detalle: string | undefined;
    const { error: offErr } = await supabase
      .from('user_packs')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('pack_key', packKey)
      .eq('active', true);
    if (offErr) {
      ok = false;
      detalle = 'No pude actualizar el pack anterior.';
      logWarn('[packs] deactivate others failed', offErr);
    }
    const { error: upErr } = await supabase.from('user_packs').upsert(
      {
        user_id: userId,
        pack_key: packKey,
        intensidad: opts.intensidad,
        wake_time: opts.despertar,
        sleep_time: opts.dormir,
        active: true,
        // Re-activar un pack ya activo conserva su "desde cuándo".
        activated_at: filaPrevia?.active ? filaPrevia.activated_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,pack_key' },
    );
    if (upErr) {
      ok = false;
      detalle = 'La configuración entró pero el pack no quedó registrado como activo.';
      logWarn('[packs] upsert failed', upErr);
    }
    pasos.push({ paso: 'registro', ok, ...(detalle ? { detalle } : {}) });
  }

  return { ok: pasos.every((p) => p.ok), plan, escrituras, pasos };
}

// ─── Desactivar ─────────────────────────────────────────────────────────────

/**
 * Desactivar = dejar de agrupar y medir. El servicio ejecuta las listas de
 * writesAlDesactivar — que por doctrina están vacías: NADA se desinstala,
 * NADA se apaga, NADA se borra. Las apps y hábitos quedan como estén y el
 * usuario decide.
 */
export async function deactivatePack(userId: string, packKey: string): Promise<{ ok: boolean }> {
  const pack = PACK_BY_KEY[packKey];
  if (!pack) return { ok: false };

  const w = writesAlDesactivar(pack);
  for (const app of w.desinstala) {
    await uninstallApp(userId, app);
  }
  if (w.apaga.length > 0) {
    const prefs = await getElectronPrefs(userId);
    if (prefs) {
      await setElectronPrefs(userId, {
        booleans: prefs.booleans.filter((b) => !w.apaga.includes(b)),
        quants: prefs.quants.filter((q) => !w.apaga.includes(q)),
      });
    }
  }

  const { error } = await supabase
    .from('user_packs')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('pack_key', packKey);
  if (error) {
    logWarn('[packs] deactivate failed', error);
    return { ok: false };
  }
  return { ok: true };
}
