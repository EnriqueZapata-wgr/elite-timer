/**
 * Explicaciones de cada dominio de salud — para modales informativos.
 *
 * Cada dominio incluye: qué significa, cómo mejorar, y qué datos necesita.
 * Disclaimer: "Esta información es educativa y no sustituye el consejo de un profesional de salud."
 */

export interface DomainExplanation {
  name: string;
  icon: string;
  color: string;
  whatItMeans: string;
  howToImprove: string[];
  dataNeeded: string[];
}

export const DOMAIN_EXPLANATIONS: Record<string, DomainExplanation> = {
  cardiovascular: {
    name: 'Cardiovascular',
    icon: 'heart-outline',
    color: '#E24B4A',
    whatItMeans: 'Evalúa la salud de tu corazón y vasos sanguíneos. Incluye presión arterial, frecuencia cardíaca y variabilidad cardíaca (HRV).',
    howToImprove: [
      'Registra tu presión arterial regularmente',
      'Haz 150+ minutos de ejercicio aeróbico por semana',
      'Conecta un wearable para FC y HRV automáticos',
      'Reduce el consumo de sodio y alimentos procesados',
    ],
    dataNeeded: ['Presión arterial', 'FC en reposo', 'HRV', 'Perfil lipídico'],
  },
  metabolic: {
    name: 'Metabolismo',
    icon: 'flame-outline',
    color: '#EF9F27',
    whatItMeans: 'Evalúa cómo tu cuerpo procesa energía. Incluye glucosa, insulina, perfil lipídico y función tiroidea.',
    howToImprove: [
      'Sube tus labs de glucosa e insulina en ayunas',
      'Practica ayuno intermitente (mínimo 14h)',
      'Reduce carbohidratos refinados',
      'Haz ejercicio de fuerza regularmente',
    ],
    dataNeeded: ['Glucosa en ayunas', 'Insulina', 'HbA1c', 'Perfil lipídico'],
  },
  metabolismo: {
    name: 'Metabolismo',
    icon: 'flame-outline',
    color: '#EF9F27',
    whatItMeans: 'Evalúa cómo tu cuerpo procesa energía. Incluye glucosa, insulina, perfil lipídico y función tiroidea.',
    howToImprove: [
      'Sube tus labs de glucosa e insulina en ayunas',
      'Practica ayuno intermitente (mínimo 14h)',
      'Reduce carbohidratos refinados',
      'Haz ejercicio de fuerza regularmente',
    ],
    dataNeeded: ['Glucosa en ayunas', 'Insulina', 'HbA1c', 'Perfil lipídico'],
  },
  sleep: {
    name: 'Sueño',
    icon: 'moon-outline',
    color: '#5B9BD5',
    whatItMeans: 'Evalúa la calidad y duración de tu sueño. El sueño es la base de la recuperación y el rendimiento.',
    howToImprove: [
      'Conecta un wearable para medir sueño automáticamente',
      'Registra tus horas de sueño manualmente',
      'Mantén un horario consistente de sueño',
      'Evita pantallas 1h antes de dormir',
    ],
    dataNeeded: ['Horas de sueño', 'Calidad subjetiva', 'HRV nocturno (wearable)'],
  },
  hormonal: {
    name: 'Hormonal',
    icon: 'pulse-outline',
    color: '#7F77DD',
    whatItMeans: 'Evalúa el equilibrio de tus hormonas. Afecta energía, ánimo, composición corporal y rendimiento.',
    howToImprove: [
      'Sube tus labs hormonales (testosterona, cortisol, tiroides)',
      'Optimiza tu sueño (las hormonas se regulan durmiendo)',
      'Reduce el estrés crónico',
      'Haz ejercicio de fuerza (estimula hormonas anabólicas)',
    ],
    dataNeeded: ['Testosterona', 'Cortisol', 'TSH/T3/T4', 'DHEA-S'],
  },
  habits: {
    name: 'Hábitos',
    icon: 'checkmark-done-outline',
    color: '#A8E02A',
    whatItMeans: 'Evalúa tus hábitos diarios: ejercicio, sueño, nutrición, hidratación y manejo de estrés.',
    howToImprove: [
      'Completa tus acciones del timeline diario',
      'Registra tu nutrición y sueño regularmente',
      'Mantén una racha de check-ins emocionales',
      'Sigue tus protocolos activos',
    ],
    dataNeeded: ['Acciones completadas', 'Check-ins', 'Nutrición diaria'],
  },
  vitality: {
    name: 'Vitalidad',
    icon: 'flash-outline',
    color: '#EF9F27',
    whatItMeans: 'Mide tu nivel de energía subjetiva, ánimo y bienestar general.',
    howToImprove: [
      'Registra tu nivel de energía en los check-ins',
      'Mejora tu sueño y nutrición',
      'Haz ejercicio regularmente',
      'Practica mindfulness o meditación',
    ],
    dataNeeded: ['Check-ins de energía', 'Nivel de ánimo', 'Sueño'],
  },
  inflammation: {
    name: 'Inflamación',
    icon: 'thermometer-outline',
    color: '#E24B4A',
    whatItMeans: 'Mide la inflamación sistémica. La inflamación crónica acelera el envejecimiento y causa enfermedades.',
    howToImprove: [
      'Sube tus labs: PCR, VSG, ferritina',
      'Reduce alimentos ultraprocesados',
      'Incluye Omega 3 (2-4g EPA+DHA diarios)',
      'Mejora tu sueño y reduce estrés',
    ],
    dataNeeded: ['PCR ultrasensible', 'VSG', 'Ferritina', 'Omega 3 index'],
  },
  body_composition: {
    name: 'Composición corporal',
    icon: 'body-outline',
    color: '#1D9E75',
    whatItMeans: 'Evalúa la proporción de grasa, músculo y agua en tu cuerpo.',
    howToImprove: [
      'Registra tu composición corporal regularmente',
      'Entrena fuerza 3-4x por semana',
      'Mantén una dieta alta en proteína',
      'Conecta una báscula inteligente',
    ],
    dataNeeded: ['% grasa corporal', '% masa muscular', 'Grasa visceral', 'Peso'],
  },
  renal: {
    name: 'Renal y Micronutrientes',
    icon: 'water-outline',
    color: '#5B9BD5',
    whatItMeans: 'Evalúa la función renal y el estado de vitaminas y minerales esenciales.',
    howToImprove: [
      'Sube tus labs de función renal',
      'Verifica niveles de vitamina D, B12, hierro',
      'Mantente bien hidratado',
      'Incluye variedad de frutas y verduras',
    ],
    dataNeeded: ['Creatinina', 'BUN', 'Vitamina D', 'B12', 'Hierro'],
  },
  immunity: {
    name: 'Inmunidad',
    icon: 'shield-outline',
    color: '#1D9E75',
    whatItMeans: 'Evalúa la fortaleza de tu sistema inmune basado en tus hábitos y labs.',
    howToImprove: [
      'Sube tus labs: biometría hemática',
      'Duerme 7-9 horas por noche',
      'Haz ejercicio moderado regularmente',
      'Suplementa vitamina D si está baja',
    ],
    dataNeeded: ['Biometría hemática', 'Vitamina D', 'Sueño'],
  },
};

/** Explicación del ritmo de envejecimiento */
export const AGING_RATE_EXPLANATION = {
  whatItMeans: 'Mide qué tan rápido envejeces biológicamente comparado con tu edad real. Un valor menor a 1.0 significa que envejeces más lento que el promedio.',
  examples: [
    '0.80x = Envejeces 20% más lento',
    '1.00x = Ritmo normal de envejecimiento',
    '1.20x = Envejeces 20% más rápido — necesitas optimizar',
  ],
  howToImprove: 'Mejora sueño, nutrición, ejercicio y manejo de estrés. Cada dominio contribuye.',
};

/** Disclaimer legal */
export const HEALTH_DISCLAIMER = 'Esta información es educativa y no sustituye el consejo de un profesional de salud.';
