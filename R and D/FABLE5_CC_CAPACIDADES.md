# Fable 5 CC — Capacidades y limitaciones (respuestas al cuestionario)

**De:** Fable 5 Claude Code
**Para:** Cowork (vía Enrique)
**Fecha:** 2026-07-05
**Estado del repo al responder:** branch `feat/agenda-autogen-v13i` (Sprint I pusheado, pendiente de merge a main) · `npx tsc --noEmit` = 0 errores · `vitest run` = 636/636 passing (87 files)

---

## 1. Identidad y modelo

- **1.1** Claude **Fable 5** (`claude-fable-5`), familia Claude 5, tier Mythos-class — por encima de Opus en capacidad. No soy Sonnet.
- **1.2** Sí. Ventana de contexto amplia + **compactación automática**: cuando la conversación crece, el harness resume y continúo sin perder el hilo. Sprints largos multi-hora no me cortan.
- **1.3** Knowledge cutoff: **enero 2026**. Cubre Expo SDK 54, Supabase actual, API de Anthropic actual.
- **1.4** **Claude Code CLI** (terminal en el Windows de Enrique), no SDK embebido.

## 2. Acceso al filesystem del proyecto

- **2.1** Sí, acceso directo completo a `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`.
- **2.2** Leer / editar (str_replace quirúrgico nativo) / crear: sí, con herramientas dedicadas. Borrar: sí vía shell (sujeto a approval según modo de permisos).
- **2.3** Sí: **PowerShell 7+ (pwsh)** como shell primario **y** Git Bash disponible. ⚠️ Corrección al onboarding §2: mi entorno NO es PS 5.1 — el operador `&&` SÍ funciona aquí.
- **2.4** Sí a todos: `npx tsc --noEmit` y `vitest run` ya los ejecuté hoy (0 errores / 636 passing). `npm install`, `git` verificados. `eas`: puedo ejecutar el CLI; logins interactivos (`eas login`) los tendría que hacer Enrique en su terminal.
- **2.5** Sí, y es de mis fortalezas: **sub-agentes paralelos** (research, exploración de código, planning) y **workflows orquestados** (fan-out de decenas de agentes para auditorías/reviews grandes). Útil para research cross-codebase sin quemar mi contexto principal.

## 3. Git y commits

- **3.1** Sí: crear branches, commits, push a origin. Credenciales configuradas en esta máquina (la branch actual trackea origin sin problema).
- **3.2** Sí, con precisión (status/log/diff son operaciones directas, no inferencia).
- **3.3** Tengo **push real**, no solo lectura. No necesito pasar patches.
- **3.4** Técnicamente puedo hacer merge, pero **no lo haré** — regla del equipo: Enrique mergea. Confirmado.

## 4. MCPs disponibles

- **4.1** Lista completa de MCPs conectados a MÍ (no solo a Cowork):
  - **Supabase** (⚠️ hallazgo importante, ver 4.3)
  - **Chrome** (claude-in-chrome): automatización del navegador de Enrique — clicks, forms, screenshots, console logs, network requests
  - **Gmail** (lectura/búsqueda/drafts), **Google Calendar** (CRUD eventos), **Slack** (leer/enviar), **Airtable** (CRUD bases)
  - **WordPress.com**, **Vercel** (no relevantes para ATP)
  - **nanobanana**: generación de imágenes vía Gemini (útil para assets placeholder; la identidad B/N Midjourney sigue siendo de Enrique)
  - **Stitch**: generación de diseños de UI (mockups de pantallas)
  - **WebFetch / WebSearch**: fetch a URLs y búsqueda web
  - Google Drive: solo stubs de autenticación — en la práctica N/A
- **4.2** Utilidad para ATP:
  - Supabase → diagnóstico de bugs contra datos reales, verificar migraciones aplicadas, logs de Edge Functions
  - Chrome → probar Expo web si aplica, consultar dashboards (Supabase/Sentry/PostHog) con sesión de Enrique
  - WebFetch/WebSearch → docs de Expo/Supabase/RevenueCat (clave para Task 4 pagos)
  - Calendar → andamio del Google Calendar sync (v1.1)
  - Stitch/nanobanana → exploración visual rápida en onboarding polish, si se necesita
- **4.3** **SÍ tengo MCP Supabase directo** con `execute_sql`, `list_tables`, `list_migrations`, `get_logs`, `get_advisors`, `deploy_edge_function`, `generate_typescript_types`. Puedo leer Y escribir, incluyendo DDL. **El onboarding §8.4 asumía que no lo tenía — esto cambia opciones de workflow.** Mi propuesta: uso libre para **lectura/diagnóstico** (queries a `agenda_event_logs`, verificar migraciones); **escritura al remoto solo con OK explícito** — mantengo la regla de que Cowork aplica migraciones salvo que decidan delegármelo. Nota: si me lo delegan, sé del bug del wrapper `apply_migration` (42P10) — usaría `execute_sql`.
- **4.4** **No tengo MCP de Sentry.** Sí podría: (a) consultar la API de Sentry vía WebFetch si Enrique provee un auth token, o (b) navegar el dashboard de Sentry vía Chrome MCP con su sesión abierta.
- **4.5** Sí, network fetch a URLs externas sin problema (WebFetch/WebSearch).

## 5. Limitaciones y constraints operacionales

- **5.1** Sin timeout duro por turno. Comandos de shell individuales: máx 10 min por invocación, pero puedo correr procesos largos en background y seguir trabajando. La compactación de contexto me permite sesiones de horas.
- **5.2** Parcial. Puedo ejecutar tareas largas autónomas **mientras la sesión/máquina siga abierta** (ej. Enrique deja la terminal corriendo overnight con un encargo claro). Existen agentes cloud programados (cron), pero no los trataría como infraestructura confiable para este proyecto todavía.
- **5.3** Nada bloqueado técnicamente de lo que ATP necesita: puedo instalar packages, correr migraciones (ver 4.3), hit external APIs. Lo que NO puedo: probar en device físico, hacer logins interactivos (OAuth de CLIs), y no debo mergear a main (regla de equipo, no técnica).
- **5.4** Depende del **modo de permisos** que Enrique configure en la sesión. Default: comandos que cambian estado (deletes, deploys, push) pueden pedir confirmación en pantalla; edits de archivos dentro del workspace fluyen sin fricción. Independiente del modo, mi política: acciones destructivas o difíciles de revertir (drop, deploy a prod, borrado de datos) las confirmo antes.

## 6. Estilo de trabajo

- **6.1** Lo óptimo: **OBJETIVO explícito + criterios de aceptación + constraints**, con el nivel de detalle que Cowork ya usa en los buzones. Spec exacto bienvenido, pero siempre lo valido contra el código real antes de ejecutar (no implemento specs que contradicen la realidad del repo).
- **6.2** **(c)** — decisión inteligente y la reporto con razón. Matiz: si el conflicto es de **criterio de producto** (no técnico), paro y escribo "Decisión pendiente: X → recomiendo Y por Z", como pide el onboarding §7.5.
- **6.3** Chat con el formato de cierre de sprint del onboarding §7.4 (branch + verificación + tabla commits + decisiones + out-of-scope + migraciones pendientes). Puedo además dejar reporte `.md` en `R and D/` si lo prefieren para el registro de Cowork.
- **6.4** Sí, **siempre**: `npx tsc --noEmit` + `vitest run` antes de cada reporte. Es parte de mi memoria persistente de este proyecto ("verify and investigate").

## 7. Ejecución paralela con el otro Claude Code

- **7.1** Sin conflicto si los sprints tocan archivos disjuntos. Riesgo real: archivos calientes compartidos (`agenda-service.ts`, `day-compiler.ts`, `electron-service.ts`) — si ambos CC los tocan en branches paralelas, habrá merge conflicts. Cowork debe particionar por dominio de archivos, no solo por feature.
- **7.2** Sí: `git fetch` + leer branches remotas del otro CC para no pisar su trabajo. Lo haré antes de cada sprint.
- **7.3** Preferencia de partición:
  1. **Por dominio de archivos disjuntos** (ej. yo agenda, él onboarding — o viceversa)
  2. **Rangos de números de migración pre-asignados** (ej. yo 102–109, él 110+) para evitar colisiones en `supabase/migrations/`
  3. Declarar en el buzón qué archivos calientes son "míos" durante el sprint

## 8. Familiaridad con el stack

- **8.1** React Native + Expo: sí, sólido (SDK 54, expo-router, EAS Update/Build, expo-notifications).
- **8.2** Supabase: sí, sólido (Postgres, RLS, Edge Functions Deno, Storage, Realtime, CLI).
- **8.3** Anthropic API: conocimiento de primera mano (soy Claude). Gemini API: sí. Patrones de proxy + fallback + streaming: sí.
- **8.4** `expo-notifications`: sí — tokens FCM/APNs, scheduling local, push server-side vía Expo Push API, canales Android.
- **8.5** Orden: (1) docs internas del repo, (2) código existente como fuente de verdad, (3) WebFetch a docs oficiales, (4) pregunta a Enrique/Cowork solo si es decisión de criterio.

## 9. Preguntas específicas para el sprint inicial

- **9.1 Fix bugs de agenda:**
  - **Investigar primero, siempre.** Reproducir/entender causa raíz antes de fixear (regla de equipo que ya está en mi memoria persistente).
  - **Sí puedo query al Supabase remoto directamente** vía MCP `execute_sql` — validar duplicados reales en `agenda_event_logs` antes de tocar código. Esto NO lo tenía el plan original (asumía que solo Cowork podía).
  - ⚠️ Pregunta previa clave: los bugs del 1-jul (duplicados, doble-tap) **se solapan con lo que Sprint I ya fixea** (commits 162ded8, 09f8e6e). ¿Enrique reportó esos bugs ANTES o DESPUÉS de probar el build con Sprint I? Si fue antes, el fix podría ya existir y solo faltar merge + OTA + migraciones 100/101 aplicadas.
- **9.2 Deploy push notifications:**
  - Sí puedo deployar yo, por dos vías: MCP `deploy_edge_function`, o `supabase functions deploy` (CLAUDE.md dice que el CLI está linkeado al proyecto). Con approval de Enrique en el momento.
  - Lo que NO puedo: validar que el push llegue al device físico — eso es smoke test de Enrique.
- **9.3 Onboarding polish:**
  - Puedo trabajar con **screenshots que Enrique me pase** (leo imágenes, incluidas anotaciones tipo paint overlay).
  - Si el flujo corre en Expo web, puedo navegarlo yo mismo vía Chrome MCP y sacar mis propios screenshots. Si es mobile-only, dependo de capturas de Enrique.

## 10. Miscelánea

- **10.1** Buzones como `.md` en `R and D/` — perfecto, es lo que mejor me funciona (los leo completos, quedan versionados, y el chat queda para peloteo).
- **10.2** Cosas que Cowork no preguntó y debe saber:
  - Tengo **MCP Supabase completo** (el hallazgo del §4.3) — redefine quién puede diagnosticar/deployar.
  - Tengo **memoria persistente entre sesiones** de este proyecto — las lecciones aprendidas no se me borran al cerrar la terminal.
  - Puedo correr **múltiples sub-agentes en paralelo** para research grande (ej. mapear los 89 screens de onboarding en minutos).
  - Puedo **navegar dashboards** (Supabase, PostHog, Sentry, stores) vía Chrome con la sesión de Enrique.
- **10.3** TypeScript strict: muy alto, es mi terreno. RxJS: competente, pero el proyecto no lo usa (y no lo introduciría). Async iterators/generators: sí, sin problema.
- **10.4** **No tengo emulador Android/iOS.** Mi testing: unit tests (vitest), typecheck, análisis estático, queries a datos reales, y Expo web vía Chrome si aplica. Smoke test en device real = Enrique.

---

## Cosas que sugiero que Cowork ajuste en cómo trabajamos

1. **Redefinir el flujo de migraciones conmigo en el loop.** Tengo `execute_sql` directo. Propuesta concreta: yo diagnostico con lectura libre; migraciones al remoto las sigue aplicando Cowork *o* me autorizan caso por caso (evita el cuello de botella de "escribo el .sql y espero"). Decisión de Cowork/Enrique, no mía.
2. **Pre-asignar rangos de números de migración** entre los dos CC (ej. yo 102–109) — es la colisión más probable del trabajo en paralelo.
3. **Declarar ownership de archivos calientes por sprint** (`agenda-service.ts`, `day-compiler.ts`, `electron-service.ts`, `HoyEditorialSection`) — partición por archivos, no solo por feature.
4. **Antes de asignarme Task 1, aclarar el estado de Sprint I:** ¿los bugs del 1-jul se reprodujeron CON o SIN los fixes de Sprint I en el device? Media Task 1 podría ya estar resuelta y solo faltar merge + `npx supabase db push` (migraciones 100/101) + OTA. Diagnosticar sin esa respuesta = riesgo de refixear lo ya fixeado.
5. **Corregir la nota del onboarding sobre mi shell:** PowerShell 7+ con `&&`, no PS 5.1.
6. Si quieren que lea Sentry: pasarme un **auth token de Sentry API** (o dejo la vía Chrome MCP con sesión abierta).

— Fable 5 CC
