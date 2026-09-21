/**
 * reloj-core (bloque TIMERS) — un solo reloj, tiempo inyectado, cero ticks.
 * Fija el contrato que los cinco modos comparten: arranque, pausa sin perder
 * tiempo, salto hacia adelante (segundo plano), fin exacto y las fronteras
 * de cada máquina de modo.
 */
import { describe, it, expect } from 'vitest';
import {
  RELOJ_DETENIDO,
  iniciar,
  pausar,
  reanudar,
  reiniciar,
  normalizar,
  transcurridoMs,
  restanteMs,
  segundosRestantes,
  descansoRestante,
  faseEmom,
  faseMyoReps,
  faseMethod35,
  feedbackMethod35,
} from '../reloj-core';

const T0 = 1_700_000_000_000;

describe('reloj: arranque', () => {
  it('detenido marca 0 y el restante es la duración completa', () => {
    expect(transcurridoMs(RELOJ_DETENIDO, T0 + 99_999)).toBe(0);
    expect(restanteMs(RELOJ_DETENIDO, 60_000, T0 + 99_999)).toBe(60_000);
  });

  it('iniciar arranca en cero y el transcurrido sale de ahoraMs, no de ticks', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    expect(r.corriendo).toBe(true);
    expect(transcurridoMs(r, T0)).toBe(0);
    expect(transcurridoMs(r, T0 + 5_000)).toBe(5_000);
    expect(restanteMs(r, 60_000, T0 + 5_000)).toBe(55_000);
  });

  it('iniciar sobre un reloj que ya corría vuelve a cero', () => {
    const r1 = iniciar(RELOJ_DETENIDO, T0);
    const r2 = iniciar(r1, T0 + 40_000);
    expect(transcurridoMs(r2, T0 + 41_000)).toBe(1_000);
  });

  it('RELOJ_DETENIDO no se muta al reiniciar', () => {
    const r = reiniciar();
    expect(r).toEqual({ inicioMs: null, acumuladoMs: 0, corriendo: false });
    expect(r).not.toBe(RELOJ_DETENIDO);
  });
});

describe('reloj: pausa y reanuda sin perder tiempo', () => {
  it('pausar congela el acumulado; el tiempo de pausa no cuenta', () => {
    const r = pausar(iniciar(RELOJ_DETENIDO, T0), T0 + 3_000);
    expect(r.corriendo).toBe(false);
    expect(r.acumuladoMs).toBe(3_000);
    expect(transcurridoMs(r, T0 + 10_000)).toBe(3_000);
  });

  it('reanudar suma un tramo nuevo al acumulado', () => {
    const p = pausar(iniciar(RELOJ_DETENIDO, T0), T0 + 3_000);
    const r = reanudar(p, T0 + 10_000);
    expect(transcurridoMs(r, T0 + 12_000)).toBe(5_000);
    expect(restanteMs(r, 60_000, T0 + 12_000)).toBe(55_000);
  });

  it('dos pausas seguidas acumulan bien', () => {
    let r = iniciar(RELOJ_DETENIDO, T0);
    r = pausar(r, T0 + 1_000);
    r = reanudar(r, T0 + 5_000);
    r = pausar(r, T0 + 7_500);
    r = reanudar(r, T0 + 20_000);
    expect(transcurridoMs(r, T0 + 20_500)).toBe(4_000);
  });

  it('pausar un reloj detenido y reanudar uno que corre no cambian nada', () => {
    const corriendo = iniciar(RELOJ_DETENIDO, T0);
    expect(reanudar(corriendo, T0 + 5)).toBe(corriendo);
    expect(pausar(RELOJ_DETENIDO, T0 + 5)).toBe(RELOJ_DETENIDO);
  });

  it('reanudar un reloj nunca iniciado equivale a iniciar', () => {
    const r = reanudar(RELOJ_DETENIDO, T0);
    expect(transcurridoMs(r, T0 + 2_000)).toBe(2_000);
  });
});

describe('reloj: salto hacia adelante (app 90 s en segundo plano)', () => {
  it('al volver, el transcurrido refleja los 90 s aunque no hubo ticks', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    expect(transcurridoMs(r, T0 + 90_000)).toBe(90_000);
    expect(restanteMs(r, 60_000, T0 + 90_000)).toBe(0);
  });

  it('un descanso de 60 s ya terminó; uno de 120 s va por 30', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    const t = transcurridoMs(r, T0 + 90_000);
    expect(descansoRestante(t, 60)).toEqual({ restanteSeg: 0, terminado: true });
    expect(descansoRestante(t, 120)).toEqual({ restanteSeg: 30, terminado: false });
  });

  it('un EMOM de 10 rondas va en la ronda 2 con una ronda cerrada', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    const f = faseEmom(transcurridoMs(r, T0 + 90_000), { rondas: 10 });
    expect(f).toEqual({ ronda: 2, restanteSeg: 30, rondasCerradas: 1, terminado: false });
  });

  it('si el reloj del sistema retrocede, el transcurrido no se vuelve negativo', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    expect(transcurridoMs(r, T0 - 5_000)).toBe(0);
    expect(restanteMs(r, 10_000, T0 - 5_000)).toBe(10_000);
  });
});

describe('reloj: reloj del sistema hacia atrás (ajuste NTP) con re-anclaje por lectura', () => {
  it('lo ya leído se conserva vía acumulado y no vuelve a cero; después sigue sumando', () => {
    let r = iniciar(RELOJ_DETENIDO, 100_000);
    r = normalizar(r, 120_000);
    expect(transcurridoMs(r, 120_000)).toBe(20_000);
    // El sistema retrocede 30 s: el tramo abierto cuenta 0 y los 20 s no se pierden.
    r = normalizar(r, 90_000);
    expect(transcurridoMs(r, 90_000)).toBe(20_000);
    expect(r).toEqual({ inicioMs: 90_000, acumuladoMs: 20_000, corriendo: true });
    r = normalizar(r, 95_000);
    expect(transcurridoMs(r, 95_000)).toBe(25_000);
    expect(restanteMs(r, 60_000, 95_000)).toBe(35_000);
  });

  it('sin re-anclar, el mismo retroceso colapsaba el tramo a 0 (el bug que esto cierra)', () => {
    const r = iniciar(RELOJ_DETENIDO, 100_000);
    expect(transcurridoMs(r, 120_000)).toBe(20_000);
    expect(transcurridoMs(r, 90_000)).toBe(0);
  });

  it('pausar con el reloj atrás re-ancla: conserva el acumulado en vez de restarlo', () => {
    let r = normalizar(iniciar(RELOJ_DETENIDO, 100_000), 120_000);
    r = pausar(r, 90_000);
    expect(r).toEqual({ inicioMs: null, acumuladoMs: 20_000, corriendo: false });
    expect(transcurridoMs(reanudar(r, 95_000), 96_000)).toBe(21_000);
  });

  it('normalizar no cambia el transcurrido hacia adelante ni toca un reloj detenido o en pausa', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    expect(transcurridoMs(normalizar(r, T0 + 7_000), T0 + 9_000)).toBe(9_000);
    expect(normalizar(RELOJ_DETENIDO, T0)).toBe(RELOJ_DETENIDO);
    const p = pausar(r, T0 + 3_000);
    expect(normalizar(p, T0 + 50_000)).toBe(p);
  });
});

describe('reloj: fin exacto', () => {
  it('restante llega a 0 justo en la duración y no antes', () => {
    const r = iniciar(RELOJ_DETENIDO, T0);
    expect(restanteMs(r, 60_000, T0 + 59_999)).toBe(1);
    expect(restanteMs(r, 60_000, T0 + 60_000)).toBe(0);
    expect(restanteMs(r, 60_000, T0 + 60_001)).toBe(0);
  });

  it('segundosRestantes es techo: 5 s marca 5·4·3·2·1 y cae a 0 solo al cumplirse', () => {
    expect(segundosRestantes(0, 5)).toBe(5);
    expect(segundosRestantes(1, 5)).toBe(5);
    expect(segundosRestantes(1_000, 5)).toBe(4);
    expect(segundosRestantes(4_001, 5)).toBe(1);
    expect(segundosRestantes(4_999, 5)).toBe(1);
    expect(segundosRestantes(5_000, 5)).toBe(0);
    expect(segundosRestantes(9_000, 5)).toBe(0);
  });

  it('descansoRestante: terminado exactamente al cumplirse; +30 s alarga; 0 s termina de una', () => {
    expect(descansoRestante(89_999, 90)).toEqual({ restanteSeg: 1, terminado: false });
    expect(descansoRestante(90_000, 90)).toEqual({ restanteSeg: 0, terminado: true });
    expect(descansoRestante(90_000, 120)).toEqual({ restanteSeg: 30, terminado: false });
    expect(descansoRestante(0, 0)).toEqual({ restanteSeg: 0, terminado: true });
  });
});

describe('faseEmom: fronteras', () => {
  const cfg = { rondas: 3 };

  it('arranque: ronda 1 con 60 en pantalla y nada cerrado', () => {
    expect(faseEmom(0, cfg)).toEqual({ ronda: 1, restanteSeg: 60, rondasCerradas: 0, terminado: false });
  });

  it('último segundo de la ronda 1 y cierre exacto al minuto', () => {
    expect(faseEmom(59_999, cfg)).toEqual({ ronda: 1, restanteSeg: 1, rondasCerradas: 0, terminado: false });
    expect(faseEmom(60_000, cfg)).toEqual({ ronda: 2, restanteSeg: 60, rondasCerradas: 1, terminado: false });
  });

  it('última ronda: sigue viva hasta el último milisegundo', () => {
    expect(faseEmom(179_999, cfg)).toEqual({ ronda: 3, restanteSeg: 1, rondasCerradas: 2, terminado: false });
  });

  it('fin exacto: terminado, se queda en la última ronda y todas cerradas', () => {
    expect(faseEmom(180_000, cfg)).toEqual({ ronda: 3, restanteSeg: 0, rondasCerradas: 3, terminado: true });
  });

  it('pasado el fin (segundo plano largo) no inventa rondas', () => {
    expect(faseEmom(600_000, cfg)).toEqual({ ronda: 3, restanteSeg: 0, rondasCerradas: 3, terminado: true });
  });

  it('segPorRonda distinto de 60 respeta el largo', () => {
    expect(faseEmom(45_000, { rondas: 2, segPorRonda: 30 })).toEqual({ ronda: 2, restanteSeg: 15, rondasCerradas: 1, terminado: false });
  });

  it('cero rondas no revienta: se trata como 1', () => {
    expect(faseEmom(0, { rondas: 0 }).terminado).toBe(false);
    expect(faseEmom(60_000, { rondas: 0 }).terminado).toBe(true);
  });
});

describe('faseMyoReps: descanso de 5 s entre sobrecargas', () => {
  it('arranca en 5 y anuncia la sobrecarga que viene', () => {
    expect(faseMyoReps(0, { sobrecargas: 0 })).toEqual({ restanteSeg: 5, terminado: false, siguienteSobrecarga: 1 });
    expect(faseMyoReps(0, { sobrecargas: 4 }).siguienteSobrecarga).toBe(5);
  });

  it('último segundo y fin exacto', () => {
    expect(faseMyoReps(4_001, { sobrecargas: 2 }).restanteSeg).toBe(1);
    expect(faseMyoReps(4_999, { sobrecargas: 2 }).terminado).toBe(false);
    expect(faseMyoReps(5_000, { sobrecargas: 2 })).toEqual({ restanteSeg: 0, terminado: true, siguienteSobrecarga: 3 });
  });
});

describe('faseMethod35: máquina de series (sin reloj) y regla de peso intacta', () => {
  it('serie 1 sin poder terminar; a las 3 puede; a las 5 cierra solo', () => {
    expect(faseMethod35({ seriesHechas: 0 })).toEqual({ serie: 1, puedeTerminar: false, terminado: false });
    expect(faseMethod35({ seriesHechas: 2 })).toEqual({ serie: 3, puedeTerminar: false, terminado: false });
    expect(faseMethod35({ seriesHechas: 3 })).toEqual({ serie: 4, puedeTerminar: true, terminado: false });
    expect(faseMethod35({ seriesHechas: 5 })).toEqual({ serie: 6, puedeTerminar: true, terminado: true });
  });

  it('feedback: más que el objetivo sube, menos baja, igual perfecto', () => {
    expect(feedbackMethod35(6, 5)).toEqual({ texto: '6 reps → Sube peso', cue: 'Sube peso.' });
    expect(feedbackMethod35(3, 5)).toEqual({ texto: '3 reps → Baja peso', cue: 'Baja peso.' });
    expect(feedbackMethod35(5, 5)).toEqual({ texto: '5 reps → Peso perfecto', cue: 'Peso perfecto.' });
  });
});
