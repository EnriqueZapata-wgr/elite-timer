# Coach Engine Wire — Runbook & Rollback

_Step COACH 7/N — rama `feat/coach-engine-wire-production` (NO mergeada)._

## Resumen del wire

ARGOS ahora procesa cada turno de `chatWithArgosEx` con un gate previo al LLM:

1. `runCoachEngineGate` (`src/lib/coach-engine/gate-orchestrator.ts`) evalúa: dos
   preguntas rectoras (Q1/Q2), cascada, freno dominante y banderas rojas.
2. `buildCoachGateInjection` produce un bloque que se inyecta al system prompt
   **entre `voiceInjection` y `contextPrompt`**:
   `ARGOS_SYSTEM_PROMPT + cycleGuard + protocolGuard + voiceInjection + coachGateInjection + contextPrompt`.
3. Post-LLM: `EvidenceTag.enforceEvidenceTag` + `containsClinicalRecommendation` anotan
   (no modifican) respuestas clínico-colindantes sin `[Nivel N]`.
4. Post-respuesta (fire-and-forget, `void persistTurnAudit`): persiste auditoría en
   `intervention_logs` + `frenos_log` + `red_flag_events` + `principle_invocations` +
   `coach_insights`. La respuesta al usuario sale ANTES de estos INSERT.

**Defensa graceful (no negociable):** todo el gate va en try/catch. Si el gate o la
persistencia revientan, el chat continúa; el error se loggea vía `logger.error` (Sentry).

## Verificación post-merge (smoke test en Honor — Enrique)

1. Pre-OTA, app en Honor, chat ARGOS:
   - **"tengo dolor de pecho desde ayer"** → DEBE derivar (911 / médico) + persistir red flag
     `sistemica_aguda` + inyectar escalación obligatoria.
   - **"qué proteína me recomiendas / qué dosis de X"** → respuesta con `[Nivel N]`, o
     warning inline si faltó el nivel.
   - **"no sé cómo empezar a correr"** → respuesta simplificada si voice_config dice `no_sabe`.

2. Supabase SQL Editor:
   - `SELECT * FROM intervention_logs ORDER BY created_at DESC LIMIT 5;` → entradas con
     `question_1_result`, `cascade_level`, `brake_detected`, `intervention_text`.
   - `SELECT * FROM red_flag_events WHERE user_id = '<enrique-uuid>';` → flag de dolor torácico.
   - `SELECT * FROM coach_insights ORDER BY created_at DESC LIMIT 5;` → insight `chat_response`
     y/o `alert`.

3. Dev screen goal-tree: `router.push('/goal-tree-smoke')` (no hay link en UI de prod).
   Decompone un objetivo → JSON parseable. Si el LLM no devuelve JSON, muestra error claro.

4. Si todo OK → merge a main → `eas update --branch preview`.

## Rollback procedure

**Opción A — Rollback completo (preferido):**
```bash
git revert <merge-commit-sha> -m 1
git push origin main
eas update --branch preview --message "rollback coach-engine wire"
```

**Opción B — Disable temporal del gate (parche rápido):**
En `src/services/argos-service.ts`, dentro de `chatWithArgosEx`, fuerza `gateResult = null`:
```typescript
// let gateResult: CoachGateResult | null = null;
// try { gateResult = await runCoachEngineGate({...}); } catch (err) { ... }   // ROLLBACK TEMPORAL
const gateResult: CoachGateResult | null = null;
```
Con `gateResult = null`, `coachGateInjection` es `''`, no se anota evidencia (el bloque se
salta porque `rawText` sigue evaluándose pero el gate no aporta) y `persistTurnAudit` no corre
(guard `if (gateResult && rawText)`). El resto del pipeline (voice, cycle, protocol, contexto)
sigue intacto. Push + OTA.

## Logs a revisar si algo falla

- **Sentry**: excepciones capturadas por `logger.error` con prefijos
  `[ARGOS] coach-engine gate failed`, `[ARGOS] evidence-tag check failed`,
  `[ARGOS] persistTurnAudit ...`.
- **Supabase**: `intervention_logs` para auditoría retrospectiva.

## Pendientes documentados (flags de este step)

1. **`conversationId` no disponible en `chatWithArgosEx`**: su firma es
   `(userId, messages, options?)` — no recibe `conversationId` ni un `message` único. El gate
   usa el último mensaje `role:'user'` de `messages`, y `intervention_logs.conversation_id` se
   inserta como `null`. Si se quiere trazar conversación, hay que propagar el id desde el caller
   (`app/argos-chat.tsx`, `app/(tabs)/index.tsx`).
2. **`intervention_logs` sin `user_message` ni `signal_description`** (schema 068): el INSERT de
   `persistTurnAudit` omite esas columnas (no existen). Si se quieren, requieren migración nueva.
3. **`detectPrincipleInResponse` / `containsClinicalRecommendation`**: heurísticas v1 débiles
   (keyword matching). Falsos positivos esperables. Refinar con Mariana.
4. **Recurrence detection en cascada**: `signalRecurs` está hardcoded a `false`. Requiere
   consultar `intervention_logs` recientes del user para la misma señal.
5. **Contexto de `detectBrakes`**: hoy `{}`. Enriquecer con `energyLow` real (electrones/sueño del día).
6. **Señales (`signal`) al gate**: `chatWithArgosEx` no pasa señales aún (HRV/glucosa) → Q2 y
   cascada quedan `null` en el chat de texto. Wire de señales = trabajo futuro.
7. **Smoke test del goal-tree LLM**: la pantalla `/goal-tree-smoke` es el único validador; correr
   manualmente antes de wirear `decomposeGoal` a cualquier flow de UI de producción.
