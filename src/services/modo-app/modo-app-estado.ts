/**
 * modo-app-estado (26-sep-2026): el modo de la app en memoria, para que lo
 * lean por igual los componentes (useModoApp) y la logica pura que corre fuera
 * de React (el resolvedor de ARGOS, los tours). Sin react-native ni
 * AsyncStorage: node lo prueba y cualquier core lo puede importar.
 *
 * Lo llena ModoAppBridge (montado en el layout raiz): primero con lo guardado
 * en el telefono, luego con lo que diga la cuenta.
 */
import { APP_ELITE_DX, VENTA_AL_PUBLICO } from '@/src/constants/flags';
import {
  modoEfectivo,
  modoPorDefecto,
  type ModoApp,
  type PreferenciaModo,
} from './modo-app-core';

let porCuenta: ModoApp | null = null;
let ultimoConocido: ModoApp | null = null;
let preferencia: PreferenciaModo = 'auto';
let esAdmin = false;
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

/** La cuenta resolvio su modo (o null al cerrar sesion). */
export function modoResueltoPorCuenta(): ModoApp | null {
  return porCuenta;
}

export function suscribirModo(fn: () => void): () => void {
  oyentes.add(fn);
  return () => { oyentes.delete(fn); };
}

function avisarSiCambio(antes: ModoApp, prefAntes: PreferenciaModo, adminAntes: boolean): void {
  if (modoActual() !== antes || preferencia !== prefAntes || esAdmin !== adminAntes) {
    oyentes.forEach((fn) => fn());
  }
}

function cambiar(f: () => void): void {
  const antes = modoActual();
  const prefAntes = preferencia;
  const adminAntes = esAdmin;
  f();
  avisarSiCambio(antes, prefAntes, adminAntes);
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

/** Solo pruebas: vuelve al estado de arranque. */
export function reiniciarModoParaPruebas(): void {
  porCuenta = null;
  ultimoConocido = null;
  preferencia = 'auto';
  esAdmin = false;
  oyentes.clear();
}
