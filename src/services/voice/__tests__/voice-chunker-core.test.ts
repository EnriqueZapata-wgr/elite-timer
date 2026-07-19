/**
 * MB-4 J5 — sentence chunker: el corte por frase que hace posible el <2s.
 * Sin perder ni duplicar caracteres; primer chunk sale antes.
 */
import { describe, it, expect } from 'vitest';
import { SentenceChunker, FIRST_CHUNK_CHARS } from '../voice-chunker-core';

describe('SentenceChunker', () => {
  it('emite el primer chunk al cerrar la primera frase (umbral bajo)', () => {
    const c = new SentenceChunker();
    const out = c.push('Hola, qué tal. Vamos');
    expect(out).toEqual(['Hola, qué tal.']);
  });

  it('acumula fragmentos parciales hasta cerrar frase', () => {
    const c = new SentenceChunker();
    expect(c.push('Estás ')).toEqual([]);
    expect(c.push('subiendo')).toEqual([]);
    expect(c.push(' 18% este mes')).toEqual([]); // sin límite aún
    expect(c.push('. Eso es oro')).toEqual(['Estás subiendo 18% este mes.']);
  });

  it('no corta decimales ni cifras (3.5)', () => {
    const c = new SentenceChunker();
    // "3.5" no debe partir; corta en el punto final real.
    const out = c.push('Tu HbA1c es 5.4 hoy. Bien');
    expect(out).toEqual(['Tu HbA1c es 5.4 hoy.']);
  });

  it('flush emite lo que quede sin límite', () => {
    const c = new SentenceChunker();
    expect(c.push('Primera frase completa aquí. ')).toEqual(['Primera frase completa aquí.']);
    const rest = c.push('Sin cierre final');
    expect(rest).toEqual([]);
    expect(c.flush()).toEqual(['Sin cierre final']);
  });

  it('no pierde ni duplica texto (reconstrucción completa)', () => {
    const c = new SentenceChunker();
    const full = 'Uno. Dos! Tres? Cuatro… cinco y seis. Fin';
    const chunks: string[] = [];
    for (const ch of full) chunks.push(...c.push(ch));
    chunks.push(...c.flush());
    // Reunir sin espacios/puntuación → misma secuencia de letras
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(norm(chunks.join(' '))).toBe(norm(full));
  });

  it('varios límites en un solo push → varios chunks', () => {
    const c = new SentenceChunker();
    const out = c.push('Frase uno larga aquí. Frase dos larga aquí. Cola');
    expect(out.length).toBe(2);
  });

  it('el primer chunk usa el umbral bajo (sale antes que los siguientes)', () => {
    expect(FIRST_CHUNK_CHARS).toBeLessThan(24);
  });
});
