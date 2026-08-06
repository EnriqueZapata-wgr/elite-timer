/**
 * pack-etapas-core (MB-26 Pieza 7.2) — el pack entra por etapas, puro.
 *
 * Fuera la pregunta de suave contra con todo: menos decisiones. Aplicar
 * enciende los TRES core del pack (etapa 1); los demás llegan cuando
 * sostienes los primeros — la misma señal que la graduación, en corto:
 * 14 de 21 días. El usuario puede adelantarlos cuando quiera.
 *
 * La etapa vive en la fila de user_packs reusando `intensidad` (suave =
 * etapa 1, con_todo = etapa 2): cero migraciones y planDeFila reconstruye
 * el plan previo exacto. La señal se mide sobre los core que dejan rastro
 * en el ledger (los cuantitativos ganan fracción, no fila): un pack sin
 * core medible no propone solo — el botón de adelantar siempre está.
 */
import { PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { ALL_QUANT_OPTIONS } from '@/src/services/hoy/day-booleans';
import {
  cumplidosEnVentana, ETAPA_PACK, type HistorialHabitos,
} from '@/src/services/hoy/graduacion-core';
import type { UserPackRow } from '@/src/services/pack-core';

/** Sin ledger booleano: su cumplimiento no deja fila por día. */
const SIN_LEDGER = new Set(ALL_QUANT_OPTIONS.map((o) => o.key as string));

export interface EstadoEtapa {
  etapa: 1 | 2;
  /** Etapa 1: ¿los core medibles ya se sostienen 14/21? (etapa 2: true.) */
  sostiene: boolean;
  /** El core medible menos avanzado, para pintar progreso. Null si el
   *  pack no tiene core medible (o ya está en etapa 2). */
  progreso: { cumplidos: number; objetivo: number } | null;
  /** Lo que llega con la etapa 2. */
  pendientes: string[];
}

export function etapaDelPack(
  row: UserPackRow,
  historial: HistorialHabitos,
  hoy: string,
): EstadoEtapa {
  const pack = PACK_BY_KEY[row.pack_key];
  const etapa: 1 | 2 = row.intensidad === 'con_todo' ? 2 : 1;
  if (!pack || etapa === 2) {
    return { etapa, sostiene: true, progreso: null, pendientes: [] };
  }
  const pendientes = pack.enciende.filter((h) => !h.core).map((h) => h.electron as string);
  const medibles = habitosPorIntensidad(pack, 'suave')
    .map((h) => h.electron as string)
    .filter((k) => !SIN_LEDGER.has(k));
  if (medibles.length === 0) {
    return { etapa, sostiene: false, progreso: null, pendientes };
  }
  const cumplidos = medibles.map((k) => cumplidosEnVentana(historial[k], hoy, ETAPA_PACK.dias));
  const minimo = Math.min(...cumplidos);
  return {
    etapa,
    sostiene: minimo >= ETAPA_PACK.minimo,
    progreso: { cumplidos: minimo, objetivo: ETAPA_PACK.minimo },
    pendientes,
  };
}
