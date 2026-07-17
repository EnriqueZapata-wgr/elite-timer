/**
 * prescription-service — capa Supabase del Motor de Personalización (Fase A.4).
 *
 * Orquesta: leer las 7 fuentes del fenotipo → correr el motor determinístico
 * (personalize-interventions) → persistir el top 5 versionado en
 * user_prescribed_interventions (migración 201), marcando superseded_at de la
 * prescripción anterior. Idempotente por hash de fenotipo: si el fenotipo no
 * cambió, no crea una versión nueva (evita spam de writes).
 *
 * DIVERGENCIAS spec↔realidad (el motor asume tablas que no existen 1:1):
 *  · DX real = functional_dx.roots_detected (raíces+severidad), NO niveles por
 *    sistema. Aquí se DERIVAN DXLevels desde las raíces (deriveDxLevelsFromRoots).
 *  · Braverman real = conteos + primary_deficiency, NO low/med/high por NT.
 *    Se deriva: el primary_deficiency → 'low', el resto → 'medium'.
 *  · Cuestionario Maestro: NO existe tabla aún → quizAnswers = []. Los objetivos
 *    se leen del onboarding/client_profiles si están.
 *  · Embarazo vive en cycle_settings.pregnancy_status (no en profiles).
 * Toda lectura es fail-soft: una fuente que falla no rompe el fenotipo.
 */
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/services/routine-service';
import { warn as logWarn } from '@/src/lib/logger';
import { getCurrentDX } from '@/src/services/dx/dx-service';
import { getLatestCompleteBravermanResult } from '@/src/services/braverman-premium-service';
import { loadCanonicalLabValues } from '@/src/services/edad-atp/lab-values-service';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import { personalizeInterventions } from './personalize-interventions';
import {
  deriveDxLevelsFromRoots, deriveBraverman, deriveLabs, deriveChronotype,
  normalizeCyclePhase, ageFromDOB, computePhenotypeHash,
} from './prescription-core';
import type {
  UserPhenotype, UserCyclePhase, Profile, PrescribedIntervention,
} from './personalize-types';

// ── Fetch del fenotipo (7 fuentes, fail-soft) ───────────────────────────────

/** Arma el fenotipo consolidado. Cada fuente cae a null/[] si falla — nunca lanza. */
export async function fetchUserPhenotype(userId: string): Promise<UserPhenotype> {
  const now = new Date();

  const [dx, braverman, canonical, chronoRow, cycle, clientProfile, profileRow, conditions, meds, pregnancy, activeCount] =
    await Promise.all([
      getCurrentDX(userId).catch(() => null),
      getLatestCompleteBravermanResult(userId).catch(() => null),
      loadCanonicalLabValues(userId).catch(() => ({} as any)),
      readChronotypeRow(userId),
      readCycle(userId),
      getClientProfileSafe(userId),
      readProfileRow(userId),
      readConditions(userId),
      readMedications(userId),
      readPregnancy(userId),
      readActiveInterventionCount(userId),
    ]);

  const dxLevels = deriveDxLevelsFromRoots((dx?.roots_detected as any[]) ?? [], dx?.created_at ? new Date(dx.created_at) : now);
  const labs = deriveLabs(canonical as any);
  const chronotype = deriveChronotype(chronoRow);

  const cyclePhase: UserCyclePhase | null = cycle
    ? {
        currentPhase: normalizeCyclePhase(cycle.currentPhase),
        cycleDay: cycle.currentDay ?? 1,
        cycleLength: cycle.cycleLen ?? 28,
        lastPeriodStart: cycle.lastPeriodStart ? new Date(cycle.lastPeriodStart) : now,
        regularity: 'regular',
      }
    : null;

  const gender: Profile['gender'] =
    (clientProfile?.biological_sex === 'female' ? 'female'
      : clientProfile?.biological_sex === 'male' ? 'male' : 'non_binary');

  const profile: Profile = {
    age: ageFromDOB(clientProfile?.date_of_birth, now),
    gender,
    // Gate por sexo biológico: un dato residual de pregnancy_status NUNCA
    // contraindica por embarazo a un usuario no-female (#4).
    pregnancy: gender === 'female' ? pregnancy : false,
    lactancia: false,
    conditions,
    medications: meds,
    goals: extractGoals(clientProfile),
    feverViralActive: false, // sin fuente diaria confiable aún (ver delivery)
    fitzpatrickType: (profileRow?.skin_type as any) ?? undefined,
    height_cm: clientProfile?.height_cm ?? undefined,
  };
  // El motor lee activeInterventionCount por profile para el contextNote Humby.
  (profile as any).activeInterventionCount = activeCount;

  return {
    userId,
    dxLevels,
    braverman: deriveBraverman(braverman as any),
    labs,
    quizAnswers: [], // Cuestionario Maestro sin persistencia aún
    chronotype,
    cyclePhase,
    profile,
    fetchedAt: now,
  };
}

// ── Persistencia versionada ──────────────────────────────────────────────────

/**
 * Corre el motor y persiste el top 5. Idempotente por hash: si la prescripción
 * vigente ya se generó con el mismo fenotipo, NO crea versión nueva. Devuelve la
 * prescripción resultante (recién creada o la vigente sin cambios).
 */
export async function generatePrescription(userId: string): Promise<PrescribedIntervention[]> {
  const phenotype = await fetchUserPhenotype(userId);
  const hash = computePhenotypeHash(phenotype);

  // Idempotencia: ¿la vigente ya corresponde a este fenotipo?
  try {
    const { data: current } = await supabase
      .from('user_current_prescription')
      .select('phenotype_snapshot_hash')
      .eq('user_id', userId)
      .limit(1);
    if (current && current.length > 0 && (current[0] as any).phenotype_snapshot_hash === hash) {
      return getCurrentPrescription(userId);
    }
  } catch (e) { logWarn('[prescription] idempotency check failed', e); }

  const prescribed = personalizeInterventions(phenotype);

  // Supersede la vigente + inserta la nueva (best-effort transaccional secuencial).
  const nowISO = new Date().toISOString();
  try {
    await supabase
      .from('user_prescribed_interventions')
      .update({ superseded_at: nowISO })
      .eq('user_id', userId)
      .is('superseded_at', null);

    const rows = prescribed.map((p) => ({
      id: generateUUID(), user_id: userId, intervention_key: p.intervention.key,
      rank: p.rank, score: p.score, is_universal_p1: p.isUniversalP1,
      rationale: p.rationale, cycle_phase_note: p.cyclePhaseNote ?? null,
      context_note: p.contextNote ?? null,
      contraindication_checked: p.contraindicationChecked,
      suggested_biomarkers_tier1: p.suggestedBiomarkers.tier1,
      suggested_biomarkers_tier2: p.suggestedBiomarkers.tier2,
      suggested_biomarkers_tier3: p.suggestedBiomarkers.tier3,
      phenotype_snapshot_hash: hash, prescribed_at: nowISO,
    }));
    if (rows.length > 0) await supabase.from('user_prescribed_interventions').insert(rows);
  } catch (e) {
    logWarn('[prescription] persist failed (¿migración 201 aplicada?)', e);
  }

  return prescribed;
}

/** Lee la prescripción vigente desde la vista (hidratada al shape del motor). */
export async function getCurrentPrescription(userId: string): Promise<PrescribedIntervention[]> {
  try {
    const { data } = await supabase
      .from('user_current_prescription')
      .select('*')
      .eq('user_id', userId)
      .order('rank', { ascending: true });
    return ((data ?? []) as any[]).map(hydratePrescriptionRow).filter(Boolean) as PrescribedIntervention[];
  } catch (e) {
    logWarn('[prescription] getCurrentPrescription failed', e);
    return [];
  }
}

function hydratePrescriptionRow(row: any): PrescribedIntervention | null {
  // El intervention completo se resuelve por key desde el catálogo (la fila solo
  // guarda la key — el catálogo es la fuente de verdad del contenido).
  const intervention = INTERVENTION_BY_KEY[row.intervention_key];
  if (!intervention) return null;
  return {
    intervention,
    score: row.score,
    rank: row.rank,
    isUniversalP1: !!row.is_universal_p1,
    rationale: row.rationale,
    cyclePhaseNote: row.cycle_phase_note ?? undefined,
    contextNote: row.context_note ?? undefined,
    contraindicationChecked: row.contraindication_checked ?? [],
    suggestedBiomarkers: {
      tier1: row.suggested_biomarkers_tier1 ?? [],
      tier2: row.suggested_biomarkers_tier2 ?? [],
      tier3: row.suggested_biomarkers_tier3 ?? [],
    },
  };
}

// ── Lecturas auxiliares (todas fail-soft) ───────────────────────────────────

async function readChronotypeRow(userId: string) {
  try {
    const { data } = await supabase
      .from('user_chronotype')
      .select('chronotype, wake_time, sleep_time, peak_focus_start, peak_focus_end, updated_at')
      .eq('user_id', userId).maybeSingle();
    return data as any;
  } catch { return null; }
}

async function readCycle(userId: string) {
  try {
    const { getCycleInfo } = await import('@/src/services/cycle-service');
    const info = await getCycleInfo(userId);
    if (!info) return null;
    return {
      currentPhase: info.currentPhase as string,
      currentDay: info.currentDay as number,
      cycleLen: (info as any).cycleLen as number,
      lastPeriodStart: (info as any).periods?.[0]?.start_date ?? null,
    };
  } catch { return null; }
}

async function getClientProfileSafe(userId: string) {
  try {
    const { getClientProfile } = await import('@/src/services/client-profile-service');
    return (await getClientProfile(userId)) as any;
  } catch { return null; }
}

async function readProfileRow(userId: string) {
  try {
    const { data } = await supabase.from('profiles').select('skin_type').eq('id', userId).maybeSingle();
    return data as any;
  } catch { return null; }
}

async function readConditions(userId: string): Promise<string[]> {
  const out = new Set<string>();
  try {
    const { data } = await supabase.from('padecimientos').select('name, category, is_chronic').eq('user_id', userId);
    for (const p of (data ?? []) as any[]) {
      if (p?.name) out.add(String(p.name).toLowerCase().replace(/\s+/g, '_'));
      if (p?.category) out.add(String(p.category).toLowerCase());
    }
  } catch { /* fail-soft */ }
  try {
    const { data } = await supabase
      .from('condition_flags').select('condition_key, status').eq('user_id', userId)
      .in('status', ['present', 'observation']);
    for (const c of (data ?? []) as any[]) if (c?.condition_key) out.add(String(c.condition_key).toLowerCase());
  } catch { /* fail-soft */ }
  return Array.from(out);
}

async function readMedications(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase.from('medications').select('name, is_active').eq('user_id', userId).eq('is_active', true);
    return ((data ?? []) as any[]).map((m) => String(m.name ?? '').toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
  } catch { return []; }
}

async function readPregnancy(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('cycle_settings').select('pregnancy_status').eq('user_id', userId).maybeSingle();
    return !!(data as any)?.pregnancy_status?.is_pregnant;
  } catch { return false; }
}

async function readActiveInterventionCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('user_interventions')
      .select('intervention_key', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'active').eq('is_universal', false);
    return count ?? 0;
  } catch { return 0; }
}

function extractGoals(clientProfile: any): string[] {
  const raw = clientProfile?.primary_goal ?? clientProfile?.goal ?? clientProfile?.goals;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return [String(raw)];
}
