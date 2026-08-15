/**
 * Candado de "ARGOS explica dónde estás" (NOCHE-ARGOS).
 *
 * El riesgo específico que cuidan estos tests: las descripciones vienen de
 * docblocks escritos para quien programa. Si ARGOS las repite tal cual, el
 * usuario recibe "MB-20 Pieza 1, usa compileDay()". Por eso se verifica que la
 * inyección lleve SIEMPRE la directriz de no citar jerga interna, y que el
 * resumen entre ya limpio.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizarPathname,
  plantillaDe,
  contextoDePantalla,
  construirInyeccionPantalla,
  puedeExplicar,
} from '../argos-screen-explain-core';
import { APP_ROUTES, APP_ROUTE_DESCRIPTIONS } from '@/src/constants/app-routes.generated';

describe('normalizacion del pathname de expo-router', () => {
  it('quita query y hash', () => {
    expect(normalizarPathname('/fasting?tab=history')).toBe('/fasting');
    expect(normalizarPathname('/fasting#zona')).toBe('/fasting');
  });

  it('quita el grupo (tabs), que nunca aparece en el catalogo', () => {
    expect(normalizarPathname('/(tabs)/salud')).toBe('/salud');
  });

  it('la raiz sobrevive en todas sus formas', () => {
    expect(normalizarPathname('/')).toBe('/');
    expect(normalizarPathname('')).toBe('/');
    expect(normalizarPathname(null)).toBe('/');
    expect(normalizarPathname(undefined)).toBe('/');
  });

  it('quita la diagonal final', () => {
    expect(normalizarPathname('/salud/mis-datos/')).toBe('/salud/mis-datos');
  });
});

describe('rutas con parametro', () => {
  it('una ruta real calza con su plantilla', () => {
    // Sin esto ARGOS se queda mudo en TODAS las pantallas de detalle.
    expect(plantillaDe('/packs/hormonal')).toBe('/packs/[packKey]');
    expect(plantillaDe('/reports/nutricion')).toBe('/reports/[dominio]');
  });

  it('una ruta estatica se calza a si misma, no a una plantilla', () => {
    expect(plantillaDe('/fasting')).toBe('/fasting');
  });

  it('lo que no existe no calza con nada', () => {
    expect(plantillaDe('/no-existe-esta-ruta')).toBeNull();
  });

  it('no calza si el numero de segmentos no coincide', () => {
    expect(plantillaDe('/packs')).not.toBe('/packs/[packKey]');
  });
});

describe('contexto de la pantalla', () => {
  it('reconoce una pantalla del catalogo y le pone titulo de usuario', () => {
    const c = contextoDePantalla('/fasting');
    expect(c.conocida).toBe(true);
    expect(c.titulo).toBe('Ayuno');
    expect(c.pilar).toBe('nutrition');
    expect(c.resumen).toBeTruthy();
  });

  it('marca como desconocida una ruta que no existe', () => {
    const c = contextoDePantalla('/inventada');
    expect(c.conocida).toBe(false);
    expect(c.resumen).toBeNull();
  });

  it('el resumen entra SIN codigos de ticket', () => {
    for (const ruta of APP_ROUTES) {
      const c = contextoDePantalla(ruta);
      if (!c.resumen) continue;
      expect(c.resumen, ruta).not.toMatch(/\b(MB|OLA|FIX|QW|CC)-?\d/);
      expect(c.resumen, ruta).not.toMatch(/\.tsx\b/);
      expect(c.resumen, ruta).not.toMatch(/\bSprint\b/);
    }
  });
});

describe('la inyeccion al system prompt', () => {
  it('lleva la pantalla, para que sirve y la directriz anti jerga', () => {
    const s = construirInyeccionPantalla('/fasting');
    expect(s).toMatch(/## PANTALLA ACTUAL/);
    expect(s).toMatch(/Ayuno/);
    expect(s).toMatch(/Para qué sirve/);
    expect(s).toMatch(/NUNCA cites códigos de ticket/);
  });

  it('SIEMPRE prohibe citar jerga cuando inyecta una descripcion', () => {
    // Es la regla que evita que el usuario lea notas de implementacion.
    let conBloque = 0;
    for (const ruta of APP_ROUTES) {
      const s = construirInyeccionPantalla(ruta);
      if (!s.includes('## PANTALLA ACTUAL')) continue;
      conBloque++;
      expect(s, ruta).toMatch(/NUNCA cites códigos de ticket/);
    }
    expect(conBloque).toBeGreaterThan(150);
  });

  it('cae al contexto grueso por pilar cuando la ruta no esta catalogada', () => {
    const s = construirInyeccionPantalla('/ruta-que-no-existe/nutrition');
    expect(s).not.toMatch(/## PANTALLA ACTUAL/);
    // screenFromPath la ubica en Nutrición por la palabra en la ruta.
    expect(s).toMatch(/CONTEXTO DE PANTALLA/);
  });

  it('no gasta tokens en un bloque hueco', () => {
    // 'other' no aporta nada y el bloque grueso devuelve cadena vacía.
    expect(construirInyeccionPantalla('/zzz-nada')).toBe('');
  });
});

describe('puedeExplicar', () => {
  it('si en una pantalla normal', () => {
    expect(puedeExplicar('/fasting')).toBe(true);
    expect(puedeExplicar('/salud/mis-datos')).toBe(true);
  });

  it('no en una ruta desconocida', () => {
    expect(puedeExplicar('/no-existe')).toBe(false);
  });

  it('no en una ruta vetada, aunque este catalogada', () => {
    expect(puedeExplicar('/login')).toBe(false);
    expect(puedeExplicar('/onboarding/v2/welcome')).toBe(false);
  });
});

describe('cobertura del catalogo (candado)', () => {
  it('practicamente toda la app puede explicarse', () => {
    const sin = APP_ROUTES.filter((r) => !APP_ROUTE_DESCRIPTIONS[r]);
    expect(sin, 'rutas sin descripcion cosechada: regenera con gen-mapa-rutas.js').toEqual([]);
  });
});
