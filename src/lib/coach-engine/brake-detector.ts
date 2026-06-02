// Coach Engine — Detector de Frenos
// Brief §5 — clasifica frenos en el input del cliente + jerarquía dominante.
// System prompt Bloque 5 (Modelo Acelerador/Freno): 4 frenos. Desbloquea de
// arriba hacia abajo — ataca el dominante primero.

import { supabase } from '@/src/lib/supabase';
import type { BrakeType } from './types';

export interface DetectedBrake {
  type: BrakeType;
  /** Confianza heurística 0-1 (keywords + señales de contexto). */
  confidence: number;
  /** Primera keyword que disparó la detección (para evidence_text). */
  keywordMatched: string;
}

/** Señales de contexto que refuerzan la confianza de ciertos frenos. */
export interface BrakeContextSignals {
  energyLow?: boolean;
  recentAvoidance?: boolean;
}

/**
 * Jerarquía de desbloqueo del Bloque 5 (arriba → abajo). Sirve de tie-break
 * cuando dos frenos empatan en confianza: gana el de mayor prioridad.
 */
const BRAKE_PRIORITY: BrakeType[] = ['no_saber', 'miedo', 'energia_biologica', 'apatia'];

/** Keywords heurísticas por freno (caso-insensible). Refinables post-Mariana. */
const BRAKE_KEYWORDS: Record<BrakeType, string[]> = {
  no_saber: ['no sé', 'no se', 'cómo hago', 'como hago', 'qué hago', 'que hago', 'no tengo idea'],
  miedo: ['me da miedo', 'tengo miedo', 'y si', 'no me atrevo', 'pero qué tal si', 'pero que tal si'],
  energia_biologica: ['cansado', 'agotado', 'sin energía', 'sin energia', 'no tengo fuerza', 'fatigado'],
  apatia: ['flojera', 'no tengo ganas', 'no quiero', 'mañana', 'manana', 'más tarde', 'mas tarde'],
};

const BASE_CONFIDENCE = 0.5;
const EXTRA_KEYWORD_BONUS = 0.1;
const ENERGY_LOW_BONUS = 0.3;
const RECENT_AVOIDANCE_BONUS = 0.2;

/**
 * Clasifica frenos presentes en el input del cliente (Bloque 5).
 * Heurística keywords + señales de contexto; confidence 0-1 (cap 1.0).
 * energyLow refuerza energia_biologica (+0.3); recentAvoidance refuerza miedo (+0.2).
 */
export function detectBrakes(
  userInput: string,
  contextSignals?: BrakeContextSignals,
): DetectedBrake[] {
  const haystack = userInput.toLowerCase();
  const detected: DetectedBrake[] = [];

  for (const type of BRAKE_PRIORITY) {
    const matches = BRAKE_KEYWORDS[type].filter((kw) => haystack.includes(kw));
    if (matches.length === 0) continue;

    let confidence = BASE_CONFIDENCE + (matches.length - 1) * EXTRA_KEYWORD_BONUS;
    if (type === 'energia_biologica' && contextSignals?.energyLow) confidence += ENERGY_LOW_BONUS;
    if (type === 'miedo' && contextSignals?.recentAvoidance) confidence += RECENT_AVOIDANCE_BONUS;
    confidence = Math.min(1, Number(confidence.toFixed(2)));

    detected.push({ type, confidence, keywordMatched: matches[0] });
  }

  return detected;
}

/**
 * Devuelve el freno dominante (mayor confianza). En empate, gana el de mayor
 * prioridad jerárquica del Bloque 5 (desbloquear de arriba hacia abajo).
 * Retorna null si no hay frenos.
 */
export function selectDominantBrake(brakes: DetectedBrake[]): DetectedBrake | null {
  if (brakes.length === 0) return null;
  return brakes.reduce((best, current) => {
    if (current.confidence > best.confidence) return current;
    if (current.confidence === best.confidence) {
      return BRAKE_PRIORITY.indexOf(current.type) < BRAKE_PRIORITY.indexOf(best.type)
        ? current
        : best;
    }
    return best;
  });
}

/**
 * Persiste el freno (normalmente el dominante) en frenos_log.
 * Bloque 5: documentar el freno detectado para auditabilidad.
 * NOTA: frenos_log no tiene columna intervention_log_id; el parámetro se
 * acepta para forward-compat pero NO se persiste (ver flag COWORK_REPORT).
 */
export async function logBrake(
  userId: string,
  brake: DetectedBrake,
  _interventionLogId?: string,
): Promise<void> {
  const { error } = await supabase.from('frenos_log').insert({
    user_id: userId,
    brake_type: brake.type,
    is_dominant: true,
    evidence_text: brake.keywordMatched,
  });
  if (error) {
    throw new Error(`brake-detector: logBrake failed — ${error.message}`);
  }
}

// TEST: detectBrakes('no sé cómo empezar') incluye un freno tipo 'no_saber'
// TEST: detectBrakes('estoy agotado y cansado', { energyLow: true }) → 'energia_biologica' dominante (conf ~0.9)
// TEST: selectDominantBrake([]) === null
// TEST: selectDominantBrake(detectBrakes('tengo flojera y no sé qué hago')) → tie-break a 'no_saber' (prioridad)
// INTEGRATION TEST: logBrake(userId, brake) inserta en frenos_log
