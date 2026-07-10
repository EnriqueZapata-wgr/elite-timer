/**
 * Splash cinemático ATP — timing y copy (Sprint ONBOARDING épico T2).
 *
 * Secuencia sobre fondo negro puro (editorial ATP):
 *   t0                    → logo toma el relevo del splash nativo + breath-in
 *   t0 + LOGO + DELAY     → tagline fade-in
 *   … + TAGLINE_FADE      → hold
 *   … + HOLD              → dissolve hacia la app
 *
 * Total 2-3s (nadie quiere splash largo). Archivo puro: testeable node-only.
 */

/** Fase de logo: breath-in (escala sutil) al tomar el relevo del splash nativo. */
export const SPLASH_LOGO_FADE_MS = 800;
/** Delay del tagline después de la fase de logo (spec: 400ms). */
export const SPLASH_TAGLINE_DELAY_MS = 400;
/** Fade-in del tagline. */
export const SPLASH_TAGLINE_FADE_MS = 550;
/** Todo se mantiene en pantalla antes del dissolve. */
export const SPLASH_HOLD_MS = 500;
/** Dissolve final hacia la home screen. */
export const SPLASH_DISSOLVE_MS = 450;

export const SPLASH_TAGLINE = 'Sistema operativo de rendimiento';

/** Momento (desde t0) en que arranca el fade del tagline. */
export function splashTaglineStartMs(): number {
  return SPLASH_LOGO_FADE_MS + SPLASH_TAGLINE_DELAY_MS;
}

/** Momento (desde t0) en que arranca el dissolve. */
export function splashDissolveStartMs(): number {
  return splashTaglineStartMs() + SPLASH_TAGLINE_FADE_MS + SPLASH_HOLD_MS;
}

/** Duración total del splash cinemático. */
export function splashTotalMs(): number {
  return splashDissolveStartMs() + SPLASH_DISSOLVE_MS;
}
