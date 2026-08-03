/**
 * TAREAS — el contrato del checklist (MB-20 Pieza 1).
 * Una fuente, dos lentes; los gestos por fila son doctrina, no estilo.
 */
import { describe, it, expect } from 'vitest';
import {
  buildTareas,
  agendaLens,
  repartoTareas,
  pickFocusMomento,
  gestoForBool,
  momentoForHour,
  minutesFromMidnight,
  TAREA_MOMENTO,
  TAREA_TIME,
  EXPERIENCIA_SOURCES,
  EXPERIENCIA_CAPTURA,
  EXPERIENCIA_REGISTRO,
  routeForBool,
  type TareasInput,
} from '@/src/services/hoy/tareas-core';
import {
  VERIFIED_ELECTRON_KEYS,
  VERIFIED_ELECTRON_ROUTES,
  DEFAULT_BOOLEANS,
  MANDATORY_BOOLEANS,
} from '@/src/services/hoy/day-booleans';
import { ELECTRONS_SIN_APP, ELECTRON_TO_APP } from '@/src/constants/electron-app-bridge';
import { APP_BY_KEY } from '@/src/constants/app-registry';

function boolE(source: string, completed = false) {
  return {
    source, name: source, icon: 'meditar', color: '#fff',
    weight: 2, completed,
  };
}

const INPUT: TareasInput = {
  booleanElectrons: [
    boolE('sunlight', true),
    boolE('meditation'),
    boolE('journal'),
    boolE('no_alcohol'),
    boolE('cardio'),
  ],
  quantitativeElectrons: [
    { source: 'water', name: 'Hidratación', icon: 'hidratacion', color: '#0af', current: 1200, target: 2500, displayCurrent: '1.2 L', displayTarget: '2.5 L' },
    { source: 'protein', name: 'Proteína', icon: 'comida', color: '#fa0', current: 90, target: 90, displayCurrent: '90 g', displayTarget: '90 g' },
  ],
  agendaItems: [
    { id: 'smart-fast', time: '10:30', name: 'Romper ayuno', subtitle: 'en 1 h', completed: false, isSmart: true, route: '/fasting' },
    { id: 'iv-1', time: '08:00', name: 'Luz solar', completed: false, isSmart: false },
    { id: 'meal-1', time: '14:00', name: 'Comida', completed: false, isSmart: false, informational: true },
  ],
};

describe('momentos', () => {
  it('umbrales espejo de /agenda: <12 mañana, <18 tarde, resto noche', () => {
    expect(momentoForHour(0)).toBe('manana');
    expect(momentoForHour(11)).toBe('manana');
    expect(momentoForHour(12)).toBe('tarde');
    expect(momentoForHour(17)).toBe('tarde');
    expect(momentoForHour(18)).toBe('noche');
    expect(momentoForHour(23)).toBe('noche');
  });

  it('todo hábito del universo HOY tiene momento y hora canónicos', () => {
    const universo = new Set([...DEFAULT_BOOLEANS, ...MANDATORY_BOOLEANS, 'water', 'protein', 'strength', 'breathwork', 'nback', 'period_log', 'red_glasses']);
    // red_glasses no existe como source (es 'red_glasses'? el weight canónico
    // decide) — este guard protege contra huecos del mapa para lo que SÍ entra.
    for (const k of ['sunlight', 'meditation', 'supplements', 'journal', 'cardio', 'water', 'protein']) {
      expect(universo.has(k), k).toBe(true);
      expect(TAREA_MOMENTO[k], `momento de ${k}`).toBeTruthy();
      expect(TAREA_TIME[k], `hora de ${k}`).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe('minutesFromMidnight (audit nocturno P4)', () => {
  it('ordena numérico: "9:30" antes de "22:30" aunque el string diga otra cosa', () => {
    expect(minutesFromMidnight('9:30')).toBe(9 * 60 + 30);
    expect(minutesFromMidnight('09:30')).toBe(9 * 60 + 30);
    expect(minutesFromMidnight('22:30')).toBe(22 * 60 + 30);
    expect(minutesFromMidnight('9:30')).toBeLessThan(minutesFromMidnight('22:30'));
  });

  it('medianoche no es falsy: "00:30" es hora 0, no mediodía', () => {
    expect(minutesFromMidnight('00:30')).toBe(30);
    expect(momentoForHour(Math.floor(minutesFromMidnight('00:30') / 60))).toBe('manana');
  });

  it('hora ilegible cae al default neutro de mediodía', () => {
    expect(minutesFromMidnight('')).toBe(12 * 60);
    expect(minutesFromMidnight('sin hora')).toBe(12 * 60);
  });

  it('romper ayuno a las 9:30 se queda en la mañana y en su lugar de AGENDA', () => {
    const input: TareasInput = {
      ...INPUT,
      agendaItems: [
        { id: 'smart-fast', time: '9:30', name: 'Romper ayuno', completed: false, isSmart: true, route: '/fasting' },
      ],
    };
    const r = buildTareas(input, 10);
    const manana = r.blocks.find((b) => b.momento === 'manana')!;
    expect(manana.items.some((t) => t.key === 'agenda-smart-fast')).toBe(true);
    const lens = agendaLens(r);
    const idx = lens.findIndex((t) => t.key === 'agenda-smart-fast');
    const nocturnas = lens.map((t, i) => ({ t, i })).filter((x) => minutesFromMidnight(x.t.time) >= 20 * 60);
    for (const n of nocturnas) {
      expect(idx, `romper ayuno debe ir antes de ${n.t.key}`).toBeLessThan(n.i);
    }
  });

  it('medianoche y media entra al bloque de la mañana, no al de la tarde', () => {
    const input: TareasInput = {
      booleanElectrons: [],
      quantitativeElectrons: [],
      agendaItems: [
        { id: 'smart-fast', time: '00:30', name: 'Romper ayuno', completed: false, isSmart: true, route: '/fasting' },
      ],
    };
    const r = buildTareas(input, 1);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].momento).toBe('manana');
  });
});

describe('gestos', () => {
  it('no verificado → palomear directo', () => {
    expect(gestoForBool('sunlight')).toBe('palomear');
    expect(gestoForBool('no_alcohol')).toBe('palomear');
  });

  it('experiencias verificadas → paloma inteligente, nunca check regalado', () => {
    for (const k of EXPERIENCIA_SOURCES) {
      expect(gestoForBool(k), k).toBe('experiencia');
      expect((VERIFIED_ELECTRON_KEYS as readonly string[]).includes(k), k).toBe(true);
    }
  });

  it('verificados sin experiencia (suplementos, checkin, ciclo) → navegar', () => {
    expect(gestoForBool('supplements')).toBe('navegar');
    expect(gestoForBool('checkin')).toBe('navegar');
    expect(gestoForBool('period_log')).toBe('navegar');
  });

  it('la captura externa es subconjunto de las experiencias', () => {
    for (const k of EXPERIENCIA_CAPTURA) {
      expect(EXPERIENCIA_SOURCES).toContain(k);
    }
  });

  it('el modal nunca tiene un solo botón: toda experiencia captura o tiene registro real', () => {
    // Si una experiencia no está en EXPERIENCIA_CAPTURA ni en
    // EXPERIENCIA_REGISTRO, su SÍ no tendría a dónde ir. Un gesto que no
    // ofrece opción no debería preguntar: se detecta aquí, no en el device.
    for (const k of EXPERIENCIA_SOURCES) {
      const capturable = (EXPERIENCIA_CAPTURA as readonly string[]).includes(k);
      const registro = EXPERIENCIA_REGISTRO[k];
      expect(capturable || Boolean(registro), `${k} sin captura ni registro`).toBe(true);
      if (registro) expect(registro.startsWith('/'), `${k} → ${registro}`).toBe(true);
    }
  });

  it('el registro real es solo para las no capturables', () => {
    for (const k of Object.keys(EXPERIENCIA_REGISTRO)) {
      expect(EXPERIENCIA_SOURCES).toContain(k);
      expect(EXPERIENCIA_CAPTURA).not.toContain(k);
    }
  });
});

describe('buildTareas', () => {
  const r = buildTareas(INPUT, 20);

  it('agrupa por momento y solo bloques con contenido', () => {
    const labels = r.blocks.map((b) => b.momento);
    expect(labels).toEqual(['manana', 'tarde', 'noche']);
  });

  it('cuenta progreso por bloque y global', () => {
    const manana = r.blocks.find((b) => b.momento === 'manana')!;
    // sunlight(true) + meditation + water(no llega) + romper ayuno = 4 items, 1 done
    expect(manana.total).toBe(4);
    expect(manana.done).toBe(1);
    // global: 8 tareas (5 bool + 2 quant + 1 smart), 2 completas (sunlight + protein)
    expect(r.global.total).toBe(8);
    expect(r.global.done).toBe(2);
  });

  it('el foco es el bloque de la hora actual', () => {
    expect(r.focusMomento).toBe('noche');
    expect(buildTareas(INPUT, 9).focusMomento).toBe('manana');
  });

  it('el cuantitativo lleva progreso y el completo palomea', () => {
    const water = r.blocks.flatMap((b) => b.items).find((t) => t.key === 'water')!;
    expect(water.gesto).toBe('inline');
    expect(water.completed).toBe(false);
    expect(water.progress).toBeCloseTo(0.48);
    const protein = r.blocks.flatMap((b) => b.items).find((t) => t.key === 'protein')!;
    expect(protein.completed).toBe(true);
  });

  it('de agenda solo entran los SMART accionables; ayuno navega y fin', () => {
    const items = r.blocks.flatMap((b) => b.items);
    const smart = items.find((t) => t.key === 'agenda-smart-fast')!;
    expect(smart.gesto).toBe('navegar');
    expect(smart.route).toBe('/fasting');
    expect(items.find((t) => t.key === 'agenda-iv-1')).toBeUndefined();
    expect(items.find((t) => t.key === 'agenda-meal-1')).toBeUndefined();
  });
});

describe('agendaLens', () => {
  it('la MISMA lista, ordenada por hora', () => {
    const r = buildTareas(INPUT, 9);
    const lens = agendaLens(r);
    expect(lens.length).toBe(r.global.total);
    const times = lens.map((t) => t.time);
    expect([...times].sort()).toEqual(times);
  });
});

describe('routeForBool (MB-20.2 · 2.5)', () => {
  it('luz solar abre /solar: la app del electrón vía el puente, no el hub del pilar', () => {
    expect(routeForBool('sunlight')).toBe('/solar');
  });

  it('los verificados conservan su ruta granular (device test: funcionan bien)', () => {
    for (const [key, route] of Object.entries(VERIFIED_ELECTRON_ROUTES)) {
      expect(routeForBool(key), key).toBe(route);
    }
  });

  it('todo electrón sin app va SIN ruta: cero puertas inventadas', () => {
    // Baño frío, grounding, sin alcohol, lentes rojos, sin procesados,
    // off-pantallas… la lista completa del puente, no solo lo que el device
    // test alcanzó a tocar.
    for (const source of ELECTRONS_SIN_APP) {
      expect(routeForBool(source), source).toBeUndefined();
    }
  });

  it('la tarea compilada refleja la regla (sin ruta ⇒ ni el tap navega)', () => {
    const r = buildTareas(
      {
        booleanElectrons: [boolE('sunlight'), boolE('cold_shower'), boolE('no_alcohol'), boolE('red_glasses')],
        quantitativeElectrons: [],
        agendaItems: [],
      },
      9,
    );
    const items = r.blocks.flatMap((b) => b.items);
    expect(items.find((t) => t.key === 'sunlight')?.route).toBe('/solar');
    expect(items.find((t) => t.key === 'cold_shower')?.route).toBeUndefined();
    expect(items.find((t) => t.key === 'no_alcohol')?.route).toBeUndefined();
    expect(items.find((t) => t.key === 'red_glasses')?.route).toBeUndefined();
  });

  it('todo electrón del puente resuelve a una ruta real del registro', () => {
    for (const [source, app] of Object.entries(ELECTRON_TO_APP)) {
      const route = routeForBool(source);
      expect(route, `${source} → ${app}`).toBeTruthy();
    }
    // Y las apps del puente existen en el registro (nada apunta al vacío).
    for (const app of new Set(Object.values(ELECTRON_TO_APP))) {
      expect(APP_BY_KEY[app!], `app ${app}`).toBeTruthy();
    }
  });
});

describe('repartoTareas (MB-20.2 · 1.3)', () => {
  const r = buildTareas(INPUT, 14);
  const lens = agendaLens(r);
  const { hechas, pendingBlocks } = repartoTareas(lens, r.blocks);

  it('las hechas van a la cinta, en orden cronológico', () => {
    expect(hechas.map((t) => t.key)).toEqual(['sunlight', 'protein']);
    expect(hechas.every((t) => t.completed)).toBe(true);
  });

  it('abajo solo bloques con pendientes, sin las hechas dentro', () => {
    for (const b of pendingBlocks) {
      expect(b.pending.length).toBeGreaterThan(0);
      expect(b.pending.every((t) => !t.completed)).toBe(true);
    }
    const enBloques = pendingBlocks.flatMap((b) => b.pending.map((t) => t.key));
    expect(enBloques).not.toContain('sunlight');
    expect(enBloques).not.toContain('protein');
  });

  it('cinta + pendientes = la lista completa (nada se pierde en el reparto)', () => {
    const total = hechas.length + pendingBlocks.reduce((s, b) => s + b.pending.length, 0);
    expect(total).toBe(r.global.total);
  });

  it('un bloque 100% hecho desaparece de abajo, pero conserva su done/total', () => {
    const input: TareasInput = {
      booleanElectrons: [boolE('sunlight', true), boolE('meditation', true), boolE('journal')],
      quantitativeElectrons: [],
      agendaItems: [],
    };
    const res = buildTareas(input, 10);
    const parts = repartoTareas(agendaLens(res), res.blocks);
    expect(parts.pendingBlocks.map((b) => b.momento)).toEqual(['noche']);
    expect(parts.hechas.map((t) => t.key)).toEqual(['meditation', 'sunlight']);
  });
});

describe('pickFocusMomento (MB-20.2 · 1.2)', () => {
  it('el bloque de la hora, si tiene pendientes', () => {
    expect(pickFocusMomento(['manana', 'tarde', 'noche'], 'tarde')).toBe('tarde');
  });

  it('bloque de la hora completo: el siguiente con pendientes', () => {
    // El escenario del muro que encoge a media tarde.
    expect(pickFocusMomento(['noche'], 'tarde')).toBe('noche');
    expect(pickFocusMomento(['manana', 'noche'], 'tarde')).toBe('noche');
  });

  it('sin pendientes hacia adelante: el primero que siga pendiente', () => {
    expect(pickFocusMomento(['manana'], 'noche')).toBe('manana');
  });

  it('día terminado: no hay foco, se ve la cinta completa', () => {
    expect(pickFocusMomento([], 'tarde')).toBeNull();
    expect(pickFocusMomento([], 'noche')).toBeNull();
  });
});
