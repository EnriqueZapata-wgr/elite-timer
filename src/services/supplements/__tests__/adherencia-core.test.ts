import { describe, it, expect } from 'vitest';
import {
  esPlan, numeroONull, logCuenta, fechaAltaLocal, porcionEsUnaUnidad, formatNumero, normalizeUnit, parseCantidad, formatCantidad,
  unidadLabel, normalizeForm, dosisPorUnidadTexto, reactivoPorToma, tomaTexto, activosTexto, dosisDesdeScan,
  ventanaFechas, diaSemana, esDiaProgramado, diasProgramados, tomasPorDia, pct,
  calcularAdherencia, adherenciaPorDiaSemana, agruparHistorial, etiquetaDia, SIN_DATO,
} from '@/src/services/supplements/adherencia-core';

// Candado de doctrina (312): una fila vieja sin marca sigue siendo plan.
describe('esPlan', () => {
  it('solo false explicito es eventual', () => {
    expect(esPlan({ is_plan: false })).toBe(false);
    expect(esPlan({ is_plan: true })).toBe(true);
    expect(esPlan({ is_plan: null })).toBe(true);
    expect(esPlan({})).toBe(true);
    expect(esPlan(null)).toBe(true);
  });
});

describe('numeros y unidades (10.1 / 10.2)', () => {
  it('numeroONull acepta NUMERIC como string y rechaza basura', () => {
    expect(numeroONull('2.5')).toBe(2.5);
    expect(numeroONull(3)).toBe(3);
    expect(numeroONull('')).toBe(null);
    expect(numeroONull(null)).toBe(null);
    expect(numeroONull('abc')).toBe(null);
    // B1: misma regla de miles que parseCantidad
    expect(numeroONull('1,000')).toBe(1000);
    expect(numeroONull('1,5')).toBe(1.5);
    expect(numeroONull('2,500')).toBe(2500);
    expect(numeroONull('1.000')).toBe(1);
    expect(numeroONull('1,000.5')).toBe(null);
  });
  it('formatNumero nunca truena con null: pinta raya', () => {
    expect(formatNumero(null)).toBe(SIN_DATO);
    expect(formatNumero(800)).toBe('800');
    expect(formatNumero(2.5)).toBe('2.5');
    expect(formatNumero(0.333333)).toBe('0.33');
  });
  it('normalizeUnit', () => {
    expect(normalizeUnit('IU')).toBe('UI');
    expect(normalizeUnit('ui')).toBe('UI');
    expect(normalizeUnit('µg')).toBe('mcg');
    expect(normalizeUnit('gr')).toBe('g');
    expect(normalizeUnit('kg')).toBe(null);
    expect(normalizeUnit(null)).toBe(null);
  });
  it('parseCantidad lee etiquetas reales', () => {
    expect(parseCantidad('2000 IU')).toEqual({ amount: 2000, unit: 'UI' });
    expect(parseCantidad('400mg')).toEqual({ amount: 400, unit: 'mg' });
    expect(parseCantidad('1,000 mcg')).toEqual({ amount: 1000, unit: 'mcg' });
    expect(parseCantidad('2,5 g')).toEqual({ amount: 2.5, unit: 'g' });
    expect(parseCantidad('1 cápsula')).toBe(null);
    expect(parseCantidad('')).toBe(null);
    expect(parseCantidad(null)).toBe(null);
  });
  it('formatCantidad', () => {
    expect(formatCantidad(400, 'mg')).toBe('400 mg');
    expect(formatCantidad('800', 'IU')).toBe('800 UI');
    expect(formatCantidad(null, 'mg')).toBe(SIN_DATO);
  });
  it('normalizeForm: lo que dice el escaneo cae a los ids de la ficha', () => {
    expect(normalizeForm('cápsula')).toBe('capsula');
    expect(normalizeForm('Cápsulas')).toBe('capsula');
    expect(normalizeForm('gotas')).toBe('gotas');
    expect(normalizeForm('Tabletas')).toBe('tableta');
    expect(normalizeForm('gomitas')).toBe('gomita');
    expect(normalizeForm('polvo')).toBe('polvo');
    expect(normalizeForm('parche')).toBe(null);
    expect(normalizeForm(null)).toBe(null);
    expect(unidadLabel('cápsula', 2)).toBe('cápsulas');
  });
  it('unidadLabel segun form', () => {
    expect(unidadLabel('capsula', 1)).toBe('cápsula');
    expect(unidadLabel('capsula', 2)).toBe('cápsulas');
    expect(unidadLabel('gotas', 10)).toBe('gotas');
    expect(unidadLabel('polvo', 1)).toBe('porción');
    expect(unidadLabel(null, 3)).toBe('porciones');
  });
  it('dosisPorUnidadTexto y tomaTexto: raya cuando la ficha no sabe', () => {
    const f = { form: 'capsula', amount_per_unit: 400, amount_unit: 'mg', units_per_dose: 2 };
    expect(dosisPorUnidadTexto(f)).toBe('400 mg por cápsula');
    expect(dosisPorUnidadTexto({ form: 'capsula' })).toBe(SIN_DATO);
    expect(reactivoPorToma(f, 2)).toBe(800);
    expect(reactivoPorToma({ form: 'capsula' }, 2)).toBe(null);
    expect(tomaTexto(f)).toBe('2 cápsulas · 800 mg');
    expect(tomaTexto(f, 3)).toBe('3 cápsulas · 1200 mg');
    expect(tomaTexto({ form: 'gotas', units_per_dose: 10 })).toBe('10 gotas');
    expect(tomaTexto({ form: 'capsula' })).toBe(SIN_DATO);
    expect(tomaTexto(null, null)).toBe(SIN_DATO);
  });
  it('activosTexto y dosisDesdeScan', () => {
    const actives = [{ name: 'Vitamina D3', amount: '2000 IU' }, { name: 'K2', amount: '100 mcg' }];
    expect(activosTexto(actives)).toBe('Vitamina D3 2000 IU · K2 100 mcg');
    expect(activosTexto([])).toBe(null);
    expect(activosTexto('x')).toBe(null);
    // Varios activos: NO se elige uno (seria inventar la dosis).
    expect(dosisDesdeScan(actives, '1 cápsula')).toBe(null);
    expect(dosisDesdeScan([actives[0]], '1 cápsula')).toEqual({ amount: 2000, unit: 'UI' });
    expect(dosisDesdeScan([{ name: 'Probiótico', amount: '10 billones UFC' }], '1 cápsula')).toBe(null);
    // G1: amount es POR PORCION. Porcion de 2 capsulas → NO es por unidad
    // (antes pintaba "2000 UI por cápsula · 2 cápsulas · 4000 UI", el doble).
    expect(dosisDesdeScan([actives[0]], '2 cápsulas')).toBe(null);
    expect(dosisDesdeScan([actives[0]], null)).toBe(null);
    expect(dosisDesdeScan([actives[0]], '10 gotas')).toBe(null);
    expect(porcionEsUnaUnidad('1 cápsula')).toBe(true);
    expect(porcionEsUnaUnidad('1 tableta')).toBe(true);
    expect(porcionEsUnaUnidad('1.0 scoop')).toBe(true);
    expect(porcionEsUnaUnidad('2 cápsulas')).toBe(false);
    expect(porcionEsUnaUnidad('1/2 scoop')).toBe(false);
    expect(porcionEsUnaUnidad('10 gotas')).toBe(false);
    expect(porcionEsUnaUnidad('')).toBe(false);
    expect(porcionEsUnaUnidad(undefined)).toBe(false);
  });
});

const HOY = '2026-08-31';
const plan = { id: 'a', name: 'Magnesio', is_plan: true, dose_pattern: '1× diario', created_at: '2026-08-01T10:00:00Z' };
const lmv = { id: 'b', name: 'Omega', is_plan: true, dose_pattern: 'lun/mié/vie', created_at: '2026-08-01T10:00:00Z' };
const eventual = { id: 'c', name: 'Ashwagandha', is_plan: false, created_at: '2026-08-01T10:00:00Z' };
const nueva = { id: 'd', name: 'Zinc', is_plan: true, created_at: '2026-08-30T23:00:00Z' };
const inactiva = { id: 'e', name: 'Vieja', is_plan: true, is_active: false, created_at: '2026-08-01T10:00:00Z' };
const log = (id: string, date: string, extra: Partial<{ dose_index: number; units_taken: number; taken: boolean }> = {}) =>
  ({ supplement_id: id, date, taken: true, dose_index: 0, ...extra });

describe('fechas y patrones', () => {
  it('ventanaFechas termina en hoy y cruza mes sin UTC', () => {
    const v = ventanaFechas('2026-09-02', 5);
    expect(v).toEqual(['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
    expect(ventanaFechas('basura', 5)).toEqual([]);
    expect(ventanaFechas('2026-09-02', 0)).toEqual([]);
  });
  it('diaSemana: 2026-08-31 es lunes', () => {
    expect(diaSemana('2026-08-31')).toBe(1);
    expect(diaSemana('2026-08-30')).toBe(0);
    expect(diaSemana('nope')).toBe(null);
  });
  it('esDiaProgramado y diasProgramados', () => {
    const semana = ventanaFechas('2026-08-31', 7); // mar 25 ago .. lun 31 ago
    expect(diasProgramados(null, semana)).toBe(7);
    expect(diasProgramados('1× diario', semana)).toBe(7);
    expect(diasProgramados('texto libre coach', semana)).toBe(7);
    expect(diasProgramados('lun/mié/vie', semana)).toBe(3);
    expect(diasProgramados('semanal', semana)).toBe(1);
    expect(diasProgramados('semanal', ventanaFechas('2026-08-31', 30))).toBe(5);
    expect(esDiaProgramado('lun/mié/vie', '2026-08-31')).toBe(true);
    expect(esDiaProgramado('lun/mié/vie', '2026-08-30')).toBe(false);
  });
  it('tomasPorDia y pct', () => {
    expect(tomasPorDia(null)).toBe(1);
    expect(tomasPorDia(['mañana', 'noche'])).toBe(2);
    expect(pct(3, 0)).toBe(null);
    expect(pct(5, 7)).toBe(71);
    expect(pct(9, 7)).toBe(100);
    // B3: nunca NaN
    expect(pct(NaN, 5)).toBe(0);
    expect(pct(Number.POSITIVE_INFINITY, 5)).toBe(0);
    expect(pct(2, NaN)).toBe(null);
  });
  it('B2: units_taken 0 o negativo no es toma', () => {
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: true })).toBe(true);
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: true, units_taken: 2 })).toBe(true);
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: true, units_taken: 0 })).toBe(false);
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: true, units_taken: '0' })).toBe(false);
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: true, units_taken: -1 })).toBe(false);
    expect(logCuenta({ supplement_id: 'a', date: HOY, taken: false })).toBe(false);
    const r = calcularAdherencia([plan], [log('a', HOY, { units_taken: 0 })], HOY, 7);
    expect(r.plan[0].diasTomados).toBe(0);
    const h = agruparHistorial([plan], [log('a', HOY, { units_taken: 0 })], HOY, 1);
    expect(h[0].tomas.length).toBe(0);
  });
  it('G2: fecha de alta en hora LOCAL, no UTC', () => {
    // Ficha creada a las 20:00 local (UTC-6) = 02:00Z del dia siguiente.
    const off = new Date().getTimezoneOffset(); // minutos que se SUMAN a local para llegar a UTC
    const localAlta = new Date(2026, 7, 31, 20, 0, 0); // 31 ago 20:00 local
    const iso = new Date(localAlta.getTime()).toISOString();
    expect(fechaAltaLocal(iso)).toBe('2026-08-31');
    if (off > 0) expect(iso.slice(0, 10)).toBe('2026-09-01'); // en una zona al oeste de UTC el slice mentia
    const fichaNoche = { id: 'n', name: 'Noche', is_plan: true, created_at: iso };
    const r = calcularAdherencia([fichaNoche], [log('n', '2026-08-31')], '2026-08-31', 30);
    expect(r.plan[0]).toEqual({ id: 'n', name: 'Noche', diasTomados: 1, diasProgramados: 1, pct: 100 });
    const h = agruparHistorial([fichaNoche], [], '2026-08-31', 2);
    expect(h.map((d) => d.planProgramadas)).toEqual([1, 0]);
    expect(fechaAltaLocal('basura')).toBe(null);
    expect(fechaAltaLocal(null)).toBe(null);
  });
});

describe('calcularAdherencia (10.6)', () => {
  it('sin fichas de plan: pct null, nunca 0', () => {
    const r = calcularAdherencia([eventual], [log('c', HOY)], HOY, 7);
    expect(r.global.pct).toBe(null);
    expect(r.plan).toEqual([]);
    expect(r.eventuales).toEqual([{ id: 'c', name: 'Ashwagandha', diasTomados: 1 }]);
  });
  it('plan diario 5 de 7, lun/mie/vie 2 de 3, eventual no penaliza', () => {
    const logs = [
      ...['2026-08-25', '2026-08-26', '2026-08-28', '2026-08-30', '2026-08-31'].map((d) => log('a', d)),
      log('b', '2026-08-26'), log('b', '2026-08-31'),
      log('c', '2026-08-27'),
    ];
    const r = calcularAdherencia([plan, lmv, eventual], logs, HOY, 7);
    expect(r.plan.find((p) => p.id === 'a')).toEqual({ id: 'a', name: 'Magnesio', diasTomados: 5, diasProgramados: 7, pct: 71 });
    expect(r.plan.find((p) => p.id === 'b')).toEqual({ id: 'b', name: 'Omega', diasTomados: 2, diasProgramados: 3, pct: 67 });
    expect(r.global).toEqual({ diasTomados: 7, diasProgramados: 10, pct: 70 });
    expect(r.eventuales[0].diasTomados).toBe(1);
  });
  it('dos tomas el mismo dia cuentan un dia; tomar de mas no compensa a otro', () => {
    const logs = [log('a', HOY, { dose_index: 0 }), log('a', HOY, { dose_index: 1 }), log('a', '2026-08-29')];
    const r = calcularAdherencia([plan, lmv], logs, HOY, 7);
    expect(r.plan[0].diasTomados).toBe(2);
    expect(r.global.diasTomados).toBe(2);
  });
  it('ficha nueva se mide desde su alta, no contra los 30 dias', () => {
    const r = calcularAdherencia([nueva], [log('d', HOY)], HOY, 30);
    expect(r.plan[0]).toEqual({ id: 'd', name: 'Zinc', diasTomados: 1, diasProgramados: 2, pct: 50 });
  });
  it('fichas inactivas y logs fuera de ventana no cuentan; taken=false tampoco', () => {
    const logs = [log('e', HOY), log('a', '2026-08-01'), log('a', HOY, { taken: false })];
    const r = calcularAdherencia([plan, inactiva], logs, HOY, 7);
    expect(r.plan.length).toBe(1);
    expect(r.plan[0].diasTomados).toBe(0);
    expect(r.global.pct).toBe(0);
  });
});

describe('adherenciaPorDiaSemana', () => {
  it('detecta el fin de semana olvidado', () => {
    const fechas = ventanaFechas(HOY, 14);
    const logs = fechas.filter((f) => { const d = diaSemana(f); return d !== 0 && d !== 6; }).map((f) => log('a', f));
    const r = adherenciaPorDiaSemana([plan, eventual], logs, HOY, 14);
    expect(r.length).toBe(7);
    expect(r[0]).toEqual({ dow: 0, label: 'dom', tomados: 0, programados: 2, pct: 0 });
    expect(r[1]).toEqual({ dow: 1, label: 'lun', tomados: 2, programados: 2, pct: 100 });
    expect(r[6].pct).toBe(0);
  });
  it('sin plan: todo null', () => {
    expect(adherenciaPorDiaSemana([eventual], [], HOY, 7).every((d) => d.pct === null)).toBe(true);
  });
});

describe('agruparHistorial (10.5)', () => {
  const multi = { id: 'm', name: 'Vit C', is_plan: true, dose_times: ['mañana', 'noche'], form: 'capsula', amount_per_unit: 500, amount_unit: 'mg', units_per_dose: 1, created_at: '2026-08-01T00:00:00Z' };
  it('todos los dias aparecen, del mas reciente al mas viejo', () => {
    const r = agruparHistorial([plan], [], HOY, 3);
    expect(r.map((d) => d.fecha)).toEqual(['2026-08-31', '2026-08-30', '2026-08-29']);
    expect(r[0].tomas).toEqual([]);
    expect(r[0].planProgramadas).toBe(1);
    expect(r[0].planTomadas).toBe(0);
  });
  it('multi-dosis con registro variable y ficha eliminada', () => {
    const logs = [
      log('m', HOY, { dose_index: 0 }),
      log('m', HOY, { dose_index: 1, units_taken: 2 }),
      log('m', HOY, { dose_index: 1 }), // duplicado: se ignora
      log('zzz', HOY),
      log('c', HOY),
    ];
    const r = agruparHistorial([multi, eventual], logs, HOY, 1);
    const dia = r[0];
    expect(dia.planProgramadas).toBe(2);
    expect(dia.planTomadas).toBe(2);
    expect(dia.tomas.length).toBe(4);
    // plan primero, luego eventuales; el eliminado conserva su registro
    expect(dia.tomas[0]).toEqual({ supplementId: 'm', name: 'Vit C', isPlan: true, doseIndex: 0, doseLabel: 'mañana', cantidad: '1 cápsula · 500 mg', variable: false });
    expect(dia.tomas[1]).toEqual({ supplementId: 'm', name: 'Vit C', isPlan: true, doseIndex: 1, doseLabel: 'noche', cantidad: '2 cápsulas · 1000 mg', variable: true });
    expect(dia.tomas.find((t) => t.supplementId === 'zzz')?.name).toBe('Suplemento eliminado');
    expect(dia.tomas.find((t) => t.supplementId === 'zzz')?.cantidad).toBe(SIN_DATO);
    expect(dia.tomas[3].isPlan).toBe(false);
  });
  it('ficha creada despues del dia no suma programadas ese dia', () => {
    const r = agruparHistorial([nueva], [], HOY, 3);
    expect(r.map((d) => d.planProgramadas)).toEqual([1, 1, 0]);
  });
});

describe('etiquetaDia', () => {
  it('Hoy, Ayer, y fecha corta', () => {
    expect(etiquetaDia(HOY, HOY)).toBe('Hoy');
    expect(etiquetaDia('2026-08-30', HOY)).toBe('Ayer');
    expect(etiquetaDia('2026-08-24', HOY)).toBe('lun 24 ago');
    expect(etiquetaDia('x', HOY)).toBe('x');
  });
});
