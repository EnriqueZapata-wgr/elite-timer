/**
 * ARGOS Navegador — I/O (NOCHE-ARGOS Pieza 4).
 *
 * Une el resolvedor puro con expo-router. Este archivo es SOLO la costura de
 * I/O: lo único que hace de más que el core es saber mover la app.
 *
 * FIX-NOCHE: la decisión y el copy se mudaron a argos-nav-exec-core. El import
 * de `router` que vive aquí arrastra el JSX de expo-router a cualquier prueba
 * que toque este módulo (vitest no transforma node_modules), y por eso la suite
 * del navegador no coleccionaba. El core es puro y ahí apuntan los tests; aquí
 * queda el default `irA`, que es lo que las pantallas necesitan para llamar
 * `navegarPorTexto(consulta)` sin cargar con el navegador.
 */
import { router } from 'expo-router';
import {
  ejecutarResultado as ejecutarResultadoCore,
  navegarPorTexto as navegarPorTextoCore,
  navegarPorPropuestaDelModelo as navegarPorPropuestaDelModeloCore,
  type Navegar,
  type RespuestaNav,
} from './argos-nav-exec-core';
import type { ResultadoNav } from './argos-nav-resolver-core';

export type { RespuestaNav, Navegar };

/** Navega de verdad. Aislado para poder testear el core sin expo-router. */
function irA(ruta: string): void {
  router.push(ruta as never);
}

// Los tres caminos del core, con el router de verdad como default. Quien ya
// tiene su propio navegador (los tests, o una pantalla que quiera interceptar)
// lo pasa y este archivo deja de estorbar.

/** Traduce un resultado del resolvedor a lo que ARGOS hace y dice. */
export function ejecutarResultado(resultado: ResultadoNav, navegar: Navegar = irA): RespuestaNav {
  return ejecutarResultadoCore(resultado, navegar);
}

/** Camino 1: intento local. Gratis. Es el que debe atender la mayoría. */
export function navegarPorTexto(consulta: string, navegar: Navegar = irA): RespuestaNav {
  return navegarPorTextoCore(consulta, navegar);
}

/** Camino 2: lo que propone el modelo, validado contra el catálogo. */
export function navegarPorPropuestaDelModelo(
  ruta: string | null | undefined,
  navegar: Navegar = irA,
): RespuestaNav {
  return navegarPorPropuestaDelModeloCore(ruta, navegar);
}
