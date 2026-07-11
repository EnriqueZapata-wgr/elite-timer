/**
 * TEST DE REGRESIÓN ANTI-FUGA CLÍNICA — migración 180 (leaderboard RPC).
 *
 * Regla NO-NEGOCIABLE: el leaderboard SOLO puede tocar electron_balance +
 * user_profile_public. Ninguna tabla clínica puede aparecer en el SQL EJECUTABLE
 * (DX, intervenciones, síntomas, padecimientos, labs, suplementos, ciclo,
 * journal, mood, Braverman, quizzes).
 *
 * Se STRIPEA el texto de comentarios antes de analizar: la cabecera de la
 * migración menciona esos términos justamente para documentar la prohibición, y
 * no deben contar como referencias reales. El test analiza solo el código.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAW = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/180_community_leaderboard_rpc.sql'),
  'utf8',
);

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

const CODE = stripComments(RAW).toLowerCase();

/** Tablas clínicas / sensibles que JAMÁS deben aparecer en el código del RPC. */
const CLINICAL_TABLES = [
  'functional_dx', 'user_interventions', 'clinical_symptoms', 'padecimientos',
  'lab_values', 'user_supplements', 'supplement_logs', 'journal', 'braverman',
  'quiz', 'cycle', 'menstrual', 'mood', 'symptom', 'glucose', 'ketones',
];

describe('mig 180 · leaderboard no toca tablas clínicas', () => {
  it('ninguna tabla clínica aparece en el SQL ejecutable', () => {
    for (const t of CLINICAL_TABLES) {
      expect(CODE.includes(t), `fuga clínica: el RPC referencia "${t}"`).toBe(false);
    }
  });

  it('el código referencia electron_balance', () => {
    expect(CODE.includes('electron_balance')).toBe(true);
  });

  it('el código referencia user_profile_public', () => {
    expect(CODE.includes('user_profile_public')).toBe(true);
  });

  it('solo electron_balance y user_profile_public aparecen tras FROM/JOIN', () => {
    const allowed = new Set(['electron_balance', 'user_profile_public']);
    // 'public' aquí es el ROL de `REVOKE ... FROM PUBLIC`, no una tabla.
    const notTables = new Set(['public']);
    const re = /\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/g;
    const tables = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(CODE)) !== null) {
      if (!notTables.has(m[1])) tables.add(m[1]);
    }
    expect(tables.size, 'no se detectó ninguna tabla tras FROM/JOIN').toBeGreaterThan(0);
    for (const t of tables) {
      expect(allowed.has(t), `tabla no permitida en el leaderboard: "${t}"`).toBe(true);
    }
  });

  it('las funciones son SECURITY DEFINER con search_path fijo', () => {
    expect(CODE.includes('security definer')).toBe(true);
    expect(CODE.includes('set search_path = public')).toBe(true);
  });

  it('GRANT a authenticated y REVOKE de PUBLIC (no expuesto a anon)', () => {
    expect(/grant\s+execute\s+on\s+function[\s\S]*to\s+authenticated/.test(CODE)).toBe(true);
    expect(/revoke\s+all\s+on\s+function[\s\S]*from\s+public/.test(CODE)).toBe(true);
  });
});
