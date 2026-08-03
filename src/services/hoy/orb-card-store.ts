/**
 * Estado local de la card de la orbe en TAREAS (MB-20 Pieza 1.6).
 * Se COLAPSA, no se descarta: recuerda su estado durante el día y al día
 * siguiente vuelve a abrir. Preferencia de presentación por dispositivo →
 * AsyncStorage (patrón salud-denso-store).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hoy_orb_card_v1';

interface OrbCardState {
  date: string;
  collapsed: boolean;
}

export async function loadOrbCardCollapsed(today: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as OrbCardState;
    // Día nuevo → vuelve a abrir.
    return parsed.date === today ? !!parsed.collapsed : false;
  } catch {
    return false;
  }
}

export function saveOrbCardCollapsed(today: string, collapsed: boolean): void {
  AsyncStorage.setItem(KEY, JSON.stringify({ date: today, collapsed })).catch(() => {});
}
