# Fable 5 CC — Onboarding al proyecto ATP

**Preparado por:** Cowork (Claude Sonnet en Cowork mode)
**Para:** Fable 5 Claude Code
**Owner:** Enrique Zapata · ezbiohacker@gmail.com
**Fecha:** 2026-07-01
**Deadline duro:** lanzamiento a stores en **3 semanas**

---

## 0. Bienvenido al equipo

Trabajarás en paralelo con dos agentes:
- **Cowork (Sonnet en Cowork mode)** — orquestador. Escribe buzones, mantiene memoria y dashboard, aplica migraciones SQL vía MCP Supabase, hace research profundo cross-repo. NO commitea código en branches directo.
- **Claude Code (el actual)** — ejecutor de branches. Ha completado Sprints A hasta I. Toma buzones de Cowork, ejecuta, pushea a branches `feat/*` y reporta.
- **Tú (Fable 5)** — nuevo ejecutor en paralelo. Alivias la carga del CC actual y podemos abrir 2 branches simultáneas cuando el trabajo lo permita.

**Enrique** es el owner. Toma decisiones de producto, hace merges y OTAs, smoke test en device Android. **No es dev tiempo completo** — tiene una hora limitada, así que preferimos ejecutar directo cuando el buzón es claro y sólo pelotear cuando hay decisión de criterio real.

---

## 1. Qué es ATP

**ATP = Advanced Training Protocol** — app de rendimiento humano bajo modelo de medicina funcional. React Native + Expo SDK 54 + Supabase.

**Visión larga:** el sistema operativo de rendimiento humano — fitness, nutrición, mente, salud funcional, ciclo menstrual y gamificación con IA personalizada (ARGOS) bajo modelo de medicina funcional.

**Estado actual:** v1.2.x en producción beta. Objetivo inmediato v1.3 → publicación a stores en 3 semanas.

**Diferenciador:**
- **Rangos ÓPTIMOS, no solo normales** (medicina funcional > medicina clínica default)
- **Gamificación por electrones** (acciones efectivas verificables) + Protones H+ (moneda transable)
- **ARGOS** (asistente IA de salud funcional, Sonnet 4.6 + fallback Gemini)
- **Rediseño editorial premium** (imágenes B/N Midjourney en cada pantalla — es identidad visual)

**Filosofía de medicina funcional (no negociable):**
- No recomendamos bloqueadores químicos como primera opción
- Priorizamos causas raíz sobre síntomas
- No promovemos soluciones alópatas como default
- **PERO:** el lenguaje en UI consumer respeta guidelines de Apple/Google (ver `MedicalDisclaimer.tsx` + `ROADMAP_COMPLIANCE_STORES.md`)

---

## 2. Stack

- **Frontend:** React Native + Expo SDK 54 + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions Deno + Storage)
- **IA:** Anthropic Claude Sonnet 4.6 (primary), Gemini 2.5 Flash (fallback), ambos vía Edge Function `argos-proxy`
- **Observabilidad:** Sentry (project `atp-mobile` org `atp-v5`) + PostHog (project ATP en us.posthog.com)
- **Deploy:** EAS Update para OTA (JS/TS). Native builds solo para deps nativas o bump de versión.
- **Trabajo dir:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer` (Windows, PowerShell 5.1 — sin operador `&&`)

---

## 3. Reglas técnicas NO NEGOCIABLES (leer y respetar)

Estas están en `CLAUDE.md` del repo. Repítelas mentalmente antes de escribir código:

1. **NUNCA reescribir archivos completos** → solo `str_replace` quirúrgico
2. **NUNCA usar `crypto.randomUUID`** → usar helper `generateUUID`
3. **SIEMPRE `getLocalToday()` / `parseLocalDate()`** para date queries (NO `new Date().toISOString().split('T')[0]` — bug de timezone documentado)
4. **CADA `CREATE TABLE`** → `ALTER TABLE ENABLE ROW LEVEL SECURITY` + policy `auth.uid() = user_id`
5. **Después de electrones:** `DeviceEventEmitter.emit('electrons_changed')`
6. **Después de nutrición/ayuno/agenda:** `DeviceEventEmitter.emit('day_changed')`
7. **`Constants.expoConfig.extra`** para secrets en cliente (NO `process.env` directo en runtime; `.env` es solo para dev)
8. **TypeScript antes de push:** `npx tsc --noEmit` — cero errores
9. **OTA para JS/TS:** `eas update --branch preview` (default deploy)
10. **Native builds solo** para cambios nativos o bump de versión
11. **NUNCA cambiar versión en `app.json`** sin hacer build inmediato
12. **Migraciones SQL:**
    - **Idempotentes obligatorias** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)
    - **NO aplicar** desde Fable 5 al remoto directamente
    - Escribir el `.sql` en `supabase/migrations/NNN_*.sql` idempotente y avisar en el reporte
    - Cowork las aplica al remoto vía MCP Supabase `execute_sql` (evita bug del wrapper `apply_migration`)
    - SQL Editor solo para queries puntuales/debug, no para migraciones rutinarias

---

## 4. Lecciones aprendidas (memoria condensada — no las repitas)

Estas son las cosas que hemos aprendido a golpes. Respétalas o vamos a debuggear lo mismo:

- **Simple vence inteligente.** Tests = formularios de captura, no experiencias en vivo. Editor de agenda = form plano, no drag-drop.
- **Pantalla-por-pantalla.** No dispersar. Cerrar una antes de abrir otra.
- **Peloteo, no soluciones cerradas** — para decisiones de criterio, propón opciones y espera OK antes de escribir código grande.
- **Diagnóstico storage antes que UI.** Si un bug post-cleanup aparece en código nuevo pero no viejo, casi siempre es persistence layer (blob JSONB, lista persistida en BD, etc.), no wiring visible.
- **Nuevo electrón booleano requiere 3 lugares:** `ELECTRON_WEIGHTS` (electrons.ts) + `DEFAULT_BOOLEANS` (day-compiler.ts) + `active_boolean_electrons` persistida en `client_profiles`. Si falta el 3ro → falla silencioso.
- **Schema cache errors** de Supabase = deploy gap. Verifica `list_migrations` antes de tocar código.
- **Paint overlay destraba visual bugs.** Si algo no cuaja tras 2 hipótesis, pide a Enrique screenshot con anotaciones.
- **Fix con causa raíz confirmada, no adivinada.** Si diagnóstico está seguro por análisis de código+schema, adelante. Si es hipótesis, primero deploy logs, después fix.
- **Enrique es AUTOR del algoritmo Edad ATP y del stack.** Mariana Doria valida/firma pero NO diseña. No bloquear sprints esperándola.
- **OTA default, NUNCA proponer build nativo** a menos que agregues native dep o bump versión.
- **Enrique se comunica en peloteo** (rally corto, co-generar). No entregues buzones cerrados sin validación de decisiones críticas.
- **Los tests unitarios que importan assets `.png` rompen vitest** — pon los `require()` sólo en componentes/pickers, la lógica pura va en `image-pick-core.ts`.

---

## 5. Estado del proyecto (cerrado vs abierto)

### ✅ Cerrado (no tocar salvo bug):

- **Sprint A-F:** HOY completo (5 sub-secciones cronológicas · toggle electrones · barras proteína/agua · AYUNO card · info-tip modal custom · fix timezone electrones)
- **Sprint B:** YO editorial (9 cards sex-aware + cronotipo dinámico)
- **Sprint C:** MI ATP editorial (Historia + Hábitos pillars + top banner persistente en YO/MI ATP)
- **Sprint G1:** AGENDA funcional (tabla `agenda_events`, `agenda_event_logs`, `user_notification_tokens`, ruta `/agenda`, editor inline, auto-gen)
- **Sprint H:** AGENDA visual editorial (foto lateral + gradient por categoría + divisores MAÑANA/TARDE/NOCHE + FAB glow lima)
- **Sprint I:** AGENDA auto-gen smart (fix conflictos horario, comidas auto, gap fillers, rutina nocturna, notify defaults, banner prohibiciones, fix doble-tap electron_logs con idempotency_key determinística)
- **AGENDA push F6 (código en repo):** Edge Function `dispatch-agenda-notifications` + `push-notification-service.ts` + `user_notification_tokens` table. **Falta deploy + pg_cron**.
- **ARGOS:** Edge Function `argos-proxy` en producción, Sonnet 4.6 + fallback Gemini 2.5 Flash, sistema H+ con idempotencia, contexto de ~20 fuentes del usuario, prompt system de ~640 líneas con identidad+principios+banderas.

### ⚠️ Bugs abiertos AHORA (Enrique reportó 1-jul):

- **Duplicados en agenda** al auto-generar
- **Palomeado difícil** (tap ergonomía?)
- **Editar** no persiste correctamente
- **Sync HOY↔Agenda ausente** — completar un electrón en HOY no marca el evento correspondiente en agenda

### ❌ Abierto para lanzamiento en 3 semanas:

Ver §6 abajo (tu misión).

### 🔮 Explícitamente V1.1 o V2 (NO tocar en las 3 semanas):

- CICLO partner (feature grande — Sprint J pendiente)
- ARGOS opera agenda solo → **ATP Pro** (tier premium)
- Google Calendar sync → ATP Pro
- Top banner extender a HOY + ARGOS
- Cleanup helpers muertos (deuda técnica, no bloquea)
- Rediseño ARGOS pantalla
- Tab icons gradient (build nativo, no OTA)
- Test funcional fototipo Fitzpatrick

---

## 6. Tu misión (tareas priorizadas con OBJETIVO de cada una)

**Lo más importante de cada tarea es el OBJETIVO.** Sin entender el porqué no puedes tomar decisiones de criterio correctas.

### 🔴 SEMANA 1 — Estabilizar core

#### Task 1: Fix bugs de AGENDA (bloqueante)

**Qué:** resolver los 4 issues que Enrique reportó 1-jul:
1. Duplicados al auto-gen
2. Toggle completar/palomear no responde bien
3. Editar evento no persiste
4. HOY completar electrón NO marca evento equivalente en agenda (F7 del sprint G2 original)

**Objetivo:** la agenda es el corazón del "asistente de vida saludable" (ver memoria `project_agenda_como_asistente`). Si no palomea bien ni sincroniza con HOY, la propuesta de valor falla y el usuario no confía. Antes del lanzamiento debe ser fluida y confiable.

**Cómo:** diagnóstico con MCP Supabase directo (query real de `agenda_event_logs`) + fix en `agenda-service.ts` + wire sync en `HoyEditorialSection.toggleBoolean`. Probable que duplicados sean por `generateAgendaEvents` no siendo idempotente en cierto path.

**Deliverable:** branch `feat/agenda-fixes-critical`, buzón lo escribe Cowork, tú lo ejecutas.

#### Task 2: Deploy push notifications (F6 completo)

**Qué:** deployar Edge Function `dispatch-agenda-notifications` + aplicar migración 099 (pg_cron cada minuto) + configurar SERVICE_ROLE_KEY.

**Objetivo:** sin push, la agenda es solo pantalla que el usuario tiene que abrir. Con push, se convierte en asistente que recuerda a la gente. **Es la mitad de la propuesta de valor de la app**.

**Cómo:**
```powershell
supabase functions deploy dispatch-agenda-notifications
```
Migración 099 la aplica Cowork vía MCP. SERVICE_ROLE_KEY: Enrique lo tiene en Supabase Dashboard.

**Deliverable:** validación en device de que llega push real cuando `notify_minutes_before` se cumple.

### 🟡 SEMANA 2 — Onboarding + pagos

#### Task 3: Onboarding polish

**Qué:** revisar flujo completo desde signup hasta HOY con protocolo activo. Bugs, textos, transiciones.

**Objetivo:** primer contacto define retención. Si el user no completa onboarding, no llega a ver el producto. Debe ser rápido, claro, no invasivo.

**Cómo:** primero investigación (map de las pantallas actuales `app/onboarding/*`), luego lista de mejoras, luego buzón.

#### Task 4: Pagos (RevenueCat o similar)

**Qué:** integrar sistema de suscripción. Investigar CC_PROMPT_006 en repo (Enrique menciona RevenueCat pendiente). Tier free vs premium — precios USD (memoria `project_lanzamiento_atp_abr2026`).

**Objetivo:** sin pagos no hay ingresos. Es business viability.

**Cómo:** peloteo con Enrique sobre pricing/tiers (ATP base vs ATP Pro). Luego integración RevenueCat + gating de features.

### 🟢 SEMANA 3 — Compliance stores + polish + submit

#### Task 5: Compliance stores

**Qué:** cablear disclaimers médicos por pantalla desde `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md` (Mariana). Privacy policy + terms of service en flow de signup. Screenshots + descripciones + iconos para Apple/Google.

**Objetivo:** sin esto no hay submit. Es requisito legal + de las stores.

#### Task 6: Estabilidad + bug fixes urgentes

**Qué:** buffer semana para lo que salga. Testing exhaustivo, fixes de Sentry, mejoras UX puntuales.

**Objetivo:** llegar al submit sin regresiones.

### 📋 Tareas concurrentes que puedes tomar en paralelo (no bloquean):

- **Rediseño de auto-gen para otros protocolos** (hoy solo "energía y vitalidad" está enriched — hay otros templates que necesitan misma mano)
- **Notif inbox/campana en HOY** (task #3 del backlog — badge contador real conectado a push notifs recibidas)
- **Google Calendar sync SETUP** (aunque sea ATP Pro, dejar el andamio listo para v1.1)

---

## 7. Cómo trabajamos

### 7.1 Buzones

Cowork escribe buzones en `R and D/V1.X_SPRINT_*.md`. Estos son la "hoja de instrucciones" que traes al ejecutar. Lee TODO el buzón antes de tocar código. Si hay decisiones de criterio no cerradas, para y avisa.

### 7.2 Branches

- Una branch por sprint: `feat/<nombre>-v1XY` (ej. `feat/agenda-fixes-critical`)
- **NO mezcles sprints en una branch** — cada uno su rama
- **NO mergees a main** — Enrique hace el merge (control humano)

### 7.3 Commits

- Granulares por sección/fase del buzón
- Mensaje descriptivo: `feat(v13X.Y): qué hiciste`
- NO commit de secretos ni logs

### 7.4 Cierre de sprint

Al terminar, reporta en chat con:
- Branch pusheada + confirmación (git log --oneline -N)
- Verificación (`npx tsc --noEmit` + `vitest run` + counts)
- Tabla de commits x sección del buzón
- Decisiones de criterio que tomaste (con razón)
- Lo que NO hiciste y por qué (out of scope, blocker, etc.)
- Migraciones SQL escritas que Cowork debe aplicar

### 7.5 Comunicación con Cowork y Enrique

- Enrique lee tus reportes y decide merge + OTA + smoke
- Cowork audita tu branch y aplica migraciones al remoto
- Si tienes duda de decisión de criterio, escribe en el reporte "Decisión pendiente: X → recomiendo Y por Z" y espera OK antes de commit

---

## 8. Recursos

### 8.1 Archivos clave a leer AHORA (en orden):

1. **`CLAUDE.md`** — reglas técnicas del repo
2. **`R and D/V1.3_SPRINT_I_AUTOGEN_PROTOCOLOS.md`** — el sprint más reciente, entiende el patrón
3. **`R and D/V1.3_SPRINT_G_AGENDA.md`** — el sprint que introdujo AGENDA (contexto para bugs)
4. **`R and D/ARGOS_ATP_ARCHITECTURE.md`** — cómo funciona ARGOS (para no romperlo)
5. **`R and D/V1.3_BACKLOG_MASTER.md`** — inventario de features (busca "AGENDA V2" para roadmap post-launch)
6. **`Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md`** — copy Mariana (crítico para compliance)
7. **`R and D/PATY_CRASH_TEST_5_RAW.md`** — bugs reales reportados por usuaria (referencia UX)

### 8.2 Servicios clave del código:

- `src/services/agenda-service.ts` — CRUD de agenda + auto-gen (Sprint G1 + I)
- `src/services/protocol-builder-service.ts` — compiler smart (Sprint I)
- `src/services/argos-service.ts` — ARGOS cliente (loadUserContext + system prompt)
- `src/services/electron-service.ts` — award/revoke booleanos con idempotency (Sprint I)
- `src/services/day-compiler.ts` — compila `CompiledDay` para HOY (fuente de `booleanElectrons`, `agendaItems`, etc.)
- `src/lib/supabase.ts` — cliente Supabase (SecureStore adapter)
- `src/utils/date-helpers.ts` — `getLocalToday()`, `parseLocalDate()`, `toLocalDateString()`

### 8.3 Tablas SQL relevantes:

- `agenda_events` (recurrente por user), `agenda_event_logs` (instancia diaria + notify_at)
- `user_notification_tokens` (FCM/APNs)
- `daily_plans` (autogenerated por protocol-builder, tiene `actions` JSONB + `restrictions` JSONB)
- `electron_logs` (con `idempotency_key` desde migración 101)
- `user_protocols` + `protocol_templates` (default_actions JSONB)
- `client_profiles` (biological_sex, active_boolean_electrons, hoy_cards_visible)
- `user_chronotype` (lion/wolf/bear/dolphin + schedule)

### 8.4 MCPs disponibles a Cowork (no directamente a ti):

- Supabase (execute_sql, list_migrations) — Cowork aplica migraciones que tú escribes
- Google Drive — Cowork puede consultar docs de Enrique si aplica

### 8.5 Env vars críticas (en `app.json.extra`):

- `supabaseUrl`, `supabaseAnonKey`
- `sentryDsn`, `posthogKey`
- `eas.projectId`

En Edge Functions: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 9. Primer paso concreto para ti

**AHORA, antes de tocar código:**

1. Lee los 7 archivos de §8.1 en orden
2. Corre `git status` en el repo. Estamos en `main` con Sprint I recién mergeado (o listo para merge — Enrique confirma).
3. Corre `npx tsc --noEmit` para verificar estado base
4. Corre `vitest run` para ver los tests actuales pasar
5. Responde el **cuestionario en `FABLE5_CC_CUESTIONARIO.md`** para que Cowork sepa tus capacidades y limitaciones

**Después de eso**, Cowork te asigna Task 1 (fix bugs de agenda) con buzón detallado.

---

## 10. Filosofía final

Somos tres cerebros trabajando en el producto de una persona (Enrique). Tratamos el tiempo de Enrique como el recurso más caro. Cuando dudes:
- Antes de escribir 1000 líneas → verifica con Cowork
- Antes de aplicar migración → Cowork la ejecuta
- Antes de mergear → Enrique lo hace
- Antes de decir "no se puede" → propon la mejor opción tú puedas defender

Enrique dijo: **"podemos con todo"**. Sí, podemos, pero solo si cada uno hace su parte con criterio y no dispersamos.

Bienvenido al equipo. Hagámoslo.

— Cowork
