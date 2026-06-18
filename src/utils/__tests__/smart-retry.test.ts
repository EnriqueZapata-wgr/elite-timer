import { describe, it, expect, vi } from 'vitest';
import { isRetriableError, withSmartRetry } from '@/src/utils/smart-retry';

describe('smart-retry — isRetriableError', () => {
  it('red/timeout son reintentables', () => {
    expect(isRetriableError(new Error('Network request failed'))).toBe(true);
    expect(isRetriableError(new Error('ARGOS_TIMEOUT'))).toBe(true);
    expect(isRetriableError({ name: 'AbortError' })).toBe(true);
  });
  it('saturación del LLM es reintentable (529/overloaded/503)', () => {
    expect(isRetriableError(new Error('Proxy error 529: overloaded'))).toBe(true);
    expect(isRetriableError(new Error('anthropic_timeout'))).toBe(true);
    expect(isRetriableError(new Error('status 503'))).toBe(true);
  });
  it('errores de contenido/parseo NO son reintentables', () => {
    expect(isRetriableError(new Error('No se pudo parsear la respuesta de IA'))).toBe(false);
    expect(isRetriableError(new Error('No biomarkers extracted'))).toBe(false);
  });
});

describe('smart-retry — withSmartRetry', () => {
  it('timeout → reintenta → success (devuelve el valor)', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error('ARGOS_TIMEOUT');
      return 'ok';
    });
    const r = await withSmartRetry(fn, { delaysMs: [0] }); // delay 0 para test rápido
    expect(r).toBe('ok');
    expect(calls).toBe(2);
  });

  it('reintenta hasta agotar y re-lanza el último error', async () => {
    const fn = vi.fn(async () => { throw new Error('529 overloaded'); });
    await expect(withSmartRetry(fn, { delaysMs: [0, 0] })).rejects.toThrow(/overloaded/);
    expect(fn).toHaveBeenCalledTimes(3); // inicial + 2 reintentos
  });

  it('error NO reintentable → falla al primer intento, sin reintentos', async () => {
    const fn = vi.fn(async () => { throw new Error('No se pudo parsear'); });
    await expect(withSmartRetry(fn, { delaysMs: [0, 0] })).rejects.toThrow(/parsear/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('llama onRetry en cada reintento', async () => {
    let calls = 0;
    const onRetry = vi.fn();
    await withSmartRetry(async () => { calls++; if (calls < 3) throw new Error('timeout'); return 1; }, { delaysMs: [0, 0], onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
