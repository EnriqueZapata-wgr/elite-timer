// Coach Engine — Árbol de Habilidades (Goal Tree)
// Brief §4 — descomposición de objetivo en sub-habilidades hasta criterio de parada.
// System prompt Bloque 4 (diferido).
// TODO (sub-session COACH 4/N): implementar decomposeGoal/traverseTree/
// aggregateUpward sobre goal_blueprints + goal_tree_nodes.

import type { Principle } from './types';

export interface GoalTreeNode {
  id: string;
  parentId: string | null;
  level: number;
  name: string;
  measurableAttribute?: string;
  applicablePrinciple?: Principle;
  stopCriterionMet: boolean;
  children: GoalTreeNode[];
}

export async function decomposeGoal(_userId: string, _blueprintId: string, _goalName: string): Promise<GoalTreeNode> {
  // TODO: descomponer objetivo en sub-habilidades hasta criterio de parada.
  throw new Error('TODO: implement decomposeGoal');
}

export function traverseTree(_root: GoalTreeNode, _visit: (node: GoalTreeNode) => void): void {
  // TODO: recorrer el árbol (DFS/BFS) aplicando visit a cada nodo.
  throw new Error('TODO: implement traverseTree');
}

export function aggregateUpward(_node: GoalTreeNode): number {
  // TODO: agregar progreso de hijos hacia la raíz.
  throw new Error('TODO: implement aggregateUpward');
}
