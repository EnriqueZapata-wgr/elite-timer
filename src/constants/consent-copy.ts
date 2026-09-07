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
 *
 * ═══ PIVOTE LIMPIO · 7 de septiembre de 2026 · dónde se pide cada uno ═══
 * La revisión legal de hoy movió SUPERFICIES, no textos. Ni una sola cadena
 * de `text` cambió, así que AVISO_VERSION SIGUE EN 1.0 a propósito: subirla
 * invalidaría hashes que sí son evidencia válida de lo que la gente aceptó.
 *
 *   · CB-1, CB-3 y CB-4 pasan a `register`. CB-3 porque Supabase, Sentry y
 *     PostHog están en Estados Unidos y tratan datos desde que se crea la
 *     cuenta: diferirlo sería transferir antes de consentir. CB-4 porque la
 *     mayoría de edad es la condición de validez de todos los demás, y sin
 *     ella un menor entrega edad, sexo, talla y peso antes de que preguntes.
 *   · CB-2 pasa a `contextual`. La LFPDPPP pide consentimiento previo al
 *     TRATAMIENTO, no previo al registro: se pide en la pantalla que va a
 *     escribir el primer síntoma, laboratorio o check-in, con casilla no
 *     premarcada, dentro de sesión autenticada y con bloqueo real de esa
 *     función si la persona dice que no (ver HEALTH_DATA_CONSENT_COPY).
 *   · CB-5 se queda en el muro del onboarding: es opcional y no bloquea nada.
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
  /**
   * Dónde se pide. `register` = la puerta de la cuenta (CB-1/3/4, obligatorios
   * para que el guardia abra la app). `onboarding` = muro del onboarding (hoy
   * solo CB-5, opcional). `contextual` = al activar la función que trata ese
   * dato (CB-2 salud, CB-6 voz, CB-7 ciclo).
   */
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
    // 7-sep-2026: `contextual`. Obligatorio para tocar dato de salud, NO para
    // entrar a la app: quien no lo da usa el resto de ATP y solo se le bloquea
    // la función que escribiría ese dato.
    surface: 'contextual',
  },
  {
    id: 'CB-3',
    text: 'Acepto que ATP transfiera mis datos, incluidos datos sensibles de salud, a proveedores en Estados Unidos (Anthropic, Google, ElevenLabs, Supabase, Sentry, PostHog, entre otros), quienes han asumido contractualmente obligaciones equivalentes a las del responsable en México, incluida la prohibición de usar mis datos para entrenar sus modelos.',
    required: true,
    // 7-sep-2026: a `register`. Los proveedores de EE. UU. tratan datos desde
    // el alta de la cuenta; pedirlo después sería transferir antes de consentir.
    surface: 'register',
  },
  {
    id: 'CB-4',
    text: 'Confirmo que soy mayor de 18 años.',
    required: true,
    // 7-sep-2026: a `register`. Es la condición de validez de todos los demás
    // consentimientos: sin ella no hay ninguno que valga.
    surface: 'register',
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

/**
 * CB-7 en contexto (pendiente 17.5, 31-ago-2026). El texto del checkbox es el
 * legal exacto (se hashea) y NO se toca; esto es la explicación en lenguaje
 * llano que va arriba: qué se guarda, para qué y cómo se retira. Se pide UNA
 * vez, al entrar a Ciclo. Si la persona dice que no, Ciclo no guarda nada y lo
 * dice sin insistir. Sin promesas médicas. Sin em dashes.
 */
export const CYCLE_CONSENT_COPY = {
  title: 'Tus datos de ciclo, bajo tu control',
  /** Ciclo propio. */
  propio: [
    'Qué se guarda: las fechas de tu periodo, lo que registres cada día (flujo, energía, ánimo, temperatura, HRV, notas) y la fase estimada que sale de eso.',
    'Para qué: pintar tu calendario, estimar tu siguiente periodo y tu ventana fértil, y adaptar lo que ATP te sugiere en Entrenar y en ARGOS.',
    'Puedes retirarlo cuando quieras en Ajustes → Privacidad. Al retirarlo, Ciclo deja de guardar registros nuevos.',
  ],
  /** Modo acompañante: el calendario es de otra persona. */
  acompanante: [
    'Qué se guarda: las fechas y los síntomas que registres del calendario que llevas de otra persona, y la fase estimada que sale de eso.',
    'Para qué: pintar ese calendario y estimar el siguiente periodo. No entra a tu Edad ATP ni a ARGOS.',
    'Puedes retirarlo cuando quieras en Ajustes → Privacidad. Al retirarlo, Ciclo deja de guardar registros nuevos.',
  ],
  declined: {
    title: 'Ciclo está apagado',
    body: 'No aceptaste el tratamiento de datos de ciclo. Ciclo deja de guardar registros nuevos y no muestra tu calendario ni tus reportes de ciclo. Si cambias de idea, actívalo abajo o desde Ajustes → Privacidad.',
    cta: 'Activar Ciclo',
    ctaPrivacidad: 'Ir a Privacidad',
  },
  fallo: {
    title: 'No pudimos comprobar tu consentimiento',
    body: 'Sin esa lectura no abrimos tu ciclo. Revisa tu conexión y vuelve a intentar.',
    cta: 'Reintentar',
  },
} as const;

/**
 * CB-2 en el punto de uso (pivote limpio, 7-sep-2026). El texto del checkbox
 * es el legal exacto (se hashea) y NO se toca; esto es la explicación en
 * lenguaje llano que va arriba: qué se guarda, para qué y cómo se retira.
 * Se pide UNA vez, en la primera pantalla que va a ESCRIBIR dato de salud.
 * Si la persona dice que no, esa función queda bloqueada y se lo decimos sin
 * insistir y sin quitarle nada de lo que ya tenía.
 */
export const HEALTH_DATA_CONSENT_COPY = {
  title: 'Tus datos de salud, bajo tu control',
  details: [
    'Qué se guarda: lo que tú registres de tu salud (síntomas, resultados de laboratorio, medicamentos, estado emocional y tus check-ins diarios).',
    'Para qué: estimar tu Edad ATP, armar el contenido que te toca y darle contexto a ARGOS.',
    // "Perfil → Privacidad" y no "Ajustes → Privacidad": es la ruta que dice
    // el texto legal de CB-2, que está hasheado y no se puede cambiar sin
    // subir la versión del Aviso. Manda el texto legal (7-sep-2026).
    'Puedes retirarlo cuando quieras en Perfil → Privacidad. Al retirarlo, ATP deja de guardar datos de salud nuevos.',
  ],
  declined: {
    title: 'Esta parte está apagada',
    body: 'No aceptaste el tratamiento de tus datos de salud, así que aquí no guardamos nada nuevo. El resto de la app sigue funcionando igual y lo que ya tenías sigue donde estaba. Si cambias de idea, actívalo abajo o desde Perfil → Privacidad.',
    cta: 'Activar',
    ctaPrivacidad: 'Ir a Privacidad',
  },
  fallo: {
    title: 'No pudimos comprobar tu consentimiento',
    body: 'Sin esa lectura no guardamos datos de salud. Revisa tu conexión y vuelve a intentar.',
    cta: 'Reintentar',
  },
  /**
   * El insert no llegó al servidor. Es distinto de "no pudimos leer": aquí la
   * persona SÍ dijo que sí y su consentimiento no quedó asentado. Para dato
   * sensible de salud no basta con una fila encolada, así que la función no se
   * abre hasta que la fila exista (7-sep-2026).
   */
  noGuardado: {
    title: 'No pudimos guardar tu permiso',
    body: 'Tu consentimiento no llegó a nuestro servidor, así que todavía no guardamos nada aquí. Revisa tu conexión y vuelve a intentar.',
    cta: 'Reintentar',
  },
  /** Salida de la pantalla bloqueada. Sin esto sería un callejón. */
  volver: 'Volver',
} as const;

/**
 * La puerta legal de la app (pivote limpio, 7-sep-2026).
 *
 * Se la ve quien entra y NO tiene registrados CB-1, CB-3 y CB-4. Hoy eso es
 * todo el que se registró antes de que el registro los escribiera: 12 de 13
 * perfiles en producción. NO se les firma nada por adelantado y NO se les
 * inventa una fecha de aceptación; se les pide una vez, con su nombre, y sin
 * perder nada de lo que ya tenían.
 */
export const PUERTA_CONSENT_COPY = {
  title: 'Nos falta tu permiso',
  /** Saludo con nombre. Sin nombre, la versión neutra. */
  saludo: (nombre?: string | null) => (nombre && nombre.trim() ? `Hola, ${nombre.trim()}.` : 'Hola.'),
  cuerpo:
    'Cambiamos la forma de pedir y guardar tus permisos, y en tu cuenta no hay registro de estos tres. La ley nos pide tenerlos antes de tratar tus datos, así que te los pedimos una sola vez aquí.',
  tranquilidad:
    'Nada de lo que ya guardaste se borra ni se mueve. Tus registros, tus estudios y tu historial te siguen esperando adentro.',
  cta: 'ACEPTO Y CONTINÚO',
  guardando: 'Guardando…',
  salir: 'Cerrar sesión',
  errorGuardar: 'No pudimos guardar tu permiso. Revisa tu conexión y vuelve a intentar.',
  fallo: {
    title: 'No pudimos leer tus permisos',
    body: 'Necesitamos comprobar qué aceptaste y no lo logramos. Casi siempre es la conexión. Revisa tu internet y vuelve a intentar.',
    cta: 'Reintentar',
  },
} as const;

/** Aviso al revocar CB-2 (nota de revocación, Parte 3). */
export const REVOKE_CORE_WARNING =
  'Si revocas este consentimiento, el núcleo de ATP (Edad ATP, contenido personalizado y ARGOS) dejará de operar para tu cuenta. ¿Quieres continuar?';

/**
 * Revocar un consentimiento de la puerta (CB-1, CB-3, CB-4), 7-sep-2026.
 *
 * Estos tres no apagan una función: son la base legal de la cuenta entera. Un
 * toggle que los revoca en el lugar deja a la persona sin app y con dos
 * salidas, volver a aceptar lo que acaba de revocar o cerrar sesión, que es un
 * encierro y no un derecho. Aquí el derecho se ejerce de verdad: se le explica
 * qué significa y se le lleva a la baja de cuenta, que ya existe, con sus 30
 * días de gracia y sin borrar nada antes.
 */
export const REVOKE_PUERTA_WARNING = {
  title: 'Esto cierra tu cuenta',
  body: 'Este permiso no enciende una función: es la base legal con la que operamos tu cuenta. Retirarlo significa que ATP deja de tratar tus datos, y eso solo se puede hacer dando de baja la cuenta. Tienes 30 días para arrepentirte y nada se borra antes.',
  conservar: 'Conservar',
  continuar: 'Ver cómo dar de baja',
} as const;
