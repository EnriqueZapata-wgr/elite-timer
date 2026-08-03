/**
 * MB-19.2 PIEZA 2.4 — el puente electrón↔app que MB-20 va a necesitar.
 *
 * Lo que se protege: (1) el puente solo apunta a apps que existen, (2) TODO
 * electrón está clasificado — o tiene app o está en la lista deliberada de
 * "sin app". Un electrón nuevo sin decisión rompe aquí, no en el device.
 */
import { describe, it, expect } from 'vitest';
import { ELECTRON_WEIGHTS, type ElectronSource } from '../electrons';
import { APP_BY_KEY } from '../app-registry';
import {
  ELECTRON_TO_APP, ELECTRONS_SIN_APP, appForElectron, electronsForApp,
} from '../electron-app-bridge';

const ALL_SOURCES = Object.keys(ELECTRON_WEIGHTS) as ElectronSource[];

describe('ELECTRON_TO_APP', () => {
  it('toda app del puente existe en el registro', () => {
    for (const [source, appKey] of Object.entries(ELECTRON_TO_APP)) {
      expect(APP_BY_KEY[appKey!], `${source} → "${appKey}" no es una app`).toBeTruthy();
    }
  });

  it('toda llave del puente es un electrón real', () => {
    for (const source of Object.keys(ELECTRON_TO_APP)) {
      expect(ALL_SOURCES, source).toContain(source);
    }
  });

  it('todo electrón está clasificado: con app o deliberadamente sin app', () => {
    for (const source of ALL_SOURCES) {
      const mapped = source in ELECTRON_TO_APP;
      const sinApp = ELECTRONS_SIN_APP.includes(source);
      expect(mapped || sinApp, `${source} no está clasificado — decide su app o decláralo sin app`).toBe(true);
      expect(mapped && sinApp, `${source} está en los dos lados`).toBe(false);
    }
  });

  it('la lista sin-app no arrastra electrones que ya no existen', () => {
    for (const source of ELECTRONS_SIN_APP) {
      expect(ALL_SOURCES, source).toContain(source);
    }
  });

  it('los tres tiers de ayuno colapsan a la misma app', () => {
    expect(appForElectron('fasting_12h')).toBe('ayuno');
    expect(appForElectron('fasting_16h')).toBe('ayuno');
    expect(appForElectron('fasting_24h')).toBe('ayuno');
    expect(electronsForApp('ayuno').sort()).toEqual(['fasting_12h', 'fasting_16h', 'fasting_24h']);
  });

  it('ida y vuelta consistente', () => {
    for (const source of Object.keys(ELECTRON_TO_APP) as ElectronSource[]) {
      const app = appForElectron(source);
      expect(app).not.toBeNull();
      expect(electronsForApp(app!), `${app} debería incluir ${source}`).toContain(source);
    }
  });

  it('un hábito sin app devuelve null, no un invento', () => {
    expect(appForElectron('cold_shower')).toBeNull();
    expect(appForElectron('steps')).toBeNull();
  });
});
