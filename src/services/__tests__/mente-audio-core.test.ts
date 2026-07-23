import { describe, it, expect } from 'vitest';
import {
  shouldClearPosition, sessionTypeFor, electronSourceFor,
  effectiveListenDelta, parseProgressEntry, serializeProgressEntry,
} from '../mente-audio-core';

describe('shouldClearPosition (retomar donde quedó)', () => {
  it('al inicio (<10s) no se guarda', () => {
    expect(shouldClearPosition(0, 600)).toBe(true);
    expect(shouldClearPosition(9.9, 600)).toBe(true);
    expect(shouldClearPosition(10, 600)).toBe(false);
  });

  it('cerca del final (<30s restantes) se limpia', () => {
    expect(shouldClearPosition(571, 600)).toBe(true);
    expect(shouldClearPosition(570, 600)).toBe(false);
    expect(shouldClearPosition(300, 600)).toBe(false);
  });

  it('pieza corta (pausa 1min, 68s): guarda a media pieza, limpia cerca del final', () => {
    expect(shouldClearPosition(20, 68)).toBe(false); // restan 48s → se guarda
    expect(shouldClearPosition(45, 68)).toBe(true);  // restan 23s → se limpia
  });
});

describe('sessionTypeFor / electronSourceFor (CHECK mig 049 + espejo pantallas)', () => {
  it('respiración → breathing → breathwork', () => {
    expect(sessionTypeFor('respiracion')).toBe('breathing');
    expect(electronSourceFor('breathing')).toBe('breathwork');
  });

  it('meditación y descanso → meditation → meditation', () => {
    expect(sessionTypeFor('meditacion')).toBe('meditation');
    expect(sessionTypeFor('descanso')).toBe('meditation');
    expect(electronSourceFor('meditation')).toBe('meditation');
  });
});

describe('effectiveListenDelta (delta economía: seeks no cuentan)', () => {
  it('avance normal de reproducción suma (ticks de ~0.5s)', () => {
    expect(effectiveListenDelta(10, 10.5)).toBeCloseTo(0.5);
    expect(effectiveListenDelta(10, 12)).toBeCloseTo(2); // tope exacto
  });

  it('seek hacia adelante NO suma (brincar al final no cuenta)', () => {
    expect(effectiveListenDelta(10, 13)).toBe(0);   // salto >2s
    expect(effectiveListenDelta(5, 590)).toBe(0);   // brinco al final
  });

  it('seek hacia atrás / pausa / sin avance NO suman', () => {
    expect(effectiveListenDelta(60, 45)).toBe(0);
    expect(effectiveListenDelta(60, 60)).toBe(0);
  });

  it('valores no finitos no suman', () => {
    expect(effectiveListenDelta(NaN, 10)).toBe(0);
    expect(effectiveListenDelta(10, NaN)).toBe(0);
  });

  it('acumulando ticks reales se alcanza el 80%; con seek no', () => {
    // 600s de pieza: 960 ticks de 0.5s = 480s efectivos = 80%.
    let listened = 0;
    for (let t = 0; t < 480; t += 0.5) listened += effectiveListenDelta(t, t + 0.5);
    expect(listened).toBeCloseTo(480);
    // Mismo punto pero saltando de 60s a 590s: solo suma lo reproducido.
    let cheated = 0;
    for (let t = 0; t < 60; t += 0.5) cheated += effectiveListenDelta(t, t + 0.5);
    cheated += effectiveListenDelta(60, 590); // seek → 0
    expect(cheated).toBeCloseTo(60);
  });
});

describe('parseProgressEntry / serializeProgressEntry (progreso persistido)', () => {
  it('formato viejo (número = posición) se lee con listened 0', () => {
    expect(parseProgressEntry(120)).toEqual({ position: 120, listened: 0 });
  });

  it('formato nuevo {p, l} roundtrip', () => {
    const stored = serializeProgressEntry(120.7, 95.4);
    expect(stored).toEqual({ p: 120, l: 95 });
    expect(parseProgressEntry(stored)).toEqual({ position: 120, listened: 95 });
  });

  it('entradas inválidas → null (empieza de cero)', () => {
    expect(parseProgressEntry(undefined)).toBe(null);
    expect(parseProgressEntry(null)).toBe(null);
    expect(parseProgressEntry(0)).toBe(null);
    expect(parseProgressEntry(-5)).toBe(null);
    expect(parseProgressEntry({ p: NaN, l: 3 })).toBe(null);
    expect(parseProgressEntry('120')).toBe(null);
  });

  it('listened corrupto se degrada a 0 sin perder la posición', () => {
    expect(parseProgressEntry({ p: 200, l: 'x' })).toEqual({ position: 200, listened: 0 });
    expect(parseProgressEntry({ p: 200, l: -4 })).toEqual({ position: 200, listened: 0 });
  });
});
