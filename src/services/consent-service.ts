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
 *
 * MB-21 P7: query directa (no getConsent) para DISTINGUIR "no hay fila"
 * (default del schema: ON) de "la query falló". Un fallo LANZA — supabase-js
 * no lanza en 4xx (MB-6), así que {error} es la señal — y el caller decide;
 * el gate de ARGOS decide CERRADO (sin verificación no viajan datos de
 * salud). Antes getConsent devolvía defaults ante error y un usuario que
 * revocó quedaba fail-open. Un fallo no se cachea.
 */
export async function hasArgosMemoryConsent(userId: string): Promise<boolean> {
  const now = Date.now();
  if (argosConsentCache && argosConsentCache.userId === userId && now - argosConsentCache.at < ARGOS_CONSENT_TTL_MS) {
    return argosConsentCache.value;
  }
  const { data, error } = await supabase
    .from('user_consent')
    .select('argos_persistent_memory')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`[consent] query failed: ${error.message}`);
  const value = data ? !!data.argos_persistent_memory : CONSENT_DEFAULTS.argos_persistent_memory;
  argosConsentCache = { userId, value, at: now };
  return value;
}
