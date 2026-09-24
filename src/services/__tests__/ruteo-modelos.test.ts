/**
 * Ruteo de modelos de ARGOS (decision del dueno, 21-sep-2026).
 * El modulo es puro y lo comparte la Edge Function argos-proxy.
 *
 * Correr: node scripts/run-tests-sin-vitest.js src/services/__tests__/ruteo-modelos.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  resolverRuta, claseDe, hayRespaldo, timeoutPara, mensajesParaOpenAI, extrasGemini,
  MODELO_SONNET, MODELO_HAIKU, MODELO_GEMINI_FLASH_38, MODELO_GEMINI_LITE, MODELO_GEMINI_FLASH,
  LIMITE_TOTAL_MS, RESERVA_RESPALDO_MS, TOPE_GEMINI_MS, TOPE_ANTHROPIC_MS, MARGEN_PENSAMIENTO_TOKENS,
} from '../../../supabase/functions/_shared/ruteo-modelos';

describe('ruteo: la tabla del dueno', () => {
  it('extraccion: Gemini 2.5 Pro principal, Sonnet 5 respaldo', () => {
    for (const t of ['food_estimate_photo', 'food_estimate_text', 'label_scan', 'supplement_scan', 'etiqueta_super']) {
      const r = resolverRuta({ requestType: t });
      expect(r.clase).toBe('extraccion');
      expect(r.principal).toEqual({ provider: 'google', model: MODELO_GEMINI_FLASH_38 });
      expect(r.respaldo).toEqual({ provider: 'anthropic', model: MODELO_SONNET });
    }
  });

  it('clinico: Sonnet 5 principal, Gemini 2.5 Pro respaldo (incluye todas las recomendaciones)', () => {
    for (const t of ['chat', 'voice_turn', 'dx_generation', 'dx_generation_first', 'lab_interpretation',
      'clinical_interpretation', 'insight', 'weekly_insight', 'daily_summary', 'meal_suggestion', 'recipe',
      'goal_decomposition', 'food_reanalysis', 'bha_scan', 'routine', 'intervention_rationale']) {
      const r = resolverRuta({ requestType: t });
      expect(r.clase).toBe('clinico');
      expect(r.principal).toEqual({ provider: 'anthropic', model: MODELO_SONNET });
      expect(r.respaldo).toEqual({ provider: 'google', model: MODELO_GEMINI_FLASH_38 });
    }
  });

  it('navegacion: Gemini 3.5 Flash-Lite principal, Haiku 4.5 respaldo', () => {
    for (const t of ['nav_intent', 'title']) {
      const r = resolverRuta({ requestType: t });
      expect(r.clase).toBe('navegacion');
      expect(r.principal).toEqual({ provider: 'google', model: MODELO_GEMINI_LITE });
      expect(r.respaldo).toEqual({ provider: 'anthropic', model: MODELO_HAIKU });
    }
  });

  it('lo desconocido o sin tipo es clinico (ante la duda, el modelo fuerte)', () => {
    expect(claseDe('accion_inventada')).toBe('clinico');
    expect(claseDe(undefined)).toBe('clinico');
    expect(resolverRuta({}).principal.model).toBe(MODELO_SONNET);
  });

  it('el modelo que pide el cliente NO manda con el ruteo encendido', () => {
    expect(resolverRuta({ requestType: 'chat', clientModel: 'claude-opus-5' }).principal.model).toBe(MODELO_SONNET);
    expect(resolverRuta({ requestType: 'nav_intent', clientModel: 'claude-opus-5' }).principal.model).toBe(MODELO_GEMINI_LITE);
  });

  it('cada clase tiene respaldo del OTRO proveedor', () => {
    for (const t of ['food_estimate_photo', 'chat', 'nav_intent']) {
      const r = resolverRuta({ requestType: t });
      expect(r.principal.provider === r.respaldo.provider).toBe(false);
      expect(hayRespaldo(r)).toBe(true);
    }
  });
});

describe('ruteo: apagado, overrides y PDF', () => {
  it('apagado (MODEL_ROUTING=off) = conducta legacy: modelo del cliente o Sonnet, respaldo 2.5 Flash', () => {
    const r = resolverRuta({ requestType: 'food_estimate_photo', clientModel: 'claude-sonnet-4-6', desactivado: true });
    expect(r.principal).toEqual({ provider: 'anthropic', model: 'claude-sonnet-4-6' });
    expect(r.respaldo).toEqual({ provider: 'google', model: MODELO_GEMINI_FLASH });
    expect(resolverRuta({ requestType: 'chat', desactivado: true }).principal.model).toBe(MODELO_SONNET);
  });

  it('override cambia solo lo que trae y valida la forma', () => {
    const r = resolverRuta({
      requestType: 'nav_intent',
      overrides: { nav_intent: { principal: { provider: 'anthropic', model: MODELO_HAIKU } } },
    });
    expect(r.principal.model).toBe(MODELO_HAIKU);
    // Mismo proveedor en los dos: el respaldo se corrige al otro proveedor de la tabla.
    expect(r.respaldo).toEqual({ provider: 'google', model: MODELO_GEMINI_LITE });
    expect(hayRespaldo(r)).toBe(true);
    const googleDoble = resolverRuta({
      requestType: 'food_estimate_photo',
      overrides: { food_estimate_photo: { respaldo: { provider: 'google', model: MODELO_GEMINI_LITE } } },
    });
    expect(googleDoble.respaldo).toEqual({ provider: 'anthropic', model: MODELO_SONNET });
    const malo = resolverRuta({
      requestType: 'chat',
      overrides: { chat: { principal: { provider: 'openai', model: 'x' } as any } },
    });
    expect(malo.principal.model).toBe(MODELO_SONNET);
  });

  it('con PDF nunca va a Google y no hay respaldo', () => {
    const ext = resolverRuta({ requestType: 'food_estimate_photo', tienePdf: true });
    expect(ext.principal).toEqual({ provider: 'anthropic', model: MODELO_SONNET });
    expect(hayRespaldo(ext)).toBe(false);
    const clin = resolverRuta({ requestType: 'lab_interpretation', tienePdf: true });
    expect(clin.principal.provider).toBe('anthropic');
    expect(hayRespaldo(clin)).toBe(false);
    const nav = resolverRuta({ requestType: 'nav_intent', tienePdf: true });
    expect(nav.principal.model).toBe(MODELO_HAIKU);
  });
});

describe('ruteo: tiempo', () => {
  it('Anthropic principal conserva sus 58 s (reportes clinicos largos)', () => {
    expect(timeoutPara({ proveedor: 'anthropic', transcurridoMs: 2000, dejarReserva: false })).toBe(TOPE_ANTHROPIC_MS);
  });

  it('Google principal deja reserva y su respaldo de Anthropic alcanza sus 58 s', () => {
    const t = timeoutPara({ proveedor: 'google', transcurridoMs: 2000, dejarReserva: true });
    expect(t).toBe(Math.min(TOPE_GEMINI_MS, LIMITE_TOTAL_MS - 2000 - RESERVA_RESPALDO_MS));
    const respaldo = timeoutPara({ proveedor: 'anthropic', transcurridoMs: 2000 + t, dejarReserva: false });
    expect(respaldo).toBe(TOPE_ANTHROPIC_MS);
  });

  it('el respaldo de Google de un Sonnet que agoto sus 58 s todavia tiene su tope', () => {
    expect(timeoutPara({ proveedor: 'google', transcurridoMs: 60000, dejarReserva: false })).toBe(TOPE_GEMINI_MS);
    expect(timeoutPara({ proveedor: 'google', transcurridoMs: 100000, dejarReserva: false })).toBe(LIMITE_TOTAL_MS - 100000);
  });

  it('nunca menos de 4 s aunque el tiempo ya se haya ido', () => {
    expect(timeoutPara({ proveedor: 'anthropic', transcurridoMs: 120000, dejarReserva: true })).toBe(4000);
  });
});

describe('ruteo: mensajes para Gemini', () => {
  it('la foto viaja como image_url (antes se tiraba)', () => {
    const out = mensajesParaOpenAI([{ role: 'user', content: [
      { type: 'text', text: 'que comi' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
    ] }], 'sistema');
    expect(out[0]).toEqual({ role: 'system', content: 'sistema' });
    expect(out[1].content).toEqual([
      { type: 'text', text: 'que comi' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
  });

  it('solo texto sigue como string y el system en bloques se aplana', () => {
    const out = mensajesParaOpenAI(
      [{ role: 'user', content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }, { role: 'assistant', content: 'c' }],
      [{ type: 'text', text: 'cerebro' }, { type: 'text', text: 'dinamico' }],
    );
    expect(out[0].content).toBe('cerebro\ndinamico');
    expect(out[1].content).toBe('a\nb');
    expect(out[2].content).toBe('c');
  });

  it('los modelos que piensan llevan esfuerzo bajo y margen; 2.5 Flash queda como antes', () => {
    expect(extrasGemini(MODELO_GEMINI_FLASH_38, 1000)).toEqual({ max_tokens: 1000 + MARGEN_PENSAMIENTO_TOKENS, reasoning_effort: 'low' });
    expect(extrasGemini(MODELO_GEMINI_LITE, 200)).toEqual({ max_tokens: 200 + MARGEN_PENSAMIENTO_TOKENS, reasoning_effort: 'low' });
    expect(extrasGemini(MODELO_GEMINI_FLASH, 1000)).toEqual({ max_tokens: 1000 });
  });
});
