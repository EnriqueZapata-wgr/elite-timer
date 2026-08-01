/**
 * MB-19 PIEZA 2 — la lógica de la sala ATP: los tres órdenes, el conteo local
 * de aperturas y la card editorial del momento.
 */
import { describe, it, expect } from 'vitest';
import {
  bumpUsage, sortByFrequency, applyCustomOrder, reconcileOrder, moveInOrder, pinToTop,
  groupBySection, orderedApps, momentOfDay, pickEditorial, pickVariantIndex,
  ATP_ORDERS, ORDER_LABELS, COMEBACK_DAYS,
  type AppUsage,
} from '../atp-room-core';
import { APP_REGISTRY, SECTION_ORDER, visibleApps } from '@/src/constants/app-registry';

const DIA = 24 * 60 * 60 * 1000;
const AHORA = 1_780_000_000_000; // epoch fijo: los tests no dependen del reloj
const apps = visibleApps(true);

describe('los tres órdenes', () => {
  it('son exactamente los del brief', () => {
    expect(ATP_ORDERS).toEqual(['categoria', 'frecuencia', 'mio']);
    expect(ORDER_LABELS.categoria).toBe('Categoría');
    expect(ORDER_LABELS.frecuencia).toBe('Frecuencia');
    expect(ORDER_LABELS.mio).toBe('Mío');
  });

  it('categoría deja el orden del registro intacto', () => {
    const out = orderedApps(apps, 'categoria', {}, { keys: [] });
    expect(out.map((a) => a.key)).toEqual(apps.map((a) => a.key));
  });

  it('ningún orden pierde ni duplica apps', () => {
    for (const o of ATP_ORDERS) {
      const out = orderedApps(apps, o, { meditar: { count: 9, last: AHORA } }, { keys: ['ayuno'] });
      expect(out).toHaveLength(apps.length);
      expect(new Set(out.map((a) => a.key)).size).toBe(apps.length);
    }
  });
});

describe('bumpUsage', () => {
  it('suma sin mutar el objeto anterior', () => {
    const antes: AppUsage = {};
    const despues = bumpUsage(antes, 'meditar', AHORA);
    expect(antes).toEqual({});
    expect(despues.meditar).toEqual({ count: 1, last: AHORA });
  });

  it('acumula sobre lo que ya había', () => {
    const u = bumpUsage(bumpUsage({}, 'ayuno', 1), 'ayuno', AHORA);
    expect(u.ayuno).toEqual({ count: 2, last: AHORA });
  });
});

describe('sortByFrequency', () => {
  it('más usadas arriba', () => {
    const usage: AppUsage = {
      ayuno: { count: 10, last: AHORA },
      meditar: { count: 3, last: AHORA },
      sol: { count: 7, last: AHORA },
    };
    const out = sortByFrequency(apps, usage).map((a) => a.key);
    expect(out.slice(0, 3)).toEqual(['ayuno', 'sol', 'meditar']);
  });

  it('empata por la más reciente', () => {
    const usage: AppUsage = {
      ayuno: { count: 5, last: AHORA - DIA },
      sol: { count: 5, last: AHORA },
    };
    const out = sortByFrequency(apps, usage).map((a) => a.key);
    expect(out.indexOf('sol')).toBeLessThan(out.indexOf('ayuno'));
  });

  it('es estable: sin datos no baila entre renders', () => {
    const a = sortByFrequency(apps, {}).map((x) => x.key);
    const b = sortByFrequency(apps, {}).map((x) => x.key);
    expect(a).toEqual(b);
    expect(a).toEqual(apps.map((x) => x.key));
  });
});

describe('orden personalizado', () => {
  it('respeta la lista y manda el resto al final', () => {
    const out = applyCustomOrder(apps, { keys: ['ajustes', 'sol'] }).map((a) => a.key);
    expect(out[0]).toBe('ajustes');
    expect(out[1]).toBe('sol');
    expect(out).toHaveLength(apps.length);
  });

  it('una app nueva aparece, no desaparece', () => {
    const parcial = { keys: apps.slice(0, 3).map((a) => a.key) };
    const out = applyCustomOrder(apps, parcial).map((a) => a.key);
    expect(new Set(out).size).toBe(apps.length);
  });

  it('reconcile tira llaves muertas y siembra las que faltan', () => {
    const r = reconcileOrder({ keys: ['app-que-ya-no-existe', 'sol'] }, apps);
    expect(r.keys).not.toContain('app-que-ya-no-existe');
    expect(r.keys[0]).toBe('sol');
    expect(r.keys).toHaveLength(apps.length);
  });

  it('reconcile respeta el gate del ciclo', () => {
    const sinCiclo = visibleApps(false);
    expect(reconcileOrder({ keys: ['ciclo'] }, sinCiclo).keys).not.toContain('ciclo');
  });

  it('subir y bajar mueve una posición', () => {
    const o = { keys: ['a', 'b', 'c'] };
    expect(moveInOrder(o, 'c', -1).keys).toEqual(['a', 'c', 'b']);
    expect(moveInOrder(o, 'a', 1).keys).toEqual(['b', 'a', 'c']);
  });

  it('en los extremos no hace nada (no se cae ni se envuelve)', () => {
    const o = { keys: ['a', 'b', 'c'] };
    expect(moveInOrder(o, 'a', -1).keys).toEqual(['a', 'b', 'c']);
    expect(moveInOrder(o, 'c', 1).keys).toEqual(['a', 'b', 'c']);
    expect(moveInOrder(o, 'no-existe', 1).keys).toEqual(['a', 'b', 'c']);
  });

  it('fijar arriba pone una sola copia hasta arriba', () => {
    const r = pinToTop({ keys: ['a', 'b', 'c'] }, 'c');
    expect(r.keys).toEqual(['c', 'a', 'b']);
  });
});

describe('groupBySection', () => {
  it('agrupa en el orden de render y sin secciones vacías', () => {
    const g = groupBySection(apps);
    expect(g.map((x) => x.section)).toEqual(SECTION_ORDER);
    for (const x of g) expect(x.apps.length).toBeGreaterThan(0);
  });

  it('no pierde ninguna app', () => {
    const total = groupBySection(apps).reduce((n, g) => n + g.apps.length, 0);
    expect(total).toBe(apps.length);
  });

  it('una lista filtrada no inventa secciones', () => {
    const solo = apps.filter((a) => a.section === 'mente');
    expect(groupBySection(solo).map((g) => g.section)).toEqual(['mente']);
  });
});

describe('momentOfDay', () => {
  it('cubre las 24 horas sin huecos', () => {
    for (let h = 0; h < 24; h++) expect(momentOfDay(h)).toBeTruthy();
  });

  it('las fronteras caen donde se espera', () => {
    expect(momentOfDay(6)).toBe('amanecer');
    expect(momentOfDay(13)).toBe('medio-dia');
    expect(momentOfDay(18)).toBe('atardecer');
    expect(momentOfDay(23)).toBe('noche');
    expect(momentOfDay(3)).toBe('noche');
  });
});

describe('pickEditorial', () => {
  it('sin historia, invita al momento del día', () => {
    const p = pickEditorial(apps, {}, AHORA, 7);
    expect(p?.appKey).toBe('sol');
    expect(p?.isComeback).toBe(false);
  });

  it('el hábito abandonado gana sobre el reloj', () => {
    const usage: AppUsage = { ayuno: { count: 20, last: AHORA - 30 * DIA } };
    const p = pickEditorial(apps, usage, AHORA, 7);
    expect(p?.appKey).toBe('ayuno');
    expect(p?.isComeback).toBe(true);
    expect(p?.subtitle).toContain('30');
  });

  it('un hábito de ayer NO es un abandono', () => {
    const usage: AppUsage = { ayuno: { count: 20, last: AHORA - 1 * DIA } };
    expect(pickEditorial(apps, usage, AHORA, 7)?.isComeback).toBe(false);
  });

  it(`el umbral de abandono es de ${COMEBACK_DAYS} días`, () => {
    const justo = { ayuno: { count: 3, last: AHORA - (COMEBACK_DAYS - 1) * DIA } };
    const pasado = { ayuno: { count: 3, last: AHORA - (COMEBACK_DAYS + 1) * DIA } };
    expect(pickEditorial(apps, justo, AHORA, 7)?.isComeback).toBe(false);
    expect(pickEditorial(apps, pasado, AHORA, 7)?.isComeback).toBe(true);
  });

  it('entre varios abandonos, gana el que más usabas', () => {
    const usage: AppUsage = {
      ayuno: { count: 2, last: AHORA - 20 * DIA },
      meditar: { count: 40, last: AHORA - 20 * DIA },
    };
    expect(pickEditorial(apps, usage, AHORA, 7)?.appKey).toBe('meditar');
  });

  it('nunca sugiere retomar algo que nunca abriste', () => {
    const p = pickEditorial(apps, { sol: { count: 0, last: 0 } }, AHORA, 13);
    expect(p?.isComeback).toBe(false);
  });

  it('siempre devuelve una card cuando hay apps, y ninguna cuando no', () => {
    for (let h = 0; h < 24; h++) expect(pickEditorial(apps, {}, AHORA, h)).not.toBeNull();
    expect(pickEditorial([], {}, AHORA, 9)).toBeNull();
  });

  it('si la app del momento no está disponible, no deja la card rota', () => {
    const soloMente = apps.filter((a) => a.section === 'mente');
    const p = pickEditorial(soloMente, {}, AHORA, 7); // amanecer pide 'sol', que no está
    expect(p).not.toBeNull();
    expect(soloMente.some((a) => a.key === p!.appKey)).toBe(true);
  });

  it('cero em dash en el copy que ve el usuario', () => {
    for (let h = 0; h < 24; h++) {
      const p = pickEditorial(apps, { ayuno: { count: 5, last: AHORA - 40 * DIA } }, AHORA, h)!;
      expect(p.title.includes('—')).toBe(false);
      expect(p.subtitle.includes('—')).toBe(false);
    }
  });
});

describe('pickVariantIndex', () => {
  it('no cambia dentro del mismo día', () => {
    expect(pickVariantIndex(AHORA)).toBe(pickVariantIndex(AHORA + 60_000));
  });

  it('cambia de un día a otro', () => {
    const hoy = pickVariantIndex(AHORA);
    const semana = [1, 2, 3].map((d) => pickVariantIndex(AHORA + d * DIA));
    expect(semana.some((v) => v !== hoy)).toBe(true);
  });

  it('siempre cae dentro del rango', () => {
    for (let d = 0; d < 40; d++) {
      const v = pickVariantIndex(AHORA + d * DIA, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
    }
  });
});

describe('cobertura del registro', () => {
  it('la card editorial solo apunta a apps que existen', () => {
    const keys = new Set(APP_REGISTRY.map((a) => a.key));
    for (let h = 0; h < 24; h++) {
      const p = pickEditorial(apps, {}, AHORA, h);
      expect(keys.has(p!.appKey), `hora ${h} apunta a ${p!.appKey}`).toBe(true);
    }
  });
});
