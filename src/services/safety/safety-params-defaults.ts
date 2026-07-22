/**
 * Sprint Compliance 3 — Defaults PUROS de parámetros de seguridad.
 *
 * Sin imports de supabase/react-native: consumibles desde módulos puros
 * (motor de prescripción, cores testeables). El servicio
 * safety-params-service los re-exporta y les superpone la tabla
 * safety_params (migración 210) cuando hay red.
 *
 * Umbrales = BORRADOR del HANDOFF_DEV_CIERRE_COMPLIANCE_2026-07-21
 * (Mariana confirma como contenido; ajustables en DB sin re-deploy).
 */

export interface FeverScreeningParams {
  tempThresholdC: number;
  durationThresholdHours: number;
  redFlags: string[];
  pregnancyTriggers: boolean;
}

export interface FastingSafetyParams {
  advisoryHours: number;
  strongAlertHours: number;
  autoCloseHours: number;
  attestationThresholdHours: number;
  pregnancyMaxHours: number;
  blockedConditions: string[];
}

export interface BreathLimitsParams {
  maxGuidedRounds: number;
  maxRetentionSeconds: number;
}

export interface GateFamilyParams {
  keys: string[];
  breathingTemplates?: string[];
  blockedConditions: string[];
  pregnancyBlocks: boolean;
}

export interface ProtocolGateParams {
  families: Record<string, GateFamilyParams>;
}

export interface SafetyParams {
  fever_screening: FeverScreeningParams;
  fasting_safety: FastingSafetyParams;
  breath_limits: BreathLimitsParams;
  protocol_gate: ProtocolGateParams;
}

export const DEFAULT_SAFETY_PARAMS: SafetyParams = {
  fever_screening: {
    tempThresholdC: 39,
    durationThresholdHours: 48,
    redFlags: ['rigidez_nuca', 'dificultad_respiratoria', 'confusion', 'sarpullido_no_blanquea', 'convulsion'],
    pregnancyTriggers: true,
  },
  fasting_safety: {
    advisoryHours: 36,
    strongAlertHours: 72,
    autoCloseHours: 120,
    attestationThresholdHours: 48,
    pregnancyMaxHours: 12,
    blockedConditions: ['diabetes_tipo_1', 'diabetes_tipo_2', 'tca'],
  },
  breath_limits: {
    maxGuidedRounds: 3,
    maxRetentionSeconds: 90,
  },
  protocol_gate: {
    families: {
      breath_intense: {
        keys: ['wim_hof_basico', 'wim_hof_extendido', 'tabla_co2', 'tabla_o2', 'hiperventilacion_matutina'],
        breathingTemplates: ['wim-hof-lite', 'energize-2'],
        blockedConditions: ['epilepsia', 'cardiopatia', 'hipertension', 'sincopes'],
        pregnancyBlocks: true,
      },
      cold: {
        keys: ['ducha_fria_nivel1', 'ducha_fria_nivel2', 'ducha_fria_nivel3', 'bano_frio_desinflamacion', 'cold_plunge_cns', 'bano_frio_hormesis', 'dive_reflex_cara_hielo', 'terapia_contraste'],
        blockedConditions: ['cardiopatia', 'hipertension'],
        pregnancyBlocks: true,
      },
      heat: {
        keys: ['sauna_infrarrojo', 'sauna_finlandesa', 'sauna_vapor', 'bano_caliente_vespertino'],
        blockedConditions: ['cardiopatia'],
        pregnancyBlocks: true,
      },
      fasting_protocol: {
        keys: ['ayuno_16_8', 'ayuno_20_4_omad', 'protocolo_ayuno_sardinas', 'ejercicio_ayuno_fuerza'],
        blockedConditions: ['diabetes_tipo_1', 'diabetes_tipo_2', 'tca'],
        pregnancyBlocks: true,
      },
    },
  },
};

/**
 * Keys PULL-only (condición del sign-off legal): el sistema/ARGOS NUNCA
 * empuja estos protocolos — el usuario los busca y elige, con gate.
 * Set plano de todas las familias de riesgo (para el motor de prescripción).
 */
export const PULL_ONLY_INTERVENTION_KEYS: ReadonlySet<string> = new Set(
  Object.values(DEFAULT_SAFETY_PARAMS.protocol_gate.families).flatMap(f => f.keys),
);
