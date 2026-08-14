/**
 * Economía · reporte del dominio (OLA1 R-0).
 *
 * Junta lo que hoy vive en dos lados: la serie de electrones que pinta el hub
 * y los movimientos que lista /economy/history. El rango manda: los servicios
 * de historial no filtran por fecha, así que se recortan aquí contra el rango
 * resuelto en vez de enseñar movimientos de fuera de la ventana.
 */
import { supabase } from '@/src/lib/supabase';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { getElectronHistory } from '@/src/services/economy/electron-service';
import { getProtonHistory } from '@/src/services/economy/proton-service';
import { humanizeKey } from '@/src/services/economy/tx-labels';
import { getElectronReport, type ElectronReport } from '@/src/services/reports-service';
import type { ResolvedRange, ServicePeriod } from './report-domain-core';

/** Techo de lectura: por encima de esto no es un reporte, es un volcado. */
const HISTORY_LIMIT = 500;

export type EconomiaCurrency = 'E-' | 'H+';

export interface EconomiaMovement {
  id: string;
  moneda: EconomiaCurrency;
  /** YYYY-MM-DD local del movimiento. */
  fecha: string;
  concepto: string;
  monto: number;
}

export interface EconomiaReport {
  electrons: ElectronReport;
  movements: EconomiaMovement[];
  /** true si se alcanzó el techo de lectura y la lista quedó recortada. */
  truncated: boolean;
}

function inRange(fecha: string, range: ResolvedRange): boolean {
  if (fecha > range.to) return false;
  return range.from == null || fecha >= range.from;
}

/**
 * Lanza si no hay sesión: el shell necesita poder distinguir "no pudimos leer"
 * de "no hay movimientos", y sin usuario no leímos nada.
 */
export async function getEconomiaReport(
  period: ServicePeriod, range: ResolvedRange,
): Promise<EconomiaReport> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error('economia: sin sesión, no se pudo leer');

  const [electrons, electronTx, protonTx] = await Promise.all([
    getElectronReport(period),
    getElectronHistory(userId, HISTORY_LIMIT),
    getProtonHistory(userId, HISTORY_LIMIT),
  ]);

  const movements: EconomiaMovement[] = [];
  for (const tx of electronTx) {
    const fecha = toLocalDateString(new Date(tx.created_at));
    if (inRange(fecha, range)) {
      movements.push({ id: tx.id, moneda: 'E-', fecha, concepto: humanizeKey(tx.reason), monto: tx.amount });
    }
  }
  for (const tx of protonTx) {
    const fecha = toLocalDateString(new Date(tx.created_at));
    if (!inRange(fecha, range)) continue;
    const concepto = tx.action_key
      ? `${humanizeKey(tx.type)} · ${humanizeKey(tx.action_key)}`
      : humanizeKey(tx.type);
    movements.push({ id: tx.id, moneda: 'H+', fecha, concepto, monto: tx.amount });
  }

  movements.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return {
    electrons,
    movements,
    truncated: electronTx.length >= HISTORY_LIMIT || protonTx.length >= HISTORY_LIMIT,
  };
}
