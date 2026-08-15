/**
 * Tests del rastro de la última pantalla (NOCHE-ARGOS Pieza 6).
 *
 * Candado de doctrina: abrir el chat NO puede borrar de dónde vienes. Si un
 * test de "las rutas de ARGOS no se registran" truena, se reapunta el filtro,
 * no se relaja el test: sin esa regla la inyección siempre diría "el usuario
 * está en ARGOS", que es cierto y es inútil.
 */
import { describe, it, expect } from 'vitest';
import {
  registrarRuta,
  ultimaRutaVisitada,
  esRutaDeArgos,
  _resetUltimaRuta,
} from '../argos-last-route';
import { construirInyeccionPantalla } from '../argos-screen-explain-core';

describe('registrarRuta', () => {
  it('arranca vacío: abrir ARGOS de entrada no inventa una pantalla', () => {
    _resetUltimaRuta();
    expect(ultimaRutaVisitada()).toBeNull();
  });

  it('recuerda la última pantalla real', () => {
    _resetUltimaRuta();
    registrarRuta('/edad-atp/labs');
    expect(ultimaRutaVisitada()).toBe('/edad-atp/labs');
    registrarRuta('/fasting');
    expect(ultimaRutaVisitada()).toBe('/fasting');
  });

  it('abrir el chat NO borra de dónde venías', () => {
    _resetUltimaRuta();
    registrarRuta('/edad-atp/labs');
    registrarRuta('/argos-chat');
    registrarRuta('/argos/conversations');
    expect(ultimaRutaVisitada()).toBe('/edad-atp/labs');
  });

  it('ignora vacíos sin romper el rastro', () => {
    _resetUltimaRuta();
    registrarRuta('/cocina');
    registrarRuta('');
    registrarRuta(null);
    registrarRuta(undefined);
    expect(ultimaRutaVisitada()).toBe('/cocina');
  });

  it('esRutaDeArgos reconoce las tres puertas del chat', () => {
    expect(esRutaDeArgos('/argos-chat')).toBe(true);
    expect(esRutaDeArgos('/argos')).toBe(true);
    expect(esRutaDeArgos('/argos/conversations')).toBe(true);
    expect(esRutaDeArgos('/edad-atp/labs')).toBe(false);
  });
});

describe('el rastro alimenta de verdad la inyección de pantalla', () => {
  it('una ruta catalogada produce el bloque fino, no el grueso por pilar', () => {
    _resetUltimaRuta();
    registrarRuta('/fasting');
    const bloque = construirInyeccionPantalla(ultimaRutaVisitada());
    expect(bloque).toContain('## PANTALLA ACTUAL');
    // La directriz de no citar jerga interna tiene que viajar SIEMPRE con el
    // material, porque el material son docblocks de desarrollo.
    expect(bloque).toContain('NUNCA cites códigos de ticket');
  });

  it('sin rastro no se inventa bloque', () => {
    _resetUltimaRuta();
    expect(ultimaRutaVisitada()).toBeNull();
  });
});
