/**
 * Candado del comportamiento del navegador (NOCHE-ARGOS).
 *
 * Se prueba `ejecutarResultado` con un navegador inyectado: lo que importa es
 * CUÁNDO se mueve la app y cuándo no, no que expo-router funcione.
 *
 * FIX-NOCHE: apunta al core, no al service. Antes importaba argos-nav-service,
 * que importa `router` de expo-router, y eso arrastraba el JSX de expo-router a
 * la suite: vitest no transforma node_modules y el archivo entero dejaba de
 * coleccionar (`SyntaxError: Unexpected token '<'`). Ningún caso de aquí usaba
 * el router de verdad, así que el arrastre no compraba nada.
 */
import { describe, it, expect } from 'vitest';
import { ejecutarResultado, navegarPorTexto, navegarPorPropuestaDelModelo } from '../argos-nav-exec-core';

/** Navegador de mentiras que apunta a dónde lo mandaron. */
function espia() {
  const visitadas: string[] = [];
  return { visitadas, navegar: (r: string) => { visitadas.push(r); } };
}

describe('cuando ARGOS se mueve', () => {
  it('navega si el destino es claro', () => {
    const e = espia();
    const r = navegarPorTexto('llévame a donde registro el ayuno', e.navegar);
    expect(e.visitadas).toEqual(['/fasting']);
    expect(r.navegoA).toBe('/fasting');
    expect(r.mensaje).toMatch(/Ayuno/);
  });

  it('NO navega cuando es ambiguo: pregunta', () => {
    const e = espia();
    const r = ejecutarResultado({
      tipo: 'ambigua',
      candidatos: [
        { ruta: '/journal-history', titulo: 'Historial del journal', puntaje: 10 },
        { ruta: '/emotion-history', titulo: 'Historial emocional', puntaje: 9 },
      ],
    }, e.navegar);
    expect(e.visitadas).toEqual([]);
    expect(r.navegoA).toBeUndefined();
    expect(r.mensaje).toMatch(/\?/);
    expect(r.opciones).toHaveLength(2);
  });

  it('NO navega cuando falta un dato', () => {
    const e = espia();
    const r = ejecutarResultado({
      tipo: 'requiere_dato', ruta: '/packs/[packKey]', titulo: 'Packs', parametro: 'packKey',
    }, e.navegar);
    expect(e.visitadas).toEqual([]);
    expect(r.mensaje).toMatch(/cuál en específico/);
  });

  it('NO navega a una ruta vetada', () => {
    const e = espia();
    const r = ejecutarResultado({ tipo: 'bloqueada', ruta: '/login', motivo: 'pantalla de sesión' }, e.navegar);
    expect(e.visitadas).toEqual([]);
    expect(r.navegoA).toBeUndefined();
  });

  it('NO navega ni inventa cuando no encuentra nada', () => {
    const e = espia();
    const r = navegarPorTexto('quiero pedir una pizza hawaiana', e.navegar);
    expect(e.visitadas).toEqual([]);
    expect(r.escalarAlModelo).toBe(true);
  });
});

describe('escalada al modelo (la decision de costo)', () => {
  it('lo que resuelve el indice local NO escala: es gratis', () => {
    const e = espia();
    for (const frase of ['quiero meditar', 'mi glucosa', 'el ayuno', 'mis suplementos']) {
      expect(navegarPorTexto(frase, e.navegar).escalarAlModelo, frase).toBe(false);
    }
  });

  it('solo escala cuando el indice no alcanzo', () => {
    const e = espia();
    expect(navegarPorTexto('esa cosa rara de antes', e.navegar).escalarAlModelo).toBe(true);
  });
});

describe('lo que propone el modelo se valida antes de moverse', () => {
  it('navega si la ruta existe', () => {
    const e = espia();
    const r = navegarPorPropuestaDelModelo('/fasting', e.navegar);
    expect(e.visitadas).toEqual(['/fasting']);
    expect(r.navegoA).toBe('/fasting');
  });

  it('NO navega a una ruta alucinada', () => {
    const e = espia();
    const r = navegarPorPropuestaDelModelo('/mis-analisis', e.navegar);
    expect(e.visitadas).toEqual([]);
    expect(r.navegoA).toBeUndefined();
  });

  it('NO reescala: seria un bucle con el modelo', () => {
    const e = espia();
    expect(navegarPorPropuestaDelModelo('/no-existe', e.navegar).escalarAlModelo).toBe(false);
  });

  it('NO navega a una vetada aunque el modelo insista', () => {
    const e = espia();
    navegarPorPropuestaDelModelo('/login', e.navegar);
    navegarPorPropuestaDelModelo('/onboarding/v2/welcome', e.navegar);
    expect(e.visitadas).toEqual([]);
  });

  it('tolera basura', () => {
    const e = espia();
    for (const v of [null, undefined, '', 'no soy ruta']) {
      expect(() => navegarPorPropuestaDelModelo(v as never, e.navegar)).not.toThrow?.();
    }
    expect(e.visitadas).toEqual([]);
  });
});

describe('copy de usuario', () => {
  it('cero em dash y cero jerga en los mensajes', () => {
    const e = espia();
    const mensajes = [
      navegarPorTexto('quiero meditar', e.navegar).mensaje,
      navegarPorTexto('pizza hawaiana', e.navegar).mensaje,
      navegarPorPropuestaDelModelo('/no-existe', e.navegar).mensaje,
      ejecutarResultado({ tipo: 'bloqueada', ruta: '/login', motivo: 'x' }, e.navegar).mensaje,
    ];
    for (const m of mensajes) {
      expect(m).not.toMatch(/—/);
      expect(m).not.toMatch(/undefined|null|router|pathname/);
      expect(m.length).toBeGreaterThan(5);
    }
  });
});
