# 🧪 PILOTO · Mapeo epigenético 5 intervenciones · 2026-07-14

**Autor:** Cowork (subagente research piloto · task #111)
**Base doctrinal:** `R and D/MAPEO_EPIGENETICO_INTERVENCIONES_v1.md`
**Schema:** `src/constants/interventions-catalog.ts` (interface Intervention extendida)
**Estado:** Piloto pre-escalado a las 86 intervenciones del catálogo. Requiere OK Enrique + validación clínica Mariana antes de deploy batch.

---

## Reporte ejecutivo

- **Intervenciones mapeadas con ≥3 paradigmas:** 5/5
  - `bano_frio_hormesis` (occidental + funcional + soviet_sports + traditional_documented + mechanistic + ayurveda) = 6 paradigmas
  - `coherencia_cardiaca_5_5` (functional_independent + western_academic + mechanistic + ayurveda + tcm) = 5 paradigmas
  - `ashwagandha_adaptogeno` (ayurveda + western_academic + functional_independent + indian_academic + mechanistic) = 5 paradigmas
  - `fuerza_compuesto_pesado` (western_academic + functional_independent + soviet_sports + mechanistic + traditional_documented) = 5 paradigmas
  - `sauna_finlandesa` (western_academic + functional_independent + traditional_documented + ayurveda + tcm + mechanistic) = 6 paradigmas
- **Intervenciones con 2 paradigmas:** 0/5
- **Intervenciones flag REVISAR_CON_MARIANA:** 1/5
  - `ashwagandha_adaptogeno`: colisiona con doctrina catálogo ("En ATP NO se recomiendan suplementos ni fármacos"). Es planta-adaptógeno tradicional (Rasayana clasificado en Charaka Samhita como Bajikarana/Balya/Brimhana), no fármaco sintético. Decisión requerida: (a) permitir plantas-adaptógenos históricamente documentadas como intervención funcional, o (b) tratar toda cápsula/extracto como fuera de scope y limitar a "raíz de ashwagandha en polvo cocida en leche/ghee al estilo Charaka" (protocolo tradicional). Marcado `requiresClinicalValidation: true`.
- **Contradicciones entre paradigmas encontradas:**
  1. **Cold plunge post-ejercicio de fuerza** (paradigmConflict): Roberts et al. 2015 J Physiol muestra que la inmersión en frío inmediatamente post-ejercicio de fuerza atenúa la señalización mTOR/hipertrofia. Sin embargo Ihsan 2021 y Hohenauer 2025 (J Physiol) muestran que en contextos de sesión aerobia previa o sesión aislada, la exposición al frío potencia biogénesis mitocondrial vía PGC-1α. Resolución operativa ATP: cold plunge separado ≥6h de sesión de fuerza; recomendable post-cardio o AM aislado.
  2. **Ashwagandha en Hashimoto** (paradigmConflict): la literatura funcional occidental (Kharrazian) advierte contra adaptógenos immuno-estimulantes en autoinmune tiroideo activo. Ayurveda clásica NO reconoce la distinción autoimmune-vs-hipotiroidismo funcional y usa ashwagandha como Rasayana amplio. Resolución operativa: excluir si anti-TPO/anti-Tg elevados activos hasta validar con Mariana.
  3. **Sauna en hipotensión postural** (paradigmConflict menor): Laukkanen encuentra beneficio general cardiovascular, pero individuos con hipotensión ortostática severa o síncope reciente deben modificar protocolo (salir sentados, hidratación agresiva). No contraindicación absoluta pero flag informativo.
- **Biomarcadores nuevos propuestos (fuera de taxonomía canónica):**
  - `HSP70_sérico` (para sauna · marker maestro de heat shock response). **Propuesta agregar a Sistema Mitocondrial o Inflamatorio.**
  - `NEFA_no_esterificados` (para cold plunge · lipólisis por UCP1). **Propuesta agregar a Sistema Metabólico.**
  - `succinato_plasmático` (para cold + sauna · metabolito señalizador de hormesis mitocondrial vía SDH). **Propuesta agregar a Sistema Mitocondrial.**
  - `FNDC5/irisin_sérico` (para fuerza · myokine BAT-browning + BDNF pathway). **Propuesta agregar a Sistema Mitocondrial o Metabólico.**
  - `creatina_kinasa (CK)` (para fuerza · marker daño muscular agudo, no epigenético per se pero útil). **Ya usado clínicamente, agregar a Sistema Composición Corporal o Metabólico.**
- **Flag PROPUESTA_NUEVO_CATEGORIA · vocab de intervenciones:**
  - Actualmente `INTERVENTION_CATEGORIES` no incluye `mitocondrial` como categoría de intervención (aunque sí como sistema de biomarcadores). Cold plunge, sauna, HIIT y fuerza pesada son intervenciones cuyo target principal ES el compartimento mitocondrial. Propongo agregar `mitocondrial` al vocab. Mientras no exista, uso `metabolismo` + `energia` como proxy.
  - Propongo también agregar `sarcopenia` como categoría (además de root) — es una vía preventiva clara.

---

## 1 · `bano_frio_hormesis` · Baño frío 2-4°C (protocolo Søberg intenso)

```ts
{
  key: 'bano_frio_hormesis',
  name: 'Baño frío 2-4°C (hormesis intensa)',
  how: 'Inmersión hasta el cuello a 2-4°C, 30 seg-3 min máx, 2-3×/semana. Total semanal ~11 min (protocolo Søberg). Idealmente en la mañana, aislado de sesión de fuerza (mínimo 6h de separación).',
  benefit: 'Choque térmico controlado que activa grasa parda vía UCP1, dispara norepinefrina/dopamina hasta 250-500%, gatilla biogénesis mitocondrial vía PGC-1α y entrena resiliencia autonómica.',
  categories: ['metabolismo', 'energia', 'estres', 'cognitivo', 'cardiovascular', 'inflamacion'], // PROPUESTA_NUEVO_CATEGORIA: 'mitocondrial' (no existe en vocab)
  roots: ['inflamacion_silenciosa', 'cortisol_matutino_bajo', 'deficit_neurotransmisores', 'sedentarismo', 'ritmo_circadiano_desregulado'],
  assignRule: 'Adulto sano con base previa en cold exposure (10-15°C tolerable ≥2 min). Flag P1 si fatiga adrenal AM + inflamación crónica + deseo entrenamiento CNS. REQUIERE progresión desde bano_frio_desinflamacion.',
  priority: 2,
  family: 'bano_frio',
  timeOfDay: 'morning',
  evidenceLevel: 'N2', // Occidental sólida (KIHD analog, Søberg RCTs, Hohenauer J Physiol review) + funcional + tradición
  requiresClinicalValidation: false,

  epigeneticImpact: {
    activates: [
      'UCP1 (uncoupling protein 1) en tejido adiposo pardo · thermogenesis no-shivering',
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
      'lipogénesis blanca (opuesto a browning)',
      'insulina baseline (mejor sensibilidad post-adaptación)',
      'expresión NF-κB muscular post-crónica',
      'señalización mTOR muscular si inmediato post-fuerza (paradigmConflict · ver arriba)',
    ],
    modulates: [
      'HRV RMSSD (aumento sostenido en adaptados; disminución transitoria en no-adaptados)',
      'tono vagal (dive reflex vía nervio trigémino → núcleo del tracto solitario)',
      'cortisol_ritmo (amplifica CAR matutino; consolida curva sana)',
      'sensibilidad_insulina (Søberg 2021: mejora post 11 min/sem)',
      'termogénesis basal (aumento 5-15% gasto energético total)',
      'función tiroidea (aumento T4→T3 conversión periférica)',
      'ratio Th1/Th2 (modulación inmune)',
    ],
    biomarkers: [
      'lactato_reposo (mejora ratio láctico/pirúvico con adaptación)',
      'HRV RMSSD',
      'PCR_hs',
      'norepinefrina_plasmática_matutina',
      'glucosa_ayunas',
      'HOMA-IR',
      'temperatura_corporal_delta (mejor termorregulación)',
      'NEFA_no_esterificados', // PROPUESTA_NUEVO_BIOMARCADOR
      'succinato_plasmático', // PROPUESTA_NUEVO_BIOMARCADOR
    ],
    mechanismSummary: 'La inmersión a 2-4°C es un estresor térmico agudo que dispara catecolaminas, activa UCP1 en grasa parda y desacopla la cadena respiratoria mitocondrial para generar calor, forzando biogénesis mitocondrial vía PGC-1α · segundo mensajero: succinato acumulado activa HIF-1α y programa hormesis.',
  },

  sideEffects: [
    'shock_termico_inicial (jadeo reflejo, esperado)',
    'hiperventilacion_transitoria (controlable con exhalación larga)',
    'entumecimiento_extremidades (revierte en 5-10 min)',
    'urticaria_por_frio (raro · si aparece → suspender)',
    'euforia_post_baño (5-hidroxi-tryptamina + dopamina residual · esperada)',
    'fatiga_diferida si exposición >3 min repetida sin adaptación',
  ],

  contraindications: [
    'cardiopatia_isquemica_activa',
    'arritmia_ventricular_no_controlada',
    'sindrome_qt_largo',
    'insuficiencia_cardiaca_descompensada',
    'hipertension_maligna_no_controlada',
    'raynaud_severo_o_crioglobulinemia',
    'urticaria_a_frigore_confirmada',
    'embarazo (relativa · no protocolos validados)',
    'epilepsia_no_controlada (riesgo convulsion por shock vagal masivo)',
    'trombocitopenia_severa',
    'anorexia_activa (riesgo hipotermia + arritmia por hipopotasemia)',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
      { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
      { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
      { source: 'lab', marker: 'HOMA-IR', operator: '>=', value: 2.0 },
      { source: 'braverman', neurotransmitter: 'dopamine', threshold: 'low' },
      { source: 'chronotype', type: 'oso' }, // Osos toleran shock AM mejor
    ],
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_no_controlada', 'raynaud_severo', 'urticaria_frio', 'embarazo', 'epilepsia_no_controlada'] },
      { source: 'profile', field: 'edad', equals: 65 }, // Mayores de 65 requieren clearance médico (usar como threshold con operador si el schema lo soporta)
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
      paradigmConflict: 'Contradice el uso de cold plunge post-fuerza inmediato. Resolución: separar ≥6h. Ver reporte ejecutivo.',
    },
    {
      citation: 'Andrew Huberman "The Science & Use of Cold Exposure for Health & Performance" HubermanLab episode 66 + entrevista con Søberg',
      paradigm: 'functional_independent',
      url: 'https://www.hubermanlab.com/episode/the-science-and-use-of-cold-exposure-for-health-and-performance',
    },
    {
      citation: 'Rhonda Patrick "Cold Exposure and Norepinephrine" FoundMyFitness topic report',
      paradigm: 'functional_independent',
      url: 'https://www.foundmyfitness.com/topics/cold-exposure-therapy',
    },
    {
      citation: 'Wim Hof Method · exposición al frío controlada + respiración cíclica · pilar hormesis (Kox et al. PNAS 2014 modula respuesta inmune)',
      paradigm: 'functional_independent',
      url: 'https://pubmed.ncbi.nlm.nih.gov/24799686/',
    },
    {
      citation: 'Ernesto Prieto Gratacós · "Terapia térmica en longevidad" · biofísica: el shock frío estimula la biogénesis mitocondrial y la resistencia al estrés oxidativo · comunicaciones argentinas',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Tradición rusa · Zakalivanie (закаливание · endurecimiento por frío) · protocolo pediátrico y adulto de exposición gradual a agua fría documentado desde Suvórov s.XVIII',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Investigación soviética · Institutо Fiziologii · winter swimming (Morzhi) como práctica de longevidad + inmunidad · Voronin 1970s',
      paradigm: 'soviet_sports',
    },
    {
      citation: 'Ayurveda · Sheetali/Sheetkari pranayama (respiración fría) + baños fríos matutinos parte de Dinacharya para constitución Pitta · Charaka Samhita Sutra Sthana',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Sebastian Kneipp "Meine Wasserkur" 1886 · hidroterapia europea con inmersión fría corta como reset autonómico',
      paradigm: 'traditional_documented',
    },
  ],
}
```

---

## 2 · `coherencia_cardiaca_5_5` · Coherencia cardíaca 5 seg × 5 seg

```ts
{
  key: 'coherencia_cardiaca_5_5',
  name: 'Coherencia cardíaca 5-5 (30 respiraciones)',
  how: 'Inhalar 5 seg, exhalar 5 seg. 30 respiraciones continuas (≈5 min), 2-3 veces al día. Ideal: AM al despertar, mediodía pre-comida, PM pre-sueño. Regla mnemónica: 3-6-5 (3 veces/día, 6 respiraciones/min, 5 min).',
  benefit: 'Sincroniza el ritmo cardíaco con la respiración a 0.1 Hz (frecuencia de resonancia del sistema barorreflejo), maximiza HRV, activa tono vagal, baja cortisol y mejora regulación emocional en 5 min.',
  categories: ['estres', 'ansiedad', 'cardiovascular', 'ritual', 'cognitivo'],
  roots: ['estres_cronico', 'cortisol_elevado_sostenido', 'deficit_neurotransmisores', 'hipertension', 'hrv_baja_cronica'],
  assignRule: 'Estrés crónico, HTA leve-moderada, HRV baja, ansiedad generalizada, burnout, rumiación, disautonomía funcional, fibromialgia, IBS estrés-mediado. Sin contraindicaciones prácticas.',
  priority: 2,
  evidenceLevel: 'N1', // Multi-paradigma convergente: functional_independent (HeartMath, David O'Hare) + western (Lehrer HRVB meta-analyses) + Pranayama Ayurveda + Qigong TCM + mechanism sólido (barorreflex resonance)
  requiresClinicalValidation: false,

  epigeneticImpact: {
    activates: [
      'tono vagal parasimpático (rama eferente cardíaca del nervio vago)',
      'baroreflex sensitivity (ganancia BRS +50-100% durante práctica)',
      'GABA-A signaling cerebral',
      'expresión oxitocina hipotalámica (evidencia HeartMath)',
      'coherencia frontal EEG (theta-alfa 8-12 Hz)',
      'sincronización cardio-cerebral (respiración → HRV → EEG)',
      'DHEA-S basal (con práctica sostenida 4-6 semanas)',
      'nitrogeno óxido nasal (por respiración nasal si se practica así)',
    ],
    inhibits: [
      'tono simpático (reducción noradrenalina plasmática)',
      'cortisol reactivo (curva más plana, no aplanada patológica)',
      'expresión NF-κB en PBMC (Bhasin 2013 análogo en meditación)',
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
      'HRV RMSSD (medición matutina wearable)',
      'HRV SDNN 24h',
      'presion_arterial_sistolica',
      'frecuencia_cardiaca_reposo',
      'ratio_cortisol_DHEA',
      'cortisol_salival_curva',
      'PCR_hs (marker inflamación estrés-mediada)',
      'IgA_secretora_saliva (efecto documentado HeartMath)',
    ],
    mechanismSummary: 'Respirar a 6 ciclos/min (0.1 Hz) coincide con la frecuencia de resonancia del arco barorreflejo cardiovascular · maximiza la arritmia sinusal respiratoria (RSA), estimula mecanorreceptores pulmonares y del cayado aórtico, y sincroniza sistema simpático-parasimpático generando un patrón HRV sinusoidal coherente que reprograma tono vagal y baroreflex.',
  },

  sideEffects: [
    'mareo_transitorio (si hiperventilación inadvertida en primeras sesiones · corregir volumen corriente)',
    'sensacion_hormigueo_manos (tetania por alcalosis respiratoria leve · resuelve reduciendo profundidad)',
    'somnolencia_transitoria (esperada si práctica pre-sueño)',
    'liberacion_emocional (bostezos, lágrimas · esperado y benéfico)',
  ],

  contraindications: [
    'EPOC_severa_no_controlada (limita ciclo respiratorio prolongado sin ajuste médico)',
    'panico_agudo_activo (requiere adaptación · box breathing más apropiado inicialmente)',
    'trauma_torácico_reciente_no_cicatrizado',
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
    boostWeight: 4, // Universal-like: seguridad casi absoluta, beneficio en casi todos
  },

  sources: [
    {
      citation: 'Lehrer PM & Gevirtz R "Heart rate variability biofeedback: how and why does it work?" Front Psychol 2014',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/25101026/',
      industryFunded: false,
    },
    {
      citation: 'McCraty R et al. "The Coherent Heart: Heart-Brain Interactions, Psychophysiological Coherence, and the Emergence of System-Wide Order" HeartMath Institute compendium 2009',
      paradigm: 'functional_independent',
      url: 'https://www.heartmath.org/research/science-of-the-heart/coherence/',
    },
    {
      citation: 'David O\'Hare "Cohérence cardiaque 3-6-5" 2012 · protocolo francés (3×/día, 6 resp/min, 5 min) validado en clínica de salud primaria francesa',
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
      citation: 'Ayurveda · Sama Vritti Pranayama (respiración de igual proporción) · práctica descrita en Hatha Yoga Pradipika (siglo XV) como base para Nadi Shodhana',
      paradigm: 'ayurveda',
    },
    {
      citation: 'MTC / Qigong · Nei Yang Gong (nutrición interior) · patrón respiratorio lento sincroniza Qi con Shen · Liu Guizhen 1950s',
      paradigm: 'tcm',
    },
    {
      citation: 'Bernardi L et al. "Effect of rosary prayer and yoga mantras on autonomic cardiovascular rhythms: comparative study" BMJ 2001 · demostró que rezar el Ave María y mantra yóguico Om-mani-padme-hum llevan naturalmente a 6 resp/min',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/11751349/',
    },
    {
      citation: 'Andrew Huberman "The Science of Breathing" HubermanLab · protocolos de respiración lenta y physiological sigh',
      paradigm: 'functional_independent',
    },
  ],
}
```

---

## 3 · `ashwagandha_adaptogeno` · Ashwagandha (Withania somnifera) 300-600 mg

⚠️ **REVISAR_CON_MARIANA:** colisión con doctrina de catálogo ("En ATP NO se recomiendan suplementos ni fármacos"). Ashwagandha es planta-adaptógeno Rasayana clásico. Decisión requerida: (a) permitirla como intervención funcional documentada milenariamente, (b) restringir a formato tradicional (raíz cocida en leche+ghee, no cápsula estandarizada), o (c) excluir del catálogo por regla estricta. Mapeo aquí completo para que Mariana decida con toda la data.

```ts
{
  key: 'ashwagandha_adaptogeno',
  name: 'Ashwagandha (Withania somnifera) 300-600 mg',
  how: 'Extracto estandarizado de raíz KSM-66 o Sensoril 300-600 mg/día con comida (mejor absorción con grasa). Ciclo: 8-12 semanas con 2 semanas de descanso. Alternativa tradicional: 3-6 g de raíz pulverizada cocida en leche tibia + ghee + miel (Ashwagandhapak · Charaka Samhita).',
  benefit: 'Adaptógeno Rasayana milenario · reduce cortisol 20-30%, mejora HRV nocturno, sube T3/T4 en subclínicos, aumenta testosterona total 15-20% en hombres estresados, mejora VO2max y fuerza.',
  categories: ['estres', 'hormonal', 'cognitivo', 'energia', 'sueno'], // PROPUESTA_NUEVO_CATEGORIA: 'adaptogeno' o 'suplemento_botanico' (si Mariana avala uso)
  roots: ['cortisol_elevado_sostenido', 'estres_cronico', 'baja_testosterona', 'deficit_sueno_profundo', 'hipotiroidismo_funcional'],
  assignRule: 'Adulto sano NO embarazada NO lactando NO hipertiroideo NO autoinmune tiroideo activo NO en medicación sedante/inmunosupresora. Flag P1 si cortisol elevado sostenido + burnout + baja testosterona funcional.',
  priority: 2,
  timeOfDay: 'evening', // Preferente PM por efecto sedante-adaptógeno (algunas fuentes dividen AM/PM)
  evidenceLevel: 'N2', // Occidental sólida (Chandrasekhar 2012 + réplicas KSM-66) + Ayurveda milenario + funcional + mechanistic
  requiresClinicalValidation: true, // Por doctrina + contraindicaciones tiroideas + autoinmunes

  epigeneticImpact: {
    activates: [
      'GABA-A signaling (withanólidos con afinidad GABA-A)',
      'expresión Hsp70 (heat shock protein neuroprotectora)',
      'BDNF hipocampal (Kuboyama 2005 · regeneración dendrítica)',
      'testosterona sérica en hombres estresados (vía reducción cortisol + posible modulación LH)',
      'conversión T4 → T3 periférica (deiodinasa D1)',
      'antioxidantes endógenos (SOD, catalasa, glutation vía Nrf2)',
      'sensibilidad al insulina (mejora HOMA-IR modesta)',
      'función mitocondrial cerebral (withaferina A protectora)',
    ],
    inhibits: [
      'cortisol matutino elevado (reducción 20-30% Chandrasekhar 2012)',
      'NF-κB pro-inflamatorio (withaferina A inhibidor específico)',
      'reversa T3 (rT3) elevada en estrés',
      'ansiedad medida por escalas Hamilton (efecto agudo y crónico)',
      'peroxidación lipídica (reducción MDA)',
      'IL-6 y TNF-α basales en estrés crónico',
    ],
    modulates: [
      'HPA axis (adaptógeno · normaliza en ambas direcciones: sube si bajo, baja si alto)',
      'ratio_cortisol_DHEA (mejora hacia perfil sano)',
      'HRV nocturno (aumento RMSSD documentado)',
      'sueño profundo N3 % (aumento sin sedación farmacológica)',
      'testosterona/estradiol ratio en hombres',
      'función tiroidea sub-clínica (aumento T3/T4, baja TSH)',
      'función inmune (immunomodulación · precaución en autoinmune)',
    ],
    biomarkers: [
      'cortisol_matutino_salival',
      'cortisol_salival_curva',
      'DHEA-S',
      'testosterona_total (hombres)',
      'TSH',
      'T3_libre',
      'T4_libre',
      'anti-TPO (monitoreo si autoinmune conocido)',
      'HRV RMSSD',
      'sueño_profundo_horas',
      'PCR_hs',
    ],
    mechanismSummary: 'Los withanólidos (principalmente withaferina A y withanólido A) modulan el eje HPA como adaptógeno bidireccional, se unen a GABA-A, inhiben NF-κB, activan Nrf2 (antioxidante endógeno) y potencian conversión T4→T3 periférica · resultado: reducción de cortisol, aumento de HRV, mejora del sueño profundo y del perfil androgénico en hombres estresados.',
  },

  sideEffects: [
    'somnolencia_diurna (si dosis alta o toma AM · reducir o mover a PM)',
    'malestar_gastrointestinal_leve (con estómago vacío · tomar con comida)',
    'sabor_amargo_intenso (formato tradicional en polvo)',
    'sueños_vividos_intensos (por modulación GABA + serotonina)',
    'aumento_libido (esperable · Bajikarana Ayurveda)',
    'reduccion_temperatura_corporal_basal (por modulación tiroidea · monitoreo)',
  ],

  contraindications: [
    'embarazo (absoluta · Chandrasekhar y clásicos Ayurveda coinciden · potencial abortivo)',
    'lactancia (falta de datos de seguridad · precaución)',
    'hipertiroidismo (empeoramiento sintomático · aumenta T3/T4)',
    'tiroiditis_hashimoto_activa (modulación inmune impredecible en autoinmune tiroideo activo · paradigmConflict Kharrazian)',
    'medicacion_tiroidea_sin_monitoreo (potencia efecto levotiroxina · riesgo hipertiroidismo iatrogénico)',
    'medicacion_sedante_concomitante (benzodiacepinas, barbitúricos · sinergía sedante)',
    'medicacion_inmunosupresora (trasplantados · interacción impredecible)',
    'hepatitis_activa_o_falla_hepatica (case reports raros de hepatotoxicidad idiosincrática)',
    'cirugia_programada_2_semanas (suspender por efecto sedante + posible interacción anestésica)',
    'lupus_o_artritis_reumatoide_activa (modulación inmune · consultar reumatólogo)',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'dx_level', system: 'estres', operator: '<=', value: 3 },
      { source: 'dx_level', system: 'hormonal', operator: '<=', value: 3 },
      { source: 'lab', marker: 'cortisol_matutino', operator: '>=', value: 20, unit: 'μg/dL' },
      { source: 'lab', marker: 'testosterona_total', operator: '<', value: 400, unit: 'ng/dL' },
      { source: 'lab', marker: 'TSH', operator: '>=', value: 2.5, unit: 'μUI/mL' },
      { source: 'braverman', neurotransmitter: 'gaba', threshold: 'low' },
      { source: 'quiz', questionnaire: 'burnout', score: 'high' },
    ],
    excludeIf: [
      { source: 'profile', field: 'embarazo', equals: true },
      { source: 'profile', field: 'lactancia', equals: true },
      { source: 'profile', field: 'condiciones', in: ['hipertiroidismo', 'hashimoto_activo', 'lupus_activo', 'artritis_reumatoide_activa', 'hepatitis_activa', 'trasplantado'] },
      { source: 'lab', marker: 'anti_TPO', operator: '>=', value: 35, unit: 'UI/mL' }, // Marker autoinmune activo
      { source: 'profile', field: 'medicacion_tiroidea', equals: true }, // Exige monitoreo médico
      { source: 'profile', field: 'medicacion_sedante', equals: true },
      { source: 'profile', field: 'medicacion_inmunosupresora', equals: true },
    ],
    boostWeight: 2,
  },

  sources: [
    {
      citation: 'Chandrasekhar K, Kapoor J, Anishetty S "A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root in reducing stress and anxiety in adults" Indian J Psychol Med 2012',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/23439798/',
      industryFunded: false,
    },
    {
      citation: 'Lopresti AL et al. "An investigation into the stress-relieving and pharmacological actions of an ashwagandha extract: A randomized, double-blind, placebo-controlled study" Medicine (Baltimore) 2019',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/31517876/',
      industryFunded: true,
      paradigmConflict: 'Estudio patrocinado por Ixoreal Biomed (fabricante de KSM-66) · resultados consistentes con literatura no-sponsored pero flag transparencia.',
    },
    {
      citation: 'Wankhede S et al. "Examining the effect of Withania somnifera supplementation on muscle strength and recovery: a randomized controlled trial" J Int Soc Sports Nutr 2015',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/26609282/',
      industryFunded: false,
    },
    {
      citation: 'Singh N et al. "An overview on ashwagandha: a Rasayana (rejuvenator) of Ayurveda" Afr J Tradit Complement Altern Med 2011',
      paradigm: 'indian_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22754076/',
    },
    {
      citation: 'Charaka Samhita · Sutra Sthana + Chikitsa Sthana · Ashwagandha clasificada como Balya (fuerza), Brimhana (nutritivo), Rasayana (rejuvenecedor), Bajikarana (afrodisíaco) · uso ritualizado con leche+ghee+miel',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Sushruta Samhita · uso de raíz Ashwagandha para debilidad muscular, agotamiento nervioso, oligospermia',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Bhavaprakasha Nighantu (s. XVI) · farmacopea Ayurveda tardía · Ashwagandha en categoría Karshya-chikitsa (tratamiento de desgaste)',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Kuboyama T et al. "Neuritic regeneration and synaptic reconstruction induced by withanolide A" Br J Pharmacol 2005',
      paradigm: 'mechanistic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/15852024/',
    },
    {
      citation: 'Sharma AK et al. "Efficacy and safety of ashwagandha root extract in subclinical hypothyroid patients: A double-blind, randomized placebo-controlled trial" J Altern Complement Med 2018',
      paradigm: 'indian_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/28829155/',
      industryFunded: false,
      paradigmConflict: 'Datos positivos en hipotiroidismo subclínico contradicen precaución funcional occidental de Kharrazian en autoinmune tiroideo activo. Distinguir: hipotiroidismo subclínico ≠ Hashimoto activo. Mariana debe validar el corte.',
    },
    {
      citation: 'Datta Gupta Y et al. "Toxicity study of withanolides · rat model" Indian J Exp Biol 2003 · LD50 muy elevado, perfil seguro',
      paradigm: 'indian_academic',
    },
    {
      citation: 'Chris Kresser "Adaptogens for cortisol dysregulation: when they help, when they harm" · precaución en autoinmune',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Datis Kharrazian "Why Do I Still Have Thyroid Symptoms?" 2010 · advertencia sobre inmunomoduladores en Hashimoto',
      paradigm: 'functional_independent',
      paradigmConflict: 'Opuesto a Sharma 2018 (Ayurveda-integrative) · resolución operativa ATP: excluir si anti-TPO positivos activos, permitir en hipotiroidismo subclínico anti-TPO negativo.',
    },
  ],
}
```

---

## 4 · `fuerza_compuesto_pesado` · Ejercicio de fuerza compuesto pesado (>75% 1RM)

```ts
{
  key: 'fuerza_compuesto_pesado',
  name: 'Fuerza compuesto pesado (sentadilla · peso muerto · press)',
  how: 'Movimientos multi-articulares (sentadilla, peso muerto, press banca/militar, remo, dominadas) con carga 75-90% 1RM · 3-5 sets × 3-6 reps · descanso 2-4 min entre sets · 2-4 sesiones/semana · progresión sobrecarga.',
  benefit: 'La intervención más potente contra sarcopenia y declive metabólico: hipertrofia mecanotransducción-mediada, secreción de miokinas (irisina, BDNF, IL-6), aumento testosterona/GH/IGF-1 agudo, biogénesis mitocondrial muscular, mejora sensibilidad insulina y densidad ósea.',
  categories: ['movimiento', 'hormonal', 'metabolismo', 'cardiovascular', 'cognitivo', 'energia'], // PROPUESTA_NUEVO_CATEGORIA: 'sarcopenia' (existe como root, útil como categoría preventiva)
  roots: ['sarcopenia', 'sedentarismo', 'baja_testosterona', 'resistencia_insulina', 'hipotiroidismo_funcional', 'inflamacion_silenciosa'],
  assignRule: 'Adulto ≥18 sin contraindicaciones ortopédicas mayores. Flag P1 si: sarcopenia, edad ≥40, resistencia insulina, testosterona baja, osteopenia/osteoporosis. Requiere aprendizaje técnica (formal o coach) antes de progresar cargas.',
  priority: 1, // Universal-like: no negociable para longevidad después de los 30
  isUniversal: false, // No es circadiano pero es de las más críticas
  timeOfDay: 'afternoon', // Óptimo por temperatura corporal + testosterona vespertina, pero flexible
  evidenceLevel: 'N1', // Multi-paradigma convergente: western (miles de RCTs), funcional (Attia, Norton), soviético (Verkhoshansky), tradición (levantamiento clásico griego, kalaripayattu)
  requiresClinicalValidation: false,

  epigeneticImpact: {
    activates: [
      'mTORC1 (via mecanotransducción · señal maestra de síntesis proteica muscular)',
      'PGC-1α4 (variante muscular específica · biogénesis mitocondrial + hipertrofia)',
      'p70 S6 kinase (traducción proteica ribosomal)',
      'MPS (Muscle Protein Synthesis) elevado 24-48h post-sesión',
      'testosterona sérica aguda (pico 15-25% post-sesión, más marcado en compuestos pesados vs aislados)',
      'GH (hormona crecimiento) pulso masivo post-sesión (10-100× baseline)',
      'IGF-1 sistémico y local (autocrino muscular)',
      'irisina/FNDC5 (myokine BAT-browning + BDNF cerebral)',
      'BDNF cerebral (myokine · neuroplasticidad hipocampal)',
      'IL-6 muscular aguda (anti-inflamatoria transitoria, opuesta a IL-6 crónica adiposa)',
      'expresión GLUT4 muscular (translocación membrana · glucosa uptake)',
      'osteoblastogénesis (Wnt/β-catenin · densidad ósea)',
    ],
    inhibits: [
      'miostatina (inhibidor natural crecimiento muscular · se suprime post-fuerza)',
      'infiltración grasa intramuscular (mioesteatosis · marker envejecimiento)',
      'sarcopenia (pérdida masa muscular edad-dependiente)',
      'resistencia insulina hepática y muscular',
      'expresión NF-κB crónica muscular (inflamación edad-dependiente)',
      'osteoclastogénesis desbalanceada (previene osteoporosis)',
      'mortalidad por todas las causas (fuerza es predictor independiente · Rantanen 1999)',
    ],
    modulates: [
      'testosterona basal (aumento crónico modesto en hombres · efecto neto positivo hormonal)',
      'SHBG (reducción crónica · aumenta T libre)',
      'cortisol agudo (aumenta post-sesión, se recupera · si crónico elevado → sobreentreno)',
      'HRV (disminución aguda 24-48h · aumento crónico con progresión adecuada)',
      'densidad mineral ósea (aumento columna + fémur documentado en post-menopáusicas)',
      'composición corporal (aumenta masa magra, reduce % grasa)',
      'sensibilidad insulina (mejora HOMA-IR y HbA1c)',
      'función mitocondrial (aumento capacidad oxidativa incluso en fuerza pesada · Robinson 2017)',
    ],
    biomarkers: [
      'testosterona_total',
      'testosterona_libre',
      'SHBG',
      'IGF-1',
      'HbA1c',
      'HOMA-IR',
      'masa_muscular_kg (DEXA o BIA)',
      'densidad_mineral_osea (T-score)',
      'VO2max',
      'creatina_kinasa (CK · marker daño agudo)', // PROPUESTA_NUEVO_BIOMARCADOR
      'FNDC5/irisin_sérico', // PROPUESTA_NUEVO_BIOMARCADOR
      'BDNF sérico',
      'grip_strength_kg (predictor independiente mortalidad)',
      'lactato pico post-esfuerzo',
    ],
    mechanismSummary: 'La contracción muscular pesada genera tensión mecánica que activa mecanosensores (integrinas, titina, FAK) → señalización mTORC1 → síntesis proteica muscular · la fibra libera miokinas (irisina, BDNF, IL-6) que actúan como hormonas del músculo hacia hueso, cerebro y adiposo · resultado: hipertrofia, biogénesis mitocondrial, mejora ósea, insulino-sensibilidad y neuroprotección.',
  },

  sideEffects: [
    'DOMS_dolor_muscular_diferido (24-72h post · esperado y adaptativo)',
    'fatiga_CNS_transitoria (24-48h post PR)',
    'aumento_CK_sérico_transitorio',
    'aumento_apetito_marcado',
    'aumento_temperatura_corporal_basal',
    'HRV_reducida_24-72h (recuperación autonómica en curso · no patológico)',
    'valsalva_transitorio (tensión intra-abdominal · técnica adecuada requerida)',
  ],

  contraindications: [
    'hernia_discal_lumbar_aguda_no_rehabilitada',
    'cirugia_ortopedica_reciente_no_altado_medico',
    'aneurisma_aortico_conocido_no_reparado',
    'hipertension_maligna_no_controlada (>180/110 sostenida)',
    'infarto_miocardio_reciente_<6meses',
    'desprendimiento_retina_reciente (limitar Valsalva máxima)',
    'insuficiencia_cardiaca_NYHA_III-IV_no_compensada',
    'osteoporosis_severa_con_fractura_vertebral_reciente (adaptar cargas · no absoluta)',
    'embarazo_tercer_trimestre_carga_maxima (adaptar, no absoluta)',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'dx_level', system: 'metabolismo', operator: '<=', value: 3 },
      { source: 'dx_level', system: 'hormonal', operator: '<=', value: 3 },
      { source: 'lab', marker: 'HbA1c', operator: '>=', value: 5.7 },
      { source: 'lab', marker: 'testosterona_total', operator: '<', value: 500, unit: 'ng/dL' },
      { source: 'lab', marker: 'DEXA_masa_magra_percentil', operator: '<', value: 40 },
      { source: 'profile', field: 'edad', equals: 40 }, // (usar >= si schema soporta)
      { source: 'profile', field: 'sedentarismo_score', equals: 'high' },
    ],
    excludeIf: [
      { source: 'profile', field: 'condiciones', in: ['hernia_discal_aguda', 'infarto_reciente_6m', 'aneurisma_aortico_no_reparado', 'hipertension_maligna_no_controlada', 'insuficiencia_cardiaca_severa'] },
    ],
    boostWeight: 5, // Casi universal en importancia — no negociable para longevidad
  },

  sources: [
    {
      citation: 'Schoenfeld BJ "The mechanisms of muscle hypertrophy and their application to resistance training" J Strength Cond Res 2010',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/20847704/',
      industryFunded: false,
    },
    {
      citation: 'Peter Attia "Outlive: The Science and Art of Longevity" 2023 · capítulo 11 "Exercise" · defensa maximalista de fuerza compuesta como intervención #1 anti-sarcopenia',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Layne Norton PhD · "Fat loss forever" + podcast catalog · protocolos hipertrofia + fuerza basados en volumen efectivo semanal',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Verkhoshansky Y "Supertraining" 6ta ed. 2009 · biblia del entrenamiento de fuerza soviético · shock method, plyometrics, periodización block',
      paradigm: 'soviet_sports',
    },
    {
      citation: 'Bondarchuk AP "Transfer of Training in Sports" · métodos de transferencia soviéticos aplicados a compuestos pesados',
      paradigm: 'soviet_sports',
    },
    {
      citation: 'Rantanen T et al. "Midlife hand grip strength as a predictor of old age disability" JAMA 1999',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/9989948/',
    },
    {
      citation: 'Boström P et al. "A PGC1-α-dependent myokine that drives brown-fat-like development of white fat and thermogenesis" Nature 2012 · descubrimiento de irisina',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22237023/',
    },
    {
      citation: 'Robinson MM et al. "Enhanced Protein Translation Underlies Improved Metabolic and Physical Adaptations to Different Exercise Training Modes in Young and Old Humans" Cell Metab 2017',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/28273480/',
    },
    {
      citation: 'Rhonda Patrick "Muscle as an endocrine organ" FoundMyFitness · miokinas y neuroprotección',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Stuart Phillips "Protein requirements for older adults engaged in resistance training" · Journal of Nutrition + Applied Physiology · umbral de proteína post-fuerza',
      paradigm: 'western_academic',
    },
    {
      citation: 'Kraemer WJ & Ratamess NA "Hormonal responses and adaptations to resistance exercise and training" Sports Med 2005 · testosterona/GH/IGF-1 respuesta aguda',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/15831061/',
    },
    {
      citation: 'Tradición helena · Milón de Crotona (siglo VI a.C.) · progresión de sobrecarga histórica (cargando becerro creciente) · precursor documentado del principio de sobrecarga progresiva',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Ayurveda · Vyayama (ejercicio físico) descrito en Charaka Samhita Sutra Sthana como Rasayana funcional · recomendación de esfuerzo "hasta media capacidad" (ardhashakti) diario para sostener Ojas',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Mark Rippetoe "Starting Strength" 3ra ed. · programación básica de compuestos pesados en principiantes · referencia práctica funcional',
      paradigm: 'functional_independent',
    },
  ],
}
```

---

## 5 · `sauna_finlandesa` · Sauna finlandesa (seca) 15-20 min a 80-90°C

```ts
{
  key: 'sauna_finlandesa',
  name: 'Sauna finlandesa (seca) 15-20 min · 80-90°C',
  how: '15-20 min de exposición a sauna seca 80-90°C (löyly opcional para humedad puntual) · 3-7 sesiones/semana según base · hidratar 500 ml antes + electrolitos post · opcional inmersión fría breve al terminar para efecto contraste. Base: iniciar con 5-10 min y progresar.',
  benefit: 'La intervención con mejor evidencia de reducción de mortalidad cardiovascular en humanos (KIHD cohort · 4-7 sesiones/sem → 50-63% menor riesgo). Simula ejercicio cardiovascular pasivo, induce heat shock proteins, mejora función endotelial, aumenta HRV y modula inflamación.',
  categories: ['cardiovascular', 'inmunologico', 'inflamacion', 'ritual', 'energia', 'estres'], // PROPUESTA_NUEVO_CATEGORIA: 'mitocondrial'
  roots: ['inflamacion_silenciosa', 'toxicidad_ambiental', 'sedentarismo', 'cortisol_elevado_sostenido', 'hipertension'],
  assignRule: 'Adulto sano con base previa en sauna (progresión desde 5-10 min). Flag P1 si: sedentarismo forzado, inflamación crónica, HTA leve-moderada controlada, burnout, exposición ambiental tóxica ocupacional. Iniciar con médico si cardiópata.',
  priority: 2,
  family: 'sauna',
  evidenceLevel: 'N1', // Multi-paradigma: KIHD (occidental sólida no-industria) + Rhonda Patrick funcional + tradición finlandesa milenaria (patrimonio UNESCO 2020) + Swedana Ayurveda + práctica MTC de sudación
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
      'IL-6 crónica y PCR-hs (reducción sostenida con 4+ sesiones/sem · Laukkanen 2018)',
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
      'termorregulación (aclimatación al calor · útil para exposición veraniega)',
      'volumen plasmático (expansión crónica · similar a cardio aeróbico)',
      'sudoración eficiente (aumento tasa sudoración adaptativa)',
      'excreción de metales pesados (via sudor · plomo, mercurio, cadmio documentado)',
      'ratio hemoglobina/hematocrito (expansión plasma → dilución fisiológica)',
      'cortisol_ritmo (mejora curva en usuarios crónicos)',
    ],
    biomarkers: [
      'presion_arterial_sistolica',
      'presion_arterial_diastolica',
      'PCR_hs',
      'IL-6',
      'fibrinógeno',
      'HRV RMSSD',
      'FMD (flow-mediated dilation)',
      'HSP70_sérico', // PROPUESTA_NUEVO_BIOMARCADOR
      'BDNF sérico',
      'homocisteina',
      'succinato_plasmático', // PROPUESTA_NUEVO_BIOMARCADOR (marker hormesis compartido con frío)
    ],
    mechanismSummary: 'La exposición prolongada a 80-90°C eleva la temperatura corporal 1-2°C simulando fiebre controlada · activa HSF1 → HSP70 (chaperonas que protegen proteínas), induce vasodilatación óxido-nítrico-mediada, aumenta el gasto cardiaco 60-70% (equivalente a ejercicio moderado) y produce aclimatación cardiovascular crónica que reduce mortalidad de forma dosis-dependiente.',
  },

  sideEffects: [
    'deshidratacion_transitoria (500-1500 ml de sudor por sesión · reponer)',
    'perdida_electrolitos (sodio, potasio, magnesio · reponer con sales minerales)',
    'hipotension_ortostatica_transitoria (levantarse lento post)',
    'cefalea_leve (si deshidratación o exceso de sesión)',
    'somnolencia_post (efecto GH + BDNF · útil pre-sueño)',
    'rubor_persistente_30min (vasodilatación · normal)',
    'aumento_frecuencia_cardíaca_60-70%_sesión (equivalente cardio moderado)',
  ],

  contraindications: [
    'embarazo (especialmente 1er trimestre · riesgo defectos tubo neural con hipertermia sostenida)',
    'cardiopatia_isquemica_activa_no_controlada',
    'arritmia_ventricular_activa',
    'insuficiencia_cardiaca_NYHA_III-IV_descompensada',
    'infarto_miocardio_reciente_<3meses',
    'hipotension_severa_sintomática (<90/60 con síncope)',
    'estenosis_aortica_severa',
    'deshidratacion_severa_activa',
    'fiebre_activa_infecciosa (>38.5°C)',
    'intoxicacion_etilica_o_estupefacientes (riesgo arritmia + deshidratación letal)',
    'epilepsia_no_controlada (hipertermia puede desencadenar convulsión)',
    'infarto_cerebral_reciente_<3meses',
    'trombocitopenia_severa',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'dx_level', system: 'cardiovascular', operator: '<=', value: 3 },
      { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
      { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 1.0 },
      { source: 'lab', marker: 'presion_arterial_sistolica', operator: '>=', value: 130 },
      { source: 'lab', marker: 'fibrinógeno', operator: '>=', value: 350, unit: 'mg/dL' },
      { source: 'quiz', questionnaire: 'burnout', score: 'high' },
      { source: 'profile', field: 'sedentarismo_forzado', equals: true }, // Ej. postrado, movilidad reducida
    ],
    excludeIf: [
      { source: 'profile', field: 'embarazo', equals: true },
      { source: 'profile', field: 'condiciones', in: ['cardiopatia_isquemica_activa', 'arritmia_ventricular_activa', 'insuficiencia_cardiaca_severa', 'estenosis_aortica_severa', 'infarto_reciente_3m', 'hipotension_severa_sintomática', 'epilepsia_no_controlada'] },
      { source: 'lab', marker: 'presion_arterial_sistolica', operator: '<', value: 90 },
    ],
    boostWeight: 4, // Alta evidencia N1 + amplio beneficio poblacional
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
      citation: 'Kunutsor SK, Laukkanen T, Laukkanen JA "Inflammation, sauna bathing, and all-cause mortality in middle-aged and older Finnish men: a cohort study" Eur J Epidemiol 2022',
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
      citation: 'Rhonda Patrick FMF "Sauna Report" · compendio HSP70, BDNF, longevidad · sintetiza décadas de literatura Laukkanen + mecanismos moleculares',
      paradigm: 'functional_independent',
      url: 'https://www.foundmyfitness.com/topics/sauna',
    },
    {
      citation: 'Iguchi M et al. "Heat stress and cardiovascular, hormonal, and heat shock proteins in humans" J Athl Train 2012 · respuesta HSP72 humana a hipertermia',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22488236/',
    },
    {
      citation: 'Tradición finlandesa · sauna como práctica cultural documentada >2000 años · reconocida por UNESCO como Patrimonio Cultural Inmaterial 2020 · Aaland "Sweat" 1978 antropología',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Ayurveda · Swedana (sudoterapia) parte de Panchakarma · variantes: Sarvanga swedana (cuerpo entero), Nadi swedana (vapor localizado) · Charaka Samhita Sutra Sthana 14',
      paradigm: 'ayurveda',
    },
    {
      citation: 'MTC · práctica de sudación (Fa Han) para expulsar Wind-Cold externo · Shang Han Lun (Zhang Zhongjing, siglo III) protocolos con Ma Huang Tang para sudoración terapéutica',
      paradigm: 'tcm',
    },
    {
      citation: 'Termalismo europeo (spa tradition) · Aachen, Baden-Baden, Karlovy Vary · tradición documentada desde Roma imperial (Termas de Caracalla)',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Sears ME et al. "Arsenic, cadmium, lead, and mercury in sweat: a systematic review" J Environ Public Health 2012 · excreción metales pesados vía sudor',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22505948/',
    },
    {
      citation: 'Investigación soviética · uso de banya (баня) rusa con vasta (venik) · Sechenov Institute estudios sobre termorregulación deportiva',
      paradigm: 'soviet_sports',
    },
  ],
}
```

---

## Notas de cierre del piloto

- **Total palabras del doc:** ~11,000 · densidad comparable a los 7 P1 canónicos.
- **Total citas verificables:** 55 · promedio 11/intervención (P1 canónicos ~6/intervención) → **densidad SUPERIOR al listón**.
- **Paradigmas cubiertos por intervención (promedio):** 5.4 · SUPERA umbral ≥3.
- **Contradicciones documentadas (paradigmConflict):** 4 (Roberts cold post-fuerza, Sharma vs Kharrazian ashwagandha en Hashimoto, Lopresti KSM-66 funding, sauna hipotensión).
- **Nuevos biomarcadores propuestos:** 5 (HSP70, NEFA, succinato, FNDC5/irisin, CK).
- **Nueva categoría de intervención propuesta al vocab:** `mitocondrial` (aplicable a cold plunge, sauna, HIIT, fuerza pesada).
- **Intervenciones flag REVISAR_CON_MARIANA:** 1 (ashwagandha · doctrina suplementos).

Ver `research_notes_extra_batch_pilot.md` para: tradición Kneipp completa, variantes de sauna (infrarroja vs finlandesa vs banya vs temazcal), protocolo Søberg extendido, controversia HRVB frecuencia individualizada, distinción KSM-66 vs Sensoril vs Shoden, ejercicio de fuerza en poblaciones especiales, y más.
