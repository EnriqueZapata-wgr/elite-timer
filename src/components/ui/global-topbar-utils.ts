/**
 * Lógica pura de GlobalTopBar (#75), sin imports de React Native — testeable en vitest
 * (el repo no tiene testing-library para render). La barra decide campana-vs-casita y
 * back-vs-no-back según si la ruta es la raíz HOY.
 */

/** ¿La ruta actual es la raíz HOY? (pill + campana; sin back ni casita). */
export function isHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname === '/index' || pathname.endsWith('/(tabs)');
}
