/**
 * TEST DE REGRESIÓN ANTI-FUGA CLÍNICA (regla no-negociable del mapa Comunidad).
 *
 * Verifica los invariantes que se pueden comprobar sin DB:
 *  - El whitelist del feed no contiene ningún evento clínico (y excluye day_complete, v1).
 *  - Las listas pública y prohibida son disjuntas.
 *  - CUALQUIER combinación de flags produce una proyección "limpia" (solo campos públicos).
 *  - projectionIsClean rechaza cualquier campo clínico inyectado.
 *
 * (Los invariantes a nivel DB — RLS dueño-only, RPCs SECURITY DEFINER sin join
 * clínico, CHECK del event_type — se verifican con la migración aplicada + smoke
 * de integración post-apply; este test cubre la capa TS.)
 */
import { describe, it, expect } from 'vitest';
import {
  FEED_EVENT_TYPES,
  FORBIDDEN_FEED_EVENTS,
  PUBLIC_PROFILE_FIELDS,
  FORBIDDEN_PUBLIC_FIELDS,
} from '@/src/constants/community';
import { applyVisibility, projectionIsClean, type PublicProfileRow } from '../public-profile-core';
import { DEFAULT_VISIBILITY, type VisibilityFlags } from '@/src/constants/community';

describe('anti-leak · whitelist del feed', () => {
  it('ningún evento clínico está en FEED_EVENT_TYPES', () => {
    const feed = new Set<string>(FEED_EVENT_TYPES);
    for (const forbidden of FORBIDDEN_FEED_EVENTS) {
      expect(feed.has(forbidden), `evento clínico en feed: ${forbidden}`).toBe(false);
    }
  });

  it('day_complete queda fuera de v1 (decisión #4)', () => {
    expect((FEED_EVENT_TYPES as readonly string[]).includes('day_complete')).toBe(false);
  });
});

describe('anti-leak · listas disjuntas', () => {
  it('PUBLIC_PROFILE_FIELDS ∩ FORBIDDEN_PUBLIC_FIELDS = ∅', () => {
    const forbidden = new Set<string>(FORBIDDEN_PUBLIC_FIELDS);
    for (const f of PUBLIC_PROFILE_FIELDS) {
      expect(forbidden.has(f), `campo público también prohibido: ${f}`).toBe(false);
    }
  });
});

function row(flags: VisibilityFlags): PublicProfileRow {
  return {
    ...flags,
    user_id: 'u1', username: 'x', display_name: 'X', avatar_url: 'a',
    country: 'MX', chronotype: 'lion', streak_days: 1, lifetime_electrons: 1,
    current_rank: 1, friend_count: 1,
  };
}

/** Enumera las 2^9 combinaciones de flags. */
function* allFlagCombos(): Generator<VisibilityFlags> {
  const keys = Object.keys(DEFAULT_VISIBILITY) as (keyof VisibilityFlags)[];
  const n = keys.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const f = {} as VisibilityFlags;
    keys.forEach((k, i) => { f[k] = Boolean(mask & (1 << i)); });
    yield f;
  }
}

describe('anti-leak · proyección siempre limpia', () => {
  it('toda combinación de flags produce solo campos públicos', () => {
    for (const flags of allFlagCombos()) {
      const out = applyVisibility(row(flags));
      expect(projectionIsClean(out as unknown as Record<string, unknown>)).toBe(true);
    }
  });
});

describe('anti-leak · projectionIsClean rechaza campos clínicos', () => {
  it('cada campo prohibido inyectado hace fallar el guard', () => {
    const base = applyVisibility(row(DEFAULT_VISIBILITY)) as unknown as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_PUBLIC_FIELDS) {
      const dirty = { ...base, [forbidden]: 'leak' };
      expect(projectionIsClean(dirty), `no detectó fuga: ${forbidden}`).toBe(false);
    }
  });

  it('un campo desconocido (no whitelisteado) también falla', () => {
    const base = applyVisibility(row(DEFAULT_VISIBILITY)) as unknown as Record<string, unknown>;
    expect(projectionIsClean({ ...base, some_random_field: 1 })).toBe(false);
  });
});
