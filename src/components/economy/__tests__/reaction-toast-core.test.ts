/**
 * Tests del core puro del toast de atribución ARGOS (hotfix-ux FIX 4).
 * Node-only: cero imports de React Native.
 */
import { describe, it, expect } from 'vitest';
import {
  reduceAward,
  formatElectrons,
  formatAttribution,
  COLLAPSE_WINDOW_MS,
  TOAST_DURATION_MS,
  type ToastBatch,
} from '../reaction-toast-core';

const NAMES: Record<string, { name: string }> = {
  cardio: { name: 'Cardio' },
  no_processed_foods: { name: 'Sin procesados' },
  cold_shower: { name: 'Baño frío' },
};

describe('reduceAward — colapso de awards en ventana', () => {
  it('sin batch previo inicia batch nuevo (merged: false)', () => {
    const { batch, merged } = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 1000 });
    expect(merged).toBe(false);
    expect(batch).toEqual({ total: 2.5, sources: ['cardio'], lastAt: 1000 });
  });

  it('award dentro de la ventana colapsa: suma total y agrega fuente', () => {
    const first = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 1000 }).batch;
    const { batch, merged } = reduceAward(first, {
      source: 'no_processed_foods', electrons: 2.0, at: 1000 + 1800,
    });
    expect(merged).toBe(true);
    expect(batch.total).toBe(4.5); // el "+4.5 misterioso" de Enrique, ahora con atribución
    expect(batch.sources).toEqual(['cardio', 'no_processed_foods']);
    expect(batch.lastAt).toBe(2800);
  });

  it('award EXACTAMENTE en el borde de la ventana aún colapsa', () => {
    const first = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 0 }).batch;
    const { merged } = reduceAward(first, {
      source: 'cold_shower', electrons: 3.0, at: COLLAPSE_WINDOW_MS,
    });
    expect(merged).toBe(true);
  });

  it('award fuera de la ventana inicia batch nuevo', () => {
    const first = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 1000 }).batch;
    const { batch, merged } = reduceAward(first, {
      source: 'no_processed_foods', electrons: 2.0, at: 1000 + COLLAPSE_WINDOW_MS + 1,
    });
    expect(merged).toBe(false);
    expect(batch).toEqual({ total: 2, sources: ['no_processed_foods'], lastAt: 3001 });
  });

  it('la ventana se extiende con cada colapso (ráfaga encadenada)', () => {
    let b = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 0 }).batch;
    b = reduceAward(b, { source: 'no_processed_foods', electrons: 2.0, at: 1500 }).batch;
    // 3000 está a >2s del PRIMER award pero a 1.5s del último → sigue colapsando.
    const { batch, merged } = reduceAward(b, { source: 'cold_shower', electrons: 3.0, at: 3000 });
    expect(merged).toBe(true);
    expect(batch.total).toBe(7.5);
    expect(batch.sources).toEqual(['cardio', 'no_processed_foods', 'cold_shower']);
  });

  it('misma fuente repetida en la ventana: suma electrones pero NO duplica la fuente', () => {
    const first = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 0 }).batch;
    const { batch } = reduceAward(first, { source: 'cardio', electrons: 2.5, at: 500 });
    expect(batch.total).toBe(5);
    expect(batch.sources).toEqual(['cardio']);
  });

  it('timestamp que retrocede (reloj raro) NO colapsa: batch nuevo defensivo', () => {
    const first = reduceAward(null, { source: 'cardio', electrons: 2.5, at: 5000 }).batch;
    const { merged } = reduceAward(first, { source: 'cold_shower', electrons: 3.0, at: 4000 });
    expect(merged).toBe(false);
  });

  it('suma con flotantes queda redondeada a 2 decimales', () => {
    let b = reduceAward(null, { source: 'a', electrons: 1.1, at: 0 }).batch;
    b = reduceAward(b, { source: 'b', electrons: 2.2, at: 100 }).batch;
    expect(b.total).toBe(3.3); // no 3.3000000000000003
  });
});

describe('formatElectrons', () => {
  it('conserva decimales significativos y quita ceros colgantes', () => {
    expect(formatElectrons(4.5)).toBe('+4.5');
    expect(formatElectrons(2)).toBe('+2');
    expect(formatElectrons(2.0)).toBe('+2');
    expect(formatElectrons(1.25)).toBe('+1.25');
  });
});

describe('formatAttribution', () => {
  it('una fuente: "+2.5 ⚡ Cardio"', () => {
    const batch: Pick<ToastBatch, 'total' | 'sources'> = { total: 2.5, sources: ['cardio'] };
    expect(formatAttribution(batch, NAMES)).toBe('+2.5 ⚡ Cardio');
  });

  it('varias fuentes separadas por " · " en orden de llegada', () => {
    const batch = { total: 4.5, sources: ['cardio', 'no_processed_foods'] };
    expect(formatAttribution(batch, NAMES)).toBe('+4.5 ⚡ Cardio · Sin procesados');
  });

  it('fuente desconocida cae a su key cruda (no rompe)', () => {
    const batch = { total: 1, sources: ['misterio'] };
    expect(formatAttribution(batch, NAMES)).toBe('+1 ⚡ misterio');
  });
});

describe('constantes', () => {
  it('ventana de colapso 2s y duración del toast 2.5s (spec del sprint)', () => {
    expect(COLLAPSE_WINDOW_MS).toBe(2000);
    expect(TOAST_DURATION_MS).toBe(2500);
  });
});
