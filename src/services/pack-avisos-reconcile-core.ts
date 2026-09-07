/**
 * pack-avisos-reconcile-core (7-sep-2026) — quién enciende un aviso que el
 * objetivo pidió y nunca se pudo encender, y quién NO.
 *
 * El defecto que arregla: aplicarPack ya llamaba a updateAppAviso con
 * {enabled:true}, pero sin permiso de notificaciones el paso quedaba en
 * ok:false y nadie lo reintentaba jamás. La persona concedía el permiso más
 * tarde y sus avisos seguían muertos, en silencio.
 *
 * LA LÍNEA QUE NO SE CRUZA: si la persona apagó un aviso a mano, esto NO lo
 * vuelve a encender. Nunca. Para sostenerlo hay que distinguir dos estados
 * que el resto de la app colapsa en el mismo objeto:
 *
 *   · SIN FILA en user_app_notification_prefs = nunca se encendió. La ficha
 *     solo escribe fila cuando la persona toca el interruptor o su hora, y
 *     la migración 252 no hace backfill: la ausencia de fila no es decisión
 *     de nadie. Se puede encender.
 *   · FILA apagada con `apagadoPorUsuario === true` = lo apagó ella. Es
 *     suyo. No se toca, y el pendiente se cierra para siempre.
 *   · FILA apagada con `apagadoPorUsuario === false` = fila apagada que
 *     NADIE apagó. Es reparable. Este caso es el que hacía inerte a la
 *     migración 320 cuando el corte era un simple `!enabled` (lo cazó la
 *     revisión en frío del 7-sep-2026): con la columna puesta, el bug
 *     original quedaba sellado en vez de arreglado.
 *   · FILA apagada con `apagadoPorUsuario === null` = esta base todavía no
 *     tiene la 320 y no hay con qué distinguir. Ante la duda, silencio: se
 *     respeta como si la hubiera apagado la persona.
 *
 * Puro y sin efectos: quien escribe es pack-avisos-service.
 */
import type { AvisoAppKey } from '@/src/services/app-avisos-service';

/** Por qué un aviso del objetivo no entró. */
export type RazonPendiente = 'permission' | 'error';

/** Un paso de aplicación que quedó a medias y se puede reparar después. */
export interface PendienteAviso {
  packKey: string;
  app: AvisoAppKey;
  /** La hora que el objetivo pidió, ya anclada al horario de la persona. */
  time: string;
  razon: RazonPendiente;
  /** Desde cuándo lleva pendiente (ISO). Se conserva al reintentar. */
  desde: string;
}

/** Lo que un objetivo activo pide hoy. */
export interface AvisoDeseado {
  packKey: string;
  app: AvisoAppKey;
  time: string;
}

/** La fila real de user_app_notification_prefs. Ausente = NO HAY FILA. */
export interface FilaAvisoActual {
  enabled: boolean;
  time: string;
  /** null = la columna aún no existe en esta base (migración 320 pendiente). */
  apagadoPorUsuario: boolean | null;
}

export type PermisoAvisos = 'granted' | 'denied' | 'undetermined';

export interface EntradaReconcilia {
  deseados: AvisoDeseado[];
  actuales: Partial<Record<AvisoAppKey, FilaAvisoActual>>;
  pendientes: PendienteAviso[];
  permiso: PermisoAvisos;
  /**
   * false = las filas NO se pudieron leer. Jamás se confunde con "no hay
   * filas": sin lectura sana no se enciende nada.
   */
  lecturaOk: boolean;
}

export type MotivoCierre = 'ya_encendido' | 'apagado_por_la_persona' | 'objetivo_retirado';

export type MotivoReconcilia =
  | 'sin_permiso'
  | 'lectura_fallida'
  | 'nada_que_hacer'
  | 'hay_trabajo';

export interface PlanReconcilia {
  /** Lo que se va a encender ahora. */
  encender: AvisoDeseado[];
  /** Pendientes que ya no tienen nada que hacer y salen del registro. */
  cerrar: { app: AvisoAppKey; motivo: MotivoCierre }[];
  /** Los que siguen abiertos (los que se van a intentar, más los no tocados). */
  pendientesRestantes: PendienteAviso[];
  motivo: MotivoReconcilia;
}

/**
 * Dos objetivos pueden pedir la misma app a horas distintas. Se queda la
 * más temprana: es determinista (correrlo diez veces da lo mismo) y del
 * lado de que el aviso llegue mientras el día todavía sirve.
 */
export function dedupeDeseados(deseados: AvisoDeseado[]): AvisoDeseado[] {
  const porApp = new Map<AvisoAppKey, AvisoDeseado>();
  for (const d of deseados) {
    const previo = porApp.get(d.app);
    if (!previo || d.time < previo.time) porApp.set(d.app, d);
  }
  return [...porApp.values()].sort((a, b) => a.app.localeCompare(b.app));
}

/**
 * Decide qué se enciende. Idempotente por construcción: la decisión sale
 * del estado real de las filas, así que aplicar el plan y volver a correr
 * da `encender` vacío, diez veces seguidas.
 */
export function planearReconciliacionAvisos(e: EntradaReconcilia): PlanReconcilia {
  // Sin lectura sana no se toca nada, y ningún pendiente se cierra: cerrar
  // uno aquí sería olvidar una reparación por un error de red.
  if (!e.lecturaOk) {
    return { encender: [], cerrar: [], pendientesRestantes: e.pendientes, motivo: 'lectura_fallida' };
  }
  // Sin permiso no hay nada que hacer y los pendientes SE CONSERVAN: ese es
  // justamente el caso que se reintenta cuando el permiso llegue.
  if (e.permiso !== 'granted') {
    return { encender: [], cerrar: [], pendientesRestantes: e.pendientes, motivo: 'sin_permiso' };
  }

  const deseados = dedupeDeseados(e.deseados);
  const encender: AvisoDeseado[] = [];
  const cerrar: { app: AvisoAppKey; motivo: MotivoCierre }[] = [];
  const resueltas = new Map<AvisoAppKey, MotivoCierre>();

  for (const d of deseados) {
    const fila = e.actuales[d.app];
    if (fila === undefined) {
      // Nunca hubo fila: nadie lo apagó, simplemente nunca se pudo encender.
      encender.push(d);
      continue;
    }
    if (fila.apagadoPorUsuario === true) {
      // Lo apagó la persona y consta. Fin: no se enciende hoy ni nunca.
      resueltas.set(d.app, 'apagado_por_la_persona');
      continue;
    }
    if (fila.enabled) {
      // Encendido. Si la hora no es la del objetivo es porque la persona la
      // movió, y su hora manda: tampoco hay nada que escribir.
      resueltas.set(d.app, 'ya_encendido');
      continue;
    }
    if (fila.apagadoPorUsuario === false) {
      // 7-sep-2026 (revisión en frío): fila APAGADA que NADIE apagó. Existe
      // cuando algo escribió la fila sin que la persona tocara el
      // interruptor. Es reparable, y tratarla como decisión de la persona
      // era volver a sellar el bug original con la columna nueva encima.
      encender.push(d);
      continue;
    }
    // apagadoPorUsuario === null: esta base todavía no tiene la columna
    // (migración 320 sin aplicar) y no hay con qué distinguir. Ante la duda,
    // silencio: se respeta como si la hubiera apagado la persona.
    resueltas.set(d.app, 'apagado_por_la_persona');
  }

  const pedidas = new Set(deseados.map((d) => d.app));
  const pendientesRestantes: PendienteAviso[] = [];
  for (const p of e.pendientes) {
    if (!pedidas.has(p.app)) {
      // El objetivo que lo pedía ya no lo pide (cambió de etapa u objetivo).
      cerrar.push({ app: p.app, motivo: 'objetivo_retirado' });
      continue;
    }
    const resuelta = resueltas.get(p.app);
    if (resuelta) {
      cerrar.push({ app: p.app, motivo: resuelta });
      continue;
    }
    pendientesRestantes.push(p);
  }

  return {
    encender,
    cerrar,
    pendientesRestantes,
    motivo: encender.length > 0 ? 'hay_trabajo' : 'nada_que_hacer',
  };
}

// ─── El registro de pendientes: lo puro de pack-avisos-service ──────────────

/**
 * La clave del registro lleva el userId. El cierre de sesión no limpia
 * AsyncStorage, así que con clave fija la cuenta B leía (y borraba) los
 * pendientes de la cuenta A en el mismo teléfono.
 */
export function clavePendientes(userId: string): string {
  return `@atp/pack_avisos_pendientes:${userId}`;
}

/** Storage con basura adentro no debe tumbar nada: se filtra lo que sí es. */
export function filtrarPendientes(valor: unknown): PendienteAviso[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is PendienteAviso => {
    if (v === null || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return (
      typeof o.packKey === 'string' &&
      typeof o.app === 'string' &&
      typeof o.time === 'string' &&
      (o.razon === 'permission' || o.razon === 'error') &&
      typeof o.desde === 'string'
    );
  });
}

/**
 * Mezcla lo que sigue roto. Un aviso ya anotado CONSERVA su `desde`: lo que
 * importa es desde cuándo lleva roto, no cuándo se reintentó por última vez.
 * Un aviso por app: el registro no es una bitácora, es una lista de tareas.
 */
export function fusionarPendientes(
  previos: PendienteAviso[],
  nuevos: { packKey: string; app: AvisoAppKey; time: string; razon: RazonPendiente }[],
  ahoraISO: string,
): PendienteAviso[] {
  const porApp = new Map<AvisoAppKey, PendienteAviso>();
  for (const p of previos) porApp.set(p.app, p);
  for (const n of nuevos) {
    const previo = porApp.get(n.app);
    porApp.set(n.app, { ...n, desde: previo?.desde ?? ahoraISO });
  }
  return [...porApp.values()];
}

export type DecisionCorrida = 'corre' | 'ya_corriendo' | 'muy_pronto';

/**
 * ¿Corre el reconciliador? El respiro evita pegarle a la base cada vez que
 * alguien cambia de app.
 *
 * ⚠️ El respiro se marca SOLO cuando la corrida llegó a decidir algo. Una
 * salida por falta de permiso no lo marca (no toca la base y no cuesta
 * nada), porque el caso que motivó todo esto es justamente: concedo el
 * permiso en Ajustes del sistema y vuelvo a la app en diez segundos.
 */
export function decidirCorrida(e: {
  corriendo: boolean;
  ultimaCorridaMs: number;
  ahoraMs: number;
  respiroMs: number;
  forzar?: boolean;
}): DecisionCorrida {
  if (e.corriendo) return 'ya_corriendo';
  if (e.forzar) return 'corre';
  if (e.ultimaCorridaMs > 0 && e.ahoraMs - e.ultimaCorridaMs < e.respiroMs) return 'muy_pronto';
  return 'corre';
}
