/**
 * MB-20.3 P1 — contrato: las consultas de recencia del compilador no pueden
 * dejar entrar fechas nulas.
 *
 * El bug que este test entierra: exercise_logs.date es nullable sin default
 * (045:38) y en producción la mitad de las filas son nulas. `ORDER BY date
 * DESC` pone NULLS FIRST, una fila nula se lleva el limit(1), `strength` da
 * false siempre — y como strength vive en el reconcile, cada compilación de
 * HOY borraba el electrón del día (peso 3.0). nback_sessions.date es la misma
 * bomba sin detonar (218:23).
 *
 * cardio_sessions, journal_entries y mind_sessions NO necesitan el guard:
 * su date es NOT NULL DEFAULT CURRENT_DATE — y eso también se verifica aquí,
 * para que nadie "arregle" de más ni la premisa cambie en silencio.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

/** Código ejecutable: fuera comentarios. Split con /\r?\n/ (lección CRLF). */
const exec = (src: string) =>
  src
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

const compiler = exec(read('src/services/day-compiler.ts'));

/** La cadena de la consulta: de from('tabla') a su maybeSingle(). */
function queryChain(table: string): string {
  const m = compiler.match(new RegExp(`from\\('${table}'\\)[\\s\\S]*?maybeSingle\\(\\)`));
  expect(m, `day-compiler ya no consulta ${table} con maybeSingle — actualiza este contrato`).toBeTruthy();
  return m![0];
}

describe('contrato: fechas nulas fuera de las consultas de recencia', () => {
  it('exercise_logs excluye date nulo (el bug que borraba el e- de fuerza)', () => {
    expect(queryChain('exercise_logs')).toMatch(/\.not\('date',\s*'is',\s*null\)/);
  });

  it('nback_sessions excluye date nulo (la misma bomba, sin detonar)', () => {
    expect(queryChain('nback_sessions')).toMatch(/\.not\('date',\s*'is',\s*null\)/);
  });

  it('la premisa de exercise_logs sigue vigente: date nullable sin default (045)', () => {
    // Si algún día una migración hace date NOT NULL con backfill, este test
    // avisa que el guard ya es opcional (no que haya que quitarlo).
    const mig = exec(read('supabase/migrations/045_fitness_deep.sql'));
    expect(mig).toMatch(/ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS date DATE\s*;/);
  });

  it('la premisa de los que NO llevan guard: date NOT NULL DEFAULT', () => {
    for (const [file, table] of [
      ['supabase/migrations/036_fitness_deep.sql', 'cardio_sessions'],
      ['supabase/migrations/033_journal_entries.sql', 'journal_entries'],
      ['supabase/migrations/049_mind_sessions.sql', 'mind_sessions'],
    ] as const) {
      const mig = exec(read(file));
      expect(mig, `${table} perdió su date NOT NULL DEFAULT`).toMatch(
        /date DATE NOT NULL DEFAULT CURRENT_DATE/,
      );
    }
  });
});
