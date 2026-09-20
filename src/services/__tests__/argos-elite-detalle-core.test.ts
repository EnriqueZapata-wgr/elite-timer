/**
 * 20-sep-2026: el segundo bloque Elite (detalle) que ARGOS recibe aparte del
 * resumen. Se prueba con el ejemplo real anonimizado (Omar): tope de 6,000,
 * todas las secciones presentes, sello de vigencia con version y fecha de
 * toma, sin palabras rojas ni em dashes, y encabezado distinto del resumen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DETALLE_ELITE_MAX,
  ENCABEZADO_DETALLE_ELITE,
  PIE_DETALLE_ELITE,
  construirBloqueEliteDetalle,
  listaConTope,
  seccionAlimentacion,
  seccionGenetica,
  seccionSistemas,
  traeDetalleElite,
} from '@/src/services/argos-elite-detalle-core';
import { ENCABEZADO_EVALUACION_ELITE, traeBloqueElite } from '@/src/services/argos-elite-contexto-core';
import { palabrasRojasEn, validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';

const crudo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);
const r = validarEliteV3(crudo);
if (!r.ok) throw new Error(`el ejemplo de Omar no valida: ${r.errores.join('; ')}`);
const omar: EliteV3 = r.valor;

describe('construirBloqueEliteDetalle con el ejemplo de Omar', () => {
  const bloque = construirBloqueEliteDetalle(omar);

  it('cabe en el tope y trae entre 4 y 6 mil caracteres con una evaluación completa', () => {
    expect(bloque.length).toBeLessThanOrEqual(DETALLE_ELITE_MAX);
    expect(bloque.length).toBeGreaterThanOrEqual(4000);
  });

  it('encabezado y pie propios, distintos del resumen (no se confunden)', () => {
    expect(bloque.startsWith(`${ENCABEZADO_DETALLE_ELITE}\n`)).toBe(true);
    expect(bloque.endsWith(PIE_DETALLE_ELITE)).toBe(true);
    expect(traeDetalleElite(bloque)).toBe(true);
    expect(traeBloqueElite(bloque)).toBe(false);
    expect(bloque.includes(ENCABEZADO_EVALUACION_ELITE)).toBe(false);
  });

  it('sello de vigencia: versión, fecha de toma, generada y firma', () => {
    expect(bloque).toContain('Vigencia: versión 1, toma de muestra 2026-05, generada 2026-09-06');
    expect(bloque).toContain('Firma: Enrique Zapata');
    expect(bloque).toContain('Programa de 12 semanas');
  });

  it('todas las secciones presentes: sistemas con score, alimentación, entrenamiento, genética, marcadores y cruces', () => {
    for (const fragmento of [
      'Sistemas (score de 0 a 100; att = pide acción, sub = en rango pero no en su mejor punto, opt = donde lo queremos): Metabolismo 29 att; Composición corporal 34 att',
      'Sistema inmune 71 opt',
      'Por qué, en palabras de su equipo: Metabolismo:',
      'Alimentación (plan de su equipo). Ventana de alimentación: el plan no fija una.',
      'Horarios: Mañana: Café solo por la mañana',
      'Prioriza: Verduras crucíferas asadas',
      'Evita: Lactosa: sale hoy',
      'Entrenamiento (plan de su equipo). Base: Motor de resistencia',
      'Sesiones: Caminata rápida, bici o remo (150 a 180 minutos por semana, Moderada y sostenida)',
      'Genética (no cambia; explica lo demás): [Tu hígado y cómo limpias: el pilar de tu caso] Punto ciego para limpiar residuos tóxicos:',
      'Qué hacer: Bajar el alcohol es la intervención número uno.',
      'Marcadores, el porqué de cada uno: Enzima del hígado (GGT) 67 (objetivo hasta 30, pide acción):',
      'Cruces, el porqué: 1) Tu hígado te está avisando',
    ]) {
      expect(bloque, `falta: ${fragmento}`).toContain(fragmento);
    }
  });

  it('sin palabras rojas ni em dashes en todo el bloque', () => {
    expect(palabrasRojasEn(bloque)).toEqual([]);
    expect(bloque.includes('—')).toBe(false);
  });

  it('lo que no cabe se cuenta con "(+N más)", nunca se corta a media frase', () => {
    expect(bloque).toContain('más)');
    // Cada renglón termina en algo que cierra (punto, paréntesis o cita), no a media palabra.
    for (const linea of bloque.split('\n')) {
      expect(/[.)"\]]$|:$/.test(linea.trimEnd()), `renglón cortado: ${linea.slice(-60)}`).toBe(true);
    }
  });

  it('los sistemas en atención van primero en el porqué', () => {
    const s = seccionSistemas(omar, 5000);
    const iAtt = s.indexOf('Metabolismo: Tu azúcar');
    const iOpt = s.indexOf('Sistema inmune:');
    expect(iAtt).toBeGreaterThan(0);
    expect(iOpt === -1 || iOpt > iAtt).toBe(true);
  });
});

describe('secciones con presupuesto chico', () => {
  it('listaConTope mete lo que cabe y cuenta el resto', () => {
    expect(listaConTope('P: ', ['a', 'b', 'c'], '; ', 100)).toBe('P: a; b; c');
    expect(listaConTope('P: ', ['aaaa', 'bbbb', 'cccc'], '; ', 20)).toBe('P: aaaa; (+2 más)');
    expect(listaConTope('P: ', ['aaaa'], '; ', 3)).toBe('');
  });

  it('una sección que no cabe ni con un elemento se omite entera', () => {
    expect(seccionGenetica(omar, 40)).toBe('');
    expect(seccionAlimentacion(omar, 10)).toBe('');
  });

  it('sin ventana el plan lo dice; con ventana la escribe', () => {
    const conVentana: EliteV3 = { ...omar, alimentacion: { ...omar.alimentacion, ventana: { inicio: '12:00', fin: '20:00' } } };
    expect(seccionAlimentacion(conVentana, 2000)).toContain('Ventana de alimentación: 12:00 a 20:00.');
    expect(seccionAlimentacion(omar, 2000)).toContain('el plan no fija una');
  });
});

describe('traeDetalleElite', () => {
  it('detecta el encabezado y no otros textos', () => {
    expect(traeDetalleElite(`x\n${ENCABEZADO_DETALLE_ELITE}\ny`)).toBe(true);
    expect(traeDetalleElite('Contexto de pantalla.')).toBe(false);
    expect(traeDetalleElite(null)).toBe(false);
  });
});
