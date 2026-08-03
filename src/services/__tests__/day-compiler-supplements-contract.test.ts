/**
 * MB-20.3 P2 — contrato: el ledger de suplementos no depende de la lista de
 * activos.
 *
 * El bug que este test entierra: el run anterior unificó la fuente en el
 * embed de user_supplements con is_active=true, y supplementsTodayProgress
 * descarta los logs que no estén en esa lista. En producción hay 143 logs
 * taken=true de suplementos hoy inactivos: para esos usuarios `completed`
 * caía a false y — como supplements vive en el reconcile — el electrón del
 * día se borraba. Desactivar un suplemento después de tomártelo es uso
 * normal, no ausencia de actividad.
 *
 * Las dos preguntas quedan separadas:
 *   · LEDGER: ¿te lo tomaste hoy? → count directo de supplement_logs
 *     con taken=true, sin filtro de activos.
 *   · CARD: ¿cuántas tomas de tus suplementos ACTIVOS llevas? → el embed
 *     (suppProgress), que solo alimenta datosVivos.
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

describe('contrato: ledger de suplementos vs card', () => {
  it('existe la consulta directa del ledger: logs taken=true de hoy, sin filtro de activos', () => {
    const m = compiler.match(/from\('supplement_logs'\)[\s\S]*?head:\s*true[\s\S]*?\.eq\('taken',\s*true\)/);
    expect(m, 'el count directo de supplement_logs desapareció').toBeTruthy();
    expect(m![0]).not.toMatch(/is_active/);
  });

  it('la evidencia de supplements sale del count, nunca de suppProgress', () => {
    // Solo el bloque de evidencia (el que alimenta al reconcile);
    // datosVivos sí usa suppProgress y debe seguir usándolo.
    const bloque = compiler.match(/const verifiedEvidencia[\s\S]*?\};/);
    expect(bloque, 'verifiedEvidencia desapareció — actualiza este contrato').toBeTruthy();
    expect(bloque![0]).toMatch(/supplements:.*suppTakenCountRes/);
    expect(bloque![0]).not.toMatch(/suppProgress/);
  });

  it('el embed de activos sigue vivo, pero solo para la card (datosVivos)', () => {
    expect(compiler).toMatch(/from\('user_supplements'\)[\s\S]*?\.eq\('is_active',\s*true\)/);
    expect(compiler).toMatch(/supplements:\s*suppProgress\.total > 0 \? suppProgress : null/);
  });
});
