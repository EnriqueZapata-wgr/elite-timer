/**
 * Sprint Compliance 2 — Servicio del log de auditoría de consentimiento.
 *
 * Escribe en user_consent_log (migración 209): una fila por aceptación o
 * revocación de cada checkbox CB-1..CB-7, con texto_hash (sha256 del texto
 * exacto) + aviso_version. ip/user_agent los estampa el trigger server-side.
 *
 * CB-1 se acepta en register.tsx ANTES de que exista sesión estable: si el
 * insert falla (p. ej. sesión aún no lista), la aceptación queda en cola en
 * AsyncStorage y se reintenta en el muro de consentimiento del onboarding.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { sha256Hex } from '@/src/utils/sha256';
import {
  AVISO_VERSION,
  TERMS_VERSION,
  CONSENT_BY_ID,
  type ConsentCheckboxId,
} from '@/src/constants/consent-copy';

const PENDING_KEY = '@atp/pending_consent_logs';

export type ConsentAction = 'accepted' | 'revoked';

interface ConsentRow {
  user_id: string;
  checkbox_id: ConsentCheckboxId;
  action: ConsentAction;
  aviso_version: string;
  terms_version: string | null;
  texto_hash: string;
  accepted_at: string;
}

function buildRow(userId: string, id: ConsentCheckboxId, action: ConsentAction, acceptedAt?: string): ConsentRow {
  return {
    user_id: userId,
    checkbox_id: id,
    action,
    aviso_version: AVISO_VERSION,
    // CB-1 acepta también los T&C — registra ambas versiones.
    terms_version: id === 'CB-1' ? TERMS_VERSION : null,
    texto_hash: sha256Hex(CONSENT_BY_ID[id].text),
    accepted_at: acceptedAt ?? new Date().toISOString(),
  };
}

/**
 * Loguea aceptaciones (o revocaciones). Devuelve true si TODAS las filas
 * quedaron insertadas. En fallo, encola para reintento posterior.
 */
export async function logConsent(
  userId: string,
  ids: ConsentCheckboxId[],
  action: ConsentAction = 'accepted',
): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = ids.map(id => buildRow(userId, id, action));
  const { error } = await supabase.from('user_consent_log').insert(rows);
  if (error) {
    console.warn('[consent-log] insert falló, encolando:', error.message);
    await enqueuePending(rows);
    return false;
  }
  return true;
}

async function enqueuePending(rows: ConsentRow[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const prev: ConsentRow[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...prev, ...rows]));
  } catch (e) {
    console.warn('[consent-log] no se pudo encolar:', e);
  }
}

/** Reintenta los logs encolados (llamar con sesión ya establecida). */
export async function flushPendingConsentLogs(userId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const rows: ConsentRow[] = JSON.parse(raw);
    if (rows.length === 0) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return;
    }
    // Reasigna al usuario actual (la cola pudo escribirse pre-sesión).
    const fixed = rows.map(r => ({ ...r, user_id: userId }));
    const { error } = await supabase.from('user_consent_log').insert(fixed);
    if (!error) await AsyncStorage.removeItem(PENDING_KEY);
  } catch (e) {
    console.warn('[consent-log] flush falló:', e);
  }
}

export interface ConsentStatus {
  checkbox_id: ConsentCheckboxId;
  action: ConsentAction;
  accepted_at: string;
}

/** Último estado por checkbox (fila más reciente de cada CB). */
export async function getConsentStatus(userId: string): Promise<Partial<Record<ConsentCheckboxId, ConsentStatus>>> {
  const { data, error } = await supabase
    .from('user_consent_log')
    .select('checkbox_id, action, accepted_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return {};
  const out: Partial<Record<ConsentCheckboxId, ConsentStatus>> = {};
  for (const row of data) {
    const id = row.checkbox_id as ConsentCheckboxId;
    if (!out[id]) out[id] = { checkbox_id: id, action: row.action as ConsentAction, accepted_at: row.accepted_at };
  }
  return out;
}

/** ¿El usuario ya tiene aceptados los obligatorios del muro (CB-2/3/4)? */
export async function hasCoreConsents(userId: string): Promise<boolean> {
  const status = await getConsentStatus(userId);
  return (['CB-2', 'CB-3', 'CB-4'] as const).every(id => status[id]?.action === 'accepted');
}
