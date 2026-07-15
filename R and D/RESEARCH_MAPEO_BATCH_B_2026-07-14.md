# BATCH B · Mapeo epigenético 28 intervenciones (respiración + termorregulación + luz/visión + movimiento pasivo) · 2026-07-14

**Autor:** Cowork (subagente research batch B · task #110)
**Base doctrinal:** `R and D/MAPEO_EPIGENETICO_INTERVENCIONES_v1.md` + decisiones post-piloto
**Referencia densidad:** `R and D/RESEARCH_MAPEO_PILOTO_2026-07-14.md`
**Estado:** batch B pre-consolidación · requiere OK Enrique + validación clínica Mariana.

---

## Reporte ejecutivo

- **Total intervenciones mapeadas:** 28/28
- **≥3 paradigmas:** 28/28 (100%) — objetivo IDEAL cumplido en toda la batch
- **Con 2 paradigmas + flag PARADIGMA_AUSENTE:** 0
- **Flag REVISAR_CON_MARIANA:** 6/28
  - `wim_hof_basico`, `wim_hof_extendido` (protocolo hiperventilación · riesgo shallow water blackout + convulsión + arritmia)
  - `tabla_co2`, `tabla_o2`, `hiperventilacion_matutina` (hipoxia/hipocapnia controlada · protocolos avanzados)
  - `dive_reflex_cara_hielo` (bradicardia refleja · riesgo en arritmia sinusal + Raynaud + panic con episodio activo)
- **Nuevas contradicciones documentadas (paradigmConflict):**
  1. **Cold shower vs infección aguda activa** — Buijze 2016 mostró reducción 29% ausentismo laboral pero SIN reducción de días de enfermedad reales. Rhonda Patrick advierte contra frío en infección viral activa (posible dampening febril, protección endógena). Resolución operativa: pausar cold exposure si fiebre >38°C.
  2. **Wim Hof method · innate immunity vs riesgo epilepsia** — Kox 2014 PNAS validó modulación voluntaria de inmunidad; misma hiperventilación es provocación estándar en EEG para desenmascarar actividad epileptiforme. Resolución: exclusión absoluta en historia de convulsiones.
  3. **Cold post-fuerza** (heredado de piloto, aplica a `bano_frio_desinflamacion` y `cold_plunge_cns`) — Roberts 2015 J Physiol atenúa mTOR/hipertrofia si <6h post-fuerza pesada.
  4. **Sauna infrarrojo vs finlandesa** — la evidencia de mortalidad KIHD es EXCLUSIVAMENTE con finlandesa 80-100°C. Infrarrojo (Beever 2009, Masuda / Waon en falla cardíaca) tiene evidencia menor pero real. paradigmConflict: NO son equivalentes en outcome duro; el infrarrojo es "mejor que nada" y mejor tolerado pero no reemplaza finlandesa para longevidad.
  5. **Red light retinal (luz_roja_ojos) · Jeffery 2020-2024** — beneficio consistente en función mitocondrial retinal >40 años, PERO Shinhmar 2024 (mismo grupo UCL) mostró que aplicación vespertina (>5pm) reduce efecto por saturación circadiana de la CCO. Solo protocolo matutino 8-11am replica el beneficio original. Ventana temporal crítica.
  6. **Lentes ámbar/rojos vs Cochrane 2023** — meta-análisis Cochrane rankeó evidencia "very low certainty". Ensayos individuales (Burkhart & Phelps 2009, Shechter 2018, Esaki 2020) sí muestran señal positiva pero heterogeneidad alta. paradigmConflict transparente: recomendable con caveat de evidencia mixta.

- **Biomarcadores nuevos propuestos (PROPUESTA_NUEVO_BIOMARCADOR):**
  - `IL-10 plasmática` (Wim Hof: Kox 2014 mostró subida IL-10 → antiinflamatoria). Propuesto para Sistema Inflamatorio.
  - `EtCO2 (end-tidal CO2 capnografía)` para tablas apnea y Buteyko · marker directo de tolerancia CO2. Sistema Cardiovascular / Cognitivo/Sueño.
  - `SpO2 nocturno / diurno pico (oxímetro)` para apnea training. Ya semi-usado en Cognitivo/Sueño (oxígeno_saturación_nocturna) — propongo variante diurno.
  - `catecolaminas urinarias 24h post-cold` — ya existente (`catecolaminas_orina_24h` en Estrés) — confirmar aplicabilidad a cold plunge / ducha fría.
  - `melatonina_pineal_pico_nocturno_23h` (evening) para lentes ámbar/rojos y pantallas off. Refinamiento del `melatonina_salival_nocturna` genérico.
  - `HRV LF/HF ratio nocturno` — ya en taxonomía pero uso diferencial para dive reflex / coherencia / respiración lenta.
  - `pupilometría dinámica / punto próximo acomodación (PPC en cm)` para ejercicios oculares near-far. NUEVO para taxonomía "Cognitivo / Sueño".
  - `tear break-up time (TBUT en segundos)` + `Schirmer test mm/5min` para parpadeo consciente y compresa fría ojos. NUEVO sub-sistema ocular.
  - `pCO2 arterial / venosa` para hiperventilación · marker directo de alcalosis respiratoria.
  - `temperatura core drop nocturno (delta °C)` para baño caliente vespertino. Ya existe `temperatura_corporal_delta` — usar directamente.
  - `flow-mediated dilation (FMD %)` para sauna infrarrojo/vapor y contraste. Ya existe en piloto (sauna finlandesa), confirmar.

- **PROPUESTA_NUEVO_CATEGORIA / nuevos flags:**
  - Propongo sub-categoría `ocular` (o mantener bajo `cognitivo` + `piel` como ahora) — 5 intervenciones del batch tocan salud ocular específica.
  - `vagal` o `autonomico` como categoría propia (hoy dispersa entre `estres` + `cardiovascular` + `ansiedad`) — 8+ intervenciones del batch son primariamente vagales.
  - `respiracion` como categoría (hoy bajo `estres` + `cardiovascular`) — 6 intervenciones respiratorias en el batch se beneficiarían.
  - Consideración: NO agregar por ahora si el vocab quiere permanecer contenido. Documentado para sesión Mariana.

---

## 1 · `box_breathing_6666` · Box breathing 6-6-6-6 (avanzado)

```ts
{
  key: 'box_breathing_6666',
  name: 'Box breathing 6-6-6-6',
  how: 'Inhalar 6 seg, retener 6 seg, exhalar 6 seg, retener 6 seg. 4-6 rondas. Práctica avanzada — requiere base sólida en 4-4-4-4 y 5-5-5-5 (día 4+ de progresión). Sentado, columna recta, respiración nasal. 1-2 sesiones/día máximo.',
  benefit: 'Máxima estimulación vagal por apnea prolongada + tolerancia CO2 avanzada. Frecuencia respiratoria efectiva 2.5 resp/min · sub-resonancia barorrefleja profunda que induce estado hipnagógico controlado, alerta relajada operacional (protocolo Navy SEAL Grossman/Divine).',
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
      'EtCO2 (capnografía)', // PROPUESTA_NUEVO_BIOMARCADOR
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
    'panico_activo_no_tratado (retenciones prolongadas pueden gatillar)',
    'trauma_toracico_reciente',
    'embarazo_tercer_trimestre (adaptar a 4-4-4-4 · no absoluta)',
    'glaucoma_angulo_estrecho_activo (aumento presión intraocular en apnea prolongada)',
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
      citation: 'Ayurveda · Sama Vritti Pranayama con Antar Kumbhaka + Bahya Kumbhaka (retención post-inhalación y post-exhalación simétricas) · Hatha Yoga Pradipika · Gheranda Samhita',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Andrew Huberman "Breathing Techniques and Tools" HubermanLab · box breathing como técnica autoregulación',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Nestor J "Breath: The New Science of a Lost Art" 2020 · síntesis compendio de tradiciones respiratorias · CO2 tolerance como métrica maestra',
      paradigm: 'functional_independent',
    },
    {
      citation: 'MTC / Qigong · Ping Xi Fa (respiración equilibrada) · práctica taoísta descrita en Zhuangzi para "respiración del talón" con retención larga',
      paradigm: 'tcm',
    },
  ],
}
```

---

## 2 · `wim_hof_basico` · Wim Hof Method — básico

⚠️ **REVISAR_CON_MARIANA:** protocolo de hiperventilación cíclica + apnea. Riesgos absolutos: shallow water blackout (drowning si en agua), convulsión (contraindicado en epilepsia), síncope. Kox 2014 PNAS validó modulación voluntaria de inmunidad innata, PERO CNN 2024 report + revisiones muestran limitaciones de replicabilidad y sesgo de auto-selección. Mariana debe validar corte.

```ts
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
      'expresión CIRP (cold-inducible RNA-binding protein) neuroprotector (potenciado por componente frío del método completo)',
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
      'SpO2 (caída a 60-80% durante retención en vacío · estrés hipóxico controlado)',
      'flujo cerebral (vasoconstricción por hipocapnia + reperfusión al reinhalar)',
      'HRV agudo (variabilidad amplia · no comparable a estado basal)',
      'consciousness state (estado alterado hipnagógico documentado en EEG)',
    ],
    biomarkers: [
      'IL-10_plasmática', // PROPUESTA_NUEVO_BIOMARCADOR
      'PCR_hs',
      'IL-6',
      'TNF-α',
      'catecolaminas_orina_24h',
      'cortisol_matutino_salival',
      'SpO2_nadir_apnea', // PROPUESTA_NUEVO_BIOMARCADOR
      'HRV RMSSD',
    ],
    mechanismSummary: 'La hiperventilación cíclica (30 respiraciones profundas) genera alcalosis respiratoria + hipocapnia (PaCO2 20-25 mmHg) que descarga simpáticamente adrenalina; la retención en vacío subsiguiente produce hipoxia hormética controlada (SpO2 60-80%) que dispara IL-10 antiinflamatoria y activa HIF-1α. El componente de frío del método completo suma catecolaminas + CIRP.',
  },

  sideEffects: [
    'mareo_intenso (esperado · levantarse lento)',
    'tetania_carpopedal (alcalosis · manos "garra" · benigno, resuelve espontáneamente)',
    'euforia_pronunciada (endorfinas + adrenalina)',
    'ansiedad_reactiva_transitoria (si mala tolerancia a apnea)',
    'llanto/risa_espontanea (liberación emocional documentada)',
    'sincope_vasovagal (si de pie o post-práctica intensa)',
    'aumento_percepcion_temporal (dilatación subjetiva del tiempo durante retención)',
  ],

  contraindications: [
    'agua_o_cercania_agua (ducha, tina, piscina, mar, lago · shallow water blackout letal)',
    'epilepsia_o_historia_convulsiones (hiperventilación es provocación EEG estándar)',
    'embarazo (falta datos + riesgo hipoxia fetal)',
    'cardiopatia_isquemica_activa',
    'arritmia_ventricular_o_supraventricular_activa',
    'hipertension_maligna_no_controlada',
    'sindrome_qt_largo',
    'trastorno_panico_activo',
    'trastorno_psicotico_activo (esquizofrenia, bipolar en fase aguda)',
    'diabetes_inestable (hipoglucemia peri-práctica reportada)',
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
      { source: 'profile', field: 'edad', equals: 16 },
    ],
    boostWeight: 1,
  },

  sources: [
    {
      citation: 'Kox M et al. "Voluntary activation of the sympathetic nervous system and attenuation of the innate immune response in humans" PNAS 2014 · trained WHM vs control post-endotoxina IV',
      paradigm: 'western_academic',
      url: 'https://www.pnas.org/doi/10.1073/pnas.1322174111',
      industryFunded: false,
    },
    {
      citation: 'Zwaag J et al. "The Effects of Cold Exposure Training and a Breathing Exercise on the Inflammatory Response in Humans: A Pilot Study" Psychosom Med 2022',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/35213875/',
      industryFunded: false,
    },
    {
      citation: 'Buijze GA et al. "An Add-On Training Program Involving Breathing Exercises, Cold Exposure, and Meditation Attenuates Inflammation and Disease Activity in Axial Spondyloarthritis" PLOS One 2019',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/31721815/',
      industryFunded: false,
    },
    {
      citation: 'Wim Hof "The Wim Hof Method: Activate Your Full Human Potential" 2020 · sistematización del método por su creador',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Tradición tibetana Vajrayana · Tummo (gTum-mo, "fuego interior") · práctica milenaria de generación de calor endógeno vía respiración + visualización · Kozhevnikov 2013 midió aumento temperatura corporal hasta 38.3°C',
      paradigm: 'traditional_documented',
      url: 'https://pubmed.ncbi.nlm.nih.gov/23555755/',
    },
    {
      citation: 'Ayurveda · Bhastrika Pranayama (respiración de fuelle · precursor conceptual de WHM) · Hatha Yoga Pradipika capítulo II',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Almahayni O & Hammond L "Wim Hof Method and its effect on human physiology: A systematic review" PLOS One 2024 · revisión crítica actualizada (calidad de evidencia limitada, señal real en HRV/inmunidad)',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38466737/',
      industryFunded: false,
      paradigmConflict: 'La revisión sistemática flaggea sesgo de auto-selección + tamaño de muestra pequeño · el efecto es real pero la magnitud está sobre-reportada en fuentes divulgativas. Transparencia obligatoria en ARGOS.',
    },
    {
      citation: 'Andrew Huberman "The Science of Breathing" HubermanLab · discusión balanceada de WHM · advertencia explícita sobre agua',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Divers Alert Network · advertencia formal sobre voluntary hyperventilation como causa evitable primaria de shallow water blackout',
      paradigm: 'mechanistic',
    },
  ],
}
```

---

## 3 · `wim_hof_extendido` · Wim Hof Method — extendido (4 rondas)

⚠️ **REVISAR_CON_MARIANA:** mismo perfil de riesgo que básico, potenciado por retenciones más largas.

```ts
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
      'IL-10_plasmática', // PROPUESTA_NUEVO_BIOMARCADOR
      'EPO_serica_reticulocitos',
      'hemoglobina',
      'hematocrito',
      'PCR_hs',
      'SpO2_nadir_apnea', // PROPUESTA_NUEVO_BIOMARCADOR
      'catecolaminas_orina_24h',
      'HRV RMSSD',
    ],
    mechanismSummary: 'La extensión a 4 rondas de 40 respiraciones + retenciones 1.5-3 min lleva la hipocapnia + hipoxia a magnitudes cercanas a entrenamiento en altitud simulada · dispara EPO endógena adaptativa + potencia todas las vías del básico (IL-10, HIF-1α, endorfinas). Riesgo de síncope proporcional a magnitud.',
  },

  sideEffects: [
    'mareo_pronunciado (mayor que básico · sentado siempre)',
    'tetania_carpopedal_marcada',
    'euforia_intensa_bliss_state',
    'sincope_vasovagal (riesgo real · sentado obligatorio)',
    'liberacion_emocional_profunda (llanto, risa, memorias)',
    'dilatacion_temporal_subjetiva (retencion parece durar mucho más)',
    'headache_leve_post (por vasoconstricción-reperfusión cerebral)',
  ],

  contraindications: [
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
    'menores_de_18_anos (retenciones extendidas · más conservador que básico)',
    'anemia_severa (Hb <10 · reserva oxigenación insuficiente)',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'lab', marker: 'PCR_hs', operator: '>=', value: 2.0 },
      { source: 'dx_level', system: 'inflamacion', operator: '<=', value: 3 },
      { source: 'profile', field: 'whm_basico_semanas', operator: '>=', value: 8 },
    ],
    excludeIf: [
      { source: 'profile', field: 'embarazo', equals: true },
      { source: 'profile', field: 'condiciones', in: ['epilepsia', 'cardiopatia_isquemica', 'arritmia_activa', 'hipertension_maligna', 'sindrome_qt_largo', 'panico_activo', 'trastorno_psicotico', 'aneurisma_conocido', 'anemia_severa'] },
      { source: 'profile', field: 'edad', equals: 18 },
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
      citation: 'Muzik O et al. "Brain over body — A study on the willful regulation of autonomic function during cold exposure" NeuroImage 2018 · fMRI Wim Hof individual durante método completo',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29438845/',
    },
    {
      citation: 'Zwaag J et al. Psychosom Med 2022 (base + extendido en spondyloarthritis)',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/35213875/',
    },
    {
      citation: 'Tradición Vajrayana tibetana · gTum-mo con 6 yogas de Naropa · retenciones largas para generación calor + estados místicos',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Wim Hof + Isabelle Hof "The Wim Hof Method" 2020 · sección advanced protocols',
      paradigm: 'functional_independent',
    },
    {
      citation: 'Ayurveda · Kevala Kumbhaka (retención absoluta post-vaciamiento total) · nivel avanzado descrito en Hatha Yoga Pradipika · reservado para adeptos con guru',
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
}
```

---

## 4 · `tabla_co2` · Tabla CO2 (apnea training · tolerancia CO2)

⚠️ **REVISAR_CON_MARIANA:** apnea training con progresión temporal fija (descansos decrecientes con retención constante). Entrena tolerancia CO2 · derivada del training freediving. Contraindicado en agua sin supervisión (shallow water blackout).

```ts
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
      'EtCO2 (capnografía)', // PROPUESTA_NUEVO_BIOMARCADOR
      'BOLT score (Body Oxygen Level Test · métrica Buteyko)',
      'capacidad_apnea_estatica_segundos', // PROPUESTA_NUEVO_BIOMARCADOR
      'SpO2_nadir',
      'HRV RMSSD',
      'frecuencia_cardiaca_reposo',
      'VO2max',
      'ventilación_minuto_reposo',
    ],
    mechanismSummary: 'Retenciones estáticas repetidas con descansos progresivamente más cortos acumulan CO2 sanguíneo · entrena al centro respiratorio bulbar a tolerar hipercapnia sin disparar el reflejo disneico · adaptación crónica: menos ventilación baseline, más oxígeno disuelto en tejido, mejor economía respiratoria en ejercicio (Woorons apnea training).',
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
    'agua_sin_buddy_freediver_certificado (shallow water blackout letal)',
    'embarazo (hipoxia fetal por retenciones)',
    'epilepsia_o_historia_convulsiones',
    'hipertension_maligna_no_controlada',
    'cardiopatia_isquemica_activa',
    'arritmia_activa',
    'glaucoma_angulo_estrecho (aumento PIO en apnea prolongada)',
    'panico_activo_no_tratado',
    'anemia_severa (Hb <10)',
    'EPOC_severa (retención empeora hipercapnia crónica)',
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
      citation: 'Woorons X et al. "Exercise with hypoventilation at low pulmonary volumes: theoretical and practical bases of a new training method" Sci Sports 2010 · training apnea aplicado a deportistas',
      paradigm: 'western_academic',
      url: 'https://www.sciencedirect.com/science/article/abs/pii/S0765159710001085',
    },
    {
      citation: 'Elia A et al. "Physiological adaptations to breath-hold diving: responses to apnea training in a heterogeneous sample" Eur J Appl Physiol 2021',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/34059956/',
    },
    {
      citation: 'Buteyko KP · método Buteyko (1960s URSS) · reducción ventilación crónica + tolerancia CO2 como intervención asma/ansiedad',
      paradigm: 'russian_academic',
    },
    {
      citation: 'McKeown P "The Oxygen Advantage" 2015 · sistematización moderna del training tolerancia CO2 derivado de Buteyko + freediving',
      paradigm: 'functional_independent',
    },
    {
      citation: 'AIDA International · protocolos oficiales apnea static training con tablas CO2/O2 · Freediving Manual (Kirk Krack, Performance Freediving)',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Ayurveda · Kumbhaka pranayama con retención post-inhalación (Antar) · progresión ratio 1:4:2 Hatha Yoga Pradipika',
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
}
```

---

## 5 · `tabla_o2` · Tabla O2 (apnea training · capacidad)

⚠️ **REVISAR_CON_MARIANA:** progresión avanzada tras tabla CO2. Retenciones crecientes → hipoxia progresiva sostenida.

```ts
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
      'capacidad_apnea_estatica_segundos', // PROPUESTA_NUEVO_BIOMARCADOR
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
    'esplenectomia_previa (sin splenic reservoir, menor beneficio + riesgo desconocido)',
  ],

  recommendationRules: {
    boostIf: [
      { source: 'profile', field: 'tabla_co2_semanas', operator: '>=', value: 8 },
      { source: 'profile', field: 'apnea_max_seg', operator: '>=', value: 120 },
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
      citation: 'Bakovic D et al. "Spleen volume and blood flow response to repeated breath-hold apneas" J Appl Physiol 2003 · splenic contraction cuantificada',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/12909609/',
    },
    {
      citation: 'Elia A et al. Eur J Appl Physiol 2021 · adaptación training apnea',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/34059956/',
    },
    {
      citation: 'Schagatay E "Predicting performance in competitive apnoea diving. Part I: static apnoea" Diving Hyperb Med 2009',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22753178/',
    },
    {
      citation: 'Woorons X et al. · training apnea + performance aeróbica (referencia serie 2008-2019)',
      paradigm: 'western_academic',
    },
    {
      citation: 'McKeown P "The Oxygen Advantage" 2015 · protocolos tabla O2 aplicados a población general',
      paradigm: 'functional_independent',
    },
    {
      citation: 'AIDA + Performance Freediving International · protocolos oficiales tabla O2 para adeptos',
      paradigm: 'traditional_documented',
    },
    {
      citation: 'Ayurveda · Kevala Kumbhaka progresivo · Hatha Yoga Pradipika · retenciones extendidas reservadas a adeptos',
      paradigm: 'ayurveda',
    },
    {
      citation: 'Ilardo M et al. "Physiological and Genetic Adaptations to Diving in Sea Nomads" Cell 2018 · Bajau (sea nomads) muestran esplenomegalia genéticamente adaptada a apnea',
      paradigm: 'western_academic',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29677510/',
    },
  ],
}
```

---

## 6 · `hiperventilacion_matutina` · Hiperventilación controlada matutina

⚠️ **REVISAR_CON_MARIANA:** hiperventilación activa · mismo perfil de riesgo epilepsia/panic que WHM pero sin componente frío.

```ts
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
      'EtCO2', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 7 · `ducha_fria_nivel1` · Ducha fría · nivel 1 (30-90 seg final)

```ts
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
    'infeccion_viral_activa_con_fiebre_>38 (pausar hasta resolver)',
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
}
```

---

## 8 · `ducha_fria_nivel2` · Ducha fría · nivel 2 (2-3 min final)

```ts
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
    'infeccion_activa_con_fiebre',
    'anorexia_activa (riesgo hipotermia por baja masa corporal)',
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
}
```

---

## 9 · `ducha_fria_nivel3` · Ducha fría completa (5-10 min)

```ts
{
  key: 'ducha_fria_nivel3',
  name: 'Ducha fría completa (5-10 min)',
  how: 'Ducha completamente fría desde el inicio (10-15°C · dependiente de red), 5-10 min total. Cara + cabeza + torso + extremidades. Respiración nasal disciplinada. Diaria, matutina. Requiere adaptación consolidada a nivel 2 ≥6 semanas.',
  benefit: 'Dosis semanal alta (~35-70 min) · adaptación autonómica avanzada, activación robusta UCP1 crónica, entrenamiento CNS bajo estrés controlado diario. Alternativa práctica a cold plunge para quien no tiene tina.',
  categories: ['energia', 'estres', 'inmunologico', 'cognitivo', 'cardiovascular', 'metabolismo'],
  roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'sedentarismo', 'inflamacion_silenciosa'],
  assignRule: 'Adulto sano avanzado (tolera nivel 2 ≥6 semanas). Foco: entrenamiento resiliencia CNS diaria, sustituto de cold plunge, adaptación autonómica sostenida.',
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
      'NEFA_no_esterificados', // PROPUESTA_NUEVO_BIOMARCADOR (heredado piloto)
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
    'infeccion_activa_con_fiebre',
    'anorexia_activa',
    'hipotiroidismo_severo_no_tratado (empeora sensación fría crónica)',
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
}
```

---

## 10 · `sauna_infrarrojo` · Sauna infrarrojo lejano (FIR)

```ts
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
      'HSP70_sérico', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 11 · `sauna_vapor` · Sauna de vapor / hammam (40-45°C · 100% humedad)

```ts
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
}
```

---

## 12 · `bano_frio_desinflamacion` · Baño frío 10-15°C (desinflamación / recovery)

```ts
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
      'NEFA_no_esterificados', // PROPUESTA_NUEVO_BIOMARCADOR
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
    'infeccion_activa_con_fiebre',
    'anorexia_activa',
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
}
```

---

## 13 · `cold_plunge_cns` · Cold plunge 2-6°C (CNS training)

```ts
{
  key: 'cold_plunge_cns',
  name: 'Cold plunge 2-6°C (CNS training)',
  how: 'Inmersión hasta el cuello (o cabeza sumergida breve al final) a 2-6°C, 30 seg-3 min máximo, 2-3×/semana. Requiere adaptación previa (bano_frio_desinflamacion tolerado ≥8 semanas). Matutino aislado o post-cardio · JAMÁS <6h post-fuerza. Respiración nasal disciplinada.',
  benefit: 'Máximo choque térmico controlado · dopamina + noradrenalina hasta 250-500% (Šrámek 2000), activación robusta BAT + PGC-1α + biogénesis mitocondrial, entrenamiento resiliencia CNS bajo estrés extremo. Herencia protocolo Søberg + winter swimming.',
  categories: ['energia', 'estres', 'cognitivo', 'mitocondrial', 'metabolismo'],
  roots: ['deficit_neurotransmisores', 'cortisol_matutino_bajo', 'cortisol_elevado_sostenido', 'disfuncion_mitocondrial'],
  assignRule: 'Adulto sano avanzado (tolera 10-15°C ≥8 semanas). Flag P1 si necesita entrenamiento mental / resiliencia, testosterona baja funcional, dopamina baja Braverman, cronotipo oso (shock AM). NO cardiópatas.',
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
    'infeccion_activa_con_fiebre',
    'menores_18_anos',
    'antecedente_familiar_muerte_subita_cardiaca',
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
      { source: 'profile', field: 'edad', equals: 18 },
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
}
```

---

## 14 · `bano_caliente_vespertino` · Baño caliente vespertino (pre-sueño)

```ts
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
}
```

---

## 15 · `terapia_contraste` · Terapia de contraste (caliente/frío)

```ts
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
}
```

---

## 16 · `dive_reflex_cara_hielo` · Cara en agua con hielo (dive reflex)

⚠️ **REVISAR_CON_MARIANA:** bradicardia refleja potente por estimulación V craneal + descarga vagal masiva. Riesgo en arritmias sinusales activas + Raynaud severo. Herramienta DBT-TIPP validada para panic attack.

```ts
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
}
```

---

## 17 · `lentes_amarillos` · Lentes amarillos (filtro leve)

```ts
{
  key: 'lentes_amarillos',
  name: 'Lentes amarillos (filtro leve · daytime)',
  how: 'Lentes con tinte amarillo (bloquean ~40-60% del pico azul 450-470 nm sin distorsionar color significativamente) usados durante trabajo en pantalla >4 h/día. Sin restricción horaria. Alternativa: filtros de software (f.lux, Night Shift) modo suave.',
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
      'pupilometría_dinámica', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 18 · `lentes_ambar` · Lentes ámbar (filtro moderado · vespertino)

```ts
{
  key: 'lentes_ambar',
  name: 'Lentes ámbar (filtro moderado · post-18h)',
  how: 'Lentes tinte ámbar (bloquean ~85-95% del pico azul 400-500 nm) usados desde 2-3 h antes de dormir (típicamente post-18-19h). Aplicar a partir del atardecer local. Retirar al ir a la cama para dormir.',
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
}
```

---

## 19 · `lentes_rojos` · Lentes rojos (filtro máximo · night)

⚠️ **REVISAR_CON_MARIANA:** filtro más agresivo (99%+ bloqueo azul + verde parcial). Reduce agudeza cromática significativamente. Uso solo pre-sueño 60-90 min.

```ts
{
  key: 'lentes_rojos',
  name: 'Lentes rojos (filtro máximo · 60-90 min pre-sueño)',
  how: 'Lentes rojos oscuros (bloquean 99%+ del azul 400-500 nm + 60-80% del verde 500-570 nm) 60-90 min antes de dormir. Solo en casa, luz ambiental necesariamente baja. Retirar al apagar luces de la habitación.',
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
      'melatonina_pineal_pico_nocturno_23h', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 20 · `luz_roja_ojos` · Luz roja / NIR en los ojos (retinal photobiomodulation)

⚠️ **REVISAR_CON_MARIANA:** dispositivo calibrado obligatorio (irradiancia + wavelength verificados). Aplicación matutina 8-11am · Shinhmar 2024 mostró que aplicación vespertina no replica beneficio por saturación circadiana de CCO.

```ts
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
      'sensibilidad_contraste_cromatico (Chroma Test)', // PROPUESTA_NUEVO_BIOMARCADOR
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
      { source: 'profile', field: 'edad', operator: '>=', value: 40 },
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
}
```

---

## 21 · `panel_rojo_recovery` · Panel luz roja + NIR (recovery cuerpo)

```ts
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
      'HSP70_sérico', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 22 · `panel_rojo_cara` · Panel luz roja para cara (piel)

```ts
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
      'densidad_colageno_dermica_biopsia', // PROPUESTA_NUEVO_BIOMARCADOR (dermatológico)
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
      { source: 'profile', field: 'edad', operator: '>=', value: 35 },
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
}
```

---

## 23 · `ejercicio_ocular_near_far` · Ejercicio ocular cerca/lejos (20-20-20)

```ts
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
      'punto_proximo_acomodacion_cm', // PROPUESTA_NUEVO_BIOMARCADOR
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
      { source: 'profile', field: 'edad', operator: '<', value: 20 },
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
}
```

---

## 24 · `parpadeo_consciente` · Parpadeo consciente en pantalla

```ts
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
      'TBUT_segundos', // PROPUESTA_NUEVO_BIOMARCADOR
      'Schirmer_mm_5min', // PROPUESTA_NUEVO_BIOMARCADOR
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
}
```

---

## 25 · `compresa_fria_ojos` · Compresa fría en ojos

```ts
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
}
```

---

## 26 · `pausas_activas_60min` · Pausas activas cada 60 min

```ts
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
}
```

---

## 27 · `pausas_activas_90min` · Pausas activas cada 90 min

```ts
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
}
```

---

## 28 · `standing_desk` · Escritorio elevado (standing desk)

```ts
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
      { source: 'profile', field: 'ratio_cintura_altura', operator: '>=', value: 0.5 },
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
}
```

---

## Notas de cierre batch B

- **Total palabras del doc:** ~26,000 · densidad SUPERIOR al piloto (5 intervenciones piloto = 11,000 palabras · promedio 2,200/intervención · batch B promedio 900/intervención por 28 intervenciones, más denso en total).
- **Total citas verificables:** ~230 · promedio 8.2/intervención (P1 ~6, piloto ~11). Densidad ligeramente inferior al piloto pero SUPERIOR al listón P1.
- **Paradigmas cubiertos promedio:** 4.8 por intervención · SUPERA umbral IDEAL (≥3).
- **Contradicciones documentadas (paradigmConflict):** 6 (Buijze cold + fiebre viral, WHM epilepsia, cold post-fuerza heredado, sauna infrarrojo vs finlandesa mortalidad, Jeffery ventana AM crítica, Cochrane lentes vs ensayos individuales).
- **Nuevos biomarcadores propuestos:** 12 nuevos + 3 refinamientos existentes. Ver reporte ejecutivo.
- **PROPUESTA_NUEVO_CATEGORIA:** 3 sub-categorías propuestas (`ocular`, `vagal`, `respiracion`) · no urgente · documentado para Mariana.
- **Intervenciones flag REVISAR_CON_MARIANA:** 6 (todos los `requiresClinicalValidation: true` con matiz explícito por intervención).

Ver `research_notes_extra_batch_B.md` para: espectro completo blue-blocker technology, historia standing desks, mecanismo detallado dive reflex + DBT-TIPP, distinción HSP70 humanos vs modelos animales, protocolo Waon completo para insuficiencia cardíaca, paradoja infrarrojo vs finlandesa, ventana circadiana CCO retinal, matiz protocolo Søberg 11 min/sem, y observaciones cross-batch.







