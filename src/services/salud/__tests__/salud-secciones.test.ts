/**
 * OLA6 PIEZA A — las tres puertas murieron como rutas.
 *
 * Dos cosas se protegen aquí:
 *   1. El estado de las secciones sobrevive a basura en disco (el usuario no
 *      pierde su pantalla porque cambiamos el shape).
 *   2. /salud/hoy, /salud/evolucion y /salud/expediente NO vuelven a ser
 *      cascarones: son redirects. Si alguien las repuebla, truena aquí.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { mergeSecciones, SECCIONES_DEFAULT } from '../salud-secciones-store';

describe('estado de las secciones de SALUD', () => {
  it('HOY abierta por default y el resto cerradas', () => {
    expect(SECCIONES_DEFAULT.hoy).toBe(true);
    expect(SECCIONES_DEFAULT.datos).toBe(false);
    expect(SECCIONES_DEFAULT.evolucion).toBe(false);
    expect(SECCIONES_DEFAULT.expediente).toBe(false);
    expect(SECCIONES_DEFAULT.ciclo).toBe(false);
  });

  it('respeta lo que el usuario dejó guardado', () => {
    const m = mergeSecciones({ hoy: false, expediente: true });
    expect(m.hoy).toBe(false);
    expect(m.expediente).toBe(true);
    expect(m.evolucion).toBe(false);
  });

  it.each([null, undefined, 'basura', 42, [], { hoy: 'sí' }])('%s cae al default sin tronar', (raw) => {
    expect(mergeSecciones(raw)).toEqual(SECCIONES_DEFAULT);
  });
});

describe('las tres puertas son puentes, no pantallas', () => {
  const rutas = ['app/salud/hoy.tsx', 'app/salud/evolucion.tsx', 'app/salud/expediente.tsx'];

  it.each(rutas)('%s redirige al tab con su sección', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('Redirect');
    expect(src).toContain("pathname: '/salud'");
    expect(src.includes('PuertaScreen')).toBe(false);
  });

  it('PuertaScreen ya no existe (era la pantalla que costaba un toque de más)', () => {
    expect(existsSync('src/screens/salud/PuertaScreen.tsx')).toBe(false);
  });
});
