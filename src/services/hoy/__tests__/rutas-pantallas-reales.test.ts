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
import { QUANT_ROUTES, routeForBool } from '../tareas-core';
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

const esDinamico = (seg: string) => /^\[.+\]$/.test(seg);

/** Los segmentos públicos de una ruta, ya sin query ni hash. */
const segmentosDe = (route: string): string[] => {
  const limpio = censo.normalizeRoute(route.split('?')[0].split('#')[0]);
  return limpio === '/' ? [] : limpio.slice(1).split('/');
};

/**
 * Las rutas dinámicas de app/, partidas en segmentos. Se exige al menos un
 * segmento literal: un patrón que fuera puro hueco daría por existente
 * cualquier cosa y el test dejaría de servir.
 */
const patronesDinamicos: string[][] = censo.collectRoutes()
  .filter((r: { dynamic: boolean; segments: string[] }) => r.dynamic)
  .map((r: { segments: string[] }) => r.segments)
  .filter((segs: string[]) => segs.some((s) => !esDinamico(s)));

/**
 * ¿Esta ruta la sirve un archivo real de app/? Tres reglas, en orden:
 *
 *   1. La query y el hash no son parte del destino. `/reports/adherencia?tab=
 *      rachas` es la MISMA pantalla que `/reports/adherencia`; lo de después
 *      del `?` lo lee la pantalla, no el router.
 *   2. Coincidencia exacta contra un archivo. Va primero para que una hermana
 *      estática le gane siempre a la dinámica.
 *   3. Coincidencia por FORMA contra las dinámicas: mismo número de segmentos,
 *      y en cada posición o hay un hueco `[param]` (que traga cualquier valor
 *      no vacío) o los dos segmentos son iguales. Es el mismo criterio que ya
 *      usa el censo para decidir si una pantalla dinámica está alcanzada.
 *      `/reports/adherencia` existe porque la sirve `app/reports/[dominio]`;
 *      `/inventado/adherencia` sigue sin existir.
 */
const existe = (route: unknown): boolean => {
  if (typeof route !== 'string' || !route.startsWith('/')) return false;
  const segs = segmentosDe(route);
  if (reales.has(censo.normalizeRoute(`/${segs.join('/')}`))) return true;
  if (segs.length === 0) return false;
  return patronesDinamicos.some((patron) => patron.length === segs.length
    && patron.every((seg, i) => (esDinamico(seg) || esDinamico(segs[i])
      ? segs[i].length > 0
      : segs[i] === seg)));
};

describe('rutas contra los archivos reales de app/', () => {
  it('la enumeración funciona (guard del propio test)', () => {
    expect(reales.size).toBeGreaterThan(50);
    expect(existe('/checkin')).toBe(true);
    // Y el detector detecta: la mutación que el test viejo dejaba pasar.
    expect(existe('/pantalla-que-no-existe')).toBe(false);
  });

  it('resuelve segmentos dinámicos y se salta la query, sin abrir la mano', () => {
    // Lo que hay que resolver: la pantalla vive en app/reports/[dominio].tsx.
    expect(existe('/reports/adherencia')).toBe(true);
    expect(existe('/reports/adherencia?tab=rachas')).toBe(true);
    expect(existe('/tests/q/cronotipo')).toBe(true);
    // Lo que NO se debe abrir al resolver por forma: el hueco traga el valor
    // del segmento dinámico, nunca el de un segmento literal.
    expect(existe('/inventado/adherencia')).toBe(false);
    // Ni de más ni de menos segmentos.
    expect(existe('/reports/adherencia/rachas')).toBe(false);
    expect(existe('/tests/q')).toBe(false);
    // Y una hermana estática le gana a la dinámica: /tests existe por su
    // propio archivo, no por /tests/q/[id].
    expect(existe('/tests')).toBe(true);
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
});
