/**
 * 20-sep-2026: el plan de suplementos completo en el contexto de ARGOS.
 * El caso de fondo: "por qué me pusiste magnesio". La fila de
 * user_supplements trae reason, dosage, timing y notes, y ahora viajan.
 */
import { describe, it, expect } from 'vitest';
import {
  construirBloquePlanSuplementos,
  DOSIS_SIN_FIJAR,
  dosisTexto,
  ENCABEZADO_PAUSADOS,
  ENCABEZADO_PLAN_EQUIPO,
  ENCABEZADO_PROPIOS,
  momentoTexto,
  PLAN_SUPLEMENTOS_MAX,
  REGLA_PLAN_SUPLEMENTOS,
  renglonSuplemento,
  type FilaSuplementoArgos,
} from '@/src/services/argos-suplementos-plan-core';
import { palabrasRojasEn } from '@/src/services/elite/elite-v3-core';

function fila(p: Partial<FilaSuplementoArgos> & { name: string }): FilaSuplementoArgos {
  return {
    id: p.name, dosage: null, timing: null, reason: null, notes: null, source: 'coach', is_plan: true,
    is_active: true, amount_per_unit: null, amount_unit: null, units_per_dose: null, dose_times: null,
    ...p,
  };
}

/** El plan de Omar tal como lo inserta el RPC 318 desde elite_v3 (dosis sin fijar, momento solo en magnesio). */
const planOmar: FilaSuplementoArgos[] = [
  fila({ name: 'Magnesio (glicinato)', timing: 'evening', reason: 'Corrige el nivel bajo (1.83) y ayuda a la calma y al sueño profundo. No es defecto: es fuga por alcohol, estrés y antiácidos.' }),
  fila({ name: 'Vitamina D3', reason: 'Vitamina D en 18.7: la corrección más rentable que tienes. Dosis guiada por análisis hasta llegar a 50-70.', notes: 'Va acompañada de K2 y magnesio, y de sol directo en la primera hora del día.' }),
  fila({ name: 'Vitamina K2', reason: 'Acompaña a la vitamina D.' }),
  fila({ name: 'Omega-3 (de pescado pequeño)', reason: 'Riesgo genético alto de corazón, colesterol que se oxida más y tendencia a coagular por encima del promedio.' }),
  fila({ name: 'Vitamina B12 sublingual', reason: 'B12 en 440, funcionalmente justa por los años de antiácidos.', notes: 'Antes de suplementar se valida con ácido metilmalónico. Sin megadosis.' }),
  fila({ name: 'Vitamina B6 en forma activa', reason: 'Tu vía la demanda más que la media.', notes: 'Dosis moderadas: sobre-corregir puede dar irritabilidad e insomnio.' }),
];

describe('renglonSuplemento', () => {
  it('nombre, dosis, momento, porqué y nota, en ese orden', () => {
    const r = renglonSuplemento(fila({ name: 'Magnesio glicinato', dosage: '400 mg', timing: 'evening', reason: 'Nivel bajo (1.83).', notes: 'Con la cena.' }), true);
    expect(r).toBe('Magnesio glicinato: 400 mg, noche. Por qué: Nivel bajo (1.83). Nota: Con la cena.');
  });

  it('dosis sin fijar y hora sin fijar se dicen, nunca se inventan', () => {
    const r = renglonSuplemento(planOmar[1], true);
    expect(r.startsWith(`Vitamina D3: ${DOSIS_SIN_FIJAR}, hora sin fijar. Por qué: Vitamina D en 18.7`)).toBe(true);
    expect(r).toContain('Nota: Va acompañada de K2');
  });

  it('la dosis sale de la ficha; si no, de las columnas numéricas', () => {
    expect(dosisTexto(fila({ name: 'x', dosage: '2 cápsulas de 200 mg' }))).toBe('2 cápsulas de 200 mg');
    expect(dosisTexto(fila({ name: 'x', amount_per_unit: 200, amount_unit: 'mg', units_per_dose: 2 }))).toBe('2 por toma de 200 mg');
    expect(dosisTexto(fila({ name: 'x', amount_per_unit: 5, amount_unit: 'g' }))).toBe('5 g');
    expect(dosisTexto(fila({ name: 'x' }))).toBe(DOSIS_SIN_FIJAR);
    // Lo que el RPC 318 guarda cuando el plan no fija cantidad, traducido a la misma frase.
    expect(dosisTexto(fila({ name: 'x', dosage: 'Sin dosis fijada' }))).toBe(DOSIS_SIN_FIJAR);
  });

  it('20-sep-2026: el guion de la consola, vacío o solo espacios cuentan como dosis sin fijar', () => {
    // La consola escribe dosage '—' cuando el coach no pone dosis; sin esto salía "Magnesio: —, noche".
    for (const d of ['—', '–', '-', '', '   ', ' — ', '--']) {
      expect(dosisTexto(fila({ name: 'x', dosage: d }))).toBe(DOSIS_SIN_FIJAR);
    }
    // Con columnas numéricas, el guion cede el paso a la cantidad real.
    expect(dosisTexto(fila({ name: 'x', dosage: '—', amount_per_unit: 400, amount_unit: 'mg' }))).toBe('400 mg');
    // Un guion DENTRO de una dosis real no es "sin fijar".
    expect(dosisTexto(fila({ name: 'x', dosage: '1-2 cápsulas' }))).toBe('1-2 cápsulas');
    expect(renglonSuplemento(fila({ name: 'Magnesio', dosage: '—', timing: 'evening' }), false)).toBe(`Magnesio: ${DOSIS_SIN_FIJAR}, noche.`);
  });

  it('momentos en prosa; uno desconocido pasa tal cual', () => {
    expect(momentoTexto('morning')).toBe('mañana');
    expect(momentoTexto('with_food')).toBe('con comida');
    expect(momentoTexto('bedtime')).toBe('antes de dormir');
    expect(momentoTexto(null)).toBe('hora sin fijar');
    expect(momentoTexto('custom')).toBe('custom');
  });

  it('varias tomas al día se listan', () => {
    const r = renglonSuplemento(fila({ name: 'Creatina', dosage: '5 g', timing: 'morning', dose_times: ['08:00', '20:00'] }), false);
    expect(r).toBe('Creatina: 5 g, mañana, tomas a las 08:00 y 20:00.');
  });
});

describe('construirBloquePlanSuplementos con el plan de Omar', () => {
  const bloque = construirBloquePlanSuplementos({ asignadoPor: 'Enrique Zapata', filas: planOmar });

  it('encabezado con quién lo asignó y un renglón por suplemento con su porqué', () => {
    expect(bloque.startsWith(`${ENCABEZADO_PLAN_EQUIPO} (asignado por Enrique Zapata):\n`)).toBe(true);
    for (const s of planOmar) expect(bloque).toContain(`- ${s.name}:`);
    expect(bloque).toContain('- Magnesio (glicinato): dosis sin fijar en el plan, noche. Por qué: Corrige el nivel bajo (1.83)');
    expect(bloque.split('Por qué:').length - 1).toBe(6);
  });

  it('sin propios ni pausados no aparecen esas líneas', () => {
    expect(bloque).not.toContain(ENCABEZADO_PROPIOS);
    expect(bloque).not.toContain(ENCABEZADO_PAUSADOS);
  });

  it('cabe en el tope, sin palabras rojas ni em dashes', () => {
    expect(bloque.length).toBeLessThanOrEqual(PLAN_SUPLEMENTOS_MAX);
    expect(palabrasRojasEn(bloque)).toEqual([]);
    expect(bloque.includes('—')).toBe(false);
    expect(REGLA_PLAN_SUPLEMENTOS.includes('—')).toBe(false);
  });

  it('20-sep-2026: si el resumen de la evaluación y el renglón vivo difieren, manda el renglón vivo', () => {
    // El resumen Elite es una foto del día de la evaluación; user_supplements es lo que el equipo ajustó después.
    expect(REGLA_PLAN_SUPLEMENTOS).toContain(`Si el resumen de la evaluación y el renglón "${ENCABEZADO_PLAN_EQUIPO}" difieren`);
    expect(REGLA_PLAN_SUPLEMENTOS).toContain('sigue o está pausado, manda el renglón del plan');
    expect(REGLA_PLAN_SUPLEMENTOS).toContain('ajustó después de la evaluación');
    expect(palabrasRojasEn(REGLA_PLAN_SUPLEMENTOS)).toEqual([]);
  });

  it('sin firma conocida el plan se atribuye al equipo ATP', () => {
    const b = construirBloquePlanSuplementos({ asignadoPor: null, filas: planOmar.slice(0, 1) });
    expect(b.startsWith(`${ENCABEZADO_PLAN_EQUIPO} (asignado por tu equipo ATP):`)).toBe(true);
  });
});

describe('propios y pausados', () => {
  const filas: FilaSuplementoArgos[] = [
    ...planOmar.slice(0, 2),
    fila({ name: 'Creatina', dosage: '5 g', timing: 'morning', source: 'manual', reason: 'La tomo desde hace años.' }),
    fila({ name: 'Zinc', dosage: '15 mg', source: 'coach', is_active: false }),
    fila({ name: 'Ashwagandha', source: 'manual', is_active: false }),
  ];
  const bloque = construirBloquePlanSuplementos({ asignadoPor: 'Enrique Zapata', filas });

  it('los propios van aparte, marcados como no del plan y sin porqué', () => {
    expect(bloque).toContain(`${ENCABEZADO_PROPIOS}: Creatina: 5 g, mañana.`);
    expect(bloque).not.toContain('La tomo desde hace años');
  });

  it('los pausados van marcados para que no se sugieran ni se pregunten como faltantes', () => {
    expect(bloque).toContain(`${ENCABEZADO_PAUSADOS}: Zinc (del plan); Ashwagandha (propio).`);
    expect(ENCABEZADO_PAUSADOS).toContain('no los sugieras de nuevo ni preguntes por ellos como si faltaran');
    // Un pausado NO aparece como renglón del plan activo.
    expect(bloque).not.toContain('- Zinc:');
  });

  it('is_active null cuenta como activo (default de la columna)', () => {
    const b = construirBloquePlanSuplementos({ asignadoPor: null, filas: [fila({ name: 'Omega', is_active: null })] });
    expect(b).toContain('- Omega:');
    expect(b).not.toContain(ENCABEZADO_PAUSADOS);
  });

  it('sin filas no hay bloque', () => {
    expect(construirBloquePlanSuplementos({ asignadoPor: 'x', filas: [] })).toBe('');
    expect(construirBloquePlanSuplementos(null)).toBe('');
    expect(construirBloquePlanSuplementos(undefined)).toBe('');
  });
});

describe('tope', () => {
  it('con muchas filas se cuenta lo que no cabe en vez de cortar a media frase', () => {
    const muchas = Array.from({ length: 60 }, (_, i) => fila({ name: `Suplemento ${i}`, dosage: '100 mg', timing: 'morning', reason: 'Motivo largo '.repeat(8) }));
    const b = construirBloquePlanSuplementos({ asignadoPor: 'E', filas: muchas });
    expect(b.length).toBeLessThanOrEqual(PLAN_SUPLEMENTOS_MAX);
    expect(b).toContain('(+');
    expect(b).toContain('más)');
  });
});
