/**
 * Aviso del día 7 (ATP 3.0, ruta 2.8): la fecha cae a las 10:00 locales
 * siete días después, solo Free confirmado lo recibe, y el tap abre una ruta
 * interna y nada más.
 */
import { describe, expect, it } from 'vitest';
import {
  AVISO_DIA7_URL,
  debeProgramarAvisoDia7,
  fechaAvisoDia7,
  rutaDeNotificacion,
} from '../aviso-dia7-core';

describe('fechaAvisoDia7', () => {
  it('siete días después a las 10:00 locales', () => {
    const desde = new Date(2026, 8, 5, 22, 47, 13); // 5-sep-2026 22:47 local
    const f = fechaAvisoDia7(desde);
    expect(f.getFullYear()).toBe(2026);
    expect(f.getMonth()).toBe(8);
    expect(f.getDate()).toBe(12);
    expect(f.getHours()).toBe(10);
    expect(f.getMinutes()).toBe(0);
    expect(f.getSeconds()).toBe(0);
  });
  it('cruza fin de mes sin perder días', () => {
    const f = fechaAvisoDia7(new Date(2026, 8, 28, 9, 0, 0));
    expect(f.getMonth()).toBe(9);
    expect(f.getDate()).toBe(5);
  });
  it('no muta la fecha de entrada', () => {
    const desde = new Date(2026, 0, 1, 12, 0, 0);
    fechaAvisoDia7(desde);
    expect(desde.getDate()).toBe(1);
    expect(desde.getHours()).toBe(12);
  });
});

/**
 * 7-sep-2026 (VENTA_AL_PUBLICO): el contrato se RE-APUNTA, no se afloja. Cada
 * caso de abajo declara `ventaAlPublico: true` de forma explícita y sigue
 * exigiendo exactamente lo mismo que exigía; el bloque nuevo prueba el
 * comportamiento de hoy, con la venta apagada.
 */
describe('debeProgramarAvisoDia7', () => {
  it('free confirmado con permiso: sí', () => {
    expect(debeProgramarAvisoDia7({ tier: 'free', nivelNoSePudoLeer: false, permisoConcedido: true, ventaAlPublico: true })).toBe(true);
  });
  it('premium y elite: nunca', () => {
    expect(debeProgramarAvisoDia7({ tier: 'premium', nivelNoSePudoLeer: false, permisoConcedido: true, ventaAlPublico: true })).toBe(false);
    expect(debeProgramarAvisoDia7({ tier: 'elite', nivelNoSePudoLeer: false, permisoConcedido: true, ventaAlPublico: true })).toBe(false);
  });
  it('sin permiso o sin saber el nivel: no', () => {
    expect(debeProgramarAvisoDia7({ tier: 'free', nivelNoSePudoLeer: false, permisoConcedido: false, ventaAlPublico: true })).toBe(false);
    expect(debeProgramarAvisoDia7({ tier: 'free', nivelNoSePudoLeer: true, permisoConcedido: true, ventaAlPublico: true })).toBe(false);
  });
  it('con la venta al público apagada no se programa para nadie', () => {
    expect(debeProgramarAvisoDia7({ tier: 'free', nivelNoSePudoLeer: false, permisoConcedido: true, ventaAlPublico: false })).toBe(false);
  });
  it('fail-open del lado correcto: lo que no sea exactamente true no avisa', () => {
    // Aquí abrir es NO mandar la notificación de venta, así que la compuerta
    // `=== true` cae del lado que no molesta a un cliente que ya pagó.
    expect(debeProgramarAvisoDia7({ tier: 'free', nivelNoSePudoLeer: false, permisoConcedido: true, ventaAlPublico: undefined as unknown as boolean })).toBe(false);
  });
});

describe('rutaDeNotificacion', () => {
  it('lee la ruta interna del aviso', () => {
    expect(rutaDeNotificacion({ url: AVISO_DIA7_URL })).toBe('/paywall?contexto=dia7');
  });
  it('ignora lo que no es ruta interna', () => {
    expect(rutaDeNotificacion({ url: 'https://ejemplo.com' })).toBe(null);
    expect(rutaDeNotificacion({ url: '//ejemplo.com' })).toBe(null);
    expect(rutaDeNotificacion({ url: 42 })).toBe(null);
    expect(rutaDeNotificacion({ avisoAppKey: 'meditar' })).toBe(null);
    expect(rutaDeNotificacion(null)).toBe(null);
    expect(rutaDeNotificacion(undefined)).toBe(null);
    expect(rutaDeNotificacion('/paywall')).toBe(null);
  });
});
