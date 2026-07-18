# 🧬 MEGA-SPRINT D · Cuestionario Maestro ATP (Fable)

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-d-cuestionario-maestro` desde `main` (post Mega-Sprint B)
**Prerequisito:** Mega-Sprint B mergeado (Mis Evaluaciones ya existe como hub · el Maestro lo llena)
**Estimado:** 20-30h (feature grande)
**Diseño completo:** `R and D/CUESTIONARIO_MAESTRO_ATP_v1.md` (léelo entero · tiene todo)

---

## 🎯 Qué construyes

El **Cuestionario Maestro** reemplaza los 5 quizzes funcionales "chafas" (Enrique: "hechos como relleno de secundaria, sin background, sin impacto"). Es el mapa y brújula que settea ATP · levanta el **fenotipo epigenético completo** del user que alimenta el motor de personalización (que YA existe y funciona).

**NO toca:** Braverman ni Cronotipo (cada uno con su rol propio · viven aparte en Mis Evaluaciones).

---

## 📚 Doctrinas obligatorias

1. **`project_positioning_app_intervencion_epigenetica`** — ATP = app de intervención epigenética.
2. **`project_doctrina_registro_epigenetico_3_funciones`** — el cuestionario levanta el fenotipo.
3. **`feedback_guiado_no_prisionero`** — UX guiada, no cárcel (saltar, guardar, retomar).
4. **`feedback_simple_vence_inteligente`** — simple > inteligente.
5. **`feedback_nombres_propios_nunca_en_copy_usuario`** — copy sin nombres propios.
6. **`project_doctrina_ciclo_femenino_bidireccional`** — sección ciclo respeta bidireccionalidad.

---

## 🏗️ Qué implementar (spec completo en CUESTIONARIO_MAESTRO_ATP_v1.md)

### D1 · Motor de ramificación dinámica (sección 0 del doc)
- NO lineal · árbol de decisiones · 3 modos: SKIP (obviar irrelevantes), DEEP-DIVE (profundizar donde hay señal), ADAPT (tono/formato)
- Función pura `nextQuestion(answers, currentQuestion): Question | null`
- Progreso dinámico (total varía por user)

### D2 · Las 13 dimensiones (sección 2-3 del doc)
1. Estado actual del cuerpo (7 preg)
2. Composición corporal (5)
3. Piel + uñas + cabello (6 · soft flags dermatológicos)
4. Salud bucal (5)
5. Hábitos de consumo (7)
6. Medicamentos actuales (ramificado)
7. Suplementos (ramificado · integra BHA scanner)
8. Intervenciones estéticas/metabólicas (5 · péptidos, Ozempic, TRT)
9. Cirugías + antecedentes + traumas (6)
10. Exposiciones ambientales + cosméticos (7)
11. Contexto de vida (6)
12. Sexualidad + libido (4 · sensible · "prefiero no responder")
13. Propósito + espiritualidad (4 · Blue Zones)
+ BONUS: Objetivos y motivación (5 · siempre al final)

### D3 · UX (sección 1 del doc · NO puede sentirse eterno)
- Chunks 5-8 preg/sección · barra progreso · botón atrás
- "Guardar y continuar después" (persiste Supabase)
- "Saltar sección" (flag incompleta)
- Preview progresivo al terminar cada sección
- Retomable por sección desde Mis Evaluaciones
- Ramificación inteligente (mujer ve ciclo, hombre no)
- Formatos variados (slider, chips, escala visual, número, toggle)
- Micro-copy que educa

### D4 · Modelo de datos (sección 6 del doc)
- Migración: tabla `user_master_quiz` (section, question_code, answer JSONB, skipped) + RLS
- Vista `user_phenotype` (jsonb_object_agg consolidado)

### D5 · Scoring → fenotipo (sección 4 del doc)
- Cada respuesta suma a: dx_levels por sistema + roots activados + contraindicaciones (flags) + contexto ARGOS
- Output: fenotipo epigenético completo consumible por `personalize-interventions.ts` (el motor YA existe · el cuestionario lo alimenta)

### D6 · Componentes (sección 7 del doc)
- `<MasterQuizShell>` (progreso + guardar + navegación)
- `<MasterQuizSection>` · `<MasterQuizQuestion>` · `<QuestionInputs>` (biblioteca inputs) · `<SectionPreview>` · `<QuizFinalSummary>` (fenotipo)

### D7 · Salida final (sección 5 del doc)
- Resumen "TU FENOTIPO EPIGENÉTICO" con sistemas prioritarios + roots + CTA a Mi Protocolo
- Conecta directo al motor: "ATP te prescribe estas 5 →"

### D8 · Reemplazo de los 5 chafas
- Los 5 quizzes funcionales viejos se retiran (el Maestro los reemplaza)
- Los cuestionarios duplicados (historia-clinica 17 + edad-atp 10 · que quedaron agrupados en Mega-Sprint B) se consolidan/retiran donde el Maestro los cubra
- Quitar el placeholder "Cuestionario Maestro · próximamente" de Mis Evaluaciones

---

## ✅ Estado de validación (2026-07-16)

**Enrique firmó** UX/copy/estructura. Sus ediciones están consolidadas en:
> **`R and D/CUESTIONARIO_MAESTRO_EDICIONES_ENRIQUE_v2_2026-07-16.md`** — LÉELO Y APLÍCALO junto con el banco base. Incluye 5 principios globales de copy/UX, ~9 ediciones puntuales, y 2 cambios estructurales de peso (C1 padecimientos activo-vs-resuelto + C2 embarazo/lactancia estado actual).

**Mariana:** 4 ítems clínicos marcados `[PEND-MARIANA]` (lista padecimientos, contraindicaciones faltantes, depleciones anticonceptivos, framing sensible) son *contenido/listas* — **NO bloquean implementar la estructura**. Constrúyelos como listas parametrizables y marca en el código dónde entran para que ella los cierre sin re-tocar arquitectura.

### Cambios estructurales que sí tocan modelo de datos (del doc de ediciones)
- **C1 · Padecimientos activo/remisión/resuelto** — mismo patrón `is_active`/`resolved_at` que `user_symptoms` (mig 202). Contraindicación solo dispara si `activo`.
- **C2 · Embarazo/lactancia estado ACTUAL** — nueva pregunta de estado presente (mujeres) que dispara los flags, separada de la historia reproductiva (D9.4).

---

## 🧪 Test guards
- Ramificación: mujer → ve sección ciclo · hombre → skip
- Guardar y continuar → persiste + retoma donde quedó
- Fenotipo output consumible por el motor (integración test con personalize-interventions)
- "Prefiero no responder" en preguntas sensibles funciona
- Preview progresivo por sección

## 📤 Delivery
`R and D/FABLE_MEGASPRINT_D_DELIVERY.md`

## 🔒 Invariantes
- str_replace quirúrgico · migración idempotente · tests reales
- Copy sin nombres propios · guiado no prisionero
- El motor NO se toca (ya funciona) · el cuestionario lo alimenta
- Delivery doc

**Este es el sprint que le da a ATP su "mapa y brújula" de entrada · el input del motor epigenético.**

— Enrique + Cowork
