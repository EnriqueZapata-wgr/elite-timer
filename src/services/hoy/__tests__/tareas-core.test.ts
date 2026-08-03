/**
 * TAREAS — el contrato del checklist (MB-20 Pieza 1).
 * Una fuente, dos lentes; los gestos por fila son doctrina, no estilo.
 */
import { describe, it, expect } from 'vitest';
import {
  buildTareas,
  agendaLens,
  gestoForBool,
  momentoForHour,
  TAREA_MOMENTO,
  TAREA_TIME,
  EXPERIENCIA_SOURCES,
  EXPERIENCIA_CAPTURA,
  EXPERIENCIA_REGISTRO,
  type TareasInput,
} from '@/src/services/hoy/tareas-core';
import {
  VERIFIED_ELECTRON_KEYS,
  DEFAULT_BOOLEANS,
  MANDATORY_BOOLEANS,
} from '@/src/services/hoy/day-booleans';

function boolE(source: string, completed = false) {
  return {
    source, name: source, icon: 'meditar', color: '#fff',
    weight: 2, completed, pillarRoute: '/x',
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
