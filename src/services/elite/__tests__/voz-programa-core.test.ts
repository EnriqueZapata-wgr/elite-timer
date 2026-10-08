/**
 * Tests de voz-programa-core (8-oct-2026, nivel 2). Se corren con
 * `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/voz-programa-core.test.ts`.
 *
 * Candados (no aflojar; si la voz cambia, la razon va escrita aqui):
 *  - NINGUN texto de la voz de un programa dice "Elite", venga el nombre que
 *    venga y traiga o no evaluacion.
 *  - La voz de Elite es letra por letra lo que las pantallas ya decian antes
 *    del nivel 2 (titulo, ceja, asunto del correo, archivo del PDF, encabezado
 *    para ARGOS).
 *  - "Plan Elite vN" se le muestra neutro a un cliente de programa y a nadie mas.
 *  - Sin em dashes ni palabras rojas en lo que lee el cliente.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  VOZ_ELITE,
  archivoPdf,
  conMayuscula,
  nombreVisibleDelPlan,
  vozDe,
  vozDeDocumento,
  type VozPrograma,
} from '../voz-programa-core';
import { ELITE_PROGRAMA_NOMBRE_MAX, palabrasRojasEn, validarEliteV3, type EliteV3 } from '../elite-v3-core';
import { ENCABEZADO_EVALUACION_ELITE } from '@/src/services/argos-elite-contexto-core';

function leer(ruta: string): Record<string, any> {
  return JSON.parse(readFileSync(resolve(process.cwd(), ruta), 'utf8'));
}
function valido(obj: unknown): EliteV3 {
  const r = validarEliteV3(obj);
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}
const elite = () => leer('R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json');
const programa = () => leer('R and D/diagnostico/programa_ejemplo.json');

/** Los textos que la voz le pone enfrente al cliente (todo menos lo de ARGOS). */
function textosDeCliente(v: VozPrograma): string[] {
  return [v.documento, v.documentoConMarca, v.tituloPantalla, v.marca, v.asuntoCorreo, v.tituloPdf, v.nombrePdf, v.nombre ?? ''];
}
function todosLosTextos(v: VozPrograma): string[] {
  return [...textosDeCliente(v), v.encabezadoArgos, archivoPdf(v, 3)];
}

/** Todas las combinaciones de un programa, incluidas las que no deberian llegar. */
const NOMBRES: (string | null | undefined)[] = [
  undefined, null, '', '   ', 'Fuerza y sueño', '  Regreso  a   la base  ', 'Plan Elite oro', 'PROGRAMA ELITE', 'elite',
  'x'.repeat(200),
];
function vocesDePrograma(): VozPrograma[] {
  const voces: VozPrograma[] = [];
  for (const nombre of NOMBRES) {
    for (const conDiagnostico of [true, false, undefined]) voces.push(vozDe({ tipo: 'programa', nombre, conDiagnostico }));
  }
  return voces;
}

describe('la voz de Elite no cambia', () => {
  it('es letra por letra lo que ya estaba en pantalla', () => {
    expect(VOZ_ELITE).toEqual({
      tipo: 'elite',
      nombre: null,
      conDiagnostico: true,
      documento: 'tu evaluación',
      documentoConMarca: 'tu evaluación Elite',
      tituloPantalla: 'Mi evaluación Elite',
      marca: 'ATP ELITE',
      asuntoCorreo: 'Mi programa ATP Elite',
      tituloPdf: 'Mi evaluación Elite',
      nombrePdf: 'Evaluacion-Elite',
      encabezadoArgos: ENCABEZADO_EVALUACION_ELITE,
    });
  });

  it('el encabezado para ARGOS es el mismo texto que usa el contexto de ARGOS', () => {
    expect(VOZ_ELITE.encabezadoArgos).toBe(ENCABEZADO_EVALUACION_ELITE);
  });

  it('el archivo del PDF se llama como siempre', () => {
    expect(archivoPdf(VOZ_ELITE, 2)).toBe('Evaluacion-Elite-v2.pdf');
  });

  it('sin tipo (pantalla cargando) es la voz de Elite', () => {
    expect(vozDe({ tipo: null })).toEqual(VOZ_ELITE);
    expect(vozDe({ tipo: undefined })).toEqual(VOZ_ELITE);
    expect(vozDe({ tipo: 'elite' })).toEqual(VOZ_ELITE);
    expect(vozDeDocumento(null)).toBe(VOZ_ELITE);
    expect(vozDeDocumento(undefined)).toBe(VOZ_ELITE);
  });

  it('un nombre de programa en un documento Elite no mueve titulos ni ceja', () => {
    const v = vozDe({ tipo: 'elite', nombre: 'Regreso a la base' });
    expect(v.nombre).toBe('Regreso a la base');
    expect({ ...v, nombre: null }).toEqual(VOZ_ELITE);
  });

  it('el ejemplo real da la voz de Elite', () => {
    expect(vozDeDocumento(valido(elite()))).toEqual(VOZ_ELITE);
  });
});

describe('la voz de un programa', () => {
  it('NINGUN texto dice Elite, con cualquier nombre y con o sin evaluacion', () => {
    for (const v of vocesDePrograma()) {
      for (const t of todosLosTextos(v)) expect(t).not.toMatch(/elite/i);
    }
  });

  it('sin em dashes ni palabras rojas en lo que lee el cliente', () => {
    for (const v of vocesDePrograma()) {
      for (const t of textosDeCliente(v)) {
        expect(t.includes('\u2014')).toBe(false);
        expect(palabrasRojasEn(t)).toEqual([]);
      }
      expect(v.encabezadoArgos.includes('\u2014')).toBe(false);
      expect(palabrasRojasEn(v.encabezadoArgos)).toEqual([]);
    }
  });

  it('con nombre: el nombre es el titulo y la ceja', () => {
    const v = vozDe({ tipo: 'programa', nombre: 'Fuerza y sueño', conDiagnostico: false });
    expect(v).toEqual({
      tipo: 'programa',
      nombre: 'Fuerza y sueño',
      conDiagnostico: false,
      documento: 'tu programa',
      documentoConMarca: 'tu programa',
      tituloPantalla: 'Fuerza y sueño',
      marca: 'FUERZA Y SUEÑO',
      asuntoCorreo: 'Mi programa ATP',
      tituloPdf: 'Fuerza y sueño',
      nombrePdf: 'Mi-programa',
      encabezadoArgos: v.encabezadoArgos,
    });
    expect(v.encabezadoArgos.startsWith('Programa del usuario con su coach de ATP')).toBe(true);
    expect(archivoPdf(v, 1)).toBe('Mi-programa-v1.pdf');
  });

  it('sin nombre: Mi programa completo y TU PROGRAMA', () => {
    for (const nombre of [undefined, null, '', '   ']) {
      const v = vozDe({ tipo: 'programa', nombre });
      expect(v.nombre).toBeNull();
      expect(v.tituloPantalla).toBe('Mi programa completo');
      expect(v.marca).toBe('TU PROGRAMA');
      expect(v.tituloPdf).toBe('Mi programa');
    }
  });

  it('un nombre que dice Elite se descarta entero (no se recorta la palabra)', () => {
    for (const nombre of ['Plan Elite oro', 'PROGRAMA ELITE', 'elite']) {
      const v = vozDe({ tipo: 'programa', nombre });
      expect(v.nombre).toBeNull();
      expect(v.tituloPantalla).toBe('Mi programa completo');
      expect(v.marca).toBe('TU PROGRAMA');
    }
  });

  it('el nombre se limpia: una linea, sin espacios dobles, con tope', () => {
    expect(vozDe({ tipo: 'programa', nombre: '  Regreso  a\n la base  ' }).nombre).toBe('Regreso a la base');
    const largo = vozDe({ tipo: 'programa', nombre: 'x'.repeat(200) }).nombre;
    expect(largo).toHaveLength(ELITE_PROGRAMA_NOMBRE_MAX);
  });

  it('"tu evaluación" solo cuando el documento trae evaluacion; si no se sabe, "tu programa"', () => {
    expect(vozDe({ tipo: 'programa', conDiagnostico: true }).documento).toBe('tu evaluación');
    expect(vozDe({ tipo: 'programa', conDiagnostico: true }).documentoConMarca).toBe('tu evaluación');
    expect(vozDe({ tipo: 'programa', conDiagnostico: false }).documento).toBe('tu programa');
    expect(vozDe({ tipo: 'programa' }).documento).toBe('tu programa');
    expect(vozDe({ tipo: 'programa' }).conDiagnostico).toBe(false);
  });

  it('la plantilla programa_ejemplo.json da la voz de su programa, sin evaluacion', () => {
    const v = vozDeDocumento(valido(programa()));
    expect(v.tipo).toBe('programa');
    expect(v.nombre).toBe('Fuerza y sueño');
    expect(v.conDiagnostico).toBe(false);
    expect(v.documento).toBe('tu programa');
    expect(v.marca).toBe('FUERZA Y SUEÑO');
  });

  it('un programa con evaluacion ligera habla de "tu evaluación"', () => {
    const doc = programa();
    doc.sistemas = elite().sistemas;
    const v = vozDeDocumento(valido(doc));
    expect(v.conDiagnostico).toBe(true);
    expect(v.documento).toBe('tu evaluación');
    for (const t of todosLosTextos(v)) expect(t).not.toMatch(/elite/i);
  });
});

describe('nombreVisibleDelPlan', () => {
  const prog = vozDe({ tipo: 'programa' });

  it('a un cliente de programa, "Plan Elite vN" se le muestra neutro', () => {
    expect(nombreVisibleDelPlan('Plan Elite v1', prog)).toBe('Plan de alimentación · v1');
    expect(nombreVisibleDelPlan('Plan Elite v12', prog)).toBe('Plan de alimentación · v12');
    expect(nombreVisibleDelPlan(' Plan Elite v2 ', prog)).toBe('Plan de alimentación · v2');
  });

  it('cualquier otro nombre se queda tal cual', () => {
    for (const n of ['Mi plan de verano', 'Plan Elite', 'Plan Elite v2 (copia)', 'plan elite v2', 'Plan Elite vX', '']) {
      expect(nombreVisibleDelPlan(n, prog)).toBe(n);
    }
  });

  it('en Elite no cambia nada', () => {
    expect(nombreVisibleDelPlan('Plan Elite v2', VOZ_ELITE)).toBe('Plan Elite v2');
    expect(nombreVisibleDelPlan('Mi plan de verano', VOZ_ELITE)).toBe('Mi plan de verano');
  });

  it('sin nombre devuelve null, no un texto inventado', () => {
    expect(nombreVisibleDelPlan(null, prog)).toBeNull();
    expect(nombreVisibleDelPlan(undefined, VOZ_ELITE)).toBeNull();
  });
});

describe('conMayuscula', () => {
  it('sube solo la primera letra', () => {
    expect(conMayuscula('tu programa')).toBe('Tu programa');
    expect(conMayuscula('tu evaluación Elite')).toBe('Tu evaluación Elite');
    expect(conMayuscula('')).toBe('');
  });
});
