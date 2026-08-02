/**
 * useSystemReducedMotion (19.1 · Pieza 5) — LA señal de "reducir movimiento".
 *
 * Lee AccessibilityInfo.isReduceMotionEnabled() y se suscribe al cambio en
 * vivo (reduceMotionChanged): si el usuario prende el interruptor con la app
 * abierta, la animación se apaga sin reiniciar. Es la misma señal que la orbe
 * usa para degradar a REDUCED_GLOW — se reutiliza, no se duplica.
 *
 * No hay ajuste propio en la app a propósito: el sistema operativo ya tiene
 * ese interruptor y la gente que lo necesita ya lo tiene puesto.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (alive) setReduced(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduced(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduced;
}
