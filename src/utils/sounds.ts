/**
 * Sounds — Reproducción de sonidos precargados para el timer.
 *
 * Usa expo-av en iOS/Android/web. Genera tonos programáticamente
 * via AudioContext en web, y usa Haptics como fallback en mobile
 * si expo-av falla.
 *
 * Sonidos:
 *   beep: tono corto agudo (200ms) — transiciones entre steps
 *   bell: campana (500ms) — fin de set / cambio de nivel
 *   whistle: doble tono ascendente (400ms) — fin de rutina
 */
import { Platform } from 'react-native';

// === WEB: AudioContext para generar tonos ===

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Reproduce un tono con frecuencia y duración específicas */
function playTone(frequency: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    // Fade out para evitar click
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // AudioContext no disponible
  }
}

// === MOBILE: expo-av con Haptics como fallback ===

async function playMobileFallback(type: 'beep' | 'bell' | 'whistle'): Promise<void> {
  // En mobile, usamos haptics como feedback sonoro/táctil
  // Los sonidos reales con .mp3 se pueden agregar después
  try {
    const Haptics = require('expo-haptics');
    switch (type) {
      case 'beep':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'bell':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'whistle':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  } catch {
    // Haptics no disponible
  }
}

// === API PÚBLICA ===

/** Tono corto agudo (200ms) — transiciones entre steps */
export function playBeep(): void {
  if (Platform.OS === 'web') {
    playTone(880, 200, 'sine', 0.2);
  } else {
    playMobileFallback('beep');
  }
}

/** Campana (500ms) — fin de set / cambio de nivel */
export function playBell(): void {
  if (Platform.OS === 'web') {
    playTone(660, 500, 'triangle', 0.3);
  } else {
    playMobileFallback('bell');
  }
}

/** Doble tono ascendente (400ms) — fin de rutina */
export function playWhistle(): void {
  if (Platform.OS === 'web') {
    playTone(600, 200, 'sine', 0.25);
    setTimeout(() => playTone(900, 200, 'sine', 0.25), 200);
  } else {
    playMobileFallback('whistle');
  }
}

/** Tono de countdown — tick sutil */
export function playCountdownTick(): void {
  if (Platform.OS === 'web') {
    playTone(1000, 100, 'sine', 0.15);
  } else {
    playMobileFallback('beep');
  }
}

/**
 * Reproduce un sonido por nombre.
 * Mapea los nombres del engine (step.soundStart/soundEnd) a funciones.
 */
export function playSound(name: string): void {
  switch (name) {
    case 'beep':
    case 'default':
      playBeep();
      break;
    case 'bell':
      playBell();
      break;
    case 'whistle':
    case 'complete':
      playWhistle();
      break;
    case 'countdown':
      playCountdownTick();
      break;
    default:
      playBeep();
  }
}

/**
 * Precarga el AudioContext en web (requiere gesto del usuario).
 * Llamar al primer tap/interacción para "desbloquear" el audio.
 */
export function initAudio(): void {
  if (Platform.OS === 'web') {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }
}
