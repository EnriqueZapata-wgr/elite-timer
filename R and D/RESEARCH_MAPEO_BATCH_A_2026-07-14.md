# 🧪 BATCH A · Mapeo epigenético 28 intervenciones · 2026-07-14

**Autor:** Cowork (subagente research Batch A · task #110)
**Base doctrinal:** `R and D/MAPEO_EPIGENETICO_INTERVENCIONES_v1.md`
**Referencia densidad:** `R and D/RESEARCH_MAPEO_PILOTO_2026-07-14.md`
**Schema:** `src/constants/interventions-catalog.ts` (interface Intervention extendida)
**Vocab:** `src/constants/intervention-vocab.ts` (categorías + roots · post-piloto 2026-07-14)
**Estado:** Batch A completo. Requiere OK Enrique + validación clínica Mariana antes de merge al catálogo real.

---

## Reporte ejecutivo

- **Intervenciones mapeadas con ≥3 paradigmas:** 27/28
- **Intervenciones con 2 paradigmas (flag PARADIGMA_AUSENTE):** 1/28
  - `agua_fuera_comidas` · sólo `functional_independent` + `ayurveda` + `mechanistic` — no hay literatura occidental sólida a favor, y hay contra-evidencia (mito de la dilución de HCl) → 2 paradigmas + mechanistic frágil. Flag `PARADIGMA_AUSENTE: western_academic`.
- **Intervenciones flag REVISAR_CON_MARIANA:** 5/28
  1. `bulletproof_coffee` — doctrina Enrique (BPC NO sube insulina, respeta ayuno metabólico) + su `requiresClinicalValidation:true` heredado. Confirmar corte con carbos (>20% cal o >100 g/día = contraindicación) que el catálogo actual ya declara.
  2. `ayuno_20_4_omad` — heredado `requiresClinicalValidation:true`. Ventana 4h es agresiva; en mujeres pre-menopáusicas + adultos mayores + histórico TCA es zona roja.
  3. `oil_pulling_oregano` — 1 gota de aceite esencial de orégano es 3-5 mg de carvacrol/timol; tragar accidentalmente es hepatotóxico a dosis repetidas. Ciclado 4-on/3-off es la única barrera. Definir corte de embarazo, hepatopatía, mucosa oral rota.
  4. `ayuno_16_8` en mujeres pre-menopáusicas — cyclesynced protocol (folicular OK, lútea reducir a 12-14h). ¿Motor recomienda cycle-aware o versión unificada?
  5. `agua_fuera_comidas` — evidencia occidental débil / contradictoria. ¿Mantenemos con caveat o degradamos a P3 "opcional exploratorio"?

- **Contradicciones entre paradigmas encontradas (paradigmConflict):**
  1. **Agua durante las comidas** · Ayurveda dice "sí, tibia, poco" para digestión; Kresser + funcional occidental dice "fuera de comida" para preservar HCl; RCTs occidentales muestran que agua modesta NO diluye HCl significativamente (Gaddey 2015). Resolución operativa: `agua_fuera_comidas` es preferencia funcional + tradicional, no mandato occidental.
  2. **Postura defecar** · Sikirov 2003 sólida (n=28, 51s vs 130s), pero UEG 2019 review discute que el beneficio en constipación funcional real es modesto. No paradigmConflict fuerte; sí matiz de dosis-respuesta.
  3. **Ayuno lútea** · Fasting community mainstream (Fung, Gundry) minimiza importancia de fase; Stacy Sims + Mindy Pelz + literatura hormonal (Hormone Research 2020) sostienen que lútea + ayuno agresivo eleva cortisol y suprime progesterona. Resolución: reducir ventana a 12-14h en lútea; folicular puede ser 16:8.
  4. **BPC "rompe ayuno"** · Doctrina occidental estricta (cero calorías = ayuno) vs doctrina metabólica (fasting = mínima insulina). Enrique + literatura MCT (BeKeto 2023, Berg) alineados con doctrina metabólica: BPC mantiene el ayuno metabólico (cetosis, autofagia parcial, mínima insulina).
  5. **Blackout total en niños** · Adultos: near-zero lux óptimo (Cho 2015, Xiao 2022); pediátrico: hay grupo argumentando que blackout absoluto en <3 años puede empeorar despertar autónomo (Nagare 2019 debate). No aplicable a nuestro target adulto.
  6. **Physiological sigh vs box breathing** · Balban 2023 mostró que physiological sigh > box breathing 4-4-4-4 > coherencia cardíaca en reducción de arousal AGUDA. Pero en beneficio SOSTENIDO (semanas), coherencia cardíaca / HRV biofeedback lidera. Contexto define.

- **Biomarcadores nuevos propuestos (PROPUESTA_NUEVO_BIOMARCADOR):**
  - `lactato_1h_postprandial` (para caminata post-comida · marker respuesta oxidativa muscular). Sistema Metabólico o Mitocondrial.
  - `cetonas_beta_hidroxibutirato_serica` (para BPC y ayunos ≥16h · marker cetosis). Sistema Mitocondrial / Metabólico.
  - `LBP_lipopolysaccharide_binding_protein` (para masticación >20 · marker endotoxemia post-comida por digestión pobre). Sistema Digestivo/Microbioma.
  - `TMAO_trimetilamina_N_oxido` (para ayunos + salud digestiva · marker fermentación anómala). Sistema Digestivo.
  - `melatonina_urinaria_6-sulfatoxi` (para blackout, antifaz, pantallas off · marker excreción melatonina). Sistema Circadiano.
  - `alfa_MSH_hormona_estimulante_melanocitos` (para exposición solar matutina). Sistema Hormonal / Piel.
  - `pAkt/mTOR_muscular_ratio` (para caminata + BPC en cetosis · anti-hipertrofia matiz). Sistema Metabólico.

- **Categorías/roots nuevos propuestos al vocab:**
  - No se requieren categorías nuevas en Batch A · las 19 categorías vigentes (post-piloto 2026-07-14) cubren todo.
  - Root propuesto: `deshidratacion_cronica` (para hidratación matutina · marker específico distinto de "cortisol_matutino_bajo").
  - Root propuesto: `mucus_estasis_matutino` (aplica a hidratación + agua tibia AM · congestión bronquial funcional). Opcional.
  - Root propuesto: `masticación_deficiente_prisa` (para masticar_mas_20 + agua_fuera_comidas · patrón conductual más que fisiológico). Opcional.

---

## Nota de método (Batch A)

- Los **7 primeros** (P1 universales) ya estaban mapeados narrativamente en `MAPEO_EPIGENETICO_INTERVENCIONES_v1.md` sección 3. Aquí los porto al schema completo del catálogo con **todos los campos existentes preservados** (key, name, how, benefit, categories, roots, assignRule, priority, isUniversal, circadian, timeOfDay, family, scientificInfo si aplica) + los 6 campos nuevos (evidenceLevel, epigeneticImpact, sideEffects, contraindications, recommendationRules, sources).
- Los **21 restantes** son mapeo nuevo desde cero.
- Notas tangenciales ricas → `research_notes_extra_batch_A.md`.

---

## 1 · `hidratacion_matutina` · Hidratación matutina 500 ml

```ts
{
  key: 'hidratacion_matutina',
  name: 'Hidratación matutina 500 ml',
  how: 'Bebe 500 ml de agua natural al despertar (opcional pizca de sal de mar Celtic/Himalaya + gotas de limón), antes de café o comida. Idealmente tibia en frío ambiental o clima frío; a temperatura ambiente en clima cálido.',
  benefit: 'Rehidrata tras el ayuno nocturno de 6-9h, activa peristalsis colónica (reflejo gastrocólico matutino), moviliza cortisol matutino sano y reduce viscosidad sanguínea del pico 6-9am.',
  categories: ['hidratacion', 'digestion', 'circadiano', 'energia'],
  roots: ['cortisol_matutino_bajo', 'ritmo_circadiano_desregulado', 'digestion_estres_autonomico'], // PROPUESTA_NUEVO_ROOT: 'deshidratacion_cronica'
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
}
```

---

## 2 · `exposicion_solar_matutina` · Exposición solar matutina (Fitzpatrick)

```ts
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
      'melatonina_urinaria_6-sulfatoxi', // PROPUESTA_NUEVO_BIOMARCADOR
      'serotonina_plaquetaria (proxy)',
      'sueño profundo % (por wearable)',
      'alfa_MSH_hormona_estimulante_melanocitos', // PROPUESTA_NUEVO_BIOMARCADOR
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
    'medicamentos_fotosensibilizantes_activos', // tetraciclinas, retinoides orales, amiodarona, tiazidas, sulfonamidas
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
}
```

---

## 3 · `recordatorio_dormir` · Hora de dormir

```ts
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
      'melatonina_urinaria_6-sulfatoxi', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 4 · `recordatorio_comer` · Ventana de alimentación

```ts
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
}
```

---

## 5 · `apagar_pantallas_noche` · Pantallas off 30 min antes de dormir

```ts
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
      'melatonina_urinaria_6-sulfatoxi', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 6 · `grounding_earthing` · Grounding 10-15 min

```ts
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
}
```

---

## 7 · `respiracion_nocturna` · Respiración nocturna en cama

```ts
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
}
```

---

## 8 · `cerrar_comida_3h_antes_dormir` · Cerrar comida 3h antes de dormir

```ts
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
}
```

---

## 9 · `pantallas_off_60min` · Pantallas off 60 min antes de dormir

```ts
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
      'melatonina_urinaria_6-sulfatoxi', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 10 · `pantallas_off_90min` · Pantallas off 90 min antes de dormir

```ts
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
}
```

---

## 11 · `blackout_total_cuarto` · Blackout total del cuarto

```ts
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
}
```

---

## 12 · `antifaz_nocturno` · Antifaz nocturno

```ts
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
}
```

---

## 13 · `temperatura_cuarto_frio` · Cuarto a 16-19°C

```ts
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
}
```

---

## 14 · `ayuno_14_10` · Ayuno 14:10 (suave)

```ts
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
}
```

---

## 15 · `ayuno_16_8` · Ayuno 16:8 con carbos densos en cena

```ts
{
  key: 'ayuno_16_8',
  name: 'Ayuno 16:8 con carbos densos en cena',
  how: 'Ventana de comida 12:00-20:00 (8h). Cena con carbos densos (papa, camote, arroz, plátano macho) 3h antes de dormir. Ayuno 16h con agua, té, café solo, caldo de hueso 0-cal.',
  benefit: 'Regula insulina diurna, activa autofagia moderada vía AMPK/SIRT1, mejora sueño profundo (serotonina→melatonina de carbos nocturnos) y baja cortisol matutino inapropiado.',
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
      'cetonas_beta_hidroxibutirato_serica', // PROPUESTA_NUEVO_BIOMARCADOR
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
    ],
    excludeIf: [
      { source: 'profile', field: 'embarazo', equals: true },
      { source: 'profile', field: 'lactancia', equals: true },
      { source: 'profile', field: 'trastorno_alimentario_activo', equals: true },
      { source: 'profile', field: 'diabetes_tipo', equals: 1 },
      { source: 'cycle_phase', phase: 'luteal' }, // Reducir a 14:10 en lútea si mujer pre-menopáusica
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
}
```

---

## 16 · `ayuno_18_6` · Ayuno 18:6 (agresivo)

```ts
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
}
```

---

## 17 · `ayuno_20_4_omad` · Ayuno 20:4 / OMAD

⚠️ **REVISAR_CON_MARIANA:** heredado `requiresClinicalValidation: true`. Ventana 4h (one meal a day) es zona roja para mujeres pre-menopáusicas, adulto mayor con sarcopenia, y cualquier antecedente TCA. Mapeo completo para decisión de si se mantiene en catálogo público o migra a "modalidad clínica supervisada".

```ts
{
  key: 'ayuno_20_4_omad',
  name: 'Ayuno 20:4 / OMAD (One Meal A Day)',
  how: 'Ventana de comida de 4h (o una única comida abundante en 1h · OMAD estricto). Sólo con supervisión clínica activa. Comida debe ser densa nutricionalmente: 30-50g proteína, grasas saludables, verduras densas, carbos densos si atleta. Agua, té, café solo, caldo de hueso 0-cal en ventana de ayuno.',
  benefit: 'Máxima presión metabólica sostenida, autofagia profunda + mitofagia, elevación cetónica sostenida 1-3 mM, FGF21 marcado, IGF-1 reducido (pro-longevidad).',
  categories: ['metabolismo', 'inflamacion', 'mitocondrial'],
  roots: ['hiperinsulinemia', 'resistencia_insulina', 'inflamacion_silenciosa', 'sobrecarga_hepatica', 'disfuncion_mitocondrial'],
  assignRule: 'Sólo con supervisión clínica activa. Adulto muy avanzado en ayuno, hombre metabólicamente sano con objetivo composición corporal / longevidad, tolerancia demostrada a 18:6.',
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
      { source: 'profile', field: 'tolerancia_18_6_meses', operator: '>=', value: 3 },
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
      { source: 'profile', field: 'edad', operator: '>=', value: 65 },
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
}
```

---

## 18 · `caminata_postprandial` · Caminata post-comida 10 min

```ts
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
      'lactato_1h_postprandial', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 19 · `bulletproof_coffee` · Bulletproof coffee

⚠️ **REVISAR_CON_MARIANA:** doctrina Enrique (BPC NO sube insulina, respeta ayuno metabólico) confirmada en el catálogo actual. Mapeo respeta esta doctrina: NO añado el caveat occidental clásico "rompe ayuno". Sí flag: contraindicación real es combinar con dieta alta en carbos (>20% cal o >100 g/día). `requiresClinicalValidation: true` heredado.

```ts
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
  scientificInfo: 'Doctrina Enrique 2026-07-11: TG suben por carbohidratos no por grasa dietética. Flag correcto es dieta alta en carbos, no perfil lipídico.',
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
      { source: 'profile', field: 'carbos_gramos_dia', operator: '>=', value: 100 },
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
}
```

---

## 20 · `masticar_mas_20` · Masticar >20 veces por bocado

```ts
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
      'LBP_lipopolysaccharide_binding_protein', // PROPUESTA_NUEVO_BIOMARCADOR (endotoxemia)
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
}
```

---

## 21 · `agua_fuera_comidas` · Agua fuera de las comidas

⚠️ **REVISAR_CON_MARIANA:** literatura occidental es débil / contradictoria (el mito de "agua diluye HCl" está debunkeado por Gaddey 2015). Base es Ayurveda + funcional (Kresser). Flag PARADIGMA_AUSENTE: western_academic. ¿Se degrada a P3 opcional exploratorio o se mantiene como práctica funcional con caveat?

```ts
{
  key: 'agua_fuera_comidas',
  name: 'Agua fuera de las comidas',
  how: 'No tomar líquidos 20 min antes ni 30-60 min después de las comidas. Sorbos pequeños (≤100 ml) tibios durante si necesario. Fuera de comidas: hidratación libre (2-3 L/día).',
  benefit: 'Preserva HCl gástrico y enzimas digestivas, mejora absorción de nutrientes y reduce distensión postprandial en digestión funcionalmente débil.',
  categories: ['digestion', 'hidratacion', 'ritual'],
  roots: ['digestion_estres_autonomico', 'reflujo_funcional', 'disbiosis'],
  assignRule: 'Reflujo funcional, distensión postprandial marcada, digestión débil (Bazo-Estómago débil en MTC · Vata/Kapha en Ayurveda), sospecha hipoclorhidria funcional, SIBO.',
  priority: 3,
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
}
```

---

## 22 · `oil_pulling_coco` · Oil pulling con aceite de coco

```ts
{
  key: 'oil_pulling_coco',
  name: 'Oil pulling con aceite de coco',
  how: '15-20 ml (1 cucharada) de aceite de coco virgen extra sólido o líquido, enjuagar 10-15 min en boca (sin tragar, movimientos suaves), escupir en basura (NO drenaje · obstruye), enjuagar boca con agua tibia + sal, cepillar.',
  benefit: 'Reduce carga bacteriana bucal (especialmente Streptococcus mutans y Lactobacillus), mejora salud gingival, reduce placa dental, "detox" oral tradicional (Kavala/Gandusha Ayurveda).',
  categories: ['digestion', 'inmunologico', 'ritual'],
  roots: ['disbiosis', 'inflamacion_silenciosa'],
  assignRule: 'Halitosis, gingivitis, disbiosis oral, caries recurrentes, sensibilidad dental funcional, orientación de higiene oral holística. Puede ser diario.',
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
      { source: 'profile', field: 'edad', operator: '<', value: 5 },
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
}
```

---

## 23 · `oil_pulling_oregano` · Oil pulling con aceite de coco + orégano

⚠️ **REVISAR_CON_MARIANA:** 1 gota (~30-50 mg) de aceite esencial de orégano contiene 3-5 mg de carvacrol/timol. Tragar accidentalmente + repetido = riesgo hepatotóxico documentado en cápsulas orales de orégano concentrado. Ciclado 4-on/3-off es la única barrera. Definir corte de embarazo, hepatopatía, mucosa oral rota.

```ts
{
  key: 'oil_pulling_oregano',
  name: 'Oil pulling con aceite de coco + orégano',
  how: '15-20 ml de aceite de coco + 1 gota (SOLO 1) de aceite esencial de orégano puro (Origanum vulgare, mínimo 70% carvacrol). Revolver bien antes de meter en boca (mezclar aceites), enjuagar 10-15 min, escupir en basura (NUNCA drenaje), enjuagar boca con agua tibia + sal. Ciclado 4 días on / 3 días off.',
  benefit: 'Más antimicrobiano que aceite solo por acción del carvacrol y timol del orégano. Útil en disbiosis oral moderada-severa, biofilms resistentes, halitosis persistente.',
  categories: ['digestion', 'inmunologico', 'ritual'],
  roots: ['disbiosis', 'inflamacion_silenciosa'],
  assignRule: 'Disbiosis oral moderada-severa que no responde a oil pulling simple. Ciclado 4 on / 3 off (no diario · potencia del carvacrol). Bajo criterio.',
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
      { source: 'profile', field: 'edad', operator: '<', value: 12 },
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
}
```

---

## 24 · `postura_cuclillas_defecar` · Postura en cuclillas al defecar

```ts
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
}
```

---

## 25 · `respiracion_478` · Respiración 4-7-8 pre-sueño

```ts
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
}
```

---

## 26 · `physiological_sigh` · Physiological sigh (rescate)

```ts
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
}
```

---

## 27 · `box_breathing_4444` · Box breathing 4-4-4-4

```ts
{
  key: 'box_breathing_4444',
  name: 'Box breathing 4-4-4-4',
  how: 'Inhalar 4 seg por nariz, retener con pulmones llenos 4 seg, exhalar 4 seg por nariz, retener con pulmones vacíos 4 seg. Repetir 5-10 ciclos (~3-5 min). Nivel principiante (día 1). Postura sentada erguida o de pie estable.',
  benefit: 'Regula HRV, entrena tolerancia a CO2, calma+foco simultáneos (protocolo Navy SEALs). Ideal para transición estrés→foco, pre-desempeño, pre-decisión.',
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
}
```

---

## 28 · `box_breathing_5555` · Box breathing 5-5-5-5

```ts
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
      { source: 'profile', field: 'tolerancia_4444_semanas', operator: '>=', value: 2 },
      { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
      { source: 'quiz', questionnaire: 'foco_cognitivo', score: 'low' },
      { source: 'lab', marker: 'HRV_RMSSD_ms', operator: '<', value: 40 },
    ],
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['epoc_severa_no_controlada', 'panico_activo_no_tratado', 'hipertension_maligna_no_controlada'] },
      { source: 'profile', field: 'tolerancia_4444_semanas', operator: '<', value: 1 },
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
}
```

---

## Notas de cierre del batch A

- **Total intervenciones mapeadas:** 28/28 (7 P1 canónicos portados + 21 nuevas)
- **Densidad promedio:** ~8 citas verificables por intervención (listón piloto = 11; este batch en zona sana)
- **Paradigmas cubiertos por intervención (promedio):** 4.6 · SUPERA umbral ≥3 en 27/28
- **Nuevos biomarcadores propuestos:** 7 (lactato 1h postprandial, cetonas BHB sérica, LBP, TMAO, melatonina urinaria 6-sulfatoxi, α-MSH, pAkt/mTOR ratio)
- **Contradicciones documentadas (paradigmConflict):** 8+ (agua durante comidas, ayuno lútea, BPC "rompe ayuno", grounding funding bias, cold plunge post-fuerza, Ray Peat vs Longo carbos nocturnos, OMAD Longo vs Fung, Masterjohn 18:6+)
- **Intervenciones flag REVISAR_CON_MARIANA:** 5 (bulletproof_coffee, ayuno_20_4_omad, oil_pulling_oregano, ayuno_16_8 cycle-aware, agua_fuera_comidas)
- **PARADIGMA_AUSENTE:** 1 (agua_fuera_comidas · western_academic)
- **Nuevos roots propuestos:** 3 opcionales (deshidratacion_cronica, mucus_estasis_matutino, masticación_deficiente_prisa)

Ver `research_notes_extra_batch_A.md` para info tangencial rica: historia de la hidroterapia matutina Ushapan, controversias funding grounding, doctrina Ray Peat vs cetogénico, protocolos cycle-syncing femenino, Fletcherism histórico, Kavala vs Gandusha en Ayurveda, protocolo Buteyko soviético, y más.







