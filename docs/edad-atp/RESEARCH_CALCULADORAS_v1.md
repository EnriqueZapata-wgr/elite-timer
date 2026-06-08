# EDAD ATP — Research de Calculadoras Complementarias v1

**Fecha:** 2026-06-07
**Autor:** Research agent (Claude)
**Objetivo:** Mapear calculadoras accesibles de edad biológica/funcional para complementar el blend actual ATP (PhenoAge 25% + SF 75% + ajustes corporales sexo-específicos).
**Filtro duro:** solo métodos con labs estándar / báscula inteligente / wearables / cuestionarios / tests caseros. Excluidos: epigenética, telómeros, MRI, tests propietarios > $100 USD.

---

## 1. Resumen ejecutivo

Investigué 23 calculadoras y frameworks. El hallazgo principal es que el blend ATP actual (PhenoAge + SF con 10 dominios + ajustes corporales) ya cubre la **dimensión sistémica** (inflamación + metabolismo + función renal/hepática). Las brechas reales del modelo están en:

1. **Sub-edad cardiovascular funcional** (no por labs, sino por **rendimiento aeróbico real**). El **Fitness Age de Nes/Wisløff (NTNU/HUNT)** es el complemento más limpio y costo-trivial: usa edad, sexo, perímetro de cintura, frecuencia de ejercicio y FC reposo — todos inputs que ya capturamos o son triviales de capturar. Predice mortalidad mejor que la edad cronológica.
2. **Sub-edad neuromotora (balance + fuerza + potencia)** capturable con tests caseros: el **10-second one-leg stand (Araujo 2022)** y el **Sitting-Rising Test (SRT, Araujo 2014)** son los dos predictores de mortalidad más potentes accesibles sin equipo. El **push-up >40 (Yang/Harvard 2019)** es el equivalente cardiovascular para hombres activos.
3. **Sub-edad cardiometabólica granular** con HOMA-IR + ASCVD Pooled Cohort Equation + Framingham Heart Age. Las tres son fórmulas públicas, validadas en cohortes grandes y triviales de implementar.

Top recomendaciones Tier 1: **Fitness Age (Nes/NTNU)**, **10-second Balance Test (Araujo)**, **Sitting-Rising Test (SRT)**, **HOMA-IR**, y **Framingham Heart Age**. Estas cinco cubren las tres dimensiones débiles del blend actual con inputs que ya tienes o cuestan <2h cada una de implementar.

Hallazgo importante: **Aging.AI, InsideTracker InnerAge, Bryan Johnson Blueprint y DunedinPACE son cajas negras propietarias** o requieren tests epigenéticos. Útiles como referencia conceptual, no implementables como fórmula propia. Lo único reproducible del lado de los "frameworks de gurús" es la idea de **sub-tests funcionales** (Centenarian Decathlon de Attia) — que es exactamente lo que esta investigación recomienda construir.

---

## 2. Tabla comparativa

| # | Calculadora | Dimensión | Inputs clave | Fórmula pública | Validación | Accesibilidad | Costo impl. |
|---|---|---|---|---|---|---|---|
| 1 | **Klemera-Doubal (KDM)** | Sistémica | 5-8 biomarkers + edad | Sí (compleja, en R) | Levine 2013, comparación gold-standard | Media (necesita training set) | Alto |
| 2 | **PhenoAge (Levine 2018)** | Sistémica | 9 labs + edad | Sí — incluida abajo | NHANES, n>11k, 25y FU | Media (CBC + química) | YA INTEGRADO |
| 3 | **Levine BioAge 2013** | Sistémica | 10 biomarkers + edad | Parcial (paper original) | NHANES III | Media (incluye FEV1, CMV) | Medio |
| 4 | **Aging.AI 3.0 (Insilico)** | Sistémica | CBC + química clínica | NO (deep neural net cerrado) | n>130k bloods | Alta inputs, NA fórmula | N/A |
| 5 | **InsideTracker InnerAge 2.0** | Sistémica | 17M/13F biomarkers | NO (KDM adaptado propietario) | Sin peer-review | Alta inputs | N/A |
| 6 | **Homeostatic Dysregulation (Cohen)** | Sistémica | 12-20 biomarkers | Sí (Mahalanobis distance) | Múltiples cohorts | Media | Alto |
| 7 | **Frailty Index (Rockwood/UK Biobank)** | Sistémica | 36-49 items autoreporte | Sí (suma normalizada) | UK Biobank n>500k | Alta (cuestionario) | Medio |
| 8 | **Allostatic Load Index** | Sistémica | 10 biomarkers (CV+metabólico+inmune) | Sí (puntos dicotómicos) | NHANES, múltiples | Media | Medio |
| 9 | **Framingham Heart Age** | Cardiovascular | Edad, sexo, TC, HDL, PAS, fumador, diabetes | Sí (β coef públicos) | Framingham, n>3.5k, 12y FU | Alta | Trivial |
| 10 | **ASCVD Pooled Cohort Eq.** | Cardiovascular | Edad, sexo, raza, TC, HDL, PAS, tx HTN, diabetes, fumador | Sí (AHA/ACC 2013) | Cohorts integrados, n>24k | Alta | Trivial |
| 11 | **Fitness Age — Nes/NTNU** | Cardiovascular/Atlética | Edad, sexo, RHR, cintura, frecuencia ejercicio, intensidad | Sí (HUNT VO2max model) | HUNT3, n>4.6k direct VO2 | Alta | Trivial |
| 12 | **VO2max norms (ACSM/Cooper)** | Atlética | VO2max medido o estimado, edad, sexo | Lookup tables públicos | Cooper ACL, n>80k | Media (necesita VO2max) | Medio |
| 13 | **Personal Activity Intelligence (PAI)** | Atlética | HR data semanal | Sí (HUNT, Nes/Wisløff) | HUNT n>39k validación | Alta (wearable) | Medio |
| 14 | **HRV "Physiological Age"** | CV/autonómica | RMSSD, mean RR | Parcial (Kubios, varias) | Centenarios SDNN | Alta (wearable) | Medio |
| 15 | **Resting Heart Rate biological hazard** | CV | RHR | Sí (HR de 10bpm = 22%/19% HR mortalidad) | UK Biobank, n>692k | Trivial | Trivial |
| 16 | **HOMA-IR** | Metabólica | Glucosa ayuno + insulina ayuno | Sí: G×I/405 | Estándar global | Alta | Trivial |
| 17 | **Metabolic Age (BMR-based)** | Metabólica | Peso, talla, edad, sexo (a veces %grasa) | Sí (Harris-Benedict, Mifflin) | Validez débil como "edad" | Trivial | Trivial |
| 18 | **Grip Strength edad/sarcopenia (EWGSOP2/AWGS2019)** | Fuerza | Dinamómetro | Cutoffs públicos (27kg M / 16kg F) | Múltiples consensos | Alta | Trivial |
| 19 | **FFMI normas** | Composición | Peso, %grasa, talla | Sí (FFM/talla²) | Cohorts BIA/DXA | Alta (báscula) | YA INTEGRADO |
| 20 | **Sitting-Rising Test (SRT — Araujo)** | Neuromotora | Test casero 0-10 puntos | Sí (rubric protocolo) | Brasil n>2k, 12y FU | Trivial (test 1 min) | Trivial |
| 21 | **10-sec One-Leg Stand (Araujo 2022)** | Balance | Test casero binario | Sí (binario pasa/falla) | Brasil n=1702, 11y FU | Trivial | Trivial |
| 22 | **Push-up >40 (Yang/Harvard 2019)** | Cardiovascular funcional | Test push-ups continuos | Sí (5 categorías) | n=1104 firefighters, 10y FU | Trivial (solo hombres validado) | Trivial |
| 23 | **SPPB (Short Physical Performance Battery)** | Geriátrica | Gait + sit-stand + balance | Sí (0-12 score) | NIA/InCHIANTI múltiples cohorts | Media | Medio |
| 24 | **Gait Speed (sixth vital sign)** | Geriátrica/CV | Tiempo 4-6m | Sí (m/s) | Health ABC + meta-análisis | Trivial | Trivial |
| 25 | **Plank Test endurance** | Core/fuerza | Tiempo segundos | Normas por edad | Pequeños estudios | Trivial | Trivial |
| 26 | **5x Sit-to-Stand** | Función inferior | Tiempo segundos | Normas por edad | Múltiples | Trivial | Trivial |
| 27 | **Reaction Time / Processing Speed** | Cognitiva | Test app/web | Lookup por edad | Deary-Liewald, MindCrowd | Trivial (web tool) | Medio (UI) |
| 28 | **FRAX** | Ósea | Edad, sexo, peso, talla, fx previas, fx familiar, tabaco, alcohol, GC, AR, BMD opcional | Sí (WHO tool) | Cohorts globales | Media (cuestionario) | Medio |
| 29 | **LIBRA score (brain health)** | Cognitiva | 12 factores de estilo de vida | Sí (pesos públicos) | Maastricht + UK Biobank | Media (cuestionario) | Medio |
| 30 | **Healthy Aging biomarker model (Earls et al.)** | Sistémica | MAP, HbA1c, cintura, FEV1, VO2max, adipo, HDL, TC, suPAR | Sí (paper) | Cross-sectional | Media (suPAR caro) | Alto |

> Nota: "YA INTEGRADO" indica componentes que el blend ATP ya considera y se incluyen para completitud.

---

## 3. Detalle por calculadora

### 3.1 Klemera-Doubal Method (KDM)

- **Autor/inst.:** Klemera & Doubal (2006), Czech Academy of Sciences.
- **Inputs:** combinación variable (5-10 biomarkers + edad). Implementación típica: colesterol total, triglicéridos, HbA1c, urea, creatinina, hs-CRP, plaquetas, PAS.
- **Fórmula:** minimiza la distancia entre m líneas de regresión y m puntos de biomarcadores en espacio m-dimensional. Dos variantes: BE (usa CA solo para derivar parámetros) y BEC (incorpora CA como biomarker adicional). Implementación de referencia en R: `bjb40/bioage` y `dayoonkwon/BioAge` (GitHub). Requiere training set (típicamente NHANES III) → aplicación a test set.
- **Cobertura:** sistémica integradora.
- **Validación:** estándar de oro académico desde 2006, mejor performance vs Hochschild en estudios comparativos. UK Biobank validación 2019.
- **Accesibilidad:** Media. Requiere panel de 5-10 labs + entrenar el modelo en cohort de referencia.
- **Costo impl.:** **Alto** (>10h). Necesitas hostear NHANES o cohort de referencia, recalcular coeficientes y validar. La fórmula no es una ecuación cerrada simple.
- **Veredicto:** redundante con PhenoAge. NO recomendado salvo para Tier 3 / paper interno.

### 3.2 PhenoAge (Levine 2018) — YA INTEGRADO

- **Autor/inst.:** Morgan Levine et al., Yale.
- **Inputs (9):** albumina (g/dL), creatinina (mg/dL), glucosa (mg/dL), CRP (mg/L), linfocitos%, MCV (fL), RDW (%), ALP (U/L), WBC (10³/μL), edad.
- **Fórmula:**
  ```
  xb = -19.9067
       - 0.0336 * albumin
       + 0.0095 * creatinine
       + 0.1953 * glucose
       + 0.0954 * ln(CRP)
       - 0.0120 * lymphocyte_pct
       + 0.0268 * MCV
       + 0.3306 * RDW
       + 0.00188 * ALP
       + 0.0554 * WBC
       + 0.0804 * age

  gamma = 0.0076927
  M = 1 - exp(-exp(xb) * (exp(120*gamma) - 1) / gamma)
  PhenoAge = 141.50225 + ln(-0.00553 * ln(1-M)) / 0.090165
  ```
- **Validación:** NHANES III/IV, n>11k, 25y follow-up. Predice all-cause mortality mejor que edad cronológica.
- **Status ATP:** YA INTEGRADO con peso 25% en blend final.

### 3.3 Levine BioAge 2013 (predecesor PhenoAge)

- **Autor/inst.:** Levine 2013, JoG Series A.
- **Inputs (10):** albumina, ALP, BUN, creatinina, CRP, CMV optical density, HbA1c, colesterol total, PAS, FEV1.
- **Fórmula:** KDM-based con coeficientes específicos del paper original.
- **Cobertura:** sistémica.
- **Validación:** NHANES III, predicción mortalidad.
- **Accesibilidad:** Media. CMV optical density y FEV1 son inputs difíciles para consumer apps.
- **Costo impl.:** **Medio** (5-8h) si quieres reproducir el KDM con coeficientes publicados.
- **Veredicto:** redundante con PhenoAge (que es su evolución directa). Saltar.

### 3.4 Aging.AI 3.0 (Insilico Medicine)

- **Autor/inst.:** Insilico Medicine (2016+).
- **Inputs:** CBC con diferencial + química clínica (~40 parámetros).
- **Fórmula:** Deep neural network. **NO pública.**
- **Validación:** n>130k blood tests anonimizados.
- **Status actual:** servicio público posiblemente discontinuado.
- **Veredicto:** no implementable como propio. Útil como referencia conceptual.

### 3.5 InsideTracker InnerAge 2.0

- **Autor/inst.:** InsideTracker (Segterra).
- **Inputs:** 17 biomarkers hombres / 13 mujeres.
- **Fórmula:** KDM adaptado + dataset propio. **NO pública.**
- **Validación:** sin peer-review formal.
- **Veredicto:** no implementable como propio. Confirmar que enfocarse en KDM público (entrenado con tu cohort beta ATP) sería superior por transparencia.

### 3.6 Homeostatic Dysregulation (Cohen et al.)

- **Autor/inst.:** Alan Cohen, U. Sherbrooke / Columbia.
- **Inputs:** 12-20 biomarkers (sub-panel sistémico).
- **Fórmula:** distancia de Mahalanobis al centroide de una referencia "joven y sana" en espacio multidimensional. Pública en papers (eBioMedicine 2021).
- **Cobertura:** sistémica multi-sistema.
- **Validación:** múltiples cohorts (NHANES, China, occidental).
- **Accesibilidad:** Media.
- **Costo impl.:** **Alto** (>10h). Necesitas calcular y mantener matrices de covarianza por sexo/edad.
- **Veredicto:** académicamente sólido pero redundante con PhenoAge para fines de UI consumer. Considerar para v2.0+.

### 3.7 Frailty Index (Rockwood / UK Biobank)

- **Autor/inst.:** Rockwood et al. (concepto), UK Biobank 49-item adaptación (Williams et al. 2018).
- **Inputs:** 36-49 ítems de autoreporte (síntomas, condiciones, medicamentos, función diaria).
- **Fórmula:** FI = Σ déficits / N total. Cada déficit codificado 0-1 según severidad.
- **Cobertura:** sistémica multidimensional (frailty syndrome).
- **Validación:** UK Biobank n>500k. Asociado a mortalidad, COVID-19, hospitalizaciones.
- **Accesibilidad:** Alta (cuestionario).
- **Costo impl.:** **Medio** (5-8h por UI de 49 preguntas). Pero altamente complementario a tu SF.
- **Veredicto:** **Tier 2.** Excelente candidato para módulo "Riesgo de Fragilidad" en ATP SOL.

### 3.8 Allostatic Load Index (ALI)

- **Autor/inst.:** McEwen & Seeman 1997+ (concepto). Múltiples implementaciones NHANES.
- **Inputs:** 10 biomarkers en 3 categorías:
  - Cardiovascular: PAS, PAD
  - Metabólico: HDL, HbA1c, colesterol total, BMI, ratio cintura/cadera
  - Inmune: CRP, IL-6, fibrinógeno
- **Fórmula:** cada biomarcador codificado 0/1 según si está en cuartil alto-riesgo (típicamente >75th percentil). Score = suma simple (0-10). ALI alto = ≥3 biomarcadores en alto-riesgo.
- **Cobertura:** carga acumulada de estrés crónico.
- **Validación:** múltiples cohorts.
- **Accesibilidad:** Media. IL-6 puede ser difícil.
- **Costo impl.:** **Medio**.
- **Veredicto:** **Tier 2.** Aporta lente complementario al PhenoAge (estrés crónico vs aging) con biomarkers que ya tienes o puedes capturar.

### 3.9 Framingham Heart Age

- **Autor/inst.:** D'Agostino et al. 2008, Framingham Heart Study.
- **Inputs:** edad, sexo, colesterol total, HDL, PAS, fumador (sí/no), tratamiento HTN (sí/no), diabetes (sí/no).
- **Fórmula:** modelo de Cox con coeficientes β publicados. Risk 10y mujeres: 1 - 0.95012^exp(ΣβX - 26.1931). Hombres: 1 - 0.88936^exp(ΣβX - 23.9802). "Heart Age" = edad del individuo de mismo sexo cuyo riesgo coincide.
- **Cobertura:** **Edad cardiovascular**.
- **Validación:** Framingham n>3.5k, 12y FU.
- **Accesibilidad:** **Alta**.
- **Costo impl.:** **Trivial** (<2h).
- **Veredicto:** **Tier 1**. Inputs ya disponibles en panel ATP.

### 3.10 ASCVD Pooled Cohort Equations (AHA/ACC 2013)

- **Autor/inst.:** Goff et al. 2013, ACC/AHA.
- **Inputs:** edad, sexo, raza (B/W), colesterol total, HDL, PAS, tx HTN, diabetes, fumador.
- **Fórmula:** β-coeficientes por sexo y raza, pública.
- **Cobertura:** Riesgo 10y ASCVD (IM, ACV, muerte CHD).
- **Validación:** integración de ARIC, CHS, Framingham, CARDIA; n>24k.
- **Accesibilidad:** Alta.
- **Costo impl.:** **Trivial**.
- **Veredicto:** **Tier 1**. Aporte: convierte riesgo en "edad equivalente" (ej: tu riesgo a los 45 = el de uno de 58). Complementario a Framingham Heart Age.

### 3.11 Fitness Age — Nes/NTNU/HUNT

- **Autor/inst.:** Bjarne Nes & Ulrik Wisløff, NTNU/CERG (Norwegian).
- **Inputs:** edad, sexo, perímetro cintura, frecuencia ejercicio (x/semana), intensidad ejercicio, FC reposo.
- **Fórmula:** modelo de regresión non-exercise para VO2max. Luego mapea VO2max a normas poblacionales por edad/sexo. "Fitness Age" = edad del que tendría tu VO2max promedio.
- **Cobertura:** **Edad cardiorrespiratoria/atlética**.
- **Validación:** HUNT3 sub-study, n=4631 con VO2max medido directo en treadmill + cohort n=39298. Predice mortalidad mejor que edad cronológica.
- **Accesibilidad:** **Alta**. Ningún input requiere lab ni equipo especial.
- **Costo impl.:** **Trivial** (<2h). Calculator público en ntnu.edu/cerg/vo2max.
- **Veredicto:** **Tier 1 #1 prioridad**. Sin duda la pieza más limpia que tu blend NO captura hoy.

### 3.12 VO2max ACSM Norms (Cooper Institute)

- **Autor/inst.:** Cooper Institute Aerobic Center Longitudinal Study (ACSM reference tables).
- **Inputs:** VO2max (medido o estimado), edad, sexo.
- **Fórmula:** lookup tables percentiles 20/40/60/80/95.
- **Cobertura:** **Edad atlética** (fitness percentile).
- **Validación:** n>80k treadmill tests.
- **Accesibilidad:** Media. Necesita VO2max (preferiblemente vía Nes o wearable).
- **Costo impl.:** **Medio** (lookup tables + matching a edad biológica).
- **Veredicto:** **Tier 2**. Si ya implementas Nes (que genera VO2max), las ACSM norms son el "lookup espejo".

### 3.13 Personal Activity Intelligence (PAI)

- **Autor/inst.:** Nes & Wisløff, NTNU.
- **Inputs:** datos HR semanales (de wearable), edad, sexo, RHR, FCmax.
- **Fórmula:** PAI ≥100/sem = perfil cardiovascular protector. HUNT, Nes 2017.
- **Cobertura:** **Cardiometabólica funcional** dinámica (semanal).
- **Validación:** HUNT n>39k, China Kadoorie Biobank.
- **Accesibilidad:** Alta (con wearable).
- **Costo impl.:** **Medio** (5-10h, ingesta HR streams). Mi Band/Garmin/Apple Watch ya lo proveen.
- **Veredicto:** **Tier 2**. Métrica de adherencia al ejercicio cardiovascular, no edad pura. Útil como gamificación.

### 3.14 HRV "Physiological Age"

- **Autor/inst.:** múltiples (Kubios, Welltory, ZOE), basado en RMSSD/SDNN normas.
- **Inputs:** RMSSD nocturno o matutino, mean RR, edad.
- **Fórmula:** HRV normalizada = RMSSD / √mean_RR. Comparación con tabla de normas por edad.
- **Cobertura:** Edad autonómica/CV.
- **Validación:** centenarians SDNN <19ms = mortalidad temprana.
- **Accesibilidad:** Alta (wearable: Whoop, Oura, Apple Watch).
- **Costo impl.:** **Medio** (5-8h). Requiere ingesta HRV diaria + tabla de normas.
- **Veredicto:** **Tier 2**. Útil sobre todo como tracking de intervención (mejora con sueño/respiración/ejercicio).

### 3.15 Resting Heart Rate biological hazard

- **Autor/inst.:** múltiples cohorts (UK Biobank, ARIC, Kailuan).
- **Inputs:** RHR.
- **Cobertura:** CV / general mortality.
- **Validación:** UK Biobank n>692k. Hazard +22%/+10bpm en hombres, +19% en mujeres (all-cause mortality).
- **Fórmula:** no como "edad" cerrada, sino como ajuste de hazard.
- **Accesibilidad:** Trivial.
- **Costo impl.:** **Trivial**.
- **Veredicto:** **Tier 2.** Más como variable input de tu blend que como sub-edad independiente.

### 3.16 HOMA-IR

- **Autor/inst.:** Matthews et al. 1985 (homeostasis model).
- **Inputs:** glucosa ayuno + insulina ayuno.
- **Fórmula:** US units: HOMA-IR = (glucosa_mgdl × insulina_uUml) / 405. SI units: divisor 22.5.
- **Cobertura:** **Resistencia a insulina / metabólica**.
- **Validación:** estándar global.
- **Cutoffs:** <1.0 normal, 1.0-1.9 insulinosensibilidad bordeline, >1.9 RI temprana, >2.9 RI significativa.
- **Accesibilidad:** Alta (ya pides glucosa; agregar insulina ayuno cuesta poco).
- **Costo impl.:** **Trivial**.
- **Veredicto:** **Tier 1**. Indispensable para tu pilar metabólico (Tribu ATP avatar insulinorresistente).

### 3.17 Metabolic Age (BMR-based)

- **Autor/inst.:** Tanita, Omron etc. (basado en Harris-Benedict 1919 / Mifflin-St Jeor 1990).
- **Inputs:** peso, talla, edad, sexo (a veces %grasa).
- **Fórmula:** Harris-Benedict hombres: BMR = 66.5 + 13.75×peso_kg + 5.003×talla_cm − 6.775×edad. Mujeres: BMR = 655.1 + 9.563×peso_kg + 1.850×talla_cm − 4.676×edad. "Metabolic age" = edad cuyo BMR coincide.
- **Cobertura:** energía basal (no metabólica real).
- **Validación:** débil como "edad". Es marketing más que ciencia.
- **Costo impl.:** Trivial pero **NO recomendable**: cualquier persona con más músculo aparece "más joven" sin ser cierto desde el ángulo metabolismo glucosa/lípidos.
- **Veredicto:** **Tier 3 — descartar**. Engaña a usuarios.

### 3.18 Grip Strength (Sarcopenia EWGSOP2/AWGS2019)

- **Autor/inst.:** Cruz-Jentoft et al. (EWGSOP2 2019), Chen et al. (AWGS2019).
- **Inputs:** fuerza máxima de prensión dinamómetro (kg).
- **Cutoffs:** <27kg hombres, <16kg mujeres = riesgo sarcopenia (EWGSOP2 y AWGS2019 alineados).
- **Cobertura:** **Edad de fuerza / sarcopenia**.
- **Validación:** consensos europeo + asiático.
- **Accesibilidad:** Trivial con dinamómetro (Camry $25 USD).
- **Costo impl.:** Trivial.
- **Veredicto:** **Tier 1.** Convertir a "edad de fuerza" usando normas por edad/sexo de NHANES/UK Biobank.

### 3.19 FFMI Normas — YA INTEGRADO

- Cutoffs: 17.5 kg/m² hombres, 14.6 kg/m² mujeres como screening sarcopenia (Yang 2024).
- **Status ATP:** YA INCLUIDO en ajuste corporal.

### 3.20 Sitting-Rising Test (SRT, Araujo et al.)

- **Autor/inst.:** Claudio Gil Araujo (Brasil) 2014, European Journal of Preventive Cardiology.
- **Inputs:** test casero. Sentarse en suelo desde de pie y levantarse. Scoring 0-10 (5 sentarse + 5 levantarse). Resta 1 punto por usar mano/antebrazo/rodilla/apoyo, 0.5 por inestabilidad.
- **Cobertura:** **Edad neuromuscular integrada** (fuerza inferior + flexibilidad + balance + composición).
- **Validación:** Brasil n>2k, 12y FU. Mortalidad por causas naturales 3.8x mayor en score bajo, 6x mayor CV. Score 10 → mortalidad 3.7% vs score 0-4 → 42.1%.
- **Accesibilidad:** Trivial (test 1 min en casa).
- **Costo impl.:** **Trivial** (<2h). UI scoring + tabla de mortalidad-equivalente.
- **Veredicto:** **Tier 1.** Potentísimo predictor en test corto. Highly recommended como widget HOY mensual.

### 3.21 10-second One-Leg Stand (Araujo 2022)

- **Autor/inst.:** Araujo et al. 2022, British Journal of Sports Medicine.
- **Inputs:** test binario casero. Pararse en una pierna 10s sin agarrarse.
- **Cobertura:** **Edad de balance**.
- **Validación:** Brasil n=1702, 51-75y, 11y FU. Mortalidad 17.5% en quienes fallan vs 4.6% en quienes pasan. HR=1.84 ajustado por edad/sexo/BMI/comorbilidades.
- **Accesibilidad:** Trivial.
- **Costo impl.:** **Trivial**.
- **Veredicto:** **Tier 1.** Test ultra rápido con altísima señal de mortalidad.

### 3.22 Push-up >40 (Yang/Harvard 2019)

- **Autor/inst.:** Justin Yang et al., Harvard T.H. Chan SPH 2019, JAMA Network Open.
- **Inputs:** número máximo de push-ups continuos.
- **Cobertura:** Edad CV funcional (predicción 10y CVD events).
- **Validación:** n=1104 firefighters hombres, 10y FU. >40 push-ups = 96% reducción CVD events vs <10. Solo validado en hombres adultos activos.
- **Accesibilidad:** Trivial.
- **Costo impl.:** **Trivial**.
- **Veredicto:** **Tier 1 hombres / Tier 2 mujeres** (sin validación específica para mujeres en el paper original).

### 3.23 SPPB (Short Physical Performance Battery)

- **Autor/inst.:** Guralnik et al. NIA 1994.
- **Inputs:** balance test (10s pies juntos/tandem) + gait speed 4m + 5x sit-to-stand. Score 0-12.
- **Cobertura:** Edad geriátrica integrada.
- **Cutoffs:** ≤9 predice mortalidad. 0-3 muy bajo, 4-6 bajo, 7-9 intermedio, 10-12 alto.
- **Validación:** múltiples cohorts (InCHIANTI, Health ABC).
- **Accesibilidad:** Media (necesita espacio + cronómetro).
- **Costo impl.:** **Medio** (5h).
- **Veredicto:** **Tier 2** para usuarios 60+. Sobreingeniería para avatar ATP 35-55.

### 3.24 Gait Speed (sixth vital sign)

- **Autor/inst.:** Studenski et al. 2011 (JAMA), múltiples cohorts.
- **Inputs:** tiempo en caminar 4-6m a paso usual.
- **Fórmula:** distancia / tiempo = m/s.
- **Cobertura:** mortality, edad funcional.
- **Validación:** meta-análisis 48 cohorts n=101,945. Cada -0.1 m/s = +12% mortalidad. <0.8 m/s = movilidad limitada.
- **Accesibilidad:** Trivial.
- **Costo impl.:** Trivial.
- **Veredicto:** **Tier 2** para 50+. Underrated. Considerar wearable-based (steps/min).

### 3.25 Plank Test

- **Inputs:** segundos manteniendo posición plancha.
- **Normas:** edad 30-40 → >75s bueno. Decline ~10-15% por década post-35.
- **Validación:** estudios pequeños, no Tier 1 evidence.
- **Costo impl.:** Trivial.
- **Veredicto:** **Tier 2** como métrica de core fitness para gamificación.

### 3.26 5x Sit-to-Stand

- **Inputs:** tiempo en 5 repeticiones sentarse-pararse.
- **Normas por edad:** 20-29 → 6.0s | 40-49 → 7.6s | 60-69 → 7.8s | 70-79 → 9.3s | 80+ → 10.8s.
- **Cobertura:** fuerza piernas + balance.
- **Validación:** Bohannon meta-analyses.
- **Accesibilidad:** Trivial.
- **Costo impl.:** Trivial.
- **Veredicto:** **Tier 1 alternativa a SRT** si no tienes espacio para sentarse en suelo. SRT más informativo pero 5xSTS más estandarizado.

### 3.27 Reaction Time / Processing Speed

- **Tools:** Deary-Liewald Reaction Time Task (validado académicamente), MindCrowd, Human Benchmark.
- **Inputs:** tiempo medio reacción simple y de elección (ms).
- **Decline con edad:** simple +1-2ms/año, choice +2-3.4ms/año.
- **Cobertura:** **Edad cognitiva accesible sin MRI**.
- **Validación:** múltiples cohorts académicos.
- **Accesibilidad:** Alta (web/mobile tool).
- **Costo impl.:** **Medio** (10h UI + lookup norms).
- **Veredicto:** **Tier 2**. Único proxy cognitivo viable sin MoCA presencial.

### 3.28 FRAX (Fracture Risk Assessment Tool)

- **Autor/inst.:** WHO Collaborating Centre, U. Sheffield 2008.
- **Inputs:** edad, sexo, peso, talla, fx previa, fx parental, fumador actual, glucocorticoides, AR, alcohol ≥3 UI/día, BMD opcional.
- **Cobertura:** Riesgo 10y fractura mayor osteoporótica + cadera.
- **Validación:** cohorts globales.
- **Accesibilidad:** Media (cuestionario corto).
- **Costo impl.:** **Medio** (5h + integración).
- **Veredicto:** **Tier 2** (relevante para mujeres post-menopausia, no avatar core ATP). Considerar para módulo CICLO en perimenopausia.

### 3.29 LIBRA Score (Lifestyle for Brain Health)

- **Autor/inst.:** Schiepers et al. Maastricht U.
- **Inputs:** 12 factores: cardiopatía, ERC, diabetes, obesidad, HTA, hipercolesterolemia, alcohol, tabaco, sedentarismo, dieta, depresión, inactividad cognitiva. Score −5.9 a 12.7.
- **Cobertura:** Riesgo demencia / edad cognitiva proxy.
- **Validación:** Maastricht + UK Biobank n>500k, 10y FU. OR=1.20 por punto.
- **Accesibilidad:** Alta (cuestionario).
- **Costo impl.:** **Medio** (5-8h).
- **Veredicto:** **Tier 2 / Nice-to-have**. Buen complemento al SF (varios items se solapan).

### 3.30 Healthy Aging Biomarker Model (Earls et al. / similar)

- **Inputs:** MAP, HbA1c, cintura, FEV1, VO2max, adiponectina, HDL, TC, suPAR.
- **Fórmula:** modelo lineal de bioage publicado.
- **Costo impl.:** Alto (suPAR y FEV1 son inputs no-triviales).
- **Veredicto:** **Tier 3**. Demasiados inputs raros para consumer.

---

## 4. Frameworks de gurús (NO calculadoras, sino lentes conceptuales)

### Peter Attia — Centenarian Decathlon / Medicine 3.0

- **Framework:** define 10 tareas físicas que quieres poder hacer a los 90+. Cada tarea define un "training requirement" hoy.
- **Métricas clave:** VO2max (cita reducción 70-80% mortalidad de quintil bajo a quintil alto), grip strength, hip extension power, balance, mobility.
- **4 horsemen:** enfermedad cardiovascular ASCVD, cáncer, neurodegeneración, metabolismo (DM2/RI).
- **Recomendación:** úsalo como **narrativa de gamificación**, no como fórmula. Construye "ATP Decathlon" con tus tests (SRT + Balance + Push-up + Grip + Gait).

### Bryan Johnson Blueprint — Speed of Aging

- **Métrica:** DunedinPACE (epigenética, EXCLUIDA por filtro).
- **Útil de aprender:** publica todos sus marcadores (>100). Imitable como UI de "scorecard mensual" sin la epigenética.

### David Sinclair — Information Theory of Aging

- **Métricas:** glucosa, lípidos, CRP regulares + epigenetic clocks (excluidos).
- **Útil:** validación filosófica de que tracking sistémico mensual importa.

### Mark Hyman — Functional Medicine / Function Health

- **Panel core:** >100 biomarkers/año. Énfasis en insulin, vit D, particle size LDL, advanced lipid panel, thyroid, inflammación, nutrientes.
- **Implementable:** alinearse con su filosofía es lo que ya hacen, no aporta calculadora nueva.

### Aubrey de Grey — SENS

- **Framework:** 7 tipos de daño celular. No es un sistema de medición; es un sistema de intervención conceptual.
- **No implementable** como calculadora.

---

## 5. Programas de investigación abiertos relevantes

- **UK Biobank:** Frailty Index 49-item (Williams 2018), biological age (Mak 2023), gait speed, grip strength normas. Datos públicos para validación.
- **Health and Retirement Study (HRS):** ofrece "biological age" calculado con KDM + Levine. Inputs idénticos a NHANES.
- **NHANES (NIH):** la fuente de entrenamiento principal de KDM, PhenoAge, HD. Disponible público.
- **Cooper Institute ACLS:** la fuente de VO2max norms ACSM.
- **HUNT (Trondheim):** fuente Fitness Age + PAI.
- **InCHIANTI / Health ABC:** SPPB + gait speed mortality.

---

## 6. Recomendación tiered

### Tier 1 — Imprescindibles (implementar primero)

Estas calculadoras llenan brechas reales del blend ATP actual, usan inputs que ya capturas o son triviales de capturar, tienen fórmula pública verificable, y validación en cohorts grandes. Costo de implementación trivial-bajo.

1. **Fitness Age (Nes/NTNU)** — la sub-edad cardiorrespiratoria que el blend NO tiene hoy. Inputs ya disponibles. Trivial.
2. **HOMA-IR** — único proxy metabólico de RI con validación universal. Sumar **insulina ayuno** al panel de labs ya pedido. Trivial.
3. **Sitting-Rising Test (SRT)** — predictor de mortalidad más fuerte por unidad de tiempo (1 min test, HR mortalidad 11x score 10 vs score 0-4). Trivial.
4. **10-second One-Leg Stand** — test ultra-rápido con HR mortalidad 1.84 ajustado. Trivial.
5. **Grip Strength → Edad de fuerza** — convertir input ya recomendado en sub-edad con cutoffs EWGSOP2/AWGS2019 + normas por edad. Trivial.
6. **Framingham Heart Age** — convierte tu panel lipídico en "edad cardiovascular" interpretable. Trivial.
7. **Push-up >40** (hombres) — proxy cardiovascular validado, alineado con tu marca (3xGWR pull-ups). Trivial.

**Costo total Tier 1 ≈ 12-16 horas de implementación backend + UI mínima.**

### Tier 2 — Nice-to-have (post-launch v1, considerar v1.5/v2.0)

1. **ASCVD Pooled Cohort Equations** — segunda validación CV. Confirma o contradice Framingham.
2. **VO2max ACSM Norms** — espejo de Fitness Age en formato percentil.
3. **Allostatic Load Index** — lente complementaria sobre estrés crónico (overlap parcial con PhenoAge).
4. **Frailty Index (UK Biobank 49-item)** — para módulo "Riesgo de fragilidad" en ATP SOL.
5. **PAI score** — gamificación cardiovascular semanal (Whoop/Garmin/Mi Band).
6. **HRV physiological age** — tracking de intervenciones de sueño/respiración.
7. **Gait Speed** — wearable-derived para 50+.
8. **Reaction Time / Processing Speed** — único proxy cognitivo accesible.
9. **5x Sit-to-Stand** — alternativa estandarizada al SRT.
10. **LIBRA score** — para módulo brain health (overlap con SF, validar antes).
11. **Plank test** — gamificación core.

### Tier 3 — Descartar o saltar

- **Klemera-Doubal puro**: redundante con PhenoAge para uso consumer.
- **Levine BioAge 2013**: evolucionado por PhenoAge.
- **Aging.AI**: caja negra, posiblemente discontinuado.
- **InsideTracker InnerAge 2.0**: propietario, sin validación pública.
- **Homeostatic Dysregulation (Cohen)**: académicamente sólido pero overengineering para consumer; redundante con PhenoAge.
- **Metabolic Age (BMR-based)**: engaña a usuarios musculosos. Evitar.
- **SPPB completo**: para >65; tu avatar es 35-55.
- **FRAX**: solo para riesgo de fractura específico; no es edad biológica.
- **Healthy Aging Biomarker Model (Earls)**: inputs como suPAR no accesibles.
- **DunedinPACE/Bryan Johnson**: epigenética excluida por filtro.

---

## 7. Plan sugerido de orden de implementación

**Sprint 1 (1-2 semanas) — Sub-edades funcionales caseras:**
- 10-sec One-Leg Stand
- Sitting-Rising Test (SRT)
- Push-up test (hombres)
- Grip strength (requiere comprar dinamómetro $25 USD — incluir en kit beta)
- UI: pantalla "Tests funcionales ATP" mensual + scoring + comparación con tu edad.

**Sprint 2 (1-2 semanas) — Sub-edad cardiovascular:**
- Implementar Fitness Age (Nes/NTNU)
- Implementar Framingham Heart Age
- Display: "Tu corazón tiene X años de edad funcional"

**Sprint 3 (1 semana) — Sub-edad metabólica:**
- Agregar insulina ayuno al panel de labs sugerido
- Calcular HOMA-IR
- Mostrar como "edad de tu insulina" (joven/borderline/avanzada)

**Sprint 4 — v1.5 (post-launch):**
- ASCVD Pooled Cohort Equations (complemento Framingham)
- Allostatic Load Index (estrés crónico)
- HRV physiological age (wearable)
- Reaction time (cognitiva)

**Sprint 5 — v2.0:**
- Frailty Index UK Biobank
- PAI score (gamificación cardio)
- Gait speed (wearable)

---

## 8. Notas críticas

- **Insulina ayuno**: nuevo input recomendable. Costo lab adicional pequeño. Habilita HOMA-IR, mejor predicción de RI que glucosa sola.
- **Dinamómetro digital Camry EH101**: ~$25 USD. Recomendable incluir en kit beta ATP (junto a báscula). Habilita: grip strength sarcopenia + cambios temporales.
- **Pesos relativos en blend**: con las nuevas sub-edades, considerar evolucionar el blend a algo como: PhenoAge sistémica 20% + SF dominios 50% + sub-edades funcionales (CV+atlética+neuromuscular) 25% + composición corporal 5%. Discutir con Mariana.
- **Para mujeres**: el push-up Yang 2019 no fue validado en mujeres. Sustituir por "modified push-up" con cutoffs propios o usar Fitness Age + Grip + SRT.
- **Edad cognitiva**: si pesa, considerar incluir un Deary-Liewald RT test como mini-módulo dentro de MENTE (ya tienen check-in mental).

---

## 9. Citas de fuentes (URLs verificadas)

### PhenoAge / KDM / Sistémica
- Levine PhenoAge formula (Andrew Steele): https://andrewsteele.co.uk/biological-age/
- PhenoAge Calculator Spreadsheet: https://zenodo.org/records/10067628/files/Phenoage%20Calculator%20Spreadsheet.xlsx
- Lustgarten "Quantifying Biological Age": https://michaellustgarten.com/2019/09/09/quantifying-biological-age/
- BioAge R package (Klemera-Doubal): https://github.com/dayoonkwon/BioAge | https://github.com/bjb40/bioage
- Klemera-Doubal Method overview (Dovepress): https://www.dovepress.com/common-methods-of-biological-age-estimation-peer-reviewed-fulltext-article-CIA
- Cohen Mahalanobis distance: https://www.thelancet.com/journals/ebiom/article/PIIS2352-3964(21)00343-1/fulltext
- Comparability biological aging measures NHANES: https://pmc.ncbi.nlm.nih.gov/articles/PMC6599717/

### Insilico / InsideTracker
- Aging.AI launch: https://www.eurekalert.org/news-releases/600769
- InnerAge 2.0 biomarkers: https://blog.insidetracker.com/the-key-biomarkers-in-innerage-2-calculation
- InnerAge review (Healthcare Discovery): https://healthcarediscovery.ai/insidetracker-innerage-blood-biomarker-testing/

### Cardiovascular
- Framingham Heart Study CVD 10y risk: https://www.framinghamheartstudy.org/fhs-risk-functions/cardiovascular-disease-10-year-risk/
- ASCVD PCE calculator (ClinCalc): https://clincalc.com/cardiology/ascvd/pooledcohort.aspx
- Heart Age Calculator (how it works): https://heart-age-calculator.org/how-it-works/

### Fitness Age / VO2max / PAI
- NTNU Fitness Calculator: https://www.ntnu.edu/cerg/vo2max
- Nes 2013 HUNT VO2peak prediction (PubMed): https://pubmed.ncbi.nlm.nih.gov/22376273/
- PAI Nes Wisløff 2017: https://www.sciencedirect.com/science/article/pii/S0002934316310695
- NTNU PAI page: https://www.ntnu.edu/cerg/personal-activity-intelligence
- VO2max ACSM chart by age sex: https://vo2maxcalculators.com/chart/
- Modeling percentile rank CRF: https://pmc.ncbi.nlm.nih.gov/articles/PMC4711926/

### Tests funcionales
- Araujo 10-sec one-leg balance (Bristol news): https://www.bristol.ac.uk/news/2022/june/tne-second-one-legged-stance.html
- Araujo 10-sec stance physiotutors: https://www.physiotutors.com/research/10-second-one-leg-balance-and-survival/
- SRT Sitting-Rising Test (BodySpec): https://www.bodyspec.com/blog/post/the_sittingrising_test_a_simple_movement_predicting_longevity_and_health
- SRT Wikipedia: https://en.wikipedia.org/wiki/Sitting-rising_test
- SRT mortality eurjpc Araujo 2025: https://academic.oup.com/eurjpc/advance-article/doi/10.1093/eurjpc/zwaf325/8163161
- Push-up Yang 2019 Harvard: https://hsph.harvard.edu/news/push-up-capacity-cardiovascular-disease-events-men/
- Push-up paper PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC6484614/
- SPPB review PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC8535355/
- 5x Sit-to-Stand Physiopedia: https://www.physio-pedia.com/Five_Times_Sit_to_Stand_Test
- 5x STS Medbridge norms: https://www.medbridge.com/blog/5-times-sit-to-stand-test-how-to-administer-interpret-and-apply-norms
- Plank norms Strakova: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4096102/
- Gait speed mortality Studenski: https://pmc.ncbi.nlm.nih.gov/articles/PMC3593620/

### Fuerza / Sarcopenia
- EWGSOP2 cutoffs review PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC8037004/
- FFMI sarcopenia surrogate (ScienceDirect): https://www.sciencedirect.com/science/article/pii/S1525861022006661

### Metabólica
- HOMA-IR formula (Omni/Medcentral): https://www.omnicalculator.com/health/homa-ir
- Vively metabolic age article: https://www.vively.com.au/post/how-to-calculate-your-metabolic-age

### Cognitiva / Brain
- Deary-Liewald reaction time: https://link.springer.com/article/10.3758/s13428-010-0024-1
- LIBRA score Evidencio: https://www.evidencio.com/models/show/1041
- LIBRA + brain (Neurology): https://www.neurology.org/doi/10.1212/WNL.0000000000012572

### Allostatic Load / Frailty
- Variation in ALI NHANES: https://pmc.ncbi.nlm.nih.gov/articles/PMC5195908/
- UK Biobank Frailty Index Williams 2018: https://academic.oup.com/biomedgerontology/advance-article/doi/10.1093/gerona/gly094/5039978

### HRV
- Kubios physiological age: https://www.kubios.com/blog/about-physiological-age/
- HRV exceptional longevity PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC7527628/

### Frameworks
- Attia Centenarian Decathlon (#261): https://peterattiamd.com/training-for-the-centenarian-decathlon/
- Vora summary Attia metrics: https://askvora.com/blog/peter-attia-longevity-metrics-vo2max-muscle-mass
- Bryan Johnson Speed of Aging: https://blueprint.bryanjohnson.com/products/speed-of-aging
- DunedinPACE eLife: https://elifesciences.org/articles/73420
- Sinclair Information Theory aging (Nature Aging): https://www.nature.com/articles/s43587-023-00527-6
- Hyman biomarker panel: https://drhyman.com/blogs/content/podcast-ep1118

### FRAX / Bone
- FRAX overview PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10904566/

### Healthy aging composite
- Earls / healthy aging biomarker model: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9131142/
- Harvard Hu Willett healthy aging (ScienceDaily): https://www.sciencedaily.com/releases/2025/03/250324141952.htm

---

## 10. Anexo: hallazgos sorprendentes (5 bullets)

1. **El "Sitting-Rising Test" tiene mejor señal de mortalidad por minuto de evaluación que casi cualquier lab.** Score 0-4 → mortalidad 42.1% en 12 años. Score 10 → 3.7%. Eso es un HR ~11x con un test de 60 segundos sin equipo. Esto es una joya.
2. **El push-up >40 superó al treadmill submáximo en predicción de CVD eventos en hombres.** Harvard 2019. Sugiere que para hombres activos el reto funcional discrimina mejor que el VO2max submax.
3. **InsideTracker InnerAge no es validado por peer-review pese a su marketing.** Es KDM con coeficientes propietarios. Construir el tuyo entrenado en cohort beta ATP sería superior por transparencia.
4. **El "Metabolic Age" de las básculas Tanita/Omron no mide nada metabólico real** — solo BMR vs Harris-Benedict. Engaña a usuarios musculosos hacia falsa "juventud". Evitar marketing similar.
5. **La fórmula PhenoAge ya tiene "edad cardiometabólica" incrustada** vía glucosa, ALP, CRP. Por eso agregar HOMA-IR + Framingham aporta señal granular (sub-edad), no duplicación. La distinción importa para decidir el peso del blend.

---

_Fin del documento. v1 — 2026-06-07._
