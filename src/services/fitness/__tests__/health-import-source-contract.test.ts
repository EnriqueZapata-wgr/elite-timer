/**
 * NOCTURNO B1 — contrato: los valores de `source` que el código puede mandar
 * contra los que la tabla acepta.
 *
 * El bug que este test entierra: 036 creó el CHECK con 4 valores, el código
 * de import manda 'health_connect'/'healthkit', y 225 declaró el cambio en un
 * comentario sin escribir el ALTER. Falló siempre, para todos, en las dos
 * plataformas. Este error es de una familia que vuelve: por eso el cruce vive
 * en un test y no en una nota.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HEALTH_SOURCES } from '../health-import-core';

const readMig = (file: string) =>
  readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');

/** SQL ejecutable: fuera comentarios `--` (contaminan el regex del CHECK). */
const exec = (sql: string) =>
  sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');

/** Extrae los literales del CHECK (source IN (...)). */
function sourcesDelCheck(sql: string): string[] {
  const m = exec(sql).match(/CHECK\s*\(\s*source\s+IN\s*\(([^)]+)\)\s*\)/i);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const CHECK_036 = sourcesDelCheck(readMig('036_fitness_deep.sql'));
const CHECK_246 = sourcesDelCheck(readMig('246_cardio_source_health.sql'));

describe('contrato source: código vs cardio_sessions', () => {
  it('los CHECK se extrajeron (guard del regex)', () => {
    expect(CHECK_036.length).toBeGreaterThanOrEqual(4);
    expect(CHECK_246.length).toBeGreaterThanOrEqual(6);
  });

  it('todo valor que el código puede mandar está permitido por el CHECK vigente', () => {
    // Lo que manda el import (runtime real) + el manual hardcodeado en
    // app/execution.tsx y fitness-service.ts.
    const delCodigo = [...HEALTH_SOURCES, 'manual'];
    for (const v of delCodigo) {
      expect(CHECK_246, `'${v}' no está permitido por el CHECK de 246`).toContain(v);
    }
  });

  it('246 es superset de 036 (ADD CONSTRAINT valida filas existentes)', () => {
    for (const v of CHECK_036) {
      expect(CHECK_246, `246 perdió '${v}' del set original: el push rompería`).toContain(v);
    }
  });

  it('246 tira el constraint viejo antes de agregar el nuevo', () => {
    // Sin el DROP, el ADD crearía un segundo check aditivo y el viejo
    // seguiría rechazando health_connect/healthkit.
    expect(exec(readMig('246_cardio_source_health.sql'))).toMatch(
      /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+cardio_sessions_source_check/i,
    );
  });
});
