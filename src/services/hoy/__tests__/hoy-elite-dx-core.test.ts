/**
 * HOY en la app Elite DX (25-sep-2026): el aviso de evaluacion que queda en
 * HOY al retirar el hero de laboratorios. Se corre con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/hoy-elite-dx-core.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { avisoEvaluacionHoyDx, siguienteLecturaAviso, nombreParaMensaje, type LecturaParaAviso } from '@/src/services/hoy/hoy-elite-dx-core';

const nivelLeido = { cargando: false, tieneEvaluacionElite: false };
const nivelConEvaluacion = { cargando: false, tieneEvaluacionElite: true };
const conEvaluacion: LecturaParaAviso = { ok: true, evaluacion: { algo: 1 } };
const sinEvaluacion: LecturaParaAviso = { ok: true, evaluacion: null };
const falloRed: LecturaParaAviso = { ok: false, motivo: 'lectura' };
const falloFormato: LecturaParaAviso = { ok: false, motivo: 'formato' };

describe('avisoEvaluacionHoyDx', () => {
  it('sin lectura todavia no pinta nada', () => {
    expect(avisoEvaluacionHoyDx(null, nivelConEvaluacion)).toBe('ninguno');
  });
  it('con evaluacion no hay aviso', () => {
    expect(avisoEvaluacionHoyDx(conEvaluacion, nivelConEvaluacion)).toBe('ninguno');
    expect(avisoEvaluacionHoyDx(conEvaluacion, nivelLeido)).toBe('ninguno');
  });
  it('evaluacion guardada que la app no entiende: aviso de formato, sea cual sea el nivel', () => {
    expect(avisoEvaluacionHoyDx(falloFormato, nivelLeido)).toBe('formato');
    expect(avisoEvaluacionHoyDx(falloFormato, { cargando: true, tieneEvaluacionElite: false })).toBe('formato');
  });
  it('fallo de red: lo dice "Que hacer hoy", no se duplica', () => {
    expect(avisoEvaluacionHoyDx(falloRed, nivelConEvaluacion)).toBe('ninguno');
  });
  it('el nivel dice que existe y la lectura dice que no: contradiccion', () => {
    expect(avisoEvaluacionHoyDx(sinEvaluacion, nivelConEvaluacion)).toBe('contradiccion');
  });
  it('sin evaluacion y el nivel no la ve (o sigue leyendo): nada que avisar', () => {
    expect(avisoEvaluacionHoyDx(sinEvaluacion, nivelLeido)).toBe('ninguno');
    expect(avisoEvaluacionHoyDx(sinEvaluacion, { cargando: true, tieneEvaluacionElite: true })).toBe('ninguno');
  });
});

describe('siguienteLecturaAviso', () => {
  it('un fallo de red no borra un aviso de formato ya visto', () => {
    expect(siguienteLecturaAviso(falloFormato, falloRed)).toBe(falloFormato);
  });
  it('un fallo de red sin nada previo se guarda tal cual', () => {
    expect(siguienteLecturaAviso(null, falloRed)).toBe(falloRed);
  });
  it('una lectura buena siempre reemplaza', () => {
    expect(siguienteLecturaAviso(falloFormato, conEvaluacion)).toBe(conEvaluacion);
    expect(siguienteLecturaAviso(falloRed, sinEvaluacion)).toBe(sinEvaluacion);
  });
  it('un fallo de formato reemplaza a lo anterior', () => {
    expect(siguienteLecturaAviso(conEvaluacion, falloFormato)).toBe(falloFormato);
  });
});

describe('nombreParaMensaje', () => {
  it('manda el nombre completo de user_metadata, tal cual', () => {
    expect(nombreParaMensaje({ nombreCompleto: 'Vicente García', primerNombre: 'VICENTE', email: 'vicente.g88@x.com' })).toBe('Vicente García');
    expect(nombreParaMensaje({ nombreCompleto: '  Ana   de la Luz ' })).toBe('Ana de la Luz');
  });
  it('un nombre completo todo en mayusculas se pasa a nombre propio', () => {
    expect(nombreParaMensaje({ nombreCompleto: 'JOSÉ ÁNGEL PÉREZ' })).toBe('José Ángel Pérez');
  });
  it('sin nombre completo usa el primer nombre de HOY en nombre propio', () => {
    expect(nombreParaMensaje({ primerNombre: 'VICENTE', email: 'vg88@x.com' })).toBe('Vicente');
    expect(nombreParaMensaje({ nombreCompleto: '   ', primerNombre: 'JOSÉ', email: null })).toBe('José');
  });
  it('el primer nombre que en realidad es el usuario del correo NO se manda', () => {
    expect(nombreParaMensaje({ primerNombre: 'VICENTE.G88', email: 'vicente.g88@gmail.com' })).toBe(null);
    expect(nombreParaMensaje({ primerNombre: 'EZBIOHACKER', email: 'ezbiohacker@gmail.com' })).toBe(null);
  });
  it('sin nada no inventa un nombre', () => {
    expect(nombreParaMensaje({})).toBe(null);
    expect(nombreParaMensaje({ nombreCompleto: 42, primerNombre: '', email: 'a@b.com' })).toBe(null);
  });
});
