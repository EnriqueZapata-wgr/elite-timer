/**
 * Guía de Laboratorios ATP — contenido (Sprint LABS GUÍA DESCARGABLE T1).
 *
 * Doctrina Humby/Enrique: "hacer lo más amigable del mundo para maximizar lo
 * robusto de la historia clínica con la menor fricción posible". Esta guía
 * elimina el abandono silencioso en "¿qué labs me hago?".
 *
 * Léxico México (biometría hemática, química clínica) + rangos de precio MXN
 * aproximados + laboratorios comerciales. Review Enrique + Mariana.
 *
 * Archivo puro (sin react-native): alimenta la pantalla in-app Y el PDF,
 * y es testeable con el harness Vitest node-only.
 */

export interface LabsPackage {
  id: string;
  name: string;
  /** Rango aproximado en MXN, texto listo para UI ("$800–1,500 MXN"). */
  priceRange: string;
  /** Para quién / cuándo pedirlo. */
  forWho: string;
  /** Estudios del paquete, con léxico de laboratorio mexicano. */
  labs: string[];
  /** Nota opcional (ej. timing de ciclo). */
  note?: string;
  /** Solo aplica a un sexo biológico (los demás aplican a todos). */
  sex?: 'male' | 'female';
}

export const LABS_GUIDE_META = {
  title: 'Guía de Laboratorios ATP',
  subtitle: 'Qué estudios hacerte, dónde y cómo prepararte',
  version: 'v1 · julio 2026',
  disclaimer:
    'Esta guía es informativa y educativa: no es una orden médica ni sustituye ' +
    'el criterio de tu profesional de salud. Los precios son aproximados y ' +
    'varían por ciudad y laboratorio.',
} as const;

export const LABS_GUIDE_INTRO = {
  whyTitle: '¿Por qué te pedimos laboratorios?',
  why: [
    'Tus laboratorios son la foto más honesta de tu biología. Con ellos ATP calcula tu Edad ATP — la edad a la que realmente está operando tu cuerpo.',
    'ARGOS los usa para darte insights personalizados: no consejos genéricos, sino los tuyos.',
    'No necesitas todo de una vez. Empieza con el Paquete Base y crece desde ahí.',
  ],
  costNote:
    'Inversión aproximada: desde $800 MXN (Base) hasta $5,500 MXN (Longevidad Deep). Una vez al año suele ser suficiente para la mayoría.',
} as const;

export const LABS_PACKAGES: LabsPackage[] = [
  {
    id: 'base',
    name: 'Paquete Base',
    priceRange: '$800–1,500 MXN',
    forWho: 'Para arrancar. Si es tu primera vez o llevas más de un año sin estudios, empieza aquí.',
    labs: [
      'Biometría hemática completa',
      'Química clínica de 6 elementos',
      'Perfil de lípidos',
      'Glucosa en ayuno',
      'Hemoglobina glicosilada (HbA1c)',
    ],
  },
  {
    id: 'metabolico',
    name: 'Paquete Metabólico',
    priceRange: '$1,500–2,500 MXN',
    forWho: 'Si sospechas resistencia a la insulina: energía inestable, grasa abdominal que no cede, antojos fuertes de azúcar.',
    labs: [
      'Todo lo del Paquete Base',
      'Insulina en ayuno',
      'HOMA-IR (índice de resistencia a la insulina)',
      'Perfil tiroideo (TSH, T3, T4)',
      'Ácido úrico',
      'Homocisteína',
    ],
  },
  {
    id: 'hormonal_m',
    name: 'Paquete Hormonal — Hombres',
    priceRange: '$2,000–3,500 MXN',
    forWho: 'Si buscas optimizar energía, composición corporal, libido o rendimiento.',
    labs: [
      'Testosterona total y libre',
      'DHEA-S',
      'Estradiol',
      'SHBG (globulina fijadora de hormonas sexuales)',
      'Cortisol matutino',
    ],
    sex: 'male',
  },
  {
    id: 'hormonal_f',
    name: 'Paquete Hormonal — Mujeres',
    priceRange: '$2,000–3,500 MXN',
    forWho: 'Si buscas entender tu ciclo, energía, o síntomas hormonales (ciclo irregular, SPM intenso, perimenopausia).',
    labs: [
      'Progesterona y estradiol (según fase del ciclo)',
      'FSH y LH',
      'DHEA-S',
      'Cortisol matutino',
    ],
    note:
      'El timing importa: FSH/LH/estradiol se toman idealmente en día 2–4 del ciclo; progesterona en día 19–22 (ciclo de 28 días). Si tu ciclo es irregular o estás en otra modalidad, coméntalo en el laboratorio y regístralo en ATP.',
    sex: 'female',
  },
  {
    id: 'longevidad',
    name: 'Paquete Longevidad Deep',
    priceRange: '$3,500–5,500 MXN',
    forWho: 'Para quienes quieren el cálculo completo de PhenoAge (edad biológica de investigación) dentro de tu Edad ATP.',
    labs: [
      'Todo lo del Paquete Base + Metabólico',
      'Albúmina',
      'Fosfatasa alcalina',
      'Leucocitos (WBC)',
      'Volumen corpuscular medio (VCM / MCV)',
      'Ancho de distribución eritrocitaria (RDW)',
      'Proteína C reactiva ultrasensible (PCR-us)',
    ],
    note: 'Varios de estos vienen incluidos en la biometría hemática — pídele al laboratorio el desglose completo en tus resultados.',
  },
];

export interface CommercialLab {
  name: string;
  note: string;
}

export const LABS_COMERCIALES: CommercialLab[] = [
  { name: 'Chopo', note: 'Cobertura nacional amplia; paquetes tipo check-up frecuentes en promoción.' },
  { name: 'Salud Digna', note: 'La opción más accesible en precio; suele requerir cita por app.' },
  { name: 'Laboratorio Médico Polanco / Ruiz', note: 'Buen equilibrio precio-servicio en el centro y occidente del país.' },
  { name: 'Licy', note: 'Fuerte presencia regional; revisa sucursales en tu ciudad.' },
];

export const LABS_COMERCIALES_NOTE =
  'Tip: pregunta por "paquete check-up" o arma el tuyo con la lista de arriba — casi siempre sale mejor que pedir estudios sueltos. No necesitas orden médica para la mayoría de estos estudios en México.';

export const LABS_PREPARACION: string[] = [
  'Ayuno de 8–12 horas para glucosa, insulina y perfil de lípidos (agua natural sí puedes — y debes — tomar).',
  'Agenda temprano en la mañana (7–9 am): el cortisol y las hormonas se miden idealmente al despertar.',
  'Hidrátate normal el día anterior — llegar deshidratado altera varios valores.',
  'Evita ejercicio intenso 24 horas antes: puede elevar marcadores de inflamación y enzimas musculares.',
  'Mujeres: si vas por el Paquete Hormonal, revisa la nota de timing del ciclo (día 2–4 o 19–22 según el estudio).',
  'Si tomas suplementos con biotina (B7), suspéndela 48 h antes — interfiere con estudios tiroideos y hormonales.',
];

export const LABS_DESPUES = {
  title: 'Ya los tengo, ¿ahora qué?',
  steps: [
    'Súbelos a ATP: Salud → Laboratorios → foto o PDF. ARGOS extrae los valores automáticamente.',
    'ATP calcula tu Edad ATP con rangos funcionales (no solo los "normales" del laboratorio).',
    'ARGOS integra tus resultados a tus insights diarios y a tus protocolos.',
  ],
  closing: 'Un estudio al año bien elegido vale más que diez apps de salud. Este es el paso que más eleva tu experiencia en ATP.',
} as const;
