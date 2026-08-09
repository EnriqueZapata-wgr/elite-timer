/**
 * MB-30A P4 — contrato: lo que el código de sueño puede mandar contra lo
 * que la tabla acepta, y la regla "una noche, un registro" EN LA BASE.
 *
 * Lección MB-27 (246): el import de cardio falló siempre porque el CHECK
 * de source nunca aceptó los valores del código (el ALTER vivía en un
 * comentario). Este cruce vive en un test desde el DÍA UNO de la 261.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLEEP_SOURCES } from '../sleep-core';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

/** SQL/TS ejecutable: fuera comentarios (CRLF-safe — lección del test de 246). */
const exec = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/(?:--|\/\/).*$/, ''))
    .join('\n');

const MIG_261 = read('supabase/migrations/261_sleep_nights.sql');

function sourcesDelCheck(sql: string): string[] {
  const m = exec(sql).match(/CHECK\s*\(\s*source\s+IN\s*\(([^)]+)\)\s*\)/i);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('contrato source: código vs sleep_nights (261)', () => {
  it('el CHECK se extrajo (guard del regex)', () => {
    expect(sourcesDelCheck(MIG_261).length).toBeGreaterThanOrEqual(3);
  });

  it('todo valor que el código puede mandar está permitido por el CHECK', () => {
    const check = sourcesDelCheck(MIG_261);
    for (const v of SLEEP_SOURCES) {
      expect(check, `'${v}' no está permitido por el CHECK de 261`).toContain(v);
    }
  });

  it('la tabla nace con RLS y policy (regla 4 de CLAUDE.md)', () => {
    const sql = exec(MIG_261);
    expect(sql).toMatch(/ALTER\s+TABLE\s+sleep_nights\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(/CREATE\s+POLICY/i);
  });

  it('una noche, un registro: UNIQUE (user_id, night_date) en la base', () => {
    expect(exec(MIG_261)).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*night_date\s*\)/i);
  });
});

describe('quién manda cuando hay dos fuentes de la misma noche', () => {
  const sesion = exec(read('src/services/sleep/sleep-session-service.ts'));
  const importSvc = exec(read('src/services/sleep/sleep-import-service.ts'));

  it('la sesión PROPIA pisa: upsert por (user_id, night_date) SIN ignoreDuplicates', () => {
    expect(sesion).toMatch(/\.upsert\(/);
    expect(sesion).toMatch(/onConflict:\s*'user_id,night_date'/);
    expect(sesion, 'la propia dejó de mandar: un ignoreDuplicates la volvería segunda').not.toContain(
      'ignoreDuplicates',
    );
  });

  it('el import NUNCA pisa: upsert con ignoreDuplicates (ON CONFLICT DO NOTHING)', () => {
    expect(importSvc).toMatch(/onConflict:\s*'user_id,night_date'/);
    expect(importSvc).toMatch(/ignoreDuplicates:\s*true/);
  });

  it('el import jamás inventa score ni ronquido (números que no midió)', () => {
    expect(importSvc).toMatch(/score:\s*null/);
    expect(importSvc).toMatch(/snore_minutes:\s*null/);
  });
});
