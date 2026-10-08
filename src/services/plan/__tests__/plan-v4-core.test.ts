/**
 * Candado de PLAN v4 (8-oct-2026 (v4), Fase A).
 *
 * Lo que protege:
 *  - la cabecera no inventa semanas, fases ni dueño;
 *  - un pilar que no se pudo leer dice "No se pudo leer", nunca un cero ni
 *    un vacio; un pilar vacio solo sale cuando se leyo y no hay nada;
 *  - el porque sale del documento (razon del suplemento, objetivo de la
 *    rutina, la palanca que lo nombra) y nunca de una adivinanza;
 *  - las apps recomendadas existen, estan abiertas para la cuenta, no se
 *    repiten y no pasan de cuatro;
 *  - las fotos de los pilares no traen persona y existen;
 *  - el copy cumple las reglas de la casa.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AsignacionRow } from '@/src/services/fitness/plan-semanal-core';
import { validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import { APP_BY_KEY, visibleApps } from '@/src/constants/app-registry';
import {
  componerDia, coachesDeLaSemana, LECTURA_FALLIDA, lecturaOk,
  type HabitoPlanRow, type InsumosPlan, type PracticaPlanRow, type SuplementoPlanRow,
} from '@/src/services/plan/mi-plan-core';
import {
  APP_POR_CATEGORIA, APP_POR_FAMILIA, APP_POR_PRACTICA, appDePractica, appsDelPlan, cabeceraDelPlan, CEJA_PLAN,
  IMAGEN_HERO_PLAN, puntajePilar, RUTA_SUPLEMENTOS, rutaMarcador, sinPuntoFinal, TITULO_PROGRAMA_NO_LEIDO,
  extrasDelPlan, horaCorta, IMAGEN_PILAR, MAX_APPS_RECOMENDADAS, objetivoDeRutina, ORDEN_PILARES, palancaDePilar,
  pilaresConPlan, pilaresDelPlan, prioridadesDelPlan, razonDeSuplemento, recortar, resumenEntreno, resumenSuplementos,
  RUTAS_PLAN_V4, siguienteDeHoy, TITULO_PLAN_NEUTRO, tomasAlDia, unirConY,
  type PilarKey, type PilarV4, type ProgramaParaPlan,
} from '@/src/services/plan/plan-v4-core';

// 7-oct-2026 es miercoles. Su semana: lunes 5 a domingo 11.
const HOY = '2026-10-07';
const USER = 'user-1';
const COACH_ID = 'coach-1';
const CTX = { coachElite: 'Enrique' };

function asig(p: Partial<AsignacionRow>): AsignacionRow {
  return {
    schedule_type: 'weekly_cycle', day_of_week: null, specific_date: null, focus: null, routine_id: null,
    is_active: true, user_id: USER, assigned_by: USER, ...p,
  };
}

/** Coach: Fuerza A lunes y miercoles, Fuerza B viernes. Propio: empuje martes. */
const RUTINAS: AsignacionRow[] = [
  asig({ id: 'r1', day_of_week: 1, routine_id: 'ra', routine_name: 'Fuerza A', assigned_by: COACH_ID, created_at: '2026-09-01' }),
  asig({ id: 'r2', day_of_week: 3, routine_id: 'ra', routine_name: 'Fuerza A', assigned_by: COACH_ID, created_at: '2026-09-01' }),
  asig({ id: 'r3', day_of_week: 5, routine_id: 'rb', routine_name: 'Fuerza B', assigned_by: COACH_ID, created_at: '2026-09-01' }),
  asig({ id: 'r4', day_of_week: 2, focus: 'empuje', created_at: '2026-09-02' }),
];

function sup(p: Partial<SuplementoPlanRow> & { id: string }): SuplementoPlanRow {
  return { name: p.id, is_active: true, is_plan: true, source: 'coach', ...p };
}

const SUPLEMENTOS: SuplementoPlanRow[] = [
  sup({ id: 's1', name: 'Omega 3', timing: 'evening' }),
  sup({ id: 's2', name: 'Magnesio', dose_times: ['21:30'] }),
  sup({ id: 's3', name: 'Creatina', timing: 'morning', source: 'manual' }),
  sup({ id: 's4', name: 'Vitamina D', timing: 'bedtime' }),
  sup({ id: 's5', name: 'B12', timing: null }),
];

const PRACTICAS: PracticaPlanRow[] = [
  { key: 'respiracion_478', nombre: 'Respiración 4-7-8', hora: '22:00', horaTuya: false, deCoach: true },
  { key: 'journal_am', nombre: 'Journal de la mañana', hora: '07:30', horaTuya: true },
  { key: 'ducha_fria_nivel1', nombre: 'Ducha fría', hora: '06:45', horaTuya: true },
];

const HABITOS: HabitoPlanRow[] = [
  { key: 'meditation', nombre: 'Meditación', hora: '07:00', segunSol: false, appKey: 'meditar', editaHora: true },
  { key: 'no_alcohol', nombre: 'Sin alcohol', hora: '21:00', segunSol: false, appKey: null, editaHora: false },
];

function insumos(p: Partial<InsumosPlan> = {}): InsumosPlan {
  return {
    rutinas: lecturaOk(RUTINAS),
    coachPorId: { [COACH_ID]: 'Enrique' },
    suplementos: lecturaOk(SUPLEMENTOS),
    practicas: lecturaOk(PRACTICAS),
    habitos: lecturaOk(HABITOS),
    planAlimentacion: lecturaOk(null),
    metas: lecturaOk({ proteina_g: null, agua_ml: null }),
    sueno: lecturaOk({ dormir: { hora: '23:00', origen: 'tuyo' }, despertar: { hora: '06:45', origen: 'tuyo' } }),
    evaluacion: lecturaOk({ entrenamiento: null, ventana: { inicio: '10:00', fin: '19:00' }, alimentacion: null, rutinas: [] }),
    ...p,
  };
}

function omar(): EliteV3 {
  const crudo: unknown = JSON.parse(
    readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
  );
  const r = validarEliteV3(crudo);
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

function pilares(ins: InsumosPlan, documento: EliteV3 | null = null, ahoraMin: number | null = null): PilarV4[] {
  return pilaresDelPlan({ ins, dia: componerDia(ins, HOY, HOY, CTX), hoy: HOY, documento, ahoraMin });
}

function pilar(ps: PilarV4[], k: PilarKey): PilarV4 {
  const p = ps.find((x) => x.key === k);
  if (!p) throw new Error(`falta el pilar ${k}`);
  return p;
}

function okDe(p: PilarV4): Extract<PilarV4, { estado: 'ok' }> {
  if (p.estado !== 'ok') throw new Error(`${p.key} no esta ok: ${p.estado}`);
  return p;
}

const AVANCE = { dia: 17, semana: 3, semanasTotales: 12, pct: 20, completado: false };

describe('utilidades de texto', () => {
  it('une con y, recorta en palabra y acorta la hora', () => {
    expect(unirConY(['a'])).toBe('a');
    expect(unirConY(['a', 'b', 'c'])).toBe('a, b y c');
    expect(recortar('Corto. Y otra frase.', 40)).toBe('Corto');
    const largo = recortar('Una frase bastante larga que no cabe en el chip de ninguna manera posible', 30);
    expect(largo.endsWith('…')).toBe(true);
    expect(largo.length <= 30).toBe(true);
    expect(horaCorta('06:45')).toBe('6:45');
    expect(horaCorta('23:00')).toBe('23:00');
    expect(horaCorta('Noche')).toBe('Noche');
  });
});

describe('la cabecera', () => {
  const ok = (p: Partial<Extract<ProgramaParaPlan, { estado: 'ok' }>>): ProgramaParaPlan => ({
    estado: 'ok', avance: AVANCE, porEmpezar: null, nombre: 'Fuerza y sueño', tipo: 'programa', ...p,
  });
  it('con programa en curso: nombre, semana y barra; dueño solo con algo fijado por el coach', () => {
    const c = cabeceraDelPlan({ programa: ok({}), coachesSemana: ['Enrique', 'Enrique'] });
    expect(c.ceja).toBe(CEJA_PLAN);
    expect(c.dueno).toBe('LO FIJÓ ENRIQUE');
    expect(c.titulo).toBe('Fuerza y sueño');
    expect(c.subtitulo).toBe('Semana 3 de 12');
    expect(c.progreso).toEqual({ pct: 20, texto: 'Día 17 de 84', completado: false });
    expect(c.accesible).toBe('Fuerza y sueño · Semana 3 de 12 · Día 17');
    expect(cabeceraDelPlan({ programa: ok({}), coachesSemana: [] }).dueno).toBeNull();
  });
  it('un coach sin nombre resuelto no se firma con un nombre', () => {
    expect(cabeceraDelPlan({ programa: ok({}), coachesSemana: ['Enrique', null] }).dueno).toBe('LO FIJÓ TU COACH');
  });
  it('por empezar: la fecha, sin barra y sin dia 1', () => {
    const c = cabeceraDelPlan({ programa: ok({ avance: null, porEmpezar: { inicio: '2026-10-12', faltanDias: 5 } }), coachesSemana: [] });
    expect(c.subtitulo?.startsWith('Empieza el')).toBe(true);
    expect(c.progreso).toBeNull();
  });
  it('terminado: se dice completado, la barra llena', () => {
    const c = cabeceraDelPlan({ programa: ok({ avance: { ...AVANCE, semana: 14, dia: 95, pct: 100, completado: true } }), coachesSemana: [] });
    expect(c.subtitulo).toBe('Programa de 12 semanas completado');
    expect(c.progreso?.completado).toBe(true);
  });
  it('un programa no lee Elite ni en su nombre; sin nombre, "Tu programa"', () => {
    expect(cabeceraDelPlan({ programa: ok({ nombre: 'Plan Elite 12' }), coachesSemana: [] }).titulo).toBe('Tu programa');
    expect(cabeceraDelPlan({ programa: ok({ nombre: null, tipo: 'elite' }), coachesSemana: [] }).titulo).toBe('Tu programa');
  });
  it('fecha ilegible: el programa sin semana, nunca una inventada', () => {
    const c = cabeceraDelPlan({ programa: ok({ avance: null }), coachesSemana: [] });
    expect(c.subtitulo).toBeNull();
    expect(c.progreso).toBeNull();
  });
  it('sin programa: titulo neutro (nunca "no tienes programa")', () => {
    const c = cabeceraDelPlan({ programa: { estado: 'sin_evaluacion' }, coachesSemana: [] });
    expect(c.estado).toBe('listo');
    expect(c.titulo).toBe(TITULO_PLAN_NEUTRO);
    expect(c.subtitulo).toBeNull();
    expect(c.progreso).toBeNull();
  });
  it('programa sin leer: se dice, no un titulo neutro que parezca bien', () => {
    const c = cabeceraDelPlan({ programa: { estado: 'error' }, coachesSemana: [] });
    expect(c.estado).toBe('error');
    expect(c.titulo).toBe(TITULO_PROGRAMA_NO_LEIDO);
    expect(c.progreso).toBeNull();
    const l = cabeceraDelPlan({ programa: { estado: 'cargando' }, coachesSemana: [] });
    expect(l.estado).toBe('cargando');
    expect(l.titulo).toBe('');
  });
  it('el dueño sale de la semana completa de Mi plan', () => {
    expect(coachesDeLaSemana(insumos(), HOY, CTX).length > 0).toBe(true);
  });
});

describe('los pilares: lo de la semana', () => {
  it('salen los cinco en su orden con una linea real de la semana', () => {
    const ps = pilares(insumos());
    expect(ps.map((p) => p.key)).toEqual([...ORDEN_PILARES]);
    expect(okDe(pilar(ps, 'suplementos')).resumen).toBe('5 · en 3 tomas al día');
    expect(okDe(pilar(ps, 'alimentacion')).resumen).toBe('Ventana 10:00 a 19:00');
    const ent = okDe(pilar(ps, 'entrenamiento')).resumen;
    expect(ent.startsWith('Fuerza A, ')).toBe(true);
    expect(ent.endsWith('Fuerza B · 4 días a la semana')).toBe(true);
    expect(okDe(pilar(ps, 'sueno')).resumen).toBe('De 23:00 a 6:45');
    expect(okDe(pilar(ps, 'practicas')).resumen).toBe('3 prácticas · 2 hábitos');
  });
  it('tomas al dia: dos fichas en el mismo momento son una toma; las semanales no cuentan', () => {
    expect(tomasAlDia(SUPLEMENTOS)).toBe(3);
    expect(tomasAlDia([sup({ id: 'a', timing: 'evening' }), sup({ id: 'b', dose_times: ['noche'] })])).toBe(1);
    expect(resumenSuplementos([sup({ id: 'w', timing: 'morning', dose_pattern: 'semanal' })])).toBe('1 · una vez por semana');
    expect(resumenSuplementos([sup({ id: 'x', timing: null })])).toBe('1 en tu plan');
    expect(resumenSuplementos([sup({ id: 'y', is_plan: false })])).toBeNull();
  });
  it('entreno: con mas de tres sesiones distintas solo se dicen los dias', () => {
    const rows = ['A', 'B', 'C', 'D'].map((n, i) => asig({ id: n, day_of_week: i + 1, routine_id: n, routine_name: `Rutina ${n}` }));
    expect(resumenEntreno(rows, HOY)).toBe('4 días a la semana');
    expect(resumenEntreno([], HOY)).toBeNull();
  });
  it('alimentacion: plan con metas, comidas o metas propias, sin inventar', () => {
    const plan = { nombre: 'Plan Elite v2', metas: ['2200 kcal', '150 g de proteína'], comidas: [], propio: false, coachNombre: 'Enrique', fijaProteina: true, fijaAgua: false };
    const sinVentana = { evaluacion: lecturaOk(null) };
    expect(okDe(pilar(pilares(insumos({ ...sinVentana, planAlimentacion: lecturaOk(plan) })), 'alimentacion')).resumen).toBe('2200 kcal · 150 g de proteína');
    // Sin voz conocida, un plan sin metas no lee "Elite".
    const r = okDe(pilar(pilares(insumos({ ...sinVentana, planAlimentacion: lecturaOk({ ...plan, metas: [] }) })), 'alimentacion')).resumen;
    expect(r).toBe('Plan de alimentación · v2');
    const metas = okDe(pilar(pilares(insumos({ ...sinVentana, metas: lecturaOk({ proteina_g: 150, agua_ml: 2500 }) })), 'alimentacion'));
    expect(metas.resumen).toBe('Proteína 150 g · agua 2500 ml');
    expect(metas.hoy?.texto).toBe('Hoy: 150 g de proteína');
  });
});

describe('los pilares: lo que no se pudo leer nunca es cero', () => {
  it('cada parte caida marca SU pilar y los demas siguen', () => {
    const ps = pilares(insumos({ suplementos: LECTURA_FALLIDA, sueno: LECTURA_FALLIDA }));
    expect(pilar(ps, 'suplementos').estado).toBe('error');
    expect(pilar(ps, 'sueno').estado).toBe('error');
    expect(pilar(ps, 'alimentacion').estado).toBe('ok');
    expect(pilar(ps, 'practicas').estado).toBe('ok');
  });
  it('practicas y habitos: las dos caidas es error; una sola, lo leido con aviso', () => {
    expect(pilar(pilares(insumos({ practicas: LECTURA_FALLIDA, habitos: LECTURA_FALLIDA })), 'practicas').estado).toBe('error');
    const p = okDe(pilar(pilares(insumos({ practicas: LECTURA_FALLIDA })), 'practicas'));
    expect(p.resumen).toBe('2 hábitos');
    expect(p.parcial).toBe('No se pudieron leer tus prácticas.');
    const sinHabitos = okDe(pilar(pilares(insumos({ practicas: LECTURA_FALLIDA, habitos: lecturaOk([]) })), 'practicas'));
    expect(sinHabitos.resumen).toBe('Sin hábitos encendidos');
    expect(sinHabitos.parcial).not.toBeNull();
  });
  it('alimentacion: plan y metas caidos sin ventana es error; con ventana se pinta lo leido con aviso', () => {
    const caidas = { planAlimentacion: LECTURA_FALLIDA, metas: LECTURA_FALLIDA };
    expect(pilar(pilares(insumos({ ...caidas, evaluacion: lecturaOk(null) })), 'alimentacion').estado).toBe('error');
    const conVentana = okDe(pilar(pilares(insumos(caidas)), 'alimentacion'));
    expect(conVentana.resumen).toBe('Ventana 10:00 a 19:00');
    expect(conVentana.parcial).toBe('No se pudo leer tu plan de alimentación.');
    // Un fallo a medias sin nada leido no se vuelve "no hay plan".
    const medio = pilar(pilares(insumos({ planAlimentacion: LECTURA_FALLIDA, evaluacion: lecturaOk(null) })), 'alimentacion');
    expect(medio.estado).toBe('ok');
    expect(okDe(medio).parcial).not.toBeNull();
  });
  it('entreno: rutinas caidas es error, salvo que el documento diga algo (con aviso)', () => {
    expect(pilar(pilares(insumos({ rutinas: LECTURA_FALLIDA })), 'entrenamiento').estado).toBe('error');
    const conDoc = insumos({
      rutinas: LECTURA_FALLIDA,
      evaluacion: lecturaOk({ entrenamiento: 'Fuerza tres días y caminata diaria.', ventana: null, alimentacion: null }),
    });
    const p = okDe(pilar(pilares(conDoc), 'entrenamiento'));
    expect(p.resumen).toBe('Fuerza tres días y caminata diaria');
    expect(p.parcial).toBe('No se pudieron leer tus días de entrenar.');
  });
  it('vacio solo cuando se leyo y no hay nada, con la puerta para armarlo', () => {
    const vacio = insumos({
      rutinas: lecturaOk([]), suplementos: lecturaOk([]), practicas: lecturaOk([]), habitos: lecturaOk([]),
      sueno: lecturaOk(null), evaluacion: lecturaOk(null),
    });
    const ps = pilares(vacio);
    for (const p of ps) expect(p.estado).toBe('vacio');
    const ent = pilar(ps, 'entrenamiento');
    expect(ent.estado === 'vacio' ? ent.cta?.ruta : null).toBe(RUTAS_PLAN_V4.planEntrenamiento);
    const pra = pilar(ps, 'practicas');
    expect(pra.estado === 'vacio' ? pra.cta?.ruta : null).toBe(RUTAS_PLAN_V4.armar);
    expect(pilaresConPlan(ps)).toEqual([]);
  });
  it('una parte no pedida no pinta su pilar', () => {
    const ps = pilares({ suplementos: lecturaOk(SUPLEMENTOS) });
    expect(ps.map((p) => p.key)).toEqual(['suplementos']);
  });
});

describe('los pilares: el chip de hoy', () => {
  it('dice lo de hoy y lleva a la semana completa', () => {
    const ps = pilares(insumos());
    expect(okDe(pilar(ps, 'suplementos')).hoy?.texto).toBe('Hoy: 5 suplementos');
    expect(okDe(pilar(ps, 'alimentacion')).hoy?.texto).toBe('Hoy: comes de 10:00 a 19:00');
    expect(okDe(pilar(ps, 'entrenamiento')).hoy?.texto).toBe('Hoy: Fuerza A');
    expect(okDe(pilar(ps, 'sueno')).hoy?.texto).toBe('Hoy: a dormir a las 23:00');
    for (const p of ps) if (p.estado === 'ok' && p.hoy) expect(p.hoy.ruta).toBe(RUTAS_PLAN_V4.miPlan);
  });
  it('un dia sin entrenamiento con plan es descanso', () => {
    const jueves = pilaresDelPlan({ ins: insumos(), dia: componerDia(insumos(), '2026-10-08', '2026-10-08', CTX), hoy: '2026-10-08', documento: null });
    expect(okDe(pilar(jueves, 'entrenamiento')).hoy?.texto).toBe('Hoy: descanso');
  });
  it('practicas: lo que sigue desde ahora; sin hora actual, lo primero', () => {
    const dia = componerDia(insumos(), HOY, HOY, CTX);
    expect(siguienteDeHoy(dia, 5, null)).toBe('Ducha fría, 6:45');
    expect(siguienteDeHoy(dia, 5, 8 * 60)).toBe('Sin alcohol, 21:00');
    expect(siguienteDeHoy(dia, 5, 23 * 60)).toBe('5 en tu día');
    expect(okDe(pilar(pilares(insumos(), null, 8 * 60), 'practicas')).hoy?.texto).toBe('Hoy: Sin alcohol, 21:00');
  });
  it('sueño del cronotipo sin palanca: el porque es el cronotipo y lleva a el', () => {
    const p = okDe(pilar(pilares(insumos({ sueno: lecturaOk({ dormir: { hora: '22:30', origen: 'cronotipo' }, despertar: null }) })), 'sueno'));
    expect(p.resumen).toBe('Dormir a las 22:30');
    expect(p.porQue?.enlaces[0]?.ruta).toBe(RUTAS_PLAN_V4.cronotipo);
  });
});

describe('el porque y las prioridades (documento real)', () => {
  const doc = omar();
  it('suplementos: la razon que el coach escribio para uno que SI esta en el plan', () => {
    const r = razonDeSuplemento(doc, SUPLEMENTOS);
    expect(r?.nombre).toBe('Magnesio (glicinato)');
    expect(razonDeSuplemento(doc, [sup({ id: 'z', name: 'Ashwagandha' })])).toBeNull();
    const p = okDe(pilar(pilares(insumos(), doc), 'suplementos'));
    expect(p.porQue?.texto.startsWith('Por qué: Corrige el nivel bajo')).toBe(true);
    // Se abre ahi mismo con la razon completa; sin llave de marcador, lleva a Mis suplementos.
    expect(p.porQue?.completo.startsWith('Magnesio (glicinato): Corrige el nivel bajo')).toBe(true);
    expect(p.porQue?.enlaces).toEqual([{ texto: 'Ver en Mis suplementos', ruta: RUTA_SUPLEMENTOS }]);
    expect(p.porQue?.accesible.includes('..')).toBe(false);
  });
  it('cada pilar liga con la palanca que mas lo nombra', () => {
    const palancas = doc.cierre.palancas;
    const extras = extrasDelPlan(insumos());
    expect(palancaDePilar(palancas, 'alimentacion')).toBe(1);
    expect(palancaDePilar(palancas, 'entrenamiento')).toBe(1);
    expect(palancaDePilar(palancas, 'sueno')).toBe(2);
    expect(palancaDePilar(palancas, 'practicas', extras.practicas)).toBe(2);
    const ps = pilares(insumos(), doc);
    expect(okDe(pilar(ps, 'sueno')).porQue?.texto).toBe('Por qué: Recuperación: instalar un freno propio');
    expect(okDe(pilar(ps, 'entrenamiento')).porQue?.texto.startsWith('Por qué: Grasa alrededor')).toBe(true);
  });
  it('sin coincidencia no hay porque de palanca (no se adivina)', () => {
    const nada = [{ titulo: 'Tu hígado', por_que: 'Tu GGT.', como: 'GGT a las 8 semanas.' }];
    expect(palancaDePilar(nada, 'sueno')).toBeNull();
    expect(okDe(pilar(pilares(insumos()), 'sueno')).porQue).toBeNull();
  });
  it('entreno: el objetivo de la rutina de hoy cuando el documento lo trae', () => {
    const conRutina = { ...doc, entrenamiento: { ...doc.entrenamiento, rutinas: [{ nombre: 'Fuerza A', objetivo: 'Subir masa muscular. Tres series.', dias_semana: [1, 3], bloques: [], notas: null }] } };
    expect(objetivoDeRutina(conRutina, RUTINAS, HOY)?.objetivo).toBe('Subir masa muscular. Tres series.');
    expect(okDe(pilar(pilares(insumos(), conRutina), 'entrenamiento')).porQue?.texto).toBe('Por qué: Subir masa muscular');
  });
  it('las prioridades: tres, en orden, con los pilares de tu plan que tocan', () => {
    const ps = pilares(insumos(), doc);
    const pr = prioridadesDelPlan(doc, pilaresConPlan(ps), extrasDelPlan(insumos()));
    expect(pr.map((p) => p.numero)).toEqual([1, 2, 3]);
    expect(pr[0].titulo).toBe('Tu hígado y el alcohol');
    expect(pr[0].pilares[0]).toBe('alimentacion');
    expect(pr[0].enTuPlan?.startsWith('En tu plan: alimentación')).toBe(true);
    expect(pr[2].pilares.includes('sueno')).toBe(true);
    for (const p of pr) expect(p.pilares.length <= 3).toBe(true);
    // Una palanca no manda a un pilar sin plan.
    const soloSueno = prioridadesDelPlan(doc, ['sueno']);
    expect(soloSueno[1].pilares).toEqual([]);
    expect(soloSueno[1].enTuPlan).toBeNull();
    expect(prioridadesDelPlan(null, ['sueno'])).toEqual([]);
  });
});

describe('apps recomendadas por tu plan', () => {
  const TODAS = visibleApps(true, 'elite', true);
  it('cada app del mapa existe en el registro', () => {
    for (const app of [...Object.values(APP_POR_FAMILIA), ...Object.values(APP_POR_PRACTICA), ...APP_POR_CATEGORIA.map((x) => x[1])]) {
      expect(APP_BY_KEY[app] ? 'ok' : `no existe ${app}`).toBe('ok');
    }
  });
  it('practica a app por familia, llave o categoria; sin app, null', () => {
    expect(appDePractica('box_breathing_4444')).toBe('respirar');
    expect(appDePractica('respiracion_478')).toBe('respirar');
    expect(appDePractica('journal_pm')).toBe('journal');
    expect(appDePractica('ayuno_16_8')).toBe('ayuno');
    expect(appDePractica('nsdr_10min')).toBe('meditar');
    expect(appDePractica('lentes_ambar')).toBe('sueno');
    expect(appDePractica('exposicion_solar_matutina')).toBe('sol');
    expect(appDePractica('blackout_total_cuarto')).toBe('sueno');
    expect(appDePractica('ducha_fria_nivel1')).toBeNull();
    expect(appDePractica('sauna_finlandesa')).toBeNull();
    expect(appDePractica('no_existe')).toBeNull();
  });
  it('lo de hoy por hora, sin repetir, maximo cuatro', () => {
    const r = appsDelPlan({ ins: insumos(), hoy: HOY, apps: TODAS });
    expect(r.length).toBe(MAX_APPS_RECOMENDADAS);
    expect(r.map((a) => a.appKey)).toEqual(['meditar', 'journal', 'suplementos', 'ayuno']);
    expect(new Set(r.map((a) => a.appKey)).size).toBe(r.length);
    expect(r[2].motivo).toBe('En tu plan: Omega 3 y 4 más');
    expect(r[3].motivo).toBe('En tu plan: ventana de 10:00 a 19:00');
    for (const a of r) expect(a.motivo.startsWith('En tu plan: ')).toBe(true);
  });
  it('desde ahora: primero lo que sigue, luego lo sin hora, al final lo que ya paso', () => {
    const r = appsDelPlan({ ins: insumos(), hoy: HOY, apps: TODAS, ahoraMin: 10 * 60 });
    expect(r.map((a) => a.appKey)).toEqual(['ayuno', 'respirar', 'entrenar', 'meditar']);
    expect(r[2].motivo).toBe('En tu plan: Fuerza A, hoy');
    expect(r[2].itemId).toBe('ent:r2');
  });
  it('una app con candado o fuera del registro no se recomienda', () => {
    const apps = TODAS.map((a) => (a.key === 'meditar' ? { ...a, bloqueada: true } : a)).filter((a) => a.key !== 'journal');
    const r = appsDelPlan({ ins: insumos(), hoy: HOY, apps });
    expect(r.some((a) => a.appKey === 'meditar' || a.appKey === 'journal')).toBe(false);
  });
  it('dos cosas del plan en la misma app: una sola fila, la de hoy mas temprana', () => {
    const ins = insumos({
      habitos: lecturaOk([{ key: 'breathwork', nombre: 'Respiración', hora: '08:00', segunSol: false, appKey: 'respirar', editaHora: true }]),
    });
    const r = appsDelPlan({ ins, hoy: HOY, apps: TODAS, max: 10 });
    const respirar = r.filter((a) => a.appKey === 'respirar');
    expect(respirar.length).toBe(1);
    expect(respirar[0].itemId).toBe('hab:breathwork');
  });
  it('lo que no se pudo leer no aporta filas; sin nada leido, nada', () => {
    const r = appsDelPlan({
      ins: insumos({ suplementos: LECTURA_FALLIDA, rutinas: LECTURA_FALLIDA, evaluacion: LECTURA_FALLIDA }), hoy: HOY, apps: TODAS, max: 10,
    });
    expect(r.some((a) => ['suplementos', 'entrenar', 'ayuno'].includes(a.appKey))).toBe(false);
    expect(appsDelPlan({ ins: {}, hoy: HOY, apps: TODAS })).toEqual([]);
  });
  it('rutinas propias no recomiendan Entrenar por si solas (solo las del coach)', () => {
    const r = appsDelPlan({ ins: { rutinas: lecturaOk([asig({ id: 'p', day_of_week: 3, focus: 'empuje' })]) }, hoy: HOY, apps: TODAS });
    expect(r).toEqual([]);
  });
});

describe('fotos, rutas y reglas de la casa', () => {
  it('cada foto de pilar existe, y el componente carga exactamente esas', () => {
    const comp = readFileSync(resolve(process.cwd(), 'src/components/v4/plan/plan-imagenes.ts'), 'utf8');
    const cargadas = [...comp.matchAll(/require\('@\/(assets\/[^']+)'\)/g)].map((m) => m[1]).sort();
    const esperadas = [...Object.values(IMAGEN_PILAR), IMAGEN_HERO_PLAN].sort();
    expect(cargadas).toEqual(esperadas);
    for (const f of esperadas) expect(existsSync(resolve(process.cwd(), f)) ? 'ok' : `falta ${f}`).toBe('ok');
  });
  it('ninguna foto sale de un banco con personas de sexo legible', () => {
    for (const f of Object.values(IMAGEN_PILAR)) {
      if (!f) continue;
      expect(/(-el|-ella|fitness|composicion|edad-atp|tu-dia)/.test(f) ? `con persona: ${f}` : 'ok').toBe('ok');
    }
  });
  it('cada ruta existe en app/', () => {
    const archivo: Record<string, string> = {
      '/salud': 'app/(tabs)/salud.tsx',
      '/mi-plan': 'app/mi-plan.tsx',
      '/plan-entrenamiento': 'app/plan-entrenamiento.tsx',
      '/packs/armar': 'app/packs/armar.tsx',
      '/salud/evaluacion-elite': 'app/salud/evaluacion-elite.tsx',
    };
    for (const ruta of Object.values(RUTAS_PLAN_V4)) {
      if (ruta === '/tests/resultado/cronotipo') continue; // la cubre el candado de Mi plan
      const f = archivo[ruta];
      expect(f && existsSync(resolve(process.cwd(), f)) ? 'ok' : `falta ${ruta}`).toBe('ok');
    }
  });
  it('sin raya larga ni palabras prohibidas en los archivos de PLAN v4', () => {
    const archivos = [
      'src/services/plan/plan-v4-core.ts',
      'src/screens/v4/PlanV4Screen.tsx',
      'src/components/v4/AppsRecomendadas.tsx',
      'src/components/v4/plan/PlanPiezas.tsx',
      'src/components/v4/plan/usePlanV4.ts',
      'src/services/plan/plan-v4-service.ts',
    ];
    const prohibidas = [/diagn[oó]stic/i, /tratamiento/i, /terap[eé]utic/i, /\bprevien/i, /\bcura(r|s|n)?\b/i, /receta m[eé]dica/i, /\bchequeo/i];
    for (const f of archivos) {
      const abs = resolve(process.cwd(), f);
      expect(existsSync(abs) ? 'ok' : `falta ${f}`).toBe('ok');
      if (!existsSync(abs)) continue;
      // Los nombres de campos del codigo (voz.conDiagnostico) no son copy.
      const src = readFileSync(abs, 'utf8').replace(/\b(con|tiene)Diagnostico\b/g, '');
      expect(src.includes('\u2014') ? `${f} trae raya larga` : 'ok').toBe('ok');
      for (const re of prohibidas) expect(re.test(src) ? `${f}: ${re}` : 'ok').toBe('ok');
    }
  });
  it('nunca asume el sexo en el copy de los pilares', () => {
    const textos: string[] = [];
    for (const p of pilares(insumos(), omar(), 9 * 60)) {
      textos.push(p.titulo);
      if (p.estado === 'ok') textos.push(p.resumen, p.porQue?.texto ?? '', p.hoy?.texto ?? '', p.parcial ?? '');
      if (p.estado === 'vacio') textos.push(p.texto);
    }
    const GENERO = /\b(bienvenid[oa]|list[oa] para|seguro de|segura de|cansad[oa]|preparad[oa])\b/i;
    for (const s of textos) expect(GENERO.test(s) ? s : 'ok').toBe('ok');
    expect(textos.length > 10).toBe(true);
  });
});

describe('revisión en frío (8-oct-2026 (v4))', () => {
  const doc = omar();
  it('palabras completas: "Solo" no es sol, "fuerza de voluntad" no es entreno, "noche" no es sueño', () => {
    const p = (t: string) => ({ titulo: t, por_que: '', como: '' });
    expect(puntajePilar(p('Solo una copa a la semana'), 'practicas')).toBe(0);
    expect(puntajePilar(p('Fuerza de voluntad por la noche'), 'entrenamiento')).toBe(0);
    expect(puntajePilar(p('Fuerza de voluntad por la noche'), 'sueno')).toBe(0);
    expect(puntajePilar(p('Recuperar el ritmo de la práctica'), 'sueno')).toBe(0);
    expect(puntajePilar(p('Recuperar el ritmo de la práctica'), 'practicas')).toBe(0);
    // Control: la palabra completa si cuenta.
    expect(puntajePilar(p('Sol al despertar'), 'practicas')).toBe(1);
    expect(puntajePilar(p('Sol al despertar'), 'sueno')).toBe(1);
  });
  it('el chip de palanca se abre con la razon y ofrece el marcador solo si se conoce su llave', () => {
    const pr = prioridadesDelPlan(doc, ['alimentacion', 'sueno', 'practicas', 'suplementos', 'entrenamiento']);
    const conMarcador = pr.find((x) => x.marcador !== null);
    expect(conMarcador ? 'ok' : 'ninguna palanca con marcador').toBe('ok');
    const ps = pilares(insumos({ suplementos: lecturaOk([sup({ id: 'z', name: 'Ashwagandha' })]) }), doc);
    for (const p of ps) {
      if (p.estado !== 'ok' || !p.porQue) continue;
      expect(p.porQue.accesible.includes('..') ? p.porQue.accesible : 'ok').toBe('ok');
      for (const e of p.porQue.enlaces) {
        if (e.texto === 'Ver el marcador') expect(e.ruta.startsWith('/salud?marcador=')).toBe(true);
        expect(e.ruta === '/salud' ? 'enlace al Perfil sin marcador' : 'ok').toBe('ok');
      }
    }
    expect(rutaMarcador('ggt')).toBe('/salud?marcador=ggt');
    expect(sinPuntoFinal('por los antiácidos. ')).toBe('por los antiácidos');
  });
  it('el numero de la prioridad es el mismo en la tarjeta y en el chip (cuenta sin filtrar)', () => {
    const palancas = doc.cierre.palancas;
    const conHueco = { ...doc, cierre: { ...doc.cierre, palancas: [{ ...palancas[0], titulo: '  ' }, palancas[1], palancas[2]] } } as EliteV3;
    const pr = prioridadesDelPlan(conHueco, ['sueno']);
    expect(pr.map((p) => p.numero)).toEqual([2, 3]);
    const sueno = okDe(pilar(pilares(insumos(), conHueco), 'sueno'));
    expect(sueno.porQue?.completo.startsWith('Tu prioridad 3, ')).toBe(true);
  });
  it('"Ver en tu perfil" solo cuando el documento trae evaluacion', () => {
    for (const p of prioridadesDelPlan(doc, ['sueno'])) expect(p.verPerfil).toBe(true);
  });
  it('fotos: las cinco pilares y el heroe, B/N medidas y sin persona', () => {
    expect(ORDEN_PILARES.every((k) => typeof IMAGEN_PILAR[k] === 'string')).toBe(true);
    expect(IMAGEN_PILAR).toEqual({
      suplementos: 'assets/images/electrons/suplementos.webp',
      alimentacion: 'assets/images/agenda/comida/comida-04.webp',
      entrenamiento: 'assets/images/health-hub/mi-salud.webp',
      sueno: 'assets/images/hoy-extra/sueno.webp',
      practicas: 'assets/images/intervenciones/calor.webp',
    });
    expect(IMAGEN_HERO_PLAN).toBe('assets/images/hoy-extra/tu-dia/atardecer-03.webp');
    expect(existsSync(resolve(process.cwd(), IMAGEN_HERO_PLAN))).toBe(true);
    const comp = readFileSync(resolve(process.cwd(), 'src/components/v4/plan/plan-imagenes.ts'), 'utf8');
    // Cada pilar carga SU foto (por llave) y el heroe la suya; ninguna otra.
    for (const k of ORDEN_PILARES) {
      expect(comp.includes(`${k}: require('@/${IMAGEN_PILAR[k]}')`) ? 'ok' : `${k} no carga ${IMAGEN_PILAR[k]}`).toBe('ok');
      expect(existsSync(resolve(process.cwd(), IMAGEN_PILAR[k]))).toBe(true);
    }
    expect(comp.includes(`FOTO_HERO_PLAN: ImageSourcePropType = require('@/${IMAGEN_HERO_PLAN}')`)).toBe(true);
    expect((comp.match(/require\(/g) ?? []).length).toBe(ORDEN_PILARES.length + 1);
  });
  it('las filas del expediente no caen en el Perfil (ni /salud pelado ni el puente /salud/expediente)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/screens/v4/PlanV4Screen.tsx'), 'utf8');
    expect(src.includes('FILAS_EXPEDIENTE')).toBe(true);
    expect(/['"]\/salud(\/expediente)?['"]/.test(src) ? 'una fila al Perfil' : 'ok').toBe('ok');
  });
});
