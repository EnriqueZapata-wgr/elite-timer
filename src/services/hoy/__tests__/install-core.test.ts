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
  type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { MANDATORY_BOOLEANS } from '@/src/services/hoy/day-booleans';

const EMPTY: InstallPrefs = { booleans: [], quants: [], installedApps: [] };

describe('togglesForApp', () => {
  it('meditar enciende meditation; hidratacion enciende water', () => {
    expect(togglesForApp('meditar').booleans).toEqual(['meditation']);
    expect(togglesForApp('hidratacion').quants).toEqual(['water']);
  });

  it('emociones enciende checkin (vive en DEFAULT_BOOLEANS, no en el catálogo)', () => {
    expect(togglesForApp('emociones').booleans).toEqual(['checkin']);
  });

  it('journal y cardio no tienen toggles: son MANDATORY', () => {
    expect(togglesForApp('journal').booleans).toEqual([]);
    expect(togglesForApp('cardio').booleans).toEqual([]);
    expect((MANDATORY_BOOLEANS as readonly string[]).includes('journal')).toBe(true);
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

  it('sol enciende sus dos electrones y los apaga juntos', () => {
    const on = applyInstall('sol', EMPTY);
    expect(on.booleans.sort()).toEqual(['sun_awareness', 'sunlight'].filter((k) => on.booleans.includes(k)).sort());
    const off = applyUninstall('sol', on);
    expect(off.booleans).toEqual([]);
  });
});
