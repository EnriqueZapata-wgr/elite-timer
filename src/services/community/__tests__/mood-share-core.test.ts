/**
 * Tests de la capa social de ánimo (MB-4 · Bloque 4) — lógica pura +
 * test estático anti-fuga de la mig 226 (espejo del patrón friends-core 184).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MOOD_REACTIONS, isValidReactionKind, buildSharePayload, timeAgoEs,
} from '../mood-share-core';

describe('reacciones cálidas', () => {
  it('son exactamente las 3 del contrato (sin likes)', () => {
    expect(MOOD_REACTIONS.map(r => r.kind)).toEqual(['te_leo', 'un_abrazo', 'aqui_estoy']);
    expect(isValidReactionKind('un_abrazo')).toBe(true);
    expect(isValidReactionKind('like')).toBe(false);
  });
});

describe('payload del share — copia mínima', () => {
  it('incluye la emoción SOLO si el usuario lo pidió (granular)', () => {
    const base = { checkinId: 'c1', quadrant: 'low_unpleasant', emotionLabel: 'Triste' };
    expect(buildSharePayload({ ...base, includeEmotion: false }).emotion_label).toBeNull();
    expect(buildSharePayload({ ...base, includeEmotion: true }).emotion_label).toBe('Triste');
  });

  it('nunca lleva más campos que checkin_id + quadrant + emotion_label', () => {
    const p = buildSharePayload({ checkinId: 'c1', quadrant: 'high_pleasant', emotionLabel: 'Feliz', includeEmotion: true });
    expect(Object.keys(p).sort()).toEqual(['checkin_id', 'emotion_label', 'quadrant']);
  });
});

describe('timeAgoEs', () => {
  const now = new Date('2026-07-25T12:00:00');
  it('formatea minutos, horas, ayer y días', () => {
    expect(timeAgoEs('2026-07-25T11:59:40', now)).toBe('ahora');
    expect(timeAgoEs('2026-07-25T11:30:00', now)).toBe('hace 30 min');
    expect(timeAgoEs('2026-07-25T08:00:00', now)).toBe('hace 4 h');
    expect(timeAgoEs('2026-07-24T08:00:00', now)).toBe('ayer');
    expect(timeAgoEs('2026-07-20T08:00:00', now)).toBe('hace 5 días');
    expect(timeAgoEs('basura', now)).toBe('');
  });
});

// ═══ Anti-fuga estático de la mig 226 (espejo del patrón 184) ═══

const MIG = resolve(process.cwd(), 'supabase/migrations/226_mood_shares.sql');

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

/** Tablas permitidas tras FROM/JOIN en los RPCs de ánimo. */
const ALLOWED_TABLES = new Set([
  'mood_shares', 'mood_share_reactions', 'friendships', 'user_blocks', 'user_profile_public',
]);

const CLINICAL_TABLES = [
  'user_symptoms', 'health_measurements', 'journal_entries', 'lab_results',
  'braverman', 'cycle_periods', 'cycle_symptoms', 'supplement', 'user_dx',
  'fasting_logs', 'food_logs', 'client_profiles',
];

describe('anti-leak · mig 226', () => {
  const raw = readFileSync(MIG, 'utf8');
  const code = stripComments(raw).toLowerCase();

  it('emotional_checkins aparece SOLO como REFERENCES (FK de cascada), nunca en FROM/JOIN', () => {
    const fromJoin = /\b(?:from|join)\s+emotional_checkins\b/.test(code);
    expect(fromJoin).toBe(false);
    expect(code.includes('references emotional_checkins')).toBe(true);
  });

  it('ninguna tabla clínica en el SQL ejecutable', () => {
    for (const t of CLINICAL_TABLES) {
      expect(code.includes(t), `fuga clínica: referencia "${t}"`).toBe(false);
    }
  });

  it('solo tablas de ánimo + sociales tras FROM/JOIN', () => {
    const re = /\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/g;
    const notTables = new Set(['public']);
    const tables = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (!notTables.has(m[1])) tables.add(m[1]);
    }
    expect(tables.size).toBeGreaterThan(0);
    for (const t of tables) {
      expect(ALLOWED_TABLES.has(t), `tabla no permitida en RPCs de ánimo: "${t}"`).toBe(true);
    }
  });

  it('SECURITY DEFINER + search_path fijo + GRANT authenticated + REVOKE PUBLIC', () => {
    expect(code.includes('security definer')).toBe(true);
    expect(code.includes('set search_path = public')).toBe(true);
    expect(/grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/.test(code)).toBe(true);
    expect(/revoke\s+all\s+on\s+function[\s\S]*from\s+public/.test(code)).toBe(true);
  });

  it('cada CREATE TABLE tiene RLS + policy (regla #4)', () => {
    const creates = (code.match(/create table if not exists/g) ?? []).length;
    const rls = (code.match(/enable row level security/g) ?? []).length;
    const policies = (code.match(/create policy/g) ?? []).length;
    expect(creates).toBe(2);
    expect(rls).toBe(creates);
    expect(policies).toBeGreaterThanOrEqual(creates);
  });

  it('idempotente: IF NOT EXISTS / OR REPLACE / duplicate_object', () => {
    expect(code.includes('create table if not exists')).toBe(true);
    expect(code.includes('create or replace function')).toBe(true);
    expect(code.includes('duplicate_object')).toBe(true);
    expect(code.includes('on conflict')).toBe(true);
  });

  it("cero 'position' como identificador (aprendizaje 180)", () => {
    expect(/\bposition\b/.test(code)).toBe(false);
  });

  it('sin ranking ni agregados comparativos de ánimo', () => {
    expect(code.includes('rank')).toBe(false);
    expect(/\bcount\s*\(/.test(code)).toBe(false);
  });
});
