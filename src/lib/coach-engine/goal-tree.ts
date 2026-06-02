// Coach Engine — Árbol de Habilidades (Goal Tree)
// Brief §4 — descomposición de objetivo en sub-habilidades hasta criterio de parada.
// System prompt Bloque 4 (diferido). ÚNICO módulo del engine que llama al LLM.

import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from '@/src/services/anthropic-client';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import type { Principle, TrafficLight } from './types';

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

/** Estructura cruda que esperamos del LLM (JSON recursivo). */
interface RawNode {
  name: string;
  principle?: string;
  measurableAttribute?: string;
  children?: RawNode[];
}

const DEFAULT_MAX_DEPTH = 4;
const RECALIBRATION_WINDOW_DAYS = 7;

/** Prompt de sistema para la descomposición (instruye salida JSON pura). */
const DECOMPOSE_SYSTEM = `Eres el descompositor de objetivos de ATP. Descompón el objetivo del usuario en un árbol de sub-habilidades.
Devuelve SOLO JSON válido (sin markdown, sin texto extra) con esta estructura recursiva:
{ "name": string, "principle": string, "measurableAttribute": string, "children": [ ...mismo formato ] }
Reglas:
- Para de descomponer cuando una sub-habilidad sea atómica (acción única medible diaria) → children: [].
- Máximo 4 niveles de profundidad.
- Cada nodo asocia 1 principio del catálogo: fisiologia, biomecanica, mecanismos_biologicos, identidad, proposito, filosofia, estandar, contexto.`;

/** Extrae el bloque JSON de la respuesta del LLM (tolera fences markdown). */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new Error('goal-tree: decomposeGoal — LLM output sin JSON parseable');
  }
  return candidate.slice(first, last + 1);
}

/** Inserta un nodo y sus hijos recursivamente; devuelve el subárbol en memoria. */
async function insertNode(
  blueprintId: string,
  userId: string,
  parentId: string | null,
  raw: RawNode,
  level: number,
  maxDepth: number,
): Promise<GoalTreeNode> {
  const hasChildren = Array.isArray(raw.children) && raw.children.length > 0 && level < maxDepth;
  const isLeaf = !hasChildren;

  const { data, error } = await supabase
    .from('goal_tree_nodes')
    .insert({
      blueprint_id: blueprintId,
      user_id: userId,
      parent_id: parentId,
      level,
      name: raw.name,
      measurable_attribute: raw.measurableAttribute ?? null,
      applicable_principle: raw.principle ?? null,
      stop_criterion_met: isLeaf,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`goal-tree: decomposeGoal node insert failed — ${error.message}`);
  }

  const id = (data as { id: string }).id;
  const children: GoalTreeNode[] = [];
  if (hasChildren) {
    for (const child of raw.children!) {
      children.push(await insertNode(blueprintId, userId, id, child, level + 1, maxDepth));
    }
  }

  return {
    id,
    parentId,
    level,
    name: raw.name,
    measurableAttribute: raw.measurableAttribute,
    applicablePrinciple: raw.principle as Principle | undefined,
    stopCriterionMet: isLeaf,
    children,
  };
}

/**
 * Descompone un objetivo grande en un árbol de sub-habilidades vía LLM (Bloque 4).
 * Crea el goal_blueprint, llama al edge function (mismo proxy que chatWithArgosEx),
 * parsea el JSON y persiste los goal_tree_nodes. Si el LLM falla o no parsea,
 * lanza error claro — NO inventa un árbol fallback (debe revisarse).
 */
export async function decomposeGoal(params: {
  userId: string;
  goalText: string;
  depth?: number;
}): Promise<{ blueprintId: string; rootNode: GoalTreeNode }> {
  const maxDepth = params.depth ?? DEFAULT_MAX_DEPTH;

  const { data: blueprint, error: bpErr } = await supabase
    .from('goal_blueprints')
    .insert({ user_id: params.userId, goal_name: params.goalText })
    .select('id')
    .single();
  if (bpErr) {
    throw new Error(`goal-tree: decomposeGoal blueprint insert failed — ${bpErr.message}`);
  }
  const blueprintId = (blueprint as { id: string }).id;

  const llm = await callAnthropic(
    [{ role: 'user', content: `Objetivo: "${params.goalText}". Descompón en árbol de sub-habilidades.` }],
    2048,
    undefined,
    DECOMPOSE_SYSTEM,
    { userId: params.userId, requestType: 'goal_decomposition' },
  );

  const rawText = llm?.content?.[0]?.text;
  if (!rawText) {
    throw new Error('goal-tree: decomposeGoal — LLM returned no content');
  }

  let rootRaw: RawNode;
  try {
    rootRaw = JSON.parse(extractJson(rawText));
  } catch (e: any) {
    throw new Error(`goal-tree: decomposeGoal — failed to parse LLM JSON: ${e?.message ?? e}`);
  }

  const rootNode = await insertNode(blueprintId, params.userId, null, rootRaw, 0, maxDepth);
  return { blueprintId, rootNode };
}

/**
 * Reconstruye el árbol jerárquico en memoria desde goal_tree_nodes (Bloque 4).
 * Lee todos los nodos del blueprint ordenados por nivel y los enlaza por parent_id.
 */
export async function traverseTree(blueprintId: string): Promise<GoalTreeNode> {
  const { data, error } = await supabase
    .from('goal_tree_nodes')
    .select('id, parent_id, level, name, measurable_attribute, applicable_principle, stop_criterion_met')
    .eq('blueprint_id', blueprintId)
    .order('level', { ascending: true });

  if (error) {
    throw new Error(`goal-tree: traverseTree failed — ${error.message}`);
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    throw new Error('goal-tree: traverseTree — blueprint sin nodos');
  }

  const byId = new Map<string, GoalTreeNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      parentId: r.parent_id,
      level: r.level,
      name: r.name,
      measurableAttribute: r.measurable_attribute ?? undefined,
      applicablePrinciple: (r.applicable_principle as Principle | null) ?? undefined,
      stopCriterionMet: !!r.stop_criterion_met,
      children: [],
    });
  }

  let root: GoalTreeNode | null = null;
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      root = node;
    }
  }
  if (!root) {
    throw new Error('goal-tree: traverseTree — no se encontró nodo raíz');
  }
  return root;
}

/** Mapea un progreso 0-100 a semáforo (pure). >=80 verde, >=50 amarillo, <50 rojo. */
export function progressToTrafficLight(progress: number): TrafficLight {
  if (progress >= 80) return 'verde';
  if (progress >= 50) return 'amarillo';
  return 'rojo';
}

/**
 * Agrega el progreso de un nodo hacia la raíz (Bloque 4). Para nodos hoja, usa
 * el promedio de mediciones de los últimos 7 días; para nodos internos, agrega
 * recursivamente el progreso de sus hijos. Mapea a semáforo.
 * NOTA: trata measurement.value como porcentaje 0-100 (no hay target por nodo
 * en el schema — ver flag COWORK_REPORT).
 */
export async function aggregateUpward(
  nodeId: string,
): Promise<{ nodeId: string; progress: number; status: TrafficLight }> {
  const { data: children, error: childErr } = await supabase
    .from('goal_tree_nodes')
    .select('id')
    .eq('parent_id', nodeId);
  if (childErr) {
    throw new Error(`goal-tree: aggregateUpward children lookup failed — ${childErr.message}`);
  }

  let progress: number;
  if (children && children.length > 0) {
    const childResults = await Promise.all(children.map((c: any) => aggregateUpward(c.id)));
    progress = childResults.reduce((sum, r) => sum + r.progress, 0) / childResults.length;
  } else {
    const today = parseLocalDate(getLocalToday());
    const cutoff = new Date(today.getTime() - RECALIBRATION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: measurements, error: mErr } = await supabase
      .from('node_measurements')
      .select('value')
      .eq('node_id', nodeId)
      .gte('measured_at', cutoff);
    if (mErr) {
      throw new Error(`goal-tree: aggregateUpward measurements failed — ${mErr.message}`);
    }
    const values = (measurements ?? []).map((m: any) => Number(m.value)).filter((v) => !Number.isNaN(v));
    progress = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  return { nodeId, progress, status: progressToTrafficLight(progress) };
}

// TEST: progressToTrafficLight(85) === 'verde'
// TEST: progressToTrafficLight(60) === 'amarillo'
// TEST: progressToTrafficLight(30) === 'rojo'
// TEST: extractJson('```json\n{"name":"x","children":[]}\n```') parsea a { name: 'x', children: [] }
// INTEGRATION TEST (LLM, fuera de scope unit): decomposeGoal({ userId, goalText: 'correr un maratón en 6 meses' })
//   → blueprint + nodos persistidos; falla limpio si el LLM no devuelve JSON.
// INTEGRATION TEST: traverseTree(blueprintId) reconstruye jerarquía con root level 0
// INTEGRATION TEST: aggregateUpward(rootNodeId) promedia hijos → semáforo
