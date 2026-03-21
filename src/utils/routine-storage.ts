/**
 * Utilidades de rutinas — Funciones auxiliares para manipulación de bloques.
 *
 * Las funciones CRUD ahora viven en src/services/routine-service.ts.
 * Este archivo mantiene solo: generateId, deepCopyBlock, deepCopyChild.
 */
import type { Block } from '@/src/engine/types';
import { generateUUID } from '@/src/services/routine-service';

/** Genera un ID único — delega a generateUUID para compatibilidad con Supabase */
export function generateId(): string {
  return generateUUID();
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
