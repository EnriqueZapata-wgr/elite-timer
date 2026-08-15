/**
 * ARGOS Floating Button — lógica pura de visibilidad (T2 Sprint MAGIA ARGOS).
 *
 * El botón flotante aparece en TODAS las pantallas menos donde estorba. Reglas
 * de auto-hide separadas del componente para testear sin render.
 */
import { screenFromPath, type ArgosScreen } from '@/src/hooks/argos-screen-context-core';

/**
 * ¿La ruta es una pantalla del pilar Mente con banner fijo propio? (Overhaul
 * Mente A3/A4). Ahí los flotantes (ARGOS + home) mueren: el banner superior
 * ya da back + home + electrones, y el player es full-focus (cero ARGOS).
 * Journal y check-in conservan los flotantes (sin banner en este run).
 */
export function isMentePillarPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.startsWith('/mente') || p === '/meditation' || p === '/breathing';
}

/**
 * LA lista de qué es un tab. Fuente ÚNICA: la consumen el flotante de ARGOS y
 * el de la casita (home-floating-core), que antes tenían cada uno la suya y se
 * desincronizaron en cuanto MB-19 cambió el tab bar.
 *
 * Van TODAS las rutas del grupo `(tabs)`, no solo las cinco visibles. Las
 * cuatro retiradas (`yo`, `biblioteca`, `progreso`, `perfil`) siguen siendo
 * rutas válidas y se renderizan CON tab bar: si no estuvieran aquí, sobre ellas
 * aparecerían la orbe y el flotante a la vez, que son los dos ARGOS que este
 * run venía a evitar.
 *
 * Por qué importa que estén completas: sobre un tab, el flotante de la casita
 * se pinta arriba a la izquierda y tapa el header propio de la pantalla. Ya
 * pasó una vez: en la sala ATP, "TU ECOSISTEMA" se leía "OSISTEMA".
 */
export const RUTAS_DE_TAB: ReadonlySet<string> = new Set([
  // Las cinco salas
  '/',            // HOY
  '/index',       // alias defensivo de la anterior
  '/(tabs)',      // por si el pathname llega con el grupo
  '/kit',         // ATP
  '/argos',       // ORBE
  '/salud',
  '/tribu',
  // Retiradas del tab bar pero vivas como ruta (href: null)
  // OJO: `/yo` vivió aquí hasta NOCHE-ARGOS. Ya no existe como ruta (no hay
  // app/yo.tsx ni app/(tabs)/yo.tsx; lo que queda es el componente
  // YoEditorialSection). Una entrada de más en este Set no rompe nada visible,
  // y por eso sobrevivió: solo hace que una ruta inexistente se considere tab.
  // Se quita porque este Set es la fuente ÚNICA de "qué es un tab" y una fuente
  // única con datos muertos deja de ser confiable para el que la lee después.
  '/biblioteca',
  '/progreso',
  '/perfil',
]);

export function isTabRootPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase().replace(/\/$/, '') || '/';
  return RUTAS_DE_TAB.has(p);
}

/**
 * ¿La ruta es la ficha de emergencia PÚBLICA? (FIX-215 · bloqueante 2).
 *
 * `/ficha-emergencia` es la única superficie de ATP escrita para que la lea un
 * extraño: se abre sin sesión y sin red, con fondo blanco fijo, y el dato
 * número uno es el nombre. Los dos flotantes globales están diseñados para el
 * tema oscuro y se pintan arriba a la izquierda, justo encima de ese nombre
 * (en la captura del device se leía "…nrique"). Además no lleva navegación de
 * la app: quien la abre no es el dueño del teléfono. Su única salida es el
 * botón "Cerrar" que la propia pantalla pinta abajo.
 *
 * OJO: `/salud/ficha-emergencia` es otra cosa — es el editor, vive detrás de la
 * sesión y sí conserva la navegación normal. Por eso la comparación es exacta.
 */
export function isPublicEmergencyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase().replace(/\/$/, '');
  return p === '/ficha-emergencia';
}

/** ¿La ruta es parte del onboarding? (ahí el floating no debe aparecer). */
export function isOnboardingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.includes('onboarding') || p.includes('/login') || p.includes('/register') ||
    p.includes('reset-password') || p.includes('forgot-password') || p.includes('/meet');
}

export interface FloatingVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
  /** Ocultado manualmente por una pantalla vía contexto. */
  manualHidden: boolean;
  /** Falso hasta que el usuario conoce a ARGOS (Meet ARGOS, T6). */
  introduced: boolean;
}

/**
 * Decide si el floating button debe ocultarse. Orden de cortes:
 *  1. No presentado aún (antes de Meet ARGOS) → oculto.
 *  2. Ocultado manualmente por la pantalla → oculto.
 *  3. Onboarding/auth → oculto.
 *  3b. Ficha de emergencia pública → oculto (FIX-215): no es una pantalla de
 *      la app, es un papel que lee un tercero.
 *  4. Pilar Mente (banner fijo propio + player full-focus) → oculto (A3/A4).
 *  5. Una de las cinco salas del tab bar → oculto: la orbe ya está ahí (MB-19).
 *  6. En el chat ARGOS mismo → oculto (redundante).
 *  7. Teclado abierto → oculto (no tapar inputs).
 */
export function shouldHideFloatingButton(input: FloatingVisibilityInput): boolean {
  if (!input.introduced) return true;
  if (input.manualHidden) return true;
  if (isOnboardingPath(input.pathname)) return true;
  if (isPublicEmergencyPath(input.pathname)) return true;
  if (isMentePillarPath(input.pathname)) return true;
  if (isTabRootPath(input.pathname)) return true;
  const screen: ArgosScreen = screenFromPath(input.pathname);
  if (screen === 'argos') return true;
  if (input.keyboardVisible) return true;
  return false;
}
