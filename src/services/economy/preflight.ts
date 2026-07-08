/**
 * Pre-flight de acciones IA: ¿el usuario tiene H+ suficientes ANTES de llamar a ARGOS?
 *
 * Cuando LAB_ECONOMY_ENABLED=false (default) es NO-OP (siempre ok) → no cambia el flujo
 * actual. Cuando se active, los call-sites de ARGOS (chat, food, lab, etc.) deben llamar
 * preflightAction() y, si !ok, enrutar a /economy/shop en vez de llamar al proxy (el proxy
 * también responde 402, pero el pre-flight evita el roundtrip y da mejor UX).
 *
 * ⚠️ FLAG: el wiring en cada call-site de ARGOS + el redirect a tienda NO se cableó este
 * sprint (toca flujos UX de ARGOS, mejor con review visual de Enrique). Helper listo.
 */
import { LAB_ECONOMY_ENABLED } from './economy-config';
import { getActionCost, getProtonBalanceOrZero } from './proton-service';

export interface PreflightResult {
  ok: boolean;
  required: number;
  current: number;
}

export async function preflightAction(userId: string, actionKey: string): Promise<PreflightResult> {
  if (!LAB_ECONOMY_ENABLED) return { ok: true, required: 0, current: 0 }; // feature OFF → no gatea
  // Preflight es gating — necesitamos el zero-state defensivo aquí (si balance es null,
  // NO permitir la acción). Por eso usamos OrZero en vez de la variante nueva.
  const [required, balance] = await Promise.all([
    getActionCost(actionKey),
    getProtonBalanceOrZero(userId),
  ]);
  return { ok: balance.current_protons >= required, required, current: balance.current_protons };
}

/** Detecta el 402 'insufficient_protons' del argos-proxy en la respuesta cruda. */
export function isInsufficientProtons(resp: any): boolean {
  return resp?.error?.type === 'insufficient_protons';
}
