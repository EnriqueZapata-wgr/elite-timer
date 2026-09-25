/**
 * progreso-core (25-sep-2026, APP_ELITE_DX). Candados:
 *  - la constancia se lee "X% · N de M" y los motivos van en voz del cliente;
 *  - la señal usa la MISMA regla que la consola;
 *  - el cuerpo nunca inventa un cambio de 0 con un solo registro;
 *  - la línea de servicio no adivina mientras carga o si no se pudo leer;
 *  - cero em dashes y cero palabras rojas en el copy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TEXTO_CONSTANCIA_CLIENTE,
  vistaConstancia,
  huboSenalEnVentana,
  resumenCuerpo,
  fechaCorta,
  lineaServicio,
  herramientasDeTu,
  type FilaMedida,
} from '@/src/services/elite-dx/progreso-core';
import { TEXTO_SIN_ADHERENCIA, adherenciaIntervenciones } from '@/src/services/consola/consola-core';
import { APP_BY_KEY, visibleApps } from '@/src/constants/app-registry';

const HOY = '2026-09-25';
const ROJAS = /diagn[oó]stic|tratamiento|terap[eé]utic|previene|cura\b|receta m[eé]dica|intervenci[oó]n/i;

function fila(p: Partial<FilaMedida> & { date: string }): FilaMedida {
  return { weight_kg: null, waist_cm: null, body_fat_pct: null, ...p };
}

describe('vistaConstancia', () => {
  it('con número: "X% · N de M"', () => {
    const v = vistaConstancia({ estado: 'ok', pct: 64, hechos: 9, esperados: 14 });
    expect(v).toEqual({
      tipo: 'numero',
      cifra: '64% · 9 de 14',
      detalle: 'Prácticas palomeadas de las que tocaban en los últimos 14 días.',
    });
  });

  it('un 0% real (hubo señal) se enseña como número, no como motivo', () => {
    const a = adherenciaIntervenciones([{ id: 'a', activadaEl: '2026-01-01' }], [], HOY, true);
    const v = vistaConstancia(a);
    expect(v.tipo).toBe('numero');
    expect((v as { cifra: string }).cifra).toBe('0% · 0 de 14');
  });

  it('cada motivo sale en la voz del cliente, distinto del de la consola', () => {
    expect(vistaConstancia({ estado: 'sinDato', motivo: 'sin-intervenciones' }))
      .toEqual({ tipo: 'motivo', texto: 'Tu plan todavía no tiene prácticas activas.' });
    expect(vistaConstancia({ estado: 'sinDato', motivo: 'recien-cargado' }))
      .toEqual({ tipo: 'motivo', texto: 'Tu plan empieza hoy. Mañana ya verás tu constancia.' });
    expect(vistaConstancia({ estado: 'sinDato', motivo: 'sin-senal' }))
      .toEqual({ tipo: 'motivo', texto: 'Todavía no registras tus prácticas. Palomea en Hoy y aquí verás tu constancia.' });
    for (const k of Object.keys(TEXTO_CONSTANCIA_CLIENTE) as (keyof typeof TEXTO_CONSTANCIA_CLIENTE)[]) {
      expect(TEXTO_CONSTANCIA_CLIENTE[k]).not.toBe(TEXTO_SIN_ADHERENCIA[k]);
    }
  });

  it('el copy no trae em dash ni palabras rojas', () => {
    const textos = [
      ...Object.values(TEXTO_CONSTANCIA_CLIENTE),
      (vistaConstancia({ estado: 'ok', pct: 1, hechos: 1, esperados: 1 }) as { detalle: string }).detalle,
    ];
    for (const t of textos) {
      expect(t.includes('—')).toBe(false);
      expect(ROJAS.test(t)).toBe(false);
    }
  });
});

describe('huboSenalEnVentana (la regla de la consola)', () => {
  const desde = '2026-09-12';
  it('sin fuentes con fecha: no', () => {
    expect(huboSenalEnVentana([{ fuente: 'comida', fecha: null }], HOY, desde)).toBe(false);
  });
  it('rastro antes de la ventana: no', () => {
    expect(huboSenalEnVentana([{ fuente: 'comida', fecha: '2026-09-11' }], HOY, desde)).toBe(false);
  });
  it('rastro el primer día de la ventana: sí', () => {
    expect(huboSenalEnVentana([{ fuente: 'comida', fecha: '2026-09-11' }, { fuente: 'agua', fecha: desde }], HOY, desde)).toBe(true);
  });
});

describe('resumenCuerpo', () => {
  it('sin filas: nada (la pantalla dice "Aún no registras medidas")', () => {
    expect(resumenCuerpo([], HOY)).toEqual([]);
  });

  it('un solo registro: valor sin cambio inventado', () => {
    const r = resumenCuerpo([fila({ date: '2026-09-20', weight_kg: 82.4 })], HOY);
    expect(r).toEqual([{ key: 'peso', etiqueta: 'Peso', valor: '82.4 kg', fecha: '2026-09-20', cambio: null }]);
  });

  it('cambio contra el registro MÁS VIEJO de esa métrica, sin importar el orden de llegada', () => {
    const r = resumenCuerpo([
      fila({ date: '2026-09-01', weight_kg: 84, waist_cm: 95 }),
      fila({ date: '2026-09-24', weight_kg: 82.8 }),
      fila({ date: '2026-08-03', weight_kg: 85.2 }),
      fila({ date: '2026-09-10', waist_cm: 93.5 }),
    ], HOY);
    const peso = r.find((m) => m.key === 'peso');
    const cintura = r.find((m) => m.key === 'cintura');
    expect(peso).toEqual({ key: 'peso', etiqueta: 'Peso', valor: '82.8 kg', fecha: '2026-09-24', cambio: '-2.4 kg desde el 3 ago' });
    expect(cintura).toEqual({ key: 'cintura', etiqueta: 'Cintura', valor: '93.5 cm', fecha: '2026-09-10', cambio: '-1.5 cm desde el 1 sep' });
    expect(r.find((m) => m.key === 'grasa')).toBeUndefined();
  });

  it('subida con signo +, valor con % pegado, cambio en puntos, y año cuando no es el de hoy', () => {
    const r = resumenCuerpo([
      fila({ date: '2025-12-30', body_fat_pct: 18 }),
      fila({ date: '2026-09-20', body_fat_pct: 19.25 }),
    ], HOY);
    expect(r[0].valor).toBe('19.3%');
    expect(r[0].cambio).toBe('+1.3 puntos desde el 30 dic 2025');
  });

  it('la grasa corporal cambia en puntos (singular y plural), nunca en "%"', () => {
    const baja = resumenCuerpo([fila({ date: '2026-08-01', body_fat_pct: 20 }), fila({ date: '2026-09-20', body_fat_pct: 19 })], HOY);
    expect(baja[0].cambio).toBe('-1 punto desde el 1 ago');
    const sube = resumenCuerpo([fila({ date: '2026-08-01', body_fat_pct: 18 }), fila({ date: '2026-09-20', body_fat_pct: 19.2 })], HOY);
    expect(sube[0].cambio).toBe('+1.2 puntos desde el 1 ago');
    expect(sube[0].valor).toBe('19.2%');
    expect((sube[0].cambio ?? '').includes('%')).toBe(false);
  });

  it('cero real entre dos fechas distintas se dice "Sin cambio", nunca "+0"', () => {
    const r = resumenCuerpo([fila({ date: '2026-09-01', weight_kg: 80 }), fila({ date: '2026-09-20', weight_kg: 80.02 })], HOY);
    expect(r[0].cambio).toBe('Sin cambio desde el 1 sep');
  });

  it('ceros, negativos y NaN de la base no son medidas', () => {
    const r = resumenCuerpo([
      fila({ date: '2026-09-01', weight_kg: 0, waist_cm: -3 }),
      fila({ date: '2026-09-20', weight_kg: Number.NaN }),
    ], HOY);
    expect(r).toEqual([]);
  });

  it('el copy de cuerpo no trae em dash', () => {
    const r = resumenCuerpo([fila({ date: '2026-09-01', weight_kg: 80 }), fila({ date: '2026-09-20', weight_kg: 79 })], HOY);
    expect(JSON.stringify(r).includes('—')).toBe(false);
  });
});

describe('fechaCorta', () => {
  it('mismo año sin año; otro año con año', () => {
    expect(fechaCorta('2026-01-05', HOY)).toBe('5 ene');
    expect(fechaCorta('2025-11-15', HOY)).toBe('15 nov 2025');
  });
});

describe('lineaServicio', () => {
  const base = { cargando: false, ilegible: false, etiqueta: 'ATP Elite', pagado: true, hastaTexto: '12 mar 2027' };
  it('pagado con vencimiento leído', () => {
    expect(lineaServicio(base)).toBe('ATP Elite · hasta el 12 mar 2027');
  });
  it('pagado sin fecha leída: solo la etiqueta, no se afirma "sin vencimiento"', () => {
    expect(lineaServicio({ ...base, hastaTexto: null })).toBe('ATP Elite');
  });
  it('cargando o ilegible: nada (no se adivina)', () => {
    expect(lineaServicio({ ...base, cargando: true })).toBe(null);
    expect(lineaServicio({ ...base, ilegible: true })).toBe(null);
  });
  it('sin servicio: la etiqueta del servidor, sin fecha aunque llegue una', () => {
    expect(lineaServicio({ ...base, etiqueta: 'Sin servicio activo', pagado: false })).toBe('Sin servicio activo');
  });
});

describe('herramientasDeTu', () => {
  it('mente, cuerpo y diario completas; de salud solo ciclo, glucosa, cetonas y sol; sistema fuera', () => {
    const apps = [
      { key: 'meditar', section: 'mente' },
      { key: 'labs', section: 'salud' },
      { key: 'entrenar', section: 'cuerpo' },
      { key: 'glucosa', section: 'salud' },
      { key: 'comida', section: 'diario' },
      { key: 'reportes', section: 'salud' },
      { key: 'ciclo', section: 'salud' },
      { key: 'sol', section: 'salud' },
      { key: 'cetonas', section: 'salud' },
      { key: 'ajustes', section: 'sistema' },
    ];
    expect(herramientasDeTu(apps).map((a) => a.key))
      .toEqual(['meditar', 'entrenar', 'glucosa', 'comida', 'ciclo', 'sol', 'cetonas']);
  });

  it('no abre el ciclo por su cuenta: si visibleApps lo quitó, no aparece', () => {
    expect(herramientasDeTu([{ key: 'glucosa', section: 'salud' }]).map((a) => a.key)).toEqual(['glucosa']);
  });

  it('conserva los campos de la entrada (el candado viaja intacto)', () => {
    const r = herramientasDeTu([{ key: 'meditar', section: 'mente', bloqueada: true }]);
    expect(r[0].bloqueada).toBe(true);
  });
});

describe('herramientasDeTu contra el registro real', () => {
  it('las cuatro de salud existen en el registro y son de salud', () => {
    for (const k of ['ciclo', 'glucosa', 'cetonas', 'sol']) {
      expect(APP_BY_KEY[k]?.section).toBe('salud');
    }
  });

  it('con la venta al público apagada, a un free no se le vende nada en HERRAMIENTAS', () => {
    const r = herramientasDeTu(visibleApps(true, 'free', false, false));
    expect(r.length > 0).toBe(true);
    expect(r.filter((a) => a.bloqueada).map((a) => a.key)).toEqual([]);
  });

  it('sin el gate del ciclo abierto, Ciclo no aparece (no se asume sexo)', () => {
    expect(herramientasDeTu(visibleApps(false, 'elite', true)).some((a) => a.key === 'ciclo')).toBe(false);
    expect(herramientasDeTu(visibleApps(true, 'elite', true)).some((a) => a.key === 'ciclo')).toBe(true);
  });
});

describe('25-sep-2026 (revisión en frío): nada de PROGRESO ni de TÚ pasa por /salud/*', () => {
  it('ninguna herramienta de TÚ abre una ruta /salud', () => {
    const rutas = herramientasDeTu(visibleApps(true, 'elite', true)).map((a) => String(a.route));
    expect(rutas.filter((r) => r.startsWith('/salud'))).toEqual([]);
  });

  it('las pantallas no escriben una ruta /salud', () => {
    for (const f of ['src/screens/elite-dx/ProgresoScreen.tsx', 'src/screens/elite-dx/TuScreen.tsx']) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(/['"`]\/salud/.test(src)).toBe(false);
    }
  });
});
