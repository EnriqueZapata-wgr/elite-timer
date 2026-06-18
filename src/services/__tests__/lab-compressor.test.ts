import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { needsCompression, compressLabFile, COMPRESS_THRESHOLD_BYTES } from '@/src/services/lab-compressor';

const MB = 1024 * 1024;

describe('lab-compressor — needsCompression', () => {
  it('PDF >2MB → true', () => { expect(needsCompression('pdf', 3 * MB)).toBe(true); });
  it('PDF ≤2MB → false', () => { expect(needsCompression('pdf', 2 * MB)).toBe(false); });
  it('imagen (cualquier tamaño) → false', () => { expect(needsCompression('image', 9 * MB)).toBe(false); });
});

describe('lab-compressor — compressLabFile', () => {
  it('PDF chico → no comprime, devuelve el original', async () => {
    const r = await compressLabFile('AAAA', 'pdf', 1 * MB);
    expect(r.compressed).toBe(false);
    if (!r.compressed) expect(r.data.type).toBe('pdf');
  });
  it('imagen → no comprime', async () => {
    const r = await compressLabFile('AAAA', 'image', 5 * MB);
    expect(r.compressed).toBe(false);
  });
  it('PDF grande → fallback (sin renderer): compressed:false con razón', async () => {
    const r = await compressLabFile('AAAA', 'pdf', 5 * MB);
    expect(r.compressed).toBe(false);
    if (!r.compressed) {
      expect(r.reason).toMatch(/renderer|original/i);
      expect(r.data.mimeType).toBe('application/pdf');
    }
  });
  it('umbral expuesto = 2MB', () => { expect(COMPRESS_THRESHOLD_BYTES).toBe(2 * MB); });
});
