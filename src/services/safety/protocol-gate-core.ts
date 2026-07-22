/**
 * Sprint Compliance 3 — Núcleo PURO del gate de protocolos de riesgo.
 *
 * Implementa las capas 1-3 del sign-off legal (SIGNOFF_ATESTACION_PROTOCOLOS):
 *   Capa 1 · Hard-block automático por condición declarada (el protocolo NI SE
 *            OFRECE si el usuario declaró una contraindicación absoluta o está
 *            embarazada/lactando). Sin atestación posible.
 *   Capa 2 · Atestación contextual bloqueante (afirmaciones en primera persona,
 *            todas obligatorias) para lo que NO sabemos del usuario.
 *   Capa 3 · Corre CADA VEZ en los de contexto variable (agua/de pie/conducir).
 *
 * Sin I/O — testeable en vitest. El servicio (protocol-gate-service) arma el
 * SafetyState desde el Cuestionario Maestro + client_profiles.
 */
import type { AttestationId } from '@/src/constants/attestation-copy';
import type { ProtocolGateParams, FastingSafetyParams, BreathLimitsParams } from './safety-params-defaults';

/** Estado de seguridad del usuario (derivado del Cuestionario Maestro). */
export interface SafetyState {
  /** Condiciones ACTIVAS declaradas (vocabulario D9.2: 'hipertension', 'epilepsia', 'tca'…). */
  conditions: string[];
  pregnancy: boolean;
  lactancia: boolean;
}

export type GateDecision =
  | { result: 'allowed' }
  | { result: 'attest'; attestationId: AttestationId }
  | { result: 'blocked'; reason: 'pregnancy' | 'condition'; conditions?: string[] };

/** Familia de riesgo de una intervención del catálogo (null = sin gate). */
export function familyForInterventionKey(key: string, gate: ProtocolGateParams): string | null {
  for (const [family, cfg] of Object.entries(gate.families)) {
    if (cfg.keys.includes(key)) return family;
  }
  return null;
}

/** Familia de riesgo de una plantilla de respiración (breathing-library). */
export function familyForBreathingTemplate(templateId: string, gate: ProtocolGateParams): string | null {
  for (const [family, cfg] of Object.entries(gate.families)) {
    if (cfg.breathingTemplates?.includes(templateId)) return family;
  }
  return null;
}

/**
 * Familia de riesgo para plantillas de protocol_templates (contenido en DB
 * sin vocabulario de keys) — detección por keywords del nombre. Conservador:
 * un falso positivo solo muestra una atestación de más.
 */
export function familyForTemplateName(name: string): string | null {
  const n = name.toLowerCase();
  if (/wim\s*hof|hiperventila|apnea|retenci[oó]n de aire/.test(n)) return 'breath_intense';
  if (/fr[ií][oa]|plunge|inmersi[oó]n|crioterapia/.test(n)) return 'cold';
  if (/sauna|calor extremo/.test(n)) return 'heat';
  if (/ayuno|fasting|omad/.test(n)) return 'fasting_protocol';
  return null;
}

const FAMILY_ATTESTATION: Record<string, AttestationId> = {
  breath_intense: 'wim_hof',
  cold: 'cold',
  heat: 'heat',
  fasting_protocol: 'fasting_48h',
};

/**
 * Decisión del gate para una familia de riesgo.
 * Orden: embarazo/lactancia (capa 1, §2.6) → condición declarada (capa 1) →
 * atestación (capa 2). Familia desconocida → allowed (sin gate).
 */
export function gateDecisionForFamily(
  family: string | null,
  state: SafetyState,
  gate: ProtocolGateParams,
): GateDecision {
  if (!family) return { result: 'allowed' };
  const cfg = gate.families[family];
  if (!cfg) return { result: 'allowed' };

  if (cfg.pregnancyBlocks && (state.pregnancy || state.lactancia)) {
    return { result: 'blocked', reason: 'pregnancy' };
  }

  const hits = state.conditions.filter(c => cfg.blockedConditions.includes(c));
  if (hits.length > 0) {
    return { result: 'blocked', reason: 'condition', conditions: hits };
  }

  const attestationId = FAMILY_ATTESTATION[family];
  return attestationId ? { result: 'attest', attestationId } : { result: 'allowed' };
}

/**
 * Gate del CONTADOR de ayuno al fijar un objetivo de `targetHours`.
 * - Embarazo/lactancia: bloquea todo ayuno > pregnancyMaxHours (12h borrador).
 * - Diabetes/TCA declarados: bloquea ayunos > umbral de atestación (48h).
 * - Objetivo > 48h: atestación §2.4 (una vez, al iniciar el ayuno largo).
 */
export function fastingGateDecision(
  targetHours: number,
  state: SafetyState,
  fasting: FastingSafetyParams,
): GateDecision {
  if ((state.pregnancy || state.lactancia) && targetHours > fasting.pregnancyMaxHours) {
    return { result: 'blocked', reason: 'pregnancy' };
  }
  const hits = state.conditions.filter(c => fasting.blockedConditions.includes(c));
  if (hits.length > 0 && targetHours > fasting.attestationThresholdHours) {
    return { result: 'blocked', reason: 'condition', conditions: hits };
  }
  if (targetHours > fasting.attestationThresholdHours) {
    return { result: 'attest', attestationId: 'fasting_48h' };
  }
  return { result: 'allowed' };
}

/**
 * Límites técnicos enforced (capa 4 del sign-off) para plantillas de
 * respiración intensa: máx N rondas guiadas y retenciones con tope de
 * segundos (la UI ya muestra countdown por fase).
 */
export function capBreathingTemplate<
  T extends { cycles: number; phases: { action: string; seconds: number }[] },
>(template: T, limits: BreathLimitsParams): T {
  return {
    ...template,
    cycles: Math.min(template.cycles, limits.maxGuidedRounds),
    phases: template.phases.map(p =>
      (p.action === 'hold' || p.action === 'hold_empty')
        ? { ...p, seconds: Math.min(p.seconds, limits.maxRetentionSeconds) }
        : p,
    ),
  };
}

/**
 * Alerta de seguridad de ayuno que corresponde a las horas transcurridas
 * (escalantes §2.5): null | 'advisory36h' | 'strong72h'.
 * El auto-cierre a 120h lo maneja el contador (autoCloseHours).
 */
export function fastingAlertForHours(
  hours: number,
  shown: Set<number>,
  fasting: FastingSafetyParams,
): { key: 'advisory36h' | 'strong72h'; markHour: number } | null {
  if (hours >= fasting.strongAlertHours && !shown.has(fasting.strongAlertHours)) {
    return { key: 'strong72h', markHour: fasting.strongAlertHours };
  }
  if (hours >= fasting.advisoryHours && !shown.has(fasting.advisoryHours)) {
    return { key: 'advisory36h', markHour: fasting.advisoryHours };
  }
  return null;
}
