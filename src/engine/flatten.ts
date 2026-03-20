/**
 * Compilador de rutinas — convierte árbol recursivo en secuencia lineal.
 *
 * buildTree(): lista plana de DB → árbol con children[]
 * flattenRoutine(): árbol → ExecutionStep[] lineal
 *
 * Regla crítica: el último round de cada nivel NO genera rest_between.
 * Para rounds=4 y rest_between=180s → 3 descansos, no 4.
 *
 * Regla anti-acumulación: después de procesar los children de cada round
 * de un grupo, si el último step es un rest explícito (no auto-generado),
 * se elimina. El rest_between del padre (o el fin de rutina) lo reemplaza.
 */
import type { Block, Routine, ExecutionStep, StepContext } from './types';

// === BUILD TREE ===

/**
 * Convierte una lista plana de bloques (como viene de la DB)
 * en un árbol con children[] anidados, ordenados por sort_order.
 */
export function buildTree(flatBlocks: Block[]): Block[] {
  const map = new Map<string, Block>();
  const roots: Block[] = [];

  // Indexar todos los bloques con children vacío
  for (const block of flatBlocks) {
    map.set(block.id, { ...block, children: [] });
  }

  // Construir relaciones padre-hijo
  for (const block of flatBlocks) {
    const node = map.get(block.id)!;
    if (block.parent_block_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(block.parent_block_id);
      if (parent) {
        parent.children!.push(node);
      }
    }
  }

  // Ordenar children recursivamente por sort_order
  sortChildren(roots);
  return roots;
}

function sortChildren(blocks: Block[]): void {
  blocks.sort((a, b) => a.sort_order - b.sort_order);
  for (const block of blocks) {
    if (block.children && block.children.length > 0) {
      sortChildren(block.children);
    }
  }
}

// === FLATTEN ROUTINE ===

/**
 * Compila el árbol recursivo de una rutina en una secuencia lineal
 * de ExecutionStep[], lista para ser consumida por RoutineEngine.
 *
 * Cada step tiene su StepContext con breadcrumb y stack de rondas
 * para que el TTS pueda anunciar posición: "Set 2 de 4, Round 8 de 15".
 */
export function flattenRoutine(routine: Routine): ExecutionStep[] {
  const steps: ExecutionStep[] = [];

  function processBlock(block: Block, parentContext: StepContext): void {
    if (block.type === 'group') {
      processGroup(block, parentContext);
    } else {
      processLeaf(block, parentContext);
    }
  }

  /**
   * Procesa un bloque grupo: itera (rounds × children)
   * e inserta rest_between entre rondas (excepto la última).
   *
   * Regla anti-acumulación: después de procesar todos los children,
   * si el último step es un rest explícito (no rest_between), se elimina.
   * Esto evita descansos dobles (rest del child + rest_between del padre).
   */
  function processGroup(block: Block, parentContext: StepContext): void {
    const children = block.children ?? [];

    for (let round = 1; round <= block.rounds; round++) {
      // Contexto para esta ronda del grupo
      const roundContext: StepContext = {
        breadcrumb: [...parentContext.breadcrumb, block.label],
        rounds: [
          ...parentContext.rounds,
          { current: round, total: block.rounds, label: block.label },
        ],
        depth: parentContext.depth + 1,
      };

      // Procesar cada hijo dentro de esta ronda
      for (const child of children) {
        processBlock(child, roundContext);
      }

      // Eliminar trailing rest explícito de los children.
      // El rest_between del padre (o fin de rutina) lo reemplaza.
      if (steps.length > 0) {
        const last = steps[steps.length - 1];
        if (last.type === 'rest' && !last.isRestBetween) {
          steps.pop();
        }
      }

      // Insertar rest_between EXCEPTO después del último round
      if (round < block.rounds && block.rest_between_seconds > 0) {
        steps.push({
          stepIndex: 0, // Se re-indexa al final
          blockId: block.id,
          type: 'rest',
          label: `Descanso entre ${block.label}`,
          durationSeconds: block.rest_between_seconds,
          color: null,
          soundStart: block.sound_start || 'default',
          soundEnd: block.sound_end || 'default',
          notes: '',
          isRestBetween: true,
          context: roundContext,
        });
      }
    }
  }

  /**
   * Procesa un bloque hoja (work/rest/prep).
   * Si tiene rounds > 1, repite con rest_between entre rondas.
   */
  function processLeaf(block: Block, parentContext: StepContext): void {
    for (let round = 1; round <= block.rounds; round++) {
      // Si la hoja tiene múltiples rondas, agregar info de ronda al contexto
      const stepContext: StepContext =
        block.rounds > 1
          ? {
              breadcrumb: [...parentContext.breadcrumb, block.label],
              rounds: [
                ...parentContext.rounds,
                { current: round, total: block.rounds, label: block.label },
              ],
              depth: parentContext.depth + 1,
            }
          : {
              breadcrumb: [...parentContext.breadcrumb, block.label],
              rounds: parentContext.rounds,
              depth: parentContext.depth,
            };

      steps.push({
        stepIndex: 0, // Se re-indexa al final
        blockId: block.id,
        type: block.type as 'work' | 'rest' | 'prep',
        label: block.label,
        durationSeconds: block.duration_seconds ?? 0,
        color: block.color,
        soundStart: block.sound_start || 'default',
        soundEnd: block.sound_end || 'default',
        notes: block.notes,
        isRestBetween: false,
        context: stepContext,
      });

      // Rest between para hojas con múltiples rondas (excepto última)
      if (round < block.rounds && block.rest_between_seconds > 0) {
        steps.push({
          stepIndex: 0, // Se re-indexa al final
          blockId: block.id,
          type: 'rest',
          label: 'Descanso',
          durationSeconds: block.rest_between_seconds,
          color: null,
          soundStart: 'default',
          soundEnd: 'default',
          notes: '',
          isRestBetween: true,
          context: stepContext,
        });
      }
    }
  }

  // Procesar todos los bloques raíz
  const rootContext: StepContext = { breadcrumb: [], rounds: [], depth: 0 };
  for (const block of routine.blocks) {
    processBlock(block, rootContext);
  }

  // Re-indexar todos los steps secuencialmente
  for (let i = 0; i < steps.length; i++) {
    steps[i].stepIndex = i;
  }

  return steps;
}
