/**
 * MB-20.4 · P5.1 — el contrato del ledger, extendido al lado de ESCRITURA.
 *
 * El bug de las 110 filas nulas nació de escritores que insertaban en
 * exercise_logs sin `date` (logExerciseSet / logExerciseSets, ya borradas:
 * eran API exportada sin un solo llamador — una bomba esperando cableado).
 * El seguro del reconcile (MB-20.3) vigila el lado de lectura; este test
 * vigila donde nace el problema:
 *
 *   1. CENSO: los únicos archivos que insertan en exercise_logs son los
 *      conocidos. Un escritor nuevo truena aquí y se une al contrato.
 *   2. Cada fila que estampa `logged_at` estampa también su `date` local
 *      (todo insert construye ambas — el par que el bug rompía).
 *   3. La fábrica borrada no vuelve: exercise-service no inserta en
 *      exercise_logs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const RAICES = ['src', 'app'];
const INSERT_RE = /\.from\('exercise_logs'\)\s*\.insert\(/;

const sinComentarios = (src: string) =>
  src
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

/** Todos los .ts/.tsx bajo las raíces (sin node_modules ni __tests__). */
function archivos(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules' || nombre === '__tests__') continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) out.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre)) out.push(ruta);
  }
  return out;
}

const escritores = RAICES
  .flatMap((r) => archivos(resolve(process.cwd(), r)))
  .filter((f) => INSERT_RE.test(sinComentarios(readFileSync(f, 'utf8'))))
  .map((f) => f.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, ''));

const ESPERADOS = [
  'app/log-exercise.tsx',
  'src/services/fitness/workout-session-service.ts',
];

describe('exercise_logs — contrato de escritura (MB-20.4 P5.1)', () => {
  it('censo: SOLO los escritores conocidos insertan (uno nuevo debe unirse al contrato)', () => {
    expect(escritores.sort()).toEqual([...ESPERADOS].sort());
  });

  it('cada fila estampa logged_at Y date: el par que las filas nulas rompían', () => {
    for (const rel of ESPERADOS) {
      const src = sinComentarios(readFileSync(resolve(process.cwd(), rel), 'utf8'));
      const conHora = (src.match(/logged_at:/g) ?? []).length;
      // El par viaja junto en cada builder: logged_at y, en la línea
      // siguiente, su date local.
      const parCompleto = (src.match(/logged_at:[^\n]*\n\s*date: today,/g) ?? []).length;
      expect(conHora, `${rel}: builders con logged_at`).toBeGreaterThan(0);
      expect(parCompleto, `${rel}: cada logged_at debe llevar su date: today`).toBe(conHora);
    }
  });

  it('la fecha local sale de los helpers canónicos, no de un toISOString UTC', () => {
    // log-exercise usa getLocalToday(); workout-session deriva de endedAt con
    // toLocalDateString (idéntico hoy, y correcto en el reintento diferido).
    const logExercise = readFileSync(resolve(process.cwd(), 'app/log-exercise.tsx'), 'utf8');
    expect(logExercise).toMatch(/const today = getLocalToday\(\)/);
    const workout = readFileSync(
      resolve(process.cwd(), 'src/services/fitness/workout-session-service.ts'),
      'utf8',
    );
    expect(workout).toMatch(/const today = toLocalDateString\(input\.endedAt\)/);
  });

  it('la fábrica de fechas nulas no vuelve: exercise-service ya no inserta en exercise_logs', () => {
    const src = sinComentarios(
      readFileSync(resolve(process.cwd(), 'src/services/exercise-service.ts'), 'utf8'),
    );
    expect(INSERT_RE.test(src)).toBe(false);
    expect(src).not.toContain('logExerciseSet');
  });
});
