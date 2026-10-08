/**
 * useModoApp (26-sep-2026): el modo de la app para un componente. Se
 * re-pinta solo cuando el modo cambia (la cuenta se resolvio, el admin cambio
 * la preferencia). Ver src/services/modo-app/modo-app-core.ts.
 */
import { useSyncExternalStore } from 'react';
import {
  esEliteDx,
  esV4,
  modoActual,
  preferenciaActual,
  preferenciaPresentacionActual,
  suscribirModo,
} from '@/src/services/modo-app/modo-app-estado';
import type { ModoApp, PreferenciaModo, PreferenciaPresentacion } from '@/src/services/modo-app/modo-app-core';

export function useModoApp(): ModoApp {
  return useSyncExternalStore(suscribirModo, modoActual, modoActual);
}

/** true = la app de Elite DX; false = ATP completa. */
export function useEsEliteDx(): boolean {
  return useSyncExternalStore(suscribirModo, esEliteDx, esEliteDx);
}

export function usePreferenciaModo(): PreferenciaModo {
  return useSyncExternalStore(suscribirModo, preferenciaActual, preferenciaActual);
}

/**
 * 8-oct-2026 (v4): true = la presentacion v4 (Hoy, Plan, ARGOS, Perfil y
 * Apps). Solo puede ser true en modo Elite DX.
 */
export function useEsV4(): boolean {
  return useSyncExternalStore(suscribirModo, esV4, esV4);
}

export function usePreferenciaPresentacion(): PreferenciaPresentacion {
  return useSyncExternalStore(suscribirModo, preferenciaPresentacionActual, preferenciaPresentacionActual);
}
