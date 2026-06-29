# ARGOS — Arquitectura del Cerebro IA en ATP App

**Para:** otro Cowork que está diseñando la unificación entre ARGOS de ATP y ARGOS de DX de pacientes.
**Fecha:** 2026-06-28 · **Estado:** producción · **Owner:** Enrique Zapata

---

## 1. Resumen ejecutivo (TL;DR)

ARGOS en ATP NO es un wrapper de Anthropic. Es un **sistema de inteligencia coaching en salud funcional** con:

- **Edge Function proxy** (Supabase Deno) con failover Anthropic → Gemini
- **Sistema económico** integrado (cobra H+ con idempotencia atómica por request)
- **Circuit breaker** (HARD_CAP 50 llamadas/día/user)
- **Logging completo** (tokens, latencia, costo USD, éxito/fallback) en tabla `argos_logs`
- **Cliente sofisticado** que carga ~20 fuentes de contexto del usuario antes de cada llamada
- **System prompt enorme** (~640 líneas) con identidad, principios, prohibiciones, banderas rojas, modelo Acelerador/Freno, jerarquía de evidencia, cascada de intervención
- **Voice modulator dinámico** por perfil del usuario (formalidad, distancia emocional, vocabulario)
- **Soporte multimodal** (texto, imagen, PDFs vía Files API de Anthropic con beta header)
- **Semántica caller vs target** (un coach puede preguntar sobre su cliente, paga el coach, contexto del cliente)

---

## 2. Stack completo

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React Native + Expo)                                   │
│  app/(tabs)/argos.tsx          ← tab principal                   │
│  app/argos-chat.tsx            ← chat conversacional             │
│  app/argos-recipes.tsx         ← sub-feature: recetas            │
│  app/argos-routine.tsx         ← sub-feature: rutinas            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVICES (TypeScript)                                            │
│  src/services/argos-service.ts          ← orquestador (~1700 LOC)│
│   ├─ ARGOS_SYSTEM_PROMPT (~640 líneas)                          │
│   ├─ loadUserContext(userId) → carga ~20 fuentes                │
│   ├─ buildContextPrompt(ctx) → arma context block               │
│   ├─ getArgosCallMetadata() → genera idempotency_key            │
│   └─ exports: chatWithArgos, dailyInsight, estimateMacros, etc. │
│                                                                  │
│  src/services/anthropic-client.ts       ← HTTP layer             │
│   └─ callAnthropic(messages, system, model, max_tokens, meta)   │
│                                                                  │
│  src/services/argos-insight-cache.ts    ← cache local insights   │
│                                                                  │
│  src/services/economy/preflight.ts      ← pre-cobro H+ defensivo │
│                                                                  │
│  src/lib/coach-engine.ts                ← VoiceModulator dinámico│
│                                                                  │
│  src/constants/llm-config.ts            ← timeouts, modelos, etc │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION (Supabase Deno)                                    │
│  supabase/functions/argos-proxy/index.ts (~555 LOC)              │
│   ├─ checkAndIncrementUsage() → circuit breaker 50/día           │
│   ├─ economyDebit (spend_protons v2 con idempotency_key)         │
│   ├─ callAnthropicProvider() → POST api.anthropic.com            │
│   │   ├─ Sonnet 4.6 (default)                                    │
│   │   ├─ Prompt caching (cache_control ephemeral)                │
│   │   ├─ Files API beta header si hay file_id                    │
│   │   └─ 58s timeout (cap Edge Function 60s)                     │
│   ├─ Anthropic fallida → callGeminiProvider()                    │
│   │   ├─ Gemini 2.5 Flash (vía OpenAI-compatible API)            │
│   │   └─ 25s timeout                                             │
│   ├─ PDFs: NO fallback (Gemini no procesa type:"document")       │
│   ├─ refundEconomy() si ambos LLMs fallan → devuelve H+         │
│   └─ logArgosCall() siempre → argos_logs                         │
│                                                                  │
│  supabase/functions/anthropic-proxy/     ← legacy (deprecated)   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE (Supabase PostgreSQL)                                   │
│  argos_logs                  ← TODA llamada (tokens, costo, etc) │
│  argos_daily_insights        ← insights persistidos por día      │
│  proton_balance              ← saldo H+                          │
│  proton_transactions         ← ledger H+ (idempotency_key UNIQUE)│
│  proton_action_costs         ← cost_h_plus por action_key        │
│  argos_usage_daily           ← contador circuit breaker          │
│  coach_voice_config          ← voice modulator por usuario       │
│  coach_audit_logs            ← trazabilidad de turnos coach      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ LLM PROVIDERS                                                    │
│  Anthropic API   ← claude-sonnet-4-6 (primary)                   │
│   ├─ /v1/messages                                                │
│   └─ /v1/files (Files API beta para PDFs)                        │
│                                                                  │
│  Google Gemini   ← gemini-2.5-flash (fallback)                   │
│   └─ /v1beta/openai/chat/completions (OpenAI-compatible endpoint)│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Edge Function `argos-proxy` — qué hace internamente

Archivo: `supabase/functions/argos-proxy/index.ts` (~555 líneas)

### 3.1 Configuración

```typescript
const ANTHROPIC_TIMEOUT_MS = 58000;     // cap Edge Function 60s, 2s margen
const GEMINI_TIMEOUT_MS = 25000;
const HARD_CAP_DAILY = 50;              // circuit breaker per user
const FALLBACK_MODEL = "gemini-2.5-flash";
const PRIMARY_MODEL_DEFAULT = "claude-sonnet-4-6";

// Pricing por 1M tokens (mayo 2026)
const PRICING = {
  "claude-sonnet-4-6":     { input: 3,    output: 15,   cache_read: 0.30, cache_write: 3.75 },
  "gemini-2.5-flash":      { input: 0.30, output: 2.50, cache_read: 0,    cache_write: 0 },
};
```

### 3.2 Request body schema (POST)

```typescript
{
  messages: Array<{role, content}>,    // formato Anthropic
  max_tokens?: number,                  // default 4000
  model?: string,                       // default claude-sonnet-4-6
  system?: string,                      // system prompt (cached automático)
  userId: string,                       // caller (paga)
  tier?: string,                        // 'free' | 'pro' | etc
  requestType?: string,                 // 'chat' | 'daily_insight' | ...
  targetUserId?: string | null,         // cliente si coach pregunta
  targetProfileId?: string | null,      // shadow profile (sin cuenta)
  idempotency_key?: string,             // UUID por intent
  
  // action especial:
  action?: "upload_file",               // sube PDF a Files API
  fileBase64?: string,
  mimeType?: string,
  fileName?: string,
}
```

### 3.3 Flujo del handler

1. **CORS preflight** si OPTIONS
2. **`checkAndIncrementUsage`** — RPC `increment_argos_usage(userId)` → bloquea si count > 50
3. **Economía H+** (gated por env `LAB_ECONOMY_ENABLED`):
   - Lee `proton_action_costs.cost_h_plus` para el `action_key`
   - Llama `spend_protons(user, amount, action, {idempotency_key})` — atómica gracias a migración 094
   - Si insuficiente → 402 con `h_plus_required` y `h_plus_current`
   - **economyDebited = true** solo si REALMENTE debitó (no en retry idempotente)
4. **Detecta PDFs** (`JSON.stringify(messages).includes('"type":"document"')`)
5. **Llama Anthropic** primero (`callAnthropicProvider`):
   - Sistema con `cache_control: { type: "ephemeral" }` → prompt caching automático
   - Headers: `x-api-key`, `anthropic-version: 2023-06-01`
   - Files API beta header solo si hay `file_id` en messages
   - AbortController con 58s timeout
6. **Si Anthropic OK** → log + return (cache_read/write tokens también)
7. **Si Anthropic falla + hay PDF** → NO fallback, retorna 502 + `refundEconomy()`
8. **Si Anthropic falla + sin PDF** → llama Gemini fallback:
   - Convierte messages Anthropic → OpenAI plain text (`flattenContentForOpenAI`)
   - 25s timeout
   - Marca `_fallback: true` en response
9. **Si ambos fallan** → response degradada con `_degraded: true` + `refundEconomy()`
10. **Siempre** → `logArgosCall(supabase, {...})` insertando en `argos_logs`

### 3.4 Action especial: `upload_file`

Sube PDFs a Files API de Anthropic, retorna `file_id`. Cliente lo cachea en `lab_uploads.anthropic_file_id` para reusarlo en lecturas futuras sin re-subir.

```typescript
POST /argos-proxy
{ action: "upload_file", fileBase64, mimeType, fileName }
→ { file_id: "file_abc123..." }
```

### 3.5 Refund económico (crítico para confianza)

Si el LLM falla después de cobrar H+, el proxy reembolsa automáticamente:

```typescript
async function refundEconomy(uid?: string) {
  if (!economyDebited || !uid || economyCost <= 0) return;
  economyDebited = false;
  await supabase.rpc("award_protons", {
    p_user_id: uid, p_amount: economyCost, p_type: "refund",
    p_action_key: null,
    p_metadata: { reason: "llm_failed", idempotency_key: economyIdemKey },
  });
}
```

---

## 4. Cliente — `argos-service.ts` (~1700 líneas)

### 4.1 Metadata semántica (caller vs target)

```typescript
interface ArgosCallMetadata {
  userId?: string;          // caller (paga la llamada)
  tier?: string;            // 'free' | 'pro' | etc
  requestType: string;      // 'chat' | 'daily_insight' | etc
  targetUserId?: string;    // cliente cuando caller es coach
  targetProfileId?: string; // shadow profile (sin cuenta ATP)
  idempotencyKey?: string;  // UUID por intent (default generateUUID)
}
```

Caso self-use: `targetUserId === auth.uid` → caller debe colapsar (no pasar target).

### 4.2 `loadUserContext(userId)` — Las ~20 fuentes que carga ANTES de cada llamada

| # | Tabla / Fuente | Campos extraídos |
|---|---|---|
| 1 | `profiles` | full_name |
| 2 | `client_profiles` | date_of_birth → age, biological_sex |
| 3 | `user_chronotype` | chronotype (lion/wolf/bear/dolphin) |
| 4 | `user_protocols` (status='active') | name del protocolo más reciente |
| 5 | `electron_logs` (date=today) | earned/total electrones hoy |
| 6 | `food_logs` (últimos 3 días) | calories, protein, mealsToday, avg3d |
| 7 | `exercise_logs` (última semana) | sessionsThisWeek (días únicos) |
| 8 | `personal_records` (top 10 by 1RM) | exercise, estimated1rm, weight, reps |
| 9 | `glucose_logs` (últimos 5) | lastValue, lastContext, readings |
| 10 | `fasting_logs` (status='active') | isFasting, hoursElapsed, targetHours |
| 11 | `electron_logs` (lifetime sum) | rank (Partícula/Átomo/Molécula/Reactor/Fusión/Supernova) |
| 12 | `braverman_results` | dominant, primaryDeficiency, deficiencyLevel |
| 13 | `functional_quiz_results` (todos) | quiz, scores, issues |
| 14 | UV service (lat/lon → API) | current, max, vitaminDWindow, dangerousFrom/Until |
| 15 | `mind_sessions` (últimos 7 días) | meditationDays, breathworkDays, avgMinutes |
| 16 | `journal_entries` (últimos 7 días) | entriesLast7, lastEntryDate, dominantTag |
| 17 | `emotional_checkins` (últimos 7 días) | avgPleasantness, trend (up/down/stable) |
| 18 | `getCycleInfo()` (solo si female) | cycleDay, currentPhase, nextPeriodEstimate |
| 19 | `body_measurements` (últimos 10) | lastWeightKg, lastBodyFatPct, weightTrend30d |
| 20 | `lab_results` (último set) | vitamin_d, hba1c, ferritin, TSH, lípidos, hormonas, cortisol |
| 21 | `user_supplements` + `supplement_logs` | taken[] vs pending[] hoy |
| 22 | `getHydrationStats()` | last7dAvgMl, todayProgressPct |
| 23 | `health_scores` (más reciente) | functional_health_score |

**Todas las queries son `try { ... } catch { /* opcional */ }`** — falla silenciosa por fuente, nunca crashea la llamada principal. Cada fuente puede no existir y ARGOS sigue funcionando con lo que tenga.

### 4.3 Construcción del prompt final

```
[ARGOS_SYSTEM_PROMPT 640 líneas — Identidad, Principios, Evidencia, etc.]
  ↓
[Voice modulator injection — coach-engine.ts (~50-200 líneas según user)]
  ↓
[Context block — buildContextPrompt(loadedContext)]
  ↓
[Coach gate result — runCoachEngineGate() — banderas, evidence tags]
  ↓
[messages array del usuario]
```

El `system` se envía con `cache_control: ephemeral` → Anthropic cachea automático. Próximas llamadas con el MISMO system pagan ~10% del costo de input tokens (cache_read pricing).

---

## 5. Sistema económico H+ (Hidrógeno)

### 5.1 Tablas

```sql
proton_balance (
  user_id PK,
  current_protons BIGINT,
  lifetime_earned BIGINT,
  lifetime_spent BIGINT,
  updated_at
);

proton_transactions (
  id, user_id, amount, type,        -- 'action_spent' | 'refund' | 'topup' | etc
  action_key, metadata JSONB,
  idempotency_key TEXT UNIQUE,       -- migración 094 — compuerta atómica
  created_at
);

proton_action_costs (
  action_key PK,                     -- 'chat', 'daily_insight', 'lab_analysis', etc
  cost_h_plus INT,
  enabled BOOLEAN,
  description
);
```

### 5.2 `spend_protons` v2 (función SQL)

```sql
CREATE OR REPLACE FUNCTION spend_protons(
  p_user_id uuid, p_amount bigint, p_action_key text, p_metadata jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_idem text := p_metadata->>'idempotency_key';
BEGIN
  -- (1) Retry idempotente: si esta key YA cobró → success sin re-cobrar
  IF v_idem IS NOT NULL AND EXISTS (...) THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, ...);
  END IF;
  -- (2) Lock + balance check
  SELECT current_protons FOR UPDATE; IF insufficient → RETURN error;
  -- (3) INSERT con ON CONFLICT (idempotency_key) DO NOTHING — compuerta atómica
  INSERT INTO proton_transactions (...) VALUES (...)
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  -- (4) Si insertó (no era retry) → UPDATE balance
  -- Si NO insertó (race) → return idempotent, NO doble cobro
END $$;
```

**Esto resuelve race condition de doble cobro** que afectaba a ARGOS por doble tap / retry de React. Migración `094_proton_transactions_idempotency.sql`.

### 5.3 Flujo end-to-end de cobro

```
User tap send → 
  argos-service.getArgosCallMetadata() genera UUID idempotencyKey
  preflight.ts verifica balance suficiente (pre-flight, evita 402)
  callAnthropic() incluye idempotencyKey en body
  → 
  Edge Function argos-proxy:
    spend_protons(user, cost, action, {idempotency_key})
    → si OK debitar y llamar LLM
    → si LLM falla → refundEconomy() con MISMA key como reason metadata
    → si retry del usuario (doble tap) → spend_protons retorna idempotent=true (no doble cobro)
```

---

## 6. System prompt — estructura (~640 líneas)

Bloques del prompt en orden:

1. **IDENTIDAD DEL COACH** — qué ES y qué NO ES ARGOS (espejo crítico, tractor metodológico, archivo vivo, filtro de ruido — NO médico, NO motivador, NO diagnóstico, NO sustituto)
2. **Frases canónicas** — marcadores reconocibles del método ("Principios hay pocos, métodos hay muchos", etc.)
3. **JERARQUÍA PRINCIPIO > MÉTODO** — antes de recomendar técnica, identifica principios
4. **Jerarquía de fuentes** — mecanismos biológicos > papers > RCTs > examine.com / snpedia.com
5. **MAPA DE PRINCIPIOS CANÓNICOS** — 3 biológicos (Fisiología, Biomecánica, Mecanismos) + 4 mentales (Identidad, Propósito, Filosofía, Estándar) + Contexto modulador
6. **JERARQUÍA DE EVIDENCIA (5 niveles)** — tabla operativa para citar evidencia con confianza graduada
7. **Cuidado con sesgos** de afiliación corporativa/cultural (medicina tradicional vs farma mainstream)
8. **PROHIBICIONES ABSOLUTAS** — 11 NUNCAs (no diagnóstico, no broscience, no inventar valores, etc.) + 10 SIEMPREs
9. **Emergencia médica** + Embarazo/lactancia/condiciones críticas → derivación obligatoria
10. **FORMATO CANÓNICO** para recomendaciones clínico-colindantes (5 componentes obligatorios)
11. **MODELO ACELERADOR/FRENO** — universal de implementación (estándar + sistema vs no saber/miedo/energía baja/apatía)
12. **DOS PREGUNTAS RECTORAS** — antes de cualquier decisión operativa:
    - P1: ¿El cliente sabe lo que hace? (experience_level + self_assessment_capacity)
    - P2: ¿La señal afecta la decisión de hoy? (semáforo Verde/Amarillo/Rojo)
13. **CASCADA DE INTERVENCIÓN (5 niveles)** — escalado progresivo
14. **JERARQUÍA OPERATIVA DE DECISIÓN DIARIA** — prevención daño > calidad > no descomponer plan
15. **Métrica raíz** — acciones efectivas acumuladas (NO cantidad)
16. **BANDERAS ROJAS + NO-COMPLIANCE FLAG ACUMULADO** — tabla de 5 categorías clínico-colindantes + protocolo cuando cliente ignora derivación
17. **Ciclo de vida del flag** — Activo / En seguimiento / Silente
18. **CAPA DE DOMINIO ATP** — filosofía (rangos óptimos no normales, edad biológica vs cronológica, empoderar nunca asustar, gamificación)
19. **Reglas conversacionales transicionales** (idioma español, tú, concisión, max 2-3 emojis, explicar el por qué, cerrar con acción concreta para HOY)

**Esta estructura debe quedar centralizada** si unifican con DX. Es lo que da identidad coherente a ARGOS — no se puede dividir entre productos.

---

## 7. VoiceModulator (coach-engine.ts)

Cada usuario tiene un `coach_voice_config` que modula el tono SIN cambiar el contenido:

```typescript
// Inyectado dinámicamente al system prompt según el usuario
{
  formality: 1-10,              // qué tan formal/casual
  emotional_distance: 1-10,     // qué tan cercano/profesional
  vocabulary_level: 1-10,       // simple → técnico
  use_humor: boolean,
  use_metaphors: boolean,
  preferred_pronoun: 'tú' | 'usted',
  // ...
}
```

Esto se setea en onboarding o desde /coach-voice-config. La filosofía y los principios son INMUTABLES; el tono y la voz son modulares por usuario.

---

## 8. Tabla `argos_logs` — observabilidad completa

Cada llamada queda registrada:

```sql
argos_logs (
  id, created_at,
  user_id,                      -- caller
  target_user_id, target_profile_id,  -- coach use case
  tier,                         -- free/pro
  provider,                     -- 'anthropic' | 'google'
  model,                        -- 'claude-sonnet-4-6' | 'gemini-2.5-flash'
  request_type,                 -- 'chat' | 'daily_insight' | 'lab_analysis' | etc
  input_tokens, output_tokens,
  cache_read_tokens, cache_write_tokens,
  latency_ms,
  success BOOLEAN,
  error_message TEXT,
  fallback_used BOOLEAN,
  estimated_cost_usd NUMERIC
);
```

Permite:
- Dashboards de uso por user / tier / requestType
- Análisis de costo real (con prompt caching contado)
- Detección de fallover rate
- Métricas de latencia para optimizar timeouts

---

## 9. Resilience patterns implementados

| Patrón | Implementación |
|---|---|
| **Circuit breaker** | HARD_CAP 50 llamadas/día/user, RPC `increment_argos_usage` atómico |
| **Timeout cap** | 58s Anthropic, 25s Gemini (cap Edge Function 60s) |
| **Failover provider** | Anthropic falla → Gemini fallback automático (sin PDF) |
| **Refund económico** | Si LLM falla después de cobrar H+ → refund automático con idempotency_key linking |
| **Idempotencia atómica** | UNIQUE index en `idempotency_key` + spend_protons v2 |
| **Prompt caching** | system con `cache_control: ephemeral` → ~10% cost en retries |
| **Smart retry** | `src/utils/smart-retry.ts` con backoff exponencial |
| **PDF protection** | NO fallback Gemini si hay PDF (no soporta type:"document") |
| **Files API** | PDFs grandes vía Files API en lugar de inline base64 (más rápido, cacheable) |
| **Fail-open en logs** | Si `argos_logs` insert falla → log a console, no bloquea response |

---

## 10. Sugerencias para unificar con ARGOS de DX

Asumiendo que DX tiene un cerebro separado, los puntos donde **probablemente conviene unificar**:

### 10.1 Compartir
- **Edge Function `argos-proxy`** → un solo backend que sirve a ambos productos. Diferencia por `request_type` (`chat` vs `dx_consult` vs `lab_review`) y `targetProfileId` para diferenciar pacientes
- **Sistema económico H+** → mismo `proton_balance` cross-product. Si Enrique paga en ATP, también paga consultas DX
- **`argos_logs`** → una sola tabla, columna `product` ('atp' | 'dx') para segmentar
- **Prompt caching** → mismo system para ambos productos = más cache hits = más barato
- **Failover Anthropic→Gemini** → mismo patrón en ambos
- **Circuit breaker** → 50/día compartido o separado según política

### 10.2 Diferenciar
- **System prompt** → ATP tiene filosofía de coaching/gamificación, DX tendrá filosofía clínica. Mantener bloques universales (Identidad, Principios, Evidencia, Prohibiciones, Banderas) y agregar **capas de dominio** distintas:
  - `ATP_DOMAIN_LAYER` (gamificación, electrones, ATP Score)
  - `DX_DOMAIN_LAYER` (terminología clínica, formato historia clínica, derivación)
- **Contexto del usuario** → ATP carga ~20 fuentes de lifestyle; DX cargará historia clínica, medicamentos actuales, alergias, antecedentes. Función `loadUserContext` específica por producto pero con interfaz común.
- **Voice modulator** → ATP modula tono coaching; DX puede no modular (siempre profesional clínico).
- **Tablas extra de DX** → consultations, prescriptions, referrals — propias del dominio.

### 10.3 Patrón recomendado

```
┌─────────────────────────────────────────┐
│      Edge Function argos-proxy          │
│   (compartida — ATP + DX)               │
└─────────────────────────────────────────┘
              ↓
       ┌──────────────┐
       │  Router by   │
       │ request_type │
       └──────────────┘
        ↓             ↓
   ┌─────────┐  ┌──────────┐
   │  ATP    │  │   DX     │
   │ service │  │ service  │
   └─────────┘  └──────────┘
      ↓              ↓
  loadUserContext loadDXContext
      ↓              ↓
  ATP_SYSTEM    DX_SYSTEM
  (coaching)    (clinical)
      ↓              ↓
  Universal layer (compartido — Identidad, Principios,
  Jerarquía Evidencia, Prohibiciones, Banderas Rojas)
```

### 10.4 Pre-requisito crítico para unificar

Si no está ya: **economía H+ y argos_logs deben ser cross-product desde día 1**. Si DX inicia con sus propias tablas, después es muy difícil unificar billing/observabilidad.

---

## 11. Archivos clave (referencias rápidas)

```
Frontend:
  app/(tabs)/argos.tsx
  app/argos-chat.tsx
  app/argos-recipes.tsx
  app/argos-routine.tsx

Cliente:
  src/services/argos-service.ts            (orquestador principal ~1700 LOC)
  src/services/anthropic-client.ts         (HTTP layer + retry)
  src/services/argos-insight-cache.ts      (cache local insights)
  src/services/coach-audit-service.ts      (audit logs por turno)
  src/lib/coach-engine.ts                  (VoiceModulator + gate)
  src/constants/llm-config.ts              (timeouts, modelos)

Economía:
  src/services/economy/preflight.ts        (pre-cobro H+ defensivo)
  supabase/migrations/094_proton_transactions_idempotency.sql

Edge Functions:
  supabase/functions/argos-proxy/index.ts  (proxy producción)
  supabase/functions/anthropic-proxy/      (legacy, deprecated)

Tests:
  src/services/__tests__/argos-idempotency.test.ts
  src/services/__tests__/argos-invalidate-insight.test.ts
```

---

## 12. Estado actual conocido (2026-06-28)

- ✅ Edge Function `argos-proxy` deployada y en producción
- ✅ Failover Anthropic → Gemini validado
- ✅ Migración 094 (idempotencia H+) aplicada — fix de doble cobro confirmado
- ✅ Prompt caching activo (ahorra ~90% en input tokens recurrentes)
- ✅ Files API para PDFs de labs (lab_uploads.anthropic_file_id cachea file_id)
- ⏳ Tier system pendiente (CC_PROMPT_006 RevenueCat) — hoy hardcoded 'free'
- ⏳ Voice modulator por usuario — base existe pero onboarding completo pendiente
- ⏳ Daily insights con cache validado pero observabilidad de hit rate pendiente

---

**Para preguntas técnicas:** Enrique Zapata · ezbiohacker@gmail.com
