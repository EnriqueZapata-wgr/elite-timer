/**
 * Tests de la logica pura de "Mi evaluacion Elite" (ruta 3.3, 3.4 y 3.10).
 * Se corren con `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/evaluacion-elite-core.test.ts`.
 *
 * Candados: los sistemas se ordenan de peor a mejor (att, sub, opt, sin
 * valor; dentro del estado, score mas bajo primero); cada estado tiene su
 * simbolo y su token de color (nunca sinDatos como tinta); valores y rangos
 * se formatean sin inventar unidad ni rango; las filas de functional_dx se
 * convierten en versiones ordenadas con la vigente primero y las que no
 * validan se conservan con evaluacion null; el HTML de respaldo escapa el
 * contenido y trae las secciones.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarEliteV3, type EliteSistema, type EliteV3 } from '../elite-v3-core';
import {
  SECCIONES_UI,
  etiquetaEstado,
  etiquetaEvidencia,
  formatearDiferenciaAnios,
  formatearFecha,
  formatearRango,
  formatearValor,
  htmlDeEvaluacion,
  marcadoresQuePidenAccion,
  ordenarSistemas,
  versionesDesdeFilas,
} from '../evaluacion-elite-core';

const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

function omar(): EliteV3 {
  const r = validarEliteV3(ejemplo);
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

describe('SECCIONES_UI', () => {
  it('son las 15 secciones del esquema, en el orden del documento', () => {
    expect(SECCIONES_UI.map((s) => s.key)).toEqual([
      'inicio', 'conteo', 'edades', 'sistemas', 'contexto', 'marcadores', 'composicion',
      'braverman', 'genetica', 'cruces', 'medico', 'cierre', 'alimentacion', 'suplementos', 'entrenamiento',
    ]);
    for (const s of SECCIONES_UI) expect(s.label.includes('—'), s.key).toBe(false);
  });
});

describe('ordenarSistemas', () => {
  const sis = (key: string, score: number | null, estado: EliteSistema['estado']): EliteSistema =>
    ({ key, nombre: key, score, estado, por_que: 'x' });

  it('peor primero: att, sub, opt y al final sin valor; dentro del estado, score mas bajo primero', () => {
    const entrada = [
      sis('opt80', 80, 'opt'), sis('null', null, null), sis('sub60', 60, 'sub'),
      sis('att30', 30, 'att'), sis('att20', 20, 'att'), sis('sub55', 55, 'sub'),
    ];
    expect(ordenarSistemas(entrada).map((s) => s.key)).toEqual(['att20', 'att30', 'sub55', 'sub60', 'opt80', 'null']);
  });

  it('no muta la entrada', () => {
    const entrada = [sis('b', 50, 'sub'), sis('a', 10, 'att')];
    ordenarSistemas(entrada);
    expect(entrada.map((s) => s.key)).toEqual(['b', 'a']);
  });

  it('con Omar, el primero pide accion y el ultimo no es att', () => {
    const orden = ordenarSistemas(omar().sistemas);
    expect(orden[0].estado).toBe('att');
    expect(orden[orden.length - 1].estado).not.toBe('att');
  });
});

describe('etiquetaEstado', () => {
  it('cada estado tiene simbolo, texto y token de color; sin estado no hay token', () => {
    expect(etiquetaEstado('att')).toEqual({ simbolo: '▲', texto: 'Pide acción', token: 'critico' });
    expect(etiquetaEstado('sub').token).toBe('advertencia');
    expect(etiquetaEstado('opt').token).toBe('exito');
    expect(etiquetaEstado(null).token).toBeNull();
    expect(etiquetaEstado(null).simbolo).toBe('—');
  });

  it('la evidencia tiene los cuatro peldanos y un texto para null', () => {
    expect(etiquetaEvidencia(1)).toContain('laboratorio');
    expect(etiquetaEvidencia(4)).toContain('señal');
    expect(etiquetaEvidencia(null)).toContain('Sin nivel');
  });
});

describe('formato', () => {
  it('valor con unidad, sin unidad, y raya sin valor', () => {
    expect(formatearValor(6.2, 'mg/dL')).toBe('6.2 mg/dL');
    expect(formatearValor(90, null)).toBe('90');
    expect(formatearValor(1.8333, 'mg/dL')).toBe('1.83 mg/dL');
    expect(formatearValor(null, 'mg/dL')).toBe('—');
  });

  it('rango de dos lados, de un lado, o raya', () => {
    expect(formatearRango({ min: 70, max: 99 })).toBe('70 a 99');
    expect(formatearRango({ min: null, max: 30 })).toBe('hasta 30');
    expect(formatearRango({ min: 40, max: null })).toBe('desde 40');
    expect(formatearRango(null)).toBe('—');
  });

  it('fechas: solo mes no inventa dia; con dia lo dice; lo raro se devuelve tal cual', () => {
    expect(formatearFecha('2026-05')).toBe('mayo 2026');
    expect(formatearFecha('2026-05-12')).toBe('12 de mayo de 2026');
    expect(formatearFecha('2026-05-12T10:00:00Z')).toBe('12 de mayo de 2026');
    expect(formatearFecha('hoy')).toBe('hoy');
    expect(formatearFecha(null)).toBe('—');
  });

  it('diferencia de anios con signo', () => {
    expect(formatearDiferenciaAnios(3.24)).toBe('+3.2 años');
    expect(formatearDiferenciaAnios(-1.5)).toBe('-1.5 años');
    expect(formatearDiferenciaAnios(0)).toBe('0 años');
    expect(formatearDiferenciaAnios(null)).toBe('—');
  });

  it('marcadoresQuePidenAccion cuenta los att de grupos y composicion (Omar: 13 + los de composicion)', () => {
    const e = omar();
    const att = marcadoresQuePidenAccion(e);
    const enGrupos = e.marcadores.grupos.flatMap((g) => g.marcadores).filter((m) => m.estado === 'att').length;
    const enComposicion = e.composicion.filas.filter((m) => m.estado === 'att').length;
    expect(att).toHaveLength(enGrupos + enComposicion);
    expect(enGrupos).toBe(13);
  });
});

describe('versionesDesdeFilas', () => {
  const e = omar();

  it('descarta filas sin elite_v3, ordena la mas reciente primero y respeta version_elite', () => {
    const v2 = { ...e, version: 2 };
    const filas = [
      { id: 'a', version: 1, created_at: '2026-01-01', sources_snapshot: { labs: { count: 3 } } },
      { id: 'b', version: 3, created_at: '2026-03-01', sources_snapshot: { elite_v3: e } },
      { id: 'c', version: 4, created_at: '2026-04-01', sources_snapshot: { elite_v3: v2 } },
    ];
    const vs = versionesDesdeFilas(filas);
    expect(vs.map((v) => v.id)).toEqual(['c', 'b']);
    expect(vs[0].version_elite).toBe(2);
    expect(vs[0].version_dx).toBe(4);
    expect(vs[0].evaluacion).not.toBeNull();
    expect(vs[1].evaluacion).not.toBeNull();
  });

  it('una fila con elite_v3 que no valida se conserva con evaluacion null y sus errores', () => {
    const roto = { ...e, cierre: { ...e.cierre, palancas: [e.cierre.palancas[0]] } };
    const vs = versionesDesdeFilas([
      { id: 'x', version: 5, created_at: '2026-05-01', sources_snapshot: { elite_v3: roto } },
    ]);
    expect(vs).toHaveLength(1);
    expect(vs[0].evaluacion).toBeNull();
    expect(vs[0].errores.length).toBeGreaterThan(0);
    expect(vs[0].version_elite).toBe(1);
  });

  it('con una lista vacia devuelve vacio (estado "sin evaluacion", no error)', () => {
    expect(versionesDesdeFilas([])).toEqual([]);
  });
});

describe('htmlDeEvaluacion', () => {
  it('trae cabecera, las secciones y escapa el contenido', () => {
    const e = omar();
    const html = htmlDeEvaluacion(e);
    expect(html).toContain('<h1>Mi evaluación Elite</h1>');
    expect(html).toContain(`versión ${e.version}`);
    expect(html).toContain(e.interpretado_por.evaluacion);
    for (const h of ['Sistemas', 'Marcadores', 'Composición', 'Química cerebral', 'Genética', 'Cruces', 'Pendientes', 'Cierre', 'Alimentación', 'Suplementos', 'Entrenamiento']) {
      expect(html, h).toContain(`<h2>${h}</h2>`);
    }
    expect(html).toContain('mayo 2026');
  });

  it('sin hallazgos geneticos no pinta la seccion Genetica, y escapa etiquetas', () => {
    const e = omar();
    const sinGen: EliteV3 = { ...e, genetica: { intro: null, hallazgos: [], resumen: [] }, contexto: { ...e.contexto, cita: '<script>x</script>' } };
    const html = htmlDeEvaluacion(sinGen);
    expect(html).not.toContain('<h2>Genética</h2>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
