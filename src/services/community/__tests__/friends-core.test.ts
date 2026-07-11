/**
 * Tests de friends-core (C2) + anti-fuga de las migraciones sociales 182-184.
 *
 * Cubre:
 *  - canonical pair / same edge (espejo del índice único LEAST/GREATEST de 182)
 *  - estados derivados (none/incoming/outgoing/friends/blocked; declined→none)
 *  - rate-limit window (espejo de search_users v2)
 *  - threshold de auto-hide (espejo de report_user)
 *  - validación de razones de report (keys = CHECK de 183)
 *  - ANTI-LEAK: el shape de list_friends pasa projectionIsClean (whitelist
 *    PUBLIC_PROFILE_FIELDS sin agregar campos) y las migraciones 182-184 no
 *    referencian ninguna tabla clínica en su SQL ejecutable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canonicalPair,
  isSameEdge,
  deriveFriendState,
  stateAfterSendCode,
  sortFriends,
  splitPendingRequests,
  publicDisplayName,
  isValidReportReason,
  shouldAutoHide,
  isSearchAllowed,
  SEARCH_RATE_LIMIT,
  SEARCH_RATE_WINDOW_MS,
  type FriendRow,
  type PendingRequestRow,
} from '../friends-core';
import { projectionIsClean } from '../public-profile-core';
import {
  REPORT_AUTOHIDE_THRESHOLD,
  REPORT_REASON_KEYS,
  FORBIDDEN_PUBLIC_FIELDS,
  PUBLIC_PROFILE_FIELD_SET,
} from '@/src/constants/community';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

// ── canonical pair ────────────────────────────────────────────────────────────

describe('canonicalPair / isSameEdge', () => {
  it('ordena el par sin importar la dirección', () => {
    expect(canonicalPair(A, B)).toEqual([A, B]);
    expect(canonicalPair(B, A)).toEqual([A, B]);
  });

  it('A→B y B→A son el mismo edge', () => {
    expect(isSameEdge(A, B, B, A)).toBe(true);
    expect(isSameEdge(A, B, A, B)).toBe(true);
  });

  it('pares distintos NO son el mismo edge', () => {
    expect(isSameEdge(A, B, A, C)).toBe(false);
  });
});

// ── estados derivados ─────────────────────────────────────────────────────────

function edge(requester: string, addressee: string, status: 'pending' | 'accepted' | 'declined') {
  return { requester_id: requester, addressee_id: addressee, status };
}

describe('deriveFriendState', () => {
  it('sin edge → none', () => {
    expect(deriveFriendState(null, A)).toBe('none');
    expect(deriveFriendState(undefined, A)).toBe('none');
  });

  it('accepted → friends para ambos lados', () => {
    expect(deriveFriendState(edge(A, B, 'accepted'), A)).toBe('friends');
    expect(deriveFriendState(edge(A, B, 'accepted'), B)).toBe('friends');
  });

  it('pending: addressee ve incoming, requester ve outgoing', () => {
    expect(deriveFriendState(edge(A, B, 'pending'), B)).toBe('incoming');
    expect(deriveFriendState(edge(A, B, 'pending'), A)).toBe('outgoing');
  });

  it('declined → none (re-request permitido, decisión C2)', () => {
    expect(deriveFriendState(edge(A, B, 'declined'), A)).toBe('none');
    expect(deriveFriendState(edge(A, B, 'declined'), B)).toBe('none');
  });

  it('blocked domina cualquier edge', () => {
    expect(deriveFriendState(edge(A, B, 'accepted'), A, { blockedByMe: true })).toBe('blocked');
    expect(deriveFriendState(edge(A, B, 'pending'), B, { blockedMe: true })).toBe('blocked');
    expect(deriveFriendState(null, A, { blockedByMe: true })).toBe('blocked');
  });

  it('edge ajeno (caller no participa) → none', () => {
    expect(deriveFriendState(edge(B, C, 'accepted'), A)).toBe('none');
  });
});

describe('stateAfterSendCode', () => {
  it('mapea códigos del RPC al estado de UI', () => {
    expect(stateAfterSendCode('sent')).toBe('outgoing');
    expect(stateAfterSendCode('already_pending')).toBe('outgoing');
    expect(stateAfterSendCode('incoming_pending')).toBe('incoming');
    expect(stateAfterSendCode('already_friends')).toBe('friends');
    expect(stateAfterSendCode('not_allowed')).toBe('none');
    expect(stateAfterSendCode('not_found')).toBe('none');
  });
});

// ── listas ────────────────────────────────────────────────────────────────────

function friendRow(over: Partial<FriendRow>): FriendRow {
  return {
    user_id: A, username: 'ana', display_name: 'Ana', avatar_url: null,
    country: null, chronotype: null, streak_days: 3, lifetime_electrons: 100,
    current_rank: 2, friend_count: 1, ...over,
  };
}

describe('sortFriends / publicDisplayName', () => {
  it('ordena alfabéticamente por nombre visible sin mutar', () => {
    const rows = [
      friendRow({ user_id: '1', display_name: 'zoe' }),
      friendRow({ user_id: '2', display_name: null, username: 'bruno' }),
      friendRow({ user_id: '3', display_name: 'Ana' }),
    ];
    const sorted = sortFriends(rows);
    expect(sorted.map(r => r.user_id)).toEqual(['3', '2', '1']);
    expect(rows[0].user_id).toBe('1'); // original intacto
  });

  it('fail-soft cuando no hay nombre', () => {
    expect(publicDisplayName({ display_name: null, username: null })).toBe('Atleta ATP');
  });
});

describe('splitPendingRequests', () => {
  const req = (id: string, direction: 'incoming' | 'outgoing', at: string): PendingRequestRow => ({
    request_id: id, direction, other_user_id: B, username: 'b', display_name: 'B',
    avatar_url: null, requested_at: at,
  });

  it('separa por dirección y ordena más reciente primero', () => {
    const out = splitPendingRequests([
      req('r1', 'incoming', '2026-07-01T00:00:00Z'),
      req('r2', 'outgoing', '2026-07-03T00:00:00Z'),
      req('r3', 'incoming', '2026-07-02T00:00:00Z'),
    ]);
    expect(out.incoming.map(r => r.request_id)).toEqual(['r3', 'r1']);
    expect(out.outgoing.map(r => r.request_id)).toEqual(['r2']);
  });
});

// ── reports ───────────────────────────────────────────────────────────────────

describe('reports · razones y auto-hide', () => {
  it('todas las keys del constante son válidas (espejo del CHECK de 183)', () => {
    for (const k of REPORT_REASON_KEYS) {
      expect(isValidReportReason(k)).toBe(true);
    }
  });

  it('razones fuera del set se rechazan', () => {
    expect(isValidReportReason('foto_ofensiva')).toBe(false); // key vieja pre-C2
    expect(isValidReportReason('')).toBe(false);
    expect(isValidReportReason('hacked')).toBe(false);
  });

  it('auto-hide exactamente en el umbral (espejo de report_user)', () => {
    expect(shouldAutoHide(REPORT_AUTOHIDE_THRESHOLD - 1)).toBe(false);
    expect(shouldAutoHide(REPORT_AUTOHIDE_THRESHOLD)).toBe(true);
    expect(shouldAutoHide(REPORT_AUTOHIDE_THRESHOLD + 5)).toBe(true);
  });

  it('valores no finitos no auto-ocultan', () => {
    expect(shouldAutoHide(NaN)).toBe(false);
    expect(shouldAutoHide(Infinity)).toBe(false);
  });
});

// ── rate limit ────────────────────────────────────────────────────────────────

describe('isSearchAllowed (espejo de search_users v2: 20/60s)', () => {
  const now = 1_000_000_000;

  it('permite con historial vacío', () => {
    expect(isSearchAllowed([], now)).toBe(true);
  });

  it('permite hasta el límite - 1 dentro de la ventana', () => {
    const ts = Array.from({ length: SEARCH_RATE_LIMIT - 1 }, (_, i) => now - i * 100);
    expect(isSearchAllowed(ts, now)).toBe(true);
  });

  it('bloquea al alcanzar el límite dentro de la ventana', () => {
    const ts = Array.from({ length: SEARCH_RATE_LIMIT }, (_, i) => now - i * 100);
    expect(isSearchAllowed(ts, now)).toBe(false);
  });

  it('los timestamps fuera de la ventana no cuentan', () => {
    const old = Array.from({ length: SEARCH_RATE_LIMIT }, () => now - SEARCH_RATE_WINDOW_MS - 1);
    expect(isSearchAllowed(old, now)).toBe(true);
  });

  it('los timestamps futuros no cuentan (reloj raro)', () => {
    const future = Array.from({ length: SEARCH_RATE_LIMIT }, () => now + 5_000);
    expect(isSearchAllowed(future, now)).toBe(true);
  });
});

// ── ANTI-LEAK · shape de list_friends ────────────────────────────────────────

describe('anti-leak · proyección de list_friends', () => {
  it('el shape de FriendRow pasa projectionIsClean (sin campos nuevos al whitelist)', () => {
    const row = friendRow({});
    expect(projectionIsClean(row as unknown as Record<string, unknown>)).toBe(true);
    // todas las keys de la fila están whitelisteadas y ninguna es prohibida
    const forbidden = new Set<string>(FORBIDDEN_PUBLIC_FIELDS);
    for (const key of Object.keys(row)) {
      expect(PUBLIC_PROFILE_FIELD_SET.has(key), `campo fuera del whitelist: ${key}`).toBe(true);
      expect(forbidden.has(key), `campo prohibido en list_friends: ${key}`).toBe(false);
    }
  });

  it('inyectar un campo clínico en una fila de amigo dispara el guard', () => {
    const dirty = { ...friendRow({}), braverman: 'leak' };
    expect(projectionIsClean(dirty as unknown as Record<string, unknown>)).toBe(false);
  });
});

// ── ANTI-LEAK · migraciones 182-184 (estático, patrón de mig 180) ────────────

/** Elimina comentarios de línea (`-- ...`) para analizar solo SQL ejecutable. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

const CLINICAL_TABLES = [
  'functional_dx', 'user_interventions', 'clinical_symptoms', 'padecimientos',
  'lab_values', 'user_supplements', 'supplement_logs', 'journal', 'braverman',
  'quiz', 'cycle', 'menstrual', 'mood', 'symptom', 'glucose', 'ketones',
];

const SOCIAL_MIGRATIONS = [
  '182_friendships.sql',
  '183_user_blocks_reports.sql',
  '184_community_social_rpcs.sql',
];

/** Tablas permitidas tras FROM/JOIN en el SQL social (184). */
const ALLOWED_TABLES = new Set([
  'user_profile_public', 'friendships', 'user_blocks', 'user_reports',
  'community_search_log',
]);

describe('anti-leak · migraciones sociales 182-184', () => {
  for (const file of SOCIAL_MIGRATIONS) {
    const raw = readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');
    const code = stripComments(raw).toLowerCase();

    it(`${file}: ninguna tabla clínica en el SQL ejecutable`, () => {
      for (const t of CLINICAL_TABLES) {
        expect(code.includes(t), `fuga clínica: ${file} referencia "${t}"`).toBe(false);
      }
    });
  }

  it('184: solo tablas sociales + user_profile_public tras FROM/JOIN', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/184_community_social_rpcs.sql'),
      'utf8',
    );
    const code = stripComments(raw).toLowerCase();
    const notTables = new Set(['public']); // rol de REVOKE ... FROM PUBLIC
    const re = /\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/g;
    const tables = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (!notTables.has(m[1])) tables.add(m[1]);
    }
    expect(tables.size).toBeGreaterThan(0);
    for (const t of tables) {
      expect(ALLOWED_TABLES.has(t), `tabla no permitida en RPCs sociales: "${t}"`).toBe(true);
    }
  });

  it('184: SECURITY DEFINER + search_path fijo + GRANT authenticated + REVOKE PUBLIC', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/184_community_social_rpcs.sql'),
      'utf8',
    );
    const code = stripComments(raw).toLowerCase();
    expect(code.includes('security definer')).toBe(true);
    expect(code.includes('set search_path = public')).toBe(true);
    expect(/grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/.test(code)).toBe(true);
    expect(/revoke\s+all\s+on\s+function[\s\S]*from\s+public/.test(code)).toBe(true);
  });

  it("184: no usa la palabra reservada 'position' como columna de salida (aprendizaje 180)", () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/184_community_social_rpcs.sql'),
      'utf8',
    );
    const code = stripComments(raw).toLowerCase();
    expect(/\bposition\b/.test(code)).toBe(false);
  });

  for (const file of ['182_friendships.sql', '183_user_blocks_reports.sql']) {
    it(`${file}: cada CREATE TABLE tiene RLS + policy (regla #4)`, () => {
      const raw = readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');
      const code = stripComments(raw).toLowerCase();
      const creates = (code.match(/create table if not exists/g) ?? []).length;
      const rls = (code.match(/enable row level security/g) ?? []).length;
      const policies = (code.match(/create policy/g) ?? []).length;
      expect(creates).toBeGreaterThan(0);
      expect(rls).toBe(creates);
      expect(policies).toBeGreaterThanOrEqual(creates);
    });
  }
});
