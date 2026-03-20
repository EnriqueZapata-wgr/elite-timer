/**
 * Sounds — Reproduce archivos .mp3 profesionales desde assets/sounds/.
 *
 * Estilos: digital (beep), boxing (bell), whistle, military, silent.
 * Lógica:
 *   - Iniciar step: 1 reproducción del sonido del estilo
 *   - Terminar step: mismo archivo 2x con 150ms delay
 *   - Completar rutina: complete.mp3 (sin importar estilo)
 *   - Silencioso: no reproduce nada
 */
import { Audio } from 'expo-av';

// === ASSETS (1 archivo por estilo + complete) ===

const ASSETS = {
  beep: require('@/assets/sounds/beep.mp3'),
  bell: require('@/assets/sounds/bell.mp3'),
  whistle: require('@/assets/sounds/whistle.mp3'),
  military: require('@/assets/sounds/millitary.mp3'),
  complete: require('@/assets/sounds/complete.mp3'),
};

// === MAPEO DE ESTILOS ===

const STYLE_MAP: Record<string, keyof typeof ASSETS> = {
  digital:  'beep',
  boxing:   'bell',
  whistle:  'whistle',
  military: 'military',
};

// === CACHE DE SONIDOS PRECARGADOS ===

const cache: Map<string, Audio.Sound> = new Map();
let isInitialized = false;
let currentStyle = 'digital';

/** Precarga un asset en Audio.Sound listo para reproducción instantánea */
async function preload(key: string, asset: number): Promise<void> {
  try {
    const existing = cache.get(key);
    if (existing) { try { await existing.unloadAsync(); } catch {} }
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
    cache.set(key, sound);
  } catch (e) {
    console.warn(`[sounds] preload "${key}" falló:`, e);
  }
}

/** Reproduce un sonido del cache */
async function play(key: string, volume: number): Promise<void> {
  const sound = cache.get(key);
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    await sound.playAsync();
  } catch (e) {
    console.warn(`[sounds] play "${key}" falló:`, e);
  }
}

// === API PÚBLICA ===

/** Configura el estilo de sonido activo */
export function setSoundStyle(style: string): void {
  currentStyle = style;
}

/** Inicializar: configura audio mode y precarga TODOS los sonidos */
export async function initAudio(): Promise<void> {
  if (isInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch {}

  // Precargar todos los assets
  await Promise.all([
    preload('beep', ASSETS.beep),
    preload('bell', ASSETS.bell),
    preload('whistle', ASSETS.whistle),
    preload('military', ASSETS.military),
    preload('complete', ASSETS.complete),
  ]);
  isInitialized = true;
}

/** Reproduce sonido de INICIO de step (1 vez) */
export function playStepStart(volume: number = 0.7): void {
  if (currentStyle === 'silent') return;
  const key = STYLE_MAP[currentStyle] ?? STYLE_MAP.digital;
  play(key, volume);
}

/** Reproduce sonido de FIN de step (2x con 150ms delay) */
export function playStepEnd(volume: number = 0.7): void {
  if (currentStyle === 'silent') return;
  const key = STYLE_MAP[currentStyle] ?? STYLE_MAP.digital;
  play(key, volume);
  setTimeout(() => play(key, volume), 150);
}

/** Reproduce sonido de COMPLETAR rutina (siempre complete.mp3) */
export function playRoutineComplete(volume: number = 0.7): void {
  play('complete', volume);
}

/** Reproduce tick de countdown */
export function playCountdownTick(volume: number = 0.5): void {
  if (currentStyle === 'silent') return;
  // Usa beep suave para el countdown
  play('beep', volume * 0.6);
}

/**
 * Reproduce sonido por nombre del engine.
 * Mapea: soundStart → inicio, soundEnd → fin, complete → rutina completa.
 */
export function playSound(name: string, volume: number = 0.7): void {
  switch (name) {
    case 'countdown':
      playCountdownTick(volume);
      break;
    case 'complete':
      playRoutineComplete(volume);
      break;
    case 'end':
      playStepEnd(volume);
      break;
    default:
      playStepStart(volume);
  }
}

// Mantener export para compatibilidad con settings "Probar sonido"
export function playBeep(volume: number = 0.7): void {
  playStepStart(volume);
}

/** Limpiar cache al desmontar */
export async function cleanupAudio(): Promise<void> {
  for (const [, sound] of cache) {
    try { await sound.unloadAsync(); } catch {}
  }
  cache.clear();
  isInitialized = false;
}
