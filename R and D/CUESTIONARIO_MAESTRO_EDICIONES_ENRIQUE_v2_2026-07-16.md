# ✍️ Cuestionario Maestro · Ediciones de revisión (v2) — APLICAR

**Fecha:** 2026-07-16
**Fuente:** revisión de Enrique sobre `VALIDACION_MARIANA_CUESTIONARIO_MAESTRO_revisado.docx`
**Estado firma:** Enrique firmó UX/copy/estructura. Los 4 ítems **[PEND-MARIANA]** esperan confirmación clínica de Mariana (son contenido/listas, no bloquean implementar la estructura).
**Para:** Fable (Mega-Sprint D) · aplicar estas ediciones sobre el banco de `CUESTIONARIO_MAESTRO_ATP_v1.md`.

---

## A · Principios GLOBALES de copy/UX (aplican a TODAS las preguntas)

Doctrina: `feedback_copy_ux_cuestionario_globales`.

1. **Español de México** siempre.
2. **Explicar toda sigla/abreviatura** en línea (TRT, HRT, IBP, GLP-1, ACE, TCE…). Nunca asumir que el user las conoce.
3. **Guiar todo con ejemplos concretos** — "tratar al user como de secundaria". Cada pregunta con contexto/ejemplo, ninguna "desnuda".
4. **Multiselect** siempre con helper visible **"(selecciona todas las que apliquen)"**.
5. **Inputs amigables tipo iOS** — los inputs complejos (lista de suplementos con dosis, meds) NO deben sentirse formulario burocrático. Amigables, entendibles.

---

## B · Ediciones puntuales por pregunta (firmadas por Enrique)

| Pregunta | Cambio a aplicar |
|---|---|
| **D1.3** | Digestión (multiselect): mostrar helper "(selecciona todas las que apliquen)". |
| **D1.7** | Cafeína/estimulantes: agregar **ejemplos de estimulantes** (café, té, mate, pre-entreno, nicotina, bebidas energéticas…). |
| **D2.3** | Básculas smart: agregar **lepulse** y **garmin** a la lista de marcas. |
| **D2.4** | Cintura: agregar opción **"No lo sé / llenar más tarde"** (no forzar el dato). |
| **D5.1** | Confirmar copy en español de México. |
| **D5.3** | Alcohol: decir explícitamente **"bebidas alcohólicas"** (no solo "bebidas"). |
| **D5.4** | **Separar en DOS preguntas: tabaquismo y vapeo** (caso clínico distinto). Cada una con sus opciones de frecuencia. |
| **D9.5** | Traumas físicos: cambiar de **campo libre → chips + "otro"** (el motor determinístico no razona bien texto libre; chips es lo correcto). |
| **B.5** | Expandir: de 1 pregunta a **3-5 preguntas de marketing/adquisición + churn management** (qué te trajo, canal, qué casi te frena, qué esperas, etc.). Diseñar para extraer la mejor señal de mktng/retención. |

### Ramificación (deep-dive) GLP-1 (D8.1/D8.3)
Agregar subpregunta: **"¿Cómo sientes tu motivación general últimamente?"** (los GLP-1 pueden aplanar motivación/anhedonia — señal clínica relevante).

---

## C · Cambios ESTRUCTURALES (arquitectura, no copy) — los importantes

### C1 · Padecimientos: ACTIVO vs RESUELTO (D9.2) — **prioridad alta**
Doctrina: `project_cuestionario_padecimientos_activo_vs_resuelto`.

D9.2 **no puede ser multiselect plano.** Cada padecimiento seleccionado necesita **estado**:
- `activo` · `en remisión` · `resuelto` (+ año aproximado si aplica)

Es el **mismo modelo `is_active` / `resolved_at` / `started_at`** de la migración 202 `user_symptoms` (task #135). Aplicar la doctrina "un modelo + duración" también a padecimientos.

**Regla dura para el motor:** una **contraindicación solo se dispara si la condición está ACTIVA.** Ejemplos reales founders: hipertensión resuelta (Enrique) y cáncer/leucemia en remisión (Mariana) **NO** deben gatillar exclusiones. Historia ≠ estado actual.

Modelo de datos: agregar a la tabla de padecimientos (o `user_master_quiz` answer estructurada) `status ∈ {activo, remision, resuelto}` + `resolved_year`. La vista `user_phenotype` y el motor solo cuentan `activo` para contraindicaciones; `remision`/`resuelto` van como contexto histórico para ARGOS.

### C2 · Embarazo / lactancia: estado ACTUAL (gap real) — **prioridad alta**
D9.4 pregunta embarazos **históricos**, pero los flags `embarazo` / `lactancia` (que excluyen intervenciones) necesitan **estado presente**. Falta una pregunta de estado actual:

> **D9.4b (nueva · solo mujeres, temprana):** "¿Cuál es tu situación actual?" → chips: Embarazada / Lactando / Buscando embarazo / Ninguna de estas / Prefiero no responder.

Esta es la que dispara los flags `embarazo`/`lactancia`, no la de historia. No confundir historia reproductiva con estado actual.

### C3 · Matiz de contraindicaciones
Aclarar en copy/lógica: un flag de contraindicación **excluye ALGUNAS intervenciones contextualmente, no todas.** No es un "apagón" total del catálogo.

---

## D · Pendiente confirmación de Mariana [PEND-MARIANA] (no bloquea estructura)

Estos son *contenido/listas clínicas* — se implementa la estructura y Mariana confirma el contenido en paralelo/después:

1. **[PEND-MARIANA]** Lista de padecimientos crónicos (D9.2) clínicamente completa y bien nombrada.
2. **[PEND-MARIANA]** Contraindicaciones faltantes en la lista maestra: epilepsia, marcapasos, anticoagulantes, insuficiencia renal/hepática (para ayunos agresivos) — y las que ella agregue.
3. **[PEND-MARIANA]** Mapeo de depleciones por anticonceptivos (D6.4): B6/folato/zinc/magnesio.
4. **[PEND-MARIANA]** Framing final de las 3 secciones sensibles: trauma (D9.6), sexualidad (D12), embarazo/estado actual (D9.4/D9.4b).

---

## Resumen para Fable
- Todo A + B + C es **implementable ya** (firmado por Enrique).
- C1 y C2 son los cambios de peso (tocan modelo de datos + motor de contraindicaciones).
- Los 4 [PEND-MARIANA] se dejan como listas parametrizables/fáciles de completar; marcar en el código dónde entran para que Mariana los cierre sin re-tocar arquitectura.
