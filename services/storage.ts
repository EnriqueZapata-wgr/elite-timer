/**
 * Servicio de almacenamiento — Wrapper tipado sobre AsyncStorage.
 * Centraliza todas las operaciones de persistencia local.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Program, Session, HealthCard } from '@/types/models';

const KEYS = {
  programs: '@elite/programs',
  sessions: '@elite/sessions',
  healthCard: '@elite/health-card',
} as const;

// Helpers genéricos para leer/escribir JSON
async function getItem<T>(key: string): Promise<T | null> {
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : null;
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const Storage = {
  // --- Programas ---
  getPrograms: (): Promise<Program[]> =>
    getItem<Program[]>(KEYS.programs).then(p => p ?? []),
  savePrograms: (programs: Program[]): Promise<void> =>
    setItem(KEYS.programs, programs),

  // --- Sesiones ---
  getSessions: (): Promise<Session[]> =>
    getItem<Session[]>(KEYS.sessions).then(s => s ?? []),
  saveSessions: (sessions: Session[]): Promise<void> =>
    setItem(KEYS.sessions, sessions),

  // --- Health Card ---
  getHealthCard: (): Promise<HealthCard | null> =>
    getItem<HealthCard>(KEYS.healthCard),
  saveHealthCard: (card: HealthCard): Promise<void> =>
    setItem(KEYS.healthCard, card),
};
