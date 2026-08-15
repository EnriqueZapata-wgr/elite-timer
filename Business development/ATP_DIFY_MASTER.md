# 🧭 ATP DIFY MASTER · El documento norte

**Fecha:** 2026-08-10
**De:** Cowork Comercial → Enrique → **Cowork Developer (Claude Code)**
**Naturaleza:** documento de arquitectura y plan de implementación. TODO verificado contra código real (`argos-proxy/index.ts`, `argos-service.ts`, migraciones, servicios). Donde código y docs se contradicen, gana el código.
**Misión:** subir a ATP por la escalera **DIY → DIWY → DIFY** hasta donde nadie está.

---

## CÓMO USAR ESTE DOCUMENTO (para el Cowork Developer)

- Cada implementación tiene: **qué es → estado actual en código → diseño técnico → plan por pasos → esfuerzo → dependencias → riesgos/compliance → métrica de éxito**.
- Las referencias `archivo:línea` fueron verificadas el 2026-08-10. Si algo se movió, el patrón de búsqueda te lleva.
- **Orden de ejecución = orden del documento.** Fase 0 antes del launch; Fase 1 es el desbloqueo estructural; Fases 2-3 construyen sobre 1.
- Reglas transversales al final (sección R) — léelas ANTES de escribir código.

---

## EL MARCO (contexto en 30 segundos)

**DIFY en salud = 4 capas de "hacerlo por ti":**

```
CAPA 4 · AJUSTE     → el plan se corrige solo        ("no tengo que replanear")
CAPA 3 · EJECUCIÓN  → lo delegable se hace           ("no tengo que agendar/pedir")
CAPA 2 · DECISIÓN   → el día ya viene resuelto        ("no tengo que pensar qué hacer")
CAPA 1 · CAPTURA    → los datos entran solos          ("no tengo que registrar nada")
```

**Estado medido hoy:** Fitness 3.5 · Labs 3.5 · Hábitos 3.0 · Nutrición 2.0 · Mente 2.0 → **promedio 2.8/5 (DIWY con islas de DIFY)**.

**Los 2 bloqueadores estructurales (0 líneas escritas de ambos):**
1. **Tool use** — ARGOS habla pero no puede hacer. Grep de `tools:`, `tool_use`, `input_schema` en el stack de ARGOS = 0 resultados.
2. **Memoria persistente** — sin pgvector, sin memory tool, sin resúmenes cross-sesión. Abrir la app en frío = ARGOS en blanco.

**La ventaja ya construida:** motores deterministas a $0 de LLM (generador de rutinas con seed reproducible, motor de intervenciones con contraindicaciones + ciclo bidireccional, parser de labs autónomo con auto-derive de 9+ índices, day-compiler, cron minutal con circuit breaker). **Los competidores tienen LLM sin motores; ATP tiene ambos.**

---

# FASE 0 · PRE-LAUNCH (bajo riesgo, no toca UX)

---

## IMPL-01 · Router de modelos por requestType

**Qué es.** Hoy los 12 `requestType` (chat, insight 45 H+, weekly_insight 40 H+, dx_generation 1000 H+, food_estimate_photo…) llaman TODOS a Sonnet 5. Un router manda cada tarea al modelo más barato que la resuelve bien.

**Estado actual.**
- Un solo modelo: `argos-service.ts:29-30` → `MODEL_CHAT = MODEL_ESTIMATE = ATP_LLM.PRIMARY_MODEL`; igual en `bha-service.ts:76`, `dx/dx-engine.ts:288`, `nutrition-service.ts` (6 llamadas), `weekly-insight-service.ts:350`, `intervention-rationale-service.ts:124`.
- **La infra ya existe:** el proxy acepta `model` en el body (`argos-proxy/index.ts:444`) y `argos_logs` ya registra costo por token y por requestType — hay telemetría para decidir con datos.

**Diseño técnico.**
1. Tabla de ruteo **server-side** en el proxy (no en cliente — así se ajusta sin OTA):
```ts
const MODEL_ROUTING: Record<string, string> = {
  chat: "claude-sonnet-5",              // coaching = frontier
  dx_generation: "claude-sonnet-5",     // 1000 H+, calidad máxima
  food_estimate_photo: "claude-sonnet-5", // por ahora; candidato a Gemini Flash-Lite en Fase 1
  insight: "claude-haiku-4-5",          // texto corto estructurado
  weekly_insight: "claude-haiku-4-5",
  intervention_rationale: "claude-haiku-4-5",
  // default: PRIMARY_MODEL_DEFAULT
};
```
2. El cliente deja de mandar `model`; manda solo `requestType` (ya lo manda). El proxy resuelve.
3. Env var `MODEL_ROUTING_OVERRIDES` (JSON) para ajustar sin redeploy.
4. Fallback Gemini existente intacto (`index.ts:776-833`).

**Plan.**
- [ ] 1. Agregar mapa + resolución en `argos-proxy/index.ts` (después de leer `requestType`).
- [ ] 2. Ignorar `model` del body salvo requests con flag interno de debugging.
- [ ] 3. A/B silencioso 1 semana: loguear `routed_model` en `argos_logs`, comparar calidad de insights Haiku vs Sonnet con 20 ejemplos.
- [ ] 4. Ajustar el mapa según resultados.

**Esfuerzo:** 2-3 días. **Deploy:** Edge Function (sin OTA, sin build).
**Dependencias:** ninguna.
**Riesgo:** calidad de Haiku en insights → mitigado por el A/B del paso 3.
**Métrica:** costo LLM por usuario/mes ↓ ~40-55% en requests no-chat; calidad percibida sin caída.

---

## IMPL-02 · Cache split para callers no-chat

**Qué es.** El prompt caching ya está activo (`argos-proxy/index.ts:147-172`), pero el **split óptimo** (cerebro cacheado + bloque dinámico sin cache) solo aplica al chat con `BRAIN_ENABLED=true` y `dynamicSystem`. Los callers no-chat (insight diario, DX, nutrición, weekly) mandan un solo bloque que mezcla contexto volátil → **el cache casi nunca pega para ellos**. El propio código lo dice: "compartirles el bloque cacheado es Fase 2". Esta es esa Fase 2.

**Estado actual.** Split en `index.ts:611-619` gateado por `BRAIN_ENABLED === "true"` (`index.ts:607`) y solo si el cliente manda `dynamicSystem`.

**Diseño técnico.**
1. En cada servicio no-chat del cliente, separar el prompt en `staticSystem` (instrucciones de la tarea, formato de salida — no cambia entre usuarios ni llamadas) y `dynamicSystem` (datos del usuario).
2. El proxy ya sabe qué hacer con ambos — solo hay que MANDARLOS separados.
3. Verificar con `cache_read_input_tokens` en `argos_logs` (ya se loguea, `index.ts:230-231`) que el hit rate sube.

**Plan.**
- [ ] 1. `weekly-insight-service.ts:350` — separar prompt (el estático es grande: reglas + formato).
- [ ] 2. `dx/dx-engine.ts:288` — igual (el estático del DX es enorme; el ahorro aquí es el mayor).
- [ ] 3. `nutrition-service.ts` (6 llamadas) — igual.
- [ ] 4. `intervention-rationale-service.ts:124` — igual.
- [ ] 5. Dashboard rápido: query sobre `argos_logs` comparando cache hit rate antes/después.

**Esfuerzo:** 1-2 días. **Deploy:** OTA (cambios en cliente) + nada en proxy.
**Dependencias:** ninguna.
**Métrica:** `cache_read_input_tokens / input_tokens` > 60% en callers no-chat.

---

## IMPL-03 · Completar el contexto de ARGOS: sueño, Edad ATP, agenda, adherencia

**Qué es.** El wiring está al 100% en 22 tablas (25 bloques, `argos-context-core.ts`) PERO hay 4 datos que la app YA TIENE y el coach NO VE:
- **Sueño**: `sleep_nights` existe (migración 261) y no entra al `UserContext`.
- **Edad ATP / sub-edades**: `functional_dx` no entra.
- **Agenda del día y estado de hábitos**: `daily_plans` / `agenda_event_logs` / `habit_states` no entran.
- **Adherencia / racha**: el ledger `electron_logs`/`daily_electrons` entra solo como "electrones hoy", sin tendencia.

**Estado actual.** `loadUserContext()` en `argos-service.ts:722-1128` — 25 bloques listados en el audit. Los 4 de arriba ausentes.

**Diseño técnico.** Agregar 4 bloques al `UserContext` (mismo patrón que los existentes):
```
- sleepContext:    últimas 7 noches de sleep_nights (duración, score, tendencia)
- edadAtpContext:  Edad ATP integral + 5 sub-edades + fecha de cálculo + confianza
- agendaContext:   qué tiene hoy el usuario en agenda + qué ya completó (agenda_event_logs)
- adherenceContext: % de hábitos completados últimos 7 días + racha actual (daily_electrons)
```
Con reglas pegadas al dato (patrón existente en `argos-context-core.ts:192-221`): la Edad ATP siempre se comunica como "estimación educativa" (compliance), y el dato de sueño de source externa se marca como no-verificado.

**Plan.**
- [ ] 1. Extender interface `UserContext` en `argos-context-core.ts` con los 4 bloques.
- [ ] 2. Agregar las 4 queries a `loadUserContext()` (paralelas, mismo patrón).
- [ ] 3. Formatear en el bloque de contexto con reglas de uso para el modelo.
- [ ] 4. Verificar presupuesto de tokens: los 4 bloques suman ~600-900 tokens; van en `dynamicSystem` (no cacheado) — OK.

**Esfuerzo:** 1 día. **Deploy:** OTA.
**Dependencias:** ninguna (sleep_nights se llena más con IMPL-07, pero manual ya existe).
**Métrica:** ARGOS referencia sueño/agenda/racha correctamente en conversación; 0 alucinaciones de Edad ATP.

---

## IMPL-04 · Higiene técnica (rápidos, hazlos de una vez)

- [ ] **CLAUDE.md**: corregir `claude-sonnet-4-20250514` → `claude-sonnet-5`; borrar "próximo: fallback OpenAI" (falso — el fallback es Gemini y ya existe). 10 min.
- [ ] **`anthropic-proxy` legacy**: sigue desplegado con default `claude-sonnet-4-20250514` (`index.ts:83`). Confirmar que nadie lo llama → deprecar o actualizar default. 30 min.
- [ ] **`lab-parser-worker/index.ts:22`**: modelo `claude-sonnet-4-6` hardcodeado → jalar de config compartida. 20 min.
- [ ] **Extraer `glucose-service.ts`**: el insert de glucosa vive en `app/glucose-log.tsx` (pantalla). Extraer a servicio — requisito para exponerlo como tool en IMPL-05. 1h.
- [ ] **Extraer creación de journal a `journal-service.ts`**: mismo caso (`app/journal.tsx`). 1h.

---

# FASE 1 · LOS DESBLOQUEOS (semanas 1-4 post-launch)

---

## IMPL-05 · TOOL USE en ARGOS ⭐ (el desbloqueo #1)

**Qué es.** Darle manos a ARGOS. Hoy es texto-entra/texto-sale; con tool use puede **ejecutar**: registrar comida, marcar hábitos, iniciar ayunos, agendar, consultar el día. Es el prerequisito de TODA la Capa 3 (ejecución) y del Piloto Automático.

**Estado actual.** 0 líneas. Pero **las funciones a envolver ya existen y están probadas** (inventario completo verificado):

| Tool | Envuelve | Ubicación |
|---|---|---|
| `log_food` | `logFood()` + `analyzeFoodText()` | `nutrition-service.ts:101/215` |
| `log_water` | `addWater(userId, ml)` | `hydration-service.ts:75` |
| `start_fast` / `break_fast` | `startFast()` / `breakFast()` | `fasting-service.ts:103/128` |
| `complete_habit` | `awardBooleanElectron()` — **ya es idempotente** (idempotencyKey) | `electron-service.ts:39` |
| `log_glucose` | insert `glucose_logs` (extraer servicio primero — IMPL-04) | `app/glucose-log.tsx` |
| `save_checkin` | `saveCheckin()` | `checkin-service.ts:59` |
| `activate_intervention` / `complete_intervention` | `activateIntervention()` / `completeInterventionByKey()` | `intervention-service.ts:188/261` |
| `schedule_event` / `complete_agenda_item` | `createCustomEvent()` / `markAgendaLogCompleted()` | `agenda-service.ts:481/566` |
| `get_today_status` (lectura) | subconjunto de `compileDay()` | `day-compiler.ts:196` |
| `get_my_history` (lectura) | queries sobre las series de tiempo | varias tablas |

**Diseño técnico — decisión de arquitectura: ejecución CLIENT-SIDE.**
Casi todos los servicios escriben directo a tablas con RLS (verificado). El patrón más simple y seguro:
1. El proxy pasa `tools` (schemas) a Anthropic en requests de chat.
2. Cuando el modelo responde `tool_use`, el proxy **lo devuelve al cliente** (no ejecuta nada server-side).
3. El **cliente ejecuta** la función local correspondiente (con la sesión del usuario → RLS lo protege solo).
4. El cliente manda `tool_result` de vuelta → el proxy continúa la conversación.

Ventajas: cero nuevas superficies de seguridad (RLS ya protege), reusa código probado, los triggers existentes (cap de electrones, espaciado — migración 213) siguen aplicando.

**Reglas de seguridad (no negociables):**
- **Toda tool de ESCRITURA requiere confirmación del usuario en UI** en V1 del feature ("¿Registro esto? [Sí] [No]") — un tap, pero explícito. La delegación sin confirmación llega con el Piloto Automático (IMPL-10) como opt-in por niveles.
- Tools NUNCA ejecutan protocolos gateados (Wim Hof, ayunos >48h): ARGOS puede *sugerir* abrir la pantalla, no saltarse la atestación (SIGNOFF_ATESTACION vigente).
- `strict_tool_use` de Anthropic activado para schemas exactos.
- Presupuesto: máx 5 tool calls por turno; loop guard.

**Plan.**
- [ ] 1. Definir los 12 schemas JSON (nombre, descripción, input_schema) en un módulo compartido `src/services/argos-tools.ts`.
- [ ] 2. Proxy: aceptar `tools` en request de chat, pasarlas a Anthropic, manejar `stop_reason: "tool_use"` devolviendo el bloque al cliente. (`argos-proxy/index.ts`, ruta de chat.)
- [ ] 3. Cliente: dispatcher en `argos-service.ts` que mapea `tool_name → función local`, ejecuta con confirmación UI, y reenvía `tool_result`.
- [ ] 4. UI de confirmación inline en el chat (componente reutilizable, estilo "action card": qué va a hacer + [Confirmar] [Cancelar]).
- [ ] 5. Arrancar con 4 tools de bajo riesgo: `get_today_status`, `log_water`, `complete_habit`, `save_checkin`. Validar el loop completo.
- [ ] 6. Agregar el resto en pares, midiendo errores en `argos_logs` (nuevo campo `tool_calls`).
- [ ] 7. Actualizar el cerebro (`argos_brain`) con instrucciones de cuándo usar cada tool — coordinar con Cowork Cerebro.

**Esfuerzo:** 1.5-2 semanas. **Deploy:** proxy (Edge) + OTA.
**Dependencias:** IMPL-04 (servicios extraídos). El cerebro se actualiza vía `publish_argos_brain`.
**Riesgo/compliance:** las tools son "el usuario hace vía ARGOS", no "ATP decide" — la confirmación UI mantiene la agencia del usuario (consistente con posicionamiento wellness). Registrar tool_calls en `argos_logs` para auditoría.
**Métrica:** % de conversaciones con ≥1 tool ejecutada; tasa de confirmación (si <60%, las sugerencias son malas); NPS del chat.

---

## IMPL-06 · MEMORIA PERSISTENTE ⭐ (el desbloqueo #2)

**Qué es.** Que ARGOS recuerde la HISTORIA, no solo los datos. Hoy: `argos_conversations` guarda el JSON por conversación pero nunca se re-inyecta; historial cap a 24 turnos con resumen intra-conversación (`argos-history-core.ts:26`); sesión rota a los 5 min en background (`argos-session-core.ts:15`) → **cada sesión nueva arranca en blanco**.

**El cambio:**
> ❌ Hoy: "Te sugiero ayuno 16:8"
> ✅ Con memoria: "Ya intentamos 16:8 en marzo y te dio dolor de cabeza. Esta vez arrancamos 14:10 y subimos gradual."

**Diseño técnico — dos capas:**

**Capa A · Ficha viva (memory tool de Anthropic, GA, client-side):**
1. Tabla nueva:
```sql
CREATE TABLE argos_memories (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  path text NOT NULL,            -- 'perfil.md', 'protocolo_activo.md', 'que_funciono.md', 'que_no_funciono.md', 'preferencias.md'
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, path)
);
ALTER TABLE argos_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memories" ON argos_memories FOR ALL USING (auth.uid() = user_id);
```
2. El proxy declara el tool `{"type": "memory_20250818", "name": "memory"}` en requests de chat.
3. El **cliente** implementa el handler de comandos (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`) contra `argos_memories` — igual que las tools de IMPL-05 (client-side, RLS protege).
4. **⚠️ Validación de path traversal OBLIGATORIA**: todo path se normaliza y se restringe al prefijo del usuario; rechazar `..`, rutas absolutas, y paths fuera de la whitelist de archivos permitidos.
5. Al armar contexto, `loadUserContext()` inyecta el contenido de la ficha viva (cap ~1,500 tokens; si excede, ARGOS mismo la compacta — el tool se lo permite).
6. Cap duro server-side: 10 archivos × 4KB por usuario.

**Capa B · Recuperación semántica (pgvector):**
1. `CREATE EXTENSION vector;` + tabla `memory_embeddings (user_id, source_table, source_id, chunk text, embedding vector(768))`.
2. Trigger o job batch que embede: journal_entries, emotional_checkins (notas), resúmenes de conversaciones cerradas de `argos_conversations`.
3. Embeddings con `gemini-embedding-2` ($0.20/MTok) vía Edge Function batch nocturna.
4. En `prepareChatTurn`: si el mensaje del usuario amerita recuerdo (heurística simple: preguntas sobre pasado, "recuerdas", "otra vez", "como la vez que"), buscar top-5 chunks y añadirlos al `dynamicSystem`.

**Plan.**
- [ ] 1. Migración `argos_memories` + RLS. Capa A primero — es la de mayor valor/esfuerzo.
- [ ] 2. Proxy: declarar memory tool en chat.
- [ ] 3. Cliente: handler de comandos con validación de path (tests de path traversal INCLUIDOS).
- [ ] 4. Inyección de ficha viva en contexto + instrucciones en el cerebro ("mantén actualizados estos archivos; escribe qué funcionó y qué no").
- [ ] 5. Probar 2 semanas con usuarios internos; revisar manualmente qué escribe ARGOS en las fichas (calidad de memoria).
- [ ] 6. Capa B (pgvector) después — solo si la ficha viva se queda corta para recuerdos episódicos.

**Esfuerzo:** Capa A: 1 semana. Capa B: 1 semana adicional (diferible).
**Dependencias:** conceptualmente independiente de IMPL-05, pero comparte el patrón de ejecución client-side — hacer IMPL-05 primero lo abarata.
**Riesgo/compliance:** las memorias son dato sensible → cubiertas por el consentimiento CB-2 existente; se BORRAN con `account-deletion-processor` (agregar la tabla al proceso); exportables en `data-export-generator` (derecho ARCO). ⚠️ Agregar ambas integraciones al plan.
**Métrica:** retención D30 de usuarios con ficha viva activa vs sin; menciones correctas de historia en conversación.

---

## IMPL-07 · Build nativo: HealthKit + Health Connect (Capa 1)

**Qué es.** Sueño, entrenamientos y actividad entran SOLOS. El código **ya está escrito** — falta el build.

**Estado actual.** `@kingstinct/react-native-healthkit ^14.0.2` + `react-native-health-connect ^3.5.3` en `package.json:21,69`; plugin propio `plugins/with-health-connect-delegate.js`; `fitness/health-import-service.ts` (entrenamientos → `cardio_sessions`) y `sleep/sleep-import-service.ts` (noches → `sleep_nights`, `ON CONFLICT DO NOTHING`); lazy require fail-soft: *"el import real llega con el siguiente BUILD nativo"*. Decisión de diseño ya tomada: una integración (plataforma de salud del sistema), todas las fuentes (Garmin/Strava/Samsung escriben ahí). Solo lectura. Auto-sync opt-in.

**Plan.**
- [ ] 1. Build nativo (EAS) con ambos módulos activos — coordinar con el submit a stores (es el MISMO build, no uno extra).
- [ ] 2. Declarar permisos + purpose strings (HealthKit exige explicación clara; revisar App Store Review Guidelines 5.1.3 — datos de salud NUNCA para ads, consistente con nuestro posicionamiento).
- [ ] 3. Activar el toggle de auto-sync en UI (ya existe: `cardio-import.tsx:378-389`).
- [ ] 4. QA en device físico iOS + Android.
- [ ] 5. Al confirmar datos fluyendo: el `sleepContext` de IMPL-03 empieza a poblarse solo.

**Esfuerzo:** 2-4 días (mayormente QA). **Deploy:** build nativo (aprovechar el del launch).
**Dependencias:** ninguna de código; sí del ciclo de builds.
**Compliance:** actualizar Aviso de Privacidad: fuente de datos "plataformas de salud del dispositivo" (ya contemplado como categoría; verificar texto).
**Métrica:** % usuarios con auto-sync activo; noches de sueño capturadas sin acción del usuario.

---

## IMPL-08 · Modo "Confío en ti" en nutrición (Capa 1)

**Qué es.** El pilar más manual (2.0/5). Hoy: foto → estimación → **pantalla de confirmación** → editar → registrar (`app/food-scan.tsx:434-688`). Propuesta: toggle opt-in que **auto-registra** cuando la confianza del modelo es alta, con corrección de un tap después.

**Diseño técnico.**
1. El análisis de foto ya devuelve estimación estructurada. Agregar al prompt de análisis un campo `confidence: high|medium|low` con criterios (comida claramente identificable, porción estimable).
2. Con toggle activo + `confidence: high` → `logFood()` directo + snackbar: *"Registré: 2 tacos de pastor ~520 kcal. [Corregir]"*.
3. `confidence: medium|low` → flujo actual de confirmación.
4. [Corregir] abre el editor con el registro precargado; la corrección sobreescribe.
5. El toggle vive en Perfil → Nutrición, default OFF, con explicación honesta ("a veces me equivocaré; corregirme toma un tap").

**Plan.**
- [ ] 1. Campo confidence en el prompt + parsing (en `nutrition-service.ts`).
- [ ] 2. Branch de auto-registro en `food-scan.tsx` + snackbar con undo.
- [ ] 3. Telemetría: % de auto-registros corregidos (si >25%, subir el umbral de confianza).

**Esfuerzo:** 2-3 días. **Deploy:** OTA.
**Dependencias:** ninguna. Sinergia futura con router (IMPL-01): la foto puede rutearse a Gemini Flash-Lite (~$0.002/foto) tras validar calidad.
**Métrica:** Nutrición sube de 2.0 → 3.5; fotos/usuario/semana ↑; tasa de corrección <20%.

---

# FASE 2 · EL SALTO DE CATEGORÍA (mes 2-4)

---

## IMPL-09 · ARGOS proactivo real (push con texto generado)

**Qué es.** Hoy el cron minutal dispara **plantillas** de agenda. El insight diario es pull (lo dispara el cliente al abrir HOY — `app/(tabs)/index.tsx:225-263`, cache 6h). Falta: ARGOS que te escribe SIN que abras la app, con contexto real.

**Estado actual (infra lista):** cron + `net.http_post` + Vault (`099_agenda_cron.sql:32`); pipeline push completo con tokens (`user_notification_tokens`), prefs + quiet hours, cooldown, circuit breaker, dead-letter, inbox (`user_notifications`) — todo en `dispatch-agenda-notifications`. **Solo falta la Edge Function que genere el texto con LLM y la envuelva.**

**Diseño técnico.**
1. Nueva Edge Function `argos-proactive` con cron diario (elegir hora por cronotipo del usuario — ya está en contexto).
2. Por usuario elegible (opt-in + activo últimos 7 días): cargar contexto compacto (reusar subconjunto de `loadUserContext` — extraer a módulo compartido server-side) → 1 llamada a **Haiku 4.5** (barato, texto corto) con presupuesto de 60 palabras → push + inbox.
3. **Reglas duras de valor:** máximo 1 proactivo/día; SOLO se manda si hay algo específico que decir (regla: el prompt devuelve `SKIP` si no hay señal — se respeta); nunca genérico ("¡buenos días! 💪" = prohibido).
4. Ejemplos del nivel esperado: *"Llevas 3 noches bajo 6h y hoy tienes fuerza programada. Considera moverla a mañana — tu cuerpo está pidiendo recuperación."*
5. Opt-in explícito en Perfil → Notificaciones ("Mensajes proactivos de ARGOS").
6. Costo: 1 llamada Haiku/usuario/día ≈ $0.001 → $1/mes por 1,000 usuarios activos. Trivial.

**Plan.**
- [ ] 1. Extraer `loadUserContextCompact()` reutilizable server-side (subset: sueño, agenda hoy, adherencia, ayuno activo, check-in ayer).
- [ ] 2. Edge Function + cron con ventana por cronotipo.
- [ ] 3. Prompt con criterio SKIP + presupuesto de palabras + palabras rojas del posicionamiento.
- [ ] 4. Envolver el patrón push existente (tokens + prefs + inbox).
- [ ] 5. Piloto con usuarios internos 2 semanas; medir tasa de apertura y opt-out.

**Esfuerzo:** 1 semana. **Deploy:** Edge + migración cron.
**Dependencias:** IMPL-01 (router — el proactivo usa Haiku), IMPL-03 (contexto completo).
**Riesgo:** notificación de baja calidad = opt-out masivo. El criterio SKIP es la defensa. Compliance: los mensajes cumplen palabras rojas (nunca "diagnóstico", nunca prescriptivo médico).
**Métrica:** open rate >40%; opt-out <5%/mes; DAU lift en usuarios con proactivo activo.

---

## IMPL-10 · MODO PILOTO AUTOMÁTICO ⭐ (la apuesta de categoría)

**Qué es.** El usuario delega el día; ATP presenta **UNA cosa a la vez**. Sin menús, sin decidir. *"7:20 · Sal 12 min ahora, el UV está en 3."* → hecho → siguiente. Es el salto de "app de salud" a "sistema operativo" — el tagline hecho producto. **Nadie lo tiene** (Whoop/Oura = dashboard; Google = chat).

**Estado actual (los motores ya existen):** `compileDay()` arma el día completo (`day-compiler.ts:196` — 25 queries, agenda + electrones + hábitos + UV + ciclo); `habitTimes` ya resuelve horas por regla ancla+offset; `agenda_events`/`agenda_event_logs` persisten y completan; recomendación del Hero con 20 reglas locales gratis (`hoy/local-recommendation.ts`); sync bidireccional agenda↔electrones (`agenda-service.ts:612-654`). **Lo que falta es la CAPA DE PRESENTACIÓN secuencial + el motor "¿qué sigue AHORA?"**.

**Diseño técnico.**
1. **Motor `next-action-engine.ts` (determinista, $0 LLM):** dado `CompiledDay` + hora actual + estado, devuelve LA siguiente acción. Reglas de prioridad: (a) ventana temporal crítica primero (UV, ayuno por cerrar), (b) agenda con hora, (c) hábitos pendientes por orden del día, (d) nada pendiente → estado "día resuelto". Es una extensión natural de `local-recommendation.ts`.
2. **UI "Piloto":** pantalla alternativa de HOY (toggle en el header). Una card grande: acción + por qué (1 línea) + [Hecho] [Posponer] [Saltar]. Al completar → siguiente card. Diseño: la doctrina existente de "UNA acción por pantalla".
3. **Delegación progresiva (los 4 niveles como eje de producto):**

| Nivel | Nombre | Qué hace | Gate |
|---|---|---|---|
| 1 | Copiloto | Hoy (dashboard + sugerencias) | default |
| 2 | Asistido | ATP arma el día, usuario confirma el plan en la mañana (1 tap) | opt-in |
| 3 | **Piloto** | UI secuencial; ATP decide el orden y el momento | opt-in |
| 4 | Autónomo | + ARGOS ejecuta lo delegable vía tools sin confirmación por acción (registros de bajo riesgo) | opt-in + Pro |

4. **Nivel 4 conecta IMPL-05:** el usuario autoriza por CATEGORÍA ("ARGOS puede registrar mi agua y mis hábitos sin preguntar") — consentimiento granular guardado con el patrón de auditoría de consentimiento existente.
5. Los protocolos gateados (atestación) SIEMPRE requieren el flujo completo, en cualquier nivel — el Piloto los presenta pero no los salta.

**Plan.**
- [ ] 1. `next-action-engine.ts` + tests (matriz de escenarios: mañana/tarde/noche, ayuno activo, día vacío).
- [ ] 2. UI Piloto (card secuencial) detrás de feature flag.
- [ ] 3. Toggle de nivel en Perfil (1↔2↔3; el 4 llega tras IMPL-05 estable).
- [ ] 4. Beta cerrada con Founders (ellos son early adopters por definición) — feedback 2 semanas.
- [ ] 5. Nivel 4 cuando tool use tenga >4 semanas de producción estable.

**Esfuerzo:** 2-3 semanas (motor 1 semana, UI 1-1.5, pulido). **Deploy:** OTA.
**Dependencias:** IMPL-03 (contexto), idealmente IMPL-09 (el proactivo invita al Piloto). Nivel 4: IMPL-05.
**Comercial:** el nivel de delegación es un eje natural de tiers (Base = 1-2, Pro = 3-4). Coordinar con pricing.
**Métrica:** adopción del nivel ≥2 entre Founders >30%; completion rate del día en Piloto vs dashboard; retención D30 por nivel.

---

## IMPL-11 · Detección automática de patrones

**Qué es.** Correlaciones personales que nadie más hace: *"Las 4 veces que cenaste después de las 9 PM, tu sueño profundo bajó ~20%. ¿Probamos cerrar la cocina a las 8?"*

**Estado actual.** Las series de tiempo existen y son ricas (inventariadas): `food_logs`, `sleep_nights`, `glucose_logs` (+`ketones_logs` → GKI), `emotional_checkins`, `electron_logs`/`daily_electrons` (ledger conductual maestro), `fasting_logs`, `cycle_daily_logs`, `mind_sessions`, `cardio_sessions`/`workout_sessions`, `lab_values`. **Nada las cruza.**

**Diseño técnico (híbrido determinista + LLM, en 2 etapas):**
1. **Etapa estadística (SQL, $0):** Edge Function semanal `pattern-scan` que corre un set FIJO de correlaciones candidatas predefinidas (no fishing expedition): hora de última comida vs duración/score de sueño; sesiones de mente vs mood del día siguiente; ayuno vs glucosa matutina; entrenamiento vs sueño; fase del ciclo vs energía/mood; adherencia vs mood. Requiere n≥8 observaciones por celda y efecto mínimo (umbral por métrica) para candidatearse.
2. **Etapa narrativa (LLM):** los candidatos que pasan el filtro van a Haiku para redacción del insight en lenguaje ATP (educativo, sugerencia, nunca "diagnóstico"). Salida a `weekly_insights` (tabla existente) + opcionalmente al proactivo (IMPL-09).
3. **Regla de honestidad estadística:** todo insight lleva "en tus datos de las últimas X semanas" — correlación personal observada, no causalidad ni claim clínico. Con n chico se calla (SKIP).

**Plan.**
- [ ] 1. Definir las 8-10 correlaciones candidatas con Mariana (como contenido: cuáles tienen plausibilidad fisiológica — evita correlaciones espurias embarazosas).
- [ ] 2. Edge Function `pattern-scan` con SQL por correlación + umbrales.
- [ ] 3. Paso narrativo Haiku + guardado en `weekly_insights`.
- [ ] 4. Superficie: sección "Patrones tuyos" en el weekly insight existente.
- [ ] 5. Feedback loop: 👍/👎 por patrón (si 👎, no repetir ese patrón 30 días).

**Esfuerzo:** 1.5-2 semanas. **Deploy:** Edge + OTA (UI).
**Dependencias:** IMPL-07 (sueño automático — sin él, el patrón más valioso no tiene datos).
**Métrica:** % usuarios con ≥1 patrón detectado al mes 2; engagement con la sección; 👍 rate >70%.

---

## IMPL-12 · Expediente que se prepara solo

**Qué es.** *"Tu cita es el jueves. Ya preparé tu resumen: serie de 7 años, 3 hallazgos, y las 2 preguntas que te conviene hacer."* La tesis de ATP ("no vas con las manos vacías") ejecutada SOLA.

**Estado actual.** El motor de labs es la parte fuerte (parser autónomo, `lab_values` time-series, auto-derive). Existe generación de PDF (Mapa Funcional). **Falta:** el trigger (saber que hay cita) y el ensamblado del paquete médico.

**Diseño técnico.**
1. **V1 sin calendario** (evita el permiso y el build): el usuario lo pide — botón "Preparar resumen para mi médico" en Mi Salud, o vía tool de ARGOS (`generar_resumen_medico`, IMPL-05). Genera PDF: series relevantes de `lab_values`, hallazgos priorizados (del DX existente), medicaciones/suplementos actuales, y 2-3 preguntas sugeridas (Sonnet 5, tarea de calidad).
2. **V2 con trigger:** campo opcional "fecha de mi próxima consulta" (capturado por ARGOS conversacionalmente o en Mi Salud) → cron revisa fechas próximas → 48h antes genera y notifica (IMPL-09).
3. **Compliance:** el PDF es "resumen informativo preparado por el usuario con ATP" — lenguaje educativo, sin "diagnóstico", con disclaimer estándar. Es el usuario compartiendo SUS datos (derecho ARCO de portabilidad — legalmente limpio).

**Plan.**
- [ ] 1. Template del PDF (reusar el motor del Mapa Funcional PDF).
- [ ] 2. Ensamblador: query de series + hallazgos + prompt de "preguntas para tu médico".
- [ ] 3. Botón en Mi Salud + tool en ARGOS.
- [ ] 4. V2 (trigger por fecha) tras IMPL-09.

**Esfuerzo:** 1 semana (V1). **Deploy:** OTA + Edge para generación.
**Dependencias:** IMPL-05 (para la vía conversacional; el botón no la necesita).
**Métrica:** PDFs generados/mes; feedback cualitativo Founders ("¿tu médico lo leyó?").

---

## IMPL-13 · Voz conversacional (Gemini Live)

**Qué es.** Conversación hablada bidireccional con ARGOS — manos libres entrenando, cocinando, caminando. Con tools (IMPL-05): *"ya comí, registra unos tacos de pastor"* → hecho, sin abrir pantalla.

**Estado actual.** `argos-voice` existe: ElevenLabs Flash TTS + Gemini 2.5 Flash STT (`argos-voice/index.ts:36-39`) — es turn-based (dictado → texto → respuesta → TTS), no conversación fluida.

**Diseño técnico.**
1. **Gemini Live API** (audio in $0.005/min, out $0.018/min ≈ **$1.38/hora** — 3.5× más barato que ElevenLabs conversational).
2. Arquitectura: cliente ↔ WebSocket con proxy delgado (auth + logging + inyección de contexto compacto al inicio de sesión) ↔ Gemini Live.
3. **El cerebro de la conversación de voz es Gemini** (no Claude — Live es de Google). Aceptable: la voz es para acciones rápidas y check-ins, no para coaching profundo; el system prompt de voz es una versión compacta del cerebro con las mismas reglas (palabras rojas, derivaciones).
4. Tools en voz: subset de bajo riesgo (log_food, log_water, complete_habit, get_today_status) con confirmación VERBAL ("¿registro 2 tacos al pastor?" — "sí").
5. Límite por tier: minutos de voz/mes como consumible H+ (la economía ya existe).

**Plan.**
- [ ] 1. Spike técnico: WebSocket Gemini Live desde RN (2-3 días — validar latencia y español MX).
- [ ] 2. Proxy de sesión de voz (Edge Function con upgrade a WS o servicio delgado).
- [ ] 3. UI de voz (pantalla simple: estado hablando/escuchando + transcript).
- [ ] 4. Tools de voz con confirmación verbal.
- [ ] 5. Costeo por tier + medidor de minutos.

**Esfuerzo:** 2-3 semanas. **Deploy:** OTA + infra de WS.
**Dependencias:** IMPL-05 (tools). Riesgo técnico: WS estable en RN background — el spike lo valida.
**Métrica:** minutos de voz/usuario/semana; % de sesiones de voz con acción ejecutada.

---

# FASE 3 · DIFERENCIACIÓN ESTRUCTURAL (mes 4+, planes resumidos)

## IMPL-14 · Gemelo Metabólico
Predicción personal antes de actuar: *"con el sueño que traes, ese ayuno mañana te da bajón a las 3 PM. ¿Lo movemos?"*. **Base:** los patrones de IMPL-11 se convierten en reglas predictivas personales (si patrón X confirmado + condición hoy → predicción). V1 es determinista sobre patrones ya detectados + narrativa LLM; no requiere ML propio. **Dependencias:** IMPL-11 con 2+ meses de datos. **Esfuerzo:** 2 semanas sobre esa base.

## IMPL-15 · CGM (glucosa continua)
El pilar declarado (GKI, flexibilidad metabólica) con captura automática. Integrar **Dexcom Stelo** (API pública, OTC en US; verificar disponibilidad MX) y/o FreeStyle Libre (LibreLinkUp). `glucose_logs` + `ketones_logs` ya existen — es una fuente nueva, no un modelo nuevo. **Nota:** en México los CGM OTC aún son limitados — investigar disponibilidad/precio local antes de priorizar. **Esfuerzo:** 2-3 semanas por integración.

## IMPL-16 · Modo Familia
Administrar salud de pareja/papás. **Enorme en LATAM, invisible para US.** Requiere: cuentas vinculadas con consentimiento EXPLÍCITO del familiar (dato sensible de tercero — diseño de consentimiento con el mismo rigor del signup), vista cuidador limitada (adherencia y recordatorios, NO journal/emociones — privacidad dentro de la familia), y recordatorios delegados. **Compliance primero:** diseñar el modelo de consentimiento antes que la UI. **Esfuerzo:** 3-4 semanas.

## IMPL-17 · Contratos de compromiso
*"Me comprometo a dormir 7h por 30 días; si fallo 3 veces, autorizo a ATP a subir el stick."* Mecánica: contrato en app (objetivo medible + duración + consecuencia elegida: tono más directo de ARGOS, stake de electrones, notificar a un buddy). El ledger de `daily_electrons` ya mide todo. Encaja con carrot AND stick calibrado. **Esfuerzo:** 1-2 semanas.

## IMPL-18 · Portabilidad de historia clínica
El expediente (IMPL-12) + export estructurado completo → *"¿médico nuevo? le mando tu historia de 7 años en un PDF que sí va a leer"*. `data-export-generator` ya existe — esto es la versión NARRATIVA y clínicamente ordenada del export. Retención brutal: más tiempo en ATP = más caro irte. **Esfuerzo:** 1 semana sobre IMPL-12.

## IMPL-19 · Comercio agéntico (súper, labs, suplementos)
Lista de compras generada del plan semanal con ATP Functional Score por producto → export/compartir (V1) → integración Rappi/Cornershop (V2). Agendado de labs con la red de afiliados (conecta con wallet $100/mes). Handoff a humano: *"esto amerita ojo clínico; tengo espacio con un especialista de la red el martes"* → HUB Fx. **Cada uno monetiza además de servir.** **Esfuerzo:** por pieza, 1-3 semanas.

---

# R · REGLAS TRANSVERSALES (leer antes de escribir código)

**R1 · Compliance es arquitectura, no capa.** Palabras rojas del `POSICIONAMIENTO_MASTER.md` aplican a TODO texto generado (prompts de insights, proactivo, patrones, expediente). Los protocolos gateados (atestación) NUNCA se saltan por ninguna vía nueva (tools, voz, Piloto). Todo lo nuevo que toque datos sensibles se registra en Aviso de Privacidad y se integra a `account-deletion-processor` + `data-export-generator`.

**R2 · Determinista primero, LLM después.** Si una regla resuelve, no llames al modelo. El next-action-engine, los patrones estadísticos y los gates son deterministas; el LLM narra y conversa. Esa es la ventaja de costo y de confiabilidad.

**R3 · Client-side + RLS como patrón de ejecución.** Tools y memoria ejecutan en el cliente con la sesión del usuario. No crear superficies server-side con service_role salvo necesidad real (proactivo, batch). Si server-side: patrón `spend_protons` (check `auth.uid()` o validación explícita).

**R4 · Todo medible.** Cada feature nueva loguea a `argos_logs` (o tabla propia) lo suficiente para decidir con datos: tool_calls, routed_model, cache hits, patrones detectados, opt-outs.

**R5 · Opt-in y agencia.** Toda delegación es opt-in explícito y reversible. El usuario siempre puede bajar de nivel. La confirmación se relaja por CATEGORÍA autorizada, nunca globalmente por default.

**R6 · No romper la economía H+.** Tools y proactivo generan consumo LLM — presupuestar por tier, reusar idempotencia + refund del proxy.

**R7 · OTA sobre builds.** Todo lo que pueda ser OTA, es OTA. Builds nativos solo IMPL-07 (y va con el del launch).

---

# RESUMEN EJECUTIVO DE ESFUERZOS

| Fase | Impl | Qué | Esfuerzo | Deploy |
|---|---|---|---|---|
| 0 | 01 | Router de modelos | 2-3 d | Edge |
| 0 | 02 | Cache split no-chat | 1-2 d | OTA |
| 0 | 03 | Contexto: sueño+edad+agenda+adherencia | 1 d | OTA |
| 0 | 04 | Higiene (CLAUDE.md, servicios) | ~3 h | — |
| 1 | 05 | **Tool use** ⭐ | 1.5-2 sem | Edge+OTA |
| 1 | 06 | **Memoria persistente** ⭐ | 1 sem (+1 pgvector) | Edge+OTA |
| 1 | 07 | HealthKit/Health Connect | 2-4 d | Build (el del launch) |
| 1 | 08 | "Confío en ti" nutrición | 2-3 d | OTA |
| 2 | 09 | ARGOS proactivo | 1 sem | Edge |
| 2 | 10 | **Piloto Automático** ⭐ | 2-3 sem | OTA |
| 2 | 11 | Detección de patrones | 1.5-2 sem | Edge+OTA |
| 2 | 12 | Expediente automático | 1 sem | OTA+Edge |
| 2 | 13 | Voz (Gemini Live) | 2-3 sem | OTA+infra |
| 3 | 14-19 | Diferenciación estructural | por pieza | — |

**Fase 0 completa: ~1 semana. Fase 1 completa: ~4 semanas. Con Fase 1 terminada, ATP pasa de 2.8 a ~3.8/5 — y con el Piloto Automático (IMPL-10), cruza a territorio donde no hay nadie.**

---

*Verificación de código: 2026-08-10, contra `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\`. Estrategia de contexto: `ESTRATEGIA_DIY_DIWY_DIFY_ATP.md` y `ESTRATEGIA_SUPERINTELIGENCIA_PERSONAL_ATP.md` (carpeta ATP/Business development).*
