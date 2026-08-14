/**
 * OLA6 PIEZA C — el flujo de labs deja de ser un círculo.
 *
 * Había tres salidas verificadas que devolvían a /my-health, la misma pantalla
 * donde empieza la subida: el usuario guardaba y aterrizaba donde no se ven
 * sus valores. Aquí se protege que no vuelvan.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { setNuevos, takeNuevos, resetNuevos } from '../lab-nuevos-store';

describe('caja de los parámetros recién guardados', () => {
  beforeEach(() => resetNuevos());

  it('arranca vacía', () => {
    expect(takeNuevos()).toEqual([]);
  });

  it('devuelve lo guardado y se vacía (el resaltado es del aterrizaje)', () => {
    setNuevos(['glucosa', 'hba1c']);
    expect(takeNuevos()).toEqual(['glucosa', 'hba1c']);
    expect(takeNuevos()).toEqual([]);
  });

  it('no repite claves', () => {
    setNuevos(['hdl', 'hdl', 'ldl']);
    expect(takeNuevos()).toEqual(['hdl', 'ldl']);
  });
});

describe('labs ya no regresa al punto de partida', () => {
  const confirmation = readFileSync('app/edad-atp/lab-confirmation.tsx', 'utf8');

  it('ninguna salida de la confirmación replace a /my-health', () => {
    expect(confirmation.includes("replace('/my-health')")).toBe(false);
  });

  it('guardar aterriza en ATP Labs con el conteo', () => {
    expect(confirmation).toContain("pathname: '/edad-atp/labs'");
    expect(confirmation).toContain('setNuevos');
  });

  it('descartar sale a Mis Datos con replace, nunca con back', () => {
    expect(confirmation).toContain("router.replace('/salud/mis-datos')");
    expect(confirmation.includes('router.back()')).toBe(false);
  });

  it('ATP Labs lee el conteo y resalta', () => {
    const labs = readFileSync('app/edad-atp/labs.tsx', 'utf8');
    expect(labs).toContain('takeNuevos');
    expect(labs).toContain('rowWrapNuevo');
  });
});
