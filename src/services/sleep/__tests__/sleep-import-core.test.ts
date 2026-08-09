/**
 * MB-30A P2 — normalización del sueño importado (HC/HK) a noches.
 *
 * Lo que se protege: una noche partida en segmentos se vuelve UNA noche;
 * las siestas no se vuelven "la noche"; y por fecha local de despertar
 * queda un solo registro (el racimo más dormido).
 */
import { describe, it, expect } from 'vitest';
import {
  esValorDormidoHK,
  HUECO_MISMA_NOCHE_MS,
  MIN_NOCHE_IMPORT_MINUTOS,
  nochesDesdeTramos,
  type TramoSueno,
} from '../sleep-import-core';

const aFechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ms = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo - 1, d, h, mi, 0, 0).getTime();

describe('nochesDesdeTramos', () => {
  it('una noche partida en segmentos es UNA noche: suma dormido, no el hueco', () => {
    const tramos: TramoSueno[] = [
      { startMs: ms(2026, 8, 8, 23, 0), endMs: ms(2026, 8, 9, 2, 0), externalId: 'a' },
      { startMs: ms(2026, 8, 9, 2, 30), endMs: ms(2026, 8, 9, 6, 30), externalId: 'b' },
    ];
    const noches = nochesDesdeTramos(tramos, 'healthkit', aFechaLocal);
    expect(noches).toHaveLength(1);
    const n = noches[0];
    expect(n.nightDate).toBe('2026-08-09'); // el día en que DESPIERTAS
    expect(n.durationMinutes).toBe(180 + 240); // el hueco despierto NO cuenta
    expect(new Date(n.bedTimeISO).getHours()).toBe(23);
    expect(new Date(n.wakeTimeISO).getHours()).toBe(6);
    expect(n.externalId).toBe('b'); // el tramo más largo nombra la noche
    expect(n.source).toBe('healthkit');
  });

  it('una siesta corta no se vuelve "la noche"', () => {
    const tramos: TramoSueno[] = [
      { startMs: ms(2026, 8, 9, 15, 0), endMs: ms(2026, 8, 9, 15, 45), externalId: 's' },
    ];
    expect(nochesDesdeTramos(tramos, 'health_connect', aFechaLocal)).toHaveLength(0);
    expect(MIN_NOCHE_IMPORT_MINUTOS).toBe(60);
  });

  it('noche y siesta larga el mismo día: gana el racimo más dormido', () => {
    const tramos: TramoSueno[] = [
      // Noche real: 23:30 → 06:30 (7 h)
      { startMs: ms(2026, 8, 8, 23, 30), endMs: ms(2026, 8, 9, 6, 30), externalId: 'noche' },
      // Siesta de 90 min esa tarde (pasa el mínimo, pero no es la noche)
      { startMs: ms(2026, 8, 9, 13, 0), endMs: ms(2026, 8, 9, 14, 30), externalId: 'siesta' },
    ];
    const noches = nochesDesdeTramos(tramos, 'health_connect', aFechaLocal);
    expect(noches).toHaveLength(1);
    expect(noches[0].externalId).toBe('noche');
    expect(noches[0].durationMinutes).toBe(420);
  });

  it('un hueco mayor a 2 h separa racimos', () => {
    expect(HUECO_MISMA_NOCHE_MS).toBe(2 * 60 * 60 * 1000);
    const tramos: TramoSueno[] = [
      { startMs: ms(2026, 8, 8, 22, 0), endMs: ms(2026, 8, 9, 1, 0), externalId: 'a' },
      // 3.5 h despierto: otro racimo (madrugada de insomnio real)
      { startMs: ms(2026, 8, 9, 4, 30), endMs: ms(2026, 8, 9, 7, 0), externalId: 'b' },
    ];
    const noches = nochesDesdeTramos(tramos, 'healthkit', aFechaLocal);
    // Ambos racimos terminan el 9: queda uno (el más dormido, 3 h vs 2.5 h).
    expect(noches).toHaveLength(1);
    expect(noches[0].externalId).toBe('a');
  });

  it('dos noches en fechas distintas producen dos registros ordenados', () => {
    const tramos: TramoSueno[] = [
      { startMs: ms(2026, 8, 9, 23, 0), endMs: ms(2026, 8, 10, 6, 0), externalId: 'n2' },
      { startMs: ms(2026, 8, 8, 23, 0), endMs: ms(2026, 8, 9, 6, 0), externalId: 'n1' },
    ];
    const noches = nochesDesdeTramos(tramos, 'health_connect', aFechaLocal);
    expect(noches.map((n) => n.nightDate)).toEqual(['2026-08-09', '2026-08-10']);
  });

  it('tramos inválidos se filtran sin tronar', () => {
    const tramos: TramoSueno[] = [
      { startMs: Number.NaN, endMs: ms(2026, 8, 9, 6, 0), externalId: 'x' },
      { startMs: ms(2026, 8, 9, 6, 0), endMs: ms(2026, 8, 9, 5, 0), externalId: 'y' }, // fin < inicio
    ];
    expect(nochesDesdeTramos(tramos, 'healthkit', aFechaLocal)).toEqual([]);
  });
});

describe('esValorDormidoHK', () => {
  it('dormido: 1 (sin especificar), 3, 4 y 5; fuera: 0 (en cama) y 2 (despierto)', () => {
    expect(esValorDormidoHK(1)).toBe(true);
    expect(esValorDormidoHK(3)).toBe(true);
    expect(esValorDormidoHK(4)).toBe(true);
    expect(esValorDormidoHK(5)).toBe(true);
    expect(esValorDormidoHK(0)).toBe(false);
    expect(esValorDormidoHK(2)).toBe(false);
  });
});
