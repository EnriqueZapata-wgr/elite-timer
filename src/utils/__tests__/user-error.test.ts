/**
 * Tests del filtro de fugas en mensajes de error (MB-7 Track F).
 */
import { describe, it, expect } from 'vitest';
import { userErrorMessage, isTechnicalMessage } from '../user-error';

const FALLBACK = 'No se pudo guardar.';

describe('userErrorMessage — nada técnico llega a pantalla', () => {
  it('los errores de Postgres caen al fallback', () => {
    expect(userErrorMessage(new Error('duplicate key value violates unique constraint "routines_pkey"'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('relation "user_symptoms" does not exist'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('null value in column "user_id"'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('new row violates row-level security policy'), FALLBACK)).toBe(FALLBACK);
  });

  it('auth y transporte caen al fallback', () => {
    expect(userErrorMessage(new Error('JWT expired'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('Network request failed'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('Request failed with status code 500'), FALLBACK)).toBe(FALLBACK);
  });

  it('rutas de código y storage caen al fallback', () => {
    expect(userErrorMessage(new Error('Error in /src/services/routine-service.ts'), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('Object not found in bucket mente-audio'), FALLBACK)).toBe(FALLBACK);
  });

  it('mensajes de dominio nuestros (español, cortos) SÍ pasan', () => {
    expect(userErrorMessage(new Error('Escribe un nombre para la rutina antes de probar.'), FALLBACK))
      .toBe('Escribe un nombre para la rutina antes de probar.');
    expect(userErrorMessage(new Error('Sesión sin sets válidos.'), FALLBACK)).toBe('Sesión sin sets válidos.');
  });

  it('vacío, no-error u oversized → fallback', () => {
    expect(userErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error(''), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage({ weird: true }, FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error('x'.repeat(200)), FALLBACK)).toBe(FALLBACK);
  });

  it('acepta objetos con message (PostgrestError-like) y strings', () => {
    expect(userErrorMessage({ message: 'permission denied for table routines' }, FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage('Tu sesión expiró.', FALLBACK)).toBe('Tu sesión expiró.');
  });

  it('isTechnicalMessage detecta firmas y respeta copy humano', () => {
    expect(isTechnicalMessage('syntax error at or near "SELECT"')).toBe(true);
    expect(isTechnicalMessage('No encontramos tu emoción.')).toBe(false);
  });
});
