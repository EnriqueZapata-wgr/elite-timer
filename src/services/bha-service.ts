/**
 * Scanner ATP Functional Score — I/O (Sprint Compliance 4; antes sello BHA).
 *
 * Flujo: foto de etiqueta (base64, mismo picking que food-scan) → callAnthropic
 * multimodal con requestType 'bha_scan' → parseo defensivo (bha-core) →
 * persistencia del score en la ficha (user_supplements.functional_score +
 * bha_scan_summary con el desglose por atributos).
 *
 * Doctrina H+: el COBRO es server-side — argos-proxy lee proton_action_costs
 * por requestType ('bha_scan', 500 H+ en migración 189). El action_key se
 * MANTIENE 'bha_scan' (interno, no user-facing) para no tocar el cobro
 * server-side; el rename es solo de superficie. El cliente hace el pre-flight
 * de quote (UX) y maneja el 402 (insufficient) del proxy.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic, extractResponseText } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { getActionCost, getProtonBalanceOrZero } from '@/src/services/economy/proton-service';
import { generateUUID } from '@/src/utils/uuid';
import { ATP_LLM } from '@/src/constants/llm-config';
import {
  FUNCTIONAL_SCORE_PROMPT,
  buildScanUserText,
  buildScoreSummaryText,
  parseFunctionalScoreResponse,
  type FunctionalScoreResult,
} from './bha-core';

export const BHA_SCAN_ACTION_KEY = 'bha_scan';

export type BhaScanOutcome =
  | { status: 'ok'; result: FunctionalScoreResult }
  | { status: 'illegible' }
  | { status: 'insufficient_h_plus' }
  | { status: 'error'; message?: string };

/** Pre-flight de H+ (patrón DX/braverman-premium): costo + balance actual. */
export async function getBhaScanQuote(
  userId: string,
): Promise<{ cost: number; balance: number }> {
  const [cost, balance] = await Promise.all([
    getActionCost(BHA_SCAN_ACTION_KEY),
    getProtonBalanceOrZero(userId),
  ]);
  return { cost, balance: balance.current_protons };
}

/**
 * Escanea una etiqueta (suplemento o comida empaquetada) y devuelve el score.
 * NO persiste — el caller decide (persistFunctionalScore) porque el scan
 * también existe standalone (punto de entrada de sección, sin ficha destino).
 */
export async function runBhaScan(
  userId: string,
  photoBase64: string,
  opts?: { productName?: string | null; brand?: string | null },
): Promise<BhaScanOutcome> {
  let data: any;
  try {
    const meta = await getArgosCallMetadata({
      callerUserId: userId,
      requestType: BHA_SCAN_ACTION_KEY,
      idempotencyKey: generateUUID(),
    });
    data = await callAnthropic(
      [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 } },
          { type: 'text', text: buildScanUserText(opts?.productName, opts?.brand) },
        ],
      }],
      // 4000: Sonnet 5 con adaptive thinking consume el budget también en
      // thinking — con menos se truncaba el JSON (patrón dx-engine).
      4000,
      ATP_LLM.PRIMARY_MODEL,
      FUNCTIONAL_SCORE_PROMPT,
      meta,
    );
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    // El proxy cobra server-side; 402 = balance insuficiente (doctrina H+).
    if (msg.includes('402')) return { status: 'insufficient_h_plus' };
    return { status: 'error', message: msg };
  }

  const rawText = extractResponseText(data);
  if (!rawText) return { status: 'error', message: 'empty_response' };
  // Truncado por cap total (thinking + texto): NO interpretar JSON incompleto.
  if (data?.stop_reason === 'max_tokens') {
    return { status: 'error', message: 'respuesta_incompleta_max_tokens' };
  }

  const result = parseFunctionalScoreResponse(rawText);
  if (!result) return { status: 'error', message: 'respuesta_no_interpretable' };
  if (result.illegible) return { status: 'illegible' };
  return { status: 'ok', result };
}

/**
 * Persiste el score en la ficha del suplemento (functional_score numérico +
 * desglose en bha_scan_summary). bha_status legado NO se toca (scans viejos
 * conservan su dato — cero borrado).
 */
export async function persistFunctionalScore(
  supplementId: string,
  result: FunctionalScoreResult,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_supplements')
    .update({
      functional_score: result.score,
      bha_scan_summary: buildScoreSummaryText(result),
    })
    .eq('id', supplementId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
