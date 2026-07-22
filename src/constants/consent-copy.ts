/**
 * Sprint Compliance 2 — Textos EXACTOS de consentimiento granular.
 *
 * Fuente de verdad: Business development/Legal/AVISO_DE_PRIVACIDAD_v1_2026-07-21.md
 *   - Parte 2 → AVISO_SIMPLIFICADO (se muestra arriba de los checkboxes)
 *   - Parte 3 → CB-1..CB-7 (spec técnica de checkboxes; NO editar el copy aquí
 *     sin actualizar el documento legal y AVISO_VERSION)
 *
 * Cada aceptación se loguea en user_consent_log (migración 209) con el
 * sha256 del texto exacto (texto_hash) + AVISO_VERSION. Si Legal cambia un
 * texto, sube la versión: el hash viejo queda como evidencia de qué aceptó
 * cada usuario en su momento.
 */

export const AVISO_VERSION = '1.0';
export const TERMS_VERSION = '1.0';

export type ConsentCheckboxId = 'CB-1' | 'CB-2' | 'CB-3' | 'CB-4' | 'CB-5' | 'CB-6' | 'CB-7';

export interface ConsentCheckbox {
  id: ConsentCheckboxId;
  /** Texto EXACTO (Parte 3). Es lo que se hashea para texto_hash. */
  text: string;
  /** true = bloquea (cuenta/onboarding). false = opcional. */
  required: boolean;
  /** Dónde vive: register (CB-1), muro de onboarding, o contextual al activar la función. */
  surface: 'register' | 'onboarding' | 'contextual';
}

export const CONSENT_CHECKBOXES: readonly ConsentCheckbox[] = [
  {
    id: 'CB-1',
    text: 'He leído y acepto los [Términos y Condiciones] y el [Aviso de Privacidad].',
    required: true,
    surface: 'register',
  },
  {
    id: 'CB-2',
    text: 'Acepto expresamente y por escrito que ATP trate mis datos personales sensibles de salud (síntomas, ciclo menstrual, embarazo, medicamentos, biomarcadores, estado emocional y, en su caso, información genética futura) para las finalidades primarias descritas en el Aviso de Privacidad. Puedo revocar este consentimiento desde Perfil → Privacidad.',
    required: true,
    surface: 'onboarding',
  },
  {
    id: 'CB-3',
    text: 'Acepto que ATP transfiera mis datos, incluidos datos sensibles de salud, a proveedores en Estados Unidos (Anthropic, Google, ElevenLabs, Supabase, Sentry, PostHog, entre otros), quienes han asumido contractualmente obligaciones equivalentes a las del responsable en México, incluida la prohibición de usar mis datos para entrenar sus modelos.',
    required: true,
    surface: 'onboarding',
  },
  {
    id: 'CB-4',
    text: 'Confirmo que soy mayor de 18 años.',
    required: true,
    surface: 'onboarding',
  },
  {
    id: 'CB-5',
    text: 'Quiero recibir novedades, contenido y promociones de ATP por correo electrónico. (Opcional)',
    required: false,
    surface: 'onboarding',
  },
  {
    id: 'CB-6',
    text: 'Acepto que ATP grabe y procese mi voz mediante el proveedor ElevenLabs (EE.UU.) para las funciones de voz. La grabación es un dato biométrico sensible tratado bajo las salvaguardas del Aviso de Privacidad.',
    required: false,
    surface: 'contextual',
  },
  {
    id: 'CB-7',
    text: 'Acepto que ATP trate mi información de ciclo menstrual, embarazo y lactancia para las funciones de este módulo.',
    required: false,
    surface: 'contextual',
  },
] as const;

export const CONSENT_BY_ID: Record<ConsentCheckboxId, ConsentCheckbox> = Object.fromEntries(
  CONSENT_CHECKBOXES.map(c => [c.id, c]),
) as Record<ConsentCheckboxId, ConsentCheckbox>;

/** Parte 2 · Aviso Simplificado — se muestra arriba de los checkboxes. */
export const AVISO_SIMPLIFICADO = {
  title: 'Tu privacidad en ATP',
  paragraphs: [
    'ATP es una app de bienestar. Para funcionar, tratamos datos personales, incluidos datos sensibles de salud que tú decides aportar (síntomas, labs, ciclo, hábitos, estado emocional).',
    'Usamos esos datos para calcular tu Edad ATP, generar tu contenido personalizado y operar el asistente ARGOS. Algunos proveedores tecnológicos en Estados Unidos (como Anthropic, Google y Supabase) tratan tus datos bajo contrato, y tienen prohibido usarlos para entrenar sus modelos.',
    'Tú controlas tus datos: puedes acceder, rectificar, cancelar u oponerte en cualquier momento desde Perfil → Privacidad.',
    'Antes de continuar, necesitamos tu consentimiento expreso para tratar tus datos sensibles y para la transferencia internacional. Consulta el Aviso de Privacidad Integral para el detalle completo.',
  ],
} as const;

/** Títulos cortos para la UI de estado (Perfil → Privacidad). */
export const CONSENT_SHORT_TITLES: Record<ConsentCheckboxId, string> = {
  'CB-1': 'Términos y Aviso de Privacidad',
  'CB-2': 'Datos sensibles de salud',
  'CB-3': 'Transferencia internacional',
  'CB-4': 'Mayoría de edad (18+)',
  'CB-5': 'Novedades por correo',
  'CB-6': 'Funciones de voz',
  'CB-7': 'Módulo Ciclo',
};

/** Aviso al revocar CB-2/CB-3 (nota de revocación, Parte 3). */
export const REVOKE_CORE_WARNING =
  'Si revocas este consentimiento, el núcleo de ATP (Edad ATP, contenido personalizado y ARGOS) dejará de operar para tu cuenta. ¿Quieres continuar?';
