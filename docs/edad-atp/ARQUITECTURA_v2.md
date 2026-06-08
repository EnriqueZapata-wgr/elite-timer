# EDAD ATP — Arquitectura v2 (Integral + Sub-edades)

**Status:** ✅ APROBADA POR ENRIQUE (2026-06-08).
**Reemplaza:** `MODELO_EDAD_ATP_v1.md` (cuestionario simple de 8 preguntas — DEPRECATED).
**Base verificada:** `EDAD_ATP_ALGORITMO_VERIFICADO_v1.md` (algoritmo del Excel HOMBRES V7 / MUJERES V6).
**Research soporte:** `EDAD_ATP_RESEARCH_CALCULADORAS_v1.md` (30 calculadoras catalogadas, filtradas a 5 sub-edades).

---

## 1. Filosofía del modelo

ATP entrega al usuario **un solo número como gold standard** (la **Edad Biológica Integral**) y le permite explorar **5 lentes complementarios** (las sub-edades) para entender de qué se compone su edad biológica.

**Jerarquía explícita:**
- El número que importa es la **Integral** — es el algoritmo completo con todos los matices.
- Las **sub-edades** son lentes pedagógicos que ayudan a entender el por qué.
- Ninguna sub-edad sustituye a la Integral.
- El usuario puede explorar dimensiones específicas para tomar acción (la edad metabólica le dice "atiende glucosa/insulina", la corporal "trabaja composición", etc.).

**Filtro UX:**
- En todas las pantallas, la Integral es dominante visualmente.
- Las sub-edades se acceden vía drill-down.
- La marca de "gold standard ATP" aparece junto a la Integral siempre.

---

## 2. Estructura del modelo — 1 + 5

```
                ┌────────────────────────────┐
                │  EDAD BIOLÓGICA INTEGRAL   │
                │     (Gold Standard ATP)    │
                └────────────────────────────┘
                            │
                            │ explica
                            ▼
   ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
   │   🩸        │   💪        │   ❤️         │   🏃        │   🧠        │
   │ Metabólica  │  Corporal   │Cardiovascular│   Fitness   │  Cognitiva  │
   │ (display)   │ (display)   │  (display)   │  (display)  │ (pesa al    │
   │             │             │              │             │  cálculo)   │
   └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**4 sub-edades son display puro:** sus inputs ya están dentro del algoritmo de la Integral (vía PhenoAge + SF + ajustes corporales). NO entran al cálculo para evitar double-counting. Solo se calculan y muestran para que el usuario entienda los componentes.

**1 sub-edad pesa al cálculo:** la **Edad Cognitiva** es la única dimensión NUEVA que el algoritmo del Excel no captura. Entra al cálculo de la Integral como modificador delta capped (ver §3).

---

## 3. Algoritmo de la EDAD BIOLÓGICA INTEGRAL

**Fórmula:**
```
Edad_Integral = Algoritmo_Excel + Modificador_Cognitivo

donde:
  Algoritmo_Excel = el cálculo verificado del Excel
                  = (G36 × 0.75) + (G30 × 0.25)
                  = (Edad Biológica con ajuste × 0.75) + (PhenoAge × 0.25)

  Modificador_Cognitivo = clamp(delta_cognitivo × 0.10, −3, +3)
  delta_cognitivo = Edad_Cognitiva − Edad_Cronológica
```

**Si no hay test de Reaction Time:** `Modificador_Cognitivo = 0`. La Integral queda igual al algoritmo del Excel.

**Cap ±3 años:** evita que un test cognitivo malo (single-point) dispare la edad absurdamente.

**Ejemplo verificable (paciente HOMBRES V7 del Excel, 50 años):**
- Algoritmo Excel = 55.30 años (verificado celda por celda)
- Edad Cognitiva = supongamos 58 (test RT lento)
- delta_cognitivo = 58 − 50 = +8
- Modificador = clamp(8 × 0.10, ±3) = +0.8
- **Edad Integral = 55.30 + 0.8 = 56.10 años**

Si el mismo paciente NO hizo el test cognitivo:
- Modificador = 0
- **Edad Integral = 55.30 años** (idéntica al Excel)

---

## 4. Las 5 sub-edades — fórmulas

### 4.1 🩸 Edad Metabólica (display)

**Principio:** capacidad metabólica y sensibilidad a la insulina del usuario, capturada en múltiples dimensiones para evitar la simplicidad de "2 valores en HOMA-IR".

**Inputs y pesos:**

| Componente | Input | Peso |
|---|---|---|
| HOMA-IR | Glucosa ayuno + **insulina ayuno (nueva)** | 20% |
| HbA1c | Lab estándar | 25% (memoria 3 meses, más estable) |
| Trigs/HDL ratio | Panel lipídico | 20% (RI proxy validado, sensible al estilo de vida) |
| Tiempo en rango CGM | Si tiene CGM (opcional, peso redistribuido si falta) | 20% |
| Cintura | Auto-medido / báscula inteligente | 15% (visceral proxy) |

**Cálculo:**
1. Cada componente se score 0-100 con normas por sexo (y edad si aplica).
2. Score Metabólico = Σ (score_i × peso_i)
3. Edad Metabólica = mapeo del score a edad equivalente con normas poblacionales por sexo.

**Calidad de la sub-edad (CE_metabólica):**
- 100%: todos los inputs presentes
- Reducido proporcionalmente si falta alguno

**Output al usuario:**
```
Edad Metabólica: 58 años (cronológica 50)
Componente más afectado: HbA1c en límite alto (5.8%)
Recomendación: protocolo metabólico ATP — ayuno + entreno alta intensidad
```

---

### 4.2 💪 Edad Corporal (display)

**Principio:** edad de tu composición estructural — cómo estás construido físicamente.

**Inputs y pesos:**

| Componente | Input | Peso |
|---|---|---|
| FFMI | Peso, %grasa, talla (báscula inteligente) | 30% |
| % Grasa corporal | Báscula inteligente | 25% |
| % Músculo esquelético | Báscula inteligente | 25% |
| Grasa visceral | Báscula inteligente | 20% |

**Cálculo:**
1. Cada componente con score 0-100 según rangos por sexo (ya en el Excel — `EDAD!D44:E62`).
2. Score Corporal = Σ (score_i × peso_i)
3. Edad Corporal = mapeo a edad equivalente con normas por sexo.

**Las reglas exactas de score por componente y sexo ya están en el Excel (sección "Ajustes composición — HOMBRES vs MUJERES" del doc `EDAD_ATP_ALGORITMO_VERIFICADO_v1.md`).**

**Output al usuario:**
```
Edad Corporal: 52 años (cronológica 50)
Componente fuerte: FFMI en zona óptima
Componente débil: grasa visceral en límite alto
```

---

### 4.3 ❤️ Edad Cardiovascular (display)

**Principio:** riesgo cardiovascular a 10 años traducido a edad equivalente.

**Cálculo:** ASCVD Pooled Cohort Equations (AHA/ACC 2013) con coeficientes β públicos por sexo y raza.

**Inputs:**
- Edad
- Sexo
- Raza (Blanco / Afroamericano — México adapta a "Latino" como Blanco)
- Colesterol total (mg/dL)
- HDL (mg/dL)
- PAS (Presión arterial sistólica, mmHg)
- Tratamiento HTN (sí/no)
- Diabetes (sí/no)
- Fumador (sí/no)

**Fórmula:**
```
Riesgo_10y = 1 - S0^exp(Σ(βi × Xi) - mean_term)

Donde S0, βi, mean_term varían por sexo y raza (tabla pública AHA/ACC 2013).

Edad_Cardiovascular = edad del individuo de mismo sexo cuyo riesgo coincide con Riesgo_10y del usuario.
```

**Output al usuario:**
```
Edad Cardiovascular: 54 años (cronológica 50)
Riesgo CV a 10 años: 6.2%
Factor principal: presión arterial 132/88 en pre-hipertensión
```

---

### 4.4 🏃 Edad Fitness (display)

**Principio:** capacidades físicas — qué puedes hacer con tu cuerpo bajo demanda real.

**Inputs y pesos:**

| Componente | Input | Peso |
|---|---|---|
| VO2max | Cooper 12-min run **o** Astrand-Rhyming step test **o** wearable (Garmin/Apple Watch/Whoop) | 35% |
| Grip Strength | **Dinamómetro Camry $25 (nuevo)** | 25% |
| Push-ups max continuos | Test casero (norms por sexo y edad, ACSM) | 15% |
| FC reposo | Wearable o manual matutino | 15% |
| Recovery FC (post-ejercicio min 1) | Wearable preferido | 10% |

**Cálculo:**
1. Cada componente con score 0-100 con normas por sexo y edad (lookup tables públicos).
2. Score Fitness = Σ (score_i × peso_i)
3. Edad Fitness = mapeo a edad equivalente.

**Nota Push-up:** Yang/Harvard 2019 validado solo en hombres. Para mujeres: usar normas ACSM con cutoffs por sexo (modified push-up acceptable). Mariana puede pulir cutoffs.

**Output al usuario:**
```
Edad Fitness: 61 años (cronológica 50) ← ÁREA CLAVE A TRABAJAR
Componente más afectado: 0 sesiones esta semana
VO2max estimado: 38 ml/kg/min (percentil 25 para 50 años)
Recomendación: protocolo cardio ATP — 3 sesiones por semana
```

---

### 4.5 🧠 Edad Cognitiva (PESA AL CÁLCULO)

**Principio:** velocidad de respuesta cognitiva — único proxy cognitivo accesible sin MRI.

**Input:** Reaction Time test (Deary-Liewald):
- Test simple RT (estímulo único, 30 trials)
- Test choice RT (estímulo de 4 opciones, 40 trials)
- Test 2-3 min en la app

**Cálculo:**
1. Calcular RT medio simple (ms) y RT medio choice (ms) del usuario.
2. Lookup en tabla de normas por edad/sexo (Deary-Liewald + MindCrowd).
3. Score combinado: RT simple ponderado 40%, RT choice ponderado 60% (más sensible al envejecimiento).
4. Edad Cognitiva = edad cuyo RT promedio coincide con el del usuario.

**Output al usuario:**
```
Edad Cognitiva: 47 años (cronológica 50) ← +3 años más joven
RT simple: 265 ms (norma 50 años: 280 ms)
RT choice: 380 ms (norma 50 años: 400 ms)
Excelente velocidad cognitiva. Mantén ejercicio aeróbico + sueño óptimo.
```

**Cómo entra al cálculo de la Integral:**
- delta_cognitivo = Edad_Cognitiva − Edad_Cronológica
- Modificador = clamp(delta_cognitivo × 0.10, −3, +3)
- Edad_Integral = Algoritmo_Excel + Modificador

---

## 5. Inputs nuevos requeridos al panel ATP

Para soportar el modelo v2 completo, necesitamos añadir:

| Input | Sub-edad que habilita | Costo / Friction |
|---|---|---|
| **Insulina en ayuno** | Edad Metabólica (HOMA-IR) | Lab adicional, ~$5 USD al panel ya pedido |
| **Dinamómetro Camry EH101** | Edad Fitness (Grip) + Algoritmo Excel (Fuerza agarre) | $25 USD, incluir en kit beta ATP |
| **Reaction Time test in-app** | Edad Cognitiva (única que pesa al cálculo) | Sin costo, 10h UI |
| **Push-up test casero** | Edad Fitness | Sin costo, casero |
| **VO2max** (Cooper 12-min run o wearable) | Edad Fitness | Sin costo si wearable; Cooper test requiere espacio |
| **Recovery FC** | Edad Fitness | Sin costo (wearable) |
| **PAS/PAD** | Edad Cardiovascular | Requiere baumanómetro casero (~$15-30 USD) o lab/clínica |
| **Cintura** | Edad Metabólica, Edad Corporal | Sin costo, cinta métrica |

**Inputs nuevos al kit beta ATP recomendados:**
1. Dinamómetro Camry EH101 (~$25)
2. Cinta métrica (~$3)
3. Opcional: baumanómetro casero (~$20)

---

## 6. UIUX bosquejado

### 6.1 Pantalla "Mi Edad ATP" (entrada principal)

```
┌────────────────────────────────────────┐
│  ✦ Mi Edad ATP                         │
├────────────────────────────────────────┤
│                                        │
│         EDAD BIOLÓGICA INTEGRAL        │
│                                        │
│           ┌──────────────┐             │
│           │              │             │
│           │   55 años    │             │
│           │              │             │
│           │ cronológica  │             │
│           │     50       │             │
│           └──────────────┘             │
│                                        │
│   Gold standard ATP | CE 85%           │
│                                        │
│   Ritmo: 14.66 meses por año           │
│   "Envejeces 22% más rápido que       │
│    el promedio. Trabajemos."           │
│                                        │
├────────────────────────────────────────┤
│  Lentes de tu Edad ↓                   │
│                                        │
│  🩸 Metabólica          58 ◐           │
│  💪 Corporal            52 ▲           │
│  ❤️  Cardiovascular     54 ◐           │
│  🏃 Fitness             61 ▼ ← Foco    │
│  🧠 Cognitiva           47 ▲           │
│                                        │
│  ⓘ Los lentes muestran matices.        │
│  El gold standard es la Integral.      │
└────────────────────────────────────────┘
```

### 6.2 Pantalla de una sub-edad (drill-down)

Tap en "🏃 Fitness 61" →

```
┌────────────────────────────────────────┐
│  ← Fitness                             │
├────────────────────────────────────────┤
│                                        │
│  🏃 Edad Fitness: 61 años              │
│  cronológica 50 → +11 años             │
│                                        │
│  Componentes:                          │
│  ────────────────                      │
│  VO2max:           28 ml/kg/min ▼      │
│    (percentil 15 para 50 años)         │
│  Grip strength:    57.4 kg ▲           │
│    (percentil 70 para 50 años)         │
│  Push-ups max:     no medido           │
│  FC reposo:        72 bpm ◐            │
│  Recovery FC:      18 bpm ▼            │
│                                        │
│  💡 Acción ATP:                        │
│  Tu cardio está atrasando todo.        │
│  Protocolo: 3x semana intervalos       │
│  alta intensidad por 8 semanas.        │
│                                        │
│  [Iniciar Cooper 12-min test]          │
│  [Configurar wearable VO2max]          │
└────────────────────────────────────────┘
```

### 6.3 Pantalla "Tests funcionales" (acceso a tests caseros)

```
┌────────────────────────────────────────┐
│  Tests Funcionales ATP                 │
├────────────────────────────────────────┤
│                                        │
│  🏃 Cooper 12-min run                  │
│    Última vez: hace 2 meses · 1.8 km   │
│    [Hacer test]                        │
│                                        │
│  💪 Grip strength (dinamómetro)        │
│    Última vez: hace 1 semana · 57.4 kg │
│    [Hacer test]                        │
│                                        │
│  🦾 Push-ups max                       │
│    Pendiente — toca para hacer         │
│                                        │
│  ⚖️  Balance 1 pie                     │
│    Última vez: hace 1 mes · 25s        │
│    [Hacer test]                        │
│                                        │
│  🧠 Reaction Time                      │
│    Última vez: hace 3 días · 280ms     │
│    [Hacer test]                        │
│                                        │
└────────────────────────────────────────┘
```

---

## 7. Calidad de la Evaluación (CE) — cómo se reporta

Cada sub-edad y la Integral tienen su propia CE basada en disponibilidad de inputs:

**CE Integral:**
- 100%: PhenoAge completo + composición completa + SF al 80%+ + Cognitiva
- 85%: PhenoAge completo + composición completa + SF 60-80% + sin Cognitiva
- 70%: PhenoAge parcial + composición presente + SF 40-60%
- 50%: solo composición + SF mínimo
- 30%: solo composición (Edad Biológica básica)
- <30%: insuficiente, no mostrar Integral

**Display de CE al usuario:**
```
✦ Calidad de tu evaluación: 85%
   PhenoAge ✓ · Composición ✓ · SF 73% · Cognitiva pendiente
```

Tap en CE → desglose por componente faltante con CTAs específicos.

---

## 8. Plan técnico de implementación

Será un trabajo grande dividido en sprints. Estimación total: 4-6 semanas de CC en sub-sessions encadenadas.

### Sprint 1 — Foundations (schema DB + servicios base) — **PRIMER BUZÓN**

**Scope:**
- Schema DB para todos los parámetros del Excel (~140) + nuevos inputs (insulina, RT, etc.)
- Servicios de cálculo de:
  - PhenoAge (Levine 2018)
  - Score de Salud Funcional (10 dominios, 9 bandas)
  - Algoritmo Excel completo (Integral base)
  - 5 sub-edades con sus fórmulas
- Tests unitarios contra los valores del paciente ejemplo del Excel

**Estimación:** 12-16 commits de CC, ~6-8 horas.

### Sprint 2 — UI captura de datos

**Scope:**
- Pantalla de captura manual de labs
- OCR de PDF de labs (con confirmación manual)
- Captura de composición corporal (báscula inteligente)
- Captura de wearable (Apple Health / Garmin / Whoop API)
- Captura de cuestionarios (Hábitos, Salud Mental, Sueño, etc.)

**Estimación:** 8-10 commits, ~6 horas.

### Sprint 3 — UI display de Edad Integral + sub-edades

**Scope:**
- Pantalla "Mi Edad ATP" con drill-down
- Pantalla de cada sub-edad
- Pantalla de CE breakdown
- Animaciones / transiciones / haptics

**Estimación:** 6-8 commits, ~4-6 horas.

### Sprint 4 — Tests funcionales en-app

**Scope:**
- Cooper 12-min run timer + GPS
- Push-up test con conteo
- Balance 1-pie timer
- **Reaction Time test in-app** (Deary-Liewald simple + choice)
- Plank timer

**Estimación:** 8-12 commits, ~6-8 horas.

### Sprint 5 — Refinamiento + Mariana validation

**Scope:**
- Ajuste de pesos por feedback de cohort beta
- Pulido de cutoffs por sexo con Mariana
- Refinamiento de copy clínico
- Edge cases (datos faltantes, valores fuera de rango, multi-source conflicts)

**Estimación:** trabajo continuo durante 2-3 semanas.

---

## 9. Validación post-implementación

**Criterio de éxito:**
- Usuario con datos completos del paciente ejemplo del Excel debe obtener Edad Integral = 55.30 ± 0.1 años (sin Cognitiva)
- Si añade Cognitiva = 58, debe obtener Edad Integral = 56.10 años
- Todas las sub-edades deben mostrar valores razonables (no extremos)
- Tests unitarios cubren al menos 95% del scoring + algoritmos
- CE debe reportar correctamente porcentaje de inputs disponibles

**Validación con Mariana:**
- Casos hipotéticos (avatares atléticos, sedentarios, ancianos jóvenes, etc.)
- Revisión de pesos por dominio
- Aprobación de copy clínico
- Aprobación de CTAs por sub-edad

---

## 10. Decisiones tomadas (referencia)

1. **Algoritmo principal:** el del Excel HOMBRES V7 / MUJERES V6 (verificado celda por celda).
2. **Cuestionario v1.1 simplificado:** DEPRECATED, no se usa.
3. **Ajustes corporales H45:H49 hardcoded en Excel = errores. Las fórmulas del catálogo mandan.**
4. **Estructura:** 1 Integral + 5 sub-edades, jerarquía explícita.
5. **Sub-edades 4 son display:** Metabólica, Corporal, Cardiovascular, Fitness. NO entran al cálculo (sus inputs ya están en el algoritmo).
6. **Sub-edad 1 pesa:** Edad Cognitiva entra como modificador delta capped (±3 años, peso 0.10).
7. **Inputs nuevos aprobados:** Insulina ayuno (lab), Dinamómetro Camry $25 (kit beta).
8. **Push-up para mujeres:** se mantiene push-up estándar con normas ACSM por sexo. Mariana pule cutoffs.
9. **Old Man Test:** se incluye como test de balance/coordinación anclado por 10s One-Leg Stand. Mariana formaliza rúbrica.
10. **Filosofía UX:** Integral siempre dominante visualmente. Sub-edades son drill-down. "Gold standard ATP" claim explícito.

---

## 11. Pendientes para resolver con Mariana (post-implementación)

- Cutoffs específicos de push-up para mujeres
- Pesos finales de componentes de cada sub-edad
- Rúbrica formal del Old Man Test
- Validación clínica de RT thresholds por edad
- Pesos del blend final (75/25 PhenoAge actual, peso 0.10 del modificador cognitivo)
- Copy clínico de cada sub-edad
- Disclaimers médicos por sub-edad
- Definición de "norma" cuando hay rango (cuál percentil usar como anchor)

---

*Doc maestro v2 — aprobado 2026-06-08 por Enrique. Próximo paso: dispatch CC con buzón Sprint 1.*
