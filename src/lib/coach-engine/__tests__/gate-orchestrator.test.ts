import { describe, it, expect, vi } from 'vitest';

// Mock supabase: getVoiceConfig (vía evaluateQ1) resuelve a data:null → q1 'no_sabe'.
// El resto del gate (detectBrakes/detectRedFlags/cascade) es pure-logic.
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// El gate importa logger (→ @sentry/react-native). Mock para entorno node.
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { runCoachEngineGate, buildCoachGateInjection, type CoachGateResult } from '../gate-orchestrator';

describe('gate-orchestrator — runCoachEngineGate (supabase mock null config)', () => {
  it('sin voice_config → q1 no_sabe (degradación graceful)', async () => {
    const g = await runCoachEngineGate({ userId: 'u1', userMessage: 'hola', conversationId: null });
    expect(g.q1).toBe('no_sabe');
    expect(g.q2).toBeNull();
    expect(g.cascadeLevel).toBeNull();
  });

  it('"dolor de pecho" → bandera roja sistémica + escalación', async () => {
    const g = await runCoachEngineGate({
      userId: 'u1',
      userMessage: 'tengo dolor de pecho desde ayer',
      conversationId: null,
    });
    expect(g.redFlags.length).toBeGreaterThanOrEqual(1);
    expect(g.shouldEscalateToProfessional).toBe(true);
    expect(g.promptInjections.redFlag).toContain('BANDERA ROJA');
  });

  it('señal con semáforo → q2 + cascada poblados', async () => {
    const g = await runCoachEngineGate({
      userId: 'u1',
      userMessage: 'cómo voy',
      signal: { type: 'glucosa', value: 220, thresholds: { yellow: 140, red: 200 } },
    });
    expect(g.q2).toBe('rojo');
    expect(g.cascadeLevel).toBe(3); // rojo + no recurre
  });
});

describe('gate-orchestrator — buildCoachGateInjection (pure)', () => {
  const base: CoachGateResult = {
    q1: 'sabe',
    q2: null,
    cascadeLevel: null,
    dominantBrake: null,
    redFlags: [],
    shouldEscalateToProfessional: false,
    promptInjections: { voiceLevel: 'VOICE', cascade: '', brake: '', redFlag: '' },
    auditPayload: {
      question_1_result: 'sabe',
      question_2_result: null,
      cascade_level: null,
      principle_invoked: null,
      brake_detected: null,
      signal_description: null,
    },
  };

  it('incluye el header, el voiceLevel y el footer', () => {
    const out = buildCoachGateInjection(base);
    expect(out).toContain('COACH ENGINE GATE');
    expect(out).toContain('VOICE');
    expect(out).toContain('FIN COACH ENGINE GATE');
  });

  it('incluye la línea de escalación cuando aplica', () => {
    const out = buildCoachGateInjection({
      ...base,
      shouldEscalateToProfessional: true,
      promptInjections: { ...base.promptInjections, redFlag: 'BANDERA ROJA ACTIVA' },
    });
    expect(out).toContain('ESCALACIÓN A PROFESIONAL OBLIGATORIA');
    expect(out).toContain('BANDERA ROJA ACTIVA');
  });

  it('omite bloques vacíos (cascade/brake)', () => {
    const out = buildCoachGateInjection(base);
    // No debe haber líneas de cascada/freno cuando están vacías.
    expect(out).not.toContain('Cascada nivel');
    expect(out).not.toContain('Freno dominante');
  });
});
