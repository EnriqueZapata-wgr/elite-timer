/**
 * Haptics — Vibración háptica por nivel de intensidad.
 *
 * Usa expo-haptics en iOS/Android. En web falla silenciosamente.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Vibración suave — transiciones normales entre steps (work → rest) */
export function vibrateLight(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* no disponible */ }
}

/** Vibración media — cambio de round dentro de un grupo */
export function vibrateMedium(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch { /* no disponible */ }
}

/** Vibración fuerte — cambio de set (nivel superior) o fin de rutina */
export function vibrateHeavy(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch { /* no disponible */ }
}

/** Vibración sutil — countdown 3-2-1 */
export function vibrateCountdown(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  } catch { /* no disponible */ }
}

// === API de objeto — más limpia para imports ===

const safe = (fn: () => void) => { try { fn(); } catch { /* */ } };
const isNative = Platform.OS !== 'web';

export const haptic = {
  light: () => { if (isNative) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); },
  medium: () => { if (isNative) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); },
  heavy: () => { if (isNative) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)); },
  success: () => { if (isNative) safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); },
  warning: () => { if (isNative) safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)); },
  error: () => { if (isNative) safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)); },
  selection: () => { if (isNative) safe(() => Haptics.selectionAsync()); },
};
