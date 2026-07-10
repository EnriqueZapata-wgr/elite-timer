/**
 * Perfil público — núcleo PURO (sin react-native/supabase), testeable con vitest.
 *
 * Contiene la proyección de visibilidad (aplica flags → campos visibles) y la
 * validación de username. El I/O (RPCs) vive en public-profile-service.ts.
 *
 * Invariante anti-fuga: la salida de applyVisibility SOLO contiene campos de
 * PUBLIC_PROFILE_FIELDS. `projectionIsClean` es el guard que lo verifica en
 * runtime (defensa en profundidad) y en el test de regresión.
 */
import {
  PUBLIC_PROFILE_FIELD_SET,
  FORBIDDEN_PUBLIC_FIELDS,
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_PATTERN,
  type VisibilityFlags,
} from '@/src/constants/community';

/** Fila cruda de user_profile_public (ya no-clínica) + sus flags. */
export interface PublicProfileRow extends VisibilityFlags {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  chronotype: string | null;
  streak_days: number;
  lifetime_electrons: number;
  current_rank: number;
  friend_count: number;
}

/** Proyección visible: campos nulos cuando el flag correspondiente está off. */
export interface VisiblePublicProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  chronotype: string | null;
  streak_days: number | null;
  lifetime_electrons: number | null;
  current_rank: number | null;
  friend_count: number;
}

/**
 * Aplica los flags de visibilidad a una fila pública. Siempre presentes:
 * user_id, username, display_name, friend_count. El resto se anula según flag.
 * (El gate de amistad y de bloqueo se resuelve aguas arriba en el RPC.)
 */
export function applyVisibility(row: PublicProfileRow): VisiblePublicProfile {
  return {
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name ?? row.username,
    avatar_url: row.show_photo ? row.avatar_url : null,
    country: row.show_country ? row.country : null,
    chronotype: row.show_chronotype ? row.chronotype : null,
    streak_days: row.show_streak ? row.streak_days : null,
    lifetime_electrons: row.show_electrons ? row.lifetime_electrons : null,
    current_rank: row.show_badges ? row.current_rank : null,
    friend_count: row.friend_count,
  };
}

/**
 * Guard anti-fuga: true si `obj` SOLO tiene keys de la whitelist pública y
 * ninguna key clínica prohibida. Se usa en runtime (service) y en el test.
 */
export function projectionIsClean(obj: Record<string, unknown>): boolean {
  const forbidden = new Set<string>(FORBIDDEN_PUBLIC_FIELDS);
  for (const key of Object.keys(obj)) {
    if (!PUBLIC_PROFILE_FIELD_SET.has(key)) return false;
    if (forbidden.has(key)) return false;
  }
  return true;
}

// ── Username ─────────────────────────────────────────────────────────────────

export interface UsernameResult {
  ok: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Normaliza (trim + lowercase) y valida un username: longitud USERNAME_MIN..MAX,
 * charset [a-z0-9_] sin guion bajo al inicio/fin.
 */
export function validateUsername(raw: string): UsernameResult {
  const normalized = raw.trim().toLowerCase();
  if (normalized.length < USERNAME_MIN) {
    return { ok: false, error: `Mínimo ${USERNAME_MIN} caracteres` };
  }
  if (normalized.length > USERNAME_MAX) {
    return { ok: false, error: `Máximo ${USERNAME_MAX} caracteres` };
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return { ok: false, error: 'Solo letras, números y _ (sin _ al inicio o final)' };
  }
  return { ok: true, normalized };
}
