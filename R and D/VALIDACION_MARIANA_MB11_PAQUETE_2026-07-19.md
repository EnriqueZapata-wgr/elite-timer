# 🩺 Paquete de validación clínica MB-11 — Pendientes acumulados hacia V2
### Para: Mariana Zapata · Chief Science Officer, ATP · nutrióloga clínica funcional
### De: equipo de producto ATP · Fecha: 2026-07-19

---

## ¿Qué es esto?

Durante los sprints de construcción hacia la versión 2.0 se acumularon **seis pendientes que requieren tu ojo clínico** antes de poder cerrar el desarrollo. No son rediseños ni decisiones de producto: son **contenidos, listas y umbrales clínicos** que Enrique dejó marcados explícitamente para que tú los cierres, valides o corrijas.

Este paquete es **completo y autocontenido**: todo lo que necesitas revisar está aquí adentro, con su contexto en lenguaje clínico y el contenido literal a validar. No necesitas abrir la app, el código, ni pedir nada más.

## ¿Por qué tu firma bloquea el gate final de V2?

ATP opera bajo modelo de medicina funcional y hace recomendaciones que tocan contraindicaciones reales (ayunos, terapias de frío/calor, respiraciones, suplementación). **Ninguno de estos seis temas puede pasar a producción sin validación clínica firmada.** Enrique es el autor del algoritmo y del stack; tu rol es validar y firmar el criterio clínico. Mientras estos ítems estén abiertos, el gate de V2 permanece cerrado.

## Cómo marcar cada ítem

Junto a cada punto encontrarás tres casillas. Marca **una**:

- ☐ **Aprobar** — queda tal cual, sin cambios.
- ☐ **Editar** — algo cambia; escribe el cambio en el espacio de **Notas**.
- ☐ **Quitar** — no debe existir / es riesgoso / redundante; anota por qué.

Cada tema tiene además un espacio de **Notas generales** al final para lo que quieras agregar.

---

# TEMA 1 · Listas clínicas pendientes (4 listas)

**Contexto clínico:** el nuevo Cuestionario Maestro captura padecimientos, medicamentos y antecedentes del usuario para decidir qué intervenciones son seguras. La arquitectura del cuestionario ya está firmada por Enrique; lo que falta es que tú cierres el **contenido clínico** de cuatro listas: qué padecimientos se ofrecen, qué contraindicaciones absolutas faltan, qué nutrientes deplecan los anticonceptivos, y cómo se redactan tres preguntas sensibles. Ninguna de estas listas cambia cómo funciona la app; solo su contenido clínico.

## 1.1 · Lista de padecimientos crónicos (pregunta D9.2)

**Uso clínico:** esta lista es la fuente de varias contraindicaciones. El usuario marca cada padecimiento con su estado (activo / en remisión / resuelto), y una contraindicación **solo se dispara si está activo**. Valida que la lista esté clínicamente completa y bien nombrada.

| # | Etiqueta que ve el usuario |
|---|---|
| 1 | Hipertensión (presión alta) |
| 2 | Diabetes tipo 1 |
| 3 | Diabetes tipo 2 |
| 4 | Hipotiroidismo |
| 5 | Hipertiroidismo |
| 6 | Hashimoto (tiroiditis autoinmune) |
| 7 | Otra autoinmune (lupus, artritis reumatoide, Crohn…) |
| 8 | Fibromialgia |
| 9 | Migraña |
| 10 | SOP (síndrome de ovario poliquístico) |
| 11 | Endometriosis |
| 12 | Depresión |
| 13 | Trastorno de ansiedad |
| 14 | TDAH |
| 15 | Cáncer (cualquier tipo) |

☐ Aprobar la lista tal cual ☐ Editar (¿agregar/quitar/renombrar cuáles?) ☐ Quitar

**Notas:**
_______________________________________________________________________

## 1.2 · Contraindicaciones absolutas faltantes (lista maestra)

**Uso clínico:** son flags binarios que **excluyen intervenciones de forma absoluta**. En la revisión previa del cuestionario quedó la pregunta de si faltaban contraindicaciones absolutas para intervenciones específicas (respiraciones intensas, luz, frío/sauna, ayunos agresivos). Esta es la lista propuesta para sumar. Valida cada una y agrega las que falten.

| # | Contraindicación | Motivo clínico de por qué se sugiere |
|---|---|---|
| 1 | Epilepsia | Riesgo con respiraciones intensas (hiperventilación), luz estroboscópica, hipertermia |
| 2 | Marcapasos | Riesgo con terapias de frío/contraste y estimulación |
| 3 | Uso de anticoagulantes | Riesgo con intervenciones que afectan coagulación / trauma |
| 4 | Insuficiencia renal | Riesgo con ayunos agresivos y cargas metabólicas |
| 5 | Insuficiencia hepática | Riesgo con ayunos agresivos y metabolismo de sustancias |

☐ Aprobar las 5 tal cual ☐ Editar (¿agregar cuáles? ¿faltan absolutas?) ☐ Quitar

**Pregunta directa para ti:** ¿faltan contraindicaciones absolutas que debamos capturar? (p. ej. trastorno alimentario activo, embarazo/lactancia ya están cubiertos por otras preguntas).

**Notas:**
_______________________________________________________________________

## 1.3 · Depleciones por anticonceptivos hormonales (pregunta D6.4)

**Uso clínico:** cuando una usuaria reporta anticonceptivos hormonales (píldora, DIU hormonal, implante, inyección), el motor asume depleción de ciertos micronutrientes y ajusta el contexto (no es una contraindicación dura, es contexto nutricional). Valida que el mapeo de depleción sea correcto clínicamente.

**Nutrientes que hoy se marcan como deplecionados:**

| # | Nutriente |
|---|---|
| 1 | Vitamina B6 |
| 2 | Folato |
| 3 | Zinc |
| 4 | Magnesio |

☐ Aprobar el mapeo tal cual ☐ Editar (¿agregar/quitar? p. ej. B12, B2, vitamina C, selenio, coenzima Q10) ☐ Quitar

**Notas:**
_______________________________________________________________________

## 1.4 · Framing de las 3 preguntas sensibles

**Uso clínico:** tres preguntas tocan temas delicados (trauma emocional, sexualidad, estado reproductivo actual). El objetivo es capturar data clínicamente útil **sin dañar ni sonar invasivo**. Valida que la redacción y las opciones sean seguras y respetuosas. Estas preguntas ya activan comportamientos: la de trauma activa el modo "trauma-informed" en ARGOS; la de estado reproductivo dispara los flags de embarazo/lactancia.

**A) Trauma emocional (D9.6)** — activa modo trauma-informed
> **Texto:** "¿Traumas emocionales activos o no resueltos que estén afectando tu vida hoy?"
> **Opciones:** No · Sí, y estoy en terapia · Sí, sin acompañamiento · (Prefiero no responder)

☐ Aprobar ☐ Editar ☐ Quitar

**B) Estado reproductivo ACTUAL (D9.4b)** — dispara flags embarazo/lactancia
> **Intro:** "Esto define qué intervenciones son seguras HOY. No es tu historia, es tu estado presente."
> **Texto:** "¿Cuál es tu situación actual?"
> **Opciones:** Embarazada · Lactando · Buscando embarazo · Ninguna de estas · (Prefiero no responder)

☐ Aprobar ☐ Editar ☐ Quitar

**C) Sexualidad y libido (D12 · sección completa)**
> **Intro de sección:** "La libido y la función sexual son biomarcadores hormonales potentes. Puedes saltar esta sección si prefieres — pero es data valiosa."
> **D12.1:** "¿Cómo describirías tu libido o deseo sexual actualmente?" (escala ausente→alto)
> **D12.2:** "¿Notas cambios en tu libido en los últimos 6 meses?" (Subió / Bajó / Estable / Fluctúa mucho)
> **D12.3 (solo hombres):** "¿Cómo está tu función eréctil?"
> **D12.4 (solo mujeres):** "¿Cómo está tu función sexual y placer (lubricación, dolor)?"

☐ Aprobar ☐ Editar ☐ Quitar

**Notas generales del Tema 1:**
_______________________________________________________________________

---

# TEMA 2 · Calibración del motor de personalización (1 decisión)

**Contexto clínico:** el motor que arma las recomendaciones personalizadas ("Mi Protocolo") le da a cada intervención una puntuación. Hoy, el **peso que se le da a la prioridad clínica intrínseca** de la intervención es tan grande que **satura la puntuación** y las 5 recomendaciones que se le presentan al usuario pierden capacidad de diferenciarse entre sí (varias llegan al tope de 100 puntos). El equipo técnico propone **reducir a la mitad ese multiplicador** para que la relevancia real al caso del usuario (cuántos de sus problemas ataca la intervención y con qué severidad) pese más frente a la prioridad genérica.

**En lenguaje clínico:** hoy una intervención de alta prioridad "gana" casi siempre aunque toque poco el cuadro específico de la persona. Con el cambio, una intervención que atiende **varios problemas activos y severos** del usuario puede subir de ranking frente a una de prioridad alta que le aplica menos. Es un rebalanceo hacia la **pertinencia individual**, no un cambio de qué intervenciones existen ni de sus contraindicaciones.

**Qué NO cambia:** las contraindicaciones, la lista de intervenciones, los universales de piso garantizado, y el criterio de que el match es determinístico (no lo decide una IA).

**Qué debes validar:**
- ☐ **Aprobar** el rebalanceo (que la pertinencia al caso pese más y la prioridad genérica pese menos).
- ☐ **Editar** (¿preferirías otra proporción, o mantener prioridad clínica dominante?).
- ☐ **Quitar** / no hacer el cambio (dejar el peso de prioridad como está).

> Nota de trazabilidad: el cambio ya está estudiado por el equipo técnico y **está bloqueado en el código a la espera de tu firma** — no se aplicará hasta que valides este ítem.

**Notas:**
_______________________________________________________________________

---

# TEMA 3 · Rangos de cetonas en las 3 fuentes de medición (3 rangos)

**Contexto clínico:** el módulo de cetonas ahora acepta las tres formas de medir cetosis, cada una en su unidad. El estándar clínico es **sangre (β-hidroxibutirato, mmol/L)**; el **aliento (acetona, ppm)** y la **orina (acetoacetato, tira cualitativa)** son proxies. Los umbrales de aliento se marcaron como **orientativos** y necesitan tu validación o corrección. Valida las tres tablas.

## 3.1 · Sangre — β-hidroxibutirato (mmol/L) · estándar clínico

| Rango (mmol/L) | Etiqueta que ve el usuario |
|---|---|
| < 0.5 | Sin cetosis |
| 0.5 – 1.5 | Cetosis ligera |
| 1.6 – 3.0 | Cetosis óptima |
| 3.1 – 5.0 | Cetosis alta |
| > 5.0 | Muy alta |

☐ Aprobar ☐ Editar ☐ Quitar

## 3.2 · Aliento — acetona (ppm) · ⚠️ correlación orientativa, requiere tu validación

| Rango (ppm) | Etiqueta que ve el usuario |
|---|---|
| < 2 | Sin cetosis |
| 2 – 10 | Cetosis ligera |
| 11 – 40 | Cetosis óptima |
| > 40 | Cetosis alta |

☐ Aprobar los umbrales 2 / 10 / 40 ppm ☐ Editar (¿qué cortes prefieres?) ☐ Quitar

## 3.3 · Orina — acetoacetato (tira cualitativa)

| Nivel de la tira | Etiqueta que ve el usuario |
|---|---|
| Negativo | Negativo |
| Trazas | Trazas |
| Pequeña | Pequeña |
| Moderada | Moderada |
| Grande | Grande |

☐ Aprobar ☐ Editar ☐ Quitar

> Nota clínica ya incorporada en la app: la orina se presenta como **cualitativa** (no como número fiable), y el aliento se etiqueta como aproximación, no como equivalente a sangre.

**Notas generales del Tema 3:**
_______________________________________________________________________

---

# TEMA 4 · Copy del welcome tour (7 pantallas)

**Contexto clínico y de compliance:** al terminar el pago y el onboarding, el usuario ve un recorrido editorial de 7 pantallas (una por pilar). Necesitamos tu revisión de **claims de salud**: que ninguna frase prometa un resultado médico, diagnostique, ni cruce las guías de las tiendas de apps. Cada pantalla es una sola idea. La 6ª pantalla cambia según el sexo biológico (Ciclo para mujeres, Comunidad para el resto — nunca contenido de ciclo a un hombre).

| # | Pilar (kicker) | Copy que ve el usuario |
|---|---|---|
| 1 | HOY | "Tu día, en un solo lugar. Cada acción suma electrones y carga tu momentum." |
| 2 | FITNESS | "Rutinas y métodos propietarios que se ajustan a ti, no al revés." |
| 3 | NUTRICIÓN | "Registra por foto o texto. Ayuno, hidratación y suplementos con criterio funcional." |
| 4 | MENTE | "Respira, medita, escribe. Tu sistema nervioso también entrena." |
| 5 | SALUD | "Tus labs, tu Edad ATP y tu diagnóstico funcional — la raíz, no el síntoma." |
| 6a | CICLO (solo mujeres) | "Tu fisiología tiene ventanas que un hombre no tiene. Aprende a aprovecharlas." |
| 6b | COMUNIDAD (resto) | "No lo haces solo. La Tribu ATP avanza contigo." |
| 7 | EMPIEZA | "ARGOS ya conoce tus datos. Abre HOY y carga tu primer electrón." |

Marca por pantalla (usa el espacio de notas para las que edites):

- Pantalla 1 (HOY): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 2 (FITNESS): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 3 (NUTRICIÓN): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 4 (MENTE): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 5 (SALUD): ☐ Aprobar ☐ Editar ☐ Quitar — *(atención especial: "diagnóstico funcional")*
- Pantalla 6a (CICLO): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 6b (COMUNIDAD): ☐ Aprobar ☐ Editar ☐ Quitar
- Pantalla 7 (EMPIEZA): ☐ Aprobar ☐ Editar ☐ Quitar

**Pregunta directa para ti:** ¿"diagnóstico funcional" (pantalla 5) es un término que podemos usar en copy consumer sin cruzar guidelines de las tiendas? ¿Prefieres una redacción alterna?

**Notas generales del Tema 4:**
_______________________________________________________________________

---

# TEMA 5 · Contraindicación de fiebre en terapias de frío/calor (2 ítems)

**Contexto clínico:** todas las intervenciones térmicas (saunas, duchas frías, inmersión fría, contraste, respiraciones tipo Wim Hof) contraindican hacerlas con fiebre activa. El problema era que cada una lo escribía distinto; se **normalizó a un único texto canónico**. Valida la redacción clínica de ese texto, y confirma qué hacer con una intervención que quedó con un texto distinto.

## 5.1 · Texto canónico de contraindicación de fiebre

**Redacción única que ahora usan todas las térmicas:**
> **`fiebre_viral_activa_37_8_o_mas`**
> (léase: "fiebre viral activa, 37.8 °C o más")

Aplica a: sauna infrarrojo, sauna finlandesa, sauna de vapor, duchas frías (niveles 1–3), inmersión fría, terapia de contraste, respiraciones Wim Hof (básico y extendido) y otras térmicas.

**Pregunta clínica para ti:** ¿el **umbral de 37.8 °C** es el correcto para contraindicar terapia térmica, o prefieres otro corte (p. ej. 38.0 / 38.5 °C)? ¿La redacción "fiebre viral activa" es la adecuada, o debería ser "fiebre activa de cualquier origen"?

☐ Aprobar el texto y el umbral 37.8 °C ☐ Editar (nuevo umbral / redacción) ☐ Quitar

## 5.2 · Hallazgo: una intervención aún tiene texto NO canónico

**Baño caliente vespertino** (intervención de relajación pre-sueño) todavía contraindica fiebre con un texto viejo, **distinto** al canónico:
> Texto actual en esa intervención: **`infeccion_activa_con_fiebre`**
> Texto canónico esperado: **`fiebre_viral_activa_37_8_o_mas`**

Esto es un hallazgo pendiente: quedó fuera de la normalización. Además, sus otras contraindicaciones incluyen `epilepsia_no_controlada` y `primer_trimestre_embarazo`, que sí están bien.

**Decisión para ti:** ¿alineamos "baño caliente vespertino" al texto canónico de fiebre como las demás térmicas?

☐ Aprobar la alineación al canónico ☐ Editar (mantener redacción propia por alguna razón clínica) ☐ Quitar

**Notas generales del Tema 5:**
_______________________________________________________________________

---

# TEMA 6 · Pendientes clínicos del módulo Ciclo / Embarazo (3 ítems)

**Contexto clínico:** al construir el pilar Ciclo Femenino quedaron marcados tres puntos que el equipo dejó explícitamente para tu revisión clínica antes de considerarlos terminados.

## 6.1 · Interpretación de labs hormonales por fase del ciclo

**Qué se construyó:** cuando una mujer registra estradiol, progesterona, LH o FSH, la app **anota junto al valor la fase del ciclo** en que se tomó (folicular, ovulatoria, lútea, menstrual), porque el mismo valor significa cosas distintas según la fase. Si no hay fase registrada, la app lo dice explícito: *"⚠ Sin fase del ciclo registrada — este valor puede malinterpretarse"*.

**Qué validar:** ¿la lógica de contextualizar los cuatro marcadores hormonales por fase es clínicamente correcta? ¿Faltan marcadores que también deban contextualizarse por fase? ¿El aviso de "sin fase registrada" está bien planteado?

☐ Aprobar ☐ Editar (¿agregar marcadores / ajustar aviso?) ☐ Quitar

## 6.2 · Máscara "ATP Embarazo" — alcance del contenido

**Qué se construyó:** con embarazo activo, el pilar Ciclo se transforma en modo Embarazo: muestra "Semana N · trimestre", una barra de 0 a 40 semanas, copy cálido ("Estás acompañada en cada etapa") y **suprime toda predicción de menstruación**. Se cuidó tener **cero lenguaje de riesgo o alarmista**.

**Qué falta y necesita tu criterio:** el contenido **nutricional y de ejercicio por trimestre** aún no está — se dejó fuera a propósito por sensibilidad clínica, esperando que tú lo definas o revises. Valida:
- ¿Aprobamos la máscara base (semana/trimestre + supresión de predicción menstrual + copy cálido) tal cual para V2?
- ¿Qué contenido nutricional/ejercicio por trimestre quieres que exista (o explícitamente NO exista) en V2?

☐ Aprobar máscara base sin contenido por trimestre ☐ Editar (definir contenido por trimestre) ☐ Quitar

## 6.3 · Lactancia — ¿entra a V2 con máscara propia?

**Estado actual:** el estado de lactancia **se captura** (en el cuestionario y en la configuración del ciclo) y dispara los flags de seguridad, pero **no tiene una pantalla/máscara propia** como sí la tiene embarazo. Solo existe la máscara de embarazo.

**Decisión para ti:** ¿la lactancia necesita su propia experiencia/consideraciones clínicas en V2, o basta con que dispare las contraindicaciones de seguridad sin pantalla dedicada?

☐ Aprobar (basta con flags de seguridad, sin máscara propia en V2) ☐ Editar (definir qué necesita lactancia) ☐ Quitar

**Notas generales del Tema 6:**
_______________________________________________________________________

---

# ✍️ Firma de validación clínica

Al firmar, confirmo que revisé los seis temas de este paquete y que las decisiones marcadas (Aprobar / Editar / Quitar por ítem) representan mi criterio clínico como Chief Science Officer de ATP. Entiendo que esta firma es requisito para cerrar el gate final de la versión 2.0.

**Alcance de lo firmado:** listas clínicas del cuestionario (padecimientos, contraindicaciones, depleciones, framing sensible) · calibración del motor de personalización · rangos de cetonas en sangre/aliento/orina · copy de salud del welcome tour · redacción de la contraindicación de fiebre en terapias térmicas · pendientes clínicos del módulo Ciclo/Embarazo/Lactancia.

Nombre: _______________________________________________

Firma: ________________________________________________

Fecha: ____________________

Comentarios finales / ítems que quiero revisar en sesión con Enrique:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

---

# 📎 Apéndice técnico — trazabilidad (para el equipo, no para revisión clínica)

> Ubicaciones en código de cada ítem, para que el desarrollador aplique lo que Mariana firme. Todas las fuentes de este paquete **fueron localizadas** en el repositorio; no hubo pendientes "no localizados".

**Tema 1 — Listas clínicas [PEND-MARIANA]:**
- Listas parametrizables: `src/constants/master-quiz-bank.ts` → `PADECIMIENTOS_PEND_MARIANA` (#1), `CONTRAINDICACIONES_PEND_MARIANA` (#2), `ANTICONCEPTIVO_DEPLECIONES_PEND_MARIANA` (#3).
- Framing sensible (#4): preguntas D9.6, D9.4b, D12.x en el mismo archivo (flag `pendMariana`).
- Mapeo de depleción en scoring: `src/services/salud/master-quiz-core.ts` (marca `[PEND-MARIANA #3]`).
- Documentos de origen: `R and D/CUESTIONARIO_MAESTRO_EDICIONES_ENRIQUE_v2_2026-07-16.md`, `R and D/FABLE_MEGASPRINT_D_DELIVERY.md`.

**Tema 2 — Scoring ×10→×5 (task #130):**
- `src/services/interventions/personalize-interventions.ts` → función `computeScore` (multiplicador `boostWeight * 10`, con TODO explícito de bajar a ×5 pendiente de firma de Mariana).
- Motor determinístico paralelo: `src/services/interventions/intervention-engine-core.ts` → `matchInterventions` (`PRIORITY_WEIGHT[priority] * 10`).
- Referencia: `R and D/FABLE_MB8_PULIDO_DELIVERY.md` ("Scoring motor ×10→×5: fuera de alcance sin firma de Mariana, va en MB-11").

**Tema 3 — Cetonas 3 fuentes (#113, MB-8):**
- `src/services/salud/ketones-source-core.ts` → `bloodKetoStatus`, `breathKetoStatus` (umbrales 2/10/40 ppm orientativos), `urineKetoStatus`, `URINE_LEVELS`.
- Migración 204 (idempotente, columna `source`).

**Tema 4 — Welcome tour (MB-10):**
- `src/components/tour/app-tour-core.ts` → `buildTourSteps` (7 pasos, 6º ramifica por sexo).

**Tema 5 — Fiebre / térmicas (#130, MB-8):**
- String canónico `fiebre_viral_activa_37_8_o_mas` en `src/constants/interventions-catalog.ts` (saunas, duchas frías, inmersión, contraste, Wim Hof).
- Hallazgo no canónico: intervención `bano_caliente_vespertino` usa `infeccion_activa_con_fiebre` en su bloque `contraindications`.

**Tema 6 — Ciclo/Embarazo/Lactancia (MB-7):**
- Labs por fase: `src/services/edad-atp` / `lab-cycle-context-core` (cableado en biomarkers).
- Máscara embarazo: `src/utils/pregnancy.ts`, `app` cycle screens; migración 080 (`pregnancy_status`, ya aplicada al remoto).
- Referencia: `R and D/FABLE_MB7_CICLO_DELIVERY.md` (secciones "Dudas para Enrique": máscara embarazo alcance, lactancia sin máscara, labs por fase).
