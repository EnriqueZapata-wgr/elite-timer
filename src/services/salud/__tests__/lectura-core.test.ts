/**
 * NOCHE-3 — tests del núcleo de LA LECTURA.
 *
 * Lo que se protege aquí, en orden de importancia:
 *   1. CONVERGENCIA. Un cruce jamás se enciende con una señal sola. Ese es el
 *      error caro de la competencia: inflar hallazgos con marcadores sueltos.
 *   2. CERO RANGOS INVENTADOS. Un parámetro que no está en la matriz V7/V6 no
 *      produce señal, pase lo que pase.
 *   3. HONESTIDAD. Sin material la lectura se declara vacía y lista qué falta;
 *      con material y sin patrón lo dice en vez de inventar una prioridad.
 *   4. COPY. Sin em dash y sin nombre de enfermedad en lo que ve el usuario.
 */
import { describe, it, expect } from 'vitest';
import {
  construirLectura,
  construirSeñales,
  construirSintesis,
  completitudDe,
  etiquetaCompletitud,
  estadoDeScore,
  faltantesDe,
  leerParametro,
  REGLAS_CRUCE,
  SNAPSHOT_VACIO,
  type LecturaSnapshot,
} from '../lectura-core';

const lab = (value: number, dias = 10) => ({
  value,
  measured_at: new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10),
  is_stale: false,
});

function snap(over: Partial<LecturaSnapshot> = {}): LecturaSnapshot {
  return { ...SNAPSHOT_VACIO, ...over };
}

// ── 1. Convergencia ─────────────────────────────────────────────────────────

describe('un cruce necesita convergencia', () => {
  it('una sola señal NO enciende nada', () => {
    // Ferritina altísima, sola. Es un dato, no una lectura.
    const l = construirLectura(snap({ labs: { ferritina: lab(400) } }));
    expect(l.cruces).toHaveLength(0);
  });

  it('dos señales del mismo eje SÍ encienden el cruce', () => {
    const l = construirLectura(snap({
      labs: { ferritina: lab(400), proteina_c_reactiva_cuantitativa_pcr: lab(3) },
    }));
    expect(l.cruces.map((c) => c.key)).toContain('terreno_inflamatorio');
  });

  it('ninguna regla del catálogo puede pedir menos de dos señales', () => {
    for (const r of REGLAS_CRUCE) {
      expect(Math.max(2, r.minimo), r.key).toBeGreaterThanOrEqual(2);
    }
  });

  it('la regla con ancla no dispara si el ancla está en rango', () => {
    // homocisteina en rango + B12 baja: sin el ancla no hay historia que contar.
    const l = construirLectura(snap({ labs: { homocisteina: lab(7), vitamina_b12: lab(150) } }));
    expect(l.cruces.map((c) => c.key)).not.toContain('metilacion_b');
  });

  it('la regla con ancla dispara cuando el ancla y una acompañante coinciden', () => {
    const l = construirLectura(snap({ labs: { homocisteina: lab(18), vitamina_b12: lab(150) } }));
    expect(l.cruces.map((c) => c.key)).toContain('metilacion_b');
  });

  it('la regla que exige química no dispara sin el Braverman', () => {
    const base = { labs: { magnesio: lab(1.4) }, sintomasActivos: [] };
    const sinQuimica = construirLectura(snap(base));
    expect(sinQuimica.cruces.map((c) => c.key)).not.toContain('ancla_quimica');
  });
});

// ── 2. Cero rangos inventados ───────────────────────────────────────────────

describe('nunca se inventa un rango', () => {
  it('un parámetro fuera de la matriz no produce señal', () => {
    expect(leerParametro('male', 'marcador_que_no_existe', 42, 'labs')).toBeNull();
  });

  it('las señales solo salen de claves que la matriz reconoce', () => {
    const señales = construirSeñales(snap({
      labs: { ferritina: lab(400), inventado_total: lab(1) },
    }));
    expect(Object.keys(señales)).toEqual(['ferritina']);
  });

  it('el estado se deriva del score de la matriz, no de un umbral propio', () => {
    expect(estadoDeScore(100)).toBe('optimo');
    expect(estadoDeScore(80)).toBe('aceptable');
    expect(estadoDeScore(50)).toBe('aceptable');
    expect(estadoDeScore(25)).toBe('atencion');
    expect(estadoDeScore(0)).toBe('atencion');
  });

  it('la composición entra por las claves de la matriz y el músculo se deriva con el peso', () => {
    const señales = construirSeñales(snap({
      composicion: {
        pesoKg: 80, grasaPct: 30, musculoKg: 30, visceral: 12, agarreKg: null,
        sistolica: null, diastolica: null, vo2: null, pasos: null, ejercicioMin: null,
      },
    }));
    expect(señales.musculo_esqueletico?.value).toBeCloseTo(37.5, 5);
    expect(señales.grasa_corporal).toBeDefined();
  });

  it('sin peso no se deriva el porcentaje de músculo', () => {
    const señales = construirSeñales(snap({
      composicion: {
        pesoKg: null, grasaPct: null, musculoKg: 30, visceral: null, agarreKg: null,
        sistolica: null, diastolica: null, vo2: null, pasos: null, ejercicioMin: null,
      },
    }));
    expect(señales.musculo_esqueletico).toBeUndefined();
  });
});

// ── 3. Honestidad ───────────────────────────────────────────────────────────

describe('estados honestos', () => {
  it('sin nada, la lectura se declara vacía y dice qué falta', () => {
    const l = construirLectura(snap());
    expect(l.vacia).toBe(true);
    expect(l.completitud).toBe(0);
    expect(l.cruces).toHaveLength(0);
    expect(l.faltantes.length).toBeGreaterThan(0);
    // Cada faltante trae a dónde ir: nunca un callejón sin salida.
    for (const f of l.faltantes) {
      expect(f.route.startsWith('/'), f.key).toBe(true);
      expect(f.accionLabel.length, f.key).toBeGreaterThan(0);
    }
  });

  it('con datos y sin patrón lo dice, en lugar de inventar una prioridad', () => {
    const l = construirLectura(snap({ labs: { ferritina: lab(100) } }));
    expect(l.cruces).toHaveLength(0);
    expect(l.sintesis.join(' ')).toContain('no aparece ningún cruce');
  });

  it('a una mujer sin fase del ciclo se le dice por qué importa', () => {
    const f = faltantesDe(snap({ sexo: 'female' }));
    expect(f.some((x) => x.key === 'ciclo')).toBe(true);
    expect(f.find((x) => x.key === 'ciclo')?.route).toBe('/cycle');
  });

  it('a un hombre no se le pide la fase del ciclo', () => {
    expect(faltantesDe(snap({ sexo: 'male' })).some((x) => x.key === 'ciclo')).toBe(false);
  });

  it('la completitud mide material, no salud', () => {
    expect(completitudDe(snap())).toBe(0);
    const lleno = completitudDe(snap({
      labs: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k${i}`, lab(1)])),
      composicion: {
        pesoKg: 80, grasaPct: 20, musculoKg: null, visceral: null, agarreKg: null,
        sistolica: null, diastolica: null, vo2: null, pasos: null, ejercicioMin: null,
      },
      quimica: { dominante: 'dopamine', deficitPrincipal: 'gaba' },
      historiaCategorias: 3,
      cronotipo: 'oso',
      sintomasActivos: ['cansancio'],
    }));
    expect(lleno).toBe(100);
    expect(etiquetaCompletitud(lleno)).toBe('Lectura robusta');
    expect(etiquetaCompletitud(0)).toBe('Sin material todavía');
  });
});

// ── 4. Orden y síntesis ─────────────────────────────────────────────────────

describe('la síntesis ordena, no adorna', () => {
  it('los cruces salen ordenados por impacto', () => {
    const l = construirLectura(snap({
      labs: {
        ferritina: lab(400),
        proteina_c_reactiva_cuantitativa_pcr: lab(3),
        homocisteina: lab(18),
        vitamina_b12: lab(150),
      },
    }));
    const pesos = l.cruces.map((c) => c.peso);
    expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
    expect(l.cruces[0].key).toBe('terreno_inflamatorio');
  });

  it('nombra la prioridad número uno en la primera frase de prioridad', () => {
    const l = construirLectura(snap({
      labs: { ferritina: lab(400), proteina_c_reactiva_cuantitativa_pcr: lab(3) },
    }));
    expect(l.sintesis.some((f) => f.includes('Por encima de todo hay una prioridad'))).toBe(true);
  });

  it('contrasta la edad por sangre con la del físico cuando existen las dos', () => {
    const frases = construirSintesis(
      snap({ edad: { cronologica: 50, integral: 58, porSangre: 44.6, porFisico: 63.7 } }),
      [],
    );
    expect(frases[0]).toContain('44.6');
    expect(frases[0]).toContain('63.7');
    expect(frases[0]).toContain('tu físico');
  });

  it('sin edad y sin cruces no fabrica prosa', () => {
    expect(construirSintesis(snap(), [])).toEqual([]);
  });
});

// ── 5. Copy ─────────────────────────────────────────────────────────────────

describe('el copy respeta las reglas de la casa', () => {
  const textos = REGLAS_CRUCE.flatMap((r) => [r.titular, r.logica, r.convergencia, r.regla, r.bandera ?? '', r.destino.label]);

  it('cero em dash en el copy que ve el usuario', () => {
    for (const t of textos) expect(t.includes('—'), t.slice(0, 40)).toBe(false);
    for (const f of faltantesDe(snap())) {
      expect(f.titulo.includes('—')).toBe(false);
      expect(f.porque.includes('—')).toBe(false);
    }
  });

  it('sin nombre de enfermedad ni de fármaco', () => {
    const prohibidas = [
      'diabetes', 'hipotiroidismo', 'hipertiroidismo', 'lupus', 'cáncer', 'anemia',
      'hipogonadismo', 'esclerosis', 'celiaquía', 'depresión', 'síndrome metabólico',
      'metformina', 'levotiroxina', 'estatina', 'testosterona sintética',
    ];
    const blob = textos.join(' ').toLowerCase();
    for (const p of prohibidas) expect(blob.includes(p), p).toBe(false);
  });

  it('cada cruce sabe a dónde mandar a ver el dato crudo', () => {
    for (const r of REGLAS_CRUCE) {
      expect(r.destino.route.startsWith('/'), r.key).toBe(true);
    }
  });

  it('las llaves del catálogo son únicas', () => {
    const keys = REGLAS_CRUCE.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
