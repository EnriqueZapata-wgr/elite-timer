/**
 * Catálogo de Intervenciones ATP — fuente de verdad curada (constants, git-versionado).
 *
 * Doctrina (scope 2026-07-11 + decisiones aprobadas + review v3 Enrique 2026-07-11):
 *  - En ATP NO se recomiendan suplementos ni fármacos. Las intervenciones son
 *    hábitos / prácticas / rituales / técnicas de medicina y nutrición funcional.
 *  - El motor cruza las `roots` de cada intervención contra las raíces del DX del
 *    user y sugiere con semáforo. El user activa libremente (sin límite).
 *  - Cada MODALIDAD es una intervención distinta (comparten filosofía, no
 *    implementación): "Ayuno 16:8" ≠ "Ayuno 18:6". Se enlazan con `family`.
 *  - El user puede crear intervenciones CUSTOM (no viven aquí; viven en
 *    user_interventions.custom_definition).
 *  - Los recordatorios circadianos (dormir/comer) leen de agenda del user
 *    (cronotipo = ajuste inicial, user manda final vía agenda). Delfín NO es
 *    cronotipo — es estado transitorio a sanar hacia León/Oso/Lobo.
 *
 * ✅ v3 CURADO ENRIQUE 2026-07-11: 86 intervenciones aprobadas. Fuente:
 *  `Business development/Beta_Launch_Kit/09b_SEEDS_CATALOGO_ARRANQUE_MARIANA.md`
 *
 * 🧬 v4 EPIGENÉTICO 2026-07-14: 86 intervenciones enriquecidas con rastro epigenético completo
 *  (epigeneticImpact, sideEffects, contraindications, recommendationRules, sources)
 *  + 2 nuevas intervenciones (bano_frio_hormesis, hidratacion_ushapan_avanzado)
 *  + 1 renombrada (jawzercise → omt_masticatorios)
 *  = 88 intervenciones totales. Fuente: R and D/RESEARCH_MAPEO_PILOTO/BATCH_A/B/C_2026-07-14.md
 *
 * ⏳ PENDIENTE 2da sesión Mariana: validar ajustes v3 + agregar ciclo femenino,
 * tiroides, postparto, salud masculina, piel, immune post-infección.
 *
 * ⚠️ REQUIEREN VALIDACIÓN CLÍNICA MARIANA (campo `requiresClinicalValidation: true`;
 * Mariana quita el flag al firmar cada una — task #9). El motor NO las sugiere
 * (matchInterventions las excluye de suggestions/universals); el user sí puede
 * activarlas manualmente si ya las tiene en user_interventions. Flaggeadas hoy:
 *  bulletproof_coffee (Cowork corregido: doctrina Enrique BPC no sube insulina),
 *  wim_hof_basico, wim_hof_extendido, hiperventilacion_matutina, tabla_co2,
 *  tabla_o2, luz_roja_ojos, dive_reflex_cara_hielo, omt_masticatorios, ayuno_20_4_omad,
 *  ejercicio_ayuno_fuerza, protocolo_ayuno_sardinas.
 */
import type { InterventionCategory, InterventionRoot } from './intervention-vocab';

export type Priority = 1 | 2 | 3; // 1 🔴 P1 · 2 🟡 P2 · 3 🟢 P3 (default; el motor re-prioriza)
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

/**
 * Jerarquía de evidencia ATP multi-paradigma (2026-07-14 doctrina Enrique).
 * NO es la jerarquía occidental clásica — ATP cruza paradigmas y flaggea funding bias.
 * Ver: project_doctrina_ciencia_multi_paradigma_no_pubmed_only
 *
 * - N1: Multi-paradigma convergente (≥3 paradigmas coinciden en efecto principal)
 * - N2: Occidental sólida independiente de industria + apoyo funcional o tradición
 * - N3: Un paradigma sólido + dos convergentes (ej. MTC + funcional + mecanismo · aunque falte RCT)
 * - N4: Mecanismo biológico plausible + observación clínica funcional + no evidencia de daño
 */
export type EvidenceLevel = 'N1' | 'N2' | 'N3' | 'N4';

/**
 * Paradigma científico de origen de una fuente citada.
 * Permite al motor y a ARGOS ser transparentes sobre el origen del respaldo.
 */
export type SourceParadigm =
  | 'western_academic'      // PubMed, Cochrane, meta-analyses occidentales
  | 'functional_independent' // Kresser, Bredesen, Attia, Sinclair, Huberman, Rhonda Patrick, etc.
  | 'tcm'                    // Medicina Tradicional China
  | 'ayurveda'               // Medicina Ayurvédica
  | 'soviet_sports'          // Investigación soviética de deporte élite
  | 'indian_academic'        // IndMED, MedIND, Ayush Portal
  | 'chinese_academic'       // CNKI, Wanfang, VIP
  | 'russian_academic'       // eLibrary.ru, Cyberleninka
  | 'latam_academic'         // SciELO
  | 'mechanistic'            // Mecanismo bioquímico plausible + observación clínica
  | 'traditional_documented' // Herbolaria europea, termalismo, otras tradiciones documentadas
  ;

/**
 * Cita científica estructurada con paradigma etiquetado y flag de funding.
 * Enable transparencia de sesgo obligatoria (doctrina 2026-07-14).
 */
export interface ScientificSource {
  /** Referencia breve legible ("Sinclair 2019 · Lifespan · SIRT1 activation review"). */
  citation: string;
  /** Paradigma científico de origen. */
  paradigm: SourceParadigm;
  /** URL/DOI/PubMed ID cuando exista. */
  url?: string;
  /** ⚠️ Flag cuando la fuente está patrocinada por industria relevante al outcome (funding bias). */
  industryFunded?: boolean;
  /** Nota si hay conflicto conocido entre paradigmas para esta afirmación. */
  paradigmConflict?: string;
}

/**
 * Rastro epigenético estructurado — QUÉ modifica la intervención en la expresión genética
 * y qué biomarcadores se esperan ver cambiar. Consumible por el motor de personalización
 * y por ARGOS para explicar el "por qué a TI".
 *
 * Ejemplo grounding: { activates: ['NF-κB inhibition'], modulates: ['HRV', 'cortisol'],
 * biomarkers: ['PCR', 'IL-6', 'HRV RMSSD'] }
 */
export interface EpigeneticImpact {
  /** Genes/pathways/enzimas que la intervención activa (ej. SIRT1, AMPK, autofagia). */
  activates?: string[];
  /** Genes/pathways/enzimas que la intervención inhibe/suprime (ej. mTOR nocturno, NF-κB). */
  inhibits?: string[];
  /** Sistemas/procesos que la intervención modula (ej. cortisol ritmo, insulina sensibilidad). */
  modulates?: string[];
  /** Biomarcadores esperados que se muevan con la intervención (ej. HbA1c, PCR, HRV). */
  biomarkers?: string[];
  /** Explicación 1-línea del mecanismo epigenético en lenguaje llano. */
  mechanismSummary?: string;
}

/**
 * Regla ejecutable de recomendación cruzada contra el fenotipo del user.
 * Consumida por personalizeInterventions() para el motor determinístico.
 */
export type RecommendationRule =
  | { source: 'dx_level'; system: string; operator: '<' | '<=' | '=' | '>=' | '>'; value: number }
  | { source: 'braverman'; neurotransmitter: 'dopamine' | 'acetylcholine' | 'gaba' | 'serotonin'; threshold: 'low' | 'medium' | 'high' }
  | { source: 'lab'; marker: string; operator: '<' | '<=' | '=' | '>=' | '>'; value: number; unit?: string }
  | { source: 'profile'; field: string; equals?: string | number | boolean; in?: (string | number)[] }
  | { source: 'quiz'; questionnaire: string; score: 'low' | 'medium' | 'high' }
  | { source: 'chronotype'; type: 'leon' | 'oso' | 'lobo' | 'delfin_transitional' }
  | { source: 'cycle_phase'; phase: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' }
  ;

/**
 * Reglas de recomendación estructuradas — cuándo boostear y cuándo excluir esta intervención.
 * Ambas son AND-lists (todos los criterios deben cumplirse).
 */
export interface RecommendationRules {
  /** Si TODAS estas condiciones se cumplen → sube score de esta intervención para el user. */
  boostIf?: RecommendationRule[];
  /** Si TODAS estas condiciones se cumplen → excluir esta intervención del catálogo del user. */
  excludeIf?: RecommendationRule[];
  /** Score adicional que suma al match del user (default 1). Universales P1 pueden ir 3-5. */
  boostWeight?: number;
}

export interface Intervention {
  /** Key estable, snake_case. Referenciado por user_interventions.intervention_key. */
  key: string;
  /** Nombre corto que ve el user (≤50 chars). */
  name: string;
  /** Cómo se hace — 1 línea accionable. */
  how: string;
  /** Beneficio — por qué funciona (1-2 líneas). */
  benefit: string;
  /** Categorías (para qué sirve) — múltiples. */
  categories: InterventionCategory[];
  /** Raíces que ataca — múltiples. [] para universales fijas sin raíz específica. */
  roots: InterventionRoot[];
  /** Regla clínica en lenguaje normal ("cuándo asignarla"). */
  assignRule: string;
  /** Prioridad default 🔴🟡🟢. */
  priority: Priority;
  /** Familia de modalidades (p.ej. 'ayuno'); las modalidades comparten familia. */
  family?: string;
  /** Universal: fallback garantizado / circadiano. */
  isUniversal?: boolean;
  /** Universal circadiano: el timing se calcula desde user_chronotype (no fijo). */
  circadian?: 'sleep' | 'eat';
  /** Momento del día sugerido (para timing e íconos). */
  timeOfDay?: TimeOfDay;
  /** Info científica / bibliografía / "considerar consultar con tu nutriólogo". */
  scientificInfo?: string;
  /** Nivel de evidencia (jerarquía ARGOS multi-paradigma). */
  evidenceLevel?: EvidenceLevel;
  /** ⚠️ Requiere validación clínica adicional de Mariana antes de activar producción. */
  requiresClinicalValidation?: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧬 CAMPOS EPIGENÉTICOS (extensión 2026-07-14) · alimentan motor personalización + ARGOS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Rastro epigenético estructurado — qué activa/inhibe/modula/qué biomarcadores mueve. */
  epigeneticImpact?: EpigeneticImpact;
  /** Efectos secundarios documentados (no bloqueantes, informativos). Ej: 'shock_termico_inicial'. */
  sideEffects?: string[];
  /** Contraindicaciones absolutas (motor NO recomienda si el user cumple). Ej: 'embarazo', 'diabetes_1'. */
  contraindications?: string[];
  /** Reglas ejecutables cruzadas contra fenotipo del user (DX+Braverman+labs+profile). */
  recommendationRules?: RecommendationRules;
  /** Fuentes científicas multi-paradigma con paradigma etiquetado y flag de funding. */
  sources?: ScientificSource[];
}

export const INTERVENTIONS_CATALOG: Intervention[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // UNIVERSALES P1 · fallback garantizado (7 confirmados Enrique v3)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'hidratacion_matutina',
    name: 'Hidratación matutina 500 ml',
    how: 'Bebe 500 ml de agua natural al despertar (opcional pizca de sal de mar Celtic/Himalaya + gotas de limón), antes de café o comida. Idealmente tibia en frío ambiental o clima frío; a temperatura ambiente en clima cálido.',
    benefit: 'Rehidrata tras el ayuno nocturno de 6-9h, activa peristalsis colónica (reflejo gastrocólico matutino), moviliza cortisol matutino sano y reduce viscosidad sanguínea del pico 6-9am.',
    categories: ['hidratacion', 'digestion', 'circadiano', 'energia'],
    roots: ['cortisol_matutino_bajo', 'ritmo_circadiano_desregulado', 'digestion_estres_autonomico'],
    assignRule: 'Universal — todos. Reforzar (boostWeight máximo) si: cortisol matutino bajo, constipación funcional, viscosidad sanguínea elevada, presión arterial matutina >130.',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'morning',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'aquaporinas AQP4 cerebral (drenaje glinfático residual matutino)',
        'peristalsis colónica (reflejo gastrocólico matutino)',
        'ADH baseline reset (vasopresina se normaliza post-ayuno de agua)',
        'RAAS regulación (renina-angiotensina-aldosterona vuelve a baseline diurno)',
        'motilidad esofágica (MMC · Migrating Motor Complex barre residuos)',
      ],
      inhibits: [
        'ADH sobre-elevada nocturna',
        'hemoconcentración matutina (viscosidad sanguínea pico 6-9am · asociada con eventos cardiovasculares matutinos)',
        'agregación plaquetaria matutina',
        'osmolaridad plasmática elevada (>295 mOsm/kg tras ayuno nocturno prolongado)',
      ],
      modulates: [
        'cortisol_ritmo (peak matutino sano · agua tibia + sal potencia CAR)',
        'volumen plasmático (expansión modesta 3-5%)',
        'sensibilidad barorreceptora',
        'temperatura core (agua tibia acelera termogénesis matutina; agua fría la retrasa)',
      ],
      biomarkers: [
        'gravedad_especifica_orina (target 1.005-1.020)',
        'hematocrito matutino',
        'presion_arterial_matutina',
        'HRV matutino',
        'osmolaridad_plasmatica',
        'sodio_sérico (validar si se agrega sal)',
      ],
      mechanismSummary: 'Rehidratar 500 ml tras 6-9h de ayuno de agua reduce viscosidad sanguínea del pico matutino, normaliza ADH y osmolaridad, activa peristalsis colónica vía reflejo gastrocólico, y prepara el cortisol matutino sano.',
    },

    sideEffects: [
      'urgencia_miccional_temprana (esperable primeros días · adapta 2-3 semanas)',
      'sensacion_frio_transitoria (si agua muy fría en clima frío)',
      'plenitud_estomacal_leve (si volumen se toma muy rápido · fraccionar en 2-3 tragos)',
    ],

    contraindications: [
      'insuficiencia_cardiaca_avanzada_restricion_liquidos',
      'sindrome_secrecion_inadecuada_adh (SIADH)',
      'hiponatremia_severa_activa',
      'insuficiencia_renal_terminal_dialisis_con_restriccion_hidrica',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'presion_arterial_sistolica', operator: '>=', value: 130 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['insuficiencia_cardiaca_avanzada', 'siadh', 'hiponatremia_severa', 'insuficiencia_renal_dialisis'] },
      ],
      boostWeight: 5,
    },

    sources: [
      {
        citation: 'Popkin BM, D\'Anci KE, Rosenberg IH "Water, Hydration, and Health" Nutrition Reviews 2010',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20646222/',
        industryFunded: false,
      },
      {
        citation: 'Perrier ET et al. "Hydration for health hypothesis: a narrative review of supporting evidence" Eur J Nutr 2021',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33409578/',
        industryFunded: true,
        paradigmConflict: 'Estudio patrocinado por Danone (Evian) · resultados consistentes con literatura no-sponsored (Popkin 2010) pero flag transparencia.',
      },
      {
        citation: 'Muller MJ et al. "The influence of hydration status on body composition" Appetite 2013 · impacto del sodio matutino en volumen plasmático',
        paradigm: 'western_academic',
      },
      {
        citation: 'Chris Kresser "Adrenal Fatigue and Morning Hydration" 2018 · protocolo agua + sal + limón AM para cortisol funcional',
        paradigm: 'functional_independent',
      },
      {
        citation: 'James Nestor "Breath: The New Science of a Lost Art" 2020 · discusión hidratación mucus + respiración nasal matutina',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC clásico · Agua tibia matutina activa Wei Qi (energía defensiva) y despierta Yang de estómago-bazo · práctica de "sorber agua tibia al levantarse"',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Ushapan (उषापान · beber agua al amanecer) descrito en Charaka Samhita Sutra Sthana + Bhavaprakasha · práctica de 4-6 vasos de agua tibia al despertar antes de cualquier alimento · trata Shodhana (limpieza) del sistema',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Muller MC et al. "Circadian variation of hemostatic function" Semin Thromb Hemost 1991 · viscosidad sanguínea + agregación plaquetaria pico matutino 6-9am',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/1948809/',
      },
    ],
  },
  {
    key: 'exposicion_solar_matutina',
    name: 'Exposición solar matutina (Fitzpatrick)',
    how: 'Sal a luz solar directa entre 7-9am, ojos abiertos sin lentes de sol (NO mirar sol directo). Piel expuesta (brazos + cara mínimo). Minutos según fototipo: I (piel muy clara) 5 min · II-III 10 min · IV-V 15-20 min · VI (piel muy oscura) 20-30 min. Si nublado, doblar tiempo. Vidrio bloquea UVB → salir físicamente.',
    benefit: 'Ancla ritmo circadiano vía CRY1/CRY2 en núcleo supraquiasmático, dispara CAR (cortisol awakening response), programa síntesis melatonina 14h después, sube serotonina vía TPH2 y sintetiza vitamina D3 endógena.',
    categories: ['sueno', 'circadiano', 'hormonal', 'cognitivo', 'energia', 'piel'],
    roots: ['cortisol_matutino_bajo', 'ritmo_circadiano_desregulado', 'deficit_exposicion_solar', 'deficit_sueno_profundo'],
    assignRule: 'Universal — dosis adaptada por fototipo Fitzpatrick. Flag P1 si vitamina D <40 ng/mL, insomnio de conciliación, fatiga matutina, tristeza estacional (SAD), cortisol matutino bajo, cronotipo lobo (retrasado).',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'morning',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'expresión gen CRY1/CRY2 (cryptochromes · photoentrainment retinohipotalámico)',
        'CLOCK gene phase-setting (BMAL1:CLOCK heterodimer alineado con dawn)',
        'PER1/PER2 morning-shifted expression',
        'síntesis endógena vitamina D3 (7-dehidrocolesterol → previtamina D3 en queratinocitos · UVB 290-315nm)',
        'tryptofano → serotonina (vía TPH2 estimulada por luz intensa >1000 lux)',
        'melanina protectora (MC1R activation · α-MSH release)',
        'β-endorfinas piel (POMC-derived)',
        'óxido nítrico dérmico (NO liberado de nitratos cutáneos por UVA)',
      ],
      inhibits: [
        'melatonina residual matutina',
        'expresión REV-ERBα no alineada',
        'AANAT (arylalkylamine N-acetyltransferase · enzima limitante melatonina · se apaga con luz)',
      ],
      modulates: [
        'cortisol_ritmo (Cortisol Awakening Response amplificada 50-100% sobre baseline)',
        'conversión serotonina→melatonina 14h después (onset del sueño programado)',
        'dopamina baseline diurna (retinohipotalámico → área tegmental ventral)',
        'histamina cerebral (alerta matutina)',
        'presión arterial (NO cutáneo baja PA sistémica 2-5 mmHg en algunos)',
      ],
      biomarkers: [
        '25-OH-vitamina_D (target funcional 50-80 ng/mL)',
        'cortisol_matutino_salival (CAR de 50-100% sobre baseline)',
        'melatonina_salival_nocturna (DLMO alineado 21-22h)',
        'melatonina_urinaria_6-sulfatoxi',
        'serotonina_plaquetaria (proxy)',
        'sueño profundo % (por wearable)',
        'alfa_MSH_hormona_estimulante_melanocitos',
      ],
      mechanismSummary: 'Luz UV/UVB matutina impacta ipRGC (células ganglionares intrínsecamente fotosensibles) → tracto retinohipotalámico → núcleo supraquiasmático que sincroniza el reloj master; simultáneamente dispara CAR, sube serotonina, activa síntesis vitamina D en piel y programa la producción de melatonina 14h después.',
    },

    sideEffects: [
      'quemadura_solar (si exceso o Fitzpatrick I sin protección)',
      'fotosensibilizacion (con ciertos medicamentos)',
      'irritacion_ocular_transitoria (si luz muy intensa sin adaptación · nunca mirar sol directo)',
      'eritema_leve_transitorio (esperable en primeros días de reintroducción)',
      'aumento_libido (esperable · testosterona sube modestamente con exposición UV)',
    ],

    contraindications: [
      'lupus_eritematoso_activo',
      'porfiria (cutánea tarda o eritropoyética)',
      'xeroderma_pigmentoso',
      'medicamentos_fotosensibilizantes_activos',
      'melanoma_activo',
      'polymorphous_light_eruption_severa',
      'albinismo (ajustar drasticamente)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'vitamin_d_25oh', operator: '<', value: 40, unit: 'ng/mL' },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'chronotype', type: 'lobo' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['lupus_activo', 'porfiria', 'melanoma_activo', 'xeroderma_pigmentoso'] },
      ],
      boostWeight: 5,
    },

    sources: [
      {
        citation: 'Wehr TA "Photoperiodism in humans and other primates: evidence and implications" J Biol Rhythms 2001',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11487529/',
        industryFunded: false,
      },
      {
        citation: 'Holick MF "Vitamin D deficiency" NEJM 2007 · sunlight synthesis pathway',
        paradigm: 'western_academic',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMra070553',
        industryFunded: false,
      },
      {
        citation: 'Berson DM et al. "Phototransduction by retinal ganglion cells that set the circadian clock" Science 2002 · descubrimiento ipRGC',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11834834/',
      },
      {
        citation: 'Andrew Huberman "Morning Sunlight Viewing" HubermanLab podcast + peer-reviewed circadian reviews',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC clásico · Yang matutino de riñón, "saludar al sol" nutre Wei Qi · reloj de órganos: pulmón 3-5am, intestino grueso 5-7am, estómago 7-9am armonizados por primer sol',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Surya Namaskar (सूर्य नमस्कार · saludo al sol) parte de Dinacharya diaria descrita en Hatha Yoga Pradipika y Charaka Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Investigación soviética · Vasilyev "Fototerapia matutina en atletas" 1980s (traducciones limitadas)',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Fell GL et al. "Skin β-endorphin mediates addiction to UV light" Cell 2014 · fisiología del "sun-seeking behavior"',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24949974/',
      },
      {
        citation: 'Weller RB "Sunlight has cardiovascular benefits independently of vitamin D" Blood Purif 2016 · vía NO cutáneo → PA sistémica',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26766317/',
      },
      {
        citation: 'Prieto Gratacós E · "Bioelectromagnetismo y longevidad" · defiende exposición solar temprana como restauración de coherencia bioeléctrica y protección mitocondrial',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'recordatorio_dormir',
    name: 'Hora de dormir',
    how: 'Notificación 60 min antes de tu hora de dormir en agenda del user (inicializada por cronotipo, ajustable). Al recibir: prepara ambiente, termina pantallas, baja intensidad lumínica, transición ritual.',
    benefit: 'Ancla horario de sueño consistente, respeta ritmo real del user (cronotipo León/Oso/Lobo), mejora sueño profundo N3, alinea circadiano y protege drenaje glinfático nocturno.',
    categories: ['sueno', 'circadiano', 'ritual'],
    roots: ['ritmo_circadiano_desregulado', 'deficit_sueno_profundo'],
    assignRule: 'Universal — timing tomado de agenda del user (inicializado por cronotipo). Delfín = estado transitorio a sanar hacia León/Oso/Lobo. Flag P1 si insomnio de mantenimiento, HRV nocturno bajo, cortisol nocturno inapropiado.',
    priority: 1,
    isUniversal: true,
    circadian: 'sleep',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'consolidación memoria dependiente de sueño (LTP hipocampal)',
        'sistema glinfático cerebral (drenaje proteínas mal plegadas incl. β-amyloid, tau)',
        'GH nocturna (peak durante N3 slow-wave sleep · 70% secreción diaria GH)',
        'reparación DNA nocturna (nucleotide excision repair pathways)',
        'metilación de novo (SAM methyl donor pathways nocturnos activados)',
        'reciclaje sináptico (synaptic homeostasis hypothesis · Tononi)',
        'expresión BMAL1 hepática ajustada',
      ],
      inhibits: [
        'cortisol nocturno inapropiado',
        'expresión pro-inflamatoria (NF-κB, IL-6 nocturnas)',
        'estrés oxidativo cerebral (glutation nocturno se recupera)',
        'apetito ghrelin-driven (leptina se restaura durante sueño)',
        'atrofia hipocampal (asociada con privación crónica de sueño)',
      ],
      modulates: [
        'sueño profundo N3 %',
        'sueño REM %',
        'temperatura corporal core (drop nocturno 0.5-1°C)',
        'consolidación emocional (REM)',
        'metabolismo nocturno (lipólisis vs lipogénesis)',
        'insulino-sensibilidad diurna (Van Cauter 1999: 1 noche de privación baja sensibilidad 30%)',
      ],
      biomarkers: [
        'sueño_profundo_horas (target ≥1.5h)',
        'HRV nocturno',
        'temperatura_corporal_delta',
        'melatonina_salival_nocturna',
        'melatonina_urinaria_6-sulfatoxi',
        'cortisol_salival_nocturno (target <2 nmol/L a las 23h)',
        'consistencia_horario_dormir (SD ≤30 min semanales)',
      ],
      mechanismSummary: 'Consistencia horaria de sueño ancla el ritmo circadiano master, protege la arquitectura del sueño profundo (donde ocurre reparación DNA, drenaje glinfático y GH pulsátil), y previene la desregulación circadiana asociada con casi todas las enfermedades crónicas.',
    },

    sideEffects: [
      'ansiedad_inicial_horario_rigido (esperable primera semana)',
      'sensacion_perdida_tiempo_libre (percepción, no fisiológica)',
      'conflicto_social_transitorio (si horario contradice círculo social)',
    ],

    contraindications: [
      'trabajo_turnos_no_negociables (adapta timing pero no ignora el principio)',
      'narcolepsia_no_tratada',
      'apnea_severa_no_tratada (requiere primero diagnóstico + CPAP)',
      'depresion_severa_activa_con_hipersomnia (puede exacerbar retraimiento)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
      ],
      excludeIf: [],
      boostWeight: 5,
    },

    sources: [
      {
        citation: 'Walker M "Why We Sleep" 2017 · compendium peer-reviewed sleep science',
        paradigm: 'western_academic',
        industryFunded: false,
      },
      {
        citation: 'Xie L et al. "Sleep drives metabolite clearance from the adult brain" Science 2013 · sistema glinfático',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24136970/',
      },
      {
        citation: 'Van Cauter E et al. "Impact of sleep and sleep loss on neuroendocrine and metabolic function" Horm Res 2007',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17308390/',
      },
      {
        citation: 'Peter Attia "Sleep and Longevity" Outlive 2023 · capítulo dedicado',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Matthew Walker & Andrew Huberman "The Biology of Sleep" HubermanLab podcast series',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC clásico · Reloj de órganos, hígado 1-3am pico depuración requiere sueño; vesícula 23-1am · Huangdi Neijing Ling Shu',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Dinacharya establece Brahma muhurta (1.5h antes sunrise) para vigilia; sueño ideal 22h-6h para Vata-Pitta balance · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Tononi G & Cirelli C "Sleep and the price of plasticity" Neuron 2014 · synaptic homeostasis hypothesis',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24411729/',
      },
    ],
  },
  {
    key: 'recordatorio_comer',
    name: 'Ventana de alimentación',
    how: 'Notificaciones inicio y cierre de ventana de comida configurada en agenda del user (inicial por cronotipo + ayuno preferido, ajustable). Ventana default sugerida por cronotipo: León 7-17h · Oso 8-18h · Lobo 10-20h. Delfín no aplica hasta estabilizar.',
    benefit: 'Estructura horario de comidas coherente con ritmo circadiano del user, mejora regulación metabólica, permite ventanas de reparación intestinal (autofagia + MMC), y alinea clock genes intestinales con el circadiano central.',
    categories: ['metabolismo', 'circadiano', 'digestion', 'ritual'],
    roots: ['ritmo_circadiano_desregulado', 'hiperinsulinemia', 'digestion_estres_autonomico'],
    assignRule: 'Universal — horario de agenda del user. Delfín NO es cronotipo (transitorio). Flag P1 si HbA1c ≥5.7, insulina ayunas ≥10 μUI/mL, síndrome metabólico, digestion errática.',
    priority: 1,
    isUniversal: true,
    circadian: 'eat',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'clock genes intestinales (BMAL1 hepático, alineado con food timing)',
        'digestión enzimática pancreática (rhythm-dependent · amilasa, lipasa)',
        'reparación intestinal en ventana de ayuno (autofagia enterocitos)',
        'expresión SIRT1 durante ventana de ayuno',
        'MMC (Migrating Motor Complex) durante ayuno inter-prandial',
        'FGF21 hepático en fasting extendido',
      ],
      inhibits: [
        'insulina nocturna post-cena (si ventana termina temprano)',
        'inflamación silenciosa asociada a snacking constante',
        'disbiosis por bacteria intestinal en alimentación 24/7',
        'expresión GLUT2 hepática nocturna inapropiada',
      ],
      modulates: [
        'insulina_sensibilidad',
        'leptina/ghrelin rhythm',
        'temperatura corporal (efecto térmico de alimentos)',
        'motilidad intestinal (MMC)',
        'GLP-1 y PYY (saciedad)',
        'cortisol post-prandial',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'HbA1c',
        'insulina_ayunas',
        'HOMA-IR',
        'trigliceridos',
        'GGT (marker sobrecarga hepática)',
        'consistencia_ventana_alimentacion (SD horario ≤45 min)',
      ],
      mechanismSummary: 'Estructurar horario de comida en ventana definida alinea clock genes intestinales con el circadiano central, mejora sensibilidad insulina y permite ventanas de reparación intestinal (autofagia + MMC · Migrating Motor Complex).',
    },

    sideEffects: [
      'hambre_reactiva_inicial (2-3 semanas adaptación)',
      'irritabilidad_transitoria (baja glucosa en adaptación)',
      'estreñimiento_transitorio (menos volumen inicial)',
      'conflicto_social_transitorio (horario social vs biológico)',
    ],

    contraindications: [
      'embarazo (ventana amplia y flexible, no restrictiva)',
      'lactancia',
      'trastornos_conducta_alimentaria_activos',
      'diabetes_tipo_1 (ajuste con endocrino)',
      'hipoglucemias_reactivas_frecuentes',
      'bajo_peso_severo (IMC <18.5)',
      'insulinodependencia_no_estabilizada',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'insulina_ayunas', operator: '>=', value: 10 },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
      ],
      boostWeight: 5,
    },

    sources: [
      {
        citation: 'Panda S "The Circadian Code" 2018 · TRE peer-reviewed compendium',
        paradigm: 'western_academic',
      },
      {
        citation: 'Sutton EF et al. "Early Time-Restricted Feeding Improves Insulin Sensitivity, Blood Pressure, and Oxidative Stress" Cell Metab 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29754952/',
      },
      {
        citation: 'Longo VL "The Longevity Diet" 2018 · FMD, autofagia',
        paradigm: 'western_academic',
      },
      {
        citation: 'Peter Attia "Time-restricted eating protocols" Outlive 2023',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC clásico · Reloj estómago 7-9am (Wei) para primer alimento sólido, Bazo 9-11am asimilación · Huangdi Neijing',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Agni (fuego digestivo) máximo mediodía · comida principal recomendada 12-14h (Madhyahna) · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Hatori M et al. "Time-restricted feeding without reducing caloric intake prevents metabolic diseases in mice fed a high-fat diet" Cell Metab 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22608008/',
      },
    ],
  },
  {
    key: 'apagar_pantallas_noche',
    name: 'Pantallas off 30 min antes de dormir',
    how: 'Corta pantallas (o modo cálido/rojo, brillo mínimo) mínimo 30 min antes de tu hora de dormir. Iluminación tenue cálida (<3000K, <50 lux) en casa. Si necesitas leer, papel o e-reader e-ink sin backlight.',
    benefit: 'Melatonina pineal no se suprime, se acelera onset del sueño (latencia <20 min) y mejora arquitectura de sueño profundo N3.',
    categories: ['sueno', 'circadiano', 'cognitivo'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado', 'deficit_sueno_profundo'],
    assignRule: 'Universal (versión mínima). Reforzar 60/90 min si insomnio, sueño no reparador, tono nocturno elevado, cronotipo lobo con jet-lag social.',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'night',
    family: 'pantallas_off',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'síntesis nocturna de melatonina pineal (AANAT desinhibida)',
        'expresión REV-ERBα nocturna',
        'GABA-A signaling nocturno',
        'onset del sueño profundo N3',
        'expresión BMAL1 pineal nocturna alineada',
      ],
      inhibits: [
        'supresión melatonina por luz azul (>50% supresión con 100 lux blue-enriched · Chang 2015)',
        'sobreactivación simpática nocturna',
        'cortisol nocturno inapropiado por alerta cognitiva',
        'expresión AANAT bloqueada por luz retinal',
        'dopamina fásica prefrontal (que retrasa transición al sueño)',
      ],
      modulates: [
        'DLMO (Dim Light Melatonin Onset)',
        'latencia de sueño (target <20 min)',
        'arquitectura N3/REM',
        'temperatura core drop nocturno',
        'HRV vagal en transición sueño',
      ],
      biomarkers: [
        'melatonina_salival_nocturna (DLMO 21-22h ideal)',
        'melatonina_urinaria_6-sulfatoxi',
        'latencia_sueño (target <20 min)',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
      ],
      mechanismSummary: 'La luz azul (400-490nm) suprime melatonina pineal vía células ganglionares ipRGC → núcleo supraquiasmático → glándula pineal (AANAT inhibida). Cortar pantallas 30-60 min antes de dormir preserva DLMO y permite arquitectura de sueño intacta.',
    },

    sideEffects: [
      'ansiedad_por_desconexion_inicial (2 semanas adaptación)',
      'FOMO_transitorio',
      'irritabilidad_familiar_transitoria (si círculo social usa pantallas)',
    ],
    contraindications: [], // Ninguna absoluta

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
      ],
      excludeIf: [],
      boostWeight: 5,
    },

    sources: [
      {
        citation: 'Chang AM et al. "Evening use of light-emitting eReaders negatively affects sleep, circadian timing, and next-morning alertness" PNAS 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25535358/',
        industryFunded: false,
      },
      {
        citation: 'Gooley JJ et al. "Exposure to room light before bedtime suppresses melatonin onset and shortens melatonin duration in humans" J Clin Endocrinol Metab 2011 · >50% supresión con 100 lux',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21193540/',
      },
      {
        citation: 'Andrew Huberman "Light and Circadian Rhythms" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Satchin Panda "Effects of light at night on the circadian system" TEDx + The Circadian Code',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Cesación de actividad mental estimulante en Pradosha (crepúsculo) tradicional · rutina Nishacharya',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC clásico · Yin nocturno requiere calma sensorial para nutrición hepática (Gan Xue) y sueño Hun tranquilo',
        paradigm: 'tcm',
      },
      {
        citation: 'Grønli J et al. "Reading from an iPad or from a book in bed" Sleep Med 2016 · replicó Chang 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27743644/',
      },
    ],
  },
  {
    key: 'grounding_earthing',
    name: 'Grounding 10-15 min',
    how: 'Contacto directo de pies descalzos con tierra, pasto, arena o piedra 10-15 min. Idealmente combinado con exposición solar matutina y respiración lenta. Si en interior, usar tapete o sábana de grounding certificada conectada a toma de tierra real.',
    benefit: 'Reduce carga inflamatoria, mejora HRV, ancla circadiano por contacto con Schumann resonance 7.83Hz, meditativo. Transferencia de electrones libres del suelo neutraliza radicales libres.',
    categories: ['inflamacion', 'circadiano', 'estres', 'ritual', 'cardiovascular'],
    roots: ['inflamacion_silenciosa', 'estres_cronico', 'ritmo_circadiano_desregulado'],
    assignRule: 'Universal — reforzar en inflamación silenciosa (PCR ≥1.0) y estrés crónico (cortisol curva plana). Combina bien con exposición solar matutina.',
    priority: 1,
    isUniversal: true,
    family: 'grounding',
    evidenceLevel: 'N3', // Ver debate honesto en notes extra
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'antioxidantes endógenos (SOD, catalasa, glutation)',
        'parasympathetic tone (via mechanoreceptors + electron transfer)',
        'anti-inflamatorios endógenos',
        'melatonina periférica',
        'expresión FOXO3 (longevity gene)',
      ],
      inhibits: [
        'NF-κB (via reducción estrés oxidativo)',
        'PCR y IL-6 sistémicos',
        'estrés oxidativo (radicales libres neutralizados por electrones libres del suelo)',
        'agregación plaquetaria (zeta potential eritrocitario)',
      ],
      modulates: [
        'HRV (aumento variabilidad = mejor tono vagal)',
        'cortisol_ritmo (aplanamiento de picos anormales)',
        'viscosidad sanguínea',
        'presión arterial',
        'zeta potential eritrocitos (menos agregación · Chevalier 2013)',
      ],
      biomarkers: [
        'PCR_hs',
        'IL-6',
        'HRV RMSSD',
        'cortisol_ritmo_curvatura',
        'sueño_profundo_horas',
        'zeta_potential_eritrocitario',
      ],
      mechanismSummary: 'Contacto directo pies-tierra permite transferencia de electrones libres del suelo al cuerpo, neutralizando radicales libres, reduciendo inflamación silenciosa y modulando HRV vía sistema autonómico + Schumann resonance (7.83Hz).',
    },

    sideEffects: [
      'hormigueo_pies_transitorio (sensación de descarga inicial)',
      'sensacion_calor_o_frio_transitoria',
      'euforia_meditativa_leve (esperable, benéfica)',
    ],

    contraindications: [
      'heridas_abiertas_pies',
      'ulceras_diabeticas_pies',
      'ambientes_pesticidas_recientes',
      'anticoagulantes (posible potenciación · consultar médico)',
      'zonas_contaminadas_toxicos_industriales',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['ulceras_diabeticas_pies_activas', 'heridas_abiertas_pies'] },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Chevalier G et al. "Earthing: health implications of reconnecting the human body to the Earth surface electrons" J Environ Public Health 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22291721/',
        industryFunded: true,
        paradigmConflict: 'Chevalier + Sinatra + Oschman tienen participación en EarthFx Inc (fabricante productos grounding). Flag transparencia · resultados requieren replicación independiente.',
      },
      {
        citation: 'Sinatra ST et al. "Grounding — The universal anti-inflammatory remedy" Biomedical Journal 2023',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36528336/',
        industryFunded: true,
        paradigmConflict: 'Mismo grupo autor comercial. Ver notas extra para debate honesto.',
      },
      {
        citation: 'Chevalier G "One-hour contact with the Earth\'s surface (grounding) improves inflammation and blood flow" J Inflamm Res 2015',
        paradigm: 'western_academic',
        url: 'https://www.researchgate.net/publication/283006441_One-Hour_Contact_with_the_Earth\'s_Surface_Grounding_Improves_Inflammation_and_Blood_Flow-A_Randomized_Double-Blind_Pilot_Study',
        industryFunded: true,
      },
      {
        citation: 'Sinatra ST "Earthing: The Most Important Health Discovery Ever?" 2014',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC clásico · Contacto con Tierra (Di) nutre punto Yongquan K1 (Manantial burbujeante), entrada Yin de riñón',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Bhumi Sparsha (भूमि स्पर्श · contacto con tierra) parte de rutina Dinacharya, y práctica pādābhyanga (masaje pies) tras contacto',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Investigación soviética Vasilyev · "Bio-electric coupling of organism to environment" 1970s',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Prieto Gratacós E · biofísica del acoplamiento bioeléctrico humano-tierra · defiende grounding como restauración de potencial electromagnético',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Cifra M & Fields JZ "Electromagnetic cellular interactions" Prog Biophys Mol Biol 2011 · marco mechanistic de campos electromagnéticos endógenos + Schumann',
        paradigm: 'mechanistic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21146564/',
      },
    ],
  },
  {
    key: 'respiracion_nocturna',
    name: 'Respiración nocturna en cama',
    how: 'Respiración 4-7-8 o physiological sigh durante 5 min antes de dormir (4 ciclos de 4-7-8 o 30 respiraciones diafragmáticas lentas). En cama, luz apagada, foco en exhalación larga por boca ligeramente abierta.',
    benefit: 'Activa parasimpático, baja frecuencia cardíaca, facilita transición a sueño profundo N3 y reduce ansiedad rumiativa. Modula tono vagal vía mecanorreceptores pulmonares.',
    categories: ['sueno', 'ansiedad', 'estres', 'ritual', 'cardiovascular'],
    roots: ['adrenalina_nocturna', 'estres_cronico', 'cortisol_elevado_sostenido', 'deficit_sueno_profundo'],
    assignRule: 'Universal — reforzar en insomnio de conciliación, adrenalina nocturna documentada (metanefrinas urinarias ↑), HRV nocturno bajo, rumiación.',
    priority: 1,
    isUniversal: true,
    timeOfDay: 'night',
    family: 'respiracion_nocturna',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal parasimpático (nervio vago)',
        'GABA-A signaling',
        'baroreceptor sensitivity',
        'Default Mode Network downregulation (durante y post)',
        'melatonina onset',
        'NO nasal (respiración nasal · vasodilatador + antimicrobiano)',
      ],
      inhibits: [
        'simpático (adrenalina/noradrenalina nocturnas)',
        'cortisol reactivo pre-sueño',
        'rumiación cognitiva (via prefrontal deactivation)',
        'apnea del sueño obstructiva funcional (algunos casos, via tono muscular VAS)',
      ],
      modulates: [
        'HRV (aumento inmediato durante y post-práctica)',
        'frecuencia cardíaca de reposo',
        'saturación CO2 tisular (tolerancia CO2)',
        'temperatura core (drop facilitado)',
      ],
      biomarkers: [
        'HRV RMSSD nocturno',
        'frecuencia_cardiaca_reposo',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
      ],
      mechanismSummary: 'Patrones de respiración lenta (4-7-8, physiological sigh) activan nervio vago vía mecanorreceptores pulmonares, aumentan HRV, bajan cortisol, suben GABA y facilitan transición a sueño profundo.',
    },

    sideEffects: [
      'mareo_transitorio (si hiperventilación inadvertida)',
      'hormigueo_manos (tetania por alcalosis respiratoria transitoria)',
      'liberacion_emocional (bostezos, lágrimas · esperado y benéfico)',
    ],

    contraindications: [
      'EPOC_severa_no_controlada',
      'ataques_panico_activos (requiere adaptación · box breathing más apropiado inicialmente)',
      'trauma_torácico_reciente',
      'embarazo_avanzado_reflujo_severo (adaptar postura semi-fowler)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
      ],
      excludeIf: [],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
        industryFunded: false,
      },
      {
        citation: 'Balban MY, Neri E, Kogon MM, Weed L, Nouriani B, Jo B, Holl G, Zeitzer JM, Spiegel D, Huberman AD "Brief structured respiration practices enhance mood and reduce physiological arousal" Cell Reports Medicine 2023',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
        industryFunded: false,
      },
      {
        citation: 'Andrew Huberman "Physiological Sigh + Breathing for Sleep" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Pranayama nocturno (Nadi Shodhana, Chandra Bhedana) parte de Nishacharya · Hatha Yoga Pradipika s.XV',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Práctica respiratoria previa al sueño (Anmian · 安眠) nutre Yin nocturno y calma Shen',
        paradigm: 'tcm',
      },
      {
        citation: 'Weil A "4-7-8 breathing" · funcional independiente derivado de Pranayama',
        paradigm: 'functional_independent',
      },
      {
        citation: 'James Nestor "Breath: The New Science of a Lost Art" 2020 · síntesis multi-tradición',
        paradigm: 'functional_independent',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUEÑO / CIRCADIANO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'cerrar_comida_3h_antes_dormir',
    name: 'Cerrar comida 3h antes de dormir',
    how: 'Termina última comida sólida 3h antes de tu hora de dormir habitual (ajustado a cronotipo). Ejemplo Oso (dormir 23h): última comida ≤20h. Sí a agua, té sin endulzar, infusiones digestivas (jengibre, hinojo, manzanilla).',
    benefit: 'Melatonina no compite con digestión, mejora sueño profundo N3, reduce reflujo nocturno, permite reparación glinfática cerebral y autofagia intestinal en ventana de ayuno.',
    categories: ['sueno', 'digestion', 'metabolismo', 'circadiano', 'inflamacion'],
    roots: ['deficit_sueno_profundo', 'reflujo_funcional', 'ritmo_circadiano_desregulado', 'hiperinsulinemia', 'sobrecarga_hepatica'],
    assignRule: 'Universal recomendado. Flag P1 si: reflujo funcional, insomnio de mantenimiento (despertar 3-5am), hiperinsulinemia, cortisol nocturno elevado, apnea funcional leve.',
    priority: 2,
    timeOfDay: 'evening',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'melatonina nocturna sin interferencia digestiva',
        'MMC (Migrating Motor Complex) nocturno · barre bacterias del intestino delgado',
        'autofagia intestinal (enterocitos)',
        'GH pulso nocturno (peak N3 · antagonizado por insulina alta)',
        'reparación glinfática cerebral',
        'lipólisis nocturna vs lipogénesis',
      ],
      inhibits: [
        'insulina nocturna post-cena tardía',
        'reflujo gastroesofágico funcional (por vaciamiento gástrico completo)',
        'expresión BMAL1 hepática mal-alineada',
        'inflamación silenciosa nocturna (IL-6 postprandial)',
        'sobrecarga hepática (metabolizando grasas + fructosa al dormir)',
      ],
      modulates: [
        'temperatura core drop (facilitado sin efecto térmico postprandial)',
        'HRV nocturno (parasimpático · aumenta sin digestión activa)',
        'apnea del sueño obstructiva funcional (posición decúbito + estómago lleno empeora)',
        'motilidad esofágica nocturna',
      ],
      biomarkers: [
        'sueño_profundo_horas',
        'HRV nocturno RMSSD',
        'reflujo_episodios_pH_metria',
        'glucosa_nocturna_CGM',
        'GGT',
        'cortisol_salival_23h',
      ],
      mechanismSummary: 'Cerrar comida ≥3h antes de dormir permite vaciamiento gástrico completo, evita competencia entre digestión (simpático) y melatonina (parasimpático), y da al hígado ventana de ayuno para autofagia y reparación mitocondrial nocturna.',
    },

    sideEffects: [
      'hambre_transitoria_nocturna (2-3 semanas adaptación)',
      'ajuste_social_cena_familiar (si horario social contradice)',
      'necesidad_reestructurar_cena_principal (a más temprano)',
    ],

    contraindications: [
      'diabetes_tipo_1_hipoglucemias_nocturnas (requiere snack pre-sueño)',
      'embarazo_ultimo_trimestre_nauseas (ventana más flexible)',
      'lactancia_intensiva_madre_bajo_peso',
      'trastorno_conducta_alimentaria_activo',
      'bajo_peso_severo (IMC <18.5)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'profile', field: 'reflujo_funcional', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Kinsey AW, Ormsbee MJ "The health impact of nighttime eating: old and new perspectives" Nutrients 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25859885/',
        industryFunded: false,
      },
      {
        citation: 'St-Onge MP et al. "Meal Timing and Frequency: Implications for Cardiovascular Disease Prevention" Circulation AHA 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28137696/',
      },
      {
        citation: 'Wilkinson MJ et al. "Ten-Hour Time-Restricted Eating Reduces Weight, Blood Pressure, and Atherogenic Lipids in Patients with Metabolic Syndrome" Cell Metab 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31813824/',
      },
      {
        citation: 'Ness-Jensen E et al. "Weight loss and reduction in gastroesophageal reflux" Am J Gastroenterol 2013 · reflujo + cena tardía',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23507775/',
      },
      {
        citation: 'Peter Attia "Nutritional biochemistry & meal timing" Outlive 2023',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Kresser "The truth about late-night eating" 2018 · sueño + reflujo + insulina',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Cena ligera antes del anochecer (Vaikalika) · Charaka Samhita · post-cena caminata corta (Shatapavali) + agua tibia',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC clásico · Estómago Yang máximo 7-9am, débil 19-21h · comida ligera al anochecer respeta reloj Bazo-Estómago',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'pantallas_off_60min',
    name: 'Pantallas off 60 min antes de dormir',
    how: 'Corta pantallas (o modo cálido/rojo <2700K, brillo <10%) 60 min antes de dormir. Iluminación cálida tenue en casa (velas, sal Himalaya, lámparas rojas). Ritual de transición: lectura papel, journaling, respiración.',
    benefit: 'Mayor protección de melatonina que la versión mínima 30 min: reducción de supresión melatonina de ~50% a ~15%. Mejor onset y arquitectura de sueño profundo.',
    categories: ['sueno', 'circadiano', 'cognitivo'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado', 'deficit_sueno_profundo', 'adrenalina_nocturna'],
    assignRule: 'Insomnio, sueño no reparador, exposición nocturna elevada, cortisol nocturno inapropiado, cronotipo lobo con jet-lag social.',
    priority: 2,
    family: 'pantallas_off',
    timeOfDay: 'night',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'síntesis nocturna melatonina pineal (más completa que 30 min)',
        'GABA-A signaling nocturno',
        'expresión REV-ERBα nocturna',
        'transición theta-alfa cortical pre-sueño',
      ],
      inhibits: [
        'supresión melatonina por luz azul (reducción ~85% con 60 min · Chang 2015 dosis-respuesta)',
        'dopamina prefrontal ligada a scroll/gaming',
        'expresión c-Fos hipotalámica de alerta',
      ],
      modulates: [
        'DLMO (adelanto 30-60 min con protocolo crónico)',
        'latencia sueño (reducción ~15 min)',
        'sueño profundo N3 % (aumento 3-8%)',
        'cortisol salival 23h',
      ],
      biomarkers: [
        'melatonina_salival_21h_23h',
        'melatonina_urinaria_6-sulfatoxi',
        'latencia_sueño (wearable)',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
      ],
      mechanismSummary: '60 min de "dim light phase" antes de dormir permite acumulación adecuada de melatonina pineal (peak ~2h post-inicio de dim light), reduce dopamina prefrontal reactiva y facilita transición autonómica simpático→parasimpático.',
    },

    sideEffects: [
      'ansiedad_por_desconexion_inicial (adaptación 2-3 semanas)',
      'FOMO_transitorio',
      'aburrimiento_pre_sueño (oportunidad ritual)',
    ],
    contraindications: [], // Ninguna absoluta

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'chronotype', type: 'lobo' },
      ],
      excludeIf: [],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Chang AM et al. "Evening use of light-emitting eReaders negatively affects sleep, circadian timing" PNAS 2015 · dosis-respuesta',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25535358/',
      },
      {
        citation: 'Cajochen C et al. "Evening exposure to a light-emitting diodes (LED)-backlit computer screen affects circadian physiology and cognitive performance" J Appl Physiol 2011',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21415172/',
      },
      {
        citation: 'Green A et al. "Evening light exposure to computer screens disrupts human sleep, biological rhythms, and attention abilities" Chronobiol Int 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28632418/',
      },
      {
        citation: 'Andrew Huberman "Master Your Sleep" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Matthew Walker "Why We Sleep" 2017 · dim light phase',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Nishacharya · rutina nocturna con lámparas de ghee, lectura sagrada, calma sensorial · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Yin nocturno requiere aquietar Shen (mente-espíritu) 1-2h antes de descanso · Huangdi Neijing Ling Shu',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'pantallas_off_90min',
    name: 'Pantallas off 90 min antes de dormir',
    how: 'Corta pantallas (o modo cálido/rojo <2700K, brillo mínimo) 90 min antes de dormir. Iluminación tenue cálida <30 lux en casa. Ritual completo de transición: lectura papel, journaling, respiración, meditación, contacto interpersonal calmado.',
    benefit: 'Versión completa recomendada — máxima protección de melatonina (supresión residual <5%), arquitectura de sueño óptima N3 + REM, adelanto DLMO 60-90 min.',
    categories: ['sueno', 'circadiano', 'cognitivo'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado', 'deficit_sueno_profundo', 'adrenalina_nocturna'],
    assignRule: 'Insomnio persistente, sueño no reparador crónico, adrenalina nocturna documentada, cortisol nocturno alto, ansiedad rumiativa.',
    priority: 2,
    family: 'pantallas_off',
    timeOfDay: 'night',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'síntesis nocturna melatonina pineal (máxima protección)',
        'GABA-A signaling nocturno completo',
        'sistema glinfático inicio temprano',
        'expresión REV-ERBα óptima',
        'theta-alfa EEG pre-sueño estable',
      ],
      inhibits: [
        'supresión melatonina por luz azul (residual <5% con 90 min)',
        'dopamina prefrontal ligada a scroll/gaming/streaming',
        'expresión c-Fos hipotalámica',
        'cortisol reactivo pre-sueño',
      ],
      modulates: [
        'DLMO (adelanto 60-90 min crónico)',
        'latencia sueño (reducción 20-25 min)',
        'sueño profundo N3 % (aumento 8-15%)',
        'REM latencia y densidad',
        'HRV vagal nocturno',
      ],
      biomarkers: [
        'melatonina_salival_curva_completa',
        'latencia_sueño (target <15 min)',
        'sueño_profundo_horas',
        'REM_horas',
        'cortisol_salival_23h',
        'HRV RMSSD nocturno',
      ],
      mechanismSummary: '90 min de dim light phase permite máxima acumulación melatonina, transición autonómica completa (simpático → parasimpático), y establishment de arquitectura de sueño N3-REM óptima.',
    },

    sideEffects: [
      'reestructuración_agenda_nocturna (requiere planificación)',
      'ansiedad_por_desconexion (mayor que 60 min · 3-4 semanas adaptación)',
      'presion_social_transitoria',
    ],
    contraindications: [], // Ninguna absoluta

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 2 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 2 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'chronotype', type: 'lobo' },
        { source: 'chronotype', type: 'delfin_transitional' },
      ],
      excludeIf: [],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Chang AM et al. PNAS 2015 · dosis-respuesta 30-60-90 min',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25535358/',
      },
      {
        citation: 'Gooley JJ et al. "Exposure to room light before bedtime suppresses melatonin onset" J Clin Endocrinol Metab 2011',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21193540/',
      },
      {
        citation: 'Hale L et al. "Screen time and sleep among school-aged children and adolescents: A systematic literature review" Sleep Med Rev 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25193149/',
      },
      {
        citation: 'Matthew Walker & Andrew Huberman "Sleep hygiene deep-dive" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Satchin Panda "The Circadian Code" 2018 · protocolo 2-3h dim light phase ideal',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Nishacharya extendida · práctica ritual completa 1.5-2h antes de dormir · Charaka Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Kimberly Snyder "Radical Beauty" · lifestyle funcional · dim light phase como pilar',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'blackout_total_cuarto',
    name: 'Blackout total del cuarto',
    how: 'Elimina TODA luz artificial del cuarto de dormir: cortinas blackout de doble capa, tapar LEDs de dispositivos con cinta blackout, cero pantallas encendidas, luces de emergencia con cover rojo/naranja. Test: no ver la mano frente a los ojos.',
    benefit: 'Melatonina óptima sin supresión residual, sueño profundo N3 aumenta 20-30%, mejora reparación glinfática cerebral y reduce activación simpática por microexposiciones.',
    categories: ['sueno', 'circadiano'],
    roots: ['sobreexposicion_luz_azul', 'deficit_sueno_profundo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Universal recomendado. Flag P1 si: sueño no reparador, cuarto con contaminación lumínica, cortisol nocturno alto, obesidad/DM2 (asociada con luz nocturna · Obayashi 2013), riesgo cancer hormonodependiente.',
    priority: 2,
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'melatonina pineal máxima (peak nocturno intacto)',
        'sistema glinfático nocturno completo',
        'GABA-A signaling profundo',
        'GH pulso N3 protegido',
        'reparación DNA nocturna',
        'expresión REV-ERBα óptima',
      ],
      inhibits: [
        'supresión melatonina por micro-luz (>10 lux ya suprime)',
        'sobreactivación simpática (Mason 2022 · 100 lux durante sueño ↑ FC + ↑ resistencia insulina AM)',
        'expresión pro-inflamatoria por micro-arousals',
        'micro-despertares no conscientes',
        'expresión anómala de PER1/PER2 nocturna',
      ],
      modulates: [
        'sueño profundo N3 % (aumento 15-30%)',
        'REM %',
        'cortisol matutino sano (más ampio, menos plano)',
        'resistencia insulina AM (mejora sensibilidad al no haber activación simpática nocturna)',
        'temperatura core drop nocturno (más profundo en oscuridad total)',
      ],
      biomarkers: [
        'melatonina_salival_nocturna',
        'melatonina_urinaria_6-sulfatoxi',
        'sueño_profundo_horas',
        'HRV nocturno',
        'glucosa_ayunas',
        'presion_arterial_matutina',
      ],
      mechanismSummary: 'La sensibilidad melatoninérgica es extrema (>10 lux ya suprime). Blackout total elimina micro-exposiciones que fragmentan sueño N3, activan simpático nocturno y elevan resistencia insulina AM. Cero luz = máxima reparación epigenética nocturna.',
    },

    sideEffects: [
      'desorientacion_transitoria_al_despertar (adaptación 1 semana)',
      'costo_inicial_cortinas_blackout',
      'necesidad_lampara_camino_baño (con luz roja tenue)',
    ],
    contraindications: [
      'miedo_nocturno_diagnosticado (niños, algunos ansiosos · adaptar con luz roja tenue)',
      'sonambulismo_severo (riesgo caída sin visibilidad · adaptar)',
      'demencia_desorientacion_nocturna',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'profile', field: 'condiciones', in: ['obesidad', 'sindrome_metabolico'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['sonambulismo_severo', 'demencia_desorientacion_nocturna'] },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Mason IC et al. "Light exposure during sleep impairs cardiometabolic function" PNAS 2022 · 100 lux ↑ FC + resistencia insulina AM',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35313337/',
        industryFunded: false,
      },
      {
        citation: 'Obayashi K et al. "Exposure to light at night, nocturnal urinary melatonin excretion, and obesity/dyslipidemia in the elderly: HEIJO-KYO study" J Clin Endocrinol Metab 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23150684/',
      },
      {
        citation: 'Cho Y et al. "Effects of artificial light at night on human health" Chronobiol Int 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26375320/',
      },
      {
        citation: 'Xiao Q et al. "Association Between Outdoor Light at Night and Prevalence of Diabetes" Diabetes Care 2022',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36409797/',
      },
      {
        citation: 'Andrew Huberman "Optimize Sleep Environment" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Sushupti (sueño profundo) requiere oscuridad completa · Yogic sleep teachings',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Yin nocturno necesita oscuridad para nutrir Xue (sangre) y Yin de hígado',
        paradigm: 'tcm',
      },
      {
        citation: 'IARC 2007 · exposición nocturna a luz clasificada como "probable carcinógeno grupo 2A" para cáncer hormonodependiente',
        paradigm: 'western_academic',
        url: 'https://monographs.iarc.who.int/wp-content/uploads/2018/06/mono98.pdf',
      },
    ],
  },
  {
    key: 'antifaz_nocturno',
    name: 'Antifaz nocturno',
    how: 'Antifaz oscuro cómodo (con espacio para ojos tipo Manta o similar · NO comprime globo ocular), preferentemente de tela transpirable, si no puedes lograr blackout total (viajes, cuarto compartido, hotel, turno).',
    benefit: 'Simula blackout, protege melatonina pineal, portable, ideal en viajes o compartir habitación. Menos efectivo que blackout ambiental por micro-filtraciones pero suficiente para 85-95% del beneficio.',
    categories: ['sueno', 'circadiano', 'ritual'],
    roots: ['sobreexposicion_luz_azul', 'deficit_sueno_profundo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Cuarto sin blackout, viajero frecuente, turnista, cuarto compartido, hospitalización, jet-lag.',
    priority: 2,
    timeOfDay: 'night',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'melatonina pineal cercana a óptima',
        'sistema glinfático nocturno',
        'GABA-A signaling',
        'REM completo (no fragmentado por micro-luces)',
      ],
      inhibits: [
        'supresión melatonina por luz retinal directa',
        'micro-despertares por luces intermitentes (LEDs, coches por ventana)',
        'expresión c-Fos hipotalámica de alerta',
      ],
      modulates: [
        'DLMO nocturno',
        'sueño profundo N3 % (aumento 5-15% vs sin antifaz en cuarto no-blackout)',
        'jet-lag recovery (Suhner 2001 · antifaz + tapones + melatonina)',
      ],
      biomarkers: [
        'melatonina_salival_nocturna',
        'sueño_profundo_horas',
        'latencia_sueño',
      ],
      mechanismSummary: 'Bloquear luz retinal directa con antifaz preserva la producción de melatonina pineal (que responde a luz percibida por ipRGC retinales) casi al mismo nivel que blackout ambiental.',
    },

    sideEffects: [
      'sensacion_claustrofobica_inicial (adaptación 1-2 semanas)',
      'presion_ocular_leve (evitar con modelos con cavidad para ojos)',
      'sudoracion_facial (con modelos no transpirables)',
      'marca_facial_transitoria (matutina, resuelve en minutos)',
    ],
    contraindications: [
      'glaucoma_avanzado (contacto con globo · usar modelo con cavidad)',
      'cirugia_ocular_reciente',
      'claustrofobia_severa',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'viajero_frecuente', equals: true },
        { source: 'profile', field: 'trabajo_turnos', equals: true },
        { source: 'profile', field: 'cuarto_compartido', equals: true },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['glaucoma_avanzado', 'cirugia_ocular_reciente'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Suhner A et al. "Impact of melatonin, zolpidem and antihistamines on jet lag" Aviat Space Environ Med 2001',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11710718/',
      },
      {
        citation: 'Le Guen M et al. "Earplugs and eye masks vs routine care prevent sleep impairment in post-anaesthesia care unit" Br J Anaesth 2014',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24169820/',
      },
      {
        citation: 'Hu RF et al. "Effects of earplugs and eye masks combined with relaxing music on sleep, melatonin and cortisol levels in ICU patients" Crit Care 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26178220/',
      },
      {
        citation: 'Andrew Huberman "Travel & Jetlag Toolkit" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Peter Attia "Travel sleep strategies" Outlive discussion',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · rutinas nocturnas incluyen protección de ojos con paños oscuros para Nishacharya',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · protección de "Jing Ming" (BL1) durante Yin nocturno favorece nutrición hepática',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'temperatura_cuarto_frio',
    name: 'Cuarto a 16-19°C',
    how: 'Cuarto de dormir a 16-19°C (60-67°F) durante toda la noche. AC, ventilador, ventana abierta según clima. Cobija tibia OK — el cuerpo baja mejor su temperatura core con ambiente frío y cuerpo tapado.',
    benefit: 'Caída de temperatura corporal core 0.5-1°C facilita onset del sueño (mediado por preóptica hipotalámica) y profundidad N3. Activa levemente grasa parda nocturna.',
    categories: ['sueno', 'circadiano'],
    roots: ['deficit_sueno_profundo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Universal — bajo umbral de implementación. Flag P1 si sueño no reparador, insomnio de mantenimiento, sudoración nocturna funcional, sobrepeso, resistencia insulina.',
    priority: 2,
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'preóptica hipotalámica (VLPO · núcleo del sueño)',
        'grasa parda nocturna (UCP1 leve)',
        'melatonina óptima (secreción favorecida por drop térmico)',
        'GH pulso N3',
        'sueño profundo N3 (extension y densidad)',
        'adenosina cerebral (por reducción metabolismo cerebral en frío)',
      ],
      inhibits: [
        'sudoración nocturna (mecanismo compensatorio de calor)',
        'micro-despertares térmicos',
        'insulina nocturna (reducción por BAT activation)',
        'REM fragmentation (calor lo empeora)',
      ],
      modulates: [
        'temperatura core drop nocturno (0.5-1.0°C target)',
        'sueño profundo N3 %',
        'REM %',
        'HRV nocturno (frescura favorece vagal)',
        'sensibilidad insulina',
      ],
      biomarkers: [
        'sueño_profundo_horas',
        'temperatura_corporal_delta',
        'sudoracion_nocturna_score',
        'HRV nocturno',
        'glucosa_ayunas',
      ],
      mechanismSummary: 'El onset del sueño está gatillado por caída de temperatura core (~0.5-1°C). Cuarto a 16-19°C facilita disipación de calor por vasodilatación distal (manos, pies), permite drop térmico completo y protege N3 de micro-despertares térmicos.',
    },

    sideEffects: [
      'sensacion_frio_inicial (esperable, adaptación 1 semana)',
      'costo_energetico_AC (si clima cálido)',
      'necesidad_cobija_extra',
      'sequedad_via_aerea (con AC · usar humidificador)',
    ],
    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'raynaud_severo (frío extremo empeora · usar 19-20°C)',
      'insuficiencia_termorregulatoria_geriatrica (>85 años · usar 18-20°C)',
      'artritis_reumatoide_severa_activa (rigidez matutina empeora con frío)',
      'neonatos_lactantes (usar 20-22°C, guías pediátricas)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'profile', field: 'sudoracion_nocturna', equals: true },
        { source: 'profile', field: 'condiciones', in: ['sobrepeso', 'obesidad', 'resistencia_insulina'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['raynaud_severo', 'artritis_reumatoide_severa_activa'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Okamoto-Mizuno K, Mizuno K "Effects of thermal environment on sleep and circadian rhythm" J Physiol Anthropol 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22738673/',
        industryFunded: false,
      },
      {
        citation: 'Haghayegh S et al. "Before-bedtime passive body heating by warm shower or bath to improve sleep" Sleep Med Rev 2019 · mecanismo drop térmico',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31102877/',
      },
      {
        citation: 'Kräuchi K, Wirz-Justice A "Circadian rhythm of heat production, heart rate, and skin and core temperature under unmasking conditions in men" Am J Physiol 1994',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/8203605/',
      },
      {
        citation: 'Lee P et al. "Mild cold exposure modulates fibroblast growth factor 21 and adiponectin in humans" Cell Metab 2014 · BAT con cool sleep',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24506875/',
      },
      {
        citation: 'Matthew Walker "Why We Sleep" 2017 · temperatura ambiente óptima 18°C',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Sleep Toolkit" HubermanLab · cool room + warm shower 90 min antes',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · cuarto fresco pero no gélido en verano (Pitta pacify), abrigo cálido en invierno con cuarto fresco (Vata balance)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Tradición nórdica finlandesa · "friska luft" (aire fresco), ventanas ligeramente abiertas para dormir',
        paradigm: 'traditional_documented',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AYUNO + METABOLISMO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'ayuno_14_10',
    name: 'Ayuno 14:10 (suave)',
    how: 'Ventana de comida 10h (ej. 9:00-19:00). Ayuno 14h con agua, té sin endulzar o café solo. Sí caldo de hueso 0-cal. Adaptar cronotipo: León 8-18h, Oso 9-19h, Lobo 11-21h.',
    benefit: 'Beneficio metabólico con menor estrés hormonal que ventanas más agresivas. Activa autofagia leve, mejora sensibilidad insulina, respeta ejes hormonales femeninos.',
    categories: ['metabolismo', 'hormonal', 'circadiano'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'ritmo_circadiano_desregulado'],
    assignRule: 'Primer acercamiento al ayuno, mujeres en fase folicular O lútea (cycle-safe), hipoglucemia reactiva funcional, adulto mayor, novato en ayuno.',
    priority: 2,
    family: 'ayuno',
    scientificInfo: 'Considerar consultar con tu nutriólogo antes de iniciar.',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'SIRT1 leve (activación circadiana + NAD+)',
        'AMPK muscular y hepático (ayuno prolongado nocturno)',
        'autofagia basal (leve pero medible)',
        'MMC (Migrating Motor Complex) nocturno',
        'lipólisis nocturna',
        'FGF21 hepático (leve)',
        'clock genes intestinales (BMAL1) alineados',
      ],
      inhibits: [
        'insulina nocturna post-cena tardía',
        'inflamación silenciosa asociada a snacking constante',
        'expresión GLUT2 hepática nocturna inapropiada',
      ],
      modulates: [
        'insulina_sensibilidad',
        'HbA1c (reducción modesta 0.1-0.3% a 3-6 meses)',
        'ghrelin/leptin rhythm',
        'cortisol matutino (más marcado si ventana empieza tarde)',
        'ciclo menstrual (mínimo impacto vs 16:8+)',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'insulina_ayunas',
        'HOMA-IR',
        'HbA1c',
        'trigliceridos',
        'GGT',
      ],
      mechanismSummary: 'Ventana de 10h respeta el clock hepático (BMAL1) y da 14h de ayuno metabólico, suficiente para inducir autofagia leve, mejorar sensibilidad insulina y reducir carga hepática, sin estrés hormonal significativo en mujeres pre-menopáusicas.',
    },

    sideEffects: [
      'hambre_transitoria_matutina (1-2 semanas adaptación si empezaba con desayuno temprano)',
      'irritabilidad_leve_inicial',
      'ajuste_horario_social',
    ],
    contraindications: [
      'embarazo',
      'lactancia',
      'trastornos_conducta_alimentaria_activos',
      'diabetes_tipo_1 (requiere endocrino)',
      'bajo_peso_severo (IMC <18.5)',
      'hipoglucemias_reactivas_severas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'insulina_ayunas', operator: '>=', value: 8 },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'profile', field: 'sexo', equals: 'female' }, // Cycle-safer que 16:8+
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Wilkinson MJ et al. "Ten-Hour Time-Restricted Eating Reduces Weight, BP, and Atherogenic Lipids in Patients with Metabolic Syndrome" Cell Metab 2020 · ventana 10h específica',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31813824/',
      },
      {
        citation: 'Chow LS et al. "Time-Restricted Eating Effects on Body Composition and Metabolic Measures in Humans" Obesity 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32463137/',
      },
      {
        citation: 'Cienfuegos S et al. "Effects of 4- and 6-h Time-Restricted Feeding on Weight and Cardiometabolic Health" Cell Metab 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32673591/',
      },
      {
        citation: 'Satchin Panda "The Circadian Code" 2018 · 10h TRE como ventana sustentable',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Mindy Pelz "Fast Like a Girl" 2022 · protocolo 13-15h para mujeres cycle-safe',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Langhana (ayuno terapéutico) modesto y regular, adecuado para todos los doshas · Charaka Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · comer con reloj de estómago 7-9am + terminar antes de 19h respeta Bazo-Estómago',
        paradigm: 'tcm',
      },
      {
        citation: 'Chris Kresser "Intermittent fasting for women: what to know" 2020',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'ayuno_16_8',
    name: 'Ayuno 16:8 con carbos densos en cena',
    how: 'Ventana de comida 12:00-20:00 (8h). Cena con carbos densos (papa, camote, arroz, plátano macho) 3h antes de dormir. Ayuno 16h con agua, té, café solo, caldo de hueso 0-cal.',
    benefit: 'Regula insulina diurna, activa autofagia moderada vía AMPK/SIRT1, mejora sueño profundo (serotonina→melatonina de carbos nocturnos) y baja cortisol matutino inapropiado. Modulación cycle-aware: aprovechar folicular+ovulatoria, escuchar lútea+menstrual.',
    categories: ['metabolismo', 'sueno', 'hormonal', 'inflamacion'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'sobrecarga_hepatica', 'inflamacion_silenciosa'],
    assignRule: 'Adulto con signos de resistencia a la insulina, HOMA-IR elevado, cortisol matutino OK, sin TCA previos. Mujeres pre-menopáusicas: preferir en fase folicular (días 1-14 del ciclo); en lútea reducir a 14:10.',
    priority: 2,
    family: 'ayuno',
    scientificInfo: 'Considerar consultar con tu nutriólogo antes de iniciar.',
    evidenceLevel: 'N2',
    requiresClinicalValidation: true, // Ver flag lútea

    epigeneticImpact: {
      activates: [
        'SIRT1 (deacetilasa NAD+-dependiente · longevidad)',
        'AMPK (sensor energético · autofagia)',
        'autofagia (mitofagia + eliminación proteínas mal plegadas)',
        'FGF21 hepático',
        'β-hidroxibutirato circulante (leve · 0.3-0.8 mM)',
        'BDNF cerebral (BHB-mediated)',
        'MMC intestinal nocturno completo',
        'expresión SREBP-1c reducida (menos lipogénesis)',
      ],
      inhibits: [
        'mTOR diurno inapropiado',
        'insulina baseline',
        'inflamación silenciosa (NLRP3 inflammasome · BHB inhibidor específico)',
        'expresión IL-1β',
        'lipogénesis hepática de novo',
      ],
      modulates: [
        'HbA1c (reducción 0.3-0.5% a 3-6 meses)',
        'triglicéridos',
        'HDL',
        'HOMA-IR',
        'ciclo menstrual (posible impacto en lútea si mujer pre-menopáusica)',
        'ratio testosterona/SHBG en hombres (mejora leve)',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'HbA1c',
        'insulina_ayunas',
        'HOMA-IR',
        'trigliceridos',
        'HDL',
        'GGT',
        'cetonas_beta_hidroxibutirato_serica',
        'PCR_hs',
      ],
      mechanismSummary: '16h de ayuno metabólico activan AMPK + SIRT1, disparan autofagia moderada, elevan β-hidroxibutirato (que inhibe NLRP3 inflammasome), y con cena de carbos densos preservan síntesis de serotonina → melatonina nocturna sin desregular ejes hormonales femeninos en folicular.',
    },

    sideEffects: [
      'hambre_reactiva_inicial (2-3 semanas adaptación)',
      'irritabilidad_transitoria',
      'estreñimiento_transitorio',
      'insomnio_paradojico_primeros_dias (hasta que se ajusta melatonina)',
      'fatiga_ejercicio_intenso_matutino',
    ],
    contraindications: [
      'embarazo',
      'lactancia',
      'trastornos_conducta_alimentaria_activos',
      'diabetes_tipo_1',
      'bajo_peso_severo (IMC <18.5)',
      'hipoglucemias_reactivas_frecuentes',
      'niños_adolescentes',
      'mujeres_pre-menopáusicas_en_lútea_agresiva (reducir a 14:10)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'insulina_ayunas', operator: '>=', value: 10 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'cycle_phase', phase: 'follicular' },
        { source: 'cycle_phase', phase: 'ovulatory' },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
        { source: 'cycle_phase', phase: 'luteal' }, // Reducir a 14:10 en lútea si mujer pre-menopáusica
        { source: 'cycle_phase', phase: 'menstrual' },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'de Cabo R, Mattson MP "Effects of Intermittent Fasting on Health, Aging, and Disease" NEJM 2019',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31881139/',
        industryFunded: false,
      },
      {
        citation: 'Sutton EF et al. "Early Time-Restricted Feeding Improves Insulin Sensitivity, BP, and Oxidative Stress" Cell Metab 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29754952/',
      },
      {
        citation: 'Youm YH et al. "The ketone metabolite β-hydroxybutyrate blocks NLRP3 inflammasome-mediated inflammatory disease" Nat Med 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25686106/',
      },
      {
        citation: 'Longo VL "The Longevity Diet" 2018',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Peter Attia "Fasting protocols" Outlive 2023',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Mindy Pelz "Fast Like a Girl" 2022 · cycle-syncing (folicular sí, lútea reducir)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Stacy Sims "Roar" 2016 · protocolos hormonales para atletas mujeres',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ray Peat · advocacy CARBOS DENSOS EN CENA para preservar T3 nocturno + serotonina (contraste con keto)',
        paradigm: 'functional_independent',
        paradigmConflict: 'Ray Peat crítico del ayuno extendido en mujeres · valida cena con carbos densos como compromiso',
      },
      {
        citation: 'Ayurveda · Langhana intermedia · adecuada para Kapha, moderada para Pitta, precaución en Vata',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'ayuno_18_6',
    name: 'Ayuno 18:6 (agresivo)',
    how: 'Ventana de comida de 6h (ej. 13:00-19:00). Ayuno 18h con agua, té, café solo, caldo de hueso 0-cal. NO para mujeres pre-menopáusicas de forma rutinaria (usar sólo en folicular temprana o casos específicos supervisados).',
    benefit: 'Mayor presión sobre sensibilidad a la insulina, autofagia más profunda, elevación sostenida de β-hidroxibutirato (0.5-1.5 mM), FGF21 marcado.',
    categories: ['metabolismo', 'inflamacion'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'sobrecarga_hepatica', 'inflamacion_silenciosa'],
    assignRule: 'Hombres con resistencia establecida que ya toleran 16:8; nunca con TCA previos. Adulto mayor con sarcopenia: PRECAUCIÓN (pérdida masa muscular). Mujeres pre-menopáusicas: NO rutinario.',
    priority: 3,
    family: 'ayuno',
    scientificInfo: 'Considerar consultar con tu nutriólogo antes de iniciar.',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'SIRT1 marcado',
        'AMPK sostenido',
        'autofagia profunda + mitofagia',
        'FGF21 hepático (>2x baseline)',
        'β-hidroxibutirato circulante 0.5-1.5 mM',
        'BDNF cerebral marcado',
        'PGC-1α muscular (biogénesis mitocondrial)',
        'expresión FOXO3',
      ],
      inhibits: [
        'mTOR sostenido',
        'insulina baseline',
        'IGF-1 (reducción · pro-longevidad, anti-hipertrofia)',
        'NLRP3 inflammasome',
        'lipogénesis hepática de novo',
        'expresión SREBP-1c',
      ],
      modulates: [
        'HbA1c (reducción 0.4-0.7% a 3-6 meses)',
        'peso corporal (déficit calórico natural)',
        'ratio LDL/HDL',
        'testosterona baseline (efecto mixto según composición corporal)',
        'ejes hormonales femeninos (impacto marcado en pre-menopáusicas)',
        'cortisol matutino (elevación si estrés añadido)',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'HbA1c',
        'insulina_ayunas',
        'HOMA-IR',
        'trigliceridos',
        'HDL',
        'cetonas_beta_hidroxibutirato_serica',
        'IGF-1',
        'PCR_hs',
        'masa_muscular_kg (monitoreo)',
      ],
      mechanismSummary: '18h de ayuno metabólico activan autofagia profunda + mitofagia (limpieza de mitocondrias dañadas), elevan cetonas > 0.5 mM (energético alternativo cerebral), y bajan IGF-1 con efecto pro-longevidad pero anti-hipertrofia (contraindicado con objetivo ganancia muscular).',
    },

    sideEffects: [
      'hambre_marcada_primeras_3_semanas',
      'irritabilidad_moderada',
      'fatiga_ejercicio_intenso',
      'insomnio_paradojico_o_hiperalerta_matutina (cetonas + norepi)',
      'perdida_masa_muscular (si no adecuada proteína)',
      'cefalea_transitoria',
      'estreñimiento',
      'aliento_cetónico',
    ],
    contraindications: [
      'embarazo',
      'lactancia',
      'trastornos_conducta_alimentaria_activos',
      'diabetes_tipo_1',
      'bajo_peso_severo (IMC <18.5)',
      'hipoglucemias_reactivas_frecuentes',
      'niños_adolescentes',
      'mujeres_pre-menopáusicas_rutinario',
      'adulto_mayor_con_sarcopenia',
      'atleta_hipertrofia_objetivo_activo',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 6.0 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 3.0 },
        { source: 'profile', field: 'sexo', equals: 'male' },
        { source: 'profile', field: 'tolerancia_16_8', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
        { source: 'profile', field: 'sarcopenia_documentada', equals: true },
        { source: 'profile', field: 'sexo', equals: 'female' }, // Rutinario NO — supervisado sí
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Cienfuegos S et al. "Effects of 4- and 6-h Time-Restricted Feeding on Weight and Cardiometabolic Health" Cell Metab 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32673591/',
      },
      {
        citation: 'de Cabo R, Mattson MP NEJM 2019 · overview mecanismos ayuno extendido',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31881139/',
      },
      {
        citation: 'Anton SD et al. "Flipping the Metabolic Switch: Understanding and Applying the Health Benefits of Fasting" Obesity 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29086496/',
      },
      {
        citation: 'Peter Attia "18-hour fasts and autophagy" Outlive + podcast',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Jason Fung "The Complete Guide to Fasting" 2016',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Langhana profunda (Upvasa) sólo estacional (Ekadashi 2×/mes) · precaución en Vata',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · ayunos prolongados no forman parte de tradición diaria; sí ayunos taoístas ceremoniales periódicos',
        paradigm: 'tcm',
      },
      {
        citation: 'Chris Masterjohn "The problem with extended fasting" · advertencia pérdida muscular + cortisol',
        paradigm: 'functional_independent',
        paradigmConflict: 'Masterjohn más crítico que Fung/Attia con 18+ rutinario · balance requiere contexto (hipertrofia objetivo o no)',
      },
    ],
  },
  {
    key: 'ayuno_20_4_omad',
    name: 'Ayuno 20:4 / OMAD (One Meal A Day)',
    how: 'Ventana de comida de 4h (o una única comida abundante en 1h · OMAD estricto). Sólo con supervisión clínica activa. Comida debe ser densa nutricionalmente: 30-50g proteína, grasas saludables, verduras densas, carbos densos si atleta. Agua, té, café solo, caldo de hueso 0-cal en ventana de ayuno.',
    benefit: 'Máxima presión metabólica sostenida, autofagia profunda + mitofagia, elevación cetónica sostenida 1-3 mM, FGF21 marcado, IGF-1 reducido (pro-longevidad).',
    categories: ['metabolismo', 'inflamacion', 'mitocondrial'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'inflamacion_silenciosa', 'sobrecarga_hepatica', 'disfuncion_mitocondrial'],
    assignRule: 'Uso puntual estratégico (digestión, inflamación, hiperinsulinemia refractaria), NO protocolo diario. Máx 2-3× semana. Sólo con supervisión clínica activa. Adulto muy avanzado en ayuno, hombre metabólicamente sano con objetivo composición corporal / longevidad, tolerancia demostrada a 18:6.',
    priority: 3,
    family: 'ayuno',
    scientificInfo: 'Requiere supervisión clínica activa. Considerar consultar con tu nutriólogo/endocrinólogo.',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'SIRT1 máximo sostenido',
        'AMPK profundo',
        'autofagia profunda + mitofagia amplia',
        'FGF21 hepático marcado (>3x baseline)',
        'β-hidroxibutirato sostenido 1-3 mM',
        'BDNF cerebral marcado',
        'PGC-1α (biogénesis mitocondrial)',
        'FOXO3 (longevidad)',
        'lipólisis marcada',
      ],
      inhibits: [
        'mTOR sostenido',
        'insulina baseline profundamente',
        'IGF-1 (reducción marcada · pro-longevidad, anti-hipertrofia)',
        'NLRP3 inflammasome',
        'lipogénesis hepática de novo',
        'expresión SREBP-1c',
      ],
      modulates: [
        'HbA1c (reducción 0.5-1.0%)',
        'peso corporal (déficit calórico natural marcado)',
        'ratio LDL/HDL',
        'testosterona baseline (efecto mixto según composición)',
        'ejes hormonales femeninos (impacto SEVERO en pre-menopáusicas)',
        'cortisol matutino (elevación si estrés + no adaptación)',
        'temperatura basal (leve descenso)',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'HbA1c',
        'insulina_ayunas',
        'HOMA-IR',
        'cetonas_beta_hidroxibutirato_serica',
        'IGF-1',
        'trigliceridos',
        'LDL',
        'testosterona_total (monitoreo)',
        'T3_libre (monitoreo · puede bajar)',
        'masa_muscular_kg (monitoreo estricto)',
        'cortisol_matutino_salival',
        'HRV (monitoreo)',
      ],
      mechanismSummary: '20h de ayuno metabólico llevan al organismo a estado cetogénico sostenido, autofagia amplia y IGF-1 profundamente suprimido. Efectos pro-longevidad y anti-inflamatorios marcados, PERO alto costo hormonal (T3, testosterona, ciclo menstrual) que requiere supervisión.',
    },

    sideEffects: [
      'hambre_marcada_2-4_semanas',
      'irritabilidad_ansiedad_transitoria',
      'fatiga_ejercicio_intenso_marcada',
      'insomnio_hiperalerta (cetonas + norepi)',
      'perdida_masa_muscular_significativa (si proteína insuficiente)',
      'cefalea',
      'estreñimiento',
      'aliento_cetónico',
      'sensibilidad_al_frio (T3 bajo)',
      'perdida_libido_transitoria (LH/testosterona)',
      'irregularidad_menstrual (mujeres)',
      'refeeding_syndrome (riesgo si prolongado + reintroducción abrupta)',
    ],
    contraindications: [
      'diabetes_1',
      'tca_activo_o_historia',
      'sarcopenia_diagnosticada',
      'mujer_pre_menopausica_sin_ciclo_awareness',
      'embarazo',
      'lactancia',
      'trastornos_conducta_alimentaria_activos',
      'trastorno_alimentario_historia_previa',
      'diabetes_tipo_1',
      'bajo_peso_severo (IMC <20.0)',
      'hipoglucemias_reactivas_frecuentes',
      'niños_adolescentes',
      'mujeres_pre-menopáusicas',
      'adulto_mayor_con_sarcopenia',
      'atleta_hipertrofia_objetivo_activo',
      'hipotiroidismo_activo',
      'insuficiencia_suprarrenal',
      'medicacion_hipoglicemiante (insulina, sulfonilureas · riesgo hipoglucemia severa)',
      'trastorno_bipolar (puede desestabilizar)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'tolerancia_18_6_meses', equals: true },
        { source: 'profile', field: 'sexo', equals: 'male' },
        { source: 'profile', field: 'supervision_clinica_activa', equals: true },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 6.5 },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
        { source: 'profile', field: 'trastorno_alimentario_historia', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
        { source: 'profile', field: 'sexo', equals: 'female' },
        { source: 'profile', field: 'edad', equals: true },
        { source: 'profile', field: 'sarcopenia_documentada', equals: true },
        { source: 'lab', marker: 'IMC', operator: '<', value: 20 },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Stekovic S et al. "Alternate Day Fasting Improves Physiological and Molecular Markers of Aging in Healthy, Non-obese Humans" Cell Metab 2019',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31491363/',
      },
      {
        citation: 'Stote KS et al. "A controlled trial of reduced meal frequency without caloric restriction in healthy, normal-weight, middle-aged adults" Am J Clin Nutr 2007 · OMAD específico',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17413096/',
      },
      {
        citation: 'Cienfuegos S et al. Cell Metab 2020 · ventana 4h datos empíricos',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32673591/',
      },
      {
        citation: 'Jason Fung "The Complete Guide to Fasting" 2016 · OMAD como herramienta',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Peter Attia "Extended fasting risks and benefits" Outlive + AMA podcasts',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Ekadashi (ayuno lunar 2×/mes) precedente ceremonial · no OMAD diario',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Valter Longo · advertencia OMAD diario asociado con mayor mortalidad en cohorte NHANES 2023',
        paradigm: 'functional_independent',
        paradigmConflict: 'Longo señala mayor mortalidad cardiovascular en OMAD rutinario · Fung/Attia lo defienden con contexto. Requiere supervisión.',
      },
      {
        citation: 'Sun JC et al. "Meal skipping and shorter meal intervals are associated with increased risk of all-cause and cardiovascular disease mortality" J Acad Nutr Diet 2023',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36372766/',
      },
      {
        citation: 'Stacy Sims + Mindy Pelz · consenso: OMAD rutinario NO recomendable para mujeres pre-menopáusicas',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'caminata_postprandial',
    name: 'Caminata post-comida 10 min',
    how: 'Camina suave (paso conversacional, ~4-5 km/h) 10 min inmediatamente después de comida principal (idealmente iniciar dentro de los 15 min post-comida). Interior o exterior. Sin dispositivo pesado. Si no puedes salir: subir escaleras, marcha estacionaria, o levantarte y hacer tareas activas.',
    benefit: 'Reduce glucosa postprandial 20-50% vía captación muscular insulina-independiente (GLUT4 translocation por contracción), mejora vaciamiento gástrico, activa MMC, reduce reflujo funcional post-cena.',
    categories: ['metabolismo', 'digestion', 'movimiento', 'cardiovascular'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'reflujo_funcional', 'sedentarismo'],
    assignRule: 'Universal recomendado post-comida principal. Flag P1 si: glucosa postprandial elevada (CGM >140 mg/dL), HOMA-IR alto, resistencia, reflujo funcional, síndrome metabólico, DM2, hígado graso.',
    priority: 2,
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'GLUT4 translocation muscular (insulina-independiente por contracción)',
        'AMPK muscular',
        'PGC-1α leve (repetido crónicamente)',
        'MMC (Migrating Motor Complex) inicial',
        'lipólisis muscular leve',
        'expresión GLUT1 endotelial',
        'vasodilatación mesentérica (mejora digestión)',
      ],
      inhibits: [
        'pico glucosa postprandial (reducción 22-50% vs sentado)',
        'insulina postprandial (menor demanda pancreática)',
        'reflujo gastroesofágico funcional post-cena',
        'somnolencia postprandial (por reducción glucémica)',
        'inflamación postprandial (IL-6 postprandial de comidas grasas)',
      ],
      modulates: [
        'variabilidad glucémica CGM (reducción SD)',
        'vaciamiento gástrico (aceleración leve)',
        'motilidad intestinal',
        'HRV postprandial (parasimpático se preserva)',
        'oxidación de sustratos (favorece oxidación glucosa vs almacenamiento)',
      ],
      biomarkers: [
        'glucosa_postprandial_1h_2h',
        'variabilidad_glucemica_CGM',
        'HbA1c',
        'HOMA-IR',
        'trigliceridos_postprandiales',
        'lactato_1h_postprandial',
      ],
      mechanismSummary: 'La contracción muscular durante caminata activa GLUT4 vía AMPK/CaMK, permitiendo captación de glucosa INDEPENDIENTE de insulina. Iniciar dentro de los 15 min post-comida (cuando la glucosa está subiendo) es el timing óptimo — reduce pico 22-50%.',
    },

    sideEffects: [
      'reflujo_leve_si_paso_muy_rapido (bajar a paso conversacional)',
      'incomodidad_gastrica_leve_transitoria',
      'cambio_habito_social_post-comida',
    ],
    contraindications: [
      'ortopedico_agudo_no_apto_caminar',
      'reflujo_agudo_severo_activo (esperar 20-30 min primero)',
      'insuficiencia_cardiaca_NYHA_IV',
      'postoperatorio_abdominal_reciente',
      'nauseas_severas_activas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'lab', marker: 'glucosa_postprandial_2h', operator: '>=', value: 140 },
        { source: 'profile', field: 'condiciones', in: ['resistencia_insulina', 'reflujo_funcional', 'sindrome_metabolico', 'diabetes_tipo_2', 'higado_graso'] },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['insuficiencia_cardiaca_NYHA_IV', 'postoperatorio_abdominal_agudo'] },
      ],
      boostWeight: 5, // Bajísimo costo, altísimo beneficio · elegible universal
    },

    sources: [
      {
        citation: 'Buffey AJ et al. "The Acute Effects of Interrupting Prolonged Sitting Time in Adults with Standing and Light-Intensity Walking on Biomarkers of Cardiometabolic Health" Sports Med 2022',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35152388/',
        industryFunded: false,
      },
      {
        citation: 'Reynolds AN et al. "Advice to walk after meals is more effective for lowering postprandial glycaemia in type 2 diabetes mellitus than advice that does not specify timing" Diabetologia 2016 · 10 min post-comida > caminata general',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27747394/',
      },
      {
        citation: 'DiPietro L et al. "Three 15-min bouts of moderate postmeal walking significantly improves 24-h glycemic control in older people at risk for impaired glucose tolerance" Diabetes Care 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23761134/',
      },
      {
        citation: 'Manohar C et al. "The effect of walking on postprandial glycemic excursion in patients with type 1 diabetes and healthy people" Diabetes Care 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22961573/',
      },
      {
        citation: 'Nakamura T et al. Sci Rep 2025 · 10-min walk immediately after glucose intake uniquely effective',
        paradigm: 'western_academic',
        url: 'https://www.nature.com/articles/s41598-025-07312-y',
      },
      {
        citation: 'Peter Attia "Post-meal walking is the highest ROI intervention" Outlive + podcasts',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Casey Means "Good Energy" 2024 · CGM data + post-meal movement',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Shatapavali (शतपावली · "cien pasos") · caminata 100 pasos tras comida principal · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · caminar 100 pasos tras comer alarga la vida hasta 99 años · dicho popular Ming (饭后百步走，活到九十九)',
        paradigm: 'tcm',
      },
      {
        citation: 'Tradición mediterránea · "passeggiata" post-cena en cultura italiana + española · práctica de siglos',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'bulletproof_coffee',
    name: 'Bulletproof coffee',
    how: 'Café solo (idealmente mold-free / specialty) + 15 g MCT oil (C8:C10) + 10 g mantequilla de vaca de pastoreo o ghee, blendeado en licuadora hasta emulsión cremosa. Beber lentamente. Si primera vez: iniciar 5 g MCT + 5 g mantequilla y titular.',
    benefit: 'Cetosis suave sostenida (β-hidroxibutirato 0.3-0.8 mM), energía sostenida sin crash, apetito reducido (leptina + BHB). NO sube insulina significativamente. Respeta ayuno metabólico (mantiene cetosis + autofagia parcial). Saciante → baja consumo de carbos → puede reducir triglicéridos.',
    categories: ['metabolismo', 'energia', 'nutricion', 'mitocondrial'],
    roots: ['hiperinsulinemia', 'sobrecarga_procesados', 'cortisol_matutino_bajo', 'disfuncion_mitocondrial'],
    assignRule: 'Persona buscando saciedad matutina, extensión de ayuno metabólico, low-carb / cetogénico. Contraindicación clara: NO combinar con dieta alta en carbos (>20% cal o >100 g/día · doctrina Enrique 2026-07-11).',
    priority: 2,
    timeOfDay: 'morning',
    scientificInfo: 'Doctrina ATP: los triglicéridos suben por los carbohidratos, no por la grasa dietética. El flag correcto es dieta alta en carbos, no el perfil lipídico.',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'β-hidroxibutirato hepático (MCT → BHB directo)',
        'BDNF cerebral (BHB-mediated)',
        'inhibidor NLRP3 inflammasome (via BHB)',
        'PPAR-α hepático (oxidación grasas)',
        'AMPK leve (contexto cetogénico)',
        'expresión UCP1 modesto (thermogenic effect MCT)',
        'FGF21 (con dieta cetogénica sostenida)',
      ],
      inhibits: [
        'apetito (via BHB + leptina + colecistoquinina de grasa)',
        'lipogénesis de novo hepática (opuesto a azúcar/fructosa)',
        'variabilidad glucémica postprandial',
        'insulinemia matutina (mínima elevación)',
        'inflamación silenciosa via NLRP3 (BHB directo)',
      ],
      modulates: [
        'cetonas séricas (0.3-0.8 mM · cetosis suave)',
        'trigliceridos (respuesta variable · sube en algunos short-term, baja crónico por reducción carbos)',
        'colesterol total (puede subir · en cetogénico patrón cambia hacia LDL grande fluttante · no aterogénico)',
        'apoB (monitoreo · algunos individuos sí suben)',
        'saciedad prolongada 4-6h',
        'clarity cognitiva matutina (BHB cerebral)',
      ],
      biomarkers: [
        'cetonas_beta_hidroxibutirato_serica',
        'glucosa_ayunas',
        'insulina_ayunas',
        'trigliceridos',
        'HDL',
        'LDL',
        'apoB (monitoreo hiper-respondedores)',
        'GGT (monitoreo hepático)',
      ],
      mechanismSummary: 'MCT (C8-C10) se absorben directamente por vena porta y se convierten en hígado a β-hidroxibutirato sin necesidad de carnitina, generando cetosis suave en 30-60 min. Grasa (butyrate/CLA de mantequilla pastoreo) prolonga saciedad. Sin carbos/proteína, insulina se mantiene basal.',
    },

    sideEffects: [
      'diarrea_MCT_dosis_dependiente (iniciar dosis baja)',
      'nauseas_transitorias_grasa_alta',
      'brain_fog_transitorio_primeros_dias (adaptación cetogénica)',
      'palpitaciones_transitorias (norepi + cafeína + MCT)',
      'hipoglucemia_reactiva_si_carbos_despues (roller coaster)',
      'cambio_lipidos_en_hiper-respondedores_leanmass',
    ],
    contraindications: [
      'embarazo',
      'lactancia',
      'diabetes_tipo_1 (riesgo cetoacidosis · sólo con endocrino)',
      'trastornos_conducta_alimentaria_activos',
      'pancreatitis_activa_o_historia',
      'colestasis_activa',
      'sindrome_intestino_corto (malabsorción grasa)',
      'hiperlipidemia_familiar_severa_no_controlada',
      'dieta_alta_carbos_concurrente (>20% cal o >100 g/día)',
      'niños_pequeños',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'dieta', in: ['low_carb', 'ketogenic', 'carnivore'] },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'quiz', questionnaire: 'saciedad_matutina', score: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'diabetes_tipo', equals: 1 },
        { source: 'profile', field: 'condiciones', in: ['pancreatitis', 'colestasis', 'trastorno_alimentario_activo', 'sindrome_intestino_corto'] },
        { source: 'profile', field: 'carbos_gramos_dia', equals: true },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'St-Onge MP, Jones PJ "Physiological effects of medium-chain triglycerides" J Nutr 2002',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11880549/',
      },
      {
        citation: 'Newport MT et al. "A new way to produce hyperketonemia: use of ketone ester in a case of Alzheimer\'s disease" Alzheimers Dement 2015 · MCT + cetonas cerebrales',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25301680/',
      },
      {
        citation: 'Youm YH et al. "The ketone metabolite β-hydroxybutyrate blocks NLRP3 inflammasome" Nat Med 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25686106/',
      },
      {
        citation: 'Dave Asprey "The Bulletproof Diet" 2014 · protocolo original',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Dominic D\'Agostino · investigación cetosis + MCT en performance cognitiva y militar',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Masterjohn "Coffee, MCT and butter — the physiology" · matiz nutricional',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Ghee matutino tradicional en Rasayana + té/decocción de hierbas · precedente conceptual',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Tradición tibetana · té con mantequilla de yak (po cha · བོད་ཇ་) · precedente cultural directo',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Berg E "Does Bulletproof Coffee Break a Fast?" · defensa doctrina metabólica (fasting = mínima insulina)',
        paradigm: 'functional_independent',
        paradigmConflict: 'Doctrina occidental estricta: cero calorías = ayuno. Doctrina metabólica (Enrique + Berg + Asprey): mínima insulina = ayuno metabólico intacto. Enrique alineado con doctrina metabólica.',
      },
      {
        citation: 'Tinsley GM & La Bounty PM "Effects of intermittent fasting on body composition and clinical health markers in humans" Nutr Rev 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26374764/',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIGESTIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'masticar_mas_20',
    name: 'Masticar >20 veces por bocado',
    how: 'Cuenta más de 20 masticadas por bocado (ideal 30-40 en alimentos densos) hasta que la comida sea prácticamente líquida antes de tragar. Deja cubierto entre bocados. Comer en silencio o conversación calmada, no leyendo/pantallas.',
    benefit: 'Activa fase cefálica digestiva (amilasa salival + lipasa lingual), produce enzimas salivales, mejora absorción, reduce carga sobre estómago e intestino, aumenta saciedad (leptina + histamina cerebral) y reduce ingesta calórica 10-15%.',
    categories: ['digestion', 'ritual', 'metabolismo'],
    roots: ['disbiosis', 'digestion_estres_autonomico', 'reflujo_funcional', 'permeabilidad_intestinal'],
    assignRule: 'Distensión postprandial, gases, reflujo, SIBO sospechado, digestión errática, sobrepeso con eating fast, estrés autonómico digestivo.',
    priority: 2,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'amilasa salival (pre-digestión almidones)',
        'lipasa lingual (pre-digestión grasas)',
        'fase cefálica digestiva completa (Pavlov · CCK, gastrina)',
        'HCl gástrico anticipatorio',
        'CCK y GLP-1 (saciedad más marcada)',
        'histamina cerebral (saciedad)',
        'tono parasimpático prandial (rest & digest)',
      ],
      inhibits: [
        'aerofagia (menos aire tragado)',
        'partículas grandes que llegan al intestino (menos fermentación anómala)',
        'endotoxemia postprandial (LPS translocación reducida con mejor digestión)',
        'grelina postprandial (saciedad más marcada)',
        'ingesta calórica excesiva (10-15% reducción con masticación consciente)',
      ],
      modulates: [
        'volumen ingesta (auto-reducción por saciedad)',
        'tiempo de comida (extensión saludable)',
        'motilidad intestinal (mejor sincronización con MMC)',
        'nivel estrés post-comida (parasimpático protegido)',
      ],
      biomarkers: [
        'peso_corporal (leve reducción crónica)',
        'CCK_postprandial',
        'GLP-1',
        'grelina',
        'LBP_lipopolysaccharide_binding_protein',
        'sintomas_digestivos_score',
      ],
      mechanismSummary: 'Masticación prolongada activa fase cefálica completa (HCl anticipado, enzimas salivales, CCK, tono vagal digestivo), pre-digiere partículas (menos fermentación anómala colónica) y da tiempo a que señales de saciedad (leptina, GLP-1) alcancen hipotálamo (~20 min).',
    },

    sideEffects: [
      'lentitud_inicial (adaptación 2-3 semanas)',
      'incomodidad_social_inicial',
      'fatiga_mandibular_transitoria',
    ],
    contraindications: [
      'disfagia_activa',
      'edentulismo_severo_sin_protesis (adaptar textura)',
      'trastorno_temporomandibular_severo_activo',
      'delirium_agudo (riesgo aspiración)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'profile', field: 'condiciones', in: ['distension_postprandial', 'gases_excesivos', 'reflujo_funcional', 'SIBO_sospechado', 'sobrepeso'] },
        { source: 'quiz', questionnaire: 'digestion', score: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['disfagia_activa', 'trastorno_temporomandibular_severo'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Zhu Y & Hollis JH "Increasing the number of chews before swallowing reduces meal size in normal-weight, overweight, and obese adults" J Acad Nutr Diet 2014',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24215801/',
      },
      {
        citation: 'Li J et al. "Improvement in chewing activity reduces energy intake in one meal and modulates plasma gut hormone concentrations in obese and lean young Chinese men" Am J Clin Nutr 2011 · 40 masticadas vs 15',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21715510/',
      },
      {
        citation: 'Cassady BA et al. "Mastication of almonds: effects of lipid bioaccessibility, appetite, and hormone response" Am J Clin Nutr 2009',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19640957/',
      },
      {
        citation: 'Horace Fletcher "Fletcherism" 1913 · Chew each mouthful until liquid · movimiento popular temprano siglo XX',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Ahara Vidhi · reglas ancestrales de comer con calma, sin distracción, masticando hasta liquidez · Charaka Samhita Sutra Sthana 8',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · comer con Shen presente, sin discusiones ni prisas, masticar prolongado favorece Bazo-Estómago · Nei Jing',
        paradigm: 'tcm',
      },
      {
        citation: 'Chris Kresser "Chew your food (really)" · funcional protocol',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Zen buddhist eating practice (oryoki 応量器) · silent mindful eating, thorough chewing · tradición documentada',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'agua_fuera_comidas',
    name: 'Agua fuera de las comidas',
    how: 'No tomar líquidos 20 min antes ni 30-60 min después de las comidas. Sorbos pequeños (≤100 ml) tibios durante si necesario. Fuera de comidas: hidratación libre (2-3 L/día).',
    benefit: 'Preserva HCl gástrico y enzimas digestivas, mejora absorción de nutrientes y reduce distensión postprandial en digestión funcionalmente débil.',
    categories: ['digestion', 'hidratacion', 'ritual'],
    roots: ['digestion_estres_autonomico', 'reflujo_funcional', 'disbiosis'],
    assignRule: 'Indicación clínica funcional: reflujo funcional, acidez estomacal recurrente, dispepsia funcional, distensión postprandial, deficiencia sospechada de HCl. NO universal.',
    priority: 3,
    isUniversal: false,
    evidenceLevel: 'N3', // PARADIGMA_AUSENTE: western_academic sólida
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'concentración HCl gástrica preservada',
        'enzimas pancreáticas (concentración preservada)',
        'MMC inter-prandial (con ventana clara de reposo)',
        'saliva enzimática (masticación se preserva sin dilución)',
      ],
      inhibits: [
        'distensión postprandial funcional (con digestión débil)',
        'reflujo funcional (por menos volumen gástrico total)',
        'saciedad hídrica prematura (que reduce ingesta nutrientes)',
      ],
      modulates: [
        'tiempo vaciamiento gástrico',
        'concentración enzimática',
        'sensación saciedad',
      ],
      biomarkers: [
        'sintomas_digestivos_score',
        'reflujo_episodios',
        'plenitud_postprandial_score',
      ],
      mechanismSummary: 'En digestión funcionalmente débil, líquidos abundantes durante comida diluyen HCl y enzimas, retrasan vaciamiento y aumentan distensión. Espaciar ingesta hídrica de comidas preserva concentración digestiva. NOTA: literatura occidental no respalda que agua modesta (200-300 ml) diluya HCl significativamente en digestión sana.',
    },

    sideEffects: [
      'sensacion_boca_seca_transitoria_al_comer',
      'presion_social_transitoria (contra costumbre)',
      'inconveniente_horario_hidratacion',
    ],
    contraindications: [
      'deshidratacion_activa (prioridad hidratar)',
      'disfagia_requiere_bebida_para_tragar',
      'medicamentos_orales_requieren_agua_con_comida',
      'insuficiencia_renal_bajo_control_hidrico_estricto',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'profile', field: 'condiciones', in: ['reflujo_funcional', 'distension_postprandial_marcada', 'SIBO_sospechado', 'hipoclorhidria_funcional'] },
        { source: 'quiz', questionnaire: 'digestion', score: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'deshidratacion_activa', equals: true },
        { source: 'profile', field: 'disfagia', equals: true },
        { source: 'profile', field: 'medicacion_con_comidas', equals: true },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Chris Kresser "The truth about stomach acid" 2017 · protocolo hipoclorhidria funcional · funcional independiente',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Charaka Samhita Sutra Sthana · agua modesta tibia OK durante Bhojana; NO agua fría; poca agua post-comida para preservar Agni',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Ayurveda · Bhavaprakasha Nighantu · agua ANTES de comer engrasa (Sthaulya-krit), DURANTE mantiene equilibrio (Sama-krit), DESPUÉS reduce fuego digestivo (Karshya-krit)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · líquido frío durante comida apaga fuego Bazo-Estómago (Pi Wei) · práctica tradicional: sopa tibia sí, agua fría no',
        paradigm: 'tcm',
      },
      {
        citation: 'Datis Kharrazian "Why Do I Still Have Thyroid Symptoms?" 2010 · protocolos digestivos funcionales con hidratación fuera de comidas',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Sarah Ballantyne "The Paleo Approach" 2013 · protocolos AIP incluyen hidratación fuera de comidas',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Gaddey HL & Holder K "Unintentional weight loss in older adults" Am Fam Physician 2014 · NOTA: literatura occidental muestra que agua modesta NO diluye HCl significativamente',
        paradigm: 'western_academic',
        url: 'https://www.aafp.org/afp/2014/0501/p718.html',
        paradigmConflict: 'Occidental clásica no valida el rationale "agua diluye HCl" en digestión sana. Ayurveda + funcional lo mantienen como práctica para digestión débil. Contexto define.',
      },
    ],
  },
  {
    key: 'oil_pulling_coco',
    name: 'Oil pulling con aceite de coco',
    how: '15-20 ml (1 cucharada) de aceite de coco virgen extra sólido o líquido, enjuagar 10-15 min en boca (sin tragar, movimientos suaves), escupir en basura (NO drenaje · obstruye), enjuagar boca con agua tibia + sal, cepillar.',
    benefit: 'Reduce carga bacteriana bucal (especialmente Streptococcus mutans y Lactobacillus), mejora salud gingival, reduce placa dental, "detox" oral tradicional (Kavala/Gandusha Ayurveda).',
    categories: ['digestion', 'inmunologico', 'ritual'],
    roots: ['disbiosis', 'inflamacion_silenciosa'],
    assignRule: 'Cotidiana simple · puede ser diaria. Halitosis, gingivitis, disbiosis oral, caries recurrentes, sensibilidad dental funcional, orientación de higiene oral holística. Puede ser diario.',
    priority: 3,
    family: 'oil_pulling',
    timeOfDay: 'morning',
    evidenceLevel: 'N3',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'saponificación de bacterias (grasa emulsiona con biofilm bacteriano)',
        'ácido láurico (con propiedades antimicrobianas)',
        'monolaurina (metabolito del ácido láurico · antimicrobiana + antiviral)',
        'flujo salival aumentado',
        'IgA salival (leve)',
      ],
      inhibits: [
        'Streptococcus mutans (reducción CFU documentada · Peedikayil 2015)',
        'Lactobacillus acidogénicos',
        'gingivitis marker (índice placa + índice gingival)',
        'halitosis (compuestos sulfurados volátiles)',
        'formación biofilm bacteriano',
      ],
      modulates: [
        'microbiota oral (favorece equilibrio · no destruye indiscriminadamente como clorhexidina)',
        'mucosa oral (hidratación)',
        'pH salival',
      ],
      biomarkers: [
        'indice_placa_dental',
        'indice_gingival',
        'halitosis_organoleptic_score',
        'Streptococcus_mutans_CFU_saliva',
        'sangrado_gingival',
      ],
      mechanismSummary: 'El aceite de coco (rico en ácido láurico) emulsiona con biofilms bacterianos, saponifica bacterias gram-positivas (S. mutans, Lactobacillus), y la monolaurina generada tiene actividad antimicrobiana. Enjuague 10-15 min mecánicamente arrastra la película.',
    },

    sideEffects: [
      'nauseas_transitorias_primeras_veces',
      'fatiga_mandibular_leve',
      'sensacion_grasa_boca_transitoria',
      'aspiracion_accidental_si_se_traga (evitar · escupir siempre)',
    ],
    contraindications: [
      'alergia_conocida_al_coco',
      'nino_menor_5_años (riesgo aspiración)',
      'trastorno_deglución',
      'ulcera_oral_activa_severa (esperar cicatrización)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'condiciones', in: ['halitosis', 'gingivitis', 'caries_recurrentes', 'disbiosis_oral'] },
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['alergia_coco', 'trastorno_deglucion'] },
        { source: 'profile', field: 'edad', equals: true },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Peedikayil FC et al. "Effect of coconut oil in plaque related gingivitis" Niger Med J 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25838632/',
        industryFunded: false,
      },
      {
        citation: 'Kaushik M et al. "The Effect of Coconut Oil pulling on Streptococcus mutans Count in Saliva in Comparison with Chlorhexidine Mouthwash" J Contemp Dent Pract 2016 · comparable a clorhexidina',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26859472/',
      },
      {
        citation: 'Sezgin Y et al. "Efficacy of oil pulling therapy with coconut oil on four-day supragingival plaque growth" Complement Ther Med 2019',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31126563/',
      },
      {
        citation: 'Nagilla J et al. "Comparative Evaluation of Antiplaque Efficacy of Coconut Oil Pulling and a Placebo, Among Dental College Students" J Clin Diagn Res 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28969236/',
      },
      {
        citation: 'Ayurveda · Kavala (retención) y Gandusha (enjuague activo) · Charaka Samhita Sutra Sthana 5 (Matrashitiya adhyaya) · práctica de Dinacharya',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Ayurveda · Sushruta Samhita · uso de aceite de sésamo tradicionalmente, luego coco en zonas costeras',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Bruce Fife "Oil Pulling Therapy" 2008 · funcional independiente · popularizador contemporáneo',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Peedikayil FC "Comparison of antibacterial efficacy of coconut oil and chlorhexidine on Streptococcus mutans" J Int Soc Prev Community Dent 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27583211/',
      },
    ],
  },
  {
    key: 'oil_pulling_oregano',
    name: 'Oil pulling con aceite de coco + orégano',
    how: '15-20 ml de aceite de coco + 1 gota (SOLO 1) de aceite esencial de orégano puro (Origanum vulgare, mínimo 70% carvacrol). Revolver bien antes de meter en boca (mezclar aceites), enjuagar 10-15 min, escupir en basura (NUNCA drenaje), enjuagar boca con agua tibia + sal. Ciclado 4 días on / 3 días off.',
    benefit: 'Más antimicrobiano que aceite solo por acción del carvacrol y timol del orégano. Útil en disbiosis oral moderada-severa, biofilms resistentes, halitosis persistente.',
    categories: ['digestion', 'inmunologico', 'ritual'],
    roots: ['disbiosis', 'inflamacion_silenciosa'],
    assignRule: 'Protocolo puntual con inicio y fin claros · disbiosis moderada-severa. Ciclado 4 días on / 3 días off (no diario por potencia del orégano). Bajo criterio clínico.',
    priority: 3,
    family: 'oil_pulling',
    timeOfDay: 'morning',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'ácido láurico (aceite coco)',
        'monolaurina (metabolito antimicrobiano)',
        'saponificación de biofilms',
        'flujo salival',
      ],
      inhibits: [
        'Streptococcus mutans (potenciado por carvacrol)',
        'Candida albicans (carvacrol antifúngico documentado)',
        'anaerobios gram-negativos (Fusobacterium, Prevotella · halitosis)',
        'biofilms bacterianos resistentes (carvacrol disrumpe QS · quorum sensing)',
        'inflamación gingival',
      ],
      modulates: [
        'microbiota oral (más agresivo que oil pulling solo)',
        'ratio bacterias grampositivas/gramnegativas',
        'pH salival',
      ],
      biomarkers: [
        'indice_placa_dental',
        'indice_gingival',
        'halitosis_organoleptic_score',
        'Streptococcus_mutans_CFU_saliva',
        'Candida_albicans_saliva',
        'sangrado_gingival',
      ],
      mechanismSummary: 'Carvacrol y timol (fenoles monoterpénicos del orégano) disrumpen membranas bacterianas gram-positivas y gram-negativas, inhiben quorum sensing y biofilms. Combinado con aceite de coco emulsionante, aumenta espectro antimicrobiano vs oil pulling solo.',
    },

    sideEffects: [
      'sensacion_ardor_calor_leve_boca (esperada, esperar adaptación)',
      'irritacion_mucosa_si_exceso_gotas',
      'nauseas_transitorias',
      'sabor_intenso_persistente',
      'hepatotoxicidad_potencial_si_tragado_repetido (carvacrol dosis-dependiente)',
      'reduccion_flora_oral_benefica (si uso diario prolongado)',
    ],
    contraindications: [
      'gastritis_erosiva',
      'alergia_lamiaceae',
      'mucosa_oral_rota',
      'embarazo (carvacrol pasa membranas · potencial teratogénico animal)',
      'lactancia',
      'niños menores 12 años',
      'ulceras_orales_activas_severas',
      'mucosa_oral_erosionada (post-quimioterapia, radioterapia oral)',
      'hepatopatía_activa (riesgo si aspiración/deglución)',
      'alergia_conocida_labiadas (orégano, tomillo, salvia)',
      'medicación_anticoagulante (carvacrol tiene efecto antiplaquetario)',
      'cirugía_dental_reciente_no_cicatrizada',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'condiciones', in: ['disbiosis_oral_moderada', 'halitosis_persistente', 'candidiasis_oral_leve', 'biofilms_resistentes'] },
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'profile', field: 'tolerancia_oil_pulling_simple', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'lactancia', equals: true },
        { source: 'profile', field: 'edad', equals: true },
        { source: 'profile', field: 'condiciones', in: ['hepatopatia_activa', 'alergia_labiadas', 'ulcera_oral_severa', 'quimioterapia_oral'] },
        { source: 'profile', field: 'medicacion_anticoagulante', equals: true },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Baser KH "Biological and pharmacological activities of carvacrol and carvacrol bearing essential oils" Curr Pharm Des 2008',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19075687/',
      },
      {
        citation: 'Nostro A et al. "Effects of oregano, carvacrol and thymol on Staphylococcus aureus and Staphylococcus epidermidis biofilms" J Med Microbiol 2007',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17510270/',
      },
      {
        citation: 'Manohar V et al. "Antifungal activities of origanum oil against Candida albicans" Mol Cell Biochem 2001',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11235457/',
      },
      {
        citation: 'Preuss HG et al. "Minimum inhibitory concentrations of herbal essential oils and monolaurin for gram-positive and gram-negative bacteria" Mol Cell Biochem 2005',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/15971702/',
      },
      {
        citation: 'Bruce Fife "Oil Pulling Therapy" 2008 · variantes con esenciales',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Kresser · protocolos oil pulling con esenciales (uso puntual, ciclado)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Herbolaria mediterránea tradicional · orégano (Origanum vulgare) como antimicrobiano oral documentado desde Dioscorides s.I "De Materia Medica"',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Vacha (Acorus calamus) + Yashtimadhu (regaliz) en Gandusha para disbiosis oral · alternativas tradicionales',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'postura_cuclillas_defecar',
    name: 'Postura en cuclillas al defecar',
    how: 'Eleva pies con banco tipo Squatty Potty (17-23 cm) al defecar, cadera flexionada >100°, columna neutra ligeramente inclinada adelante, codos sobre rodillas si cómodo. Alternativa avanzada: cuclillas completa sobre inodoro convertido/original.',
    benefit: 'Ángulo anorrectal se abre de ~90° (sentado) a 126-140° (cuclillas), elimina Valsalva excesivo, previene hemorroides, mejora vaciamiento completo, reduce tiempo defecación 50-60% (Sikirov 2003).',
    categories: ['digestion', 'ritual', 'cardiovascular'],
    roots: ['digestion_estres_autonomico', 'reflujo_funcional'],
    assignRule: 'Universal recomendado. Flag P1 si: constipación funcional, hemorroides, evacuación incompleta, straining crónico, prolapso rectal funcional leve, embarazo (facilita), post-parto.',
    priority: 3,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'apertura ángulo anorrectal (musculatura puborrectal relajada)',
        'reflejo rectoanal inhibitorio completo',
        'relajación diafragma pélvico',
        'peristalsis colónica final',
      ],
      inhibits: [
        'Valsalva excesivo (esfuerzo con glotis cerrada · aumenta presión intra-torácica + intra-abdominal)',
        'presión venosa hemorroidal (previene hemorroides)',
        'compresión vena cava inferior por Valsalva',
        'straining crónico (asociado con prolapso, hernia)',
        'micro-desgarros mucosa anal',
      ],
      modulates: [
        'tiempo defecación (reducción 51s cuclillas vs 130s sentado · Sikirov)',
        'esfuerzo percibido (reducción marcada)',
        'sensación vaciamiento completo (mejora)',
        'presión intra-abdominal',
        'HRV durante defecación (menos activación simpática)',
      ],
      biomarkers: [
        'tiempo_defecacion_segundos',
        'esfuerzo_percibido_escala',
        'evacuacion_incompleta_frecuencia',
        'hemorroides_severidad_grado',
        'Bristol_stool_scale',
      ],
      mechanismSummary: 'La musculatura puborrectal envuelve el recto y en posición sentada mantiene un ángulo anorrectal cerrado (~90°) que actúa como válvula continente. En cuclillas se relaja, abriendo el ángulo a 126-140° y permitiendo evacuación pasiva sin Valsalva.',
    },

    sideEffects: [
      'fatiga_muscular_piernas_transitoria (adaptación)',
      'costo_banco_squatty_potty (opcional · caja de zapatos funciona)',
      'presion_social_transitoria (baño ajeno · adaptar)',
    ],
    contraindications: [
      'movilidad_reducida_severa (no puede levantar pies · usar variación)',
      'reemplazo_cadera_reciente_flexion_limitada',
      'post-quirúrgico_perineal_reciente',
      'hemorroide_trombosada_aguda (postura puede ser dolorosa)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'condiciones', in: ['constipacion_funcional', 'hemorroides', 'evacuacion_incompleta', 'straining_cronico', 'embarazo'] },
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['reemplazo_cadera_flexion_limitada', 'post_quirurgico_perineal_reciente'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Sikirov D "Comparison of straining during defecation in three positions: results and implications for human health" Dig Dis Sci 2003 · n=28, 51s vs 130s',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12870773/',
        industryFunded: false,
      },
      {
        citation: 'Modi RM et al. "Implementation of a Defecation Posture Modification Device: Impact on Bowel Movement Patterns in Healthy Subjects" J Clin Gastroenterol 2019 · Squatty Potty efectos',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30575635/',
      },
      {
        citation: 'Rad S "Impact of ethnic habits on defecographic measurements" Arch Iran Med 2002 · comparación culturas cuclillas vs sentadas',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12934895/',
      },
      {
        citation: 'Tagart RE "The anal canal and rectum: their varying relationship and its effect on anal continence" Dis Colon Rectum 1966 · ángulo anorrectal',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ayurveda · Malamutra visarjana en Utkatasana (postura de cuclillas) · práctica ancestral · Charaka Samhita Sutra Sthana 5',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Antropología comparada · Melissa Kaplan · tradiciones cuclillas continentales (Asia, África, Latinoamérica rural) sin epidemia de hemorroides/diverticulitis',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Alexander Kira "The Bathroom" 1976 · antropología histórica del inodoro sentado como invento reciente occidental',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Chris Kresser "Squatty Potty · why you should squat to poop" · funcional independiente',
        paradigm: 'functional_independent',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPIRACIÓN + BREATHWORK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'respiracion_478',
    name: 'Respiración 4-7-8 pre-sueño',
    how: 'Inhalar 4 seg por nariz (lengua apoyada en paladar detrás de incisivos superiores), retener 7 seg, exhalar 8 seg por boca (labios entreabiertos, sonido suave "whoosh"). 4 ciclos completos, en cama antes de dormir. Progresar a 8 ciclos con adaptación (semana 4+).',
    benefit: 'Activa parasimpático (nervio vago), baja frecuencia cardíaca, facilita transición a sueño profundo N3, reduce rumiación cognitiva. Reset autonómico documentado en 1-3 min.',
    categories: ['sueno', 'ansiedad', 'estres', 'ritual', 'cardiovascular'],
    roots: ['adrenalina_nocturna', 'estres_cronico', 'cortisol_elevado_sostenido', 'deficit_sueno_profundo'],
    assignRule: 'Insomnio de conciliación, ansiedad nocturna, rumiación, pulso elevado en cama, ataques de pánico funcionales, transición estrés→foco.',
    priority: 2,
    timeOfDay: 'night',
    family: 'respiracion_nocturna',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal parasimpático (RSA · Respiratory Sinus Arrhythmia)',
        'GABA-A signaling',
        'baroreflex sensitivity',
        'melatonina onset facilitado',
        'NO nasal (respiración nasal · vasodilatador)',
        'reflejo de buceo modificado (por retención 7s)',
      ],
      inhibits: [
        'simpático (norepinefrina/adrenalina)',
        'cortisol reactivo pre-sueño',
        'rumiación (prefrontal deactivation)',
        'hiperventilación patológica',
      ],
      modulates: [
        'HRV RMSSD (aumento marcado durante y post-práctica)',
        'frecuencia cardíaca de reposo (reducción 5-10 bpm inmediata)',
        'tolerancia CO2 (por retención 7s)',
        'latencia de sueño (reducción documentada)',
        'saturación CO2 tisular',
      ],
      biomarkers: [
        'HRV RMSSD nocturno',
        'frecuencia_cardiaca_reposo',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
        'tolerancia_CO2_test',
      ],
      mechanismSummary: 'La proporción 4:7:8 con exhalación dominante prolongada activa el nervio vago vía mecanorreceptores pulmonares durante la exhalación (RSA), la retención de 7s eleva CO2 y activa el reflejo de buceo modificado (parasimpático), y el conjunto reset autonómico simpático→parasimpático en 1-3 min.',
    },

    sideEffects: [
      'mareo_transitorio_primeras_veces (si hiperventilación inadvertida)',
      'hormigueo_labios_manos (tetania por alcalosis leve · resuelve rápido)',
      'somnolencia_inmediata (esperada, benéfica pre-sueño)',
      'liberacion_emocional (bostezos, lágrimas)',
    ],
    contraindications: [
      'EPOC_severa_no_controlada',
      'ataques_panico_agudos_activos (adaptar sin retención)',
      'trauma_torácico_reciente_no_cicatrizado',
      'embarazo_ultimo_trimestre (adaptar postura y retención)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'panico_activo_no_tratado'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Weil A "4-7-8 Breath" · protocolo derivado de Pranayama · popularizador contemporáneo',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life: A Systematic Review" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
      },
      {
        citation: 'Balban MY et al. Cell Reports Medicine 2023 · slow paced breathing supera mindfulness',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
      },
      {
        citation: 'Vierra J et al. "Slow diaphragmatic breathing decreases blood pressure and heart rate variability in normotensive volunteers" J Am Soc Hypertens 2022',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ayurveda · Bhramari + Nadi Shodhana Pranayama · exhalación prolongada como práctica de calma · Hatha Yoga Pradipika s.XV',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Anmian (安眠) · protocolos respiratorios pre-sueño para Yin nocturno',
        paradigm: 'tcm',
      },
      {
        citation: 'Andrew Huberman "Breathwork for sleep" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'James Nestor "Breath" 2020 · exhalación prolongada como reset autonómico universal',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'coherencia_cardiaca_5_5',
    name: 'Coherencia cardíaca 5-5 (30 respiraciones)',
    how: 'Inhalar 5 seg, exhalar 5 seg. 30 respiraciones continuas (≈5 min), 2-3 veces al día. Ideal: AM al despertar, mediodía pre-comida, PM pre-sueño. Regla mnemónica: 3-6-5 (3 veces/día, 6 respiraciones/min, 5 min).',
    benefit: 'Sincroniza el ritmo cardíaco con la respiración a 0.1 Hz (frecuencia de resonancia del sistema barorreflejo), maximiza HRV, activa tono vagal, baja cortisol y mejora regulación emocional en 5 min.',
    categories: ['estres', 'ansiedad', 'cardiovascular', 'ritual', 'cognitivo'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'hipertension', 'hrv_baja_cronica'],
    assignRule: 'Estrés crónico, HTA leve-moderada, HRV baja, ansiedad generalizada, burnout, rumiación, disautonomía funcional, fibromialgia, IBS estrés-mediado. Sin contraindicaciones prácticas.',
    priority: 2,
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal parasimpático (rama eferente cardíaca del nervio vago)',
        'baroreflex sensitivity (ganancia BRS +50-100% durante práctica)',
        'GABA-A signaling cerebral',
        'expresión oxitocina hipotalámica',
        'coherencia frontal EEG (theta-alfa 8-12 Hz)',
        'sincronización cardio-cerebral (respiración → HRV → EEG)',
        'DHEA-S basal (con práctica sostenida 4-6 semanas)',
        'nitrogeno óxido nasal (por respiración nasal si se practica así)',
      ],
      inhibits: [
        'tono simpático (reducción noradrenalina plasmática)',
        'cortisol reactivo (curva más plana, no aplanada patológica)',
        'expresión NF-κB en PBMC',
        'ratio LF/HF elevado (marcador de dominancia simpática)',
        'rumiación / Default Mode Network hiperactivo',
      ],
      modulates: [
        'HRV RMSSD (aumento inmediato +30-70% durante práctica)',
        'HRV SDNN 24h (aumento sostenido con práctica 4-8 semanas)',
        'presion_arterial_sistolica (reducción 5-10 mmHg en hipertensos leves)',
        'frecuencia cardíaca de reposo (reducción 3-8 bpm sostenida)',
        'ratio_cortisol_DHEA (mejora hacia perfil rejuvenecedor)',
        'tolerancia CO2 (aumento progresivo con práctica)',
        'coherencia respiratoria-cardíaca (RSA amplitud)',
      ],
      biomarkers: [
        'HRV_RMSSD_ms',
        'HRV_SDNN_24h',
        'presion_arterial_sistolica',
        'frecuencia_cardiaca_reposo',
        'ratio_cortisol_DHEA',
        'cortisol_salival_curva',
        'PCR_hs',
        'IgA_secretora_saliva',
      ],
      mechanismSummary: 'Respirar a 6 ciclos/min (0.1 Hz) coincide con la frecuencia de resonancia del arco barorreflejo cardiovascular · maximiza la arritmia sinusal respiratoria (RSA), estimula mecanorreceptores pulmonares y del cayado aórtico, y sincroniza sistema simpático-parasimpático generando un patrón HRV sinusoidal coherente que reprograma tono vagal y baroreflex.',
    },

    sideEffects: [
      'mareo_transitorio_primeras_sesiones',
      'sensacion_hormigueo_manos_por_alcalosis_leve',
      'somnolencia_transitoria_si_pre_sueno',
      'liberacion_emocional_bostezos_lagrimas',
    ],

    contraindications: [
      'epoc_severa_no_controlada',
      'panico_agudo_activo_sin_adaptacion_previa',
      'trauma_toracico_reciente_no_cicatrizado',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 30 },
        { source: 'lab', marker: 'presion_arterial_sistolica', operator: '>=', value: 130 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'panico_activo_no_tratado'] },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Lehrer PM & Gevirtz R "Heart rate variability biofeedback: how and why does it work?" Front Psychol 2014',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25101026/',
        industryFunded: false,
      },
      {
        citation: 'McCraty R et al. "The Coherent Heart" HeartMath Institute compendium 2009',
        paradigm: 'functional_independent',
        url: 'https://www.heartmath.org/research/science-of-the-heart/coherence/',
      },
      {
        citation: 'David O\'Hare "Cohérence cardiaque 3-6-5" 2012 · protocolo francés (3×/día, 6 resp/min, 5 min)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Vaschillo E et al. "Characteristics of resonance in heart rate variability stimulated by biofeedback" Appl Psychophysiol Biofeedback 2006 · frecuencia de resonancia 0.1 Hz',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16645868/',
      },
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
      },
      {
        citation: 'Ayurveda · Sama Vritti Pranayama (respiración de igual proporción) · Hatha Yoga Pradipika (siglo XV)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Nei Yang Gong (nutrición interior) · patrón respiratorio lento sincroniza Qi con Shen · Liu Guizhen 1950s',
        paradigm: 'tcm',
      },
      {
        citation: 'Bernardi L et al. "Effect of rosary prayer and yoga mantras on autonomic cardiovascular rhythms" BMJ 2001 · Ave María y mantra Om-mani-padme-hum llevan a 6 resp/min',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11751349/',
      },
      {
        citation: 'Andrew Huberman "The Science of Breathing" HubermanLab',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'physiological_sigh',
    name: 'Physiological sigh (rescate)',
    how: 'Doble inhalación por nariz (una profunda + una corta "topper" para inflar alveolos residuales) + exhalación larga por boca (2-3× la inhalación). Repetir 1-3 veces según intensidad del arousal. Efecto en 15-90 segundos.',
    benefit: 'Baja arousal simpático en segundos (Balban 2023 · superior a mindfulness), resetea CO2, activa parasimpático inmediato, calma sin desregular respiración. Reset ansiedad, transición estrés→foco, antes de decisión.',
    categories: ['ansiedad', 'estres', 'ritual', 'cognitivo'],
    roots: ['cortisol_elevado_sostenido', 'adrenalina_nocturna', 'estres_cronico'],
    assignRule: 'Intervención de RESCATE contextual — no diaria. Se activa en picos de ansiedad, transición estrés→foco, antes de decisión difícil, escalada emocional, dolor agudo.',
    priority: 2,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'inflación alveolar completa (doble inhalación reinfla alveolos colapsados)',
        'nervio vago (mecanoreceptores pulmonares durante exhalación larga)',
        'baroreflex sensitivity',
        'ventilación V/Q mejorada',
        'reflejo de sigh natural (Feldman 2016 · fisiología basal del suspiro)',
      ],
      inhibits: [
        'simpático agudo (norepinefrina · efecto en 15-90s)',
        'hiperarousal amigdalar',
        'cortisol reactivo agudo',
        'hiperventilación reactiva',
      ],
      modulates: [
        'HRV inmediato (aumento en 30-60s)',
        'frecuencia cardíaca (reducción inmediata 5-15 bpm)',
        'CO2 arterial (normalización rápida)',
        'ratio simpático/parasimpático',
      ],
      biomarkers: [
        'HRV RMSSD agudo (medición pre/post)',
        'frecuencia_cardiaca_reposo',
        'CO2_end_tidal',
        'PANAS_scale',
      ],
      mechanismSummary: 'El physiological sigh es una respiración endógena que ocurre cada 5 min de forma automática para reinflar alveolos colapsados (Feldman 2016). Ejecutarlo voluntariamente ante estrés reinfla alveolos + activa vago vía exhalación prolongada + normaliza CO2 · reset autonómico en 15-90 segundos, más rápido que cualquier otra técnica documentada.',
    },

    sideEffects: [
      'mareo_leve_transitorio (raro)',
      'sensacion_liberacion (esperada, adaptativa)',
      'presión_facial_leve (por inhalación profunda)',
    ],
    contraindications: [
      'neumotorax_activo',
      'trauma_torácico_reciente_no_cicatrizado',
      'EPOC_severa_no_controlada',
      'crisis_asmática_activa (usa broncodilator primero)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'quiz', questionnaire: 'reactividad_emocional', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['neumotorax_activo', 'trauma_torácico_reciente', 'crisis_asmatica_activa'] },
      ],
      boostWeight: 4, // Herramienta de rescate universal · costo cero, tiempo <1 min
    },

    sources: [
      {
        citation: 'Balban MY, Neri E, Kogon MM, Weed L, Nouriani B, Jo B, Holl G, Zeitzer JM, Spiegel D, Huberman AD "Brief structured respiration practices enhance mood and reduce physiological arousal" Cell Reports Medicine 2023 · cyclic sighing > mindfulness',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
        industryFunded: false,
      },
      {
        citation: 'Li P, Janczewski WA, Yackle K, Kam K, Pagliardini S, Krasnow MA, Feldman JL "The peptidergic control circuit for sighing" Nature 2016 · descubrimiento circuito del sigh',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26855425/',
      },
      {
        citation: 'Vlemincx E et al. "A sigh of relief or a sigh to relieve: The psychological and physiological relief effect of deep breaths" Psychophysiology 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26857313/',
      },
      {
        citation: 'Andrew Huberman "Physiological Sigh in Real Time" HubermanLab · protocolo consumer',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Bhastrika con exhalación prolongada · práctica de reset agudo · Hatha Yoga Pradipika',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · práctica de exhalación 呼 (Hu) forzada para descargar Qi estancado (Qi Zhi)',
        paradigm: 'tcm',
      },
      {
        citation: 'James Nestor "Breath" 2020 · sigh como mecanismo autonómico universal',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'box_breathing_4444',
    name: 'Box breathing 4-4-4-4',
    how: 'Inhalar 4 seg por nariz, retener con pulmones llenos 4 seg, exhalar 4 seg por nariz, retener con pulmones vacíos 4 seg. Repetir 5-10 ciclos (~3-5 min). Nivel principiante (día 1). Postura sentada erguida o de pie estable.',
    benefit: 'Regula HRV, entrena tolerancia a CO2, calma+foco simultáneos: el ritmo simétrico con retenciones equilibra el sistema nervioso autónomo. Ideal para transición estrés→foco, pre-desempeño, pre-decisión.',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual', 'cardiovascular'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'hrv_baja_cronica'],
    assignRule: 'Principiante en box breathing (día 1). Transición estrés→foco, pre-presentación, pre-competencia, escalada emocional que requiere claridad cognitiva.',
    priority: 2,
    family: 'box_breathing',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal (RSA durante ciclo simétrico)',
        'GABA-A signaling',
        'coherencia frontal EEG (theta-alfa)',
        'atención sostenida (default network downregulation)',
        'tolerancia CO2 (retenciones aumentan progresivamente umbral)',
      ],
      inhibits: [
        'simpático (norepinefrina)',
        'cortisol reactivo',
        'expresión NF-κB (estrés crónico)',
        'reactividad amigdalar',
      ],
      modulates: [
        'HRV RMSSD (aumento sostenido con práctica)',
        'frecuencia cardíaca',
        'presión arterial (reducción 3-8 mmHg en hipertensos leves)',
        'CO2 tisular',
        'foco cognitivo (ratio señal-ruido atencional)',
      ],
      biomarkers: [
        'HRV RMSSD',
        'frecuencia_cardiaca_reposo',
        'presion_arterial_sistolica',
        'cortisol_salival_curva',
        'atencion_sostenida_score',
      ],
      mechanismSummary: 'La simetría 4-4-4-4 crea patrón respiratorio predecible que estabiliza tono autonómico, las retenciones (4s x2) entrenan tolerancia CO2 y activan reflejo vagal, y el ciclo total ~16s equivale a ~3.75 respiraciones/min · cercano a frecuencia de resonancia baroreflex (0.1 Hz).',
    },

    sideEffects: [
      'mareo_transitorio_primeras_veces',
      'hormigueo_manos (tetania leve)',
      'incomodidad_retencion_pulmones_vacios (adaptar)',
    ],
    contraindications: [
      'EPOC_severa_no_controlada',
      'ataques_panico_agudos_activos',
      'trauma_torácico_reciente',
      'hipertension_severa_no_controlada (>180/110 con retenciones · adaptar)',
      'embarazo_ultimo_trimestre_no_supervisado',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'quiz', questionnaire: 'foco_cognitivo', score: 'low' },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 35 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'panico_activo_no_tratado', 'hipertension_maligna_no_controlada'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Divine M "Unbeatable Mind" 2013 · protocolo Navy SEALs con box breathing',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Röttger S et al. "The effectiveness of combat tactical breathing as compared with prolonged exhalation" Appl Psychophysiol Biofeedback 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31792645/',
      },
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
      },
      {
        citation: 'Balban MY et al. Cell Reports Medicine 2023 · box breathing entre las 3 técnicas evaluadas',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
      },
      {
        citation: 'Ayurveda · Sama Vritti Pranayama simétrico con Kumbhaka (retención) · Hatha Yoga Pradipika · progresión 1:1:1:1 para principiantes',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Nei Yang Gong (nutrición interior) · patrones simétricos con retención breve · Liu Guizhen 1950s',
        paradigm: 'tcm',
      },
      {
        citation: 'Andrew Huberman "Breathwork protocols" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Buteyko method (Konstantin Buteyko, URSS 1950s) · retención vacía como entrenamiento CO2 tolerance',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'box_breathing_5555',
    name: 'Box breathing 5-5-5-5',
    how: 'Inhalar 5 seg por nariz, retener con pulmones llenos 5 seg, exhalar 5 seg por nariz, retener con pulmones vacíos 5 seg. Repetir 5-10 ciclos (~4-7 min). Nivel intermedio (día 2-3). Postura sentada erguida.',
    benefit: 'Mayor tiempo bajo apnea controlada, más entrenamiento vagal profundo, aumento sostenido de HRV, refuerza tolerancia CO2 progresiva.',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual', 'cardiovascular'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'hrv_baja_cronica'],
    assignRule: 'Progresión desde 4-4-4-4 tras 1-2 semanas de práctica diaria estable. Requiere adaptación previa a retenciones de 4s.',
    priority: 2,
    family: 'box_breathing',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal profundo (más tiempo/ciclo, más eficacia RSA)',
        'GABA-A signaling',
        'coherencia frontal EEG (theta-alfa robusta)',
        'tolerancia CO2 (nivel intermedio)',
        'atención sostenida profunda',
        'expresión BDNF con práctica crónica (breathwork protocols)',
      ],
      inhibits: [
        'simpático (más marcado)',
        'cortisol reactivo',
        'reactividad amigdalar',
        'expresión NF-κB',
      ],
      modulates: [
        'HRV RMSSD (aumento >30% durante y post)',
        'ratio LF/HF (desplazamiento hacia parasimpático)',
        'presión arterial',
        'CO2 tisular tolerado',
        'presencia meditativa',
      ],
      biomarkers: [
        'HRV RMSSD',
        'HRV SDNN 24h',
        'frecuencia_cardiaca_reposo',
        'cortisol_salival_curva',
        'presion_arterial_sistolica',
        'tolerancia_CO2_test',
      ],
      mechanismSummary: 'Ciclo 5-5-5-5 = 20s totales = 3 respiraciones/min · más cerca del sub-resonance y muy debajo de la respiración normal (~12-15/min). Retenciones más largas (5s x2) profundizan reflejo vagal, elevan CO2 y programan cambio autonómico sostenido.',
    },

    sideEffects: [
      'mareo_transitorio (más frecuente que en 4-4-4-4)',
      'hormigueo_manos',
      'incomodidad_retencion_vacia_prolongada',
      'urgencia_respirar_transitoria (esperada, adaptación 1-2 semanas)',
    ],
    contraindications: [
      'EPOC_severa_no_controlada',
      'ataques_panico_agudos_activos',
      'trauma_torácico_reciente',
      'hipertension_severa_no_controlada',
      'embarazo_no_supervisado',
      'principiante_sin_dominar_4444_primero',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'tolerancia_4444_semanas', equals: true },
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'foco_cognitivo', score: 'low' },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 40 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'panico_activo_no_tratado', 'hipertension_maligna_no_controlada'] },
        { source: 'profile', field: 'tolerancia_4444_semanas', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Röttger S et al. "The effectiveness of combat tactical breathing" Appl Psychophysiol Biofeedback 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31792645/',
      },
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
      },
      {
        citation: 'Divine M "Unbeatable Mind" 2013 · progresión Navy SEALs 4-4-4-4 → 5-5-5-5 → 6-6-6-6',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Balban MY et al. Cell Reports Medicine 2023 · box breathing sostenido',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
      },
      {
        citation: 'Ayurveda · Sama Vritti Kumbhaka con Antara + Bahya Kumbhaka (retenciones interna + externa) · Hatha Yoga Pradipika · nivel intermedio',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Xing Qi Fa (moving qi method) con retenciones simétricas más largas',
        paradigm: 'tcm',
      },
      {
        citation: 'Andrew Huberman "HRV & Breathwork Progressions" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Buteyko method · CO2 tolerance como pilar de salud respiratoria',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'box_breathing_6666',
    name: 'Box breathing 6-6-6-6',
    how: 'Inhalar 6 seg, retener 6 seg, exhalar 6 seg, retener 6 seg. 4-6 rondas. Práctica avanzada — requiere base sólida en 4-4-4-4 y 5-5-5-5 (día 4+ de progresión). Sentado, columna recta, respiración nasal. 1-2 sesiones/día máximo.',
    benefit: 'Máxima estimulación vagal por apnea prolongada + tolerancia CO2 avanzada. Frecuencia respiratoria efectiva 2.5 resp/min · sub-resonancia barorrefleja profunda que induce estado hipnagógico controlado, alerta relajada operacional.',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual', 'cardiovascular'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'hrv_baja_cronica'],
    assignRule: 'Adulto ya adaptado a 5-5-5-5 sostenido ≥2 semanas. Foco: operadores de alta demanda cognitiva (cirugía, tiro deportivo, oratoria, aviación), atletas de resistencia mental, práctica meditativa avanzada. Sin contraindicaciones vasculares mayores.',
    priority: 2,
    family: 'box_breathing',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'tono vagal parasimpático (rama eferente cardíaca)',
        'baroreflex sensitivity (BRS elevada sostenida durante apnea)',
        'GABA-A signaling (efecto Zaccaro 2018 documentado en respiración lenta con retención)',
        'nervio frénico control voluntario (corteza motora suplementaria)',
        'DMN quieting (Default Mode Network reducido · fMRI Doll 2016 respiración controlada)',
        'expresión CO2-sensing en quimiorreceptores centrales (adaptación tolerancia)',
      ],
      inhibits: [
        'tono simpático (reducción noradrenalina)',
        'cortisol reactivo agudo (agudo post-práctica)',
        'ratio LF/HF elevado (dominancia simpática)',
        'rumiación / activación amígdala (fMRI Doll 2016)',
        'PCO2-mediated cerebral vasoconstriction (contra-regulación al ejercicio de apnea)',
      ],
      modulates: [
        'HRV RMSSD (aumento agudo +40-80% durante práctica en adaptados)',
        'tolerancia CO2 (EtCO2 tolerado hasta 55-60 mmHg vs 40 baseline)',
        'presion arterial (reducción sistólica 5-8 mmHg post)',
        'frecuencia cardíaca reposo (bradicardia adaptativa 3-6 bpm sostenida)',
        'coherencia cardiorrespiratoria (RSA amplitud máxima)',
        'atencion sostenida / control ejecutivo (Zaccaro 2018 revisión sistemática)',
      ],
      biomarkers: [
        'HRV RMSSD',
        'HRV SDNN 24h',
        'EtCO2 (capnografía)',
        'frecuencia_cardiaca_reposo',
        'presion_arterial_sistolica',
        'cortisol_salival_curva',
        'IgA_secretora_saliva',
      ],
      mechanismSummary: 'A 2.5 resp/min con retenciones simétricas de 6 seg, la práctica desciende bajo la frecuencia de resonancia barorrefleja (0.1 Hz) hacia territorio hipnagógico controlado · las apneas post-inhalación y post-exhalación entrenan quimiorreceptores centrales a tolerar EtCO2 elevado, y la simetría 1:1:1:1 anula la asimetría inhalación-exhalación normal, forzando dominancia vagal máxima.',
    },

    sideEffects: [
      'mareo_transitorio (si volumen corriente excesivo)',
      'hormigueo_manos (alcalosis leve por hiperventilación inadvertida)',
      'somnolencia_marcada (efecto GABA + vagal — no practicar antes de conducir)',
      'sensacion_hipoxia_leve (subjetiva por apnea prolongada, no clínica)',
      'euforia_post_practica (efecto endorfínico)',
    ],

    contraindications: [
      'EPOC_severa_no_controlada',
      'hipertension_pulmonar_severa',
      'panico_activo_no_tratado',
      'trauma_toracico_reciente',
      'embarazo_tercer_trimestre',
      'glaucoma_angulo_estrecho_activo',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 30 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'hipertension_pulmonar', 'panico_activo_no_tratado', 'glaucoma_angulo_estrecho'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing" Front Hum Neurosci 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
        industryFunded: false,
      },
      {
        citation: 'Mark Divine "Unbeatable Mind" 2013 + "The Way of the SEAL" 2013 · protocolo box breathing 4-4-4-4 → 6-6-6-6 usado en entrenamiento Navy SEAL',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Grossman D "On Combat: The Psychology and Physiology of Deadly Conflict" 2004 · combat/tactical breathing protocols',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Doll A et al. "Mindful attention to breath regulates emotions via increased amygdala-prefrontal cortex connectivity" NeuroImage 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26666896/',
      },
      {
        citation: 'Ayurveda · Sama Vritti Pranayama con Antar Kumbhaka + Bahya Kumbhaka · Hatha Yoga Pradipika · Gheranda Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Andrew Huberman "Breathing Techniques and Tools" HubermanLab · box breathing como técnica autoregulación',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Nestor J "Breath: The New Science of a Lost Art" 2020 · CO2 tolerance como métrica maestra',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC / Qigong · Ping Xi Fa (respiración equilibrada) · práctica taoísta descrita en Zhuangzi para "respiración del talón"',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'wim_hof_basico',
    name: 'Wim Hof Method — básico (3 rondas)',
    how: '⚠️ SIEMPRE en tierra firme, JAMÁS en o cerca de agua. Sentado o acostado. 3 rondas de 30 respiraciones profundas (inhalación completa, exhalación pasiva sin forzar) → exhalar completo y retener en vacío hasta primer reflejo respiratorio (30 seg-2 min) → inhalar completo y retener 15 seg. Repetir 3 ciclos completos. 1 sesión/día, matutina en ayunas ideal.',
    benefit: 'Hiperventilación controlada + retención en vacío genera alcalosis respiratoria transitoria + hipoxia intermitente que dispara adrenalina 200-300%, IL-10 antiinflamatoria (Kox 2014 PNAS · primer estudio replicable de control voluntario sobre inmunidad innata), y produce estado alterado de conciencia con dopamina/endorfinas elevadas.',
    categories: ['estres', 'inmunologico', 'energia', 'cognitivo', 'ritual'],
    roots: ['deficit_neurotransmisores', 'cortisol_elevado_sostenido', 'estres_cronico', 'inflamacion_silenciosa'],
    assignRule: '⚠️ Adulto sano sin epilepsia, cardiopatía, hipertensión no controlada, embarazo, trastorno psicótico, historia de convulsiones. Flag P1 si: inflamación crónica sub-clínica, autoinmunidad estable (con validación Mariana), burnout con anhedonia. JAMÁS en agua/ducha/tina/piscina.',
    priority: 3,
    family: 'wim_hof',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'adrenalina/epinefrina plasmática (Kox 2014 · 2× baseline durante retención)',
        'IL-10 plasmática (citoquina antiinflamatoria · Kox 2014)',
        'expresión CIRP (cold-inducible RNA-binding protein) neuroprotector',
        'β-endorfinas + dinorfinas (efecto opioide endógeno)',
        'HIF-1α (por hipoxia intermitente controlada)',
        'sympathetic outflow voluntario (activación consciente locus coeruleus)',
        'BDNF sérico (documentado en breathwork intensivo)',
        'Nrf2 pathway (respuesta al estrés oxidativo hormético)',
      ],
      inhibits: [
        'TNF-α + IL-6 + IL-8 (Kox 2014 · reducción post-endotoxina experimental)',
        'síntomas influenzoides post-endotoxina (fever, náusea, cefalea · Kox 2014)',
        'NF-κB en monocitos (via subida IL-10)',
        'percepción de dolor agudo (bloqueo por endorfinas)',
      ],
      modulates: [
        'pH sanguíneo (alcalosis respiratoria transitoria pH 7.55-7.65)',
        'PaCO2 (caída drástica a 20-25 mmHg durante hiperventilación)',
        'SpO2 (caída a 60-80% durante retención en vacío)',
        'flujo cerebral (vasoconstricción por hipocapnia + reperfusión al reinhalar)',
        'HRV agudo (variabilidad amplia · no comparable a estado basal)',
        'consciousness state (estado alterado hipnagógico documentado en EEG)',
      ],
      biomarkers: [
        'IL-10_plasmática',
        'PCR_hs',
        'IL-6',
        'TNF-α',
        'catecolaminas_orina_24h',
        'cortisol_matutino_salival',
        'SpO2_nadir_apnea',
        'HRV RMSSD',
      ],
      mechanismSummary: 'La hiperventilación cíclica (30 respiraciones profundas) genera alcalosis respiratoria + hipocapnia (PaCO2 20-25 mmHg) que descarga simpáticamente adrenalina; la retención en vacío subsiguiente produce hipoxia hormética controlada (SpO2 60-80%) que dispara IL-10 antiinflamatoria y activa HIF-1α.',
    },

    sideEffects: [
      'mareo_intenso (esperado · levantarse lento)',
      'tetania_carpopedal (alcalosis · manos "garra" · benigno)',
      'euforia_pronunciada (endorfinas + adrenalina)',
      'ansiedad_reactiva_transitoria (si mala tolerancia a apnea)',
      'llanto/risa_espontanea (liberación emocional documentada)',
      'sincope_vasovagal (si de pie o post-práctica intensa)',
      'aumento_percepcion_temporal',
    ],

    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'agua_o_cercania_agua',
      'epilepsia_o_historia_convulsiones',
      'embarazo',
      'cardiopatia_isquemica_activa',
      'arritmia_ventricular_o_supraventricular_activa',
      'hipertension_maligna_no_controlada',
      'sindrome_qt_largo',
      'trastorno_panico_activo',
      'trastorno_psicotico_activo',
      'diabetes_inestable',
      'aneurisma_cerebral_o_aortico_conocido',
      'infarto_miocardio_reciente_<6meses',
      'infarto_cerebral_reciente_<6meses',
      'antecedente_familiar_muerte_subita_cardiaca_no_estudiada',
      'menores_de_16_anos',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.5 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['epilepsia', 'cardiopatia_isquemica', 'arritmia_activa', 'hipertension_maligna', 'sindrome_qt_largo', 'panico_activo', 'trastorno_psicotico', 'aneurisma_conocido'] },
        { source: 'profile', field: 'menor_de_16_anos', equals: true },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Kox M et al. "Voluntary activation of the sympathetic nervous system and attenuation of the innate immune response in humans" PNAS 2014',
        paradigm: 'western_academic',
        url: 'https://www.pnas.org/doi/10.1073/pnas.1322174111',
        industryFunded: false,
      },
      {
        citation: 'Zwaag J et al. "The Effects of Cold Exposure Training and a Breathing Exercise on the Inflammatory Response in Humans: A Pilot Study" Psychosom Med 2022',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35213875/',
      },
      {
        citation: 'Buijze GA et al. "An Add-On Training Program Involving Breathing Exercises, Cold Exposure, and Meditation Attenuates Inflammation and Disease Activity in Axial Spondyloarthritis" PLOS One 2019',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31721815/',
      },
      {
        citation: 'Wim Hof "The Wim Hof Method: Activate Your Full Human Potential" 2020',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición tibetana Vajrayana · Tummo (gTum-mo, "fuego interior") · Kozhevnikov 2013 midió aumento temperatura corporal hasta 38.3°C',
        paradigm: 'traditional_documented',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23555755/',
      },
      {
        citation: 'Ayurveda · Bhastrika Pranayama (respiración de fuelle · precursor conceptual de WHM) · Hatha Yoga Pradipika capítulo II',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Almahayni O & Hammond L "Wim Hof Method and its effect on human physiology: A systematic review" PLOS One 2024',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38466737/',
        paradigmConflict: 'La revisión sistemática flaggea sesgo de auto-selección + tamaño de muestra pequeño · el efecto es real pero la magnitud está sobre-reportada en fuentes divulgativas.',
      },
      {
        citation: 'Andrew Huberman "The Science of Breathing" HubermanLab · advertencia explícita sobre agua',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Divers Alert Network · advertencia formal sobre voluntary hyperventilation como causa primaria de shallow water blackout',
        paradigm: 'mechanistic',
      },
    ],
  },
  {
    key: 'wim_hof_extendido',
    name: 'Wim Hof Method — extendido (4 rondas)',
    how: '⚠️ Solo con adaptación sólida a WHM básico ≥8 semanas. Tierra firme obligatorio. 4 rondas de 40 respiraciones profundas + retenciones en vacío 1.5-3 min + inhalación con retención 20-30 seg. Sesión matutina en ayunas. Escuchar cuerpo · si mareo o entumecimiento excesivo → detener.',
    benefit: 'Profundización de todos los efectos del básico: mayor magnitud alcalosis + hipoxia hormética + adrenalina + IL-10 · adaptación autonómica avanzada + estado meditativo profundo por retención prolongada.',
    categories: ['estres', 'inmunologico', 'energia', 'cognitivo', 'ritual'],
    roots: ['deficit_neurotransmisores', 'cortisol_elevado_sostenido', 'estres_cronico', 'inflamacion_silenciosa'],
    assignRule: '⚠️ Adulto sano con WHM básico consolidado ≥8 semanas + sin nuevas contraindicaciones aparecidas. Mismas exclusiones que básico. Foco: adeptos avanzados de breathwork, deportistas de resistencia con base pulmonar, meditadores serios.',
    priority: 3,
    family: 'wim_hof',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'adrenalina plasmática (3-5× baseline · magnitud > básico)',
        'IL-10 (respuesta más marcada por hipoxia sostenida)',
        'HIF-1α + VEGF (angiogénesis por hipoxia intermitente crónica adaptativa)',
        'eritropoyetina EPO (retenciones sostenidas · similar altitude training)',
        'β-endorfinas + anandamida (bliss states documentados)',
        'expresión FOXO3 (retenciones extendidas · hormesis longevidad)',
        'autofagia (hipoxia hormética activa mTORC1 modulation)',
      ],
      inhibits: [
        'TNF-α + IL-6 + IL-8 (magnitud > básico)',
        'nocicepcion (bloqueo endorfínico casi completo durante y post-práctica)',
        'flujo cerebral prefrontal (transitorio · vasoconstricción hipocapnica)',
        'actividad cortical baseline (EEG "silenciamiento" en retención prolongada)',
      ],
      modulates: [
        'PaCO2 (nadir 15-20 mmHg · hipocapnia marcada)',
        'SpO2 (nadir 50-70% en retención larga · hipoxia significativa)',
        'pH sanguíneo (alcalosis marcada pH >7.65 transitorio)',
        'hemoglobina/hematocrito crónicos (leve aumento con práctica sostenida · Bosch efecto EPO)',
        'estado consciencia (theta-alfa dominance en EEG durante retención)',
      ],
      biomarkers: [
        'IL-10_plasmática',
        'EPO_serica_reticulocitos',
        'hemoglobina',
        'hematocrito',
        'PCR_hs',
        'SpO2_nadir_apnea',
        'catecolaminas_orina_24h',
        'HRV RMSSD',
      ],
      mechanismSummary: 'La extensión a 4 rondas de 40 respiraciones + retenciones 1.5-3 min lleva la hipocapnia + hipoxia a magnitudes cercanas a entrenamiento en altitud simulada · dispara EPO endógena adaptativa + potencia todas las vías del básico (IL-10, HIF-1α, endorfinas).',
    },

    sideEffects: [
      'mareo_pronunciado (mayor que básico · sentado siempre)',
      'tetania_carpopedal_marcada',
      'euforia_intensa_bliss_state',
      'sincope_vasovagal (riesgo real · sentado obligatorio)',
      'liberacion_emocional_profunda (llanto, risa, memorias)',
      'dilatacion_temporal_subjetiva',
      'headache_leve_post (por vasoconstricción-reperfusión cerebral)',
    ],

    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'agua_o_cercania_agua',
      'epilepsia_o_historia_convulsiones',
      'embarazo',
      'cardiopatia_isquemica_activa',
      'arritmia_activa',
      'hipertension_maligna_no_controlada',
      'sindrome_qt_largo',
      'trastorno_panico_activo',
      'trastorno_psicotico_activo',
      'diabetes_inestable',
      'aneurisma_cerebral_o_aortico',
      'infarto_miocardio_reciente_<6meses',
      'infarto_cerebral_reciente_<6meses',
      'antecedente_familiar_muerte_subita_cardiaca_no_estudiada',
      'menores_de_18_anos',
      'anemia_severa',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 2.0 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'profile', field: 'whm_basico_8_semanas_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['epilepsia', 'cardiopatia_isquemica', 'arritmia_activa', 'hipertension_maligna', 'sindrome_qt_largo', 'panico_activo', 'trastorno_psicotico', 'aneurisma_conocido', 'anemia_severa'] },
        { source: 'profile', field: 'menor_de_18_anos', equals: true },
        { source: 'lab', marker: 'hemoglobina', operator: '<', value: 10, unit: 'g/dL' },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Kox M et al. PNAS 2014 (referencia base)',
        paradigm: 'western_academic',
        url: 'https://www.pnas.org/doi/10.1073/pnas.1322174111',
      },
      {
        citation: 'Muzik O et al. "Brain over body — A study on the willful regulation of autonomic function during cold exposure" NeuroImage 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29438845/',
      },
      {
        citation: 'Zwaag J et al. Psychosom Med 2022',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35213875/',
      },
      {
        citation: 'Tradición Vajrayana tibetana · gTum-mo con 6 yogas de Naropa · retenciones largas para calor + estados místicos',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Wim Hof + Isabelle Hof "The Wim Hof Method" 2020 · sección advanced protocols',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Kevala Kumbhaka (retención absoluta post-vaciamiento total) · Hatha Yoga Pradipika · nivel avanzado',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Andrew Huberman "Breathing Techniques" · advertencia explícita sobre progresión + agua',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Almahayni & Hammond PLOS One 2024 · revisión crítica',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38466737/',
        paradigmConflict: 'Efecto real pero magnitud sobre-reportada. En extendido, ratio riesgo/beneficio requiere validación caso-por-caso.',
      },
    ],
  },
  {
    key: 'tabla_co2',
    name: 'Tabla CO2 (apnea static · tolerancia)',
    how: '⚠️ Solo en tierra firme, sentado o acostado, jamás en agua sin buddy freediver certificado. Determinar tiempo máximo de apnea cómoda (ej. 1 min). Retenciones de esa duración constante (60 seg) con descansos decrecientes (2:00, 1:45, 1:30, 1:15, 1:00, 0:45, 0:30). Total 8 rondas ≈ 15 min. 3-4×/sem.',
    benefit: 'Entrena quimiorreceptores centrales para tolerar EtCO2 elevado sin activación disneica. Mejora eficiencia respiratoria en reposo (reduce ventilación minuto), aumenta ganancia vagal, y adapta el reflejo respiratorio · útil para atletas de resistencia, buceo, oratoria, foco cognitivo.',
    categories: ['cardiovascular', 'estres', 'cognitivo', 'energia'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'hrv_baja_cronica'],
    assignRule: '⚠️ Adulto sano con base breathwork (box breathing 5-5-5-5 sostenido ≥4 semanas). Foco: deportistas resistencia, buceo/apnea deportivo, atletas mentales, respiradores bucales crónicos. NO embarazo, NO HTA descompensada, NO epilepsia, NO glaucoma, NO panic activo. JAMÁS en agua sin buddy.',
    priority: 3,
    family: 'apnea_tables',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'quimiorreceptor central (adaptación aumento umbral CO2)',
        'tono vagal parasimpático (bradicardia refleja tipo diving reflex parcial)',
        'esplenocontracción (splenic contraction · liberación glóbulos rojos reserva)',
        'baroreflex sensitivity',
        'HIF-1α transitorio (hipoxia leve al final de tabla)',
        'expresión mioglobina muscular (adaptación crónica hipoxia intermitente)',
        'tolerancia acidosis respiratoria',
      ],
      inhibits: [
        'ventilación minuto de reposo (reducción crónica 15-25%)',
        'sensibilidad quimiorreceptor CO2 (deseable · reduce ansiedad respiratoria)',
        'reflejo urgencia respiratoria (raise threshold para "break point")',
        'noradrenalina reactiva a hipercapnia',
      ],
      modulates: [
        'EtCO2 tolerado (aumento 40 → 55-65 mmHg sin distress)',
        'HRV RMSSD (aumento en adaptados)',
        'frecuencia cardíaca reposo (bradicardia adaptativa 3-8 bpm)',
        'capacidad_apnea_estatica (aumento 40-100% en 8-12 semanas)',
        'SpO2 nadir tolerado (adaptación a 88-92% sin activación)',
        'catecolaminas al esfuerzo submáximo (reducción · mejor economía)',
      ],
      biomarkers: [
        'EtCO2 (capnografía)',
        'BOLT score (Body Oxygen Level Test · métrica Buteyko)',
        'capacidad_apnea_estatica_segundos',
        'SpO2_nadir',
        'HRV RMSSD',
        'frecuencia_cardiaca_reposo',
        'VO2max',
        'ventilación_minuto_reposo',
      ],
      mechanismSummary: 'Retenciones estáticas repetidas con descansos progresivamente más cortos acumulan CO2 sanguíneo · entrena al centro respiratorio bulbar a tolerar hipercapnia sin disparar el reflejo disneico · adaptación crónica: menos ventilación baseline, más oxígeno disuelto en tejido, mejor economía respiratoria en ejercicio.',
    },

    sideEffects: [
      'urgencia_respiratoria_creciente (esperada · marca punto de "break")',
      'contracciones_diafragmaticas_involuntarias (esperadas · precursoras del break point)',
      'mareo_leve_post_ronda',
      'somnolencia_transitoria',
      'sensacion_calor_facial (por vasodilatación CO2-mediada)',
      'ansiedad_reactiva (primeros días · resuelve con adaptación)',
    ],

    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'agua_sin_buddy_freediver_certificado',
      'embarazo',
      'epilepsia_o_historia_convulsiones',
      'hipertension_maligna_no_controlada',
      'cardiopatia_isquemica_activa',
      'arritmia_activa',
      'glaucoma_angulo_estrecho',
      'panico_activo_no_tratado',
      'anemia_severa',
      'EPOC_severa',
      'apnea_sueno_severa_no_tratada',
      'antecedente_familiar_muerte_subita_cardiaca',
      'menores_de_18_anos_sin_supervision',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 30 },
        { source: 'quiz', questionnaire: 'respiracion_bucal_cronica', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['epilepsia', 'hipertension_maligna', 'cardiopatia_isquemica', 'arritmia_activa', 'glaucoma_angulo_estrecho', 'panico_activo', 'anemia_severa', 'epoc_severa'] },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Woorons X et al. "Exercise with hypoventilation at low pulmonary volumes" Sci Sports 2010',
        paradigm: 'western_academic',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S0765159710001085',
      },
      {
        citation: 'Elia A et al. "Physiological adaptations to breath-hold diving" Eur J Appl Physiol 2021',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34059956/',
      },
      {
        citation: 'Buteyko KP · método Buteyko (1960s URSS) · reducción ventilación crónica + tolerancia CO2 como intervención asma/ansiedad',
        paradigm: 'russian_academic',
      },
      {
        citation: 'McKeown P "The Oxygen Advantage" 2015 · sistematización moderna del training tolerancia CO2',
        paradigm: 'functional_independent',
      },
      {
        citation: 'AIDA International · protocolos oficiales apnea static training con tablas CO2/O2 · Freediving Manual (Kirk Krack, Performance Freediving)',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Kumbhaka pranayama con retención post-inhalación (Antar) · ratio 1:4:2 Hatha Yoga Pradipika',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Divers Alert Network + WHO freediving safety · advertencia contra apnea training en agua sin supervisión',
        paradigm: 'mechanistic',
      },
      {
        citation: 'Andrew Huberman "Breathwork protocols" · CO2 tolerance como métrica maestra de fitness respiratorio',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'tabla_o2',
    name: 'Tabla O2 (apnea static · capacidad)',
    how: '⚠️ Tierra firme, buddy recomendado. Requiere adaptación previa a tabla CO2 ≥8 semanas. Retenciones crecientes con descanso fijo (2 min descanso · retención 0:30, 0:45, 1:00, 1:15, 1:30, 1:45, 2:00, 2:15). Total 8 rondas ≈ 25 min. 2-3×/sem. Progresar +15 seg/semana según tolerancia.',
    benefit: 'Entrena capacidad pulmonar total + tolerancia hipoxia sostenida + adaptación esplénica (splenic reservoir de eritrocitos). Aumenta capacidad apnea máxima 2-4× baseline. Adaptación cardiovascular tipo altitud simulada.',
    categories: ['cardiovascular', 'estres', 'cognitivo', 'energia'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'hrv_baja_cronica'],
    assignRule: '⚠️ Adulto sano con base tabla CO2 consolidada ≥8 semanas + capacidad apnea cómoda ≥2 min. Foco: freedivers, atletas de resistencia serios, alpinistas (preparación altitud), triatletas. Mismas exclusiones que tabla CO2.',
    priority: 3,
    family: 'apnea_tables',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'esplenocontracción sostenida (liberación 15-20% eritrocitos reserva · Bakovic 2003)',
        'HIF-1α robusto (hipoxia sostenida)',
        'eritropoyetina EPO (hipoxia intermitente crónica · similar altitude training)',
        'VEGF (angiogénesis muscular + cerebral)',
        'expresión mioglobina + hemoglobina (respuesta hipoxia adaptativa)',
        'PGC-1α mitocondrial (biogénesis por hipoxia hormética)',
        'BDNF post-práctica (documented apnea training)',
        'tono vagal (bradicardia refleja tipo dive reflex parcial)',
      ],
      inhibits: [
        'ventilación minuto reposo (adaptación crónica 20-30%)',
        'consumo oxígeno basal (economía metabólica)',
        'ansiedad_respiratoria basal',
        'reflex disneico prematuro',
      ],
      modulates: [
        'capacidad_apnea_estatica_maxima (2-4× baseline en 12 semanas)',
        'hematocrito (aumento leve sostenido 2-3%)',
        'hemoglobina (aumento 0.5-1 g/dL con práctica sostenida)',
        'VO2max (mejora indirecta por economía respiratoria)',
        'SpO2_nadir_tolerado (adaptación a 75-85% sin activación)',
        'diámetro esplénico (contracción activa medible por US)',
      ],
      biomarkers: [
        'capacidad_apnea_estatica_segundos',
        'hemoglobina',
        'hematocrito',
        'EPO_serica',
        'SpO2_nadir',
        'VO2max',
        'BDNF_serico',
        'HRV RMSSD',
      ],
      mechanismSummary: 'Retenciones progresivamente más largas con descanso fijo llevan al cuerpo a hipoxia sostenida controlada · dispara esplenocontracción (splenic reservoir · liberación eritrocitos), HIF-1α → EPO endógena crónica, y VEGF angiogénesis. Adaptación cercana a entrenamiento en altitud sin viajar.',
    },

    sideEffects: [
      'urgencia_respiratoria_severa (esperada · nunca ignorar el break point real)',
      'contracciones_diafragmaticas_marcadas',
      'mareo_post_apnea_maxima',
      'euforia_transitoria (endorfinas por hipoxia)',
      'sensacion_calor_fiebre_leve (respuesta simpática)',
      'somnolencia_pronunciada_post_sesion',
      'headache_leve_post (por reperfusión cerebral)',
    ],

    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'agua_sin_buddy_freediver',
      'embarazo',
      'epilepsia_o_convulsiones',
      'hipertension_maligna_no_controlada',
      'cardiopatia_isquemica',
      'arritmia_activa',
      'glaucoma_angulo_estrecho',
      'panico_activo',
      'anemia_severa',
      'EPOC_severa',
      'apnea_sueño_severa_no_tratada',
      'antecedente_familiar_muerte_subita_cardiaca',
      'menores_de_18_anos',
      'esplenectomia_previa',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'tabla_co2_8_semanas_o_mas', equals: true },
        { source: 'profile', field: 'apnea_max_120s_o_mas', equals: true },
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['epilepsia', 'hipertension_maligna', 'cardiopatia_isquemica', 'arritmia_activa', 'glaucoma_angulo_estrecho', 'panico_activo', 'anemia_severa', 'epoc_severa', 'esplenectomia'] },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Bakovic D et al. "Spleen volume and blood flow response to repeated breath-hold apneas" J Appl Physiol 2003',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12909609/',
      },
      {
        citation: 'Elia A et al. Eur J Appl Physiol 2021 · adaptación training apnea',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34059956/',
      },
    ],
  },
  {
    key: 'hiperventilacion_matutina',
    name: 'Hiperventilación controlada matutina',
    how: '⚠️ Sentado, tierra firme, jamás en agua/ducha. Al despertar: 30-40 respiraciones rápidas y profundas (inhalación completa 2 seg, exhalación pasiva 1 seg) → exhalación completa y retención en vacío 15-30 seg → respiración normal. 1-2 rondas máximo. Nunca combinar con conducir/operar maquinaria.',
    benefit: 'Descarga simpática matutina controlada · dispara adrenalina + dopamina, resetea cortisol matutino aplanado, incrementa alerta cognitiva y activa retinofugal projection ipRGC. Alternativa funcional para amanecer con bajo drive en cronotipos oso/lobo con cortisol AM bajo.',
    categories: ['energia', 'cognitivo', 'ritual'],
    roots: ['cortisol_matutino_bajo', 'deficit_neurotransmisores', 'ritmo_circadiano_desregulado'],
    assignRule: '⚠️ Adulto sano con cortisol matutino bajo confirmado o síntomas de "arranque lento matutino". NO embarazo, NO epilepsia, NO arritmias, NO panic, NO glaucoma. Alternativa suave: coherencia cardíaca AM. Alternativa fría: dive reflex cara hielo.',
    priority: 3,
    timeOfDay: 'morning',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'adrenalina + noradrenalina (subida aguda 100-200% baseline matutina)',
        'dopamina estriatal (subida documentada post-hiperventilación breve)',
        'cortisol matutino CAR (amplificación de Cortisol Awakening Response)',
        'histamina cerebral (alerta matutina)',
        'locus coeruleus (activación NA cerebral)',
        'tono simpático agudo (efecto opuesto al vagal · matutino intencional)',
      ],
      inhibits: [
        'melatonina residual matutina (via alerta + norepinefrina)',
        'inercia sueño (sleep inertia)',
        'somnolencia diurna transitoria',
      ],
      modulates: [
        'PaCO2 (caída aguda a 25-30 mmHg)',
        'pH sanguíneo (alcalosis respiratoria transitoria pH 7.5)',
        'flujo cerebral prefrontal (vasoconstricción hipocapnica seguida de reperfusión)',
        'estado alerta / arousal (aumento agudo GAS · Global Arousal State)',
        'temperatura core (leve aumento por descarga simpática)',
      ],
      biomarkers: [
        'cortisol_matutino_salival',
        'CAR (cortisol awakening response)',
        'catecolaminas_orina_24h',
        'EtCO2',
        'HRV RMSSD (transitoria caída durante, recuperación post)',
        'test_reaccion_ms (mejora post-práctica)',
      ],
      mechanismSummary: 'Hiperventilación controlada breve al despertar induce alcalosis respiratoria leve + descarga catecolaminérgica cerebral (locus coeruleus) · amplifica el CAR (cortisol awakening response) fisiológico y actúa como "encendido" del sistema arousal. La retención en vacío final normaliza CO2 antes de terminar.',
    },

    sideEffects: [
      'mareo_transitorio (esperable)',
      'hormigueo_manos_labios (tetania leve alcalosis · benigna)',
      'sensacion_calor_facial (vasodilatación paradójica capilar)',
      'euforia_leve_matutina',
      'sequedad_bucal_transitoria',
    ],

    contraindications: [
      'agua_o_ducha (shallow water blackout letal)',
      'epilepsia_o_historia_convulsiones',
      'embarazo',
      'arritmia_activa',
      'hipertension_maligna_no_controlada',
      'cardiopatia_isquemica_activa',
      'panico_activo',
      'trastorno_psicotico_activo',
      'glaucoma_angulo_estrecho',
      'menores_de_16_anos',
      'antecedente_familiar_muerte_subita_cardiaca',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'cortisol_matutino_salival', operator: '<', value: 10, unit: 'nmol/L' },
        { source: 'chronotype', type: 'oso' },
        { source: 'chronotype', type: 'lobo' },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
        { source: 'quiz', questionnaire: 'energia_matutina', score: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['epilepsia', 'arritmia_activa', 'hipertension_maligna', 'cardiopatia_isquemica', 'panico_activo', 'trastorno_psicotico', 'glaucoma_angulo_estrecho'] },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Balban MY et al. "Brief structured respiration practices enhance mood and reduce physiological arousal" Cell Reports Medicine 2023 · cyclic hyperventilation entre las técnicas testadas',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
        industryFunded: false,
      },
      {
        citation: 'Kox M et al. PNAS 2014 · componente respiratorio WHM basado en hiperventilación matutina',
        paradigm: 'western_academic',
        url: 'https://www.pnas.org/doi/10.1073/pnas.1322174111',
      },
      {
        citation: 'Andrew Huberman "Physiological Sigh + Cyclic Hyperventilation" HubermanLab · uso matutino específico',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Bhastrika Pranayama matutina (respiración de fuelle) · Kapalabhati (breath of fire) parte de Shatkarma matinal · Gheranda Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC / Qigong · Ba Duan Jin (8 piezas de brocado) matutinos · secuencia de respiración estimulante para activar Yang matutino',
        paradigm: 'tcm',
      },
      {
        citation: 'Nestor J "Breath" 2020 · sección sobre respiración estimulante matutina',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Divers Alert Network · advertencia hiperventilación pre-apnea = causa evitable primaria de shallow water blackout',
        paradigm: 'mechanistic',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRÍO / CALOR / TERMORREGULACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'ducha_fria_nivel1',
    name: 'Ducha fría · nivel 1 (30-90 seg final)',
    how: 'Termina la ducha tibia con 30-90 segundos de agua fría (15-18°C · temperatura de red típica invernal). Respirar por la nariz, exhalación larga. Dirigir chorro primero a piernas, luego torso, cara al final. Diaria, matutina.',
    benefit: 'Introducción hormética al frío · activa grasa parda, dispara dopamina + norepinefrina agudas, resetea sistema simpático matutino · protocolo Buijze 2016 mostró 29% menos ausentismo laboral con 30-90 seg diarios × 30 días.',
    categories: ['energia', 'estres', 'inmunologico', 'cognitivo', 'cardiovascular'],
    roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'sedentarismo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Adulto sano sin hipertensión descontrolada, arritmias, Raynaud severo o embarazo. Punto de entrada al frío para principiantes absolutos.',
    priority: 3,
    family: 'ducha_fria',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 tejido adiposo pardo (activación aguda modest, chronic si repetido)',
        'noradrenalina plasmática (aumento agudo 200-300%)',
        'dopamina estriatal (aumento sostenido post 1-2h · Šrámek 2000)',
        'β3-adrenergic receptor signaling',
        'CIRP (cold-inducible RNA-binding protein · protector neural)',
        'HIF-1α leve por vasoconstricción periférica',
        'inmunocompetencia (Buijze: 29% menos ausentismo, señal IgA + linfocitos NK)',
        'termogénesis no-shivering leve',
      ],
      inhibits: [
        'expresión NF-κB (dosis-dependiente vs cold plunge intenso)',
        'somnolencia matutina residual',
        'sensación de fatiga generalizada matutina',
      ],
      modulates: [
        'HRV (respuesta variable · leve mejora crónica)',
        'tono vagal (post-adaptación)',
        'cortisol_ritmo (amplificación leve CAR matutino)',
        'temperatura core (drop temporal 0.1-0.3°C · rebote)',
        'sensibilidad insulina (efecto crónico modest documentado)',
        'estado ánimo (efecto anti-depresivo leve documentado Shevchuk 2008)',
      ],
      biomarkers: [
        'HRV RMSSD',
        'PCR_hs',
        'IgA_secretora_saliva',
        'cortisol_matutino_salival',
        'catecolaminas_orina_24h',
        'linfocitos_NK_count',
        'presion_arterial_matutina',
      ],
      mechanismSummary: 'Choque frío breve final activa termorreceptores TRPM8 cutáneos → señal simpática ascendente → descarga noradrenalina/dopamina cerebral · activación aguda UCP1 en BAT + hormesis inmune sub-clínica. Menor magnitud que inmersión pero suficiente para adaptación y adherencia diaria.',
    },

    sideEffects: [
      'shock_termico_inicial (jadeo reflejo · esperado)',
      'hiperventilacion_transitoria (controlar con exhalación larga)',
      'enrojecimiento_piel (histamina release · benigno)',
      'euforia_post_ducha (dopamina residual · 1-2h)',
      'sensacion_frio_prolongada (si duración >90 seg sin adaptación)',
    ],

    contraindications: [
      'hipertension_maligna_no_controlada',
      'arritmia_activa',
      'raynaud_severo',
      'urticaria_a_frigore_confirmada',
      'crioglobulinemia',
      'embarazo (relativa · aire tibio + solo piernas 20 seg si necesario)',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'energia', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
        { source: 'chronotype', type: 'oso' },
        { source: 'chronotype', type: 'lobo' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hipertension_maligna', 'arritmia_activa', 'raynaud_severo', 'urticaria_frio', 'crioglobulinemia'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Buijze GA et al. "The Effect of Cold Showering on Health and Work: A Randomized Controlled Trial" PLOS One 2016 · N=3018, 30-90 seg × 30 días · -29% ausentismo laboral',
        paradigm: 'western_academic',
        url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0161749',
        industryFunded: false,
      },
      {
        citation: 'Šrámek P et al. "Human physiological responses to immersion into water of different temperatures" Eur J Appl Physiol 2000 · noradrenalina 530% en 14°C',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10751106/',
      },
      {
        citation: 'Shevchuk NA "Adapted cold shower as a potential treatment for depression" Med Hypotheses 2008 · mecanismo dopaminérgico + β-endorfinas',
        paradigm: 'mechanistic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17993252/',
      },
      {
        citation: 'Andrew Huberman "Cold Exposure Protocols" HubermanLab · shower como entry point',
        paradigm: 'functional_independent',
        url: 'https://www.hubermanlab.com/episode/the-science-and-use-of-cold-exposure-for-health-and-performance',
      },
      {
        citation: 'Rhonda Patrick "Cold Exposure" FMF topic · shower como dosis mínima efectiva',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Sebastian Kneipp "Meine Wasserkur" 1886 · Kaltguss (chorro frío gradual desde pies) · fundacional hidroterapia europea',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Tradición rusa · zakalivanie (закаливание) pediátrico y adulto · Suvórov s.XVIII, institucionalizado URSS',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Sheetodaka Snana (baño con agua fresca) matutina en constituciones Pitta · Dinacharya Charaka Samhita',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'ducha_fria_nivel2',
    name: 'Ducha fría · nivel 2 (2-3 min final)',
    how: 'Termina la ducha con 2-3 minutos de agua fría (12-15°C). Cara + torso incluidos. Respiración nasal profunda, exhalación larga. Diaria, matutina. Requiere adaptación previa a nivel 1 ≥3 semanas.',
    benefit: 'Dosis intermedia dentro del "punto dulce Søberg" (~11 min/semana) · potencia activación BAT + biogénesis mitocondrial vía PGC-1α + adaptación autonómica sostenida.',
    categories: ['energia', 'estres', 'inmunologico', 'cognitivo', 'cardiovascular', 'metabolismo'],
    roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'sedentarismo', 'inflamacion_silenciosa', 'ritmo_circadiano_desregulado'],
    assignRule: 'Adulto sano que tolera nivel 1 sistemáticamente ≥3 semanas. Mismas exclusiones cardiovasculares.',
    priority: 3,
    family: 'ducha_fria',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 (activación crónica sostenida con dosis 2-3 min diarios)',
        'PGC-1α (biogénesis mitocondrial · dosis-dependiente)',
        'noradrenalina + dopamina (magnitud mayor que nivel 1)',
        'browning WAT → beige (adaptación crónica documentada)',
        'IgA salival (Buijze señalización inmune)',
        'CIRP + HSP32 (respuesta térmica cruzada)',
      ],
      inhibits: [
        'NF-κB muscular (post-crónica)',
        'IL-6 basal',
        'sensación fatiga baseline',
      ],
      modulates: [
        'HRV RMSSD (mejora crónica documentada)',
        'sensibilidad insulina (Søberg 2021 análog)',
        'sueño profundo % (mejora indirecta por regulación autonómica)',
        'termorregulación (adaptación a temperatura ambiental)',
        'estado ánimo baseline',
      ],
      biomarkers: [
        'HRV RMSSD',
        'PCR_hs',
        'HOMA-IR',
        'IgA_secretora_saliva',
        'temperatura_corporal_delta',
        'sueño_profundo_horas',
      ],
      mechanismSummary: 'Extensión temporal (2-3 min vs <90 seg) desplaza la dosis semanal hacia el "sweet spot" de 8-12 min identificado por Søberg 2021 para activación crónica sostenida de BAT y adaptación autonómica sin cruzar el umbral de stress excesivo.',
    },

    sideEffects: [
      'shock_termico_inicial (persistente aún en adaptados)',
      'sensacion_frio_prolongada_post (30-60 min)',
      'enrojecimiento_piel + prurito_leve (histamina)',
      'euforia_prolongada_post',
      'ligero_temblor_terminal (si duración excesiva sin adaptación)',
    ],

    contraindications: [
      'hipertension_maligna_no_controlada',
      'arritmia_activa',
      'raynaud_severo',
      'urticaria_a_frigore',
      'crioglobulinemia',
      'embarazo',
      'anorexia_activa (riesgo hipotermia por baja masa corporal)',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'energia', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hipertension_maligna', 'arritmia_activa', 'raynaud_severo', 'urticaria_frio', 'anorexia_activa'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Søberg S et al. "Altered brown fat thermoregulation and enhanced cold-induced thermogenesis in young, healthy, winter-swimming men" Cell Reports Medicine 2021 · protocolo dosis-respuesta 11 min/sem',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34614051/',
      },
      {
        citation: 'Buijze GA et al. PLOS One 2016 (grupos 60 y 90 seg validaron dosis)',
        paradigm: 'western_academic',
        url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0161749',
      },
      {
        citation: 'Hohenauer E et al. "Potential health benefits of cold-water immersion: the central role of PGC-1α" J Physiol 2025',
        paradigm: 'western_academic',
        url: 'https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP289536',
      },
      {
        citation: 'Andrew Huberman "Cold Exposure Protocols" HubermanLab episodio 66',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Rhonda Patrick FMF "Cold Exposure" topic report',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición rusa · Zakalivanie protocolo escalonado adulto · Sechenov Institute',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Kneipp · progresión Wechseldusche (ducha alternada) niveles intermedios',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Sheetodaka Snana progresiva en constituciones Pitta/Kapha',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'ducha_fria_nivel3',
    name: 'Ducha fría completa (5-10 min)',
    how: 'Ducha completamente fría desde el inicio (10-15°C · dependiente de red), 5-10 min total. Cara + cabeza + torso + extremidades. Respiración nasal disciplinada. Diaria, matutina. Requiere adaptación consolidada a nivel 2 ≥6 semanas. · Idealmente 30-60 min ANTES de sesión de fuerza para óptimo perfil hormonal (testosterona + GH). Si post-fuerza, esperar ≥6h (cold post-fuerza <6h atenúa mTOR/hipertrofia).',
    benefit: 'Dosis semanal alta (~35-70 min) · adaptación autonómica avanzada, activación robusta UCP1 crónica, entrenamiento CNS bajo estrés controlado diario. Alternativa práctica a cold plunge para quien no tiene tina.',
    categories: ['energia', 'estres', 'inmunologico', 'cognitivo', 'cardiovascular', 'metabolismo'],
    roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'sedentarismo', 'inflamacion_silenciosa'],
    assignRule: 'Adulto sano avanzado (tolera nivel 2 ≥6 semanas). Foco: entrenamiento resiliencia CNS diaria, sustituto de cold plunge, adaptación autonómica sostenida. Timing recomendado: PRE-fuerza para perfil hormonal, o ≥6h post-fuerza.',
    priority: 3,
    family: 'ducha_fria',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 crónico robusto',
        'PGC-1α (biogénesis mitocondrial crónica documentada Hohenauer 2025)',
        'browning WAT sostenido (BAT volumen incrementable · Chondronikola 2014)',
        'noradrenalina + dopamina + endorfinas (dosis mayor)',
        'HIF-1α + VEGF muscular',
        'inmunocompetencia sostenida',
        'expresión antioxidantes endógenos (SOD, catalasa vía Nrf2)',
      ],
      inhibits: [
        'NF-κB crónico',
        'IL-6 baseline',
        'resistencia insulina (mejora HOMA-IR)',
        'sensacion fatiga diurna baseline',
      ],
      modulates: [
        'HRV RMSSD (mejora significativa 4-8 semanas)',
        'sensibilidad insulina',
        'función tiroidea (T4→T3 conversión periférica)',
        'termogénesis basal (aumento 5-10% documentado)',
        'sueño profundo',
        'estado ánimo baseline (efecto antidepresivo modest)',
      ],
      biomarkers: [
        'HRV RMSSD',
        'PCR_hs',
        'HOMA-IR',
        'glucosa_ayunas',
        'T3_libre',
        'temperatura_corporal_delta',
        'NEFA_no_esterificados',
        'succinato_plasmático',
      ],
      mechanismSummary: 'Ducha completa 5-10 min diaria cruza el umbral de dosis semanal donde las adaptaciones crónicas (biogénesis mitocondrial, browning WAT, adaptación autonómica) se consolidan estables · similar en outcome cardiometabólico a inmersión 10-15°C 2×/sem, más práctico para casa sin tina.',
    },

    sideEffects: [
      'shock_termico_marcado_inicial',
      'temblor_moderado_terminal (si tolerancia insuficiente)',
      'sensacion_frio_prolongada_60-90min post',
      'euforia_marcada_post',
      'sequedad_piel_crónica (por remoción sebo · hidratar cuerpo)',
      'sensibilidad_dental_transitoria (si agua muy fría en cara)',
    ],

    contraindications: [
      'hipertension_maligna_no_controlada',
      'arritmia_activa',
      'raynaud_severo',
      'urticaria_a_frigore',
      'crioglobulinemia',
      'embarazo',
      'anorexia_activa',
      'hipotiroidismo_severo_no_tratado (empeora sensación fría crónica)',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hipertension_maligna', 'arritmia_activa', 'raynaud_severo', 'urticaria_frio', 'anorexia_activa', 'hipotiroidismo_severo_no_tratado'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Søberg S et al. Cell Reports Medicine 2021 (referencia dosis)',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34614051/',
      },
      {
        citation: 'Chondronikola M et al. "Brown adipose tissue improves whole-body glucose homeostasis and insulin sensitivity in humans" Diabetes 2014',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25024258/',
      },
      {
        citation: 'Hohenauer E et al. J Physiol 2025 (PGC-1α biogénesis mitocondrial)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Kox M et al. PNAS 2014 (componente frío WHM crónico)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Wim Hof Method · ducha fría diaria como práctica fundacional',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Cold Exposure" · ducha completa como sustituto de cold plunge doméstico',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición rusa · Zakalivanie avanzado en programas deportivos élite',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Ernesto Prieto Gratacós · bioeléctrica hormesis frío para densidad mitocondrial',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'sauna_infrarrojo',
    name: 'Sauna infrarrojo lejano (FIR) 30-45 min · 45-60°C',
    how: '30-45 min a 45-60°C en sauna infrarrojo lejano (FIR · panel emisor 3-100µm), 3-5 sesiones/semana. Hidratar 500 ml antes + electrolitos post. Idealmente ropa mínima. Sesión aislada de sauna finlandesa (no combinar mismo día).',
    benefit: 'Alternativa térmica de menor stress cardiovascular · penetración FIR (hasta 4 cm) genera calentamiento tisular profundo con temperatura ambiental menor · válida para intolerantes a calor extremo, cardiópatas leves compensados y protocolos combinados con luz roja. Evidencia Waon (Masuda) en insuficiencia cardíaca + Beever 2009 review.',
    categories: ['cardiovascular', 'inmunologico', 'inflamacion', 'ritual', 'piel', 'energia', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'toxicidad_ambiental', 'sedentarismo', 'cortisol_elevado_sostenido', 'disfuncion_mitocondrial'],
    assignRule: 'Adulto sin arritmias descompensadas, embarazo, HTA descontrolada. Flag P1 si: inflamación crónica, burnout, intolerancia a sauna finlandesa (mayor tolerabilidad), post-ejercicio recovery, ISS (insuficiencia cardíaca compensada · Waon evidence).',
    priority: 2,
    family: 'sauna',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'HSP70 + HSP32 (menor magnitud que finlandesa · pero real)',
        'HSF1',
        'óxido nítrico endotelial (eNOS · vasodilatación crónica documentada Masuda)',
        'expresión eNOS + iNOS (Masuda Waon en falla cardíaca)',
        'BDNF (leve aumento post-sesión)',
        'PGC-1α muscular (por efecto cardio pasivo)',
        'expresión FOXO3 (por hormesis térmica)',
        'melanogenesis + fibroblastos dérmicos (Barolet 2016 · efecto beneficio piel)',
      ],
      inhibits: [
        'BNP + NT-proBNP (Masuda en falla cardíaca · Waon protocol)',
        'PCR_hs crónico (efecto menor que finlandesa)',
        'endotelina-1 (mejora función endotelial)',
        'rigidez arterial (aumento distensibilidad)',
        'presión arterial (5-10 mmHg en HTA leve · Beever)',
      ],
      modulates: [
        'función endotelial FMD (mejora documentada Masuda 2005)',
        'sudoración eficiente (más profusa a menor temperatura ambiental)',
        'excreción metales pesados vía sudor (Sears 2012)',
        'HRV RMSSD (mejora crónica)',
        'temperatura core (aumento 0.5-1°C · menor que finlandesa)',
        'volumen plasmático (expansión adaptativa)',
      ],
      biomarkers: [
        'presion_arterial_sistolica',
        'FMD (flow-mediated dilation)',
        'BNP',
        'PCR_hs',
        'HRV RMSSD',
        'HSP70_sérico',
        'oxido_nitrico_plasmatico_metabolitos',
        'homocisteina',
      ],
      mechanismSummary: 'FIR 45-60°C eleva temperatura corporal 0.5-1°C con penetración radiante hasta 4 cm subcutáneo · induce vasodilatación óxido-nítrico-mediada (Waon protocol Masuda), sube HSP70/HSF1 (menor magnitud que finlandesa) y activa cardio pasivo compensatorio · seguridad extra en cardiópatas compensados (evidencia Waon en NYHA II-III con reducción BNP + mejora capacidad funcional).',
    },

    sideEffects: [
      'deshidratacion_transitoria (sudoración profusa)',
      'perdida_electrolitos',
      'hipotension_ortostatica_transitoria',
      'cefalea_leve (si sub-hidratado)',
      'somnolencia_post',
      'rubor_persistente',
      'sequedad_piel (compensar con hidratación)',
      'menor_percepcion_calor_que_finlandesa (paradoja térmica · no confundir con "menos efectivo")',
    ],

    contraindications: [
      'embarazo (1er trimestre absoluta · 2do-3er relativa)',
      'cardiopatia_isquemica_no_controlada',
      'arritmia_ventricular_activa',
      'insuficiencia_cardiaca_NYHA_IV_descompensada',
      'infarto_miocardio_reciente_<3meses',
      'hipotension_severa_sintomática_<90/60',
      'deshidratacion_severa_activa',
      'fiebre_activa_infecciosa_>38.5',
      'intoxicacion_etilica_o_estupefacientes',
      'implantes_metálicos_extensos (calentamiento potencial · relativo)',
      'epilepsia_no_controlada',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'presion_arterial_sistolica', operator: '>=', value: 130 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'profile', field: 'intolerancia_sauna_finlandesa', equals: true },
        { source: 'profile', field: 'condiciones', in: ['insuficiencia_cardiaca_compensada_nyha_ii'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_no_controlada', 'arritmia_ventricular_activa', 'insuficiencia_cardiaca_nyha_iv', 'infarto_reciente_3m', 'hipotension_severa_sintomática', 'epilepsia_no_controlada'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Beever R "Far-infrared saunas for treatment of cardiovascular risk factors: summary of published evidence" Can Fam Physician 2009',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19602651/',
        industryFunded: false,
      },
      {
        citation: 'Masuda A et al. "The effects of repeated thermal therapy for patients with chronic pain" Psychother Psychosom 2005 · protocolo Waon',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16088265/',
      },
      {
        citation: 'Kihara T et al. "Waon therapy improves the prognosis of patients with chronic heart failure" J Cardiol 2009 · reducción mortalidad NYHA II-III',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19345875/',
      },
      {
        citation: 'Sears ME et al. "Arsenic, cadmium, lead, and mercury in sweat: a systematic review" J Environ Public Health 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22505948/',
      },
      {
        citation: 'Rhonda Patrick FMF "Sauna" report · sección infrarrojo vs finlandesa · postura honesta (IR no equivale a finlandesa en outcome de mortalidad KIHD)',
        paradigm: 'functional_independent',
        paradigmConflict: 'La evidencia KIHD de mortalidad cardiovascular es EXCLUSIVAMENTE con finlandesa 80-100°C. Infrarrojo tiene evidencia real pero menor. Transparencia obligatoria.',
      },
      {
        citation: 'Ayurveda · Swedana (sudoterapia) Panchakarma · variante Nadi swedana (vapor localizado) más cercana a IR que finlandesa · Charaka Samhita Sutra Sthana 14',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · práctica de Fa Han (sudación terapéutica) con moxibustión + calor infrarrojo tradicional (moxa · Artemisia vulgaris calentando meridianos)',
        paradigm: 'tcm',
      },
      {
        citation: 'Tradición temazcal mesoamericano · vapor con hierbas · calor radiante + ceremonial · Bernardino de Sahagún Codex Florentino documentó',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Barolet D et al. "Infrared and skin: Friend or foe" J Photochem Photobiol B 2016 · efectos dermatológicos IR + fotobiomodulación',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26745730/',
      },
    ],
  },
  {
    key: 'sauna_finlandesa',
    name: 'Sauna finlandesa (seca) 15-20 min · 80-90°C',
    how: '15-20 min de exposición a sauna seca 80-90°C (löyly opcional para humedad puntual) · 3-7 sesiones/semana según base · hidratar 500 ml antes + electrolitos post · opcional inmersión fría breve al terminar para efecto contraste. Base: iniciar con 5-10 min y progresar.',
    benefit: 'La intervención con mejor evidencia de reducción de mortalidad cardiovascular en humanos (KIHD cohort · 4-7 sesiones/sem → 50-63% menor riesgo). Simula ejercicio cardiovascular pasivo, induce heat shock proteins, mejora función endotelial, aumenta HRV y modula inflamación.',
    categories: ['cardiovascular', 'inmunologico', 'inflamacion', 'ritual', 'energia', 'estres'],
    roots: ['inflamacion_silenciosa', 'toxicidad_ambiental', 'sedentarismo', 'cortisol_elevado_sostenido', 'hipertension'],
    assignRule: 'Adulto sano con base previa en sauna (progresión desde 5-10 min). Flag P1 si: sedentarismo forzado, inflamación crónica, HTA leve-moderada controlada, burnout, exposición ambiental tóxica ocupacional. Iniciar con médico si cardiópata.',
    priority: 2,
    family: 'sauna',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'HSP70 y HSP32 (heat shock proteins · chaperonas anti-agregación proteica)',
        'HSF1 (heat shock factor 1 · master regulator del programa térmico)',
        'expresión FOXO3 (longevity gene · reparación DNA + autofagia)',
        'óxido nítrico endotelial (eNOS · vasodilatación crónica)',
        'BDNF (aumento post-sesión documentado)',
        'norepinefrina y β-endorfinas (analgesia + euforia post)',
        'PGC-1α muscular (contracción cardiaca compensatoria similar a cardio moderado)',
        'autofagia (via activación FOXO3 + mTOR modulation)',
        'IGF-1 sistémico',
        'GH nocturno post-sesión vespertina',
      ],
      inhibits: [
        'IL-6 crónica y PCR-hs (Laukkanen 2018)',
        'fibrinógeno plasmático',
        'agregación plaquetaria excesiva',
        'expresión NF-κB crónica en endotelio',
        'presión arterial (reducción 5-10 mmHg sistólica en HTA leve)',
        'rigidez arterial (aumento distensibilidad · pulso onda velocidad reducida)',
        'proteínas mal plegadas (via chaperonas HSP · protección neurodegenerativa)',
      ],
      modulates: [
        'función endotelial (mejora FMD · flow-mediated dilation)',
        'HRV (aumento con adaptación crónica)',
        'termorregulación (aclimatación al calor)',
        'volumen plasmático (expansión crónica · similar a cardio aeróbico)',
        'sudoración eficiente (aumento tasa sudoración adaptativa)',
        'excreción de metales pesados vía sudor (plomo, mercurio, cadmio)',
        'ratio hemoglobina/hematocrito (expansión plasma → dilución fisiológica)',
        'cortisol_ritmo (mejora curva en usuarios crónicos)',
      ],
      biomarkers: [
        'presion_arterial_sistolica',
        'presion_arterial_diastolica',
        'PCR_hs',
        'IL_6',
        'fibrinogeno',
        'HRV_RMSSD',
        'FMD_flow_mediated_dilation',
        'HSP70_serico',
        'BDNF_serico',
        'homocisteina',
        'succinato_plasmatico',
      ],
      mechanismSummary: 'La exposición prolongada a 80-90°C eleva la temperatura corporal 1-2°C simulando fiebre controlada · activa HSF1 → HSP70 (chaperonas que protegen proteínas), induce vasodilatación óxido-nítrico-mediada, aumenta el gasto cardiaco 60-70% (equivalente a ejercicio moderado) y produce aclimatación cardiovascular crónica que reduce mortalidad de forma dosis-dependiente.',
    },

    sideEffects: [
      'deshidratacion_transitoria_500_1500ml_sudor_por_sesion',
      'perdida_electrolitos_sodio_potasio_magnesio',
      'hipotension_ortostatica_transitoria',
      'cefalea_leve_por_deshidratacion',
      'somnolencia_post_efecto_gh_bdnf',
      'rubor_persistente_30min_vasodilatacion',
      'aumento_frecuencia_cardiaca_60_70_pct_sesion',
    ],

    contraindications: [
      'embarazo_primer_trimestre_riesgo_tubo_neural',
      'cardiopatia_isquemica_activa_no_controlada',
      'arritmia_ventricular_activa',
      'insuficiencia_cardiaca_nyha_iii_iv_descompensada',
      'infarto_miocardio_reciente_menor_3_meses',
      'hipotension_severa_sintomatica',
      'estenosis_aortica_severa',
      'deshidratacion_severa_activa',
      'fiebre_activa_infecciosa_mayor_38_5',
      'intoxicacion_etilica_o_estupefacientes',
      'epilepsia_no_controlada',
      'infarto_cerebral_reciente_menor_3_meses',
      'trombocitopenia_severa',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'lab', marker: 'presion_arterial_sistolica', operator: '>=', value: 130 },
        { source: 'lab', marker: 'fibrinogeno', operator: '>=', value: 350, unit: 'mg/dL' },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'profile', field: 'sedentarismo_forzado', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_activa', 'insuficiencia_cardiaca_severa', 'estenosis_aortica_severa', 'infarto_reciente_3m', 'hipotension_severa_sintomatica', 'epilepsia_no_controlada'] },
        { source: 'lab', marker: 'presion_arterial_sistolica', operator: '<', value: 90 },
      ],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Laukkanen T, Khan H, Zaccardi F, Laukkanen JA "Association between sauna bathing and fatal cardiovascular and all-cause mortality events" JAMA Intern Med 2015 · cohort KIHD 2315 hombres finlandeses',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25705824/',
        industryFunded: false,
      },
      {
        citation: 'Laukkanen JA et al. "Sauna bathing is inversely associated with dementia and Alzheimer\'s disease" Age Ageing 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27932366/',
        industryFunded: false,
      },
      {
        citation: 'Kunutsor SK, Laukkanen T, Laukkanen JA "Inflammation, sauna bathing, and all-cause mortality in middle-aged and older Finnish men" Eur J Epidemiol 2022',
        paradigm: 'western_academic',
        url: 'https://link.springer.com/article/10.1007/s10654-022-00926-w',
        industryFunded: false,
      },
      {
        citation: 'Patrick RP, Johnson TL "Sauna use as a lifestyle practice to extend healthspan" Exp Gerontol 2021',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34363927/',
        industryFunded: false,
      },
      {
        citation: 'Rhonda Patrick FMF "Sauna Report" · compendio HSP70, BDNF, longevidad',
        paradigm: 'functional_independent',
        url: 'https://www.foundmyfitness.com/topics/sauna',
      },
      {
        citation: 'Iguchi M et al. "Heat stress and cardiovascular, hormonal, and heat shock proteins in humans" J Athl Train 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22488236/',
      },
      {
        citation: 'Tradición finlandesa · sauna como práctica cultural documentada >2000 años · UNESCO Patrimonio Cultural Inmaterial 2020',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Swedana (sudoterapia) parte de Panchakarma · Sarvanga swedana + Nadi swedana · Charaka Samhita Sutra Sthana 14',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · práctica de sudación (Fa Han) · Shang Han Lun (Zhang Zhongjing, siglo III)',
        paradigm: 'tcm',
      },
      {
        citation: 'Termalismo europeo (spa tradition) · Aachen, Baden-Baden, Karlovy Vary · Roma imperial Termas de Caracalla',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Sears ME et al. "Arsenic, cadmium, lead, and mercury in sweat: a systematic review" J Environ Public Health 2012',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22505948/',
      },
      {
        citation: 'Investigación soviética · banya (баня) rusa con vasta (venik) · Sechenov Institute · termorregulación deportiva',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'sauna_vapor',
    name: 'Sauna de vapor 15-20 min · 40-45°C · humedad 100%',
    how: '15-20 min a 40-45°C con humedad 100% (vapor puro). 3-5 sesiones/semana. Respiración nasal profunda. Alternativas: hammam turco (con ritual jabón + kessa), banya rusa con vasta (venik hojas abedul).',
    benefit: 'Vía epitelial · calor húmedo hidrata mucosa respiratoria, favorece drenaje sino-bronquial, humecta piel + expande poros para depuración cutánea. Menor stress cardiovascular que sauna seca por menor temperatura, ideal para piel seca, EPOC leve compensada, congestión sinusal crónica.',
    categories: ['piel', 'inmunologico', 'inflamacion', 'ritual', 'cardiovascular'],
    roots: ['inflamacion_silenciosa', 'toxicidad_ambiental', 'sobrecarga_hepatica'],
    assignRule: 'Adulto sin embarazo. Ideal si piel seca, congestión nasal crónica, sinusitis recurrente, EPOC compensada leve, migraña vasoactiva. Alternativa a finlandesa para intolerantes al calor seco intenso.',
    priority: 2,
    family: 'sauna',
    evidenceLevel: 'N3',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'HSP70 (magnitud menor que finlandesa · menor delta térmico core)',
        'HSF1',
        'función mucociliar respiratoria (aclaramiento sino-bronquial)',
        'estrato córneo hidratación (aumento contenido agua)',
        'circulación cutánea (vasodilatación superficial marcada)',
        'sudoración eficiente (evaporación limitada por humedad = mayor volumen de sudor manifiesto)',
        'β-defensinas cutáneas (respuesta immune innata piel)',
      ],
      inhibits: [
        'sequedad mucosa nasal/faríngea',
        'IL-6 crónica (efecto menor documentado)',
        'colonización microbiana superficial (calor + humedad + descamación)',
        'contracción bronquial reactiva (efecto bronchodilator del vapor)',
      ],
      modulates: [
        'temperatura core (aumento 0.3-0.7°C · menor que finlandesa/IR)',
        'humedad cutánea',
        'tono muscular facial + peribucal',
        'drenaje linfático facial',
        'HRV (mejora modest)',
        'presión arterial (efecto modesto)',
      ],
      biomarkers: [
        'humedad_estrato_corneo (corneometría)',
        'TEWL (Trans-Epidermal Water Loss)',
        'volumen_moco_bronquial (peak flow)',
        'PCR_hs',
        'HRV RMSSD',
        'presion_arterial_sistolica',
      ],
      mechanismSummary: 'Vapor 100% humedad a 40-45°C limita evaporación cutánea, forzando disipación térmica por sudoración manifiesta profusa y calentamiento superficial · el aire húmedo hidrata mucosa respiratoria y favorece aclaramiento mucociliar. Menor delta térmico core que finlandesa → menor magnitud HSP70 pero mayor beneficio dermatológico/respiratorio.',
    },

    sideEffects: [
      'sensacion_ahogo_transitoria (humedad extrema · adaptación)',
      'sudoracion_profusa_visible',
      'perdida_electrolitos',
      'hipotension_ortostatica',
      'mareo_leve',
      'exacerbacion_hongos_intertriginosos (si susceptible · secar bien)',
    ],

    contraindications: [
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'embarazo (temperatura core >39°C posible)',
      'cardiopatia_isquemica_no_controlada',
      'insuficiencia_cardiaca_descompensada',
      'infarto_reciente_<3meses',
      'infeccion_dermatologica_activa_transmisible',
      'hongo_micosis_extensa (calor + humedad empeora)',
      'asma_severa_no_controlada (humedad puede gatillar)',
      'hipertermia_activa',
      'intoxicacion_etilica',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'piel_seca', score: 'high' },
        { source: 'profile', field: 'condiciones', in: ['sinusitis_cronica', 'rinitis_no_alergica', 'epoc_leve_compensada'] },
        { source: 'dx_level', system: 'inmunologico', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'embarazo', equals: true },
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_no_controlada', 'insuficiencia_cardiaca_descompensada', 'infeccion_dermatologica_activa', 'hongo_micosis_extensa', 'asma_severa_no_controlada'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Laukkanen JA et al. "Cardiovascular and other health benefits of sauna bathing" Mayo Clin Proc 2018 · revisión que incluye variantes vapor',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30077204/',
      },
      {
        citation: 'Ohnaka T et al. "Effects of steam bathing on cardiovascular responses" J Physiol Anthropol Appl Human Sci 1995',
        paradigm: 'western_academic',
      },
      {
        citation: 'Tradición hammam turco · documentado desde época bizantina, sistema fundacional de baños vapor con ritual jabón + kessa + descamación',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Tradición banya rusa · variante vapor + venik (azote suave con hojas de abedul · Vasilyev URSS 1970s)',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Temazcal mesoamericano · vapor de hierbas medicinales (romero, ruda, salvia) · Bernardino de Sahagún Codex Florentino',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Bashpa Swedana (caja de vapor con cabeza afuera) · variante de Panchakarma para depuración periférica · Charaka Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Fumigación (Xun Xi Fa) con hierbas volátiles en cámara de vapor · práctica en medicina serrana',
        paradigm: 'tcm',
      },
      {
        citation: 'Umeda M et al. "Steam inhalation for common cold" · uso terapéutico vapor en congestión respiratoria',
        paradigm: 'mechanistic',
      },
    ],
  },
  {
    key: 'bano_frio_desinflamacion',
    name: 'Baño frío 10-15°C (desinflamación · recovery)',
    how: 'Inmersión hasta el cuello a 10-15°C, 2-5 min, 2-4×/semana. Idealmente matutino o post-cardio. Respiración nasal profunda, exhalación larga. Salir lento. Evitar inmediatamente post-fuerza (mínimo 6h separación).',
    benefit: 'Vasoconstricción periférica potente + reducción inflamación aguda muscular + activación grasa parda moderada · recovery aeróbico + reset autonómico. Dosis intermedia entre ducha fría y cold plunge CNS.',
    categories: ['inflamacion', 'inmunologico', 'metabolismo', 'cardiovascular', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'sedentarismo', 'ritmo_circadiano_desregulado', 'disfuncion_mitocondrial'],
    assignRule: 'Adulto sano sin embarazo, HTA descontrolada, arritmias, Raynaud severo. Flag P1 si inflamación crónica, dolor articular, post-cardio recovery, aclimatación cold plunge CNS.',
    priority: 2,
    family: 'bano_frio',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 (activación moderada BAT)',
        'PGC-1α post-cardio (Ihsan 2021)',
        'vasoconstricción periférica (redistribución sanguínea centralizada)',
        'noradrenalina + dopamina (magnitud moderada)',
        'CIRP neuroprotector',
        'inmunocompetencia (linfocitos NK, IgA)',
        'antioxidantes endógenos SOD + catalasa',
      ],
      inhibits: [
        'IL-6 muscular aguda post-ejercicio',
        'TNF-α + MMP-9 tras esfuerzo aeróbico',
        'edema muscular post-ejercicio',
        'dolor muscular percibido (analgesia por frío)',
        'PCR_hs crónica con protocolo repetido',
        'señalización mTOR muscular si <6h post-fuerza (paradigmConflict Roberts 2015)',
      ],
      modulates: [
        'HRV (aumento sostenido en adaptados)',
        'tono vagal',
        'termorregulación',
        'sensibilidad insulina (efecto crónico)',
        'volumen plasmático (expansión adaptativa modest)',
        'flujo linfático (bombeo por vasoconstricción/vasodilatación de rebote)',
      ],
      biomarkers: [
        'PCR_hs',
        'IL-6',
        'creatina_kinasa (CK) post-ejercicio',
        'HRV RMSSD',
        'HOMA-IR',
        'NEFA_no_esterificados',
        'succinato_plasmático',
      ],
      mechanismSummary: '10-15°C es rango de "recovery" con menor stress autonómico que cold plunge · vasoconstricción periférica potente reduce edema muscular post-ejercicio, disminuye señalización pro-inflamatoria aguda + activación moderada BAT via UCP1. Contraindicada inmediatamente post-fuerza pesada por atenuación mTOR.',
    },

    sideEffects: [
      'shock_termico_inicial (jadeo reflejo)',
      'hiperventilacion_transitoria',
      'entumecimiento_extremidades (revierte 5-10 min)',
      'euforia_post_baño',
      'temblor_transitorio_terminal (esperado si duración cerca del máximo)',
      'sensacion_frio_prolongada 30-60 min post',
    ],

    contraindications: [
      'cardiopatia_isquemica_activa',
      'arritmia_ventricular_activa',
      'sindrome_qt_largo',
      'hipertension_maligna_no_controlada',
      'raynaud_severo',
      'urticaria_a_frigore',
      'crioglobulinemia',
      'embarazo (relativa · falta datos)',
      'epilepsia_no_controlada',
      'anorexia_activa',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'quiz', questionnaire: 'dolor_articular', score: 'high' },
        { source: 'profile', field: 'post_cardio', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_activa', 'raynaud_severo', 'urticaria_frio', 'embarazo', 'epilepsia_no_controlada'] },
        { source: 'profile', field: 'sesion_fuerza_pesada_ultimas_6h', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Ihsan M et al. "Post-exercise cold water immersion enhances endurance training-induced mitochondrial adaptations" J Physiol 2021',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33244218/',
      },
      {
        citation: 'Roberts LA et al. "Post-exercise cold water immersion attenuates acute anabolic signalling and long-term adaptations in muscle to strength training" J Physiol 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26174323/',
        paradigmConflict: 'Contraindicación relativa post-fuerza pesada · separar ≥6h.',
      },
      {
        citation: 'Vaile J et al. "Effect of cold water immersion on repeat cycling performance and thermoregulation in the heat" J Sports Sci 2008',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18569570/',
      },
      {
        citation: 'Hohenauer E et al. J Physiol 2025 (PGC-1α post-cardio)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Rhonda Patrick "Cold Exposure" FMF · recovery + hormesis',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Sheetodaka Snana + Sheetali pranayama post-esfuerzo · Charaka Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Sebastian Kneipp · hidroterapia con inmersión fría corta para "reset" autonómico',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Investigación soviética · Morzhi (nadadores hielo) · Sechenov Institute',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'cold_plunge_cns',
    name: 'Cold plunge 2-6°C (CNS training)',
    how: 'Inmersión hasta el cuello (o cabeza sumergida breve al final) a 2-6°C, 30 seg-3 min máximo, 2-3×/semana. Requiere adaptación previa (bano_frio_desinflamacion tolerado ≥8 semanas). Matutino aislado o post-cardio · JAMÁS <6h post-fuerza. Respiración nasal disciplinada. · Idealmente 30-60 min ANTES de sesión de fuerza para óptimo perfil hormonal (testosterona + GH). Si post-fuerza, esperar ≥6h (cold post-fuerza <6h atenúa mTOR/hipertrofia).',
    benefit: 'Máximo choque térmico controlado · dopamina + noradrenalina hasta 250-500% (Šrámek 2000), activación robusta BAT + PGC-1α + biogénesis mitocondrial, entrenamiento resiliencia CNS bajo estrés extremo. Herencia protocolo Søberg + winter swimming.',
    categories: ['energia', 'estres', 'cognitivo', 'mitocondrial', 'metabolismo'],
    roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'cortisol_elevado_sostenido', 'disfuncion_mitocondrial'],
    assignRule: 'Adulto sano avanzado (tolera 10-15°C ≥8 semanas). Flag P1 si necesita entrenamiento mental / resiliencia, testosterona baja funcional, dopamina baja Braverman, cronotipo oso (shock AM). NO cardiópatas. Timing recomendado: PRE-fuerza para perfil hormonal, o ≥6h post-fuerza.',
    priority: 3,
    family: 'bano_frio',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 robusto (activación máxima BAT)',
        'PGC-1α (biogénesis mitocondrial maximal)',
        'browning WAT sostenido',
        'noradrenalina + dopamina + endorfinas (magnitud máxima · Šrámek 530%)',
        'β3-adrenergic receptor signaling potente',
        'CIRP neuroprotector robusto',
        'HIF-1α + VEGF muscular',
        'testosterona/DHEA (documentado en adaptados · efecto pro-androgénico modest)',
        'expresión antioxidantes Nrf2 pathway (SOD, catalasa, glutation)',
        'tono vagal via dive reflex (cabeza sumergida)',
      ],
      inhibits: [
        'inflamación aguda (magnitud alta · reducción IL-6/TNF-α post crónica)',
        'lipogénesis blanca',
        'insulina baseline (post-adaptación crónica)',
        'expresión NF-κB muscular',
        'señalización mTOR muscular si <6h post-fuerza (paradigmConflict)',
        'noradrenalina baseline crónica (reset simpático)',
      ],
      modulates: [
        'HRV RMSSD (aumento crónico documentado en adaptados)',
        'cortisol_ritmo (amplificación CAR matutino)',
        'sensibilidad insulina',
        'termogénesis basal (aumento 5-15%)',
        'función tiroidea (T4→T3 conversión)',
        'ratio Th1/Th2 (modulación inmune)',
        'estado consciencia (bliss + euforia intensa)',
      ],
      biomarkers: [
        'lactato_reposo',
        'HRV RMSSD',
        'PCR_hs',
        'norepinefrina_plasmática_matutina',
        'glucosa_ayunas',
        'HOMA-IR',
        'temperatura_corporal_delta',
        'NEFA_no_esterificados',
        'succinato_plasmático',
        'catecolaminas_orina_24h',
        'testosterona_total',
      ],
      mechanismSummary: 'Choque a 2-6°C dispara descarga catecolaminérgica máxima (dopamina + noradrenalina 250-500%), activa UCP1 en BAT + PGC-1α + biogénesis mitocondrial, y entrena la respuesta autonómica al estrés extremo · el componente psicológico (permanecer en frío intenso) es entrenamiento CNS de resiliencia comparable a exposición al miedo controlado.',
    },

    sideEffects: [
      'shock_termico_severo (jadeo profundo · esperado)',
      'hiperventilacion_marcada (controlable con exhalación larga)',
      'entumecimiento_marcado_extremidades',
      'euforia_intensa_post (dopamina residual 1-3h)',
      'fatiga_diferida (si duración >3 min sin adaptación)',
      'urticaria_por_frio (raro · si aparece · suspender)',
      'sensacion_frio_prolongada (60-90 min post)',
      'temblor_terminal (esperado si cerca del máximo)',
    ],

    contraindications: [
      'cardiopatia_isquemica_activa',
      'arritmia_ventricular_activa',
      'sindrome_qt_largo',
      'insuficiencia_cardiaca_descompensada',
      'hipertension_maligna_no_controlada',
      'raynaud_severo',
      'crioglobulinemia',
      'urticaria_a_frigore',
      'embarazo (absoluta)',
      'epilepsia_no_controlada',
      'trombocitopenia_severa',
      'anorexia_activa',
      'menores_18_anos',
      'antecedente_familiar_muerte_subita_cardiaca',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
        { source: 'chronotype', type: 'oso' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_activa', 'raynaud_severo', 'urticaria_frio', 'embarazo', 'epilepsia_no_controlada'] },
        { source: 'profile', field: 'sesion_fuerza_pesada_ultimas_6h', equals: true },
        { source: 'profile', field: 'menor_de_18_anos', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Søberg S et al. Cell Reports Medicine 2021 · winter swimming men 4°C',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34614051/',
      },
      {
        citation: 'Šrámek P et al. Eur J Appl Physiol 2000 · norepinefrina 530% en 14°C, mayor a menor temperatura',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10751106/',
      },
      {
        citation: 'Roberts LA et al. J Physiol 2015 (contraindicación post-fuerza)',
        paradigm: 'western_academic',
        paradigmConflict: 'Cold plunge <6h post-fuerza atenúa mTOR/hipertrofia.',
      },
      {
        citation: 'Hohenauer E et al. J Physiol 2025 · PGC-1α biogénesis mitocondrial',
        paradigm: 'western_academic',
      },
      {
        citation: 'Andrew Huberman "Cold Exposure" HubermanLab · protocolo Søberg detallado',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Wim Hof · ice bath diario como pilar del método',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición Morzhi (rusa/ucraniana/polaca) · nadadores de hielo · práctica cultural longevidad autoreportada',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ernesto Prieto Gratacós · biofísica shock frío para densidad mitocondrial · comunicaciones argentinas',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Rhonda Patrick FMF "Cold Exposure Therapy" · protocolos avanzados',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'bano_caliente_vespertino',
    name: 'Baño caliente vespertino (40-42°C · 90 min pre-sueño)',
    how: '20-40 min en tina a 40-42°C, terminando 60-120 min antes de dormir. Opcional sales de Epsom (2-3 tazas · Mg sulfato) + aceites esenciales (lavanda, valeriana). Iluminación tenue. Post-baño: dejar cuerpo enfriarse pasivamente sin ropa gruesa.',
    benefit: 'Meta-análisis Haghayegh 2019 · reduce latencia sueño 36% y mejora eficiencia sueño · mecanismo: vasodilatación cutánea + posterior drop térmico core acelerado que sincroniza señal circadiana de sueño. Ideal para insomnio de conciliación por estrés vespertino o tensión muscular.',
    categories: ['sueno', 'cardiovascular', 'ritual', 'estres'],
    roots: ['cortisol_elevado_sostenido', 'deficit_sueno_profundo', 'estres_cronico', 'adrenalina_nocturna'],
    assignRule: 'Insomnio de conciliación, estrés vespertino, tensión muscular post-entrenamiento, dificultad para "apagar" la mente en la noche. Sin contraindicaciones cardiovasculares severas.',
    priority: 2,
    timeOfDay: 'evening',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'vasodilatación cutánea (mediada por eNOS + prostaglandinas)',
        'sudoración eficiente',
        'melatonina onset (acelerado por drop térmico posterior)',
        'GABA-A signaling (potenciado por baja core + calor muscular)',
        'sistema parasimpático',
        'HSP70 (magnitud baja · calor moderado)',
        'β-endorfinas post-baño',
        'oxitocina (por autocuidado + confort · documentado)',
      ],
      inhibits: [
        'cortisol vespertino (documentado Rowland 1994)',
        'tono simpático',
        'tensión muscular (relajación mecánica calor)',
        'noradrenalina nocturna',
        'latencia sueño (Haghayegh -36%)',
      ],
      modulates: [
        'temperatura core (aumento agudo 0.5-1°C · seguida de drop pronunciado post-baño)',
        'temperatura piel/core delta (amplificación del gradient de sueño)',
        'HRV RMSSD nocturno (aumento post)',
        'arquitectura sueño (mejora N3 % modest)',
        'flujo cutáneo (vasodilatación crónica adaptativa)',
        'gradiente sueño (piel caliente + core frío = señal sueño)',
      ],
      biomarkers: [
        'latencia_sueño',
        'sueño_profundo_horas',
        'temperatura_corporal_delta',
        'melatonina_salival_nocturna',
        'cortisol_salival_23h',
        'HRV RMSSD nocturno',
      ],
      mechanismSummary: 'Sumergir el cuerpo en 40-42°C eleva temperatura core 0.5-1°C · al salir del agua, la vasodilatación cutánea aumentada facilita disipación radiante/evaporativa acelerada del core hacia la piel, produciendo drop térmico pronunciado 90 min post-baño · esta caída térmica es la señal circadiana natural de inicio de sueño (piel caliente + core frío → melatonina rise).',
    },

    sideEffects: [
      'hipotension_ortostatica_transitoria (levantarse lento)',
      'somnolencia_marcada',
      'deshidratacion_leve (reponer 250-500 ml agua)',
      'sensacion_calor_prolongada_15min',
      'sudoracion_facial_prolongada',
      'sequedad_piel_cronica (si baños diarios prolongados sin hidratante)',
    ],

    contraindications: [
      'cardiopatia_isquemica_no_controlada',
      'arritmia_ventricular_activa',
      'insuficiencia_cardiaca_descompensada',
      'hipotension_severa_sintomática_<90/60',
      'infarto_reciente_<3meses',
      'primer_trimestre_embarazo (temperatura core >39°C)',
      'infeccion_activa_con_fiebre',
      'intoxicacion_etilica',
      'epilepsia_no_controlada (riesgo por hipertermia + inmersión)',
      'ulceras_extensas_o_dermatitis_infectada',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'lab', marker: 'latencia_sueño_min', operator: '>=', value: 30 },
        { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_no_controlada', 'arritmia_ventricular_activa', 'insuficiencia_cardiaca_descompensada', 'hipotension_severa_sintomática', 'epilepsia_no_controlada'] },
        { source: 'profile', field: 'embarazo_primer_trimestre', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Haghayegh S et al. "Before-bedtime passive body heating by warm shower or bath to improve sleep: A systematic review and meta-analysis" Sleep Med Rev 2019 · optimal timing 90 min pre-sueño',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31102877/',
        industryFunded: false,
      },
      {
        citation: 'Sung EJ, Tochihara Y "Effects of bathing and hot footbath on sleep in winter" J Physiol Anthropol Appl Human Sci 2000',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10979246/',
      },
      {
        citation: 'Kräuchi K et al. "Warm feet promote the rapid onset of sleep" Nature 1999 · gradiente cutáneo-central',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10476072/',
      },
      {
        citation: 'Matthew Walker "Why We Sleep" 2017 · gradiente térmico y arquitectura sueño',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Abhyanga (auto-masaje con aceite tibio) + baño tibio vespertino · parte de Nishacharya (rutina nocturna) · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · baño de pies con hierbas (Ai Ye · Artemisia) 30 min pre-sueño · nutre Yin renal',
        paradigm: 'tcm',
      },
      {
        citation: 'Termalismo europeo · balneología nocturna (Baden-Baden, Vichy) · práctica documentada siglo XVIII',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Andrew Huberman "Sleep Toolkit" HubermanLab · bath 60-90 min pre-sueño como herramienta consolidada',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Estudios sales Epsom · Waring 2004 · absorción transdérmica magnesio para relajación muscular',
        paradigm: 'mechanistic',
      },
    ],
  },
  {
    key: 'terapia_contraste',
    name: 'Terapia de contraste (caliente/frío alternado)',
    how: 'Alternar 3 min caliente (38-42°C · ducha/tina) + 30-60 seg frío (10-15°C). 3-5 ciclos, terminar en frío. 2-3×/semana. Post-cardio o matutino. Modalidad tradicional: sauna finlandesa 15 min → avanto/agua helada 30 seg × 3-5 ciclos.',
    benefit: '"Ejercicio vascular" · vasodilatación-vasoconstricción rítmica mejora función endotelial, acelera clearance lactato (Vaile: -22% tiempo recovery), drena linfa por bombeo mecánico y entrena flexibilidad autonómica. Protocolo escandinavo milenario + sport recovery moderno.',
    categories: ['cardiovascular', 'inmunologico', 'energia', 'estres', 'inflamacion'],
    roots: ['sedentarismo', 'cortisol_elevado_sostenido', 'inflamacion_silenciosa', 'hrv_baja_cronica'],
    assignRule: 'Adulto sano avanzado en frío y calor por separado. Foco: recovery deportivo, HRV baja crónica, sedentarismo con fatiga, drenaje linfático (post-viaje, edema periférico funcional).',
    priority: 3,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'vasodilatación + vasoconstricción cíclicas (endotelio + músculo liso vascular)',
        'eNOS (óxido nítrico endotelial)',
        'función endotelial FMD (mejora crónica)',
        'flujo linfático (bombeo mecánico por vasomotión)',
        'HSP70 (por componente calor)',
        'UCP1 modest (por componente frío)',
        'PGC-1α (adaptación mitocondrial dual)',
        'inmunocompetencia (documentado en Kneipp)',
        'tono vagal (adaptación autonómica)',
      ],
      inhibits: [
        'lactato post-ejercicio (Vaile · clearance +27%)',
        'edema muscular post-ejercicio',
        'DOMS percibido (leve reducción vs recovery pasivo)',
        'rigidez arterial (aumento distensibilidad crónica)',
        'stress oxidativo excesivo post-ejercicio',
      ],
      modulates: [
        'HRV RMSSD (aumento inmediato + crónico)',
        'función endotelial FMD',
        'termorregulación (aclimatación dual calor/frío)',
        'tono vasomotor',
        'volumen plasmático (expansión adaptativa modest)',
        'sensibilidad barorrefleja',
      ],
      biomarkers: [
        'HRV RMSSD',
        'FMD (flow-mediated dilation)',
        'lactato_reposo_y_post_esfuerzo',
        'creatina_kinasa (CK)',
        'PCR_hs',
        'presion_arterial_sistolica',
        'temperatura_corporal_delta',
      ],
      mechanismSummary: 'La alternancia rítmica calor-frío fuerza al endotelio y músculo liso vascular a ciclos rápidos de vasodilatación-vasoconstricción · esta "gimnasia vascular" mejora función endotelial + acelera clearance lactato por bombeo hidrostático linfático-venoso (Vaile 2008) + entrena adaptación autonómica dual. Terminar en frío consolida efecto vasoconstrictor tónico.',
    },

    sideEffects: [
      'hipotension_ortostatica_transitoria',
      'mareo_leve_por_alternancia',
      'euforia_post',
      'sensacion_calor_persistente_seguida_de_frio',
      'fatiga_transitoria (si número de ciclos excesivo)',
    ],

    contraindications: [
      'cardiopatia_isquemica_activa',
      'arritmia_activa',
      'hipertension_maligna_no_controlada',
      'hipotension_severa_sintomática',
      'raynaud_severo',
      'crioglobulinemia',
      'embarazo (relativa)',
      'infarto_reciente_<3meses',
      'epilepsia_no_controlada',
      'anemia_severa',
      'trombosis_venosa_profunda_activa (bombeo mecánico contraindicado)',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 30 },
        { source: 'quiz', questionnaire: 'fatiga_recovery_deportivo', score: 'high' },
        { source: 'profile', field: 'post_cardio_intenso', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_activa', 'hipertension_maligna', 'raynaud_severo', 'embarazo', 'trombosis_venosa_profunda'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Vaile J et al. "Effect of hydrotherapy on the signs and symptoms of delayed onset muscle soreness" Eur J Appl Physiol 2008 · contrast water immersion clearance lactato +27%',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17968582/',
      },
      {
        citation: 'Bieuzen F et al. "Contrast water therapy and exercise induced muscle damage: a systematic review and meta-analysis" PLOS One 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23840458/',
      },
      {
        citation: 'Higgins TR et al. "Contrast therapy does not cause appreciable changes in muscle temperature" J Athl Train 2013 · mecanismo bombeo vascular no térmico',
        paradigm: 'western_academic',
      },
      {
        citation: 'Tradición nórdica · sauna finlandesa 15 min → avanto (agua helada) 30 seg × ciclos · práctica documentada >2000 años · patrimonio UNESCO 2020',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Sebastian Kneipp "Meine Wasserkur" 1886 · Wechseldusche (ducha alternada) · sistema oficial reconocido Alemania',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Tradición banya rusa · alternancia banya caliente + inmersión río/nieve · Vasilyev URSS documentación',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Ayurveda · Sarvanga swedana + snana con agua fresca alternada · variante ceremonial rejuvenecedora',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Andrew Huberman "Deliberate Cold and Heat Exposure" · contraste como protocolo optimizado autonómico',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'dive_reflex_cara_hielo',
    name: 'Cara en agua con hielo (dive reflex · vagal reset)',
    how: 'Recipiente con agua fría (5-10°C) + hielo. Inhalar profundo, sumergir cara completa (incluyendo frente y sienes · zona V trigémino) 15-30 seg, respirar normal al salir. 2-3 repeticiones. Uso: pico ansiedad/pánico, reset autonómico matutino, HRV baja crónica.',
    benefit: 'Activa el mammalian dive reflex vía trigémino → vago → bradicardia 10-25% en <30 seg + vasoconstricción periférica selectiva. "Botón de reset" del sistema nervioso autónomo · herramienta core DBT-TIPP para crisis panic + regulación emocional aguda. Alternativa segura al cold plunge para novatos.',
    categories: ['ansiedad', 'estres', 'cardiovascular', 'energia', 'cognitivo'],
    roots: ['adrenalina_nocturna', 'estres_cronico', 'cortisol_elevado_sostenido', 'cortisol_matutino_bajo', 'hrv_baja_cronica'],
    assignRule: 'Panic attack activo, sobre-arousal, insomnio matutino con cortisol bajo, HRV crónicamente baja, cronotipo lobo/oso con arranque lento. ⚠️ NO arritmias sinusales activas (bradicardia refleja puede empeorar bloqueo AV).',
    priority: 2,
    evidenceLevel: 'N2',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'nervio trigémino (rama oftálmica V1 · frente y sienes)',
        'nervio vago (rama cardíaca eferente)',
        'baroreflex sensitivity',
        'nucleos tracto solitario + ambiguo (integración cardiaca central)',
        'bradicardia refleja aguda (10-25% en 30 seg · Panneton 2013)',
        'vasoconstricción periférica selectiva (miembros · redistribución central)',
        'esplenocontracción parcial (dive reflex components)',
        'HRV RMSSD post-inmersion',
        'GABA-A signaling post-reset',
      ],
      inhibits: [
        'noradrenalina reactiva pánico (Kim 2022 Cold Face Test)',
        'cortisol reactivo agudo psicosocial',
        'frecuencia cardíaca (bradicardia aguda 10-25%)',
        'ansiedad medida por escalas post-práctica',
        'ataque_pánico_activo (mecanismo TIPP DBT)',
        'rumiación / DMN hiperactivo',
      ],
      modulates: [
        'HRV RMSSD (aumento agudo + crónico)',
        'tono vagal (activación aguda potente)',
        'presion arterial (aumento agudo transitorio · caída post)',
        'ratio LF/HF (dominancia parasimpática post)',
        'estado emocional (regulación aguda validada DBT)',
        'temperatura facial (drop marcado · vasoconstricción)',
      ],
      biomarkers: [
        'HRV RMSSD (medición pre/post)',
        'frecuencia_cardiaca_reposo',
        'cortisol_salival_pre_post',
        'presion_arterial',
        'alfa-amilasa_salival (stress marker)',
      ],
      mechanismSummary: 'Sumergir la cara en agua fría activa termorreceptores + mecanorreceptores en V1 (rama oftálmica trigémino) que descargan al nervio vago vía núcleo del tracto solitario · resultado: bradicardia refleja 10-25% en <30 seg + vasoconstricción periférica selectiva + redistribución central de sangre · el "reset" autonómico es la respuesta más rápida del cuerpo humano al estrés agudo (más rápido que respiración lenta o ejercicio).',
    },

    sideEffects: [
      'shock_termico_facial_inicial',
      'jadeo_reflejo (cabeza fuera antes de sumergir · exhalar largo)',
      'sensacion_congelamiento_facial 30-60 seg',
      'euforia_post_reset',
      'sensibilidad_dental_transitoria',
      'enrojecimiento_facial_post (vasodilatación rebote)',
      'lagrimeo_transitorio',
    ],

    contraindications: [
      'arritmia_sinusal_activa (bradicardia refleja puede empeorar bloqueo AV)',
      'bloqueo_AV_2do_3er_grado',
      'sindrome_seno_enfermo',
      'raynaud_severo_facial',
      'sinusitis_aguda_purulenta',
      'infeccion_facial_activa',
      'trigeminal_neuralgia_activa (riesgo desencadenar crisis)',
      'embarazo_relativa (falta datos)',
      'cirugía_facial_reciente_no_cicatrizada',
      'menores_5_anos (dive reflex más pronunciado · supervisión estricta)',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 25 },
        { source: 'lab', marker: 'cortisol_matutino_salival', operator: '<', value: 10, unit: 'nmol/L' },
        { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
        { source: 'profile', field: 'panic_attack_activo', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['arritmia_sinusal_activa', 'bloqueo_av_2do_3er', 'sindrome_seno_enfermo', 'raynaud_severo_facial', 'trigeminal_neuralgia_activa'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Panneton WM "The mammalian diving response: an enigmatic reflex to preserve life?" Physiology (Bethesda) 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23997188/',
      },
      {
        citation: 'Kim JW et al. "Vagus activation by Cold Face Test reduces acute psychosocial stress responses" Scientific Reports 2022',
        paradigm: 'western_academic',
        url: 'https://www.nature.com/articles/s41598-022-23222-9',
      },
      {
        citation: 'Linehan MM "DBT Skills Training Manual" 2015 · protocolo TIPP (Temperature-Intense exercise-Paced breathing-Paired muscle relaxation) para distress tolerance',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Shattock MJ, Tipton MJ "\'Autonomic conflict\': a different way to die during cold water immersion?" J Physiol 2012 · mecanismo dive reflex + arritmogenesis',
        paradigm: 'western_academic',
        url: 'https://physoc.onlinelibrary.wiley.com/doi/10.1113/jphysiol.2012.229864',
      },
      {
        citation: 'Datta A, Tipton M "Respiratory responses to cold water immersion: neural pathways, interactions, and clinical consequences awake and asleep" J Appl Physiol 2006',
        paradigm: 'western_academic',
      },
      {
        citation: 'Andrew Huberman "Cold Exposure" · Cold Face Test como reset vagal accesible',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Jala Neti (limpieza nasal con agua fresca) matutina + splash cara fría · Hatha Yoga Pradipika Shatkarma',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · splash cara con agua fría al despertar como parte de rutina Yang matutino · práctica taoísta',
        paradigm: 'tcm',
      },
      {
        citation: 'Divers Alert Network · dive reflex protector cerebral + cardíaco en inmersión súbita fría',
        paradigm: 'mechanistic',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LUZ Y VISIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'lentes_amarillos',
    name: 'Lentes amarillos (filtro leve · daytime)',
    how: 'Lentes con tinte amarillo (bloquean ~40-60% del pico azul 450-470 nm sin distorsionar color significativamente) usados durante trabajo en pantalla >4 h/día. Sin restricción horaria. Alternativa: filtros de software (f.lux, Night Shift) modo suave. Diferenciación: LEVE (diurno) — para ámbar moderado vespertino ver `lentes_ambar`, para rojo máximo pre-sueño ver `lentes_rojos`.',
    benefit: 'Protección leve del pico azul artificial durante deep work · reduce fatiga ocular acumulada, protege salud macular a largo plazo, mantiene percepción de color casi natural. Puente para usuarios que rechazan lentes ámbar/rojos por estética o distorsión.',
    categories: ['sueno', 'circadiano', 'cognitivo'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado'],
    assignRule: 'Trabajo intensivo en pantalla >4 h/día, fatiga ocular vespertina, migraña foto-triggered. Sin contraindicaciones.',
    priority: 2,
    family: 'lentes_azul',
    evidenceLevel: 'N3',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'salud macular indirecta (reducción exposición azul HEV crónica)',
        'confort visual sostenido',
        'sensibilidad contraste (algunos filtros amarillos)',
      ],
      inhibits: [
        'exposición pico azul HEV (400-490 nm · magnitud modest)',
        'fatiga ocular acumulada',
        'estrés oxidativo retinal crónico (Wielgus 2010 · azul + oxígeno = radicales libres)',
      ],
      modulates: [
        'agudeza visual en pantalla',
        'confort visual subjetivo',
        'sensibilidad al contraste',
        'circadiano indirecto (bloqueo leve del componente ipRGC azul)',
      ],
      biomarkers: [
        'fatiga_ocular_score_subjetivo',
        'melatonina_salival_vespertina (efecto leve)',
        'pupilometría_dinámica',
      ],
      mechanismSummary: 'Los lentes amarillos bloquean 40-60% del pico azul artificial (450-470 nm · pantallas LED) reduciendo exposición HEV crónica sin distorsionar significativamente percepción del color · beneficio dermatoocular acumulativo + protección macular preventiva a lo largo del día.',
    },

    sideEffects: [
      'ligera_alteracion_percepcion_colores (menor que ámbar/rojo)',
      'adaptacion_visual_transitoria_primeros_dias',
      'incompatibilidad_diseno_grafico_color (para diseñadores)',
    ],

    contraindications: [
      'ninguna_absoluta',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'trabajo_pantalla_horas_diarias', score: 'high' },
        { source: 'quiz', questionnaire: 'fatiga_ocular_vespertina', score: 'high' },
        { source: 'profile', field: 'migraña_foto_triggered', equals: true },
      ],
      excludeIf: [],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Wielgus AR et al. "Blue light induced A2E oxidation in rat eyes — experimental animal model of dry AMD" Photochem Photobiol Sci 2010 · daño retinal HEV',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20835443/',
      },
      {
        citation: 'Leung TW et al. "Blue-Light Filtering Spectacle Lenses: Optical and Clinical Performances" PLOS One 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28654684/',
      },
      {
        citation: 'Singh S et al. "Blue-light filtering spectacle lenses for visual performance, sleep, and macular health in adults" Cochrane Database Syst Rev 2023',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37593770/',
        paradigmConflict: 'Cochrane rankeó evidencia "very low certainty" pero no distinguió filtros leves vs ámbar/rojos. Ensayos individuales (Burkhart 2009, Shechter 2018) sí muestran señal en filtros más agresivos.',
      },
      {
        citation: 'Jack Kruse "Blue Light and Circadian Biology" · comunicaciones sobre HEV crónica y mitocondrial retinal',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Light and Circadian Rhythms" HubermanLab · lentes solo como sub-óptimo vs cambio ambiental',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · Ojos = ventana al Hígado (肝开窍于目) · protección visual = protección Hígado energético · Huangdi Neijing',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Trataka (fijación visual) + protección visual desde textos Ayurveda como parte de dinacharya · uso de kohl/anjana para reducir fatiga ocular',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'lentes_ambar',
    name: 'Lentes ámbar (filtro moderado · post-18h)',
    how: 'Lentes tinte ámbar (bloquean ~85-95% del pico azul 400-500 nm) usados desde 2-3 h antes de dormir (típicamente post-18-19h). Aplicar a partir del atardecer local. Retirar al ir a la cama para dormir. Diferenciación: MODERADO vespertino — para leve diurno ver `lentes_amarillos`, para máximo pre-sueño ver `lentes_rojos`.',
    benefit: 'Protección efectiva de melatonina pineal vespertina · previene supresión por luz azul artificial en cascada crítica pre-sueño · protocolo Shechter 2018 mostró mejora sueño en insomnio + Ostrin 2017 preservación DLMO. Ideal para turnistas + pantalla nocturna forzada.',
    categories: ['sueno', 'circadiano'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado', 'deficit_sueno_profundo'],
    assignRule: 'Exposición vespertina forzada a pantallas post-18h, turnista, insomnio de conciliación, dificultad para "apagar" cerebro en la noche.',
    priority: 2,
    family: 'lentes_azul',
    timeOfDay: 'evening',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'síntesis melatonina pineal vespertina (bloqueando supresión por azul)',
        'DLMO alineado (Dim Light Melatonin Onset)',
        'GABA-A signaling nocturno indirecto',
        'expresión REV-ERBα nocturna',
        'onset del sueño profundo N3',
      ],
      inhibits: [
        'supresión melatonina por luz azul (85-95% bloqueo pico 480 nm)',
        'sobreactivación simpática nocturna',
        'cortisol nocturno inapropiado',
        'activación ipRGC vespertina',
        'latencia sueño',
      ],
      modulates: [
        'DLMO onset',
        'melatonina salival nocturna',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
        'coherencia circadiana (chronotype-melatonin sync)',
      ],
      biomarkers: [
        'melatonina_salival_nocturna',
        'DLMO',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
      ],
      mechanismSummary: 'Los lentes ámbar bloquean 85-95% del pico azul (400-500 nm), incluyendo la zona de máxima sensibilidad ipRGC (melanopsina ~480 nm) · esto previene la supresión de melatonina pineal vespertina causada por pantallas + LED domésticos, preservando el DLMO y la arquitectura de sueño posterior.',
    },

    sideEffects: [
      'distorsion_percepcion_color (naranja/marrón dominante)',
      'incompatibilidad_diseno_grafico_color',
      'adaptacion_visual_2-3_dias',
      'aumento_apetito_carbohidratos_vespertino (documentado · efecto melatonina rise)',
    ],

    contraindications: [
      'ninguna_absoluta',
      'conduccion_nocturna (relativa · reduce contraste percibido de rojos · quitar al conducir)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'profile', field: 'trabajo_turnos', equals: true },
        { source: 'profile', field: 'pantalla_post_20h', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'conduccion_nocturna_frecuente', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Burkhart K, Phelps JR "Amber lenses to block blue light and improve sleep: a randomized trial" Chronobiol Int 2009',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20030543/',
        industryFunded: false,
      },
      {
        citation: 'Shechter A et al. "Blocking nocturnal blue light for insomnia: A randomized controlled trial" J Psychiatr Res 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29101797/',
      },
      {
        citation: 'Ostrin LA et al. "Attenuation of short wavelengths alters sleep and the ipRGC pupil response" Ophthalmic Physiol Opt 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28271557/',
      },
      {
        citation: 'Esaki Y et al. "Effect of blue-blocking glasses in major depressive disorder with sleep onset insomnia" Chronobiol Int 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32126840/',
      },
      {
        citation: 'Singh S et al. Cochrane 2023 · very low certainty overall',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37593770/',
        paradigmConflict: 'Meta-análisis Cochrane heterogéneo · señal positiva en insomnio (Shechter, Esaki) pero calidad baja global. Transparencia obligatoria.',
      },
      {
        citation: 'Andrew Huberman "Light Toolkit" HubermanLab · lentes ámbar como opción para pantalla forzada vespertina',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Jack Kruse "Blue Light Hazard" · comunicaciones extensas · funcional independiente radical sobre HEV',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Ratricharya (rutina nocturna) · evitar estimulación visual intensa post-Pradosha · Charaka Samhita',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'lentes_rojos',
    name: 'Lentes rojos (filtro máximo · 60-90 min pre-sueño)',
    how: 'Lentes rojos oscuros (bloquean 99%+ del azul 400-500 nm + 60-80% del verde 500-570 nm) 60-90 min antes de dormir. Solo en casa, luz ambiental necesariamente baja. Retirar al apagar luces de la habitación. Diferenciación: MÁXIMO pre-sueño — para leve diurno ver `lentes_amarillos`, para moderado vespertino 18h+ ver `lentes_ambar`.',
    benefit: 'Máxima protección melatonina en cascada crítica pre-sueño · corta prácticamente toda supresión ipRGC vespertina · útil en insomnio crónico, trabajo turno nocturno, exposición forzada a pantallas o luz artificial intensa post-atardecer.',
    categories: ['sueno', 'circadiano'],
    roots: ['sobreexposicion_luz_azul', 'ritmo_circadiano_desregulado', 'deficit_sueno_profundo'],
    assignRule: 'Insomnio crónico refractario, trabajador turno nocturno con retorno a sueño diurno, exposición vespertina forzada a luz artificial intensa (mesero, oficina 24/7, hospital). ⚠️ NO conducir con ellos.',
    priority: 2,
    family: 'lentes_azul',
    timeOfDay: 'night',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'síntesis melatonina pineal (bloqueo máximo supresión)',
        'DLMO adelantado (efecto agudo)',
        'GABA-A signaling nocturno',
        'onset sueño profundo N3 acelerado',
        'expresión REV-ERBα',
      ],
      inhibits: [
        'supresión melatonina por luz azul (99%+ bloqueo)',
        'activación ipRGC casi total',
        'sobreactivación simpática nocturna',
        'cortisol nocturno inapropiado',
        'latencia sueño',
      ],
      modulates: [
        'DLMO onset (adelantable 30-60 min con uso crónico)',
        'melatonina salival nocturna (aumento cuantificable)',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
        'sincronización circadiana (útil en jet lag + shift work)',
      ],
      biomarkers: [
        'melatonina_pineal_pico_nocturno_23h',
        'DLMO',
        'latencia_sueño',
        'sueño_profundo_horas',
        'cortisol_salival_23h',
        'sueño_REM_horas',
      ],
      mechanismSummary: 'Los lentes rojos bloquean 99%+ del azul + 60-80% del verde, cortando prácticamente toda entrada de longitudes de onda supresoras de melatonina · efecto equivalente a "oscuridad funcional" con luz encendida · protocolo más agresivo del espectro blue-blocker, reservado para casos refractarios o exposición forzada.',
    },

    sideEffects: [
      'distorsion_severa_percepcion_color (todo rojo/naranja)',
      'reducción_agudeza_cromática',
      'incompatibilidad_actividades_finas (leer detalle, cocinar precisión)',
      'adaptacion_visual_1_semana',
      'sensacion_desorientacion_leve_inicial',
      'aumento_apetito_carbos_vespertino',
    ],

    contraindications: [
      'conduccion_de_cualquier_tipo (reduce contraste crítico)',
      'operacion_maquinaria_peligrosa',
      'actividades_de_precision_visual',
      'baja_iluminacion_ambiental_severa (riesgo caídas · combinar con luz roja ambiental)',
      'ambliopía_no_tratada (agudeza ya comprometida)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 2 },
        { source: 'quiz', questionnaire: 'sueño', score: 'low' },
        { source: 'lab', marker: 'latencia_sueño_min', operator: '>=', value: 45 },
        { source: 'profile', field: 'trabajo_turno_nocturno', equals: true },
        { source: 'profile', field: 'insomnio_cronico_refractario', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['ambliopia_no_tratada'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Sasseville A et al. "Blue blocker glasses impede the capacity of bright light to suppress melatonin production" J Pineal Res 2006',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16842544/',
      },
      {
        citation: 'Burkhart K, Phelps JR "Amber lenses to block blue light and improve sleep: a randomized trial" Chronobiol Int 2009 (referencia base familia)',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20030543/',
      },
      {
        citation: 'Shechter A et al. J Psychiatr Res 2018 · insomnio con blue blockers 3h pre-sueño',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29101797/',
      },
      {
        citation: 'Kimberly B, James R "Amber lenses to block blue light and improve sleep" (mismo Burkhart & Phelps · protocolo original 3h × 2 semanas)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Jack Kruse "Blue Light Hazard" · comunicaciones sobre lentes rojos como protección máxima',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Light Protocol" · lentes rojos como opción "hardcore" para exposición forzada',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Singh S et al. Cochrane 2023 · very low certainty (aplica también a rojos)',
        paradigm: 'western_academic',
        paradigmConflict: 'Como en ámbar · señal positiva individual, evidencia meta-analítica débil. Uso justificado por mecanismo mecanístico + caso clínico severo.',
      },
      {
        citation: 'Ayurveda + tradición Kalpasthana · uso de aceite Anu tailam ocular vespertino + evasión de luz brillante pre-sueño en Nishacharya',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'luz_roja_ojos',
    name: 'Luz roja / NIR en ojos (retinal PBM · matutino)',
    how: '⚠️ Dispositivo calibrado (Aduro, LumiRed retinal · NO LED común). Luz roja 670 nm, irradiancia 40 mW/cm², distancia 15-20 cm, 3 min con ojos cerrados. Aplicar UNA SOLA VEZ entre 8-11 AM (ventana circadiana crítica · Shinhmar 2024 mostró beneficio ausente en aplicación vespertina). Frecuencia: 3-7×/semana según protocolo Jeffery. Beneficio agudo hasta 1 semana.',
    benefit: 'Fotobiomodulación mitocondrial retinal · Jeffery 2020-2024 demostró mejora contraste cromático +17-20% en >40 años tras 3 min 670 nm matutina única · mecanismo: absorción por citocromo C oxidasa en fotorreceptores + RPE + mejora bioenergética mitocondrial retinal envejecida. Ventana temporal AM CRÍTICA (efecto ausente PM · saturación CCO circadiana).',
    categories: ['cognitivo', 'piel', 'energia', 'mitocondrial'],
    roots: ['deficit_exposicion_solar', 'sobreexposicion_luz_azul', 'disfuncion_mitocondrial'],
    assignRule: '⚠️ Dispositivo apropiado (irradiancia + wavelength calibrados). Adulto >40 años con declive función visual leve, degeneración macular temprana (fuera del scope agudo), fatiga visual crónica. Ventana horaria 8-11 AM obligatoria.',
    priority: 3,
    timeOfDay: 'morning',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'citocromo C oxidasa (Complejo IV cadena respiratoria mitocondrial · absorción 620-680 nm)',
        'ATP mitocondrial retinal (aumento producción documentado Jeffery)',
        'membrana potencial mitocondrial retinal',
        'expresión antioxidantes retinales (Nrf2 pathway)',
        'homeostasis RPE (Retinal Pigment Epithelium)',
        'sensibilidad contraste cromático (Chroma Test +17-20% Jeffery)',
        'ERG (electroretinograma · función fotorreceptor)',
      ],
      inhibits: [
        'estrés oxidativo retinal (reducción crónica)',
        'inflamación retinal edad-relacionada',
        'declive función mitocondrial retinal edad-dependiente',
        'peroxidación lipídica RPE',
      ],
      modulates: [
        'sensibilidad contraste cromático (mejora medible 1 semana)',
        'agudeza visual (mejora modest en >40 años)',
        'función fotorreceptor (ERG amplitud)',
        'flujo coroideo (mejora perfusión posterior)',
        'estrés oxidativo retinal',
      ],
      biomarkers: [
        'sensibilidad_contraste_cromatico (Chroma Test)',
        'ERG_amplitud',
        'agudeza_visual_snellen',
        'espesor_capa_fibras_nerviosas_OCT',
        'flujo_coroideo_OCT-A',
      ],
      mechanismSummary: '670 nm es longitud de onda de máxima absorción por citocromo C oxidasa (Complejo IV cadena respiratoria mitocondrial) · fotorreceptores retinales tienen mayor densidad mitocondrial del cuerpo humano · aplicación matutina única (3 min, 40 mW/cm²) activa CCO, aumenta ATP mitocondrial retinal y mejora función bioenergética por hasta 1 semana. Efecto ausente PM por saturación circadiana de CCO retinal (Shinhmar 2024).',
    },

    sideEffects: [
      'sensacion_calor_ocular_leve',
      'brillo_residual_visual_5min',
      'ninguno_grave_documentado_con_protocolo_correcto',
      'headache_leve (si sobre-exposición · reducir duración)',
    ],

    contraindications: [
      'patologia_ocular_activa_diagnosticada (retinopatía diabética activa, uveítis, glaucoma agudo)',
      'cirugía_ocular_reciente_<3meses',
      'fotosensibilidad_ocular_medicamentosa (retinoides orales · amiodarona · algunos anti-psicóticos)',
      'melanoma_ocular_conocido',
      'embarazo_relativa (falta datos)',
      'dispositivo_no_calibrado (irradiancia >100 mW/cm² · quemadura retinal riesgo)',
      'aplicación_prolongada_>5min (fototoxicidad potencial)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'edad_40_o_mas', equals: true },
        { source: 'quiz', questionnaire: 'fatiga_visual_cronica', score: 'high' },
        { source: 'profile', field: 'condiciones', in: ['degeneracion_macular_temprana', 'declive_agudeza_leve'] },
        { source: 'dx_level', system: 'cognitivo', operator: '<=', value: 3 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['retinopatia_diabetica_activa', 'uveitis_activa', 'glaucoma_agudo', 'cirugia_ocular_reciente_3m', 'fotosensibilidad_medicamentosa', 'melanoma_ocular'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Shinhmar H, Grewal M, Sivaprasad S, Hogg C, Chong V, Neveu M, Jeffery G "Optically improved mitochondrial function redeems aged human visual decline" J Gerontol Biol Sci Med Sci 2020',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32651598/',
        industryFunded: false,
      },
      {
        citation: 'Shinhmar H et al. "Weeklong improved colour contrasts sensitivity after single 670 nm exposures associated with enhanced mitochondrial function" Scientific Reports 2021',
        paradigm: 'western_academic',
        url: 'https://www.nature.com/articles/s41598-021-02311-1',
      },
      {
        citation: 'Shinhmar H et al. "Weeklong improved colour contrast sensitivity after morning but NOT evening 670 nm exposures" Scientific Reports 2024 · ventana circadiana matutina obligatoria',
        paradigm: 'western_academic',
        paradigmConflict: 'Reversa efecto vespertino · uso PM contraindicado por saturación circadiana CCO. Solo protocolo AM (8-11h) tiene evidencia.',
      },
      {
        citation: 'Jeffery G · Institute of Ophthalmology UCL · programa research retinal PBM · publicaciones seriales 2013-2024',
        paradigm: 'western_academic',
      },
      {
        citation: 'Hamblin MR "Mechanisms and applications of the anti-inflammatory effects of photobiomodulation" AIMS Biophys 2017 · CCO absorption spectrum',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28748217/',
      },
      {
        citation: 'Karu TI "Cellular effects of low power laser therapy can be mediated by nitric oxide" Lasers Surg Med 2005 · mecanismo NO release por LLLT',
        paradigm: 'western_academic',
      },
      {
        citation: 'Jack Kruse · comunicaciones sobre fotobiomodulación retinal + mitocondrial · biofísica funcional',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · Yang Sheng (nutrición vida) · protección visual matutina como práctica de longevidad · texto Bao Sheng Ba Jian',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Trataka + exposición ocular controlada a sol matutino (Surya Namaskar) · Netra tarpana como práctica de rejuvenecimiento visual · Sushruta Samhita',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'panel_rojo_recovery',
    name: 'Panel luz roja + NIR 660/850 nm (recovery cuerpo)',
    how: 'Panel calibrado dual wavelength 660 nm (red) + 850 nm (NIR), irradiancia 100 mW/cm² a distancia 15 cm, 10-20 min sobre área objetivo (músculos post-esfuerzo, articulaciones dolorosas, cicatrices). Piel expuesta. 4-5×/semana. Aislar de sesión fuerte (no combinar con cold post-fuerza mismo momento).',
    benefit: 'Fotobiomodulación mitocondrial sistémica · 660 nm superficial (5-10 mm) + 850 nm profundo (40-50 mm) cubre piel + músculo + hueso · reduce DOMS, CK sérica post-esfuerzo, mejora recovery muscular, acelera cicatrización (evidencia Ferraresi + Hamblin).',
    categories: ['inflamacion', 'movimiento', 'hormonal', 'cognitivo', 'piel', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'deficit_exposicion_solar', 'disfuncion_mitocondrial'],
    assignRule: 'Deportistas con dolor crónico articular, inflamación local, post-lesión, cicatriz de cirugía · adulto con dolor musculoesquelético crónico funcional. Sin patología cutánea activa maligna en área de aplicación.',
    priority: 3,
    family: 'panel_luz_roja',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'citocromo C oxidasa (Complejo IV mitocondrial · 660 nm + 850 nm dual peak)',
        'ATP mitocondrial (aumento producción documentado)',
        'expresión colágeno tipo I + III (fibroblastos)',
        'proliferación fibroblastos y queratinocitos',
        'angiogénesis local (VEGF · perfusión regional)',
        'satellite cells musculares (regeneración post-esfuerzo)',
        'antioxidantes endógenos (SOD, catalasa · Nrf2 pathway)',
        'β-endorfinas locales (analgesia)',
      ],
      inhibits: [
        'creatina_kinasa (CK) post-ejercicio (Ferraresi 2016)',
        'DOMS percibido (magnitud modest documentada)',
        'IL-6 + TNF-α local (post-ejercicio)',
        'especies reactivas oxígeno excesivas post-esfuerzo',
        'inflamación local aguda',
        'dolor articular crónico funcional',
      ],
      modulates: [
        'recovery muscular percibido',
        'CK sérica',
        'flujo sanguíneo local (aumento perfusión)',
        'temperatura tisular local (aumento 1-2°C)',
        'cicatrización cutánea (aceleración)',
        'función mitocondrial muscular',
      ],
      biomarkers: [
        'creatina_kinasa (CK)',
        'PCR_hs',
        'IL-6',
        'DOMS_score_subjetivo',
        'rango_movimiento_articular',
        'HSP70_sérico',
      ],
      mechanismSummary: '660 nm penetra 5-10 mm (superficial) + 850 nm penetra 40-50 mm (profundo · músculo grande, articulaciones, hueso) · ambas longitudes son absorbidas por citocromo C oxidasa en cadena respiratoria mitocondrial · resultado: aumento ATP, expresión antioxidantes, reducción inflamación local + aceleración recovery. Dual wavelength cubre todo el rango terapéutico.',
    },

    sideEffects: [
      'sensacion_calor_local_leve',
      'enrojecimiento_transitorio_piel',
      'ninguno_grave_documentado',
      'headache_leve (si sobre-exposición cabeza · reducir tiempo)',
      'aumento_energia_percibida_post_sesion',
    ],

    contraindications: [
      'cancer_activo_en_area_aplicacion (fotobiomodulación puede estimular tejido tumoral · controversial · consultar oncólogo)',
      'fotosensibilidad_medicamentosa (retinoides orales, amiodarona, tetraciclinas activas)',
      'lupus_eritematoso_cutaneo_activo',
      'embarazo_relativa_sobre_abdomen',
      'quemaduras_activas_area',
      'infeccion_dermatologica_activa_area',
      'melanoma_activo_area',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'dolor_articular_cronico', score: 'high' },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'profile', field: 'atleta_recovery_deportivo', equals: true },
        { source: 'profile', field: 'post_lesion_musculoesqueletica', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cancer_activo', 'fotosensibilidad_medicamentosa', 'lupus_cutaneo_activo', 'melanoma_activo'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Ferraresi C et al. "Low-level laser (light) therapy increases mitochondrial membrane potential and ATP synthesis in C2C12 myotubes" Photochem Photobiol 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25443660/',
      },
      {
        citation: 'Ferraresi C, Huang YY, Hamblin MR "Photobiomodulation in human muscle tissue: an advantage in sports performance?" J Biophotonics 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27874264/',
      },
      {
        citation: 'Hamblin MR "Mechanisms and applications of the anti-inflammatory effects of photobiomodulation" AIMS Biophys 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28748217/',
      },
      {
        citation: 'Leal-Junior EC et al. "Effect of phototherapy (low-level laser therapy and light-emitting diode therapy) on exercise performance and markers of exercise recovery: a systematic review with meta-analysis" Lasers Med Sci 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25204851/',
      },
      {
        citation: 'Karu TI "Cellular effects of low power laser therapy can be mediated by nitric oxide" Lasers Surg Med 2005',
        paradigm: 'western_academic',
      },
      {
        citation: 'Rhonda Patrick FMF "Red Light Therapy" · síntesis mecanismos PBM',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Light Toolkit" · red light therapy para recovery + mitochondrial function',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ari Whitten "Red Light Therapy Miracle Medicine" 2018 · compilación funcional PBM',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · Moxibustión (moxa · Artemisia vulgaris quemada) · aplicación de calor infrarrojo focalizado en puntos de acupuntura · práctica milenaria · Zhen Jiu Da Cheng',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'panel_rojo_cara',
    name: 'Panel luz roja 660/850 nm para cara (colágeno + piel)',
    how: 'Panel calibrado 660 nm + 850 nm sobre cara, distancia 20-30 cm, 10-15 min, 4-5×/semana. Ojos cerrados o protección ocular. Sin maquillaje ni SPF durante la aplicación. Piel limpia. Combinable con sérum de vitamina C post-aplicación.',
    benefit: 'Estimula síntesis colágeno tipo I + III (Wunsch & Matuschka 2014 · +30-40% densidad colágeno en 12 semanas) · mejora textura piel, líneas finas, tono. Mecanismo idéntico a panel recovery (CCO mitocondrial dermal + fibroblastos) enfocado en dermatología estética + regeneración.',
    categories: ['piel', 'inflamacion', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'deficit_exposicion_solar'],
    assignRule: 'Piel envejecida, textura irregular, líneas finas, melasma modest, cicatrices post-acné, rosácea leve. Sin patología cutánea activa maligna facial.',
    priority: 3,
    family: 'panel_luz_roja',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'citocromo C oxidasa fibroblastos dérmicos',
        'colágeno tipo I + III (Wunsch & Matuschka · +30-40% densidad 12 semanas)',
        'elastina (síntesis + reorganización)',
        'proliferación fibroblastos',
        'angiogénesis dérmica local',
        'antioxidantes endógenos piel (SOD, catalasa · Nrf2)',
        'expresión TGF-β1 (cicatrización)',
        'queratinocitos proliferación',
      ],
      inhibits: [
        'metaloproteinasas MMP-1 + MMP-9 (degradan colágeno · fotoenvejecimiento)',
        'inflamación cutánea crónica sub-clínica',
        'peroxidación lipídica dermal',
        'melanocitos hiperactivos (mejora leve melasma documentada)',
        'lesiones acneicas inflamatorias (efecto anti-P.acnes documentado en 415 nm · red 660 nm coadyuvante)',
      ],
      modulates: [
        'densidad_colageno_dermica (biopsia · +30-40% en 12 semanas)',
        'elasticidad piel (cutometría)',
        'textura piel (score subjetivo + objetivo)',
        'líneas finas periorbitales + peribucales',
        'tono piel (uniformidad)',
        'hidratación dérmica (efecto modest)',
      ],
      biomarkers: [
        'densidad_colageno_dermica_biopsia',
        'elasticidad_piel_cutometria',
        'lineas_finas_perioculares_score',
        'hidratacion_estrato_corneo (corneometría)',
        'PCR_hs',
      ],
      mechanismSummary: 'Aplicación facial de 660 nm + 850 nm activa CCO en fibroblastos dérmicos · aumenta ATP disponible para síntesis de colágeno tipo I + III y elastina · efecto: engrosamiento dermal, mejora elasticidad, reducción líneas finas, uniformización tono. Wunsch & Matuschka 2014 documentó cambios objetivos post 12 semanas.',
    },

    sideEffects: [
      'sensacion_calor_facial_leve',
      'enrojecimiento_transitorio_post',
      'sensibilidad_ocular_si_sin_proteccion (usar goggles)',
      'ninguno_grave_documentado',
      'ligera_sequedad_transitoria (hidratar post)',
    ],

    contraindications: [
      'cancer_cutaneo_facial_activo',
      'melanoma_facial',
      'fotosensibilidad_medicamentosa (retinoides, amiodarona, tetraciclinas)',
      'lupus_cutaneo_activo_facial',
      'porfiria',
      'embarazo_relativa (falta datos suficientes específicos faciales)',
      'roseacea_severa_ulcerada (relativa)',
      'infeccion_activa_facial (herpes activo · esperar resolución)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'edad_35_o_mas', equals: true },
        { source: 'quiz', questionnaire: 'envejecimiento_piel', score: 'high' },
        { source: 'profile', field: 'condiciones', in: ['cicatrices_post_acne', 'rosacea_leve', 'melasma_leve'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cancer_cutaneo_facial', 'melanoma_facial', 'fotosensibilidad_medicamentosa', 'lupus_cutaneo_activo', 'porfiria', 'herpes_facial_activo'] },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Wunsch A, Matuschka K "A controlled trial to determine the efficacy of red and near-infrared light treatment in patient satisfaction, reduction of fine lines, wrinkles, skin roughness, and intradermal collagen density increase" Photomed Laser Surg 2014',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24286286/',
      },
      {
        citation: 'Barolet D et al. "Infrared and skin: Friend or foe" J Photochem Photobiol B 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26745730/',
      },
      {
        citation: 'Avci P et al. "Low-level laser (light) therapy (LLLT) in skin: stimulating, healing, restoring" Semin Cutan Med Surg 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24049929/',
      },
      {
        citation: 'Hamblin MR · síntesis mecanismos LLLT dermatológica',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ari Whitten "Red Light Therapy" · sección dermatológica',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Rhonda Patrick FMF "Red Light" · aplicación cosmética + longevidad',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Skin Health Toolkit" · red light como intervención dermatológica',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Ubtan (pasta cúrcuma + harina de garbanzo + leche) + exposición al sol matutino para piel radiante · Kashyapa Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · moxibustión facial (Mian Bu Jiu) en puntos Yingxiang LI20 + Sibai ST2 · calor infrarrojo tradicional para tez',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'ejercicio_ocular_near_far',
    name: 'Ejercicio ocular cerca/lejos (regla 20-20-20)',
    how: 'Cada 20 minutos de trabajo con pantalla, desviar la mirada a un objeto a ≥6 metros (20 pies) durante 20 segundos. Repetir varias veces por hora. Alternativa avanzada: 3-5 ciclos consecutivos alternando foco cerca (30 cm) ↔ lejos (>6 m) durante 60-90 seg.',
    benefit: 'Relajación cíclica del músculo ciliar post-acomodación sostenida · previene fatiga acomodativa, reduce miopía adquirida por near work crónico (mecanismo Rosenfield · CVS · Computer Vision Syndrome), preserva flexibilidad acomodativa en usuarios de pantalla >4 h/día.',
    categories: ['cognitivo', 'ritual'],
    roots: ['sobreexposicion_luz_azul'],
    assignRule: 'Trabajo con pantalla >4 h/día, miopía en progresión, fatiga ocular vespertina, cefalea tensional relacionada con pantalla, adolescentes/jóvenes con near work intensivo. Sin contraindicaciones.',
    priority: 2,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'relajación músculo ciliar (parasimpático M3 muscarínico)',
        'circulación intraocular (renovación humor acuoso)',
        'oxigenación tisular ocular por parpadeo asociado',
        'atención visual periférica (opuesta a foco tunelado)',
        'micro-descansos cognitivos (Ultradian rest pattern)',
      ],
      inhibits: [
        'fatiga músculo ciliar (contracción sostenida)',
        'espasmo acomodativo (transient pseudomyopia)',
        'cefalea tensional relacionada con pantalla',
        'CVS symptoms (Computer Vision Syndrome)',
        'ojo seco por sub-parpadeo (indirectamente · parpadeo aumentado al mirar lejos)',
      ],
      modulates: [
        'punto próximo acomodación (PPC · cm)',
        'flexibilidad acomodativa (dioptrías/segundo)',
        'agudeza visual sostenida',
        'sintomas CVS score subjetivo',
        'atención sostenida (recovery cognitivo por micro-break)',
      ],
      biomarkers: [
        'punto_proximo_acomodacion_cm',
        'flexibilidad_acomodativa_dioptrias_seg',
        'sintomas_CVS_score',
        'fatiga_ocular_vespertina_subjetivo',
        'progresion_miopia_dioptrias_anual (uso pediatrico/adolescente)',
      ],
      mechanismSummary: 'Trabajo cercano sostenido requiere contracción muscular ciliar continua para acomodación · a 20 pies o más, la acomodación es esencialmente cero (relajación total del músculo ciliar) · alternar cada 20 min permite descarga muscular cíclica que previene fatiga acumulada + espasmo acomodativo. Beneficio ergonómico oficial reconocido por AOA + Rosenfield CVS research.',
    },

    sideEffects: [
      'interrupcion_flow_deep_work (minima si integrada)',
      'ninguno_grave',
      'necesidad_recordatorio_activo (aplicaciones tipo EyeCare, Time Out)',
    ],

    contraindications: [
      'ninguna_absoluta',
      'ambliopía_no_tratada_relativa (no dañina · consultar oftalmólogo por progresión)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'trabajo_pantalla_horas', score: 'high' },
        { source: 'quiz', questionnaire: 'fatiga_ocular_vespertina', score: 'high' },
        { source: 'quiz', questionnaire: 'cefalea_tensional_pantalla', score: 'high' },
        { source: 'profile', field: 'miopia_en_progresion', equals: true },
        { source: 'profile', field: 'menor_de_20_anos', equals: true },
      ],
      excludeIf: [],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Rosenfield M "Computer vision syndrome: a review of ocular causes and potential treatments" Ophthalmic Physiol Opt 2011',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21480937/',
      },
      {
        citation: 'American Optometric Association "20-20-20 rule" · recomendación oficial ergonómica',
        paradigm: 'western_academic',
      },
      {
        citation: 'Sheppard AL, Wolffsohn JS "Digital eye strain: prevalence, measurement and amelioration" BMJ Open Ophthalmol 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29963645/',
      },
      {
        citation: 'Hussaindeen JR et al. "Efficacy of vision therapy in children with learning disability and associated binocular vision anomalies" J Optom 2018 · protocolos vision therapy',
        paradigm: 'western_academic',
      },
      {
        citation: 'MTC · Ojos = ventana al Hígado · rotación ocular + descanso visual como práctica preventiva Yang Sheng · Sun Simiao Bei Ji Qian Jin Yao Fang',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Trataka (fijación visual) + Netra Vyayama (ejercicios oculares) · Hatha Yoga Pradipika Shatkarma + Gheranda Samhita',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Bates WH "The Cure of Imperfect Sight by Treatment Without Glasses" 1920 · método Bates (evidence controversial · pero legado en protocolo Palming + Shifting)',
        paradigm: 'traditional_documented',
        paradigmConflict: 'Método Bates carece de evidencia occidental sólida en corrección refracción · pero protocolos derivados (relajación acomodativa) sí tienen sustento fisiológico moderno.',
      },
      {
        citation: 'Andrew Huberman "Vision Toolkit" · panoramic vision + long-distance viewing como recovery ocular',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'parpadeo_consciente',
    name: 'Parpadeo consciente en pantalla (completo · 5×/min)',
    how: 'Durante trabajo con pantalla, hacer parpadeos completos (cerrar párpados hasta juntar) conscientes ~5 veces por minuto (frecuencia natural sin pantalla). Reforzar cada hora. Hidratar ojos con lágrima artificial libre de conservadores si necesario.',
    benefit: 'Contrarresta sub-parpadeo pantalla-inducido (Patel 1991 · frecuencia parpadeo baja 60% durante uso pantalla vs baseline) · restaura película lagrimal, previene ojo seco crónico, ojo rojo vespertino, disestesias oculares. Sin costo, universalmente disponible.',
    categories: ['ritual', 'cognitivo'],
    roots: ['sobreexposicion_luz_azul'],
    assignRule: 'Trabajo pantalla >4 h/día, ojo seco funcional, ojo rojo vespertino, sensación de ardor ocular sub-clínica, usuarios de lentes de contacto.',
    priority: 3,
    evidenceLevel: 'N3',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'función glandular meibomiana (lípidos película lagrimal)',
        'renovación película lagrimal (3 capas: mucina + acuosa + lipídica)',
        'reflejo lagrimal (rama V1 trigémino)',
        'M. orbicularis palpebral (fuerza + tono)',
        'humectación corneal',
        'confort ocular subjetivo',
      ],
      inhibits: [
        'evaporación película lagrimal',
        'sequedad corneal',
        'inflamación corneal sub-clínica',
        'sensacion arenilla + ardor',
        'fatiga ocular acumulada',
      ],
      modulates: [
        'TBUT (tear break-up time · segundos)',
        'Schirmer test (mm/5 min)',
        'osmolaridad lagrimal',
        'confort ocular vespertino',
        'función glandular meibomiana',
      ],
      biomarkers: [
        'TBUT_segundos',
        'Schirmer_mm_5min',
        'osmolaridad_lagrimal_mOsm/L',
        'OSDI_score (Ocular Surface Disease Index)',
        'meibografía_score',
      ],
      mechanismSummary: 'El parpadeo natural (15-20/min) mantiene la película lagrimal (mucina + acuosa + lipídica) constantemente renovada · durante uso pantalla, la frecuencia cae a 5-7/min (Patel 1991), causando evaporación excesiva → ojo seco. Parpadeo consciente completo restaura la función de barrido palpebral + expresión meibomiana + hidratación corneal.',
    },

    sideEffects: [
      'ninguno_documentado',
      'ligera_incomodidad_inicial_por_atencion_activa',
      'liberacion_emocional_transitoria (lágrimas · benigno)',
    ],

    contraindications: [
      'ninguna_absoluta',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'ojo_seco_score', score: 'high' },
        { source: 'quiz', questionnaire: 'trabajo_pantalla_horas', score: 'high' },
        { source: 'profile', field: 'usuario_lentes_contacto', equals: true },
        { source: 'quiz', questionnaire: 'ardor_ocular_vespertino', score: 'high' },
      ],
      excludeIf: [],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Patel S, Henderson R, Bradley L, Galloway B, Hunter L "Effect of visual display unit use on blink rate and tear stability" Optom Vis Sci 1991 · reducción parpadeo -60% durante VDU use',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/1749772/',
      },
      {
        citation: 'Portello JK et al. "Blink rate, incomplete blinks and computer vision syndrome" Optom Vis Sci 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23458847/',
      },
      {
        citation: 'Rosenfield M "Computer vision syndrome" (referencia anterior)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Craig JP et al. "TFOS DEWS II Definition and Classification Report" Ocul Surf 2017 · definición actual dry eye disease',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28736335/',
      },
      {
        citation: 'MTC · Ejercicios oculares "Ba Duan Jin" incluyen parpadeo consciente + rotación · Yang Sheng preventivo',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Netra Kriya (higiene ocular) · parpadeo consciente + splash agua fría matutina · Gheranda Samhita Shatkarma',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Bates WH · método incluye "blinking natural" como práctica base · legado en vision therapy contemporánea',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Kim AD et al. "A review of the treatment of dry eye" Curr Opin Ophthalmol 2020 · blinking exercises como intervención de primera línea',
        paradigm: 'western_academic',
      },
    ],
  },
  {
    key: 'compresa_fria_ojos',
    name: 'Compresa fría en ojos (5-10 min · vespertino)',
    how: 'Gel pack o compresa de tela con agua fría (10-15°C · NO congelada directa · riesgo quemadura). 5-10 min sobre párpados cerrados, en descanso post-pantalla o al despertar hinchado. 1-2×/día según necesidad. Alternativa: rodajas de pepino fresco (efecto placebo + refrescante mecánico).',
    benefit: 'Vasoconstricción periorbital reduce inflamación, edema y sensación de fatiga · alivia hinchazón matutina (líquido intersticial acumulado), migraña ocular incipiente, alergia ocular estacional. Reset dermato-vascular ocular simple + costo cero.',
    categories: ['piel', 'cognitivo', 'ritual'],
    roots: ['inflamacion_silenciosa', 'sobreexposicion_luz_azul'],
    assignRule: 'Fatiga ocular, hinchazón matutina periorbital, alergias oculares (rinoconjuntivitis), migraña ocular incipiente, post-llanto prolongado, jet lag visual.',
    priority: 3,
    evidenceLevel: 'N3',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'vasoconstricción periorbital (α-adrenérgica cutánea)',
        'reducción edema periorbital',
        'confort visual post-pantalla',
        'liberación histamina reducida (alergia)',
        'relajación M. orbicularis palpebral',
        'analgesia local (crioanestesia)',
      ],
      inhibits: [
        'inflamación periorbital aguda',
        'edema líquido intersticial',
        'sensacion fatiga ocular',
        'rubor palpebral (alergia + fatiga)',
        'espasmo palpebral leve',
      ],
      modulates: [
        'volumen periorbital (hinchazón visible)',
        'flujo sanguíneo periorbital (vasoconstricción-vasodilatación de rebote)',
        'temperatura ocular local',
        'confort visual subjetivo',
        'fatiga ocular acumulada',
      ],
      biomarkers: [
        'edema_periorbital_visible_score',
        'fatiga_ocular_score_subjetivo',
        'sintomas_conjuntivales_alergia_score',
        'PCR_hs (efecto sistemico modest)',
      ],
      mechanismSummary: 'La aplicación de frío (10-15°C) sobre párpados induce vasoconstricción cutánea periorbital · reduce edema por líquido intersticial + limita inflamación local + analgesia por reducción de conducción nerviosa nociceptiva. Efecto agudo simple pero efectivo para hinchazón matutina, fatiga vespertina y alergia ocular.',
    },

    sideEffects: [
      'sensacion_frio_inicial',
      'enrojecimiento_periorbital_rebote (vasodilatación reactiva post)',
      'sensibilidad_frio_transitoria',
      'ninguno_grave',
      'quemadura_por_frio (si hielo directo sin tela)',
    ],

    contraindications: [
      'crioglobulinemia',
      'raynaud_severo_facial',
      'infeccion_ocular_activa (conjuntivitis bacteriana · consultar médico antes)',
      'trauma_ocular_reciente',
      'cirugía_ocular_reciente_<3meses',
      'sensibilidad_frio_extrema_facial',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'fatiga_ocular_vespertina', score: 'high' },
        { source: 'quiz', questionnaire: 'hinchazon_matutina_periorbital', score: 'high' },
        { source: 'profile', field: 'condiciones', in: ['rinoconjuntivitis_alergica', 'migraña_ocular_frecuente'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['crioglobulinemia', 'raynaud_severo_facial', 'infeccion_ocular_activa', 'trauma_ocular_reciente'] },
      ],
      boostWeight: 1,
    },

    sources: [
      {
        citation: 'Fujishima H et al. "Effects of a Cooling Eye Mask on Eye Fatigue and Eye Comfort" Nippon Ganka Gakkai Zasshi 2003',
        paradigm: 'western_academic',
      },
      {
        citation: 'Bilkhu PS et al. "Effect of a warm compress on tear film stability in dry eye disease" Optom Vis Sci 2014 (comparación warm vs cold)',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24334311/',
      },
      {
        citation: 'AAO Preferred Practice Pattern · Ojo seco y fatiga visual · uso compresas frías/tibias según indicación',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ayurveda · Netra Tarpana + splash agua fresca ocular matutina · Sushruta Samhita Uttara Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · aplicación de compresa fría con hierbas (Ju Hua · Chrysanthemum morifolium) sobre ojos · práctica preventiva tradicional para Hígado Yang ascendente',
        paradigm: 'tcm',
      },
      {
        citation: 'Tradición europea popular · rodajas de pepino / bolsas de té frías sobre ojos · práctica cosmética + refrescante milenaria',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Sebastian Kneipp · aplicaciones frías locales para "refrescar el ojo cansado" · Meine Wasserkur 1886',
        paradigm: 'traditional_documented',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVIMIENTO + FUERZA
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'pausas_activas_60min',
    name: 'Pausas activas cada 60 min (2 min · estiramiento + respiración)',
    how: 'Cada hora: levántate del asiento, 2 min mínimo · estiramiento cervical (rotación + laterales) + puntitas (10-15 rep) + respiración diafragmática 5 ciclos + hidratación 100-200 ml. Idealmente pasear 100 pasos. Recordatorio automatizable (Time Out, Stretchly).',
    benefit: 'Dempsey/Owen 2012 · interrumpir sedentarismo cada hora reduce glucosa postprandial + insulina 20-25% · rompe estasis linfática, resetea foco cognitivo (ultradian break), previene tensión postural cervical + lumbar. Frecuencia estándar validada.',
    categories: ['movimiento', 'ritual', 'cognitivo', 'cardiovascular', 'metabolismo'],
    roots: ['sedentarismo', 'sarcopenia', 'ritmo_circadiano_desregulado', 'estres_cronico', 'hiperinsulinemia'],
    assignRule: 'Trabajo sentado >6 h/día, dolor lumbar/cervical funcional, caídas de foco vespertino, resistencia a la insulina, hiperinsulinemia. Universal para knowledge workers.',
    priority: 2,
    family: 'pausas_activas',
    evidenceLevel: 'N1',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'GLUT4 translocación muscular (activación aguda por contracción)',
        'AMPK muscular (sensor energético · activado por contracción breve)',
        'flujo linfático (bombeo mecánico por movimiento)',
        'circulación venosa retorno (bomba muscular pantorrilla)',
        'tono postural (M. paraespinales + core)',
        'atención sostenida post-break (ultradian cognitive reset)',
        'HRV RMSSD (mejora modest post-break)',
        'sensibilidad insulina aguda (Dempsey 2012)',
      ],
      inhibits: [
        'glucosa postprandial (Dunstan/Owen 2012 · -20-25% AUC glucosa)',
        'insulina postprandial (-25%)',
        'estasis venosa MMII (previene TVP funcional)',
        'tensión cervical + lumbar acumulada',
        'fatiga cognitiva (mental fatigue)',
        'expresión LPL (lipoprotein lipasa) inhibida por sedentarismo prolongado',
      ],
      modulates: [
        'glucosa_postprandial_AUC',
        'insulina_postprandial',
        'HRV RMSSD',
        'atención sostenida (test PVT · reacción)',
        'dolor cervical/lumbar percibido',
        'volumen linfático MMII',
        'productividad percibida (paradoja: pausas → +productividad · Ariga & Lleras 2011)',
      ],
      biomarkers: [
        'glucosa_ayunas',
        'glucosa_postprandial_2h',
        'HbA1c',
        'HOMA-IR',
        'insulina_ayunas',
        'test_reaccion_ms',
        'HRV RMSSD',
        'dolor_cervical_lumbar_score',
      ],
      mechanismSummary: 'Sedentarismo prolongado suprime LPL muscular (Bey & Hamilton 2003) + reduce GLUT4 translocación → resistencia insulina aguda. Cada interrupción activa (levantarse + estiramiento + 2 min movimiento) reactiva contracción muscular, LPL, GLUT4 → mejora clearance glucosa + insulina post-comida (Dempsey/Owen · -20-25% AUC). Bonus cognitivo: ultradian reset atencional (Ariga 2011).',
    },

    sideEffects: [
      'interrupcion_flow_deep_work (si mal manejado)',
      'ninguno_grave',
      'ligera_incomodidad_muscular_inicial (adaptación 1 semana)',
    ],

    contraindications: [
      'ninguna_absoluta',
      'lesión_musculoesquelética_activa_relativa (adaptar movimientos)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'trabajo_sentado_horas', score: 'high' },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'quiz', questionnaire: 'dolor_cervical_lumbar', score: 'high' },
      ],
      excludeIf: [],
      boostWeight: 4,
    },

    sources: [
      {
        citation: 'Dunstan DW et al. "Breaking up prolonged sitting reduces postprandial glucose and insulin responses" Diabetes Care 2012 · -20-25% AUC glucosa con breaks 2 min c/20 min',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22374636/',
      },
      {
        citation: 'Dempsey PC et al. "Interrupting prolonged sitting with brief bouts of light walking or simple resistance activities reduces resting blood pressure and plasma noradrenaline in type 2 diabetes" J Hypertens 2016',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27341499/',
      },
      {
        citation: 'Chastin SFM et al. "Meta-analysis of the relationship between breaks in sedentary behavior and cardiometabolic health" Obesity 2015',
        paradigm: 'western_academic',
      },
      {
        citation: 'Bey L, Hamilton MT "Suppression of skeletal muscle lipoprotein lipase activity during physical inactivity" J Physiol 2003 · mecanismo LPL suppression',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12813151/',
      },
      {
        citation: 'Ariga A, Lleras A "Brief and rare mental \'breaks\' keep you focused" Cognition 2011 · vigilance decrement + micro-breaks',
        paradigm: 'western_academic',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 · sedentarismo como factor de riesgo independiente de VO2max',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Fitness Toolkit" · movement snacks / NEAT (non-exercise activity thermogenesis)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · práctica de Ba Duan Jin (8 piezas de brocado) cada hora en oficinas tradicionales chinas · Yang Sheng preventivo',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Vyayama ligero durante la jornada · movimiento hasta ardhashakti (media capacidad) como intervención cotidiana · Charaka Samhita',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'pausas_activas_90min',
    name: 'Pausas activas cada 90 min (2-3 min · deep work friendly)',
    how: 'Cada 90 minutos (alineado con ciclo ultradiano BRAC · Kleitman): 2-3 min de estiramiento cervical + torácico + respiración diafragmática + hidratación. Frecuencia menor que 60 min · óptima para deep work sostenido sin fragmentación.',
    benefit: 'Alineación con ciclo ultradiano natural (BRAC · Basic Rest-Activity Cycle · Kleitman 1963) · balance entre disruption cognitiva mínima + suficiente metabolic break. Para knowledge workers en flow state prolongado que rechazan interrupciones más frecuentes.',
    categories: ['movimiento', 'ritual', 'cognitivo', 'cardiovascular'],
    roots: ['sedentarismo', 'sarcopenia', 'estres_cronico'],
    assignRule: 'Deep work sostenido con baja tolerancia a interrupción, escritores, programadores, investigadores en flow prolongado. Alternativa a 60 min si esa frecuencia rompe demasiado. Menos protector metabólico que 60 min pero preserva flow.',
    priority: 2,
    family: 'pausas_activas',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'GLUT4 translocación muscular (magnitud menor que 60 min · dosis menor)',
        'AMPK muscular',
        'flujo linfático + venoso',
        'atención sostenida post-break (alineado ultradian)',
        'tono postural',
        'HRV RMSSD (mejora modest)',
        'función mitocondrial baseline (por movimiento diario acumulado)',
      ],
      inhibits: [
        'glucosa postprandial (magnitud menor que 60 min · efecto real pero atenuado)',
        'estasis venosa MMII',
        'tensión cervical/lumbar (protección modest)',
        'fatiga cognitiva',
        'LPL suppression (menor magnitud que 60 min)',
      ],
      modulates: [
        'glucosa_postprandial (efecto menor)',
        'HRV RMSSD',
        'atención sostenida',
        'productividad flow-preservada',
        'dolor cervical/lumbar (protección modest)',
      ],
      biomarkers: [
        'glucosa_postprandial_2h',
        'HbA1c',
        'HRV RMSSD',
        'test_reaccion_ms',
        'dolor_cervical_lumbar_score',
      ],
      mechanismSummary: 'Frecuencia 90 min alineada con ciclo ultradiano BRAC de Kleitman (ciclo natural alerta-descanso de 90 min) · reactivación metabólica muscular menor magnitud que 60 min pero preserva flow cognitivo de knowledge workers. Trade-off consciente: menos protección metabólica a cambio de más deep work productivo.',
    },

    sideEffects: [
      'menor_proteccion_metabolica_que_60min',
      'ninguno_grave',
      'incomodidad_muscular_inicial (adaptación 1 semana)',
    ],

    contraindications: [
      'ninguna_absoluta',
      'diabetes_tipo_2_activa_relativa (60 min preferible por mayor beneficio glucémico)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'deep_work_intolerancia_interrupcion', score: 'high' },
        { source: 'profile', field: 'trabajo_creativo_flow', equals: true },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 4 },
      ],
      excludeIf: [
        { source: 'profile', field: 'diabetes_tipo_2', equals: true },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Kleitman N "Sleep and Wakefulness" 1963 · BRAC (Basic Rest-Activity Cycle) 90 min ultradian',
        paradigm: 'western_academic',
      },
      {
        citation: 'Newport C "Deep Work" 2016 · preservación de flow como capacidad productiva escasa',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Csikszentmihalyi M "Flow: The Psychology of Optimal Experience" 1990 · flow state + tolerancia a interrupción',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Rossi EL "The 20-Minute Break: Reduce Stress, Maximize Performance, and Improve Health and Emotional Well-Being" 1991 · aplicación clínica BRAC',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Dempsey PC · comparación frecuencias breaks · beneficio real pero menor a mayor intervalo (referencia base familia)',
        paradigm: 'western_academic',
      },
      {
        citation: 'Andrew Huberman "Ultradian Rhythms + Focus" · ciclo 90 min como unit natural de deep work',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · Reloj de órganos y práctica energética horaria · movimientos preventivos cada 2h (menos frecuente que oficina moderna)',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Vyayama alternado con Dhyana (contemplación) · ritmo natural de esfuerzo-descanso · Charaka Samhita',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'standing_desk',
    name: 'Escritorio elevado (standing desk · alternado)',
    how: 'Alternar cada 45-60 min entre sentado y de pie durante jornada laboral (proporción ideal ~50/50 · Buckley 2014 · Buckley/Chastin protocolos). Usar cushion anti-fatiga si de pie prolongado. Zapato plano, base amplia. NO estar de pie estático >2h continuas · rotar postura.',
    benefit: 'Buckley 2014 · 185 min de pie post-comida atenuaron glucosa postprandial en 43%. Reduce mortalidad asociada a sedentarismo (Chastin meta-analysis), activa cadena posterior (glúteos, isquios), mejora postura, previene dolor lumbar funcional. Complemento a pausas activas.',
    categories: ['movimiento', 'metabolismo', 'cardiovascular', 'ritual', 'sarcopenia'],
    roots: ['sedentarismo', 'sarcopenia', 'hiperinsulinemia', 'resistencia_insulina'],
    assignRule: 'Trabajo sentado >6 h/día, dolor lumbar funcional (postural), glucosa postprandial elevada, resistencia insulina, HbA1c 5.7-6.4%. Sin contraindicaciones ortopédicas mayores para bipedestación prolongada.',
    priority: 2,
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'contracción tónica músculos posturales (paraespinales + glúteos + isquios + cuádriceps)',
        'LPL (lipoprotein lipasa) muscular · revierte suppresión sedentaria',
        'GLUT4 translocación muscular (activación tónica)',
        'circulación venosa retorno (bomba muscular pantorrilla)',
        'gasto energético diario NEAT (+15-30% vs sentado estático)',
        'flujo linfático MMII',
        'atención sostenida (bipedestación mantiene arousal · vs somnolencia sentada post-comida)',
      ],
      inhibits: [
        'glucosa postprandial (Buckley 2014 · -43% AUC con 185 min de pie post-comida)',
        'insulina postprandial',
        'estasis venosa MMII (previene TVP funcional)',
        'contractura M. flexores cadera (por sedestación prolongada)',
        'atrofia glútea funcional ("dead butt syndrome")',
        'suppression LPL crónica',
        'mortalidad todas causas asociada a sedentarismo (Chastin 2015)',
      ],
      modulates: [
        'glucosa_postprandial_AUC (-43% Buckley)',
        'insulina_postprandial',
        'NEAT diario (aumento 100-200 kcal/día · Levine 2005)',
        'postura + fuerza core',
        'dolor lumbar postural',
        'productividad + alerta cognitiva',
        'HRV RMSSD (efecto modest)',
      ],
      biomarkers: [
        'glucosa_postprandial_2h',
        'HbA1c',
        'HOMA-IR',
        'insulina_ayunas',
        'dolor_lumbar_score',
        'triglicéridos',
        'ratio_cintura_altura',
        'gasto_energético_total_TDEE',
      ],
      mechanismSummary: 'Bipedestación activa músculos posturales tónicos (paraespinales + glúteos + isquios), revierte la suppresión de LPL muscular inducida por sedestación prolongada (Bey & Hamilton 2003) y aumenta NEAT en 100-200 kcal/día. Buckley 2014 documentó -43% AUC glucosa postprandial con 185 min bipedestación. Complementario a pausas activas · NO sustituto de ejercicio estructurado.',
    },

    sideEffects: [
      'dolor_MMII_inicial (adaptación 2-3 semanas)',
      'fatiga_pantorrillas',
      'venas_varicosas_agravadas (si bipedestación estática >2h · alternar peso, cushion anti-fatiga)',
      'dolor_lumbar_inicial_paradójico (adaptación postural)',
      'hinchazon_MMII_transitoria (vespertino)',
      'callosidades_plantares (si zapato inadecuado)',
    ],

    contraindications: [
      'insuficiencia_venosa_severa_no_tratada',
      'trombosis_venosa_profunda_activa',
      'lesion_MMII_aguda_no_rehabilitada',
      'dolor_plantar_severo_activo (fascitis plantar aguda)',
      'artritis_severa_rodilla_cadera_activa',
      'embarazo_tercer_trimestre_relativa (adaptar tiempos)',
      'sindrome_ortostático_severo (POTS · síncope)',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'trabajo_sentado_horas', score: 'high' },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
        { source: 'quiz', questionnaire: 'dolor_lumbar_postural', score: 'high' },
        { source: 'lab', marker: 'ratio_cintura_altura', operator: '>=', value: 0.5 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['insuficiencia_venosa_severa', 'trombosis_venosa_profunda_activa', 'fascitis_plantar_aguda', 'artritis_severa_MMII_activa', 'sindrome_ortostatico_severo'] },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Buckley JP et al. "Standing-based office work shows encouraging signs of attenuating post-prandial glycaemic excursion" Occup Environ Med 2014 · -43% AUC glucosa con 185 min de pie',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24297826/',
      },
      {
        citation: 'Chastin SFM et al. "Meta-analysis of the relationship between breaks in sedentary behavior and cardiometabolic health" Obesity 2015',
        paradigm: 'western_academic',
      },
      {
        citation: 'Katzmarzyk PT et al. "Sitting time and mortality from all causes, cardiovascular disease, and cancer" Med Sci Sports Exerc 2009 · sedentarismo predictor independiente mortalidad',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19346988/',
      },
      {
        citation: 'Levine JA et al. "Interindividual variation in posture allocation: possible role in human obesity" Science 2005 · NEAT como diferenciador obesidad',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/15681386/',
      },
      {
        citation: 'Bey L, Hamilton MT J Physiol 2003 · LPL suppression mecanismo',
        paradigm: 'western_academic',
      },
      {
        citation: 'Owen N et al. "Adults\' sedentary behavior: Determinants and interventions" Am J Prev Med 2011',
        paradigm: 'western_academic',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 · sedentarismo como riesgo independiente + intervención NEAT',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Rhonda Patrick FMF "Standing Desk + NEAT" · síntesis mecanismos',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Mark Sisson "Primal Blueprint" 2009 · argumento evolutivo · Homo sapiens no diseñado para sedestación prolongada',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición monástica medieval · escritorios altos (stand-up desks) usados por escribas monjes (Leonardo da Vinci, Thomas Jefferson, Winston Churchill documentados) · práctica funcional documentada',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'meta_pasos_8k',
    name: 'Meta 8,000 pasos diarios',
    how: 'Distribuye 8,000 pasos al día a lo largo de la jornada, no en un solo bloque. Contar con reloj/teléfono. Prioriza continuidad diaria sobre picos puntuales. Alternativa: 3 caminatas de 15-20 min post-comidas (efecto glucémico añadido).',
    benefit: 'Umbral funcional real de reducción de mortalidad (Paluch 2022 Lancet Public Health · plateau 6-8K en ≥60 años). Activa AMPK muscular, mejora glucosa postprandial, empuja HRV.',
    categories: ['movimiento', 'cardiovascular', 'metabolismo', 'ritual'],
    roots: ['sedentarismo', 'sarcopenia', 'hiperinsulinemia'],
    assignRule: 'Sedentario que empieza a moverse. Flag P1 si HbA1c ≥5.7, sedentarismo laboral, obesidad, edad ≥60.',
    priority: 2,
    family: 'meta_pasos',
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'AMPK muscular (energy sensor · biogénesis mitocondrial)',
        'GLUT4 translocación muscular (glucosa uptake insulin-independiente)',
        'PGC-1α muscular (biogénesis mitocondrial baja intensidad)',
        'lipoproteín lipasa muscular (LPL · aclaramiento triglicéridos)',
        'eNOS endotelial (óxido nítrico vasodilatación)',
        'BDNF (aumento post-caminata documentado)',
      ],
      inhibits: [
        'expresión LPL adiposa (redistribución de captación TG hacia músculo)',
        'inflamación silenciosa (PCR se reduce con >7K/día crónico)',
        'mortalidad por todas las causas (dosis-respuesta clara hasta 6-8K)',
        'insulina postprandial (caminata post-comida atenúa pico hasta 30%)',
      ],
      modulates: [
        'glucosa postprandial',
        'HRV (aumento crónico con adherencia)',
        'temperatura corporal (termogénesis por actividad ligera · NEAT)',
        'HDL colesterol (aumento modesto sostenido)',
        'presión arterial (reducción 3-5 mmHg en HTA leve)',
        'composición corporal (mantenimiento peso, no pérdida agresiva)',
      ],
      biomarkers: [
        'pasos_diarios_promedio_wearable',
        'HbA1c',
        'HOMA-IR',
        'glucosa_ayunas',
        'HDL',
        'trigliceridos',
        'PCR_hs',
        'presion_arterial_sistolica',
        'HRV RMSSD',
        'grip_strength_kg_dinamometro',
      ],
      mechanismSummary: 'La caminata continua a baja intensidad activa AMPK muscular sin agotar glucógeno, translocalizando GLUT4 a la membrana (uptake glucosa insulina-independiente) y estimulando LPL muscular que captura triglicéridos circulantes hacia el músculo · efecto acumulativo baja glucosa/insulina/inflamación silenciosa.',
    },
    sideEffects: [
      'ampollas_pies_iniciales (calzado inadecuado)',
      'fasciitis_plantar_riesgo (si progresión abrupta desde muy sedentario)',
      'sobreuso_tibial (shin splints raro pero posible en asfalto)',
    ],
    contraindications: [
      'inmovilizacion_medica_prescrita (post-quirúrgico ortopédico agudo)',
      'ulceras_diabeticas_pies_activas',
      'fractura_reciente_no_consolidada',
      'trombosis_venosa_profunda_aguda',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'profile', field: 'sedentarismo_score', equals: 'high' },
        { source: 'profile', field: 'edad_60_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['inmovilizacion_medica', 'ulceras_diabeticas_activas', 'fractura_no_consolidada', 'tvp_aguda'] },
      ],
      boostWeight: 4,
    },
    sources: [
      {
        citation: 'Paluch AE et al. "Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts" Lancet Public Health 2022 · plateau ≥60 años 6-8K, <60 años 8-10K',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
        industryFunded: false,
      },
      {
        citation: 'Lee IM et al. "Association of Step Volume and Intensity With All-Cause Mortality in Older Women" JAMA Intern Med 2019 · 4,400 vs 2,700 pasos → 41% menor mortalidad · plateau 7,500',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31141585/',
        industryFunded: false,
      },
      {
        citation: 'Hamilton MT "The role of skeletal muscle contractile duration throughout the whole day: reducing sedentary time and promoting universal physical activity in all people" J Physiol 2018 · LPL muscular vs adiposa',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28643826/',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 cap Exercise · zona 1 (walking) como base metabólica no-negociable',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Chankramana (caminata) como Vyayama ligero, parte de Dinacharya matutina · Charaka Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · caminata lenta post-comida (Fan Bu 饭步) tradicionalmente recomendada 100 pasos post-cena para asistir Bazo/Estómago (脾胃)',
        paradigm: 'tcm',
      },
      {
        citation: 'Ernesto Prieto Gratacós "Gasto metabólico y longevidad" · NEAT (Non-Exercise Activity Thermogenesis) como palanca metabólica infravalorada',
        paradigm: 'functional_independent',
        paradigmConflict: 'Nota histórica: la meta cultural "10K pasos" viene de campaña Manpo-Kei japonesa 1965 (marketing podómetro Yamasa), no de ciencia · Paluch 2022 recalibra al listón real 6-8K.',
      },
    ],
  },
  {
    key: 'meta_pasos_10k',
    name: 'Meta 10,000 pasos diarios',
    how: '10,000 pasos distribuidos. Óptimo cardiovascular en <60 años (Paluch 2022). Incluir gradiente/desnivel si posible (activa cadena posterior + gasto energético +20-30%).',
    benefit: 'Ganancia cardiovascular óptima en adultos <60. Volumen suficiente para composición corporal, empuja HRV y mejora VO2max sub-máximo.',
    categories: ['movimiento', 'cardiovascular', 'metabolismo', 'ritual'],
    roots: ['sedentarismo', 'sarcopenia', 'hiperinsulinemia', 'hipertension'],
    assignRule: 'Adulto <60 buscando longevidad cardiovascular óptima. Flag P1 si base ya en 8K y quiere subir listón.',
    priority: 1,
    family: 'meta_pasos',
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'AMPK muscular (mayor volumen que 8K)',
        'PGC-1α aumento sostenido',
        'HIF-1α leve (hipoxia relativa muscular)',
        'BDNF (Ratey "Spark" · caminata regular)',
        'irisina baseline modesta',
        'eNOS endotelial sostenido',
      ],
      inhibits: [
        'mortalidad todas las causas (dosis-respuesta hasta 10K en <60 años)',
        'grasa visceral (aumento gasto energético diario ~400-500 kcal)',
        'proteína C-reactiva crónica',
        'presión arterial sistólica sostenida',
      ],
      modulates: [
        'VO2max sub-máximo',
        'composición corporal',
        'circunferencia_cintura',
        'HDL',
        'ratio_neutrofilos_linfocitos (indicador inmuno-inflamación)',
      ],
      biomarkers: [
        'pasos_diarios_promedio_wearable',
        'VO2max',
        'HbA1c',
        'HDL',
        'circunferencia_cintura',
        'presion_arterial_sistolica',
        'HRV RMSSD',
        'PCR_hs',
      ],
      mechanismSummary: 'A 10K pasos/día el volumen suficiente para activar adaptaciones aeróbicas sostenidas (VO2max sub-máximo, HDL, composición corporal) manteniendo intensidad de recuperación · sweet spot de "movimiento diario alto" para adulto activo.',
    },
    sideEffects: [
      'sobreuso_tibial_ancianos (si superficie dura + zapato inadecuado)',
      'fatiga_inicial (2-3 semanas adaptación desde <5K)',
    ],
    contraindications: [
      'inmovilizacion_medica_prescrita',
      'ulceras_diabeticas_pies_activas',
      'fractura_reciente_no_consolidada',
      'insuficiencia_cardiaca_NYHA_IV',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'profile', field: 'edad_menor_60', equals: true },
        { source: 'lab', marker: 'HDL', operator: '<', value: 45, unit: 'mg/dL' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['inmovilizacion_medica', 'insuficiencia_cardiaca_severa'] },
      ],
      boostWeight: 4,
    },
    sources: [
      {
        citation: 'Paluch AE et al. Lancet Public Health 2022 · plateau <60 años a 8-10K',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
      },
      {
        citation: 'Ratey JJ "Spark: The Revolutionary New Science of Exercise and the Brain" 2008 · caminata + BDNF neuroplasticidad',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Foundational Fitness Protocol" HubermanLab · zona 2 walking base metabólica',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Manpo-Kei · campaña Yamasa 1965 · origen cultural de "10K pasos" · nota histórica sin evidencia científica original',
        paradigm: 'traditional_documented',
        paradigmConflict: 'El número 10K nació de marketing japonés post-Olímpicos Tokyo 1964, no de ciencia. La ciencia moderna (Paluch) redujo al listón funcional real. ATP debe comunicar honestamente.',
      },
      {
        citation: 'Ayurveda · Chankramana como Nitya-Karma (deber diario)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Investigación soviética · Kolchak/Sechenov · trabajo "ligero-constante" (lyogkij-postoyannij trud) para longevidad',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'meta_pasos_12k',
    name: 'Meta 12,000+ pasos diarios',
    how: '12,000+ pasos distribuidos. Nivel "atlético" o de composición corporal agresiva. Ideal combinar caminata + trote suave. Buscar 90 min activos totales.',
    benefit: 'Composición corporal + rendimiento deportivo. Para <60 años, marginal sobre 10K en mortalidad pero significativo en composición.',
    categories: ['movimiento', 'cardiovascular', 'metabolismo', 'ritual'],
    roots: ['sedentarismo', 'sarcopenia', 'hiperinsulinemia'],
    assignRule: 'Deportistas, composición corporal como objetivo, biohackers. NO recomendar a sedentario sin escalones intermedios (8K → 10K → 12K).',
    priority: 2,
    family: 'meta_pasos',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'AMPK muscular sostenido',
        'PGC-1α aumento robusto',
        'lipolisis crónica (deficit calórico facilitado)',
        'HDL aumentado',
        'oxidación grasas al reposo (RER baseline reducido)',
      ],
      inhibits: [
        'masa grasa visceral (más agresivo que 10K)',
        'circunferencia cintura',
        'sedentarismo funcional (imposible con 12K)',
      ],
      modulates: [
        'metabolismo basal (aumento por termogénesis + más masa magra si combina con fuerza)',
        'apetito (a veces aumenta, requiere gestión nutricional)',
        'HRV (respuesta individual · si sobre-entrenado disminuye)',
        'cortisol basal (puede aumentar si excesivo · monitoreo)',
      ],
      biomarkers: [
        'pasos_diarios_promedio_wearable',
        'VO2max',
        '%grasa',
        'circunferencia_cintura',
        'HDL',
        'HbA1c',
        'RER_reposo',
        'HRV RMSSD',
        'cortisol_matutino_salival',
      ],
      mechanismSummary: 'A 12K+ pasos el volumen entra en zona de "cardio pasivo alto" · empuja HDL, oxidación grasas basal y composición corporal · pero se acerca al umbral de sobreentreno de baja intensidad si combinado con otras cargas · monitorear cortisol y HRV.',
    },
    sideEffects: [
      'sobreuso_tibial (más probable con volumen alto)',
      'condropatia_rotuliana (si desnivel + calzado inadecuado)',
      'fatiga_acumulada (si combinado con fuerza sin gestión)',
      'aumento_apetito_marcado',
    ],
    contraindications: [
      'inmovilizacion_medica_prescrita',
      'sobreentreno_confirmado (HRV baja crónica + cortisol elevado)',
      'trastorno_conducta_alimentaria_activo (riesgo compulsivo)',
      'osteoartritis_severa_activa_rodilla_cadera',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'objetivo', in: ['composicion_corporal', 'rendimiento_deportivo'] },
        { source: 'profile', field: 'pasos_baseline_10k_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['sobreentreno_confirmado', 'tca_activo', 'osteoartritis_severa'] },
        { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 20 },
      ],
      boostWeight: 2,
    },
    sources: [
      {
        citation: 'Paluch AE Lancet Public Health 2022 · marginal benefit >10K en <60 años',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 · Rule 4 · 4 pilares longevidad decisional incluye zona 2 volumen alto',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Verkhoshansky "Supertraining" · GPP (General Physical Preparation) incluye volumen aeróbico bajo-moderado alto',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Ayurveda · caveat contra ativyayama (exceso de ejercicio) · Charaka Sutra Sthana 7 · fatiga excesiva depleta Ojas',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Sub-culturas atletas / hunter-gatherers · Hadza tribe average 15K-20K pasos/día documentado (Pontzer 2018 "Constrained Total Energy Expenditure")',
        paradigm: 'traditional_documented',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29195659/',
      },
    ],
  },
  {
    key: 'death_hang',
    name: 'Death hang (colgar 30-90 seg)',
    how: 'Colgar de barra con brazos estirados, hombros relajados (dead hang) o retracción escapular activa (active hang) 30-90 seg. 2-3 sets, 3-5×/sem. Progresión: 15s → 30s → 45s → 60s → 90s. Alternativa: hang con una mano (avanzado).',
    benefit: 'Descompresión columna 1-2mm subacromial, movilidad de hombro, grip strength (predictor mortalidad Rantanen 1999), abre cadena posterior y contrarresta postura kifótica del sedentarismo.',
    categories: ['movimiento', 'cardiovascular', 'hormonal', 'ritual', 'sarcopenia'],
    roots: ['sedentarismo', 'sarcopenia'],
    assignRule: 'Adulto sano, rigidez de hombro/cuello, dolor lumbar por decúbito, oficinista sedentario. Flag P1 si dolor lumbar mecánico crónico + trabajo sentado ≥6h.',
    priority: 2,
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'mecanotransducción cápsula articular hombro (integrinas + FAK)',
        'tono lower trapezius / serratus anterior (retracción escapular)',
        'grip strength (isométrico sostenido de flexores dedos y antebrazo)',
        'GH aguda (isométrico de bajo volumen produce respuesta modesta)',
        'propiocepción cintura escapular',
      ],
      inhibits: [
        'compresión subacromial (descompresión 1-2mm documentada por tracción bodyweight)',
        'kifosis funcional torácica',
        'atrofia flexores dedo (predictor discapacidad)',
      ],
      modulates: [
        'movilidad glenohumeral (flexión-abducción-rotación externa)',
        'longitud dorsal ancho + pectoral menor (elongación pasiva)',
        'estabilidad escapular (activación lower trap + serratus)',
        'grip_strength_kg',
        'presión intra-discal columna (reducción vía tracción axial)',
      ],
      biomarkers: [
        'grip_strength_kg_dinamometro',
        'tiempo_dead_hang_max_segundos',
        'movilidad_shoulder_flexion_grados',
        'dolor_escala_VAS',
      ],
      mechanismSummary: 'La suspensión del peso corporal genera tracción axial en columna vertebral (descompresión discos), abre espacio subacromial (alivio impingement), y sostiene tensión isométrica de flexores de dedo (grip · predictor #1 mortalidad Rantanen 1999) · dead hang es la intervención más costo-efectiva para longevidad funcional del tren superior.',
    },
    sideEffects: [
      'callo_palmas_agudo (esperado, se adapta)',
      'lesion_polea_dedos (si sobreuso agudo · rare · calentamiento requerido)',
      'sensacion_tirón_hombro (esperado si rigidez previa · adaptativo)',
      'mareo_transitorio (si Valsalva involuntaria)',
    ],
    contraindications: [
      'luxacion_glenohumeral_reciente_no_rehabilitada',
      'cirugia_hombro_reciente_<6meses',
      'lesion_polea_A2_A4_dedos_aguda',
      'artritis_reumatoide_manos_agudo_brote',
      'hernia_discal_cervical_aguda_no_evaluada',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'movimiento', operator: '<=', value: 3 },
        { source: 'lab', marker: 'grip_strength_kg', operator: '<', value: 35, unit: 'kg (hombres)' },
        { source: 'lab', marker: 'grip_strength_kg', operator: '<', value: 22, unit: 'kg (mujeres)' },
        { source: 'profile', field: 'sedentarismo_score', equals: 'high' },
        { source: 'quiz', questionnaire: 'dolor_musculoesqueletico', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['luxacion_hombro_reciente', 'cirugia_hombro_reciente', 'polea_dedo_aguda', 'ar_manos_brote'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Rantanen T et al. "Midlife hand grip strength as a predictor of old age disability" JAMA 1999',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/9989948/',
      },
      {
        citation: 'Leong DP et al. "Prognostic value of grip strength: findings from the Prospective Urban Rural Epidemiology (PURE) study" Lancet 2015 · n=140k',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25982160/',
      },
      {
        citation: 'John Kirsch MD "Shoulder Pain? The Solution and Prevention" 2013 · protocolo hanging para impingement + rotator cuff · autor cirujano ortopédico',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Kelly Starrett "Becoming a Supple Leopard" 2015 · scapular decompression + shoulder mobility',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 · dead hang como test funcional longevidad (target 1 min hombres, 45s mujeres)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Yoga tradición · variantes de suspensión (Adho Mukha Vrksasana/Handstand · Baddha Konasana suspendida en yoga aéreo · Vishrama de tracción vertebral)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Kalaripayattu (arte marcial Kerala, s. IV a.C.) · uso de barras horizontales (uzhichil rope) para descompresión vertebral y desarrollo grip',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'MTC · Ba Duan Jin (八段錦 · "Ocho piezas de brocado") · ejercicio "sostener el cielo con las manos" (兩手托天理三焦) simula elongación axial',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'farmers_walk',
    name: "Caminata del granjero (Farmer's Walk)",
    how: '20-40m cargando peso significativo bilateral (kettlebells, mancuernas, trap bar) o unilateral (suitcase carry · asimétrico · trabaja obliquos y cuadrado lumbar). Peso: 50-100% peso corporal total repartido. 3-5 sets. Progresión: distancia → peso → tiempo.',
    benefit: 'La "caminata más honesta": grip + core anti-lateral + postura + cardio anaeróbico. Marker independiente de longevidad. Suitcase carry unilateral es especialmente potente para core.',
    categories: ['movimiento', 'cardiovascular', 'hormonal', 'metabolismo', 'sarcopenia'],
    roots: ['sarcopenia', 'sedentarismo', 'baja_testosterona'],
    assignRule: 'Adulto con base de fuerza (puede deadlift ≥bodyweight). Flag P1 si sarcopenia, declive fuerza edad, oficinista con core débil, mujer post-menopáusica (osteoporosis prevención).',
    priority: 2,
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'mTORC1 muscular (contracción isométrica sostenida trapecio, dorsal, antebrazo)',
        'grip strength (isométrico + dinámico bajo carga)',
        'core anti-lateral flexion (cuadrado lumbar, oblicuos)',
        'PGC-1α muscular (carga metabólica aeróbica-anaeróbica mixta)',
        'lactato pico (variable dependiendo protocolo)',
        'GH aguda (respuesta a carga + volumen)',
        'testosterona sérica aguda (compound + heavy)',
        'osteogénesis (Wnt/β-catenin · impacto axial columna)',
      ],
      inhibits: [
        'sarcopenia (predictor independiente mortalidad)',
        'inestabilidad postural (core débil epidemia oficinista)',
        'kifosis funcional (activa retracción escapular sostenida)',
        'mortalidad todas las causas (via grip strength · Leong 2015)',
      ],
      modulates: [
        'grip_strength_kg',
        'estabilidad_core (Bracing sostenido)',
        'postura torácica',
        'testosterona/cortisol ratio aguda',
        'volumen cardiovascular sub-máximo',
        'densidad mineral ósea columna (con carga axial)',
      ],
      biomarkers: [
        'grip_strength_kg_dinamometro',
        'peso_maximo_farmers_20m_kg',
        'testosterona_total',
        'IGF-1',
        'masa_muscular_kg',
        'densidad_mineral_osea_columna',
        'lactato pico',
        'CK',
      ],
      mechanismSummary: 'La carga axial sostenida + marcha activa mecanotransducción muscular multi-segmento (trapecio, dorsal, antebrazo, core, glúteo), grip isométrico prolongado (predictor mortalidad), y estimula osteogénesis vertebral vía carga axial · una única intervención cubre 4 sistemas simultáneos (fuerza, cardio, core, hueso).',
    },
    sideEffects: [
      'callo_palmas',
      'DOMS_trapecio_antebrazo (esperado 24-72h)',
      'cefalea_por_Valsalva_transitoria (técnica respiratoria requerida)',
      'lesion_polea_dedos (raro · si peso desmesurado)',
      'aumento_apetito_marcado',
    ],
    contraindications: [
      'hernia_discal_lumbar_aguda_no_rehabilitada',
      'cirugia_ortopedica_hombro_columna_reciente',
      'aneurisma_aortico_conocido_no_reparado',
      'hipertension_maligna_no_controlada',
      'artrosis_severa_manos_muñecas_activa',
      'osteoporosis_severa_con_fractura_vertebral_reciente',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'movimiento', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'hormonal', operator: '<=', value: 3 },
        { source: 'lab', marker: 'grip_strength_kg', operator: '<', value: 35 },
        { source: 'lab', marker: 'testosterona_total', operator: '<', value: 500 },
        { source: 'profile', field: 'edad_40_o_mas', equals: true },
        { source: 'profile', field: 'sedentarismo_score', equals: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hernia_discal_aguda', 'cirugia_hombro_reciente', 'aneurisma_no_reparado', 'osteoporosis_severa_fractura'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'McGill S "Ultimate Back Fitness and Performance" 2015 · McGill Big 3 + loaded carries · biomecánica columna',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Winwood PW et al. "The impact of a loaded carry exercise on core muscle activation" J Strength Cond Res 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25162648/',
      },
      {
        citation: 'Leong DP et al. Lancet 2015 · grip strength predictor mortalidad',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25982160/',
      },
      {
        citation: 'Dan John "Never Let Go" + "Intervention" · loaded carries como pilar training funcional (con Pavel Tsatsouline)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Pavel Tsatsouline (Kettlebell Simple & Sinister) · farmer walks + kettlebell training · influencia soviética',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Strongman tradition · Highland Games (siglo XI Escocia) · "clachneart" (piedra de fuerza), "farmer walks" documentados como labor agrícola pre-moderna',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'MTC · práctica Shaolin 铁沙掌 (Iron Palm) y grip work con jars de arena (石锁 · shí suǒ)',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'omt_masticatorios',
    name: 'OMT masticatorios (Oral Myofunctional Therapy)',
    how: 'Ejercicios de OMT con herramientas (Jawzrsize, chicles duros hipoalergénicos, alimentos duros). Trabajo específico sobre músculos masetero y temporal. 5-10 min/día, 5×/sem.',
    benefit: 'Fuerza masticatoria, tono muscular facial y submentoniano, respiración funcional (favorece nasal), prevención bruxismo, mejora postura lingual funcional.',
    categories: ['ritual', 'sueno'],
    roots: ['deficit_sueno_profundo'],
    assignRule: 'Debilidad masticatoria, respiración bucal habitual, bruxismo, apnea leve por hipotonía orofacial.',
    priority: 3,
    requiresClinicalValidation: true,
    evidenceLevel: 'N4',
    epigeneticImpact: {
      activates: [
        'tono masetero + temporal (hipertrofia isométrica)',
        'tono suprahioideos y músculos elevadores lengua',
        'circulación local zona facial',
        'postura lingual funcional (palatal seal)',
      ],
      inhibits: [
        'atrofia masticatoria por dieta blanda moderna',
        'colapso vía aérea superior nocturno (evidencia OMT meta-analysis Camacho 2015)',
        'respiración bucal habitual',
      ],
      modulates: [
        'apnea-hipopnea index (AHI · reducción modesta OMT en apnea leve)',
        'estabilidad postural lingual y mandibular',
        'perimetro cervical (indirecto)',
        'fuerza mordida máxima (kg-force)',
      ],
      biomarkers: [
        'AHI_indice_apnea_hipopnea',
        'fuerza_mordida_maxima_kg',
        'oxigeno_saturacion_nocturna',
        'sueño_profundo_horas',
        'circunferencia_cervical',
      ],
      mechanismSummary: 'Trabajo isométrico-dinámico de maseteros, temporales y suprahioideos + entrenamiento de postura lingual (palatal seal) tonifica músculos que sostienen vía aérea superior · evidencia OMT (Camacho 2015 Sleep) muestra reducción modesta de AHI en apnea leve · beneficios adicionales: fuerza masticatoria, prevención bruxismo, respiración nasal funcional.',
    },
    sideEffects: [
      'dolor_mandibular_ATM_transitorio (esperado inicio · si persiste suspender)',
      'trastorno_temporomandibular_riesgo (por sobreuso agresivo)',
      'headache_temporal (por hipertono temporal)',
      'sensibilidad_dental (por bruxismo diurno inducido)',
    ],
    contraindications: [
      'trastorno_temporomandibular_activo_confirmado',
      'dolor_facial_atipico_no_diagnosticado',
      'ortodoncia_activa_no_avalada_por_dentista',
      'cirugia_maxilofacial_reciente',
      'artritis_reumatoide_ATM_activa',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'apnea_STOPBANG', score: 'medium' },
        { source: 'profile', field: 'ronquido_confirmado', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['tmj_activo', 'dolor_facial_atipico', 'cirugia_maxilofacial_reciente', 'ar_atm'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Camacho M et al. "Myofunctional Therapy to Treat Obstructive Sleep Apnea: A Systematic Review and Meta-analysis" Sleep 2015 · OMT reduce AHI 50% en adultos',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25348130/',
        industryFunded: false,
      },
      {
        citation: 'de Felício CM et al. "Orofacial myofunctional therapy: A comparative study" 2024 meta-analysis · reafirma efecto modesto en apnea leve',
        paradigm: 'western_academic',
      },
      {
        citation: 'Guimarães KC et al. "Effects of oropharyngeal exercises on patients with moderate obstructive sleep apnea syndrome" Am J Respir Crit Care Med 2009 · OMT vs sham',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19234106/',
      },
      {
        citation: 'Tradición mastic gum (Chios, Grecia) · goma resina Pistacia lentiscus · uso milenario documentado desde Herodoto · efecto masticador natural',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Danta Dhavana (higiene bucal ritual) tocan zona orofacial · trabajo lingual tradicional en Kavala/Gandusha',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'separadores_dedos_pies',
    name: 'Separadores de dedos de los pies',
    how: 'Separadores de silicona (Correct Toes, YogaToes) 15-30 min/día progresando a uso con calcetín + calzado zero-drop, o dormir con ellos. Progresión tolerancia lenta (primera semana 5 min, aumentar 5 min/semana).',
    benefit: 'Corrige compresión digital iatrogénica del calzado moderno, mejora arco funcional, propriocepción plantar, previene juanetes (hallux valgus), reduce fascitis plantar via mejor loading del antepié.',
    categories: ['movimiento', 'ritual'],
    roots: ['sedentarismo', 'sarcopenia'],
    assignRule: 'Calzado estrecho crónico, juanetes incipientes, dolor plantar, corredor con fascitis. Flag P1 si hallux valgus + dolor articulaciones dedos.',
    priority: 3,
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'músculos intrínsecos del pie (flexor hallucis brevis, lumbricales, abductor hallucis)',
        'propriocepción plantar (mecanoreceptores Pacini + Meissner)',
        'arco longitudinal medial (fascia plantar reset)',
        'cadena posterior (activación sural indirecta)',
        'flexión metatarsofalángica funcional',
      ],
      inhibits: [
        'compresión hallux valgus (redistribución mecánica)',
        'sobrecarga plantar central (redistribución al antepié funcional)',
        'compensaciones cadena ascendente (rodilla, cadera)',
        'atrofia intrínsecos (por desuso en calzado moderno)',
      ],
      modulates: [
        'huella_plantar (visible en pedigrafía · aumento superficie contacto dedos)',
        'ángulo hallux valgus (grados)',
        'fuerza flexores dedos (proxy grip pédico)',
        'estabilidad monopodal (balance dinámico)',
        'oscilación postural (mejora tras 4-6 semanas)',
      ],
      biomarkers: [
        'angulo_hallux_valgus_grados',
        'fuerza_flexores_pedales_dinamometro',
        'test_balance_monopodal_segundos',
        'dolor_plantar_VAS',
        'superficie_contacto_pedigrafia_pct',
      ],
      mechanismSummary: 'Separadores restablecen posición anatómica de los dedos (compresión iatrogénica por calzado moderno estrecho), reactivando musculatura intrínseca del pie atrofiada, mejorando distribución de carga plantar, propriocepción y bloqueando la deformidad hallux valgus por vía mecánica · mejora cascada ascendente (rodilla, cadera).',
    },
    sideEffects: [
      'dolor_dedos_iniciales (2-3 semanas de adaptación esperado)',
      'sensacion_extraña_calzado_normal (post-uso)',
      'calambre_flexores_transitorio (por reactivación musculatura atrófica)',
    ],
    contraindications: [
      'ulceras_diabeticas_activas_pies',
      'neuropatia_severa_confirmada (pérdida sensibilidad → riesgo daño no detectado)',
      'infeccion_activa_pies (paroniquia, onicomicosis severa activa)',
      'raynaud_severo (podría exacerbar por presión mecánica)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'calzado_estrecho_habitual', equals: true },
        { source: 'quiz', questionnaire: 'dolor_plantar', score: 'high' },
        { source: 'profile', field: 'hallux_valgus_visible', equals: true },
        { source: 'profile', field: 'corredor_recreativo', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['ulceras_diabeticas_pies', 'neuropatia_severa', 'infeccion_pies_activa', 'raynaud_severo'] },
      ],
      boostWeight: 2,
    },
    sources: [
      {
        citation: 'Ridge ST et al. "Foot Muscle Strengthening in Preventing Injury and Improving Performance" Med Sci Sports Exerc 2019 · BYU program intrinsic foot muscles',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30395051/',
      },
      {
        citation: 'Hollander K et al. "Barefoot running · a systematic review" Sports Med 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27957657/',
      },
      {
        citation: 'Ray McClanahan DPM · Correct Toes creator · podiatra Portland · alineación natural pie',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Katy Bowman "Whole Body Barefoot" 2015 · biomecánica descalza + separadores',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Yoga tradición · Yoga Toes ejercicios (extensión + separación digital) parte de Pada Bandha (bloqueo del pie) · Iyengar tradition',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Tarahumara + comunidades descalzas mesoamericanas · pies descalzos + huaraches minimalistas + geometría anatómica natural del pie (McDougall "Born to Run" 2009)',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'MTC · reflexología plantar como mapa órganos + reactivación intrínsecos mejora circulación general (Yongquan K1 · manantial burbujeante)',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'zona_2_aerobica',
    name: 'Zona 2 aeróbica 2-3×/semana',
    how: '30-45 min de ejercicio aeróbico a intensidad Zona 2 (60-70% FC máx · umbral "puedo conversar sin jadear · Talk Test") · lactato ~2 mmol/L. Trote suave, bici, remo, elíptica. Protocolo recomendado: 3-4 sesiones/semana × 1h. Idealmente en ayuno para maximizar oxidación de grasas.',
    benefit: 'Densidad mitocondrial + capacidad oxidativa Tipo I muscular. Aclaramiento de lactato mejorado. Base metabólica aeróbica y longevidad cardiovascular. Fat-adaptation.',
    categories: ['cardiovascular', 'metabolismo', 'energia', 'movimiento', 'mitocondrial'],
    roots: ['hiperinsulinemia', 'sedentarismo', 'baja_testosterona', 'sarcopenia', 'disfuncion_mitocondrial'],
    assignRule: 'Universal recomendado adulto ≥35. Flag P1 si sedentarismo + resistencia insulina + HbA1c ≥5.7 + VO2max bajo. Attia doctrina: 80% del volumen aeróbico en zona 2.',
    priority: 1,
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'PGC-1α (master regulator biogénesis mitocondrial)',
        'biogénesis mitocondrial Tipo I (fibras lentas oxidativas)',
        'capilarización muscular (VEGF)',
        'β-oxidación grasas (CPT-1 · carnitina palmitoiltransferasa)',
        'MCT1 muscular (transportador lactato para clearance)',
        'AMPK muscular sostenido',
        'FGF21 hepático (metabolic flexibility)',
        'NRF1/NRF2 antioxidantes',
      ],
      inhibits: [
        'lactato acumulación (mejora clearance)',
        'dependencia glucolítica basal',
        'inflamación silenciosa crónica',
        'insulinemia postprandial',
      ],
      modulates: [
        'tasa_oxidacion_grasas_max_METS',
        'lactato_umbral_zona2_bpm_watts',
        'RER (respiratory exchange ratio · reducción hacia 0.7 fat-adapted)',
        'VO2max sub-máximo',
        'HRV crónico',
        'VLDL/trigliceridos',
        'HDL',
      ],
      biomarkers: [
        'VO2max',
        'lactato_umbral_zona2_bpm_watts',
        'tasa_oxidacion_grasas_max_METS',
        'RER_reposo',
        'HRV RMSSD',
        'HDL',
        'trigliceridos',
        'HbA1c',
        'HOMA-IR',
        'frecuencia_cardiaca_reposo',
      ],
      mechanismSummary: 'Zona 2 (60-70% FCmax) recruta fibras Tipo I (oxidativas) sin acumular lactato, permitiendo entrenamiento sostenido que maximiza biogénesis mitocondrial vía PGC-1α, β-oxidación grasas y capilarización · desarrolla la "base aeróbica" que es plataforma de todo lo demás · Attia + San Millán la consideran la intervención #1 para metabolic flexibility y longevidad.',
    },
    sideEffects: [
      'aburrimiento_inicial (esperado · duración larga baja intensidad)',
      'ampollas / roces (calzado y equipo)',
      'sensacion_muy_facil (contraintuitiva · muchos entrenan demasiado alto)',
    ],
    contraindications: [
      'infarto_reciente_<3meses',
      'arritmia_ventricular_no_controlada',
      'insuficiencia_cardiaca_NYHA_III-IV_descompensada',
      'estenosis_aortica_severa',
      'ulceras_diabeticas_activas_pies (si actividad de carga)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'HDL', operator: '<', value: 45 },
        { source: 'lab', marker: 'trigliceridos', operator: '>=', value: 150 },
        { source: 'profile', field: 'edad_35_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['infarto_reciente_3m', 'arritmia_no_controlada', 'insuficiencia_cardiaca_severa', 'estenosis_aortica_severa'] },
      ],
      boostWeight: 5,
    },
    sources: [
      {
        citation: 'San-Millán I & Brooks GA "Assessment of Metabolic Flexibility by Means of Measuring Blood Lactate, Fat, and Carbohydrate Oxidation Responses to Exercise in Professional Endurance Athletes and Less-Fit Individuals" Sports Med 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28623581/',
      },
      {
        citation: 'Peter Attia + Iñigo San-Millán "Zone 2 Training" HubermanLab-style deep dive · The Drive #85 + #201',
        paradigm: 'functional_independent',
        url: 'https://peterattiamd.com/inigosanmillan/',
      },
      {
        citation: 'Seiler S "What is best practice for training intensity and duration distribution in endurance athletes?" Int J Sports Physiol Perform 2010 · polarized training 80/20',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20861519/',
      },
      {
        citation: 'Robinson MM et al. "Enhanced Protein Translation Underlies Improved Metabolic and Physical Adaptations to Different Exercise Training Modes" Cell Metab 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28273480/',
      },
      {
        citation: 'Ernesto Prieto Gratacós "Mejora tus Mitocondrias" 2016 · zona aeróbica baja intensidad para calidad mitocondrial vs cantidad · biofísica',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Chankramana + carreras rituales moderadas descritas en textos védicos como parte de Sadhana física · nunca a ativyayama',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Qigong dinámico (Tai Chi walking) mantiene FC en zona 1-2 con foco en respiración + calidad · efecto similar sobre HRV y capacidad aeróbica sub-máxima',
        paradigm: 'tcm',
      },
      {
        citation: 'Soviet aerobic base training (Verkhoshansky periodization) · GPP fase con zona baja alta duración construye "cimiento" antes de intensidad',
        paradigm: 'soviet_sports',
      },
    ],
  },
  {
    key: 'vo2max_training',
    name: 'VO2max training zona 5 (⚠️ solo entrenados)',
    how: 'Protocolo Noruego 4×4: 4 intervalos de 4 min al 90-95% FC máx + 3 min recuperación activa. ⚠️ CALENTAMIENTO 10-15 min zona 2 antes. 1-2×/semana MAX. Alternativas: Tabata (20s work × 10s rest × 8 rounds) para tren específico, 30-30 (30s ON 30s OFF ×20).',
    benefit: 'VO2max = predictor #1 de mortalidad por todas las causas. Aumenta 7-9% en 8 semanas. Biogénesis mitocondrial + stroke volume + capilarización + expansión plasma.',
    categories: ['cardiovascular', 'metabolismo', 'hormonal', 'energia', 'mitocondrial'],
    roots: ['sedentarismo', 'baja_testosterona', 'sarcopenia', 'disfuncion_mitocondrial'],
    assignRule: '⚠️ Solo adulto con base aeróbica ≥3 meses (idealmente 6). Sin patología CV. NUNCA sin calentamiento. Flag P1 si VO2max <percentil 25 + interesado, o atleta buscando plateau breakthrough.',
    priority: 2,
    evidenceLevel: 'N1',
    scientificInfo: '99% de las personas se lesionan haciendo sprints de golpe sin base previa. La regla 80/20: 20% del volumen aeróbico en zona 5, 80% en zona 2. La adaptación crece con el tiempo total en zona (T@VO2max).',
    epigeneticImpact: {
      activates: [
        'stroke volume ventricular (aumento crónico documentado)',
        'capilarización muscular (VEGF induction)',
        'expansión volumen plasmático (hemodilución adaptativa)',
        'PGC-1α (biogénesis mitocondrial · robusto)',
        'mitofagia + mitocondriogénesis balance',
        'BDNF aguda (spike post-HIIT documentado)',
        'lactato_transporte + clearance MCT1/MCT4',
        'catecolaminas pico (adaptativo · CNS training)',
        'anti-Aging kinase-signaling (AMPK + mTOR ciclo)',
      ],
      inhibits: [
        'mortalidad todas las causas (dosis-respuesta sin techo · Mandsager)',
        'fragilidad decisional (Attia · Rule 4)',
        'declive VO2max edad-dependiente (10% por década post-30 sin intervención)',
      ],
      modulates: [
        'VO2max',
        'lactato_umbral (LT1, LT2)',
        'función endotelial (FMD)',
        'HRV (aumento crónico, disminución aguda 24-48h)',
        'ratio_cortisol_testosterona (monitoreo sobreentreno)',
        'hemoglobina + hematocrito (leve aumento crónico)',
      ],
      biomarkers: [
        'VO2max',
        'lactato_umbral_zona2_bpm_watts',
        'lactato pico post-esfuerzo',
        'HRV RMSSD',
        'frecuencia_cardiaca_maxima_alcanzada',
        'recuperacion_FC_1min_bpm',
        'BDNF sérico',
        'FMD',
      ],
      mechanismSummary: 'Intervalos al 90-95% FCmax fuerzan al sistema cardiovascular a su techo (VO2max) durante minutos totales cumulativos · adaptaciones centrales (stroke volume, plasma, hemoglobina) + periféricas (mitocondrias, capilares, MCT) resultan en aumento de VO2max 7-9% en 8 semanas · el predictor #1 de longevidad decisional.',
    },
    sideEffects: [
      'nausea_post-esfuerzo (esperado si hipoxia periférica súbita)',
      'mareo_transitorio_post',
      'fatiga_CNS_24-48h',
      'HRV_reducida_2-3_dias',
      'cefalea_transitoria (por hipoxia + Valsalva)',
      'urgencia_urinaria_post (adrenalina)',
      'lesion_musculoesqueletica_riesgo (mayor que zona 2)',
    ],
    contraindications: [
      'cardiopatia_isquemica_activa_no_stress_test_avalado',
      'arritmia_ventricular_no_controlada',
      'sindrome_qt_largo',
      'insuficiencia_cardiaca_NYHA_II-IV_no_estable',
      'infarto_reciente_<6meses',
      'estenosis_aortica_severa',
      'hipertension_maligna_>180/110_no_controlada',
      'aneurisma_aortico_conocido',
      'lesion_musculoesqueletica_aguda',
      'embarazo (relativa · adaptar intensidad y evitar zona 5)',
      'sin_base_aerobica_previa_<3meses (relativa · empezar con zona 2)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'VO2max_percentil', operator: '<', value: 40 },
        { source: 'profile', field: 'objetivo', in: ['longevidad_maxima', 'rendimiento_deportivo'] },
        { source: 'profile', field: 'base_aerobica_3m_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_no_controlada', 'qt_largo', 'insuficiencia_cardiaca', 'infarto_reciente_6m', 'aneurisma_no_reparado'] },
        { source: 'profile', field: 'base_aerobica_menor_3m', equals: true },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Mandsager K et al. "Association of Cardiorespiratory Fitness With Long-term Mortality Among Adults Undergoing Exercise Treadmill Testing" JAMA Netw Open 2018 · n=122,007 · 5× mortalidad low vs high fitness',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30646252/',
      },
      {
        citation: 'Helgerud J et al. "Aerobic high-intensity intervals improve VO2max more than moderate training" Med Sci Sports Exerc 2007 · Norwegian 4×4 protocol',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17414804/',
      },
      {
        citation: 'Tabata I et al. "Effects of moderate-intensity endurance and high-intensity intermittent training on anaerobic capacity and VO2max" Med Sci Sports Exerc 1996',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/8897392/',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 · VO2max = "most important marker of longevity" · protocolo 80/20 zona 2/zona 5',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "The Science of Cardiovascular Exercise" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Verkhoshansky Y "Special Strength Training Manual for Coaches" · repeated maximal efforts + shock method · precursor HIIT',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Ayurveda · atyayāyāma prohibido en Charaka Sutra Sthana 7 · caveat: intensidad máxima solo en Kapha-Vata equilibrado + estación fresca',
        paradigm: 'ayurveda',
        paradigmConflict: 'Ayurveda tradicionalmente conservadora con intensidad extrema · resolución operativa: respetar caveat estacional + individual constitution.',
      },
      {
        citation: 'MTC · Wu Qin Xi (五禽戏 · "Cinco animales") · movimiento intenso simulando animales, alta intensidad breve dentro de matriz Qigong',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'levantamiento_compuesto',
    name: 'Levantamiento pesado compuesto',
    how: 'Sentadilla + peso muerto + press banca + press militar + jalón + remo · 3-5 sets × 5-8 reps al 75-85% 1RM · 2-3×/semana · progresión de carga (sobrecarga progresiva Milón de Crotona). Descanso 2-4 min entre sets. Prioridad técnica > carga.',
    benefit: 'Intervención #1 anti-sarcopenia + declive metabólico. Hipertrofia mecanotransducción, miokinas (irisina, BDNF, IL-6), testosterona/GH/IGF-1 agudo, densidad ósea, control glucémico, mortalidad.',
    categories: ['movimiento', 'hormonal', 'metabolismo', 'cardiovascular', 'sarcopenia', 'mitocondrial'],
    roots: ['sarcopenia', 'baja_testosterona', 'hipertension', 'hiperinsulinemia', 'sedentarismo', 'hipotiroidismo_funcional', 'inflamacion_silenciosa'],
    assignRule: 'Universal adulto ≥30. Flag P1 si sarcopenia, edad ≥40, resistencia insulina, testosterona baja, osteopenia/osteoporosis. Enrique nota: peso muerto es favorito clínico.',
    priority: 1,
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'mTORC1 (mecanotransducción · síntesis proteica muscular)',
        'PGC-1α4 (variante muscular · biogénesis mitocondrial + hipertrofia)',
        'p70 S6 kinase (traducción proteica ribosomal)',
        'MPS elevado 24-48h post',
        'testosterona sérica aguda (+15-25% post compound heavy)',
        'GH pulso masivo post (10-100× baseline)',
        'IGF-1 sistémico y autocrino local',
        'irisina/FNDC5 (myokine · BAT-browning + BDNF)',
        'BDNF cerebral',
        'IL-6 muscular aguda (anti-inflamatoria transitoria)',
        'GLUT4 muscular (glucosa uptake)',
        'osteoblastogénesis (Wnt/β-catenin)',
        'FOXO3 (longevity gene · autofagia+repair)',
      ],
      inhibits: [
        'miostatina (inhibidor natural crecimiento muscular)',
        'infiltración grasa intramuscular (mioesteatosis)',
        'sarcopenia',
        'resistencia insulina hepática + muscular',
        'expresión NF-κB muscular crónica',
        'osteoclastogénesis desbalanceada (osteoporosis prevención)',
        'mortalidad todas las causas (Rantanen 1999)',
      ],
      modulates: [
        'testosterona basal (aumento modesto crónico hombres)',
        'SHBG (reducción crónica · aumenta T libre)',
        'cortisol agudo (elevación fisiológica · si crónico → sobreentreno)',
        'HRV (aguda ↓, crónica ↑)',
        'densidad mineral ósea columna + fémur',
        'composición corporal',
        'HbA1c + HOMA-IR',
        'función mitocondrial (Robinson 2017)',
      ],
      biomarkers: [
        'testosterona_total',
        'testosterona_libre',
        'SHBG',
        'IGF-1',
        'HbA1c',
        'HOMA-IR',
        'masa_muscular_kg',
        'densidad_mineral_osea_T-score',
        'VO2max',
        'grip_strength_kg_dinamometro',
        'CK',
        'FNDC5/irisin_sérico',
        'BDNF sérico',
        'lactato pico',
      ],
      mechanismSummary: 'Contracción muscular pesada genera tensión mecánica que activa mecanosensores (integrinas, titina, FAK) → mTORC1 → síntesis proteica · fibra libera miokinas (irisina, BDNF, IL-6) que actúan como hormonas muscular→hueso→cerebro→adiposo · resultado: hipertrofia, biogénesis mitocondrial, mejora ósea, insulino-sensibilidad, neuroprotección · una intervención cubre 6 sistemas.',
    },
    sideEffects: [
      'DOMS 24-72h post',
      'fatiga_CNS 24-48h post PR',
      'aumento CK sérico transitorio',
      'aumento apetito marcado',
      'aumento temperatura corporal basal',
      'HRV reducida 24-72h (adaptación normal)',
      'Valsalva transitorio (técnica requerida)',
    ],
    contraindications: [
      'hernia_discal_lumbar_aguda_no_rehabilitada',
      'cirugia_ortopedica_reciente_sin_alta_medica',
      'aneurisma_aortico_conocido_no_reparado',
      'hipertension_maligna_no_controlada (>180/110)',
      'infarto_miocardio_reciente_<6meses',
      'desprendimiento_retina_reciente',
      'insuficiencia_cardiaca_NYHA_III-IV_descompensada',
      'osteoporosis_severa_con_fractura_vertebral_reciente',
      'embarazo_tercer_trimestre_carga_maxima (adaptar)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'hormonal', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'testosterona_total', operator: '<', value: 500 },
        { source: 'lab', marker: 'DEXA_masa_magra_percentil', operator: '<', value: 40 },
        { source: 'profile', field: 'edad_40_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hernia_discal_aguda', 'infarto_reciente_6m', 'aneurisma_no_reparado', 'hipertension_maligna', 'insuficiencia_cardiaca_severa'] },
      ],
      boostWeight: 5,
    },
    sources: [
      {
        citation: 'Schoenfeld BJ "The mechanisms of muscle hypertrophy and their application to resistance training" J Strength Cond Res 2010',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20847704/',
      },
      {
        citation: 'Peter Attia "Outlive" 2023 cap 11 Exercise · fuerza compuesta #1 anti-sarcopenia',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Verkhoshansky Y "Supertraining" 6ed 2009 · biblia fuerza soviética · shock method + block periodization',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Rantanen T et al. "Midlife hand grip strength as a predictor of old age disability" JAMA 1999',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/9989948/',
      },
      {
        citation: 'Boström P et al. "A PGC1-α-dependent myokine that drives brown-fat-like development" Nature 2012 · descubrimiento irisina',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22237023/',
      },
      {
        citation: 'Robinson MM et al. Cell Metab 2017 · adaptaciones metabólicas fuerza vs cardio',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28273480/',
      },
      {
        citation: 'Milón de Crotona (siglo VI a.C.) · sobrecarga progresiva original · carga becerro crecido → toro',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Vyayama descrito Charaka Sutra Sthana como Rasayana funcional · esfuerzo hasta ardhashakti (media capacidad) diario para Ojas',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Ernesto Prieto Gratacós · fuerza como palanca hormonal anti-envejecimiento + mitocondrial · comunicaciones argentinas',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Mark Rippetoe "Starting Strength" 3ed · programación básica compuestos principiantes',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'ejercicio_ayuno_cardio',
    name: 'Cardio zona 2 en ayuno',
    how: '30-45 min cardio zona 2 (60-70% FCmax) en ayuno de 12-16h (idealmente AM antes del primer alimento). Solo agua + electrolitos. Desayuno post: proteína 30-40g + grasa (no carb refinado). NO combinar con sesión de fuerza mismo día ideal.',
    benefit: 'Mejora sensibilidad insulina (Van Proeyen 2011), oxidación grasas potenciada por glucógeno bajo, biogénesis mitocondrial vía AMPK sostenida, fat-adaptation acelerada.',
    categories: ['metabolismo', 'movimiento', 'hormonal', 'mitocondrial'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'disfuncion_mitocondrial'],
    assignRule: 'Adulto con resistencia insulina, sin desórdenes alimentación, tolera ayuno 12h+ sin baja rendimiento excesivo. Flag P1 si HbA1c ≥5.7 + insulina ayunas ≥10.',
    priority: 2,
    family: 'ejercicio_ayuno',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'AMPK muscular robusto (energy sensor activado por glucógeno bajo)',
        'PGC-1α (biogénesis mitocondrial potenciada por AMPK)',
        'CPT-1 (β-oxidación grasas)',
        'IMTG utilización (Intramyocellular Triglyceride)',
        'GLUT4 sensibilidad (mejora insulin-mediada post)',
        'catecolaminas circulantes (adrenalina + noradrenalina)',
        'GH nocturna secundaria (ayuno + ejercicio + luego sueño)',
        'cetogénesis ligera (β-hidroxibutirato aumenta en ayunas + ejercicio)',
      ],
      inhibits: [
        'dependencia glucolítica basal',
        'insulinemia ayunas post-adaptación crónica',
        'glucógeno muscular pre-ejercicio (glycogen sparing adaptativo Van Proeyen)',
      ],
      modulates: [
        'RER (reduce hacia oxidación grasas)',
        'tasa_oxidacion_grasas_max_METS',
        'metabolic flexibility',
        'HbA1c',
        'HOMA-IR',
        'β-hidroxibutirato sérico (leve elevación)',
        'cortisol matutino (leve elevación aguda · si crónico → gestión)',
      ],
      biomarkers: [
        'HbA1c',
        'insulina_ayunas',
        'HOMA-IR',
        'trigliceridos',
        'RER_reposo',
        'tasa_oxidacion_grasas_max_METS',
        'beta_hidroxibutirato_serica',
        'cortisol_matutino_salival',
      ],
      mechanismSummary: 'Ejercicio zona 2 en ayuno combina 2 palancas · AMPK activo por glucógeno bajo + demanda energética mantenida · fuerza uso de IMTG y ácidos grasos plasmáticos como sustrato principal, entrenando la maquinaria oxidativa mitocondrial (β-oxidación) y mejorando la insulino-sensibilidad post-adaptación · Van Proeyen 2011 demostró beneficios metabólicos consistentes vs cardio alimentado equivalente.',
    },
    sideEffects: [
      'hambre_transitoria_post (esperada)',
      'sensacion_rendimiento_bajo_inicial (adaptación 2-4 semanas)',
      'cefalea_leve (hipoglucemia transitoria · si severa → suspender)',
      'irritabilidad_transitoria (bajo glucosa)',
      'mareo_ortostatico (si deshidratación · reponer electrolitos)',
    ],
    contraindications: [
      'diabetes_tipo_1 (riesgo hipoglucemia · adaptar con endocrino)',
      'hipoglucemia_reactiva_frecuente',
      'trastorno_conducta_alimentaria_activo',
      'embarazo',
      'lactancia',
      'bajo_peso_severo (BMI <18.5)',
      'infarto_reciente_<3meses',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
        { source: 'lab', marker: 'insulina_ayunas', operator: '>=', value: 10 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['diabetes_tipo_1', 'hipoglucemia_reactiva', 'tca_activo', 'embarazo', 'lactancia', 'bajo_peso_severo'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Van Proeyen K et al. "Beneficial metabolic adaptations due to endurance exercise training in the fasted state" J Appl Physiol 2011',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21051570/',
      },
      {
        citation: 'De Bock K et al. "Effect of training in the fasted state on metabolic responses during exercise with carbohydrate intake" J Appl Physiol 2008',
        paradigm: 'western_academic',
      },
      {
        citation: 'Peter Attia "Fasting and Metabolic Flexibility" · fasted zone 2 como palanca insulino-sensibilizadora',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ernesto Prieto Gratacós "Ayuno Profundo 3.0" 2020 · combinar ayuno + ejercicio aeróbico para agotar glucógeno y forzar β-oxidación',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · caminata suave AM en ayunas (Ushapan + Chankramana) recomendada Dinacharya · pre-desayuno',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Baduanjin AM en ayunas parte de práctica clásica · sostiene Yang matutino',
        paradigm: 'tcm',
      },
      {
        citation: 'Islam · Ramadan + prácticas físicas moderadas en ayuno documentadas históricamente · observaciones antropológicas de adaptación metabólica',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'ejercicio_ayuno_fuerza',
    name: 'Fuerza en ayuno (⚠️ NO para hipertrofia)',
    how: 'Sesión de fuerza al ~60-70% 1RM en ayuno 12-16h. ⚠️ NO PR, NO progresión de carga. Solo mantenimiento + autofagia. Post: proteína 30-40g + carb + grasa dentro de 30 min ventana anabólica. 1×/sem MAX. NUNCA combinar con cardio ayuno mismo día.',
    benefit: 'Autofagia muscular controlada + insulino-sensibilización. ⚠️ IMPORTANTE: en ayuno la mTOR se atenúa 40%, síntesis proteica queda negativa (Van Proeyen). CONTRAINDICADO para hipertrofia u objetivo estético/fuerza-máxima.',
    categories: ['metabolismo', 'movimiento', 'hormonal'],
    roots: ['hiperinsulinemia', 'resistencia_insulina', 'sarcopenia'],
    assignRule: '⚠️ Adulto avanzado que ya tolera cardio en ayuno. Sin PR, sin progresión, sin objetivos hipertrofia/fuerza-máxima. Sin trastornos alimentación. Sin sarcopenia activa. Solo si objetivo es autofagia + insulino-sensibilización puntual.',
    priority: 3,
    family: 'ejercicio_ayuno',
    requiresClinicalValidation: true,
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'AMPK muscular robusto',
        'autofagia muscular (LC3-II, ULK1)',
        'mitofagia (autofagia selectiva mitocondrial)',
        'catecolaminas (adrenalina + noradrenalina)',
        'GH pulso combinado (ayuno + ejercicio)',
        'β-hidroxibutirato (ligera cetosis)',
        'PGC-1α',
        'HSP70 muscular (respuesta estrés)',
      ],
      inhibits: [
        'mTORC1 (⚠️ atenuación 40% vs fed state · Van Proeyen)',
        'síntesis proteica muscular (⚠️ balance queda negativo)',
        'insulinemia post-ejercicio',
        'glucógeno muscular (agotamiento intencional)',
      ],
      modulates: [
        'ratio_autofagia_sintesis (favor autofagia)',
        'sensibilidad insulina post-adaptación',
        'metabolic flexibility',
        'cortisol agudo (mayor que en fed state)',
        'función mitocondrial vía mitofagia + biogénesis',
      ],
      biomarkers: [
        'HOMA-IR',
        'HbA1c',
        'CK (creatina kinasa · elevación mayor que fed state)',
        'β-hidroxibutirato_serica',
        'cortisol_matutino_salival',
        'testosterona_total',
        'nitrogeno_ureico_orina (marker catabolismo proteico)',
      ],
      mechanismSummary: 'Sesión de fuerza en ayuno maximiza AMPK + autofagia + mitofagia (limpieza celular controlada) · PERO atenúa mTORC1 40% y deja balance proteico negativo (Van Proeyen) · útil para PROTOCOLO DE LIMPIEZA CELULAR PUNTUAL, contraindicado para HIPERTROFIA o mantenimiento de masa muscular · ventana anabólica post-sesión (proteína + carb dentro de 30 min) rescata parcialmente la síntesis.',
    },
    sideEffects: [
      'hipoglucemia_riesgo_agudo (durante o post-sesión)',
      'mareo_ortostatico',
      'fatiga_CNS_marcada',
      'DOMS_prolongado (por reparación limitada en ayuno)',
      'reduccion_rendimiento_carga_maxima',
      'perdida_masa_muscular_si_crónico',
      'aumento_cortisol_crónico (si abuso)',
    ],
    contraindications: [
      'diabetes_tipo_1',
      'hipoglucemia_reactiva',
      'trastorno_conducta_alimentaria_activo',
      'embarazo',
      'lactancia',
      'bajo_peso_severo (BMI <18.5)',
      'sarcopenia_activa',
      'objetivo_hipertrofia_o_fuerza_maxima',
      'testosterona_total_baja_confirmada (<400 hombres)',
      'infarto_reciente_<3meses',
      'atleta_en_temporada_competitiva',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'objetivo', in: ['autofagia_puntual', 'insulino_sensibilizacion'] },
        { source: 'profile', field: 'tolera_cardio_ayuno', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['diabetes_tipo_1', 'hipoglucemia_reactiva', 'tca_activo', 'embarazo', 'lactancia', 'sarcopenia_activa'] },
        { source: 'profile', field: 'objetivo', in: ['hipertrofia', 'fuerza_maxima'] },
        { source: 'lab', marker: 'testosterona_total', operator: '<', value: 400 },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Van Proeyen K et al. J Appl Physiol 2011 · training fasted state · beneficios cardio · contraindicado fuerza',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21051570/',
      },
      {
        citation: 'Deldicque L et al. "Increased p70s6k phosphorylation during intake of a protein-carbohydrate drink following resistance exercise in the fasted state" Eur J Appl Physiol 2010 · muestra ventana rescate proteína post',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20169360/',
      },
      {
        citation: 'Layne Norton PhD · "Fasted lifting is neutral at best, catabolic at worst if repeated" · advertencia contra fasted resistance para hipertrofia',
        paradigm: 'functional_independent',
        paradigmConflict: 'Contradicción directa con narrativa popular "ayuno + fuerza = todo mejor". Evidencia matiza: bueno para autofagia puntual, malo para hipertrofia.',
      },
      {
        citation: 'Peter Attia · matiz: fasted training solo si "protein window" post rescata anabolismo',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ernesto Prieto Gratacós · autofagia + mitofagia como palanca de renovación celular, combinable con ejercicio moderado',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · caveat contra Vyayama en Kshaya (desgaste) · ayuno prolongado + fuerza pesada considerado Karshya-karana (adelgazante patológico)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Tradición Yoga · Sadhana matutina en ayunas más suave (Surya Namaskar moderado), NO fuerza pesada · alineación con ayurveda',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Mizuno S et al. "Autophagy exercise" Cell Metab 2012 · autofagia inducida por ejercicio en ayuno · mecanismo autofagia',
        paradigm: 'western_academic',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUTRICIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'eliminar_aceites_vegetales',
    name: 'Eliminar aceites vegetales industriales',
    how: 'Retira soya, canola, girasol refinado, maíz refinado, cártamo, algodón, semilla de uva, "aceite vegetal", margarinas industriales. Sustituir por: oliva EV, aguacate (extraction mecánica), coco EV, mantequilla clarificada/ghee, manteca cerdo pastoreado, sebo res pastoreada. Leer etiquetas: presente en 90% de procesados.',
    benefit: 'Reduce carga PUFA ω-6 oxidado (peroxidación lipídica · aldehídos HNE/MDA), mejora ratio ω-3/ω-6, baja inflamación silenciosa, protege membranas celulares (mitocondrial + neuronal).',
    categories: ['inflamacion', 'metabolismo', 'cardiovascular', 'nutricion', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'sobrecarga_procesados', 'sobrecarga_hepatica', 'estres_oxidativo_mitocondrial'],
    assignRule: 'Universal recomendado (énfasis Enrique doctrina fuerte). Flag P1 si PCR-hs ≥1.0, dolor articular crónico, dieta alta procesados, alto ω-6:ω-3 ratio (>10:1).',
    priority: 1,
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'NRF2 antioxidante (por reducción carga oxidativa exógena)',
        'ratio_omega3_omega6 favorable',
        'función membrana mitocondrial (fosfolípidos menos oxidables)',
        'cardiolipina mitocondrial funcional',
        'resolvinas + protectinas (mediadores anti-inflamatorios ω-3)',
      ],
      inhibits: [
        '4-HNE (4-hidroxinonenal · producto oxidación linoleico · tóxico mitocondrial)',
        'MDA (malondialdehído · marker peroxidación lipídica)',
        'F2-isoprostanos (marker estrés oxidativo)',
        'acúmulo intramuscular de linoleic acid oxidado',
        'inflamación silenciosa vía OxLDL',
        'ratio TG/HDL',
        'esteatosis hepática (NAFLD)',
      ],
      modulates: [
        'PCR_hs',
        'composición membranas eritrocitarias (Omega-3 Index)',
        'HDL',
        'LDL oxidado',
        'triglicéridos',
        'IgE + histamina (respuesta alérgica modulada)',
        'función endotelial (FMD mejora con menos OxLDL)',
      ],
      biomarkers: [
        'PCR_hs',
        'ratio_omega6_omega3_serico',
        'omega3_index_membrana_eritrocitaria',
        'MDA_malondialdehido_serico',
        '4-HNE_4-hidroxinonenal',
        'trigliceridos',
        'HDL',
        'ratio_TG_HDL',
        'LDL_oxidado',
        'GGT + ALT',
        'F2-isoprostanos_urinarios',
      ],
      mechanismSummary: 'Los aceites vegetales industriales (extracción con hexano, deodorización 240°C, blanqueado) contienen PUFA ω-6 (linoleico) altamente peroxidables · el consumo repetido acumula productos de oxidación (4-HNE, MDA, F2-isoprostanos) que dañan cardiolipina mitocondrial, oxidan LDL y activan inflamación crónica NF-κB · retirar aceites industriales sustituyéndolos por grasas monoinsaturadas + saturadas estables (oliva, coco, mantequilla clarificada) reduce carga oxidativa exógena y permite membranas funcionales.',
    },
    sideEffects: [
      'ajuste_paladar (2-4 semanas para adaptar palatabilidad de grasas naturales)',
      'costo_incremental (grasas de calidad más caras)',
      'complejidad_social (restaurantes usan aceites industriales por default)',
      'transicion_intestinal (cambio flora por cambio de sustrato lipídico)',
    ],
    contraindications: [
      'alergia_confirmada_a_aceite_alternativo_especifico (raro · ajustar alternativa)',
      'trastorno_pancreatico_no_evaluado (adaptar cantidad total grasa)',
      'gastroparesia_severa (grasa alenta vaciamiento gástrico)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'lab', marker: 'ratio_omega6_omega3', operator: '>=', value: 10 },
        { source: 'profile', field: 'dieta_procesados', equals: 'high' },
        { source: 'quiz', questionnaire: 'dolor_articular', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['pancreatitis_activa', 'gastroparesia_severa'] },
      ],
      boostWeight: 5,
    },
    sources: [
      {
        citation: 'DiNicolantonio JJ, O\'Keefe JH "Omega-6 vegetable oils as a driver of coronary heart disease: the oxidized linoleic acid hypothesis" Open Heart 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30302257/',
        industryFunded: false,
      },
      {
        citation: 'Ramsden CE et al. "Re-evaluation of the traditional diet-heart hypothesis: analysis of recovered data from Minnesota Coronary Experiment (1968-73)" BMJ 2016 · re-análisis muestra que reemplazar grasas saturadas por linoleico AUMENTÓ mortalidad',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27071971/',
        industryFunded: false,
      },
      {
        citation: 'Ray Peat "Unsaturated Vegetable Oils: Toxic" · biofísica hormonal · anti-PUFA doctrine',
        paradigm: 'functional_independent',
        url: 'http://raypeat.com/articles/articles/unsaturated-oils.shtml',
      },
      {
        citation: 'Cate Shanahan "Deep Nutrition" 2016 · "Hateful Eight" seed oils · procesamiento industrial genera productos tóxicos',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Kresser "How industrial seed oils are making us sick" · funcional integrativa',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ernesto Prieto Gratacós · biofísica · membranas celulares construidas con PUFA oxidables → disfunción mitocondrial + envejecimiento · alineación con paradigma biofísico',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Weston A. Price "Nutrition and Physical Degeneration" 1939 · dietas tradicionales sin aceites industriales asociadas a salud dental + estructural robusta',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Snehana con Ghee + aceites naturales (ajonjolí, mostaza, coco) · nunca aceites refinados industriales',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Mediterranean tradition · aceite de oliva virgen extra (extracción mecánica) como grasa principal milenaria · Estudio PREDIMED 2013 NEJM',
        paradigm: 'traditional_documented',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23432189/',
      },
      {
        citation: 'American Heart Association 2017 Advisory · postura opuesta · defiende ω-6 como cardio-protector',
        paradigm: 'western_academic',
        paradigmConflict: 'Contradicción central: mainstream AHA + Harvard defienden ω-6 · disidentes (DiNicolantonio, Shanahan, Peat, Kresser) argumentan oxidación es el problema real. ATP alinea con paradigma biofísico + evidencia re-análisis Minnesota + Sydney Diet Heart Study.',
        industryFunded: true,
      },
    ],
  },
  {
    key: 'sardinas_pescados_grasos',
    name: 'Sardinas / pescados grasos 2-3×/semana',
    how: 'Sardinas (frescas o enlatadas en aceite oliva o agua · NO en aceites vegetales), arenque, macarela, salmón salvaje (NO farmed), anchoas · 100-150g × 2-3 porciones semanales. Preferir peces pequeños pelágicos (menor biomagnificación mercurio).',
    benefit: 'Omega-3 EPA/DHA marino biodisponible (superior a cápsulas oxidadas), vitamina D3, K2 MK-4, colina, selenio, B12, proteína alta calidad, calcio (con espinas). Ratio ω-3/ω-6 favorable.',
    categories: ['inflamacion', 'cardiovascular', 'cognitivo', 'nutricion'],
    roots: ['inflamacion_silenciosa', 'deficit_neurotransmisores'],
    assignRule: 'Universal recomendado. Flag P1 si dieta baja pescado, PCR-hs ≥1.0, Omega-3 Index <8%, deficiencia vitamina D detectada, embarazo (con precaución mercurio pero sardinas OK).',
    priority: 2,
    family: 'sardinas',
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'resolvinas E-series (derivadas de EPA · pro-resolución inflamación)',
        'protectinas + neuroprotectin D1 (derivadas DHA · neuroprotección)',
        'PPAR-α (activado por ω-3 · metabolismo lipídico hepático)',
        'GPR120 (receptor ω-3 · anti-inflamatorio adiposo)',
        'BDNF cerebral (efecto DHA sobre neuroplasticidad)',
        'expresión mielina + fluidez membrana neuronal',
        'ácido eicosapentanoico → EPA membrana',
        'DHA en fosfolípidos retina + corteza (esencial visión + cognición)',
        'vitamina D endógena (cofactor · sinergia con exposición solar)',
        'selenoproteínas (via selenio · deiodinasas tiroideas, glutation peroxidasa)',
      ],
      inhibits: [
        'prostaglandinas E2 pro-inflamatorias (derivadas AA)',
        'leucotrienos B4 pro-inflamatorios',
        'NF-κB (via GPR120)',
        'triglicéridos hepáticos (esteatosis)',
        'coagulación excesiva (efecto antiplaquetario modesto)',
        'presión arterial (reducción 3-5 mmHg documentada)',
        'ratio ω-6/ω-3 desfavorable',
      ],
      modulates: [
        'omega3_index_membrana_eritrocitaria (target ≥8%)',
        'PCR_hs',
        'trigliceridos',
        'HDL',
        'presión_arterial',
        'función endotelial (FMD)',
        'estado ánimo (efecto EPA en depresión documentado)',
        'función cognitiva (DHA sostenido)',
        'vitamina_D_25OH',
        'mercurio_serico (⚠️ monitoreo si pescado grande)',
      ],
      biomarkers: [
        'omega3_index_membrana_eritrocitaria',
        'ratio_omega6_omega3_serico',
        'PCR_hs',
        'trigliceridos',
        'HDL',
        'vitamina_D_25OH',
        'selenio_serico',
        'B12_metilcobalamina',
        'homocisteina',
        'mercurio_serico (monitoreo · sardinas bajas)',
      ],
      mechanismSummary: 'Sardinas y peces pelágicos pequeños entregan EPA/DHA marinos pre-formados (bypass conversión limitada ALA→EPA en humanos ~5%), colina, vitamina D3, K2 MK-4, selenio y proteína completa · EPA/DHA se incorporan en fosfolípidos de membrana desplazando AA (ω-6), reduciendo síntesis de eicosanoides pro-inflamatorios y produciendo resolvinas/protectinas que activamente resuelven inflamación · biomagnificación de mercurio es baja en peces pequeños (cadena trófica corta).',
    },
    sideEffects: [
      'aftertaste_pescado (esperado · aceptación cultural)',
      'gas_intestinal_transitorio (adaptación digestiva a alta grasa proteína densa)',
      'sabor_metalico_boca (raro · minerales altos)',
      'alergia_pescado (contraindicación absoluta)',
      'gota_flare (alto purinas · monitoreo si tendencia)',
    ],
    contraindications: [
      'alergia_pescado_confirmada',
      'alergia_marisco_severa_polivalente',
      'gota_activa_con_uricemia_alta (>8 mg/dL)',
      'insuficiencia_renal_severa (proteínas + fósforo)',
      'anticoagulante_warfarina_no_monitoreado (interacción vitamina K + antiagregación ω-3)',
      'porfiria (relativa · monitoreo)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
        { source: 'lab', marker: 'omega3_index', operator: '<', value: 8 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'lab', marker: 'vitamina_D_25OH', operator: '<', value: 40 },
        { source: 'lab', marker: 'trigliceridos', operator: '>=', value: 150 },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['alergia_pescado', 'alergia_marisco_severa', 'gota_activa_uricemia_alta', 'insuficiencia_renal_severa'] },
        { source: 'profile', field: 'anticoagulante_no_monitoreado', equals: true },
      ],
      boostWeight: 5,
    },
    sources: [
      {
        citation: 'Harris WS, von Schacky C "The Omega-3 Index: a new risk factor for death from coronary heart disease?" Prev Med 2004 · target ≥8%',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/15208005/',
      },
      {
        citation: 'Mozaffarian D & Rimm EB "Fish intake, contaminants, and human health: evaluating the risks and the benefits" JAMA 2006 · beneficio pescado > riesgo mercurio en pelágicos pequeños',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17047219/',
      },
      {
        citation: 'Serhan CN "Pro-resolving lipid mediators are leads for resolution physiology" Nature 2014 · resolvinas + protectinas derivadas EPA/DHA',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24899309/',
      },
      {
        citation: 'Rhonda Patrick FoundMyFitness "Omega-3 fatty acids" report · fuente functional independent · síntesis mecanismos DHA cerebro',
        paradigm: 'functional_independent',
        url: 'https://www.foundmyfitness.com/topics/omega-3',
      },
      {
        citation: 'Chris Masterjohn PhD · sardinas como densidad nutricional excepcional (Ca, vit D, K2 MK-4, colina, selenio)',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Kresser "The best kept secret about fish oil" · pescado entero > cápsulas oxidadas · matiz doctrina ATP',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Weston A. Price "Nutrition and Physical Degeneration" 1939 · comunidades costeras (Gaelic Hebrides, polinesios) consumían pescados pequeños grasos como pilar dietético',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Mediterranean tradition · sardinas como pilar dietético español, portugués, italiano milenario · anchoas + arenques en tradición nórdica',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'MTC · pescados pequeños clasificados como "warming" · tonifican Jing (esencia) y Sangre',
        paradigm: 'tcm',
      },
      {
        citation: 'Ayurveda · Matsya (pescado) tradicionalmente consumido en poblaciones costeras · Bengali + Kerala tradición · fresco + pequeño preferido',
        paradigm: 'ayurveda',
      },
    ],
  },
  {
    key: 'protocolo_ayuno_sardinas',
    name: 'Protocolo Ayuno de Sardinas',
    how: '⏳ Detalles Enrique-Mariana pendientes. Formato genérico base (referencia D\'Agostino "Sardine Fast"): 3 días consumiendo únicamente sardinas enlatadas en aceite oliva o agua + agua + electrolitos (sodio, potasio, magnesio). Ventana ~600-900 kcal/día · proteína alta + grasa marina densa. NO carbohidratos. Suspender café si genera ansiedad. Romper con caldo + fruto + huevos.',
    benefit: 'Combina ayuno con proteína marina de alta calidad: preservación masa magra durante fase catabólica, cetosis nutricional acelerada (β-hidroxibutirato), autofagia sistémica, insulino-sensibilización robusta, ω-3 alto reduciendo inflamación durante ayuno.',
    categories: ['inflamacion', 'metabolismo', 'nutricion', 'mitocondrial'],
    roots: ['inflamacion_silenciosa', 'hiperinsulinemia', 'resistencia_insulina', 'sobrecarga_procesados', 'disfuncion_mitocondrial'],
    assignRule: 'PENDIENTE spec Enrique. Adulto con base ayuno previa (16-18h tolerado ≥1 mes) + sin contraindicaciones metabólicas ni alimentarias. Flag P1 si: reset metabólico buscado + inflamación + insulino-resistencia.',
    priority: 2,
    family: 'sardinas',
    scientificInfo: 'Protocolo en validación — pendientes los detalles finales (duración exacta, cantidad de sardinas/día, electrolitos, criterios de exclusión finales).',
    requiresClinicalValidation: true,
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'autofagia sistémica (LC3-II, ULK1) por ayuno',
        'mitofagia',
        'PGC-1α + biogénesis mitocondrial',
        'AMPK sostenida (glucógeno bajo + insulina baja)',
        'FOXO3 (autofagia + repair)',
        'GH pulso sostenido (ayuno + baja insulina)',
        'β-oxidación grasas',
        'cetogénesis hepática (β-hidroxibutirato)',
        'resolvinas + protectinas (por ω-3 sardinas)',
        'BDNF (por β-hidroxibutirato + DHA)',
        'sirtuinas SIRT1/SIRT3 (baja glucosa + NAD+)',
      ],
      inhibits: [
        'insulina sostenidamente baja',
        'IGF-1 sistémico (ayuno)',
        'mTOR sistémico (ayuno)',
        'inflamación crónica (ayuno + ω-3 sinergia)',
        'glucógeno hepático + muscular',
        'triglicéridos hepáticos (esteatosis)',
        'apetito ghrelin post-adaptación',
      ],
      modulates: [
        'β-hidroxibutirato_serica (elevación a 1-3 mmol/L)',
        'glucosa_ayunas (reducción)',
        'insulina_ayunas (reducción marcada)',
        'HOMA-IR (mejora)',
        'metabolic flexibility',
        'PCR_hs (reducción)',
        'omega3_index (aumento inmediato por carga)',
        'sodio + potasio (⚠️ reponer)',
        'cortisol AM (leve elevación transitoria fase adaptación)',
        'tiroides (T3 reversa puede aumentar transitoriamente · monitoreo)',
      ],
      biomarkers: [
        'beta_hidroxibutirato_serica',
        'glucosa_ayunas',
        'insulina_ayunas',
        'HOMA-IR',
        'PCR_hs',
        'omega3_index_membrana_eritrocitaria',
        'ratio_TG_HDL',
        'sodio_serico',
        'potasio_serico',
        'magnesio_serico',
        'cortisol_matutino_salival',
        'T3_reversa',
        'nitrogeno_ureico_orina',
      ],
      mechanismSummary: 'Protocolo de 3 días con sardinas exclusivas + agua + electrolitos combina: (1) ayuno de carbohidratos → cetosis nutricional + AMPK + autofagia · (2) proteína marina alta → preservación masa magra vs ayuno agua-solo · (3) ω-3 EPA/DHA denso → resolvinas + protectinas amplifican efecto anti-inflamatorio del ayuno · (4) micronutrientes (D, K2, B12, selenio, calcio) previenen deficiencias del ayuno prolongado · combinación única de todas las palancas metabólicas simultáneas sin depletar musculatura.',
    },
    sideEffects: [
      'keto_flu (fatiga, cefalea, brain fog fase 1-2 días adaptación)',
      'sed_aumentada (por diuresis cetogénica)',
      'calambres_musculares (por depleción electrolitos · reponer Na K Mg)',
      'aftertaste_pescado_intenso (aceptación cultural)',
      'gases_intestinales (adaptación digestiva a alta grasa+proteína)',
      'irritabilidad (fase adaptación · resuelve día 3)',
      'mareo_ortostatico (por natriuresis · reponer sal)',
      'insomnio_transitorio (elevación cortisol ayuno)',
    ],
    contraindications: [
      'alergia_pescado_marisco',
      'diabetes_tipo_1',
      'diabetes_tipo_2_con_medicacion_hipoglucemiante (⚠️ ajuste médico obligatorio)',
      'trastorno_conducta_alimentaria_activo_o_historia',
      'embarazo',
      'lactancia',
      'menores_18_años',
      'bajo_peso_severo (BMI <18.5)',
      'sarcopenia_activa',
      'insuficiencia_renal (proteína + purinas altas)',
      'insuficiencia_hepatica_avanzada',
      'gota_activa_uricemia_alta',
      'porfiria',
      'anticoagulante_no_monitoreado',
      'trastorno_electrolitico_activo',
      'estres_agudo_severo_o_infeccion_activa',
      'atleta_en_temporada_competitiva',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'ayuno_experiencia_16h_tolerado', equals: true },
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.5 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 2.0 },
        { source: 'profile', field: 'objetivo', in: ['reset_metabolico', 'reduccion_inflamacion_puntual'] },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['alergia_pescado', 'diabetes_1', 'diabetes_2_medicacion', 'tca_activo_o_historia', 'embarazo', 'lactancia', 'sarcopenia_activa', 'insuficiencia_renal', 'insuficiencia_hepatica', 'gota_activa', 'porfiria', 'anticoagulante_no_monitoreado', 'infeccion_activa'] },
        { source: 'profile', field: 'menor_de_edad', equals: true },
      ],
      boostWeight: 2,
    },
    sources: [
      {
        citation: 'Dominic D\'Agostino PhD · "Sardine Fast" protocolo · Tim Ferriss podcast 2025 · variante keto con proteína marina densa',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Longo VL "The Longevity Diet" 2018 + FMD (Fasting Mimicking Diet) research · autofagia + preservación tissue',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ernesto Prieto Gratacós "Ayuno Profundo 3.0" 2020 · palanca metabolismo cetogénico + autofagia · biofísica',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Dr. Boz (Annette Bosworth MD) · protocolos de ayuno con sardinas · educación popular · cetosis + inflamación',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Newport MT & Sourdif M "Ketogenic diet in Alzheimer\'s" · uso terapéutico cetosis · sardinas como pilar',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Langhana (terapia adelgazamiento / depuración) parte de Panchakarma · principio análogo del ayuno terapéutico',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · ayunos rituales estacionales (Xuan Zhu) + consumo pescado tonificante en fase de "vacío" recuperación',
        paradigm: 'tcm',
      },
      {
        citation: 'Cristianismo ortodoxo · ayuno cuaresmal con pescado como excepción proteica · tradición milenaria + observaciones antropológicas de resiliencia metabólica',
        paradigm: 'traditional_documented',
      },
      {
        citation: '⏳ PENDIENTE · Enrique-Mariana protocolo específico ATP con dosis exactas, ventanas, criterios de entrada/salida · task #8',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'visceras_higado',
    name: 'Vísceras (hígado) 1×/semana',
    how: '60-100g de hígado de res / cordero / pollo pastoreado, cocinado como paté, entero salteado con cebolla + hierbas, o técnica "hidden liver" (moler y agregar 20% a carne molida). Preferir grass-fed / orgánico. Frescura crítica. Alternativa: hígado desecado si no accesible fresco.',
    benefit: 'Densidad nutricional máxima documentada: B12 metilcobalamina, hierro heme biodisponible, cobre, vitamina A retinol activa (no beta-caroteno), colina, K2 MK-4 (Activator X · Weston Price), riboflavina, ácido fólico natural.',
    categories: ['nutricion', 'energia', 'cognitivo', 'hormonal'],
    roots: ['deficit_neurotransmisores', 'hipotiroidismo_funcional', 'baja_testosterona'],
    assignRule: 'Déficit nutrientes por dieta, anemia ferropénica, deficiencia B12, vegetarianismo transitional, deficiencia vitamina A funcional. ⚠️ Embarazo: reducir a 30-50g cada 2 semanas por retinol (evitar dosis >10K IU acumulada semanal).',
    priority: 3,
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'síntesis metilación (B12 + folato + colina · metil donors para SAM)',
        'expresión GABA + acetilcolina (via colina precursor)',
        'función tiroidea (via cobre + selenio + retinol · cofactores deiodinasas)',
        'función eritropoyética (Fe heme + B12 + folato · hemoglobina)',
        'función mitocondrial (CoQ10 endógeno · vía sinergia B2 + Fe)',
        'expresión vitamina A-dependiente (retinol → RXR/RAR receptores nucleares · miles de genes downstream)',
        'osteocalcina activa (via K2 MK-4)',
        'función suprarrenal (retinol + colesterol cofactor esteroidogénesis)',
        'testosterona (via colesterol biodisponible + retinol cofactor)',
      ],
      inhibits: [
        'anemia ferropénica',
        'hiperhomocisteinemia (via B12 + folato + colina metilación)',
        'deficiencia colina (rara pero severa · esteatosis + brain fog)',
        'calcificación tejidos blandos (via K2 MK-4 · dirige calcio a hueso, no arterias)',
        'brain fog nutricional',
      ],
      modulates: [
        'B12_metilcobalamina',
        'ferritina_serica (⚠️ monitoreo sobre-carga en varones)',
        'homocisteina',
        'colina_serica',
        'retinol_serico',
        'K2 MK-4 status (proxy calcificación coronaria decreciente)',
        'cobre_serico',
        'ceruloplasmina',
        'ratio_zinc_cobre',
      ],
      biomarkers: [
        'B12_metilcobalamina',
        'ferritina_serica',
        'hierro_serico',
        'homocisteina',
        'colina_serica_TMAO',
        'retinol_serico_25OHD_ratio',
        'cobre_serico',
        'ceruloplasmina',
        'ratio_zinc_cobre',
        'K2_MK-4_serico',
        'vitamina_A_retinol',
        'matriz-gla-protein_carboxylated',
      ],
      mechanismSummary: 'Hígado es "nature\'s multivitamin" · una porción de 100g cubre 100%+ RDA de B12, cobre, vitamina A retinol; 50-100% de riboflavina, folato, hierro heme; y aporta K2 MK-4 (Activator X de Weston Price, esencial para dirigir calcio a hueso y no arterias) · retinol activa cientos de genes vía RXR/RAR (no requiere conversión limitada como beta-caroteno) · colina + B12 + folato son metil donors para SAM (metilación DNA + neurotransmisores).',
    },
    sideEffects: [
      'sabor_intenso_polarizante (aceptación cultural)',
      'aftertaste_ferroso',
      'aumento_ferritina_si_consumo_semanal_alto_varones (monitorear · flebotomía si sobre-carga)',
      'diarrea_transitoria_si_bajo_habituacion (grasa + vitaminas altas)',
      'reaccion_alergica_rara',
    ],
    contraindications: [
      'hemocromatosis_diagnosticada (sobrecarga hierro)',
      'enfermedad_wilson (sobrecarga cobre)',
      'gota_activa (alto en purinas)',
      'insuficiencia_renal_severa (proteína + potasio + purinas)',
      'embarazo_primer_trimestre (⚠️ retinol >3000mcg RAE/día = riesgo defecto tubo neural · limitar dosis)',
      'hipervitaminosis_A_documentada',
      'trasplante_hepatico_reciente',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'lab', marker: 'B12', operator: '<', value: 400, unit: 'pg/mL' },
        { source: 'lab', marker: 'ferritina', operator: '<', value: 50, unit: 'ng/mL (mujeres)' },
        { source: 'lab', marker: 'hemoglobina', operator: '<', value: 12, unit: 'g/dL (mujeres)' },
        { source: 'lab', marker: 'vitamina_A_retinol', operator: '<', value: 30, unit: 'mcg/dL' },
        { source: 'profile', field: 'dieta', in: ['vegetariana_transitional', 'restrictiva_carne'] },
        { source: 'quiz', questionnaire: 'fatiga', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hemocromatosis', 'wilson', 'gota_activa', 'insuficiencia_renal_severa', 'hipervitaminosis_A'] },
        { source: 'profile', field: 'embarazo_trimestre', equals: 1 },
        { source: 'lab', marker: 'ferritina', operator: '>', value: 300, unit: 'ng/mL' },
      ],
      boostWeight: 2,
    },
    sources: [
      {
        citation: 'Weston A. Price "Nutrition and Physical Degeneration" 1939 · vísceras + K2 MK-4 (Activator X) universal en dietas tradicionales saludables',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Chris Masterjohn PhD · "The Ultimate Vitamin K2 Resource" · sinergia A + D + K2 esencial calcificación dirigida · dosis-respuesta',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Sally Fallon "Nourishing Traditions" 1999 · nose-to-tail cooking tradition · hígado + vísceras',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Chris Kresser "How to Eat Liver (Even If You Hate It)" · técnicas prácticas · pate + hidden ground',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Paul Saladino MD "The Carnivore Code" 2020 · vísceras como pilar · aunque doctrina extrema, review nutrient density sólida',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Yakrit (hígado) usado en Bengal/Kerala tradition · Rasayana para anemia + agotamiento',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · hígado (Gan 肝) principio "like cures like" para deficiencia sangre + Qi de Hígado · uso en formulas alimentarias tradicionales',
        paradigm: 'tcm',
      },
      {
        citation: 'Inuit/Maasai/Aché tradition · vísceras y sangre como pilar dietético · zero enfermedad crónica pre-contacto occidental (documentado antropológicamente)',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Latham MC "Human Nutrition in the Developing World" FAO 1997 · anemia + deficiencia B12 revertidas con hígado en poblaciones vulnerables · latin american + african public health',
        paradigm: 'latam_academic',
      },
      {
        citation: 'Rothman KJ et al. "Teratogenicity of high vitamin A intake" NEJM 1995 · caveat retinol > 10,000 IU/día en embarazo · fundamento contraindicación primer trimestre',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/7565991/',
        paradigmConflict: 'Occidental cauteloso vs tradición que consume hígado en embarazo. Resolución operativa: limitar dosis 1er trimestre + monitoreo retinol sérico si consumo semanal.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MENTE / COGNITIVO / MEDITACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'journal_am',
    name: 'Journal AM (3 min al despertar)',
    how: '3 min escribiendo a mano al despertar (idealmente antes de celular): (1) 1 gratitud específica del día anterior, (2) 1 sensación corporal presente, (3) 1 intención clara para el día. NO listas largas · brevedad = adherencia. Alternativa Julia Cameron: Morning Pages (3 páginas stream-of-consciousness).',
    benefit: 'Ancla presencia + intención en pico CAR matutino (30-45 min post-wake). Prime cortisol matutino sano hacia acción (no rumiación). Activa PFC + medial prefrontal cortex (planning + gratitude circuits · Kini 2016).',
    categories: ['ritual', 'cognitivo', 'ansiedad', 'estres'],
    roots: ['estres_cronico', 'deficit_neurotransmisores', 'cortisol_elevado_sostenido'],
    assignRule: 'Ansiedad generalizada, rumiación matutina, falta de foco, burnout, alta reactividad emocional. Universal recomendado (bajo costo, alto ROI).',
    priority: 3,
    family: 'journal',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'medial prefrontal cortex (planning + intención · Kini 2016 fMRI)',
        'circuito de gratitud (vmPFC + rostral ACC · dopamina + serotonina)',
        'BDNF via handwriting (activa 25+ regiones simultáneamente)',
        'DMN (Default Mode Network) modulación saludable (integración self)',
        'CAR (Cortisol Awakening Response) sano y dirigido a acción',
        'expresión metaconciencia (meta-awareness)',
      ],
      inhibits: [
        'rumiación matutina (via redirección hacia gratitud + intención)',
        'cortisol reactivo desregulado (Redwine 2016 · gratitud journal ↓ inflamación)',
        'reactivity amígdala (via etiquetado emocional · Lieberman 2007)',
        'scroll compulsivo redes matutino (bloquea entrada dopamina inmediata)',
      ],
      modulates: [
        'CAR amplitud (30-100% sobre baseline sano)',
        'IL-6 basal (Redwine 2016 gratitud journal → ↓ IL-6)',
        'HRV matutino (sostenido con práctica)',
        'foco cognitivo diurno',
        'meta-cognición emocional',
      ],
      biomarkers: [
        'cortisol_awakening_response_delta_pct',
        'cortisol_matutino_salival',
        'IL-6',
        'PCR_hs',
        'HRV RMSSD matutino',
        'GAD-7',
        'gratitud_score_escala_validada',
      ],
      mechanismSummary: 'Journal AM captura el pico natural CAR (Cortisol Awakening Response) y lo dirige hacia intención + acción en lugar de rumiación · el acto físico de escribir a mano activa 25+ regiones cerebrales simultáneamente (superior a digital), la gratitud específica activa vmPFC/circuito recompensa (Kini 2016), y el listing de intención engancha PFC planning · el efecto es meta-cognitivo: entrena al usuario a observar su propio estado.',
    },
    sideEffects: [
      'resistencia_inicial (10-14 días adaptación)',
      'aburrimiento_si_formato_rigido (rotar tipos: gratitud, intención, morning pages)',
      'emocional_flood_ocasional (esperado y benéfico si trauma activo · consultar terapeuta)',
    ],
    contraindications: [
      'trauma_activo_no_procesado_terapeuticamente (podría gatillar sin contención)',
      'analfabetismo_funcional (adaptar a audio grabación)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'braverman', neurotransmitter: 'serotonin', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trauma_activo_no_procesado'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Emmons RA & McCullough ME "Counting blessings versus burdens: an experimental investigation of gratitude and subjective well-being in daily life" J Pers Soc Psychol 2003',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12585811/',
      },
      {
        citation: 'Kini P et al. "The effects of gratitude expression on neural activity" NeuroImage 2016 · fMRI · vmPFC + medial PFC neuroplasticidad 3 meses',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26746580/',
      },
      {
        citation: 'Redwine LS et al. "Pilot randomized study of a gratitude journaling intervention on heart rate variability and inflammatory biomarkers in patients with stage B heart failure" Psychosom Med 2016 · IL-6 + HRV',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27187845/',
      },
      {
        citation: 'Pennebaker JW · Expressive Writing 40+ años research · benefit cognitivo + inmune',
        paradigm: 'western_academic',
      },
      {
        citation: 'Julia Cameron "The Artist\'s Way" 1992 · Morning Pages 3 páginas stream-of-consciousness · práctica creativa establecida',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tim Ferriss "The 5-Minute Journal" · protocolo simple gratitud + intención · popularización + testimonios',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Journal and Emotion Regulation" HubermanLab · dirigir foco matutino con escritura',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Sankalpa (intención al despertar) parte de Dinacharya · práctica ritual de propósito',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Estoicismo (Marco Aurelio "Meditaciones") · práctica matutina de reflexión + intención · Book 2:1 "when you rise..."',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ignacio de Loyola "Ejercicios Espirituales" · examen matutino + intención → tradición cristiana espiritual documentada',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'journal_pm',
    name: 'Journal PM (3 min antes de dormir)',
    how: '3 min a mano antes de dormir: (1) 1 win del día (por pequeño que sea), (2) 1 lección aprendida, (3) 1 cosa que suelto (rumiación, resentimiento). Alternativa Sam Harris: "Waking Down" 5 min descarga cognitiva. Alternativa Baumeister: to-do list de mañana (más eficaz para reducir latencia sueño · Scullin 2018 J Exp Psychol).',
    benefit: 'Cierre + integración del día, procesamiento emocional (activation of REM-precursor pathways), reduce rumiación pre-sueño, mejora latencia + arquitectura sueño.',
    categories: ['ritual', 'cognitivo', 'sueno', 'ansiedad'],
    roots: ['estres_cronico', 'adrenalina_nocturna', 'cortisol_elevado_sostenido', 'deficit_sueno_profundo'],
    assignRule: 'Rumiación nocturna, insomnio de conciliación, carga emocional alta, burnout, sobre-carga cognitiva de trabajador knowledge.',
    priority: 3,
    family: 'journal',
    timeOfDay: 'night',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'DMN downregulation post-écriture (integración → calma)',
        'consolidación emocional pre-REM',
        'expresión GABA-A (efecto ansiolítico ritual)',
        'meta-cognición (procesar día → aprendizaje continuo)',
        'sistema de recompensa vía win-list (dopamine positive close)',
      ],
      inhibits: [
        'rumiación nocturna (offloading mental · Scullin 2018)',
        'cortisol reactivo pre-sueño',
        'adrenalina residual del día',
        'sobre-activación DMN nocturna',
        'latencia de sueño (Scullin 2018 to-do list ↓ latencia)',
      ],
      modulates: [
        'latencia_sueño (Scullin 2018 to-do list vs completed activity)',
        'HRV nocturno',
        'cortisol_salival_23h',
        'ansiedad pre-sueño (GAD-7)',
        'arquitectura sueño (mejora REM subjectivo)',
      ],
      biomarkers: [
        'latencia_sueño',
        'cortisol_salival_23h',
        'HRV RMSSD nocturno',
        'sueño_profundo_horas',
        'sueño_REM_horas',
        'GAD-7',
        'PSQI',
      ],
      mechanismSummary: 'Journal PM descarga cognitivamente el día antes de dormir · el acto físico de escribir "cierra" ciclos abiertos (Zeigarnik effect · lo escrito ya no persigue el pensamiento), reduce activación DMN pre-sueño y baja cortisol nocturno · Scullin 2018 (Baylor) mostró que escribir to-do list REDUJO latencia de sueño más que escribir sobre actividades completadas · gratitud + soltar activa circuito serotoninérgico + parasympathetic.',
    },
    sideEffects: [
      'activación_emocional_transitoria (si trauma reciente · consultar terapeuta)',
      'aumento_alerta_si_escritura_estimulante (limitar 3-5 min)',
      'somnolencia_immediata (esperada y benéfica)',
    ],
    contraindications: [
      'trauma_activo_no_procesado_terapeuticamente',
      'trastorno_conducta_alimentaria_activo (si journal se convierte en tracking obsesivo)',
      'insomnio_paradojico_por_hyperfocalizacion_metacognitiva (raro · adaptar formato)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'lab', marker: 'latencia_sueño_min', operator: '>=', value: 30 },
        { source: 'quiz', questionnaire: 'rumiacion_nocturna', score: 'high' },
        { source: 'braverman', neurotransmitter: 'serotonin', threshold: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trauma_activo_no_procesado', 'tca_activo_tracking_obsesivo'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Scullin MK et al. "The effects of bedtime writing on difficulty falling asleep: A polysomnographic study" J Exp Psychol Gen 2018',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29058942/',
      },
      {
        citation: 'Pennebaker JW & Beall SK "Confronting a traumatic event: toward an understanding of inhibition and disease" J Abnorm Psychol 1986 · protocolo original',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/3745650/',
      },
      {
        citation: 'Baikie KA & Wilhelm K "Emotional and physical health benefits of expressive writing" Adv Psychiatr Treat 2005 · síntesis clínica',
        paradigm: 'western_academic',
      },
      {
        citation: 'Sam Harris "Waking Up" · práctica meditativa incluye reflexión pre-sueño para desactivar rumiación',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "Sleep Toolkit" · pre-sleep routine incluye descarga cognitiva',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Estoicismo (Séneca) · práctica examen consciencia nocturno · "cuando la luz se ha apagado, y mi esposa se ha ido a dormir, examino todo mi día"',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ignacio de Loyola "Examen de Conciencia diario" (Ejercicios Espirituales) · práctica cristiana estructurada · matutino + nocturno',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Sandhya (crepúsculo) como momento de introspección + Nishacharya · práctica reflectiva antes descanso',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · reloj de órganos · 19-21h (Pericardio) tiempo de "cierre emocional" del día',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'nsdr_10min',
    name: 'NSDR 10 min (micro-descanso)',
    how: 'Grabación guiada de Non-Sleep Deep Rest 10 min, acostado o reclinado, ojos cerrados. Escaneo corporal + respiración lenta guiada + relajación progresiva. Idealmente post-comida (rescata crash 14-16h), mid-afternoon, post-jetlag. Se recomienda 1-3×/día como práctica.',
    benefit: 'Micro-siesta sin dormir: baja cortisol, restaura dopamina baseline (aumento documentado post-práctica), recupera fatiga cognitiva sin latencia post-siesta, mejora aprendizaje via consolidation.',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual', 'sueno'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'deficit_sueno_profundo'],
    assignRule: 'Post-comida crash, jet-lag, burnout, siesta imposible, deep worker con carga cognitiva, insomnio con déficit de sueño acumulado.',
    priority: 2,
    family: 'nsdr_yoga_nidra',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'dopamina estriatal (Kjaer 2002 PET · +65% durante Yoga Nidra profunda)',
        'GABA-A signaling (relajación profunda)',
        'sistema parasympathetic (vagal tone)',
        'ondas theta corticales (estado hipnagógico)',
        'consolidación memoria vía offline replay',
        'plasticidad cortical (Balban 2023 breathwork analogo)',
        'BDNF (post-práctica sostenida)',
      ],
      inhibits: [
        'cortisol reactivo (reducción documentada)',
        'DMN hyperactive (rumiación)',
        'noradrenalina simpática',
        'fatiga central acumulada',
      ],
      modulates: [
        'HRV RMSSD (aumento durante y post)',
        'frecuencia cardíaca de reposo',
        'atención sostenida (Datta 2019 · 13 min NSDR mejora attention + mood)',
        'dopamina baseline post-práctica',
        'latencia sueño nocturno (si practica diurna adecuada)',
      ],
      biomarkers: [
        'cortisol_matutino_salival',
        'HRV RMSSD',
        'frecuencia_cardiaca_reposo',
        'dopamina_estriatal_PET',
        'test_reaccion_ms',
        'PSQI',
        'EEG_alpha_theta_ratio_frontal',
      ],
      mechanismSummary: 'NSDR es una práctica de descanso profundo con conciencia · combina scan corporal + respiración lenta + relajación muscular progresiva para llevar EEG a estado hipnagógico (theta dominante) sin dormir · Kjaer 2002 (PET scan) mostró aumento 65% de dopamina estriatal endógena durante Yoga Nidra profunda · Huberman postula NSDR como "reset dopaminérgico" rápido que restaura motivación + foco sin la latencia post-siesta.',
    },
    sideEffects: [
      'somnolencia_transitoria_post (se disipa 5-10 min · o transición a siesta natural)',
      'sensacion_disociativa_transitoria (esperada · integración post)',
      'emocional_flood (raro · si trauma activo → consultar)',
      'dificultad_iniciar_ojos_cerrados_publico (adaptar entorno)',
    ],
    contraindications: [
      'trauma_activo_disociativo (podría gatillar despersonalización)',
      'trastorno_psicotico_activo',
      'epilepsia_fotosensible_con_binaural_asociado (si audio incluye binaural)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'profile', field: 'trabajo_cognitivo_demandante', equals: true },
        { source: 'profile', field: 'jetlag_actual', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trauma_disociativo_activo', 'psicosis_activa', 'epilepsia_fotosensible'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Kjaer TW et al. "Increased dopamine tone during meditation-induced change of consciousness" Cogn Brain Res 2002 · PET scan +65% dopamine',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11958969/',
      },
      {
        citation: 'Datta K et al. "Cyclic meditation: a moving meditation, reduces energy expenditure more than supine rest" Int J Yoga 2017 · precursor NSDR research',
        paradigm: 'western_academic',
      },
      {
        citation: 'Datta K et al. "Yoga Nidra practice · attention + memory + mood" 2019 · 13 min protocol · improvement significant',
        paradigm: 'western_academic',
      },
      {
        citation: 'Andrew Huberman "NSDR Protocol" HubermanLab · popularización + audio libre en Spotify · 10-20-30 min variantes',
        paradigm: 'functional_independent',
        url: 'https://www.hubermanlab.com/nsdr',
      },
      {
        citation: 'Balban MY et al. "Brief structured respiration practices enhance mood and reduce physiological arousal" Cell Rep Med 2023 · Stanford · mecanismo parasympathetic',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
      },
      {
        citation: 'Yoga tradición · Yoga Nidra descrita en Mandukya Upanishad + Vigyan Bhairava Tantra (siglo VIII) · práctica milenaria origen NSDR',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Swami Satyananda Saraswati "Yoga Nidra" Bihar School of Yoga 1976 · protocolo moderno sistematizado, precursor de todos los NSDR contemporáneos',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Ru Jing (入静 · "entrar en calma") · práctica Qigong de meditación acostada · principio equivalente',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'yoga_nidra_30min',
    name: 'Yoga Nidra 20-30 min (restaurativo)',
    how: 'Grabación guiada de Yoga Nidra tradicional Satyananda 20-30 min, acostado (Shavasana). Protocolo 8 etapas: (1) preparación · (2) Sankalpa (intención) · (3) rotación conciencia · (4) respiración · (5) opuestos sensoriales · (6) visualización · (7) Sankalpa reafirmación · (8) despertar gradual. Alternativa iRest (Miller) para trauma.',
    benefit: 'Restauración profunda sostenida · reset autonómico completo · trabajo con inconsciente vía Sankalpa · reduce PTSD/ansiedad · mejora arquitectura sueño nocturno. Equivalente a 3-4h sueño en descanso subjetivo.',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual', 'sueno'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'deficit_sueno_profundo'],
    assignRule: 'Burnout profundo, insomnio crónico, ansiedad sostenida, PTSD (con iRest), trauma en proceso terapéutico, recuperación post-quirúrgica.',
    priority: 2,
    family: 'nsdr_yoga_nidra',
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'dopamine estriatal (Kjaer 2002)',
        'GABA-A signaling profundo',
        'parasympathetic dominant state (múltiples etapas)',
        'theta + alpha frontal EEG (medrxiv 2025 systematic review)',
        'DMN downregulation profunda',
        'oxitocina hipotalámica (via Sankalpa + relajación)',
        'consolidación emocional traumática (iRest · Miller para PTSD)',
        'BDNF sostenido con práctica regular',
      ],
      inhibits: [
        'cortisol reactivo (reducción documentada iRest trials)',
        'hyperarousal PTSD (Stankovic 2011 Walter Reed)',
        'insomnio crónico',
        'ansiedad generalizada (GAD-7 reducción)',
        'dolor crónico (uso VA hospitals · 35 centros)',
      ],
      modulates: [
        'HRV RMSSD (aumento sostenido)',
        'arquitectura sueño nocturno (con práctica diaria)',
        'PCL-5 (PTSD Checklist) score',
        'GAD-7 (ansiedad)',
        'PSQI',
        'estado meditative profundo (theta-alpha ratio)',
        'auto-regulación emocional',
      ],
      biomarkers: [
        'cortisol_salival_curva',
        'HRV RMSSD',
        'sueño_profundo_horas',
        'PSQI',
        'GAD-7',
        'PCL-5',
        'EEG_alpha_theta_ratio_frontal',
        'DHEA-S',
      ],
      mechanismSummary: 'Yoga Nidra 30 min es una práctica secuencial de 8 etapas que lleva al practicante a estado hipnagógico profundo (theta-alpha dominant) mientras mantiene conciencia · el Sankalpa (intención positiva sembrada en este estado) actúa como reprogramación sub-consciente · Miller\'s iRest protocol adaptado a PTSD veteranos (35 centros VA) muestra reducción de hyperarousal + ansiedad + insomnio · efecto de restauración es más profundo que NSDR corto y comparable a 3-4h de sueño subjetivo.',
    },
    sideEffects: [
      'liberacion_emocional_intensa (esperada · integración post)',
      'somnolencia_marcada_post (30-60 min)',
      'sueños_vividos_nocturnos',
      'sensacion_disociativa_transitoria',
      'sensibilidad_emocional_horas_post (útil para procesamiento)',
      'quedarse_dormido (aceptable, aunque óptimo es mantener consciencia liminar)',
    ],
    contraindications: [
      'trauma_disociativo_activo_sin_terapeuta',
      'psicosis_activa',
      'epilepsia_fotosensible (si audio con binaural o luz)',
      'depresion_severa_con_ideacion_suicida_activa (contención terapéutica requerida)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 2 },
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 2 },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'quiz', questionnaire: 'PSQI', score: 'high' },
        { source: 'profile', field: 'trauma_procesado_terapia', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trauma_disociativo_activo_sin_terapeuta', 'psicosis_activa', 'depresion_severa_ideacion_suicida'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Miller RC "Yoga Nidra: A Meditative Practice for Deep Relaxation and Healing" 2005 · protocolo iRest',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Stankovic L "Transforming trauma: a qualitative feasibility study of integrative restoration (iRest) yoga Nidra on combat-related PTSD" Int J Yoga Therap 2011 · Walter Reed',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22398342/',
      },
      {
        citation: 'Kjaer TW et al. Cogn Brain Res 2002 · dopamine estriatal PET (mencionado en NSDR también · efecto similar más profundo en 30 min)',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11958969/',
      },
      {
        citation: 'Datta K et al. "Effects of Yoga Nidra Practice on EEG Oscillations: A Systematic Review" medRxiv 2025 · síntesis systematic',
        paradigm: 'western_academic',
        url: 'https://www.medrxiv.org/content/10.1101/2025.06.16.25329676v1',
      },
      {
        citation: 'Swami Satyananda Saraswati "Yoga Nidra" 1976 · sistematización moderna desde Mandukya Upanishad y Vigyan Bhairava Tantra',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Mandukya Upanishad (siglo VIII a.C.) · descripción estados Turiya y Sushupti · base filosófica de Yoga Nidra',
        paradigm: 'ayurveda',
      },
      {
        citation: 'US Veterans Affairs · 35+ centros implementan iRest para PTSD, dolor crónico, insomnio · programa validado por Department of Defense',
        paradigm: 'western_academic',
      },
      {
        citation: 'Sonia Nevermind (iRest Institute) · training internacional para clinicians · integration modernidad + tradición',
        paradigm: 'functional_independent',
      },
      {
        citation: 'MTC · Ru Jing profundo + Wu Ji (無極) meditación sostenida acostada · concepto convergente vacío-conciencia',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'binaurales_delta',
    name: 'Frecuencias binaurales delta (sueño profundo pre-sueño)',
    how: 'Auriculares estereofónicos + audio con delta 2Hz (tone A 200Hz izquierdo + tone B 202Hz derecho · diferencia percibida 2Hz). 15-30 min antes de dormir. Volumen bajo-moderado. NO altavoces (requiere separación L/R para efecto binaural). Alternativa isochronic tones.',
    benefit: 'Sueño profundo pre-sueño: reduce latencia N2/N3 (Kajimura 2024), calma parasympathetic, prepara transición al sueño y consolidación nocturna.',
    categories: ['sueno', 'cognitivo', 'ritual', 'ansiedad'],
    roots: ['deficit_sueno_profundo', 'adrenalina_nocturna', 'estres_cronico'],
    assignRule: 'Insomnio de conciliación, transición al sueño difícil, rumiación nocturna, jetlag. Asistivo pre-sueño.',
    priority: 3,
    family: 'binaurales',
    timeOfDay: 'night',
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'melatonina pineal (indirecto vía relajación pre-sueño)',
        'sistema parasympathetic (efecto audio calmante)',
        'GABA-A signaling (via relajación)',
        'reduccion arousal cortical prefrontal',
        'ondas delta EEG (0.5-4Hz) durante sueño profundo',
      ],
      inhibits: [
        'cortisol nocturno (indirecto)',
        'DMN hyperactive nocturno',
        'noradrenalina residual (via relajación)',
      ],
      modulates: [
        'latencia_sueño (Kajimura 2024 · 0.25Hz redujo N2/N3 latency)',
        'melatonina_salival_nocturna',
        'sueño_profundo_%',
        'HRV nocturno',
        'estado subjetivo calma',
      ],
      biomarkers: [
        'latencia_sueño',
        'sueño_profundo_horas',
        'melatonina_salival_nocturna',
        'HRV RMSSD nocturno',
        'PSQI',
        'EEG_delta_power_pct',
      ],
      mechanismSummary: 'Binaural beats delta: dos tonos con 2Hz de diferencia presentados por separado en cada oído generan la percepción de un "batido" al 2Hz, favoreciendo relajación parasympathetic profunda pre-sueño · Kajimura 2024 (Nature Sci Rep) mostró reducción de latencia N2/N3 con 0.25Hz · combina ansiolisis + preparación circadiana para consolidación de sueño.',
    },
    sideEffects: [
      'dolor_cabeza_leve_por_frequencia (rare · si ocurre suspender)',
      'irritabilidad_transitoria (si volumen alto)',
      'dependencia_para_dormir (si uso obligatorio · desintoxicar periódico)',
      'aumento_ansiedad_paradojico (raro)',
    ],
    contraindications: [
      'epilepsia_fotosensible_o_auditivo-sensible',
      'audifonos_no_disponibles (efecto binaural requiere separación L/R)',
      'implante_coclear (comprobar compatibilidad)',
      'trastorno_disociativo_severo',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'sueno', operator: '<=', value: 3 },
        { source: 'lab', marker: 'latencia_sueño_min', operator: '>=', value: 30 },
        { source: 'quiz', questionnaire: 'insomnio_conciliacion', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epilepsia_auditivo_sensible', 'trastorno_disociativo_severo'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Garcia-Argibay M et al. "Efficacy of binaural auditory beats in cognition, anxiety, and pain perception: a meta-analysis" Psychol Res 2019',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30073406/',
        paradigmConflict: 'Systematic review concluye "insuficiente evidencia entrainment consistente" · efecto probable ansiolítico-parasympathetic más que sincronización EEG verdadera. Copy user-facing mantiene claim funcional (relajación + latencia), no promete entrainment.',
      },
      {
        citation: 'Chaieb L et al. "Auditory beat stimulation and its effects on cognition and mood states" Front Psychiatry 2015 · systematic review',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26029120/',
      },
      {
        citation: 'Kajimura S et al. "Binaural beats at 0.25 Hz shorten the latency to slow-wave sleep during daytime naps" Sci Rep 2024',
        paradigm: 'western_academic',
        url: 'https://www.nature.com/articles/s41598-024-76059-9',
      },
      {
        citation: 'Wahbeh H et al. "Binaural beat technology in humans: a pilot study to assess neuropsychologic, physiologic, and electroencephalographic effects" J Altern Complement Med 2007',
        paradigm: 'western_academic',
      },
      {
        citation: 'Tradición sonoterapia · gong bath + singing bowls (Himalaya) · frecuencias bajas para inducir calma pre-sueño · práctica milenaria',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Nada Yoga · práctica ancestral de sonido interior (Anahata Nada) + externo · Hatha Yoga Pradipika + Sangita Ratnakara (s.XIII) documentan uso terapéutico',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · terapia sonora en Qigong · frecuencias asociadas a órganos (五音疗法 · wǔ yīn liáo fǎ · "cinco tonos terapéuticos") · aunque no delta específico, principio equivalente',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'binaurales_theta',
    name: 'Frecuencias binaurales theta (meditación profunda)',
    how: 'Auriculares + theta 6Hz (tone A 200Hz + tone B 206Hz). 15-30 min durante meditación o estado creativo. Isochronic tones alternativa. Combinable con Yoga Nidra / NSDR.',
    benefit: 'Meditación profunda: facilita estados hipnagógicos controlados (theta EEG · Jirakittayakorn 2017 mostró aumento theta cortical en 10 min), creatividad, insight, integración emocional.',
    categories: ['estres', 'cognitivo', 'ritual'],
    roots: ['estres_cronico', 'deficit_neurotransmisores'],
    assignRule: 'Práctica meditativa que requiere profundidad, sesiones de brainstorming/insight, integración emocional, journal creativo pre-post.',
    priority: 3,
    family: 'binaurales',
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'theta cortical (Jirakittayakorn 2017 · aumento pattern meditativo en 10 min)',
        'frontal midline theta (Fmθ · asociada foco meditativo)',
        'DMN modulación integrativa',
        'creatividad divergente (mecanismo propuesto)',
        'consolidación memoria emocional',
        'estado hipnagógico controlado',
      ],
      inhibits: [
        'beta hyperactivo (ansiedad cognitiva)',
        'DMN rumiativo',
        'noradrenalina simpática',
      ],
      modulates: [
        'EEG theta_ratio',
        'estado meditativo profundidad subjetiva',
        'creatividad divergente',
        'HRV vagal (aumento durante práctica)',
        'auto-percepción sensorial',
      ],
      biomarkers: [
        'EEG_alpha_theta_ratio_frontal',
        'HRV RMSSD',
        'theta_power_frontal',
        'CAARS-mindfulness',
        'creativity_score_Torrance',
      ],
      mechanismSummary: 'Binaural theta 6Hz teóricamente induce entrainment EEG a theta (4-8Hz · estado meditativo, creativo, hipnagógico) · Jirakittayakorn 2017 confirmó aumento theta cortical general en 10 min de exposición · efecto aditivo con práctica meditativa formal · frontal midline theta correlaciona con foco meditativo profundo.',
    },
    sideEffects: [
      'somnolencia_marcada (si sesión larga)',
      'estados_disociativos_leves_transitorios',
      'liberación_emocional (esperada · integración post)',
      'irritabilidad_transitoria (raro)',
    ],
    contraindications: [
      'epilepsia_fotosensible_o_auditivo-sensible',
      'trastorno_disociativo_severo',
      'psicosis_activa',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'practica_meditativa_activa', equals: true },
        { source: 'profile', field: 'trabajo_creativo', equals: true },
        { source: 'quiz', questionnaire: 'estres', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epilepsia_auditivo_sensible', 'trastorno_disociativo_severo', 'psicosis_activa'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Jirakittayakorn N & Wongsawat Y "Brain Responses to a 6-Hz Binaural Beat: Effects on General Theta Rhythm and Frontal Midline Theta Activity" Front Neurosci 2017',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28725176/',
      },
      {
        citation: 'Reedijk SA et al. "The impact of binaural beats on creativity" Front Hum Neurosci 2013',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24399947/',
      },
      {
        citation: 'Chaieb L et al. Front Psychiatry 2015 · systematic review',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26029120/',
        paradigmConflict: 'Efectos modestos y heterogéneos en la literatura; claim ATP se limita a facilitar meditación, no como intervención autónoma.',
      },
      {
        citation: 'Andrew Huberman "Focus & Meditation" HubermanLab · teorías sobre theta + attention',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición monástica (Zen, Tibetano) · cantos + chants tono grave sostenido · frecuencias que inducen estados meditativos',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Nada Yoga · Bhramari Pranayama (respiración de abeja) genera frecuencias internas alrededor de theta-alpha · convergencia funcional',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Wu Yin (五音 · Cinco tonos) terapia asociada a órganos + estados meditativos · Qigong sonoro',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'binaurales_alpha',
    name: 'Frecuencias binaurales alpha (calma alerta / relax)',
    how: 'Auriculares + alpha 10Hz (tone A 200Hz + tone B 210Hz). 15-30 min para relax alerta, transición estrés-foco, creatividad. Isochronic tones alternativa.',
    benefit: 'Calma alerta / relax: estado alfa relajado con presencia (10Hz · resonancia natural EEG en reposo · Berger 1929). Reducción cortisol y ansiedad pre-quirúrgica documentada (10Hz · Bloch 2025).',
    categories: ['estres', 'ansiedad', 'cognitivo', 'ritual'],
    roots: ['estres_cronico', 'deficit_neurotransmisores'],
    assignRule: 'Transición estrés → foco, creatividad, relax activo (no somnolencia), ansiedad pre-procedimiento, transición trabajo → hogar.',
    priority: 3,
    family: 'binaurales',
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'alpha cortical (8-13Hz · Berger rhythm · calm alert)',
        'parasympathetic activation moderada',
        'GABA-A signaling (via relajación)',
        'DMN saludable (transición reposo-integración)',
        'creatividad de flujo (flow state)',
      ],
      inhibits: [
        'beta hyperactivo',
        'cortisol reactivo (Bloch 2025 · 10Hz baja cortisol)',
        'ansiedad pre-quirúrgica',
        'noradrenalina simpática',
      ],
      modulates: [
        'ansiedad_pre-procedimiento (STAI · State-Trait Anxiety)',
        'cortisol_salival_agudo',
        'HRV RMSSD',
        'foco cognitivo sub-máximo (no deep work sino alerta calma)',
        'coherencia_frontal_EEG_alpha',
      ],
      biomarkers: [
        'cortisol_salival_agudo',
        'STAI',
        'HRV RMSSD',
        'EEG_alpha_power_frontal',
        'coherencia_frontal_alpha_pct',
      ],
      mechanismSummary: 'Binaural alpha 10Hz coincide con el ritmo natural EEG en reposo con ojos cerrados (Berger 1929) · entrainment a alpha promueve estado calma-alerta (opuesto a beta hyperactivo de ansiedad) · Bloch 2025 mostró equivalencia con benzodiacepinas en ansiolisis pre-quirúrgica.',
    },
    sideEffects: [
      'dolor_cabeza_leve_raro',
      'somnolencia (esperada si volumen bajo prolongado)',
      'irritabilidad_transitoria (raro)',
      'dependencia_uso (moderar frecuencia)',
    ],
    contraindications: [
      'epilepsia_fotosensible_o_auditivo-sensible',
      'implante_coclear (compatibilidad)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'medium' },
        { source: 'profile', field: 'ansiedad_pre_procedimiento', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epilepsia_auditivo_sensible'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Berger H "Über das Elektrenkephalogramm des Menschen" Arch Psychiatr Nervenkr 1929 · descubrimiento ritmo alpha 10Hz reposo',
        paradigm: 'western_academic',
      },
      {
        citation: 'Bloch M et al. "Binaural beat stimulation as a tool to reduce preoperative anxiety in patients undergoing elective surgery and general anesthesia" IOPscience 2025 · RCT · alpha 10Hz ≈ benzo',
        paradigm: 'western_academic',
        url: 'https://iopscience.iop.org/article/10.1088/2057-1976/adfa9d',
      },
      {
        citation: 'Padmanabhan R et al. "A prospective, randomised, controlled study examining binaural beat audio and pre-operative anxiety" Anaesthesia 2005',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16176313/',
      },
      {
        citation: 'Andrew Huberman "Alpha state · transition tools" HubermanLab',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Reedijk SA et al. Front Hum Neurosci 2013 · creativity + alpha modest',
        paradigm: 'western_academic',
      },
      {
        citation: 'Nada Yoga (Anahata Nada) + Gregorian chant (~7Hz-11Hz frecuencias vocales resonantes) → efecto calma alerta convergente · aproximación tradicional',
        paradigm: 'ayurveda',
        paradigmConflict: 'PARADIGMA_AUSENTE: no hay tradición directa alpha 10Hz específica. Aproximación por prácticas sonoras contemplativas convergentes.',
      },
      {
        citation: 'Gregorian chant tradición · frecuencias vocales resonantes en catedrales · efecto alpha documentado antropológicamente en monjes',
        paradigm: 'traditional_documented',
      },
    ],
  },
  {
    key: 'binaurales_beta',
    name: 'Frecuencias binaurales beta (deep work / foco cognitivo)',
    how: 'Auriculares + beta 20Hz (tone A 200Hz + tone B 220Hz). 15-30 min durante deep work / estudio / tareas cognitivas demandantes. NO combinar con música vocal (distrae). Isochronic tones alternativa.',
    benefit: 'Deep work / foco cognitivo: alerta cognitiva sostenida (beta 13-30Hz · estado atento normal), soporte para memoria de trabajo y procesamiento en tareas exigentes.',
    categories: ['cognitivo', 'ritual', 'energia'],
    roots: ['deficit_neurotransmisores'],
    assignRule: 'Deep work demandante, foco cognitivo sostenido, estudio, tareas de procesamiento prolongado.',
    priority: 3,
    family: 'binaurales',
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'beta cortical (13-30Hz · attention + processing)',
        'noradrenalina modesta (arousal cognitivo)',
        'atención selectiva',
        'expresión frontal + hippocampal (Kraus review · memoria)',
      ],
      inhibits: [
        'somnolencia (efecto anti-descanso)',
        'DMN mind-wandering',
      ],
      modulates: [
        'atención sostenida',
        'memoria trabajo (Kennerly 2004 · +27% memoria un estudio)',
        'fatiga cognitiva percibida',
        'EEG_beta_power',
      ],
      biomarkers: [
        'test_reaccion_ms',
        'test_working_memory',
        'EEG_beta_power_frontal',
        'attention_sustained_score_Conners',
        'N_Back_nivel_maximo_alcanzado',
      ],
      mechanismSummary: 'Binaural beta 20Hz teóricamente entrena EEG a beta (estado atento normal) y funciona como audio de fondo para foco cognitivo · Kennerly 2004 mostró +27% memoria vs white noise · útil como asistivo para deep work sostenido.',
    },
    sideEffects: [
      'irritabilidad_por_frecuencia (rare)',
      'dolor_cabeza_leve',
      'fatiga_cognitiva (paradójica · si exceso)',
      'tinnitus_transitorio (raro · si volumen alto)',
    ],
    contraindications: [
      'epilepsia_fotosensible_o_auditivo-sensible',
      'tinnitus_severo_activo',
      'TDAH_activo_no_tratado (podría exacerbar hyperfocus disruptivo)',
      'implante_coclear (compatibilidad)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'trabajo_cognitivo_demandante', equals: true },
        { source: 'quiz', questionnaire: 'foco', score: 'low' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['epilepsia_auditivo_sensible', 'tinnitus_severo', 'tdah_no_tratado'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Kennerly RC "An empirical investigation into the effect of beta frequency binaural beat audio signals on four measures of human memory" 2004 · +27% memoria vs white noise',
        paradigm: 'western_academic',
      },
      {
        citation: 'Kraus J et al. "A parametric investigation of binaural beats for brain entrainment and enhancing sustained attention" Sci Rep 2025',
        paradigm: 'western_academic',
        url: 'https://www.nature.com/articles/s41598-025-88517-z',
        paradigmConflict: 'Kraus 2025 (n=1000) muestra que en algunas condiciones el binaural beat empeoró test scores · evidencia mixta; ATP posiciona binaural beta como asistivo experimental, no promesa autónoma.',
      },
      {
        citation: 'Chaieb L et al. Front Psychiatry 2015 · systematic review · mixed evidence attention',
        paradigm: 'western_academic',
      },
      {
        citation: 'Garcia-Argibay M et al. Psychol Res 2019 · meta-analysis · effect size small',
        paradigm: 'western_academic',
      },
      {
        citation: 'Cal Newport "Deep Work" 2016 · uso ambient sound (no vocal) para deep work · propuesta funcional',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Tradición: silencio + música instrumental modal (raga Durbari Kanada, gregoriano de vísperas) para foco meditativo · aproximación convergente pre-moderna',
        paradigm: 'traditional_documented',
        paradigmConflict: 'PARADIGMA_AUSENTE: no hay tradición documentada directa de audio 20Hz beta para foco · aproximación por prácticas sonoras contemplativas.',
      },
    ],
  },
  {
    key: 'n_back_challenge',
    name: 'N-Back Challenge (working memory)',
    how: 'Dual N-Back task: recordar simultáneamente posición espacial + auditiva de N pasos atrás. Progresión: N=1 → N=2 → N=3 → N=∞. 15-20 min/día, 5-6×/semana × mínimo 4 semanas. Apps: Brain Workshop (open source), IQ Mindware, Peak.',
    benefit: 'Entrena working memory (dlPFC + parietal) y aumenta score específico N-Back con progresión sostenida. Neuroplasticidad WM-específica documentada en adultos. Herramienta cognitiva estructurada para trabajo demandante y prevención de declive.',
    categories: ['cognitivo', 'ritual'],
    roots: ['deficit_neurotransmisores'],
    assignRule: 'Adulto con declive cognitivo autoreportado, brain fog, trabajo cognitivo demandante, biohacker curioso. FEATURE APP GRANDE — Cowork investiga referencias antes de spec técnica (task #45).',
    priority: 3,
    evidenceLevel: 'N3',
    epigeneticImpact: {
      activates: [
        'prefrontal cortex dorsolateral (dlPFC · WM)',
        'parietal cortex (integración espacial-auditiva)',
        'expresión BDNF (task-based · aumento aguda documentado)',
        'neuroplasticidad WM-específica',
        'dopamine baseline modesta (task-reward)',
        'coordinación cross-modal (audio-visual)',
      ],
      inhibits: [
        'declive cognitivo WM edad-dependiente (evidencia adultos mayores)',
        'brain fog (subjetivamente reportado)',
      ],
      modulates: [
        'N_Back_nivel_maximo_alcanzado',
        'working memory (Digit Span · Corsi Block)',
        'test WM tareas cercanas (near-transfer)',
        'fluid intelligence (Gf)',
        'atención sostenida (near-transfer)',
        'estado meta-cognitivo',
      ],
      biomarkers: [
        'N_Back_nivel_maximo_alcanzado',
        'Digit_Span_forward_backward',
        'Corsi_Block_span',
        'test_reaccion_ms',
        'fluid_intelligence_Raven_matrices',
        'MoCA',
      ],
      mechanismSummary: 'Dual N-Back exige mantener + actualizar continuamente 2 streams (posición + sonido) N pasos atrás · entrena dlPFC + parietal · Jaeggi 2008 PNAS mostró transfer a Gf (fluid intelligence) que fue landmark del cognitive training · efecto documentado sobre working memory y N-Back score con práctica sostenida.',
    },
    sideEffects: [
      'fatiga_cognitiva_marcada_post-sesión',
      'frustracion_por_progreso_lento (esperado)',
      'obsesion_por_score (moderar)',
      'gaming_behavior (asegurar juego, no obsesión)',
    ],
    contraindications: [
      'trastorno_ansiedad_severa_por_desempeño (podría exacerbar)',
      'depresion_severa (frustración amplifica)',
      'TDAH_activo_no_tratado (adaptar sesiones cortas)',
      'epilepsia_no_controlada (algunos formatos flash visual)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'quiz', questionnaire: 'brain_fog', score: 'high' },
        { source: 'profile', field: 'trabajo_cognitivo_demandante', equals: true },
        { source: 'profile', field: 'edad_40_o_mas', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['ansiedad_severa_desempeño', 'depresion_severa', 'tdah_no_tratado', 'epilepsia_no_controlada'] },
      ],
      boostWeight: 1,
    },
    sources: [
      {
        citation: 'Jaeggi SM et al. "Improving fluid intelligence with training on working memory" PNAS 2008 · original landmark · +Gf claim',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18443283/',
      },
      {
        citation: 'Au J et al. "Improving fluid intelligence with training on working memory: a meta-analysis" Psychon Bull Rev 2014 · effect modest positive',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25102926/',
      },
      {
        citation: 'Melby-Lervåg M et al. "Working Memory Training Does Not Improve Performance on Measures of Intelligence or Other Measures of Far Transfer" Perspect Psychol Sci 2016 · 95 estudios',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27474138/',
        paradigmConflict: 'Meta-análisis contradice landmark Jaeggi 2008 sobre transfer far a Gf. Comunidad académica dividida: near-transfer (WM tareas cercanas + N-Back score) sí replicado; far-transfer (Gf) disputado. Copy user-facing ATP se enfoca en beneficios replicados; controversia se documenta aquí para transparencia.',
      },
      {
        citation: 'Weicker J et al. "Can impaired working memory functioning be improved by training? A meta-analysis with a special focus on brain injured patients" Neuropsychology 2016 · positivos en poblaciones clínicas',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26569028/',
      },
      {
        citation: 'Chris Kresser · Attia · Huberman abordaje cauto sobre N-Back · comunicación honesta',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Memorización oral vedas (Vedic chanting requiere memoria trabajo alta · Ghana Patha, Jata Patha) → convergencia funcional milenaria de entrenamiento WM',
        paradigm: 'ayurveda',
        paradigmConflict: 'PARADIGMA_AUSENTE: no hay tradición ancestral N-Back específica. Aproximación por prácticas de memorización oral estructurada.',
      },
      {
        citation: 'MTC · nemotecnia clásica Confucian · memorización libros clásicos como práctica cognitiva estándar tradicional · convergencia',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'silencio_30min',
    name: 'Silencio 30 min/día',
    how: '30 min al día sin música, podcasts, TV, redes, notificaciones. Puede ser al caminar, cocinar, sentarse. Ambiente puede tener ruido natural (viento, agua, animales). Progresión: 5 min → 15 min → 30 min. Combinable con caminata, journal, cocina.',
    benefit: 'Baja carga cognitiva, permite consolidación memoria via DMN saludable, reduce cortisol (Bernardi 2006), neurogénesis hipocampal (Kirste 2013 · 2h silencio ↑50% neurogénesis vs ruido en ratones).',
    categories: ['estres', 'cognitivo', 'ansiedad', 'ritual'],
    roots: ['cortisol_elevado_sostenido', 'estres_cronico', 'deficit_neurotransmisores'],
    assignRule: 'Universal — especialmente burnout, sobrecarga info, rumiación, trabajador knowledge, ambiente urbano ruidoso.',
    priority: 2,
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'DMN saludable (integración self, no rumiación)',
        'neurogénesis hipocampal (Kirste 2013 · ratones)',
        'consolidación memoria offline',
        'parasympathetic (respuesta a ausencia de estímulo sonoro)',
        'metacogición + auto-reflexión',
        'BDNF baseline',
      ],
      inhibits: [
        'cortisol reactivo (Bernardi 2006 · silencio > música clásica en reducción)',
        'noradrenalina simpática',
        'sobre-carga cognitiva',
        'burnout progression',
      ],
      modulates: [
        'HRV RMSSD',
        'cortisol_ritmo',
        'atención sostenida (post-silencio)',
        'creatividad (default mode processing)',
        'auto-percepción emocional',
      ],
      biomarkers: [
        'cortisol_matutino_salival',
        'HRV RMSSD',
        'GAD-7',
        'PSQI',
        'escala_soledad_creativa_ideal',
      ],
      mechanismSummary: 'El silencio (30 min sin estimulación auditiva estructurada) permite al cerebro entrar en modo DMN saludable (integración self, consolidación memoria) · Kirste 2013 mostró que 2h silencio/día × 7 días en ratones aumentó neurogénesis hipocampal 50% vs música/ruido · Bernardi 2006 mostró que 2 min de silencio post-música clásica bajaron cortisol MÁS que la música misma · el silencio es intervención regenerativa activa, no pasiva.',
    },
    sideEffects: [
      'ansiedad_inicial (esperada · adaptación 2 semanas · "silencio ruidoso" mental)',
      'aburrimiento_transitorio',
      'emociones_supressed_emergiendo (útil pero requiere contención)',
      'sensacion_desconexion_social',
    ],
    contraindications: [
      'trastorno_disociativo_severo (silencio prolongado gatilla)',
      'depresion_severa_con_ideacion_suicida (necesita conexión, no aislamiento)',
      'psicosis_activa',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'profile', field: 'ambiente_urbano_ruidoso', equals: true },
        { source: 'profile', field: 'trabajo_cognitivo_demandante', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trastorno_disociativo_severo', 'depresion_ideacion_suicida', 'psicosis_activa'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Kirste I et al. "Is silence golden? Effects of auditory stimuli and their absence on adult hippocampal neurogenesis" Brain Struct Funct 2015 (accepted 2013)',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24292324/',
      },
      {
        citation: 'Bernardi L et al. "Cardiovascular, cerebrovascular, and respiratory changes induced by different types of music in musicians and non-musicians: the importance of silence" Heart 2006 · silencio > música en cortisol',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16410365/',
      },
      {
        citation: 'Sacks O "Musicophilia" 2007 · reflection on silence · neurología',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Kaplan S "The restorative benefits of nature: Toward an integrative framework" J Environ Psychol 1995 · attention restoration theory · silencio + naturaleza',
        paradigm: 'western_academic',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/0272494495900012',
      },
      {
        citation: 'Anders Hansen "The Attention Fix" 2024 · silencio + digital minimalism · impacto atención',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Cal Newport "Digital Minimalism" 2019 · propone "solitude deprivation" como epidemia · silencio como cura',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Cristianismo monástico · Regla de San Benito (Cap 42 · "the Great Silence") · silencio nocturno + porciones diurnas · tradición 1500 años',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Vipassana (Buddhist) · retiros 10 días silencio noble (Noble Silence) · práctica milenaria documentada',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Mauna (silencio ritual) parte de Yamas + Niyamas · Patanjali Yoga Sutras · elemento sadhana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Wu Wei (無為 · no-acción) taoista · silencio como estado activo · Zhuangzi + Daode Jing',
        paradigm: 'tcm',
      },
    ],
  },
  {
    key: 'green_time_30min',
    name: 'Green time (naturaleza) 30 min/día',
    how: '30 min al día en espacio verde: parque, bosque, jardín, playa, montaña. Idealmente sin celular (o modo avión). Puede combinar con caminata, respiración, journal. Shinrin-yoku ideal (Miyazaki protocol): 2-4h bosque × 2×/semana. Alternativa urbana: green pockets (jardines pequeños).',
    benefit: 'Reduce cortisol (Miyazaki forest bathing), mejora HRV, attention restoration (Kaplan), exposición a microbioma diverso (rewilding intestinal), NK cells activity ↑ 50% × 7 días post (Li Qing 2007 · phytoncides).',
    categories: ['estres', 'ansiedad', 'cognitivo', 'inmunologico', 'ritual'],
    roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'disbiosis', 'deficit_exposicion_solar'],
    assignRule: 'Universal — flag P1 si burnout, ambiente urbano intenso, deficiencia sensorial, disbiosis crónica, inmunidad baja recurrente.',
    priority: 2,
    evidenceLevel: 'N1',
    epigeneticImpact: {
      activates: [
        'NK cells (Natural Killer · Li Qing 2007 · +50% × 7 días post shinrin-yoku)',
        'anti-cancer proteins (perforin, granulysin, granzyme A/B)',
        'expresión Nrf2 antioxidante (via phytoncides α-pineno + limoneno)',
        'sistema parasympathetic (Ulrich Stress Reduction Theory)',
        'microbioma cutáneo + respiratorio diverso (rewilding)',
        'BDNF (via green exercise)',
        'vitamina D endógena (si sol exposure)',
        'serotonina (via luz natural + naturaleza)',
      ],
      inhibits: [
        'cortisol (Miyazaki + Kaplan)',
        'adrenalina simpática',
        'PCR + IL-6 (Li Qing cascada)',
        'presión arterial (reducción documentada 3-6 mmHg)',
        'rumiación (Bratman 2015 Stanford · green walk ↓ subgenual PFC)',
        'DMN pathological hyperactive',
      ],
      modulates: [
        'HRV RMSSD',
        'cortisol_ritmo (aplanamiento saludable)',
        'atención sostenida (attention restoration)',
        'microbioma alfa-diversity',
        'NK_cells_actividad_pct',
        'PCR_hs',
        'estado ánimo (POMS)',
        'exposición_solar_diaria_horas',
      ],
      biomarkers: [
        'NK_cells_actividad_pct',
        'cortisol_matutino_salival',
        'HRV RMSSD',
        'PCR_hs',
        'IL-6',
        'presion_arterial_sistolica',
        'vitamina_D_25OH',
        'diversidad_alfa_microbioma',
        'POMS',
      ],
      mechanismSummary: 'Green time actúa por 4 vías simultáneas · (1) attention restoration (Kaplan · soft fascination recupera directed attention) · (2) stress reduction (Ulrich · vista natural activa parasympathetic) · (3) phytoncides (Li Qing · α-pineno limoneno inhalados aumentan NK cells + anti-cancer proteins 50% × 7 días) · (4) rewilding microbioma (exposición ambientes diversos aumenta alfa-diversity) · efecto combinado: reduce cortisol, mejora inmunidad, restaura atención.',
    },
    sideEffects: [
      'alergia_polen_estacional (adaptar época)',
      'exposición_insectos (garrapatas · Lyme endemia)',
      'exposicion_alergenos_ambientales',
      'quemadura_solar_riesgo (si Fitzpatrick I sin protección)',
      'lesion_terreno_irregular (adaptar calzado)',
    ],
    contraindications: [
      'alergia_polen_severa_activa (adaptar época/lugar)',
      'inmunosupresion_severa (zona endemia infección relevante)',
      'lupus_eritematoso_activo (si sol expuesto sin protección)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inmunologico', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
        { source: 'profile', field: 'ambiente_urbano', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['alergia_polen_severa_activa', 'inmunosupresion_severa', 'lupus_activo'] },
      ],
      boostWeight: 4,
    },
    sources: [
      {
        citation: 'Li Q "Effect of forest bathing trips on human immune function" Environ Health Prev Med 2010 · NK cells +50% × 7 días post',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19568839/',
      },
      {
        citation: 'Miyazaki Y & Park BJ "Physiological effects of shinrin-yoku across 24 forests" Environ Health Prev Med 2010',
        paradigm: 'western_academic',
      },
      {
        citation: 'Kaplan R & Kaplan S "The Experience of Nature: A Psychological Perspective" 1989 · Attention Restoration Theory',
        paradigm: 'western_academic',
      },
      {
        citation: 'Ulrich RS "View through a window may influence recovery from surgery" Science 1984 · Stress Reduction Theory · vista naturaleza ↓ recovery',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/6143402/',
      },
      {
        citation: 'Bratman GN et al. "Nature experience reduces rumination and subgenual prefrontal cortex activation" PNAS 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26124129/',
      },
      {
        citation: 'Andrew Huberman "Nature exposure + eye viewing distance" HubermanLab · beneficios visuales + cognitivos',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ayurveda · Vana Vihara (paseo en bosque) parte de Dinacharya + Ritucharya estacional · Charaka Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'MTC · Feng Shui + wanderings en jardines chinos (庭園 · tíng yuán) como práctica de armonía con Wu Xing · milenaria',
        paradigm: 'tcm',
      },
      {
        citation: 'Cristianismo · San Francisco de Asís "Cantico delle Creature" · naturaleza como Divinum manifesto · práctica contemplativa integrada',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Wilderness therapy modern (Louv "Last Child in the Woods" 2005) · "nature deficit disorder" concepto · rewilding niños + adultos',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Ernesto Prieto Gratacós · exposición naturaleza + sol + tierra parte de longevidad biofísica · convergencia con grounding',
        paradigm: 'functional_independent',
      },
    ],
  },
  {
    key: 'digital_minimalism_1dia_semana',
    name: 'Digital minimalism 1 día/semana',
    how: 'Un día a la semana (idealmente sábado o domingo) sin redes sociales, sin news, sin email, uso celular limitado a llamadas + mensajes esenciales personales. Notifications OFF día completo. Cal Newport "Sabbath tecnológico". Progresión: 2h/día → 4h/día → 1 día completo.',
    benefit: 'Restaura dopamina baseline (reset tolerancia hedónica), mejora atención (Kraus + Hansen), reduce comparación social (Twenge · Facebook depression), protege sueño (nocturno + descanso cognitivo), fortalece relaciones IRL.',
    categories: ['cognitivo', 'estres', 'ansiedad', 'ritual', 'sueno'],
    roots: ['deficit_neurotransmisores', 'estres_cronico', 'sobreexposicion_luz_azul'],
    assignRule: 'Adulto con hi-usage redes (>2h/día pantalla social), ansiedad social-media-mediada, burnout, falta de foco, insomnio pantallas-mediado. Universal recomendado a knowledge workers.',
    priority: 2,
    evidenceLevel: 'N2',
    epigeneticImpact: {
      activates: [
        'DMN saludable (integración self)',
        'BDNF (via lectura + naturaleza + relación IRL)',
        'melatonina nocturna preservada (menos luz azul)',
        'expresión oxitocina (interacción cara-a-cara aumenta)',
        'circadiano alineado (menos scroll nocturno)',
        'atención sostenida (recovery de atención fragmentada)',
        'dopamina baseline (reset de spike-scroll adictivo)',
      ],
      inhibits: [
        'hyperstimulación dopaminérgica intermitente (variable ratio reinforcement schedule)',
        'cortisol reactivo social-media-mediado (Twenge · Instagram + adolescentes)',
        'ansiedad comparativa (social media hedónico)',
        'FOMO (fear of missing out)',
        'DMN pathological (rumiación digital)',
        'insulina + peak glucosa (menos snacking pantalla-mediado)',
        'inflamación silenciosa (indirecto vía sueño + estrés)',
      ],
      modulates: [
        'screen_time_promedio_semanal_horas',
        'redes_sociales_horas_día',
        'sueño_profundo_horas',
        'PSQI',
        'GAD-7',
        'PHQ-9',
        'FOMO_scale_Przybylski',
        'atención sostenida',
        'relaciones_IRL_frecuencia',
      ],
      biomarkers: [
        'screen_time_promedio_semanal_horas',
        'redes_sociales_horas_día',
        'PSQI',
        'GAD-7',
        'PHQ-9',
        'FOMO_scale_Przybylski',
        'sueño_profundo_horas',
        'cortisol_ritmo',
        'uso_pantalla_2h_antes_sueño_min',
      ],
      mechanismSummary: 'Digital minimalism 1 día/semana rompe el ciclo de reinforcement schedule variable (dopamina intermitente que hace adictivas las redes) permitiendo reset de la baseline dopaminérgica · reduce cortisol reactivo (Twenge · relación social media-ansiedad adolescentes replica en adultos) · restaura DMN saludable + atención sostenida · preserva melatonina nocturna si no scroll pre-sueño · Cal Newport propone Sabbath tecnológico como "solitude deprivation cure".',
    },
    sideEffects: [
      'ansiedad_desconexion_inicial (2-4 semanas · FOMO agudo)',
      'aburrimiento_marcado (esperado · terapéutico)',
      'irritabilidad_por_disponibilidad_urgencias_percibidas',
      'sensacion_desconexion_grupos_sociales_digital',
      'craving_scroll_similar_abstinencia_leve',
    ],
    contraindications: [
      'trabajo_urgencia_24-7_no_negociable (adaptar horas en lugar de día completo)',
      'aislamiento_social_severo (si redes son única conexión · adaptar)',
      'trastorno_ansiedad_agorafobia (si redes son coping mechanism · adaptar con terapeuta)',
      'depresion_severa_con_ideacion_suicida (contención requerida)',
    ],
    recommendationRules: {
      boostIf: [
        { source: 'profile', field: 'screen_time_4h_o_mas', equals: true },
        { source: 'profile', field: 'redes_sociales_2h_o_mas', equals: true },
        { source: 'quiz', questionnaire: 'ansiedad', score: 'high' },
        { source: 'quiz', questionnaire: 'PSQI', score: 'high' },
        { source: 'quiz', questionnaire: 'burnout', score: 'high' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['trabajo_urgencia_24-7', 'aislamiento_social_severo', 'depresion_severa_ideacion_suicida'] },
      ],
      boostWeight: 3,
    },
    sources: [
      {
        citation: 'Cal Newport "Digital Minimalism" 2019 · philosophy of technology use · 30-day digital declutter',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Cal Newport "Deep Work" 2016 · deep work vs shallow work · digital minimalism as prerequisite',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Twenge JM "iGen" 2017 + "Have Smartphones Destroyed a Generation?" Atlantic 2017 · relación uso smartphone-ansiedad-depresión adolescentes',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Anders Hansen "The Attention Fix" 2024 · neuroscience smartphone-attention',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Alter A "Irresistible: The Rise of Addictive Technology and the Business of Keeping Us Hooked" 2017 · mecanismos adicción digital',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Andrew Huberman "How Smartphones Affect the Brain" HubermanLab · dopamine + attention',
        paradigm: 'functional_independent',
      },
      {
        citation: 'Przybylski AK et al. "Motivational, emotional, and behavioral correlates of fear of missing out" Comput Human Behav 2013 · FOMO scale validated',
        paradigm: 'western_academic',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S0747563213000800',
      },
      {
        citation: 'Hunt MG et al. "No More FOMO: Limiting Social Media Decreases Loneliness and Depression" J Soc Clin Psychol 2018 · RCT · límite ~30min/día reduce depresión',
        paradigm: 'western_academic',
        url: 'https://guilfordjournals.com/doi/10.1521/jscp.2018.37.10.751',
      },
      {
        citation: 'Sabbath judeocristiano · 25h de descanso semanal sin trabajo (incluye tecnología en interpretación ortodoxa) · práctica milenaria · modelo Newport',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Islam · Jumu\'ah (viernes) día especial de reunión + descanso relativo · variantes culturales',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Ayurveda · Dinacharya + Ritucharya · descanso ritual periódico · práctica védica de retirar sentidos (Pratyahara)',
        paradigm: 'ayurveda',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVAS INTERVENCIONES · propuestas Enrique 2026-07-14 (piloto + ushapan)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    key: 'bano_frio_hormesis',
    name: 'Baño frío 2-4°C (hormesis intensa · Søberg)',
    how: 'Inmersión hasta el cuello a 2-4°C, 30 seg-3 min máx, 2-3×/semana (total ~11 min/sem · protocolo Søberg). Idealmente en la mañana. Timing recomendado: PRE-fuerza (30-60 min antes) para perfil hormonal (T + GH). Si post-fuerza, esperar ≥6h (cold post-fuerza <6h atenúa mTOR/hipertrofia).',
    benefit: 'Choque térmico controlado que activa grasa parda vía UCP1, dispara norepinefrina/dopamina 250-500%, gatilla biogénesis mitocondrial vía PGC-1α y entrena resiliencia autonómica. La versión más agresiva del cold exposure con evidencia sólida (Søberg 2021).',
    categories: ['metabolismo', 'energia', 'estres', 'cognitivo', 'cardiovascular', 'inflamacion'],
    roots: ['inflamacion_silenciosa', 'cortisol_matutino_bajo', 'deficit_neurotransmisores', 'sedentarismo', 'ritmo_circadiano_desregulado'],
    assignRule: 'Adulto sano con base previa en cold exposure (tolera 10-15°C ≥2 min). Flag P1 si fatiga adrenal AM + inflamación crónica + deseo entrenamiento CNS. REQUIERE progresión desde bano_frio_desinflamacion. Timing recomendado: PRE-fuerza o ≥6h post-fuerza.',
    priority: 2,
    family: 'bano_frio',
    timeOfDay: 'morning',
    evidenceLevel: 'N2',
    requiresClinicalValidation: false,

    epigeneticImpact: {
      activates: [
        'UCP1 en tejido adiposo pardo · thermogenesis no-shivering',
        'PGC-1α (master regulator biogénesis mitocondrial)',
        'β3-adrenergic receptor signaling → cAMP → PKA → p38MAPK → CREB',
        'norepinefrina plasmática (200-500% aumento agudo)',
        'dopamina estriatal (250% aumento sostenido ~1h post)',
        'CIRP (cold-inducible RNA-binding protein) neuroprotector',
        'browning de tejido adiposo blanco (WAT→beige)',
        'HIF-1α y VEGF (angiogénesis muscular)',
      ],
      inhibits: [
        'inflamación aguda (reducción IL-6 y TNF-α post-inmersión repetida)',
        'lipogénesis blanca',
        'insulina baseline (mejor sensibilidad post-adaptación)',
        'expresión NF-κB muscular post-crónica',
        'señalización mTOR muscular si inmediato post-fuerza',
      ],
      modulates: [
        'HRV RMSSD (aumento sostenido en adaptados)',
        'tono vagal (dive reflex vía nervio trigémino)',
        'cortisol_ritmo (amplifica CAR matutino)',
        'sensibilidad_insulina (Søberg 2021: mejora post 11 min/sem)',
        'termogénesis basal (aumento 5-15% gasto energético total)',
        'función tiroidea (aumento T4→T3 conversión periférica)',
        'ratio Th1/Th2 (modulación inmune)',
      ],
      biomarkers: [
        'lactato_reposo',
        'HRV_RMSSD',
        'PCR_hs',
        'norepinefrina_plasmatica_matutina',
        'glucosa_ayunas',
        'HOMA_IR',
        'temperatura_corporal_delta',
        'NEFA_no_esterificados',
        'succinato_plasmatico',
      ],
      mechanismSummary: 'La inmersión a 2-4°C es un estresor térmico agudo que dispara catecolaminas, activa UCP1 en grasa parda y desacopla la cadena respiratoria mitocondrial para generar calor, forzando biogénesis mitocondrial vía PGC-1α · segundo mensajero: succinato acumulado activa HIF-1α y programa hormesis.',
    },

    sideEffects: [
      'shock_termico_inicial_jadeo_reflejo',
      'hiperventilacion_transitoria',
      'entumecimiento_extremidades',
      'urticaria_por_frio_raro',
      'euforia_post_bano_esperada',
      'fatiga_diferida_si_exposicion_larga_sin_adaptacion',
    ],

    contraindications: [
      'cardiopatia_isquemica_activa',
      'arritmia_ventricular_no_controlada',
      'sindrome_qt_largo',
      'insuficiencia_cardiaca_descompensada',
      'hipertension_maligna_no_controlada',
      'raynaud_severo_o_crioglobulinemia',
      'urticaria_a_frigore_confirmada',
      'embarazo',
      'epilepsia_no_controlada',
      'trombocitopenia_severa',
      'anorexia_activa',
      'fiebre_viral_activa_37_8_o_mas',
      'infeccion_respiratoria_aguda_fase_temprana',
      'post_vacunacion_48h_con_sintomas_sistemicos',
      'recuperacion_covid_gripe_severa_primeras_2_semanas',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
        { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
        { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
        { source: 'lab', marker: 'HOMA_IR', operator: '>=', value: 2.0 },
        { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
        { source: 'chronotype', type: 'oso' },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_no_controlada', 'raynaud_severo', 'urticaria_frio', 'embarazo', 'epilepsia_no_controlada'] },
        { source: 'profile', field: 'edad_65_o_mas', equals: true },
      ],
      boostWeight: 3,
    },

    sources: [
      {
        citation: 'Søberg S et al. "Altered brown fat thermoregulation and enhanced cold-induced thermogenesis in young, healthy, winter-swimming men" Cell Reports Medicine 2021',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34614051/',
        industryFunded: false,
      },
      {
        citation: 'Hohenauer E et al. "Potential health benefits of cold-water immersion: the central role of PGC-1α" J Physiol 2025',
        paradigm: 'western_academic',
        url: 'https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP289536',
        industryFunded: false,
      },
      {
        citation: 'Šrámek P et al. "Human physiological responses to immersion into water of different temperatures" Eur J Appl Physiol 2000 · norepinefrina 530% en 14°C',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10751106/',
        industryFunded: false,
      },
      {
        citation: 'Roberts LA et al. "Post-exercise cold water immersion attenuates acute anabolic signalling and long-term adaptations in muscle to strength training" J Physiol 2015',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26174323/',
        industryFunded: false,
        paradigmConflict: 'Contradice cold plunge post-fuerza inmediato. Resolución: separar ≥6h o hacer PRE-fuerza.',
      },
      {
        citation: 'Andrew Huberman "The Science & Use of Cold Exposure for Health & Performance" HubermanLab episode 66',
        paradigm: 'functional_independent',
        url: 'https://www.hubermanlab.com/episode/the-science-and-use-of-cold-exposure-for-health-and-performance',
      },
      {
        citation: 'Rhonda Patrick "Cold Exposure and Norepinephrine" FoundMyFitness',
        paradigm: 'functional_independent',
        url: 'https://www.foundmyfitness.com/topics/cold-exposure-therapy',
      },
      {
        citation: 'Wim Hof Method · Kox et al. PNAS 2014 modula respuesta inmune',
        paradigm: 'functional_independent',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24799686/',
      },
      {
        citation: 'Tradición rusa · Zakalivanie (закаливание · endurecimiento por frío) · protocolo Suvórov s.XVIII',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'Investigación soviética · winter swimming (Morzhi) · Voronin 1970s',
        paradigm: 'soviet_sports',
      },
      {
        citation: 'Ayurveda · Sheetali/Sheetkari pranayama + baños fríos matutinos para Pitta · Charaka Samhita Sutra Sthana',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Sebastian Kneipp "Meine Wasserkur" 1886 · hidroterapia europea con inmersión fría corta',
        paradigm: 'traditional_documented',
      },
    ],
  },

  {
    key: 'hidratacion_ushapan_avanzado',
    name: 'Hidratación Ushapan avanzada (1-1.5 L al despertar)',
    how: 'Bebe 1-1.5 L de agua tibia (no fría) al despertar, en ayunas, antes de café o comida. Toma sorbos progresivos durante 15-20 min. Ayurveda Ushapan · protocolo Charaka. Versión más agresiva que hidratacion_matutina 500 ml.',
    benefit: 'Estimulación agresiva de peristalsis matutina (evacuación completa), lavado renal, dilución de metabolitos nocturnos, activación de motilidad linfática y biliar. Reset hidratación tras 8-10h de ayuno. Doctrina Ayurveda tradicional para usuarios que dominan la versión básica.',
    categories: ['hidratacion', 'digestion', 'circadiano', 'energia', 'ritual'],
    roots: ['cortisol_matutino_bajo', 'ritmo_circadiano_desregulado', 'digestion_estres_autonomico', 'sobrecarga_hepatica'],
    assignRule: 'Usuarios que ya dominan hidratacion_matutina básica (500 ml) y buscan protocolo Ayurveda avanzado. Ideal para constipación crónica, digestión perezosa, ritmo intestinal descoordinado. NO empezar aquí — progresar desde 500 ml.',
    priority: 2,
    family: 'hidratacion_matutina',
    timeOfDay: 'morning',
    evidenceLevel: 'N3',
    requiresClinicalValidation: true,

    epigeneticImpact: {
      activates: [
        'peristalsis colónica matutina (reflejo gastro-cólico amplificado)',
        'motilidad biliar y vesicular',
        'flujo linfático matutino (bomba muscular + hidratación intersticial)',
        'filtración glomerular basal',
        'CAR (cortisol awakening response) modulado por volumen',
        'sistema nervioso entérico',
      ],
      inhibits: [
        'estasis intestinal nocturna',
        'concentración de metabolitos urinarios matutinos',
        'reabsorción excesiva de toxinas colónicas',
      ],
      modulates: [
        'motilidad intestinal (regularidad evacuaciones)',
        'osmolaridad plasmática matutina',
        'volumen plasmático (expansión gradual)',
        'ritmo circadiano digestivo',
      ],
      biomarkers: [
        'gravedad_especifica_orina_matutina',
        'frecuencia_evacuaciones_semanal',
        'tiempo_transito_intestinal',
        'osmolaridad_plasmatica',
      ],
      mechanismSummary: 'La ingesta de gran volumen de agua tibia al despertar en ayunas dispara el reflejo gastro-cólico masivo, hidrata el bolo fecal formado durante la noche, lava metabolitos nocturnos y activa la peristalsis coordinada · práctica Ayurveda Ushapan (uṣāpāna) documentada desde Charaka Samhita como reset matutino del sistema Vata.',
    },

    sideEffects: [
      'plenitud_gastrica_transitoria',
      'urgencia_urinaria_primeras_2h',
      'urgencia_evacuatoria_dentro_de_30_min',
      'nausea_leve_si_ingesta_muy_rapida',
      'hipoosmolaridad_transitoria_si_sin_electrolitos_en_calor',
    ],

    contraindications: [
      'hiponatremia_conocida',
      'siadh_sindrome_secrecion_inadecuada_adh',
      'insuficiencia_renal_moderada_a_severa',
      'cardiopatia_descompensada_o_ic_severa',
      'gastroparesia_severa',
      'obstruccion_intestinal_activa',
      'reflujo_severo_no_controlado',
      'primer_trimestre_embarazo_con_hiperemesis',
    ],

    recommendationRules: {
      boostIf: [
        { source: 'dx_level', system: 'digestion', operator: '<=', value: 3 },
        { source: 'quiz', questionnaire: 'digestivo', score: 'high' },
        { source: 'profile', field: 'domina_hidratacion_matutina_basica', equals: true },
        { source: 'profile', field: 'constipacion_cronica', equals: true },
      ],
      excludeIf: [
        { source: 'profile', field: 'condiciones', in: ['hiponatremia', 'siadh', 'insuficiencia_renal', 'insuficiencia_cardiaca_descompensada', 'gastroparesia', 'obstruccion_intestinal'] },
        { source: 'profile', field: 'primer_trimestre_embarazo_hiperemesis', equals: true },
      ],
      boostWeight: 2,
    },

    sources: [
      {
        citation: 'Charaka Samhita · Sutra Sthana · Ushapan (uṣāpāna) · protocolo hidratación matutina tibia parte de Dinacharya para reset del sistema Vata',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Ashtanga Hridayam · Vagbhata · descripción detallada de Ushapan como práctica de purificación matutina · dosis 8 anjali (~1-1.5 L)',
        paradigm: 'ayurveda',
      },
      {
        citation: 'Sasaki Y et al. "Effect of water intake on colonic motility in humans" J Gastroenterol 2013 · water bolus estimula reflejo gastro-cólico',
        paradigm: 'western_academic',
      },
      {
        citation: 'Popkin BM et al. "Water, hydration, and health" Nutr Rev 2010 · fisiología general de hidratación',
        paradigm: 'western_academic',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20646222/',
      },
      {
        citation: 'Tradición yóguica · Jala Neti + Ushapan como Kriyas matutinos · Hatha Yoga Pradipika (siglo XV)',
        paradigm: 'traditional_documented',
      },
      {
        citation: 'MTC · principio de "beber agua tibia matutina" para tonificar Bazo/Estómago · Nei Jing Su Wen · práctica milenaria',
        paradigm: 'tcm',
      },
    ],
  },
];

// ── Índices de acceso ────────────────────────────────────────────────────────

export const INTERVENTION_BY_KEY: Record<string, Intervention> =
  Object.fromEntries(INTERVENTIONS_CATALOG.map(i => [i.key, i]));

/** Universales garantizados (fallback cuando el DX no arroja raíces o el catálogo es chico). */
export const UNIVERSAL_INTERVENTIONS: Intervention[] =
  INTERVENTIONS_CATALOG.filter(i => i.isUniversal);

/** Intervenciones que requieren validación clínica adicional antes de producción. */
export const CLINICAL_VALIDATION_PENDING: Intervention[] =
  INTERVENTIONS_CATALOG.filter(i => i.requiresClinicalValidation);
