/**
 * MB-20 Pieza 3 — contrato de la migración 247 contra el código que la usa.
 * La familia de errores de columna fantasma (400 silencioso) vuelve: por eso
 * el cruce vive en un test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/247_installed_apps.sql'),
  'utf8',
);
const service = readFileSync(
  resolve(process.cwd(), 'src/services/hoy/install-service.ts'),
  'utf8',
);

describe('migración 247 · installed_apps', () => {
  it('agrega la columna de forma idempotente sobre user_day_preferences', () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+user_day_preferences\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+installed_apps\s+TEXT\[\]/i,
    );
  });

  it('recarga el schema cache (patrón 098)', () => {
    expect(sql).toMatch(/NOTIFY\s+pgrst/i);
  });

  it('el servicio escribe exactamente esa columna y tolera su ausencia', () => {
    expect(service).toContain('installed_apps');
    // Retry de columna fantasma: sin él, un remoto sin la 247 rompe TODA la
    // escritura de prefs (el upsert es de la fila completa).
    expect(service).toMatch(/PGRST204|42703/);
  });
});
