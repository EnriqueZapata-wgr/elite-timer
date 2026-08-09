/**
 * MB-30A P1 — el core del Sleep Cycle.
 *
 * El test que más importa está primero: LA ALARMA SIEMPRE SUENA. Llegado el
 * cierre de la ventana, evaluarAlarma dispara sin importar micrófono,
 * muestras ni detección. La mutación que quite ese fallback truena aquí.
 */
import { describe, it, expect } from 'vitest';
import {
  actividadReciente,
  ajustarHora,
  armarNochePropia,
  COLA_NOCHES_KEY,
  drenarCola,
  encolarNoche,
  etiquetaDeScore,
  evaluarAlarma,
  horaLimiteDesdeChronotipo,
  lecturaCola,
  MIN_MUESTRAS_SCORE,
  minutosDeRonquido,
  pisoDeRuido,
  resolverVentana,
  scoreDeCalma,
  volumenRampa,
  type KVStorage,
  type NivelMuestra,
  type NocheDormida,
} from '../sleep-core';

// ── Generadores de noches sintéticas (1 muestra/s) ──

/** Noche quieta: piso -60 dB con jitter mínimo. */
function nocheQuieta(minutos: number, t0 = 0): NivelMuestra[] {
  const out: NivelMuestra[] = [];
  for (let s = 0; s < minutos * 60; s++) {
    out.push({ t: t0 + s * 1000, db: -60 + (s % 3 === 0 ? 0.5 : -0.5) });
  }
  return out;
}

/** Le inyecta actividad (spikes a -30) a un rango de minutos de la noche. */
function conActividad(muestras: NivelMuestra[], desdeMin: number, hastaMin: number): NivelMuestra[] {
  return muestras.map((m, i) => {
    const min = Math.floor(i / 60);
    if (min >= desdeMin && min < hastaMin && i % 2 === 0) return { ...m, db: -30 };
    return m;
  });
}

/** Ronquido: pico a -50 (piso+10) cada 4 s dentro del rango de minutos. */
function conRonquido(muestras: NivelMuestra[], desdeMin: number, hastaMin: number): NivelMuestra[] {
  return muestras.map((m, i) => {
    const min = Math.floor(i / 60);
    if (min >= desdeMin && min < hastaMin && i % 4 === 0) return { ...m, db: -50 };
    return m;
  });
}

// ── LA GARANTÍA ──

describe('evaluarAlarma: la alarma nunca puede NO sonar', () => {
  const ventana = { inicioVentanaMs: 100_000, finVentanaMs: 200_000 };

  it('al cierre de la ventana dispara SIEMPRE, aun sin actividad ni muestras', () => {
    expect(
      evaluarAlarma({ ahoraMs: 200_000, ...ventana, yaSono: false, actividadReciente: 0 }),
    ).toBe('sonar_limite');
    expect(
      evaluarAlarma({ ahoraMs: 999_999, ...ventana, yaSono: false, actividadReciente: 0 }),
    ).toBe('sonar_limite');
  });

  it('el fallback no depende del umbral ni de la detección', () => {
    // Umbral imposible (2 = nunca se alcanza por actividad) — igual dispara.
    expect(
      evaluarAlarma({ ahoraMs: 200_000, ...ventana, yaSono: false, actividadReciente: 0, umbral: 2 }),
    ).toBe('sonar_limite');
  });

  it('propiedad: para TODO ahora >= fin, sin haber sonado, la decisión es sonar', () => {
    for (let t = 200_000; t <= 500_000; t += 7_777) {
      const d = evaluarAlarma({ ahoraMs: t, ...ventana, yaSono: false, actividadReciente: 0 });
      expect(d, `t=${t} debió sonar`).toBe('sonar_limite');
    }
  });

  it('dentro de la ventana, actividad reciente >= umbral dispara el momento', () => {
    expect(
      evaluarAlarma({ ahoraMs: 150_000, ...ventana, yaSono: false, actividadReciente: 0.2 }),
    ).toBe('sonar_momento');
  });

  it('antes de la ventana espera, aunque haya actividad', () => {
    expect(
      evaluarAlarma({ ahoraMs: 50_000, ...ventana, yaSono: false, actividadReciente: 1 }),
    ).toBe('esperar');
  });

  it('si ya sonó, no vuelve a sonar', () => {
    expect(
      evaluarAlarma({ ahoraMs: 300_000, ...ventana, yaSono: true, actividadReciente: 1 }),
    ).toBe('esperar');
  });
});

// ── Ventana ──

describe('resolverVentana / ajustarHora', () => {
  it('si la hora límite ya pasó hoy, la ventana es de mañana', () => {
    const ahora = new Date(2026, 7, 8, 22, 0, 0); // 10 pm
    const v = resolverVentana(ahora, '06:30', 30);
    expect(v).not.toBeNull();
    const fin = new Date(v!.finMs);
    expect(fin.getDate()).toBe(9);
    expect(fin.getHours()).toBe(6);
    expect(fin.getMinutes()).toBe(30);
    expect(v!.finMs - v!.inicioMs).toBe(30 * 60_000);
  });

  it('hora inválida devuelve null (la sesión no arranca ciega)', () => {
    expect(resolverVentana(new Date(), '25:00', 30)).toBeNull();
    expect(resolverVentana(new Date(), 'no-hora', 30)).toBeNull();
  });

  it('ajustarHora da la vuelta al día en ambos sentidos', () => {
    expect(ajustarHora('00:00', -15)).toBe('23:45');
    expect(ajustarHora('23:50', 15)).toBe('00:05');
    expect(ajustarHora('06:30', 15)).toBe('06:45');
  });

  it('horaLimiteDesdeChronotipo normaliza HH:MM:SS', () => {
    expect(horaLimiteDesdeChronotipo('6:30:00')).toBe('06:30');
    expect(horaLimiteDesdeChronotipo(null)).toBeNull();
  });
});

// ── Score y ronquido ──

describe('scoreDeCalma', () => {
  it('sin muestras suficientes NO inventa número: null', () => {
    expect(scoreDeCalma(nocheQuieta(10))).toBeNull();
    expect(scoreDeCalma([])).toBeNull();
    expect(MIN_MUESTRAS_SCORE).toBeGreaterThan(0);
  });

  it('noche quieta de 8 h: score alto', () => {
    const score = scoreDeCalma(nocheQuieta(8 * 60));
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(95);
  });

  it('mitad de la noche con actividad: el score baja de verdad', () => {
    const base = nocheQuieta(8 * 60);
    const movida = conActividad(base, 0, 4 * 60);
    const score = scoreDeCalma(movida);
    expect(score).not.toBeNull();
    expect(score!).toBeLessThanOrEqual(60);
    expect(score!).toBeLessThan(scoreDeCalma(base)!);
  });

  it('etiquetas: hablan de calma, jamás de fases', () => {
    for (const sc of [95, 75, 60, 20]) {
      const et = etiquetaDeScore(sc).toLowerCase();
      expect(et).not.toMatch(/profund|rem\b|etapa|ciclo/);
    }
  });
});

describe('minutosDeRonquido', () => {
  it('patrón rítmico sostenido cuenta minutos; noche quieta cuenta 0', () => {
    const base = nocheQuieta(40);
    expect(minutosDeRonquido(base)).toBe(0);
    const roncada = conRonquido(base, 5, 25);
    const min = minutosDeRonquido(roncada);
    expect(min).not.toBeNull();
    expect(min!).toBeGreaterThanOrEqual(15);
    expect(min!).toBeLessThanOrEqual(21);
  });

  it('con pocas muestras devuelve null, no un cero falso', () => {
    expect(minutosDeRonquido(nocheQuieta(5))).toBeNull();
  });
});

describe('actividadReciente / pisoDeRuido', () => {
  it('piso = mediana; la actividad es fracción de muestras sobre el piso', () => {
    const base = nocheQuieta(60);
    expect(pisoDeRuido(base)).toBeGreaterThanOrEqual(-61);
    expect(pisoDeRuido(base)).toBeLessThanOrEqual(-59);
    const ahora = base[base.length - 1].t;
    expect(actividadReciente(base, ahora)).toBeLessThan(0.05);
    const movida = conActividad(base, 50, 60);
    expect(actividadReciente(movida, ahora)).toBeGreaterThan(0.3);
  });
});

// ── Rampa ──

describe('volumenRampa', () => {
  it('empieza muy bajito, termina a tope y nunca baja', () => {
    expect(volumenRampa(0)).toBeLessThanOrEqual(0.05);
    expect(volumenRampa(90_000)).toBe(1);
    expect(volumenRampa(999_999)).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 90_000; t += 5_000) {
      const v = volumenRampa(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

// ── Armar la noche ──

describe('armarNochePropia', () => {
  const aFechaLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('la noche se nombra por el día en que DESPIERTAS', () => {
    const inicio = new Date(2026, 7, 8, 23, 0, 0).getTime();
    const fin = new Date(2026, 7, 9, 6, 45, 0).getTime();
    const noche = armarNochePropia({ inicioMs: inicio, finMs: fin, muestras: [], aFechaLocal });
    expect(noche.nightDate).toBe('2026-08-09');
    expect(noche.durationMinutes).toBe(465);
    expect(noche.source).toBe('sleep_cycle');
    // Sin micrófono no hay score ni ronquido inventados.
    expect(noche.score).toBeNull();
    expect(noche.snoreMinutes).toBeNull();
  });

  it('lo persistible son SOLO números y strings (jamás un buffer)', () => {
    const noche = armarNochePropia({
      inicioMs: 0,
      finMs: 8 * 3600_000,
      muestras: nocheQuieta(8 * 60),
      aFechaLocal,
    });
    for (const [k, v] of Object.entries(noche)) {
      expect(
        v === null || typeof v === 'number' || typeof v === 'string',
        `campo ${k} con tipo sospechoso`,
      ).toBe(true);
    }
  });
});

// ── Cola offline ──

function makeStorage(inicial: Record<string, string> = {}): KVStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(inicial));
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => { data.set(k, v); },
  };
}

const NOCHE: NocheDormida = {
  nightDate: '2026-08-09',
  bedTimeISO: '2026-08-09T05:00:00.000Z',
  wakeTimeISO: '2026-08-09T12:30:00.000Z',
  durationMinutes: 450,
  score: 88,
  snoreMinutes: 12,
  source: 'sleep_cycle',
  externalId: null,
};

describe('cola offline: sin red no se pierde nada', () => {
  it('encola, drena con red y deja la cola vacía', async () => {
    const st = makeStorage();
    await encolarNoche(st, NOCHE);
    expect(await lecturaCola(st)).toHaveLength(1);
    const subidas = await drenarCola(st, async () => true);
    expect(subidas).toBe(1);
    expect(await lecturaCola(st)).toHaveLength(0);
  });

  it('si la subida falla, la noche SE QUEDA en la cola', async () => {
    const st = makeStorage();
    await encolarNoche(st, NOCHE);
    const subidas = await drenarCola(st, async () => false);
    expect(subidas).toBe(0);
    expect(await lecturaCola(st)).toHaveLength(1);
    // Y si el subir LANZA, tampoco se pierde.
    await drenarCola(st, async () => { throw new Error('sin red'); });
    expect(await lecturaCola(st)).toHaveLength(1);
  });

  it('una noche, un registro: re-encolar la misma fecha no duplica', async () => {
    const st = makeStorage();
    await encolarNoche(st, NOCHE);
    await encolarNoche(st, { ...NOCHE, score: 90 });
    const cola = await lecturaCola(st);
    expect(cola).toHaveLength(1);
    expect(cola[0].score).toBe(90);
  });

  it('cola corrupta no truena: se lee como vacía', async () => {
    const st = makeStorage({ [COLA_NOCHES_KEY]: '{{{no-json' });
    expect(await lecturaCola(st)).toEqual([]);
  });
});
