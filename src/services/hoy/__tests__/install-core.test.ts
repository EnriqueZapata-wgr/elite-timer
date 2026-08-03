/**
 * Instalar = activar el hábito — contrato puro (MB-20 Pieza 2).
 * El dato del usuario es sagrado: desinstalar nunca borra, y los MANDATORY
 * no se apagan por desinstalación.
 */
import { describe, it, expect } from 'vitest';
import {
  togglesForApp,
  appInstallState,
  applyInstall,
  applyUninstall,
  installCreatesRow,
  installAlertBody,
  uninstallAlertBody,
  type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { APP_REGISTRY } from '@/src/constants/app-registry';
import { MANDATORY_BOOLEANS } from '@/src/services/hoy/day-booleans';

const EMPTY: InstallPrefs = { booleans: [], quants: [], installedApps: [] };

describe('togglesForApp', () => {
  it('meditar enciende meditation; hidratacion enciende water', () => {
    expect(togglesForApp('meditar').booleans).toEqual(['meditation']);
    expect(togglesForApp('hidratacion').quants).toEqual(['water']);
  });

  it('journal, cardio y emociones no tienen toggles: sus electrones son MANDATORY', () => {
    // Bug Mariana M1: checkin entró a MANDATORY (misma red que journal/cardio),
    // así que emociones dejó de ser instalable/desinstalable — es fija.
    expect(togglesForApp('journal').booleans).toEqual([]);
    expect(togglesForApp('cardio').booleans).toEqual([]);
    expect(togglesForApp('emociones').booleans).toEqual([]);
    expect((MANDATORY_BOOLEANS as readonly string[]).includes('journal')).toBe(true);
    expect((MANDATORY_BOOLEANS as readonly string[]).includes('checkin')).toBe(true);
  });

  it('ayuno no tiene toggle activable (sus tiers van por eventos)', () => {
    expect(togglesForApp('ayuno').booleans).toEqual([]);
    expect(togglesForApp('ayuno').quants).toEqual([]);
  });
});

describe('appInstallState', () => {
  it('fija para apps cuyo único electrón es MANDATORY', () => {
    expect(appInstallState('journal', EMPTY)).toBe('fija');
    expect(appInstallState('cardio', EMPTY)).toBe('fija');
    expect(appInstallState('emociones', EMPTY)).toBe('fija');
  });

  it('instalada si su electrón está activo en prefs', () => {
    expect(appInstallState('meditar', { ...EMPTY, booleans: ['meditation'] })).toBe('instalada');
    expect(appInstallState('hidratacion', { ...EMPTY, quants: ['water'] })).toBe('instalada');
  });

  it('instalada por registro directo (apps sin toggle, mig 247)', () => {
    expect(appInstallState('ayuno', EMPTY)).toBe('no');
    expect(appInstallState('ayuno', { ...EMPTY, installedApps: ['ayuno'] })).toBe('instalada');
  });

  it('no instalada por default', () => {
    expect(appInstallState('meditar', EMPTY)).toBe('no');
  });
});

describe('applyInstall / applyUninstall', () => {
  it('el ciclo instala y desinstala sin duplicar ni borrar de más', () => {
    const p1 = applyInstall('meditar', EMPTY);
    expect(p1.booleans).toEqual(['meditation']);
    expect(p1.installedApps).toEqual(['meditar']);
    const p2 = applyInstall('meditar', p1);
    expect(p2.booleans).toEqual(['meditation']);
    const p3 = applyUninstall('meditar', p2);
    expect(p3.booleans).toEqual([]);
    expect(p3.installedApps).toEqual([]);
  });

  it('desinstalar una app NO toca los electrones de otras', () => {
    const prefs: InstallPrefs = {
      booleans: ['meditation', 'sunlight'],
      quants: ['water'],
      installedApps: ['meditar', 'sol'],
    };
    const out = applyUninstall('meditar', prefs);
    expect(out.booleans).toEqual(['sunlight']);
    expect(out.quants).toEqual(['water']);
    expect(out.installedApps).toEqual(['sol']);
  });

  it('el copy de instalar sale del mismo cruce que decide si hay fila', () => {
    // Las cuatro apps instalables sin electrón activable: instalarlas NO crea
    // fila en TAREAS, y su copy tiene prohibido prometerla.
    for (const app of ['sueno', 'ayuno', 'glucosa', 'cetonas']) {
      expect(installCreatesRow(app), `${app} no debería crear fila`).toBe(false);
      expect(installAlertBody(app)).not.toContain('Aparece su fila');
      expect(installAlertBody(app)).toContain('No agrega fila en TAREAS');
      expect(uninstallAlertBody(app)).not.toContain('Su fila sale');
    }
    for (const app of ['meditar', 'respirar', 'nback', 'entrenar', 'comida', 'hidratacion', 'suplementos', 'sol', 'ciclo']) {
      expect(installCreatesRow(app), `${app} debería crear fila`).toBe(true);
      expect(installAlertBody(app)).toContain('Aparece su fila en TAREAS');
      expect(uninstallAlertBody(app)).toContain('Su fila sale de TAREAS');
    }
    // emociones ya no está aquí: con checkin MANDATORY (bug Mariana M1) es
    // fija, y el prompt de instalar/desinstalar nunca se le muestra.
    expect(appInstallState('emociones', EMPTY)).toBe('fija');
  });

  it('toda instalable del registro o crea fila o es fija o es una de las cuatro sin fila', () => {
    // Ratchet: si alguien vuelve instalable una app sin electrón activable
    // (como pasó con movilidad), este test la obliga a declararse aquí.
    const SIN_FILA_DECLARADAS = new Set(['sueno', 'ayuno', 'glucosa', 'cetonas']);
    for (const app of APP_REGISTRY.filter((a) => a.installable)) {
      const fija = appInstallState(app.key, EMPTY) === 'fija';
      const conFila = installCreatesRow(app.key);
      expect(
        fija || conFila || SIN_FILA_DECLARADAS.has(app.key),
        `${app.key} es instalable pero no crea fila ni está declarada sin fila`,
      ).toBe(true);
    }
  });

  it('sol enciende sunlight; sun_awareness no es activable y no se inventa', () => {
    // El test viejo ("sol enciende sus dos electrones") comparaba el resultado
    // contra sí mismo filtrado: pasaba siempre. La verdad: sun_awareness no
    // está en ningún catálogo activable, así que instalar sol NO lo enciende.
    expect(togglesForApp('sol').booleans).toEqual(['sunlight']);
    const on = applyInstall('sol', EMPTY);
    expect(on.booleans).toEqual(['sunlight']);
    const off = applyUninstall('sol', on);
    expect(off.booleans).toEqual([]);
  });
});
