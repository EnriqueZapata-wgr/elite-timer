/**
 * MB-21 P6 — el techo de la ventana de contexto, con nombre y con test.
 * Antes: argos-chat mandaba el historial COMPLETO al modelo en cada turno.
 */
import { describe, it, expect } from 'vitest';
import {
  ARGOS_HISTORY_MAX_TURNS,
  ARGOS_HISTORY_SUMMARY_MAX_TOPICS,
  buildHistoryWindow,
  type HistoryMessage,
} from '@/src/services/argos-history-core';

function turns(n: number, startRole: 'user' | 'assistant' = 'user'): HistoryMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    role: ((i + (startRole === 'user' ? 0 : 1)) % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `turno ${i}`,
  }));
}

describe('ARGOS_HISTORY_MAX_TURNS — la constante con nombre', () => {
  it('es 24 turnos (~12 pares) — no un número suelto en medio de una función', () => {
    expect(ARGOS_HISTORY_MAX_TURNS).toBe(24);
  });
});

describe('buildHistoryWindow — bajo el techo no toca nada', () => {
  it('conversación corta viaja completa, sin resumen', () => {
    const msgs = turns(6);
    const w = buildHistoryWindow(msgs);
    expect(w.messages).toEqual(msgs);
    expect(w.truncated).toBe(false);
    expect(w.summaryInjection).toBe('');
  });

  it('exactamente en el techo viaja completa', () => {
    const msgs = turns(ARGOS_HISTORY_MAX_TURNS);
    const w = buildHistoryWindow(msgs);
    expect(w.messages).toHaveLength(ARGOS_HISTORY_MAX_TURNS);
    expect(w.truncated).toBe(false);
  });
});

describe('buildHistoryWindow — sobre el techo recorta y resume', () => {
  it('una conversación de 100 mensajes manda solo los últimos N + resumen', () => {
    const msgs = turns(100);
    const w = buildHistoryWindow(msgs);
    expect(w.messages.length).toBeLessThanOrEqual(ARGOS_HISTORY_MAX_TURNS);
    expect(w.truncated).toBe(true);
    // Los últimos turnos siguen completos (lo reciente no se resume).
    expect(w.messages[w.messages.length - 1].content).toBe('turno 99');
    // El resumen declara cuántos turnos quedaron atrás.
    expect(w.summaryInjection).toContain('CONVERSACIÓN PREVIA');
    expect(w.summaryInjection).toContain(`${100 - w.messages.length} turnos`);
  });

  it('la ventana NUNCA arranca en turno de assistant (la API exige user primero)', () => {
    // 25 mensajes empezando en user: el corte crudo caería en assistant.
    const msgs = turns(25);
    const w = buildHistoryWindow(msgs);
    expect(w.messages[0].role).toBe('user');
  });

  it('el resumen cita los temas del usuario, no las respuestas de ARGOS', () => {
    const msgs: HistoryMessage[] = [];
    for (let i = 0; i < 30; i++) {
      msgs.push({ role: 'user', content: `pregunta sobre glucosa ${i}` });
      msgs.push({ role: 'assistant', content: `respuesta larguísima ${i}` });
    }
    const w = buildHistoryWindow(msgs);
    expect(w.summaryInjection).toContain('pregunta sobre glucosa');
    expect(w.summaryInjection).not.toContain('respuesta larguísima');
  });

  it('cita como máximo el tope de temas, los más recientes de lo viejo', () => {
    const msgs: HistoryMessage[] = [];
    for (let i = 0; i < 40; i++) {
      msgs.push({ role: 'user', content: `tema-${i}` });
      msgs.push({ role: 'assistant', content: 'ok' });
    }
    const w = buildHistoryWindow(msgs);
    const cited = (w.summaryInjection.match(/tema-\d+/g) ?? []);
    expect(cited.length).toBeLessThanOrEqual(ARGOS_HISTORY_SUMMARY_MAX_TOPICS);
    // tema-0 es lo más viejo: fuera; los citados son los últimos antes del corte.
    expect(w.summaryInjection).not.toContain('«tema-0»');
  });

  it('instruye al modelo a NO inventar lo recortado y a poder decir que resumió', () => {
    const w = buildHistoryWindow(turns(60));
    expect(w.summaryInjection).toContain('NO lo inventes');
    expect(w.summaryInjection).toContain('resum');
  });

  it('los temas largos se recortan a snippet (el resumen no puede ser otra conversación entera)', () => {
    const msgs: HistoryMessage[] = [];
    for (let i = 0; i < 30; i++) {
      msgs.push({ role: 'user', content: 'x'.repeat(500) });
      msgs.push({ role: 'assistant', content: 'ok' });
    }
    const w = buildHistoryWindow(msgs);
    expect(w.summaryInjection.length).toBeLessThan(1500);
  });
});

describe('VOZ-4 · el resumen es una red contra inventar, no material de charla', () => {
  it('prohíbe explícitamente sacar los temas viejos por cuenta propia', () => {
    // La línea vieja decía "puedes mencionar el resumen si viene al caso", y
    // esa invitación abierta es parte de por qué ARGOS abría un turno de labs
    // hablando del ayuno del turno anterior.
    const muchos = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `mensaje ${i}`,
    }));
    const w = buildHistoryWindow(muchos);
    expect(w.truncated).toBe(true);
    expect(w.summaryInjection).toContain('NO saques estos temas por tu cuenta');
    expect(w.summaryInjection).not.toContain('si viene al caso');
    // La red contra inventar sigue intacta: eso NO se debilita.
    expect(w.summaryInjection).toContain('no lo ves en los mensajes');
  });
});
