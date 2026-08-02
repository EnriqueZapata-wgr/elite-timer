/**
 * Hooks de nav presence (V1.5.1 #8) — puente React sobre nav-presence-core.
 * El registro va atado al FOCO (no al mount): expo-router mantiene montadas
 * las pantallas del back-stack, así que un contador por mount nunca bajaría.
 *
 * ═══ Cómo registra una pantalla nueva (19.1) ═══
 * Si tu pantalla trae con qué regresar, la casita flotante global debe
 * retirarse. El registro es automático si usas cualquiera de los headers
 * estándar (ScreenHeader / PillarHeader / StickyPillarBanner / GlobalTopBar)
 * o el <BackButton> compartido: todos llaman useRegisterOwnNav() por ti.
 * Si dibujas la flecha a mano (Ionicons arrow-back / chevron-back sueltos),
 * llama useRegisterOwnNav() al inicio del componente — y mejor no la dibujes
 * a mano: nav-presence-census.test.ts falla si hay flecha sin registro.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { hasOwnNav, registerOwnNav, subscribeOwnNav } from './nav-presence-core';

/** Llamado por los headers estándar: la pantalla enfocada trae casita propia. */
export function useRegisterOwnNav(): void {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    return registerOwnNav();
  }, [focused]);
}

/** true si la pantalla enfocada registró navegación propia. */
export function useHasOwnNav(): boolean {
  return useSyncExternalStore(subscribeOwnNav, hasOwnNav);
}
