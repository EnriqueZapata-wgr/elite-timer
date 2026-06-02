/**
 * Voice Config — catálogo de las 16 preguntas del onboarding de voz del coach.
 *
 * Step COACH 4/N. Pueblan `coach_voice_config` vía
 * `computeVoiceConfigFromAnswers` (ver coach-voice-config-service.ts).
 *
 * Mapeo de respuestas → parámetros de voz:
 *   - Sección 1 (Q1, Q2, Q3, Q3b) → experience_level (promedio de pts)
 *   - Sección 2 (Q4, Q5, Q6)      → self_assessment_capacity (promedio de pts)
 *   - Sección 3 (Q7, Q8, Q9)      → commitment_level (promedio de pts)
 *   - Q10 → formality_level (pts directo)
 *   - Q11 → emotional_distance (pts directo)
 *   - Q12 → tone (enum directo)
 *   - Q13 + Q14 → vocabulary_preference (combinación, ver service)
 *   - Q15 → language_default (enum directo)
 *
 * Las opciones usan ids 'a' | 'b' | 'c' | 'd' por pregunta.
 */

export type VoiceQuestion = {
  id: string;
  section: 'experience' | 'self_assessment' | 'commitment' | 'tone_relation' | 'vocabulary';
  text: string;
  helperText?: string; // texto en paréntesis con ejemplos
  options: ReadonlyArray<{
    id: string;
    label: string;
    pts?: number;
    tone?: 'motivador' | 'clinico' | 'cercano' | 'exigente';
    vocab?: 'conciso' | 'tecnico' | 'equilibrado' | 'cotidiano';
    language?: 'es' | 'en' | 'mixed';
  }>;
};

export const VOICE_CONFIG_QUESTIONS: ReadonlyArray<VoiceQuestion> = [
  // ===== Sección 1 — Experiencia en salud funcional → experience_level (1-10) =====
  {
    id: 'Q1',
    section: 'experience',
    text: '¿Cuántos años llevas tomando decisiones activas sobre tu salud funcional, más allá de lo que el médico convencional te dice?',
    helperText:
      'ej. medir tu glucosa fuera de visita médica, ajustar dieta por razones específicas, suplementarte con criterio propio, buscar segundas opiniones funcionales',
    options: [
      { id: 'a', label: 'Menos de 1 año', pts: 1 },
      { id: 'b', label: 'Entre 1 y 3 años', pts: 4 },
      { id: 'c', label: 'Entre 3 y 7 años', pts: 7 },
      { id: 'd', label: 'Más de 7 años', pts: 10 },
    ],
  },
  {
    id: 'Q2',
    section: 'experience',
    text: '¿Qué tan familiarizado estás con conceptos de salud funcional?',
    helperText:
      "por ejemplo: la diferencia entre rangos óptimos y rangos clínicos 'normales'; el ayuno intermitente y sus ventanas; biomarcadores de inflamación; calidad de los suplementos como metilfolato vs ácido fólico, magnesio glicinato vs óxido",
    options: [
      { id: 'a', label: 'Es nuevo para mí', pts: 1 },
      { id: 'b', label: 'He oído pero no profundizo', pts: 4 },
      { id: 'c', label: 'Los uso en conversación', pts: 7 },
      { id: 'd', label: 'Los entiendo a fondo y los aplico', pts: 10 },
    ],
  },
  {
    id: 'Q3',
    section: 'experience',
    text: '¿Has trabajado con un médico funcional, nutriólogo holístico o coach de salud?',
    options: [
      { id: 'a', label: 'No', pts: 1 },
      { id: 'b', label: 'Una vez, brevemente', pts: 4 },
      { id: 'c', label: 'Sí, en varios episodios', pts: 7 },
      { id: 'd', label: 'Trabajo regularmente con uno', pts: 10 },
    ],
  },
  {
    id: 'Q3b',
    section: 'experience',
    text: 'En tu familia, ¿cuidan los hábitos saludables como sueño, alimentación, suplementos o ejercicio?',
    options: [
      { id: 'a', label: 'No, cada quien hace lo suyo y no es un tema', pts: 1 },
      { id: 'b', label: 'Algunos lo cuidan, otros no — había mezcla', pts: 4 },
      { id: 'c', label: 'Sí, hay conciencia y la mayoría lo intenta', pts: 7 },
      { id: 'd', label: 'Sí, es la norma en casa — está integrado a la rutina', pts: 10 },
    ],
  },

  // ===== Sección 2 — Cómo te evalúas a ti mismo → self_assessment_capacity (1-10) =====
  {
    id: 'Q4',
    section: 'self_assessment',
    text: "Cuando algo 'no está bien' en tu cuerpo, ¿qué tiendes a hacer?",
    options: [
      { id: 'a', label: 'Consulto rápido, prefiero descartar', pts: 3 },
      { id: 'b', label: 'Investigo, monitoreo unos días, decido', pts: 9 },
      { id: 'c', label: "Suelo pensar 'ya pasará'", pts: 3 },
      { id: 'd', label: 'Depende mucho del síntoma — actúo cuando algo se sale del patrón', pts: 8 },
    ],
  },
  {
    id: 'Q5',
    section: 'self_assessment',
    text: 'Cuando duermes mal o estás cansado, ¿qué tan certero eres al identificar la causa?',
    options: [
      { id: 'a', label: 'Casi siempre identifico el por qué', pts: 9 },
      { id: 'b', label: 'Identifico patrones generales (estrés, mala cena, viaje)', pts: 7 },
      { id: 'c', label: 'Me cuesta saberlo', pts: 3 },
      { id: 'd', label: 'Lo atribuyo siempre a la misma causa (mi explicación favorita)', pts: 2 },
    ],
  },
  {
    id: 'Q6',
    section: 'self_assessment',
    text: "Si una báscula te dice que pesas 78 kg pero te sientes 'como 80', ¿a cuál le crees más?",
    options: [
      { id: 'a', label: 'A la báscula — los números no mienten', pts: 9 },
      { id: 'b', label: 'A mi sensación — el cuerpo sabe', pts: 3 },
      { id: 'c', label: 'A los dos por igual', pts: 5 },
      { id: 'd', label: 'Verifico con otra báscula antes de decidir', pts: 8 },
    ],
  },

  // ===== Sección 3 — Compromiso → commitment_level (1-10) =====
  {
    id: 'Q7',
    section: 'commitment',
    text: 'En los últimos 12 meses, ¿cuántos hábitos nuevos has logrado mantener más de 90 días?',
    options: [
      { id: 'a', label: 'Ninguno', pts: 1 },
      { id: 'b', label: '1 hábito', pts: 4 },
      { id: 'c', label: '2 o 3 hábitos', pts: 7 },
      { id: 'd', label: '4 o más hábitos', pts: 10 },
    ],
  },
  {
    id: 'Q8',
    section: 'commitment',
    text: 'Cuando empiezas un protocolo de salud, ¿qué porcentaje de las recomendaciones aplicas en la práctica?',
    options: [
      { id: 'a', label: 'Menos del 30%', pts: 2 },
      { id: 'b', label: 'Entre 30 y 60%', pts: 5 },
      { id: 'c', label: 'Entre 60 y 90%', pts: 7 },
      { id: 'd', label: 'Más del 90%', pts: 10 },
    ],
  },
  {
    id: 'Q9',
    section: 'commitment',
    text: 'Si una recomendación es difícil (cambiar la dieta entera, despertar 1 h antes), ¿qué te pasa?',
    options: [
      { id: 'a', label: 'Me rindo en la primera semana', pts: 2 },
      { id: 'b', label: 'Aguanto un mes y luego se cae', pts: 5 },
      { id: 'c', label: 'La sigo aunque batalle', pts: 8 },
      { id: 'd', label: 'La incorporo sin sufrir, así soy', pts: 10 },
    ],
  },

  // ===== Sección 4 — Tono y relación → formality_level, emotional_distance, tone =====
  {
    id: 'Q10',
    section: 'tone_relation',
    text: '¿Cómo prefieres que te hablen?',
    options: [
      { id: 'a', label: "Formal, respetuoso, 'usted'", pts: 9 },
      { id: 'b', label: "Profesional pero cercano, 'tú'", pts: 5 },
      { id: 'c', label: 'Casual, directo, sin filtros', pts: 2 },
    ],
  },
  {
    id: 'Q11',
    section: 'tone_relation',
    text: 'Cuando el coach te marque algo crítico, ¿qué prefieres?',
    options: [
      { id: 'a', label: 'Que me lo diga directo, sin endulzar', pts: 9 },
      { id: 'b', label: 'Que me explique con contexto y matices', pts: 5 },
      { id: 'c', label: 'Que me dé la noticia con cuidado y empatía', pts: 2 },
    ],
  },
  {
    id: 'Q12',
    section: 'tone_relation',
    text: '¿Qué tono te motiva más?',
    options: [
      { id: 'a', label: "Energético, motivacional ('¡vamos!')", tone: 'motivador' },
      { id: 'b', label: 'Sereno, clínico, basado en datos', tone: 'clinico' },
      { id: 'c', label: "Cómplice, 'estamos juntos en esto'", tone: 'cercano' },
      { id: 'd', label: 'Riguroso, exigente, te empuja', tone: 'exigente' },
    ],
  },

  // ===== Sección 5 — Vocabulario → vocabulary_preference, language_default =====
  {
    id: 'Q13',
    section: 'vocabulary',
    text: '¿Cómo prefieres que sean las respuestas?',
    options: [
      { id: 'a', label: 'Cortas y al grano', vocab: 'conciso' },
      { id: 'b', label: 'Profundas, con datos y referencias', vocab: 'tecnico' },
      { id: 'c', label: 'Equilibradas, ni muy cortas ni muy largas', vocab: 'equilibrado' },
    ],
  },
  {
    id: 'Q14',
    section: 'vocabulary',
    text: '¿Te gustan los tecnicismos (HOMA-IR, eje HHG, AMPK, metilación)?',
    options: [
      { id: 'a', label: 'Sí, los entiendo y prefiero la precisión', vocab: 'tecnico' },
      { id: 'b', label: 'A veces, con explicación breve', vocab: 'equilibrado' },
      { id: 'c', label: 'No, prefiero lenguaje cotidiano', vocab: 'cotidiano' },
    ],
  },
  {
    id: 'Q15',
    section: 'vocabulary',
    text: '¿En qué idioma quieres tu coach por default?',
    options: [
      { id: 'a', label: 'Español', language: 'es' },
      { id: 'b', label: 'English', language: 'en' },
      { id: 'c', label: 'Bilingüe (mezcla según el contexto)', language: 'mixed' },
    ],
  },
];
