import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captura la cadena .from().update().eq().eq() para verificar la invalidación.
const calls: any = {};
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from(table: string) {
      calls.table = table;
      const c: any = {
        update(p: any) { calls.update = p; return c; },
        eq(col: string, val: any) { (calls.eq ??= {})[col] = val; return c; },
        then(res: any) { return Promise.resolve({ error: null }).then(res); },
      };
      return c;
    },
  },
}));

import { invalidateDailyInsight } from '@/src/services/argos-insight-cache';
import { INSIGHT_EN_VENTANA } from '@/src/constants/flags';

describe('argos-service — invalidateDailyInsight (H7)', () => {
  beforeEach(() => { calls.table = undefined; calls.update = undefined; calls.eq = undefined; });

  // CIERRE-6: el candado se REAPUNTA, no se debilita. Con la ventana activa la
  // invalidación marca `stale` y NO toca `created_at`: falsear la marca de
  // tiempo le mentía al historial y anulaba la única guarda de frecuencia que
  // había, que es de donde salían las llamadas de más a Sonnet. Se afirman las
  // DOS ramas para que apagar la bandera tampoco pueda romperse sin avisar.
  it('marca el insight de HOY como viejo, scoped al usuario', async () => {
    await invalidateDailyInsight('u1');
    expect(calls.table).toBe('argos_daily_insights');
    if (INSIGHT_EN_VENTANA) {
      expect(calls.update.stale).toBe(true);
      // Que created_at quede intacto es el punto del cambio, no un descuido.
      expect(calls.update.created_at).toBeUndefined();
    } else {
      expect(new Date(calls.update.created_at).getTime()).toBe(0); // epoch → fuera de la ventana de 6h
      expect(calls.update.stale).toBeUndefined();
    }
    expect(calls.eq.user_id).toBe('u1'); // nunca toca otros usuarios
    expect(calls.eq.date).toBeTruthy(); // solo la fila de hoy
  });

  it('userId vacío → no-op (no toca DB)', async () => {
    await invalidateDailyInsight('');
    expect(calls.table).toBeUndefined();
  });
});
