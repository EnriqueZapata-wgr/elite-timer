/**
 * Consent service (#132 Privacy Fase B) — lectura/escritura de user_consent
 * (migración 100 Cowork + 155). Defaults del schema si la fila no existe:
 * analytics/argos/clinician ON, marketing/research OFF.
 */
import { supabase } from '@/src/lib/supabase';
import { CONSENT_DEFAULTS, type UserConsent } from './consent-core';

// Lógica pura (defaults, meta de toggles) vive en consent-core.ts (testeable)
export {
  CONSENT_DEFAULTS,
  CONSENT_META,
  type UserConsent,
  type ConsentKey,
} from './consent-core';

/** Consent del usuario (defaults del schema si no hay fila). */
export async function getConsent(userId: string): Promise<UserConsent> {
  const { data, error } = await supabase
    .from('user_consent')
    .select('analytics_posthog, argos_persistent_memory, marketing_communications, share_anonymized_research, share_with_clinician')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { ...CONSENT_DEFAULTS };
  return data as UserConsent;
}

/** Actualiza uno o más toggles (upsert — la fila se crea on-demand). */
export async function updateConsent(userId: string, patch: Partial<UserConsent>): Promise<boolean> {
  const current = await getConsent(userId);
  const { error } = await supabase.from('user_consent').upsert({
    user_id: userId,
    ...current,
    ...patch,
  }, { onConflict: 'user_id' });
  if (error) {
    console.warn('[consent] update:', error.message);
    return false;
  }
  invalidateArgosConsentCache(userId);
  return true;
}

// ── Enforcement ARGOS (#132 F3.4) ─────────────────────────────────────────
// Cache corto para no meter una query extra por CADA mensaje del chat.

let argosConsentCache: { userId: string; value: boolean; at: number } | null = null;
const ARGOS_CONSENT_TTL_MS = 60_000;

export function invalidateArgosConsentCache(userId?: string) {
  if (!userId || argosConsentCache?.userId === userId) argosConsentCache = null;
}

/**
 * ¿El usuario permite que ARGOS use contexto histórico rico?
 * Si false: argos-service manda solo el mensaje actual (sin expediente).
 * Fail-open a `true` (default del schema) si la query falla.
 */
export async function hasArgosMemoryConsent(userId: string): Promise<boolean> {
  const now = Date.now();
  if (argosConsentCache && argosConsentCache.userId === userId && now - argosConsentCache.at < ARGOS_CONSENT_TTL_MS) {
    return argosConsentCache.value;
  }
  const consent = await getConsent(userId);
  argosConsentCache = { userId, value: consent.argos_persistent_memory, at: now };
  return consent.argos_persistent_memory;
}
