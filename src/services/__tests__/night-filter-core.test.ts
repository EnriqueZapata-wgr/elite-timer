/**
 * MB-30B P5 — núcleo del filtro nocturno: la rampa y su espejo Kotlin.
 *
 * La progresión vive UNA vez en night-filter-core.ts y viaja serializada al
 * servicio Android. El fallback hardcodeado en Kotlin es una copia de
 * emergencia: el candado espejo de abajo la compara byte a byte contra la
 * fuente TS para que no puedan divergir en silencio.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  NIGHT_FILTER_RAMP, NIGHT_FILTER_END_MINUTES, NIGHT_FILTER_FALLBACK_CUTOFF,
  stopToArgb, rampStopsJson, relMinutes, colorAt, filterStateAt, minutesToHHMM,
} from '@/src/services/night-filter-core';

const CUTOFF = 21 * 60 + 45; // 21:45

describe('relMinutes — normalización alrededor de medianoche', () => {
  it('antes del corte es negativo, después positivo', () => {
    expect(relMinutes(CUTOFF - 90, CUTOFF)).toBe(-90);
    expect(relMinutes(CUTOFF, CUTOFF)).toBe(0);
    expect(relMinutes(CUTOFF + 30, CUTOFF)).toBe(30);
  });

  it('la madrugada siguiente cuenta como "después del corte"', () => {
    // 01:00 con corte 21:45 = 195 min después
    expect(relMinutes(60, CUTOFF)).toBe(195);
  });

  it('la tarde anterior queda fuera de rango (negativo lejano)', () => {
    // 14:00 con corte 21:45 = -465
    expect(relMinutes(14 * 60, CUTOFF)).toBe(-465);
  });
});

describe('filterStateAt — la ventana y la progresión', () => {
  it('a media tarde el filtro NO existe', () => {
    expect(filterStateAt(14 * 60, CUTOFF).active).toBe(false);
  });

  it('1h antes del corte entra el ámbar suave', () => {
    const s = filterStateAt(CUTOFF - 60, CUTOFF);
    expect(s.active).toBe(true);
    expect(s.color).toEqual({ r: 255, g: 191, b: 0, a: 0.1 });
  });

  it('61 min antes del corte todavía no hay nada', () => {
    expect(filterStateAt(CUTOFF - 61, CUTOFF).active).toBe(false);
  });

  it('al corte exacto: naranja', () => {
    expect(filterStateAt(CUTOFF, CUTOFF).color).toEqual({ r: 255, g: 140, b: 0, a: 0.22 });
  });

  it('1h después del corte: rojo pleno, y se SOSTIENE de madrugada', () => {
    const rojo = { r: 255, g: 60, b: 0, a: 0.34 };
    expect(filterStateAt(CUTOFF + 60, CUTOFF).color).toEqual(rojo);
    expect(filterStateAt(3 * 60, CUTOFF).color).toEqual(rojo); // 03:00
  });

  it('a las 05:00 sigue activo; a las 05:01 la mañana lo apaga', () => {
    expect(filterStateAt(NIGHT_FILTER_END_MINUTES, CUTOFF).active).toBe(true);
    expect(filterStateAt(NIGHT_FILTER_END_MINUTES + 1, CUTOFF).active).toBe(false);
  });

  it('interpola entre stops (mitad ámbar→naranja)', () => {
    const c = colorAt(-30);
    expect(c.r).toBe(255);
    expect(c.g).toBeGreaterThan(140);
    expect(c.g).toBeLessThan(191);
    expect(c.a).toBeCloseTo(0.16, 2);
  });
});

describe('serialización hacia Android', () => {
  it('stopToArgb produce int32 con signo (formato Android)', () => {
    // a=0.10 → 0x1A; a=0.22 → 0x38; a=0.34 → 0x57
    expect(stopToArgb(NIGHT_FILTER_RAMP[0])).toBe(0x1affbf00);
    expect(stopToArgb(NIGHT_FILTER_RAMP[1])).toBe(0x38ff8c00);
    expect(stopToArgb(NIGHT_FILTER_RAMP[2])).toBe(0x57ff3c00);
  });

  it('rampStopsJson es el contrato exacto [{at, argb}]', () => {
    const parsed = JSON.parse(rampStopsJson());
    expect(parsed).toEqual([
      { at: -60, argb: 0x1affbf00 },
      { at: 0, argb: 0x38ff8c00 },
      { at: 60, argb: 0x57ff3c00 },
    ]);
  });

  it('minutesToHHMM envuelve el día', () => {
    expect(minutesToHHMM(NIGHT_FILTER_FALLBACK_CUTOFF)).toBe('21:45');
    expect(minutesToHHMM(NIGHT_FILTER_FALLBACK_CUTOFF + 60 * 3)).toBe('00:45');
  });
});

// ─── Candado espejo TS ↔ Kotlin ─────────────────────────────────────────────
// El servicio Android trae un fallback por si el JSON no llega. Si alguien
// cambia la rampa en un solo lado, esto truena.

describe('espejo Kotlin (NightFilterService.kt)', () => {
  const KT = readFileSync(
    'modules/atp-night-filter/android/src/main/java/expo/modules/atpnightfilter/NightFilterService.kt',
    'utf8',
  );

  it('los offsets del fallback Kotlin son los de la rampa TS', () => {
    const m = /stopOffsets = intArrayOf\(([^)]+)\)/.exec(KT);
    expect(m, 'no encontré stopOffsets en el Kotlin').toBeTruthy();
    const offsets = m![1].split(',').map((s) => parseInt(s.trim(), 10));
    expect(offsets).toEqual(NIGHT_FILTER_RAMP.map((s) => s.at));
  });

  it('los colores del fallback Kotlin son los de la rampa TS', () => {
    // Greedy hasta el último paréntesis de la línea: los .toInt() traen ')'.
    const m = /stopColors = intArrayOf\((.+)\)/.exec(KT);
    expect(m, 'no encontré stopColors en el Kotlin').toBeTruthy();
    const hexes = [...m![1].matchAll(/0x([0-9A-Fa-f]{8})/g)].map((h) => parseInt(h[1], 16) | 0);
    expect(hexes).toEqual(NIGHT_FILTER_RAMP.map((s) => stopToArgb(s)));
  });

  it('corte fallback y fin de ventana coinciden', () => {
    expect(KT).toContain('cutoffMinutes = 21 * 60 + 45');
    expect(KT).toContain('endMinutes = 5 * 60');
  });

  it('la interpolación Kotlin clampa en los extremos como la TS', () => {
    expect(KT).toContain('if (rel <= stopOffsets.first()) return stopColors.first()');
    expect(KT).toContain('if (rel >= stopOffsets.last()) return stopColors.last()');
  });
});
