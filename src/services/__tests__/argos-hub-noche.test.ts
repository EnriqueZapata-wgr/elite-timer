/**
 * HUB-ARGOS (31-ago-2026) — los candados de la noche del hub:
 *  · 13.1 el catálogo del hub apunta solo a rutas reales;
 *  · el contrato /argos-chat?contexto=&ref= (argos-contexto-core);
 *  · 13.2 el conteo de hábitos de ARGOS es la derivación del renglón de HOY;
 *  · 13.3 la recurrencia sale del dato (coach-recurrencia-core);
 *  · 13.4 el clasificador del principio puntúa, no elige por orden.
 * Mismos casos que se ejecutaron en node la noche del cambio.
 */
import { describe, it, expect } from 'vitest';
import { APP_ROUTES } from '@/src/constants/app-routes.generated';
import { SECCIONES_HUB, rutasDelHub } from '@/src/constants/argos-hub';
import {
  CLAVES_CONTEXTO, parsearContextoDeRuta, preguntaInicialDe, lineasDe, TOPE_LINEAS_RECETA,
  recetaDesdeCatalogo, recetaDesdePropia, construirInyeccionContexto,
} from '@/src/services/argos-contexto-core';
import { contarHabitosHoy, keysDelRenglon, type EntradaHabitosHoy } from '@/src/services/argos-habitos-hoy-core';
import { buildContextPrompt } from '@/src/services/argos-context-core';
import { senalRecurre, desdeVentana } from '@/src/services/coach-recurrencia-core';
import { selectCascadeLevel } from '@/src/lib/coach-engine/cascade';
import { detectPrincipleInResponse, puntuarPrincipios } from '@/src/services/coach-principio-core';

describe('13.1 · el hub solo ofrece puertas reales', () => {
  it('cada destino es una ruta del mapa generado', () => {
    for (const ruta of rutasDelHub()) expect(APP_ROUTES).toContain(ruta);
  });
  it('ninguna línea de copy trae em dash', () => {
    for (const s of SECCIONES_HUB) for (const f of s.filas) {
      expect(f.linea).not.toContain('—');
      expect(f.titulo).not.toContain('—');
    }
  });
  it('las claves de "que te explique" son claves del contrato del chat', () => {
    const sec = SECCIONES_HUB.find((s) => s.key === 'explicar')!;
    for (const f of sec.filas) expect(CLAVES_CONTEXTO).toContain(f.destino.params?.contexto);
  });
});

describe('contrato /argos-chat?contexto=&ref=', () => {
  it('clave desconocida → null; edad_atp sin ref; array de expo-router toma el primero', () => {
    expect(parsearContextoDeRuta('nada', 'x')).toBeNull();
    expect(parsearContextoDeRuta('edad_atp', undefined)).toEqual({ clave: 'edad_atp', ref: null });
    expect(parsearContextoDeRuta(['labs'], [])).toEqual({ clave: 'labs', ref: null });
  });
  it('receta exige uuid', () => {
    expect(parsearContextoDeRuta('receta', '123')).toBeNull();
    expect(parsearContextoDeRuta('receta', ' 3f2504e0-4f89-41d3-9a0c-0305e82c3301 '))
      .toEqual({ clave: 'receta', ref: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' });
  });
  it('la pregunta inicial existe por clave y no trae em dash', () => {
    for (const clave of CLAVES_CONTEXTO) {
      const q = preguntaInicialDe({ clave, ref: null });
      expect(q.length).toBeGreaterThan(10);
      expect(q).not.toContain('—');
    }
  });
  it('lineasDe normaliza strings y objetos y respeta el tope', () => {
    expect(lineasDe(['Huevo', ' ', { name: 'Avena', amount: 50, unit: 'g' }, { nombre: 'Sal' }, { x: 1 }, 7]))
      .toEqual(['Huevo', 'Avena: 50 g', 'Sal']);
    expect(lineasDe(Array.from({ length: 60 }, (_, i) => `i${i}`)).length).toBe(TOPE_LINEAS_RECETA);
    expect(lineasDe(null)).toEqual([]);
  });
  it('receta: bloque con instrucción de MODIFICAR y sin macros inventados', () => {
    const r = recetaDesdeCatalogo({
      name: 'Bowl', ingredients: ['Arroz'], instructions: [{ step: 'Cocer' }],
      servings: 2, calories: '450', protein_g: 30, carbs_g: null, fat_g: 12,
    });
    const inj = construirInyeccionContexto({ clave: 'receta', ref: 'x' }, { receta: r });
    expect(inj).toContain('MODIFICAR');
    expect(inj).toContain('Receta: Bowl');
    expect(inj).toContain('1. Cocer');
    expect(inj).toContain('450 kcal');
    expect(inj).not.toContain('carbohidratos');
    const propia = recetaDesdePropia({ name: 'Mi licuado', ingredients: [{ name: 'Plátano', quantity: 1 }], total_calories: 200, total_protein: '8' });
    expect(propia.origen).toBe('propia');
    expect(propia.ingredientes).toEqual(['Plátano: 1']);
    expect(construirInyeccionContexto({ clave: 'receta', ref: 'x' }, { receta: null })).toContain('no se pudo cargar');
  });
});

describe('13.2 · hábitos de hoy = el renglón de HOY', () => {
  const base: EntradaHabitosHoy = {
    persistedBoolKeys: null, habitStates: null, biologicalSex: null, cycleMode: null, blob: null, ledgerHoy: [],
  };
  it('defaults ∪ MANDATORY, sin period_log para sexo desconocido', () => {
    const keys = keysDelRenglon(base);
    expect(keys).toEqual(expect.arrayContaining(['journal', 'checkin', 'cardio']));
    expect(keys).not.toContain('period_log');
    expect(contarHabitosHoy(base).total).toBe(keys.length);
  });
  it('no verificado palomea por blob; verificado por ledger, nunca por blob', () => {
    const r = contarHabitosHoy({ ...base, blob: { sunlight: true, checkin: true }, ledgerHoy: ['journal'] });
    expect(r.hechos).toBe(2);
    expect(r.nombresHechos).toEqual(expect.arrayContaining(['Luz solar', 'Journal']));
  });
  it('graduado y reposo salen del renglón', () => {
    const e = { ...base, habitStates: [{ habit_key: 'sunlight', state: 'graduado' as const }, { habit_key: 'journal', state: 'reposo' as const }] };
    expect(keysDelRenglon(e)).not.toContain('sunlight');
    expect(contarHabitosHoy(e).total).toBe(keysDelRenglon(base).length - 2);
  });
  it('period_log solo female y no en modo acompañante', () => {
    expect(keysDelRenglon({ ...base, persistedBoolKeys: ['period_log'], biologicalSex: 'female' })).toContain('period_log');
    expect(keysDelRenglon({ ...base, persistedBoolKeys: ['period_log'], biologicalSex: 'female', cycleMode: 'acompanante' })).not.toContain('period_log');
    expect(keysDelRenglon({ ...base, persistedBoolKeys: ['period_log'], biologicalSex: 'male' })).not.toContain('period_log');
  });
  it('el prompt ya no inventa el /20 y pinta el renglón de hábitos con su regla', () => {
    const p = buildContextPrompt({
      name: '', todayElectrons: { earned: 3.5, total: null },
      habitosHoy: { total: 9, hechos: 2, nombresHechos: ['Luz solar', 'Journal'], nombresPendientes: ['Meditación'] },
    });
    expect(p).toContain('Electrones ganados hoy: 3.5');
    expect(p).not.toContain('3.5/');
    expect(p).toContain('Hábitos de hoy (los mismos que ve en HOY): 2 de 9 hechos.');
    expect(p).toContain('REGLA HÁBITOS DE HOY');
  });
});

describe('13.3 · la recurrencia sale del dato', () => {
  const ahora = Date.parse('2026-08-31T03:00:00Z');
  const iso = (dias: number) => new Date(ahora - dias * 86400000).toISOString();
  it('sin turnos, verde reciente, fecha rota o futura → false', () => {
    expect(senalRecurre([], ahora)).toBe(false);
    expect(senalRecurre(null, ahora)).toBe(false);
    expect(senalRecurre([{ question_2_result: 'verde', created_at: iso(1) }], ahora)).toBe(false);
    expect(senalRecurre([{ question_2_result: 'rojo', created_at: 'ayer' }], ahora)).toBe(false);
    expect(senalRecurre([{ question_2_result: 'rojo', created_at: iso(-1) }], ahora)).toBe(false);
  });
  it('amarillo o rojo dentro de la ventana → true; fuera → false', () => {
    expect(senalRecurre([{ question_2_result: 'amarillo', created_at: iso(3) }], ahora)).toBe(true);
    expect(senalRecurre([{ question_2_result: 'rojo', created_at: iso(13) }], ahora)).toBe(true);
    expect(senalRecurre([{ question_2_result: 'rojo', created_at: iso(15) }], ahora)).toBe(false);
    expect(desdeVentana(ahora)).toBe(new Date(ahora - 14 * 86400000).toISOString());
  });
  it('con recurrencia real la cascada alcanza el nivel 4', () => {
    const rec = senalRecurre([{ question_2_result: 'rojo', created_at: iso(2) }], ahora);
    expect(selectCascadeLevel('rojo', rec)).toBe(4);
    expect(selectCascadeLevel('amarillo', rec)).toBe(3);
    expect(selectCascadeLevel('verde', rec)).toBe(1);
  });
});

describe('13.4 · el principio se elige por puntaje, no por orden', () => {
  it('postura (1) pierde contra mitocondria/AMPK/autofagia (3) aunque biomecánica vaya antes', () => {
    expect(detectPrincipleInResponse(
      'Cuida la postura al sentarte. La mitocondria produce energía; la AMPK se activa con ayuno y la autofagia limpia.',
    )).toBe('mecanismos_biologicos');
  });
  it('identidad va primero en la lista y pierde 1 a 2', () => {
    expect(detectPrincipleInResponse('Recuerda quién eres. Tu propósito manda: para qué lo haces es lo que te sostiene.')).toBe('proposito');
  });
  it('empate en ocurrencias → especificidad; empate total → primero en el texto', () => {
    expect(detectPrincipleInResponse('La cadena de transporte importa tanto como la postura.')).toBe('mecanismos_biologicos');
    expect(detectPrincipleInResponse('Tu estándar mueve la mitocondria.')).toBe('estandar');
    expect(detectPrincipleInResponse('La mitocondria responde a tu estándar.')).toBe('mecanismos_biologicos');
  });
  it('regex global sin lastIndex sucio; cuenta repeticiones; vacío → null', () => {
    for (let i = 0; i < 3; i++) expect(detectPrincipleInResponse('postura postura')).toBe('biomecanica');
    expect(puntuarPrincipios('postura, postura, postura').find((p) => p.principle === 'biomecanica')?.ocurrencias).toBe(3);
    expect(detectPrincipleInResponse('')).toBeNull();
  });
});
