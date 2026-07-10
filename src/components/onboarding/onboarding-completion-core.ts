/**
 * Celebración de fin de onboarding — lógica pura (Sprint ONBOARDING épico T5).
 *
 * Meet ARGOS encola la celebración al terminar (queueOnboardingCelebration) y
 * el overlay global la consume cuando el usuario aterriza en HOY. Flag en
 * memoria de módulo: vive solo lo que dura la sesión JS — si la app se
 * reinicia entre medias, simplemente no hay celebración (fail-quiet).
 *
 * Editorial ATP: partículas suaves lima (NO confetti cumpleañero), overlay
 * breve y fade out ~2s. Specs deterministas (sin Math.random) → testeables.
 */

// ─── Copy ───
export const CELEBRATION_TITLE = 'Bienvenido, {nombre}.';
export const CELEBRATION_TITLE_NO_NAME = 'Bienvenido.';
export const CELEBRATION_SUBTITLE = 'Aquí empieza.';

export function celebrationTitle(name: string): string {
  const clean = name.trim();
  return clean ? CELEBRATION_TITLE.replace('{nombre}', clean) : CELEBRATION_TITLE_NO_NAME;
}

// ─── Timing ───
export const CELEBRATION_FADE_IN_MS = 350;
export const CELEBRATION_HOLD_MS = 1300;
export const CELEBRATION_FADE_OUT_MS = 650;

/** Duración total del overlay (~2s de momento emocional, spec del brief). */
export function celebrationTotalMs(): number {
  return CELEBRATION_FADE_IN_MS + CELEBRATION_HOLD_MS + CELEBRATION_FADE_OUT_MS;
}

// ─── Cola (memoria de módulo) ───
let pendingName: string | null = null;

/** Meet ARGOS la llama al terminar; el overlay la consumirá en HOY. */
export function queueOnboardingCelebration(name: string): void {
  pendingName = name;
}

/** Devuelve el nombre pendiente y limpia la cola (one-shot). */
export function consumeOnboardingCelebration(): string | null {
  const n = pendingName;
  pendingName = null;
  return n;
}

/** Solo para inspección/tests. */
export function peekOnboardingCelebration(): string | null {
  return pendingName;
}

// ─── Partículas ───
export interface CelebrationParticle {
  /** Posición horizontal 0..1 (fracción del ancho). */
  x: number;
  /** Diámetro px. */
  size: number;
  /** Delay de arranque ms. */
  delayMs: number;
  /** Duración del ascenso ms. */
  riseMs: number;
  /** Deriva horizontal px (positiva o negativa). */
  drift: number;
  /** Opacidad pico 0..1 (suaves — nunca a tope). */
  peakOpacity: number;
}

export const CELEBRATION_PARTICLE_COUNT = 14;

const GOLDEN = 0.618033988749895;

/** Fracción determinista i-ésima de la secuencia áurea (pseudo-uniforme). */
function fract(n: number): number {
  const v = n * GOLDEN;
  return v - Math.floor(v);
}

/**
 * Specs deterministas de las partículas: distribución pseudo-uniforme en x,
 * tamaños 4-9px, delays escalonados dentro del fade-in+hold, ascensos que
 * terminan antes del fade out. Sin Math.random → misma escena siempre,
 * y testeable en node.
 */
export function celebrationParticles(count: number = CELEBRATION_PARTICLE_COUNT): CelebrationParticle[] {
  const specs: CelebrationParticle[] = [];
  for (let i = 0; i < count; i++) {
    specs.push({
      x: fract(i + 1),
      size: 4 + Math.round(fract(i + 7) * 5),
      delayMs: Math.round(fract(i + 3) * (CELEBRATION_FADE_IN_MS + CELEBRATION_HOLD_MS * 0.4)),
      riseMs: 900 + Math.round(fract(i + 11) * 600),
      drift: Math.round((fract(i + 5) - 0.5) * 60),
      peakOpacity: 0.35 + fract(i + 9) * 0.35,
    });
  }
  return specs;
}
