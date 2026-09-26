/**
 * modo-app-core (26-sep-2026): una app, dos modos. Logica pura, con prueba.
 *
 * Decision de Enrique (26-sep): no perder la ATP completa. La misma app decide
 * por cuenta que version pinta:
 *  - 'elite_dx': sus clientes Elite (HOY · MI PROGRAMA · ARGOS · PROGRESO · TU).
 *  - 'atp': la app completa de siempre (HOY · ATP · ARGOS · SALUD · TRIBU),
 *    para cuentas generales. Hoy nadie entra sin codigo (VENTA_AL_PUBLICO en
 *    false); el modo queda listo para el dia que se abra la venta.
 *
 * Reglas:
 *  1. Elite vigente o evaluacion Elite cargada = 'elite_dx'. La evaluacion
 *     manda aunque el nivel venza: nunca se le quita a nadie lo que tenia.
 *  2. Mientras el nivel se lee, o si la lectura fallo, NO se cambia de modo:
 *     se queda el ultimo conocido. Un parpadeo entre dos tab bars, o mandar a
 *     un cliente que acaba de pagar a la app general por falta de red, es peor
 *     que esperar.
 *  3. El admin puede fijar el modo a mano desde Ajustes ('auto' = por cuenta).
 *  4. La bandera maestra APP_ELITE_DX en false apaga el modo Elite DX para
 *     todos (freno de emergencia): todo el mundo ve 'atp'.
 */

export type ModoApp = 'elite_dx' | 'atp';
export type PreferenciaModo = 'auto' | 'elite_dx' | 'atp';

export interface LecturaCuentaModo {
  tier: 'free' | 'premium' | 'elite';
  tieneEvaluacionElite: boolean;
  nivelCargando: boolean;
  nivelNoSePudoLeer: boolean;
  evaluacionNoSePudoLeer: boolean;
}

/** El modo que le toca a la cuenta, o null si todavia no se puede saber. */
export function modoPorCuenta(l: LecturaCuentaModo): ModoApp | null {
  if (l.tier === 'elite' || l.tieneEvaluacionElite) return 'elite_dx';
  if (l.nivelCargando) return null;
  // Sin evaluacion confirmada porque la lectura fallo: no se sabe.
  if (l.nivelNoSePudoLeer || l.evaluacionNoSePudoLeer) return null;
  return 'atp';
}

/**
 * Revision en frio (26-sep): una lectura solo cuenta para la cuenta que la
 * pidio. Si la sesion cambio mientras se leia (cerro sesion, entro otra
 * cuenta), la respuesta vieja se tira: aplicarla le pintaria a la cuenta
 * nueva el modo de la anterior, y ademas lo guardaria.
 */
export function modoDeLectura(
  userIdDeLectura: string,
  userIdActual: string | null,
  lectura: LecturaCuentaModo,
): ModoApp | null {
  if (userIdDeLectura !== userIdActual) return null;
  return modoPorCuenta(lectura);
}

export interface EntradaModoEfectivo {
  /** flags.APP_ELITE_DX */
  bandera: boolean;
  preferencia: PreferenciaModo;
  esAdmin: boolean;
  /** Lo que resolvio la cuenta, o el ultimo conocido, o el de por defecto. */
  porCuenta: ModoApp;
}

export function modoEfectivo(e: EntradaModoEfectivo): ModoApp {
  if (!e.bandera) return 'atp';
  if (e.esAdmin && e.preferencia !== 'auto') return e.preferencia;
  return e.porCuenta;
}

/**
 * Sin nada leido todavia (primer arranque, antes del login): con la venta
 * apagada solo entran clientes Elite, asi que se arranca en su modo; con la
 * venta encendida, en la app general.
 */
export function modoPorDefecto(ventaAlPublico: boolean): ModoApp {
  return ventaAlPublico ? 'atp' : 'elite_dx';
}

export function esModoApp(v: unknown): v is ModoApp {
  return v === 'elite_dx' || v === 'atp';
}

export function esPreferenciaModo(v: unknown): v is PreferenciaModo {
  return v === 'auto' || v === 'elite_dx' || v === 'atp';
}

/** Etiquetas para Ajustes. */
export const ETIQUETA_PREFERENCIA: Readonly<Record<PreferenciaModo, string>> = {
  auto: 'Automático (según la cuenta)',
  elite_dx: 'App Elite DX',
  atp: 'ATP completa',
};
