/**
 * Candado de copy: CERO em dashes en texto que ve el usuario.
 *
 * Es una regla vieja de la casa que se rompia sola porque nadie la vigilaba:
 * habia dos tests que la exigian, pero cada uno sobre UNA sola cadena
 * (useTareaGesto-contrato y orb-tour-core). El 29-ago-2026 se limpiaron 23
 * ocurrencias de prosa repartidas en 14 archivos, y este test existe para que
 * no vuelvan.
 *
 * QUE SE PROHIBE, y que NO:
 *  · Prohibido: el em dash como signo de puntuacion DENTRO de una frase, o
 *    sea con letras a los dos lados. En español de Mexico casi siempre se
 *    sustituye por dos puntos, punto y seguido, o coma.
 *  · Permitido: el em dash SOLO, como glifo de "no hay dato" (`'—'`). Es un
 *    marcador de interfaz, no puntuacion, y esta usado a proposito en unas
 *    cuarenta tarjetas de reportes. Ese uso es el que dice la verdad cuando
 *    no se sabe algo, asi que no se toca.
 *  · Permitido: em dashes en COMENTARIOS de codigo. Este documento y medio
 *    repositorio estan escritos asi; la regla es sobre el producto, no sobre
 *    las notas del equipo.
 *
 * Si este test truena, no lo relajes: cambia el texto. Casi siempre queda
 * mejor con dos puntos.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAICES = ['app', 'src/components', 'src/screens'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      // Los tests pueden llevar em dashes en sus propias descripciones.
      if (name !== '__tests__' && name !== 'node_modules') out.push(...walk(p));
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      out.push(p.replace(/\\/g, '/'));
    }
  }
  return out;
}

/** Letra, al menos dos, a cada lado del em dash dentro de la MISMA cadena. */
const PROSA = /\p{L}{2}[^'"`]{0,120}—[^'"`]{0,120}\p{L}{2}/u;

/** Cadenas literales de una linea: 'x', "x" o `x` (sin anidar la comilla). */
const CADENAS = /(['"`])((?:(?!\1).)*)\1/g;

function ofensasDe(archivo: string): string[] {
  const malas: string[] = [];
  readFileSync(archivo, 'utf8').split(/\r?\n/).forEach((linea, i) => {
    if (!linea.includes('—')) return;
    const t = linea.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    for (const m of linea.matchAll(CADENAS)) {
      if (m[2].includes('—') && PROSA.test(m[2])) {
        malas.push(`${archivo}:${i + 1} → ${m[2].trim().slice(0, 90)}`);
        break;
      }
    }
  });
  return malas;
}

describe('Copy de usuario: cero em dashes', () => {
  const archivos = RAICES.flatMap((r) => walk(r));

  it('el barrido encuentra archivos (si no, el candado no vigila nada)', () => {
    expect(archivos.length).toBeGreaterThan(300);
  });

  it('ninguna cadena de interfaz usa el em dash como puntuación', () => {
    const ofensas = archivos.flatMap(ofensasDe);
    expect(ofensas, `Cambia el em dash por dos puntos, punto y seguido o coma:\n${ofensas.join('\n')}`)
      .toEqual([]);
  });

  it('el em dash SOLO, como marcador de "sin dato", sigue permitido', () => {
    // Contrato explicito: si alguien endurece el regex y rompe esto, sabra
    // que se llevo por delante el glifo de dato ausente.
    expect(PROSA.test('—')).toBe(false);
    expect(PROSA.test('— promedio')).toBe(false);
    expect(PROSA.test('No es terapia — es fisiología.')).toBe(true);
  });
});
