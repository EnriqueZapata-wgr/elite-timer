/**
 * "Qué hacer hoy" (ATP 3.0, ruta 2.2): siempre tres, primero las ligadas a
 * marcadores fuera de ventana, sin duplicados, y base cuando no hay nada.
 */
import { describe, it, expect } from 'vitest';
import {
  elegirQueHacerHoy, coincideMarcador, normalizarMarcador, marcarHecha, habitosBaseSinExcluidas,
  HABITOS_BASE_KEYS, ACCIONES_HOY, type CandidatoHoy, type MarcadorFuera,
} from '@/src/services/hoy/que-hacer-hoy-core';

const cand = (key: string, o: Partial<CandidatoHoy> = {}): CandidatoHoy => ({
  key, nombre: `N ${key}`, como: `Como ${key}`, prioridad: 2, origen: 'activa',
  userInterventionId: `id-${key}`, marcadores: [], ...o,
});

const BASE: CandidatoHoy[] = HABITOS_BASE_KEYS.map((k) => cand(k, { origen: 'base', userInterventionId: null, prioridad: 1 }));

const HBA1C: MarcadorFuera = { key: 'hba1c', nombres: ['HbA1c'], etiqueta: 'Hemoglobina glucosilada', estado: 'atencion' };
const PCR: MarcadorFuera = { key: 'proteina_c_reactiva_cuantitativa_pcr', nombres: ['PCR'], etiqueta: 'Proteína C reactiva', estado: 'aceptable' };

describe('coincideMarcador', () => {
  it('iguala mayúsculas, guiones y acentos', () => {
    expect(normalizarMarcador('HOMA-IR')).toBe('homair');
    expect(coincideMarcador('HbA1c', 'hba1c')).toBe(true);
    expect(coincideMarcador('PCR_hs', 'PCR')).toBe(true);
    expect(coincideMarcador('insulina_ayunas', 'insulina')).toBe(true);
  });
  it('no confunde HDL con LDL ni acepta fragmentos de dos letras', () => {
    expect(coincideMarcador('HDL', 'LDL')).toBe(false);
    expect(coincideMarcador('IL-6', 'l')).toBe(false);
  });
  it('4EP: compara por tokens completos, no por substring', () => {
    expect(coincideMarcador('ldh', 'ratio_cortisol_dhea')).toBe(false);
    expect(coincideMarcador('iga', 'fatiga_ocular_score_subjetivo')).toBe(false);
    expect(coincideMarcador('sodio', 'reflujo_episodios')).toBe(false);
    expect(coincideMarcador('hba1c', 'HbA1c')).toBe(true);
    expect(coincideMarcador('HOMA-IR', 'homair')).toBe(true);
    expect(coincideMarcador('vitamina_d', 'vitamina D 25-OH')).toBe(true);
  });
});

describe('habitosBaseSinExcluidas (regla 1)', () => {
  const uni = [cand('u1', { origen: 'base', userInterventionId: null }), cand('u2', { origen: 'base', userInterventionId: null })];
  it('quita las llaves pausadas o descartadas y rellena con universales', () => {
    const r = habitosBaseSinExcluidas(BASE, new Set(['caminata_postprandial']), uni);
    expect(r.map((x) => x.key)).toEqual(['hidratacion_matutina', 'recordatorio_dormir', 'u1']);
  });
  it('las universales excluidas tampoco entran, y sin relleno pueden quedar menos de tres', () => {
    const r = habitosBaseSinExcluidas(BASE, new Set(['caminata_postprandial', 'u1']), uni);
    expect(r.map((x) => x.key)).toEqual(['hidratacion_matutina', 'recordatorio_dormir', 'u2']);
    expect(habitosBaseSinExcluidas(BASE, new Set([...HABITOS_BASE_KEYS]), [])).toEqual([]);
  });
  it('sin exclusiones devuelve los tres base tal cual', () => {
    expect(habitosBaseSinExcluidas(BASE, new Set(), uni).map((x) => x.key)).toEqual([...HABITOS_BASE_KEYS]);
  });
});

describe('elegirQueHacerHoy', () => {
  it('con marcadores fuera: las ligadas van primero y dicen por qué', () => {
    const c = [
      cand('a', { prioridad: 1 }),
      cand('b', { prioridad: 3, marcadores: ['HbA1c', 'glucosa_ayunas'] }),
      cand('c', { prioridad: 2, marcadores: ['PCR_hs'] }),
      cand('d', { prioridad: 1, marcadores: ['HbA1c', 'PCR_hs'] }),
      cand('e', { prioridad: 1 }),
    ];
    const r = elegirQueHacerHoy(c, [HBA1C, PCR], BASE);
    expect(r).toHaveLength(ACCIONES_HOY);
    expect(r.map((x) => x.key)).toEqual(['d', 'b', 'c']);
    expect(r[0].porMarcador).toBe('Hemoglobina glucosilada');
    expect(r[2].porMarcador).toBe('Proteína C reactiva');
  });

  it('sin estudio (sin marcadores fuera): las tres de mayor prioridad, activas antes que sugeridas', () => {
    const c = [
      cand('s1', { origen: 'sugerida', prioridad: 1 }),
      cand('a3', { prioridad: 3 }),
      cand('a1', { prioridad: 1 }),
      cand('a2', { prioridad: 2 }),
    ];
    const r = elegirQueHacerHoy(c, [], BASE);
    expect(r.map((x) => x.key)).toEqual(['a1', 'a2', 'a3']);
    expect(r.every((x) => x.porMarcador === null)).toBe(true);
  });

  it('sin intervenciones: los tres hábitos base del catálogo', () => {
    const r = elegirQueHacerHoy([], [HBA1C], BASE);
    expect(r.map((x) => x.key)).toEqual([...HABITOS_BASE_KEYS]);
    expect(r.every((x) => x.origen === 'base' && x.userInterventionId === null)).toBe(true);
  });

  it('con una sola intervención rellena con base sin repetir la llave', () => {
    const r = elegirQueHacerHoy([cand('hidratacion_matutina')], [], BASE);
    expect(r.map((x) => x.key)).toEqual(['hidratacion_matutina', 'caminata_postprandial', 'recordatorio_dormir']);
    expect(r[0].origen).toBe('activa');
  });

  it('dedupe: la misma llave activa y sugerida cuenta una vez y gana la activa', () => {
    const c = [
      cand('x', { origen: 'sugerida', userInterventionId: 'sug' }),
      cand('x', { origen: 'activa', userInterventionId: 'act' }),
      cand('y'), cand('z'), cand('w'),
    ];
    const r = elegirQueHacerHoy(c, [], BASE);
    expect(r.filter((a) => a.key === 'x')).toHaveLength(1);
    expect(r.find((a) => a.key === 'x')?.userInterventionId).toBe('act');
    expect(new Set(r.map((a) => a.key)).size).toBe(3);
  });

  it('hechasHoy marca la acción por id de fila', () => {
    const r = elegirQueHacerHoy([cand('a'), cand('b'), cand('c')], [], BASE, new Set(['id-b']));
    expect(r.map((a) => a.hecha)).toEqual([false, true, false]);
    expect(marcarHecha(r, 'a', true)[0].hecha).toBe(true);
    expect(r[0].hecha).toBe(false);
  });

  it('candidatos sin nombre se ignoran (fila corrupta)', () => {
    const r = elegirQueHacerHoy([cand('a', { nombre: '' })], [], BASE);
    expect(r.map((x) => x.key)).toEqual([...HABITOS_BASE_KEYS]);
  });
});
