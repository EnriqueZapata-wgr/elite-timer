/**
 * MB-21 P3 — la lógica pura del panel de conversaciones.
 */
import { describe, it, expect } from 'vitest';
import {
  CONVERSATIONS_PAGE_SIZE,
  TITLE_SUGGESTION_MIN_MESSAGES,
  groupKeyFor,
  groupConversations,
  filterConversations,
  hasMorePages,
  hasTitleSubstance,
  sanitizeTitle,
  type ConversationListRow,
} from '@/src/services/argos-conversations-core';

// Mediodía local fijo — los grupos son por día LOCAL, no por UTC.
const NOW = new Date(2026, 7, 5, 12, 0, 0).getTime(); // 2026-08-05 12:00 local

function iso(daysAgo: number, hour = 10): string {
  const d = new Date(2026, 7, 5, hour, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function row(id: string, updatedAt: string, title = 'hola', content = 'contenido'): ConversationListRow {
  return { id, title, updated_at: updatedAt, messages: [{ role: 'user', content }] };
}

describe('groupKeyFor — Hoy / Ayer / Esta semana / Más atrás', () => {
  it('hoy en la mañana → hoy', () => {
    expect(groupKeyFor(iso(0, 8), NOW)).toBe('hoy');
  });
  it('ayer → ayer', () => {
    expect(groupKeyFor(iso(1), NOW)).toBe('ayer');
  });
  it('hace 5 días → esta semana', () => {
    expect(groupKeyFor(iso(5), NOW)).toBe('semana');
  });
  it('hace 3 semanas → más atrás', () => {
    expect(groupKeyFor(iso(21), NOW)).toBe('atras');
  });
  it('fecha corrupta → más atrás (no crashea)', () => {
    expect(groupKeyFor('no-es-fecha', NOW)).toBe('atras');
  });
});

describe('groupConversations — preserva orden y omite grupos vacíos', () => {
  it('agrupa en orden Hoy→Ayer→Semana→Atrás y solo grupos con filas', () => {
    const rows = [row('a', iso(0)), row('b', iso(1)), row('c', iso(21))];
    const groups = groupConversations(rows, NOW);
    expect(groups.map(g => g.key)).toEqual(['hoy', 'ayer', 'atras']);
    expect(groups.map(g => g.label)).toEqual(['Hoy', 'Ayer', 'Más atrás']);
  });
  it('lista vacía → sin grupos', () => {
    expect(groupConversations([], NOW)).toEqual([]);
  });
});

describe('filterConversations — busca por CONTENIDO, no solo por título', () => {
  const rows = [
    row('a', iso(0), 'hola', 'mi glucosa amaneció en 95'),
    row('b', iso(1), 'Rutina de pierna', 'hablamos de sentadillas'),
  ];

  it('query vacía devuelve todo', () => {
    expect(filterConversations(rows, '')).toHaveLength(2);
    expect(filterConversations(rows, '   ')).toHaveLength(2);
  });

  it('encuentra por contenido aunque el título sea "hola"', () => {
    // La mitad de las conversaciones se llaman "hola": el título no alcanza.
    expect(filterConversations(rows, 'glucosa').map(r => r.id)).toEqual(['a']);
  });

  it('encuentra por título', () => {
    expect(filterConversations(rows, 'pierna').map(r => r.id)).toEqual(['b']);
  });

  it('ignora mayúsculas y acentos', () => {
    expect(filterConversations(rows, 'GLUCOSA')).toHaveLength(1);
    expect(filterConversations(rows, 'glucósa')).toHaveLength(1);
  });

  it('sin coincidencias → vacío', () => {
    expect(filterConversations(rows, 'ketosis')).toHaveLength(0);
  });
});

describe('paginación', () => {
  it('página llena → puede haber más', () => {
    expect(hasMorePages(CONVERSATIONS_PAGE_SIZE)).toBe(true);
  });
  it('página corta → se acabó', () => {
    expect(hasMorePages(CONVERSATIONS_PAGE_SIZE - 1)).toBe(false);
    expect(hasMorePages(0)).toBe(false);
  });
});

describe('título — sustancia y saneo', () => {
  it('con menos del mínimo de mensajes no se ofrece título de ARGOS', () => {
    expect(hasTitleSubstance(TITLE_SUGGESTION_MIN_MESSAGES - 1)).toBe(false);
    expect(hasTitleSubstance(TITLE_SUGGESTION_MIN_MESSAGES)).toBe(true);
  });
  it('sanitizeTitle colapsa espacios, recorta y rechaza vacío', () => {
    expect(sanitizeTitle('  Mi   glucosa\nde hoy  ')).toBe('Mi glucosa de hoy');
    expect(sanitizeTitle('   ')).toBeNull();
    expect(sanitizeTitle('x'.repeat(200))!.length).toBe(80);
  });
});
