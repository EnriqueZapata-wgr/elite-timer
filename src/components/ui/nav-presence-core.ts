/**
 * Nav presence (V1.5.1 #8) — lógica pura: cuántas pantallas ENFOCADAS traen su
 * propia navegación (ScreenHeader / PillarHeader / StickyPillarBanner /
 * GlobalTopBar / BackButton, o useRegisterOwnNav directo — ver
 * useOwnNavPresence.ts). La casita flotante global se oculta cuando count > 0 —
 * así "matar el flotante donde el banner lo cubre" es automático y no una lista
 * de rutas que se pudre: adoptar el header estándar en una pantalla nueva la
 * cubre sola. El censo nav-presence-census.test.ts lo hace ley.
 */
let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Registra presencia de nav propia; devuelve el release (idempotente). */
export function registerOwnNav(): () => void {
  count++;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count = Math.max(0, count - 1);
    emit();
  };
}

/** true si la pantalla enfocada pinta su propia casita. */
export function hasOwnNav(): boolean {
  return count > 0;
}

export function subscribeOwnNav(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Solo para tests. */
export function _resetOwnNav(): void {
  count = 0;
  listeners.clear();
}
