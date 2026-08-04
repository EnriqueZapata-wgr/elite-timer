/**
 * MB-20.4 · Pieza 4 — el riesgo del gesto barato, amarrado.
 *
 * Palomear escribe en el ledger, y con la inversión (P1) la escritura pasó
 * al gesto más barato en una pantalla llena de blancos de media pantalla.
 * Las dos mitigaciones que este contrato vigila:
 *
 *   4.1 Despalomear cuesta lo mismo que palomear: el MISMO tap, el MISMO
 *       handler (toggle), en la fila de hechas.
 *   4.2 Un toque accidental no deja residuo: el award es idempotente por
 *       (user, source, día) — palomear, despalomear y volver a palomear
 *       las veces que sea deja EXACTAMENTE un electrón, y nunca borra el
 *       que ya estaba.
 *
 * Vitest node no habla con supabase: el contrato se lee del SOURCE (mismo
 * patrón que reconcile-core.test.ts) y la garantía del índice único se
 * verifica replicando su semántica exacta sobre la secuencia del gesto.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

const acciones = leer('src/services/hoy/tarea-actions.ts');
const electrones = leer('src/services/electron-service.ts');
const vista = leer('src/components/hoy/TareasView.tsx');

describe('4.1 · despalomear es igual de fácil que palomear', () => {
  it('el handler es un toggle: el mismo tap hace y deshace', () => {
    expect(vista).toMatch(/const next = !t\.completed/);
  });

  it('la fila de hechas recibe el MISMO handler de palomeo que la card', () => {
    // Las tres superficies comparten handlePalomear: deshacer no tiene un
    // camino más caro que hacer.
    const cableados = vista.match(/onPalomear=\{handlePalomear\}/g) ?? [];
    expect(cableados.length).toBeGreaterThanOrEqual(3);
  });
});

describe('4.2 · el otorgamiento es idempotente por día', () => {
  it('persistBooleanToggle otorga con la key determinística user:source:día', () => {
    expect(acciones).toMatch(/idempotencyKey: `\$\{userId\}:\$\{source\}:\$\{today\}`/);
  });

  it('y revoca en el toggle off — la misma puerta, en reversa', () => {
    expect(acciones).toMatch(/await revokeBooleanElectron\(userId, source as never\)/);
  });

  it('el award tolera el retry: 23505 (ya otorgado hoy) es éxito, no un doble insert', () => {
    expect(electrones).toMatch(/error\.code === '23505'\) return true/);
    expect(electrones).toMatch(/idempotency_key: idemKey/);
  });

  it('el revoke borra SOLO el día actual de ese source', () => {
    expect(electrones).toMatch(
      /revokeBooleanElectron[\s\S]{0,400}\.delete\(\)[\s\S]{0,200}\.eq\('user_id', userId\)[\s\S]{0,100}\.eq\('source', source\)[\s\S]{0,100}\.eq\('date', today\)/,
    );
  });

  it('palomear ×3 con despalomeos en medio deja EXACTAMENTE un electrón', () => {
    // La semántica exacta del ledger que el contrato de arriba amarra:
    // INSERT con key determinística (el duplicado colapsa vía 23505) y
    // DELETE por (user, source, día). Sobre ella, la secuencia del toque
    // accidental no puede dejar residuo ni multiplicar.
    const key = (u: string, s: string, d: string) => `${u}:${s}:${d}`;
    const ledger = new Set<string>();
    const palomear = () => ledger.add(key('u1', 'cold_shower', '2026-08-03'));
    const despalomear = () => ledger.delete(key('u1', 'cold_shower', '2026-08-03'));

    palomear(); despalomear();
    palomear(); despalomear();
    palomear();
    expect(ledger.size).toBe(1);

    // Y el electrón que YA estaba no se borra por re-palomear: el insert
    // duplicado colapsa al mismo row.
    palomear();
    expect(ledger.size).toBe(1);
  });
});
