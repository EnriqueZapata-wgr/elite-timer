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

describe('VOZ-1 — la conjugación ya no decide (el bug que reportó el dueño)', () => {
  // "Me muestras mis labs?" contestaba con un resumen larguísimo en vez de abrir
  // la pantalla, porque la lista vieja traía "muestrame" y no "me muestras".
  // Exigir la fórmula exacta es lo contrario de tener un modelo de lenguaje.
  const familia = [
    'Me muestras mis labs?',
    'muéstrame mis labs',
    'puedes mostrarme mis labs',
    'me llevas a mis labs',
    'ábreme mis labs',
    'quiero ver mis labs',
    '¿me enseñas mis análisis?',
    'llévame a mis análisis',
  ];
  for (const frase of familia) {
    it(`"${frase}" navega`, () => {
      const t = decidirTurnoNav(frase);
      expect(t.accion).toBe('navegar');
      if (t.accion === 'navegar') expect(t.ruta).toBe('/edad-atp/labs');
    });
  }
});

describe('VOZ-1 — un destino a secas se OFRECE, nunca se navega solo', () => {
  // "Si tiene duda, que pregunte". Escribir "mis labs" puede querer decir dos
  // cosas: llévame, o cuéntame. Adivinar cualquiera de las dos es apostar.
  for (const frase of ['mis labs', 'labs', 'mi agenda', 'hidratación', 'el ayuno']) {
    it(`"${frase}" pregunta con UNA opción`, () => {
      const t = decidirTurnoNav(frase);
      expect(t.accion).toBe('preguntar');
      if (t.accion === 'preguntar') {
        expect(t.opciones).toHaveLength(1);
        expect(t.mensaje).toContain('¿Te llevo a');
      }
    });
  }

  it('la duda NUNCA escala al modelo: preguntar cuesta cero', () => {
    // Si el índice local no resolvió con holgura, el turno sigue al chat como
    // siempre. Escalar una corazonada sería pagar por adivinar.
    const t = decidirTurnoNav('estoy cansado');
    expect(t.accion).toBe('chat');
    if (t.accion === 'chat') expect(t.escalable).toBe(false);
  });

  it('una frase con palabras que la app no conoce no se lee como destino', () => {
    // "ayuno 16 8" es una pregunta sobre el protocolo, no una petición.
    expect(decidirTurnoNav('ayuno 16 8').accion).toBe('chat');
    expect(decidirTurnoNav('gracias ARGOS').accion).toBe('chat');
  });

  it('no ofrece llevarte al chat estando en el chat', () => {
    expect(decidirTurnoNav('argos').accion).toBe('chat');
  });

  it('una consulta de salud corta no se convierte en oferta de navegación', () => {
    for (const frase of ['cómo bajo de peso', 'no dormí bien', 'tengo antojo de dulce']) {
      expect(decidirTurnoNav(frase).accion).toBe('chat');
    }
  });
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
    // VOZ-1: lo que lo descarta ya no es la posición absoluta sino el ORDEN.
    // Aquí el destino ("ayuno") va ANTES del verbo ("lleva"), así que el destino
    // es el sujeto de otra cosa. Esa es la diferencia gramatical de verdad entre
    // pedir un traslado y contar un síntoma.
    const d = detectarIntencionNavegacion('el ayuno me lleva a dormir mal');
    expect(d.es).toBe(false);
    expect(d.duda).not.toBe(true);
    expect(d.motivo).toBe('sin_disparador');
  });

  it('un vocativo de enfrente no cambia el veredicto', () => {
    // "oye ARGOS, me muestras mis labs" es la misma petición que sin el saludo.
    expect(detectarIntencionNavegacion('oye ARGOS, me muestras mis labs').es).toBe(true);
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
