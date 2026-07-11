/**
 * Motor de "Mi Diagnóstico Funcional" (DX+Intervenciones F2) — IO.
 *
 * Standalone. Replica el PATRÓN ANCLA de feature de pago (braverman-premium-service):
 *   cache (frescura) → callAnthropic con idempotencyKey → validar → persistir versión.
 *
 * Doctrina H+ (Enrique 2026-07-08): el COBRO es server-side (argos-proxy lee
 * proton_action_costs por requestType 'dx_generation'). El cliente NO gestiona
 * el débito; sólo maneja el 402 (insufficient) que el proxy devuelve.
 *
 * DX append-only: cada regeneración baja is_current de la vigente y agrega una
 * versión nueva (el índice parcial único exige exactamente 1 vigente → ese orden).
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { generateUUID } from '@/src/utils/uuid';
import { ATP_LLM } from '@/src/constants/llm-config';
import { completedCategories } from '@/src/services/historia-clinica-helpers';
import {
  HC_INTEGRAL_ID,
  HC_BASE_IDS,
  HC_AREA_IDS,
} from '@/src/constants/historia-clinica-questionnaires';
import { computeDxQuality, type DxSourcePresence } from './dx-quality-core';
import {
  deriveSourcePresence,
  parseArgosDxResponse,
  isDxFresh,
  maxTimestamp,
  countCompletedAreas,
  resolveDxGenerationAction,
  type DxRoot,
} from './dx-engine-core';
import { buildDxPrompt, type DxPromptContext } from './dx-prompt';

export const DX_GENERATION_ACTION_KEY = 'dx_generation';

export type GenerateDxResult =
  | { status: 'ok'; version: number; qualityLevel: number; roots: DxRoot[]; summary: string; cached: boolean }
  | { status: 'cache_hit'; version: number; qualityLevel: number }
  | { status: 'insufficient_h_plus' }
  | { status: 'error'; message?: string };

interface HarvestedSources {
  presence: DxSourcePresence;
  promptContext: Omit<DxPromptContext, 'qualityLevel'>;
  maxSourceTs: string | null;
  snapshot: Record<string, unknown>;
}

/** Fila vigente (o null) del DX del usuario. */
async function getCurrentDxRow(userId: string): Promise<{ version: number; created_at: string; quality_level: number } | null> {
  const { data } = await supabase
    .from('functional_dx')
    .select('version, created_at, quality_level')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();
  return (data as any) ?? null;
}

async function getMaxVersion(userId: string): Promise<number> {
  const { data } = await supabase
    .from('functional_dx')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.version ?? 0;
}

/**
 * Cosecha todas las fuentes (cada query en su try/catch, fail-soft). Deriva la
 * presencia de fuentes, el contexto para el prompt, el timestamp más reciente y
 * un snapshot para la Card A.
 */
async function harvestSources(userId: string): Promise<HarvestedSources> {
  const ctx: Omit<DxPromptContext, 'qualityLevel'> = {};
  const timestamps: (string | null | undefined)[] = [];
  const snapshot: Record<string, unknown> = {};

  // 1. Historia clínica (levantamientos)
  let completedKeys: string[] = [];
  try {
    const { data } = await supabase
      .from('historia_clinica')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    const hcData = ((data as any)?.data ?? {}) as Record<string, any>;
    ctx.historiaClinica = hcData;
    completedKeys = [...completedCategories(hcData)];
    timestamps.push((data as any)?.updated_at);
    snapshot.levantamientos = { completed: completedKeys, updated_at: (data as any)?.updated_at ?? null };
  } catch {
    ctx.historiaClinica = null;
  }

  // 2. Síntomas clínicos (por sistema)
  try {
    const { data } = await supabase
      .from('clinical_symptoms')
      .select('name, system_key, severity, status, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active');
    const rows = (data as any[]) ?? [];
    ctx.clinicalSymptoms = rows.map((r) => ({ name: r.name, system_key: r.system_key, severity: r.severity, status: r.status }));
    for (const r of rows) timestamps.push(r.updated_at);
    snapshot.sintomas = { count: rows.length };
  } catch { /* fail-soft */ }

  // 3. Síntomas aislados (quick-tap)
  try {
    const { data } = await supabase
      .from('clinical_symptoms_aislados')
      .select('tag, severity, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(50);
    const rows = (data as any[]) ?? [];
    ctx.symptomsAislados = rows.map((r) => ({ tag: r.tag, severity: r.severity }));
    for (const r of rows) timestamps.push(r.logged_at);
    snapshot.sintomas_aislados = { count: rows.length };
  } catch { /* fail-soft */ }

  // 4. Padecimientos (+ conteo de episodios)
  try {
    const { data } = await supabase
      .from('padecimientos')
      .select('id, name, category, is_chronic, updated_at')
      .eq('user_id', userId);
    const rows = (data as any[]) ?? [];
    let episodesByPed: Record<string, number> = {};
    try {
      const { data: eps } = await supabase
        .from('padecimiento_episodios')
        .select('padecimiento_id, created_at')
        .eq('user_id', userId);
      for (const e of ((eps as any[]) ?? [])) {
        episodesByPed[e.padecimiento_id] = (episodesByPed[e.padecimiento_id] ?? 0) + 1;
        timestamps.push(e.created_at);
      }
    } catch { /* fail-soft */ }
    ctx.padecimientos = rows.map((r) => ({
      name: r.name,
      category: r.category,
      is_chronic: r.is_chronic,
      episodeCount: episodesByPed[r.id] ?? 0,
    }));
    for (const r of rows) timestamps.push(r.updated_at);
    snapshot.padecimientos = { count: rows.length };
  } catch { /* fail-soft */ }

  // 5. Laboratorios
  let labsCount = 0;
  try {
    const { data } = await supabase
      .from('lab_values')
      .select('parameter_key, value, measured_at, is_voided')
      .eq('user_id', userId)
      .neq('is_voided', true)
      .order('measured_at', { ascending: false })
      .limit(80);
    const rows = (data as any[]) ?? [];
    labsCount = rows.length;
    ctx.labs = rows.map((r) => ({ parameter_key: r.parameter_key, value: r.value, measured_at: r.measured_at }));
    for (const r of rows) timestamps.push(r.measured_at);
    snapshot.labs = { count: rows.length };
  } catch { /* fail-soft */ }

  // 6. Braverman (último completo)
  try {
    const { data } = await supabase
      .from('braverman_results')
      .select('dominant_type, primary_deficiency, completed_at')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      ctx.braverman = { dominant_type: (data as any).dominant_type, primary_deficiency: (data as any).primary_deficiency };
      timestamps.push((data as any).completed_at);
      snapshot.braverman = { present: true };
    }
  } catch { /* fail-soft */ }

  // 7. Quizzes funcionales
  try {
    const { data } = await supabase
      .from('functional_quiz_results')
      .select('quiz_id, domain_scores, created_at')
      .eq('user_id', userId)
      .eq('is_complete', true);
    const rows = (data as any[]) ?? [];
    ctx.quizzes = rows.map((r) => ({ quiz_id: r.quiz_id, domain_scores: r.domain_scores }));
    for (const r of rows) timestamps.push(r.created_at);
    snapshot.quizzes = { count: rows.length };
  } catch { /* fail-soft */ }

  // 8. Suplementos activos
  try {
    const { data } = await supabase
      .from('user_supplements')
      .select('name, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);
    const rows = (data as any[]) ?? [];
    ctx.supplements = rows.map((r) => ({ name: r.name }));
    for (const r of rows) timestamps.push(r.created_at);
    snapshot.suplementos = { count: rows.length };
  } catch { /* fail-soft */ }

  // ── Derivar presencia de fuentes → nivel de calidad ──
  const baseDone = HC_BASE_IDS.some((id) => completedKeys.includes(id));
  const areaQuestionnairesCount = countCompletedAreas(completedKeys, HC_AREA_IDS);
  const presence = deriveSourcePresence({
    hasBasicHistory: baseDone || completedKeys.length > 0,
    hasIntegralQuestionnaire: completedKeys.includes(HC_INTEGRAL_ID),
    areaQuestionnairesCount,
    // Proxy de "hábitos consistentes": levantamiento de hábitos nutricionales hecho.
    hasConsistentHabits: completedKeys.includes('habitos_nutricionales'),
    labsCount,
    geneticsCount: 0, // sin fuente de genéticos en F2 (nivel 5 llega después)
  });

  return { presence, promptContext: ctx, maxSourceTs: maxTimestamp(timestamps), snapshot };
}

/**
 * Genera (o reutiliza) el DX vigente del usuario.
 *  · manual=true fuerza regeneración (ignora el cache de frescura).
 *  · cache_hit: no hay cosecha nueva desde la versión vigente → gratis, sin LLM.
 */
export async function generateDX(
  userId: string,
  opts?: { manual?: boolean },
): Promise<GenerateDxResult> {
  const manual = !!opts?.manual;

  const [current, harvest, priorMaxVersion] = await Promise.all([
    getCurrentDxRow(userId),
    harvestSources(userId),
    // DX F4 (regalo 1er DX): ¿ya generó alguna vez? (append-only → cualquier versión cuenta)
    getMaxVersion(userId),
  ]);

  const quality = computeDxQuality(harvest.presence);

  // Cache por frescura: si no hay cosecha nueva y no es regeneración forzada.
  if (!manual && current && isDxFresh(current.created_at, harvest.maxSourceTs)) {
    return { status: 'cache_hit', version: current.version, qualityLevel: current.quality_level };
  }

  const prompt = buildDxPrompt({ qualityLevel: quality.level, ...harvest.promptContext });
  const idempotencyKey = generateUUID();

  let rawText: string;
  try {
    // DX F4 — regalo del 1er DX: si el user NUNCA ha generado un functional_dx,
    // el requestType es 'dx_generation_first' (seed 0 H+ en migración 186) → el
    // cobro server-side del argos-proxy no descuenta protones en la primera.
    const meta = await getArgosCallMetadata({
      callerUserId: userId,
      requestType: resolveDxGenerationAction(priorMaxVersion > 0, DX_GENERATION_ACTION_KEY),
      idempotencyKey,
    });
    const data = await callAnthropic(
      [{ role: 'user', content: prompt.user }],
      2000,
      ATP_LLM.PRIMARY_MODEL,
      prompt.system,
      meta,
    );
    rawText = data?.content?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') return { status: 'error', message: 'empty_response' };
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    // El proxy cobra server-side; 402 = balance insuficiente (doctrina H+).
    if (msg.includes('402')) return { status: 'insufficient_h_plus' };
    return { status: 'error', message: msg };
  }

  const parsed = parseArgosDxResponse(rawText);

  // ── Persistir versión nueva (append-only, respetando el índice parcial único) ──
  try {
    const nextVersion = (await getMaxVersion(userId)) + 1;

    // 1) baja la vigente (si existe) ANTES de insertar la nueva vigente.
    await supabase
      .from('functional_dx')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);

    // 2) inserta la nueva vigente.
    const { error: insErr } = await supabase.from('functional_dx').insert({
      id: generateUUID(),
      user_id: userId,
      version: nextVersion,
      quality_level: quality.level,
      roots_detected: parsed.roots,
      summary_text: parsed.summary_text,
      sources_snapshot: harvest.snapshot,
      generated_by: manual ? 'manual' : 'argos_auto',
      model: ATP_LLM.PRIMARY_MODEL,
      is_current: true,
    });
    if (insErr) return { status: 'error', message: insErr.message };

    DeviceEventEmitter.emit('dx_changed');
    return {
      status: 'ok',
      version: nextVersion,
      qualityLevel: quality.level,
      roots: parsed.roots,
      summary: parsed.summary_text,
      cached: false,
    };
  } catch (err: any) {
    return { status: 'error', message: String(err?.message ?? err) };
  }
}
