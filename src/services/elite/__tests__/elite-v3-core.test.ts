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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ELITE_SECCIONES,
  RESUMEN_ARGOS_MAX,
  esEliteV3,
  marcadoresDe,
  nivelCalidadEliteV3,
  palabrasRojasEn,
  resumenParaArgos,
  raicesDetectadas,
  suplementosAFilas,
  validarEliteV3,
  type EliteV3,
} from '../elite-v3-core';

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
