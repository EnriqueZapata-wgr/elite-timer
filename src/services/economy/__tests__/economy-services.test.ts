/**
 * Economía — lo que queda viva después de apagar los protones.
 *
 * PREMIUM (16-ago-2026): este archivo probaba tres cosas que ya no existen:
 * gastar protones (spendProtons), acreditarlos (awardProtons), leer su precio
 * (getActionCost) y convertir electrones en protones. Sus módulos se borraron,
 * así que esos describe se fueron con ellos: no es que dejaran de importar, es
 * que dejaron de existir.
 *
 * Lo que se conserva y se refuerza es el ELECTRÓN, que sigue vivo entero, más
 * las dos piezas que sobreviven apagadas (retos y referidos): sus tests ahora
 * comprueban que NO mueven saldo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: (...a: any[]) => fromMock(...a),
  },
}));

import { joinChallenge, settleChallenge, evaluateCriteria } from '@/src/services/economy/challenge-service';
import { generateReferralCode, markReferralPaid } from '@/src/services/economy/referral-service';
import { awardElectrons } from '@/src/services/economy/electron-service';

/** Chain de Supabase configurable: cada método encadena; los terminales resuelven `result`. */
function chain(result: any) {
  const c: any = {};
  for (const m of ['select', 'eq', 'in', 'order', 'limit', 'lte', 'gte', 'update']) c[m] = () => c;
  c.maybeSingle = () => Promise.resolve(result);
  c.insert = () => Promise.resolve(result);
  c.then = (r: any) => Promise.resolve(result).then(r);
  return c;
}

beforeEach(() => { rpcMock.mockReset(); fromMock.mockReset(); });

describe('challenge-service — apagado en su parte económica', () => {
  it('evaluateCriteria sigue midiendo el avance (eso no era cobro)', () => {
    expect(evaluateCriteria({ days_required: 21 }, { days_completed: 21 }).completed).toBe(true);
    expect(evaluateCriteria({ days_required: 21 }, { days_completed: 10 }).completed).toBe(false);
    expect(evaluateCriteria({ days_required: 21 }, null).completed).toBe(false);
  });

  it('joinChallenge YA NO cobra entrada: no toca ninguna RPC', async () => {
    const r = await joinChallenge('u1', 'c1');
    expect(r.success).toBe(false);
    expect(r.error).toBe('retos_en_rediseno');
    // Lo importante no es el string: es que no se llamó a join_challenge.
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('settleChallenge evalúa pero NO paga premio ni llama a settle_challenge', async () => {
    fromMock.mockReturnValue(chain({ data: null, error: null }));
    const r = await settleChallenge('u1', 'c1');
    expect(r.prize).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('referral-service — el código vive, la recompensa no', () => {
  it('genera código con formato ATPxxxxxx', async () => {
    fromMock.mockReturnValue(chain({ data: null, error: null })); // sin código previo + insert ok
    const code = await generateReferralCode('u1');
    expect(code).toMatch(/^ATP[A-HJ-NP-Z2-9]{6}$/);
  });
  it('devuelve el código existente sin recrear', async () => {
    fromMock.mockReturnValue(chain({ data: { referral_code: 'ATPABC234' }, error: null }));
    expect(await generateReferralCode('u1')).toBe('ATPABC234');
  });

  it('markReferralPaid deja constancia del pago pero NO acredita nada', async () => {
    fromMock.mockReturnValue(chain({ data: null, error: null }));
    await markReferralPaid('nuevo-user');
    // Antes acreditaba 200,000 H+ al que invita y 50,000 al invitado.
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('electron-service — awardElectrons', () => {
  it('llama award_electrons y reporta éxito', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const r = await awardElectrons('u1', 10, 'habit_sleep', undefined, 'habit_sleep_2026-06-21');
    expect(r.success).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('award_electrons', expect.objectContaining({
      p_amount: 10, p_reason: 'habit_sleep', p_idempotency_key: 'habit_sleep_2026-06-21',
    }));
  });
});
