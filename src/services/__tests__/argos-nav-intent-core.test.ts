/**
 * Tests del filtro de intención de navegación (NOCHE-ARGOS Pieza 5).
 *
 * El candado de doctrina de este archivo: ante la duda, gana el CHAT. Navegar
 * de más saca al usuario de donde estaba parado en medio de una consulta de
 * salud; contestar de más solo cuesta un turno. Si un test de "esto NO es
 * navegación" truena, se reapunta el detector, no se relaja el test.
 */
import { describe, it, expect } from 'vitest';
import {
  detectarIntencionNavegacion,
  decidirTurnoNav,
  turnoDesdeResultado,
  MAX_PALABRAS_NAV,
} from '../argos-nav-intent-core';

describe('detectarIntencionNavegacion — lo que SÍ es pedir traslado', () => {
  const positivos = [
    'llévame a donde registro el ayuno',
    'llevame al ayuno',
    '¿dónde veo mis análisis?',
    'donde registro el agua',
    'ábreme el chat con ARGOS',
    'abre la agenda',
    'muéstrame el calendario del ciclo',
    'quiero ver mis análisis',
    'cómo llego a la respiración guiada',
    'ir a hidratación',
    'busco la cocina',
  ];
  for (const frase of positivos) {
    it(`"${frase}"`, () => {
      expect(detectarIntencionNavegacion(frase).es).toBe(true);
    });
  }
});

describe('detectarIntencionNavegacion — lo que NO es, aunque lo parezca', () => {
  it('una consulta de salud que menciona una pantalla no navega', () => {
    const d = detectarIntencionNavegacion('me duele la cabeza cuando hago ayuno');
    expect(d.es).toBe(false);
  });

  it('"por qué" delata consulta de fondo aunque traiga "dónde"', () => {
    const d = detectarIntencionNavegacion('dónde veo por qué subí de peso');
    expect(d.es).toBe(false);
    expect(d.motivo).toBe('veto_semantico');
  });

  it('preguntar para qué sirve algo NO es pedir que te lleven', () => {
    // Ese turno lo atiende la inyección de contexto de pantalla, no el navegador.
    const d = detectarIntencionNavegacion('para qué sirve esta pantalla');
    expect(d.es).toBe(false);
    expect(d.motivo).toBe('veto_semantico');
  });

  it('un párrafo largo con un verbo de navegación en medio no es navegación', () => {
    const largo = 'oye ' + 'palabra '.repeat(MAX_PALABRAS_NAV) + 'abre eso';
    const d = detectarIntencionNavegacion(largo);
    expect(d.es).toBe(false);
    expect(d.motivo).toBe('demasiado_largo');
  });

  it('sin verbo de navegación al arranque, no navega', () => {
    const d = detectarIntencionNavegacion('el ayuno me lleva a dormir mal');
    expect(d.es).toBe(false);
    expect(d.motivo).toBe('sin_disparador');
  });

  it('texto vacío o nulo no revienta', () => {
    expect(detectarIntencionNavegacion('').es).toBe(false);
    expect(detectarIntencionNavegacion(null).es).toBe(false);
    expect(detectarIntencionNavegacion(undefined).es).toBe(false);
  });

  it('un saludo no navega', () => {
    expect(detectarIntencionNavegacion('hola ARGOS, buenos días').es).toBe(false);
  });
});

describe('turnoDesdeResultado — el contrato de no adivinar', () => {
  it('resuelta navega y avisa a dónde', () => {
    const t = turnoDesdeResultado({
      tipo: 'resuelta', ruta: '/fasting', titulo: 'Ayuno', puntaje: 9,
    });
    expect(t.accion).toBe('navegar');
    if (t.accion === 'navegar') {
      expect(t.ruta).toBe('/fasting');
      expect(t.mensaje).toContain('Ayuno');
    }
  });

  it('ambigua PREGUNTA con las dos opciones, no elige', () => {
    const t = turnoDesdeResultado({
      tipo: 'ambigua',
      candidatos: [
        { ruta: '/cycle', titulo: 'Calendario del ciclo', puntaje: 5 },
        { ruta: '/cycle-charts', titulo: 'Gráficas del ciclo', puntaje: 4 },
      ],
    });
    expect(t.accion).toBe('preguntar');
    if (t.accion === 'preguntar') {
      expect(t.opciones).toHaveLength(2);
      expect(t.mensaje).toContain('Calendario del ciclo');
      expect(t.mensaje).toContain('Gráficas del ciclo');
    }
  });

  it('bloqueada avisa y NO devuelve ruta para navegar', () => {
    const t = turnoDesdeResultado({ tipo: 'bloqueada', ruta: '/login', motivo: 'sesión' });
    expect(t.accion).toBe('avisar');
  });

  it('sin_resultado cae a chat marcado como escalable', () => {
    const t = turnoDesdeResultado({ tipo: 'sin_resultado', sugerencias: [] });
    expect(t.accion).toBe('chat');
    if (t.accion === 'chat') expect(t.escalable).toBe(true);
  });
});

describe('decidirTurnoNav — puerta única, de punta a punta', () => {
  it('"llévame a donde registro el ayuno" termina navegando de verdad', () => {
    const t = decidirTurnoNav('llévame a donde registro el ayuno');
    expect(t.accion).toBe('navegar');
    if (t.accion === 'navegar') expect(t.ruta).toContain('fast');
  });

  it('una consulta de salud nunca llega al resolvedor', () => {
    const t = decidirTurnoNav('me duele la cabeza cuando hago ayuno');
    expect(t.accion).toBe('chat');
    // escalable=false: ni siquiera vale la pena preguntarle al modelo A DÓNDE.
    if (t.accion === 'chat') expect(t.escalable).toBe(false);
  });

  it('pedir el login no navega: se avisa y el usuario se queda donde está', () => {
    const t = decidirTurnoNav('llévame al login');
    expect(t.accion).not.toBe('navegar');
  });

  it('pedir una pizza no navega a ningún lado de la app', () => {
    const t = decidirTurnoNav('quiero ver una pizza hawaiana');
    expect(t.accion).toBe('chat');
  });
});
