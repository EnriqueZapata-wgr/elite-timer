# 🎸 FABLE SPRINT #50 — Hardening dispatch-agenda-notifications V1.1

**Fecha:** 2026-07-07 (noche)
**Estimado:** 2-3h · sprint mediano, no marathon
**Owner:** Fable (CCF5)
**Contexto:** Enrique se va a dormir. Cowork audita marathon V1.4 en paralelo.

---

## 🎯 Objetivo

Hacer la Edge Function `dispatch-agenda-notifications` **production-grade** después del refactor v6 (smart criterio anti-bulk que fixea task #135). El v6 ya está desplegado y funcionando, pero le falta hardening para escalar sin que se caigan notifs silenciosamente o sin que un push failure quede en loop eterno.

**NO es rediseño.** Es endurecimiento aditivo sobre v6.

---

## 📖 Estado actual (v6, en producción)

Ubicación: `supabase/functions/dispatch-agenda-notifications/index.ts`

Lo que hace bien (no tocar):
- Bucket 15min + cooldown 30min per user (task #135 fix)
- Consolidación multi-evento en 1 notif
- Enforcement de user_notification_prefs
- Marca todos los logs como notified (incluye supresiones intencionales)

Lo que le falta (tu scope):
1. **Push fetch sin retry** — línea ~226, si `fetch(exp.host/push/send)` falla, se pierden esos batches para siempre.
2. **Sin dead-letter** — un token roto (usuario borró app, token expiró) reintenta cada minuto forever.
3. **Observability plana** — el response tiene counters pero no hay logs estructurados agregables (Sentry/PostHog o al menos console.log JSON).
4. **Sin circuit breaker** — si expo.host está caído, seguimos hammering.
5. **Sin alarma de anomalía** — si un cron genera 500 buckets (bug), nadie se entera.

---

## 🔨 Deliverables (5 tasks discretos, orden sugerido)

### T1 — Retries con exponential backoff (30 min)

En el bloque de envío push (línea ~223-234), envolver el fetch con retry:
- Máximo **3 intentos** por batch
- Backoff: 500ms, 2s, 5s
- Solo reintentar en errores de red / status 5xx / status 429
- 4xx (excepto 429) → no reintentar, es error del payload

Extraer a función helper `sendPushBatchWithRetry(batch, config)` para testeabilidad.

### T2 — Dead-letter para tokens rotos (45 min)

La respuesta de Expo Push devuelve un array con `status: 'ok' | 'error'` y `details.error` con códigos: `DeviceNotRegistered`, `InvalidCredentials`, `MessageTooBig`, etc.

Necesitas:

1. **Parsear la respuesta** de expo.host (actualmente se ignora el body).
2. **Nueva tabla** `push_failure_log` (migración nueva — rango Fable 158-199, usa la siguiente disponible tras 160):
   ```sql
   -- 161_push_failure_log.sql
   CREATE TABLE IF NOT EXISTS push_failure_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     expo_push_token TEXT NOT NULL,
     error_code TEXT NOT NULL,
     error_message TEXT,
     bucket_key TEXT,
     failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     attempt_count INT NOT NULL DEFAULT 1
   );
   CREATE INDEX IF NOT EXISTS idx_push_failure_user_time ON push_failure_log(user_id, failed_at DESC);
   CREATE INDEX IF NOT EXISTS idx_push_failure_token ON push_failure_log(expo_push_token);
   ALTER TABLE push_failure_log ENABLE ROW LEVEL SECURITY;
   -- No policies para authenticated — solo service_role lee/escribe.
   ```
3. **Auto-invalidar token** después de 3 failures del mismo token con `DeviceNotRegistered` → `DELETE FROM user_notification_tokens WHERE expo_push_token = ?`.
4. Los demás errores solo se logean (no auto-invalidan) para debugging.

### T3 — Observability estructurada (30 min)

Reemplazar `console.error`/`console.warn` planos por `console.log(JSON.stringify(...))` con shape:
```json
{
  "component": "dispatch-agenda-notifications",
  "level": "info|warn|error",
  "event": "dispatched|suppressed_prefs|suppressed_cooldown|push_failed|token_invalidated",
  "user_id": "...",
  "bucket_key": "...",
  "metadata": {...}
}
```

Supabase Logs los muestrea y son parseables. Agregar contador final agregado:

```json
{
  "component": "dispatch-agenda-notifications",
  "event": "run_summary",
  "buckets": 12,
  "push_success": 15,
  "push_retried": 2,
  "push_failed": 1,
  "tokens_invalidated": 0,
  "suppressed_by_prefs": 4,
  "suppressed_by_cooldown": 8,
  "duration_ms": 340
}
```

### T4 — Circuit breaker suave (30 min)

Si más del **50%** de los batches de un run fallan con error de red:
- Log de alerta con `event: "circuit_breaker_tripped"`
- **NO marcar los logs restantes como notified** (para que el próximo run los reintente)
- Return early con status 503

Config: `const CIRCUIT_BREAKER_FAIL_THRESHOLD = 0.5;`

### T5 — Anomaly detection (15 min)

Al inicio del run, si `pending.length > 200` → log de alerta:
```json
{
  "component": "dispatch-agenda-notifications",
  "event": "anomaly_high_pending",
  "level": "warn",
  "pending_count": 500,
  "message": "Backlog anormal — verificar si el cron se detuvo o hay bug en agenda_event_logs"
}
```

Umbral: `const ANOMALY_PENDING_THRESHOLD = 200;`

---

## 🧪 Tests requeridos

En `supabase/functions/dispatch-agenda-notifications/__tests__/hardening.test.ts` (nuevo):

- **sendPushBatchWithRetry**: 3 casos — éxito 1er intento · éxito 3er intento · fallo tras 3 retries
- **Parser de respuesta Expo**: caso `DeviceNotRegistered` marca token para invalidar
- **Circuit breaker**: 60% failures dispara trip, marca logs como pendientes
- **Anomaly detector**: >200 pending log warn

Target: **+8 tests mínimo**. Baseline actual 826 (marathon V1.4).

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **Migración 161 idempotente** — `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
2. **RLS obligatorio** en `push_failure_log` (aunque solo service_role la use)
3. **NO reescribir index.ts completo** — edición quirúrgica sobre v6 existente
4. **npx tsc --noEmit → 0 errores** antes de push
5. **Cada task es un commit** — 5 commits en el branch, no un mega-commit
6. **Deploy tú mismo** — al final `npx supabase functions deploy dispatch-agenda-notifications`. Que quede v7 en producción.

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Rediseñar bucket/cooldown (v6 anda bien)
- ❌ Cambiar la lógica de user_notification_prefs
- ❌ Migrar a otro push provider (Expo se queda)
- ❌ Tocar el cliente (esto es 100% edge function + migración)
- ❌ Sentry integration real (por ahora solo console.log JSON — Sentry viene después)

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_50_DELIVERY_2026-07-08.md` (cuando termines):

Tabla estándar Fable:
```
#: T1
Feature: Retries backoff
Estado: ✅ Completa
Clave: <resumen 2 líneas>
Tests: +N
```

Al final:
- Branch name (sugerido `feat/harden-agenda-notifs-v7`)
- Deploy version (v7)
- Migration status (aplicada al remoto o queue para Enrique)
- Bugs preexistentes detectados (si alguno)

---

## 🤝 Contexto de colaboración con Cowork

- **Marathon V1.4 branch** (`feat/v14-marathon-nightrun`) está en review por Cowork esta misma noche (adversarial audit).
- **NO tocar** `argos-proxy` — es de Cowork.
- **NO tocar** cliente — es scope V1.4 de tu marathon anterior, ya cerrado.
- Si detectas algún bug de mi v6 refactor, flaguéalo en el buzón de vuelta pero NO lo fixees a menos que sea CRÍTICO (bloquea el sprint).

Buena madrugada, Fable. Enrique confía en ustedes — esto es la última pieza para production-grade en notifs.

— Cowork (Opus 4.7)
