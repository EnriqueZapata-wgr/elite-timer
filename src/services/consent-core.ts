/**
 * Consent (#132) — núcleo PURO (sin supabase/react-native), testeable.
 * El I/O vive en consent-service.ts.
 */

export interface UserConsent {
  analytics_posthog: boolean;
  argos_persistent_memory: boolean;
  marketing_communications: boolean;
  share_anonymized_research: boolean;
  share_with_clinician: boolean;
}

/** Defaults alineados al schema de user_consent (migración 100). */
export const CONSENT_DEFAULTS: UserConsent = {
  analytics_posthog: true,
  argos_persistent_memory: true,
  marketing_communications: false,
  share_anonymized_research: false,
  share_with_clinician: true,
};

export type ConsentKey = keyof UserConsent;

export const CONSENT_META: { key: ConsentKey; title: string; description: string }[] = [
  { key: 'analytics_posthog', title: 'Analytics', description: 'Datos de uso anónimos para mejorar la app (PostHog).' },
  { key: 'argos_persistent_memory', title: 'Memoria de ARGOS', description: 'ARGOS recuerda tu contexto (perfil, labs, hábitos) entre conversaciones.' },
  { key: 'marketing_communications', title: 'Comunicaciones de marketing', description: 'Novedades, ofertas y contenido de ATP por email o push.' },
  { key: 'share_anonymized_research', title: 'Datos anonimizados para research', description: 'Contribuye a investigación de salud funcional, sin identificarte.' },
  { key: 'share_with_clinician', title: 'Compartir con mi clínico', description: 'Tu clínico vinculado puede ver tu expediente y labs.' },
];
