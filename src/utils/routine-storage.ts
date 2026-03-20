/**
 * Storage de rutinas (formato engine) en AsyncStorage.
 *
 * Usa directamente el tipo Routine de src/engine/types.ts para que
 * la migración a Supabase sea solo cambiar este archivo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Block, Routine } from '@/src/engine/types';

const STORAGE_KEY = '@elite/engine-routines';

/** Genera un ID único basado en timestamp + random */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Obtiene todas las rutinas guardadas */
export async function getRoutines(): Promise<Routine[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

/** Obtiene una rutina por ID */
export async function getRoutine(id: string): Promise<Routine | null> {
  const routines = await getRoutines();
  return routines.find(r => r.id === id) ?? null;
}

/** Guarda o actualiza una rutina (upsert por ID) */
export async function saveRoutine(routine: Routine): Promise<void> {
  const routines = await getRoutines();
  const index = routines.findIndex(r => r.id === routine.id);
  if (index >= 0) {
    routines[index] = routine;
  } else {
    routines.push(routine);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
}

/** Elimina una rutina por ID */
export async function deleteRoutine(id: string): Promise<void> {
  const routines = await getRoutines();
  const filtered = routines.filter(r => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Copia profunda de un bloque con nuevos IDs.
 * Solo el bloque raíz recibe " (copia)" en el label; los children conservan su label.
 */
export function deepCopyBlock(block: Block, newParentId: string | null): Block {
  const newId = generateId();
  return {
    ...block,
    id: newId,
    parent_block_id: newParentId,
    label: block.label + ' (copia)',
    children: block.type === 'group'
      ? (block.children ?? []).map(child => deepCopyChild(child, newId))
      : undefined,
  };
}

/** Copia profunda recursiva de children (sin agregar "(copia)" al label) */
function deepCopyChild(block: Block, newParentId: string): Block {
  const newId = generateId();
  return {
    ...block,
    id: newId,
    parent_block_id: newParentId,
    children: block.type === 'group'
      ? (block.children ?? []).map(child => deepCopyChild(child, newId))
      : undefined,
  };
}
