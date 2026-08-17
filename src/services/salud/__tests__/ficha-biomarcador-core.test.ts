/**
 * Tests de la ficha por biomarcador.
 *
 * Dos cosas se vigilan aquí y las dos son candados de doctrina, no de código:
 *  1. Que un marcador fuera de ventana SIN convergencia nunca se presente como
 *     hallazgo, y que un derivado nunca levante alarma propia.
 *  2. Que el contenido escrito no nombre enfermedades, diagnósticos, dosis ni
 *     fármacos. Si alguien agrega una ficha nueva con esas palabras, el test la
 *     detiene antes del merge.
 */
import { describe, it, expect } from 'vitest';
import {
  construirFicha, convergenciaDe, relacionadosDe, ventanaParaMostrar,
  direccionDe, lecturaDe, huecosDe,
} from '@/src/services/salud/ficha-biomarcador-core';
import { CONTENIDO_BIOMARCADOR, contenidoDe, FICHAS_ESCRITAS } from '@/src/constants/biomarcador-contenido';
import type { EntradaFicha } from '@/src/services/salud/ficha-biomarcador-core';

const BASE: EntradaFicha = {
  sexo: 'male',
  key: 'vitamina_d',
  valor: 20,
  medidoEn: '2026-05-01',
  fuenteLabel: 'PDF de lab',
  vencido: false,
  serie: [{ value: 20, measured_at: '2026-05-01' }],
  panel: {},
  faseCiclo: null,
};

const ficha = (over: Partial<EntradaFicha>) => construirFicha({ ...BASE, ...over });

// ─────────────────────────────────────────────────────────────────────────────
describe('el filtro de convergencia (nunca alarmar por un marcador solo)', () => {
  it('un marcador fuera de ventana SIN compañía se reporta como ruido, no como hallazgo', () => {
    // Vitamina D baja y nada más en el panel.
    const f = ficha({ key: 'vitamina_d', valor: 15, panel: { vitamina_d: 15 } });
    expect(f.estado).toBe('atencion');
    expect(f.convergencia.tipo).toBe('solo');
    expect(f.convergencia.texto).toMatch(/ruido/i);
  });

  it('un marcador fuera de ventana CON compañía sí es patrón y manda a Mi lectura', () => {
    // Vitamina D baja + magnesio bajo: los dos son candidatas del mismo cruce.
    const f = ficha({
      key: 'vitamina_d',
      valor: 15,
      panel: { vitamina_d: 15, magnesio: 1.6, proteina_c_reactiva_cuantitativa_pcr: 6 },
    });
    expect(f.convergencia.tipo).toBe('converge');
    if (f.convergencia.tipo === 'converge') {
      expect(f.convergencia.acompanantes.length).toBeGreaterThan(0);
      expect(f.convergencia.ruta).toBe('/salud/mi-lectura');
    }
  });

  it('un marcador dentro de ventana no dispara ninguna moderación de alarma', () => {
    const f = ficha({ key: 'vitamina_d', valor: 55, panel: { vitamina_d: 55 } });
    expect(f.estado).not.toBe('atencion');
    expect(f.convergencia.tipo).toBe('sin_alarma');
  });
});

describe('los derivados no levantan hallazgo propio (lo que se rechazó de la referencia)', () => {
  it('un índice calculado se declara derivado aunque esté fuera de ventana', () => {
    const f = ficha({
      key: 'relacion_trigliceridos_hdl',
      valor: 5,
      panel: { relacion_trigliceridos_hdl: 5 },
    });
    expect(f.convergencia.tipo).toBe('derivado');
    expect(f.convergencia.texto).toMatch(/no se mide/i);
    expect(f.convergencia.texto).toMatch(/no levanta un hallazgo/i);
  });

  it('el derivado nombra las piezas de las que sale', () => {
    const c = convergenciaDe('male', 'homair', 'atencion', contenidoDe('homair'), {});
    expect(c.tipo).toBe('derivado');
    expect(c.texto).toMatch(/Glucosa|glucosa/);
    expect(c.texto).toMatch(/Insulina|insulina/);
  });

  it('todo contenido marcado como derivado declara de qué se calcula', () => {
    for (const [key, c] of Object.entries(CONTENIDO_BIOMARCADOR)) {
      if (!c.derivado) continue;
      expect(c.seCalculaDe, `${key} es derivado y no declara sus bases`).toBeTruthy();
      expect(c.seCalculaDe!.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('rangos: nunca inventados, y siempre en la unidad del valor', () => {
  it('un parámetro sin banda en la matriz sale pendiente de rango, no malo', () => {
    const f = ficha({ key: 'parametro_que_no_existe_en_la_matriz', valor: 42 });
    expect(f.estado).toBe('sin_banda');
    expect(f.ventana).toBeNull();
    expect(f.convergencia.tipo).toBe('sin_alarma');
    expect(f.huecos.join(' ')).toMatch(/no define una ventana/i);
  });

  it('la ventana se trae a la unidad del valor guardado, no se compara crudo', () => {
    // La testosterona total se guarda en ng/dL y la matriz la escribe en ng/mL.
    const v = ventanaParaMostrar('male', 'testosterona_total', 993);
    expect(v).not.toBeNull();
    // Si no convirtiera, la ventana saldría en 7-12 y un 993 sano se pintaría rojo.
    expect(v!.hi).toBeGreaterThan(100);
    const f = ficha({ key: 'testosterona_total', valor: 993, panel: { testosterona_total: 993 } });
    expect(f.estado).not.toBe('atencion');
  });

  it('la dirección se decide contra la ventana, no contra el cero', () => {
    expect(direccionDe(5, { lo: 10, hi: 20 })).toBe('bajo');
    expect(direccionDe(15, { lo: 10, hi: 20 })).toBe('dentro');
    expect(direccionDe(25, { lo: 10, hi: 20 })).toBe('alto');
    expect(direccionDe(25, null)).toBe('dentro');
  });
});

describe('el bloque que se pinta depende de dónde cayó TU número', () => {
  it('elige bajo, dentro o alto del contenido escrito', () => {
    const c = contenidoDe('ferritina')!;
    expect(lecturaDe(c, 'bajo')).toBe(c.bajo);
    expect(lecturaDe(c, 'dentro')).toBe(c.dentro);
    expect(lecturaDe(c, 'alto')).toBe(c.alto);
  });

  it('sin contenido escrito no inventa lectura', () => {
    expect(lecturaDe(null, 'alto')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('marcadores relacionados', () => {
  it('salen de los cruces existentes y nunca incluyen al propio marcador', () => {
    const rel = relacionadosDe('male', 'vitamina_d', { vitamina_d: 15 });
    expect(rel.length).toBeGreaterThan(0);
    expect(rel.some((r) => r.key === 'vitamina_d')).toBe(false);
    expect(rel.every((r) => r.porque.length > 0)).toBe(true);
  });

  it('marca con estado null los que la persona no tiene medidos', () => {
    const rel = relacionadosDe('male', 'homocisteina', { homocisteina: 15 });
    expect(rel.some((r) => r.estado === null)).toBe(true);
  });

  it('lee el estado de los que sí tiene', () => {
    const rel = relacionadosDe('male', 'homocisteina', { homocisteina: 15, vitamina_b12: 250 });
    const b12 = rel.find((r) => r.key === 'vitamina_b12');
    expect(b12?.estado).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('estados honestos (nada de pantalla muda)', () => {
  it('con una sola medición no inventa comparación y lo dice', () => {
    const f = ficha({ serie: [{ value: 20, measured_at: '2026-05-01' }] });
    expect(f.delta).toBeNull();
    expect(f.sinComparacion).toBeTruthy();
  });

  it('con dos mediciones lee el movimiento contra TU ventana', () => {
    const f = ficha({
      key: 'vitamina_d',
      valor: 45,
      serie: [
        { value: 20, measured_at: '2025-05-01' },
        { value: 45, measured_at: '2026-05-01' },
      ],
    });
    expect(f.delta).not.toBeNull();
    expect(f.delta!.rumbo).toBe('acerca');
  });

  it('un parámetro sin ficha escrita lo dice de frente en vez de callarse', () => {
    const f = ficha({ key: 'sodio', valor: 140, panel: { sodio: 140 } });
    expect(f.contenido).toBeNull();
    expect(f.lectura).toBeNull();
    expect(f.huecos.join(' ')).toMatch(/no escribimos la ficha/i);
  });

  it('un valor de más de un año avisa antes de que alguien decida con él', () => {
    const h = huecosDe(contenidoDe('ferritina'), 'optimo', null, true, []);
    expect(h.join(' ')).toMatch(/más de un año/i);
  });
});

describe('el ciclo como contexto de lectura', () => {
  it('la progesterona de una usuaria sin fase registrada avisa que se puede leer al revés', () => {
    const f = ficha({ sexo: 'female', key: 'progesterona', valor: 8, faseCiclo: null });
    expect(f.ciclo.show).toBe(true);
    expect(f.ciclo.phaseKnown).toBe(false);
    expect(f.ciclo.note).toMatch(/fase/i);
  });

  it('con la fase registrada la nota dice en cuál se tomó', () => {
    const f = ficha({ sexo: 'female', key: 'estradiol', valor: 80, faseCiclo: 'luteal' });
    expect(f.ciclo.phaseKnown).toBe(true);
    expect(f.ciclo.note).toMatch(/lútea/i);
  });

  it('un marcador no hormonal no arrastra nota de ciclo', () => {
    const f = ficha({ sexo: 'female', key: 'ferritina', valor: 30 });
    expect(f.ciclo.show).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('candado de copy: sin enfermedad, sin diagnóstico, sin dosis', () => {
  const textos = Object.entries(CONTENIDO_BIOMARCADOR).flatMap(([key, c]) => [
    [key, c.queEs], [key, c.bajo], [key, c.dentro], [key, c.alto],
    ...c.queLoMueve.map((t) => [key, t] as const),
    ...c.alteranLaLectura.map((t) => [key, t] as const),
    ...(c.bandera ? [[key, c.bandera] as const] : []),
  ] as [string, string][]);

  const PROHIBIDAS = [
    'diabetes', 'anemia', 'cáncer', 'cancer', 'hashimoto', 'tiroiditis',
    'hipotiroidismo', 'hipertiroidismo', 'osteoporosis', 'infarto', 'gota',
    'síndrome', 'sindrome', 'patología', 'patologia', 'diagnóstico', 'diagnostico',
  ];

  it('ninguna ficha nombra una enfermedad ni un diagnóstico', () => {
    // Palabra completa, no subcadena: "se agota rápido" contiene "gota" y es
    // castellano normal, no un diagnóstico.
    for (const [key, texto] of textos) {
      for (const p of PROHIBIDAS) {
        const suelta = new RegExp(`(^|[^\\wáéíóúñ])${p}([^\\wáéíóúñ]|$)`, 'i');
        expect(suelta.test(texto), `${key} contiene "${p}"`).toBe(false);
      }
    }
  });

  it('ninguna ficha receta una dosis', () => {
    for (const [key, texto] of textos) {
      expect(texto, `${key} trae algo que parece dosis`).not.toMatch(/\d+\s?(mg|mcg|µg|ui|UI|g)\b/);
    }
  });

  it('cero em dash en todo el contenido', () => {
    for (const [key, texto] of textos) {
      expect(texto, `${key} trae em dash`).not.toContain('—');
    }
  });

  it('cada ficha trae sus cuatro bloques y algo que la mueva', () => {
    for (const [key, c] of Object.entries(CONTENIDO_BIOMARCADOR)) {
      expect(c.queEs.length, key).toBeGreaterThan(40);
      expect(c.bajo.length, key).toBeGreaterThan(10);
      expect(c.dentro.length, key).toBeGreaterThan(10);
      expect(c.alto.length, key).toBeGreaterThan(10);
      expect(c.queLoMueve.length, key).toBeGreaterThan(0);
      expect(c.alteranLaLectura.length, key).toBeGreaterThan(0);
    }
  });

  it('el catálogo escrito no se encoge sin que alguien se entere', () => {
    expect(FICHAS_ESCRITAS).toBeGreaterThanOrEqual(34);
  });
});
