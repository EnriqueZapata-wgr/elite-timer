/**
 * Tests del esquema elite_v3 (ruta 3.1). Se corren con
 * `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/elite-v3-core.test.ts`.
 *
 * Candados que este test protege (no aflojar; si el contrato cambia, la razon
 * va escrita aqui): el ejemplo real anonimizado pasa; estado sin valor,
 * evidencia fuera de 1..4, palabra roja en texto de usuario, em dash, seccion
 * faltante y dosis negativa se rechazan; el resumen para ARGOS cabe en 1,800
 * caracteres sin palabras rojas; el plan de suplementos mapea a las columnas
 * reales de user_supplements (055 + 167 + 312).
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ELITE_PRACTICAS_MAX,
  ELITE_PRACTICA_NOTA_MAX,
  ELITE_PROGRAMA_NOMBRE_MAX,
  ELITE_SECCIONES,
  RESUMEN_ARGOS_MAX,
  esEliteV3,
  esFechaReal,
  esPrograma,
  marcadoresDe,
  nivelCalidadEliteV3,
  palabrasRojasEn,
  resumenParaArgos,
  raicesDetectadas,
  suplementosAFilas,
  tieneDiagnostico,
  tipoDeDocumento,
  validarEliteV3,
  type EliteV3,
} from '../elite-v3-core';
// 8-oct-2026 (nivel 2): solo en la prueba. El core NO importa ninguno de los
// dos (uno seria un ciclo, el otro son diez mil lineas en el telefono).
import { seccionTieneContenido } from '../mi-programa-core';
import { INTERVENTIONS_CATALOG, INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';

// Se lee del disco (precedente: tarea-images-contrato.test.ts): el cwd es la
// raiz del repo tanto en vitest como en el runner sin vitest.
const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

/** Copia profunda para mutar sin tocar el ejemplo importado. */
function clon(): Record<string, any> {
  return JSON.parse(JSON.stringify(ejemplo));
}

function erroresDe(obj: unknown): string[] {
  const r = validarEliteV3(obj);
  return r.ok ? [] : r.errores;
}

describe('validarEliteV3 con el ejemplo real anonimizado', () => {
  it('el DX de O. pasa completo', () => {
    const r = validarEliteV3(ejemplo);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    expect(r.ok).toBe(true);
  });

  it('trae las 15 secciones y los conteos del documento cuadran con las filas', () => {
    const r = validarEliteV3(ejemplo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const e = r.valor;
    for (const s of ELITE_SECCIONES) expect((e as unknown as Record<string, unknown>)[s]).toBeDefined();
    const filas = e.marcadores.grupos.flatMap((g) => g.marcadores);
    expect(filas).toHaveLength(28);
    const porEstado = { att: 0, sub: 0, opt: 0 };
    for (const m of filas) if (m.estado) porEstado[m.estado] += 1;
    expect(porEstado).toEqual(e.conteo.mueven_tu_caso);
    expect(e.genetica.hallazgos).toHaveLength(e.conteo.hallazgos_adn as number);
    expect(e.sistemas).toHaveLength(10);
    expect(e.cruces.lista).toHaveLength(6);
    expect(e.cliente.nombre_preferido).toBe('O.');
  });

  it('los marcadores estimados van con flag, fuente ctx y sin la etiqueta en el nombre', () => {
    const est = marcadoresDe(ejemplo as unknown as EliteV3).filter((m) => m.estimado);
    expect(est).toHaveLength(2);
    for (const m of est) {
      expect(m.fuente).toContain('ctx');
      expect(m.nombre).not.toMatch(/ESTIMAD/);
    }
  });

  it('nivel de calidad 5 con genetica, 4 sin ella', () => {
    expect(nivelCalidadEliteV3(ejemplo as unknown as EliteV3)).toBe(5);
    const sin = clon();
    sin.genetica.hallazgos = [];
    delete sin.interpretado_por.genetica;
    const r = validarEliteV3(sin);
    expect(r.ok).toBe(true);
    if (r.ok) expect(nivelCalidadEliteV3(r.valor)).toBe(4);
  });
});

describe('validarEliteV3 rechaza', () => {
  it('estado sin valor', () => {
    const o = clon();
    o.marcadores.grupos[0].marcadores[0].valor = null;
    const err = erroresDe(o);
    expect(err.length).toBeGreaterThan(0);
    expect(err.some((x) => x.includes('estado: debe ser null cuando valor es null'))).toBe(true);
  });

  it('evidencia 5', () => {
    const o = clon();
    o.marcadores.grupos[2].marcadores[0].evidencia = 5;
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('evidencia debe ser 1..4'))).toBe(true);
  });

  it('palabra roja en un texto de usuario', () => {
    const o = clon();
    o.sistemas[0].por_que = 'Esto es un diagnóstico de tu metabolismo.';
    const err = erroresDe(o);
    expect(err.some((x) => x.startsWith('sistemas[0].por_que') && x.includes('diagnostico'))).toBe(true);
  });

  it('palabra roja se permite solo en medico.pendientes[].con_quien', () => {
    const o = clon();
    o.medico.pendientes[0].con_quien = 'Tu médico tratante decide el tratamiento';
    expect(erroresDe(o)).toEqual([]);
    o.medico.pendientes[0].por_que = 'Para definir tratamiento';
    expect(erroresDe(o).some((x) => x.startsWith('medico.pendientes[0].por_que'))).toBe(true);
  });

  it('em dash', () => {
    const o = clon();
    o.cierre.palancas[0].como = 'Bajar el alcohol \u2014 y medir GGT';
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('em dash'))).toBe(true);
  });

  it('seccion faltante', () => {
    const o = clon();
    delete o.braverman;
    expect(erroresDe(o)).toContain('braverman: seccion faltante');
    const o2 = clon();
    o2.suplementos = null;
    expect(erroresDe(o2)).toContain('suplementos: seccion faltante');
  });

  it('dosis negativa', () => {
    const o = clon();
    o.suplementos[0].dosis_cantidad = -400;
    o.suplementos[0].dosis_unidad = 'mg';
    const err = erroresDe(o);
    expect(err.some((x) => x.includes('suplementos[0].dosis_cantidad'))).toBe(true);
    const o2 = clon();
    o2.suplementos[0].unidades_por_toma = -1;
    expect(erroresDe(o2).some((x) => x.includes('suplementos[0].unidades_por_toma'))).toBe(true);
  });

  it('lo que no es objeto, schema distinto y genetica sin firma', () => {
    expect(validarEliteV3(null).ok).toBe(false);
    expect(validarEliteV3('elite').ok).toBe(false);
    const o = clon();
    o.schema = 'elite_v2';
    expect(erroresDe(o).some((x) => x.startsWith('schema'))).toBe(true);
    const o2 = clon();
    delete o2.interpretado_por.genetica;
    expect(erroresDe(o2).some((x) => x.includes('interpretado_por.genetica'))).toBe(true);
  });

  it('palancas deben ser exactamente tres', () => {
    const o = clon();
    o.cierre.palancas.pop();
    expect(erroresDe(o)).toContain('cierre.palancas: exactamente tres');
  });

  // 20-sep-2026 (324): las metas con numero son opcionales, pero si vienen
  // tienen que ser numeros mayores que cero o null.
  it('metas de alimentacion: opcionales, y cero o negativo no es una meta', () => {
    const o = clon();
    o.alimentacion.metas = { proteina_g_dia: 140, agua_ml_dia: null };
    expect(erroresDe(o)).toEqual([]);
    const o2 = clon();
    o2.alimentacion.metas = null;
    expect(erroresDe(o2)).toEqual([]);
    const o3 = clon();
    o3.alimentacion.metas = { proteina_g_dia: 0, agua_ml_dia: -1 };
    const err = erroresDe(o3);
    expect(err).toContain('alimentacion.metas.proteina_g_dia: numero mayor que cero o null');
    expect(err).toContain('alimentacion.metas.agua_ml_dia: numero mayor que cero o null');
  });

  // 20-sep-2026 (revision en frio, A1): una llave ausente en `metas` no puede
  // salir como `undefined` (la pantalla pintaba "undefined g de proteina").
  // Si `metas` es objeto, el valor validado trae las dos llaves: numero o null.
  it('metas de alimentacion: llave ausente sale como null, nunca undefined', () => {
    const o = clon();
    o.alimentacion.metas = {};
    const r = validarEliteV3(o);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 21-sep-2026 (325): las cinco llaves, siempre (kcal, grasa y
    // carbohidrato se suman a proteina y agua).
    expect(r.valor.alimentacion.metas).toEqual({ proteina_g_dia: null, agua_ml_dia: null, kcal_dia: null, grasa_g_dia: null, carbohidrato_g_dia: null });

    const o2 = clon();
    o2.alimentacion.metas = { proteina_g_dia: 150 };
    const r2 = validarEliteV3(o2);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.valor.alimentacion.metas).toEqual({ proteina_g_dia: 150, agua_ml_dia: null, kcal_dia: null, grasa_g_dia: null, carbohidrato_g_dia: null });
    // La entrada no se muta: quien mando el objeto lo conserva tal cual.
    expect(o2.alimentacion.metas).toEqual({ proteina_g_dia: 150 });
  });
});

// 21-sep-2026 (migracion 325): los campos que siembran el perfil (cardio y
// fitness) y los que se convierten en rutinas y comidas. Todos opcionales:
// el ejemplo de Omar no trae ninguno y sigue validando (arriba). Si vienen,
// se revisan tipo, enum y rango sano; ausente sale como null o [].
describe('validarEliteV3 con los campos de la 325', () => {
  const comida = { momento: 'desayuno', hora: '07:30', nombre: 'Huevos con verdura', componentes: ['3 huevos', 'espinaca', 'aguacate'], notas: null };
  const rutina = {
    nombre: 'Fuerza A', objetivo: 'Base de fuerza', dias_semana: [1, 4],
    bloques: [
      { ejercicio: 'Sentadilla', series: 3, reps: '8-10', descanso_s: 120, notas: null },
      { ejercicio: 'Plancha', series: 3, reps: '30 s', descanso_s: 60, notas: 'Sin arquear' },
    ],
    notas: null,
  };

  it('acepta el contrato completo y lo devuelve normalizado', () => {
    const o = clon();
    o.cliente = { ...o.cliente, fecha_nacimiento: '1988-03-14', estatura_cm: 176, peso_kg: 84.5, nivel_fitness: 'intermedio', fc_reposo: 58 };
    o.alimentacion.metas = { proteina_g_dia: 150, agua_ml_dia: 2800, kcal_dia: 2200, grasa_g_dia: 70, carbohidrato_g_dia: 200 };
    o.alimentacion.comidas = [comida, { momento: 'cena', hora: null, nombre: 'Pescado con ensalada', componentes: ['salmon'] }];
    o.entrenamiento.rutinas = [rutina, { nombre: 'Caminata', objetivo: null, dias_semana: null, bloques: [{ ejercicio: 'Caminar', series: null, reps: null, descanso_s: null, notas: null }], notas: null }];
    const r = validarEliteV3(o);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    expect(r.valor.cliente.fc_reposo).toBe(58);
    expect(r.valor.cliente.nivel_fitness).toBe('intermedio');
    expect(r.valor.alimentacion.metas?.kcal_dia).toBe(2200);
    expect(r.valor.alimentacion.comidas).toHaveLength(2);
    // hora y notas ausentes salen como null, nunca undefined.
    expect(r.valor.alimentacion.comidas?.[1]).toEqual({ momento: 'cena', hora: null, nombre: 'Pescado con ensalada', componentes: ['salmon'], notas: null });
    expect(r.valor.entrenamiento.rutinas).toHaveLength(2);
    expect(r.valor.entrenamiento.rutinas?.[0].dias_semana).toEqual([1, 4]);
    expect(r.valor.entrenamiento.rutinas?.[1].dias_semana).toBeNull();
  });

  it('el ejemplo de Omar (sin nada de esto) sale con null y listas vacias', () => {
    const r = validarEliteV3(ejemplo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.cliente.fecha_nacimiento).toBeNull();
    expect(r.valor.cliente.estatura_cm).toBeNull();
    expect(r.valor.cliente.peso_kg).toBeNull();
    expect(r.valor.cliente.nivel_fitness).toBeNull();
    expect(r.valor.cliente.fc_reposo).toBeNull();
    expect(r.valor.alimentacion.comidas).toEqual([]);
    expect(r.valor.entrenamiento.rutinas).toEqual([]);
    // La entrada no se muta.
    expect((ejemplo as { cliente: Record<string, unknown> }).cliente.fc_reposo).toBeUndefined();
  });

  it('rechaza rangos fuera de lo sano y fechas que no existen', () => {
    const o = clon();
    o.cliente = { ...o.cliente, fecha_nacimiento: '1988-02-30', estatura_cm: 99, peso_kg: 301, nivel_fitness: 'atleta', fc_reposo: 20 };
    const err = erroresDe(o);
    expect(err).toContain('cliente.fecha_nacimiento: YYYY-MM-DD real, entre 1900 y hoy, o null');
    expect(err).toContain('cliente.estatura_cm: numero entre 100 y 250 o null');
    expect(err).toContain('cliente.peso_kg: numero entre 30 y 300 o null');
    expect(err).toContain('cliente.fc_reposo: numero entre 30 y 120 o null');
    expect(err).toContain('cliente.nivel_fitness: principiante|intermedio|avanzado o null');
    const o2 = clon();
    o2.cliente.fecha_nacimiento = '2999-01-01';
    expect(erroresDe(o2).some((x) => x.startsWith('cliente.fecha_nacimiento'))).toBe(true);
    const o3 = clon();
    o3.alimentacion.metas = { kcal_dia: 0, grasa_g_dia: -5 };
    expect(erroresDe(o3)).toContain('alimentacion.metas.kcal_dia: numero mayor que cero o null');
    expect(erroresDe(o3)).toContain('alimentacion.metas.grasa_g_dia: numero mayor que cero o null');
  });

  it('comidas: momento fuera del enum, hora que no es de reloj y componentes que no son texto', () => {
    const o = clon();
    o.alimentacion.comidas = [
      { ...comida, momento: 'merienda' },
      { ...comida, hora: '25:00' },
      { ...comida, hora: '7:30' },
      { ...comida, componentes: [1, 2] },
      { ...comida, nombre: '' },
    ];
    const err = erroresDe(o);
    expect(err).toContain('alimentacion.comidas[0].momento: desayuno|comida|cena|colacion|pre_entreno|post_entreno');
    expect(err).toContain('alimentacion.comidas[1].hora: HH:MM o null');
    expect(err).toContain('alimentacion.comidas[2].hora: HH:MM o null');
    expect(err).toContain('alimentacion.comidas[3].componentes: arreglo de textos');
    expect(err).toContain('alimentacion.comidas[4].nombre: texto obligatorio');
    const o2 = clon();
    o2.alimentacion.comidas = null;
    expect(erroresDe(o2)).toEqual([]);
  });

  it('rutinas: dias repetidos o fuera de 1..7, sin ejercicios, series y descanso fuera de rango', () => {
    const o = clon();
    o.entrenamiento.rutinas = [
      { ...rutina, dias_semana: [1, 1] },
      { ...rutina, dias_semana: [0, 8] },
      { ...rutina, bloques: [] },
      { ...rutina, bloques: [{ ejercicio: 'Sentadilla', series: 0, reps: null, descanso_s: 601, notas: null }] },
      { ...rutina, nombre: '' },
    ];
    const err = erroresDe(o);
    expect(err).toContain('entrenamiento.rutinas[0].dias_semana: dias repetidos');
    expect(err).toContain('entrenamiento.rutinas[1].dias_semana: enteros 1..7 (1 = lunes, 7 = domingo) o null');
    expect(err).toContain('entrenamiento.rutinas[2].bloques: al menos un ejercicio');
    expect(err).toContain('entrenamiento.rutinas[3].bloques[0].series: entero 1..20 o null');
    expect(err).toContain('entrenamiento.rutinas[3].bloques[0].descanso_s: segundos 0..600 o null');
    expect(err).toContain('entrenamiento.rutinas[4].nombre: texto obligatorio');
  });

  // 21-sep-2026 (ronda de arreglos, M1-b): `slug` fija el clip contra el
  // catalogo en ingles. Opcional; si viene, con forma de slug. Ausente sale
  // como null en cada bloque (nunca undefined) y no se muta la entrada.
  it('rutinas: slug del catalogo opcional, con forma de slug, y ausente sale como null', () => {
    const o = clon();
    o.entrenamiento.rutinas = [{
      ...rutina,
      bloques: [
        { ejercicio: 'Press de banca con mancuernas', series: 4, reps: '6', descanso_s: 120, notas: null, slug: 'dumbbell-bench-press' },
        { ejercicio: 'Prensa de pierna', series: 4, reps: '6', descanso_s: 120, notas: null, slug: null },
        { ejercicio: 'Zancada', series: 3, reps: '8', descanso_s: 60, notas: null },
      ],
    }];
    const r = validarEliteV3(o);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    const bloques = r.valor.entrenamiento.rutinas?.[0].bloques ?? [];
    expect(bloques.map((b) => b.slug)).toEqual(['dumbbell-bench-press', null, null]);
    expect('slug' in (o.entrenamiento.rutinas[0].bloques[2] as Record<string, unknown>)).toBe(false);

    const malo = clon();
    malo.entrenamiento.rutinas = [{
      ...rutina,
      bloques: [
        { ...rutina.bloques[0], slug: 'Barbell Bench Press' },
        { ...rutina.bloques[0], slug: 'barbell_bench_press' },
        { ...rutina.bloques[0], slug: '' },
        { ...rutina.bloques[0], slug: 7 },
      ],
    }];
    const err = erroresDe(malo);
    for (const j of [0, 1, 2, 3]) {
      expect(err).toContain(`entrenamiento.rutinas[0].bloques[${j}].slug: slug de exercise_matrix en minusculas y guiones (barbell-bench-press) o null`);
    }
  });

  it('el candado de texto tambien cubre comidas y rutinas', () => {
    const o = clon();
    o.alimentacion.comidas = [{ ...comida, notas: 'Este desayuno previene la fatiga' }];
    o.entrenamiento.rutinas = [{ ...rutina, objetivo: 'Fuerza \u2014 base' }];
    const err = erroresDe(o);
    expect(err.some((x) => x.startsWith('alimentacion.comidas[0].notas') && x.includes('previene'))).toBe(true);
    expect(err.some((x) => x.startsWith('entrenamiento.rutinas[0].objetivo') && x.includes('em dash'))).toBe(true);
  });
});

describe('palabrasRojasEn', () => {
  it('detecta la lista del informe legal sin importar acentos ni mayusculas', () => {
    expect(palabrasRojasEn('Te diagnosticamos')).toEqual(['diagnostico']);
    expect(palabrasRojasEn('un Chequeo anual')).toEqual(['chequeo']);
    expect(palabrasRojasEn('esto previene y cura')).toEqual(['previene', 'cura']);
    expect(palabrasRojasEn('efecto terapéutico')).toEqual(['terapeutico']);
    expect(palabrasRojasEn('clínicamente validado')).toEqual(['clinicamente validado']);
    expect(palabrasRojasEn('tu médico de IA')).toEqual(['medico de IA']);
    expect(palabrasRojasEn('receta médica')).toEqual(['receta medica']);
  });

  it('no dispara con palabras vecinas legitimas', () => {
    expect(palabrasRojasEn('procura dormir; tu médico tratante; curva de glucosa; dirección clínica')).toEqual([]);
  });
});

describe('resumenParaArgos', () => {
  it('cabe en 1,800 caracteres, sin palabras rojas ni em dashes, y dice lo esencial', () => {
    const r = resumenParaArgos(ejemplo as unknown as EliteV3);
    expect(r.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(r.length).toBeGreaterThan(400);
    expect(palabrasRojasEn(r)).toEqual([]);
    expect(r.includes('\u2014')).toBe(false);
    expect(r).toContain('O.');
    // 13 de sangre y sueno mas 2 de composicion (grasa y grasa visceral).
    expect(r).toContain('Piden accion (15)');
    expect(r).toContain('Enzima del hígado (GGT) 67 (objetivo hasta 30)');
    expect(r).toContain('Hilo: Alcohol aparece en 6 de 6 cruces');
    expect(r).toContain('Palancas: 1) Tu hígado y el alcohol; 2)');
    expect(r).toContain('Cruces: 1) Tu hígado te está avisando');
    expect(r).toContain('Pendiente de medir: Estudio de apnea del sueño');
    expect(r).toContain('Magnesio (glicinato) dosis sin fijar (evening)');
  });

  it('con nombres larguisimos acorta las listas con un conteo, nunca a media frase', () => {
    const o = clon();
    for (const g of o.marcadores.grupos) for (const m of g.marcadores) m.nombre = m.nombre + ' ' + 'x'.repeat(120);
    for (const cr of o.cruces.lista) cr.titulo = cr.titulo + ' ' + 'y'.repeat(200);
    const r = resumenParaArgos(o as unknown as EliteV3);
    expect(r.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(r).toMatch(/Piden accion \(15\): .*\(\+\d+ mas\)\./);
    expect(r).toContain('Palancas: 1)');
    expect(r).toContain('Plan de suplementos: Magnesio');
    expect(r.endsWith('.')).toBe(true);
  });
});

describe('suplementosAFilas', () => {
  it('mapea a las columnas de user_supplements con source coach e is_plan true', () => {
    const filas = suplementosAFilas(ejemplo as unknown as EliteV3, 'user-123');
    expect(filas).toHaveLength(6);
    const mg = filas[0];
    expect(mg).toMatchObject({
      user_id: 'user-123', name: 'Magnesio (glicinato)', timing: 'evening', source: 'coach', is_plan: true, is_active: true,
      amount_per_unit: null, amount_unit: null, units_per_dose: null, notes: null,
    });
    // 8-sep-2026 (contrato nuevo, no relajado): sin dosis en el manual la fila
    // viaja con null, NO con la raya. Asi dispara el COALESCE a "Sin dosis
    // fijada" del RPC 318; con la raya el cliente leia un guion en su plan.
    expect(mg.dosage).toBeNull();
    expect(mg.reason).toContain('Corrige el nivel bajo');
    // 8-sep-2026: sin hora fijada en el manual, timing va null. Antes caia en
    // 'morning', una hora que el clinico nunca escribio.
    expect(filas[1].timing).toBeNull();
    expect(filas[1].notes).toContain('K2');
  });

  it('con dosis completa arma el texto de la ficha y respeta la unidad', () => {
    const o = clon();
    o.suplementos[0] = { ...o.suplementos[0], dosis_cantidad: 400, dosis_unidad: 'mg', unidades_por_toma: 2, duracion: '12 semanas', advertencia: 'No con antiácidos' };
    const r = validarEliteV3(o);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [f] = suplementosAFilas(r.valor, 'u');
    expect(f.dosage).toBe('2 por toma de 400 mg');
    expect(f.amount_per_unit).toBe(400);
    expect(f.amount_unit).toBe('mg');
    expect(f.units_per_dose).toBe(2);
    expect(f.notes).toBe('Duracion: 12 semanas. No con antiácidos');
  });
});

describe('raicesDetectadas', () => {
  it('el ejemplo real deja de salir vacio y solo trae raices del vocabulario', () => {
    const r = validarEliteV3(ejemplo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const raices = raicesDetectadas(r.valor);
    const keys = raices.map((x) => x.root_key).sort();
    // O. trae HOMA-IR 3.39 (objetivo hasta 1.5), insulina 15.8 (hasta 5) y
    // sueno profundo 13% (objetivo 20 a 25): tres raices literales.
    expect(keys).toEqual(['deficit_sueno_profundo', 'hiperinsulinemia', 'resistencia_insulina']);
    for (const x of raices) {
      expect(x.severity).toBe(3);
      expect(x.confidence).toBe(0.5);
      expect(x.sources.length).toBeGreaterThan(0);
    }
  });

  it('no traduce un marcador que se salio para el lado contrario', () => {
    const o = clon();
    // Insulina POR DEBAJO del objetivo no es hiperinsulinemia.
    for (const g of o.marcadores.grupos) {
      for (const m of g.marcadores) {
        if (m.key === 'insulina') { m.valor = 1; m.objetivo = { min: 3, max: null }; }
      }
    }
    const r = validarEliteV3(o);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(raicesDetectadas(r.valor).map((x) => x.root_key)).not.toContain('hiperinsulinemia');
  });

  it('la raiz declarada a mano manda y la inventada se rechaza al validar', () => {
    const o = clon();
    o.raices = [{ root_key: 'sobrecarga_hepatica', severity: 4, confidence: 0.8, por_que: 'GGT y ALT arriba del objetivo' }];
    const r = validarEliteV3(o);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const hepatica = raicesDetectadas(r.valor).find((x) => x.root_key === 'sobrecarga_hepatica');
    expect(hepatica).toBeDefined();
    expect(hepatica?.severity).toBe(4);
    expect(hepatica?.confidence).toBe(0.8);
    const malo = clon();
    malo.raices = [{ root_key: 'higado_cansado' }];
    expect(erroresDe(malo).join(' ')).toContain('vocabulario controlado');
  });
});

describe('esEliteV3', () => {
  it('reconoce sources_snapshot con elite_v3 y rechaza el resto', () => {
    expect(esEliteV3({ elite_v3: ejemplo })).toBe(true);
    expect(esEliteV3({ elite_v3: { schema: 'otro' } })).toBe(false);
    expect(esEliteV3({ labs: {} })).toBe(false);
    expect(esEliteV3(null)).toBe(false);
    expect(esEliteV3(ejemplo)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): un solo documento, dos tipos
// ---------------------------------------------------------------------------
//
// Candados nuevos (no aflojar): un documento SIN `tipo` es Elite y se comporta
// letra por letra como antes; `tipo: 'programa'` puede no traer toma de sangre
// ni secciones de evaluacion; las practicas se revisan por forma; la plantilla
// `programa_ejemplo.json` valida; y ningun texto que este core genera para un
// programa dice "Elite".

const programaEjemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/programa_ejemplo.json'), 'utf8'),
);

function clonPrograma(): Record<string, any> {
  return JSON.parse(JSON.stringify(programaEjemplo));
}

function valido(obj: unknown): EliteV3 {
  const r = validarEliteV3(obj);
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** Todos los textos de un objeto, con su ruta. */
function textosDe(v: unknown, ruta = ''): { ruta: string; texto: string }[] {
  if (typeof v === 'string') return [{ ruta, texto: v }];
  if (Array.isArray(v)) return v.flatMap((x, i) => textosDe(x, `${ruta}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => textosDe(x, ruta ? `${ruta}.${k}` : k));
  return [];
}

describe('nivel 2: un documento sin tipo sigue siendo Elite, igual que antes', () => {
  it('el ejemplo real valida sin tocarlo y es de tipo elite', () => {
    const e = valido(ejemplo);
    expect(tipoDeDocumento(e)).toBe('elite');
    expect(esPrograma(e)).toBe(false);
    // `tipo` no se rellena: ausente sigue ausente.
    expect('tipo' in (e as unknown as Record<string, unknown>)).toBe(false);
    expect(tieneDiagnostico(e)).toBe(true);
  });

  it('lo unico que la normalizacion le agrega son las tres llaves nuevas, vacias', () => {
    const e = valido(ejemplo) as unknown as Record<string, any>;
    expect(e.practicas).toEqual([]);
    expect(e.inicio.programa_nombre).toBeNull();
    expect(e.inicio.programa_inicio).toBeNull();
    expect(e.cliente.fecha_toma).toBe('2026-05');
    const sinNuevas = JSON.parse(JSON.stringify(e));
    delete sinNuevas.practicas;
    delete sinNuevas.inicio.programa_nombre;
    delete sinNuevas.inicio.programa_inicio;
    const antes = clon();
    // Lo que ya normalizaba la 325 (cliente, metas, comidas, rutinas).
    Object.assign(antes.cliente, { fecha_nacimiento: null, estatura_cm: null, peso_kg: null, nivel_fitness: null, fc_reposo: null });
    antes.alimentacion.metas = null;
    antes.alimentacion.comidas = [];
    antes.entrenamiento.rutinas = [];
    expect(sinNuevas).toEqual(antes);
  });

  it('el resumen para ARGOS del ejemplo es letra por letra el de antes del nivel 2', () => {
    const texto = resumenParaArgos(valido(ejemplo));
    expect(texto.startsWith('Evaluacion Elite v1 de O., hombre de 38 anios, Edad ATP 44.5 (toma 2026-05). Firma: Enrique Zapata; genetica: Proveedor de interpretacion genetica.')).toBe(true);
    expect(texto).toHaveLength(1796);
    // Huella del texto que producia el codigo ANTES del 8-oct-2026. Si el
    // ejemplo cambia a proposito, se recalcula; si cambia sola, algo movio
    // el texto que ARGOS lee de los clientes Elite.
    expect(sha256(texto)).toBe('bfea522623ffa428eb3d30bb1ec1c8bc211515d7e0b2f4e33f93fec7546e4aa9');
  });

  it('en Elite la toma sigue siendo obligatoria y el mensaje no cambio', () => {
    const sinToma = clon();
    sinToma.cliente.fecha_toma = null;
    expect(erroresDe(sinToma)).toContain('cliente.fecha_toma: YYYY-MM o YYYY-MM-DD');
    const sinLlave = clon();
    delete sinLlave.cliente.fecha_toma;
    expect(erroresDe(sinLlave)).toContain('cliente.fecha_toma: YYYY-MM o YYYY-MM-DD');
    const explicito = clon();
    explicito.tipo = 'elite';
    explicito.cliente.fecha_toma = null;
    expect(erroresDe(explicito)).toContain('cliente.fecha_toma: YYYY-MM o YYYY-MM-DD');
  });

  it('tipo explicito elite valida y se comporta igual', () => {
    const o = clon();
    o.tipo = 'elite';
    const e = valido(o);
    expect(tipoDeDocumento(e)).toBe('elite');
    expect(resumenParaArgos(e)).toBe(resumenParaArgos(valido(ejemplo)));
  });

  it('un tipo que no es elite ni programa se rechaza (no cae en silencio como Elite)', () => {
    for (const malo of ['Programa', 'nivel2', '', null, 2, true]) {
      const o = clon();
      o.tipo = malo;
      expect(erroresDe(o).join(' ')).toContain("tipo: 'elite' o 'programa'");
    }
  });

  it('tipoDeDocumento aguanta lo que le llegue de una pantalla que esta cargando', () => {
    expect(tipoDeDocumento(null)).toBe('elite');
    expect(tipoDeDocumento(undefined)).toBe('elite');
    expect(tipoDeDocumento({})).toBe('elite');
    expect(tipoDeDocumento({ tipo: 'PROGRAMA' })).toBe('elite');
    expect(tipoDeDocumento({ tipo: 'programa' })).toBe('programa');
    expect(esPrograma({ tipo: 'programa' })).toBe(true);
  });
});

describe('nivel 2: la plantilla programa_ejemplo.json', () => {
  it('valida completa y es de tipo programa', () => {
    const e = valido(programaEjemplo);
    expect(tipoDeDocumento(e)).toBe('programa');
    expect(esPrograma(e)).toBe(true);
    for (const s of ELITE_SECCIONES) expect((e as unknown as Record<string, unknown>)[s]).toBeDefined();
    expect(e.cierre.palancas).toHaveLength(3);
    expect(e.cliente.fecha_toma).toBeNull();
    expect(e.inicio.programa_nombre).toBe('Fuerza y sueño');
    expect(e.inicio.programa_inicio).toBe('2026-10-12');
    expect(e.inicio.programa_semanas).toBe(12);
    expect(e.suplementos.length).toBeGreaterThan(0);
    expect(e.entrenamiento.rutinas?.length ?? 0).toBeGreaterThan(0);
    expect(e.alimentacion.comidas?.length ?? 0).toBeGreaterThan(0);
  });

  it('trae de 3 a 5 practicas y todas existen en el catalogo', () => {
    const e = valido(programaEjemplo);
    const practicas = e.practicas ?? [];
    expect(practicas.length).toBeGreaterThanOrEqual(3);
    expect(practicas.length).toBeLessThanOrEqual(5);
    for (const p of practicas) expect(INTERVENTION_BY_KEY[p.key]).toBeDefined();
  });

  it('no trae evaluacion: tieneDiagnostico es false', () => {
    expect(tieneDiagnostico(valido(programaEjemplo))).toBe(false);
  });

  it('ningun texto de la plantilla dice Elite (el esquema se llama elite_v3, eso no lo lee el cliente)', () => {
    const { schema: _schema, ...resto } = clonPrograma();
    const conMarca = textosDe(resto).filter((t) => /elite/i.test(t.texto)).map((t) => t.ruta);
    expect(conMarca).toEqual([]);
  });

  it('validar lo ya validado da lo mismo (lo guardado en la base se vuelve a leer con este validador)', () => {
    const una = valido(programaEjemplo);
    const dos = valido(JSON.parse(JSON.stringify(una)));
    expect(dos).toEqual(una);
  });

  it('el plan de suplementos sale a filas igual que en Elite', () => {
    const filas = suplementosAFilas(valido(programaEjemplo), 'u1');
    expect(filas).toHaveLength(3);
    expect(filas[0]).toMatchObject({ source: 'coach', is_plan: true, timing: 'bedtime', amount_per_unit: 200, amount_unit: 'mg' });
  });
});

describe('nivel 2: lo que un programa puede omitir y lo que no', () => {
  it('la toma puede faltar (null o sin la llave) y queda en null', () => {
    const sinLlave = clonPrograma();
    delete sinLlave.cliente.fecha_toma;
    expect(valido(sinLlave).cliente.fecha_toma).toBeNull();
  });

  it('si trae toma, tiene que tener forma de fecha', () => {
    const o = clonPrograma();
    o.cliente.fecha_toma = '2026-09-20';
    expect(valido(o).cliente.fecha_toma).toBe('2026-09-20');
    o.cliente.fecha_toma = 'septiembre';
    expect(erroresDe(o).join(' ')).toContain('cliente.fecha_toma');
    o.cliente.fecha_toma = '';
    expect(erroresDe(o).join(' ')).toContain('cliente.fecha_toma');
  });

  it('las 15 secciones siguen siendo obligatorias (las builds ya instaladas las exigen)', () => {
    for (const s of ELITE_SECCIONES) {
      const o = clonPrograma();
      delete o[s];
      expect(erroresDe(o)).toContain(`${s}: seccion faltante`);
    }
  });

  it('siguen siendo exactamente tres palancas', () => {
    const o = clonPrograma();
    o.cierre.palancas.pop();
    expect(erroresDe(o)).toContain('cierre.palancas: exactamente tres');
  });

  it('el candado de texto aplica igual: palabra roja y em dash se rechazan', () => {
    const roja = clonPrograma();
    roja.cierre.palancas[0].como = 'Este es tu tratamiento de doce semanas.';
    expect(erroresDe(roja).join(' ')).toContain('palabra roja (tratamiento)');
    const raya = clonPrograma();
    raya.inicio.lead = 'Doce semanas \u2014 fuerza y descanso.';
    expect(erroresDe(raya).join(' ')).toContain('em dash');
  });

  it('el sexo se declara: sin el, no valida (no se supone)', () => {
    const o = clonPrograma();
    delete o.cliente.sexo;
    expect(erroresDe(o)).toContain('cliente.sexo: male|female');
  });
});

describe('nivel 2: nombre e inicio declarado del programa', () => {
  it('el nombre se guarda sin espacios a los lados', () => {
    const o = clonPrograma();
    o.inicio.programa_nombre = '  Fuerza y sueño  ';
    expect(valido(o).inicio.programa_nombre).toBe('Fuerza y sueño');
  });

  it('sin la llave o en null, queda en null', () => {
    const o = clonPrograma();
    delete o.inicio.programa_nombre;
    delete o.inicio.programa_inicio;
    const e = valido(o);
    expect(e.inicio.programa_nombre).toBeNull();
    expect(e.inicio.programa_inicio).toBeNull();
  });

  it('rechaza nombre vacio, de mas de una linea, demasiado largo o que no es texto', () => {
    for (const malo of ['', '   ', 'Fuerza\ny sueño', 'x'.repeat(ELITE_PROGRAMA_NOMBRE_MAX + 1), 12]) {
      const o = clonPrograma();
      o.inicio.programa_nombre = malo;
      expect(erroresDe(o).join(' ')).toContain('inicio.programa_nombre');
    }
    const justo = clonPrograma();
    justo.inicio.programa_nombre = 'x'.repeat(ELITE_PROGRAMA_NOMBRE_MAX);
    expect(validarEliteV3(justo).ok).toBe(true);
  });

  it('el nombre pasa por el candado de texto como cualquier otro', () => {
    const roja = clonPrograma();
    roja.inicio.programa_nombre = 'Tratamiento de 12 semanas';
    expect(erroresDe(roja).join(' ')).toContain('inicio.programa_nombre: palabra roja (tratamiento)');
    const raya = clonPrograma();
    raya.inicio.programa_nombre = 'Fuerza \u2014 sueño';
    expect(erroresDe(raya).join(' ')).toContain('inicio.programa_nombre: em dash');
  });

  it('en un programa el nombre no puede decir Elite; en Elite si', () => {
    const o = clonPrograma();
    o.inicio.programa_nombre = 'Plan ELITE 12 semanas';
    expect(erroresDe(o).join(' ')).toContain("no puede decir 'Elite'");
    const elite = clon();
    elite.inicio.programa_nombre = 'Plan Elite 12 semanas';
    expect(valido(elite).inicio.programa_nombre).toBe('Plan Elite 12 semanas');
  });

  it('el inicio declarado es una fecha real YYYY-MM-DD', () => {
    for (const malo of ['2026-09-31', '2026-9-1', '12/10/2026', '2026-10', '2026-10-12T00:00:00Z', '1999-01-01', '2206-10-12', '', 20261012]) {
      const o = clonPrograma();
      o.inicio.programa_inicio = malo;
      expect(erroresDe(o).join(' ')).toContain('inicio.programa_inicio');
    }
    const bisiesto = clonPrograma();
    bisiesto.inicio.programa_inicio = '2028-02-29';
    expect(valido(bisiesto).inicio.programa_inicio).toBe('2028-02-29');
  });

  it('nombre e inicio tambien se aceptan en un documento Elite', () => {
    const o = clon();
    o.inicio.programa_nombre = 'Regreso a la base';
    o.inicio.programa_inicio = '2026-10-12';
    const e = valido(o);
    expect(e.inicio.programa_nombre).toBe('Regreso a la base');
    expect(e.inicio.programa_inicio).toBe('2026-10-12');
    expect(tipoDeDocumento(e)).toBe('elite');
  });

  it('esFechaReal no acepta dias que no existen', () => {
    expect(esFechaReal('2026-10-12')).toBe(true);
    expect(esFechaReal('2026-02-29')).toBe(false);
    expect(esFechaReal('2026-13-01')).toBe(false);
    expect(esFechaReal('2026-10-12 ')).toBe(false);
  });
});

describe('nivel 2: practicas asignadas', () => {
  it('ausente o null queda en []', () => {
    const sin = clonPrograma();
    delete sin.practicas;
    expect(valido(sin).practicas).toEqual([]);
    const nula = clonPrograma();
    nula.practicas = null;
    expect(valido(nula).practicas).toEqual([]);
  });

  it('normaliza hora y nota: ausente = null, nota sin espacios a los lados', () => {
    const o = clonPrograma();
    o.practicas = [{ key: 'respiracion_478' }, { key: 'box_breathing_4444', hora: '06:05', nota: '  Antes del café.  ' }];
    expect(valido(o).practicas).toEqual([
      { key: 'respiracion_478', hora: null, nota: null },
      { key: 'box_breathing_4444', hora: '06:05', nota: 'Antes del café.' },
    ]);
  });

  it('tambien se aceptan en un documento Elite', () => {
    const o = clon();
    o.practicas = [{ key: 'respiracion_478', hora: '22:00', nota: null }];
    expect(valido(o).practicas).toEqual([{ key: 'respiracion_478', hora: '22:00', nota: null }]);
  });

  it('rechaza lo que no es arreglo o no es objeto', () => {
    const o = clonPrograma();
    o.practicas = { key: 'respiracion_478' };
    expect(erroresDe(o)).toContain('practicas: arreglo si viene');
    o.practicas = ['respiracion_478'];
    expect(erroresDe(o).join(' ')).toContain('practicas[0]: objeto');
  });

  it('la clave tiene forma de clave del catalogo', () => {
    for (const mala of ['', 'Respiracion 478', 'respiracion-478', 'respiración_478', '_respiracion', 'respiracion__478', 'x'.repeat(81), 478]) {
      const o = clonPrograma();
      o.practicas = [{ key: mala }];
      expect(erroresDe(o).join(' ')).toContain('practicas[0].key');
    }
  });

  it('no apunta a una practica creada por el cliente (custom_)', () => {
    const o = clonPrograma();
    o.practicas = [{ key: 'custom_1234abcd' }];
    expect(erroresDe(o).join(' ')).toContain('custom_');
  });

  it('no admite la misma practica dos veces', () => {
    const o = clonPrograma();
    o.practicas = [{ key: 'respiracion_478', hora: '07:00' }, { key: 'respiracion_478', hora: '22:00' }];
    expect(erroresDe(o)).toContain('practicas[1].key: practica repetida (respiracion_478)');
  });

  it('tope de practicas', () => {
    const claves = INTERVENTIONS_CATALOG.map((i) => i.key);
    const o = clonPrograma();
    o.practicas = claves.slice(0, ELITE_PRACTICAS_MAX).map((key) => ({ key }));
    expect(validarEliteV3(o).ok).toBe(true);
    o.practicas = claves.slice(0, ELITE_PRACTICAS_MAX + 1).map((key) => ({ key }));
    expect(erroresDe(o)).toContain(`practicas: maximo ${ELITE_PRACTICAS_MAX}`);
  });

  it('la hora es de reloj de 24 horas o null', () => {
    for (const mala of ['7:30', '25:00', '07:60', '0730', '', 730]) {
      const o = clonPrograma();
      o.practicas = [{ key: 'respiracion_478', hora: mala }];
      expect(erroresDe(o)).toContain('practicas[0].hora: HH:MM de 24 horas o null');
    }
    const o = clonPrograma();
    o.practicas = [{ key: 'respiracion_478', hora: '00:00' }, { key: 'box_breathing_4444', hora: '23:59' }];
    expect(validarEliteV3(o).ok).toBe(true);
  });

  it('la nota es corta y pasa por el candado de texto', () => {
    const larga = clonPrograma();
    larga.practicas = [{ key: 'respiracion_478', nota: 'x'.repeat(ELITE_PRACTICA_NOTA_MAX + 1) }];
    expect(erroresDe(larga).join(' ')).toContain('practicas[0].nota');
    const vacia = clonPrograma();
    vacia.practicas = [{ key: 'respiracion_478', nota: '   ' }];
    expect(erroresDe(vacia).join(' ')).toContain('practicas[0].nota');
    const roja = clonPrograma();
    roja.practicas = [{ key: 'respiracion_478', nota: 'Esto cura el insomnio.' }];
    expect(erroresDe(roja).join(' ')).toContain('practicas[0].nota: palabra roja (cura)');
  });

  it('todas las claves del catalogo real pasan la forma y el candado de texto', () => {
    expect(INTERVENTIONS_CATALOG.length).toBeGreaterThan(50);
    const malas: string[] = [];
    for (const i of INTERVENTIONS_CATALOG) {
      const o = clonPrograma();
      o.practicas = [{ key: i.key }];
      if (!validarEliteV3(o).ok) malas.push(i.key);
    }
    expect(malas).toEqual([]);
  });
});

describe('nivel 2: tieneDiagnostico', () => {
  const DIAGNOSTICAS = ['conteo', 'edades', 'sistemas', 'contexto', 'marcadores', 'composicion', 'braverman', 'genetica', 'cruces'] as const;
  const omar = () => valido(ejemplo);

  /** Un programa vacio al que se le copia UNA seccion del ejemplo real. */
  function conSeccionDeOmar(seccion: string): EliteV3 {
    const o = clonPrograma();
    o[seccion] = JSON.parse(JSON.stringify((ejemplo as Record<string, unknown>)[seccion]));
    // Genetica exige quien la firma.
    if (seccion === 'genetica') o.interpretado_por.genetica = 'Proveedor de interpretacion genetica';
    return valido(o);
  }

  it('cada seccion de la evaluacion, sola, la enciende', () => {
    for (const s of DIAGNOSTICAS) expect(tieneDiagnostico(conSeccionDeOmar(s))).toBe(true);
  });

  it('coincide con seccionTieneContenido en esas nueve secciones', () => {
    const casos: EliteV3[] = [omar(), valido(programaEjemplo), ...DIAGNOSTICAS.map((s) => conSeccionDeOmar(s))];
    for (const e of casos) {
      const porSecciones = DIAGNOSTICAS.some((s) => seccionTieneContenido(e, s));
      // Las edades calculadas de Inicio se suman aparte (ver el siguiente test).
      const porInicio = e.inicio.edad_atp !== null || e.inicio.diferencia_anios !== null;
      expect(tieneDiagnostico(e)).toBe(porSecciones || porInicio);
    }
  });

  it('la Edad ATP de Inicio cuenta; la edad cronologica sola y las semanas del plan, no', () => {
    const conAtp = clonPrograma();
    conAtp.inicio.edad_atp = 36.5;
    expect(tieneDiagnostico(valido(conAtp))).toBe(true);
    const conDif = clonPrograma();
    conDif.inicio.diferencia_anios = -1.2;
    expect(tieneDiagnostico(valido(conDif))).toBe(true);

    const soloEdad = clonPrograma();
    soloEdad.inicio.edad_cronologica = 34;
    soloEdad.edades.real = 34;
    const e = valido(soloEdad);
    expect(e.inicio.programa_semanas).toBe(12);
    expect(tieneDiagnostico(e)).toBe(false);
  });

  it('lo que es del plan o del medico no la enciende', () => {
    const o = clonPrograma();
    o.medico.intro = 'Estos estudios los pedimos con tu médico de cabecera.';
    o.medico.pendientes = [{ que: 'Biometría completa', por_que: 'Para tener una base.', con_quien: 'Tu médico de cabecera' }];
    o.marcadores.intro = 'Cuando tengamos tus análisis, aquí van.';
    o.braverman.intro = 'El test de química cerebral se aplica en la semana 2.';
    o.genetica.intro = 'Sin estudio genético por ahora.';
    expect(tieneDiagnostico(valido(o))).toBe(false);
  });

  it('una sola fila de composicion o un reparto con un numero la enciende', () => {
    const fila = clonPrograma();
    fila.composicion.filas = [{ key: 'peso', nombre: 'Peso', valor: 62, unidad: 'kg', rango_lab: null, objetivo: null, estado: 'opt', fuente: ['lab'], evidencia: null, estimado: false }];
    expect(tieneDiagnostico(valido(fila))).toBe(true);
    const reparto = clonPrograma();
    reparto.composicion.reparto = { peso_kg: 62, grasa_pct: null, grasa_kg: null, musculo_pct: null, musculo_kg: null, resto_pct: null, resto_kg: null };
    expect(tieneDiagnostico(valido(reparto))).toBe(true);
    const repartoVacio = clonPrograma();
    repartoVacio.composicion.reparto = { peso_kg: null, grasa_pct: null, grasa_kg: null, musculo_pct: null, musculo_kg: null, resto_pct: null, resto_kg: null };
    expect(tieneDiagnostico(valido(repartoVacio))).toBe(false);
  });
});

describe('nivel 2: lo que este core le escribe a un programa', () => {
  it('el resumen para ARGOS dice programa, nunca Elite, y no menciona una toma que no hubo', () => {
    const texto = resumenParaArgos(valido(programaEjemplo));
    expect(texto.startsWith('Programa "Fuerza y sueño" v1 de Ana Ejemplo, mujer de 34 anios. El plan dura 12 semanas y empieza el 2026-10-12. Es su programa con una evaluacion ligera: no trae laboratorios, composicion corporal ni genetica. Firma: Enrique Zapata.')).toBe(true);
    expect(texto).not.toMatch(/elite/i);
    expect(texto).not.toMatch(/toma/i);
    expect(texto).not.toMatch(/null|undefined/);
    expect(texto.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(palabrasRojasEn(texto)).toEqual([]);
    expect(texto.includes('\u2014')).toBe(false);
    expect(texto).toContain('Palancas: 1) Fuerza tres días por semana');
    expect(texto).toContain('Plan de suplementos: Magnesio (glicinato) 200 mg x1 (bedtime)');
    expect(texto).toContain('Practicas asignadas por su coach (5): hidratacion_matutina (07:00); exposicion_solar_matutina (07:30); caminata_postprandial;');
  });

  it('sin nombre, sin semanas y sin inicio no inventa ninguno de los tres', () => {
    const o = clonPrograma();
    o.inicio.programa_nombre = null;
    o.inicio.programa_inicio = null;
    o.inicio.programa_semanas = null;
    o.practicas = [];
    const texto = resumenParaArgos(valido(o));
    expect(texto.startsWith('Programa v1 de Ana Ejemplo, mujer de 34 anios. Es su programa con una evaluacion ligera:')).toBe(true);
    expect(texto).not.toMatch(/semanas|empieza|Practicas/);
  });

  it('con toma y con evaluacion ligera lo dice asi', () => {
    const o = clonPrograma();
    o.cliente.fecha_toma = '2026-09-20';
    o.sistemas = JSON.parse(JSON.stringify((ejemplo as Record<string, any>).sistemas));
    const texto = resumenParaArgos(valido(o));
    expect(texto).toContain('(toma 2026-09-20)');
    expect(texto).toContain('solo se midio lo que aparece aqui');
    expect(texto).not.toMatch(/elite/i);
  });

  it('un programa cargado de marcadores sigue cabiendo en el tope', () => {
    const o = clon();
    o.tipo = 'programa';
    o.inicio.programa_nombre = 'Programa de doce semanas con evaluación completa';
    o.practicas = INTERVENTIONS_CATALOG.slice(0, ELITE_PRACTICAS_MAX).map((i) => ({ key: i.key, hora: '07:00' }));
    const texto = resumenParaArgos(valido(o));
    expect(texto.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(texto).not.toMatch(/elite/i);
  });

  it('en Elite, las practicas entran despues de los suplementos y el resto del texto no cambia', () => {
    const o = clon();
    // Se acorta el documento para que haya espacio y nada se recorte (el
    // ejemplo completo ya llena el tope: ahi las practicas le quitan lugar
    // a los cruces, que es la prioridad que se eligio).
    o.cruces.lista = o.cruces.lista.slice(0, 2);
    o.cruces.hilo = { variable: 'Alcohol', en: 2, de: 2 };
    o.medico.pendientes = o.medico.pendientes.slice(0, 1);
    const sin = resumenParaArgos(valido(o));
    o.practicas = [{ key: 'respiracion_478', hora: '22:00' }];
    const con = resumenParaArgos(valido(o));
    const bloque = ' Practicas asignadas por su coach (1): respiracion_478 (22:00).';
    expect(con).toContain(bloque);
    expect(con.replace(bloque, '')).toBe(sin);
    expect(con.indexOf('Plan de suplementos:')).toBeLessThan(con.indexOf(bloque));
    expect(con.indexOf(bloque)).toBeLessThan(con.indexOf('Cruces:'));
    expect(con.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
  });

  it('la raiz declarada sin porque no lleva la marca Elite en un programa; en Elite, la de siempre', () => {
    const o = clonPrograma();
    o.raices = [{ root_key: 'deficit_sueno_profundo' }];
    expect(raicesDetectadas(valido(o))[0].sources).toEqual(['Anotada en tu programa']);
    const elite = clon();
    elite.raices = [{ root_key: 'sobrecarga_hepatica' }];
    const hepatica = raicesDetectadas(valido(elite)).find((x) => x.root_key === 'sobrecarga_hepatica');
    expect(hepatica?.sources).toEqual(['Anotada en la evaluacion Elite']);
  });

  it('nivel de calidad: 4 sin genetica, igual que una Elite sin genetica', () => {
    expect(nivelCalidadEliteV3(valido(programaEjemplo))).toBe(4);
  });
});
