# 🗺️ Mapa de Transformación — Mi Diagnóstico Funcional + Intervenciones (v1)

**De:** Fable (CCF5)
**Para:** Cowork + Enrique
**Fecha:** 2026-07-11
**Estatus:** PROPUESTA TÉCNICA. No he ejecutado código. Espero peloteo + aprobación antes de tocar nada.
**Base:** brief `FABLE_BRIEF_MAPA_TRANSFORMACION_DX_INTERVENCIONES_2026-07-11.md` + scan profundo del repo (3 agentes de exploración: modelo de datos, pantallas, servicios).

---

## 0. Resumen ejecutivo

La buena noticia: **esto no es greenfield, es cablear y evolucionar lo que ya existe.** El scan reveló tres hechos que definen toda la estrategia:

1. **El "motor de TOP 5 accionables" (Sprint Motor Protocolos MVP) nunca se aplicó.** La migración HEAD del repo es la **169**; la 171 que ese sprint proponía (`user_top_actionables`) no está en el esquema. Entonces el modelo DX→Intervenciones **no deprecia ese motor: es su primera implementación real**, ahora con la doctrina correcta (sin límite de activación, semáforo, driven por raíces del DX en vez de triggers sueltos).

2. **La materia prima del DX ya existe y está subutilizada:** `clinical_symptoms`/`clinical_symptom_logs` (mig 152, con los 7 sistemas funcionales), `historia_clinica` (mig 079, cuestionarios en JSONB), `lab_values` (mig 072, fuente de verdad canónica de labs), `braverman_results`, `functional_quiz_results`, `user_chronotype`. El motor DX **cosecha estas fuentes**, no las reinventa.

3. **ARGOS ya es una plataforma, no un wrapper.** `argos-proxy` (Sonnet 5 + fallback Gemini, economía H+ atómica, `loadUserContext` con ~20 fuentes, `argos_logs`). Los flujos nuevos (`generateDX`, `suggestInterventions`) son **nuevos `requestType` sobre la plataforma existente**, replicando el patrón ancla de `braverman-premium-service.ts` (cache → `spendProtons` idempotente → `callAnthropic` → cache). El sistema de tiers (`free/base/pro/clinician`) ya existe → la mecánica "Pro auto vs Base manual 750 H+" es cableado, no arquitectura nueva.

**La transformación en una línea:** el driver de HOY/AGENDA deja de ser `user_protocols → daily_plans` y pasa a ser `user_interventions activas → timing por cronotipo`. El DX es la capa nueva que decide QUÉ intervenciones sugerir. Los protocolos precargados bajan a "biblioteca de referencia" (no se borran).

**Abordaje:** 5 fases, ~40-48h de trabajo core, paralelizable a <72h. Fase 4 (swap de HOY/AGENDA) es la de mayor riesgo y va detrás de un feature flag con doble-lectura durante la transición.

---

## 1. Modelo de datos

### 1.1 Tablas NUEVAS

Todas con el patrón RLS dominante del repo (dueño `FOR ALL` + coach `SELECT` vía `coach_clients` activo), envueltas en `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` para idempotencia de policies.

#### `functional_dx` — Mi Diagnóstico Funcional (versionado)
El documento vivo. **Append-only**: cada actualización inserta una fila nueva; la anterior queda como respaldo con su fecha.

```
id                UUID PK
user_id           UUID FK auth.users
version           INT              -- 1, 2, 3... incremental por user
quality_level     SMALLINT         -- 1-5 (nivel de calidad del brief)
roots_detected    JSONB            -- [{ root_key, severity(1-5), confidence(0-1), sources[] }]
summary_text      TEXT             -- narrativa del DX (ARGOS)
sources_snapshot  JSONB            -- qué fuentes alimentaron + fecha (para "qué te falta")
generated_by      TEXT             -- 'argos_auto' | 'manual' | 'system'
model             TEXT             -- claude-sonnet-5 | gemini-2.5-flash | null
is_current        BOOLEAN          -- true solo en la versión vigente
created_at        TIMESTAMPTZ
UNIQUE(user_id, version)
```
Índice parcial `WHERE is_current` para lectura O(1) de la versión vigente. `roots_detected` en JSONB (no tabla hija) — el motor de intervenciones interseca en TS, igual que el score de nutrición interseca en `nutrition-score-core.ts`. Regla no-negociable "falta de data ≠ ausencia" se modela con el campo `confidence` por raíz (baja confianza ≠ raíz ausente).

#### `user_interventions` — estado del user con cada intervención (= "Mi Protocolo")
```
id                UUID PK
user_id           UUID FK auth.users
intervention_key  TEXT             -- key del catálogo (constants)
status            TEXT             -- 'suggested' | 'active' | 'paused' | 'dismissed'
priority          SMALLINT         -- 1(🔴)|2(🟡)|3(🟢) — del motor, re-priorizable
source_dx_id      UUID FK functional_dx (nullable)
custom_time       TEXT             -- hora ajustada por user (HH:MM)
custom_notes      TEXT
custom_dose       TEXT             -- si aplica
activated_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
UNIQUE(user_id, intervention_key)
```
Sin límite de `active` (doctrina). La suma de `status='active'` = "Mi Protocolo".

#### `intervention_completions` — log diario de compleción (alimenta HOY + progresión)
```
id                     UUID PK
user_intervention_id   UUID FK user_interventions ON DELETE CASCADE
user_id                UUID             -- denormalizado para RLS directa
date                   DATE
completed              BOOLEAN
metadata               JSONB
created_at             TIMESTAMPTZ
UNIQUE(user_intervention_id, date)
```
RLS vía `EXISTS` sobre el padre (mismo patrón que `actionable_completions` proponía el MVP). Espejo exacto de cómo funcionan hoy los electrones → al completar se otorga electrón con `awardBooleanElectron` (reuso).

#### `padecimientos` — condiciones confirmadas (historial médico verificado, peso ALTO)
```
id            UUID PK
user_id       UUID FK auth.users
name          TEXT
category      TEXT             -- 'infeccioso'|'autoinmune'|'metabolico'|'oncologico'|'otro'
started_on    DATE
resolved_on   DATE             -- null = en curso
treatment     TEXT
severity      SMALLINT         -- 1-5
status        TEXT             -- 'active'|'resolved' (derivado de resolved_on)
notes         TEXT
created_at    TIMESTAMPTZ
```
**Decisión de diseño:** tabla nueva en vez de reusar `condition_flags`/`medications` (mig 007). Esas son flags binarias coach-side; padecimientos necesita fechas + tratamiento + resolución como historial temporal. Alimenta el DX con peso ALTO.

### 1.2 Tablas MODIFICADAS

| Tabla | Cambio | Migración |
|---|---|---|
| `clinical_symptoms` (152) | Añadir `kind TEXT DEFAULT 'aislado'` (`'aislado'` quick-tap peso BAJO vs `'sistema'` el actual) + `tag TEXT` para chips. Reusar tal cual para "síntomas aislados". | 173 |
| `proton_action_costs` (086) | Seed de `dx_generation` (costo H+ actualización manual del DX) e `intervention_rationale` (opcional Pro). | 174 |
| `historia_clinica` (079) | Sin cambio de esquema (ya es `data JSONB` por categoría). Se extiende el **contenido** en constants: de 5 cuestionarios a integral + 9 sub-levantamientos. | — (código) |
| `lab_values` (072) | Futuro no-bloqueante: campo `vigencia_days` vía tabla de metadatos `lab_parameter_meta`. Modelado, no cableado en beta. | 176 (opcional) |

### 1.3 Tablas DEPRECADAS (estrategia: mantener, no borrar)

**Ninguna se borra.** Cero data loss. Cambia el rol, no la existencia:

- **`user_protocols` / `daily_plans` / `protocol_templates`** — dejan de ser el driver de HOY/AGENDA. `protocol_templates` sobrevive como **biblioteca de referencia** dentro de Historia Clínica. `user_protocols` activo puede seguir existiendo (informativo) pero HOY lee `user_interventions`. Estrategia: soft-deprecation vía feature flag `INTERVENTIONS_DRIVE_HOY`; cuando esté estable, el path de protocolo queda dormido (como ya está el sistema legacy 003).
- **Sistema legacy de protocolos (003):** `daily_protocols`/`protocol_items`/`protocol_assignments` — ya está dormido en el esquema. No se toca.
- **`actionables-catalog.ts` / migración 171 del MVP:** nunca se construyeron. El catálogo de intervenciones los subsume.

---

## 2. Migraciones (orden + dependencias)

Rango Fable **170-199 libre** (HEAD real = 169; 170 es el siguiente). Todas idempotentes (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`), aplicadas post-merge con `npx supabase db push` (o MCP `execute_sql` por el bug 42P10 conocido — ver `[[project_supabase_migration_mcp]]`).

| # | Nombre | Qué hace | Depende de |
|---|---|---|---|
| **170** | `functional_dx` | Tabla DX versionada + índice parcial `is_current` + RLS own/coach | — |
| **171** | `user_interventions` | Estado de intervenciones del user + RLS | — |
| **172** | `intervention_completions` | Log diario de compleción + RLS vía parent | 171 |
| **173** | `padecimientos` + `clinical_symptoms_kind` | Tabla padecimientos + `kind`/`tag` en clinical_symptoms | — |
| **174** | `dx_intervention_action_costs` | Seed `proton_action_costs` (`dx_generation`, `intervention_rationale`) | — |
| **175** | `dx_intervention_indexes` | Índices de performance (user_interventions por status/priority; completions por date) | 171, 172 |
| **176** | `lab_parameter_vigencia` *(opcional, post-beta)* | Metadatos de vigencia por parámetro de lab | — |

170-174 son las bloqueantes de beta. 175 es optimización. 176 es roadmap.

---

## 3. Pantallas

Rutas expo-router. **Nota de naming:** hoy hay dos "Historia Clínica" solapadas (`app/health-hub.tsx` titulado "Historia Clínica – expediente vivo" + `app/historia-clinica/`). La transformación es la oportunidad de unificar la jerarquía bajo `health-hub.tsx` como hub.

### 3.1 NUEVAS

| Ruta | Qué es | Componentes reutilizados |
|---|---|---|
| `app/salud/diagnostico/index.tsx` | **Card A: Mi Diagnóstico Funcional.** Badge nivel 1-5, "qué te falta" didáctico, timeline de versiones, botón "Actualizar mi Diagnóstico" (Base: 750 H+ · Pro: auto), lista de fuentes + fecha. | `Card`, `AnimatedScoreRing` (adaptar a nivel 1-5), `PillarHeader`, `SectionTitle`, `MedicalDisclaimerGate` |
| `app/salud/mi-protocolo/index.tsx` | **Card B: Mi Protocolo.** Lista jerarquizada semáforo 🔴🟡🟢 de intervenciones activas, toggle activar/desactivar sin límite, filtros por categoría (chips) y raíz (chips), info científica embed. | `GradientCard`, `FilterPills`, `ElectronBadge`, `ExpandableSheet`, nuevo `<PrioritySemaphore>` (componentizar) |
| `app/salud/intervenciones/index.tsx` | Lista de TODAS las sugeridas (no solo activas), con activar. | `FilterPills`, `Card`, `<PrioritySemaphore>` |
| `app/salud/intervenciones/[key].tsx` | Detalle de intervención: cómo, beneficio, info científica, ajustar hora/notas/dosis, activar. | `ExplanationModal`, `Card`, `AnimatedPressable` |
| `app/salud/sintomas.tsx` | Síntomas aislados quick-tap (chips + input libre), timeline vertical. **Reusa** `clinical-history-service` + `functional-systems.ts`. | `FilterPills`, `SwipeToDeleteRow`, quick-add modal (ya existe en health-hub) |
| `app/salud/padecimientos.tsx` | CRUD padecimientos (nombre + fechas + tratamiento + severidad). | `Card`, `SwipeToDeleteRow`, formulario ligero |

### 3.2 Levantamientos (extensión, no pantalla nueva)

El motor de cuestionarios ya existe (`app/historia-clinica/[category].tsx` + `<TestQuestionScreen>` con skip-logic vía `optional`/`multi`). Se **extiende el contenido** en `src/constants/historia-clinica-questionnaires.ts`:
- 1 **levantamiento integral** (choncho, con ramificación).
- 9 **sub-levantamientos** (digestiva, sueño, piel, metabólica, hormonal ×2 sexo, inflamación, nutricionales, heredo-patológicos, inmunológica).
- Cada respuesta ya se guarda con timestamp en `historia_clinica.data[category]` (versionable extendiendo a `data.history[]`).

### 3.3 MODIFICADAS

| Ruta | Cambio | Riesgo |
|---|---|---|
| `app/(tabs)/index.tsx` (**HOY**) | Reemplazar las tarjetas de protocolo (`compileDay` → `buildAgenda` desde `daily_plans`) por "Mi Protocolo hoy" (intervenciones activas con timing). Electrones/booleanos/quants intactos. | 🔴 ALTO (2047 líneas) |
| `app/agenda.tsx` (**AGENDA**) | `agenda-service.generateAgendaEvents` deja de leer `generateDailyPlan(protocolo)` y lee intervenciones activas → timing por cronotipo. Pipeline de notificaciones intacto. | 🔴 ALTO |
| `app/health-hub.tsx` (**Historia Clínica hub**) | Convertir en hub: Card A (DX) + Card B (Mi Protocolo) + sublinks (levantamientos, síntomas, padecimientos, labs, biblioteca de protocolos de referencia). | 🟡 MEDIO |
| `app/supplements.tsx` (**Suplementos**) | Reforzar copy "no es recomendación, es tu registro". Scanner BHA como CTA (decisión pendiente — ver §9). Mantener manual + catálogo informativo. | 🟢 BAJO |
| `app/protocol-explorer.tsx` / `app/protocol-config.tsx` | Degradar a "biblioteca de referencia" dentro de Historia Clínica; quitar la escritura que dispara HOY/AGENDA. | 🟡 MEDIO |

### 3.4 Componentes deprecados / nuevos

- **Nuevo `<PrioritySemaphore>`** — hoy el color por severidad/score es ad-hoc (`severityColor()`, `scoreColor()`). Componentizar el semáforo 🔴🟡🟢 (lo pide DX + intervenciones + síntomas).
- **Nuevo `<DxLevelBadge>`** — badge de nivel 1-5 del DX.
- **Nada se borra a nivel componente.** El kit `src/components/ui/` cubre casi todo.

---

## 4. Servicios / hooks / motor

Estructura por dominio (nueva carpeta `src/services/dx/` + `src/services/interventions/`). Lógica pura en `*-core.ts` (patrón vitest node-only del repo, ver `[[project_test_harness_vitest]]`).

### 4.1 Motor DX
- **`src/services/dx/dx-engine.ts`** — `generateDX(userId, { manual })`:
  1. Cosecha fuentes (reusa gatherers estilo `loadUserContext`): `historia_clinica`, `clinical_symptoms`, `padecimientos`, `lab_values`, `braverman_results`, `functional_quiz_results`, hábitos consistentes, `user_supplements`. (Genéticos: N/A aún — no hay tabla, modelar hook vacío.)
  2. Calcula `quality_level` (puro, `dx-quality-core.ts`).
  3. Llama ARGOS `requestType: 'dx_generation'` → raíces + narrativa.
  4. Persiste versión nueva en `functional_dx` (marca `is_current`, baja el flag del anterior).
  - **Pro:** disparado automático por listeners de `clinical_history_changed`/nuevo lab/nuevo padecimiento (debounced). **Base:** botón manual → `spendProtons` idempotente (patrón `braverman-premium-service`).
- **`src/services/dx/dx-quality-core.ts`** — puro: nivel 1-5 desde qué fuentes están llenas (1 HC básica → 5 genéticos). Testeable sin Supabase.
- **`src/services/dx/dx-service.ts`** — IO: `getCurrentDX`, `getDXHistory`, `getDXQuote` (precio + balance para Base).

### 4.2 Motor Intervenciones
- **`src/services/interventions/intervention-engine-core.ts`** — PURO: `matchInterventions(dxRoots, catalog, profile)`. Interseca `roots_detected` del DX con `intervention.roots[]`, ordena por prioridad + severidad de raíz, filtra por edad/sexo/cronotipo. Determinístico v1 (doctrina Humby: sin IA en el match). Testeable.
- **`src/services/interventions/intervention-service.ts`** — IO/CRUD: `suggestInterventions(userId)` (corre el core + persiste `suggested`), `activateIntervention`, `deactivateIntervention`, `adjustIntervention` (hora/notas/dosis), `logCompletion` (→ `intervention_completions` + `awardBooleanElectron` + emit), `getMyProtocol` (activas jerarquizadas). Emite `interventions_changed` + `day_changed`.
- **Catálogo en constants** (no DB): `src/constants/interventions-catalog.ts` (`Intervention[]` con los 8 campos + `categories[]` + `roots[]` + modalidades como registros distintos + info científica + prioridad default) y `src/constants/intervention-vocab.ts` (categorías + raíces normalizadas del doc de Mariana). **Decisión:** mismo patrón que `supplement-catalog.ts` — cura fácil para Mariana+Enrique, pasado al prompt de ARGOS por texto, versionado en git. (Ver §9 para el trade-off DB vs constants.)

### 4.3 Síntomas + Padecimientos
- **Síntomas:** **reusar** `src/services/clinical-history-service.ts` (ya existe con `addSymptom`/`logSeverity`/`groupSymptomsBySystem`/`buildExecutiveSummary`). Añadir `kind='aislado'` para quick-tap peso BAJO.
- **`src/services/padecimientos/padecimientos-service.ts`** — CRUD nuevo + `-core.ts` para el resumen que alimenta el DX.

### 4.4 HOY / AGENDA (swap del driver)
- **`src/services/day-compiler.ts`** — `buildAgenda()` deja de llamar `generateDailyPlan()` (protocolo) y lee `getMyProtocol()` (intervenciones activas) → convierte a `AgendaItem[]` con timing por cronotipo (misma lógica `TIME_WINDOWS`). Detrás de flag `INTERVENTIONS_DRIVE_HOY`.
- **`src/services/agenda-service.ts`** — `generateAgendaEvents()` vuelca intervenciones activas (source `'intervention'`) a `agenda_events` + `agenda_event_logs`. **El pipeline de notificaciones no cambia** (cron `dispatch-agenda-notifications` sigue leyendo `agenda_event_logs`) → las intervenciones heredan push notifications gratis.

### 4.5 Hooks
- `src/hooks/useCurrentDX.ts`, `src/hooks/useMyProtocol.ts` — suscritos a `interventions_changed`/`clinical_history_changed`.

---

## 5. Prompts ARGOS (nuevos `requestType`)

Todos vía `argos-proxy` (ya cobra H+ server-side por `requestType`, ya cachea system, ya hace fallback). Se añaden en `argos-service.ts` + costos en `proton_action_costs` + `FALLBACK_ACTION_COSTS` (`economy-config.ts`).

| requestType | Función | Prompt | Prioridad |
|---|---|---|---|
| `dx_generation` | `generateDX` | Sintetiza el DX: recibe todas las fuentes serializadas, devuelve `{ roots_detected[], summary_text, quality_level }`. Restringido al **vocab de raíces** (enum validado post-respuesta). Regla "falta de data ≠ ausencia" explícita → usa `confidence`, nunca afirma ausencia. | 🔴 Beta |
| `intervention_rationale` *(opcional Pro)* | narrativa "por qué estas intervenciones" | El **match es determinístico** (core en TS). ARGOS solo agrega el "por qué" humano encima del resultado. NO decide qué intervenciones. | 🟡 Post-beta |
| `sintomas_pattern` | `detectPatternsFromSintomas` | Detecta patrones en síntomas aislados agregados (peso BAJO→sube en agregado). | 🟢 Roadmap |
| `cross_parameter` | `crossParameterAnalysis` | Correlación multi-parámetro de labs (Mariana proveerá research). | 🟢 Roadmap |

**Extensión crítica de contexto:** `loadUserContext`/`UserContext`/`buildContextPrompt` (argos-service) deben incluir el **DX vigente (raíces)** y las **intervenciones activas**, para que el chat ARGOS conozca "Mi Protocolo" y no contradiga. Es añadir 2 fuentes al `loadUserContext` existente.

---

## 6. Deprecados (qué mata este cambio)

| Elemento | Destino |
|---|---|
| Protocolo como driver de HOY/AGENDA | → biblioteca de referencia (código dormido tras flag, tablas intactas) |
| `generateDailyPlan()` como fuente de agenda | → solo referencia; HOY/AGENDA leen intervenciones |
| Plan `actionables-catalog.ts` + mig 171 del MVP | → subsumido por `interventions-catalog.ts` (nunca se construyó) |
| "Suplementos como intervención" | → ya están separados (pilar Nutrición); solo refuerzo de copy |
| Doble naming "Historia Clínica" | → unificado bajo `health-hub.tsx` como hub |

**Cero DROP TABLE. Cero data loss.** Todo es cambio de rol + feature flag.

---

## 7. Orden de merge (5 fases)

```
FASE 1 ─ Fundaciones de datos ────────────┐
  migraciones 170-175 + catálogo constants │  (dark, sin UI)
  + vocab + RLS + seeds                     │
                                            ▼
FASE 2 ─ Motor DX ──────────────┐    FASE 5 (parcial) ─ Síntomas + Padecimientos
  dx-engine + quality-core       │      (puede correr en paralelo con F2)
  + generateDX ARGOS             │
  + Card A (diagnostico)         │
  + extensión levantamientos     │
                                 ▼
FASE 3 ─ Motor Intervenciones ──────┐  (depende de F2: necesita raíces del DX)
  intervention-engine-core           │
  + intervention-service             │
  + Card B (mi-protocolo)            │
  + lista/detalle intervenciones     │
                                     ▼
FASE 4 ─ Swap HOY/AGENDA ───────────────  🔴 mayor riesgo, va al final
  day-compiler + agenda-service leen intervenciones
  + notificaciones + demote protocolo
  + feature flag INTERVENTIONS_DRIVE_HOY (doble-lectura en transición)

FASE 5 (resto) ─ Suplementos copy + BHA stub + pulido
```

**Dependencias duras:** F3 depende de F2 (raíces). F4 depende de F3 (necesita intervenciones activas para poblar HOY). **Paralelizable:** F2 ∥ F5-parcial (síntomas/padecimientos alimentan el DX pero su UI es independiente). Cada fase = branch propia + merge auditado por Cowork + `npx supabase db push`.

---

## 8. Riesgos técnicos (top 6)

1. **🔴 Swap de HOY/AGENDA (Fase 4).** `day-compiler.ts` (35 KB) e `index.tsx` (2047 líneas) con materialización perezosa de `daily_plans` cacheado por día. Si la compleción de intervención no mapea a electrones, se rompe la economía. **Mitigación:** feature flag `INTERVENTIONS_DRIVE_HOY` + doble-lectura (protocolo Y intervenciones) durante 1 ciclo + reuso de `awardBooleanElectron` para no tocar el ledger.

2. **🔴 Precio del DX vs realidad.** El brief dice 750 H+, pero una generación de DX es una llamada LLM real ≈ costo de chat/reporte; el ancla existente (`braverman_premium_report`) es **1000 H+**. 750 H+ subcotiza. Además `base` tier tiene rate-limit 25 llamadas/día. **Necesito decisión** (§9): ¿750 H+ es política de producto aunque subcotice, o alineamos a ~1000? + política de cache (no regenerar si no llegó dato nuevo).

3. **🟡 Alucinación de raíces / "falta de data ≠ ausencia".** ARGOS podría inventar raíces o afirmar ausencia por falta de dato. **Mitigación:** raíces restringidas al vocab (enum validado post-respuesta, se descartan las que no matcheen), `confidence` obligatorio por raíz, prompt explícito de no-ausencia.

4. **🟡 Doble sistema de agenda + materialización perezosa.** `daily_plans` (blob efímero) vs `agenda_events`/`agenda_event_logs` (instancias persistidas con push). Las intervenciones deben enchufar en el segundo para heredar notificaciones. Regeneración idempotente si el user activa/desactiva a media jornada.

5. **🟡 RLS + versionado + monedas.** Tablas nuevas con patrón own/coach. `functional_dx` append-only (nunca perder versiones). El costo del DX debe pasar SOLO por `spend_protons` RPC (las tablas de moneda son SELECT-only por diseño anti-minteo — no añadir `FOR ALL`).

6. **🟢 Catálogo vacío en build-time.** Mariana aún no llena `09_CATALOGO_INTERVENCIONES` (está en template). El motor debe degradar con N≥0 y traer un set de intervenciones **universales P1** (exposición solar matutina, hidratación, etc.) para que ningún user quede con protocolo vacío. `log()` claro de "catálogo con N intervenciones".

---

## 9. Decisiones que necesito confirmar (peloteo antes de ejecutar)

Por la regla de oro (Cowork+Enrique aprueban, yo ejecuto), estas 6 son las que cambian la ruta:

1. **Precio DX manual (Base):** ¿750 H+ como política aunque subcotice el costo LLM real (~1000 H+), o alineamos a 1000? ¿Cache: no regenerar si no hay dato nuevo desde la última versión?
2. **Catálogo en constants vs DB.** Recomiendo **constants** (`interventions-catalog.ts`, patrón `supplement-catalog.ts`): cura fácil, git-versionado, va al prompt. DB solo si quieren editar el catálogo sin release. ¿OK constants?
3. **Síntomas aislados:** recomiendo **reusar** `clinical_symptoms`/health-hub (ya existe) + `kind='aislado'`, en vez de tabla/pantalla nueva desde cero. ¿OK?
4. **Padecimientos:** recomiendo **tabla nueva** (fechas+tratamiento+resolución) en vez de reusar `condition_flags`/`medications` (007). ¿OK?
5. **BHA scanner:** recomiendo **V1.5 (post-beta)** — necesita base curada BHA + IA de imagen, no bloquea el DX. En V1: suplementos manual + refuerzo de copy, botón BHA "próximamente". ¿De acuerdo o lo quieren en V1?
6. **Protocolos precargados:** confirmo que quedan como **biblioteca de referencia** (tablas intactas, código dormido tras flag), NO se borran. ¿Correcto?

---

## 10. Timeline (horas por fase)

| Fase | Trabajo | Horas | Paraleliza |
|---|---|---|---|
| 1 | Migraciones 170-175 + catálogo scaffold + vocab + RLS + seeds + tests migración | 6-8h | — |
| 2 | dx-engine + quality-core + prompt `dx_generation` + Card A + extensión levantamientos + tests | 8-10h | ∥ con F5-parcial |
| 3 | intervention-engine-core + service + Card B + lista/detalle + `<PrioritySemaphore>` + tests | 8-10h | (tras F2) |
| 4 | Swap HOY/AGENDA + notificaciones + demote protocolo + flag + doble-lectura + tests | 10-12h | (tras F3) |
| 5 | Síntomas (reuso) + padecimientos + suplementos copy + BHA stub + pulido | 6-8h | parcial ∥ F2 |

**Total core ≈ 40-48h.** Con la paralelización (F2∥F5-parcial, y F1 desbloquea todo), la ruta crítica F1→F2→F3→F4 ≈ 32-40h. Dentro del <72h con buffer para el peloteo, la curación del catálogo por Mariana, y la ventana de build nativo (recordar: `expo-print` de labs-guide ya requirió build; verificar si algo aquí es nativo — a priori **todo es JS/TS → OTA vía `eas update`**, ver `[[project_expo_print_native_build]]`).

**Bloqueos externos:** (a) catálogo real de Mariana+Enrique (el motor arranca con placeholder + universales), (b) decisiones §9, (c) revisión clínica de Mariana del copy de intervenciones antes de beta pública.

---

*No he tocado código. Espero tu peloteo + las 6 decisiones de §9. En cuanto aprueben, ejecuto en el orden de §7.*

— Fable (CCF5), 2026-07-11
