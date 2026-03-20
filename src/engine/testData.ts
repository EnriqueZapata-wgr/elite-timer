/**
 * Datos de prueba — rutinas hardcodeadas para desarrollo y testing.
 */
import type { Routine } from './types';

/** Tabata Classic: 8 rondas × (20s trabajo + 10s descanso) = 4 min */
export const TABATA_ROUTINE: Routine = {
  id: 'test-tabata',
  name: 'Tabata Classic',
  description: '8 rounds of 20s work / 10s rest',
  category: 'HIIT',
  blocks: [
    {
      id: 'tabata-group',
      parent_block_id: null,
      sort_order: 0,
      type: 'group',
      label: 'Tabata',
      duration_seconds: null,
      rounds: 8,
      rest_between_seconds: 0,
      color: null,
      sound_start: 'default',
      sound_end: 'default',
      notes: '',
      children: [
        {
          id: 'tabata-work',
          parent_block_id: 'tabata-group',
          sort_order: 0,
          type: 'work',
          label: 'Work',
          duration_seconds: 20,
          rounds: 1,
          rest_between_seconds: 0,
          color: '#a8e02a',
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
        },
        {
          id: 'tabata-rest',
          parent_block_id: 'tabata-group',
          sort_order: 1,
          type: 'rest',
          label: 'Rest',
          duration_seconds: 10,
          rounds: 1,
          rest_between_seconds: 0,
          color: '#4a90d9',
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
        },
      ],
    },
  ],
};

/**
 * Protocolo Guinness World Record (pull-ups):
 *
 * Serie Principal (4 rounds, 3min descanso entre series)
 *   └── Bloque (15 rounds, 16s descanso entre bloques)
 *         ├── 11 reps (15s trabajo)
 *         ├── Descanso (15s)
 *         └── 10 reps (14s trabajo)
 *
 * Matemáticas:
 *   Por bloque: 15 + 15 + 14 = 44s
 *   15 bloques + 14 descansos de 16s = 15×44 + 14×16 = 660 + 224 = 884s
 *   4 series + 3 descansos de 180s = 4×884 + 3×180 = 3536 + 540 = 4076s
 *   Steps: 4 × (15×3 + 14) + 3 = 4×59 + 3 = 239
 */
export const GUINNESS_ROUTINE: Routine = {
  id: 'test-guinness',
  name: 'Protocolo Guinness',
  description: 'Protocolo de entrenamiento para récord Guinness de pull-ups',
  category: 'Endurance',
  blocks: [
    {
      id: 'main-group',
      parent_block_id: null,
      sort_order: 0,
      type: 'group',
      label: 'Serie Principal',
      duration_seconds: null,
      rounds: 4,
      rest_between_seconds: 180,
      color: null,
      sound_start: 'default',
      sound_end: 'default',
      notes: 'Descanso de 3 minutos entre series',
      children: [
        {
          id: 'mid-group',
          parent_block_id: 'main-group',
          sort_order: 0,
          type: 'group',
          label: 'Bloque',
          duration_seconds: null,
          rounds: 15,
          rest_between_seconds: 16,
          color: null,
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
          children: [
            {
              id: 'work-11',
              parent_block_id: 'mid-group',
              sort_order: 0,
              type: 'work',
              label: '11 reps',
              duration_seconds: 15,
              rounds: 1,
              rest_between_seconds: 0,
              color: '#a8e02a',
              sound_start: 'default',
              sound_end: 'default',
              notes: '11 repeticiones',
            },
            {
              id: 'rest-mid',
              parent_block_id: 'mid-group',
              sort_order: 1,
              type: 'rest',
              label: 'Descanso',
              duration_seconds: 15,
              rounds: 1,
              rest_between_seconds: 0,
              color: '#4a90d9',
              sound_start: 'default',
              sound_end: 'default',
              notes: '',
            },
            {
              id: 'work-10',
              parent_block_id: 'mid-group',
              sort_order: 2,
              type: 'work',
              label: '10 reps',
              duration_seconds: 14,
              rounds: 1,
              rest_between_seconds: 0,
              color: '#a8e02a',
              sound_start: 'default',
              sound_end: 'default',
              notes: '10 repeticiones',
            },
          ],
        },
      ],
    },
  ],
};
