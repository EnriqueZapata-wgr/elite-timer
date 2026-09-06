/**
 * ATP 3.0 (6-sep-2026, ruta 3.6): el bloque Elite que ARGOS recibe en su
 * capa dinámica. Se prueba con el ejemplo real anonimizado (Omar): encabezado
 * exacto, tope de longitud, sin palabras rojas ni em dashes en el cuerpo,
 * y las reglas de origen del resumen (summary_text primero, snapshot después).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BLOQUE_ELITE_MAX,
  ENCABEZADO_EVALUACION_ELITE,
  construirBloqueElite,
  resumenDesdeFila,
  traeBloqueElite,
} from '@/src/services/argos-elite-contexto-core';
import { RESUMEN_ARGOS_MAX, palabrasRojasEn, resumenParaArgos, type EliteV3 } from '@/src/services/elite/elite-v3-core';

const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

describe('construirBloqueElite', () => {
  it('encabezado exacto del pivote, salto de línea y resumen', () => {
    const b = construirBloqueElite('Resumen de prueba.');
    expect(b.startsWith(`${ENCABEZADO_EVALUACION_ELITE}\n`)).toBe(true);
    expect(b.endsWith('Resumen de prueba.')).toBe(true);
    expect(ENCABEZADO_EVALUACION_ELITE.startsWith('Evaluación Elite del usuario')).toBe(true);
  });

  it('sin resumen no hay bloque (ni encabezado suelto)', () => {
    expect(construirBloqueElite('')).toBe('');
    expect(construirBloqueElite('   ')).toBe('');
    expect(construirBloqueElite(null)).toBe('');
    expect(construirBloqueElite(undefined)).toBe('');
  });

  it('con el ejemplo real: dentro del tope, sin palabras rojas ni em dashes en el cuerpo', () => {
    const resumen = resumenParaArgos(ejemplo as EliteV3);
    const b = construirBloqueElite(resumen);
    expect(b.length).toBeLessThanOrEqual(BLOQUE_ELITE_MAX);
    const cuerpo = b.slice(ENCABEZADO_EVALUACION_ELITE.length + 1);
    expect(cuerpo).toBe(resumen);
    expect(palabrasRojasEn(cuerpo)).toEqual([]);
    expect(cuerpo.includes('—')).toBe(false);
  });

  it('un resumen más largo que el tope se corta en un espacio, nunca a media palabra', () => {
    const largo = Array.from({ length: 600 }, (_, i) => `palabra${i}`).join(' ');
    expect(largo.length).toBeGreaterThan(RESUMEN_ARGOS_MAX);
    const b = construirBloqueElite(largo);
    const cuerpo = b.slice(ENCABEZADO_EVALUACION_ELITE.length + 1);
    expect(cuerpo.length).toBeLessThanOrEqual(RESUMEN_ARGOS_MAX);
    expect(b.length).toBeLessThanOrEqual(BLOQUE_ELITE_MAX);
    // El corte cae al final de una palabra completa del original.
    expect(largo.startsWith(cuerpo)).toBe(true);
    expect(largo[cuerpo.length]).toBe(' ');
  });
});

describe('resumenDesdeFila', () => {
  it('summary_text guardado manda sobre el snapshot', () => {
    expect(resumenDesdeFila({ summary_text: '  Guardado.  ', sources_snapshot: { elite_v3: ejemplo } })).toBe('Guardado.');
  });

  it('sin summary_text genera el resumen desde sources_snapshot.elite_v3', () => {
    const r = resumenDesdeFila({ summary_text: null, sources_snapshot: { elite_v3: ejemplo } });
    expect(r).toBe(resumenParaArgos(ejemplo as EliteV3));
  });

  it('snapshot sin elite_v3 válido: null, no un bloque a medias', () => {
    expect(resumenDesdeFila({ summary_text: '', sources_snapshot: { elite_v3: { schema: 'elite_v3' } } })).toBe(null);
    expect(resumenDesdeFila({ summary_text: null, sources_snapshot: null })).toBe(null);
    expect(resumenDesdeFila({ summary_text: null, sources_snapshot: [] })).toBe(null);
    expect(resumenDesdeFila(null)).toBe(null);
    expect(resumenDesdeFila(undefined)).toBe(null);
  });
});

describe('traeBloqueElite', () => {
  it('detecta el encabezado dentro de un extraContext y no en otros textos', () => {
    expect(traeBloqueElite(construirBloqueElite('x'))).toBe(true);
    expect(traeBloqueElite(`Contexto de pantalla.\n${ENCABEZADO_EVALUACION_ELITE}\nalgo`)).toBe(true);
    expect(traeBloqueElite('Contexto de pantalla.')).toBe(false);
    expect(traeBloqueElite(null)).toBe(false);
    expect(traeBloqueElite(undefined)).toBe(false);
  });
});
