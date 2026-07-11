/**
 * GUARDS ESTÁTICOS del hardening pre-launch (Bloque 1 del megabuzón 2026-07-11).
 *
 * Patrón del test anti-leak: leen los archivos fuente como texto y verifican
 * invariantes de seguridad/copy que no se pueden testear en runtime node-only
 * (el proxy es Deno; el system prompt vive en un servicio con imports RN).
 *
 * 1.1 — argos-proxy valida server-side que 'dx_generation_first' (0 H+) solo
 *       aplique a users sin functional_dx previo (task #23).
 * 1.2 — las 3 frases canónicas de error de Mariana (doc 06, >>) viven VERBATIM
 *       en el system prompt de ARGOS (task #24).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const proxySrc = readFileSync(
  join(ROOT, 'supabase', 'functions', 'argos-proxy', 'index.ts'),
  'utf8',
);
const argosServiceSrc = readFileSync(join(ROOT, 'src', 'services', 'argos-service.ts'), 'utf8');

describe('hardening 1.1 · dx_generation_first server-side (argos-proxy)', () => {
  it('el proxy contiene la validación contra functional_dx', () => {
    expect(proxySrc).toContain('dx_generation_first');
    expect(proxySrc).toContain('from("functional_dx")');
  });

  it('con DX previo, el requestType se fuerza a dx_generation regular', () => {
    // El bloque de hardening debe reasignar requestType = "dx_generation".
    const block = proxySrc.slice(proxySrc.indexOf('HARDENING 1.1'));
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('requestType = "dx_generation"');
  });

  it('requestType es reasignable (let), no const destructurado', () => {
    // Si alguien revierte a destructurar requestType como const, el forzado
    // del hardening deja de compilar/aplicar — este guard lo detecta antes.
    expect(proxySrc).toContain('let requestType');
    expect(proxySrc).not.toMatch(/const \{[^}]*\brequestType\b[^}]*\} = body/);
  });
});

describe('hardening 1.2 · frases canónicas de error en ARGOS_SYSTEM_PROMPT', () => {
  const CANONICAL_ERRORS = [
    'Todavía no te conozco lo suficiente. Sigue registrando hábitos y datos.',
    'Eso es tema de tu médico o nutricionista clínico, {nombre}. Yo no diagnostico.',
    'Lamento la frustración. Estoy aquí para ayudarte, intentemos de nuevo.',
  ];

  it.each(CANONICAL_ERRORS)('frase VERBATIM presente: %s', (frase) => {
    expect(argosServiceSrc).toContain(frase);
  });

  it('las frases viven dentro del system prompt (antes del cierre del template)', () => {
    const promptStart = argosServiceSrc.indexOf('const ARGOS_SYSTEM_PROMPT');
    const errorSection = argosServiceSrc.indexOf('Frases canónicas de ERROR');
    expect(promptStart).toBeGreaterThan(-1);
    expect(errorSection).toBeGreaterThan(promptStart);
  });
});
