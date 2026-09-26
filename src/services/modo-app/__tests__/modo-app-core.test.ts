/**
 * Una app, dos modos (26-sep-2026). Lo que importa: un cliente Elite nunca
 * cae en la app general por falta de red, la evaluacion manda aunque el nivel
 * venza, y el freno de emergencia (APP_ELITE_DX en false) apaga el modo Elite
 * para todos.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { modoDeLectura, modoPorCuenta, modoEfectivo, modoPorDefecto, esModoApp, esPreferenciaModo, type LecturaCuentaModo } from '../modo-app-core';
import {
  modoActual, esEliteDx, suscribirModo, fijarModoPorCuenta, fijarUltimoConocido,
  fijarPreferencia, fijarEsAdmin, reiniciarModoParaPruebas, fijarUltimoConocidoSiVacio,
} from '../modo-app-estado';
import { APP_ELITE_DX, VENTA_AL_PUBLICO } from '@/src/constants/flags';

const base: LecturaCuentaModo = {
  tier: 'free', tieneEvaluacionElite: false, nivelCargando: false, nivelNoSePudoLeer: false, evaluacionNoSePudoLeer: false,
};

describe('modoPorCuenta', () => {
  it('Elite vigente es la app Elite DX', () => {
    expect(modoPorCuenta({ ...base, tier: 'elite' })).toBe('elite_dx');
  });
  it('con evaluacion cargada es Elite DX aunque el nivel haya vencido', () => {
    expect(modoPorCuenta({ ...base, tier: 'free', tieneEvaluacionElite: true })).toBe('elite_dx');
    expect(modoPorCuenta({ ...base, tier: 'premium', tieneEvaluacionElite: true })).toBe('elite_dx');
  });
  it('una cuenta general confirmada es ATP completa', () => {
    expect(modoPorCuenta({ ...base, tier: 'free' })).toBe('atp');
    expect(modoPorCuenta({ ...base, tier: 'premium' })).toBe('atp');
  });
  it('mientras se lee, o si fallo la lectura, no decide', () => {
    expect(modoPorCuenta({ ...base, nivelCargando: true })).toBeNull();
    expect(modoPorCuenta({ ...base, nivelNoSePudoLeer: true })).toBeNull();
    expect(modoPorCuenta({ ...base, evaluacionNoSePudoLeer: true })).toBeNull();
  });
  it('pero si ya se sabe que es Elite, decide aunque algo siga cargando', () => {
    expect(modoPorCuenta({ ...base, tier: 'elite', nivelCargando: true })).toBe('elite_dx');
  });
});

describe('modoEfectivo', () => {
  it('la bandera maestra apagada manda a todos a ATP completa', () => {
    expect(modoEfectivo({ bandera: false, preferencia: 'elite_dx', esAdmin: true, porCuenta: 'elite_dx' })).toBe('atp');
  });
  it('el admin puede fijar el modo; auto sigue a la cuenta', () => {
    expect(modoEfectivo({ bandera: true, preferencia: 'atp', esAdmin: true, porCuenta: 'elite_dx' })).toBe('atp');
    expect(modoEfectivo({ bandera: true, preferencia: 'auto', esAdmin: true, porCuenta: 'elite_dx' })).toBe('elite_dx');
  });
  it('la preferencia no aplica a quien no es admin', () => {
    expect(modoEfectivo({ bandera: true, preferencia: 'atp', esAdmin: false, porCuenta: 'elite_dx' })).toBe('elite_dx');
  });
});

describe('modoPorDefecto y validadores', () => {
  it('con la venta apagada se arranca en Elite DX', () => {
    expect(modoPorDefecto(false)).toBe('elite_dx');
    expect(modoPorDefecto(true)).toBe('atp');
  });
  it('valida lo que viene del disco', () => {
    expect(esModoApp('atp')).toBe(true);
    expect(esModoApp('otro')).toBe(false);
    expect(esPreferenciaModo('auto')).toBe(true);
    expect(esPreferenciaModo(null)).toBe(false);
  });
});

describe('modo-app-estado', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  // 26-sep-2026 (revision en frio): el estado es de modulo y el runner comparte
  // proceso entre archivos; se deja limpio para el siguiente.
  afterEach(() => reiniciarModoParaPruebas());

  it('sin nada leido usa el modo por defecto (o ATP si la bandera esta apagada)', () => {
    expect(modoActual()).toBe(APP_ELITE_DX ? modoPorDefecto(VENTA_AL_PUBLICO) : 'atp');
  });
  it('lo resuelto por la cuenta manda sobre lo guardado', () => {
    fijarUltimoConocido('atp');
    fijarModoPorCuenta('elite_dx');
    expect(modoActual()).toBe(APP_ELITE_DX ? 'elite_dx' : 'atp');
    fijarModoPorCuenta(null);
    expect(modoActual()).toBe('atp');
  });
  it('avisa solo cuando algo cambia (cuenta exacta)', () => {
    let avisos = 0;
    const quitar = suscribirModo(() => { avisos += 1; });
    // Del arranque a 'atp': avisa solo si el modo de arranque era otro, o sea
    // con la bandera encendida y la venta apagada (arranque en Elite DX).
    const cambiaAlFijarAtp = APP_ELITE_DX && modoPorDefecto(VENTA_AL_PUBLICO) === 'elite_dx' ? 1 : 0;
    fijarModoPorCuenta('atp');
    expect(avisos).toBe(cambiaAlFijarAtp);
    // Lo mismo otra vez: nada cambio, nada se avisa.
    fijarModoPorCuenta('atp');
    expect(avisos).toBe(cambiaAlFijarAtp);
    // La preferencia cambia (auto -> elite_dx): un aviso, aunque sin ser admin
    // el modo no se mueva (Ajustes pinta la opcion elegida).
    fijarPreferencia('elite_dx');
    expect(avisos).toBe(cambiaAlFijarAtp + 1);
    expect(modoActual()).toBe('atp');
    // Misma preferencia: nada.
    fijarPreferencia('elite_dx');
    expect(avisos).toBe(cambiaAlFijarAtp + 1);
    // Se vuelve admin: un solo aviso aunque cambien dos cosas (admin y modo).
    fijarEsAdmin(true);
    expect(avisos).toBe(cambiaAlFijarAtp + 2);
    expect(modoActual()).toBe(APP_ELITE_DX ? 'elite_dx' : 'atp');
    // Ya sin suscripcion no llega nada.
    quitar();
    fijarPreferencia('atp');
    expect(avisos).toBe(cambiaAlFijarAtp + 2);
  });
  it('la preferencia del admin solo aplica siendo admin', () => {
    fijarModoPorCuenta('elite_dx');
    fijarPreferencia('atp');
    expect(esEliteDx()).toBe(APP_ELITE_DX);
    fijarEsAdmin(true);
    expect(esEliteDx()).toBe(false);
  });
});

describe('modoDeLectura (revision en frio, 26-sep)', () => {
  const elite: LecturaCuentaModo = { ...base, tier: 'elite' };
  it('la lectura de la cuenta vigente decide', () => {
    expect(modoDeLectura('B', 'B', elite)).toBe('elite_dx');
    expect(modoDeLectura('B', 'B', base)).toBe('atp');
  });
  it('una lectura de otra cuenta (o ya sin sesion) se tira', () => {
    expect(modoDeLectura('A', 'B', elite)).toBeNull();
    expect(modoDeLectura('A', null, base)).toBeNull();
  });
  it('un cliente Elite sin red no cae a la ATP completa', () => {
    expect(modoDeLectura('B', 'B', { ...base, nivelNoSePudoLeer: true, evaluacionNoSePudoLeer: true })).toBeNull();
  });
});

describe('fijarUltimoConocidoSiVacio (revision en frio, 26-sep)', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  afterEach(() => reiniciarModoParaPruebas());
  it('lo guardado en el telefono no pisa lo que la cuenta ya resolvio', () => {
    fijarUltimoConocido('elite_dx');
    fijarUltimoConocidoSiVacio('atp');
    fijarModoPorCuenta(null);
    expect(modoActual()).toBe(APP_ELITE_DX ? 'elite_dx' : 'atp');
  });
});

