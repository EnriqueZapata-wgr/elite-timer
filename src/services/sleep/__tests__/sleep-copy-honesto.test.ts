/**
 * MB-30A P4 — el copy no promete fases: el sensor mide niveles de sonido,
 * y punto. Ni "profundo", ni "REM", ni "etapa", ni "ciclo de sueño", ni
 * "fases de sueño" en NINGÚN texto visible del módulo (brief: sin fases y
 * sin prometerlas).
 *
 * El barrido corre sobre el código SIN comentarios (un comentario técnico
 * puede nombrar lo que el copy no puede prometer) y truena señalando el
 * archivo y la palabra. La mutación que meta una promesa de fase muere aquí.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARCHIVOS_DEL_MODULO = [
  'app/sleep.tsx',
  'app/sleep-session.tsx',
  ...readdirSync(resolve(process.cwd(), 'src/services/sleep'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `src/services/sleep/${f}`),
];

/** Palabras que prometen medir lo que el micrófono NO mide. */
const PROHIBIDAS: { nombre: string; re: RegExp }[] = [
  { nombre: 'profundo', re: /profund/i },
  { nombre: 'REM', re: /\bREM\b/i },
  { nombre: 'etapa', re: /etapa/i },
  { nombre: 'ciclo de sueño', re: /ciclos?\s+de(l)?\s+sueño/i },
  { nombre: 'fases de sueño', re: /fases?\s+de(l)?\s+sueño/i },
];

/** Código sin comentarios, CRLF-safe (lección del test de 246 en Windows). */
const sinComentarios = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('barrido de copy: sin fases y sin prometerlas', () => {
  it('el barrido lee archivos de verdad (guard)', () => {
    expect(ARCHIVOS_DEL_MODULO.length).toBeGreaterThanOrEqual(8);
  });

  for (const rel of ARCHIVOS_DEL_MODULO) {
    it(`${rel} no promete lo que no mide`, () => {
      const src = sinComentarios(readFileSync(resolve(process.cwd(), rel), 'utf8'));
      for (const { nombre, re } of PROHIBIDAS) {
        expect(re.test(src), `"${nombre}" apareció en ${rel} — el copy no puede insinuarlo`).toBe(false);
      }
    });
  }

  it('la pantalla de Sueño tampoco promete "fases" a secas en su copy', () => {
    // La palabra suelta ("ver tus fases aquí") es la forma más fácil de
    // recaer. Se permite el identificador de estado `Fase` de la pantalla
    // nocturna; por eso este check es solo sobre app/sleep.tsx.
    const src = sinComentarios(readFileSync(resolve(process.cwd(), 'app/sleep.tsx'), 'utf8'));
    expect(/\bfases?\b/i.test(src), '"fases" volvió al copy de app/sleep.tsx').toBe(false);
  });
});
