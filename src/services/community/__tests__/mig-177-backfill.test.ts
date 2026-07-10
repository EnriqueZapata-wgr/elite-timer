/**
 * Guard de regresión del hotfix 2026-07-11 (migración 177).
 *
 * El backfill de user_profile_public debe filtrar profiles HUÉRFANOS (profiles.id
 * sin fila en auth.users, residuo legacy) con INNER JOIN auth.users. Sin ese
 * filtro, el FK user_profile_public_user_id_fkey aborta el db push completo.
 *
 * El harness es vitest node-only (sin Postgres), así que no podemos insertar un
 * profile huérfano y correr el backfill en vivo. Este test es el guard estático
 * equivalente: verifica que el INNER JOIN a auth.users (el mecanismo que filtra
 * los huérfanos) sigue presente y no se degradó a LEFT. La corrección del
 * comportamiento en vivo la valida el db push exitoso.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SQL = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/177_user_profile_public.sql'),
  'utf8',
);

/** Aísla el statement de backfill (INSERT ... SELECT ... ;). */
function backfillStatement(): string {
  const anchor = 'INSERT INTO user_profile_public (user_id, display_name, avatar_url';
  const idx = SQL.indexOf(anchor);
  expect(idx, 'no se encontró el INSERT de backfill').toBeGreaterThan(-1);
  const rest = SQL.slice(idx);
  return rest.slice(0, rest.indexOf(';') + 1);
}

describe('mig 177 · backfill filtra profiles huérfanos', () => {
  it('el backfill hace JOIN a auth.users', () => {
    expect(/JOIN\s+auth\.users/i.test(backfillStatement())).toBe(true);
  });

  it('el join a auth.users es INNER (no LEFT — un LEFT no filtraría huérfanos)', () => {
    const stmt = backfillStatement();
    expect(/INNER\s+JOIN\s+auth\.users\s+\w+\s+ON\s+\w+\.id\s*=\s*p\.id/i.test(stmt)).toBe(true);
    expect(/LEFT\s+JOIN\s+auth\.users/i.test(stmt)).toBe(false);
  });

  it('el backfill sigue siendo idempotente (ON CONFLICT DO NOTHING)', () => {
    expect(/ON CONFLICT \(user_id\) DO NOTHING/i.test(backfillStatement())).toBe(true);
  });
});
