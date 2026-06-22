import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captura las filas insertadas para verificar el batch.
const inserted: any[] = [];
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (rows: any[]) => {
        inserted.push(rows);
        return Promise.resolve({ error: null });
      },
      // Espejo a lab_values (insertCanonicalBiomarkers) — no afecta el conteo de `inserted`.
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { saveBiomarkers } from '../capture-service';

describe('capture-service — saveBiomarkers', () => {
  beforeEach(() => { inserted.length = 0; });

  it('inserta una fila por biomarcador con source=manual', async () => {
    const r = await saveBiomarkers('u1', [
      { key: 'albumin', value: 5.28, unit: 'g/dL' },
      { key: 'glucose', value: 90, unit: 'mg/dL' },
    ]);
    expect(r.ok).toBe(true);
    expect(inserted).toHaveLength(1);
    const rows = inserted[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ user_id: 'u1', biomarker_key: 'albumin', value: 5.28, unit: 'g/dL', source: 'manual' });
    expect(rows[0].measured_at).toBeTruthy();
  });

  it('lista vacía → ok sin insertar', async () => {
    const r = await saveBiomarkers('u1', []);
    expect(r.ok).toBe(true);
    expect(inserted).toHaveLength(0);
  });
});
