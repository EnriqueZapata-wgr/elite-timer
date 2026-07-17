# 🧬 MEGA-SPRINT D · Cuestionario Maestro ATP — Delivery

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-d-cuestionario-maestro` (desde `main` post Mega-Sprint B) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores · **1751 tests verdes** (+18 nuevos del cuestionario)
**Estado:** feature completa end-to-end. El cuestionario levanta el fenotipo y alimenta el motor (que NO se tocó). **NO se publicó OTA.**

> El "mapa y brújula" de entrada de ATP: 13 dimensiones + objetivos → fenotipo epigenético → las 5 prescritas del motor. Reemplaza los 5 quizzes "chafas".

---

## Ejemplo REAL end-to-end (mujer 34, verbatim del scoring + motor)

Respuestas: energía baja, insomnio de mantenimiento, hinchazón/gases, ansiedad alta, cafeína de noche, 8-12h de pantalla, estrés 8/10, **hipertensión RESUELTA (2019)** + **hashimoto ACTIVO**, no embarazada, objetivos dormir mejor + más energía.

```
dxLevels:  energia 2 · sueño 2 · circadiano 2 · digestión 3 · estrés 2
roots:     cortisol_matutino_bajo · adrenalina_nocturna · deficit_sueno_profundo
           · disbiosis · estres_cronico · cortisol_elevado_sostenido · sobreexposicion_luz_azul
contraindicaciones (SOLO activo):  hashimoto
histórico (NO excluye):            hipertension · resuelto     ← caso Enrique
Top 5 del motor:  hidratacion_matutina · exposicion_solar_matutina · recordatorio_dormir
                  · cerrar_comida_3h_antes_dormir · pantallas_off_60min
```

**La regla dura de C1 funciona:** la hipertensión resuelta NO disparó contraindicación (va a contexto histórico para ARGOS); el hashimoto activo sí. Y el motor prescribió las 5 desde el fenotipo del cuestionario — el puente al motor es real, sin tocar el motor.

---

## Qué se implementó

### D4 · Modelo de datos ✅
`supabase/migrations/203_user_master_quiz.sql`: tabla `user_master_quiz` (section, question_code, `answer JSONB`, skipped, `UNIQUE(user_id,question_code)`) + RLS + vista `user_phenotype` (`jsonb_object_agg`, `security_invoker`). Idempotente. **C1 padecimientos-con-estado se guardan como answer estructurada** (array de `{condition,status,year}`) — no tabla aparte, como permite el brief.

### D2 · Banco de preguntas ✅
`src/constants/master-quiz-bank.ts` — las 13 dimensiones + BONUS objetivos, tipado. **Ediciones de Enrique v2 aplicadas todas:**
- **A (globales):** español MX, siglas explicadas en línea (TRT/HRT/IBP/GLP-1/TCE/PFAS…), ejemplos concretos, helper "(selecciona todas las que apliquen)" en multiselect.
- **B (puntuales):** D1.7 ejemplos de estimulantes · D2.3 +Lepulse/+Garmin · D2.4 "no lo sé/llenar más tarde" · D5.3 "bebidas alcohólicas" · **D5.4 SEPARADO en tabaco (D5.4) + vapeo (D5.4b)** · **D9.5 campo libre → chips** · **B.5 expandida a marketing/adquisición + churn (B.5/B.6/B.7)** · deep-dive GLP-1 con motivación/anhedonia (D8.1.b).
- **C1/C2:** ver abajo.

### D1 · Motor de ramificación (puro) ✅
`src/services/salud/master-quiz-core.ts` — `nextQuestion` / `orderedVisible` / `computeProgress` (dinámico) / `isComplete`:
- **SKIP:** por género (femaleOnly/maleOnly) + `skipWhen`. Mujer ve ciclo/anticonceptivos; hombre no. Hombre ve función eréctil; mujer no.
- **DEEP-DIVE:** follow-ups que aparecen sólo si la respuesta los dispara (insomnio → sub-preguntas; GLP-1 → motivación; alcohol ≥7 → seguimiento).
- **Progreso dinámico:** el total varía por user ("Sección X de Y · Pregunta N de M").

### D5 · Scoring → fenotipo ✅
`scoreToPhenotype(answers)` → `{ dxLevels, activatedRoots, contraindications, goals, historicalConditions }` en el **vocabulario del motor** (dx systems: energia/sueno/circadiano/digestion/inflamacion/estres/metabolismo/hormonal/cognitivo; roots del catálogo). El puente `quizPhenotypeToMotorPhenotype` produce un `UserPhenotype` consumible por `personalize-interventions` **sin tocar el motor**.

### C1 · Padecimientos activo/remisión/resuelto ✅ (prioridad alta)
Input `condition_status`: cada padecimiento se marca con estado (activo/remisión/resuelto). **Regla dura:** el scoring cuenta SOLO `activo` para contraindicaciones; `remisión`/`resuelto` van a `historicalConditions` (contexto para ARGOS, no excluye). Probado con los casos reales: hipertensión resuelta (Enrique) y cáncer en remisión (Mariana) NO gatillan exclusiones.

### C2 · Embarazo/lactancia estado ACTUAL ✅ (prioridad alta)
Nueva pregunta **D9.4b** (`repro_status`, solo mujeres, temprana): Embarazada / Lactando / Buscando / Ninguna. **Es la que dispara los flags** `embarazo`/`lactancia`, separada de la historia reproductiva (D9.4). Probado: embarazada → el motor no prescribe intervenciones contraindicadas en embarazo.

### D6 · UI ✅
- `src/components/master-quiz/QuestionInput.tsx` — biblioteca de inputs amigable tipo iOS (A.5): escala visual, single/toggle, multi con helper, número, texto, `condition_status` (C1), `repro_status` (C2).
- `app/salud/cuestionario-maestro/index.tsx` — shell: barra de progreso dinámica, una pregunta a la vez, "prefiero no responder" (sensibles), saltar, guardar-y-salir (**auto-save + resume**), preview por sección, resumen final.
- Persistencia `master-quiz-service.ts` (save/skip/load, fail-soft).

### D7 · Salida final ✅
Resumen "🧬 TU FENOTIPO EPIGENÉTICO" con sistemas prioritarios + causas raíz + **las 5 que el motor prescribe calculadas EN VIVO desde el cuestionario** (`personalizeInterventions`, motor intocado) + CTA "Ver Mi Protocolo".

### D8 · Reemplazo de los 5 chafas — parcial (ver pendientes)
Quité el placeholder "Cuestionario Maestro · próximamente/PRONTO" de **Mis Evaluaciones** y lo reemplacé por una **card viva destacada** que lanza el cuestionario. Los 5 quizzes funcionales viejos + los cuestionarios duplicados (historia-clinica 17 / edad-atp 10) **siguen accesibles** — su retiro definitivo lo dejé como paso posterior (ver pendientes) para no romper entry points sin que Enrique valide el cuestionario en device primero.

---

## 🩺 [PEND-MARIANA] — listas parametrizables marcadas en código

Los 4 ítems clínicos NO bloquean la estructura; Mariana cierra el CONTENIDO sin re-tocar arquitectura. Marcados en `master-quiz-bank.ts`:
1. **Padecimientos (D9.2)** → `PADECIMIENTOS_PEND_MARIANA` (15 base editables).
2. **Contraindicaciones extra** (epilepsia, marcapasos, anticoagulantes, insuf. renal/hepática) → `CONTRAINDICACIONES_PEND_MARIANA`.
3. **Depleciones por anticonceptivos (D6.4)** → `ANTICONCEPTIVO_DEPLECIONES_PEND_MARIANA` (B6/folato/zinc/magnesio).
4. **Framing sensible** (trauma D9.6, sexualidad D12, estado reproductivo D9.4b) → preguntas marcadas `pendMariana: true` + `allowPreferNot`.

---

## ⏭️ Pendiente Enrique
1. **Revisar migración 203** + `npx supabase db push` (crea `user_master_quiz` + vista). Sin esto la pantalla degrada fail-soft.
2. **Device test** del cuestionario: ramificación por género, guardar-y-retomar, C1 estados, C2 embarazo, resumen final con las 5.
3. **Mariana** cierra las 4 listas [PEND-MARIANA] (contenido, no arquitectura).
4. **Retiro definitivo de los 5 chafas + cuestionarios duplicados** (D8) — recomiendo hacerlo en una pasada corta DESPUÉS de validar el Maestro en device, para no dejar entry points muertos.
5. Merge + OTA.

## ⚠️ Riesgos / notas
- **Scoring clínico = profundidad base.** El mapeo respuesta→dx_level/root cubre los sistemas y señales de alto valor del doc §4; el peso clínico fino por respuesta es un refinamiento [PEND-MARIANA] (la arquitectura ya lo soporta, solo se ajustan constantes).
- **El motor no se tocó.** El cuestionario lo alimenta vía puente puro. Para que el motor use el cuestionario en su `fetchUserPhenotype` de runtime (DB), haría falta un bridge de persistencia a las tablas que el motor lee — lo dejé fuera para respetar el invariante; el resumen calcula las 5 en vivo desde el fenotipo del quiz.
- **Séneca** (journal, Mega-Sprint E) es tema aparte — no toca este sprint.

## 🗂️ Archivos
**Nuevos:** `203_user_master_quiz.sql`, `master-quiz-bank.ts`, `master-quiz-core.ts`, `master-quiz-service.ts` (+ test), `QuestionInput.tsx`, `app/salud/cuestionario-maestro/index.tsx`.
**Modificados:** `app/salud/mis-evaluaciones/index.tsx`.

Commits: backend (banco+motor+scoring+tests) → UI (inputs+pantalla+wire) → este delivery.

— Fable 🤖 · el mapa y brújula de ATP · fenotipo → motor, guiado no prisionero
