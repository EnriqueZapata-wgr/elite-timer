/**
 * primera-sesion-service — la capa con efectos de la primera sesion.
 * Pivote limpio, 7 de septiembre de 2026.
 *
 * Las decisiones puras viven en `primera-sesion-core`. Aqui solo hay lecturas
 * y escrituras, por los caminos que YA existian: `profiles.onboarding_step`
 * para el paso, `client_profiles` para el perfil base, `health_measurements`
 * (via capture-service) para la medida, y `pack-service` para el objetivo.
 * Cero rutas paralelas y cero tablas nuevas: esta primera sesion no necesito
 * migracion.
 *
 * ⚠️ Clase {error}: supabase-js NO lanza en 4xx. Cada lectura revisa `error`
 * y distingue "no se pudo leer" de "no hay dato", porque son dos personas
 * distintas y merecen dos pantallas distintas.
 */
import type { Href } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { marcarVistoBueno } from '@/src/services/acceso-consentido';
import { programarAvisoDia7 } from '@/src/services/aviso-dia7-service';
import { DeviceEventEmitter } from 'react-native';
import { getCycleAppMode } from '@/src/services/app-mode-service';
import { getUserSchedule } from '@/src/services/hoy/habit-times-service';
import { saveHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import {
  siguientePaso,
  rutaPrimeraSesion,
  pasoPersistido,
  type PasoPrimeraSesion,
} from '@/src/services/primera-sesion-core';

/** Lo que devuelve un paso: a donde ir, o por que no se pudo cerrar. */
export type ResultadoPaso =
  | { ok: true; ruta: Href }
  | { ok: false; detalle: string };

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Esperas del reintento del cierre. Tres intentos, poco mas de un segundo. */
const ESPERAS_CIERRE_MS = [400, 1200];

/**
 * Marca el paso como hecho: persiste el SIGUIENTE paso pendiente, o cierra la
 * primera sesion.
 *
 * DOS TRATOS DISTINTOS, Y LA DIFERENCIA IMPORTA (revision en frio, 7-sep-2026):
 *
 *  · Los pasos INTERMEDIOS son best effort. Un fallo al anotarlos no puede
 *    dejar a la persona parada; lo peor que pasa es que al volver a abrir la
 *    app repita una pantalla.
 *
 *  · EL CIERRE NO. `onboardingTerminado` solo acepta 'completed', asi que si
 *    esa escritura se pierde, el siguiente arranque en frio manda a la persona
 *    de vuelta a las tres preguntas y pierde los cuatro minutos que acaba de
 *    invertir. Antes se ignoraba el `error`, se marcaba el visto bueno local y
 *    se entraba a las pestanias como si nada. Ahora se reintenta, y si aun asi
 *    no entra se devuelve `ok:false`: la pantalla lo dice y ofrece reintentar,
 *    y el visto bueno NO se marca, porque marcarlo sin la fila seria fabricar
 *    justo lo que el otro candado prohibe.
 */
export async function completarPaso(
  userId: string,
  paso: PasoPrimeraSesion,
): Promise<ResultadoPaso> {
  const siguiente = siguientePaso(paso);
  if (siguiente) {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_step: pasoPersistido(siguiente) })
      .eq('id', userId);
    if (error) logWarn('[primera-sesion] no se pudo anotar el paso', error);
    return { ok: true, ruta: rutaPrimeraSesion(siguiente) };
  }

  for (let intento = 0; ; intento++) {
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'completed',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (!error) {
      // Solo aqui, y solo con la fila escrita: el visto bueno significa "esto
      // ya quedo en el servidor", no "creo que quedo".
      marcarVistoBueno(userId);
      // El aviso suave del dia 7. Fire and forget: un fallo al agendar no
      // frena el cierre de la primera sesion.
      programarAvisoDia7(userId).catch(() => {});
      return { ok: true, ruta: '/(tabs)' };
    }
    logWarn('[primera-sesion] no se pudo cerrar', error);
    const espera = ESPERAS_CIERRE_MS[intento];
    if (espera == null) {
      return {
        ok: false,
        detalle: 'No pudimos guardar el cierre de tu primera sesión. Tu objetivo y tus datos ya están guardados; solo falta esto.',
      };
    }
    await dormir(espera);
  }
}

/**
 * Escribe el horario del dia DONDE EL COMPILADOR LO LEE.
 *
 * ESTA ERA UNA REGRESION CONTRA EL ONBOARDING VIEJO, y de las caras. Las horas
 * de la pantalla 2 se guardaban solo en `user_packs`, que sirve para redibujar
 * el plan; pero el dia real de HOY se compila con
 * `goals.wake_time ?? user_chronotype.wake_time ?? '07:00'` (day-compiler y
 * getUserSchedule). Quien despierta a las 05:00 veia "Meditacion 05:30" en las
 * pantallas 4 y 6, y HOY se la ponia a las 07:30, mientras el aviso sonaba a
 * la hora correcta porque los avisos si se escriben en absoluto. La pantalla
 * prometia en letra grande algo que no ocurria.
 *
 * Se escribe en `user_day_preferences.goals`, que es la fuente de MAXIMA
 * prioridad de las dos, y es la correcta: la persona acaba de contestar esas
 * horas a mano, que es exactamente lo que ese campo significa. No se toca
 * `user_chronotype` porque esta primera sesion no corre el test de cronotipo y
 * escribir uno inventado seria peor que no escribir nada.
 *
 * Y no pisa nada en silencio: la pantalla 2 prellena con `getUserSchedule`, o
 * sea con este mismo valor, asi que lo que se guarda es lo que la persona
 * confirmo viendo.
 */
export async function guardarHorarioDelDia(
  userId: string,
  despertar: string,
  dormirse: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[primera-sesion] horario del dia: lectura fallo', error);
    return false;
  }
  const goals = (data?.goals as Record<string, unknown>) ?? {};
  const { error: errEscritura } = await supabase
    .from('user_day_preferences')
    .upsert(
      {
        user_id: userId,
        goals: { ...goals, wake_time: despertar, sleep_time: dormirse },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (errEscritura) {
    logWarn('[primera-sesion] horario del dia: escritura fallo', errEscritura);
    return false;
  }
  // Sin esto, HOY sigue pintando las horas viejas hasta el proximo recompile.
  DeviceEventEmitter.emit('electrons_changed');
  return true;
}

/**
 * Quien puede ver el objetivo del ciclo. Tres estados a proposito:
 * `null` = no se pudo saber, y mientras no se sepa no se ofrece y tampoco se
 * descarta. El criterio es el MISMO que usa `visibleApps` para la app Ciclo.
 */
export async function leerCicloVisible(userId: string): Promise<boolean | null> {
  try {
    const [{ data, error }, mode] = await Promise.all([
      supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
      getCycleAppMode(userId),
    ]);
    if (error) {
      logWarn('[primera-sesion] ciclo visible: lectura fallo', error);
      return null;
    }
    return (data as { biological_sex?: string } | null)?.biological_sex === 'female' || mode != null;
  } catch (e) {
    logWarn('[primera-sesion] ciclo visible: excepcion', e);
    return null;
  }
}

export interface HorarioSugerido {
  despertar: string;
  dormir: string;
  /** true si vino de un cronotipo ya guardado y no de los valores de arranque. */
  esSuyo: boolean;
}

/** 'HH:MM[:SS]' de la base → 'HH:MM', o null si no sirve. */
function horaDeDb(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const corto = v.split(':').slice(0, 2).join(':');
  return /^\d{2}:\d{2}$/.test(corto) ? corto : null;
}

/**
 * Las horas con las que arranca la pregunta 2.
 *
 * Salen de `getUserSchedule`, o sea de EXACTAMENTE la misma cadena que usa el
 * compilador del dia (goals pisa al cronotipo, y el cronotipo al default). Se
 * lee de ahi a proposito: asi lo que la persona confirma en pantalla es lo
 * mismo que ya rige su dia, y guardarlo de vuelta nunca le cambia un numero
 * sin que lo haya visto. Los 13 perfiles previos con cronotipo entran con sus
 * horas puestas y solo confirman.
 */
export async function leerHorarioSugerido(userId: string): Promise<HorarioSugerido> {
  const arranque = { despertar: '07:00', dormir: '23:00' };
  const horario = await getUserSchedule(userId);
  const esSuyo = horario.despertar !== arranque.despertar || horario.dormir !== arranque.dormir;
  return { ...horario, esSuyo };
}

/**
 * El horario que quedo GUARDADO al aplicar el objetivo (user_packs).
 *
 * Existe para que la pantalla 5 no dependa de los parametros de la URL: si la
 * persona cerro la app y volvio, sus horas siguen ahi y la ventana de sueno se
 * calcula con las de verdad. null = no hay fila o no se pudo leer, y en ese
 * caso la pantalla dice que le falta ese dato en vez de inventarlo.
 */
export async function leerHorarioDelObjetivo(
  userId: string,
): Promise<{ despertar: string; dormir: string } | null> {
  const { data, error } = await supabase
    .from('user_packs')
    .select('wake_time, sleep_time, active, activated_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('activated_at', { ascending: false })
    .limit(1);
  if (error) {
    logWarn('[primera-sesion] horario del objetivo: lectura fallo', error);
    return null;
  }
  const fila = (data ?? [])[0] as { wake_time?: string; sleep_time?: string } | undefined;
  const w = horaDeDb(fila?.wake_time);
  const d = horaDeDb(fila?.sleep_time);
  return w && d ? { despertar: w, dormir: d } : null;
}

export interface PerfilBase {
  sexo: 'male' | 'female' | null;
  /** 'AAAA-MM-DD' */
  fechaNacimiento: string | null;
  tallaCm: number | null;
  pesoKg: number | null;
}

export type LecturaPerfil =
  | { ok: true; perfil: PerfilBase }
  | { ok: false };

/**
 * Lo que la persona YA dio, para prellenar la pantalla 5.
 *
 * Importa por los 13 perfiles que existen desde antes: a nadie se le vuelve a
 * pedir un dato que ya entrego. `ok:false` es "no se pudo leer", que NO es lo
 * mismo que "no hay nada": con lo primero la pantalla ofrece reintentar, con
 * lo segundo pide los datos.
 */
export async function leerPerfilBase(userId: string): Promise<LecturaPerfil> {
  const [perfil, medida] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('biological_sex, date_of_birth, height_cm')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('health_measurements')
      .select('weight_kg, height_cm, measured_at')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  if (perfil.error || medida.error) {
    logWarn('[primera-sesion] perfil base: lectura fallo', perfil.error ?? medida.error);
    return { ok: false };
  }
  const p = perfil.data as { biological_sex?: string; date_of_birth?: string; height_cm?: number } | null;
  const m = (medida.data ?? [])[0] as { weight_kg?: number; height_cm?: number } | undefined;
  const sexo = p?.biological_sex === 'male' || p?.biological_sex === 'female' ? p.biological_sex : null;
  return {
    ok: true,
    perfil: {
      sexo,
      fechaNacimiento: typeof p?.date_of_birth === 'string' ? p.date_of_birth : null,
      tallaCm: p?.height_cm ?? m?.height_cm ?? null,
      pesoKg: m?.weight_kg ?? null,
    },
  };
}

export interface GuardadoPerfil {
  ok: boolean;
  /** Qué falló, en lenguaje de la persona. */
  detalle?: string;
}

/**
 * Guarda los cuatro datos de la pantalla 5.
 *
 * Los escribe por las tablas canónicas de siempre: `client_profiles` para el
 * perfil y `health_measurements` (vía capture-service) para la medida, que es
 * la que lee Edad ATP. No hay tabla nueva y no hay copia paralela.
 *
 * Solo se llama con el consentimiento de datos de salud confirmado: la puerta
 * (CB-2) vive en la pantalla y bloquea de verdad, no adorna.
 */
export async function guardarPerfilBase(
  userId: string,
  datos: { sexo: 'male' | 'female'; fechaNacimiento: string; tallaCm: number; pesoKg: number },
): Promise<GuardadoPerfil> {
  const { error: errPerfil } = await supabase
    .from('client_profiles')
    .upsert(
      {
        user_id: userId,
        date_of_birth: datos.fechaNacimiento,
        biological_sex: datos.sexo,
        height_cm: datos.tallaCm,
      },
      { onConflict: 'user_id' },
    );
  if (errPerfil) {
    logWarn('[primera-sesion] perfil base: escritura falló', errPerfil);
    return { ok: false, detalle: 'No se pudieron guardar tus datos. Nada se perdió, intenta de nuevo.' };
  }
  const medida = await saveHealthMeasurement(userId, {
    weight_kg: datos.pesoKg,
    height_cm: datos.tallaCm,
  });
  if (!medida.ok) {
    return { ok: false, detalle: 'Se guardó tu perfil, pero no tu medida. Intenta de nuevo.' };
  }
  // La verificación de edad se anota aparte: CB-4 se firmó en el registro y
  // aquí es donde por fin hay una fecha contra la cual sostenerlo.
  const { error: errEdad } = await supabase
    .from('profiles')
    .update({ age_verified_at: new Date().toISOString() })
    .eq('id', userId);
  if (errEdad) logWarn('[primera-sesion] no se pudo anotar la verificación de edad', errEdad);
  return { ok: true };
}
