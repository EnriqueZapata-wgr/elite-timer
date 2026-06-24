import { describe, it, expect } from 'vitest';
import { isHomePath } from '@/src/components/ui/global-topbar-utils';

/**
 * #75 — GlobalTopBar. La decisión campana-vs-casita (y back-vs-no-back) depende SOLO de si la
 * ruta es la raíz HOY. Se extrae a isHomePath() para testear sin renderizar RN (el repo no tiene
 * testing-library). El render (pill self-gated, iconos) se valida en device.
 */
describe('GlobalTopBar — isHomePath (campana en HOY, casita fuera)', () => {
  it('raíz HOY → true (botón = campana, sin back)', () => {
    expect(isHomePath('/')).toBe(true);
    expect(isHomePath('/index')).toBe(true);
    expect(isHomePath('/(tabs)')).toBe(true);
    expect(isHomePath('/app/(tabs)')).toBe(true);
  });

  it('otras pantallas → false (botón = casita, con back)', () => {
    expect(isHomePath('/edad-atp/labs')).toBe(false);
    expect(isHomePath('/cycle')).toBe(false);
    expect(isHomePath('/economy/admin')).toBe(false);
    expect(isHomePath('/historia-clinica/padecimientos')).toBe(false);
  });

  it('pathname vacío/null → false (no asume raíz)', () => {
    expect(isHomePath(null)).toBe(false);
    expect(isHomePath(undefined)).toBe(false);
    expect(isHomePath('')).toBe(false);
  });
});
