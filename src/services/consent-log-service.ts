/**
 * Sprint Compliance 2 — Servicio del log de auditoría de consentimiento.
 *
 * Escribe en user_consent_log (migración 209): una fila por aceptación o
 * revocación de cada checkbox CB-1..CB-7, con texto_hash (sha256 del texto
 * exacto) + aviso_version. ip/user_agent los estampa el trigger server-side.
 *
 * CB-1, CB-3 y CB-4 se aceptan en register.tsx ANTES de que exista sesión
 * estable: si el insert falla (p. ej. sesión aún no lista), la aceptación
 * queda en cola en AsyncStorage y se reintenta después.
 *
 * ═══ LA COLA ES POR USUARIO, Y ESO ES UN ARREGLO DE SEGURIDAD ═══
 * 7-sep-2026. Hasta hoy la cola vivía en UNA llave global del dispositivo y el
 * flush REASIGNABA `user_id` a quien estuviera dentro en ese momento,
 * conservando el `accepted_at` viejo. En un teléfono donde la cuenta A se
 * registró sin red y luego entró la cuenta B, el flush insertaba los CB-1,
 * CB-3 y CB-4 de A como filas de B: B pasaba la puerta legal sin haber visto
 * una casilla, y en el log quedaba una firma con la fecha de otra persona.
 * Eso es firmar por alguien.
 *
 * Ahora la llave lleva el user_id, el flush NO reasigna nada y descarta (sin
 * borrar) lo que sea de otro usuario. La llave global vieja se sigue leyendo
 * porque puede haber teléfonos con filas encoladas ahí: se insertan solo las
 * que ya traen el user_id correcto y las demás se quedan esperando a su dueño.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { sha256Hex } from '@/src/utils/sha256';
import {
  AVISO_VERSION,
  TERMS_VERSION,
  CONSENT_BY_ID,
  type ConsentCheckboxId,
} from '@/src/constants/consent-copy';

/** Llave de la cola, por usuario. Ver el encabezado: la global era un hoyo. */
function pendingKey(userId: string): string {
  return `@atp/pending_consent_logs/${userId}`;
}

/**
 * La llave global anterior al 7-sep-2026. Se sigue LEYENDO para no perder las
 * filas que ya estén encoladas ahí en teléfonos reales, pero nunca se escribe.
 */
const PENDING_KEY_LEGACY = '@atp/pending_consent_logs';

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
    logWarn('[consent-log] insert falló, encolando:', error.message);
    await enqueuePending(userId, rows);
    return false;
  }
  return true;
}

async function enqueuePending(userId: string, rows: ConsentRow[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(userId));
    const prev: ConsentRow[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(pendingKey(userId), JSON.stringify([...prev, ...rows]));
  } catch (e) {
    logWarn('[consent-log] no se pudo encolar:', e);
  }
}

/**
 * Vacía UNA llave de cola insertando solo las filas que son de `userId`.
 *
 * Lo que es de otro usuario NO se reasigna y NO se borra: se queda en la cola
 * esperando a que su dueño abra sesión en este teléfono. Reasignar era el bug;
 * borrar sería tirar la evidencia de consentimiento de alguien más.
 */
async function flushDeLlave(llave: string, userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(llave);
  if (!raw) return;
  const rows: ConsentRow[] = JSON.parse(raw);
  const mias = rows.filter(r => r.user_id === userId);
  const ajenas = rows.filter(r => r.user_id !== userId);
  if (mias.length > 0) {
    const { error } = await supabase.from('user_consent_log').insert(mias);
    // Si el insert falla, la cola se queda COMPLETA para el próximo intento.
    if (error) {
      logWarn('[consent-log] flush falló, la cola se conserva:', error.message);
      return;
    }
  }
  if (ajenas.length > 0) await AsyncStorage.setItem(llave, JSON.stringify(ajenas));
  else await AsyncStorage.removeItem(llave);
}

/** Reintenta los logs encolados de ESTE usuario (con sesión ya establecida). */
export async function flushPendingConsentLogs(userId: string): Promise<void> {
  try {
    await flushDeLlave(pendingKey(userId), userId);
    // La cola global de antes del 7-sep-2026: solo lo que ya trae su user_id.
    await flushDeLlave(PENDING_KEY_LEGACY, userId);
  } catch (e) {
    logWarn('[consent-log] flush falló:', e);
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

/**
 * ¿El usuario ya tiene aceptados los obligatorios del muro (CB-2/3/4)?
 *
 * 7-sep-2026: esta función NO tiene un solo llamador y su lista ya no describe
 * ninguna puerta real. La puerta legal de la app son CB-1/CB-3/CB-4
 * (CONSENTIMIENTOS_DE_PUERTA en acceso-consentido-core) y CB-2 se pide en el
 * punto de uso (PuertaDatosSalud). Se deja como está en lugar de reapuntarla
 * en silencio: si alguien la va a usar, que lea esto y elija a conciencia.
 */
export async function hasCoreConsents(userId: string): Promise<boolean> {
  const status = await getConsentStatus(userId);
  return (['CB-2', 'CB-3', 'CB-4'] as const).every(id => status[id]?.action === 'accepted');
}
