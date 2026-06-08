# EDAD ATP — Algoritmo verificado v1

**Fuente:** `Matriz_calculo_salud_funcional_MasterV7_HOMBRES.xlsx` (HOMBRES V7, última viva) y `Matriz_calculo_salud_funcional_MasterV6_MUJERES.xlsx` (MUJERES V6, última viva).
**Autor del algoritmo:** Enrique Zapata.
**Fecha de auditoría:** 2026-06-05.
**Auditor:** Cowork.
**Status:** ✅ Verificado celda por celda contra los valores reales del paciente ejemplo del Excel.

> **Nota importante:** este doc reemplaza la presentación errónea anterior en chat donde confundí `G13` (edad cronológica) con PhenoAge. Cada referencia abajo cita celda exacta + fórmula literal + valor real del Excel.

---

## 1. Datos del paciente ejemplo (HOMBRES V7) — para trazar cálculos

| Variable | Celda Excel | Valor real |
|---|---|---|
| Edad cronológica | `EDAD!E13` (vía VLOOKUP `Datos extraidos`) | **50 años** |
| Albumina | `EDAD!E4` | 5.28 g/dl |
| Creatinina Sérica | `EDAD!E5` | 0.81 mg/dl |
| Glucosa | `EDAD!E6` | 90 mg/dl |
| PCR | `EDAD!E7` | 0.18 mg/dl |
| % Linfocitos | `EDAD!E8` | 33% |
| VCM | `EDAD!E9` | 90 fl |
| RDW-CV | `EDAD!E10` | 12.8% |
| Fosfatasa alcalina | `EDAD!E11` | 71 U/L |
| Leucocitos | `EDAD!E12` | 7400 cel/μL |
| Estatura | `EDAD!K20` | 1.83 m |
| Peso | `EDAD!K21` | 87.4 kg |
| % grasa corporal | `EDAD!K22` | 0.242 (24.2%) |
| % músculo esquelético | `EDAD!K23` | 0.346 (34.6%) |
| Fuerza de agarre | `EDAD!K24` | 57.4 kg |
| Grasa visceral | `EDAD!K25` | 10 |
| FFMI (calculado) | `EDAD!K30` | 19.6 |

---

## 2. El algoritmo — 6 pasos verificados

### Paso 1 — Score Salud Funcional (SF)

**Origen:** `'Reporte de resultados'!C14`

**Cálculo:** suma ponderada de los 10 dominios funcionales (cada uno con su scoring 9 bandas).

**Valor en ejemplo:** `60.83%` (es decir 0.6083).

> Este SF es la entrada principal a TU algoritmo (no del PhenoAge clínico).

---

### Paso 2 — PhenoAge clínico (paralelo, modelo Levine 2018)

**Origen:** `EDAD!G30`

**Fórmula literal del Excel:**
```
G30 = 141.50225 + (LN(-0.00553*LN(1-G28)))/0.090165
G28 = 1-EXP(-EXP(G26)*((EXP(0.0076927*120)-1)/0.0076927))    # Mort_Score
G26 = -19.9067 + SUM(M4:M13)                                  # xb
```

Donde cada `M_i` es `K_i × G_i` (parámetro de ajuste × valor convertido):

| i | Variable | Coef (K) | Valor convertido (G) | VPA (M) |
|---|---|---|---|---|
| 4 | Albumina | −0.0336 | 52.8 g/L | −1.7741 |
| 5 | Creatinina | 0.0095 | 71.604 μmol/L | 0.6802 |
| 6 | Glucosa | 0.1953 | 4.995 mmol/L | 0.9755 |
| 7 | PCR | 0.0954 | ln(0.18×10) = 0.588 | 0.0561 |
| 8 | Linfocitos | −0.012 | 33 | −0.396 |
| 9 | VCM | 0.0268 | 90 | 2.412 |
| 10 | RDW | 0.3306 | 12.8 | 4.2317 |
| 11 | ALP | 0.00188 | 71 | 0.1335 |
| 12 | Leucocitos | 0.0554 | 7.4 (×10³) | 0.4100 |
| 13 | Edad cronológica | 0.0804 | 50 | 4.02 |

**Cálculo en el ejemplo:**
- `xb = -19.9067 + 10.749 = -9.158`
- `Mort_Score = 0.02057`
- `PhenoAge = 141.50225 + LN(-0.00553 × LN(0.9794))/0.090165`
- `PhenoAge = 141.50225 + LN(0.000115)/0.090165`
- `PhenoAge = 141.50225 + (-9.07)/0.090165`
- `PhenoAge ≈ **40.90 años**`

✓ Verificado: el Excel reporta `G30 = 40.897`.

> **Interpretación:** según los 10 biomarcadores Levine, este paciente está biológicamente ~9 años más joven que su edad cronológica.

---

### Paso 3 — Ritmo de Envejecimiento (TU modelo, no PhenoAge)

**Origen:** `'Reporte de resultados'!C16`

**Fórmula literal del Excel:**
```
C16 = IFERROR( 12 + ((75 - (C14*100)) * EDAD!G13^0.75) / 100, 0 )
```

Donde:
- `C14` = SF = 0.6083 (Paso 1)
- `EDAD!G13` = Edad cronológica = 50

**Cálculo en el ejemplo:**
- `12 + ((75 - 60.83) × 50^0.75) / 100`
- `12 + (14.17 × 18.80) / 100`
- `12 + 266.4 / 100`
- `12 + 2.664`
- `**≈ 14.66 meses por año**`

✓ Verificado: el screenshot del Reporte muestra `C16 = 14.66`.

**Interpretación de la fórmula:**

| SF | Ritmo | Interpretación |
|---|---|---|
| 75% (threshold) | 12 | Envejeces a velocidad normal (12 meses por año) |
| > 75% | < 12 | Envejeces más lento (longevidad) |
| < 75% | > 12 | Envejeces más rápido (deterioro) |

**Calibración por edad:** el factor `EdadCronológica^0.75` hace que el efecto crezca sub-linealmente con la edad. Un mismo déficit de SF impacta más en absoluto a un paciente mayor que a uno joven.

---

### Paso 4 — Edad Biológica calculada

**Origen:** `EDAD!G35`

**Fórmula literal del Excel:**
```
G35 = IFERROR( G13 * ('Reporte de resultados'!C16 / 12), 0 )
```

Donde:
- `G13` = Edad cronológica = **50**
- `'Reporte de resultados'!C16` = Ritmo = 14.66

**Cálculo en el ejemplo:**
- `50 × (14.66 / 12)`
- `50 × 1.2217`
- `**≈ 61.10 años**`

✓ Verificado: el Excel reporta `G35 = 61.100`.

**Interpretación:** convierte el Ritmo a una edad biológica multiplicando la edad cronológica por el factor de envejecimiento.

---

### Paso 5 — Edad Biológica con ajuste (composición corporal)

**Origen:** `EDAD!G36`

**Fórmula literal del Excel:**
```
G36 = G35 + SUM(H45:H49)
```

Donde `H45:H49` son los **ajustes hardcoded** (suma de impactos por composición):

| Celda | Concepto | Valor del paciente | Impacto Excel (H_i) |
|---|---|---|---|
| H45 | Grasa visceral | 10 | 0 (cae en regla "≤10": 0) |
| H46 | FFMI | 19.6 | 0 (cae en regla "17.5–21": 0) |
| H47 | Fuerza agarre | 57.4 kg | **0** ⚠️ (regla dice "> 50 → −2", pero está hardcoded a 0) |
| H48 | % grasa corporal | 24.2% | **0** ⚠️ (regla dice ">25%: +2; ≤20: 0; 10-18: -1" — 24.2% no aplica ninguna, queda en 0) |
| H49 | % músculo esqueletico | 34.6% | −1 ⚠️ (regla dice "34-38%: 0" pero está hardcoded en −1) |

**Suma:** `0 + 0 + 0 + 0 + (-1) = -1`

**Cálculo en el ejemplo:**
- `61.10 + (-1) = **60.10 años**`

✓ Verificado: el Excel reporta `G36 = 60.100`.

**⚠️ FLAG #1 — Discrepancia en hardcoding de ajustes:**

Las reglas del catálogo `EDAD!D44:E62` definen qué impacto aplicar según el valor. Pero las celdas `H45:H49` están **hardcoded** (no calculadas con fórmula). En el ejemplo del paciente:

| Marcador | Valor real | Regla aplicable | Impacto esperado | Impacto en Excel |
|---|---|---|---|---|
| Fuerza agarre | 57.4 kg | "> 50 → −2" | **−2** | **0** ❌ |
| % músculo | 34.6% | "34-38% → 0" | **0** | **−1** ❌ |

**Necesitamos confirmar contigo:** ¿estos hardcoded son errores del Excel, o decisiones intencionales? Cuando programemos esto necesitamos **automatizar la asignación según las reglas del catálogo**, no hardcoded.
//SOn errores, las  fórmulas mandan
---

### Paso 6 — Edad Biológica FINAL (blend 75% / 25%)

**Origen:** `EDAD!G37`

**Fórmula literal del Excel:**
```
G37 = (G36 * H36) + (G30 * H30)
```

Donde:
- `G36` = Edad Biológica con ajuste = 60.10
- `H36` = `1 - H30` = `1 - 0.25` = **0.75**
- `G30` = PhenoAge = 40.90
- `H30` = **0.25** (hardcoded)

**Cálculo en el ejemplo:**
- `(60.10 × 0.75) + (40.90 × 0.25)`
- `45.075 + 10.225`
- `**≈ 55.30 años**`

✓ Verificado: el Excel reporta `G37 = 55.299` y el Reporte de resultados muestra **Edad Biológica = 55.30**.

**Interpretación del blend:**
- 75% del peso → **TU modelo** (SF + Ritmo + ajustes corporales)
- 25% del peso → **PhenoAge** (modelo clínico Levine 2018)

El PhenoAge actúa como ancla clínica publicada que estabiliza el resultado contra extremos del modelo propio.

---

## 3. Ajustes composición — HOMBRES vs MUJERES

### HOMBRES (de `EDAD!D44:E62`)

| Factor | Rango | Impacto (años) |
|---|---|---|
| Grasa visceral | > 10 | **+3** |
| Grasa visceral | ≤ 10 | 0 |
| Grasa visceral | < 5 | −1 |
| FFMI | < 17.5 | +2 |
| FFMI | 17.5–21 | 0 |
| FFMI | > 21 | −2 |
| Fuerza agarre | < 40 kg | +2 |
| Fuerza agarre | 40–50 kg | 0 |
| Fuerza agarre | > 50 kg | −2 |
| % Grasa | > 25% | +2 |
| % Grasa | ≤ 20% | 0 |
| % Grasa | 10–18% | −1 |
| % Músculo | < 25% | +3 |
| % Músculo | < 30% | +2 |
| % Músculo | < 33% | +1 |
| % Músculo | 34–38% | 0 |
| % Músculo | > 38% | −1 |
| % Músculo | > 42% | −2 |
| % Músculo | > 45% | −3 |

### MUJERES (de `EDAD!D44:E61` de V6)

| Factor | Rango | Impacto (años) |
|---|---|---|
| Grasa visceral | > 7 | **+3** |
| Grasa visceral | ≤ 7 | 0 |
| Grasa visceral | < 4 | −1 |
| FFMI | < 15.5 | +2 |
| FFMI | 15.5–18 | 0 |
| FFMI | > 18 | −2 |
| Fuerza agarre | < 27 kg | +2 |
| Fuerza agarre | 27–35 kg | 0 |
| Fuerza agarre | > 35 kg | −2 |
| % Grasa | > 32% | +2 |
| % Grasa | ≤ 28% | 0 |
| % Grasa | 16–25% | −1 |
| % Músculo | < 20% | +3 |
| % Músculo | < 25% | +2 |
| % Músculo | < 28% | +1 |
| % Músculo | 29–33% | 0 |
| % Músculo | > 33% | −1 |
| % Músculo | > 38% | −2 |

**Diferencias clave HOMBRES vs MUJERES:**
- Mujeres permiten más % grasa antes de penalizar (lo cual es fisiológicamente correcto).
- Mujeres tienen FFMI threshold más bajo (≥ 18 vs ≥ 21 para hombres).
- Mujeres tienen fuerza de agarre threshold más bajo (≥ 35 vs ≥ 50).
- Mujeres NO tienen "% Músculo > 45% → −3" porque es prácticamente imposible.

---

## 4. Especificidades MUJERES — Sistema hormonal por fase del ciclo

**Hoja única en V6 MUJERES:** `Campos variables`.

Aplica rangos distintos según fase del ciclo reportada:

| Hormona | Folicular | Ovulatoria | Lútea | Postmenopausia |
|---|---|---|---|---|
| FSH (mUI/ml) | 1.4 crítico bajo / variable | 6.2+ | 1.0+ | 19.2+ |
| Estradiol (pg/ml) | 20+ | 150+ | 30+ | 0 |
| Progesterona (ng/ml) | 0 | 4.9+ | 1.9+ | 0 |
| LH (mUI/ml) | 1.6+ | 21.8+ | 0.5+ | 14.1+ |
| Ferritina | (Premenopausia: 12 mín) | — | — | (Postmenopausia: 15 mín) |

**Detector de fase:** según tú, manual (usuaria reporta), con fallback a comparar fecha contra historial de periodos.

---

## 5. Parámetros TUYOS que necesitamos calibrar / discutir

**P1 — Threshold 75 en `(75 − SF×100)` del Ritmo:**
- ¿Por qué 75? Hipótesis: en tu escala 9 bandas, "óptimo 2 = 100" y "aceptable 3 = 80", así que 75 sería el umbral entre "salud aceptable" y "salud subóptima".
- **A confirmar contigo.**

**P2 — Exponente 0.75 en `EdadCronológica^0.75`:**
- Hace que el efecto crezca sub-linealmente con la edad. Para 50 años → factor 18.80. Para 30 años → factor 12.82.
- ¿De dónde sale? Calibración intuitiva o derivado de literatura?
- **A confirmar contigo.**

**P3 — Peso 0.25 en H30 (PhenoAge weight) y 0.75 en H36 (TU modelo weight):**
- ¿Decisión por preferir tu modelo como dominante con PhenoAge como ancla?
- **A confirmar contigo.**

**P4 — Hardcoding de ajustes composición (H45:H49):**
- En el Excel los valores están hardcoded, no calculados con las reglas del catálogo D44:E62.
- En el ejemplo del paciente, hay 2 discrepancias (fuerza agarre y % músculo) entre lo que dicen las reglas y lo que dice el hardcoded.
- **A automatizar en la app:** asignar impactos según reglas del catálogo, no hardcoded.

**P5 — Fallback cuando NO hay PhenoAge:**
- Si faltan biomarcadores Levine → G30 = "No Data" → G37 falla.
- ¿Qué hacer cuando solo tenemos SF + composición? ¿Edad Biológica final = Edad Biológica con ajuste (sin blend con PhenoAge)?
- ¿O ajustar el blend a 100% TU modelo / 0% PhenoAge?

**P6 — Fallback cuando NO hay composición medida:**
- Si faltan medidas de báscula → ajustes H45:H49 = 0 → Edad Biológica con ajuste = Edad Biológica calculada.
- ¿Es correcto este fallback? ¿O penalizar la confianza (CE)?

**P7 — Niveles de cálculo 1/2/3:**
- Según tú: gating de release del cálculo. Sin Nivel 1 → no se libera el cálculo principal.
- ¿Qué parámetros son Nivel 1 (obligatorios)? ¿Cuáles Nivel 2 (refinamiento)? ¿Cuáles Nivel 3 (bonus)?
- **A definir contigo en sesión técnica.**

---

## 6. Diferencias VS algoritmo v1.1 anterior (`MODELO_EDAD_ATP_v1.md`)

| Aspecto | v1.1 (cuestionario simple) | TU algoritmo real (Excel) |
|---|---|---|
| Inputs | 8 preguntas cuestionario | ~140 parámetros (labs + composición + cuestionarios + wearables) |
| Scoring | Aditivo lineal (delta años) | 9 bandas no-monotónicas con bell curve por parámetro |
| Composición | 1 factor sin medir + 1 factor con báscula | 5 factores hardcoded por reglas (visceral, FFMI, agarre, %grasa, %músculo) |
| Ancla científica | Citas a estudios pero sin fórmula publicada | PhenoAge clínico (Levine 2018) con peso 0.25 |
| Output | Edad ATP + 2 culpables | Edad Biológica final + SF + Ritmo + Calidad de Evaluación + culpables por dominio |
| Diferencias por sexo | No | Sí (composición + sistema hormonal con fases del ciclo) |
| Granularidad | "media / alta / rigurosa" | Cálculo en tres pisos según Nivel 1/2/3 + CE 0-100% |

**Decisión:** v1.1 muere. Tu algoritmo del Excel es el modelo canónico.

---

## 7. Lo que sigue (próximos hitos)

**Pendiente con Enrique (peloteo):**
1. Confirmar parámetros P1–P7 arriba.
2. Resolver el hardcoding de ajustes composición.
3. Decidir fallbacks cuando faltan PhenoAge / composición.

**Pendiente Cowork research:**
1. Buscar calculadoras de edad complementarias (Peter Attia, Harvard, Stanford, Bryan Johnson, DunedinPACE, GrimAge, Klemera-Doubal, etc.).
2. Entregar comparativa de cuáles complementarían el modelo + costo de implementar cada una.

**Pendiente arquitectura técnica:**
1. Schema DB para ~140 parámetros × rangos por sexo × fases del ciclo en mujeres.
2. Captura de datos: OCR labs + manual + báscula inteligente + wearables.
3. Scoring engine 9 bandas + ponderación por dominio.
4. PhenoAge calculator.
5. Ajustes composición por sexo (automatizado según reglas catálogo).
6. Detector de fase del ciclo (mujeres) con fallback historial.
7. Display: Edad Biológica final + SF + Ritmo + CE + culpables por dominio.

---

## 8. Verificación de auditoría

Este doc se basa en **lectura celda por celda** de los dos Excels con `openpyxl` (modo formula y modo data). Cada fórmula citada arriba se extrajo literal del archivo. Cada valor numérico se reprodujo paso a paso con los inputs del paciente ejemplo.

**Trazabilidad de cifras (paciente ejemplo HOMBRES V7, 50 años):**

```
xb_calculado = -9.158 ≈ Excel.G26 = -9.158                      ✓
Mort_Score_calculado = 0.02057 ≈ Excel.G28 = 0.02057            ✓
PhenoAge_calculado = 40.897 ≈ Excel.G30 = 40.897                ✓
Ritmo_calculado = 14.66 ≈ Excel.Reporte.C16 = 14.66             ✓
EdadBio_calc = 50 × (14.66/12) = 61.10 ≈ Excel.G35 = 61.10      ✓
EdadBio_ajustada = 61.10 + (-1) = 60.10 ≈ Excel.G36 = 60.10     ✓
EdadBio_FINAL = (60.10 × 0.75) + (40.90 × 0.25) = 55.30
            ≈ Excel.G37 = 55.30 ≈ Reporte.Edad Biológica = 55.30 ✓
```

Si Enrique encuentra alguna celda mal interpretada arriba, puede señalar la celda específica y la corregimos antes de seguir.
