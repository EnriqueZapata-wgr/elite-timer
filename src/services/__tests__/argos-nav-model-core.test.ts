/**
 * Tests del respaldo con modelo (NOCHE-ARGOS Pieza 8).
 *
 * Candado de doctrina: las rutas VETADAS no viajan en el prompt. Si no están en
 * la lista, el modelo no puede proponerlas y el veto deja de depender de que el
 * filtro de salida se acuerde de correr. Si truena, se reapunta el catálogo, no
 * se quita el test.
 */
import { describe, it, expect } from 'vitest';
import {
  construirPromptNav,
  extraerRutaDeRespuesta,
  catalogoNavegable,
  _resetCatalogo,
  SIN_RUTA,
} from '../argos-nav-model-core';
import { rutaVetada, validarRutaPropuesta } from '../argos-nav-resolver-core';

describe('extraerRutaDeRespuesta — el modelo adorna aunque se le pida que no', () => {
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

describe('el catálogo que ve el modelo', () => {
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
