/**
 * TEST DE REGRESIÓN ANTI-FUGA CLÍNICA — Comunidad V1.1 (migraciones 190-193).
 * Patrón del guard estático de 184 (friends-core.test.ts).
 *
 * Invariante SUPREMO: toda lectura cross-user vía RPC SECURITY DEFINER que toca
 * SOLO superficies no-clínicas. Por migración se fija el set EXACTO de tablas
 * permitidas tras FROM/JOIN — agregar una tabla nueva a un RPC social obliga a
 * declararla aquí EXPLÍCITAMENTE (y justificar que es no-clínica).
 *
 * Nota 192: electron_logs es sensible-no-clínico (fuente = actividad). Se
 * permite SOLO ahí porque la agregación expone únicamente totales/rank de users
 * discoverable — mismo contrato que el leaderboard de 180.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FEED_EVENT_TYPES,
  FORBIDDEN_FEED_EVENTS,
} from '@/src/constants/community';

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

function readMigration(file: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');
}

function tablesAfterFromJoin(code: string): Set<string> {
  // 'public' es el ROL de `REVOKE ... FROM PUBLIC`, no una tabla.
  const notTables = new Set(['public']);
  const re = /\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/g;
  const tables = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (!notTables.has(m[1])) tables.add(m[1]);
  }
  return tables;
}

const CLINICAL_TABLES = [
  'functional_dx', 'user_interventions', 'clinical_symptoms', 'clinical_symptoms_aislados', 'user_symptoms', 'padecimientos',
  'lab_values', 'user_supplements', 'supplement_logs', 'journal', 'braverman',
  'quiz', 'cycle', 'menstrual', 'mood', 'symptom', 'glucose', 'ketones',
];

/** Set EXACTO de tablas permitidas tras FROM/JOIN, POR migración. */
const V11_MIGRATIONS: Record<string, string[]> = {
  '190_social_notifications.sql': [
    'user_profile_public', 'friendships', 'user_blocks', 'social_notifications',
  ],
  '191_admin_reports_panel.sql': [
    'user_reports', 'user_profile_public', 'admin_users',
  ],
  '192_electron_window_totals.sql': [
    // electron_logs SOLO aquí (ver nota de cabecera).
    'electron_logs', 'electron_window_totals', 'electron_balance', 'user_profile_public',
  ],
  '193_activity_feed.sql': [
    'activity_feed', 'friendships', 'user_profile_public',
  ],
};

describe('anti-leak · migraciones Comunidad V1.1 (190-193)', () => {
  for (const [file, allowed] of Object.entries(V11_MIGRATIONS)) {
    const code = stripComments(readMigration(file)).toLowerCase();
    const allowedSet = new Set(allowed);

    it(`${file}: ninguna tabla clínica en el SQL ejecutable`, () => {
      for (const t of CLINICAL_TABLES) {
        expect(code.includes(t), `fuga clínica: ${file} referencia "${t}"`).toBe(false);
      }
    });

    it(`${file}: SOLO tablas whitelisteadas tras FROM/JOIN`, () => {
      const tables = tablesAfterFromJoin(code);
      expect(tables.size, `${file}: no se detectó ninguna tabla tras FROM/JOIN`).toBeGreaterThan(0);
      for (const t of tables) {
        expect(allowedSet.has(t), `tabla no permitida en ${file}: "${t}"`).toBe(true);
      }
    });

    it(`${file}: SECURITY DEFINER + search_path fijo + GRANT authenticated + REVOKE PUBLIC`, () => {
      expect(code.includes('security definer')).toBe(true);
      expect(code.includes('set search_path = public')).toBe(true);
      expect(/grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/.test(code)).toBe(true);
      expect(/revoke\s+all\s+on\s+function[\s\S]*from\s+public/.test(code)).toBe(true);
    });

    it(`${file}: sin palabras reservadas Postgres a secas (position/window — aprendizaje 180/192)`, () => {
      expect(/\bposition\b/.test(code), `${file} usa 'position' a secas`).toBe(false);
      // 'window' es reservada (cláusula WINDOW) — la columna correcta es window_key.
      expect(/\bwindow\b(?!_)/.test(code), `${file} usa 'window' a secas`).toBe(false);
    });

    it(`${file}: cada CREATE TABLE tiene RLS + policy (regla #4)`, () => {
      const creates = (code.match(/create table if not exists/g) ?? []).length;
      const rls = (code.match(/enable row level security/g) ?? []).length;
      const policies = (code.match(/create policy/g) ?? []).length;
      if (creates > 0) {
        expect(rls, `${file}: RLS faltante`).toBe(creates);
        expect(policies, `${file}: policy faltante`).toBeGreaterThanOrEqual(creates);
      }
    });
  }
});

// ── 190: el payload de la notificación solo se construye desde el perfil público ──

describe('anti-leak · 190 payload de social_notifications', () => {
  const code = stripComments(readMigration('190_social_notifications.sql')).toLowerCase();

  it('el CHECK del type es exactamente friend_request/friend_accepted', () => {
    expect(code.includes("type in ('friend_request', 'friend_accepted')")).toBe(true);
  });

  it('jsonb_build_object solo con identidad pública (from_user_id/username/display_name)', () => {
    const builds = code.match(/jsonb_build_object\(([\s\S]*?)\)/g) ?? [];
    expect(builds.length).toBeGreaterThan(0);
    for (const b of builds) {
      const keys = [...b.matchAll(/'([a-z_]+)'\s*,/g)].map((m) => m[1]);
      for (const k of keys) {
        expect(
          ['from_user_id', 'username', 'display_name'].includes(k),
          `key no permitida en payload de notificación: "${k}"`,
        ).toBe(true);
      }
    }
  });
});

// ── 193: CHECK del event_type = espejo EXACTO del whitelist TS ────────────────

describe('anti-leak · 193 CHECK espejo de FEED_EVENT_TYPES', () => {
  const code = stripComments(readMigration('193_activity_feed.sql')).toLowerCase();

  it('todos los FEED_EVENT_TYPES están en el CHECK de la migración', () => {
    for (const t of FEED_EVENT_TYPES) {
      expect(code.includes(`'${t}'`), `evento del whitelist ausente del CHECK: ${t}`).toBe(true);
    }
  });

  it('ningún evento prohibido aparece en el SQL ejecutable', () => {
    for (const t of FORBIDDEN_FEED_EVENTS) {
      expect(code.includes(`'${t}'`), `evento clínico en la migración 193: ${t}`).toBe(false);
    }
  });

  it('day_complete tiene idempotencia por (user_id, event_date) — UNIQUE parcial', () => {
    expect(/create unique index[\s\S]*?\(user_id, event_date\)[\s\S]*?where event_type = 'day_complete'/.test(code)).toBe(true);
  });
});

// ── whitelist TS actualizado (V1.1) ───────────────────────────────────────────

describe('whitelist · day_complete V1.1', () => {
  it('day_complete está en FEED_EVENT_TYPES y NO en FORBIDDEN_FEED_EVENTS', () => {
    expect((FEED_EVENT_TYPES as readonly string[]).includes('day_complete')).toBe(true);
    expect((FORBIDDEN_FEED_EVENTS as readonly string[]).includes('day_complete')).toBe(false);
  });

  it('FEED_EVENT_TYPES ∩ FORBIDDEN_FEED_EVENTS = ∅', () => {
    const forbidden = new Set<string>(FORBIDDEN_FEED_EVENTS);
    for (const t of FEED_EVENT_TYPES) {
      expect(forbidden.has(t), `evento del feed también prohibido: ${t}`).toBe(false);
    }
  });
});

// ── 191: gate admin DENTRO de cada RPC ────────────────────────────────────────

describe('admin · 191 gate server-side', () => {
  const code = stripComments(readMigration('191_admin_reports_panel.sql')).toLowerCase();

  it('cada RPC admin_* valida admin_users por dentro', () => {
    const fnCount = (code.match(/create or replace function admin_/g) ?? []).length;
    const gates = (code.match(/select 1 from admin_users au where au\.user_id = v_uid/g) ?? []).length;
    expect(fnCount).toBe(3);
    expect(gates, 'algún RPC admin_* no valida admin_users').toBe(fnCount);
  });

  it('el CHECK del status es open/reviewed/actioned/dismissed', () => {
    expect(code.includes("check (status in ('open', 'reviewed', 'actioned', 'dismissed'))")).toBe(true);
  });
});
