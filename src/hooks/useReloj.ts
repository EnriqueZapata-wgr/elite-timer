/**
 * useReloj (bloque TIMERS) — el único reloj de Fitness en React.
 *
 * Expone el estado puro de reloj-core y UN solo tick de re-render: un
 * setInterval (250 ms por defecto) que corre solo mientras el reloj corre y
 * cuyo único trabajo es forzar un render. El tiempo NUNCA sale del tick: se
 * lee de Date.now() en cada render y se calcula con transcurridoMs(). Por eso
 * el segundo plano no lo desfasa: al volver, AppState 'active' fuerza un
 * render y el transcurrido ya trae el salto completo.
 *
 * Cada tick además RE-ANCLA el reloj en Date.now() (normalizar): lo ya corrido
 * pasa a acumulado y el tramo abierto arranca de nuevo. Así, si el reloj del
 * sistema retrocede (ajuste NTP), el contador se congela en lo que llevaba en
 * vez de saltar hacia atrás hasta la duración completa.
 *
 * La pantalla despierta (KeepAwakeActive) NO vive aquí: se monta una sola vez
 * por pantalla (app/session.tsx · TimerModeRunner), no por cada reloj.
 *
 * Uso típico:
 *   const reloj = useReloj({ autoIniciar: true });
 *   const { restanteSeg, terminado } = descansoRestante(reloj.transcurridoMs, 60);
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  RELOJ_DETENIDO,
  iniciar as coreIniciar,
  pausar as corePausar,
  reanudar as coreReanudar,
  reiniciar as coreReiniciar,
  normalizar as coreNormalizar,
  transcurridoMs as coreTranscurridoMs,
  restanteMs as coreRestanteMs,
  type EstadoReloj,
} from '@/src/services/fitness/reloj-core';

export interface OpcionesReloj {
  /** Arranca corriendo desde el primer render (descansos, bloques de tiempo). */
  autoIniciar?: boolean;
  /** Cadencia del tick de re-render mientras corre. 250 ms basta para segundos enteros. */
  tickMs?: number;
}

export interface Reloj {
  estado: EstadoReloj;
  corriendo: boolean;
  /** Milisegundos transcurridos leídos en este render. */
  transcurridoMs: number;
  /** Milisegundos que faltan para cubrir `duracionMs`, leídos en este render. */
  restanteMs: (duracionMs: number) => number;
  /** Arranca desde cero (aunque ya corriera). */
  iniciar: () => void;
  pausar: () => void;
  reanudar: () => void;
  /** Detiene y vuelve a cero. */
  reiniciar: () => void;
}

export function useReloj(opciones: OpcionesReloj = {}): Reloj {
  const { autoIniciar = false, tickMs = 250 } = opciones;
  const [estado, setEstado] = useState<EstadoReloj>(() =>
    autoIniciar ? coreIniciar(RELOJ_DETENIDO, Date.now()) : coreReiniciar(),
  );
  // El tick no cuenta tiempo: re-ancla el reloj en Date.now() (normalizar) y
  // ese estado nuevo provoca el render que lo relee. Si no corre, no cambia
  // nada y React no re-renderiza.
  const forzarRender = useCallback(() => setEstado((e) => coreNormalizar(e, Date.now())), []);

  useEffect(() => {
    if (!estado.corriendo) return;
    const id = setInterval(forzarRender, tickMs);
    // Al volver del segundo plano el intervalo puede tardar en despertar:
    // un render inmediato para que el salto se vea al instante.
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') forzarRender();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [estado.corriendo, tickMs, forzarRender]);

  const iniciar = useCallback(() => setEstado((e) => coreIniciar(e, Date.now())), []);
  const pausar = useCallback(() => setEstado((e) => corePausar(e, Date.now())), []);
  const reanudar = useCallback(() => setEstado((e) => coreReanudar(e, Date.now())), []);
  const reiniciar = useCallback(() => setEstado(() => coreReiniciar()), []);

  const ahora = Date.now();
  const transcurrido = coreTranscurridoMs(estado, ahora);

  return {
    estado,
    corriendo: estado.corriendo,
    transcurridoMs: transcurrido,
    restanteMs: (duracionMs: number) => coreRestanteMs(estado, duracionMs, ahora),
    iniciar,
    pausar,
    reanudar,
    reiniciar,
  };
}
