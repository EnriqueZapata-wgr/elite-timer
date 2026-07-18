# MAPA DE ARQUITECTURA — PILAR SALUD FUNCIONAL (ESTADO ACTUAL)
**Fecha:** 2026-07-16
**Autor del mapa:** Cowork (arquitecto de información / auditoría)
**Propósito:** Radiografía exhaustiva de la arquitectura de información ACTUAL del pilar
Salud Funcional, como base para el rediseño raíz (tarea #133 / #134). NO propone rediseño.

> Doctrina de referencia (Enrique 2026-07-16): un menú/hub tiene SOLO cards editoriales de
> NAVEGACIÓN. Los DATOS de consulta viven DENTRO del destino. Un dato = un lugar único.

---

## 0. RESUMEN DE ENTRADA (cómo se llega al pilar)

El pilar NO tiene una sola puerta. Hay **DOS árboles paralelos** que capturan y muestran datos
de salud, con nombres distintos y tablas distintas:

- **Árbol A — "Historia Clínica" / Salud Funcional:** Tab **KIT** → card `HISTORIA CLÍNICA`
  (subtítulo "Labs · biomarcadores · tests") → `/health-hub`.
- **Árbol B — "Edad ATP":** Tab **YO** (`YoEditorialSection`) → cards `EDAD ATP` (`/edad-atp`),
  `COMPOSICIÓN CORPORAL` (`/my-health`), `LAB MÁS RECIENTE` (`/my-health`),
  `TESTS FUNCIONALES` (`/quizzes`). Además, dentro de `/my-health` el `EdadAtpHeroCard`
  vuelve a entrar a `/edad-atp`.

**Consecuencia:** el usuario llega a los mismos datos (labs, biomarcadores, composición,
cuestionarios) por dos rutas con dos vocabularios distintos ("Historia Clínica" vs "Edad ATP").

---

## 1. INVENTARIO PANTALLA POR PANTALLA

Leyenda **Tipo:** MENÚ = solo navegación · DESTINO = muestra/captura datos · HÍBRIDO = mezcla ambos.

| # | Ruta / archivo | Título que ve el user | Tipo | Qué contiene | Lee de (tabla/servicio) | Navega a |
|---|---|---|---|---|---|---|
| 1 | `app/health-hub.tsx` | **"Historia Clínica"** (subtítulo "Tu expediente vivo de salud funcional") | **HÍBRIDO (grave)** | 1) Resumen ejecutivo del expediente + CTA "Añadir síntoma"/"Ver reporte ARGOS"; 2) Cards A/B: Mi Diagnóstico + Mi Protocolo; 3) **Widget vivo: los 7 sistemas funcionales colapsables con síntomas activos + quick-add**; 4) Lista de 11 cards "Módulos" (Mi Salud, Glucosa, Cetonas, Laboratorios, Guía de labs, Biomarcadores, Tests, Historia Clínica, Síntomas, Padecimientos, Cinemáticas) | `clinical-history-service` (`clinical_symptoms`) para el widget de sistemas; el resto son cards estáticas | `/salud/diagnostico`, `/salud/intervenciones`, `/argos-chat`, `/clinical-system?system=`, y las 11 rutas de módulos |
| 2 | `app/salud/diagnostico/index.tsx` | **"Mi Diagnóstico"** | DESTINO | Nivel DX 1-5, resumen ARGOS, "qué te falta" (chips navegables), raíces detectadas, fuentes que lo alimentan, historial de versiones, CTA generar/actualizar (H+), PDF | `dx-service` / `dx-engine` (`functional_dx`) | `/historia-clinica*`, `/quizzes`, `/labs-guide`, `/salud/intervenciones`, `/economy/shop` |
| 3 | `app/salud/intervenciones/index.tsx` | **"Mi Protocolo"** | DESTINO | Breadcrumb al DX, "Tus prescritas por ATP" (motor top-5), "Mi Protocolo" (activas + completar/pausar), catálogo completo colapsable de sugeridas | `intervention-service`, `prescription-service`, `dx-service` | `/salud/diagnostico`, `/salud/intervenciones/[key]`, `/salud/intervenciones/rationale` |
| 4 | `app/salud/intervenciones/[key].tsx` | Detalle de intervención | DESTINO | Ficha de una intervención (how/benefit/rastro) | `intervention-service` | back |
| 5 | `app/salud/intervenciones/rationale.tsx` | "¿Por qué estas intervenciones?" | DESTINO | Narrativa ARGOS del set activo | argos-proxy | back |
| 6 | `app/salud/sintomas.tsx` | **"Síntomas"** | DESTINO | Quick-tap de síntomas SUELTOS (chips + texto libre + severidad opcional + nota) y timeline por día | `sintomas-service` (**`clinical_symptoms_aislados`**) | back |
| 7 | `app/salud/padecimientos.tsx` | **"Padecimientos"** | DESTINO | Registro de condiciones + episodios (recurrencia), modal de alta | `padecimientos-service` (mig 173) | back |
| 8 | `app/historia-clinica/index.tsx` | **"Historia Clínica"** | MENÚ | Índice de 17 cuestionarios funcionales (5 base + integral + 10 áreas + Fitzpatrick); ✓ cuando respondido | `historia-clinica-service` (`historia_clinica`) | `/historia-clinica/[category]` |
| 9 | `app/historia-clinica/[category].tsx` | Título del cuestionario | DESTINO | Renderiza `TestQuestionScreen` con el banco de la categoría; guarda; Fitzpatrick además persiste fototipo | `HC_QUESTIONNAIRES` / `historia-clinica-service` | back |
| 10 | `app/clinical-system.tsx` | **"Sistema funcional · <nombre>"** | DESTINO | Drill-down de UN sistema: síntomas activos con registro de severidad + timeline, "Labs del sistema" (correlación), resueltos | `clinical-history-service` (`clinical_symptoms`) + `lab-values-service` (`lab_values`) | `/edad-atp/labs` |
| 11 | `app/labs-guide.tsx` | **"Guía de laboratorios"** | DESTINO (contenido editorial) | Guía "¿qué labs me hago?": paquetes, precios, dónde (México), preparación + PDF descargable | `labs-guide-content` (constants) + `labs-guide-service` (PDF) | back |
| 12 | `app/my-health.tsx` | **"Mi Salud"** | **HÍBRIDO** | `EdadAtpHeroCard` (Edad ATP), subir estudio (cámara/galería/PDF), "Datos por capturar" (recomendaciones navegables), uploads con error, "Mis labs", "Mis estudios" | `lab-service`, `clinical-study-service`, `health-measurement-service`, `EdadAtpHeroCard` | `/edad-atp`, `/edad-atp/labs`, `/edad-atp/biomarkers`, `/edad-atp/lab-confirmation`, rutas de captura (`captureRouteFor`) |
| 13 | `app/glucose-log.tsx` | **"Glucosa"** | DESTINO | Registro mg/dL + contexto + rangos + historial de hoy | `glucose_logs` (supabase) | back |
| 14 | `app/ketones-log.tsx` | **"Cetonas en sangre"** | DESTINO | Registro mmol/L + contexto + rangos de cetosis + historial | `ketones_logs` (supabase) | back |
| 15 | `app/health-input.tsx` | **"Evaluación"** (card de origen: "BIOMARCADORES") | DESTINO | Form colapsable: composición, medidas, cardiovascular, fuerza de agarre, bienestar, sueño, actividad | `health-measurement-service` (`health_measurements`) + `health-score-service` | `/my-health` |
| 16 | `app/quizzes.tsx` | **"TESTS"** | MENÚ | Braverman (hero) + 5 evaluaciones funcionales + Fitzpatrick + quizzes DB opcionales | `functional_quiz_results`, `quiz_responses`, `profiles.skin_type` | `/braverman`, `/functional-quiz`, `/historia-clinica/fitzpatrick`, `/quiz-take` |
| 17 | `app/braverman.tsx` | "Test de Braverman" | DESTINO | 313 preguntas de neurotransmisores | quiz service | back |
| 18 | `app/functional-quiz.tsx` | Quiz funcional individual | DESTINO | Renderiza un quiz de `ALL_FUNCTIONAL_QUIZZES` | `quiz-engine-service` | back |

### 1B. Sub-árbol paralelo "EDAD ATP" (mismo pilar, otra puerta)

| # | Ruta / archivo | Título | Tipo | Qué contiene | Lee de |
|---|---|---|---|---|---|
| 19 | `app/edad-atp/index.tsx` | **"Edad ATP"** | MENÚ | Hub con CE actual + 6 cards: Biomarcadores, Composición corporal, Mediciones puntuales, Cuestionarios (10 dominios), Test cognitivo, Tests funcionales | `edad-atp-v2-service`, `ce-service` |
| 20 | `app/edad-atp/biomarkers.tsx` | "Biomarcadores" | DESTINO | Captura de labs (PhenoAge, metabólico, hormonal) con auto-prepopulación | `edad_atp_biomarkers`, `lab_values`, `lab_results` |
| 21 | `app/edad-atp/composition.tsx` | "Composición corporal" | DESTINO | Peso, % grasa, músculo, FFMI | `edad_atp_*` |
| 22 | `app/edad-atp/vitals.tsx` | "Mediciones puntuales" | DESTINO | Presión arterial, FC reposo, VO2max | `edad_atp_*` |
| 23 | `app/edad-atp/questionnaires/index.tsx` | **"Cuestionarios"** | MENÚ | 10 dominios: metabolismo, hábitos, cardiovascular, sueño, sistema hormonal, vitalidad, inflamación, composición, renal/micronutrientes, inmunidad | `edad_atp_questionnaire_responses` |
| 24 | `app/edad-atp/questionnaires/[domain].tsx` | Cuestionario de dominio | DESTINO | Preguntas del dominio | `edad_atp_questionnaire_responses` |
| 25 | `app/edad-atp/labs.tsx` | "Laboratorios" | DESTINO | Sube/consulta estudios (destino de la card LABORATORIOS del health-hub) | `lab-service`, `lab_values` |
| 26 | `app/edad-atp/lab-confirmation.tsx` | Confirmar valores extraídos | DESTINO | Revisión pre-guardado del parser | `lab-review-store` |
| 27 | `app/edad-atp/cognitive.tsx` | "Test cognitivo" | DESTINO | Tiempo de reacción | edad-atp |
| 28 | `app/edad-atp/cinematic-tests-index.tsx` + `test-plank/bolt/old-man/recovery-hr.tsx` | "Pruebas cinemáticas" | MENÚ+DESTINO | Plank, BOLT, Old Man, Recovery HR (destino de la card CINEMÁTICAS del health-hub) | edad-atp tests |
| 29 | `app/edad-atp/tests/*`, `sub-edad/*`, `result-preview.tsx` | Tests / sub-edades / resultado | DESTINO | Reaction time, Cooper, push-ups, balance; desglose de sub-edades | edad-atp |

**Total pantallas del pilar mapeadas: ~29** (18 en el árbol "Historia Clínica" + ~11 en el árbol "Edad ATP").

---

## 2. ANÁLISIS DE REPETICIÓN (duplicaciones exactas)

### D1 — "SÍNTOMAS" aparece en 3 superficies, con 2 tablas distintas ⚠️ CRÍTICO
- **`health-hub.tsx`** widget de 7 sistemas → lee `clinical_symptoms` (con `system_key`), permite quick-add.
- **`clinical-system.tsx`** drill-down por sistema → lee **la misma** `clinical_symptoms`, registra severidad.
- **`salud/sintomas.tsx`** ("Síntomas") → lee **otra tabla**, `clinical_symptoms_aislados`.
- El health-hub además tiene una card "SÍNTOMAS" que lleva a `sintomas.tsx`.
→ Dos modelos de "síntoma" (por-sistema vs. aislado) en tablas separadas, ambos alimentan el DX
(`dx-engine.ts` lee ambas). El usuario ve "síntomas" en el widget del hub Y en una card separada
que va a otra pantalla con otra tabla. **Concepto "síntoma" fragmentado en 2 datos y 3 lugares.**

### D2 — Captura de BIOMARCADORES / labs duplicada entre árbol A y árbol B ⚠️ CRÍTICO
- `health-hub` card "BIOMARCADORES" → `health-input.tsx` → escribe `health_measurements`.
- `health-hub` card "ATP MI SALUD" → `my-health.tsx` → sube labs → `edad-atp/biomarkers.tsx` → escribe `edad_atp_biomarkers`.
- `edad-atp/index` card "Biomarcadores" → mismo `edad-atp/biomarkers.tsx`.
- Composición corporal se captura en `health-input.tsx` (sección COMPOSICIÓN) **y** en `edad-atp/composition.tsx`.
- Vitals (presión, FC, VO2max) en `health-input.tsx` (sección CARDIOVASCULAR/ACTIVIDAD) **y** en `edad-atp/vitals.tsx`.
→ Los mismos datos numéricos se capturan en 2-3 pantallas contra 2-3 tablas.

### D3 — LABORATORIOS aparece en múltiples entradas hacia el mismo destino
- `health-hub` card "LABORATORIOS" → `/edad-atp/labs`.
- `health-hub` card "ATP MI SALUD" (`my-health`) → también sube/muestra labs (usa `lab-service`).
- `clinical-system.tsx` "Labs del sistema" → botón "Ver todos los labs" → `/edad-atp/labs`.
- `YoEditorialSection` "LAB MÁS RECIENTE" → `/my-health`.
→ 4 puntos de entrada a "labs", repartidos entre `my-health` y `edad-atp/labs`.

### D4 — CUESTIONARIOS de salud funcional duplicados en 2 sistemas ⚠️ CRÍTICO
- **Árbol A:** `historia-clinica/index` = 17 cuestionarios (5 base + integral + 10 áreas + Fitzpatrick),
  tabla `historia_clinica`. Temas: digestiva, sueño, piel, metabólica, hormonal, inflamación,
  hábitos nutricionales, inmunológica, heredopatológicos.
- **Árbol B:** `edad-atp/questionnaires/index` = 10 dominios (metabolismo, hábitos, cardiovascular,
  sueño, sistema hormonal, vitalidad, inflamación, composición, renal/micronutrientes, inmunidad),
  tabla `edad_atp_questionnaire_responses`.
→ Ambos preguntan por sueño, hormonal, metabólico, inflamación, hábitos, inmunidad — **temas
solapados, dos bancos de preguntas, dos tablas, dos hubs de entrada.**

### D5 — Fitzpatrick surfaced en 2 lugares
- Card en `quizzes.tsx` ("Tipo de piel Fitzpatrick") → `/historia-clinica/fitzpatrick`.
- Es un cuestionario dentro de `HC_QUESTIONNAIRES`, así que también aparece conceptualmente en
  el índice de Historia Clínica. (Fuente única de estado: `profiles.skin_type`, eso sí está bien.)

### D6 — TESTS / evaluaciones repartidos entre `quizzes.tsx` y `edad-atp`
- `quizzes.tsx` ("TESTS") = Braverman + 5 funcionales + Fitzpatrick + quizzes DB.
- `edad-atp/index` card "Tests funcionales" = reaction time, Cooper, push-ups, balance.
- `edad-atp/cinematic-tests-index` = Plank, BOLT, Old Man, Recovery HR (surfaced también como card
  "PRUEBAS CINEMÁTICAS" en health-hub).
→ El concepto "test/evaluación" vive en `quizzes`, en `edad-atp/tests`, en `edad-atp/cognitive` y
en `edad-atp/cinematic-tests-index`.

### D7 — "Ver reporte / resultado" duplicado
- DX genera su propio PDF/summary (`salud/diagnostico`).
- `my-health` "Mis estudios" muestra `patient_summary` del coach.
- `edad-atp/result-preview` muestra el resultado de Edad ATP.
- `reports` (YO tab) es otro agregador.

---

## 3. NAVEGACIÓN vs CONSULTA MEZCLADAS (menús con datos incrustados)

### M1 — `health-hub.tsx` es el infractor #1
Es nominalmente el **menú del pilar**, pero incrusta CONSULTA viva:
- **Resumen ejecutivo del expediente** (headline calculado desde `clinical_symptoms`) — dato.
- **Widget de 7 sistemas funcionales colapsables con síntomas activos, badges de conteo y quick-add
  modal** — esto es una pantalla de consulta+captura completa metida dentro del menú.
- Debajo, además, hay 11 cards de navegación (correcto para un menú).
→ Contradice directamente la doctrina: el menú muestra los síntomas por sistema (dato) que
**deberían vivir solo dentro del destino** (`clinical-system.tsx` ya existe y hace exactamente eso).
El widget del hub y `clinical-system.tsx` son el mismo dato en dos lugares (ver D1).
Nota: los tickets #67/#30/#92 ("Historia Clínica todo dentro de cards") atacaron el *síntoma
visual* (que flotaba fuera de cards) pero no la *raíz* (que el dato no debería estar en el menú).

### M2 — `my-health.tsx` mezcla hero + acción + consulta
Contiene el `EdadAtpHeroCard` (score), el uploader de labs (acción), "Datos por capturar"
(recomendaciones navegables = menú), "Mis labs" y "Mis estudios" (consulta). Es hub + captura +
consulta a la vez, y comparte responsabilidad con `edad-atp/index` (que también es hub de captura).

### M3 — `edad-atp/index.tsx` es un menú "limpio" pero paralelo
Es un menú correcto (6 cards de navegación, el CE arriba es un score de resumen). El problema no es
interno sino que **duplica el rol de `health-hub` + `my-health`** desde otra puerta (YO tab).

---

## 4. CONFUSIÓN CONCEPTUAL (solapamientos de nombres)

| Concepto | Dónde vive / cómo se llama | Problema |
|---|---|---|
| **"Historia Clínica"** | (a) Nombre de la card del pilar en KIT; (b) título de `health-hub.tsx`; (c) módulo/card DENTRO de health-hub → `historia-clinica/index`; (d) título de `historia-clinica/index` | **El mismo nombre en 4 niveles jerárquicos distintos.** El pilar se llama igual que el hub que se llama igual que un sub-módulo del hub. Explica por qué "Historia Clínica falló 3 veces". |
| **"Salud" / "Mi Salud" / "ATP MI SALUD"** | `my-health.tsx` título "Mi Salud"; card en health-hub "ATP MI SALUD"; el pilar es "Salud Funcional" | Tres etiquetas de "salud" para cosas distintas (pilar vs. pantalla de labs/edad). |
| **"Edad ATP"** | Hub `edad-atp/index`, hero en `my-health`, card en YO | Sistema entero de captura que compite con "Historia Clínica" sin que el usuario sepa que son el mismo dominio. |
| **"Biomarcadores"** | Card health-hub "BIOMARCADORES" → `health-input` (composición/medidas/bienestar); card "Biomarcadores" en `edad-atp/index` → `edad-atp/biomarkers` (labs de sangre) | **Misma palabra, dos cosas distintas** (una es antropometría/wellbeing, la otra es química sanguínea). |
| **"Síntomas"** | Widget 7-sistemas (health-hub), `clinical-system`, card+pantalla "Síntomas" (`sintomas.tsx`) | Dos modelos ("por sistema" en `clinical_symptoms` vs. "aislados" en `clinical_symptoms_aislados`). El usuario no sabe cuál usar. |
| **"Padecimientos"** | Cuestionario "Padecimientos personales" (HC) + pantalla "Padecimientos" (`salud/padecimientos`, tabla mig 173) + card "PADECIMIENTOS" en health-hub | Un cuestionario Y un registro vivo con el mismo nombre, tablas distintas. |
| **"Diagnóstico"** | `salud/diagnostico` = "Mi Diagnóstico Funcional" (síntesis ARGOS) | OK en sí, pero convive con "Historia Clínica", "Sistemas funcionales" y "Síntomas" sin jerarquía clara de qué produce qué. |
| **"Tests / Evaluaciones / Cuestionarios / Quizzes"** | `quizzes.tsx` (TESTS), `historia-clinica` (cuestionarios), `edad-atp/questionnaires` (cuestionarios), `edad-atp/tests`, `functional-quiz` | 4-5 términos para "responder preguntas / hacer una prueba", en 4 lugares. |
| **"Sistemas funcionales" (7)** vs **"Dominios" (10, edad-atp)** vs **"Áreas" (10, HC)** | 3 taxonomías distintas de "partes del cuerpo/salud" | 7 sistemas (functional-systems.ts), 10 áreas HC (historia-clinica), 10 dominios edad-atp. Ninguna mapea 1:1 con las otras. |

**Los 3 solapamientos más graves:**
1. **"Historia Clínica" reutilizado en 4 niveles** (pilar → hub → módulo → pantalla).
2. **Dos sistemas paralelos completos de captura** ("Historia Clínica"/`health_measurements`+`historia_clinica`+`clinical_symptoms` vs "Edad ATP"/`edad_atp_*`), con biomarcadores, composición, vitals y cuestionarios duplicados.
3. **"Síntoma" fragmentado** en 2 tablas y 3 superficies (widget del hub, `clinical-system`, `sintomas`).

---

## 5. PANTALLAS HUÉRFANAS / MUERTAS / SIN ENTRY POINT LIMPIO

- **`health-input.tsx`** — accesible solo vía card "BIOMARCADORES" del health-hub. Su título es
  "Evaluación" (no coincide con la card "BIOMARCADORES"). Compite funcionalmente con
  `edad-atp/biomarkers` + `edad-atp/composition` + `edad-atp/vitals`. Candidata a muerte/fusión.
- **`edad-atp/index.tsx`** — solo alcanzable desde la tab YO y desde `settings/dev.tsx`; **NO tiene
  entry point desde el health-hub del pilar Salud Funcional.** Todo su sub-árbol de captura vive
  "escondido" bajo YO/Mi Salud, no bajo el pilar.
- **`clinical-system.tsx`** — no tiene entry point propio en ningún menú; solo se alcanza tocando un
  síntoma o "Ver sistema" dentro del **widget del health-hub**. Si se limpia el widget del hub
  (doctrina), esta pantalla queda huérfana salvo que se le dé una puerta.
- **Quizzes DB (`quiz_responses` / `/quiz-take`)** — `quizzes.tsx` renderiza una segunda sección
  "EVALUACIONES FUNCIONALES" desde DB solo si `dbQuizzes.length > 0`; hoy probablemente vacía →
  sección muerta con el **mismo label** que la de arriba (duplicado de encabezado).
- **`historia-clinica/index` vs `health-hub`** — ambos con título "Historia Clínica"; el primero es
  un sub-destino del segundo. No es huérfana pero sí redundante en nombre.
- **`condition-catalog.ts`** — NO se usa en el pilar consumer; solo en el lado coach
  (`ClientDetailScreen`, `client-profile-service`). El registro consumer de padecimientos usa
  `padecimientos-core`, no este catálogo. (Dato: no confundirlo con datos del pilar consumer.)
- **`my-health`** parcialmente redundante con `edad-atp/index` (ambos = hub de labs/edad).

---

## 6. ÁRBOL DE NAVEGACIÓN ACTUAL (ASCII)

```
TAB KIT
└── card "HISTORIA CLÍNICA"  → /health-hub  ["Historia Clínica"]  (HÍBRIDO)
      │
      ├── [DATO incrustado] Resumen ejecutivo del expediente
      ├── [DATO incrustado] Widget 7 SISTEMAS FUNCIONALES (clinical_symptoms)
      │        └── tocar síntoma / "Ver sistema" → /clinical-system?system=  (DESTINO)
      │                                              └── "Ver todos los labs" → /edad-atp/labs
      │
      ├── Card A "MI DIAGNÓSTICO"      → /salud/diagnostico
      │        ├── chips "qué te falta" → /historia-clinica*, /quizzes, /labs-guide
      │        └── "Ver intervenciones" → /salud/intervenciones
      ├── Card B "MI PROTOCOLO"        → /salud/intervenciones
      │        ├── breadcrumb          → /salud/diagnostico
      │        ├── ficha               → /salud/intervenciones/[key]
      │        └── "¿por qué?"         → /salud/intervenciones/rationale
      │
      └── MÓDULOS (11 cards de navegación):
            ├── "ATP MI SALUD"          → /my-health  (HÍBRIDO)
            │       ├── EdadAtpHeroCard → /edad-atp  ┐  (PUERTA al árbol B)
            │       ├── subir labs      → /edad-atp/lab-confirmation
            │       ├── datos x capturar→ captureRouteFor(...) (/edad-atp/*)
            │       └── "Mis labs/estudios" [DATO]
            ├── "GLUCOSA"               → /glucose-log         (DESTINO)
            ├── "CETONAS EN SANGRE"     → /ketones-log         (DESTINO)
            ├── "LABORATORIOS"          → /edad-atp/labs       (DESTINO, árbol B)
            ├── "GUÍA DE LABORATORIOS"  → /labs-guide          (DESTINO)
            ├── "BIOMARCADORES"         → /health-input        (DESTINO ["Evaluación"])
            ├── "TESTS Y EVALUACIONES"  → /quizzes             (MENÚ)
            │       ├── /braverman
            │       ├── /functional-quiz
            │       └── /historia-clinica/fitzpatrick
            ├── "HISTORIA CLÍNICA"      → /historia-clinica    (MENÚ ["Historia Clínica"])
            │       └── /historia-clinica/[category] (17 cuestionarios)
            ├── "SÍNTOMAS"              → /salud/sintomas      (DESTINO, clinical_symptoms_aislados)
            ├── "PADECIMIENTOS"         → /salud/padecimientos (DESTINO, mig 173)
            └── "PRUEBAS CINEMÁTICAS"   → /edad-atp/cinematic-tests-index (árbol B)

TAB YO  (PUERTA PARALELA al mismo dominio)
├── card "EDAD ATP"            → /edad-atp  ["Edad ATP"]  (MENÚ)
│       ├── "Biomarcadores"          → /edad-atp/biomarkers   (⇄ dup de health-input)
│       ├── "Composición corporal"   → /edad-atp/composition  (⇄ dup de health-input)
│       ├── "Mediciones puntuales"   → /edad-atp/vitals       (⇄ dup de health-input)
│       ├── "Cuestionarios" (10 dom) → /edad-atp/questionnaires (⇄ dup de historia-clinica)
│       ├── "Test cognitivo"         → /edad-atp/cognitive
│       └── "Tests funcionales"      → /edad-atp/tests
├── card "COMPOSICIÓN CORPORAL" → /my-health
├── card "LAB MÁS RECIENTE"     → /my-health
└── card "TESTS FUNCIONALES"    → /quizzes
```

---

## RESUMEN EJECUTIVO (<250 palabras)

**Pantallas mapeadas: ~29** — 18 en el árbol "Historia Clínica" (entrada por KIT → `/health-hub`)
y ~11 en un árbol PARALELO "Edad ATP" (entrada por la tab YO → `/edad-atp` y `/my-health`). El pilar
tiene **dos puertas y dos vocabularios** para el mismo dominio.

**Duplicaciones encontradas: 7 familias** — (D1) síntomas en 3 superficies / 2 tablas
(`clinical_symptoms` vs `clinical_symptoms_aislados`); (D2) biomarcadores/composición/vitals
capturados en `health-input` **y** en `edad-atp/*`; (D3) 4 entradas a "labs"; (D4) cuestionarios
funcionales en `historia-clinica` (17) **y** `edad-atp/questionnaires` (10) con temas solapados;
(D5) Fitzpatrick en 2 lugares; (D6) tests repartidos en `quizzes` + 3 rutas edad-atp; (D7) reportes
en 4 sitios.

**Los 3 solapamientos conceptuales más graves:**
1. **"Historia Clínica" reutilizado en 4 niveles** (pilar KIT → hub → módulo → pantalla) — la raíz
   de por qué el rediseño falló 3 veces: no es un bug visual, es que el mismo nombre etiqueta cuatro
   cosas distintas.
2. **Dos sistemas de captura paralelos y completos** ("Historia Clínica"/`health_measurements`+
   `historia_clinica`+`clinical_symptoms` vs "Edad ATP"/`edad_atp_*`), con datos numéricos y
   cuestionarios duplicados en tablas separadas.
3. **`health-hub` es un HÍBRIDO** que incrusta consulta viva (resumen + widget de 7 sistemas con
   síntomas y quick-add) en lo que debería ser solo un menú — violación directa de la doctrina, y el
   mismo dato ya vive en `clinical-system.tsx`.
