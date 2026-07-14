/**
 * Guard de regresión del sprint DROP supplement_protocols (peloteo #80, decisión B).
 *
 * La lógica del signup vive en SQL (handle_new_user, trigger on_auth_user_created),
 * así que no hay core TS que testear directo. El test end-to-end real se corrió
 * contra el remoto en transacción con rollback garantizado (2026-07-14):
 *   A) signup con placeholder de invite → perfil creado, FKs migradas
 *      (coach_clients, medications), placeholder eliminado, supplement_protocols
 *      intacta.
 *   B) caso patológico (placeholder con fila legacy en supplement_protocols) →
 *      el signup NO revienta: perfil creado, placeholder huérfano renombrado
 *      'migrating-<uuid>@placeholder.local', fila legacy intacta.
 *
 * Lo que SÍ es verificable en Vitest node-only y protege contra regresiones:
 *   1. La migración 198a existe, redefine handle_new_user sin
 *      supplement_protocols y conserva los invariantes de diseño (fail-soft,
 *      orden perfil-antes-de-FKs, re-bind del trigger).
 *   2. La 198b dropea la tabla con IF EXISTS.
 *   3. Ningún código vivo (src/, app/, supabase/functions/) ni ninguna
 *      migración posterior a 198b vuelve a referenciar supplement_protocols.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

const MIG_198A = join(MIGRATIONS_DIR, '198_rewrite_handle_new_user.sql');
const MIG_198B = join(MIGRATIONS_DIR, '199_drop_supplement_protocols.sql');

/**
 * Quita comentarios de línea (`--` SQL, `//` TS) y cuerpos de bloque JSDoc.
 * Sin ancla `$`: con CRLF el `.` de JS no matchea `\r` y el ancla nunca cierra.
 */
function stripComments(line: string): string {
  return line.replace(/--.*/, '').replace(/\/\/.*/, '').replace(/^\s*\*.*/, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|sql)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('198a — handle_new_user sin supplement_protocols', () => {
  const sql = readFileSync(MIG_198A, 'utf8');
  const code = sql.split('\n').map(stripComments).join('\n');

  it('redefine handle_new_user', () => {
    expect(code).toMatch(/CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/);
  });

  it('no toca supplement_protocols en código ejecutable', () => {
    expect(code).not.toMatch(/supplement_protocols/i);
  });

  it('conserva fail-soft: ningún bloque puede tumbar el signup', () => {
    // 3 bloques guardados: detect placeholder, insert perfil, link FKs
    const guards = code.match(/EXCEPTION WHEN OTHERS THEN/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(3);
    expect(code).toMatch(/RAISE LOG/);
    expect(code).not.toMatch(/RAISE EXCEPTION/); // nunca propagar al signup
  });

  it('crea el perfil ANTES de migrar FKs (orden que reventaba en 024)', () => {
    const insertIdx = code.indexOf('INSERT INTO profiles');
    const linkIdx = code.indexOf("['coach_clients','client_id']");
    expect(insertIdx).toBeGreaterThan(-1);
    expect(linkIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeLessThan(linkIdx);
  });

  it('re-asegura el trigger on_auth_user_created', () => {
    expect(code).toMatch(/DROP TRIGGER IF EXISTS on_auth_user_created ON auth\.users/);
    expect(code).toMatch(/CREATE TRIGGER on_auth_user_created/);
  });

  it('no referencia tablas/columnas inexistentes en remoto (bugs de 024)', () => {
    expect(code).not.toMatch(/daily_protocol_items/);
    expect(code).not.toMatch(/daily_habits_map/);
    expect(code).not.toMatch(/\['ai_reports','user_id'\]/);
  });
});

describe('198b — DROP supplement_protocols', () => {
  const sql = readFileSync(MIG_198B, 'utf8');
  const code = sql.split('\n').map(stripComments).join('\n');

  it('dropea con IF EXISTS', () => {
    expect(code).toMatch(/DROP TABLE IF EXISTS public\.supplement_protocols/);
  });
});

describe('cero referencias vivas a supplement_protocols', () => {
  it('src/, app/ y supabase/functions/ están limpios (comentarios aparte)', () => {
    const dirty: string[] = [];
    for (const dir of ['src', 'app', join('supabase', 'functions')]) {
      for (const file of walk(join(ROOT, dir))) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (/supplement_protocols/.test(stripComments(line))) {
            dirty.push(`${file}:${i + 1}`);
          }
        });
      }
    }
    expect(dirty, `referencias vivas encontradas:\n${dirty.join('\n')}`).toEqual([]);
  });

  it('ninguna migración posterior a 198b la reintroduce', () => {
    const offenders = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && f > '199_drop_supplement_protocols.sql')
      .filter((f) => {
        const code = readFileSync(join(MIGRATIONS_DIR, f), 'utf8')
          .split('\n').map(stripComments).join('\n');
        return /supplement_protocols/i.test(code);
      });
    expect(offenders).toEqual([]);
  });
});
