/**
 * Tests del respaldo con modelo (NOCHE-ARGOS Pieza 8).
 *
 * Candado de doctrina: las rutas VETADAS no viajan en el prompt. Si no están en
 * la lista, el modelo no puede proponerlas y el veto deja de depender de que el
 * filtro de salida se acuerde de correr. Si truena, se reapunta el catálogo, no
 * se quita el test.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  construirPromptNav,
  extraerRutaDeRespuesta,
  catalogoNavegable,
  _resetCatalogo,
  SIN_RUTA,
} from '../argos-nav-model-core';
import { rutaVetada, validarRutaPropuesta } from '../argos-nav-resolver-core';
// 26-sep-2026 (una app, dos modos): el catalogo depende del modo de la cuenta.
// Cada describe fija su modo y lo deja limpio (el estado es de modulo y el
// runner comparte proceso entre archivos).
import { fijarModoPorCuenta, reiniciarModoParaPruebas } from '@/src/services/modo-app/modo-app-estado';
import type { ModoApp } from '@/src/services/modo-app/modo-app-core';

const MODOS: readonly ModoApp[] = ['elite_dx', 'atp'];

function enModo(modo: ModoApp): void {
  beforeEach(() => {
    reiniciarModoParaPruebas();
    fijarModoPorCuenta(modo);
  });
  afterEach(() => reiniciarModoParaPruebas());
}

for (const modo of MODOS) describe(`extraerRutaDeRespuesta — el modelo adorna aunque se le pida que no (modo ${modo})`, () => {
  enModo(modo);
  it('la respuesta limpia', () => {
    expect(extraerRutaDeRespuesta('/fasting')).toBe('/fasting');
  });

  it('con explicación alrededor', () => {
    expect(extraerRutaDeRespuesta('La ruta es: /fasting.')).toBe('/fasting');
  });

  it('entre comillas o backticks', () => {
    expect(extraerRutaDeRespuesta('"/labs"')).toBe('/labs');
    expect(extraerRutaDeRespuesta('`/labs`')).toBe('/labs');
  });

  it('con salto de línea y espacios', () => {
    expect(extraerRutaDeRespuesta('\n  /cocina  \n')).toBe('/cocina');
  });

  it(`${SIN_RUTA} no es una ruta`, () => {
    expect(extraerRutaDeRespuesta(SIN_RUTA)).toBeNull();
    expect(extraerRutaDeRespuesta('Ninguna de las pantallas corresponde')).toBeNull();
  });

  it('vacío, nulo y texto sin ruta devuelven null', () => {
    expect(extraerRutaDeRespuesta('')).toBeNull();
    expect(extraerRutaDeRespuesta(null)).toBeNull();
    expect(extraerRutaDeRespuesta(undefined)).toBeNull();
    expect(extraerRutaDeRespuesta('no sé a qué te refieres')).toBeNull();
  });

  it('una ruta alucinada se extrae pero NO pasa la validación', () => {
    const r = extraerRutaDeRespuesta('/mis-analisis');
    expect(r).toBe('/mis-analisis');
    // La red de seguridad: el catálogo tiene la última palabra.
    expect(validarRutaPropuesta(r).tipo).toBe('sin_resultado');
  });
});

for (const modo of MODOS) describe(`el catálogo que ve el modelo (modo ${modo})`, () => {
  enModo(modo);

  it('trae las salas de su modo y no las del otro', () => {
    _resetCatalogo();
    const rutas = new Set(catalogoNavegable().map((c) => c.ruta));
    const propias = modo === 'elite_dx' ? ['/programa', '/tu'] : ['/salud', '/tribu', '/kit'];
    const ajenas = modo === 'elite_dx' ? ['/salud', '/tribu', '/kit'] : ['/programa', '/tu', '/progreso'];
    for (const r of propias) expect(rutas.has(r), r).toBe(true);
    for (const r of ajenas) expect(rutas.has(r), r).toBe(false);
  });

  it('ninguna ruta vetada viaja en el prompt', () => {
    _resetCatalogo();
    const cat = catalogoNavegable();
    for (const entrada of cat) {
      expect(rutaVetada(entrada.ruta)).toBeNull();
    }
  });

  it('el login y el paywall no están', () => {
    _resetCatalogo();
    const rutas = catalogoNavegable().map((c) => c.ruta);
    expect(rutas).not.toContain('/login');
    expect(rutas).not.toContain('/paywall');
    expect(rutas).not.toContain('/settings/dev');
  });

  it('trae suficientes pantallas para ser útil', () => {
    _resetCatalogo();
    expect(catalogoNavegable().length).toBeGreaterThan(100);
  });

  it('cada entrada trae título de usuario, nunca el docblock crudo', () => {
    _resetCatalogo();
    for (const entrada of catalogoNavegable()) {
      expect(entrada.titulo.length).toBeGreaterThan(0);
      // Los códigos de ticket son jerga interna y no pueden llegar al modelo
      // como si fueran nombre de pantalla.
      expect(/\bMB-\d+|\bOLA\d/.test(entrada.titulo)).toBe(false);
    }
  });
});

describe('el catálogo sigue al modo con la app abierta (26-sep-2026)', () => {
  beforeEach(() => reiniciarModoParaPruebas());
  afterEach(() => reiniciarModoParaPruebas());
  it('se rehace al cambiar de modo, sin tirar la memo a mano', () => {
    fijarModoPorCuenta('elite_dx');
    expect(catalogoNavegable().some((c) => c.ruta === '/programa')).toBe(true);
    fijarModoPorCuenta('atp');
    expect(catalogoNavegable().some((c) => c.ruta === '/programa')).toBe(false);
    expect(catalogoNavegable().some((c) => c.ruta === '/salud')).toBe(true);
    fijarModoPorCuenta('elite_dx');
    expect(catalogoNavegable().some((c) => c.ruta === '/salud')).toBe(false);
  });
});

describe('construirPromptNav', () => {
  it('lista las rutas con su título', () => {
    const p = construirPromptNav([{ ruta: '/fasting', titulo: 'Ayuno' }]);
    expect(p).toContain('/fasting = Ayuno');
  });

  it('le da salida cuando ninguna corresponde', () => {
    const p = construirPromptNav([{ ruta: '/fasting', titulo: 'Ayuno' }]);
    expect(p).toContain(SIN_RUTA);
  });

  it('le prohíbe inventar', () => {
    const p = construirPromptNav([{ ruta: '/fasting', titulo: 'Ayuno' }]);
    expect(p).toContain('NUNCA inventes');
  });
});
