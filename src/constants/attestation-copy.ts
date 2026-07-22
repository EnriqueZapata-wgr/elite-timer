/**
 * Sprint Compliance 3 — Textos EXACTOS de atestación de protocolos de riesgo.
 *
 * Fuente: Business development/Legal/SIGNOFF_ATESTACION_PROTOCOLOS_2026-07-21.md §2.
 * NO editar el copy sin actualizar el documento legal y subir ATTESTATION_VERSION
 * (cada atestación se loguea con versión + sha256 del texto — evidencia).
 *
 * Reglas del sign-off: primera persona, afirmaciones (no advertencias),
 * TODAS obligatorias para arrancar, corre CADA VEZ en los de contexto variable.
 */

export const ATTESTATION_VERSION = '1.0';

export type AttestationId = 'wim_hof' | 'cold' | 'heat' | 'fasting_48h';

export interface AttestationSpec {
  id: AttestationId;
  /** Encabezado del gate. */
  heading: string;
  /** Afirmaciones en primera persona — todas obligatorias. */
  checks: string[];
  /** Pie del gate (no todas lo llevan). */
  footer?: string;
  /** true = corre CADA VEZ (contexto variable); false = al fijar el objetivo. */
  everyTime: boolean;
}

export const ATTESTATIONS: Record<AttestationId, AttestationSpec> = {
  // §2.1 · Wim Hof / respiración intensa / hiperventilación (corre CADA VEZ)
  wim_hof: {
    id: 'wim_hof',
    heading: 'Antes de empezar, confirma tu seguridad:',
    checks: [
      'No estoy dentro ni cerca del agua (regadera, tina, jacuzzi, alberca, mar, río o lago).',
      'Estoy sentado o recostado en un lugar seguro — no de pie, ni conduciendo, ni en altura.',
      'No tengo epilepsia, enfermedad cardiaca, presión alta no controlada, ni antecedente de desmayos.',
      'Entiendo que debo detener la sesión de inmediato si siento mareo intenso, dolor en el pecho o palpitaciones.',
    ],
    footer:
      'La respiración intensa puede provocar pérdida de conciencia. Nunca la practiques cerca del agua ni en solitario si tienes dudas. Esta es una práctica de bienestar, no un tratamiento médico.',
    everyTime: true,
  },

  // §2.2 · Inmersión en frío / cold plunge (corre CADA VEZ)
  cold: {
    id: 'cold',
    heading: 'Antes de sumergirte, confirma tu seguridad:',
    checks: [
      'Voy a entrar de forma gradual, controlando mi respiración — no de golpe.',
      'Si es inmersión completa, hay alguien cerca que puede ayudarme.',
      'No tengo enfermedad cardiaca ni presión alta no controlada.',
      'Saldré de inmediato si siento mareo, entumecimiento fuerte o dificultad para respirar.',
    ],
    footer:
      'El agua fría puede provocar una respuesta de choque. Respeta el tiempo límite de tu sesión. Práctica de bienestar, no tratamiento médico.',
    everyTime: true,
  },

  // §2.3 · Sauna / calor (corre CADA VEZ)
  heat: {
    id: 'heat',
    heading: 'Antes de entrar, confirma tu seguridad:',
    checks: [
      'Estoy hidratado y no he consumido alcohol ni sustancias.',
      'No tengo enfermedad cardiaca, presión baja, ni estoy embarazada o en lactancia.',
      'Respetaré el límite de tiempo de mi sesión y saldré si me mareo.',
      'Si es una sesión prolongada, no estoy solo.',
    ],
    footer:
      'El calor prolongado puede causar mareo o desmayo. Escucha a tu cuerpo. Práctica de bienestar, no tratamiento médico.',
    everyTime: true,
  },

  // §2.4 · Ayuno — al fijar objetivo mayor a 48h (una vez, al iniciar el ayuno largo)
  fasting_48h: {
    id: 'fasting_48h',
    heading: 'Vas a iniciar un ayuno prolongado. Confirma antes de empezar:',
    checks: [
      'No estoy embarazada ni en lactancia.',
      'No tengo diabetes, trastorno de la conducta alimentaria, ni tomo medicamentos que deban tomarse con alimento.',
      'Entiendo que los ayunos de más de 48 horas conllevan riesgos y que idealmente se realizan con supervisión de un profesional de salud.',
    ],
    everyTime: false,
  },
};

/** §2.5 · Ayuno — alertas escalantes durante el contador. */
export const FASTING_ALERTS = {
  advisory36h: {
    title: 'Vas más allá de 36 horas',
    message:
      'Vas más allá de 36 horas de ayuno. Escucha a tu cuerpo. Si sientes mareo intenso, palpitaciones, confusión o debilidad extrema, rompe el ayuno y considera buscar atención médica. Los ayunos prolongados idealmente se hacen con supervisión profesional.',
  },
  strong72h: {
    title: 'Llevas 72 horas de ayuno',
    message:
      'Llevas 72 horas de ayuno. Este es territorio avanzado. Te recomendamos fuertemente contar con supervisión de un profesional de salud. Recuerda romper el ayuno de forma gradual, con proteína primero.',
  },
  autoClose120h: {
    title: 'Olvidaste cerrar tu ayuno',
    message:
      'Han pasado 120 horas. Cerramos automáticamente tu contador por seguridad. Rompe tu ayuno de forma gradual (proteína primero, porciones pequeñas). Si deseas continuar ayunando, hazlo únicamente bajo supervisión médica directa.',
  },
} as const;

/** §2.6 · Embarazo / lactancia — HARD BLOCK (no atestación, bloqueo total). */
export const PREGNANCY_HARD_BLOCK_MESSAGE =
  'Este protocolo no está disponible durante embarazo o lactancia. Consulta con tu ginecólogo(a) para pautas seguras en esta etapa.';

/** Hard block por condición médica declarada (capa 1 del sign-off). */
export const CONDITION_HARD_BLOCK_MESSAGE =
  'Por una condición de salud que declaraste en tu cuestionario, esta práctica no está disponible en tu cuenta. Coméntalo con tu médico: si tu situación cambia, actualiza tu cuestionario y la práctica se desbloquea.';

/** Texto plano de una atestación (para texto_hash del log). */
export function attestationText(spec: AttestationSpec): string {
  return [spec.heading, ...spec.checks, spec.footer ?? ''].join('\n');
}
