/**
 * pack-avisos-service (7-sep-2026, pivote limpio) — el reintento de los
 * avisos que el objetivo pidió y no se pudieron encender.
 *
 * EL DEFECTO QUE REPARA: aplicarPack ya llamaba a updateAppAviso con
 * {enabled:true}, pero sin permiso de notificaciones el paso quedaba
 * ok:false y nadie lo reintentaba nunca. La persona concedía el permiso
 * después y sus avisos seguían muertos, en silencio, para siempre.
 *
 * DÓNDE VIVEN LOS PENDIENTES: en el dispositivo (AsyncStorage), no en la
 * base. Tres razones:
 *  1. El único fallo reparable con reintento es el permiso, y el permiso de
 *     notificaciones es del APARATO. Una fila "pendiente" en la base diría
 *     lo mismo en el teléfono donde nunca se pidió y en el que ya lo dio.
 *  2. La verdad durable de QUÉ pidió el objetivo ya está en la base
 *     (user_packs + el catálogo): el reconciliador la reconstruye con
 *     planDeFila, así que perder el registro local nunca pierde la
 *     intención, solo el "por qué falló".
 *  3. Sin migración que aplicar, la reparación viaja en un OTA.
 *
 * La clave del registro lleva el userId (clavePendientes): cerrar sesión no
 * limpia AsyncStorage, así que con clave fija la cuenta B leía y borraba los
 * pendientes de la cuenta A en el mismo teléfono.
 *
 * LA LÍNEA QUE NO SE CRUZA vive en el core puro (pack-avisos-reconcile-core):
 * lo que la persona apagó a mano no se vuelve a encender desde aquí. Nunca.
 *
 * ⚠️ Clase {error}: supabase-js no lanza en 4xx. Sin lectura sana no se
 * escribe nada y NO se cierra ningún pendiente.
 */
import { warn as logWarn } from '@/src/lib/logger';
import { planDeFila } from '@/src/services/pack-core';
import { getUserPacks } from '@/src/services/pack-service';
import {
  leerFilasAviso,
  permisoNotificaciones,
  updateAppAviso,
  type AvisoAppKey,
} from '@/src/services/app-avisos-service';
import {
  clavePendientes,
  decidirCorrida,
  filtrarPendientes,
  fusionarPendientes,
  planearReconciliacionAvisos,
  type AvisoDeseado,
  type MotivoReconcilia,
  type PendienteAviso,
  type RazonPendiente,
} from '@/src/services/pack-avisos-reconcile-core';

/** Tope de higiene: hay 4 apps con aviso, más de eso es basura acumulada. */
const MAX_PENDIENTES = 12;

// AsyncStorage se carga tarde (mismo patrón que edad-sound.ts): así
// pack-service puede pedir este módulo bajo demanda sin arrastrar el nativo
// a los tests de servicio que ya existen.
async function almacen() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

/**
 * El registro de pasos a medias de ESTA cuenta. Storage ilegible o con
 * basura adentro → lista vacía (nunca una excepción hacia arriba).
 */
export async function leerAvisosPendientes(userId: string): Promise<PendienteAviso[]> {
  try {
    const raw = await (await almacen()).getItem(clavePendientes(userId));
    if (!raw) return [];
    return filtrarPendientes(JSON.parse(raw));
  } catch (e) {
    logWarn('[pack-avisos] registro ilegible', e);
    return [];
  }
}

async function guardarPendientes(userId: string, lista: PendienteAviso[]): Promise<void> {
  try {
    const almacenamiento = await almacen();
    const clave = clavePendientes(userId);
    if (lista.length === 0) {
      await almacenamiento.removeItem(clave);
      return;
    }
    await almacenamiento.setItem(clave, JSON.stringify(lista.slice(0, MAX_PENDIENTES)));
  } catch (e) {
    logWarn('[pack-avisos] no se pudo guardar el registro', e);
  }
}

/**
 * Anota los avisos que un objetivo no pudo encender, con QUÉ falló y POR
 * QUÉ. Un aviso ya anotado conserva su `desde`: lo que importa es desde
 * cuándo lleva roto, no cuándo se reintentó por última vez.
 */
export async function registrarAvisosPendientes(
  userId: string,
  packKey: string,
  fallos: { app: AvisoAppKey; time: string; razon: RazonPendiente }[],
): Promise<void> {
  if (!userId || fallos.length === 0) return;
  const previos = await leerAvisosPendientes(userId);
  const fusionados = fusionarPendientes(
    previos,
    fallos.map((f) => ({ packKey, ...f })),
    new Date().toISOString(),
  );
  await guardarPendientes(userId, fusionados);
}

export interface ResultadoReconcilia {
  motivo: MotivoReconcilia | 'muy_pronto' | 'sin_objetivos';
  encendidos: AvisoAppKey[];
  fallidos: AvisoAppKey[];
  /** Cuántos siguen esperando reparación después de esta corrida. */
  pendientes: number;
}

const VACIO: ResultadoReconcilia = { motivo: 'nada_que_hacer', encendidos: [], fallidos: [], pendientes: 0 };

// HOY llama a esto al montar y al volver del segundo plano, y esos dos
// pueden llegar juntos. El guard evita la corrida doble; el respiro evita
// pegarle a la base cada vez que alguien cambia de app.
let corriendo = false;
let ultimaCorridaMs = 0;
const RESPIRO_MS = 30_000;

/**
 * Reintenta lo que quedó pendiente de los objetivos activos. Idempotente:
 * correrlo diez veces deja el mismo resultado que correrlo una, porque la
 * decisión sale del estado real de las filas, no del registro local.
 *
 * No abre ningún diálogo de permiso: si todavía no está concedido, se sale
 * en silencio y el pendiente se conserva para el próximo intento.
 */
export async function reconciliarAvisosDeObjetivos(
  userId: string,
  opts?: { forzar?: boolean },
): Promise<ResultadoReconcilia> {
  if (!userId) return VACIO;
  const ahora = Date.now();
  const decision = decidirCorrida({
    corriendo,
    ultimaCorridaMs,
    ahoraMs: ahora,
    respiroMs: RESPIRO_MS,
    forzar: opts?.forzar,
  });
  if (decision !== 'corre') return { ...VACIO, motivo: 'muy_pronto' };
  corriendo = true;
  try {
    const pendientes = await leerAvisosPendientes(userId);

    // El permiso va PRIMERO: es lo único que no cuesta un viaje a la base y
    // sin él no hay nada que decidir. Esta salida NO marca el respiro, a
    // propósito: el caso que motivó toda esta pieza es conceder el permiso
    // en los Ajustes del sistema y volver a la app en diez segundos.
    const permiso = await permisoNotificaciones();
    if (permiso !== 'granted') {
      const plan = planearReconciliacionAvisos({
        deseados: [],
        actuales: {},
        pendientes,
        permiso,
        lecturaOk: true,
      });
      return {
        motivo: plan.motivo,
        encendidos: [],
        fallidos: [],
        pendientes: plan.pendientesRestantes.length,
      };
    }

    // null = FALLO de lectura. No es "no tienes objetivos": sin saberlo, no
    // se enciende nada y no se cierra ningún pendiente.
    const filas = await getUserPacks(userId);
    if (filas === null) {
      // Sí marca el respiro: una lectura rota no se arregla en 30 segundos y
      // no tiene caso repetirla en cada cambio de app.
      ultimaCorridaMs = ahora;
      return { motivo: 'lectura_fallida', encendidos: [], fallidos: [], pendientes: pendientes.length };
    }

    const deseados: AvisoDeseado[] = [];
    for (const fila of filas) {
      if (!fila.active) continue;
      // planDeFila reconstruye la MISMA etapa y el MISMO horario que se
      // aplicaron: un objetivo en etapa 1 no estrena los avisos de la 2.
      const plan = planDeFila(fila);
      if (!plan) continue;
      for (const a of plan.avisos) deseados.push({ packKey: fila.pack_key, app: a.app, time: a.time });
    }
    if (deseados.length === 0 && pendientes.length === 0) {
      ultimaCorridaMs = ahora;
      return { ...VACIO, motivo: 'sin_objetivos' };
    }

    const lectura = await leerFilasAviso(userId, [...new Set(deseados.map((d) => d.app))]);

    const plan = planearReconciliacionAvisos({
      deseados,
      actuales: lectura.filas,
      pendientes,
      permiso,
      lecturaOk: lectura.ok,
    });

    const encendidos: AvisoAppKey[] = [];
    const fallidos: { packKey: string; app: AvisoAppKey; time: string; razon: RazonPendiente }[] = [];
    for (const a of plan.encender) {
      const r = await updateAppAviso(userId, a.app, { enabled: true, time: a.time });
      if (r.ok) encendidos.push(a.app);
      else {
        fallidos.push({
          packKey: a.packKey,
          app: a.app,
          time: a.time,
          razon: r.reason === 'permission' ? 'permission' : 'error',
        });
      }
    }

    // El registro queda con lo que sigue roto: los que no se intentaron y
    // los que se intentaron y volvieron a fallar (con su razón fresca).
    const restantes = fusionarPendientes(
      plan.pendientesRestantes.filter((p) => !encendidos.includes(p.app)),
      fallidos,
      new Date().toISOString(),
    );
    if (restantes.length !== pendientes.length || plan.cerrar.length > 0 || encendidos.length > 0) {
      await guardarPendientes(userId, restantes);
    }
    if (fallidos.length > 0) logWarn('[pack-avisos] avisos que siguen sin entrar', fallidos.map((f) => f.app));

    ultimaCorridaMs = ahora;
    return {
      motivo: plan.motivo,
      encendidos,
      fallidos: fallidos.map((f) => f.app),
      pendientes: restantes.length,
    };
  } catch (e) {
    logWarn('[pack-avisos] reconciliación fallida', e);
    return { motivo: 'lectura_fallida', encendidos: [], fallidos: [], pendientes: 0 };
  } finally {
    corriendo = false;
  }
}
