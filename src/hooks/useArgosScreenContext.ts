/**
 * useArgosScreenContext — expone la pantalla actual como contexto para ARGOS.
 * Sprint MAGIA ARGOS T4.
 *
 * La lógica de mapeo es pura (argos-screen-context-core.ts); aquí solo se lee
 * el pathname reactivo de expo-router.
 */
import { useMemo } from 'react';
import { usePathname } from 'expo-router';
import {
  screenContextFromPath,
  type ArgosScreenContext,
} from './argos-screen-context-core';

export function useArgosScreenContext(): ArgosScreenContext {
  const pathname = usePathname();
  return useMemo(() => screenContextFromPath(pathname), [pathname]);
}
