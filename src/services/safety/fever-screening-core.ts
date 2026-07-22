/**
 * Sprint Compliance 3 — Screening de fiebre (núcleo PURO).
 *
 * Umbrales BORRADOR del handoff (Mariana confirma como contenido; viven en
 * safety_params → ajustables sin re-deploy):
 *   - Temperatura > 39°C
 *   - Duración > 48 horas
 *   - Embarazo declarado
 *   - Síntoma rojo: rigidez de nuca, dificultad respiratoria, confusión,
 *     sarpullido que no blanquea, convulsión
 * Cualquiera de estos → card obligatoria "Busca atención médica ahora"
 * (bloquea el contenido "acompañar"). Si NINGUNO aplica → el contenido
 * "acompañar" se ofrece como opt-in con disclaimer.
 */
import type { FeverScreeningParams } from './safety-params-defaults';

export interface FeverScreeningInput {
  /** Temperatura reportada en °C (null = no la sabe). */
  tempC: number | null;
  /** Horas con fiebre (null = no lo sabe). */
  durationHours: number | null;
  /** Síntomas rojos marcados (vocabulario de params.redFlags). */
  redFlags: string[];
  pregnancy: boolean;
}

export interface FeverScreeningResult {
  outcome: 'seek_care' | 'accompany_ok';
  /** Razones que dispararon la derivación (vacío si accompany_ok). */
  reasons: ('temp' | 'duration' | 'pregnancy' | 'red_flag')[];
}

export function screenFever(input: FeverScreeningInput, params: FeverScreeningParams): FeverScreeningResult {
  const reasons: FeverScreeningResult['reasons'] = [];
  if (input.tempC != null && input.tempC > params.tempThresholdC) reasons.push('temp');
  if (input.durationHours != null && input.durationHours > params.durationThresholdHours) reasons.push('duration');
  if (params.pregnancyTriggers && input.pregnancy) reasons.push('pregnancy');
  if (input.redFlags.some(f => params.redFlags.includes(f))) reasons.push('red_flag');
  return reasons.length > 0
    ? { outcome: 'seek_care', reasons }
    : { outcome: 'accompany_ok', reasons: [] };
}

/** Labels UI de los síntomas rojos (vocabulario del seed 210). */
export const FEVER_RED_FLAG_LABELS: Record<string, string> = {
  rigidez_nuca: 'Rigidez de nuca',
  dificultad_respiratoria: 'Dificultad para respirar',
  confusion: 'Confusión o alteración mental',
  sarpullido_no_blanquea: 'Sarpullido que no desaparece al presionarlo',
  convulsion: 'Convulsión',
};

export const FEVER_SEEK_CARE_TITLE = 'Busca atención médica ahora';
export const FEVER_SEEK_CARE_MESSAGE =
  'Por lo que reportas, esta fiebre amerita valoración médica hoy — no acompañamiento en la app. Acude a tu médico o a urgencias. Si hay convulsión, confusión o dificultad para respirar, llama al 911.';
export const FEVER_ACCOMPANY_DISCLAIMER =
  'Este contenido es educativo y no sustituye la valoración de un profesional de salud. Si la fiebre supera 39°C, dura más de 48 horas o aparece un síntoma de alarma, busca atención médica.';
