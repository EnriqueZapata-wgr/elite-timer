/**
 * El guion del tutorial por pantalla. Es copy de usuario y ademas define a
 * donde apunta cada pieza, asi que las dos cosas se blindan aqui.
 *
 * SI ESTE TEST SE PONE ROJO por una ruta: la pieza apunta a una pantalla que
 * ya no existe. NO borres la comprobacion, reapunta la pieza.
 */
import { describe, it, expect } from 'vitest';
import {
  TOURS_POR_PANTALLA,
  tourDeRuta,
  tourPorId,
  tourPendiente,
  avanceTutorial,
  llaveTour,
  TOUR_VISTO_PREFIJO,
} from '@/src/components/tour/tours-por-pantalla';
import { APP_ROUTES } from '@/src/constants/app-routes.generated';

const RUTAS_REALES = new Set<string>(APP_ROUTES as readonly string[]);

describe('guion del tutorial por pantalla', () => {
  it('cada pieza apunta a una ruta que existe de verdad', () => {
    for (const t of TOURS_POR_PANTALLA) {
      expect(RUTAS_REALES.has(t.ruta), `${t.id} apunta a ${t.ruta}`).toBe(true);
    }
  });

  it('ids unicos, en piezas y en pasos', () => {
    const ids = TOURS_POR_PANTALLA.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOURS_POR_PANTALLA) {
      const pasos = t.pasos.map((p) => p.id);
      expect(new Set(pasos).size, `pasos repetidos en ${t.id}`).toBe(pasos.length);
    }
  });

  it('una ruta no puede tener dos piezas', () => {
    const rutas = TOURS_POR_PANTALLA.map((t) => t.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it('las piezas son cortas: entre uno y cuatro pasos', () => {
    for (const t of TOURS_POR_PANTALLA) {
      expect(t.pasos.length, `${t.id}`).toBeGreaterThanOrEqual(1);
      expect(t.pasos.length, `${t.id}`).toBeLessThanOrEqual(4);
    }
  });

  it('cero guion largo y frases cortas en todo el copy de usuario', () => {
    for (const t of TOURS_POR_PANTALLA) {
      for (const texto of [t.titulo, t.resumen]) {
        expect(texto.includes('\u2014'), `em dash en ${t.id}`).toBe(false);
      }
      for (const p of t.pasos) {
        expect(p.copy.includes('\u2014'), `em dash en ${t.id}/${p.id}`).toBe(false);
        expect(p.copy.length, `copy largo en ${t.id}/${p.id}`).toBeLessThanOrEqual(140);
        expect(p.kicker, `kicker en ${t.id}/${p.id}`).toBe(p.kicker.toUpperCase());
      }
    }
  });

  it('los kickers van acentuados: en español las mayúsculas se acentúan', () => {
    // Sin esto, 'TU DIA' pasa el candado de mayúsculas y sale a producción.
    const SIN_ACENTO = /\b(DIA|CONFIGURACION|SECCION|EVOLUCION|PROTOCOLO_)\b/;
    for (const t of TOURS_POR_PANTALLA) {
      for (const p of t.pasos) {
        expect(SIN_ACENTO.test(p.kicker), `${t.id}/${p.id}: ${p.kicker}`).toBe(false);
      }
    }
  });

  it('cero promesas de salud y cero lenguaje de consulta', () => {
    // Mismo criterio que packs-registry: la app describe lo que HACE, nunca
    // lo que la persona va a sentir ni un acto medico.
    const PROHIBIDAS = /\b(cura|curar|diagnostic|tratamiento|receta|paciente|s[ií]ntoma s|padecimient)/i;
    for (const t of TOURS_POR_PANTALLA) {
      for (const p of t.pasos) {
        expect(PROHIBIDAS.test(p.copy), `${t.id}/${p.id}: ${p.copy}`).toBe(false);
      }
      expect(PROHIBIDAS.test(t.resumen), `${t.id} resumen`).toBe(false);
    }
  });

  it('la Edad ATP se sigue presentando como ventana educativa', () => {
    // Candado de tienda. Si alguien suaviza esta frase, truena aqui.
    const salud = tourPorId('salud');
    const edad = salud?.pasos.find((p) => p.id === 'edad');
    expect(edad?.copy).toContain('No es una evaluación médica');
  });

  it('el paso de los dos gestos sigue ensenando la regla real', () => {
    const hoy = tourPorId('hoy');
    const gestos = hoy?.pasos.find((p) => p.id === 'gestos');
    expect(gestos?.copy).toMatch(/toque/i);
    expect(gestos?.copy).toMatch(/presionado/i);
  });

  it('tourDeRuta encuentra por ruta y devuelve null si no hay', () => {
    expect(tourDeRuta('/kit')?.id).toBe('kit');
    expect(tourDeRuta('/ruta-que-no-existe')).toBeNull();
  });

  it('una pieza vista no se vuelve a lanzar sola', () => {
    const vacio = new Set<string>();
    expect(tourPendiente('/kit', vacio)?.id).toBe('kit');
    expect(tourPendiente('/kit', new Set(['kit']))).toBeNull();
  });

  it('el silencio del usuario manda sobre todo lo demas', () => {
    expect(tourPendiente('/kit', new Set<string>(), true)).toBeNull();
  });

  it('una ruta sin pieza nunca lanza nada', () => {
    expect(tourPendiente('/glucose-log', new Set<string>())).toBeNull();
  });

  it('la llave en disco lleva prefijo propio y el id', () => {
    expect(llaveTour('kit')).toBe(`${TOUR_VISTO_PREFIJO}kit`);
  });

  it('el avance cuenta piezas vistas contra el total', () => {
    expect(avanceTutorial(new Set<string>())).toEqual({
      vistos: 0,
      total: TOURS_POR_PANTALLA.length,
    });
    expect(avanceTutorial(new Set(['hoy', 'kit'])).vistos).toBe(2);
  });
});
