/**
 * Onboarding v2 — copy centralizado (Sprint ONBOARDING épico T4).
 *
 * Todas las cadenas de las 7 pantallas viven aquí para review (Enrique +
 * Mariana), iteración de tono e i18n futura. Los textos de OPCIONES de datos
 * (GOAL_OPTIONS, modalidades de ciclo, preguntas de cronotipo) siguen en
 * onboarding-v2-core.ts porque son parte del modelo, no del chrome de UI.
 *
 * El copy de consent está alineado con
 * Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md y con el
 * review aprobado de Mariana (Beta_Launch_Kit/06_COPY_MARIANA_REVIEW_COMPACTO.md,
 * sección 9, ítems >>) — cambios ahí requieren review de Mariana.
 *
 * Archivo puro (sin react-native): testeable con el harness Vitest node-only.
 */

export const ONBOARDING_COPY = {
  common: {
    continue: 'CONTINUAR',
    saving: 'Guardando…',
    oneMoment: 'Un momento…',
    skip: 'Saltar',
    skipTitle: '¿Saltar este paso?',
    skipBody: 'Puedes completarlo después en Ajustes. ARGOS te conocerá un poco menos mientras tanto.',
    skipCancel: 'Volver',
    skipConfirm: 'Saltar',
  },

  welcome: {
    kicker: 'BIENVENIDO A ATP',
    title: 'Tu sistema operativo de rendimiento humano',
    subtitle:
      'Fitness, nutrición, mente, salud funcional y tu ciclo — integrados con inteligencia que te conoce. Empecemos por lo básico.',
    nameLabel: '¿CÓMO TE LLAMAS?',
    namePlaceholder: 'Tu nombre',
    photoHint: 'Podrás agregar tu foto después, en tu Perfil.',
    cta: 'EMPEZAR',
  },

  profile: {
    title: 'Tu perfil base',
    subtitle: 'Con esto calculamos tu Edad ATP y calibramos tus rangos de salud.',
    sexLabel: 'SEXO BIOLÓGICO',
    sexMale: 'Hombre',
    sexFemale: 'Mujer',
    dobLabel: 'FECHA DE NACIMIENTO',
    heightLabel: 'ALTURA (CM)',
    weightLabel: 'PESO (KG)',
    hint: 'Estos datos alimentan tu Edad ATP desde el día 1.',
    invalidDateTitle: 'Fecha inválida',
    invalidDateBody: 'Introduce una fecha de nacimiento válida.',
    errorTitle: 'Error',
    errorBody: 'No se pudo guardar. Intenta de nuevo.',
  },

  goal: {
    title: '¿Qué buscas lograr?',
    subtitle: 'ARGOS y tus protocolos se calibran alrededor de este objetivo. Puedes cambiarlo después.',
  },

  cycle: {
    titleFemale: 'Tu ciclo, tu modalidad',
    titleMale: 'Módulo de Ciclo',
    subtitleFemale:
      'ATP adapta entrenamiento, nutrición y protocolos a tu fase. Elige la modalidad que refleja tu momento actual.',
    subtitleMale:
      'ATP incluye un módulo de ciclo menstrual. Puedes desactivarlo o vincularte con tu pareja para recibir insights de compañero.',
    hint: 'Puedes cambiar esto cuando quieras en Ajustes de Ciclo.',
  },

  chronotype: {
    counterKicker: 'CRONOTIPO',
    resultKicker: 'TU CRONOTIPO',
    resultTitlePrefix: 'Eres',
    scheduleWake: 'Despertar ideal',
    schedulePhysical: 'Pico físico',
    scheduleFocus: 'Pico mental',
    scheduleSleep: 'Dormir ideal',
  },

  consent: {
    title: 'Antes de empezar',
    subtitle: 'Lo importante, sin letras chiquitas:',
    points: [
      {
        icon: 'information-circle-outline',
        text: 'ATP es una herramienta de bienestar y educación. No diagnostica, trata ni cura enfermedades.',
      },
      {
        icon: 'medkit-outline',
        text: 'ATP no reemplaza una consulta médica o nutricional. Las recomendaciones (suplementos, ayuno, protocolos, ejercicio) se basan en medicina funcional y no sustituyen una consulta personalizada.',
      },
      {
        icon: 'warning-outline',
        text: 'Si tienes una condición médica, tomas medicamentos, estás embarazada o en lactancia, consulta a un profesional de salud antes de aplicar cambios.',
      },
      {
        icon: 'analytics-outline',
        text: 'Los análisis de laboratorios y biomarcadores usan rangos funcionales de referencia; su interpretación clínica corresponde a tu profesional de salud.',
      },
      {
        icon: 'hardware-chip-outline',
        text: 'ARGOS procesa tus datos con inteligencia artificial para personalizar tus recomendaciones. Al continuar das tu consentimiento explícito para este procesamiento.',
      },
    ],
    checkbox:
      'Entiendo que ATP no sustituye atención médica profesional y acepto los términos de uso y avisos médicos.',
    cta: 'ACEPTO Y CONTINÚO',
  },

  notifications: {
    title: 'Notificaciones con propósito',
    subtitle: 'Nada de spam. Solo lo que mueve tu rendimiento:',
    reasons: [
      {
        icon: 'calendar-outline',
        title: 'Tu agenda del día',
        desc: 'Recordatorios de tus bloques: entrenar, comer, dormir.',
      },
      {
        icon: 'flash-outline',
        title: 'Electrones y rachas',
        desc: 'No pierdas tu racha por olvidar un check-in.',
      },
      {
        icon: 'chatbubble-ellipses-outline',
        title: 'ARGOS',
        desc: 'Insights personalizados en el momento correcto.',
      },
    ],
    cta: 'ACTIVAR NOTIFICACIONES',
    skip: 'Ahora no',
  },
} as const;

export type OnboardingCopy = typeof ONBOARDING_COPY;
