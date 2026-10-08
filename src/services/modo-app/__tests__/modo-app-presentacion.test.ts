/**
 * Presentacion v4 (8-oct-2026 (v4)). Lo que importa: la v4 nunca aparece en
 * la ATP completa, con el freno NAV_V4 apagado nadie la ve, y mientras
 * NAV_V4_PARA_TODOS siga en false solo el admin que la escoge la ve.
 * Ver "R and D/ATP_V4_PLAN.md".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const disco = vi.hoisted(() => ({ datos: {} as Record<string, string>, falla: false }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => {
      if (disco.falla) throw new Error('sin disco');
      return k in disco.datos ? disco.datos[k] : null;
    },
    setItem: async (k: string, v: string) => {
      if (disco.falla) throw new Error('sin disco');
      disco.datos[k] = v;
    },
  },
}));

import {
  presentacionEfectiva,
  esPreferenciaPresentacion,
  ETIQUETA_PRESENTACION,
  type EntradaPresentacion,
  type ModoApp,
  type PreferenciaPresentacion,
} from '../modo-app-core';
import {
  presentacionActual,
  esV4,
  preferenciaPresentacionActual,
  fijarPreferenciaPresentacion,
  fijarModoPorCuenta,
  fijarEsAdmin,
  suscribirModo,
  reiniciarModoParaPruebas,
  hidratarGuardado,
  modoActual,
  fijarUltimoConocido,
  preferenciaActual,
} from '../modo-app-estado';
import {
  LLAVE_PRESENTACION,
  leerModoGuardado,
  leerPresentacionGuardada,
  guardarPreferenciaPresentacion,
} from '../modo-app-persistencia';
import { APP_ELITE_DX, NAV_V4, NAV_V4_PARA_TODOS } from '@/src/constants/flags';

const base: EntradaPresentacion = {
  bandera: true, paraTodos: false, preferencia: 'auto', esAdmin: false, modo: 'elite_dx',
};
const PREFS: PreferenciaPresentacion[] = ['auto', 'clasica', 'v4'];
const MODOS: ModoApp[] = ['elite_dx', 'atp'];

describe('presentacionEfectiva', () => {
  it('con el freno NAV_V4 apagado siempre es clasica, aun para el admin', () => {
    for (const preferencia of PREFS) for (const esAdmin of [true, false]) for (const paraTodos of [true, false]) {
      expect(presentacionEfectiva({ ...base, bandera: false, preferencia, esAdmin, paraTodos })).toBe('clasica');
    }
  });
  it('nunca es v4 en la ATP completa', () => {
    for (const preferencia of PREFS) for (const esAdmin of [true, false]) for (const paraTodos of [true, false]) {
      expect(presentacionEfectiva({ ...base, modo: 'atp', preferencia, esAdmin, paraTodos })).toBe('clasica');
    }
  });
  it('el admin puede fijar v4 o clasica a mano', () => {
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'v4' })).toBe('v4');
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'v4', paraTodos: true })).toBe('v4');
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'clasica', paraTodos: true })).toBe('clasica');
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'clasica' })).toBe('clasica');
  });
  it('el admin en auto sigue la regla de todos', () => {
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'auto' })).toBe('clasica');
    expect(presentacionEfectiva({ ...base, esAdmin: true, preferencia: 'auto', paraTodos: true })).toBe('v4');
  });
  it('quien no es admin nunca recibe v4 mientras paraTodos sea false', () => {
    for (const preferencia of PREFS) for (const modo of MODOS) {
      expect(presentacionEfectiva({ ...base, esAdmin: false, preferencia, modo, paraTodos: false })).toBe('clasica');
    }
  });
  it('con paraTodos encendida, toda cuenta Elite DX recibe v4 y su preferencia no cuenta', () => {
    for (const preferencia of PREFS) {
      expect(presentacionEfectiva({ ...base, esAdmin: false, preferencia, paraTodos: true })).toBe('v4');
    }
  });
});

describe('esPreferenciaPresentacion y etiquetas', () => {
  it('valida lo que viene del disco', () => {
    for (const p of PREFS) expect(esPreferenciaPresentacion(p)).toBe(true);
    expect(esPreferenciaPresentacion('V4')).toBe(false);
    expect(esPreferenciaPresentacion('elite_dx')).toBe(false);
    expect(esPreferenciaPresentacion(null)).toBe(false);
    expect(esPreferenciaPresentacion(undefined)).toBe(false);
  });
  it('cada preferencia tiene etiqueta, sin raya larga', () => {
    for (const p of PREFS) {
      expect(ETIQUETA_PRESENTACION[p].length).toBeGreaterThan(0);
      expect(ETIQUETA_PRESENTACION[p].includes('—')).toBe(false);
    }
  });
});

describe('modo-app-estado: presentacion', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  afterEach(() => reiniciarModoParaPruebas());

  it('arranca en auto', () => {
    expect(preferenciaPresentacionActual()).toBe('auto');
  });
  it('el admin en Elite DX que escoge v4 la ve (si las banderas lo permiten)', () => {
    fijarModoPorCuenta('elite_dx');
    fijarEsAdmin(true);
    fijarPreferenciaPresentacion('v4');
    expect(esV4()).toBe(NAV_V4 && APP_ELITE_DX);
    fijarPreferenciaPresentacion('clasica');
    expect(presentacionActual()).toBe('clasica');
  });
  it('quien no es admin solo ve v4 con NAV_V4_PARA_TODOS', () => {
    fijarModoPorCuenta('elite_dx');
    fijarPreferenciaPresentacion('v4');
    expect(esV4()).toBe(NAV_V4 && APP_ELITE_DX && NAV_V4_PARA_TODOS);
  });
  it('en la ATP completa nunca es v4', () => {
    fijarModoPorCuenta('atp');
    fijarEsAdmin(true);
    fijarPreferenciaPresentacion('v4');
    expect(esV4()).toBe(false);
  });
  it('cambiar la preferencia avisa una vez; repetirla no avisa', () => {
    let avisos = 0;
    const quitar = suscribirModo(() => { avisos += 1; });
    fijarPreferenciaPresentacion('v4');
    expect(avisos).toBe(1);
    fijarPreferenciaPresentacion('v4');
    expect(avisos).toBe(1);
    quitar();
  });
  it('telefono compartido: el admin escoge v4 y entra otra cuenta, vuelve a clasica con un aviso', () => {
    fijarModoPorCuenta('elite_dx');
    fijarEsAdmin(true);
    fijarPreferenciaPresentacion('v4');
    expect(esV4()).toBe(NAV_V4 && APP_ELITE_DX);
    let avisos = 0;
    const quitar = suscribirModo(() => { avisos += 1; });
    fijarEsAdmin(false);
    expect(presentacionActual()).toBe(NAV_V4 && APP_ELITE_DX && NAV_V4_PARA_TODOS ? 'v4' : 'clasica');
    expect(avisos).toBe(1);
    quitar();
  });
  it('hidratarGuardado mete modo, preferencia y presentacion con un solo aviso', () => {
    fijarModoPorCuenta('elite_dx');
    fijarEsAdmin(true);
    let avisos = 0;
    const quitar = suscribirModo(() => { avisos += 1; });
    hidratarGuardado({ ultimo: 'atp', preferencia: 'elite_dx', presentacion: 'v4' });
    expect(avisos).toBe(1);
    expect(preferenciaActual()).toBe('elite_dx');
    expect(preferenciaPresentacionActual()).toBe('v4');
    expect(esV4()).toBe(NAV_V4 && APP_ELITE_DX);
    quitar();
  });
  it('hidratarGuardado no pisa un ultimo modo que la cuenta ya resolvio', () => {
    fijarUltimoConocido('elite_dx');
    hidratarGuardado({ ultimo: 'atp', preferencia: 'auto', presentacion: 'auto' });
    expect(modoActual()).toBe(APP_ELITE_DX ? 'elite_dx' : 'atp');
  });
  it('el reinicio de pruebas deja la preferencia en auto', () => {
    fijarPreferenciaPresentacion('clasica');
    reiniciarModoParaPruebas();
    expect(preferenciaPresentacionActual()).toBe('auto');
  });
});

describe('modo-app-persistencia: presentacion', () => {
  beforeEach(() => { disco.datos = {}; disco.falla = false; });

  it('usa la llave atp_presentacion_pref_v1', () => {
    expect(LLAVE_PRESENTACION).toBe('atp_presentacion_pref_v1');
  });
  it('sin nada guardado lee auto', async () => {
    expect(await leerPresentacionGuardada()).toBe('auto');
  });
  it('guarda y lee lo escogido', async () => {
    await guardarPreferenciaPresentacion('v4');
    expect(disco.datos[LLAVE_PRESENTACION]).toBe('v4');
    expect(await leerPresentacionGuardada()).toBe('v4');
  });
  it('leerModoGuardado trae la presentacion en la misma lectura (corrupta = auto)', async () => {
    await guardarPreferenciaPresentacion('clasica');
    expect((await leerModoGuardado()).presentacion).toBe('clasica');
    disco.datos[LLAVE_PRESENTACION] = 'x';
    expect(await leerModoGuardado()).toEqual({ ultimo: null, preferencia: 'auto', presentacion: 'auto' });
    disco.falla = true;
    expect(await leerModoGuardado()).toEqual({ ultimo: null, preferencia: 'auto', presentacion: 'auto' });
  });
  it('un valor corrupto se lee como auto', async () => {
    disco.datos[LLAVE_PRESENTACION] = 'nueva';
    expect(await leerPresentacionGuardada()).toBe('auto');
  });
  it('un fallo de disco se lee como auto y guardar no truena', async () => {
    disco.falla = true;
    expect(await leerPresentacionGuardada()).toBe('auto');
    await guardarPreferenciaPresentacion('clasica');
  });
});
