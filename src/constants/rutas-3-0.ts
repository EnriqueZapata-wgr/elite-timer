/**
 * Rutas y contextos nuevos de ATP 3.0 (5-sep-2026, pivote 3.3 y ruta 1.10).
 *
 * Vive en un archivo propio para que el candado, el paywall y las pantallas
 * que lo abren compartan las mismas cadenas sin importarse entre sí.
 */

import type { Href } from 'expo-router';

/**
 * La página de Elite dentro de la app: qué es, para quién, y cómo escribirle a
 * Enrique. Sin precio ni botón de compra (Apple 3.1.3). La pantalla la crea la
 * ola 3; hasta entonces la ruta existe aquí para que los candados Elite ya
 * apunten al lugar correcto.
 */
export const RUTA_ELITE = '/elite' as const;

/**
 * 6-sep-2026 (ruta 3.4): la pantalla `app/elite.tsx` ya existe y sus puertas
 * (CandadoNivel, CandadoBloque, Genética) llegan por `RUTA_ELITE`, que es un
 * identificador. El censo de rutas solo acredita un string con forma de
 * navegación cerca, así que la ruta se declara también como `Href` tipado:
 * es la puerta que el censo ve, y `tsc` la valida contra las typed routes.
 */
export const RUTA_ELITE_HREF: Href = '/elite';

/**
 * Los momentos en que un usuario Free llega al paywall (pivote 3.3). El quinto
 * momento, tocar una tarjeta con candado, viaja como `candado:<key>` y no cabe
 * en una lista cerrada: ver `contextoCandado`.
 */
export const CONTEXTOS_PAYWALL = ['segundo_estudio', 'cuarto_marcador', 'cuarto_chat', 'dia7'] as const;

export type ContextoPaywallFijo = (typeof CONTEXTOS_PAYWALL)[number];

/** `candado:<key>` donde key es la llave de la app en app-registry. */
export type ContextoCandado = `candado:${string}`;

export type ContextoPaywall = ContextoPaywallFijo | ContextoCandado;

/** Arma el contexto de un candado a partir de la llave de la app. */
export function contextoCandado(appKey: string): ContextoCandado {
  return `candado:${appKey}`;
}

/** ¿Este texto es un contexto de paywall conocido? Para que el paywall no pinte basura del deep link. */
export function esContextoPaywall(valor: unknown): valor is ContextoPaywall {
  if (typeof valor !== 'string') return false;
  if ((CONTEXTOS_PAYWALL as readonly string[]).includes(valor)) return true;
  return valor.startsWith('candado:') && valor.length > 'candado:'.length;
}
