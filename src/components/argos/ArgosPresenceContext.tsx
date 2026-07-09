/**
 * ArgosPresenceContext — control global de la presencia de ARGOS (T2).
 *
 *  - `hidden` / `setHidden`: una pantalla puede ocultar el floating button si
 *    estorba (ej. una cámara a pantalla completa) sin desmontar el provider.
 *  - `introduced` / `setIntroduced`: ARGOS solo aparece después de "Meet ARGOS"
 *    (T6). Default true para no bloquear QA / usuarios existentes; el provider
 *    afina el valor leyendo profiles.argos_introduced_at (ver T6).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ArgosPresenceValue {
  hidden: boolean;
  setHidden: (v: boolean) => void;
  introduced: boolean;
  setIntroduced: (v: boolean) => void;
}

const ArgosPresenceContext = createContext<ArgosPresenceValue | null>(null);

export function ArgosPresenceProvider({
  children,
  initialIntroduced = true,
}: {
  children: ReactNode;
  initialIntroduced?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [introduced, setIntroduced] = useState(initialIntroduced);

  const value = useMemo<ArgosPresenceValue>(
    () => ({ hidden, setHidden, introduced, setIntroduced }),
    [hidden, introduced],
  );

  return <ArgosPresenceContext.Provider value={value}>{children}</ArgosPresenceContext.Provider>;
}

/** Consume la presencia de ARGOS. Fuera del provider retorna defaults seguros. */
export function useArgosPresence(): ArgosPresenceValue {
  const ctx = useContext(ArgosPresenceContext);
  if (!ctx) {
    return { hidden: false, setHidden: () => {}, introduced: true, setIntroduced: () => {} };
  }
  return ctx;
}
