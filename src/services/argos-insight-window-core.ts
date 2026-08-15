/**
 * Ventana del insight diario (CIERRE-4 · Audit-3) — lógica pura, sin I/O.
 *
 * EL PROBLEMA QUE RESUELVE
 *  La guarda del insight nunca fue "uno al día": era "cache de 6 horas", y
 *  `invalidateDailyInsight` la anulaba poniendo `created_at` en epoch 0. El
 *  evento `day_changed` se emite desde 36 lugares del código (cada comida,
 *  cada tramo de ayuno, cada entrada de journal...), así que el patrón real
 *  era: registro cualquier cosa → el insight queda invalidado → el usuario
 *  vuelve a abrir la app → arranque en frío → llamada nueva a Sonnet. Sin
 *  techo. Medido en producción (argos_logs, 30 días): 193 llamadas de
 *  `insight` contra un diseño de una por usuario por día.
 *
 * LA REGLA NUEVA, EN UNA LÍNEA
 *  El día se parte en ventanas fijas de 4 horas y dentro de una ventana se
 *  genera UN insight, sin importar cuántas veces se invalide ni cuántas veces
 *  se abra la app. Eso es el batching: las invalidaciones se acumulan y una
 *  sola generación las atiende a todas.
 *
 * POR QUÉ TAMBIÉN SE EXIGE `stale`
 *  Cruzar de ventana no basta. Si el usuario no registró NADA, el contexto es
 *  idéntico y el insight regenerado saldría igual: pagar Sonnet para reescribir
 *  el mismo texto. Se regenera solo cuando hay ventana nueva Y hubo cambio
 *  real en el día. El techo pasa de "sin límite" a 6 por día, y lo normal
 *  queda en 1 a 3.
 *
 * POR QUÉ LAS VENTANAS SE ANCLAN AL RELOJ Y NO AL `created_at`
 *  Anclarlas al último insight las haría rodar por usuario y cada quien caería
 *  en un instante distinto. Ancladas al reloj (índice derivado de epoch, sin
 *  zona horaria de por medio) todos comparten los mismos cortes, que es la
 *  precondición para que un día la caché de Anthropic se pueda compartir entre
 *  usuarios. Hoy no la compartimos — el insight no lleva cerebro (ver Audit-4)
 *  — pero la alineación no cuesta nada y deja la puerta abierta.
 *
 * LO QUE ESTA REGLA NO PUEDE QUITARLE A NADIE
 *  El primer insight de cada día siempre se genera: la fila de `argos_daily_insights`
 *  es por fecha, así que al amanecer no hay fila y `sinInsight` gana. Nadie se
 *  queda sin el insight que paga.
 */

/** Horas por ventana. 24 / 4 = 6 ventanas al día → techo de 6 insights. */
export const INSIGHT_VENTANA_HORAS = 4;

const MS_POR_HORA = 3_600_000;

/**
 * Índice de ventana global para un instante. Se deriva de epoch directo, así
 * que es independiente de zona horaria y de horario de verano: dos dispositivos
 * en husos distintos que miran el mismo instante obtienen el mismo índice.
 * NO es una consulta por fecha, por eso no usa getLocalToday().
 */
export function indiceVentana(epochMs: number, ventanaHoras: number = INSIGHT_VENTANA_HORAS): number {
  const horas = ventanaHoras > 0 ? ventanaHoras : INSIGHT_VENTANA_HORAS;
  return Math.floor(epochMs / (horas * MS_POR_HORA));
}

export type MotivoInsight =
  | 'sin_insight'      // no hay insight de hoy → se genera (garantía diaria)
  | 'ventana_nueva'    // ventana distinta + hubo cambios → se regenera
  | 'misma_ventana'    // ya se generó en esta ventana → se espera
  | 'sin_cambios';     // ventana nueva pero el día no cambió → no hay qué decir

export interface DecisionInsight {
  regenerar: boolean;
  motivo: MotivoInsight;
}

/**
 * Decide si toca generar/regenerar el insight diario.
 *
 * `stale` lo pone `invalidateDailyInsight` cuando el día cambió de verdad.
 * Un `createdAtMs` nulo o no numérico se trata como "no hay insight utilizable":
 * ante la duda se genera, porque quedarse sin insight es peor que una llamada de más.
 */
export function decidirRegeneracionInsight(args: {
  hayInsight: boolean;
  createdAtMs: number | null;
  stale: boolean;
  ahoraMs: number;
  ventanaHoras?: number;
}): DecisionInsight {
  const { hayInsight, createdAtMs, stale, ahoraMs } = args;
  const ventanaHoras = args.ventanaHoras ?? INSIGHT_VENTANA_HORAS;

  if (!hayInsight || createdAtMs === null || !Number.isFinite(createdAtMs)) {
    return { regenerar: true, motivo: 'sin_insight' };
  }

  const mismaVentana = indiceVentana(createdAtMs, ventanaHoras) === indiceVentana(ahoraMs, ventanaHoras);
  if (mismaVentana) return { regenerar: false, motivo: 'misma_ventana' };

  // Ventana nueva. Solo vale la pena si el día cambió desde el último insight.
  return stale
    ? { regenerar: true, motivo: 'ventana_nueva' }
    : { regenerar: false, motivo: 'sin_cambios' };
}
