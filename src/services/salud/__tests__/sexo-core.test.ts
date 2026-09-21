/**
 * 2026-09-21 (SEXO NUNCA ASUMIDO): el único traductor de `biological_sex`.
 * Solo 'male' y 'female' son sexo; NULL, vacío, intersex, mayúsculas o basura
 * son null, y nunca hombre por defecto.
 */
import { describe, it, expect } from 'vitest';
import {
  sexoDePerfil, exigirSexo, accionDeAviso, conGenero,
  AVISO_FALTA_SEXO_EDAD, AVISO_FALTA_SEXO_RANGOS, AVISO_PERFIL_ILEGIBLE, RUTA_PERFIL,
  ACCION_COMPLETAR_PERFIL, ACCION_REINTENTAR,
} from '@/src/services/salud/sexo-core';

describe('sexoDePerfil', () => {
  it('male y female pasan tal cual', () => {
    expect(sexoDePerfil('male')).toBe('male');
    expect(sexoDePerfil('female')).toBe('female');
  });
  it('todo lo demás es null (nunca hombre por defecto)', () => {
    expect(sexoDePerfil(null)).toBeNull();
    expect(sexoDePerfil(undefined)).toBeNull();
    expect(sexoDePerfil('')).toBeNull();
    expect(sexoDePerfil('intersex')).toBeNull();
    expect(sexoDePerfil('MALE')).toBeNull();
    expect(sexoDePerfil('Female')).toBeNull();
    expect(sexoDePerfil(1)).toBeNull();
    expect(sexoDePerfil({})).toBeNull();
  });
});

describe('exigirSexo', () => {
  it('devuelve el sexo cuando existe', () => {
    expect(exigirSexo('female', 'test')).toBe('female');
    expect(exigirSexo('male', 'test')).toBe('male');
  });
  it('con null lanza un error claro con el contexto, nunca asume', () => {
    expect(() => exigirSexo(null, 'motor-v2')).toThrow('[motor-v2]');
    expect(() => exigirSexo(null, 'motor-v2')).toThrow(AVISO_FALTA_SEXO_EDAD);
    expect(() => exigirSexo(undefined, 'x')).toThrow();
  });
});

describe('copy y destino', () => {
  it('los avisos mandan al perfil y no tienen em dash', () => {
    expect(RUTA_PERFIL).toBe('/profile');
    expect(AVISO_FALTA_SEXO_EDAD).toContain('perfil');
    expect(AVISO_FALTA_SEXO_RANGOS).toContain('perfil');
    expect(AVISO_FALTA_SEXO_EDAD.includes('—')).toBe(false);
    expect(AVISO_FALTA_SEXO_RANGOS.includes('—')).toBe(false);
  });
});

describe('accionDeAviso (ronda de arreglos, regla 7)', () => {
  it('perfil ilegible → Reintentar (relanza la lectura, no manda a /profile)', () => {
    expect(accionDeAviso(AVISO_PERFIL_ILEGIBLE)).toEqual({ label: ACCION_REINTENTAR, reintentar: true });
  });
  it('falta el sexo de verdad → Completar mi perfil', () => {
    expect(accionDeAviso(AVISO_FALTA_SEXO_EDAD)).toEqual({ label: ACCION_COMPLETAR_PERFIL, reintentar: false });
    expect(accionDeAviso(AVISO_FALTA_SEXO_RANGOS)).toEqual({ label: ACCION_COMPLETAR_PERFIL, reintentar: false });
  });
});

describe('conGenero: nunca el masculino por defecto', () => {
  it('male → masculino, female → femenino, null/undefined → neutro', () => {
    expect(conGenero('male', 'agradecido', 'agradecida', 'agradecido/a')).toBe('agradecido');
    expect(conGenero('female', 'agradecido', 'agradecida', 'agradecido/a')).toBe('agradecida');
    expect(conGenero(null, 'agradecido', 'agradecida', 'agradecido/a')).toBe('agradecido/a');
    expect(conGenero(undefined, 'agradecido', 'agradecida', 'agradecido/a')).toBe('agradecido/a');
  });
});
