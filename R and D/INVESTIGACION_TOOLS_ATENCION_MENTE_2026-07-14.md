# INVESTIGACIÓN · Tools de Atención + Función Ejecutiva para Módulo Mente

**Fecha**: 2026-07-14
**Autor**: Cowork (research subagent)
**Contexto**: ATP V1.5 · complementa N-Back Challenge (task #45)
**Consumidor**: Fable (implementación) + Motor de personalización (correlación mind interventions)

---

## 1. Resumen ejecutivo (200 palabras)

Se evaluaron 8 tests neuropsicológicos clásicos con foco en (a) validación móvil, (b) sensibilidad a mind interventions, (c) complementariedad con N-Back visuoespacial, y (d) burden para el usuario (<2 min ideal).

**Recomendación ATP V1.5 — batería mínima de 3 tools que suman ~5 min total**:

1. **PVT-B (Brief Psychomotor Vigilance Task, 3 min)** — gold standard de vigilancia/atención sostenida (Dinges, 1985; Basner 2011). Ultra sensible a sueño, NSDR, cafeína y meditación. Validada en smartphone (Grant 2017; Kay 2013). Métrica clave: número de lapses (RT >500 ms) + RT medio inverso (1/RT).
2. **Stroop Test digital (2 min · ~40 trials)** — gold standard de control inhibitorio (Stroop, 1935). Ultra sensible a slow-paced breathing, mindfulness y ejercicio. Validada en smartphone (Encephalapp; Bajaj 2013). Métrica clave: efecto de interferencia (RT_incongruente – RT_congruente).
3. **Digital TMT-B (60-90 seg)** — gold standard de set-shifting + procesamiento (Reitan, 1958). Validada en tablet (Verma & Dhyani 2025; UX-TMT 2018). Métrica clave: tiempo total + errores.

**Racional del combo**: PVT mide *"¿estás despierto?"*, Stroop mide *"¿puedes inhibir?"*, TMT mide *"¿puedes cambiar de contexto?"*, N-Back mide *"¿puedes mantener y actualizar?"*. Cero solape dimensional, ~5 min total, 3 de las 4 son las más sensibles a las mind interventions ATP.

---

## 2. Tabla comparativa (matriz features)

| Tool | Dimensión cognitiva | Duración | Métrica principal | Móvil validado | Sensibilidad meditación | Sensibilidad sueño | Complejidad Fable |
|------|--------------------|-----------|-------------------|----------------|------------------------|-------------------|--------------------|
| **PVT-B (3 min)** | Vigilancia sostenida · atención básica | 3:00 min | Lapses (>500 ms) + 1/RT | ✅ Alta (Kay 2013; Grant 2017) | Media (NSDR ✅) | ✅✅✅ Gold std | Media (12-16h) |
| **Stroop Test** | Control inhibitorio · interferencia | 1:30-2:00 min | Interferencia (RT_inc – RT_con) | ✅ Alta (Encephalapp) | ✅✅ Alta (breathwork) | Media | Media (10-14h) |
| **TMT-A / TMT-B** | Velocidad procesamiento (A) · set-shifting (B) | 30-90 seg c/u | Tiempo total + errores | ✅ Alta (UX-TMT; TMT App 2025) | Baja-Media | Media | Media-Alta (16-20h) |
| **Simple RT (SRT)** | Atención básica · velocidad motor | 1-2 min | RT medio + SD | ✅ Media (latencia 30-100ms) | Baja | ✅ Alta | Baja (6-8h) |
| **Choice RT (CRT)** | Atención dividida · toma decisión | 2-3 min | RT medio + accuracy | ✅ Media | Media | ✅ Alta | Baja-Media (8-10h) |
| **Digit Span (F/B)** | Memoria trabajo verbal | 3-5 min | Span máximo | ✅ Alta (audio + touch) | Media | Media | Media (12-14h · requiere TTS) |
| **Go/No-Go / CPT** | Atención sostenida + inhibición | 5-15 min | Commissions (falsos +) + omissions | ✅ Media | ✅✅ Alta (MBSR) | Media | Media (12-16h) |
| **Corsi Block-Tapping** | Memoria trabajo visuoespacial | 4-6 min | Span máximo | ✅ Alta (eCorsi 2014) | Media | Baja-Media | Media (12-14h) |
| **N-Back (referencia)** | Memoria trabajo actualizable + atención dual | 3-5 min | d′ · accuracy · RT | ✅ Alta | ✅ Alta | Media | Ya spec'd |

**Ganadoras por criterio**:
- Mejor validación móvil pura: **PVT-B** y **eCorsi**
- Mayor sensibilidad a intervenciones mind: **Stroop** > Go/No-Go > PVT
- Menor burden usuario: **SRT** (1-2 min) > **PVT-B** (3 min) > **Stroop** (2 min) > **TMT** (variable)
- Menor solape con N-Back: **PVT**, **Stroop**, **TMT** (N-Back ya cubre working memory actualizable)
- Peor fit ATP: **Digit Span** (solape parcial con N-Back), **Corsi** (mismo dominio que N-Back visuoespacial), **CPT largo** (>5 min, burden alto)

---

## 3. Deep dive · tools recomendadas

### 3.1 PVT-B (Brief Psychomotor Vigilance Task, 3 min)

**Qué mide**
- Vigilancia sostenida (sustained attention) · el sustrato más básico de todo control atencional.
- Fisiológicamente, refleja actividad del sistema tálamo-cortical de arousal y del locus coeruleus (noradrenérgico).
- El test más sensible del planeta a *sleep debt* y *time-on-task decrement*.

**Duración**
- Versión clásica: 10 min (Dinges 1985) — burden alto, no viable para app diaria.
- Versión Brief (PVT-B): 3 min — Basner et al. 2011 validada · misma sensibilidad al 90% para sleep loss.
- Versión smartphone: 3 min · confirmada sensible a sleep deprivation vs 10-min laptop PVT (Kay et al. 2013; Grant et al. 2017).

**Métricas de output**
- **Lapses**: número de trials con RT > 500 ms · métrica primaria (más sensible que RT medio).
- **1/RT (reciprocal reaction time)**: métrica secundaria más robusta estadísticamente que RT crudo.
- **False starts**: presiones antes de que aparezca el estímulo (impulsividad).
- **Slowest 10% RT**: sensibilidad a los peores momentos (fatigue tail).

**Validación científica**
- Dinges & Powell 1985 — original.
- Basner & Dinges 2011 — Sleep 34(5) — validación de PVT-B (3 min) vs 10 min.
- Kay et al. 2013 (BRM) — validación tablet + smartphone.
- Grant et al. 2017 (BRM) — 3-min smartphone/tablet PVT vs 10-min laptop en 38-h sleep deprivation. Correlación de lapses r=0.87.
- Sleep-2-Peak app (Springer 2017) — validación de PVT tipo-smartphone en extended wakefulness.

**Factibilidad móvil (react native / Expo)**
- **Timing precision es el reto crítico** (ver §5). iOS nativo ~27-33 ms error; Android nativo ~80-97 ms; React Native añade capa.
- El SIGNAL clínico de PVT (lapses = RT >500ms) es MUY superior al ruido de timing (~50 ms), por lo que sigue siendo válido para within-subject deltas.
- Recomendación: implementar handler nativo (Expo Modules) con touchDown timestamp por `PerformanceObserver` o `MotionEvent.getEventTime()` en Android para mejorar precisión.

**Sensibilidad a intervenciones**
- **Sueño**: gold standard · efecto masivo (30-50% más lapses después de 1 noche de privación).
- **NSDR/yoga nidra**: mejora RT y accuracy en 10 min de práctica (Ghai 2024; NSDR 2024 study n=65).
- **Cafeína**: reduce lapses ~40% (dosis 200 mg).
- **Ejercicio agudo**: mejora post-exercise 20-30 min.
- **Meditación**: mejora moderada · más notorio en meditadores experimentados.

**Correlación con mind interventions ATP**
- **NSDR (20 min)**: correlación esperada FUERTE (+) · testear pre/post.
- **Silencio / meditación**: correlación MEDIA-ALTA.
- **Green time**: correlación MEDIA (via reducción de fatiga cognitiva).
- **Respiración slow-paced**: correlación BAJA-MEDIA (más útil para Stroop).

**Complejidad implementación**
- **Media** · 12-16h Fable.
- Assets: stimulus visual (contador ms creciente sobre fondo negro), sound cue opcional.
- Requiere: módulo nativo para timing preciso, ISI (inter-stimulus interval) aleatorio 2-10s, detección de false starts, log de RT por trial en Supabase.

---

### 3.2 Stroop Test digital (2 min)

**Qué mide**
- Control inhibitorio · capacidad de suprimir una respuesta automática (leer la palabra) en favor de una controlada (nombrar el color).
- Fisiológicamente engancha corteza cingulada anterior (ACC) y prefrontal dorsolateral (DLPFC) · red de control conflicto.
- Índice del "sistema 2" de Kahneman.

**Duración**
- Clásico papel: 3 tarjetas · 5 min total.
- Digital breve: 40 trials congruentes + 40 incongruentes = 80 trials en 90-120 seg.

**Métricas de output**
- **Stroop interference**: RT_incongruente – RT_congruente (métrica primaria).
- **Interference accuracy**: %error_incongruente – %error_congruente.
- **RT variability (SD)** en incongruentes.

**Validación científica**
- Stroop 1935 — original.
- Bajaj et al. 2013 (Hepatology) — Encephalapp Stroop smartphone validada.
- Bajaj et al. 2015 — validación como screening de encefalopatía hepática mínima.
- Applied Neuropsychology Adult 2024 — Encephalapp validada en población físicamente activa (r=0.85 con Stroop computerizado).

**Factibilidad móvil (react native / Expo)**
- Alta · Encephalapp corre en iOS y Android desde 2013.
- El efecto de interferencia (~50-150 ms) está al borde del noise floor de timing, pero within-subject deltas son válidos.
- No requiere módulo nativo para MVP · React Native con `Date.now()` en handler de touch alcanza precisión suficiente para lecturas relativas.

**Sensibilidad a intervenciones**
- **Slow-paced breathing (4.5s in / 5.5s out)**: mejora interferencia accuracy significativamente (Frontiers 2019 · Laborde). Sensibilidad **ALTA**.
- **Wim Hof breathing**: mejora RT Stroop (Nature Sci Reports 2025).
- **MBSR 8 semanas**: reduce interferencia 15-25%.
- **Nature exposure**: evidencia MIXTA (algunos estudios positivos, meta análisis 2022 no confirma efecto robusto en Stroop).
- **Ejercicio agudo**: mejora moderada.

**Correlación con mind interventions ATP**
- **Respiración slow-paced (box breathing, resonance)**: correlación FUERTE (+) · debería ser el test primario para validar módulo respiración.
- **Meditación (mindfulness)**: correlación FUERTE (+) a mediano plazo (8+ semanas de práctica).
- **NSDR**: correlación MEDIA.
- **Silencio + green time**: correlación MEDIA.

**Complejidad implementación**
- **Media** · 10-14h Fable.
- Assets: 4 colores × 4 palabras (rojo, azul, verde, amarillo) — genera 16 combinaciones (4 congruentes, 12 incongruentes).
- UI: 4 botones de color en fila inferior · texto centrado · fondo negro.
- Requiere: pseudo-random order (50/50 con no >3 iguales seguidos), log por trial.

**Consideración de idioma**
- App bilingüe → Stroop debe ejecutarse en el idioma dominante del usuario. Si el usuario es bilingüe hay ruido conocido (efecto Simon-Stroop cross-lingual). Recomendación: usar `user_locale` primario.

---

### 3.3 TMT-A y TMT-B digital (60-90 seg cada uno)

**Qué mide**
- **TMT-A**: velocidad de procesamiento visual + rastreo secuencial (1→2→3...→25). Refleja procesamiento cortico-visual.
- **TMT-B**: set-shifting cognitivo (alterna 1→A→2→B→3→C...) · flexibilidad ejecutiva · engancha DLPFC y ACC.
- Índice B-A o cociente B/A aisla el componente de set-shifting.

**Duración**
- Papel clásico: 30-90 seg TMT-A, 60-180 seg TMT-B.
- Digital tablet: mismo rango; algunos estudios reportan ~10% más rápido en digital.

**Métricas de output**
- **Tiempo de completación** (segundos) por parte.
- **Errores** (nodos incorrectos tocados).
- **B-A difference** o **B/A ratio** — índice de set-shifting puro.
- Digital agrega: RT entre nodos, path efficiency, jitter de trazo.

**Validación científica**
- Reitan 1958 — original (Halstead-Reitan Battery).
- UX-TMT 2018 (BMC Psychiatry) — Android app validada en Parkinson y demencia · sensible a decline cognitivo.
- Verma & Dhyani 2025 (Indian J Psych Med · SAGE) — TMT App Android validada en healthy y depressed · r>0.80 con papel.
- Zeng et al. 2023 (JMIR Aging) — combinación paper + electronic TMT para análisis automático.

**Factibilidad móvil**
- **ALTA** · TMT es literalmente un juego de touch-drag; los nodos son grandes (30-50 px), timing no crítico (ms-scale no importante), la métrica es en segundos.
- Ventaja digital: análisis automático de trayectoria (hesitations, jitter) que en papel es imposible.
- Cambridge Brain Sciences confirma corre en touchscreen browser + mobile.

**Sensibilidad a intervenciones**
- **Sueño**: sensibilidad media.
- **Ejercicio aeróbico crónico**: sensibilidad alta (mejora TMT-B).
- **Meditación**: sensibilidad media-alta a largo plazo.
- **Age**: TMT-B es uno de los indicadores más sensibles a envejecimiento normal — útil para el motor Edad ATP.

**Correlación con mind interventions ATP**
- **Meditación crónica**: correlación MEDIA-ALTA para TMT-B.
- **Ejercicio (fitness pilar)**: correlación FUERTE — útil para cross-pilar (Fitness ↔ Mente).
- **Green time**: evidencia moderada.
- **NSDR/respiración**: baja.

**Complejidad implementación**
- **Media-Alta** · 16-20h Fable.
- Requiere: layout de nodos aleatorio pero no-solapado, algoritmo de detección de path correcto, feedback visual (línea que sigue el dedo), soporte de dos versiones (números / números+letras).
- Anti-cheat: 3-5 layouts predefinidos rotados para evitar aprendizaje del patrón.

---

## 4. Correlación esperada con mind interventions ATP (matriz motor)

Esta es la matriz que el motor de personalización debe usar para cruzar mediciones cognitivas ↔ intervenciones.

| Intervención (Mente) | PVT-B | Stroop | TMT-B | N-Back | Peso motor sugerido |
|----------------------|-------|--------|-------|--------|---------------------|
| **NSDR 10-20 min** | ✅✅✅ Alta (agudo) | ✅ Media | ✅ Baja | ✅✅ Media | PVT primario |
| **Meditación mindfulness 8+ sem** | ✅ Media | ✅✅✅ Alta | ✅✅ Media-Alta | ✅✅ Alta | Stroop + N-Back primarios |
| **Slow-paced breathing (6/min)** | ✅ Baja | ✅✅✅ Alta | ✅ Baja | ✅✅ Media | Stroop primario |
| **Silencio / soledad** | ✅ Media | ✅ Media | ✅ Baja | ✅ Baja | PVT primario |
| **Green time / nature exposure** | ✅ Media | ⚠️ Mixta | ✅ Baja | ✅ Media | PVT primario · Stroop opcional |
| **Journal / reflexión** | ✅ Baja | ✅ Baja | ✅ Baja | ✅ Baja | Ninguna primaria — usar autoreporte |

**Regla para el motor**:
- Si el usuario ejecutó **respiración** hoy → medir **Stroop pre/post** (delta esperado + significativo).
- Si el usuario ejecutó **NSDR** hoy → medir **PVT pre/post** (delta esperado + significativo).
- Si el usuario ha meditado ≥40 sesiones en 8 sem → medir **Stroop + N-Back** semanal (delta acumulado esperado).
- Cross-pilar: **fitness** aeróbico crónico → correlaciona con **TMT-B** (útil para dashboard de compound benefit).

---

## 5. Consideraciones críticas de implementación mobile

### 5.1 Timing precision (crítico para PVT y Stroop)

**Evidencia**:
- Simple RT trials 250 ms: 12-40% error (30-100 ms) según device (Schatz 2015).
- iPad y Kindle Fire: 27-33 ms error.
- Samsung y Google Nexus: 81-97 ms error.
- Choice RT trials 1000 ms: solo 3-5% error (más tolerante).
- Frameworks web / React Native: latencia adicional vs código nativo (20-50 ms típico).

**Recomendación para ATP (Expo/RN)**:
1. **PVT y Stroop**: implementar handler nativo con `Expo Modules API` para captura de touch timestamp desde `MotionEvent.getEventTime()` (Android) y `UITouch.timestamp` (iOS). Esto reduce error a rango 5-15 ms.
2. **TMT**: no requiere timing sub-100ms · React Native `Date.now()` suficiente.
3. **N-Back**: mismo criterio que TMT · adecuado con handlers RN.
4. **Reportar timing precision** en cada resultado (metadata) para permitir análisis longitudinal descartando outliers.

### 5.2 Cronotipo + timing del test (baseline confiable)

**Evidencia**:
- Morning types peak ~5.5h post-wake · Evening types peak ~11h post-wake (Facer-Childs 2018).
- Short-term memory peak morning · Long-term memory peak afternoon.
- Efecto de sincronía tiene evidencia mixta pero robusta para tests demandantes.

**Recomendación**:
- El usuario ATP ya tiene **cronotipo** capturado en Braverman + quiz de sueño.
- El motor debe:
  - Sugerir tests cognitivos en la ventana de peak (Oso: 08-11h · Lobo: 15-19h · Léon: 10-12h · Delfín: 11-14h).
  - Registrar `test_run_time` + `chronotype_peak_window` + flag `in_peak_window` (boolean) para el análisis.
  - Comparaciones intra-usuario deben normalizarse por hora del día (baseline por franja horaria si hay ≥5 muestras/franja).

### 5.3 Integración con wearables

**Apple Watch / Oura ring · integración recomendada**:
- **HRV nocturno (RMSSD)** → predictor de PVT del día siguiente (r típico 0.30-0.50). Si HRV está bajo, esperar más lapses. Útil para explicar variación al usuario ("Tu HRV cayó 15% anoche, por eso hoy respondiste más lento").
- **Sleep score / Readiness (Oura)** → mismo uso.
- **Actividad reciente 30 min pre-test** → covariable a controlar (ejercicio agudo mejora RT).
- **Cafeína (input manual o Oura)** → covariable importante.

**Contrato con módulo Salud/Wearables**:
- Cada resultado de test cognitivo debe guardar snapshot de:
  - `hrv_last_night` (ms RMSSD)
  - `sleep_hours_last_night` + `sleep_efficiency`
  - `readiness_score` (Oura) o `sleep_score` (Apple)
  - `exercise_minutes_last_2h`
  - `caffeine_mg_last_4h` (si trackeado)
  - `time_since_wake_hours`

Esto permite al motor construir baselines personalizados y detectar cuándo un delta es real vs explicado por covariables.

---

## 6. Spec preliminar de implementación (Fable · V1.5)

### Prioridad y orden sugerido

**Fase 1** (V1.5 · sprint único · ~30-40h Fable):
1. **PVT-B (3 min)** — 12-16h · gold standard, alta ROI, correlación fuerte con NSDR/sueño.
2. **Stroop Test (2 min)** — 10-14h · alta ROI, correlación fuerte con respiración/meditación.

**Fase 2** (V1.6 · si Fase 1 valida engagement):
3. **TMT-B digital (90 seg)** — 16-20h · útil para Edad ATP + cross-pilar Fitness.

**No implementar en V1 ni V1.5**:
- Digit Span: solape con N-Back, requiere TTS multi-idioma → deuda.
- Corsi Block-Tapping: mismo dominio que N-Back → duplicación.
- Go/No-Go / CPT: burden alto (5-15 min) → matar engagement diario.
- Simple RT / Choice RT solos: PVT-B ya incluye simple RT en su estructura, no aporta más.

### Data model (Supabase)

```sql
-- Ya existe patrón para N-Back (task #45). Extender:

CREATE TABLE IF NOT EXISTS cognitive_test_runs (
  id UUID PRIMARY KEY DEFAULT generateUUID(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('pvt_b', 'stroop', 'tmt_a', 'tmt_b', 'n_back')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Métricas core (JSON polimórfico por test_type)
  metrics JSONB NOT NULL, -- ej. PVT: {lapses, mean_rt, reciprocal_rt, false_starts, slowest_10pct_rt}
                          -- ej. Stroop: {interference_rt, interference_accuracy, mean_rt_congruent, mean_rt_incongruent}

  -- Covariables snapshot (para motor de análisis)
  hrv_last_night_ms REAL,
  sleep_hours_last_night REAL,
  sleep_score INTEGER,
  readiness_score INTEGER,
  exercise_minutes_last_2h INTEGER,
  caffeine_mg_last_4h REAL,
  time_since_wake_hours REAL,

  -- Cronotipo context
  chronotype TEXT, -- oso / lobo / leon / delfin
  in_peak_window BOOLEAN,

  -- Timing precision reporting
  timing_precision_ms REAL, -- estimado por device (calibración inicial)
  platform TEXT, -- ios / android
  device_model TEXT,
  app_version TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cognitive_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cognitive_test_runs_owner_all"
  ON cognitive_test_runs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cognitive_test_runs_user_date
  ON cognitive_test_runs(user_id, started_at DESC);

CREATE INDEX idx_cognitive_test_runs_type
  ON cognitive_test_runs(user_id, test_type, started_at DESC);
```

### Contract del motor de personalización

Después de cada test, `DeviceEventEmitter.emit('cognitive_test_completed', { test_type, delta_vs_baseline_pct })`.

El motor de intervenciones (`interventions/engine.ts`) debe:
1. Comparar métrica primaria vs baseline personal (rolling 14d, misma franja horaria).
2. Si el usuario ejecutó una mind intervention en las últimas 2h (respiración → Stroop; NSDR → PVT), registrar el delta como `intervention_impact.cognitive_delta`.
3. Alimentar el "why" epigenético de la card HOY correspondiente: *"Tu respiración de esta mañana redujo tu tiempo de reacción Stroop 12%. Está funcionando."*

### UX / Flow

**Ubicación**: pilar **Mente** → tab nueva "Medición" o card en HOY "Mide tu enfoque" (contextual: aparece cuando el usuario está en su peak window + no ha corrido test hoy + está estable, no en sesión).

**Flujo mínimo**:
1. Onboarding del test (30 seg tutorial primera vez, skip después).
2. Test (2-3 min).
3. Resultado con:
   - Score bruto (lapses, interference, etc.) en lenguaje humano ("Buen día, 2 lapses").
   - Delta vs tu baseline (%).
   - Contexto: "Estás dentro de tu ventana pico" / "Tu HRV anoche estuvo bajo, es esperable".
   - Sugerencia accionable: "Prueba 4 min de respiración y vuelve a medir en 15 min" (si el score fue subóptimo).

**Cadencia recomendada**:
- Sugerir 1 test/día (rotando entre los 2-3 implementados).
- Nunca forzar. Modo Pro: agendable por ARGOS.
- Free: 3 tests/semana (paywall suave para el resto).

### Anti-fatiga / gaming del test

- Rotar layouts de TMT.
- Rotar orden Stroop.
- ISI aleatorio PVT (2-10 seg).
- Detectar patrones de false start / rushing → discard silencioso con feedback educativo.

### Integración con Edad ATP (motor v2)

- TMT-B es de los mejores predictores de edad cognitiva funcional.
- Después de acumular ≥8 mediciones TMT-B, contribuye al cómputo de Edad ATP con peso `weight: 0.15` en el área "función ejecutiva".
- PVT contribuye al área "vigilancia/sueño" con peso `weight: 0.20`.
- Stroop contribuye al área "control inhibitorio" con peso `weight: 0.15`.

---

## 7. Fuentes verificables

### PVT (Psychomotor Vigilance Task)
- Dinges DF, Powell JW. **Microcomputer analyses of performance on a portable, simple visual RT task during sustained operations**. Behavior Research Methods, Instruments, & Computers. 1985;17:652-655.
- Basner M, Dinges DF. **Maximizing sensitivity of the PVT to sleep loss**. Sleep. 2011;34(5):581-591.
- Kay M et al. **PVT-Touch: adapting a reaction time test for touchscreen devices**. Proc IEEE Pervasive Health. 2013.
- Grant DA, Honn KA, Layton ME, Riedy SM, Van Dongen HPA. **3-minute smartphone-based and tablet-based psychomotor vigilance tests for the assessment of reduced alertness due to sleep deprivation**. Behavior Research Methods. 2017;49(3):1020-1029. [PubMed 27325169](https://pubmed.ncbi.nlm.nih.gov/27325169/)
- Brunet JF et al. **Validation of sleep-2-Peak: A smartphone application that can detect fatigue-related changes in reaction times during sleep deprivation**. Behavior Research Methods. 2017. [Springer link](https://link.springer.com/article/10.3758/s13428-016-0802-5)
- Addressing the Need for Validation of a Touchscreen PVT. [PMC6152888](https://pmc.ncbi.nlm.nih.gov/articles/PMC6152888/)
- Nature Sci Reports 2025 · [Novel mobile app for impaired vigilance](https://www.nature.com/articles/s41598-025-23155-z)

### Stroop Test
- Stroop JR. **Studies of interference in serial verbal reactions**. Journal of Experimental Psychology. 1935;18:643-662.
- Bajaj JS et al. **The Stroop Smartphone Application is A Short and Valid Method to Screen for Minimal Hepatic Encephalopathy**. Hepatology. 2013. [PMC3657327](https://pmc.ncbi.nlm.nih.gov/articles/PMC3657327/)
- Bajaj JS et al. **Validation of EncephalApp, Smartphone-based Stroop Test, for the Diagnosis of Covert Hepatic Encephalopathy**. Clin Gastroenterol Hepatol. 2015. [PMC4234700](https://pmc.ncbi.nlm.nih.gov/articles/PMC4234700/)
- **Encephalapp Stroop: Validity and reliability in physically active subjects**. Applied Neuropsychology: Adult. 2024. [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/23279095.2024.2343024)
- Laborde S et al. **Influence of Slow-Paced Breathing on Inhibition After Physical Exertion**. Frontiers in Psychology. 2019. [PMC6715106](https://pmc.ncbi.nlm.nih.gov/articles/PMC6715106/)

### TMT (Trail Making Test)
- Reitan RM. **Validity of the trail making test as an indicator of organic brain damage**. Percept Mot Skills. 1958;8:271-276.
- **UX-TMT**: A new device-aided cognitive function test. BMC Psychiatry. 2018. [PMC6034323](https://pmc.ncbi.nlm.nih.gov/articles/PMC6034323/)
- Verma R, Dhyani I. **Development and Validation of an Android-based TMT Application in Healthy and Depressed Individuals**. Indian J Psychol Med. 2025 (SAGE). [PMC11572499](https://pmc.ncbi.nlm.nih.gov/articles/PMC11572499/)
- **Combination of Paper and Electronic TMT for Automatic Analysis of Cognitive Impairment**. 2023. [PMC10337362](https://pmc.ncbi.nlm.nih.gov/articles/PMC10337362/)

### Timing precision mobile
- Schatz P et al. **Validating the Accuracy of Reaction Time Assessment on Computer-Based Tablet Devices**. 2015. [PubMed 25612627](https://pubmed.ncbi.nlm.nih.gov/25612627/)
- **The timing precision of iOS and Android apps**. Neurobehavioral Systems. [PDF](https://cdn1.neurobs.com/misc/mobile_timing_poster.pdf)
- **Using Android Smartphones to Collect Precise Measures of Reaction Times to Multisensory Stimuli**. Sensors. 2025. [PMC12526932](https://pmc.ncbi.nlm.nih.gov/articles/PMC12526932/)
- **Accurate Reaction Times on Smartphones: The Challenges of Developing a Mobile PVT**. ACM. [dl.acm.org](https://dl.acm.org/doi/fullHtml/10.1145/3460421.3478818)
- **Characterizing Information Processing With a Mobile Device: Measurement of Simple and Choice Reaction Time**. 2016. [PubMed 26933140](https://pubmed.ncbi.nlm.nih.gov/26933140/)

### Digit Span, Corsi, Go/No-Go (contexto)
- **eCorsi: implementation and testing of the Corsi block-tapping task for digital tablets**. Frontiers in Psychology. 2014. [PMC4151195](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4151195/)
- **Comparison of the touch-screen and traditional versions of the Corsi block-tapping test**. BMC Psychiatry. 2020. [PMC7313222](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7313222/)
- **Cambridge Brain Sciences: Digit Span (DGS)**. [Cambridge Cognition](https://cambridgecognition.com/digit-span-dgs/)
- **Motor and verbal inhibitory control: Go/No-Go app for children with DCD**. Applied Neuropsychology Child. 2020. [Tandfonline](https://www.tandfonline.com/doi/abs/10.1080/21622965.2020.1726178)

### Mind interventions · efectos cognitivos
- **NSDR study n=65 · Applied Psychology Health Well-Being**. 2024. [Ghai — Wiley](https://nyaspubs.onlinelibrary.wiley.com/doi/full/10.1111/nyas.70149)
- **Meditation for cognitive decline · meta-analysis 2013-2024**. [PMC12162321](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12162321/)
- **Functional connectivity changes in meditators during yoga nidra**. Sci Reports 2024. [Nature](https://www.nature.com/articles/s41598-024-63765-7)
- **Improved Sleep, Cognitive Processing and Learning with Yoga Nidra Practice**. medRxiv 2023.
- **Slow yoga breathing improves working memory · 2-back RT**. 2022. [PMC9516310](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9516310/)
- **Resonance Breathing and HRV + Cognitive Functions RCT**. 2022. [PMC8924557](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8924557/)
- **Wim Hof Method breathwork + Stroop**. Nature Sci Reports 2025. [Nature](https://www.nature.com/articles/s41598-025-29187-9)
- Kaplan S, Kaplan R. **The experience of nature: A psychological perspective**. 1989.
- **Attention Restoration Theory systematic review**. J Toxicol Environ Health B Crit Rev. 2016. [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/10937404.2016.1196155)
- **Nature pictures + Stroop attentional control · null result**. J Environ Psychol. 2022. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0272494422001463)

### Chronotype timing
- Facer-Childs ER, Brandstaetter R et al. **The effects of time of day and chronotype on cognitive and physical performance in healthy volunteers**. Sports Med Open. 2018. [PMC6200828](https://pmc.ncbi.nlm.nih.gov/articles/PMC6200828/)
- **Chronotype and synchrony effects · systematic review**. Chronobiology International. 2025. [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/07420528.2025.2490495)
- **Time of day and chronotype in cognitive functions**. 2023. [PMC10683050](https://pmc.ncbi.nlm.nih.gov/articles/PMC10683050/)

### Cambridge Brain Sciences / mobile cognitive batteries
- **Cambridge Brain Sciences Tests Overview**. [PDF](https://tbitherapy.com/wp-content/uploads/2022/05/CBS-Health-Science-Overview.pdf)
- **CBS Test Validity and Reliability**. [PDF](https://welpartners.com/resources/Cambridge-Brain-Sciences-Test-Validity-and-Reliability.pdf)
- **Boston Cognitive Assessment (BOCA) · smartphone longitudinal tracking**. medRxiv 2021.

---

**FIN del documento**

_Consumidor recomendado_: Enrique + Fable. Después de review, romper task #45 (N-Back) en tres nuevos issues: PVT-B implementación, Stroop implementación, TMT (V1.6 backlog).
