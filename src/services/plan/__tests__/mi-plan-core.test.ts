/**
 * Candado de Mi plan (7-oct-2026, Mi plan).
 *
 * Lo que este archivo protege es el CONTRATO de honestidad de la pantalla:
 *  - lo del coach manda y se dice de quien es; lo propio nunca se esconde;
 *  - un fallo de lectura marca su seccion y NO se vuelve un cero ni un
 *    "todavia no tienes plan";
 *  - la semana es de lunes a domingo en fechas locales;
 *  - las etiquetas de propiedad son tres y solo tres;
 *  - ninguna fila lleva a una pantalla inventada.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AsignacionRow } from '@/src/services/fitness/plan-semanal-core';
import type { UserInterventionRow } from '@/src/services/interventions/intervention-service-core';
import { validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import { avanceDelPrograma } from '@/src/services/elite/programa-elite-core';
import { TOPE_HERO_ELITE_MS } from '@/src/services/hoy/elite-hoy-core';
import { VOZ_ELITE, vozDe } from '@/src/services/elite/voz-programa-core';
import {
  ajustesDePractica, avisoHoraDePracticaAsignada, documentoDe, PRACTICA_NO_LEIDA, vozDelPlan,
} from '@/src/services/plan/mi-plan-core';
import {
  alElegirDia, avisoDeEvaluacion, coachesDeLaSemana, comoSeAjusta, componerDia, contactoCoach, coachDelDia, conTope,
  diaVisible, ETIQUETA_ARGOS, ETIQUETA_TUYO, etiquetaCoach, fusionarInsumos, GATE_DESCONOCIDO, habitosDeLecturas,
  habitoEditaHora, habitosDePrefs, horaLimpia, horasDeHabitos, juntarLecturas, LECTURA_FALLIDA, LECTURA_ILEGIBLE, lecturaOk,
  lineaSemanaPrograma, metasDeGoals, momentosDeToma, necesitaGate, ORDEN_SECCIONES, PARTES_DE_SECCION, PARTES_RESUMEN,
  PARTES_TODAS, partesVigentes, planDeEvaluacion, practicasDeFilas, resumenDelDia, RUTAS_MI_PLAN, semanaDe, SIN_SESION, sumarDias,
  tarjetaMiPlan, tiraSemana, tituloDia, TOPE_COMPARTIDA_MS, TOPE_PARTE_MS, ventanaDeSueno,
  type CronotipoIn, type DiaPlan, type FilaPlan, type GateHabitos, type HabitoPlanRow, type InsumosPlan,
  type PlanAlimentacionIn, type PracticaPlanRow, type Reloj, type SeccionKey, type SeccionPlan, type SuplementoPlanRow,
} from '@/src/services/plan/mi-plan-core';

// 7-oct-2026 es miercoles. Su semana: lunes 5 a domingo 11.
const HOY = '2026-10-07';
const LUNES = '2026-10-05';
const MARTES = '2026-10-06';
const DOMINGO = '2026-10-11';
const USER = 'user-1';
const COACH_ID = 'coach-1';
const CTX = { coachElite: 'Enrique' };

function asig(p: Partial<AsignacionRow>): AsignacionRow {
  return {
    schedule_type: 'weekly_cycle', day_of_week: null, specific_date: null, focus: null, routine_id: null,
    is_active: true, user_id: USER, assigned_by: USER, ...p,
  };
}

/** Rutina del coach los lunes y enfoque propio los lunes y martes. */
const RUTINAS: AsignacionRow[] = [
  asig({ id: 'r-coach', day_of_week: 1, routine_id: 'rut-1', routine_name: 'Fuerza tren inferior', assigned_by: COACH_ID, created_at: '2026-09-01' }),
  asig({ id: 'r-lun', day_of_week: 1, focus: 'empuje', created_at: '2026-09-02' }),
  asig({ id: 'r-mar', day_of_week: 2, focus: 'traccion', created_at: '2026-09-02' }),
];

function sup(p: Partial<SuplementoPlanRow> & { id: string }): SuplementoPlanRow {
  return { name: p.id, is_active: true, is_plan: true, source: 'manual', ...p };
}

const SUPLEMENTOS: SuplementoPlanRow[] = [
  sup({ id: 's1', name: 'Omega 3', timing: 'evening', source: 'coach' }),
  sup({ id: 's2', name: 'Magnesio', dose_times: ['21:30'], source: 'coach' }),
  sup({ id: 's3', name: 'Creatina', timing: 'morning' }),
  sup({ id: 's4', name: 'Vitamina D', timing: null, source: 'coach' }),
];

const PRACTICAS: PracticaPlanRow[] = [
  { key: 'hidratacion_matutina', nombre: 'Hidratación matutina 500 ml', hora: '07:15', horaTuya: false },
  { key: 'exposicion_solar_matutina', nombre: 'Exposición solar matutina', hora: '08:00', horaTuya: true },
  { key: 'x_sin_hora', nombre: 'Caminata después de comer', hora: null, horaTuya: false },
];

const HABITOS: HabitoPlanRow[] = [
  { key: 'meditation', nombre: 'Meditación', hora: '07:00', segunSol: false, appKey: 'meditar', editaHora: true },
  { key: 'no_alcohol', nombre: 'Sin alcohol', hora: '21:00', segunSol: false, appKey: null, editaHora: false },
  { key: 'sunlight', nombre: 'Luz solar', hora: null, segunSol: true, appKey: 'sol', editaHora: true },
];

const PLAN_COACH: PlanAlimentacionIn = {
  nombre: 'Plan de recomposición',
  metas: ['2200 kcal', '150 g de proteína'],
  comidas: [
    { momento: 'desayuno', hora: '08:00', nombre: 'Huevos con verdura', componentes: ['3 huevos', 'espinaca'], notas: null },
    { momento: 'cena', hora: null, nombre: 'Pescado y ensalada', componentes: [], notas: null },
  ],
  propio: false,
  coachNombre: 'Enrique',
  fijaProteina: true,
  fijaAgua: false,
};

/** Una cuenta con de todo: cliente con programa y evaluacion. */
function insumosLlenos(): InsumosPlan {
  return {
    rutinas: lecturaOk(RUTINAS),
    coachPorId: { [COACH_ID]: 'Enrique' },
    suplementos: lecturaOk(SUPLEMENTOS),
    practicas: lecturaOk(PRACTICAS),
    habitos: lecturaOk(HABITOS),
    planAlimentacion: lecturaOk<PlanAlimentacionIn | null>(PLAN_COACH),
    metas: lecturaOk({ proteina_g: 140, agua_ml: 2500 }),
    sueno: lecturaOk({ dormir: { hora: '23:00', origen: 'cronotipo' as const }, despertar: { hora: '07:00', origen: 'cronotipo' as const } }),
    evaluacion: lecturaOk({
      entrenamiento: '3 tipos de sesión',
      ventana: { inicio: '12:00', fin: '20:00' },
      alimentacion: { titulo: 'Qué priorizar y qué evitar', detalle: '5 que priorizar · 3 que evitar' },
    }),
  };
}

/** Una cuenta nueva: todo se leyo y no hay nada. */
function insumosVacios(): InsumosPlan {
  return {
    rutinas: lecturaOk<AsignacionRow[]>([]),
    suplementos: lecturaOk<SuplementoPlanRow[]>([]),
    practicas: lecturaOk<PracticaPlanRow[]>([]),
    habitos: lecturaOk<HabitoPlanRow[]>([]),
    planAlimentacion: lecturaOk<PlanAlimentacionIn | null>(null),
    metas: lecturaOk({ proteina_g: null, agua_ml: null }),
    sueno: lecturaOk(null),
    evaluacion: lecturaOk(null),
  };
}

function seccion(dia: DiaPlan, key: SeccionKey): SeccionPlan | undefined {
  return dia.secciones.find((s) => s.key === key);
}

function filasDe(dia: DiaPlan, key: SeccionKey): FilaPlan[] {
  const s = seccion(dia, key);
  return s && s.estado === 'ok' ? s.filas : [];
}

function filaPorId(dia: DiaPlan, id: string): FilaPlan | undefined {
  for (const s of dia.secciones) {
    if (s.estado !== 'ok') continue;
    const f = s.filas.find((x) => x.id === id);
    if (f) return f;
  }
  return undefined;
}

/** Todo el texto que una persona puede leer de un dia. */
function textosDe(dia: DiaPlan): string[] {
  const out: string[] = [];
  for (const s of dia.secciones) {
    out.push(s.titulo);
    if (s.estado !== 'ok') continue;
    if (s.nota) out.push(s.nota);
    if (s.parcial) out.push(s.parcial);
    if (s.cta) out.push(s.cta.texto);
    for (const f of s.filas) {
      out.push(f.titulo);
      for (const x of [f.cuando, f.detalle, f.etiqueta, f.accion]) if (x) out.push(x);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

describe('la semana, de lunes a domingo, en fechas locales', () => {
  it('un miercoles cae en la semana que abre su lunes', () => {
    expect(semanaDe(HOY)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
  });
  it('el domingo CIERRA la semana: sigue siendo la del lunes anterior', () => {
    expect(semanaDe(DOMINGO)[0]).toBe(LUNES);
    expect(semanaDe(DOMINGO)[6]).toBe(DOMINGO);
  });
  it('el lunes abre la suya: no arrastra el domingo de antes', () => {
    expect(semanaDe('2026-10-12')[0]).toBe('2026-10-12');
    expect(semanaDe('2026-10-12')).not.toContain(DOMINGO);
  });
  it('cruza mes y ano sin perder ni repetir dias', () => {
    // 31-dic-2026 es jueves: lunes 28-dic a domingo 3-ene.
    expect(semanaDe('2026-12-31')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
    // 1-mar-2026 es domingo: su semana empezo el lunes 23-feb.
    expect(semanaDe('2026-03-01')[0]).toBe('2026-02-23');
  });
  it('cada dia de una semana da la misma semana', () => {
    const semana = semanaDe(HOY);
    for (const d of semana) expect(semanaDe(d)).toEqual(semana);
  });
  it('una fecha que no es fecha no pinta una tira inventada', () => {
    expect(semanaDe('')).toEqual([]);
    expect(semanaDe('hoy')).toEqual([]);
    expect(semanaDe('2026-13-40')).toEqual([]);
    expect(tituloDia('nada', HOY)).toBe('');
  });
  it('sumarDias no pasa por UTC', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('la tira marca hoy y que dias se entrena', () => {
    const tira = tiraSemana(HOY, lecturaOk(RUTINAS));
    expect(tira.map((d) => d.inicial).join('')).toBe('LMMJVSD');
    expect(tira.map((d) => d.numero)).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(tira.filter((d) => d.esHoy).map((d) => d.fecha)).toEqual([HOY]);
    expect(tira.map((d) => d.entrena)).toEqual([true, true, false, false, false, false, false]);
    expect(tira[0].nombre).toBe('Lunes');
    expect(tira[6].nombre).toBe('Domingo');
  });
  it('sin rutinas leidas el punto de "entrenas" no se afirma ni se niega', () => {
    expect(tiraSemana(HOY, LECTURA_FALLIDA).every((d) => d.entrena === null)).toBe(true);
    expect(tiraSemana(HOY).every((d) => d.entrena === null)).toBe(true);
  });
  it('una fecha especifica cuenta solo ese dia de la tira', () => {
    const rows = [asig({ id: 'x', schedule_type: 'specific_date', specific_date: '2026-10-10', focus: 'full_body' })];
    expect(tiraSemana(HOY, lecturaOk(rows)).filter((d) => d.entrena).map((d) => d.fecha)).toEqual(['2026-10-10']);
  });
  it('el titulo del dia dice "Hoy" solo hoy', () => {
    expect(tituloDia(HOY, HOY)).toBe('Hoy, miércoles 7 de octubre');
    expect(tituloDia('2026-10-08', HOY)).toBe('Jueves 8 de octubre');
  });
});

describe('la semana del programa', () => {
  it('se dice solo cuando hay avance', () => {
    expect(lineaSemanaPrograma(avanceDelPrograma('2026-09-21', HOY, 12))).toBe('Semana 3 de 12');
    expect(lineaSemanaPrograma(null)).toBeNull();
    expect(lineaSemanaPrograma(undefined)).toBeNull();
  });
  it('terminado el programa no sigue contando semanas de mas', () => {
    expect(lineaSemanaPrograma(avanceDelPrograma('2026-01-05', HOY, 12))).toBe('Programa de 12 semanas completado');
  });
});

describe('entrenamiento: lo del coach manda y lo propio no se esconde', () => {
  it('lunes: la rutina del coach va primero, con su nombre, y lo propio desplazado sigue a la vista', () => {
    const dia = componerDia(insumosLlenos(), LUNES, HOY, CTX);
    const filas = filasDe(dia, 'entrenamiento');
    expect(filas[0].titulo).toBe('Fuerza tren inferior');
    expect(filas[0].dueno).toBe('coach');
    expect(filas[0].etiqueta).toBe('Lo fijó Enrique');
    expect(filas[0].detalle).toBe('Rutina asignada. Cada lunes.');
    expect(filas[0].destino).toEqual({ tipo: 'ruta', ruta: '/fitness-hub' });
    expect(filas[1].titulo).toBe('Empuje');
    expect(filas[1].dueno).toBe('tuyo');
    expect(filas[1].etiqueta).toBe(ETIQUETA_TUYO);
    expect(filas[1].destino).toEqual({ tipo: 'ruta', ruta: '/plan-entrenamiento' });
  });
  it('martes: solo lo propio, y abre su editor de siempre', () => {
    const dia = componerDia(insumosLlenos(), MARTES, HOY, CTX);
    const filas = filasDe(dia, 'entrenamiento').filter((f) => f.id !== 'ent:evaluacion');
    expect(filas).toHaveLength(1);
    expect(filas[0].titulo).toBe('Tracción');
    expect(filas[0].etiqueta).toBe('Lo puedes mover');
    expect(filas[0].accion).toBe('Mover mis días');
    expect(filas[0].destino).toEqual({ tipo: 'ruta', ruta: '/plan-entrenamiento' });
  });
  it('miercoles sin nada agendado: es descanso, dicho llano, con la puerta para mover los dias', () => {
    const ins = insumosLlenos();
    ins.evaluacion = lecturaOk(null);
    const s = seccion(componerDia(ins, HOY, HOY, CTX), 'entrenamiento');
    expect(s && s.estado === 'ok' ? s.filas : null).toEqual([]);
    expect(s && s.estado === 'ok' ? s.nota : null).toBe('Descanso. No hay entrenamiento agendado este día.');
    expect(s && s.estado === 'ok' ? s.cta : null).toEqual({ texto: 'Mover mis días de entrenar', destino: { tipo: 'ruta', ruta: '/plan-entrenamiento' } });
  });
  // 8-oct-2026 (revisión en frío): /plan-entrenamiento solo mueve enfoques
  // propios. Con una semana hecha de rutinas del coach, "Mover mis días de
  // entrenar" abria un editor que no mueve ninguna de ellas.
  it('descanso en una semana que es solo del coach: no se ofrece mover dias que no son suyos', () => {
    const delCoach = [asig({ id: 'c1', day_of_week: 1, routine_id: 'rut-1', routine_name: 'Fuerza', assigned_by: COACH_ID })];
    const s = seccion(componerDia({ rutinas: lecturaOk(delCoach) }, HOY, HOY, CTX), 'entrenamiento');
    expect(s && s.estado === 'ok' ? s.nota : null).toBe('Descanso. No hay entrenamiento agendado este día.');
    expect(s && s.estado === 'ok' ? s.cta : null).toEqual({ texto: 'Agregar un entrenamiento mío', destino: { tipo: 'ruta', ruta: '/plan-entrenamiento' } });
    // Lo mismo si lo unico propio es una rutina agendada: ese editor tampoco la mueve.
    const conRutinaPropia = [...delCoach, asig({ id: 'm1', day_of_week: 2, routine_id: 'rut-2', routine_name: 'Mi rutina' })];
    const s2 = seccion(componerDia({ rutinas: lecturaOk(conRutinaPropia) }, HOY, HOY, CTX), 'entrenamiento');
    expect(s2 && s2.estado === 'ok' ? s2.cta?.texto : null).toBe('Agregar un entrenamiento mío');
    // Con un enfoque propio en la semana si hay dias que mover.
    const conEnfoque = [...delCoach, asig({ id: 'e1', day_of_week: 2, focus: 'traccion' })];
    const s3 = seccion(componerDia({ rutinas: lecturaOk(conEnfoque) }, HOY, HOY, CTX), 'entrenamiento');
    expect(s3 && s3.estado === 'ok' ? s3.cta?.texto : null).toBe('Mover mis días de entrenar');
    // Y sin nada agendado sigue siendo "armar".
    const s4 = seccion(componerDia({ rutinas: lecturaOk<AsignacionRow[]>([]) }, HOY, HOY, CTX), 'entrenamiento');
    expect(s4 && s4.estado === 'ok' ? s4.cta?.texto : null).toBe('Armar mi plan de entrenar');
  });
  it('la precedencia se resuelve POR FECHA: lo de una fecha exacta gana ese dia y solo ese dia', () => {
    const rows = [
      ...RUTINAS,
      asig({ id: 'r-fecha', schedule_type: 'specific_date', specific_date: LUNES, focus: 'full_body', created_at: '2026-10-01' }),
    ];
    const ins = { ...insumosLlenos(), rutinas: lecturaOk(rows) };
    const esteLunes = filasDe(componerDia(ins, LUNES, HOY, CTX), 'entrenamiento');
    expect(esteLunes[0].titulo).toBe('Full body');
    expect(esteLunes[0].etiqueta).toBe('Lo puedes mover');
    expect(esteLunes[0].detalle).toBe('Enfoque de tu plan. Solo este día.');
    const otroLunes = filasDe(componerDia(ins, '2026-10-12', HOY, CTX), 'entrenamiento');
    expect(otroLunes[0].titulo).toBe('Fuerza tren inferior');
    expect(otroLunes[0].etiqueta).toBe('Lo fijó Enrique');
  });
  it('una fecha exacta del coach gana sobre el enfoque semanal propio y lo deja a la vista', () => {
    const rows = [
      asig({ id: 'r-mie', day_of_week: 3, focus: 'empuje' }),
      asig({ id: 'r-coach-fecha', schedule_type: 'specific_date', specific_date: HOY, routine_id: 'rut-9', routine_name: 'Evaluación de fuerza', assigned_by: COACH_ID }),
    ];
    const filas = filasDe(componerDia({ rutinas: lecturaOk(rows), coachPorId: { [COACH_ID]: 'Ana' } }, HOY, HOY, CTX), 'entrenamiento');
    expect(filas.map((f) => [f.titulo, f.etiqueta])).toEqual([
      ['Evaluación de fuerza', 'Lo fijó Ana'],
      ['Empuje', 'Lo puedes mover'],
    ]);
    expect(filas[0].detalle).toBe('Rutina asignada. Solo este día.');
  });
  it('sin nombre legible del coach se dice "tu coach", nunca un nombre inventado', () => {
    const ins = { ...insumosLlenos(), coachPorId: {} };
    const filas = filasDe(componerDia(ins, LUNES, HOY, CTX), 'entrenamiento');
    expect(filas[0].etiqueta).toBe('Lo fijó tu coach');
  });
  it('una rutina propia agendada es suya, pero hoy no hay donde cambiarle los dias: no se promete moverla', () => {
    const rows = [asig({ id: 'r-mia', day_of_week: 3, routine_id: 'rut-2', routine_name: 'Mi rutina de casa' })];
    const filas = filasDe(componerDia({ rutinas: lecturaOk(rows) }, HOY, HOY, CTX), 'entrenamiento');
    expect(filas[0].dueno).toBeNull();
    expect(filas[0].etiqueta).toBeNull();
    expect(filas[0].detalle).toBe('Tu rutina agendada. Cada miércoles. Sus días todavía no se cambian desde la app.');
    expect(filas[0].destino).toEqual({ tipo: 'ruta', ruta: '/my-routines' });
    expect(filas[0].accion).toBe('Ver en Mis rutinas');
  });
  it('candado de esa promesa: el dia que el agendado de rutinas propias vuelva a tener pantalla, esta fila debe cambiar', () => {
    // Hoy ningun archivo de app/ ni de src/ (fuera del propio modal) monta
    // ScheduleModal. Si este test truena es buena noticia: ya hay editor, y
    // la fila de arriba puede volver a decir "Lo puedes mover".
    const usos: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== '__tests__') walk(p); continue; }
        if (!/\.tsx?$/.test(n) || p.replace(/\\/g, '/').endsWith('src/components/ScheduleModal.tsx')) continue;
        if (/<ScheduleModal\b/.test(readFileSync(p, 'utf8'))) usos.push(p);
      }
    };
    walk(resolve(process.cwd(), 'app'));
    walk(resolve(process.cwd(), 'src'));
    expect(usos).toEqual([]);
  });
  it('lo propio desplazado por el coach: un enfoque se mueve, una rutina propia no tiene editor', () => {
    const rows = [
      asig({ id: 'c', day_of_week: 3, routine_id: 'rut-1', routine_name: 'Del coach', assigned_by: COACH_ID, created_at: '2026-09-01' }),
      asig({ id: 'm', day_of_week: 3, routine_id: 'rut-2', routine_name: 'Mi rutina de casa', created_at: '2026-09-02' }),
    ];
    const filas = filasDe(componerDia({ rutinas: lecturaOk(rows) }, HOY, HOY, CTX), 'entrenamiento');
    expect(filas.map((f) => [f.titulo, f.etiqueta, f.accion])).toEqual([
      ['Del coach', 'Lo fijó tu coach', 'Abrir en Entrenar'],
      ['Mi rutina de casa', null, 'Ver en Mis rutinas'],
    ]);
  });
  it('una fila sin user_id no se adivina del coach', () => {
    const rows = [asig({ id: 'r', day_of_week: 3, routine_id: 'rut-3', routine_name: 'Rutina', assigned_by: COACH_ID, user_id: null })];
    const filas = filasDe(componerDia({ rutinas: lecturaOk(rows) }, HOY, HOY, CTX), 'entrenamiento');
    // Ni "Lo fijó ..." (no se sabe) ni "Lo puedes mover" (una rutina agendada no tiene editor).
    expect(filas[0].dueno).toBeNull();
    expect(filas[0].etiqueta).toBeNull();
  });
  it('lo que marca la evaluacion va firmado por quien la firmo y abre su seccion', () => {
    const f = filaPorId(componerDia(insumosLlenos(), HOY, HOY, CTX), 'ent:evaluacion');
    expect(f?.etiqueta).toBe('Lo fijó Enrique');
    expect(f?.detalle).toBe('3 tipos de sesión');
    expect(f?.destino).toEqual({ tipo: 'evaluacion', seccion: 'entrenamiento' });
  });
  // 8-oct-2026 (revisión en frío): la carga vuelve las rutinas del documento
  // rutinas reales, con el mismo nombre, y las agenda. Ese dia la fila de la
  // evaluacion decia por segunda vez lo que la rutina ya dice arriba.
  it('el dia que ya toca una rutina creada desde la evaluacion, su fila no se repite', () => {
    const ins = insumosLlenos();
    ins.evaluacion = lecturaOk({ entrenamiento: '3 tipos de sesión', ventana: null, alimentacion: null, rutinas: ['  fuerza TREN  inferior '] });
    const lunes = componerDia(ins, LUNES, HOY, CTX);
    expect(filasDe(lunes, 'entrenamiento')[0].titulo).toBe('Fuerza tren inferior');
    expect(filaPorId(lunes, 'ent:evaluacion')).toBeUndefined();
    // Martes (lo propio) y miercoles (descanso): ahi la fila si aporta.
    expect(filaPorId(componerDia(ins, MARTES, HOY, CTX), 'ent:evaluacion')?.detalle).toBe('3 tipos de sesión');
    expect(filaPorId(componerDia(ins, HOY, HOY, CTX), 'ent:evaluacion')?.detalle).toBe('3 tipos de sesión');
    // Una rutina del coach que NO sale de ese documento no la calla.
    ins.evaluacion = lecturaOk({ entrenamiento: '3 tipos de sesión', ventana: null, alimentacion: null, rutinas: ['Otra rutina'] });
    expect(filaPorId(componerDia(ins, LUNES, HOY, CTX), 'ent:evaluacion')?.detalle).toBe('3 tipos de sesión');
    // Y una rutina PROPIA con el mismo nombre tampoco: no la creo la carga.
    const propia = [asig({ id: 'p', day_of_week: 1, routine_id: 'rut-7', routine_name: 'Fuerza tren inferior' })];
    ins.evaluacion = lecturaOk({ entrenamiento: '3 tipos de sesión', ventana: null, alimentacion: null, rutinas: ['Fuerza tren inferior'] });
    expect(filaPorId(componerDia({ ...ins, rutinas: lecturaOk(propia) }, LUNES, HOY, CTX), 'ent:evaluacion')?.detalle).toBe('3 tipos de sesión');
  });
});

describe('suplementos: por momento, con dueno, y solo los del dia', () => {
  it('se ordenan por hora y lo que no tiene momento va al final, sin hora inventada', () => {
    const filas = filasDe(componerDia(insumosLlenos(), HOY, HOY, CTX), 'suplementos');
    expect(filas.map((f) => [f.titulo, f.cuando])).toEqual([
      ['Creatina', 'Mañana'],
      ['Omega 3', 'Noche'],
      ['Magnesio', '21:30'],
      ['Vitamina D', null],
    ]);
    expect(filas[3].detalle).toBe('Sin momento del día fijado');
  });
  it('lo del plan del coach no se mueve: se ve y se pausa donde la pausa ya existe', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    const omega = filaPorId(dia, 'sup:s1');
    expect(omega?.dueno).toBe('coach');
    expect(omega?.etiqueta).toBe('Lo fijó Enrique');
    expect(omega?.accion).toBe('Ver y pausar en Mis suplementos');
    expect(omega?.destino).toEqual({ tipo: 'ruta', ruta: '/supplements' });
    const creatina = filaPorId(dia, 'sup:s3');
    expect(creatina?.etiqueta).toBe('Lo puedes mover');
  });
  it('lun/mié/vie toca lunes y miercoles, no martes; el conteo sigue al dia', () => {
    const rows = [sup({ id: 'a', name: 'Hierro', dose_pattern: 'lun/mié/vie', timing: 'morning' }), sup({ id: 'b', name: 'Zinc', timing: 'evening' })];
    const ins: InsumosPlan = { suplementos: lecturaOk(rows) };
    const lunes = componerDia(ins, LUNES, HOY, CTX);
    const martes = componerDia(ins, MARTES, HOY, CTX);
    expect(filasDe(lunes, 'suplementos').map((f) => f.titulo)).toEqual(['Hierro', 'Zinc']);
    expect(filasDe(martes, 'suplementos').map((f) => f.titulo)).toEqual(['Zinc']);
    expect(lunes.conteo.suplementos).toBe(2);
    expect(martes.conteo.suplementos).toBe(1);
  });
  it('un dia en que no toca ninguno lo dice; no finge que no hay suplementos', () => {
    const ins: InsumosPlan = { suplementos: lecturaOk([sup({ id: 'a', name: 'Hierro', dose_pattern: 'lun/mié/vie' })]) };
    const s = seccion(componerDia(ins, MARTES, HOY, CTX), 'suplementos');
    expect(s && s.estado === 'ok' ? s.nota : null).toBe('Este día no toca ninguno de tus suplementos.');
  });
  it('el semanal sin dia fijo se muestra y no se cuenta como toma de hoy', () => {
    const ins: InsumosPlan = { suplementos: lecturaOk([sup({ id: 'a', name: 'Vitamina D', dose_pattern: 'semanal', timing: 'morning' })]) };
    const dia = componerDia(ins, HOY, HOY, CTX);
    expect(filasDe(dia, 'suplementos')[0].detalle).toBe('Una vez por semana, sin día fijo');
    expect(dia.conteo.suplementos).toBe(0);
    // 8-oct-2026 (revisión en frío): no cuenta como toma, pero SI como plan.
    expect(dia.conteo.suplementosSemanales).toBe(1);
    expect(dia.conteo.suplementosEnPlan).toBe(1);
  });
  it('eventuales, pausados y fichas sin nombre no son plan', () => {
    const rows = [
      sup({ id: 'a', name: 'Eventual', is_plan: false }),
      sup({ id: 'b', name: 'Pausado', is_active: false }),
      sup({ id: 'c', name: '  ' }),
    ];
    const dia = componerDia({ suplementos: lecturaOk(rows) }, HOY, HOY, CTX);
    expect(seccion(dia, 'suplementos')).toBeUndefined();
    expect(dia.conteo.suplementos).toBe(0);
    expect(dia.conteo.suplementosEnPlan).toBe(0);
  });
  it('momentosDeToma: horas exactas, etiquetas y momentos; lo desconocido no se vuelve 08:00', () => {
    expect(momentosDeToma({ dose_times: ['8:00', 'noche'] })).toEqual({ texto: '08:00 y Noche', orden: 480 });
    expect(momentosDeToma({ timing: 'with_food' })).toEqual({ texto: 'Con comida', orden: 840 });
    expect(momentosDeToma({ timing: 'bedtime' }).texto).toBe('Antes de dormir');
    expect(momentosDeToma({ timing: null })).toEqual({ texto: null, orden: null });
    expect(momentosDeToma({ timing: 'cuando_sea' })).toEqual({ texto: null, orden: null });
    expect(momentosDeToma({ dose_times: ['mañana', 'comida', 'noche'] }).texto).toBe('Mañana, Comida y Noche');
    expect(momentosDeToma({ dose_times: ['99:99'], timing: 'morning' })).toEqual({ texto: null, orden: null });
  });
});

describe('practicas y habitos: son de la persona y ARGOS propone', () => {
  it('se mezclan por hora, lo que no tiene hora al final, y cierra la propuesta de ARGOS', () => {
    const filas = filasDe(componerDia(insumosLlenos(), HOY, HOY, CTX), 'practicas');
    expect(filas.map((f) => f.id)).toEqual([
      'hab:meditation', 'pra:hidratacion_matutina', 'pra:exposicion_solar_matutina', 'hab:no_alcohol',
      'pra:x_sin_hora', 'hab:sunlight', 'argos:ordenar',
    ]);
  });
  it('una practica abre su ficha (hora y pausa); la hora que no puso la persona se dice sugerida', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    const agua = filaPorId(dia, 'pra:hidratacion_matutina');
    expect(agua?.etiqueta).toBe('Lo puedes mover');
    expect(agua?.destino).toEqual({ tipo: 'practica', key: 'hidratacion_matutina' });
    expect(agua?.detalle).toBe('Práctica · hora sugerida por tu horario');
    expect(filaPorId(dia, 'pra:exposicion_solar_matutina')?.detalle).toBe('Práctica');
    expect(filaPorId(dia, 'pra:x_sin_hora')?.cuando).toBeNull();
    expect(filaPorId(dia, 'pra:x_sin_hora')?.detalle).toBe('Práctica · sin hora');
  });
  it('un habito con app abre su ficha del Centro; uno sin app abre Ordenar mi dia', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    expect(filaPorId(dia, 'hab:meditation')?.destino).toEqual({ tipo: 'habito', appKey: 'meditar' });
    expect(filaPorId(dia, 'hab:no_alcohol')?.destino).toEqual({ tipo: 'ruta', ruta: '/ordenar-dia' });
    expect(filaPorId(dia, 'hab:sunlight')?.cuando).toBeNull();
    expect(filaPorId(dia, 'hab:sunlight')?.detalle).toBe('Hábito · su hora la marca el sol de cada día');
  });
  it('un habito sin editor de hora no promete moverse: sin etiqueta y lo dice', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    expect(filaPorId(dia, 'hab:meditation')?.etiqueta).toBe('Lo puedes mover');
    expect(filaPorId(dia, 'hab:meditation')?.detalle).toBe('Hábito');
    const sinAlcohol = filaPorId(dia, 'hab:no_alcohol');
    expect(sinAlcohol?.dueno).toBeNull();
    expect(sinAlcohol?.etiqueta).toBeNull();
    expect(sinAlcohol?.detalle).toBe('Hábito · su hora todavía no se cambia desde la app');
  });
  it('habitoEditaHora: solo donde la ficha del Centro pinta su editor de hora', () => {
    for (const k of ['meditation', 'breathwork', 'water', 'protein', 'sunlight', 'journal', 'sleep']) {
      expect(habitoEditaHora(k) ? 'edita' : `${k} no edita`).toBe('edita');
    }
    // Sin app: no hay ficha. Con app pero sin UN electron con hora canonica: la ficha no pinta el editor.
    for (const k of ['cold_shower', 'grounding', 'no_alcohol', 'no_processed_foods', 'screen_time_cutoff', 'red_glasses', 'steps', 'fasting_16h', 'glucose_log', 'ketones_log', 'llave_que_no_existe']) {
      expect(habitoEditaHora(k) ? `${k} edita` : 'no edita').toBe('no edita');
    }
  });
  it('la propuesta de ARGOS lleva a la que ya existe y dice que nada cambia sin aceptar', () => {
    const f = filaPorId(componerDia(insumosLlenos(), HOY, HOY, CTX), 'argos:ordenar');
    expect(f?.dueno).toBe('argos');
    expect(f?.etiqueta).toBe(ETIQUETA_ARGOS);
    expect(f?.destino).toEqual({ tipo: 'ruta', ruta: '/ordenar-dia' });
    expect(f?.detalle).toMatch('Nada cambia hasta que aceptas');
  });
  it('sin habitos leidos no hay sobre que proponer: la fila de ARGOS no se ofrece', () => {
    const ins: InsumosPlan = { practicas: lecturaOk(PRACTICAS), habitos: LECTURA_FALLIDA };
    const dia = componerDia(ins, HOY, HOY, CTX);
    expect(filaPorId(dia, 'argos:ordenar')).toBeUndefined();
    const s = seccion(dia, 'practicas');
    expect(s && s.estado === 'ok' ? s.parcial : null).toBe('No se pudieron leer tus hábitos.');
    expect(filasDe(dia, 'practicas')).toHaveLength(3);
  });
  it('todo apagado se dice y lleva a donde se arma', () => {
    const s = seccion(componerDia(insumosVacios(), HOY, HOY, CTX), 'practicas');
    expect(s && s.estado === 'ok' ? s.nota : null).toBe('No tienes prácticas ni hábitos encendidos.');
    expect(s && s.estado === 'ok' ? s.cta?.destino : null).toEqual({ tipo: 'ruta', ruta: '/packs/armar' });
  });
});

describe('habitosDePrefs: la misma lista de HOY, con la hora que se sabe', () => {
  const chrono: CronotipoIn = { wake_time: '06:00', sleep_time: '22:00', chronotype: 'lion', raw_scores: null };
  const prefs = {
    booleans: ['meditation', 'sunlight', 'cold_shower', 'llave_que_no_existe'],
    quants: ['protein', 'steps'],
    horas: horasDeHabitos({ meditation: '06:45', cold_shower: { ancla: 'despertar', offsetMin: 30 } }),
    wakeTime: null,
    sleepTime: null,
  };
  it('hora fija, regla anclada al horario, canonica, y el sol sin hora', () => {
    const filas = habitosDePrefs(prefs, {}, lecturaOk<CronotipoIn | null>(chrono));
    const por = Object.fromEntries(filas.map((f) => [f.key, f]));
    expect(por.meditation.hora).toBe('06:45');
    expect(por.cold_shower.hora).toBe('06:30');
    expect(por.journal.hora).toBe('21:30');
    expect(por.sunlight.hora).toBeNull();
    expect(por.sunlight.segunSol).toBe(true);
    expect(por.protein.appKey).toBe('comida');
    expect(por.cold_shower.appKey).toBeNull();
    expect(por.meditation.editaHora).toBe(true);
    expect(por.cold_shower.editaHora).toBe(false);
  });
  it('entran los obligatorios, salen los cuantitativos sin fuente y las llaves desconocidas', () => {
    const keys = habitosDePrefs(prefs, {}, lecturaOk<CronotipoIn | null>(chrono)).map((f) => f.key);
    for (const k of ['journal', 'no_processed_foods', 'screen_time_cutoff', 'cardio', 'checkin']) expect(keys).toContain(k);
    expect(keys).not.toContain('steps');
    expect(keys).not.toContain('llave_que_no_existe');
  });
  it('lo que esta en reposo o graduado no es parte del dia', () => {
    const keys = habitosDePrefs(prefs, { meditation: 'reposo', journal: 'graduado' }, lecturaOk<CronotipoIn | null>(chrono)).map((f) => f.key);
    expect(keys).not.toContain('meditation');
    expect(keys).not.toContain('journal');
    expect(keys).toContain('cold_shower');
  });
  it('lo que la persona dijo de su horario manda sobre el cronotipo', () => {
    const filas = habitosDePrefs({ ...prefs, wakeTime: '05:00', sleepTime: '21:00' }, {}, lecturaOk<CronotipoIn | null>(chrono));
    expect(filas.find((f) => f.key === 'cold_shower')?.hora).toBe('05:30');
  });
  it('cronotipo sin leer y sin horas propias: la regla anclada queda SIN hora, no a las 07:30', () => {
    const filas = habitosDePrefs(prefs, {}, LECTURA_FALLIDA);
    expect(filas.find((f) => f.key === 'cold_shower')?.hora).toBeNull();
    // La fija y la canonica no dependen del horario: se siguen sabiendo.
    expect(filas.find((f) => f.key === 'meditation')?.hora).toBe('06:45');
    expect(filas.find((f) => f.key === 'journal')?.hora).toBe('21:30');
  });
  it('cronotipo leido y sin fila: se usa el 07:00 a 23:00 con el que HOY compila', () => {
    const filas = habitosDePrefs(prefs, {}, lecturaOk<CronotipoIn | null>(null));
    expect(filas.find((f) => f.key === 'cold_shower')?.hora).toBe('07:30');
  });

  // ---- 8-oct-2026 (revisión en frío) ----
  it('horasDeHabitos: la hora fija y la regla pasan; lo que no es ninguna de las dos se ignora', () => {
    expect(horasDeHabitos({
      a: '06:45', b: { ancla: 'despertar', offsetMin: 30 }, c: 'nunca', d: { ancla: 'luna', offsetMin: 1 }, e: 7, f: null,
    })).toEqual({ a: '06:45', b: { ancla: 'despertar', offsetMin: 30 } });
    expect(horasDeHabitos(null)).toEqual({});
    expect(horasDeHabitos('06:45')).toEqual({});
    expect(horasDeHabitos(['06:45'])).toEqual({});
  });
  it('una entrada rota no deja al habito sin hora: manda su hora canonica', () => {
    const filas = habitosDePrefs({ ...prefs, horas: horasDeHabitos({ journal: 'a ratos' }) }, {}, lecturaOk<CronotipoIn | null>(chrono));
    expect(filas.find((f) => f.key === 'journal')?.hora).toBe('21:30');
  });
  it('una llave que vive en las dos listas sale UNA vez (ni llave repetida ni un habito de mas)', () => {
    const doble = { ...prefs, booleans: [...prefs.booleans, 'protein', 'meditation'], quants: ['protein', 'water', 'protein'] };
    const filas = habitosDePrefs(doble, {}, lecturaOk<CronotipoIn | null>(chrono));
    expect(filas.filter((f) => f.key === 'protein')).toHaveLength(1);
    expect(filas.filter((f) => f.key === 'meditation')).toHaveLength(1);
    expect(new Set(filas.map((f) => f.key)).size).toBe(filas.length);
    // Y en el dia: ids de fila unicos y la cuenta de la tarjeta sin inflar.
    const dia = componerDia({ habitos: lecturaOk(filas) }, HOY, HOY, CTX);
    const ids = filasDe(dia, 'practicas').map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(dia.conteo.habitos).toBe(filas.length);
    // La misma lista sin los repetidos da exactamente lo mismo.
    const limpia = { ...prefs, booleans: [...prefs.booleans, 'protein'], quants: ['water'] };
    expect(habitosDePrefs(limpia, {}, lecturaOk<CronotipoIn | null>(chrono)).map((f) => f.key).sort()).toEqual(filas.map((f) => f.key).sort());
  });
  it('el registro del ciclo solo se lista si pasa la compuerta de HOY; sin sexo conocido NO se asume', () => {
    const conCiclo = { ...prefs, booleans: [...prefs.booleans, 'period_log'] };
    const keys = (g?: GateHabitos) => habitosDePrefs(conCiclo, {}, lecturaOk<CronotipoIn | null>(chrono), g).map((f) => f.key);
    expect(keys()).not.toContain('period_log');
    expect(keys(GATE_DESCONOCIDO)).not.toContain('period_log');
    expect(keys({ sexoBiologico: null, modoCiclo: 'propio' })).not.toContain('period_log');
    expect(keys({ sexoBiologico: 'male', modoCiclo: null })).not.toContain('period_log');
    expect(keys({ sexoBiologico: 'female', modoCiclo: null })).toContain('period_log');
    // En modo acompanante el calendario es de otra persona: tampoco.
    expect(keys({ sexoBiologico: 'female', modoCiclo: 'acompanante' })).not.toContain('period_log');
    // Lo demas no se mueve con la compuerta.
    expect(keys({ sexoBiologico: 'male', modoCiclo: null })).toContain('meditation');
    // El servicio solo lee la compuerta cuando hay un habito que la necesita.
    expect(necesitaGate(conCiclo)).toBe(true);
    expect(necesitaGate(prefs)).toBe(false);
  });
  it('candado: la compuerta es LA de HOY (si day-compiler cambia su regla, esta se revisa)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/services/day-compiler.ts'), 'utf8');
    expect(src).toMatch("!FEMALE_ONLY_ELECTRONS.has(k) || biologicalSex === 'female'");
    expect(src).toMatch("k !== 'period_log' || cycleMode !== 'acompanante'");
    expect(src).toMatch("from('client_profiles').select('biological_sex')");
    expect(src).toMatch(".eq('app_key', 'ciclo')");
    const servicio = readFileSync(resolve(process.cwd(), 'src/services/plan/mi-plan-service.ts'), 'utf8');
    expect(servicio).toMatch("from('client_profiles').select('biological_sex')");
    expect(servicio).toMatch(".eq('app_key', 'ciclo')");
  });
  it('estados de habito sin leer: la parte es un FALLO, no "todos activos"', () => {
    const ok = lecturaOk<CronotipoIn | null>(chrono);
    expect(habitosDeLecturas(lecturaOk(prefs), null, ok)).toEqual({ ok: false });
    expect(habitosDeLecturas(LECTURA_FALLIDA, [], ok)).toEqual({ ok: false });
    // Leidos (aunque vengan vacios) si arman la lista, y respetan el reposo.
    const r = habitosDeLecturas(lecturaOk(prefs), [{ habit_key: 'meditation', state: 'reposo' }], ok);
    expect(r.ok).toBe(true);
    expect(r.ok ? r.dato.map((f) => f.key) : []).not.toContain('meditation');
    expect(habitosDeLecturas(lecturaOk(prefs), [], ok).ok).toBe(true);
    // En el dia: la seccion lo dice con Reintentar y la tarjeta no cuenta habitos.
    const caida = habitosDeLecturas(lecturaOk(prefs), null, ok);
    const conPracticas = componerDia({ practicas: lecturaOk(PRACTICAS), habitos: caida }, HOY, HOY, CTX);
    const s = seccion(conPracticas, 'practicas');
    expect(s && s.estado === 'ok' ? s.parcial : null).toBe('No se pudieron leer tus hábitos.');
    expect(conPracticas.conteo.habitos).toBeNull();
    expect(resumenDelDia(conPracticas)).toEqual({ tipo: 'linea', texto: 'Hoy: 3 prácticas', incompleta: true });
    const sola = componerDia({ habitos: caida }, HOY, HOY, CTX);
    expect(seccion(sola, 'practicas')).toEqual({ key: 'practicas', titulo: 'PRÁCTICAS Y HÁBITOS', estado: 'error' });
    expect(resumenDelDia(sola)).toEqual({ tipo: 'error' });
  });
  it('candado: el servicio ya no trata los estados sin leer como "todos activos"', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/services/plan/mi-plan-service.ts'), 'utf8');
    expect(src).toMatch('return habitosDeLecturas(lecturaOk(entrada), estados, c, gate);');
    expect(src.includes('estadosPorKey(')).toBe(false);
  });
  it('candado: fuera del servicio, ningun archivo de Mi plan nombra la columna cruda de las horas', () => {
    // El mismo criterio del ratchet de mb27-contratos (que este runner no puede
    // correr): buscar el nombre de la columna en el fuente.
    const columna = ['habit', 'times'].join('_');
    const fuera = [
      'src/services/plan/mi-plan-core.ts', 'src/screens/plan/MiPlanScreen.tsx', 'src/components/hoy/MiPlanCard.tsx',
      'app/mi-plan.tsx',
    ];
    for (const f of fuera) {
      expect(readFileSync(resolve(process.cwd(), f), 'utf8').includes(columna) ? `${f} nombra ${columna}` : 'ok').toBe('ok');
    }
    const servicio = readFileSync(resolve(process.cwd(), 'src/services/plan/mi-plan-service.ts'), 'utf8');
    expect(servicio).toMatch(`horasDeHabitos(p.dato.goals.${columna})`);
    const candado = readFileSync(resolve(process.cwd(), 'src/services/__tests__/mb27-contratos.test.ts'), 'utf8');
    expect(candado).toMatch("'src/services/plan/mi-plan-service.ts',");
    expect(candado.includes("'src/services/plan/mi-plan-core.ts'")).toBe(false);
  });
});

describe('practicasDeFilas: solo las encendidas, con la hora de la agenda', () => {
  function fila(p: Partial<UserInterventionRow> & { id: string; intervention_key: string }): UserInterventionRow {
    return {
      user_id: USER, status: 'active', priority: 1, source_dx_id: null, is_custom: false, is_universal: true,
      custom_definition: null, custom_time: null, computed_time: null, custom_notes: null, custom_dose: null,
      activated_at: null, created_at: '2026-09-01', updated_at: '2026-09-01', ...p,
    };
  }
  const rows = [
    fila({ id: '1', intervention_key: 'exposicion_solar_matutina', custom_time: '8:15' }),
    fila({ id: '2', intervention_key: 'hidratacion_matutina' }),
    fila({ id: '3', intervention_key: 'hidratacion_matutina', status: 'paused' }),
    fila({ id: '4', intervention_key: 'llave_que_no_existe' }),
  ];
  const oso: CronotipoIn = { wake_time: '07:00', sleep_time: '23:00', chronotype: 'bear', raw_scores: null };
  it('la hora que puso la persona manda; lo demas sale de su horario', () => {
    const out = practicasDeFilas(rows, lecturaOk<CronotipoIn | null>(oso));
    expect(out.map((p) => p.key)).toEqual(['exposicion_solar_matutina', 'hidratacion_matutina']);
    expect(out[0]).toMatchObject({ hora: '08:15', horaTuya: true });
    // Hidratacion va a despertar + 15 (regla de la agenda).
    expect(out[1]).toMatchObject({ hora: '07:15', horaTuya: false });
  });
  it('sin cronotipo leido solo se pinta la hora que ella puso', () => {
    const out = practicasDeFilas(rows, LECTURA_FALLIDA);
    expect(out[0].hora).toBe('08:15');
    expect(out[1].hora).toBeNull();
  });
});

describe('alimentacion: el plan, las metas que si se fijaron y lo que marca la evaluacion', () => {
  it('el plan del coach va firmado; sus comidas llevan hora o momento, nunca una hora de relleno', () => {
    const filas = filasDe(componerDia(insumosLlenos(), HOY, HOY, CTX), 'alimentacion');
    expect(filas[0]).toMatchObject({ titulo: 'Plan de recomposición', detalle: '2200 kcal · 150 g de proteína', etiqueta: 'Lo fijó Enrique' });
    expect(filas[1]).toMatchObject({ titulo: 'Huevos con verdura', cuando: '08:00', detalle: 'Desayuno · 3 huevos, espinaca' });
    expect(filas[2]).toMatchObject({ titulo: 'Pescado y ensalada', cuando: 'Cena', detalle: null });
    expect(filas[2].etiqueta).toBe('Lo fijó Enrique');
  });
  it('la meta propia no se repite si el plan asignado ya fija ese numero; la que no fija, si', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    expect(filaPorId(dia, 'ali:meta:proteina')).toBeUndefined();
    const agua = filaPorId(dia, 'ali:meta:agua');
    expect(agua).toMatchObject({ detalle: '2500 ml al día', etiqueta: 'Lo puedes mover' });
    expect(agua?.destino).toEqual({ tipo: 'habito', appKey: 'hidratacion' });
  });
  // 8-oct-2026 (revisión en frío): este test clavaba 'Lo puedes mover' en el
  // plan propio. Era una promesa sin puerta: la fila abre Nutricion, que para
  // el cliente solo MUESTRA el plan. Ahora es suyo, se dice, y no se promete.
  it('un plan que armo la propia persona es suyo, pero sin editor no se promete moverlo', () => {
    const ins = { ...insumosLlenos(), planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, propio: true, coachNombre: null }) };
    const dia = componerDia(ins, HOY, HOY, CTX);
    const plan = filaPorId(dia, 'ali:plan');
    expect(plan?.dueno).toBeNull();
    expect(plan?.etiqueta).toBeNull();
    expect(plan?.detalle).toBe('Tu plan. 2200 kcal · 150 g de proteína. Todavía no se edita desde la app.');
    expect(plan?.destino).toEqual({ tipo: 'ruta', ruta: '/nutrition' });
    expect(plan?.accion).toBe('Ver en Nutrición');
    // Sus comidas tampoco llevan etiqueta, y nadie firma lo que es suyo.
    expect(filaPorId(dia, 'ali:comida:0')?.etiqueta).toBeNull();
    expect(filaPorId(dia, 'ali:comida:1')?.etiqueta).toBeNull();
    // Y su meta de proteina vuelve a verse: nadie mas la fijo.
    expect(filaPorId(dia, 'ali:meta:proteina')?.detalle).toBe('140 g al día');
    // Sin metas en el plan, la frase tal cual.
    const sinMetas = { ...ins, planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, propio: true, coachNombre: null, metas: [] }) };
    expect(filaPorId(componerDia(sinMetas, HOY, HOY, CTX), 'ali:plan')?.detalle).toBe('Tu plan. Todavía no se edita desde la app.');
    // Un plan propio no pone a nadie en la lista de coaches del dia.
    const soloPlan = componerDia({ planAlimentacion: ins.planAlimentacion }, HOY, HOY, CTX);
    expect(soloPlan.coaches).toEqual([]);
  });
  it('una meta que la persona no fijo no se pinta: ni cero ni el default de la app', () => {
    const ins: InsumosPlan = { planAlimentacion: lecturaOk<PlanAlimentacionIn | null>(null), metas: lecturaOk({ proteina_g: null, agua_ml: null }) };
    const dia = componerDia(ins, HOY, HOY, CTX);
    expect(seccion(dia, 'alimentacion')).toBeUndefined();
    expect(metasDeGoals({ protein_goal_g: 0, water_goal_ml: '' })).toEqual({ proteina_g: null, agua_ml: null });
    expect(metasDeGoals(null)).toEqual({ proteina_g: null, agua_ml: null });
    expect(metasDeGoals({ protein_goal_g: '160', water_goal_ml: 3000 })).toEqual({ proteina_g: 160, agua_ml: 3000 });
  });
  it('la ventana y el que priorizar salen de la evaluacion, firmados, y abren su seccion', () => {
    const dia = componerDia(insumosLlenos(), HOY, HOY, CTX);
    expect(filaPorId(dia, 'ali:ventana')).toMatchObject({ cuando: '12:00 a 20:00', etiqueta: 'Lo fijó Enrique' });
    expect(filaPorId(dia, 'ali:evaluacion')?.destino).toEqual({ tipo: 'evaluacion', seccion: 'alimentacion' });
  });
  it('plan sin leer y metas leidas: se pinta lo leido y se dice lo que falta', () => {
    const ins: InsumosPlan = { planAlimentacion: LECTURA_FALLIDA, metas: lecturaOk({ proteina_g: 140, agua_ml: null }) };
    const s = seccion(componerDia(ins, HOY, HOY, CTX), 'alimentacion');
    expect(s?.estado).toBe('ok');
    expect(s && s.estado === 'ok' ? s.parcial : null).toBe('No se pudo leer tu plan de alimentación.');
    expect(s && s.estado === 'ok' ? s.filas.map((f) => f.id) : null).toEqual(['ali:meta:proteina']);
  });
});

describe('sueno: la ventana que se sabe, con la puerta que de verdad existe', () => {
  const chrono: CronotipoIn = { wake_time: '07:00:00', sleep_time: '23:00:00', chronotype: 'bear', raw_scores: null };
  // 8-oct-2026 (revisión en frío): este test clavaba 'Lo puedes mover' en las
  // horas del cronotipo. A donde lleva la fila no se mueve ninguna hora: solo
  // se puede repetir el test. Se dice de donde sale y como cambia, sin etiqueta.
  it('del cronotipo: se dice de donde sale y como cambia, sin prometer moverlo', () => {
    const v = ventanaDeSueno(lecturaOk({}), lecturaOk<CronotipoIn | null>(chrono));
    expect(v).toEqual(lecturaOk({ despertar: { hora: '07:00', origen: 'cronotipo' }, dormir: { hora: '23:00', origen: 'cronotipo' } }));
    const filas = filasDe(componerDia({ sueno: v }, HOY, HOY, CTX), 'sueno');
    expect(filas.map((f) => [f.titulo, f.cuando, f.dueno, f.etiqueta])).toEqual([
      ['Dormir', '23:00', null, null],
      ['Despertar', '07:00', null, null],
    ]);
    expect(filas[0].detalle).toBe('Sale de tu test de cronotipo. No se edita a mano: cambia si repites el test.');
    expect(filas[0].accion).toBe('Ver mi cronotipo');
    expect(filas[0].destino).toEqual({ tipo: 'ruta', ruta: '/tests/resultado/cronotipo' });
  });
  it('ninguna fila de sueno lleva etiqueta: hoy ninguna de sus dos puertas edita la hora', () => {
    const mixta = ventanaDeSueno(lecturaOk({ wake_time: '05:30' }), lecturaOk<CronotipoIn | null>(chrono));
    const filas = filasDe(componerDia({ sueno: mixta }, HOY, HOY, CTX), 'sueno');
    expect(filas).toHaveLength(2);
    expect(filas.map((f) => f.etiqueta)).toEqual([null, null]);
  });
  it('lo que la persona dijo manda sobre el cronotipo, y como hoy no hay editor NO se promete moverlo', () => {
    const v = ventanaDeSueno(lecturaOk({ wake_time: '05:30', sleep_time: '21:30' }), lecturaOk<CronotipoIn | null>(chrono));
    const filas = filasDe(componerDia({ sueno: v }, HOY, HOY, CTX), 'sueno');
    expect(filas.map((f) => f.cuando)).toEqual(['21:30', '05:30']);
    expect(filas.map((f) => f.etiqueta)).toEqual([null, null]);
    expect(filas[0].detalle).toMatch('Todavía no se edita desde la app');
  });
  it('con sus dos horas dichas el cronotipo ni se necesita', () => {
    expect(ventanaDeSueno(lecturaOk({ wake_time: '05:30', sleep_time: '21:30' }), LECTURA_FALLIDA).ok).toBe(true);
  });
  it('preferencias sin leer: no se sirve el cronotipo como si mandara', () => {
    expect(ventanaDeSueno(LECTURA_FALLIDA, lecturaOk<CronotipoIn | null>(chrono))).toEqual({ ok: false });
  });
  it('falta una hora y el cronotipo no se pudo leer: no se sabe', () => {
    expect(ventanaDeSueno(lecturaOk({ wake_time: '05:30' }), LECTURA_FALLIDA)).toEqual({ ok: false });
  });
  it('todo leido y sin ventana: se dice que falta, no se cae a 07:00 a 23:00', () => {
    const v = ventanaDeSueno(lecturaOk({}), lecturaOk<CronotipoIn | null>(null));
    expect(v).toEqual(lecturaOk(null));
    const s = seccion(componerDia({ sueno: v }, HOY, HOY, CTX), 'sueno');
    expect(s && s.estado === 'ok' ? s.filas : null).toEqual([]);
    expect(s && s.estado === 'ok' ? s.nota : null).toBe('Todavía no hay una ventana de sueño. Sale de tu test de cronotipo.');
    expect(s && s.estado === 'ok' ? s.cta?.destino : null).toEqual({ tipo: 'ruta', ruta: '/tests/resultado/cronotipo' });
  });
  it('una hora rota en la base no es una hora', () => {
    expect(horaLimpia('25:00')).toBeNull();
    expect(horaLimpia('7:5')).toBeNull();
    expect(horaLimpia(700)).toBeNull();
    expect(horaLimpia('7:05')).toBe('07:05');
    expect(horaLimpia('23:59:59')).toBe('23:59');
  });
});

describe('lecturas independientes: una que falla no borra las demas', () => {
  it('suplementos sin leer: su seccion lo dice y el resto del dia sigue completo', () => {
    const ins = { ...insumosLlenos(), suplementos: LECTURA_FALLIDA };
    const dia = componerDia(ins, LUNES, HOY, CTX);
    expect(seccion(dia, 'suplementos')).toEqual({ key: 'suplementos', titulo: 'SUPLEMENTOS', estado: 'error' });
    for (const k of ['entrenamiento', 'alimentacion', 'practicas', 'sueno'] as const) expect(seccion(dia, k)?.estado).toBe('ok');
    expect(dia.conteo.suplementos).toBeNull();
  });
  it('cada seccion cae sola', () => {
    const fallos: Array<[SeccionKey, Partial<InsumosPlan>]> = [
      ['entrenamiento', { rutinas: LECTURA_FALLIDA }],
      ['alimentacion', { planAlimentacion: LECTURA_FALLIDA, metas: LECTURA_FALLIDA }],
      ['suplementos', { suplementos: LECTURA_FALLIDA }],
      ['practicas', { practicas: LECTURA_FALLIDA, habitos: LECTURA_FALLIDA }],
      ['sueno', { sueno: LECTURA_FALLIDA }],
    ];
    for (const [key, parche] of fallos) {
      const dia = componerDia({ ...insumosLlenos(), ...parche }, LUNES, HOY, CTX);
      expect(dia.secciones.filter((s) => s.estado === 'error').map((s) => s.key)).toEqual([key]);
      expect(dia.secciones).toHaveLength(5);
    }
  });
  it('las secciones salen siempre en el orden de la pantalla', () => {
    expect(componerDia(insumosLlenos(), LUNES, HOY, CTX).secciones.map((s) => s.key)).toEqual([...ORDEN_SECCIONES]);
    expect([...ORDEN_SECCIONES]).toEqual(['entrenamiento', 'alimentacion', 'suplementos', 'practicas', 'sueno']);
  });
  it('lo que no se pidio no pinta seccion (la tarjeta de HOY pide menos)', () => {
    const dia = componerDia({ rutinas: lecturaOk(RUTINAS) }, LUNES, HOY, CTX);
    expect(dia.secciones.map((s) => s.key)).toEqual(['entrenamiento']);
    expect(dia.conteo.suplementos).toBeUndefined();
  });
  it('Reintentar relee solo las partes de esa seccion, y entre todas cubren todo menos la evaluacion', () => {
    const cubiertas = ORDEN_SECCIONES.flatMap((k) => PARTES_DE_SECCION[k]);
    expect([...cubiertas].sort()).toEqual([...PARTES_TODAS].filter((p) => p !== 'evaluacion').sort());
    for (const p of PARTES_RESUMEN) expect(PARTES_TODAS).toContain(p);
  });
  it('fusionar: un fallo no borra lo ya visto; una lectura buena siempre gana', () => {
    const prev = insumosLlenos();
    const tras = fusionarInsumos(prev, { suplementos: LECTURA_FALLIDA, rutinas: lecturaOk<AsignacionRow[]>([]), coachPorId: { otro: 'Ana' } });
    expect(tras.suplementos).toBe(prev.suplementos);
    expect(tras.rutinas).toEqual(lecturaOk([]));
    expect(tras.practicas).toBe(prev.practicas);
    expect(tras.coachPorId).toEqual({ [COACH_ID]: 'Enrique', otro: 'Ana' });
    // Sin nada visto antes, el fallo se queda como fallo.
    expect(fusionarInsumos({}, { suplementos: LECTURA_FALLIDA }).suplementos).toEqual({ ok: false });
    // 8-oct-2026 (segunda revisión en frío): una lectura vieja no pinta encima de una mas nueva.
    const completa: InsumosPlan = { suplementos: lecturaOk<SuplementoPlanRow[]>([]), rutinas: lecturaOk<AsignacionRow[]>([]), coachPorId: { a: 'Ana' } };
    // Turno 1 pidio todo; el turno 2 volvio a pedir solo suplementos.
    const ultimo = { suplementos: 2, rutinas: 1 };
    const vieja = partesVigentes(completa, ultimo, 1);
    expect(vieja.suplementos).toBeUndefined();
    expect(vieja.rutinas).toEqual({ ok: true, dato: [] });
    expect(vieja.coachPorId).toEqual({ a: 'Ana' });
    const nueva = partesVigentes({ suplementos: LECTURA_FALLIDA }, ultimo, 2);
    expect(nueva.suplementos).toEqual({ ok: false });
    // No muta la lectura que recibe.
    expect(completa.suplementos).toBeDefined();
  });
  it('la evaluacion sin leer solo se avisa a quien puede tenerla', () => {
    const ins = { ...insumosLlenos(), evaluacion: LECTURA_FALLIDA };
    expect(componerDia(ins, HOY, HOY, { ...CTX, evaluacionEsperada: true }).avisoEvaluacion).toBe('lectura');
    expect(componerDia(ins, HOY, HOY, { ...CTX, evaluacionEsperada: false }).avisoEvaluacion).toBeNull();
    expect(componerDia(ins, HOY, HOY, CTX).avisoEvaluacion).toBeNull();
    expect(componerDia(insumosLlenos(), HOY, HOY, { ...CTX, evaluacionEsperada: true }).avisoEvaluacion).toBeNull();
    // Y las secciones siguen con lo que si se leyo.
    expect(filaPorId(componerDia(ins, HOY, HOY, CTX), 'ent:evaluacion')).toBeUndefined();
    expect(seccion(componerDia(ins, LUNES, HOY, CTX), 'entrenamiento')?.estado).toBe('ok');
  });
  // 8-oct-2026 (revisión en frío): antes 'formato' caia en el mismo aviso que
  // un fallo de red, con un Reintentar que nunca podia funcionar.
  it('una evaluacion que esta version no entiende: se dice eso, sin Reintentar', () => {
    const ins = { ...insumosLlenos(), evaluacion: LECTURA_ILEGIBLE };
    // La fila existe: se avisa aunque el nivel no diga que se esperaba.
    expect(componerDia(ins, HOY, HOY, CTX).avisoEvaluacion).toBe('formato');
    expect(componerDia(ins, HOY, HOY, { ...CTX, evaluacionEsperada: true }).avisoEvaluacion).toBe('formato');
    // 8-oct-2026 (nivel 2): con la voz de Elite, el texto de siempre.
    expect(avisoDeEvaluacion('formato', VOZ_ELITE)).toEqual({
      texto: 'Esta versión de la app no puede leer tu evaluación. Lo demás de tu plan sí está aquí.',
      reintentar: false,
    });
    expect(avisoDeEvaluacion('lectura', VOZ_ELITE)).toEqual({
      texto: 'No se pudo leer lo que marca tu evaluación. Lo demás de tu plan sí está aquí.',
      reintentar: true,
    });
    // Lo demas del dia sigue en pie.
    expect(componerDia(ins, LUNES, HOY, CTX).secciones).toHaveLength(5);
    expect(filaPorId(componerDia(ins, HOY, HOY, CTX), 'ent:evaluacion')).toBeUndefined();
    // Entre dos fallos gana el ultimo: el aviso dice lo que paso la ultima vez.
    expect(fusionarInsumos({ evaluacion: LECTURA_ILEGIBLE }, { evaluacion: LECTURA_FALLIDA }).evaluacion).toEqual({ ok: false });
    expect(fusionarInsumos({ evaluacion: LECTURA_FALLIDA }, { evaluacion: LECTURA_ILEGIBLE }).evaluacion).toEqual({ ok: false, motivo: 'formato' });
  });
  it('candado: el servicio separa "formato" de un fallo de red', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/services/plan/mi-plan-service.ts'), 'utf8');
    expect(src).toMatch("if (!r.ok) return r.motivo === 'formato' ? LECTURA_ILEGIBLE : LECTURA_FALLIDA;");
  });
});

// 8-oct-2026 (revisión en frío). leerMiPlan esperaba a TODAS sus lecturas sin
// limite: una sola consulta colgada dejaba en blanco la pantalla y la tarjeta
// aunque las demas ya hubieran llegado.
describe('topes de lectura: una parte colgada no se lleva a las demas', () => {
  function relojDePrueba() {
    const vivos = new Map<number, () => void>();
    const pedidos: number[] = [];
    let n = 0;
    const reloj: Reloj = {
      poner: (fn, ms) => { n += 1; vivos.set(n, fn); pedidos.push(ms); return n; },
      quitar: (id) => { vivos.delete(id as number); },
    };
    return { reloj, pedidos, vivos: () => vivos.size, vencer: () => { for (const fn of [...vivos.values()]) fn(); } };
  }
  const unTick = () => new Promise<void>((r) => setTimeout(r, 0));
  function colgada<T>(): Promise<T> {
    return new Promise<T>(() => { /* nunca llega */ });
  }

  it('conTope: lo que llega a tiempo se entrega y suelta su reloj', async () => {
    const r = relojDePrueba();
    expect(await conTope(Promise.resolve('dato'), 8000, 'tope', r.reloj)).toBe('dato');
    expect(r.vivos()).toBe(0);
    expect(r.pedidos).toEqual([8000]);
  });
  it('conTope: una lectura colgada entrega el respaldo al vencer', async () => {
    const r = relojDePrueba();
    const p = conTope(colgada<string>(), 8000, 'tope', r.reloj);
    await unTick();
    expect(r.vivos()).toBe(1);
    r.vencer();
    expect(await p).toBe('tope');
    expect(r.vivos()).toBe(0);
  });
  it('conTope: nunca rechaza; una lectura que lanza tambien entrega el respaldo', async () => {
    const r = relojDePrueba();
    expect(await conTope(Promise.reject<string>(new Error('red')), 8000, 'tope', r.reloj)).toBe('tope');
    expect(r.vivos()).toBe(0);
  });
  it('conTope: lo que llega despues del tope se descarta', async () => {
    const r = relojDePrueba();
    let soltar: (v: string) => void = () => {};
    const tarde = new Promise<string>((res) => { soltar = res; });
    const p = conTope(tarde, 8000, 'tope', r.reloj);
    r.vencer();
    soltar('tarde');
    expect(await p).toBe('tope');
  });
  it('conTope: con el reloj de verdad tambien vence', async () => {
    expect(await conTope(colgada<string>(), 15, 'tope')).toBe('tope');
  });
  it('juntarLecturas: la parte colgada queda como "no se pudo leer" y las demas llegan', async () => {
    const r = relojDePrueba();
    const p = juntarLecturas([
      { partes: ['suplementos'], lectura: colgada<InsumosPlan>() },
      { partes: ['rutinas'], lectura: Promise.resolve({ rutinas: lecturaOk(RUTINAS), coachPorId: { [COACH_ID]: 'Enrique' } }) },
      { partes: ['practicas'], lectura: Promise.resolve({ practicas: lecturaOk(PRACTICAS) }) },
      { partes: ['habitos'], lectura: Promise.resolve({ habitos: lecturaOk(HABITOS) }) },
    ], TOPE_PARTE_MS, r.reloj);
    await unTick();
    // Solo queda vivo el reloj de la colgada.
    expect(r.vivos()).toBe(1);
    r.vencer();
    const ins = await p;
    expect(ins.suplementos).toEqual({ ok: false });
    expect(ins.rutinas).toEqual(lecturaOk(RUTINAS));
    expect(ins.coachPorId).toEqual({ [COACH_ID]: 'Enrique' });
    expect(ins.practicas).toEqual(lecturaOk(PRACTICAS));
    // Una parte que nadie pidio sigue sin venir: no se inventa un fallo.
    expect(ins.sueno).toBeUndefined();
    // En pantalla: SU seccion dice que no se pudo leer; el resto del dia esta.
    const dia = componerDia(ins, LUNES, HOY, CTX);
    expect(seccion(dia, 'suplementos')?.estado).toBe('error');
    expect(seccion(dia, 'entrenamiento')?.estado).toBe('ok');
    expect(resumenDelDia(dia)).toEqual({
      tipo: 'linea', texto: 'Hoy: Fuerza tren inferior · 3 prácticas · 3 hábitos', incompleta: true,
    });
    expect(r.pedidos.every((ms) => ms === TOPE_PARTE_MS)).toBe(true);
  });
  it('juntarLecturas: una tarea que lanza, o que llega sin su parte, deja ESA parte como fallo', async () => {
    const r = relojDePrueba();
    const ins = await juntarLecturas([
      { partes: ['metas'], lectura: Promise.reject<InsumosPlan>(new Error('lanzo')) },
      { partes: ['sueno'], lectura: Promise.resolve({}) },
      { partes: ['habitos'], lectura: Promise.resolve({ habitos: lecturaOk(HABITOS) }) },
    ], TOPE_PARTE_MS, r.reloj);
    expect(ins.metas).toEqual({ ok: false });
    expect(ins.sueno).toEqual({ ok: false });
    expect(ins.habitos).toEqual(lecturaOk(HABITOS));
    expect(r.vivos()).toBe(0);
  });
  it('juntarLecturas: todo colgado no deja a nadie esperando, y no se afirma "sin plan"', async () => {
    const r = relojDePrueba();
    const p = juntarLecturas(PARTES_RESUMEN.map((parte) => ({ partes: [parte], lectura: colgada<InsumosPlan>() })), TOPE_PARTE_MS, r.reloj);
    await unTick();
    r.vencer();
    const ins = await p;
    for (const parte of PARTES_RESUMEN) expect(ins[parte]).toEqual({ ok: false });
    expect(tarjetaMiPlan(resumenDelDia(componerDia(ins, HOY, HOY, CTX))).linea).toBe('No pudimos leer tu plan');
  });
  it('los topes: 8 s por parte, por debajo de los 10 s de la pantalla; las compartidas, mas cortas', () => {
    expect(TOPE_PARTE_MS).toBe(8000);
    expect(TOPE_PARTE_MS).toBeLessThan(TOPE_HERO_ELITE_MS);
    expect(TOPE_COMPARTIDA_MS).toBeLessThan(TOPE_PARTE_MS);
  });
  it('candado: el servicio lee por juntarLecturas y ya no espera a todas sin limite', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/services/plan/mi-plan-service.ts'), 'utf8');
    expect(src).toMatch('return juntarLecturas(tareas);');
    expect(src.includes('await Promise.allSettled(')).toBe(false);
    expect(src).toMatch('conTope<Lectura<PrefsDia>>(leerPrefs(userId), TOPE_COMPARTIDA_MS, LECTURA_FALLIDA)');
  });
});

describe('la linea de la tarjeta: solo lo que existe', () => {
  const linea = (ins: InsumosPlan, fecha = HOY) => resumenDelDia(componerDia(ins, fecha, HOY, CTX));
  it('lunes con de todo', () => {
    expect(linea(insumosLlenos(), LUNES)).toEqual({
      tipo: 'linea',
      texto: 'Hoy: Fuerza tren inferior · plan de alimentación · 4 suplementos · 3 prácticas · 3 hábitos',
      incompleta: false,
    });
  });
  it('un dia sin entrenamiento, con plan en la semana, dice descanso', () => {
    const r = linea(insumosLlenos());
    expect(r.tipo === 'linea' ? r.texto : '').toBe('Hoy: Descanso de entrenar · plan de alimentación · 4 suplementos · 3 prácticas · 3 hábitos');
  });
  it('singular y plural', () => {
    const uno: InsumosPlan = {
      suplementos: lecturaOk([SUPLEMENTOS[0]]),
      practicas: lecturaOk([PRACTICAS[0]]),
      habitos: lecturaOk([HABITOS[0]]),
    };
    expect(linea(uno)).toEqual({ tipo: 'linea', texto: 'Hoy: 1 suplemento · 1 práctica · 1 hábito', incompleta: false });
    const dos: InsumosPlan = {
      suplementos: lecturaOk(SUPLEMENTOS.slice(0, 2)),
      practicas: lecturaOk(PRACTICAS.slice(0, 2)),
      habitos: lecturaOk(HABITOS.slice(0, 2)),
    };
    expect(linea(dos)).toEqual({ tipo: 'linea', texto: 'Hoy: 2 suplementos · 2 prácticas · 2 hábitos', incompleta: false });
  });
  it('un cero no se escribe', () => {
    const ins = { ...insumosVacios(), habitos: lecturaOk(HABITOS) };
    const r = linea(ins);
    expect(r).toEqual({ tipo: 'linea', texto: 'Hoy: 3 hábitos', incompleta: false });
    expect(r.tipo === 'linea' ? r.texto : '').not.toMatch(/\b0\b/);
  });
  it('lo que no se pudo leer no es cero: se omite y la linea queda marcada incompleta', () => {
    const ins = { ...insumosLlenos(), suplementos: LECTURA_FALLIDA, rutinas: LECTURA_FALLIDA };
    const r = linea(ins, LUNES);
    expect(r).toEqual({ tipo: 'linea', texto: 'Hoy: Plan de alimentación · 3 prácticas · 3 hábitos', incompleta: true });
  });
  it('cada parte caida, sola, deja la linea incompleta y sin su palabra', () => {
    const casos: Array<[Partial<InsumosPlan>, RegExp]> = [
      [{ suplementos: LECTURA_FALLIDA }, /suplemento/],
      [{ practicas: LECTURA_FALLIDA }, /práctica/],
      [{ habitos: LECTURA_FALLIDA }, /hábito/],
      [{ planAlimentacion: LECTURA_FALLIDA }, /alimentación/],
      [{ rutinas: LECTURA_FALLIDA }, /Fuerza|descanso/i],
    ];
    for (const [parche, palabra] of casos) {
      const r = linea({ ...insumosLlenos(), ...parche }, LUNES);
      expect(r.tipo).toBe('linea');
      if (r.tipo !== 'linea') continue;
      expect(r.incompleta).toBe(true);
      expect(palabra.test(r.texto) ? `la linea nombra lo que no se leyo: ${r.texto}` : 'ok').toBe('ok');
    }
  });
  it('un dia con nada, TODO leido: sin plan', () => {
    expect(linea(insumosVacios())).toEqual({ tipo: 'sin_plan' });
  });
  // 8-oct-2026 (revisión en frío): quien solo tenia un suplemento semanal lo
  // veia en /mi-plan y la tarjeta le decia "Todavía no tienes un plan armado".
  it('con un suplemento en el plan, del patron que sea, nunca es "sin plan"', () => {
    const semanal = { ...insumosVacios(), suplementos: lecturaOk([sup({ id: 'a', name: 'Vitamina D', dose_pattern: 'semanal' })]) };
    expect(linea(semanal)).toEqual({ tipo: 'linea', texto: 'Hoy: 1 suplemento semanal', incompleta: false });
    expect(tarjetaMiPlan(linea(semanal)).cta).toEqual({ texto: 'VER MI PLAN', destino: { tipo: 'ruta', ruta: '/mi-plan' } });
    const dosSemanales = { ...insumosVacios(), suplementos: lecturaOk([sup({ id: 'a', dose_pattern: 'semanal' }), sup({ id: 'b', dose_pattern: 'semanal' })]) };
    expect(linea(dosSemanales)).toEqual({ tipo: 'linea', texto: 'Hoy: 2 suplementos semanales', incompleta: false });
    // Un plan de lun/mié/vie mirado en martes: hoy no toca, pero plan hay.
    const alternos = { ...insumosVacios(), suplementos: lecturaOk([sup({ id: 'a', name: 'Hierro', dose_pattern: 'lun/mié/vie' })]) };
    expect(linea(alternos, MARTES)).toEqual({ tipo: 'linea', texto: 'Hoy: No tocan suplementos', incompleta: false });
    expect(linea(alternos, LUNES)).toEqual({ tipo: 'linea', texto: 'Hoy: 1 suplemento', incompleta: false });
    // Con tomas del dia, la linea cuenta esas (el semanal se ve en la pantalla).
    const mezcla = { ...insumosVacios(), suplementos: lecturaOk([sup({ id: 'a', dose_pattern: 'semanal' }), sup({ id: 'b' })]) };
    expect(linea(mezcla)).toEqual({ tipo: 'linea', texto: 'Hoy: 1 suplemento', incompleta: false });
  });
  it('lo que NO es plan no lo vuelve plan: eventuales y pausados siguen siendo "sin plan"', () => {
    const ins = { ...insumosVacios(), suplementos: lecturaOk([sup({ id: 'a', is_plan: false }), sup({ id: 'b', is_active: false })]) };
    expect(linea(ins)).toEqual({ tipo: 'sin_plan' });
  });
  it('nada que mostrar y una sola lectura caida: no se afirma "sin plan"', () => {
    expect(linea({ ...insumosVacios(), practicas: LECTURA_FALLIDA })).toEqual({ tipo: 'error' });
    expect(linea({ ...insumosVacios(), rutinas: LECTURA_FALLIDA })).toEqual({ tipo: 'error' });
  });
  it('todo caido, o nada pedido: error, nunca una tarjeta feliz', () => {
    const caido: InsumosPlan = {
      rutinas: LECTURA_FALLIDA, suplementos: LECTURA_FALLIDA, practicas: LECTURA_FALLIDA, habitos: LECTURA_FALLIDA,
      planAlimentacion: LECTURA_FALLIDA,
    };
    expect(linea(caido)).toEqual({ tipo: 'error' });
    expect(linea({})).toEqual({ tipo: 'error' });
  });
  it('el prefijo cambia con el dia que se mira', () => {
    const r = resumenDelDia(componerDia(insumosLlenos(), MARTES, HOY, CTX), 'Martes');
    expect(r.tipo === 'linea' ? r.texto.startsWith('Martes: Tracción') : false).toBe(true);
  });
});

describe('la tarjeta MI PLAN de HOY', () => {
  it('con plan: la linea y VER MI PLAN', () => {
    const t = tarjetaMiPlan({ tipo: 'linea', texto: 'Hoy: 3 hábitos', incompleta: false });
    expect(t).toEqual({ linea: 'Hoy: 3 hábitos', mensaje: null, cta: { texto: 'VER MI PLAN', destino: { tipo: 'ruta', ruta: '/mi-plan' } }, reintentar: false });
  });
  it('con una parte sin leer lo dice, y sigue abriendo', () => {
    const t = tarjetaMiPlan({ tipo: 'linea', texto: 'Hoy: 3 hábitos', incompleta: true });
    expect(t.mensaje).toBe('Una parte no se pudo leer. Ábrelo para reintentar.');
    expect(t.cta?.texto).toBe('VER MI PLAN');
  });
  it('sin plan: lo dice sin prometer y lleva a donde se arma', () => {
    const t = tarjetaMiPlan({ tipo: 'sin_plan' });
    expect(t.linea).toBe('Todavía no tienes un plan armado');
    expect(t.cta).toEqual({ texto: 'ARMAR MI PLAN', destino: { tipo: 'ruta', ruta: '/packs/armar' } });
    expect(t.reintentar).toBe(false);
  });
  it('sin lectura: "No pudimos leer tu plan" y Reintentar, sin CTA feliz', () => {
    const t = tarjetaMiPlan({ tipo: 'error' });
    expect(t.linea).toBe('No pudimos leer tu plan');
    expect(t.cta).toBeNull();
    expect(t.reintentar).toBe(true);
  });
});

describe('las tres etiquetas, y a quien se le escribe', () => {
  it('en todo un dia lleno solo existen tres etiquetas', () => {
    const vistas = new Set<string>();
    for (const fecha of semanaDe(HOY)) {
      const dia = componerDia(insumosLlenos(), fecha, HOY, CTX);
      for (const s of dia.secciones) if (s.estado === 'ok') for (const f of s.filas) if (f.etiqueta) vistas.add(f.etiqueta);
    }
    expect([...vistas].sort()).toEqual(['ARGOS propone', 'Lo fijó Enrique', 'Lo puedes mover']);
  });
  it('la etiqueta sale del dueno: una fila sin dueno no promete nada', () => {
    for (const fecha of semanaDe(HOY)) {
      const dia = componerDia(insumosLlenos(), fecha, HOY, CTX);
      for (const s of dia.secciones) {
        if (s.estado !== 'ok') continue;
        for (const f of s.filas) {
          if (f.dueno === 'tuyo') expect(f.etiqueta).toBe(ETIQUETA_TUYO);
          else if (f.dueno === 'argos') expect(f.etiqueta).toBe(ETIQUETA_ARGOS);
          else if (f.dueno === 'coach') expect((f.etiqueta ?? '').startsWith('Lo fijó ')).toBe(true);
          else expect(f.etiqueta).toBeNull();
          // Toda fila lleva a algun lado y dice que gesto es.
          expect(f.destino === null ? `${f.id} sin destino` : 'ok').toBe('ok');
          expect(f.accion ? 'ok' : `${f.id} sin accion`).toBe('ok');
        }
      }
    }
  });
  it('lo del coach nunca abre un editor propio: solo donde se ve, se pausa o se lee', () => {
    const permitidos = ['/fitness-hub', '/supplements', '/nutrition'];
    for (const fecha of semanaDe(HOY)) {
      const dia = componerDia(insumosLlenos(), fecha, HOY, CTX);
      for (const s of dia.secciones) {
        if (s.estado !== 'ok') continue;
        for (const f of s.filas.filter((x) => x.dueno === 'coach')) {
          const d = f.destino;
          const ok = d !== null && (d.tipo === 'evaluacion' || (d.tipo === 'ruta' && permitidos.includes(d.ruta)));
          expect(ok ? 'ok' : `${f.id} abre ${JSON.stringify(d)}`).toBe('ok');
        }
      }
    }
  });
  it('etiquetaCoach y el bloque de como se ajusta: tres lineas, una por etiqueta', () => {
    expect(etiquetaCoach('Enrique')).toBe('Lo fijó Enrique');
    expect(etiquetaCoach('  ')).toBe('Lo fijó tu coach');
    expect(etiquetaCoach(null)).toBe('Lo fijó tu coach');
    const bloque = comoSeAjusta('Enrique', true);
    expect(bloque.map((l) => l.etiqueta)).toEqual(['Lo puedes mover', 'Lo fijó Enrique', 'ARGOS propone']);
    expect(comoSeAjusta(null, true)[1].etiqueta).toBe('Lo fijó tu coach');
    for (const l of bloque) expect(l.texto.includes('\n')).toBe(false);
  });
  // 8-oct-2026 (revisión en frío)
  it('sin nada fijado por un coach, su linea no se pinta: no se explica una etiqueta que la cuenta nunca ve', () => {
    expect(comoSeAjusta(null, false).map((l) => l.etiqueta)).toEqual(['Lo puedes mover', 'ARGOS propone']);
    expect(comoSeAjusta('Enrique', false).map((l) => l.dueno)).toEqual(['tuyo', 'argos']);
  });
  it('la linea de ARGOS nombra donde vive su propuesta (Ordenar mi día), no HOY', () => {
    const argos = comoSeAjusta(null, false)[1].texto;
    expect(argos).toMatch('Lo ves en Ordenar mi día.');
    expect(argos).toMatch('qué graduar');
    expect(argos.includes('HOY')).toBe(false);
    // Es el nombre que la persona lee en esa pantalla, y la fila "ARGOS propone" lleva ahi.
    expect(readFileSync(resolve(process.cwd(), 'app/ordenar-dia.tsx'), 'utf8')).toMatch('title="Ordenar mi día"');
    expect(filaPorId(componerDia(insumosLlenos(), HOY, HOY, CTX), 'argos:ordenar')?.destino).toEqual({ tipo: 'ruta', ruta: '/ordenar-dia' });
  });
  it('la leyenda mira la SEMANA: lo del coach de otro dia tambien cuenta', () => {
    const cuentaPropia: InsumosPlan = { rutinas: lecturaOk([RUTINAS[2]]), habitos: lecturaOk(HABITOS), suplementos: lecturaOk([SUPLEMENTOS[2]]) };
    expect(coachesDeLaSemana(cuentaPropia, HOY, CTX)).toEqual([]);
    // Rutina del coach solo el lunes: el martes el dia no trae nada suyo, la semana si.
    const conCoach: InsumosPlan = { rutinas: lecturaOk(RUTINAS), coachPorId: { [COACH_ID]: 'Ana' } };
    expect(componerDia(conCoach, MARTES, HOY, CTX).coaches).toEqual([]);
    const semana = coachesDeLaSemana(conCoach, HOY, CTX);
    expect(semana).toEqual(['Ana']);
    expect(coachDelDia({ coaches: semana })).toBe('Ana');
    // Sin lecturas todavia no hay nada que afirmar.
    expect(coachesDeLaSemana({}, HOY, CTX)).toEqual([]);
  });
  it('el boton de escribirle solo se ofrece cuando lo que se ve lo fijo el coach Elite', () => {
    const lleno = componerDia(insumosLlenos(), LUNES, HOY, CTX);
    expect(contactoCoach(lleno, 'Enrique')).toEqual({ tipo: 'elite' });
    expect(coachDelDia(lleno)).toBe('Enrique');
    // Cuenta sin nada del coach: ningun contacto.
    const propio = componerDia({ rutinas: lecturaOk([RUTINAS[2]]), habitos: lecturaOk(HABITOS) }, MARTES, HOY, CTX);
    expect(propio.coaches).toEqual([]);
    expect(contactoCoach(propio, 'Enrique')).toEqual({ tipo: 'ninguno' });
    expect(coachDelDia(propio)).toBeNull();
  });
  it('si lo fijo otra persona no se abre un chat con quien no es', () => {
    const dia = componerDia({ rutinas: lecturaOk(RUTINAS), coachPorId: { [COACH_ID]: 'Ana' } }, LUNES, HOY, CTX);
    expect(contactoCoach(dia, 'Enrique')).toEqual({
      tipo: 'otro',
      texto: 'Lo que fijó Ana se ajusta platicándolo directamente. Desde aquí no se mueve.',
    });
    expect(coachDelDia(dia)).toBe('Ana');
  });
  it('si no se sabe quien lo fijo, tampoco', () => {
    const dia = componerDia({ rutinas: lecturaOk(RUTINAS) }, LUNES, HOY, CTX);
    expect(dia.coaches).toEqual([null]);
    const c = contactoCoach(dia, 'Enrique');
    expect(c.tipo).toBe('otro');
    expect(c.tipo === 'otro' ? c.texto : '').toMatch('Lo que fijó tu coach');
  });
  // 8-oct-2026 (revisión en frío): bastaba que las filas RESUELTAS fueran del
  // coach Elite para ofrecer "Escríbele a Enrique", aunque otra fila del dia
  // la hubiera fijado alguien que no se pudo resolver.
  it('con UNA fila de coach sin resolver no se ofrece el boton, aunque las demas sean del coach Elite', () => {
    // Lunes: la rutina la asigno un coach sin nombre legible; suplementos y evaluacion los firma Enrique.
    const dia = componerDia({ ...insumosLlenos(), coachPorId: {} }, LUNES, HOY, CTX);
    expect(dia.coaches).toContain(null);
    expect(dia.coaches).toContain('Enrique');
    expect(contactoCoach(dia, 'Enrique')).toEqual({
      tipo: 'otro',
      texto: 'Lo que fijó tu coach se ajusta platicándolo directamente. Desde aquí no se mueve.',
    });
    // Y la leyenda tampoco firma con un nombre lo que quiza fijo otra persona.
    expect(coachDelDia(dia)).toBeNull();
    expect(contactoCoach({ coaches: ['Enrique', null] }, 'Enrique').tipo).toBe('otro');
    expect(contactoCoach({ coaches: [null, 'Enrique', 'Enrique'] }, 'Enrique').tipo).toBe('otro');
    expect(contactoCoach({ coaches: ['Enrique', '   '] }, 'Enrique').tipo).toBe('otro');
    // Todas resueltas y del coach Elite: el boton si.
    expect(contactoCoach({ coaches: ['Enrique', 'enrique '] }, 'Enrique')).toEqual({ tipo: 'elite' });
    // Otra persona conocida y una sin resolver: no se nombra a nadie.
    const mixto = contactoCoach({ coaches: ['Ana', null] }, 'Enrique');
    expect(mixto.tipo === 'otro' ? mixto.texto : '').toMatch('Lo que fijó tu coach');
    expect(coachDelDia({ coaches: ['Ana', null] })).toBeNull();
    // Lo que ya valia sigue valiendo: otra persona conocida se nombra.
    const ana = contactoCoach({ coaches: ['Ana', 'Enrique'] }, 'Enrique');
    expect(ana.tipo === 'otro' ? ana.texto : '').toMatch('Lo que fijó Ana');
  });
  it('el nombre se compara sin acentos ni mayusculas', () => {
    const dia = componerDia({ rutinas: lecturaOk(RUTINAS), coachPorId: { [COACH_ID]: 'ENRIQUE ' } }, LUNES, HOY, CTX);
    expect(contactoCoach(dia, 'Enrique')).toEqual({ tipo: 'elite' });
  });
});

describe('copy: lo que la persona lee', () => {
  const EM_DASH = '\u2014';
  const ROJAS = /diagn[oó]stic|tratamiento|terap[eé]utic|previene|\bcura\b|receta m[eé]dica|intervenci[oó]n/i;
  // Palabras que asumen sexo de quien lee. "Solo" no entra: en este copy es
  // adverbio ("Solo este día"), no adjetivo.
  const GENERO = /\b(listo|lista|bienvenido|bienvenida|cansado|cansada|preparado|preparada|seguro|segura)\b/i;
  function todos(): string[] {
    const out: string[] = [];
    const variantes: InsumosPlan[] = [
      insumosLlenos(),
      insumosVacios(),
      { ...insumosLlenos(), planAlimentacion: LECTURA_FALLIDA, habitos: LECTURA_FALLIDA },
      { ...insumosLlenos(), coachPorId: {} },
      { sueno: lecturaOk({ dormir: { hora: '22:00', origen: 'tuyo' as const }, despertar: null }) },
      { suplementos: lecturaOk([sup({ id: 'a', name: 'Hierro', dose_pattern: 'lun/mié/vie' }), sup({ id: 'b', name: 'D', dose_pattern: 'semanal' })]) },
      // 8-oct-2026 (revisión en frío): los casos que estrenan copy.
      { suplementos: lecturaOk([sup({ id: 'a', name: 'Hierro', dose_pattern: 'lun/mié/vie' })]) },
      { suplementos: lecturaOk([sup({ id: 'b', name: 'D', dose_pattern: 'semanal' })]) },
      { ...insumosLlenos(), planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, propio: true, coachNombre: null }) },
      { rutinas: lecturaOk([asig({ id: 'c1', day_of_week: 1, routine_id: 'rut-1', routine_name: 'Fuerza', assigned_by: COACH_ID })]) },
      // Fecha exacta del coach sobre lo propio, y una rutina propia agendada.
      {
        rutinas: lecturaOk([
          asig({ id: 'f1', schedule_type: 'specific_date', specific_date: HOY, routine_id: 'rut-9', routine_name: 'Prueba', assigned_by: COACH_ID }),
          asig({ id: 'f2', day_of_week: 3, routine_id: 'rut-2', routine_name: 'Mi rutina' }),
          asig({ id: 'f3', day_of_week: 4, routine_id: 'rut-2', routine_name: 'Mi rutina' }),
        ]),
      },
    ];
    for (const ins of variantes) {
      for (const fecha of semanaDe(HOY)) {
        const dia = componerDia(ins, fecha, HOY, CTX);
        out.push(...textosDe(dia));
        const r = resumenDelDia(dia);
        const t = tarjetaMiPlan(r);
        out.push(t.linea, t.mensaje ?? '', t.cta?.texto ?? '');
        const c = contactoCoach(dia, 'Enrique');
        if (c.tipo === 'otro') out.push(c.texto);
        out.push(tituloDia(fecha, HOY));
      }
    }
    for (const r of [{ tipo: 'sin_plan' as const }, { tipo: 'error' as const }]) {
      const t = tarjetaMiPlan(r);
      out.push(t.linea, t.mensaje ?? '', t.cta?.texto ?? '');
    }
    for (const l of [...comoSeAjusta('Enrique', true), ...comoSeAjusta(null, true), ...comoSeAjusta(null, false)]) out.push(l.etiqueta, l.texto);
    // 8-oct-2026 (revisión en frío): los textos nuevos entran al mismo barrido.
    out.push(avisoDeEvaluacion('formato', VOZ_ELITE).texto, avisoDeEvaluacion('lectura', VOZ_ELITE).texto, SIN_SESION.titulo, SIN_SESION.cuerpo);
    // 8-oct-2026 (nivel 2): la voz neutra, la de programa, la practica del
    // coach y sus avisos entran al mismo barrido.
    out.push(avisoDeEvaluacion('formato').texto, avisoDeEvaluacion('lectura').texto);
    const ajustes = ajustesDePractica({ assigned_by: COACH_ID }, 'Enrique');
    out.push(ajustes.etiqueta ?? '', ajustes.avisoAjustes ?? '');
    const aviso = avisoHoraDePracticaAsignada(null);
    out.push(aviso.titulo, aviso.cuerpo, PRACTICA_NO_LEIDA.titulo, PRACTICA_NO_LEIDA.cuerpo);
    for (const fecha of semanaDe(HOY)) out.push(...textosDe(componerDia(insumosPrograma(), fecha, HOY, CTX)));
    return out.filter((s) => s !== '');
  }
  it('cero em dashes', () => {
    for (const s of todos()) expect(s.includes(EM_DASH) ? s : 'ok').toBe('ok');
  });
  it('sin palabras rojas, y "práctica", no la palabra vieja', () => {
    for (const s of todos()) expect(ROJAS.test(s) ? s : 'ok').toBe('ok');
  });
  it('nunca asume el sexo de quien lee', () => {
    for (const s of todos()) expect(GENERO.test(s) ? s : 'ok').toBe('ok');
  });
  it('guard: el barrido si junta texto (si queda vacio, los tres tests de arriba no prueban nada)', () => {
    expect(todos().length).toBeGreaterThan(200);
    expect(todos()).toContain('Lo puedes mover');
    expect(todos()).toContain('No tienes prácticas ni hábitos encendidos.');
    // Y si alcanza el copy del 8-oct (si no llega, el barrido no lo esta cuidando).
    for (const nuevo of [
      'Agregar un entrenamiento mío', 'Hoy: No tocan suplementos', 'Hoy: 1 suplemento semanal',
      'Tu plan. 2200 kcal · 150 g de proteína. Todavía no se edita desde la app.',
      'Sale de tu test de cronotipo. No se edita a mano: cambia si repites el test.',
      'Esta versión de la app no puede leer tu evaluación. Lo demás de tu plan sí está aquí.',
      'Inicia sesión para ver tu plan',
    ]) expect(todos()).toContain(nuevo);
  });
});

describe('rutas de Mi plan: ninguna inventada', () => {
  function archivoDeRuta(ruta: string): string | null {
    for (const c of [`app${ruta}.tsx`, `app${ruta}/index.tsx`]) {
      const abs = resolve(process.cwd(), c);
      if (existsSync(abs)) return abs;
    }
    return null;
  }
  it('cada ruta fija existe en app/ y es una pantalla real (sin Redirect)', () => {
    for (const ruta of Object.values(RUTAS_MI_PLAN)) {
      const f = archivoDeRuta(ruta);
      expect(f === null ? `falta ${ruta}` : 'ok').toBe('ok');
      if (f) expect(/<Redirect\b/.test(readFileSync(f, 'utf8')) ? `${ruta} es un Redirect` : 'ok').toBe('ok');
    }
  });
  it('las rutas con parametro que arma la pantalla tambien existen', () => {
    expect(existsSync(resolve(process.cwd(), 'app/centro/[appKey].tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'app/salud/intervenciones/[key].tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'app/salud/evaluacion-elite.tsx'))).toBe(true);
  });
  it('control: el detector si caza una ruta que no existe', () => {
    expect(archivoDeRuta('/pantalla-que-no-existe')).toBeNull();
  });
  it('la ficha del Centro a la que van las metas tiene su editor', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/centro/[appKey].tsx'), 'utf8');
    expect(src).toMatch("app.key === 'comida' && <ConfigProteina");
    expect(src).toMatch("app.key === 'hidratacion' && <ConfigHidratacion");
  });
});

describe('lo que la evaluacion Elite aporta a la semana', () => {
  function omar(): EliteV3 {
    const crudo: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
    );
    const r = validarEliteV3(crudo);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    return r.valor;
  }
  it('del ejemplo real salen solo numeros del documento', () => {
    const e = omar();
    const p = planDeEvaluacion(e);
    expect(p.ventana).toEqual(e.alimentacion.ventana ?? null);
    expect(p.alimentacion?.titulo).toBe('Qué priorizar y qué evitar');
    expect(p.alimentacion?.detalle).toMatch(`${e.alimentacion.prioriza.length} que priorizar`);
    expect(typeof p.entrenamiento).toBe('string');
  });
  it('una seccion vacia no abre una fila hueca', () => {
    const e = omar();
    e.alimentacion = { prioriza: [], evita: [], ventana: null, horarios: [], notas: [] };
    e.entrenamiento = { base: null, sesiones: [], descanso: [], notas: [] };
    expect(planDeEvaluacion(e)).toEqual({ voz: VOZ_ELITE, entrenamiento: null, ventana: null, alimentacion: null, rutinas: [] });
  });
  it('los nombres de sus rutinas ejecutables viajan tal cual (8-oct-2026: para no repetir el dia que ya tocan)', () => {
    const e = omar();
    const esperados = (e.entrenamiento.rutinas ?? []).map((r) => r.nombre.trim()).filter((n) => n !== '');
    expect(planDeEvaluacion(e).rutinas).toEqual(esperados);
    e.entrenamiento = { ...e.entrenamiento, rutinas: [{ nombre: ' Fuerza A ', objetivo: null, dias_semana: [1], bloques: [], notas: null }] };
    expect(planDeEvaluacion(e).rutinas).toEqual(['Fuerza A']);
    e.entrenamiento = { base: null, sesiones: [], descanso: [], notas: [] };
    expect(planDeEvaluacion(e).rutinas).toEqual([]);
  });
  it('con ventana y sin lista de alimentos, solo la ventana', () => {
    const e = omar();
    e.alimentacion = { prioriza: [], evita: [], ventana: { inicio: '12:00', fin: '20:00' }, horarios: [], notas: [] };
    const p = planDeEvaluacion(e);
    expect(p.ventana).toEqual({ inicio: '12:00', fin: '20:00' });
    expect(p.alimentacion).toBeNull();
  });
  it('con notas y sin lista ni ventana, una fila que abre la seccion', () => {
    const e = omar();
    e.alimentacion = { prioriza: [], evita: [], ventana: null, horarios: [], notas: ['Come sin pantallas'] };
    expect(planDeEvaluacion(e).alimentacion).toEqual({ titulo: 'Tu alimentación en tu evaluación', detalle: null });
  });
});

// 8-oct-2026 (revisión en frío). La pantalla guardaba la fecha de hoy al
// abrirse y no la soltaba: pasada la medianoche seguia en "ayer".
describe('el dia que se mira sigue a hoy hasta que la persona elige otro', () => {
  it('sin eleccion se ve hoy, y al cambiar el dia se ve el nuevo hoy', () => {
    expect(diaVisible(null, HOY)).toBe(HOY);
    expect(diaVisible(null, '2026-10-08')).toBe('2026-10-08');
  });
  it('un dia elegido se respeta mientras siga en la semana de hoy', () => {
    expect(diaVisible(LUNES, HOY)).toBe(LUNES);
    expect(diaVisible(LUNES, '2026-10-08')).toBe(LUNES);
    expect(diaVisible(DOMINGO, DOMINGO)).toBe(DOMINGO);
  });
  it('cruzar el domingo suelta el dia elegido: ya no esta en la tira', () => {
    expect(diaVisible(LUNES, '2026-10-12')).toBe('2026-10-12');
    expect(diaVisible('no-es-fecha', HOY)).toBe(HOY);
  });
  it('tocar HOY no lo congela: vuelve a seguirlo', () => {
    expect(alElegirDia(HOY, HOY)).toBeNull();
    expect(alElegirDia(LUNES, HOY)).toBe(LUNES);
    // El caso que fallaba: se toca "hoy", pasa la medianoche, y se sigue viendo hoy.
    expect(diaVisible(alElegirDia(HOY, HOY), '2026-10-08')).toBe('2026-10-08');
  });
  it('candado: la pantalla ya no arranca con la fecha de hoy guardada', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/screens/plan/MiPlanScreen.tsx'), 'utf8');
    expect(src).toMatch('useState<string | null>(null)');
    expect(src.includes('useState(hoy)')).toBe(false);
    expect(src).toMatch('diaVisible(elegida, hoy)');
    expect(src).toMatch("AppState.addEventListener('change'");
  });
  it('sin sesion hay algo que decir, no un hueco', () => {
    expect(SIN_SESION.titulo.length).toBeGreaterThan(0);
    expect(SIN_SESION.cuerpo.length).toBeGreaterThan(0);
    const src = readFileSync(resolve(process.cwd(), 'src/screens/plan/MiPlanScreen.tsx'), 'utf8');
    expect(src).toMatch('SIN_SESION.titulo');
  });
  it('candado: la tarjeta de HOY tiene la misma guarda de cuenta que la pantalla', () => {
    for (const f of ['src/screens/plan/MiPlanScreen.tsx', 'src/components/hoy/MiPlanCard.tsx']) {
      const src = readFileSync(resolve(process.cwd(), f), 'utf8');
      expect(src.includes('cuenta.current !== userId') ? 'ok' : `${f} sin guarda de cuenta`).toBe('ok');
    }
  });
});

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): practicas que asigno el coach y la voz del documento
// ---------------------------------------------------------------------------

/** Una practica del programa (assigned_by) junto a las propias de siempre. */
const PRACTICA_COACH: PracticaPlanRow = {
  key: 'respiracion_478', nombre: 'Respiración 4-7-8', hora: '22:15', horaTuya: true, deCoach: true,
};

/** Cliente de programa sin evaluacion que leer: la voz dice "tu programa". */
function insumosPrograma(): InsumosPlan {
  const voz = vozDe({ tipo: 'programa', nombre: 'Fuerza y sueño', conDiagnostico: false });
  return {
    ...insumosLlenos(),
    practicas: lecturaOk([...PRACTICAS, PRACTICA_COACH]),
    planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, nombre: 'Plan Elite v2' }),
    evaluacion: lecturaOk({
      voz,
      entrenamiento: '3 tipos de sesión',
      ventana: { inicio: '12:00', fin: '20:00' },
      alimentacion: { titulo: 'Tu alimentación en tu programa', detalle: null },
    }),
  };
}

describe('nivel 2: la practica que asigno el coach', () => {
  function filaPractica(p: Partial<UserInterventionRow> & { id: string; intervention_key: string }): UserInterventionRow {
    return {
      user_id: USER, status: 'active', priority: 1, source_dx_id: null, is_custom: false, is_universal: false,
      custom_definition: null, custom_time: null, computed_time: null, custom_notes: null, custom_dose: null,
      activated_at: null, created_at: '2026-09-01', updated_at: '2026-09-01', ...p,
    };
  }
  it('practicasDeFilas marca la asignada; sin la columna (antes de la 329) ninguna lo es', () => {
    const out = practicasDeFilas([
      filaPractica({ id: '1', intervention_key: 'hidratacion_matutina', assigned_by: COACH_ID }),
      filaPractica({ id: '2', intervention_key: 'exposicion_solar_matutina', assigned_by: null }),
      filaPractica({ id: '3', intervention_key: 'respiracion_478' }),
      filaPractica({ id: '4', intervention_key: 'caminata_postprandial', assigned_by: '  ' }),
    ], LECTURA_FALLIDA);
    expect(out.map((p) => [p.key, p.deCoach])).toEqual([
      ['hidratacion_matutina', true],
      ['exposicion_solar_matutina', false],
      ['respiracion_478', false],
      ['caminata_postprandial', false],
    ]);
  });
  it('en Mi plan se firma "Lo fijó Enrique", se consulta y se pausa, y dice quien ajusta su hora', () => {
    const ins = { ...insumosLlenos(), practicas: lecturaOk([...PRACTICAS, PRACTICA_COACH]) };
    const f = filaPorId(componerDia(ins, HOY, HOY, CTX), 'pra:respiracion_478');
    expect(f).toMatchObject({
      titulo: 'Respiración 4-7-8',
      cuando: '22:15',
      dueno: 'coach',
      etiqueta: 'Lo fijó Enrique',
      accion: 'Ver y pausar',
      destino: { tipo: 'practica', key: 'respiracion_478' },
      detalle: 'Práctica · su hora la ajusta Enrique',
    });
    // Nunca "Lo puedes mover" en lo que fijo el coach.
    expect(f?.etiqueta).not.toBe(ETIQUETA_TUYO);
  });
  it('sin hora propia no se dice "sugerida por tu horario": la ajusta el coach', () => {
    const p: PracticaPlanRow = { ...PRACTICA_COACH, hora: '07:15', horaTuya: false };
    const ins = { ...insumosLlenos(), practicas: lecturaOk([p]) };
    expect(filaPorId(componerDia(ins, HOY, HOY, CTX), 'pra:respiracion_478')?.detalle)
      .toBe('Práctica · su hora la ajusta Enrique');
    const sinHora: PracticaPlanRow = { ...PRACTICA_COACH, hora: null, horaTuya: false };
    expect(filaPorId(componerDia({ practicas: lecturaOk([sinHora]) }, HOY, HOY, CTX), 'pra:respiracion_478')?.detalle)
      .toBe('Práctica · sin hora · su hora la ajusta Enrique');
  });
  it('las propias no cambian', () => {
    const antes = filasDe(componerDia({ ...insumosLlenos() }, HOY, HOY, CTX), 'practicas').filter((f) => f.id.startsWith('pra:'));
    const ins = { ...insumosLlenos(), practicas: lecturaOk([...PRACTICAS, PRACTICA_COACH]) };
    const despues = filasDe(componerDia(ins, HOY, HOY, CTX), 'practicas')
      .filter((f) => f.id.startsWith('pra:') && f.id !== 'pra:respiracion_478');
    expect(despues).toEqual(antes);
    for (const f of despues) expect(f).toMatchObject({ dueno: 'tuyo', etiqueta: ETIQUETA_TUYO, accion: 'Cambiar hora o pausar' });
  });
  it('cuenta para la leyenda y para el contacto: una sola practica del coach basta', () => {
    const ins: InsumosPlan = { practicas: lecturaOk([PRACTICA_COACH]), habitos: lecturaOk<HabitoPlanRow[]>([]) };
    const dia = componerDia(ins, HOY, HOY, CTX);
    expect(dia.coaches).toEqual(['Enrique']);
    expect(contactoCoach(dia, 'Enrique')).toEqual({ tipo: 'elite' });
    const semana = coachesDeLaSemana(ins, HOY, CTX);
    expect(semana.length).toBe(7);
    expect(coachDelDia({ coaches: semana })).toBe('Enrique');
    expect(comoSeAjusta(coachDelDia({ coaches: semana }), semana.length > 0).map((l) => l.etiqueta))
      .toEqual([ETIQUETA_TUYO, 'Lo fijó Enrique', ETIQUETA_ARGOS]);
    // Solo propias: la linea del coach no sale.
    const propias: InsumosPlan = { practicas: lecturaOk(PRACTICAS), habitos: lecturaOk<HabitoPlanRow[]>([]) };
    expect(coachesDeLaSemana(propias, HOY, CTX)).toEqual([]);
  });
});

describe('nivel 2: la ficha de la practica (ajustesDePractica) y la agenda', () => {
  it('asignada: se consulta y se pausa; ni hora, ni notas, ni descartar', () => {
    const a = ajustesDePractica({ assigned_by: COACH_ID }, 'Enrique');
    expect(a).toMatchObject({ asignada: true, etiqueta: 'Lo fijó Enrique', editaAjustes: false, puedeDescartar: false });
    expect(a.avisoAjustes).toMatch('las ajusta Enrique');
    expect(a.avisoAjustes).toMatch('La puedes pausar cuando quieras.');
  });
  it('propia, sin la columna o sin fila: como siempre', () => {
    const propia = { asignada: false, etiqueta: null, editaAjustes: true, puedeDescartar: true, avisoAjustes: null };
    expect(ajustesDePractica({ assigned_by: null }, 'Enrique')).toEqual(propia);
    expect(ajustesDePractica({}, 'Enrique')).toEqual(propia);
    expect(ajustesDePractica(null, 'Enrique')).toEqual(propia);
  });
  it('sin nombre de coach no se inventa uno', () => {
    expect(ajustesDePractica({ assigned_by: COACH_ID }, '  ').etiqueta).toBe('Lo fijó tu coach');
    expect(avisoHoraDePracticaAsignada(null).titulo).toBe('Su hora la ajusta tu coach');
    expect(avisoHoraDePracticaAsignada('Enrique').cuerpo).toMatch('platícalo con Enrique');
  });
});

describe('nivel 2: la voz del documento en Mi plan', () => {
  function programa(): EliteV3 {
    const crudo: unknown = JSON.parse(readFileSync(resolve(process.cwd(), 'R and D/diagnostico/programa_ejemplo.json'), 'utf8'));
    const r = validarEliteV3(crudo);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    return r.valor;
  }
  it('un programa sin evaluacion dice "tu programa"; nada dice Elite', () => {
    const e = programa();
    e.alimentacion = { ...e.alimentacion, prioriza: [], evita: [], ventana: null, notas: ['Come sin pantallas'] };
    const p = planDeEvaluacion(e);
    expect(p.voz?.tipo).toBe('programa');
    expect(p.alimentacion).toEqual({ titulo: 'Tu alimentación en tu programa', detalle: null });
  });
  it('las filas que abren el documento usan su voz', () => {
    const dia = componerDia(insumosPrograma(), HOY, HOY, CTX);
    expect(filaPorId(dia, 'ent:evaluacion')).toMatchObject({ titulo: 'Lo que marca tu programa', accion: 'Leer en tu programa' });
    expect(filaPorId(dia, 'ali:ventana')?.accion).toBe('Leer en tu programa');
    expect(filaPorId(dia, 'ali:evaluacion')?.accion).toBe('Leer en tu programa');
    // "Plan Elite v2" se le muestra neutro a un cliente de programa.
    expect(filaPorId(dia, 'ali:plan')?.titulo).toBe('Plan de alimentación · v2');
    expect(dia.voz?.tipo).toBe('programa');
  });
  it('ningun texto de la semana de un programa dice Elite', () => {
    for (const fecha of semanaDe(HOY)) {
      for (const s of textosDe(componerDia(insumosPrograma(), fecha, HOY, CTX))) expect(/elite/i.test(s) ? s : 'ok').toBe('ok');
    }
  });
  it('Elite: las mismas palabras de antes, y su plan conserva el nombre', () => {
    const ins = { ...insumosLlenos(), planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, nombre: 'Plan Elite v2' }) };
    const dia = componerDia(ins, HOY, HOY, CTX);
    expect(filaPorId(dia, 'ent:evaluacion')).toMatchObject({ titulo: 'Lo que marca tu evaluación', accion: 'Leer en tu evaluación' });
    expect(filaPorId(dia, 'ali:ventana')?.accion).toBe('Leer en tu evaluación');
    expect(filaPorId(dia, 'ali:plan')?.titulo).toBe('Plan Elite v2');
    expect(dia.voz).toBe(VOZ_ELITE);
  });
  it('sin documento leido: manda lo que la pantalla sepa; si nada, neutro', () => {
    const base = { ...insumosLlenos(), planAlimentacion: lecturaOk<PlanAlimentacionIn | null>({ ...PLAN_COACH, nombre: 'Plan Elite v3' }) };
    const fallo = { ...base, evaluacion: LECTURA_FALLIDA };
    expect(vozDelPlan(fallo, {})).toBeNull();
    expect(filaPorId(componerDia(fallo, HOY, HOY, CTX), 'ali:plan')?.titulo).toBe('Plan de alimentación · v3');
    const conTipo = { ...CTX, voz: VOZ_ELITE };
    expect(vozDelPlan(fallo, conTipo)).toBe(VOZ_ELITE);
    expect(filaPorId(componerDia(fallo, HOY, HOY, conTipo), 'ali:plan')?.titulo).toBe('Plan Elite v3');
    // El documento leido gana sobre lo que dice la pantalla.
    expect(vozDelPlan(insumosPrograma(), conTipo)?.tipo).toBe('programa');
    // Sin documento cargado (cuenta sin evaluacion), neutro tambien.
    expect(vozDelPlan({ evaluacion: lecturaOk(null) }, {})).toBeNull();
  });
  it('el aviso de lectura: Elite igual que antes; programa y neutro dicen "tu programa"', () => {
    expect(avisoDeEvaluacion('lectura', VOZ_ELITE).texto).toBe('No se pudo leer lo que marca tu evaluación. Lo demás de tu plan sí está aquí.');
    const prog = vozDe({ tipo: 'programa', nombre: null });
    expect(avisoDeEvaluacion('lectura', prog).texto).toBe('No se pudo leer lo que marca tu programa. Lo demás de tu plan sí está aquí.');
    expect(avisoDeEvaluacion('lectura').texto).toBe('No se pudo leer lo que marca tu programa. Lo demás de tu plan sí está aquí.');
    expect(avisoDeEvaluacion('formato', null)).toEqual({
      texto: 'Esta versión de la app no puede leer tu programa. Lo demás de tu plan sí está aquí.',
      reintentar: false,
    });
    expect(documentoDe(undefined)).toBe('tu programa');
    for (const m of ['lectura', 'formato'] as const) {
      expect(/elite/i.test(avisoDeEvaluacion(m).texto)).toBe(false);
      expect(/elite/i.test(avisoDeEvaluacion(m, prog).texto)).toBe(false);
    }
  });
});
