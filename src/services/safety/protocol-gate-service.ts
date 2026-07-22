/**
 * Sprint Compliance 3 — Servicio I/O del gate de protocolos.
 *
 * Arma el SafetyState del usuario desde:
 *   - user_master_quiz (D9.2 condiciones activas + D9.4b embarazo/lactancia)
 *   - client_profiles.cycle_modality ('pregnancy' → embarazo, segunda señal)
 * y loguea cada atestación palomeada en user_attestation_log (capa 5:
 * evidencia con timestamp + versión + hash del texto; ip server-side).
 */
import { supabase } from '@/src/lib/supabase';
import { sha256Hex } from '@/src/utils/sha256';
import { loadMasterQuiz } from '@/src/services/salud/master-quiz-service';
import { scoreToPhenotype } from '@/src/services/salud/master-quiz-core';
import {
  ATTESTATIONS,
  ATTESTATION_VERSION,
  attestationText,
  type AttestationId,
} from '@/src/constants/attestation-copy';
import type { SafetyState } from './protocol-gate-core';

const CACHE_TTL_MS = 60 * 1000;
let stateCache: { userId: string; state: SafetyState; at: number } | null = null;

/**
 * SafetyState del usuario. Fail-safe: si el cuestionario no existe o falla la
 * red, devuelve estado vacío (sin condiciones) — la atestación (capa 2) sigue
 * cubriendo lo que no sabemos.
 */
export async function getSafetyState(userId: string): Promise<SafetyState> {
  if (stateCache && stateCache.userId === userId && Date.now() - stateCache.at < CACHE_TTL_MS) {
    return stateCache.state;
  }
  const state: SafetyState = { conditions: [], pregnancy: false, lactancia: false };
  try {
    const [quiz, profileRes] = await Promise.all([
      loadMasterQuiz(userId).catch(() => null),
      supabase.from('client_profiles').select('cycle_modality').eq('user_id', userId).maybeSingle(),
    ]);
    if (quiz?.answers) {
      const ph = scoreToPhenotype(quiz.answers);
      state.pregnancy = ph.contraindications.includes('embarazo');
      state.lactancia = ph.contraindications.includes('lactancia');
      state.conditions = ph.contraindications.filter(c => c !== 'embarazo' && c !== 'lactancia');
    }
    // Segunda señal de embarazo: modalidad de ciclo elegida en onboarding.
    if (profileRes.data?.cycle_modality === 'pregnancy') state.pregnancy = true;
  } catch {
    // estado vacío — fail-safe
  }
  stateCache = { userId, state, at: Date.now() };
  return state;
}

/** Invalidar cache (p.ej. tras editar el cuestionario). */
export function clearSafetyStateCache(): void {
  stateCache = null;
}

/**
 * Loguea una atestación palomeada (todas las casillas confirmadas).
 * Best-effort: el fallo de red no bloquea la sesión ya autorizada, pero se
 * reintenta una vez.
 */
export async function logAttestation(
  userId: string,
  attestationId: AttestationId,
  protocolKey?: string,
): Promise<boolean> {
  const spec = ATTESTATIONS[attestationId];
  const row = {
    user_id: userId,
    attestation_id: attestationId,
    protocol_key: protocolKey ?? null,
    texto_version: ATTESTATION_VERSION,
    texto_hash: sha256Hex(attestationText(spec)),
    attested_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('user_attestation_log').insert(row);
  if (!error) return true;
  const retry = await supabase.from('user_attestation_log').insert(row);
  if (retry.error) {
    console.warn('[attestation-log] insert falló:', retry.error.message);
    return false;
  }
  return true;
}
