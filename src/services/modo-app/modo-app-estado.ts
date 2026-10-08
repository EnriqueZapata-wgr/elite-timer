/**
 * modo-app-estado (26-sep-2026): el modo de la app en memoria, para que lo
 * lean por igual los componentes (useModoApp) y la logica pura que corre fuera
 * de React (el resolvedor de ARGOS, los tours). Sin react-native ni
 * AsyncStorage: node lo prueba y cualquier core lo puede importar.
 *
 * Lo llena ModoAppBridge (montado en el layout raiz): primero con lo guardado
 * en el telefono, luego con lo que diga la cuenta.
 */
import { APP_ELITE_DX, NAV_V4, NAV_V4_PARA_TODOS, VENTA_AL_PUBLICO } from '@/src/constants/flags';
import {
  modoEfectivo,
  modoPorDefecto,
  presentacionEfectiva,
  type ModoApp,
  type PreferenciaModo,
  type PreferenciaPresentacion,
  type Presentacion,
} from './modo-app-core';

let porCuenta: ModoApp | null = null;
let ultimoConocido: ModoApp | null = null;
let preferencia: PreferenciaModo = 'auto';
let esAdmin = false;
// 8-oct-2026 (v4): la presentacion que escogio el admin en Ajustes.
let preferenciaPresentacion: PreferenciaPresentacion = 'auto';
const oyentes = new Set<() => void>();

export function modoActual(): ModoApp {
  return modoEfectivo({
    bandera: APP_ELITE_DX,
    preferencia,
    esAdmin,
    porCuenta: porCuenta ?? ultimoConocido ?? modoPorDefecto(VENTA_AL_PUBLICO),
  });
}

export function esEliteDx(): boolean {
  return modoActual() === 'elite_dx';
}

export function preferenciaActual(): PreferenciaModo {
  return preferencia;
}

/**
 * 8-oct-2026 (v4): la presentacion que se pinta ('clasica' o 'v4'). Solo hay
 * v4 en modo Elite DX; ver presentacionEfectiva() en modo-app-core.
 */
export function presentacionActual(): Presentacion {
  return presentacionEfectiva({
    bandera: NAV_V4,
    paraTodos: NAV_V4_PARA_TODOS,
    preferencia: preferenciaPresentacion,
    esAdmin,
    modo: modoActual(),
  });
}

export function esV4(): boolean {
  return presentacionActual() === 'v4';
}

export function preferenciaPresentacionActual(): PreferenciaPresentacion {
  return preferenciaPresentacion;
}

/** La cuenta resolvio su modo (o null al cerrar sesion). */
export function modoResueltoPorCuenta(): ModoApp | null {
  return porCuenta;
}

export function suscribirModo(fn: () => void): () => void {
  oyentes.add(fn);
  return () => { oyentes.delete(fn); };
}

interface Foto {
  modo: ModoApp;
  pref: PreferenciaModo;
  admin: boolean;
  // 8-oct-2026 (v4): la presentacion y su preferencia tambien avisan.
  presentacion: Presentacion;
  prefPresentacion: PreferenciaPresentacion;
}

function foto(): Foto {
  return {
    modo: modoActual(),
    pref: preferencia,
    admin: esAdmin,
    presentacion: presentacionActual(),
    prefPresentacion: preferenciaPresentacion,
  };
}

function avisarSiCambio(a: Foto): void {
  const d = foto();
  if (
    d.modo !== a.modo || d.pref !== a.pref || d.admin !== a.admin
    || d.presentacion !== a.presentacion || d.prefPresentacion !== a.prefPresentacion
  ) {
    oyentes.forEach((fn) => fn());
  }
}

function cambiar(f: () => void): void {
  const antes = foto();
  f();
  avisarSiCambio(antes);
}

export function fijarModoPorCuenta(m: ModoApp | null): void {
  cambiar(() => { porCuenta = m; });
}

export function fijarUltimoConocido(m: ModoApp | null): void {
  cambiar(() => { ultimoConocido = m; });
}

/**
 * Lo guardado en el telefono llega tarde (AsyncStorage). Si para entonces la
 * cuenta ya resolvio un modo mas nuevo, lo guardado no lo pisa (revision en
 * frio, 26-sep).
 */
export function fijarUltimoConocidoSiVacio(m: ModoApp | null): void {
  if (ultimoConocido !== null) return;
  cambiar(() => { ultimoConocido = m; });
}

export function fijarPreferencia(p: PreferenciaModo): void {
  cambiar(() => { preferencia = p; });
}

export function fijarEsAdmin(v: boolean): void {
  cambiar(() => { esAdmin = v; });
}

/** 8-oct-2026 (v4): la presentacion que escoge el admin en Ajustes. */
export function fijarPreferenciaPresentacion(p: PreferenciaPresentacion): void {
  cambiar(() => { preferenciaPresentacion = p; });
}

/**
 * 8-oct-2026 (v4): lo guardado en el telefono entra de un golpe (ultimo modo,
 * preferencia del modo y presentacion), con UN solo aviso. Asi el admin con
 * la v4 escogida no ve en frio la barra clasica y luego la v4. El ultimo
 * modo solo entra si esta vacio (ver fijarUltimoConocidoSiVacio).
 */
export function hidratarGuardado(g: {
  ultimo: ModoApp | null;
  preferencia: PreferenciaModo;
  presentacion: PreferenciaPresentacion;
}): void {
  cambiar(() => {
    if (ultimoConocido === null) ultimoConocido = g.ultimo;
    preferencia = g.preferencia;
    preferenciaPresentacion = g.presentacion;
  });
}

/** Solo pruebas: vuelve al estado de arranque. */
export function reiniciarModoParaPruebas(): void {
  porCuenta = null;
  ultimoConocido = null;
  preferencia = 'auto';
  esAdmin = false;
  preferenciaPresentacion = 'auto';
  oyentes.clear();
}
