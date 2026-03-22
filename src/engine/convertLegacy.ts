/**
 * Conversor de formato viejo (types/models.ts) al formato del engine (src/engine/types.ts).
 *
 * Permite que "Mis Programas" y "Programas Estándar" usen el engine nuevo
 * sin cambiar la estructura de datos persistida en AsyncStorage.
 */
import type { Routine as EngineRoutine, Block as EngineBlock } from './types';
import type { Routine as LegacyRoutine } from '@/types/models';

/** Mapeo de tipos de bloque viejo → nuevo */
const TYPE_MAP: Record<string, EngineBlock['type']> = {
  exercise: 'work',
  work: 'work',
  rest: 'rest',
  transition: 'prep',
  prep: 'prep',
  final: 'work',
};

/** Colores por tipo de bloque */
const COLOR_MAP: Record<string, string> = {
  work: '#a8e02a',
  rest: '#5B9BD5',
  prep: '#EF9F27',
};

/**
 * Convierte una Routine del formato viejo (flat blocks + rounds)
 * al formato del engine (árbol con group + children).
 *
 * Estructura resultante:
 *   group "nombre" (rounds=N, rest_between=0)
 *     ├── work/rest/prep (block 1)
 *     ├── work/rest/prep (block 2)
 *     └── ...
 */
export function convertLegacyRoutine(legacy: LegacyRoutine): EngineRoutine {
  const groupId = `grp-${legacy.id}`;

  // Convertir cada bloque viejo a bloque del engine
  const children: EngineBlock[] = legacy.blocks.map((block, index) => {
    const engineType = TYPE_MAP[block.type] ?? 'work';
    return {
      id: block.id,
      parent_block_id: groupId,
      sort_order: index,
      type: engineType,
      label: block.label,
      duration_seconds: block.durationSeconds,
      rounds: 1,
      rest_between_seconds: 0,
      color: COLOR_MAP[engineType] ?? '#a8e02a',
      sound_start: 'default',
      sound_end: 'default',
      notes: '',
    };
  });

  // Envolver en un group con las rondas de la rutina
  const groupBlock: EngineBlock = {
    id: groupId,
    parent_block_id: null,
    sort_order: 0,
    type: 'group',
    label: legacy.name,
    duration_seconds: null,
    rounds: legacy.rounds,
    rest_between_seconds: 0,
    color: null,
    sound_start: 'default',
    sound_end: 'default',
    notes: '',
    children,
  };

  return {
    id: legacy.id,
    name: legacy.name,
    description: '',
    category: '',
    mode: 'timer',
    blocks: [groupBlock],
  };
}
