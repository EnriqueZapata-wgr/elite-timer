/**
 * Tests que amarran el motor de packs (MB-25 Pieza 6, corregidos en
 * MB-26 Pieza 7: aplicar en vez de activar, etapas, cero desactivar).
 *
 *  2 · Idempotencia: aplicar dos veces = mismo estado (cero escrituras la
 *      segunda vez). La mutación que quite el guard truena aquí.
 *  3 · Anclaje de horas: relativas → absolutas con recorte a la ventana.
 *  5 · Etapas: aplicar (etapa 1) enciende solo los 3 core.
 */
import { describe, it, expect } from 'vitest';
import {
  anclarHora,
  buildPackPlan,
  esHoraValida,
  packAplicado,
  planDeFila,
  reconcilarPack,
  sinEscrituras,
  type EstadoActual,
  type PackPlan,
  type PackWrites,
  type UserPackRow,
} from '@/src/services/pack-core';
import { PACKS, PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { togglesForApp } from '@/src/services/hoy/install-core';
import { DEFAULT_BOOLEANS } from '@/src/services/hoy/day-booleans';

// ─── Helpers de simulación (puros, espejo de lo que ejecuta pack-service) ───

function estadoBase(): EstadoActual {
  return {
    prefs: { booleans: [...DEFAULT_BOOLEANS], quants: ['protein', 'water'], installedApps: [] },
    habitTimes: {},
    metas: { proteina_g: 150, agua_ml: 2500, ayuno_h: 16 },
    avisos: {},
  };
}

/** Aplica las escrituras al estado, como lo haría pack-service. */
function aplicar(estado: EstadoActual, w: PackWrites): EstadoActual {
  const prefs = {
    booleans: [...estado.prefs.booleans],
    quants: [...estado.prefs.quants],
    installedApps: [...estado.prefs.installedApps],
  };
  for (const app of w.installApps) {
    const t = togglesForApp(app);
    for (const b of t.booleans) if (!prefs.booleans.includes(b)) prefs.booleans.push(b);
    for (const q of t.quants) if (!prefs.quants.includes(q)) prefs.quants.push(q);
    if (!prefs.installedApps.includes(app)) prefs.installedApps.push(app);
  }
  for (const app of w.gridApps) {
    if (!prefs.installedApps.includes(app)) prefs.installedApps.push(app);
  }
  for (const b of w.bools) if (!prefs.booleans.includes(b)) prefs.booleans.push(b);
  for (const q of w.quants) if (!prefs.quants.includes(q)) prefs.quants.push(q);
  // MB-26 P5: lo que se escribe son REGLAS (setHabitTimeRegla).
  const metas = { ...estado.metas };
  for (const m of w.metas) {
    if (m.tipo === 'proteina_g') metas.proteina_g = m.valor;
    else if (m.tipo === 'agua_ml') metas.agua_ml = m.valor;
    else metas.ayuno_h = m.valor;
  }
  const avisos = { ...estado.avisos };
  for (const a of w.avisos) avisos[a.app] = { enabled: true, time: a.time };
  return {
    prefs,
    habitTimes: { ...estado.habitTimes, ...w.habitReglas },
    metas,
    avisos,
  };
}

// ─── 3 · Anclaje de horas ───────────────────────────────────────────────────

describe('anclaje de horas', () => {
  it('con despertar 7:00 y dormir 23:00 las horas absolutas salen bien', () => {
    const p = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    expect(p.habitTimes.sunlight).toBe('07:30'); // despertar +30
    expect(p.habitTimes.screen_time_cutoff).toBe('22:00'); // dormir −60
    expect(p.habitTimes.red_glasses).toBe('21:00'); // dormir −120
    expect(p.habitTimes.breathwork).toBe('21:30'); // dormir −90
    expect(p.avisos).toEqual([
      { app: 'sol', time: '07:30' },
      { app: 'respirar', time: '21:30' },
    ]);
  });

  it('con despertar 5:00 las horas se corren', () => {
    const p = buildPackPlan('dormir-mejor', 'con_todo', '05:00', '21:00');
    expect(p.habitTimes.sunlight).toBe('05:30');
    expect(p.habitTimes.screen_time_cutoff).toBe('20:00');
    expect(p.habitTimes.breathwork).toBe('19:30');
  });

  it('una hora que caería después de dormir se recorta', () => {
    // despertar +20h con ventana 07:00→23:00 caería a las 03:00 del día
    // siguiente: se recorta al cierre de la ventana.
    expect(anclarHora({ ancla: 'despertar', offsetMin: 20 * 60 }, '07:00', '23:00')).toBe('23:00');
  });

  it('una hora que caería antes de despertar se recorta', () => {
    expect(anclarHora({ ancla: 'dormir', offsetMin: -20 * 60 }, '07:00', '23:00')).toBe('07:00');
  });

  it('soporta dormir cruzando medianoche', () => {
    expect(anclarHora({ ancla: 'dormir', offsetMin: -30 }, '08:00', '00:00')).toBe('23:30');
    expect(anclarHora({ ancla: 'dormir', offsetMin: -90 }, '08:00', '00:30')).toBe('23:00');
  });

  it('valida horas', () => {
    expect(esHoraValida('07:00')).toBe(true);
    expect(esHoraValida('23:59')).toBe(true);
    expect(esHoraValida('24:00')).toBe(false);
    expect(esHoraValida('siete')).toBe(false);
  });
});

// ─── 2 · Idempotencia ───────────────────────────────────────────────────────

describe('idempotencia de la activación', () => {
  it.each(PACKS.map((p) => [p.key] as const))('%s: activar dos veces = mismo estado', (key) => {
    const plan = buildPackPlan(key, 'con_todo', '07:00', '23:00');
    const estado0 = estadoBase();
    const w1 = reconcilarPack(plan, null, estado0);
    const estado1 = aplicar(estado0, w1);
    // Segunda activación, mismo pack, mismo horario: cero escrituras.
    const w2 = reconcilarPack(plan, plan, estado1);
    expect(sinEscrituras(w2), `re-activación de ${key} escribe: ${JSON.stringify(w2)}`).toBe(true);
    // Y el estado no cambia ni aplicándolas.
    expect(aplicar(estado1, w2)).toEqual(estado1);
  });

  it('no pisa una hora que el usuario movió a mano después de activar', () => {
    const plan = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    const estado1 = aplicar(estadoBase(), reconcilarPack(plan, null, estadoBase()));
    // El usuario fijó su corte de pantallas a las 21:00 (override absoluto).
    estado1.habitTimes.screen_time_cutoff = '21:00';
    // Re-activa con OTRO horario: las REGLAS no cambian (el recorrido de
    // horas lo hace el compile, MB-26 P5), y lo fijado a mano es del
    // usuario: cero escrituras de horas.
    const plan2 = buildPackPlan('dormir-mejor', 'con_todo', '06:00', '22:00');
    const w = reconcilarPack(plan2, plan, estado1);
    expect(w.habitReglas.screen_time_cutoff).toBeUndefined();
    expect(Object.keys(w.habitReglas)).toEqual([]);
    // Y el override fijo sobrevive tal cual en el estado.
    expect(estado1.habitTimes.screen_time_cutoff).toBe('21:00');
  });

  it('MB-25 legacy: una hora absoluta escrita por la activación vieja se conserva', () => {
    // Antes de MB-26 el pack escribía '22:00' absoluto. Ese usuario
    // re-aplica hoy: la entrada fija difiere de la regla del plan previo →
    // cuenta como manual y NO se pisa con la regla nueva.
    const plan = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    const estado = estadoBase();
    estado.habitTimes.screen_time_cutoff = '22:00';
    const w = reconcilarPack(plan, plan, estado);
    expect(w.habitReglas.screen_time_cutoff).toBeUndefined();
  });

  it('no re-enciende un hábito que el usuario apagó después de activar', () => {
    const plan = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    const estado1 = aplicar(estadoBase(), reconcilarPack(plan, null, estadoBase()));
    // El usuario apagó lentes rojos y desinstaló Respirar.
    estado1.prefs.booleans = estado1.prefs.booleans.filter((b) => b !== 'red_glasses');
    estado1.prefs.booleans = estado1.prefs.booleans.filter((b) => b !== 'breathwork');
    estado1.prefs.installedApps = estado1.prefs.installedApps.filter((a) => a !== 'respirar');
    const w = reconcilarPack(plan, plan, estado1);
    expect(w.bools).not.toContain('red_glasses');
    expect(w.installApps).not.toContain('respirar');
  });

  it('no re-enciende un aviso que el usuario apagó o movió', () => {
    const plan = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    const estado1 = aplicar(estadoBase(), reconcilarPack(plan, null, estadoBase()));
    estado1.avisos.sol = { enabled: false, time: '07:30' }; // lo apagó
    estado1.avisos.respirar = { enabled: true, time: '20:00' }; // lo movió
    const w = reconcilarPack(plan, plan, estado1);
    expect(w.avisos).toEqual([]);
  });

  it('no pisa una meta que el usuario cambió después de activar', () => {
    const plan = buildPackPlan('energia-estable', 'con_todo', '07:00', '23:00');
    const estado1 = aplicar(estadoBase(), reconcilarPack(plan, null, estadoBase()));
    estado1.metas.agua_ml = 3000; // la subió a mano
    const w = reconcilarPack(plan, plan, estado1);
    expect(w.metas.find((m) => m.tipo === 'agua_ml')).toBeUndefined();
  });

  it('la primera activación sí fija todo (para eso es el pack)', () => {
    const plan = buildPackPlan('energia-estable', 'con_todo', '07:00', '23:00');
    const estado = estadoBase();
    estado.metas.agua_ml = 1500; // valor previo del usuario, SIN pack de por medio
    const w = reconcilarPack(plan, null, estado);
    expect(w.metas.find((m) => m.tipo === 'agua_ml')?.valor).toBe(2500);
  });
});

// ─── 5 · Etapas: aplicar enciende solo los core ─────────────────────────────

describe('etapa 1 (suave) contra etapa 2 (con todo)', () => {
  it('suave enciende solo los core', () => {
    const suave = buildPackPlan('dormir-mejor', 'suave', '07:00', '23:00');
    const todo = buildPackPlan('dormir-mejor', 'con_todo', '07:00', '23:00');
    // Suave: sunlight y el corte de pantallas (sleep no tiene fuente).
    expect(suave.encendidos).toEqual(['sunlight', 'screen_time_cutoff']);
    expect(suave.boolsPrefs).toEqual([]); // red_glasses NO es core
    expect(suave.installFull).not.toContain('respirar'); // breathwork NO es core
    expect(suave.installGrid).toContain('respirar'); // pero la app sí entra a la sala
    // Con todo: además lentes rojos y respiración.
    expect(todo.boolsPrefs).toEqual(['red_glasses']);
    expect(todo.installFull).toContain('respirar');
    expect(todo.encendidos).toContain('breathwork');
  });

  it('las horas de suave son solo las de sus core', () => {
    const suave = buildPackPlan('dormir-mejor', 'suave', '07:00', '23:00');
    expect(Object.keys(suave.habitTimes).sort()).toEqual(['screen_time_cutoff', 'sunlight']);
  });

  it.each(PACKS.map((p) => [p.key] as const))('%s: los hábitos de suave son subconjunto core', (key) => {
    const pack = PACK_BY_KEY[key];
    const suaves = habitosPorIntensidad(pack, 'suave');
    expect(suaves.every((h) => h.core)).toBe(true);
    expect(suaves.length).toBe(3);
  });

  it('agua entra por prefs cuando su app no está en el pack', () => {
    // El pack de energía no instala Hidratación, pero agua es core: el
    // motor la enciende por electron-prefs, no por una puerta inventada.
    const p = buildPackPlan('energia-estable', 'suave', '07:00', '23:00');
    expect(p.quantsPrefs).toContain('water');
    const estado = estadoBase();
    estado.prefs.quants = ['protein']; // usuario sin agua en su día
    const w = reconcilarPack(p, null, estado);
    expect(w.quants).toEqual(['water']);
    // Y si ya la tiene, no se escribe nada.
    const w2 = reconcilarPack(p, null, estadoBase());
    expect(w2.quants).toEqual([]);
  });
});

// ─── Registro ───────────────────────────────────────────────────────────────

describe('el registro de aplicaciones', () => {
  const fila = (over: Partial<UserPackRow>): UserPackRow => ({
    pack_key: 'dormir-mejor',
    intensidad: 'suave',
    wake_time: '07:00',
    sleep_time: '23:00',
    active: true,
    activated_at: '2026-08-05T12:00:00Z',
    ...over,
  });

  it('packAplicado encuentra la fila y tolera lectura fallida', () => {
    expect(packAplicado(null, 'dormir-mejor')).toBeNull();
    expect(packAplicado([], 'dormir-mejor')).toBeNull();
    expect(packAplicado([fila({})], 'foco-claridad')).toBeNull();
    expect(packAplicado([fila({})], 'dormir-mejor')?.pack_key).toBe('dormir-mejor');
  });

  it('planDeFila reconstruye el plan y rechaza basura', () => {
    const p = planDeFila(fila({})) as PackPlan;
    expect(p.habitTimes.sunlight).toBe('07:30');
    expect(planDeFila(fila({ pack_key: 'no-existe' }))).toBeNull();
    expect(planDeFila(fila({ wake_time: '99:99' }))).toBeNull();
  });
});
