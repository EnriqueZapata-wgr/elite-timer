/**
 * ArgosPresenceContext — control global de la presencia de ARGOS (T2).
 *
 *  - `hidden` / `setHidden`: una pantalla puede ocultar el floating button si
 *    estorba (ej. una cámara a pantalla completa) sin desmontar el provider.
 *  - `introduced` / `setIntroduced`: ARGOS solo aparece después de "Meet ARGOS"
 *    (T6). Default true para no bloquear QA / usuarios existentes; el provider
 *    afina el valor leyendo profiles.argos_introduced_at (ver T6).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/src/contexts/auth-context';
import { hasArgosBeenIntroduced } from '@/src/services/argos-intro-service';

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
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [introduced, setIntroduced] = useState(initialIntroduced);

  // T6: la verdad durable es profiles.argos_introduced_at. Usuarios existentes
  // (backfilleados en migración 163) → true; usuarios nuevos → false hasta que
  // pasen por "Meet ARGOS" (que además llama setIntroduced(true) en vivo).
  useEffect(() => {
    let alive = true;
    if (!user?.id) return;
    hasArgosBeenIntroduced(user.id)
      .then((v) => { if (alive) setIntroduced(v); })
      .catch(() => { /* fail-open: se queda con el default */ });
    return () => { alive = false; };
  }, [user?.id]);

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
