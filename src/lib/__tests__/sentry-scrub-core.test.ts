import { describe, expect, it } from 'vitest';

import { REDACTED, scrubSentryEvent, scrubString, scrubValue } from '../sentry-scrub-core';

describe('scrubSentryEvent (C9-003)', () => {
  it('user queda reducido a id — nunca email/nombre/IP', () => {
    const out = scrubSentryEvent({
      user: { id: 'abc-123', email: 'ez@example.com', username: 'enrique', ip_address: '1.2.3.4' },
    });
    expect(out.user).toEqual({ id: 'abc-123' });
  });

  it('request se elimina completo', () => {
    const out = scrubSentryEvent({ request: { headers: { Authorization: 'Bearer x' } } });
    expect(out.request).toBeUndefined();
  });

  it('redacta llaves de salud/ciclo/mensajes en extra y contexts', () => {
    const out = scrubSentryEvent({
      extra: {
        glucose_mg: 145,
        cycle_day: 12,
        message: 'me siento mal',
        argos_prompt: 'contexto completo',
        screen: 'hoy',
      },
      contexts: { health: { labs: ['TSH 4.2'] }, device: { model: 'Pixel' } },
    });
    expect(out.extra).toEqual({
      glucose_mg: REDACTED,
      cycle_day: REDACTED,
      message: REDACTED,
      argos_prompt: REDACTED,
      screen: 'hoy',
    });
    expect((out.contexts as any).health).toBe(REDACTED);
    expect((out.contexts as any).device).toEqual({ model: 'Pixel' });
  });

  it('breadcrumbs: redacta data sensible, emails y query strings de URLs', () => {
    const out = scrubSentryEvent({
      breadcrumbs: [
        {
          message: 'fetch ok para ez@example.com',
          data: {
            url: 'https://x.supabase.co/rest/v1/labs?user_id=eq.123&value=eq.45',
            symptom: 'fatiga',
            status_code: 200,
          },
        },
      ],
    });
    const b = out.breadcrumbs![0];
    expect(b.message).not.toContain('ez@example.com');
    expect(b.data!.url).toBe('https://x.supabase.co/rest/v1/labs');
    expect(b.data!.symptom).toBe(REDACTED);
    expect(b.data!.status_code).toBe(200);
  });

  it('exception.values[].value y message salen redactados (B3)', () => {
    const out = scrubSentryEvent({
      message: 'fallo al sincronizar ez@example.com',
      exception: {
        values: [
          {
            type: 'FetchError',
            value:
              'GET https://x.supabase.co/rest/v1/labs?glucosa=gt.120&email=eq.ez@example.com failed para ez@example.com',
          },
          { type: 'Error' }, // sin value string — debe pasar intacto
        ],
      },
    });
    expect(out.message).not.toContain('ez@example.com');
    const v = out.exception!.values![0].value as string;
    expect(v).not.toContain('glucosa=gt.120');
    expect(v).not.toContain('ez@example.com');
    expect(v).toContain('https://x.supabase.co/rest/v1/labs');
    expect(out.exception!.values![1]).toEqual({ type: 'Error' });
  });

  it('scrubValue acota profundidad y respeta valores no sensibles', () => {
    expect(scrubValue({ count: 3, tags: ['a', 'b'] })).toEqual({ count: 3, tags: ['a', 'b'] });
    expect(scrubString('sin cambios')).toBe('sin cambios');
  });
});
