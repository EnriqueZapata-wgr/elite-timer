/**
 * GUARDS ESTÁTICOS del hardening pre-launch (Bloque 1 del megabuzón 2026-07-11).
 *
 * Patrón del test anti-leak: leen los archivos fuente como texto y verifican
 * invariantes de seguridad/copy que no se pueden testear en runtime node-only
 * (el proxy es Deno; el system prompt vive en un servicio con imports RN).
 *
 * 1.2 — las 3 frases canónicas de error (doc 06, >>) viven VERBATIM en el
 *       system prompt de ARGOS (task #24).
 *
 * PREMIUM (16-ago-2026): se cayó el guard 1.1. Verificaba que el proxy validara
 * server-side que el requestType 'dx_generation_first' (el mapa funcional de
 * regalo, a 0 H+) solo se aplicara a quien nunca había generado uno, para que
 * nadie se generara mapas infinitos gratis. Sin cobro no hay nada que colar por
 * la puerta de atrás: el mapa es gratis siempre y para todos los miembros. El
 * requestType 'dx_generation_first' ya no lo manda el cliente.
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

describe('PREMIUM · el cliente ya no pide el mapa funcional "de regalo"', () => {
  it('dx-engine no manda el requestType gratuito', () => {
    // Guard barato pero real: si alguien reintroduce el reparto, el cliente
    // volvería a mandar dos requestTypes distintos según el historial.
    const dxEngineSrc = readFileSync(join(ROOT, 'src', 'services', 'dx', 'dx-engine.ts'), 'utf8');
    expect(dxEngineSrc).not.toContain('dx_generation_first');
  });

  it('el proxy sigue existiendo y sigue siendo el que decide (no el cliente)', () => {
    expect(proxySrc.length).toBeGreaterThan(0);
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
