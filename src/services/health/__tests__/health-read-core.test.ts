/**
 * CIERRE-3 — el candado del dato sagrado.
 *
 * La regla "un dato importado nunca pisa uno que el usuario escribió a mano" es
 * la clase de doctrina que sobrevive mientras alguien la recuerda y muere en el
 * primer refactor apurado. Aquí deja de ser un comentario y pasa a ser rojo.
 *
 * El caso que de verdad importa es el del CERO: alguien va a "arreglar" el
 * resolvedor con un `if (!valor)` en vez de `if (valor == null)`, y ese día un
 * día real de cero pasos se va a rellenar solo con el número del reloj. Ese
 * test está abajo y es el que hay que leer si este archivo se pone rojo.
 */
import { describe, expect, it } from 'vitest';

import {
  LECTURA_VACIA,
  MINIMO_PASOS_PREMIABLES,
  MINIMO_SUENO_PREMIABLE_MIN,
  armarLectura,
  esDeMaquina,
  esDePersona,
  etiquetaFuente,
  fuenteDeMaquina,
  fuenteDeNoche,
  premiosWearable,
  resolverDato,
  type FilasDelDia,
} from '../health-read-core';

// Fila completa de máquina, para no repetirla en cada caso.
const MAQUINA = {
  steps: 12000,
  sleep_minutes: 450,
  resting_hr: 55,
  weight_kg: 80,
  source: 'health_connect',
};

const vacio: FilasDelDia = { manual: null, noche: null, maquina: null };

describe('resolverDato — el orden es la doctrina', () => {
  it('devuelve el primer candidato con valor', () => {
    const r = resolverDato([
      { valor: null, fuente: 'manual' },
      { valor: 7, fuente: 'healthkit' },
    ]);
    expect(r).toEqual({ valor: 7, fuente: 'healthkit' });
  });

  it('sin ningún candidato con valor devuelve sin_dato, no un cero disfrazado', () => {
    const r = resolverDato([
      { valor: null, fuente: 'manual' },
      { valor: undefined, fuente: 'health_connect' },
    ]);
    expect(r.valor).toBeNull();
    expect(r.fuente).toBe('sin_dato');
  });

  it('NaN no es un dato', () => {
    const r = resolverDato([
      { valor: Number.NaN, fuente: 'manual' },
      { valor: 3, fuente: 'healthkit' },
    ]);
    expect(r.valor).toBe(3);
  });

  it('EL CANDADO DEL CERO: un cero explícito de la persona gana, no se rellena', () => {
    // Si esto se pone rojo, alguien cambió `== null` por un falsy check y la
    // app está inventando pasos los días que la persona reportó cero.
    const r = resolverDato([
      { valor: 0, fuente: 'manual' },
      { valor: 9000, fuente: 'health_connect' },
    ]);
    expect(r.valor).toBe(0);
    expect(r.fuente).toBe('manual');
  });
});

describe('armarLectura — el dato del usuario es sagrado', () => {
  it('sin ninguna fila, todo sin_dato', () => {
    expect(armarLectura(vacio)).toEqual(LECTURA_VACIA);
  });

  it('con solo máquina, la máquina llena el hueco', () => {
    const l = armarLectura({ ...vacio, maquina: MAQUINA });
    expect(l.pasos).toEqual({ valor: 12000, fuente: 'health_connect' });
    expect(l.peso).toEqual({ valor: 80, fuente: 'health_connect' });
  });

  it('LO MANUAL PISA A LA MÁQUINA en las cuatro métricas', () => {
    const l = armarLectura({
      manual: { steps_daily: 3000, sleep_hours: 6, resting_hr: 62, weight_kg: 74.5 },
      noche: { duration_minutes: 500, source: 'healthkit' },
      maquina: MAQUINA,
    });
    expect(l.pasos).toEqual({ valor: 3000, fuente: 'manual' });
    expect(l.suenoMinutos).toEqual({ valor: 360, fuente: 'manual' }); // 6 h → 360 min
    expect(l.fcReposo).toEqual({ valor: 62, fuente: 'manual' });
    expect(l.peso).toEqual({ valor: 74.5, fuente: 'manual' });
  });

  it('lo manual pisa métrica por métrica, no la fila entera', () => {
    // La persona anotó su peso y nada más. Los pasos del reloj deben entrar:
    // llenar un hueco no es pisar a nadie.
    const l = armarLectura({
      manual: { weight_kg: 74.5 },
      noche: null,
      maquina: MAQUINA,
    });
    expect(l.peso.fuente).toBe('manual');
    expect(l.pasos).toEqual({ valor: 12000, fuente: 'health_connect' });
  });

  it('el sueño respeta el contrato: sleep_nights antes que health_os_daily', () => {
    const l = armarLectura({
      manual: null,
      noche: { duration_minutes: 420, source: 'sleep_cycle' },
      maquina: MAQUINA, // 450 min, debe perder
    });
    expect(l.suenoMinutos).toEqual({ valor: 420, fuente: 'sesion_propia' });
  });

  it('sin noche propia, health_os_daily es la red de seguridad del sueño', () => {
    const l = armarLectura({ manual: null, noche: null, maquina: MAQUINA });
    expect(l.suenoMinutos).toEqual({ valor: 450, fuente: 'health_connect' });
  });
});

describe('vocabulario de fuentes — el mismo de las migraciones 261 y 264', () => {
  it('traduce los dos literales del CHECK de health_os_daily', () => {
    expect(fuenteDeMaquina('healthkit')).toBe('healthkit');
    expect(fuenteDeMaquina('health_connect')).toBe('health_connect');
  });

  it('no adivina fuentes desconocidas', () => {
    expect(fuenteDeMaquina('garmin')).toBe('sin_dato');
    expect(fuenteDeMaquina(null)).toBe('sin_dato');
  });

  it('la sesión propia de sueño cuenta como dato de la persona', () => {
    expect(fuenteDeNoche('sleep_cycle')).toBe('sesion_propia');
    expect(esDePersona(fuenteDeNoche('sleep_cycle'))).toBe(true);
    expect(esDeMaquina(fuenteDeNoche('sleep_cycle'))).toBe(false);
  });

  it('un import de sueño sigue siendo máquina', () => {
    expect(esDeMaquina(fuenteDeNoche('healthkit'))).toBe(true);
  });

  it('toda fuente con dato tiene etiqueta y sin_dato no la tiene', () => {
    expect(etiquetaFuente('manual')).toBeTruthy();
    expect(etiquetaFuente('sesion_propia')).toBeTruthy();
    expect(etiquetaFuente('health_connect')).toBeTruthy();
    expect(etiquetaFuente('healthkit')).toBeTruthy();
    expect(etiquetaFuente('sin_dato')).toBeNull();
  });
});

describe('premiosWearable — solo la máquina paga tier wearable', () => {
  const fecha = '2026-08-15';
  const uid = 'u1';

  it('con datos de máquina suficientes, los dos premios', () => {
    const l = armarLectura({ ...vacio, maquina: MAQUINA });
    const p = premiosWearable(l, uid, fecha);
    expect(p.map((x) => x.habitType).sort()).toEqual(['sleep_wearable', 'steps_wearable']);
  });

  it('NO paga cuando el dato lo tecleó la persona', () => {
    // El servidor rechazaría el award por evidence_tier, pero la petición ni
    // siquiera debe salir: cobrar tier wearable por algo tecleado es fraude
    // contra la propia economía.
    const l = armarLectura({
      manual: { steps_daily: 12000, sleep_hours: 8 },
      noche: null,
      maquina: null,
    });
    expect(premiosWearable(l, uid, fecha)).toEqual([]);
  });

  it('no paga ruido de sensor por debajo del umbral', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, steps: MINIMO_PASOS_PREMIABLES - 1, sleep_minutes: MINIMO_SUENO_PREMIABLE_MIN - 1 },
    });
    expect(premiosWearable(l, uid, fecha)).toEqual([]);
  });

  it('la clave de idempotencia se ancla a usuario y fecha (cap 1 al día)', () => {
    const l = armarLectura({ ...vacio, maquina: MAQUINA });
    const p = premiosWearable(l, uid, fecha);
    for (const premio of p) {
      expect(premio.idempotencyKey).toBe(`${premio.habitType}_${uid}_${fecha}`);
      expect(premio.localDate).toBe(fecha);
    }
    // Dos corridas del mismo día producen exactamente las mismas claves.
    expect(premiosWearable(l, uid, fecha)).toEqual(p);
  });

  it('sin datos no hay premios', () => {
    expect(premiosWearable(LECTURA_VACIA, uid, fecha)).toEqual([]);
  });
});
