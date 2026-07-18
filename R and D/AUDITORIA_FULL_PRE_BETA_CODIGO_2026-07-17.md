# AUDITORÍA FULL PRE-BETA · CÓDIGO (5 Mega-Sprints A–E)
**Fecha:** 2026-07-17 · **Auditor:** Cowork (técnico + clínico) · **Alcance:** solo lectura, cero modificaciones
**Repo:** ELITE_Timer/EliteTimer · **Contexto:** merge de 5 mega-sprints a `main` sin device test.

---

## Resumen ejecutivo

El código de los 5 mega-sprints está **estructuralmente sólido y listo para device test**. No encontré ningún bloqueador de código confirmado (P0) por lectura directa. El Cuestionario Maestro, el motor de personalización, el hub de Salud Funcional (menú puro) y el pilar Mente (con `/mind-hub` legacy muerto) cumplen su spec con limpieza notable. N-Back está correctamente en estado V1.5 (lógica + migración + tests, sin UI surfaced). **El único P0 es de proceso, no de código:** `npx tsc --noEmit` NO se pudo correr de forma confiable desde el sandbox porque el mount de OneDrive devuelve los archivos con padding de bytes NULL al final (corrupción de lectura, no del archivo real en Windows) — Enrique DEBE correr tsc en Windows antes de beta para confirmar "0 errores TS" (regla técnica #8). Los hallazgos clínicos son acotados: sobrevive copy con autoridad "Navy SEALs" en dos campos `benefit` user-facing (el fix #140 solo tocó breathing-library, no el catálogo). Las cold interventions SÍ tienen contraindicación de fiebre en todas sus variantes.

**Conteo:** P0 = 1 (de proceso) · P1 = 2 · P2 = 4 · P3 = 3

---

## P0 — Bloquea beta

### P0.1 · Verificación TypeScript imposible desde sandbox (OneDrive null-padding) → correr tsc en Windows
- **Qué:** `npx tsc --noEmit` corrido en el sandbox Linux arroja cientos de errores `TS1127 Invalid character` y `TS1005 '}' expected`. **NO son errores reales de código.** Son artefacto del mount de OneDrive: los archivos se leen con un bloque de bytes NULL (`0x00`) apilado al final.
- **Dónde / evidencia:** `app/health-hub.tsx` — vía Read (Windows) son 102 líneas limpias y bien cerradas; vía bash mount, `xxd` del tail muestra ~17 KB de `0x00` y `file` lo reporta como "Unicode text UTF-8 with CRLF". Mismo patrón confirmado en `app/agenda.tsx`, `app/breathing.tsx`, `app/habits-portal.tsx`, `app/(tabs)/index.tsx`, `interventions-catalog.ts`, etc. Todos limpios en Windows, con nulls en el mount.
- **Por qué importa (técnico):** No puedo certificar "0 errores TS" tras el merge de los 5 sprints desde aquí. La regla #8 (tsc antes de push) queda sin verificar. Además implica que **cualquier tooling que Cowork corra sobre este mount (tsc, tests, lint, incluso git) es poco confiable** — coincide con la memoria `feedback_git_onedrive_riesgo_index_corrupt` y `feedback_bash_onedrive_tamanos_stale`.
- **Fix sugerido:** Enrique corre en PowerShell (Windows, no sandbox):
  `npx tsc --noEmit`
  Si sale limpio (esperado, dado que el código leído está bien formado), P0 se cierra. Si truena, ese output es el batch real. Recomendación adicional: para auditorías de tooling, clonar el repo fuera de OneDrive (o `git worktree` en disco local) para que Cowork pueda correr tsc/tests de forma confiable.

---

## P1 — Importante (antes de beta o primer parche)

### P1.1 · [CLÍNICO · doctrina "no autoridades"] "Navy SEALs" sobrevive en copy user-facing del catálogo
- **Qué:** El fix #140 quitó "Navy SEALs / Stanford" de `breathing-library`, pero quedaron en el campo `benefit` de dos intervenciones del catálogo, y **`benefit` SÍ es user-facing.**
- **Dónde:**
  - `src/constants/interventions-catalog.ts:3320` — box breathing 4-4-4-4: `benefit: '...calma+foco simultáneos (protocolo Navy SEALs)...'`
  - `src/constants/interventions-catalog.ts:3541` — box breathing 6-6-6-6: `benefit: '...alerta relajada operacional (protocolo Navy SEAL Grossman/Divine).'`
  - Render user-facing confirmado: `app/salud/intervenciones/[key].tsx:199` (`{item.def.benefit}`) y `app/breathing.tsx:178`.
- **Por qué importa (clínico):** Viola la doctrina "no nombres propios / no autoridades capturadas en copy user-facing" (Braverman es la única excepción). "Navy SEAL Grossman/Divine" es doble violación (autoridad + nombres propios).
- **Fix sugerido:** Reescribir ambos `benefit` conservando el mecanismo, sin la autoridad. Ej.: `'Regula HRV, entrena tolerancia a CO2, calma y foco al mismo tiempo. Ideal para transición estrés→foco, pre-desempeño, pre-decisión.'` Los nombres (Divine, Grossman, Huberman) pueden quedar en `sources[].citation` — ese campo **no se renderiza** (verificado: `[key].tsx` y `rationale.tsx` no muestran `citation`/`sources`/`contraindications`), así que el mecanismo/evidencia interna queda intacto.

### P1.2 · [CLÍNICO menor + técnico] String de contraindicación de fiebre inconsistente entre familias frío/calor
- **Qué:** Las cold/heat interventions **sí tienen** contraindicación de fiebre (bien — cierra la preocupación de #130), pero con **dos strings distintos** que el motor podría no unificar.
- **Dónde:** `interventions-catalog.ts` — respiración/frío usan `'fiebre_viral_activa_37_8_o_mas'` (líneas 1553, 3716 wim_hof_basico, 3856 wim_hof_extendido, 3991, 4120, y ducha_fria niveles 1/2/3 en 4286/4411/4530); `sauna_infrarrojo:4725` usa `'fiebre_activa_infecciosa_>38.5'`.
- **Por qué importa (clínico + técnico):** El `buildUserState`/`matchesUserState` del motor (`personalize-interventions.ts`) hace match por string. Si el fenotipo marca fiebre con una clave, la otra familia no excluiría. Doctrina "fiebre cautelosa" exige que ducha_fria/wim_hof NUNCA se prescriban con fiebre viral activa.
- **Fix sugerido:** Unificar a una sola clave canónica de fiebre (p. ej. `fiebre_viral_activa`) en las 8 apariciones + en el mapeo del fenotipo (`master-quiz-core.ts` setea `feverViralActive`, y `dx-engine`/`user_symptoms`). Verificar que `isContraindicated` compare contra esa clave única.

---

## P2 — Pulido

### P2.1 · 533 casts `as any` (mayoría en `router.push(... as any)`)
- **Dónde:** todo `app/` y `src/`; el patrón dominante es `router.push('/ruta' as any)` por tipos de expo-router sin regenerar.
- **Por qué importa:** deuda de tipos; oculta rutas mal escritas del type-check. Ya trackeado (task #64 "regenerar tipos expo-router post-beta").
- **Fix sugerido:** post-beta, `expo customize` / regenerar `.expo/types` y quitar los casts de rutas. No bloquea.

### P2.2 · Contraindicaciones de frío/fiebre viven solo en el motor, sin señal user-facing
- **Qué:** `[key].tsx` muestra CÓMO / BENEFICIO / EVIDENCIA / AJUSTES, pero **no** `contraindications` ni `sideEffects`. Un usuario con fiebre que abra ducha_fria manualmente no ve advertencia (el motor lo excluye de la prescripción, pero la pantalla de detalle es navegable directo).
- **Por qué importa (clínico):** tensión con la doctrina "no matar placebo" (no publicar límites de riesgo). Aceptable bajo esa doctrina — el gating es por motor (`excludeIf`), no por copy. Se reporta como observación, no como bug.
- **Fix sugerido (opcional):** una línea suave no-alarmista tipo "escúchate: si estás enfermo o con fiebre, hoy no" en las cold interventions, sin publicar el umbral clínico. Decisión de Enrique/Mariana.

### P2.3 · Ducha tibia pre-sueño 90 min (task #117 abierto)
- **Qué:** intervención de ducha tibia ~90 min pre-sueño (Haghayegh) sigue pendiente de revisión por duración/flora de piel (task #117). No la re-audité a fondo; queda flag.
- **Fix sugerido:** cerrar #117 con Mariana (duración recomendada + nota de flora cutánea).

### P2.4 · Placeholder duplicado Tipo de Piel (Tipo 5 vs Tipo 4) — task #86 abierto
- **Qué:** bug reportado por Enrique (#86, P0 en su lista) de placeholder duplicado en Fitzpatrick. No pude confirmar visualmente por código (es render/data). El flujo Fitzpatrick vía `historia-clinica/[category].tsx` (dinámico, `category='fitzpatrick'`) está bien ruteado; el duplicado sería en `historia-clinica-questionnaires.ts` o `fitzpatrick-core.ts`.
- **Fix sugerido:** revisar las opciones/labels de tipos en `fitzpatrick-core.ts` + questionnaire para el duplicado 4/5.

---

## P3 — Deuda / observaciones (no acción inmediata)

### P3.1 · N-Back Challenge — estado real: lógica + backend + tests, SIN UI (correcto para V1.5)
- **Evidencia:** `src/services/mente/nback-core.ts` (config, `evaluateBlock`, `channelAccuracy`, secuencias) + `migration 197_nback_challenge.sql` (tablas `nback_sessions`/`nback_user_state`, RLS dueño-only) + test `nback-core.test.ts`. **No existe pantalla** (`app/mente/` solo tiene `progreso.tsx`) y `nback-core` **solo lo importa su propio test** — cero entry point de producción.
- **Veredicto:** correctamente un placeholder V1.5 (task #45 pending, #44 completed). No hay riesgo de que aparezca a medias en beta. Nada que hacer.

### P3.2 · "Séneca" en journal — decisión pendiente de Enrique, NO bug
- **Dónde:** `app/journal.tsx:40,54,57` (modo "Estoico · Reflexión al estilo Séneca" + 2 citas atribuidas a Séneca).
- **Nota:** por instrucción, se registra como decisión pendiente de Enrique (Séneca es figura histórica/filosófica, no "autoridad clínica capturada"), no como violación de doctrina.

### P3.3 · Migraciones 198a/198b ya renombradas (task #85 efectivamente resuelto)
- **Evidencia:** los archivos en `supabase/migrations/` ya son `198_rewrite_handle_new_user.sql` y `199_drop_supplement_protocols.sql` — sin sufijos de letra. La CLI de Supabase los aceptará. Task #85 puede cerrarse.

---

## Verificaciones que PASARON (para tu tranquilidad)

- **Rutas muertas:** cero reales. El check de `router.push('/literal')` contra archivos arrojó dos "faltantes" que son **falsos positivos**: `/historia-clinica/fitzpatrick` lo resuelve la ruta dinámica `app/historia-clinica/[category].tsx` (`HC_BY_ID['fitzpatrick']`), y `/goal-tree-smoke` es solo un string en un comentario de doc dentro de `app/dev/goal-tree-smoke.tsx` (la ruta real dev es `/dev/goal-tree-smoke`, que existe).
- **Pilar Fitness:** las 9 pantallas existen (`fitness-strength/cardio/hiit/mobility/explore/my/train`, `exercise-library`, `training-methods`); `fitness-hub.tsx` rutea limpio a 3 secciones. Sin copy crudo detectado.
- **Pilar Mente:** `mente.tsx` es hub editorial limpio (Journal/Respiración/Meditación/Check-in + progreso), `MenteHero.tsx` es editorial (morado como acento, no fondo). `/mind-hub` legacy **muerto**: cero referencias vivas, solo 3 comentarios que documentan su eliminación (`hoy-cards.ts:29`, `day-compiler.ts:36,501`). Copy autoridad Navy SEALs/Stanford **fuera** de breathing-library (fix #140 aplicado ahí).
- **Cuestionario Maestro (mig 203):** excelente. `condition_status` con `activo/remision/resuelto`; contraindicación **solo si `activo`** (`master-quiz-core.ts:241-246`), remisión/resuelto → `historicalConditions` (contexto ARGOS, no excluye). `D9.4b` `repro_status` `femaleOnly` dispara flags embarazo/lactancia (251-253). Ramificación `skipWhen` + `femaleOnly`/`maleOnly` (SKIP) + `deepDive` (follow-ups). Marcadores `PADECIMIENTOS_PEND_MARIANA`, `CONTRAINDICACIONES_PEND_MARIANA`, `ANTICONCEPTIVO_DEPLECIONES_PEND_MARIANA` presentes. `scoreToPhenotype → quizPhenotypeToMotorPhenotype` alimenta `UserPhenotype` **sin tocar el motor** (comentado explícitamente). Helper multiselect "(selecciona todas las que apliquen)" en `QuestionInput.tsx:98`.
- **Salud Funcional (mig 202):** `health-hub.tsx` es **MENÚ PURO** — 8 destinos, cero lecturas de datos (comment de doctrina explícito, ya no importa symptom-service), `MedicalDisclaimerGate`. `dx-engine.ts:110` lee `user_symptoms` por `source_kind` (`'sistema'|'aislado'`). Todas las rutas de destino existen.
- **Motor personalización:** `personalizeInterventions` → `selectTop5` (3 universales P1 dedup + specifics), `generateRationale`/`buildSummarySentence` construyen el "por qué a TI", `deduplicateByFamily` evita repetición.
- **Mapeo intervención→imagen (Mega-Sprint C):** `intervention-image-picker.ts` con 11 conceptos; los 11 `.jpg` existen en `assets/images/intervenciones/`, y los 5 `assets/images/salud-funcional/*.jpg` también. (Nota: task #91 "swap imageBn no aplicó" es runtime — no verificable por código; los assets sí están.)
- **Migraciones 200–203:** idempotentes (`CREATE TABLE/INDEX IF NOT EXISTS`, policies envueltas en `DO $$ BEGIN ... EXCEPTION duplicate_object`), todas con `ENABLE ROW LEVEL SECURITY` + policies dueño-only (+ coach_read donde aplica). Cumplen regla #4 y #12.
- **Antileak PHI:** `citation`/`sources`/`contraindications`/`sideEffects` NO se renderizan en `[key].tsx` ni `rationale.tsx` — solo `benefit`/`how`/`scientificInfo`/`evidenceLevel`. Datos clínicos crudos quedan internos.

---

*Fin del reporte. Bloqueador único = correr `npx tsc --noEmit` en Windows. Los P1 clínicos (Navy SEALs en benefit + string fiebre) son fixes quirúrgicos de una línea cada uno.*
