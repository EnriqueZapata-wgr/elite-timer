import { describe, it, expect } from 'vitest';
import {
  shouldClearPosition, sessionTypeFor, electronSourceFor,
  applySeekToSkip, effectiveListenedAt, parseProgressEntry, serializeProgressEntry,
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

describe('applySeekToSkip (A0: neto de saltos-forward)', () => {
  it('seek adelante suma el brinco; seek atrás lo descuenta con clamp en 0', () => {
    let net = applySeekToSkip(0, 60, 160);   // +100
    expect(net).toBe(100);
    net = applySeekToSkip(net, 160, 60);     // −100 → 0
    expect(net).toBe(0);
    expect(applySeekToSkip(0, 300, 100)).toBe(0); // retroceder nunca regala crédito
  });

  it('scrubbing continuo encadena deltas (neto = destino final − origen)', () => {
    let net = 0;
    let pos = 100;
    for (const target of [140, 180, 220, 200]) { // drag adelante y ajusta atrás
      net = applySeekToSkip(net, pos, target);
      pos = target;
    }
    expect(net).toBe(100); // 200 − 100
  });

  it('valores no finitos no corrompen el neto', () => {
    expect(applySeekToSkip(50, NaN, 100)).toBe(50);
    expect(applySeekToSkip(NaN, 10, 60)).toBe(50);
  });
});

describe('effectiveListenedAt (A0: escucha efectiva por posición)', () => {
  it('BACKGROUND (bug P0): pieza terminada con JS dormido cuenta completa', () => {
    // Cero ticks JS llegaron — solo importa la posición final natural (didJustFinish).
    expect(effectiveListenedAt(600, 0, 0, 0)).toBe(600); // ≥80% de 600 ✓
  });

  it('brincar al final NO cuenta (anti-seek)', () => {
    // Escuchó 60s y saltó de 60→590: netSkip 530; termina en 600.
    expect(effectiveListenedAt(600, 0, 530, 0)).toBe(70); // <80% → sin e-
  });

  it('retomar a la mitad acumula con el crédito persistido', () => {
    // Sesión previa: 300s escuchados, salió en 300. Retoma (start=300) y termina.
    expect(effectiveListenedAt(600, 300, 0, 300)).toBe(600);
    // Retoma y salta 290 hacia adelante: solo 10 nuevos + 300 previos.
    expect(effectiveListenedAt(600, 300, 290, 300)).toBe(310);
  });

  it('seek atrás y re-escucha no duplica ni castiga', () => {
    // En 500 regresa a 400 (net −100 → clamp 0) y reproduce hasta 600.
    const net = applySeekToSkip(0, 500, 400);
    expect(effectiveListenedAt(600, 0, net, 0)).toBe(600);
  });

  it('guards: no finitos degradan al crédito previo', () => {
    expect(effectiveListenedAt(NaN, 0, 0, 120)).toBe(120);
    expect(effectiveListenedAt(600, NaN, 0, 0)).toBe(0);
    expect(effectiveListenedAt(600, 0, 0, -5)).toBe(600);
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
