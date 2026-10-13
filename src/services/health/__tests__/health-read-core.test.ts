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
  esColumnaFaltante,
  esDeMaquina,
  esDePersona,
  etiquetaFuente,
  fuenteDeMaquina,
  fuenteDeNoche,
  premiosWearable,
  resolverDato,
  type FilasDelDia,
  type FuenteSalud,
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

describe('vocabulario de fuentes — el mismo de las migraciones 261, 264 y 344', () => {
  it('traduce los dos literales del CHECK de health_os_daily', () => {
    expect(fuenteDeMaquina('healthkit')).toBe('healthkit');
    expect(fuenteDeMaquina('health_connect')).toBe('health_connect');
  });

  it('no adivina fuentes desconocidas', () => {
    // Antes de la 344 'garmin' era desconocida; ahora es una marca conectada
    // (ver abajo). Lo desconocido sigue sin adivinarse.
    expect(fuenteDeMaquina('fitbit')).toBe('sin_dato');
    expect(fuenteDeMaquina('sleep_cycle')).toBe('sin_dato');
    expect(fuenteDeMaquina('')).toBe('sin_dato');
    expect(fuenteDeMaquina(null)).toBe('sin_dato');
    expect(fuenteDeMaquina(undefined)).toBe('sin_dato');
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

describe('fuentes de la 344: marcas conectadas y mixto', () => {
  const MARCAS = ['oura', 'whoop', 'garmin', 'polar'] as const;

  it('cada marca se traduce a sí misma y cuenta como máquina', () => {
    for (const m of MARCAS) {
      expect(fuenteDeMaquina(m)).toBe(m);
      expect(esDeMaquina(fuenteDeMaquina(m))).toBe(true);
      expect(esDePersona(fuenteDeMaquina(m))).toBe(false);
      // Una noche de marca también es máquina, no sesión propia.
      expect(fuenteDeNoche(m)).toBe(m);
    }
  });

  it("'mixto' se queda como 'mixto' y NO cuenta como máquina (procedencia no sabida)", () => {
    expect(fuenteDeMaquina('mixto')).toBe('mixto');
    expect(fuenteDeNoche('mixto')).toBe('mixto');
    expect(esDeMaquina('mixto')).toBe(false);
    expect(esDePersona('mixto')).toBe(false);
  });

  it('etiquetas en español para cada fuente nueva', () => {
    expect(etiquetaFuente('oura')).toBe('Oura');
    expect(etiquetaFuente('whoop')).toBe('WHOOP');
    expect(etiquetaFuente('garmin')).toBe('Garmin');
    expect(etiquetaFuente('polar')).toBe('Polar');
    // En un campo, 'mixto' es el teléfono que escribió sin decir su fuente.
    expect(etiquetaFuente('mixto')).toBe('Fuente sin identificar');
  });

  it('toda etiqueta va sin guion largo', () => {
    const todas: FuenteSalud[] = [
      'manual', 'sesion_propia', 'health_connect', 'healthkit',
      'oura', 'whoop', 'garmin', 'polar', 'mixto',
    ];
    for (const f of todas) {
      const e = etiquetaFuente(f);
      expect(e).toBeTruthy();
      expect(String(e).includes('\u2014')).toBe(false);
    }
  });
});

describe('armarLectura: la fuente sale del CAMPO (field_sources), no de la fila', () => {
  it('field_sources manda sobre el source mixto de la fila, campo por campo', () => {
    const l = armarLectura({
      manual: null,
      noche: null,
      maquina: {
        steps: 9000,
        sleep_minutes: 430,
        resting_hr: 52,
        weight_kg: 81,
        source: 'mixto',
        field_sources: { steps: 'health_connect', sleep_minutes: 'oura', resting_hr: 'whoop', weight_kg: 'healthkit' },
      },
    });
    expect(l.pasos).toEqual({ valor: 9000, fuente: 'health_connect' });
    expect(l.suenoMinutos).toEqual({ valor: 430, fuente: 'oura' });
    expect(l.fcReposo).toEqual({ valor: 52, fuente: 'whoop' });
    expect(l.peso).toEqual({ valor: 81, fuente: 'healthkit' });
  });

  it('sin field_sources (antes de la 344) cae al source de la fila', () => {
    const l = armarLectura({ ...vacio, maquina: { ...MAQUINA, source: 'healthkit' } });
    expect(l.pasos.fuente).toBe('healthkit');
    expect(l.fcReposo.fuente).toBe('healthkit');
  });

  it('un campo que field_sources no marca cae al source de la fila', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, source: 'polar', field_sources: { steps: 'garmin' } },
    });
    expect(l.pasos.fuente).toBe('garmin');
    expect(l.peso.fuente).toBe('polar');
  });

  it('field_sources basura (arreglo, texto) no truena: cae al source de la fila', () => {
    const a = armarLectura({ ...vacio, maquina: { ...MAQUINA, field_sources: ['oura'] } });
    const b = armarLectura({ ...vacio, maquina: { ...MAQUINA, field_sources: 'oura' } });
    expect(a.pasos.fuente).toBe('health_connect');
    expect(b.pasos.fuente).toBe('health_connect');
  });

  it('un campo marcado mixto queda como mixto aunque la fila diga otra cosa', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, source: 'mixto', field_sources: { steps: 'mixto' } },
    });
    expect(l.pasos).toEqual({ valor: 12000, fuente: 'mixto' });
  });

  it('la noche usa field_sources.duration_minutes: sleep_cycle dentro de una fila mixto es sesión propia', () => {
    const l = armarLectura({
      manual: null,
      noche: { duration_minutes: 410, source: 'mixto', field_sources: { duration_minutes: 'sleep_cycle', deep_min: 'oura' } },
      maquina: null,
    });
    expect(l.suenoMinutos).toEqual({ valor: 410, fuente: 'sesion_propia' });
  });

  it('la noche de Oura se lee como Oura', () => {
    const l = armarLectura({
      manual: null,
      noche: { duration_minutes: 440, source: 'oura', field_sources: { duration_minutes: 'oura' } },
      maquina: null,
    });
    expect(l.suenoMinutos).toEqual({ valor: 440, fuente: 'oura' });
  });

  it('lo manual sigue pisando a una marca', () => {
    const l = armarLectura({
      manual: { steps_daily: 500 },
      noche: null,
      maquina: { ...MAQUINA, source: 'oura', field_sources: { steps: 'oura' } },
    });
    expect(l.pasos).toEqual({ valor: 500, fuente: 'manual' });
  });
});

describe('premiosWearable con las fuentes de la 344', () => {
  const fecha = '2026-10-13';
  const uid = 'u1';

  it('Oura SÍ paga steps_wearable y sleep_wearable', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, source: 'oura', field_sources: { steps: 'oura', sleep_minutes: 'oura' } },
    });
    const p = premiosWearable(l, uid, fecha);
    expect(p.map((x) => x.habitType).sort()).toEqual(['sleep_wearable', 'steps_wearable']);
  });

  it('WHOOP, Garmin y Polar también pagan (son máquina)', () => {
    for (const m of ['whoop', 'garmin', 'polar']) {
      const l = armarLectura({ ...vacio, maquina: { ...MAQUINA, source: m } });
      expect(premiosWearable(l, uid, fecha).length).toBe(2);
    }
  });

  it('una noche cuyo duration_minutes vino de sleep_cycle dentro de una fila mixto NO paga como máquina', () => {
    const l = armarLectura({
      manual: null,
      noche: { duration_minutes: 480, source: 'mixto', field_sources: { duration_minutes: 'sleep_cycle', rem_min: 'oura' } },
      maquina: null,
    });
    expect(l.suenoMinutos.fuente).toBe('sesion_propia');
    expect(premiosWearable(l, uid, fecha)).toEqual([]);
  });

  it('un campo mixto (procedencia no sabida) no paga', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, source: 'mixto', field_sources: { steps: 'mixto', sleep_minutes: 'mixto' } },
    });
    expect(premiosWearable(l, uid, fecha)).toEqual([]);
  });

  it('una fila mixto leída sin field_sources no paga (no se adivina)', () => {
    const l = armarLectura({ ...vacio, maquina: { ...MAQUINA, source: 'mixto' } });
    expect(premiosWearable(l, uid, fecha)).toEqual([]);
  });

  it('field_sources de marca dentro de una fila mixto SÍ paga', () => {
    const l = armarLectura({
      ...vacio,
      maquina: { ...MAQUINA, source: 'mixto', field_sources: { steps: 'garmin', sleep_minutes: 'mixto' } },
    });
    expect(premiosWearable(l, uid, fecha).map((x) => x.habitType)).toEqual(['steps_wearable']);
  });
});

describe('lectura antes de la 344: la columna field_sources puede no existir', () => {
  it('reconoce el 42703 de field_sources (select)', () => {
    expect(esColumnaFaltante({ code: '42703', message: 'column health_os_daily.field_sources does not exist' })).toBe(true);
  });

  it('reconoce el PGRST204 de field_sources (schema cache)', () => {
    expect(esColumnaFaltante({
      code: 'PGRST204',
      message: "Could not find the 'field_sources' column of 'sleep_nights' in the schema cache",
    })).toBe(true);
  });

  it('solo el código, sin mensaje, también cuenta', () => {
    expect(esColumnaFaltante({ code: '42703', message: '' })).toBe(true);
  });

  it('un 42703 de OTRA columna es un error de verdad', () => {
    expect(esColumnaFaltante({ code: '42703', message: 'column health_os_daily.steps does not exist' })).toBe(false);
  });

  it('otros errores (permiso, red) no son columna faltante', () => {
    expect(esColumnaFaltante({ code: '42501', message: 'permission denied for table health_os_daily' })).toBe(false);
    expect(esColumnaFaltante({ code: '', message: 'Failed to fetch' })).toBe(false);
    expect(esColumnaFaltante(null)).toBe(false);
    expect(esColumnaFaltante(undefined)).toBe(false);
  });

  it('una tabla faltante no es "base sin la 344"', () => {
    expect(esColumnaFaltante({ code: '42P01', message: 'relation "public.health_os_daily" does not exist' })).toBe(false);
  });

  it('cualquier columna de la 344 cuenta, no solo field_sources', () => {
    expect(esColumnaFaltante({ code: '42703', message: 'column sleep_nights.deep_min does not exist' })).toBe(true);
  });
});
