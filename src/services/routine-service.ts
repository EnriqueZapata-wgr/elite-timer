/**
 * Routine Service — CRUD de rutinas contra Supabase.
 *
 * Reemplaza las funciones CRUD de routine-storage.ts.
 * Convierte entre el formato tree del engine y los rows flat de la DB.
 *
 * Estrategia de save: delete all blocks + re-insert (más simple que diff).
 */
import { supabase } from '@/src/lib/supabase';
import type { Block, Routine } from '@/src/engine/types';

// === UUID ===

/** Genera UUID v4 compatible con Hermes y la DB */
export function generateUUID(): string {
  // Intentar crypto.randomUUID() primero (disponible en Hermes moderno)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// === HELPERS DE CONVERSIÓN ===

/** Row de la tabla `blocks` en Supabase */
interface DbBlockRow {
  id: string;
  routine_id: string;
  parent_block_id: string | null;
  sort_order: number;
  type: string;
  label: string;
  duration_seconds: number | null;
  rounds: number;
  rest_between_seconds: number;
  color: string | null;
  sound_start: string;
  sound_end: string;
  notes: string;
}

/** Convierte un row de DB a un Block del engine (sin children, para buildTree) */
function dbRowToBlock(row: DbBlockRow): Block & { _routine_id: string } {
  return {
    id: row.id,
    parent_block_id: row.parent_block_id,
    sort_order: row.sort_order,
    type: row.type as Block['type'],
    label: row.label,
    duration_seconds: row.duration_seconds,
    rounds: row.rounds,
    rest_between_seconds: row.rest_between_seconds,
    color: row.color,
    sound_start: row.sound_start,
    sound_end: row.sound_end,
    notes: row.notes,
    _routine_id: row.routine_id,
  };
}

/** Reconstruye el árbol de bloques a partir de una lista flat */
function buildTree(flatBlocks: Block[]): Block[] {
  const blockMap = new Map<string, Block>();
  const roots: Block[] = [];

  // Inicializar children vacíos para groups
  for (const b of flatBlocks) {
    const block = { ...b, children: b.type === 'group' ? [] : undefined };
    blockMap.set(block.id, block);
  }

  // Enlazar children a sus parents
  for (const b of flatBlocks) {
    const block = blockMap.get(b.id)!;
    if (b.parent_block_id) {
      const parent = blockMap.get(b.parent_block_id);
      if (parent && parent.children) {
        parent.children.push(block);
      }
    } else {
      roots.push(block);
    }
  }

  // Ordenar children por sort_order
  const sortChildren = (blocks: Block[]) => {
    blocks.sort((a, b) => a.sort_order - b.sort_order);
    for (const block of blocks) {
      if (block.children) sortChildren(block.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/** Aplana un árbol de bloques a rows flat para insertar en DB */
function flattenTreeToDbRows(blocks: Block[], routineId: string): Omit<DbBlockRow, never>[] {
  const rows: DbBlockRow[] = [];

  const walk = (children: Block[], parentId: string | null) => {
    for (const block of children) {
      rows.push({
        id: block.id,
        routine_id: routineId,
        parent_block_id: parentId,
        sort_order: block.sort_order,
        type: block.type,
        label: block.label,
        duration_seconds: block.duration_seconds,
        rounds: block.rounds,
        rest_between_seconds: block.rest_between_seconds,
        color: block.color,
        sound_start: block.sound_start,
        sound_end: block.sound_end,
        notes: block.notes,
      });
      if (block.children) {
        walk(block.children, block.id);
      }
    }
  };

  walk(blocks, null);
  return rows;
}

// === FUNCIONES CRUD ===

/** Obtiene todas las rutinas del usuario autenticado */
export async function getRoutines(): Promise<Routine[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch rutinas
  const { data: routineRows, error: routineError } = await supabase
    .from('routines')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  if (routineError) throw new Error(routineError.message);
  if (!routineRows || routineRows.length === 0) return [];

  // Fetch todos los blocks de esas rutinas
  const routineIds = routineRows.map(r => r.id);
  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('*')
    .in('routine_id', routineIds);

  if (blockError) throw new Error(blockError.message);

  // Agrupar blocks por routine_id
  const blocksByRoutine = new Map<string, Block[]>();
  for (const row of (blockRows ?? [])) {
    const block = dbRowToBlock(row as DbBlockRow);
    const { _routine_id, ...cleanBlock } = block;
    if (!blocksByRoutine.has(_routine_id)) {
      blocksByRoutine.set(_routine_id, []);
    }
    blocksByRoutine.get(_routine_id)!.push(cleanBlock);
  }

  // Ensamblar Routine[]
  return routineRows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    category: r.category ?? 'workout',
    blocks: buildTree(blocksByRoutine.get(r.id) ?? []),
  }));
}

/** Obtiene una rutina por ID */
export async function getRoutine(id: string): Promise<Routine | null> {
  const { data: routineRow, error: routineError } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .single();

  if (routineError || !routineRow) return null;

  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('*')
    .eq('routine_id', id);

  if (blockError) throw new Error(blockError.message);

  const flatBlocks = (blockRows ?? []).map(row => {
    const { _routine_id, ...block } = dbRowToBlock(row as DbBlockRow);
    return block;
  });

  return {
    id: routineRow.id,
    name: routineRow.name,
    description: routineRow.description ?? '',
    category: routineRow.category ?? 'workout',
    blocks: buildTree(flatBlocks),
  };
}

/** Guarda o actualiza una rutina (upsert routine + delete/re-insert blocks) */
export async function saveRoutine(routine: Routine): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Upsert la rutina
  const { error: routineError } = await supabase
    .from('routines')
    .upsert({
      id: routine.id,
      creator_id: user.id,
      name: routine.name,
      description: routine.description,
      category: routine.category,
      is_public: false,
      is_template: false,
    });

  if (routineError) throw new Error(routineError.message);

  // Delete todos los blocks existentes de esta rutina
  const { error: deleteError } = await supabase
    .from('blocks')
    .delete()
    .eq('routine_id', routine.id);

  if (deleteError) throw new Error(deleteError.message);

  // Insertar todos los blocks del árbol
  const rows = flattenTreeToDbRows(routine.blocks, routine.id);
  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from('blocks')
      .insert(rows);

    if (insertError) throw new Error(insertError.message);
  }
}

/** Elimina una rutina (CASCADE elimina blocks automáticamente) */
export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
