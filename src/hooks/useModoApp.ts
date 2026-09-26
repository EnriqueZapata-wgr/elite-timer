/**
 * useModoApp (26-sep-2026): el modo de la app para un componente. Se
 * re-pinta solo cuando el modo cambia (la cuenta se resolvio, el admin cambio
 * la preferencia). Ver src/services/modo-app/modo-app-core.ts.
 */
import { useSyncExternalStore } from 'react';
import { esEliteDx, modoActual, preferenciaActual, suscribirModo } from '@/src/services/modo-app/modo-app-estado';
import type { ModoApp, PreferenciaModo } from '@/src/services/modo-app/modo-app-core';

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
