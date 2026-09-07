/**
 * primera-sesion-core — candados de la primera sesion (pivote limpio,
 * 7 de septiembre de 2026).
 *
 * Lo que se protege aqui no es el codigo, es la promesa: seis pantallas, todos
 * los objetivos alcanzables, y nadie sin ruta.
 */
import { describe, it, expect } from 'vitest';
import {
  PASOS_PRIMERA_SESION,
  TOTAL_PANTALLAS_PRIMERA_SESION,
  rutaPrimeraSesion,
  numeroDePantalla,
  pasoPersistido,
  siguientePaso,
  resolvePrimeraSesion,
  esPasoPrimeraSesion,
  INTENCIONES_INICIALES,
  intencionesVisibles,
  objetivosVisibles,
  objetivoPropuesto,
  objetivosCercanos,
  objetivosAlcanzables,
  todosLosObjetivos,
  minutosDeHora,
  horasDeVentanaDeSueno,
} from '@/src/services/primera-sesion-core';
import { PACKS, PAQUETES_SALUD } from '@/src/constants/packs';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';

describe('la primera sesion son SEIS pantallas', () => {
  it('cinco pasos dentro de la app mas el registro', () => {
    expect(PASOS_PRIMERA_SESION.length).toBe(5);
    expect(TOTAL_PANTALLAS_PRIMERA_SESION).toBe(6);
    // El registro es la 1: el primer paso de adentro es la 2.
    expect(numeroDePantalla('preguntas')).toBe(2);
    expect(numeroDePantalla('dia-1')).toBe(TOTAL_PANTALLAS_PRIMERA_SESION);
  });

  it('el orden es el del plan', () => {
    expect([...PASOS_PRIMERA_SESION]).toEqual([
      'preguntas', 'objetivo', 'armado', 'punto-de-partida', 'dia-1',
    ]);
  });

  it('rutas y encadenado', () => {
    expect(rutaPrimeraSesion('objetivo')).toBe('/primera-sesion/objetivo');
    expect(siguientePaso('preguntas')).toBe('objetivo');
    expect(siguientePaso('punto-de-partida')).toBe('dia-1');
    expect(siguientePaso('dia-1')).toBeNull();
  });
});

describe('el paso persistido', () => {
  it('se guarda con prefijo ps_ y se resuelve de vuelta', () => {
    expect(pasoPersistido('armado')).toBe('ps_armado');
    expect(resolvePrimeraSesion('ps_armado')).toBe('/primera-sesion/armado');
    expect(resolvePrimeraSesion('ps_punto-de-partida')).toBe('/primera-sesion/punto-de-partida');
  });

  it('lo que no es de esta primera sesion devuelve null, no truena', () => {
    for (const v of ['completed', 'pending', 'v2_profile', 'ps_bogus', '', null, undefined]) {
      expect(resolvePrimeraSesion(v)).toBeNull();
    }
  });

  it('esPasoPrimeraSesion no acepta basura', () => {
    expect(esPasoPrimeraSesion('dia-1')).toBe(true);
    expect(esPasoPrimeraSesion('welcome')).toBe(false);
  });
});

describe('las intenciones de la pregunta 1', () => {
  it('cada intencion propone un objetivo que existe en el catalogo', () => {
    const llaves = new Set(todosLosObjetivos().map((p) => p.key));
    for (const i of INTENCIONES_INICIALES) {
      expect(llaves.has(i.propone), `propuesta rota: ${i.id}`).toBe(true);
      for (const a of i.alternativas) {
        expect(llaves.has(a), `alternativa rota: ${i.id} → ${a}`).toBe(true);
      }
    }
  });

  /**
   * El candado que importa: se sale con 20 objetivos y los 20 tienen que poder
   * elegirse. Uno que no sea alcanzable desde ninguna intencion es un objetivo
   * que la persona no puede tener, aunque este escrito en el registro.
   */
  it('los 20 objetivos son alcanzables desde alguna intencion', () => {
    const alcanzables = objetivosAlcanzables();
    const total = PACKS.length + PAQUETES_SALUD.length;
    expect(total).toBe(20);
    for (const p of todosLosObjetivos()) {
      expect(alcanzables.has(p.key), `objetivo inalcanzable: ${p.key}`).toBe(true);
    }
  });

  /**
   * Regla MB-19.2: ningun icono a mano. El tipo ya lo exige en compilacion;
   * esto lo comprueba tambien en corrida, porque el censo de iconos barre por
   * nombre y una intencion con un nombre inventado pintaria un hueco.
   */
  it('los iconos de las intenciones existen en el mapa', () => {
    for (const i of INTENCIONES_INICIALES) {
      expect(hasAppIcon(i.icon), `icono inexistente: ${i.id} → ${i.icon}`).toBe(true);
    }
  });

  it('todo objetivo trae mide y noInstala, que es lo que la pantalla 3 y la 4 pintan', () => {
    for (const p of todosLosObjetivos()) {
      expect(p.mide.que.length, p.key).toBeGreaterThan(0);
      expect(p.mide.seNotaEn.length, p.key).toBeGreaterThan(0);
      expect(p.noInstala.length, p.key).toBeGreaterThan(0);
    }
  });
});

describe('el objetivo del ciclo no se le ofrece a quien no tiene ciclo', () => {
  it('con ciclo desconocido no se ofrece y tampoco se descarta para siempre', () => {
    expect(intencionesVisibles(null).some((i) => i.soloConCiclo)).toBe(false);
    expect(intencionesVisibles(false).some((i) => i.soloConCiclo)).toBe(false);
    expect(intencionesVisibles(true).some((i) => i.soloConCiclo)).toBe(true);
  });

  it('el filtro tambien aplica a la lista completa de objetivos', () => {
    expect(objetivosVisibles(false).some((p) => p.soloConCiclo)).toBe(false);
    expect(objetivosVisibles(true).some((p) => p.soloConCiclo)).toBe(true);
  });

  it('la propuesta condicionada no se abre por URL', () => {
    expect(objetivoPropuesto('ciclo', false)).toBeNull();
    expect(objetivoPropuesto('ciclo', null)).toBeNull();
    expect(objetivoPropuesto('ciclo', true)?.key).toBe('mi-ciclo-a-mi-favor');
  });

  it('una intencion inventada no truena: no hay propuesta y quedan todos los objetivos', () => {
    expect(objetivoPropuesto('no-existe', true)).toBeNull();
    expect(objetivosCercanos('no-existe', false).length).toBe(objetivosVisibles(false).length);
  });
});

describe('los objetivos cercanos ordenan sin esconder', () => {
  it('las alternativas van primero y el propuesto no se repite', () => {
    const cercanos = objetivosCercanos('dormir', false);
    expect(cercanos.some((p) => p.key === 'dormir-mejor')).toBe(false);
    expect(cercanos[0].key).toBe('mananas-con-pila');
    expect(cercanos[1].key).toBe('cabeza-en-silencio');
    // La lista completa sigue estando: cambiar de objetivo nunca deja fuera a
    // los demas, solo los ordena.
    expect(cercanos.length).toBe(objetivosVisibles(false).length - 1);
  });
});

describe('la ventana de sueno declarada', () => {
  it('cruza la medianoche, que es el caso normal', () => {
    expect(horasDeVentanaDeSueno('07:00', '23:00')).toBe(8);
    expect(horasDeVentanaDeSueno('06:30', '22:45')).toBe(7.75);
  });

  it('sirve tambien cuando no cruza la medianoche', () => {
    expect(horasDeVentanaDeSueno('12:00', '03:00')).toBe(9);
  });

  it('una ventana imposible no es un dato: devuelve null', () => {
    expect(horasDeVentanaDeSueno('07:00', '07:00')).toBeNull();
    expect(horasDeVentanaDeSueno('7:00', '23:00')).toBeNull();
    expect(horasDeVentanaDeSueno('25:00', '23:00')).toBeNull();
    expect(horasDeVentanaDeSueno(null, '23:00')).toBeNull();
  });

  it('minutosDeHora exige dos digitos, igual que el CHECK de user_packs', () => {
    expect(minutosDeHora('00:00')).toBe(0);
    expect(minutosDeHora('23:59')).toBe(1439);
    expect(minutosDeHora('24:00')).toBeNull();
    expect(minutosDeHora('12:60')).toBeNull();
  });
});
