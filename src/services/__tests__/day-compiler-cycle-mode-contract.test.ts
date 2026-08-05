/**
 * MB-22.1 P4 — contrato: day-compiler respeta el modo del Ciclo.
 *
 * El filtro de period_log en acompañante era borrable sin que fallara nada.
 * Mismo patrón que day-compiler-supplements-contract: compileDay es I/O puro
 * de punta a punta y sus 20+ queries hacen impráctico el test conductual —
 * el contrato amarra las tres piezas en el FUENTE (sin comentarios, lección
 * CRLF), y borrar cualquiera truena aquí.
 *
 * Qué protege:
 *   1. La query del modo (user_app_modes, app_key ciclo) vive en el compile.
 *   2. cycleMode se deriva de esa respuesta.
 *   3. booleanElectrons filtra period_log cuando el modo es acompañante —
 *      el calendario de OTRA persona no palomea ni puntúa el hábito
 *      "Registrar ciclo" del usuario.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Código ejecutable: fuera comentarios. Split con /\r?\n/ (lección CRLF). */
const compiler = readFileSync(
  resolve(process.cwd(), 'src/services/day-compiler.ts'),
  'utf8',
)
  .split(/\r?\n/)
  .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
  .join('\n');

describe('contrato: period_log nunca palomea con un ciclo de acompañante', () => {
  it('el compile consulta el modo del ciclo (user_app_modes)', () => {
    const m = compiler.match(
      /from\('user_app_modes'\)[\s\S]*?\.eq\('app_key',\s*'ciclo'\)/,
    );
    expect(m, 'la query del modo del ciclo desapareció del compile').toBeTruthy();
  });

  it('cycleMode se deriva de la respuesta (no de un literal)', () => {
    expect(compiler).toMatch(/const cycleMode\s*=\s*\(cycleModeRes\.data as any\)\?\.mode/);
  });

  it('booleanElectrons filtra period_log en acompañante', () => {
    const bloque = compiler.match(
      /const booleanElectrons[\s\S]*?\.map\(/,
    );
    expect(bloque, 'el pipeline de booleanElectrons cambió — actualiza este contrato').toBeTruthy();
    expect(
      bloque![0],
      'EL FILTRO DEL MODO SE BORRÓ: period_log palomearía con el ciclo de otra persona',
    ).toMatch(/period_log.*cycleMode\s*!==\s*'acompanante'/);
    // El gate de género sigue vivo al lado (no se sustituyen entre sí).
    expect(bloque![0]).toMatch(/FEMALE_ONLY_ELECTRONS/);
  });
});
