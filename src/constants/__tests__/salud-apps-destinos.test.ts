/**
 * MB-29 P6.4 — instalar un destino no rompe su puerta.
 *
 * Los 9 destinos de SALUD son apps instalables Y siguen viviendo dentro de
 * sus puertas (salud-puertas): dos puertas al mismo cuarto. Aquí se
 * cementan las dos mitades:
 *  · la puerta: cada ruta sigue alcanzable desde DESTINOS_TODOS (la
 *    mutación que borre un destino de su puerta truena);
 *  · la app: instalar entra a la cuadrícula SIN encender un solo electrón
 *    (cero filas nuevas en TAREAS) y desinstalar la saca sin tocar nada.
 */
import { describe, it, expect } from 'vitest';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { DESTINOS_TODOS } from '@/src/constants/salud-puertas';
import {
  applyInstall, applyUninstall, appInstallState, gridApps, type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { APP_REGISTRY } from '@/src/constants/app-registry';

/** Los 9, con la ruta que su puerta ya tenía ANTES de ser apps. */
const NUEVE: { appKey: string; route: string }[] = [
  { appKey: 'edad-atp', route: '/edad-atp/result-preview' },
  { appKey: 'sintomas', route: '/salud/mis-sintomas' },
  { appKey: 'mapa-funcional', route: '/salud/diagnostico' },
  { appKey: 'reportes', route: '/reports' },
  { appKey: 'cronotipo', route: '/my-chronotype' },
  { appKey: 'historia-clinica', route: '/historia-clinica' },
  { appKey: 'cuestionario', route: '/salud/cuestionario-maestro' },
  { appKey: 'evaluaciones', route: '/salud/mis-evaluaciones' },
  { appKey: 'padecimientos', route: '/salud/padecimientos' },
];

const VACIO: InstallPrefs = { booleans: ['checkin'], quants: ['protein'], installedApps: [] };

describe('las dos puertas al mismo cuarto', () => {
  it('son nueve', () => {
    expect(NUEVE).toHaveLength(9);
  });

  it.each(NUEVE)('$appKey existe como app y apunta a su cuarto', ({ appKey, route }) => {
    const app = APP_BY_KEY[appKey];
    expect(app, `falta la app ${appKey}`).toBeTruthy();
    expect(String(app.route)).toBe(route);
  });

  it.each(NUEVE)('la puerta de $appKey sigue viva en salud-puertas', ({ route }) => {
    expect(
      DESTINOS_TODOS.some((d) => String(d.route) === route),
      `ningún destino de salud-puertas llega a ${route}`,
    ).toBe(true);
  });

  it.each(NUEVE)('instalar $appKey = solo cuadrícula, cero electrones', ({ appKey }) => {
    expect(appInstallState(appKey, VACIO)).toBe('no');
    const tras = applyInstall(appKey, VACIO);
    // Cero filas nuevas en TAREAS: los electrones no se tocan.
    expect(tras.booleans).toEqual(VACIO.booleans);
    expect(tras.quants).toEqual(VACIO.quants);
    expect(tras.installedApps).toContain(appKey);
    expect(appInstallState(appKey, tras)).toBe('instalada');
    expect(gridApps(APP_REGISTRY, tras).map((a) => a.key)).toContain(appKey);
    // Desinstalar la saca sin tocar nada más (los datos ni se mencionan).
    const fuera = applyUninstall(appKey, tras);
    expect(fuera.installedApps).not.toContain(appKey);
    expect(fuera.booleans).toEqual(VACIO.booleans);
  });
});
