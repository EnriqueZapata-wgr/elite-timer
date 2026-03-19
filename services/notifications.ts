/**
 * Servicio de notificaciones — Vibración háptica para eventos del timer.
 * Sonidos se agregarán en una fase futura.
 */
import * as Haptics from 'expo-haptics';

export const Notifications = {
  /** Vibración al cambiar de bloque */
  blockChange: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Haptics no disponible (simulador web, etc.)
    }
  },

  /** Vibración fuerte al completar toda la rutina */
  routineComplete: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics no disponible
    }
  },

  /** Tick suave para cuenta regresiva (3, 2, 1) */
  countdown: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics no disponible
    }
  },
};
