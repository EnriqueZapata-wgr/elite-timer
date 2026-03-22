/**
 * Routine Service — CRUD de rutinas contra Supabase.
 *
 * Reemplaza las funciones CRUD de routine-storage.ts.
 * Convierte entre el formato tree del engine y los rows flat de la DB.
 *
 * Estrategia de save: delete all blocks + re-insert (más simple que diff).
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Block, Routine } from '@/src/engine/types';

// === AUTH HELPER ===

/**
 * Obtiene el usuario autenticado. Si la sesión expiró, intenta
 * refreshSession() una vez antes de fallar.
 */
async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // Sesión posiblemente expirada — intentar refresh
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.user) {
    throw new Error('Sesión expirada. Cierra sesión e inicia de nuevo.');
  }
  return refreshData.user;
}

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
  exercise_id: string | null;
  suggested_rest_seconds: number | null;
}

/** Convierte un row de DB a un Block del engine (sin children, para buildTree).
 *  exercise_name se resuelve por JOIN, no existe como columna en blocks. */
function dbRowToBlock(row: DbBlockRow & { exercises?: { name: string } | null }): Block & { _routine_id: string } {
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
    exercise_id: row.exercise_id,
    exercise_name: row.exercises?.name ?? null,
    suggested_rest_seconds: (row as any).suggested_rest_seconds ?? null,
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
    const block = blockMap.get(b.id);
    if (!block) continue;
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
        exercise_id: block.exercise_id ?? null,
        suggested_rest_seconds: block.suggested_rest_seconds ?? null,
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
  // getRoutines no fuerza refresh — si no hay sesión, retorna vacío silenciosamente
  if (!user) return [];

  // Fetch rutinas
  const { data: routineRows, error: routineError } = await supabase
    .from('routines')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  if (routineError) throw new Error(routineError.message);
  if (!routineRows || routineRows.length === 0) return [];

  // Fetch todos los blocks de esas rutinas (JOIN con exercises para exercise_name)
  const routineIds = routineRows.map(r => r.id);
  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('*, exercises(name)')
    .in('routine_id', routineIds);

  if (blockError) throw new Error(blockError.message);

  // Agrupar blocks por routine_id
  const blocksByRoutine = new Map<string, Block[]>();
  for (const row of (blockRows ?? [])) {
    const block = dbRowToBlock(row as any);
    const { _routine_id, ...cleanBlock } = block;
    const existing = blocksByRoutine.get(_routine_id) ?? [];
    if (!blocksByRoutine.has(_routine_id)) {
      blocksByRoutine.set(_routine_id, existing);
    }
    existing.push(cleanBlock);
  }

  // Ensamblar Routine[]
  return routineRows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    category: r.category ?? 'workout',
    mode: (r.mode ?? 'timer') as Routine['mode'],
    blocks: buildTree(blocksByRoutine.get(r.id) ?? []),
  }));
}

/** Obtiene una rutina por ID (solo del usuario autenticado) */
export async function getRoutine(id: string): Promise<Routine | null> {
  // getRoutine no fuerza refresh — si no hay sesión, retorna null
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: routineRow, error: routineError } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .eq('creator_id', user.id)
    .single();

  if (routineError || !routineRow) return null;

  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('*, exercises(name)')
    .eq('routine_id', id);

  if (blockError) throw new Error(blockError.message);

  const flatBlocks = (blockRows ?? []).map(row => {
    const { _routine_id, ...block } = dbRowToBlock(row as any);
    return block;
  });

  return {
    id: routineRow.id,
    name: routineRow.name,
    description: routineRow.description ?? '',
    category: routineRow.category ?? 'workout',
    mode: (routineRow.mode ?? 'timer') as Routine['mode'],
    blocks: buildTree(flatBlocks),
  };
}

/** Guarda o actualiza una rutina (upsert routine + delete/re-insert blocks).
 *  Si el insert de blocks falla después del upsert, hace rollback de la rutina. */
export async function saveRoutine(routine: Routine): Promise<void> {
  // Auth con refresh automático
  const user = await getAuthenticatedUser();

  // Validar que la rutina tenga contenido
  const rows = flattenTreeToDbRows(routine.blocks, routine.id);
  if (rows.length === 0) {
    throw new Error('La rutina no tiene bloques. Agrega al menos un bloque antes de guardar.');
  }

  // Verificar si la rutina ya existía (para saber si rollback = delete o restaurar)
  const { data: existingBlocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('routine_id', routine.id);

  // Paso 1: Upsert la rutina
  const { error: routineError } = await supabase
    .from('routines')
    .upsert({
      id: routine.id,
      creator_id: user.id,
      name: routine.name,
      description: routine.description,
      category: routine.category,
      mode: routine.mode ?? 'timer',
      is_public: false,
      is_template: false,
    });

  if (routineError) throw new Error(routineError.message);

  // Paso 2: Delete blocks existentes
  const { error: deleteError } = await supabase
    .from('blocks')
    .delete()
    .eq('routine_id', routine.id);

  if (deleteError) throw new Error(deleteError.message);

  // Paso 3: Insert blocks nuevos — si falla, restaurar los blocks previos
  const { error: insertError } = await supabase
    .from('blocks')
    .insert(rows);

  if (insertError) {
    // Rollback: restaurar blocks anteriores si existían
    if (existingBlocks && existingBlocks.length > 0) {
      try { await supabase.from('blocks').insert(existingBlocks); } catch {}
    }
    throw new Error(`Error al guardar bloques: ${insertError.message}`);
  }
}

/** Elimina una rutina del usuario autenticado (CASCADE elimina blocks) */
export async function deleteRoutine(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id)
    .eq('creator_id', user.id);

  if (error) throw new Error(error.message);
}
