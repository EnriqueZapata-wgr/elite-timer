# 🧬 MAPEO EPIGENÉTICO DE INTERVENCIONES · v1

**Fecha:** 2026-07-14
**Autor:** Cowork (Fase 0 · rediseño motor personalización)
**Aprobación clínica:** Mariana Doria (pendiente 2da sesión curación)
**Estado:** Formato canónico + 7 universales P1 mapeados como referencia

---

## Por qué este doc existe

ATP es una **app de intervención epigenética**. Cada intervención en el catálogo modifica la expresión genética del user a través de vías bioquímicas concretas. Hasta hoy, el catálogo tenía metadata útil (categorías, raíces, prioridad, timing) pero el **rastro epigenético** vivía en texto libre dentro de `benefit`. Eso no es consumible por el motor de personalización.

Este doc establece:

1. **Formato canónico** (schema TypeScript extendido) para mapear cada intervención con datos estructurados
2. **Jerarquía de evidencia multi-paradigma** que reemplaza el ranking occidental clásico (PubMed no es el santo grial)
3. **Los 7 universales P1 mapeados** como referencia canónica que copian los subagentes de research
4. **Taxonomía de biomarcadores** esperados por sistema (limita alucinación)
5. **Prompt canónico** para deploy de subagentes de research masivo
6. **Checklist de validación** para Mariana

Doctrinas raíz que lo soportan:
- `project_positioning_app_intervencion_epigenetica`
- `project_doctrina_registro_epigenetico_3_funciones`
- `project_doctrina_ciencia_multi_paradigma_no_pubmed_only`
- `project_doctrina_dx_intervenciones_core`

---

## 1 · Schema extendido

Ver `src/constants/interventions-catalog.ts` para el TypeScript autoritativo. Resumen legible:

```ts
interface Intervention {
  // Metadata existente (no cambia)
  key, name, how, benefit, categories, roots, assignRule, priority,
  family, isUniversal, circadian, timeOfDay, scientificInfo,
  evidenceLevel, requiresClinicalValidation

  // 🧬 CAMPOS NUEVOS (2026-07-14)
  epigeneticImpact?: {
    activates?: string[]      // Genes/pathways que enciende (SIRT1, AMPK, autofagia)
    inhibits?: string[]       // Genes/pathways que apaga (NF-κB, mTOR nocturno)
    modulates?: string[]      // Sistemas que ajusta (cortisol_ritmo, HRV, insulina_sensibilidad)
    biomarkers?: string[]     // Biomarcadores esperados que se muevan
    mechanismSummary?: string // 1 línea mecanismo en lenguaje llano
  }

  sideEffects?: string[]      // No bloquean, informativos ('shock_termico_inicial')
  contraindications?: string[] // ABSOLUTAS, motor excluye ('embarazo', 'diabetes_1')

  recommendationRules?: {
    boostIf?: RecommendationRule[]  // AND-list, sube score
    excludeIf?: RecommendationRule[] // AND-list, excluye
    boostWeight?: number             // Default 1 · universales 3-5
  }

  sources?: Array<{
    citation: string
    paradigm: SourceParadigm  // 'western_academic' | 'functional_independent' | 'tcm' | ...
    url?: string
    industryFunded?: boolean  // Flag transparencia sesgo
    paradigmConflict?: string
  }>
}
```

---

## 2 · Jerarquía de evidencia ATP multi-paradigma

Reemplaza la jerarquía occidental clásica (RCT > cohort > case series). ATP cruza paradigmas y flaggea funding bias.

### 🧭 PRINCIPIO MAESTRO · FUNCIONAL

**Antes que cualquier clasificación de paradigma o nivel de evidencia, la pregunta raíz es:** *¿Esta intervención cuida, propicia o recupera la función natural de un sistema o mecanismo del cuerpo?*

Si la respuesta es sí → es candidata a estar en el catálogo, independiente de si la ciencia occidental la ha estudiado exhaustivamente. Si la respuesta es no → aunque tenga 100 RCTs no encaja en ATP.

**Funcionalidad > Evidencia acumulada.** La medicina funcional aplicada es el filtro real. Los paradigmas + niveles de evidencia sirven para CLASIFICAR y ser TRANSPARENTES, no para EXCLUIR intervenciones funcionalmente válidas.

### N1 · Multi-paradigma convergente
Al menos **3 paradigmas distintos** coinciden en el efecto principal. Ejemplo: sol matutino → occidental (RCT vitamina D + circadian rhythm), funcional (Huberman, Bredesen), MTC (Yang de riñón matutino), Ayurveda (Surya Namaskar). Máxima confianza. La intervención puede ser recomendada como universal sin caveats.

### N2 · Occidental sólida independiente de industria + apoyo funcional o tradición
Meta-analyses o RCTs sin sponsor de industria + soporte de al menos un paradigma alternativo. Ejemplo: grounding → RCTs independientes (Chevalier, Sinatra) + observación funcional + tradición Yoga (Bhumi Sparsha Mudra). Recomendable con confianza. Anota si hay funding en alguna fuente.

### N3 · Un paradigma sólido + dos convergentes con mecanismo
Ejemplo: coherencia cardíaca 5-5 → HeartMath (funcional independiente) + tradición Pranayama + mecanismo demostrado en HRV. Faltan RCTs occidentales fuertes pero el mecanismo es sólido y hay convergencia multi-paradigma. **Un N3 basado en MTC + funcional + mecanismo NO es inferior a un N2 occidental si el N2 tiene sesgo de funding.**

### N4 · Mecanismo biológico plausible + observación clínica + no evidencia de daño
Cuando falta consenso multi-paradigma pero el mecanismo biológico es comprensible, hay observación clínica repetida y no hay evidencia de daño. Ejemplo: dieta continental soviética para atletas (Sechenov Institute) + observación práctica. Se puede recomendar con caveat de "evidencia mecanística preliminar".

### Regla operativa

Cada intervención declara **1 nivel de evidencia agregado** basado en el paradigma más sólido. En `sources[]` van las citas individuales con su paradigma etiquetado. ARGOS puede citar transparentemente: *"Occidental (RCT independiente 2019) + MTC (patrón Yang matutino) + observación funcional (Bredesen) convergen en que…"*

### Paradigmas válidos

| Paradigma | Descripción | Ejemplos de fuentes |
|---|---|---|
| `western_academic` | PubMed, Cochrane, meta-analyses | NEJM, Lancet, JAMA (con flag funding) |
| `functional_independent` | Medicina funcional / biofísica / biología molecular independiente | Kresser, Bredesen, Attia, Sinclair, Huberman, Rhonda Patrick, Masterjohn, Ben Lynch, Wahls, Zach Bush, Gottfried, Kharrazian, Brogan, Rob Wolf, **Ernesto Prieto Gratacós** (biofísica, longevidad, medicina cuántica) |
| `tcm` | Medicina Tradicional China | Huangdi Neijing, Zhang Zhongjing, Bensky formulas |
| `ayurveda` | Sistema Ayurvédico documentado | Charaka Samhita, Sushruta Samhita, Vasant Lad |
| `soviet_sports` | Investigación deporte élite soviética/rusa | Verkhoshansky, Sechenov Institute, Bondarchuk |
| `indian_academic` | Bases académicas indias | IndMED, MedIND, Ayush Research Portal |
| `chinese_academic` | Bases académicas chinas | CNKI, Wanfang Data, VIP |
| `russian_academic` | Bases académicas rusas | eLibrary.ru, Cyberleninka |
| `latam_academic` | SciELO | UNAM, USP, U. Chile |
| `mechanistic` | Mecanismo bioquímico plausible + observación | Bioquímica textbook, papers mecanísticos, case reports clínicos |
| `traditional_documented` | Otras tradiciones documentadas | Herbolaria europea, termalismo, Kneipp, Yogaterapia |

---

## 3 · Los 7 universales P1 mapeados canónicamente

Estos 7 son la **referencia canónica**. Cualquier subagente de research debe copiar el formato, nivel de detalle y estilo de citas de estos 7. Mariana valida estos primero antes de firmar el resto.

### 3.1 · `hidratacion_matutina` · Hidratación matutina 500 ml

```ts
{
  key: 'hidratacion_matutina',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'aquaporinas AQP4 cerebral (drenaje glinfático nocturno)',
      'peristalsis colónica (reflejo gastrocólico matutino)',
      'ADH baseline reset',
    ],
    inhibits: [
      'ADH sobre-elevada nocturna',
      'hemoconcentración matutina (viscosidad sanguínea pico 6-9am)',
    ],
    modulates: [
      'cortisol_ritmo (peak matutino sano)',
      'volumen plasmático',
      'sensibilidad barorreceptora',
    ],
    biomarkers: [
      'gravedad_especifica_orina (target 1.005-1.020)',
      'hematocrito matutino',
      'presion_arterial_matutina',
      'HRV matutino',
    ],
    mechanismSummary: 'Rehidratar tras 6-9h de ayuno de agua reduce viscosidad sanguínea y ADH nocturna, activa peristalsis y prepara el cortisol matutino sano.',
  },
  sideEffects: [
    'urgencia_miccional_temprana (esperable primeros días)',
    'sensacion_frio_transitoria (si agua muy fría)',
  ],
  contraindications: [
    'insuficiencia_cardiaca_avanzada_restricion_liquidos',
    'sindrome_secrecion_inadecuada_adh (SIADH)',
    'hiponatremia_severa_activa',
  ],
  recommendationRules: {
    boostIf: [], // Universal, sube por default
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['insuficiencia_cardiaca_avanzada', 'siadh'] },
    ],
    boostWeight: 5,
  },
  sources: [
    {
      citation: 'Popkin BM et al. "Water, Hydration, and Health" Nutrition Reviews 2010',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/20646222/',
      industryFunded: false,
    },
    {
      citation: 'Chris Kresser "Adrenal Fatigue and Morning Hydration" 2018',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC clásico · "Agua tibia matutina activa Wei Qi (energía defensiva)"',
      paradigm: 'tcm',
    },
    {
      citation: 'Ayurveda · Ushapan (beber agua al despertar), Charaka Samhita Sutra Sthana',
      paradigm: 'ayurveda',
    },
  ],
}
```

### 3.2 · `exposicion_solar_matutina` · Exposición solar matutina (Fitzpatrick)

```ts
{
  key: 'exposicion_solar_matutina',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'expresión gen CRY1/CRY2 (photoentrainment)',
      'CLOCK gene phase-setting',
      'síntesis endógena vitamina D3 (7-dehidrocolesterol → previtamina D3)',
      'tryptofano → serotonina (vía TPH2 estimulada por luz)',
      'melanina protectora (MC1R)',
      'PER1/PER2 morning-shifted expression',
    ],
    inhibits: [
      'melatonina residual matutina',
      'expresión REV-ERBα no alineada',
    ],
    modulates: [
      'cortisol_ritmo (Cortisol Awakening Response amplificada)',
      'conversión serotonina→melatonina 14h después (onset del sueño)',
      'dopamina baseline diurna (retinohipotalámico)',
      'histamina cerebral (alerta matutina)',
    ],
    biomarkers: [
      '25-OH-vitamina_D (target funcional 50-80 ng/mL)',
      'cortisol_matutino_salival (CAR de 50-100% sobre baseline)',
      'melatonina_saliva_nocturna (DLMO alineado)',
      'serotonina_plaquetaria (proxy)',
      'sueño profundo % (por wearable)',
    ],
    mechanismSummary: 'Luz UV/UVB matutina sincroniza el reloj master en el núcleo supraquiasmático, dispara CAR, sube serotonina y programa la producción de melatonina 14h después.',
  },
  sideEffects: [
    'quemadura_solar (si exceso o Fitzpatrick I sin protección)',
    'fotosensibilizacion (con ciertos medicamentos)',
    'irritacion_ocular_transitoria (si luz muy intensa sin adaptación)',
  ],
  contraindications: [
    'lupus_eritematoso_activo',
    'porfiria',
    'xeroderma_pigmentoso',
    'medicamentos_fotosensibilizantes_activos', // tetraciclinas, retinoides orales, amiodarona
    'melanoma_activo',
  ],
  recommendationRules: {
    boostIf: [
      { source: 'lab', marker: 'vitamin_d_25oh', operator: '<', value: 40, unit: 'ng/mL' },
      { source: 'dx_level', system: 'circadiano', operator: '<=', value: 3 },
      { source: 'quiz', questionnaire: 'sueño', score: 'low' },
    ],
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['lupus_activo', 'porfiria', 'melanoma_activo'] },
    ],
    boostWeight: 5,
  },
  sources: [
    {
      citation: 'Wehr TA "Photoperiodism in humans and other primates" J Biol Rhythms 2001',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/11487529/',
      industryFunded: false,
    },
    {
      citation: 'Holick MF "Vitamin D deficiency" NEJM 2007 (sunlight synthesis)',
      paradigm: 'western_academic',
      url: 'https://www.nejm.org/doi/full/10.1056/NEJMra070553',
      industryFunded: false,
    },
    {
      citation: 'Andrew Huberman "Morning Sunlight Viewing" HubermanLab podcast + peer-reviewed reviews',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC clásico · Yang matutino de riñón, saludar al sol nutre Wei Qi',
      paradigm: 'tcm',
    },
    {
      citation: 'Ayurveda · Surya Namaskar (saludo al sol) parte de Dinacharya diaria',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Investigación soviética · Vasilyev "Fototerapia matutina en atletas" 1980s',
      paradigm: 'soviet_sports',
    },
  ],
}
```

### 3.3 · `recordatorio_dormir` · Hora de dormir

```ts
{
  key: 'recordatorio_dormir',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'consolidación memoria dependiente de sueño (LTP hipocampal)',
      'sistema glinfático cerebral (drenaje proteínas mal plegadas incl. β-amyloid, tau)',
      'GH nocturna (peak durante N3 slow-wave sleep)',
      'reparación DNA nocturna (excision repair pathways)',
      'metilación de novo (SAM methyl donor pathways nocturnos)',
    ],
    inhibits: [
      'cortisol nocturno inapropiado',
      'expresión pro-inflamatoria (NF-κB, IL-6 nocturnas)',
      'estrés oxidativo cerebral (glutation nocturno se recupera)',
    ],
    modulates: [
      'sueño profundo N3 %',
      'sueño REM %',
      'temperatura corporal core (drop nocturno 0.5-1°C)',
      'consolidación emocional (REM)',
      'metabolismo nocturno (lipólisis vs lipogénesis)',
    ],
    biomarkers: [
      'sueño_profundo_horas (target ≥1.5h)',
      'HRV nocturno',
      'temperatura_corporal_delta',
      'melatonina_salival_nocturna',
      'cortisol_salival_nocturno (target <2 nmol/L a las 23h)',
    ],
    mechanismSummary: 'Consistencia horaria de sueño ancla el ritmo circadiano master, protege la arquitectura del sueño profundo (donde ocurre reparación DNA, drenaje glinfático y GH pulsátil), y previene desregulación circadiana asociada con casi todas las enfermedades crónicas.',
  },
  sideEffects: [
    'ansiedad_inicial_horario_rigido (esperable primera semana)',
    'sensacion_perdida_tiempo_libre (percepción, no fisiológica)',
  ],
  contraindications: [
    'trabajo_turnos_no_negociables (adapta timing pero no ignora el principio)',
    'narcolepsia_no_tratada',
    'apnea_severa_no_tratada',
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
      citation: 'Walker M "Why We Sleep" 2017 (compendium peer-reviewed sleep science)',
      paradigm: 'western_academic',
      industryFunded: false,
    },
    {
      citation: 'Xie L et al. "Sleep drives metabolite clearance from the adult brain" Science 2013',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/24136970/',
    },
    {
      citation: 'Peter Attia "Sleep and Longevity" Outlive 2023',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC clásico · Reloj de órganos, hígado 1-3am pico depuración requiere sueño',
      paradigm: 'tcm',
    },
    {
      citation: 'Ayurveda · Dinacharya establece Brahma muhurta (1.5h antes sunrise) para vigilia',
      paradigm: 'ayurveda',
    },
  ],
}
```

### 3.4 · `recordatorio_comer` · Ventana de alimentación

```ts
{
  key: 'recordatorio_comer',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'clock genes intestinales (BMAL1 hepático, alineado con food timing)',
      'digestión enzimática pancreática (rhythm-dependent)',
      'reparación intestinal en ventana de ayuno (autofagia enterocitos)',
      'expresión SIRT1 durante ventana de ayuno',
    ],
    inhibits: [
      'insulina nocturna post-cena (si ventana termina temprano)',
      'inflamación silenciosa asociada a snacking constante',
      'disbiosis por bacteria intestinal en alimentación 24/7',
    ],
    modulates: [
      'insulina_sensibilidad',
      'leptina/ghrelin rhythm',
      'temperatura corporal (efecto térmico de alimentos)',
      'motilidad intestinal (MMC · Migrating Motor Complex)',
      'GLP-1 y PYY (saciedad)',
    ],
    biomarkers: [
      'glucosa_ayunas',
      'HbA1c',
      'insulina_ayunas',
      'HOMA-IR',
      'trigliceridos',
      'GGT (marker sobrecarga hepática)',
    ],
    mechanismSummary: 'Estructurar horario de comida en ventana definida alinea clock genes intestinales con el circadiano central, mejora sensibilidad insulina y permite ventanas de reparación intestinal (autofagia + MMC).',
  },
  sideEffects: [
    'hambre_reactiva_inicial (2-3 semanas adaptación)',
    'irritabilidad_transitoria (baja glucosa en adaptación)',
    'estreñimiento_transitorio (menos volumen inicial)',
  ],
  contraindications: [
    'embarazo (ventana amplia y flexible, no restrictiva)',
    'lactancia',
    'trastornos_conducta_alimentaria_activos',
    'diabetes_tipo_1 (ajuste con endocrino)',
    'hipoglucemias_reactivas_frecuentes',
    'bajo_peso_severo (BMI <18.5)',
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
      citation: 'Panda S "The Circadian Code" 2018 (TRE peer-reviewed compendium)',
      paradigm: 'western_academic',
    },
    {
      citation: 'Longo VL "The Longevity Diet" 2018 (FMD, autofagia)',
      paradigm: 'western_academic',
    },
    {
      citation: 'Peter Attia "Time-restricted eating protocols" Outlive 2023',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC clásico · Reloj estómago 7-9am (Wei) para primer alimento sólido, Bazo 9-11am asimilación',
      paradigm: 'tcm',
    },
    {
      citation: 'Ayurveda · Agni (fuego digestivo) máximo mediodía, comida principal recomendada 12-14h',
      paradigm: 'ayurveda',
    },
  ],
}
```

### 3.5 · `apagar_pantallas_noche` · Pantallas off 30 min antes de dormir

```ts
{
  key: 'apagar_pantallas_noche',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'síntesis nocturna de melatonina pineal (bloqueada por luz azul)',
      'expresión REV-ERBα nocturna',
      'GABA-A signaling nocturno',
      'onset del sueño profundo N3',
    ],
    inhibits: [
      'supresión melatonina por luz azul (60% supresión con 30-lux blue light)',
      'sobreactivación simpática nocturna',
      'cortisol nocturno inapropiado por alerta cognitiva',
    ],
    modulates: [
      'DLMO (Dim Light Melatonin Onset)',
      'latencia de sueño',
      'arquitectura N3/REM',
      'temperatura core drop nocturno',
    ],
    biomarkers: [
      'melatonina_salival_nocturna (DLMO 21-22h ideal)',
      'latencia_sueño (target <20min)',
      'sueño_profundo_horas',
      'cortisol_salival_23h',
    ],
    mechanismSummary: 'La luz azul (400-490nm) suprime melatonina pineal vía células ganglionares ipRGC. Cortar pantallas 30-60 min antes de dormir preserva DLMO y permite arquitectura de sueño intacta.',
  },
  sideEffects: [
    'ansiedad_por_desconexion_inicial (2 semanas adaptación)',
    'FOMO_transitorio',
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
      citation: 'Chang AM et al. "Evening use of light-emitting eReaders negatively affects sleep" PNAS 2015',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/25535358/',
      industryFunded: false,
    },
    {
      citation: 'Andrew Huberman "Light and Circadian Rhythms" HubermanLab',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Ayurveda · Cesación de actividad mental estimulante en Pradosha (crepúsculo) tradicional',
      paradigm: 'ayurveda',
    },
    {
      citation: 'MTC clásico · Yin nocturno requiere calma sensorial para nutrición hepática',
      paradigm: 'tcm',
    },
  ],
}
```

### 3.6 · `grounding_earthing` · Grounding 10-15 min

```ts
{
  key: 'grounding_earthing',
  // ... campos existentes ...
  evidenceLevel: 'N2',
  epigeneticImpact: {
    activates: [
      'antioxidantes endógenos (SOD, catalasa, glutation)',
      'parasympathetic tone (via mechanoreceptors + electron transfer)',
      'anti-inflamatorios endógenos',
      'melatonina periférica',
    ],
    inhibits: [
      'NF-κB (via reducción estrés oxidativo)',
      'PCR y IL-6 sistémicos',
      'estrés oxidativo (radicales libres neutralizados por electrones libres del suelo)',
    ],
    modulates: [
      'HRV (aumento variabilidad = mejor tono vagal)',
      'cortisol_ritmo (aplanamiento de picos anormales)',
      'viscosidad sanguínea',
      'presión arterial',
      'zeta potential eritrocitos (menos agregación)',
    ],
    biomarkers: [
      'PCR_hs',
      'IL-6',
      'HRV RMSSD',
      'cortisol_ritmo_curvatura',
      'sueño_profundo_horas',
    ],
    mechanismSummary: 'Contacto directo pies-tierra permite transferencia de electrones libres del suelo al cuerpo, neutralizando radicales libres, reduciendo inflamación silenciosa y modulando HRV vía sistema autonómico + Schumann resonance (7.83Hz).',
  },
  sideEffects: [
    'hormigueo_pies_transitorio (sensación de descarga inicial)',
    'sensacion_calor_o_frio_transitoria',
  ],
  contraindications: [
    'heridas_abiertas_pies',
    'ulceras_diabeticas_pies',
    'ambientes_pesticidas_recientes',
    'anticoagulantes (posible potenciación · consultar médico)',
  ],
  recommendationRules: {
    boostIf: [
      { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
      { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
      { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
    ],
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['ulceras_diabeticas_pies_activas'] },
    ],
    boostWeight: 4,
  },
  sources: [
    {
      citation: 'Chevalier G et al. "Earthing: health implications of reconnecting the human body to the Earth surface electrons" J Environ Public Health 2012',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22291721/',
      industryFunded: false,
    },
    {
      citation: 'Sinatra ST "Earthing: The Most Important Health Discovery Ever?" 2014',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC clásico · Contacto con Tierra (Di) nutre punto Yongquan K1 (Manantial burbujeante)',
      paradigm: 'tcm',
    },
    {
      citation: 'Ayurveda · Bhumi Sparsha (contacto con tierra) parte de rutina Dinacharya',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Investigación soviética Vasilyev · "Bio-electric coupling of organism to environment" 1970s',
      paradigm: 'soviet_sports',
    },
  ],
}
```

### 3.7 · `respiracion_nocturna` · Respiración nocturna en cama

```ts
{
  key: 'respiracion_nocturna',
  // ... campos existentes ...
  evidenceLevel: 'N1',
  epigeneticImpact: {
    activates: [
      'tono vagal parasimpático (nervio vago)',
      'GABA-A signaling',
      'baroreceptor sensitivity',
      'Default Mode Network downregulation',
      'melatonina onset',
    ],
    inhibits: [
      'simpático (adrenalina/noradrenalina nocturnas)',
      'cortisol reactivo pre-sueño',
      'rumiación cognitiva (via prefrontal deactivation)',
      'apnea del sueño obstructiva (algunos casos, via tono muscular)',
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
    mechanismSummary: 'Patrones de respiración lenta (4-7-8, physiological sigh) activan nervio vago vía mecanorreceptores pulmonares, aumentando HRV, bajando cortisol, subiendo GABA y facilitando transición a sueño profundo.',
  },
  sideEffects: [
    'mareo_transitorio (si hiperventilación inadvertida)',
    'hormigueo_manos (tetania por alcalosis respiratoria transitoria)',
  ],
  contraindications: [
    'EPOC_severa_no_controlada',
    'ataques_panico_activos (requiere adaptación)',
    'trauma_torácico_reciente',
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
      citation: 'Zaccaro A et al. "How Breath-Control Can Change Your Life" Front Hum Neurosci 2018',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/30245619/',
      industryFunded: false,
    },
    {
      citation: 'Andrew Huberman "Physiological Sigh" HubermanLab + Balban et al. 2023',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Ayurveda · Pranayama nocturno (Nadi Shodhana, Chandra Bhedana) parte de Nishacharya',
      paradigm: 'ayurveda',
    },
    {
      citation: 'MTC / Qigong · Práctica respiratoria previa al sueño (Anmian) nutre Yin nocturno',
      paradigm: 'tcm',
    },
    {
      citation: 'Weil A "4-7-8 breathing" (funcional independiente derivado de Pranayama)',
      paradigm: 'functional_independent',
    },
  ],
}
```

---

## 4 · Taxonomía de biomarcadores esperados por sistema

Cuando un subagente mapee una intervención debe elegir biomarcadores de esta taxonomía canónica (evita inventar). Si necesita agregar uno nuevo → flag para Mariana valide.

### Sistema Circadiano
`cortisol_matutino_salival`, `cortisol_ritmo_curvatura`, `melatonina_salival_nocturna`, `DLMO`, `CAR (cortisol awakening response)`, `temperatura_corporal_delta`, `sueño_profundo_horas`, `latencia_sueño`

### Sistema Metabólico
`glucosa_ayunas`, `HbA1c`, `insulina_ayunas`, `HOMA-IR`, `HOMA-β`, `trigliceridos`, `HDL`, `LDL`, `apoB`, `Lp(a)`, `GGT`, `ALT`, `AST`, `ácido_úrico`, `leptina`, `adiponectina`

### 🎯 DECISIONES POST-PILOTO 2026-07-14 (Enrique confirmadas)

**1. Doctrina plantas tradicionales vs suplementos comerciales:**
Plantas en modalidad tradicional accesible (té, decocción, polvo cocido, alimento) SÍ entran al catálogo. Extractos estandarizados / cápsulas / tinturas comerciales NO — van a BHA scanner. Ver `project_doctrina_plantas_tradicionales_vs_suplementos_comerciales`. Cada intervención de tipo planta debe declarar en `how` la modalidad tradicional exacta (ej. "raíz de ashwagandha en polvo cocida en leche/ghee estilo Charaka", NO "cápsula 300mg KSM-66").

**2. Biomarcadores sofisticados: agregar sí, solicitar selectivamente:**
Se pueden mapear biomarcadores caros/difíciles (HSP70, NEFA, succinato, irisin, acilcarnitinas, GSH/GSSG, 8-OHdG, MDA, CoQ10 sérico) — sirven para completeness científica. PERO el motor los solicita SOLO cuando son diferenciales críticos del DX del user. Default es labs Tier 1 accesibles. Ver `feedback_biomarcadores_costosos_default_no_solicitar`. Categorización Tier 1/2/3 en esa doctrina.

**3. Categorías + roots agregados al vocab (`intervention-vocab.ts`) 2026-07-14:**
- Categorías nuevas: `mitocondrial`, `sarcopenia`
- Roots nuevos: `disfuncion_mitocondrial`, `estres_oxidativo_mitocondrial`
- Ya integrados en `INTERVENTION_CATEGORIES` + `CATEGORY_LABELS` + `INTERVENTION_ROOTS` + `ROOT_LABELS`

---

### Sistema Mitocondrial (nuevo · categoría propia · propuesta agregar al vocab)
El sistema mitocondrial merece categoría propia porque es LA fábrica de energía de cada célula, tiene su propio DNA (mtDNA), su disfunción es raíz de fatiga crónica + neurodegeneración + envejecimiento acelerado, y tiene intervenciones específicas que NO comparten con "metabólico" clásico.

`lactato_reposo` (alto = ineficiencia oxidativa), `ratio_lactato_piruvato`, `acilcarnitinas_perfil`, `CoQ10_sérico`, `MDA_malondialdehído` (peroxidación lipídica membrana mito), `8-OHdG` (daño DNA oxidativo), `VO2max` (proxy directo capacidad mitocondrial), `ácidos_orgánicos_urinarios` (intermediarios Krebs), `ratio_GSH/GSSG` (glutation reducido/oxidado), `ácido_pirúvico`, `carnitina_libre`

**Intervenciones mitocondriales típicas:** ayuno (autofagia + mitofagia), sauna (heat shock proteins), exposición fría (biogénesis via UCP1), HIIT (PGC-1α), luz roja fotobiomodulación (citocromo C oxidasa), CoQ10, ácido alfa-lipoico, PQQ, urolithin A, NR/NMN, MitoQ, sulforafano (NRF2 pathway).

**Roots relacionados a proponer al vocab:** `disfuncion_mitocondrial`, `estres_oxidativo_mitocondrial`.

### Sistema Inflamatorio
`PCR_hs`, `IL-6`, `IL-1β`, `TNF-α`, `fibrinógeno`, `homocisteina`, `ratio_neutrofilos_linfocitos`

### Sistema Estrés / Neuroendocrino
`cortisol_salival_curva`, `DHEA-S`, `ratio_cortisol_DHEA`, `HRV RMSSD`, `HRV LF/HF ratio`, `catecolaminas_orina_24h`, `alfa-amilasa_salival`

### Sistema Hormonal Masculino
`testosterona_total`, `testosterona_libre`, `SHBG`, `estradiol`, `LH`, `FSH`, `prolactina`, `DHT`

### Sistema Hormonal Femenino
`estradiol_por_fase`, `progesterona_luteal`, `LH`, `FSH`, `prolactina`, `AMH`, `testosterona_libre`, `SHBG`, `DHEA-S`

### Sistema Tiroideo
`TSH`, `T4_libre`, `T3_libre`, `T3_reversa`, `anti-TPO`, `anti-tiroglobulina`, `yodo_urinario`, `selenio_serico`

### Sistema Cardiovascular
`presion_arterial_sistolica`, `presion_arterial_diastolica`, `HRV RMSSD`, `frecuencia_cardiaca_reposo`, `VO2max`, `apoB`, `Lp(a)`, `PCR_hs`, `homocisteina`

### Sistema Digestivo / Microbioma
`calprotectina_fecal`, `zonulina`, `beta_glucuronidasa`, `diversidad_alfa_microbioma`, `SCFA_fecales`, `LPS_serico`, `IgA_secretora_saliva`

### Sistema Detox / Hepático
`GGT`, `ALT`, `AST`, `bilirrubina_directa`, `glutation_reducido`, `homocisteina`, `MTHFR_genotipo`, `metilmalonato`

### Cognitivo / Sueño
`sueño_profundo_horas`, `sueño_REM_horas`, `sueño_total_horas`, `HRV_nocturno`, `oxígeno_saturación_nocturna`, `test_reaccion_ms`, `N-Back_score`

### Composición Corporal
`peso`, `%grasa`, `masa_muscular_kg`, `circunferencia_cintura`, `ratio_cintura_altura`, `IMC`

---

## 5 · Prompt canónico para subagentes de research

Este es el prompt que Cowork usa para desplegar subagentes en batch (task #110). No modificar sin validación.

```
Eres un investigador científico multi-paradigma para ATP · app de intervención epigenética.

PRINCIPIO MAESTRO (ANTES QUE CUALQUIER CLASIFICACIÓN):
¿Esta intervención cuida, propicia o recupera la función natural de un sistema/mecanismo del cuerpo?
Si sí → mapea y trae toda la info rica que encuentres, independiente de cuánto la haya estudiado
Occidente. Si no → márcala como "revisar con Mariana · funcionalidad cuestionable".

Los paradigmas son CLASIFICACIÓN post-hoc + TRANSPARENCIA de sesgo, NO son filtros que excluyen
información válida. Si encuentras info riquísima en una fuente que no encaja en las categorías
declaradas → tráela y clasifícala como `traditional_documented` o `mechanistic` según aplique.

TAREA: Mapear el rastro epigenético estructurado de N intervenciones (te doy la lista).

FORMATO OBLIGATORIO: sigue exactamente el esquema `Intervention` de src/constants/interventions-catalog.ts, campos nuevos:
- epigeneticImpact { activates, inhibits, modulates, biomarkers, mechanismSummary }
- sideEffects
- contraindications
- recommendationRules { boostIf, excludeIf, boostWeight }
- sources (multi-paradigma)

REFERENCIA CANÓNICA: copia el nivel de detalle + estilo de citas de los 7 universales P1 en
R and D/MAPEO_EPIGENETICO_INTERVENCIONES_v1.md. Si tu output tiene menos densidad que los P1,
retrabájalo. Los 7 P1 son el listón.

REGLAS ANTI-BASURA (SIN QUE BLOQUEEN INFO RICA):

1. Cruza paradigmas ideal ≥3, ACEPTABLE ≥2:
   - IDEAL: 1 western_academic + 1 functional_independent + 1 tradición/alternativa
   - ACEPTABLE: 2 paradigmas fuertes si el 3ero no existe pero mecanismo es sólido
   - Lista de functional_independent: Kresser, Bredesen, Attia, Sinclair, Huberman, Rhonda
     Patrick, Masterjohn, Ben Lynch, Wahls, Zach Bush, Gottfried, Kharrazian, Brogan, Rob
     Wolf, **Ernesto Prieto Gratacós** (biofísica, longevidad, medicina cuántica), y otros
     que encuentres alineados con biología funcional/independiente.
   - Cuando falte un paradigma → flag "PARADIGMA_AUSENTE: xxx" pero NO descartes la
     intervención · solo etiqueta transparencia.

2. Biomarcadores: elige de la taxonomía canónica del doc (incluye sistema Mitocondrial nuevo).
   Si necesitas agregar uno nuevo → flag "PROPUESTA_NUEVO_BIOMARCADOR: xxx" para Mariana valide.

3. Contraindicaciones: solo las absolutas. Si el motor excluye, tiene que ser porque hay
   evidencia de daño potencial real. NO seas paranoico · no contraindiques por precaución
   sin base.

4. Fuentes: cada cita debe ser verificable. Formato: `Autor Año "título" journal/URL`.
   Prefiere específico sobre "según estudios". PERO si encuentras conocimiento tradicional
   sin autor identificable (ej. formulas MTC clásicas, prácticas Ayurveda del Charaka
   Samhita), es válido citarlo como paradigma `tcm`/`ayurveda` sin autor moderno.

5. Flags cuando aplique (transparencia, no censura):
   - `industryFunded: true` si el paper está sponsored por industria relevante al outcome
   - `paradigmConflict` si hay contradicción entre paradigmas para esta afirmación · anótala
     explícita, no la escondas

6. Mecanismo > Consenso: prefiere explicar el mecanismo biológico comprensible sobre "la
   evidencia dice". Si el mecanismo es sólido + observación clínica consistente + no daño
   → es N3-N4 aunque no haya RCT. Trae la intervención igualmente.

7. Confidence check: si tienes MUY BAJA confidence sobre una intervención → flag "REVISAR_
   CON_MARIANA" pero devuelve lo que sí tengas. No inventes fuentes. No dejes vacío por miedo.

OUTPUT: JSON estructurado, una entrada por intervención, en el shape del `Intervention`
extendido. Al final agrega un reporte breve:
- Cuántas mapeaste con ≥3 paradigmas (ideal)
- Cuántas con 2 paradigmas (aceptable, flag ausente)
- Cuántas con REVISAR_CON_MARIANA (baja confidence)
- Contradicciones encontradas entre paradigmas
- Biomarcadores nuevos propuestos
- Info rica tangencial que descubriste durante research (contexto histórico, protocolos
  tradicionales, mecanismos moleculares fascinantes) — resérvala en un archivo aparte
  `research_notes_extra_batch_X.md` porque a veces la joya está en el margen.

PROHIBIDO:
- Inventar fuentes
- Usar "según estudios" sin cita específica
- Contraindicar sin evidencia real de daño
- Copiar prosa de mi doc en vez de datos estructurados
- Descartar info rica por no encajar perfecto en categorías
- Superficialidad · si tienes duda, marca REVISAR_CON_MARIANA pero devuelve lo que sí tengas
```

---

## 6 · Checklist de validación para Mariana

Cuando Cowork consolide los batches de subagentes, Mariana revisa este checklist antes de firmar:

### Por cada intervención mapeada

- [ ] `epigeneticImpact.activates/inhibits/modulates` — ¿nombres correctos de genes/pathways? ¿mecanismo real?
- [ ] `epigeneticImpact.biomarkers` — ¿biomarcadores REALES que responden a esta intervención? ¿en la taxonomía canónica?
- [ ] `epigeneticImpact.mechanismSummary` — ¿la línea es correcta en fisiología? ¿comprensible para user?
- [ ] `sideEffects` — ¿reales, documentados, no bloqueantes?
- [ ] `contraindications` — ¿ABSOLUTAS? ¿alguna falta? (embarazo, lactancia, edad, condiciones específicas)
- [ ] `recommendationRules.boostIf` — ¿los criterios reflejan cuándo tú personalmente recomendarías esta intervención?
- [ ] `recommendationRules.excludeIf` — ¿coincide con contraindications + situaciones donde NO recomendarías?
- [ ] `sources` — ¿al menos 3 paradigmas? ¿funding flags correctos? ¿citas reales verificables?
- [ ] `evidenceLevel` — ¿N1-N4 refleja la fuerza real del respaldo multi-paradigma?

### Cross-check global

- [ ] ¿Alguna intervención contradice a otra en el catálogo? (ej. una recomienda X, otra excluye X en la misma condición)
- [ ] ¿La cobertura por sistema es balanceada? (no todo digestivo, ni todo circadiano)
- [ ] ¿Faltan intervenciones para condiciones que trato con frecuencia? (Mariana propone las que faltan)

---

## 7 · Estado y siguientes pasos

**Completado (Fase 0):**
- ✅ Schema extendido en `interventions-catalog.ts`
- ✅ Este doc con formato + 7 P1 canónicos + jerarquía multi-paradigma + prompt subagentes
- ⏳ Cuestionario Maestro (task #107) · doc siguiente
- ⏳ Deploy subagentes research (task #110) · después de que Cowork valide docs con Enrique
- ⏳ Sesión validación clínica Mariana (task #9) · después de consolidación batches
- ⏳ Motor personalización determinístico (task #106) · con catálogo enriquecido

**Cero fuga clínica invariante.** **Cero deuda técnica.** **Cada intervención con paradigma cruzado y transparencia de sesgo.**
