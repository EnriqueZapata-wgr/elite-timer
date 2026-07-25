import { describe, it, expect } from 'vitest';
import {
  generarRutina,
  filtrarPool,
  tiempoBloqueSeg,
  TECHO_CAPACIDAD_MIN,
  MAX_MULTI_PESADOS,
  ESCALERA,
  type GeneratorInput,
} from '../routine-generator-core';
import type { MatrixExercise, Cualidad } from '@/src/constants/exercise-matrix';
import { parseEquipoRequisitos } from '@/src/constants/exercise-matrix';

// ── Catálogo sintético ──

let n = 0;
function makeEx(partial: Partial<MatrixExercise> & { slug?: string }): MatrixExercise {
  const slug = partial.slug ?? `ex-${n++}`;
  const equipo = partial.equipo ?? 'Peso corporal';
  return {
    slug,
    nombre: slug,
    equipo,
    equipoRequisitos: parseEquipoRequisitos(equipo),
    cargable: false,
    tipo: 'Multiarticular',
    patron: 'Empuje',
    dinamica: 'Normal',
    lateralidad: 'Bilateral',
    musculoPrincipal: 'Pecho',
    secundarios: [],
    cualidades: ['hipertrofia'] as Cualidad[],
    nivel: 'Principiante',
    seniorApto: true,
    metodos: ['Estándar'],
    emomApto: 'Todos',
    benchmark: { tier: null, variante: null },
    contraindicaciones: [],
    familia: `fam-${slug}`,
    mediaUrl: null,
    posterUrl: null,
    unidadesEquipo: 'n/a',
    origen: 'movekit',
    ...partial,
    ...(partial.equipo ? { equipoRequisitos: parseEquipoRequisitos(partial.equipo) } : {}),
  };
}

/** Catálogo balanceado: pesados con barra, metabólicos, aislados, unilaterales, recovery. */
function catalogoBase(): MatrixExercise[] {
  return [
    makeEx({ slug: 'squat-barra', equipo: 'Barra', cargable: true, patron: 'Sentadilla', musculoPrincipal: 'Cuádriceps', cualidades: ['fuerza', 'hipertrofia'], nivel: 'Intermedio', metodos: ['Estándar', '3-5'], familia: 'Sentadilla' }),
    makeEx({ slug: 'press-banca', equipo: 'Barra + Banca', cargable: true, patron: 'Empuje', musculoPrincipal: 'Pecho', cualidades: ['fuerza', 'hipertrofia'], nivel: 'Intermedio', metodos: ['Estándar', '3-5'], familia: 'Press de pecho' }),
    makeEx({ slug: 'remo-barra', equipo: 'Barra', cargable: true, patron: 'Tracción', musculoPrincipal: 'Dorsal', cualidades: ['fuerza', 'hipertrofia'], nivel: 'Intermedio', metodos: ['Estándar', '3-5'], familia: 'Remo' }),
    makeEx({ slug: 'deadlift', equipo: 'Barra', cargable: true, patron: 'Bisagra', musculoPrincipal: 'Isquiotibiales', cualidades: ['fuerza'], nivel: 'Avanzado', metodos: ['Estándar', '3-5'], familia: 'Peso muerto' }),
    makeEx({ slug: 'flexiones', patron: 'Empuje', musculoPrincipal: 'Pecho', cualidades: ['resistencia', 'hipertrofia', 'metabólico'], metodos: ['Estándar', 'EMOM Auto', 'Myo-reps'], familia: 'Flexiones' }),
    makeEx({ slug: 'burpee', patron: 'Locomoción', musculoPrincipal: 'Cuerpo completo', cualidades: ['metabólico', 'resistencia'], metodos: ['Estándar', 'EMOM Auto'], familia: 'Burpee' }),
    makeEx({ slug: 'curl-mancuerna', equipo: 'Mancuerna', cargable: true, tipo: 'Aislado', patron: 'Tracción', musculoPrincipal: 'Bíceps', cualidades: ['fuerza', 'hipertrofia'], metodos: ['Estándar', 'Myo-reps'], familia: 'Curl bíceps' }),
    makeEx({ slug: 'elevacion-lateral', equipo: 'Mancuerna', tipo: 'Aislado', patron: 'Empuje', musculoPrincipal: 'Deltoides medio', cualidades: ['hipertrofia', 'metabólico'], metodos: ['Estándar', 'Myo-reps'], familia: 'Elevación lateral' }),
    makeEx({ slug: 'zancada-mancuerna', equipo: 'Mancuerna', cargable: true, patron: 'Zancada', lateralidad: 'Unilateral', musculoPrincipal: 'Cuádriceps', cualidades: ['fuerza', 'hipertrofia', 'metabólico'], nivel: 'Intermedio', familia: 'Zancada' }),
    makeEx({ slug: 'remo-unilateral', equipo: 'Mancuerna', cargable: true, patron: 'Tracción', lateralidad: 'Unilateral', musculoPrincipal: 'Dorsal', cualidades: ['fuerza', 'hipertrofia'], familia: 'Remo' }),
    makeEx({ slug: 'estiramiento-pecho', patron: 'Estiramiento', dinamica: 'Isométrico', musculoPrincipal: 'Pecho', cualidades: ['movilidad', 'recovery'], familia: 'Estiramiento' }),
    makeEx({ slug: 'estiramiento-cadera', patron: 'Estiramiento', dinamica: 'Isométrico', musculoPrincipal: 'Glúteo', cualidades: ['movilidad', 'recovery'], familia: 'Estiramiento' }),
    makeEx({ slug: 'squat-rodilla-riesgo', equipo: 'Barra', cargable: true, patron: 'Sentadilla', musculoPrincipal: 'Cuádriceps', cualidades: ['fuerza'], nivel: 'Intermedio', contraindicaciones: ['Rodilla'], familia: 'Sentadilla' }),
    makeEx({ slug: 'no-senior-jump', patron: 'Locomoción', dinamica: 'Explosivo', musculoPrincipal: 'Cuádriceps', cualidades: ['potencia', 'metabólico'], seniorApto: false, familia: 'Salto al cajón' }),
  ];
}

function baseInput(over: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    catalogo: catalogoBase(),
    objetivo: 'hipertrofia',
    enfoque: { kind: 'patron', enfoque: 'full_body' },
    equipo: ['Barra', 'Mancuerna', 'Banca'],
    nivel: 'intermedio',
    senior: false,
    tiempoMin: 55,
    contraindicaciones: [],
    seed: 'user-1|2026-07-24',
    ...over,
  };
}

// ── Filtros ──

describe('filtrarPool (Akinator)', () => {
  it('equipo es filtro DURO: sin barra no hay ejercicios de barra', () => {
    const pool = filtrarPool(baseInput({ equipo: ['Mancuerna'] }));
    expect(pool.find((e) => e.slug === 'squat-barra')).toBeUndefined();
    expect(pool.find((e) => e.slug === 'curl-mancuerna')).toBeDefined();
    expect(pool.find((e) => e.slug === 'flexiones')).toBeDefined(); // peso corporal siempre
  });

  it('contraindicación excluye; la familia sobrevive vía otra variante (sustituye)', () => {
    const pool = filtrarPool(baseInput({ contraindicaciones: ['Rodilla'] }));
    expect(pool.find((e) => e.slug === 'squat-rodilla-riesgo')).toBeUndefined();
    expect(pool.find((e) => e.slug === 'squat-barra')).toBeDefined(); // misma familia Sentadilla
  });

  it('nivel: principiante no ve ejercicios avanzados', () => {
    const pool = filtrarPool(baseInput({ nivel: 'principiante' }));
    expect(pool.find((e) => e.slug === 'deadlift')).toBeUndefined();
  });

  it('senior: solo senior_apto', () => {
    const pool = filtrarPool(baseInput({ senior: true }));
    expect(pool.find((e) => e.slug === 'no-senior-jump')).toBeUndefined();
  });

  it('enfoque por patrón: pierna_traccion = solo bisagra', () => {
    const pool = filtrarPool(baseInput({ enfoque: { kind: 'patron', enfoque: 'pierna_traccion' }, nivel: 'avanzado' }));
    const noEstiramiento = pool.filter((e) => e.patron !== 'Estiramiento');
    expect(noEstiramiento.length).toBeGreaterThan(0);
    expect(noEstiramiento.every((e) => e.patron === 'Bisagra')).toBe(true);
  });

  it('candado de unidades (MB-3.5 #11): con 1 KB los ejercicios "par" quedan fuera', () => {
    const catalogo = [
      ...catalogoBase(),
      makeEx({ slug: 'kb-thruster-doble', equipo: 'Kettlebell', cargable: true, patron: 'Sentadilla', musculoPrincipal: 'Cuádriceps', cualidades: ['fuerza', 'metabólico'], unidadesEquipo: 'par', familia: 'Thruster' }),
      makeEx({ slug: 'kb-goblet-squat', equipo: 'Kettlebell', cargable: true, patron: 'Sentadilla', musculoPrincipal: 'Cuádriceps', cualidades: ['fuerza', 'hipertrofia'], unidadesEquipo: '1', familia: 'Sentadilla' }),
    ];
    const conUno = filtrarPool(baseInput({ catalogo, equipo: ['Kettlebell'], equipoUnidades: { Kettlebell: '1' } }));
    expect(conUno.find((e) => e.slug === 'kb-thruster-doble')).toBeUndefined();
    expect(conUno.find((e) => e.slug === 'kb-goblet-squat')).toBeDefined();
    // Con par (o sin declarar) el "par" sí entra.
    const conPar = filtrarPool(baseInput({ catalogo, equipo: ['Kettlebell'], equipoUnidades: { Kettlebell: 'par' } }));
    expect(conPar.find((e) => e.slug === 'kb-thruster-doble')).toBeDefined();
    const sinDeclarar = filtrarPool(baseInput({ catalogo, equipo: ['Kettlebell'] }));
    expect(sinDeclarar.find((e) => e.slug === 'kb-thruster-doble')).toBeDefined();
  });

  it('candado de unidades: una alternativa de equipo en par mantiene el ejercicio ejecutable', () => {
    const catalogo = [
      ...catalogoBase(),
      makeEx({ slug: 'press-db-o-kb', equipo: 'Mancuerna / Kettlebell', cargable: true, patron: 'Empuje', musculoPrincipal: 'Pecho', cualidades: ['fuerza'], unidadesEquipo: 'par', familia: 'Press' }),
    ];
    // 1 mancuerna pero PAR de KB → ejecutable vía KB.
    const pool = filtrarPool(baseInput({
      catalogo, equipo: ['Mancuerna', 'Kettlebell'],
      equipoUnidades: { Mancuerna: '1', Kettlebell: 'par' },
    }));
    expect(pool.find((e) => e.slug === 'press-db-o-kb')).toBeDefined();
    // 1 y 1 → fuera.
    const pool2 = filtrarPool(baseInput({
      catalogo, equipo: ['Mancuerna', 'Kettlebell'],
      equipoUnidades: { Mancuerna: '1', Kettlebell: '1' },
    }));
    expect(pool2.find((e) => e.slug === 'press-db-o-kb')).toBeUndefined();
  });

  it('vetos de Explorar (MB-3.5 #5): slugsExcluidos es filtro duro', () => {
    const pool = filtrarPool(baseInput({ slugsExcluidos: ['flexiones', 'curl-mancuerna'] }));
    expect(pool.find((e) => e.slug === 'flexiones')).toBeUndefined();
    expect(pool.find((e) => e.slug === 'curl-mancuerna')).toBeUndefined();
    expect(pool.find((e) => e.slug === 'squat-barra')).toBeDefined();
  });

  it('nivel Atleta (MB-3.5 #10): solo el usuario atleta ve ejercicios Atleta', () => {
    const catalogo = [
      ...catalogoBase(),
      makeEx({ slug: 'muscle-up', equipo: 'Barra fija', patron: 'Tracción', musculoPrincipal: 'Dorsal', cualidades: ['fuerza', 'potencia'], nivel: 'Atleta', familia: 'Dominada' }),
    ];
    const avanzado = filtrarPool(baseInput({ catalogo, equipo: ['Barra', 'Mancuerna', 'Banca', 'Barra fija'], nivel: 'avanzado' }));
    expect(avanzado.find((e) => e.slug === 'muscle-up')).toBeUndefined();
    const atleta = filtrarPool(baseInput({ catalogo, equipo: ['Barra', 'Mancuerna', 'Banca', 'Barra fija'], nivel: 'atleta' }));
    expect(atleta.find((e) => e.slug === 'muscle-up')).toBeDefined();
  });

  it('músculo principal compuesto ("Cuádriceps, Glúteo") matchea por cualquiera de sus partes', () => {
    const catalogo = [
      ...catalogoBase(),
      makeEx({ slug: 'broad-jump', patron: 'Sentadilla', dinamica: 'Explosivo', musculoPrincipal: 'Cuádriceps, Glúteo', cualidades: ['potencia'], nivel: 'Intermedio', seniorApto: false, familia: 'Salto horizontal' }),
    ];
    const pool = filtrarPool(baseInput({ catalogo, enfoque: { kind: 'musculos', musculos: ['Glúteo'] } }));
    expect(pool.find((e) => e.slug === 'broad-jump')).toBeDefined();
  });

  it('bro-split: multiselect por músculo', () => {
    const pool = filtrarPool(baseInput({ enfoque: { kind: 'musculos', musculos: ['Bíceps', 'Hombro'] } }));
    const noEstiramiento = pool.filter((e) => e.patron !== 'Estiramiento');
    expect(noEstiramiento.map((e) => e.slug).sort()).toEqual(['curl-mancuerna', 'elevacion-lateral']);
  });
});

// ── Techo de capacidad ──

describe('techo de capacidad', () => {
  it('tiempo_efectivo = min(tiempo_usuario, techo) y avisa honestamente', () => {
    const r = generarRutina(baseInput({ nivel: 'principiante', tiempoMin: 90 }));
    expect(r.techoMin).toBe(TECHO_CAPACIDAD_MIN.principiante);
    expect(r.tiempoEfectivoMin).toBe(35);
    expect(r.recoveryExtraMin).toBe(90 - 35);
    expect(r.avisos.some((a) => a.includes('techo'))).toBe(true);
    expect(r.tiempoTotalSeg).toBeLessThanOrEqual(35 * 60);
  });

  it('senior baja el techo 20%', () => {
    const r = generarRutina(baseInput({ nivel: 'intermedio', senior: true, tiempoMin: 120 }));
    expect(r.techoMin).toBe(Math.round(55 * 0.8));
  });

  it('con menos tiempo que el techo, respeta el tiempo del usuario', () => {
    const r = generarRutina(baseInput({ tiempoMin: 30 }));
    expect(r.tiempoEfectivoMin).toBe(30);
    expect(r.tiempoTotalSeg).toBeLessThanOrEqual(30 * 60);
  });
});

// ── Escalera de slots ──

describe('escalera de slots', () => {
  it('coloca en el orden de la escalera y respeta elegibilidad por pills', () => {
    const r = generarRutina(baseInput({ tiempoMin: 55 }));
    expect(r.bloques.length).toBeGreaterThan(2);
    // El primer bloque es multiarticular pesado (hay barra y pills de fuerza).
    expect(r.bloques[0].slot).toBe('multi_pesado');
    // Orden no-decreciente según la escalera dentro de cada pasada:
    const idx = (s: string) => (s === 'recovery' ? 99 : ESCALERA.indexOf(s as any));
    let prev = -1;
    let pasadas = 0;
    for (const b of r.bloques) {
      const i = idx(b.slot);
      if (i < prev) pasadas++; // reinicio = nueva pasada de la escalera
      prev = i;
    }
    expect(pasadas).toBeLessThanOrEqual(3);
  });

  it('multiarticular pesado exige cargable: flexiones nunca entran a multi_pesado', () => {
    const r = generarRutina(baseInput({ equipo: [] , objetivo: 'hipertrofia' }));
    expect(r.bloques.find((b) => b.slot === 'multi_pesado')).toBeUndefined();
  });

  it('máx multiarticulares pesados por nivel', () => {
    for (const nivel of ['principiante', 'intermedio', 'avanzado', 'atleta'] as const) {
      const r = generarRutina(baseInput({ nivel, tiempoMin: 110, objetivo: 'fuerza', seed: `s-${nivel}` }));
      const pesados = r.bloques.filter((b) => b.slot === 'multi_pesado').length;
      expect(pesados).toBeLessThanOrEqual(MAX_MULTI_PESADOS[nivel]);
    }
  });

  it('remata con 1-2 recovery/prehab', () => {
    const r = generarRutina(baseInput());
    const recov = r.bloques.filter((b) => b.slot === 'recovery');
    expect(recov.length).toBeGreaterThanOrEqual(1);
    expect(recov.length).toBeLessThanOrEqual(2);
    // y quedan al final
    expect(r.bloques.slice(-recov.length).every((b) => b.slot === 'recovery')).toBe(true);
  });

  it('si ayer fue pesado, hoy no hay multi_pesado', () => {
    const r = generarRutina(baseInput({ ayerFuePesado: true }));
    expect(r.bloques.find((b) => b.slot === 'multi_pesado')).toBeUndefined();
    expect(r.avisos.some((a) => a.includes('Ayer'))).toBe(true);
  });
});

// ── Cálculo de tiempo ──

describe('cálculo de tiempo', () => {
  it('Σ series × (trabajo + descanso) + minis × micro', () => {
    // multi_pesado: 4 × (35 + 180) = 860
    expect(tiempoBloqueSeg('multi_pesado', false, false)).toBe(4 * (35 + 180));
    // multi_sarcomerico: 3 × (40 + 90) + 9 minis × 5 = 390 + 45 = 435
    expect(tiempoBloqueSeg('multi_sarcomerico', false, false)).toBe(3 * (40 + 90) + 9 * 5);
  });

  it('unilateral dobla el tiempo de trabajo', () => {
    const bi = tiempoBloqueSeg('unilateral_fuerza', false, false);
    const uni = tiempoBloqueSeg('unilateral_fuerza', true, false);
    expect(uni - bi).toBe(3 * 30); // 3 series × 30 s extra
  });

  it('la suma de bloques cuadra con tiempoTotalSeg', () => {
    const r = generarRutina(baseInput());
    const suma = r.bloques.reduce((s, b) => s + b.tiempoSeg, 0);
    expect(r.tiempoTotalSeg).toBe(suma);
  });

  it('descansos por objetivo: fuerza 2-4 min, metabólico 15-45 s', () => {
    const r = generarRutina(baseInput({ objetivo: 'fuerza', tiempoMin: 55 }));
    for (const b of r.bloques) {
      if (b.slot === 'multi_pesado' || b.slot === 'especifico_fuerza' || b.slot === 'unilateral_fuerza') {
        expect(b.descansoSeg).toBeGreaterThanOrEqual(120);
        expect(b.descansoSeg).toBeLessThanOrEqual(240);
      }
      if (b.slot.endsWith('metabolico')) {
        expect(b.descansoSeg).toBeGreaterThanOrEqual(15);
        expect(b.descansoSeg).toBeLessThanOrEqual(45);
      }
      if (b.miniSeries > 0) {
        expect(b.microDescansoSeg).toBeGreaterThanOrEqual(1);
        expect(b.microDescansoSeg).toBeLessThanOrEqual(9);
      }
    }
  });
});

// ── Rotación determinista ──

describe('rotación', () => {
  it('mismo seed ⇒ misma rutina (determinista)', () => {
    const a = generarRutina(baseInput());
    const b = generarRutina(baseInput());
    expect(a.bloques.map((x) => x.slug)).toEqual(b.bloques.map((x) => x.slug));
  });

  it('anti-repetición: el primario de ayer no se repite si hay alternativa en la familia', () => {
    const hoy = generarRutina(baseInput({ seed: 'u|d1' }));
    const primario = hoy.bloques[0].slug;
    const manana = generarRutina(baseInput({ seed: 'u|d2', slugsRecientes: [primario] }));
    expect(manana.bloques[0].slug).not.toBe(primario);
  });
});

// ── Caso "sin barra" (honestidad) ──

describe('honestidad sin equipo cargable', () => {
  it('objetivo fuerza sin equipo cargable → sesga a resistencia/hipertrofia Y lo dice', () => {
    const r = generarRutina(baseInput({ objetivo: 'fuerza', equipo: [] }));
    expect(r.avisos.some((a) => a.toLowerCase().includes('fuerza'))).toBe(true);
    expect(r.bloques.find((b) => b.slot === 'multi_pesado')).toBeUndefined();
    expect(r.bloques.length).toBeGreaterThan(0); // pero SÍ genera sesión (peso corporal)
  });
});

// ── Caso senior ──

describe('caso senior', () => {
  it('solo ejercicios senior_apto y techo reducido', () => {
    const r = generarRutina(baseInput({ senior: true, nivel: 'intermedio', tiempoMin: 60 }));
    const catalogo = catalogoBase();
    for (const b of r.bloques) {
      const ex = catalogo.find((e) => e.slug === b.slug)!;
      expect(ex.seniorApto).toBe(true);
    }
    expect(r.techoMin).toBe(44); // 55 × 0.8
    expect(r.tiempoTotalSeg).toBeLessThanOrEqual(44 * 60);
  });
});
