/**
 * Navegación emocional — datos (MB-4 · Bloque 2).
 *
 * El mapa de qué herramienta mueve al usuario en cada dirección (spec §2):
 * eje vertical (energía) = herramientas FISIOLÓGICAS; eje horizontal
 * (valencia) = herramientas COGNITIVAS. Todo REUSA el arsenal de Mente —
 * aquí no se crea contenido, solo se rutea al vehículo correcto.
 *
 * Rutas verificadas contra el código real:
 *  - Respiraciones → /breathing con { breathingId } (BREATHING_LIBRARY).
 *  - Audios (meditación/mantra/visualización/binaural/descanso) → /mente/player
 *    con { slug } (tabla audio_pieces; slugs confirmados en migs 212/214/219).
 *  - `navegar_ataque_panico` NUNCA se ofrece como opción casual: solo aparece
 *    en la variante de crisis, y su hard gate vive en el player (mig 217).
 *
 * Sin imports de react-native → testeable en Vitest node.
 */

export type EmotionMove = 'bajar' | 'voltear' | 'canalizar' | 'saborear';

export interface RegulationTool {
  id: string;
  title: string;
  /** Por qué este vehículo sirve aquí — una línea, mecanismo, sin promesas. */
  detail: string;
  /** Duración aproximada en minutos (si aplica). */
  minutes?: number;
  route: { pathname: string; params?: Record<string, string> };
}

// ═══ FRASES QUE ENCUADRAN (set arranque — Enrique veta/edita/suma) ═══

export const FRAMING_PHRASES: string[] = [
  'Sigue el plan, no la emoción.',
  'Inteligencia emocional no es no sentir. Es sentir y decidir igual.',
  'La emoción es información, no una orden.',
  'Nombrar lo que sientes ya le baja el volumen.',
  'No tienes que estar bien para empezar. Tienes que empezar.',
  'Lo que sientes es real. Y también es temporal.',
  'El enojo casi siempre señala un límite que te cruzaron.',
  'El miedo te está diciendo que algo importa.',
  'No estás roto. Estás activado.',
  'Puedes estar cansado y aún así elegir.',
  'Bajar la energía no es rendirte. Es recuperar el mando.',
  'La misma situación cabe en varias historias. Elige cuál te sirve.',
  'Ya pasaste por esto antes. Y aquí sigues.',
  'Sentirte mal no te quita el derecho de sentirte mejor.',
  'No se trata de controlarlas. Se trata de usarlas.',
  'Tu estado de ahora no es tu dirección.',
];

// ═══ HERRAMIENTAS — catálogo (reusa Mente, cero contenido nuevo) ═══

const T = (
  id: string, title: string, detail: string, route: RegulationTool['route'], minutes?: number,
): RegulationTool => ({ id, title, detail, route, minutes });

const breathing = (id: string) => ({ pathname: '/breathing', params: { breathingId: id } });
const audio = (slug: string) => ({ pathname: '/mente/player', params: { slug } });

/** ↓ BAJAR ENERGÍA — fisiológicas. */
export const TOOLS_BAJAR_YA: RegulationTool[] = [
  T('suspiro', 'Suspiro fisiológico', 'La vía más rápida para bajar: doble inhalación y exhalación larga.', breathing('physiological-sigh'), 2),
  T('resp478', 'Respiración 4-7-8', 'Exhalar más de lo que inhalas activa el freno del sistema nervioso.', breathing('478-relaxation'), 3),
];

export const TOOLS_BAJAR_SOSTENER: RegulationTool[] = [
  T('escaneo', 'Escaneo corporal', 'Bajar y quedarte abajo: la atención recorre el cuerpo y suelta.', audio('escaneo_corporal'), 12),
  T('coherente', 'Respiración coherente', '5 respiraciones por minuto — desciende y sostiene.', breathing('coherent-5'), 5),
  T('relajacion', 'Relajación profunda', 'Guiada para aflojar de verdad, no solo distraerte.', audio('relajacion_profunda'), 15),
];

export const TOOLS_FUNDIDO: RegulationTool[] = [
  T('nsdr', 'NSDR · Yoga Nidra', 'Recuperación real cuando no estás activado: estás fundido.', audio('nsdr_yoga_nidra'), 20),
  T('pausa', 'Pausa de 1 minuto', 'Un minuto de nada. A veces es todo lo que hay.', audio('pausa_1min'), 1),
];

/** Escritas para alta energía desagradable específica. */
export const TOOLS_ALTA_DESAGRADABLE: RegulationTool[] = [
  T('descarga', 'Descarga de estrés', 'Escrita exactamente para este estado.', audio('estres_descarga'), 10),
  T('ansiedad', 'Gestión de ansiedad', 'Para cuando la mente anticipa peligro que aún no pasa.', audio('ansiedad_gestion'), 10),
];

/** Crisis — SOLO en la variante de crisis, nunca como opción casual. */
export const TOOL_CRISIS: RegulationTool =
  T('panico', 'Navegar un ataque de pánico', 'Acompañamiento paso a paso, a tu ritmo.', audio('navegar_ataque_panico'), 10);

/** → VOLTEAR LA VALENCIA — cognitivas, por estrategia (spec §2). */
export type CognitiveStrategy =
  | 'distanciamiento' | 'aceptacion' | 'gratitud' | 'autocompasion'
  | 'proceso' | 'agencia' | 'presencia';

export const TOOLS_VOLTEAR: Record<CognitiveStrategy, RegulationTool[]> = {
  distanciamiento: [
    T('pasara', 'Esto también pasará', 'Lo que duele se siente permanente. No lo es.', audio('mantra_esto_tambien_pasara'), 5),
  ],
  aceptacion: [
    T('amorfati', 'Amor fati', 'Dejar de pelear con lo que ya ocurrió.', audio('mantra_amor_fati'), 5),
    T('ecuanime', 'Observación ecuánime', 'Mirar lo que pasa sin pelearte con ello.', audio('observacion_ecuanime'), 12),
  ],
  gratitud: [
    T('gratitud', 'Meditación de gratitud', 'Mover la atención de lo que falta a lo que hay.', audio('gratitud'), 10),
    T('journal_gratitud', 'Journal de gratitud', 'Escribir 3 cosas reales de hoy. Sin poesía.', { pathname: '/journal' }, 5),
  ],
  autocompasion: [
    T('compasion', 'Amor y compasión', 'Cuando el juicio es hacia adentro, el camino es tratarte como a alguien que quieres.', audio('amor_compasion'), 12),
    T('perdon', 'Perdón', 'Soltar lo que cargas — hacia ti o hacia alguien más.', audio('perdon'), 12),
  ],
  proceso: [
    T('proceso', 'Amante del proceso', 'La frustración vive en el resultado. El control vive en el proceso.', audio('mantra_amante_del_proceso'), 5),
    T('razon', 'Ser mejor, no tener razón', 'Cambiar el objetivo cambia la emoción.', audio('mantra_ser_mejor_no_tener_razon'), 5),
  ],
  agencia: [
    T('woop', 'WOOP', 'Deseo, resultado, obstáculo, plan. Agencia en 4 pasos.', audio('woop'), 12),
    T('siguiente', 'Como si — siguiente paso', 'No necesitas ver la salida completa. Solo el siguiente paso.', audio('mantra_como_si_siguiente_paso'), 5),
    T('futuro', 'Visión de futuro', 'Levantar la vista del hoyo al horizonte.', audio('vision_de_futuro'), 12),
  ],
  presencia: [
    T('presencia', 'Presencia', 'La mente está en el futuro o en el pasado. El cuerpo siempre está aquí.', audio('presencia'), 10),
    T('mindfulness', 'Mindfulness base', 'Volver al ahora, sin pelear con los pensamientos.', audio('mindfulness_base'), 10),
  ],
};

/** El foso: tu propia evidencia — ARGOS como espejo. Se ofrece al final de todo voltear. */
export const TOOL_EVIDENCIA: RegulationTool =
  T('argos', 'Habla con ARGOS', 'Ya pasaste por cosas así antes. ARGOS tiene tu evidencia.', { pathname: '/argos-chat' });

/** Alta energía · agradable → canalizarla (no hay nada que arreglar). */
export const TOOLS_CANALIZAR: RegulationTool[] = [
  T('entrenar', 'Entrena hoy', 'Esta energía es combustible. Úsala en el gym.', { pathname: '/fitness-hub' }),
  T('foco', 'Enfoque láser', 'Canalizarla a una sola cosa importante.', audio('enfoque_laser'), 10),
  T('crear', 'Visualización creativa', 'Ponerla a construir algo tuyo.', audio('visualizacion_creativa'), 12),
];

/** Baja energía · agradable → saborearla / sostenerla (destino legítimo). */
export const TOOLS_SABOREAR: RegulationTool[] = [
  T('gratitud_sab', 'Meditación de gratitud', 'Quedarte un rato en lo que sí está.', audio('gratitud'), 10),
  T('presente', 'Presente perfecto', 'Este momento, tal cual es, alcanza.', audio('mantra_presente_perfecto'), 5),
  T('journal_sab', 'Escríbelo', 'Los momentos así también merecen registro.', { pathname: '/journal' }, 5),
];

// ═══ COPY DE MOVIMIENTOS (voz ATP: directa, sin empalago) ═══

export const MOVE_QUESTIONS: Record<EmotionMove, string> = {
  bajar: '¿Qué pasa si le bajas la energía?',
  voltear: '¿Y si pudieras verle el otro lado?',
  canalizar: 'No hay nada que arreglar aquí. ¿La usamos?',
  saborear: 'No hay nada que mover. ¿La saboreas?',
};

export const MOVE_SUBTEXT: Record<EmotionMove, string> = {
  bajar: 'Mira el mapa: la misma emoción tiene versiones más manejables. Bajar no es rendirte.',
  voltear: 'La misma situación cabe en varias historias. Mira qué hay del otro lado del plano.',
  canalizar: 'Hoy entrena fuerte, crea, decide. Esta energía es de las buenas.',
  saborear: 'Quedarte aquí es un destino legítimo, no una parada intermedia.',
};

/** El "no" se respeta: cerrar siempre es una opción válida y visible. */
export const STAY_COPY = 'Quedarme aquí está bien';

export const INVITE_TITLE = '¿Quieres navegar tus emociones?';
export const INVITE_SUBTEXT = 'Tu check-in ya quedó. Esto es opcional: ver hacia dónde se puede mover lo que sientes.';
export const INVITE_YES = 'Navegar';
export const INVITE_NO = 'Ahora no';
