# 🔍 Auditoría pre-merge · Tramo 2 (MB-5 Mente → MB-6 Sueño → MB-7 Ciclo)

**Fecha:** 2026-07-18 · **Branch:** `feat/mb7-ciclo` (14 commits sobre `main`, encadena mb5→mb6→mb7)
**Base:** merge-base `66fdfa1` · 43 archivos · +1,677 / −300 · CI verde (tsc autoritativo) · 1,844 tests según CC
**Auditor:** Cowork (solo lectura sobre el diff commiteado `main...feat/mb7-ciclo`)

---

## VEREDICTO: ✅ APTO PARA MERGE

**Cero bloqueadores.** Un (1) fix menor de una línea recomendado antes o inmediatamente después del merge (F1, copy residual "ancla Oso"). Todo lo demás son observaciones o desviaciones documentadas honestamente en los delivery docs.

---

## Migraciones: NINGUNA nueva → NO toca db push por este merge

- `supabase/`, `package.json` y `package-lock.json`: **intactos** en el diff.
- ⚠️ Dependencia pre-existente: la máscara ATP Embarazo lee/escribe `cycle_settings.pregnancy_status` (migración **080**, ya en main). El delivery de MB-7 avisa que puede no estar aplicada al remoto — **verificar con `npx supabase db push` / lista de migraciones remotas antes de probar embarazo en device**. No es migración de este branch.
- `app.json`: agrega `ios.infoPlist.UIBackgroundModes: ["audio"]` → **requiere build nativo** (no viaja por OTA). No se tocó `version` (regla 11 respetada). MB-4 no existía: sin duplicación.

---

## MB-7 · CICLO (foco doctrinal máximo)

### 1. Doctrina BIDIRECCIONAL — ✅ CUMPLE (las 3 fuentes reescritas y consistentes)

Citas textuales user-facing por fase:

**`cycle-service.ts` (PHASES — card principal del pilar):**
- **Menstrual:** "Empieza un ciclo nuevo. Tu cuerpo te habla más claro que nunca — es la fase para afinar y escuchar señales." · energy: "Sensibilidad alta. Muévete con lo que tienes hoy: hay días fuertes y días de calibrar." · exercise: "Fuerza técnica, movilidad, zona 2. Si tu energía está, entrena — solo baja el ego, no la ambición."
- **Folicular:** "Estrógenos en ascenso: tu ventana de construir. Es cuando el cuerpo responde mejor al estímulo — aprovéchala." · energy: "Alta y en subida. Métele a los bloques duros y a lo nuevo." · exercise: "Fuerza pesada. HIIT. Cardio intenso. Full power — busca progresión."
- **Ovulación:** "Tu pico. Fuerza, potencia y confianza al máximo — es LA ventana para ir por un récord." · energy: "Máxima. Ve por tus PRs." · exercise: "Tu mejor momento para PRs y competir. No lo desperdicies."
- **Lútea:** "Progesterona al mando: fase de sostener y consolidar. Menos picos, más constancia — sigues fuerte, con otra marcha." · energy: "Alta al inicio, más pareja al final. Ajusta el volumen, no la intención." · exercise: "Fuerza sólida, tempo, resistencia. Si un día pide bajar intensidad, baja volumen — no pares."

**`cycle-info.ts` (InfoButton):** mismo espíritu — menstrual "entrena con lo que tienes hoy (fuerza técnica, movilidad, hierro en el plato) y baja el ego, no la ambición"; ovulación "Es LA ventana para ir por un récord. Aprovéchala."; lútea "ajusta el volumen si un día lo pide, no la intención. Los antojos son hormonales, no falta de carácter."

**`cycle.tsx` (calcPhase — descripción en la card de fase):** menstrual "Afina y escucha señales — entrena con lo de hoy, baja el ego no la ambición."; folicular "Métele a los bloques duros y a lo nuevo."; ovulación "LA ventana para ir por un récord."; lútea "Sigues fuerte, con otra marcha — ajusta volumen, no intención."

**Veredicto doctrinal:** desapareció TODO el copy paternalista viejo ("no fuerces", "reduce intensidad 40%", "-25% volumen", "prioriza descanso", "la energía desciende"). Folicular/ovulatoria EMPUJAN; lútea/menstrual AJUSTAN sin prohibir. Bonus correcto: `labsBest` de menstrual ahora incluye "FSH/LH/estradiol (día 2-4, valores basales)" — clínicamente más fino que el "labsAvoid" anterior.

### 2. Bug hombre-embarazado — ✅ CERRADO EN LA RAÍZ, con regresión

- **`getCycleInfo` se auto-gatea** (`cycle-service.ts`): lee `biological_sex` y devuelve `null` si ≠ 'female', pase lo que pase aguas arriba. Verifiqué los 6 call sites (`index.tsx` HOY, `biomarkers.tsx`, `argos-service`, `day-compiler`, `prescription-service`, `recipe-context-service`) — **todos** quedan cubiertos por el auto-gate.
- **`canAccessCycle` (puro) + `useCycleGate`**: `/cycle`, `/cycle-charts`, `/cycle-history` gateados; deep-link cerrado (blocked → `router.back()`/replace, render solo header/loader). Fail-safe correcto: error de lectura → blocked (nunca "ante la duda, mostrar").
- **Test de regresión `cycle-access-core.test.ts`**: male → false (nombrado "el bug"), null/undefined/''/'Female'/'FEMALE'/'f'/'other' → false. SOLO `'female'` exacto entra.
- **`pregnancy-gate-core` (pre-existente en main) sigue intacto**: `resolvePregnancyActive` corta por `biologicalSex !== 'female'` antes de mirar cualquier dato residual; `isPregnancyActive` de supplements lo usa.
- **`/cycle-settings` NO gateado — intencional y correcto**: modo compañero para parejas. Un male solo ve `MALE_MODALITIES` (disabled/partner) — no puede seleccionar 'pregnancy', y la card de FPP solo renderiza con `modality === 'pregnancy'`. Sin ruta para que un hombre active embarazo.
- Nota cosmética: el comentario de `cycle-access-core.ts` lista `/cycle-settings` entre las rutas gateadas por deep-link; en realidad se gatea internamente por sexo (la conducta es la correcta; el comentario es impreciso).

### 3. Labs contextualizados por fase — ✅ CUMPLE
- `lab-cycle-context-core.ts` (puro, 7 tests): estradiol/progesterona/LH/FSH de mujer → "Tomado en fase X — interpreta según tu fase."; **fase desconocida → "Sin fase del ciclo registrada — este valor puede malinterpretarse. Anota tu día del ciclo."** (nunca interpreta a ciegas, nunca se calla). No-female → jamás muestra anotación (testeado).
- Cableado en `edad-atp/biomarkers.tsx`. Decisión fina correcta: `isFemale` se lee de `biological_sex` directo (no de `getCycleInfo`, que da null también para mujer sin periodos — justo el caso del aviso).

### 4. Máscara ATP Embarazo — ✅ base sólida, alcance recortado documentado
- `src/utils/pregnancy.ts` (puro, 6 tests): semana/trimestre desde `due_date` (FUM = due−280d) o `start_date`; **sin fecha → null, no se inventa etapa**.
- `cycle.tsx`: card "Embarazo · Semana N · Nº trimestre", copy cálido ("Estás acompañada en cada etapa"), barra 0-40, y **supresión total de predicción de menstruación** (`predictions` → sets vacíos con embarazo activo). Cero lenguaje de riesgo/alarmista. ✓ sensibilidad.
- `cycle-settings.tsx`: captura de FPP → `cycle_settings.pregnancy_status` (cierra el gap de estado ACTUAL). Contenido por trimestre + hero visual quedaron fuera a propósito (revisión de Mariana) — recorte documentado en delivery.
- Lactancia: se captura pero sin máscara UI propia — duda abierta para Enrique (delivery §3).

### 5. Síntomas is_active/resolved_at — ⚠️ DESVIACIÓN RAZONADA (no silenciosa)
No se migró. Argumento del delivery (verificado contra el modelo real): `cycle_daily_logs` son **snapshots de intensidad diaria 1-5** (cólico 3/5 hoy = serie de tiempo, no condición con ciclo de vida), y los periodos YA usan start/end (`cycle_periods`). Forzar `is_active/resolved_at` ahí sería modelar mal el dominio. **Decisión queda con Enrique**; como auditor coincido en que la premisa del brief no aplica limpio a este dato.

---

## MB-6 · SUEÑO

### 6. Delfín temporal + cronotipo madre real — ✅ CUMPLE con 1 residuo (F1)
- `motherChronotype(raw_scores)` (helper puro, testeado: madre lobo/león, empate→oso con desempate doctrinal bear>lion>wolf, sin scores→oso retrocompatible).
- Propagado a **agenda** (sync + reconcile en `agenda-service`), **day-compiler**, **motor de prescripción** (`deriveChronotype` → type = madre, `transitionalState: 'delfin'` viaja aparte), **pantallas** (`my-chronotype` "TU CRONOTIPO DE BASE" con animal real; quiz resultado con el MISMO helper — antes duplicaba la lógica inline).
- Copy de la tesis textual: *"Hoy estás en patrón Delfín — es un estado, no lo que eres. Tu cronotipo de base es X."* ✓ sin paternalismo.
- **F1 · Residuo (fix de 1 línea):** `src/components/yo/YoEditorialSection.tsx:28` conserva `dolphin: { ... desc: 'Estado temporal · ancla Oso' }` hardcodeado. Un Delfín con madre Lobo leerá "ancla Oso" en la card editorial del YO mientras su plan y Mi Cronotipo dicen Lobo. No rompe conducta (es solo copy de una card secundaria), pero contradice exactamente lo que MB-6 corrigió. **Recomiendo corregirlo antes del merge o como primer commit post-merge.**

### 7. peak_focus conectado — ✅ `focusWindowAgendaItem` (puro, 3 tests): "Ventana de foco profundo · Hasta HH:MM — agenda aquí lo pesado", informational, sin dato → sin item (no inventa ventanas). Cableado en `day-compiler.buildAgenda`.

### 8. Regresión León→Oso — ✅ test espejo `CHRONO_ANCHOR_DEFAULTS ↔ CHRONO_SCHEDULES` (wake/sleep idénticos por tipo) + "León despierta 06:00" clavado. El template SQL del quiz no es importable en vitest — cubierto por data-fix 200 ya aplicado (limitación honesta, documentada en el test).

### 9. #117 baño caliente — ✅ name: "(40-42°C · **termina ~90 min antes de dormir**)"; how: "Baño de 20-40 min… (no más — baños más largos resecan la piel), terminando 60-120 min antes de dormir (óptimo ~90 min)". La ambigüedad duración/antelación quedó muerta. (El `benefit` conserva "Meta-análisis Haghayegh 2019" — copy pre-existente de main, no de este branch; anotado como deuda de la doctrina "no citar autoridades" si se quiere barrer después.)

### 10. Datos máquina vs user — ✅ el cambio de madre solo toca la rama MÁQUINA (`validatedSchedule`/`anchorTimes`). `resolveInterventionTimeEx` (custom > computed > ancla) **no está en el diff** — `custom_time` y overrides del user intactos. El comentario de `validatedSchedule` lo reafirma explícito.

---

## MB-5 · MENTE

### 11. Electrón journal — ✅ blindado
- Hallazgo honesto del delivery verificado: el cableado YA estaba completo en main; lo nuevo es el candado. `day-booleans.ts` (puro) extrae DEFAULT/MANDATORY/VERIFIED + opciones del EditDayModal (re-export, cero cambios para consumidores).
- `day-booleans.test.ts`: journal en los 3 lugares (peso en ELECTRON_WEIGHTS + MANDATORY + VERIFIED con ruta `/journal`); los 4 booleanos de MENTE alcanzables en el universo del HOY; pesos del EditDayModal no pueden divergir del canónico.
- `journal.tsx:298`: `awardBooleanElectron` + `emit('electrons_changed')` + `emit('day_changed')` ✓. Breathing/meditation/checkin también emiten tras otorgar ✓.

### 12. Audio — ✅ `sounds.ts`/`edad-sound.ts` migrados a **expo-audio con import perezoso** (sin módulo nativo → silencio, jamás crash por OTA). `mind-audio-service.ts` nuevo: background+loop, **catálogo VACÍO a propósito** (#46). **Cero imports vivos de expo-av** (solo menciones en comentarios; `expo-av` sigue en package.json sin uso — quitar en el build único, ya anotado en delivery). `UIBackgroundModes` sin duplicar (MB-4 no corrió).

### 13. Check-in — ✅ `checkin-axes-core.ts` (puro, 6 tests) deriva pleasantness/energy_level del cuadrante RULER + emociones, escala 1-10 compatible con `isLow ≤ 4`; ahora SÍ se escriben en `saveCheckin`. Fallo de guardado → `Alert` "No se pudo guardar… tus respuestas siguen aquí" (respuestas en memoria para reintentar).

### 14. Salida sin castigo — ✅ back durante sesión activa (breathing y meditation) → mismo camino que TERMINAR: confirma y registra tiempo real ("se registra tu tiempo real" en el Alert). Guard `completedRef` anti doble-registro. Bug del reloj corriendo en completado de meditación → `pause()` congela. Electrón visible en ambas pantallas con peso desde `ELECTRON_WEIGHTS` (no hardcode).

---

## Transversal

| # | Check | Resultado |
|---|---|---|
| 15 | Migraciones nuevas | **NINGUNA** — db push no requerido por este merge; verificar 080 aplicada (ver arriba) |
| 16 | Borrado automático de filas user | ✅ CERO — los únicos `.remove()` del diff son limpieza de AudioPlayer en memoria |
| 17 | Meet ARGOS | ✅ intacto — ningún archivo de ARGOS/Meet en el diff (flag #141 vivo) |
| 18 | Secretos / imports rotos | ✅ sin secretos en el diff; imports nuevos resuelven (day-booleans, cycle-access-core, use-cycle-gate, pregnancy, lab-cycle-context, mind-audio, GradientCTA); tsc verde vía CI |
| 19 | Español MX / nombres propios | ✅ todo el copy nuevo en español MX; cero nombres propios nuevos en copy user-facing ("Haghayegh 2019" en `benefit` es pre-existente de main) |

## Hallazgos menores (no bloquean)

- **F1 (recomendado pre-merge, 1 línea):** `YoEditorialSection.tsx:28` — "ancla Oso" hardcodeado para Delfín; contradice el ancla madre real de MB-6.
- **F2 (UX, decisión Enrique):** `cycle-settings` captura la FPP como TextInput libre `AAAA-MM-DD` con guardado en `onBlur`; si la usuaria deja la fecha a medias/ inválida, el blur escribe `pregnancy_status = null` (borra una FPP válida previa por un typo). Contradice suavemente "inputs amigables tipo iOS" y el carácter sagrado del dato user. Sugerencia: date picker + solo limpiar con acción explícita "salir de modo embarazo".
- **F3 (informativo):** `useCycleGate` con sesión sin `user.id` queda en 'checking' (loader) — fail-safe correcto, solo documentarlo.
- **F4 (deuda pre-existente, fuera del branch):** `emotional_checkins` sin columna `date` local (delivery MB-5 §hallazgos) y "Haghayegh" en benefit del catálogo — para un MB de infra/copy futuro.

## Dudas de los deliveries que requieren respuesta de Enrique
1. Delfín con madre Lobo usa anclas de Lobo (default aplicado) — ¿o todos los delfines a ancla Oso mientras estabilizan? (1 línea de revert, tests marcan ambos caminos.)
2. Síntomas de ciclo: ¿unificar a `is_active/resolved_at` (rediseño del tracking diario) o aceptar el modelo snapshot? (Auditor: aceptar.)
3. Lactancia con máscara UI propia — ¿entra a V2?
4. Contenido embarazo por trimestre + hero visual → revisión Mariana.
5. Item "Ventana de foco profundo" todos los días vs solo entre semana.

## Recordatorios post-merge
- **Build nativo requerido** para audio con pantalla bloqueada (`UIBackgroundModes`) — el resto viaja por OTA.
- Verificar migración **080** aplicada al remoto antes de probar máscara embarazo en device.
- Checklist de device de los 3 deliveries (cuenta masculina en `/cycle*` por deep-link es el más importante).
