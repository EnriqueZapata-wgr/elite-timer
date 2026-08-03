/**
 * MB-20.3 P4 — el test que sí sirve: cada ruta declarada se cruza contra los
 * archivos REALES de app/, y falla si apunta a una pantalla que no existe.
 *
 * Por qué un test y no el tipado: `Href` cazaría una ruta inventada, pero
 * .expo/types/router.d.ts está destrackeado y el CI no lo regenera — en CI el
 * tipo degrada a string y no caza nada. Leer app/ no depende de archivos
 * generados. La enumeración de pantallas es la misma del censo
 * (collectRoutes), que ya sabe de grupos (tabs), index y archivos especiales.
 *
 * El test viejo comparaba VERIFIED_ELECTRON_ROUTES contra la primera capa de
 * routeForBool — la misma constante: mutar checkin a /pantalla-que-no-existe
 * dejaba los 55 tests en verde. Este lo caza.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERIFIED_ELECTRON_KEYS, VERIFIED_ELECTRON_ROUTES } from '../day-booleans';
import { QUANT_ROUTES, EXPERIENCIA_REGISTRO, routeForBool } from '../tareas-core';
import { APP_REGISTRY } from '@/src/constants/app-registry';

const require_ = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const censo = require_(resolve(here, '..', '..', '..', '..', 'scripts', 'censo-rutas.js'));

/** Las pantallas reales, en sus dos formas (con y sin grupos). */
const reales = new Set<string>();
for (const r of censo.collectRoutes()) {
  reales.add(r.withGroups);
  reales.add(r.noGroups);
}

const existe = (route: unknown): boolean =>
  typeof route === 'string' && reales.has(censo.normalizeRoute(route.split('?')[0]));

describe('rutas contra los archivos reales de app/', () => {
  it('la enumeración funciona (guard del propio test)', () => {
    expect(reales.size).toBeGreaterThan(50);
    expect(existe('/checkin')).toBe(true);
    // Y el detector detecta: la mutación que el test viejo dejaba pasar.
    expect(existe('/pantalla-que-no-existe')).toBe(false);
  });

  it('las granulares de VERIFIED_ELECTRON_ROUTES apuntan a pantallas que existen', () => {
    for (const [key, route] of Object.entries(VERIFIED_ELECTRON_ROUTES)) {
      expect(existe(route), `${key} → ${String(route)}`).toBe(true);
    }
  });

  it('TODO verificado resuelve (granular o puente) a una pantalla que existe', () => {
    for (const key of VERIFIED_ELECTRON_KEYS) {
      const route = routeForBool(key);
      expect(existe(route), `${key} → ${String(route)}`).toBe(true);
    }
  });

  it('las rutas de los cuantitativos existen', () => {
    for (const [key, route] of Object.entries(QUANT_ROUTES)) {
      expect(existe(route), `${key} → ${route}`).toBe(true);
    }
  });

  it('las 25 puertas del registro de apps existen', () => {
    for (const app of APP_REGISTRY) {
      expect(existe(app.route), `${app.key} → ${String(app.route)}`).toBe(true);
    }
  });

  it('los registros de experiencia (el SÍ del modal) existen', () => {
    for (const [key, route] of Object.entries(EXPERIENCIA_REGISTRO)) {
      expect(existe(route), `${key} → ${route}`).toBe(true);
    }
  });
});
