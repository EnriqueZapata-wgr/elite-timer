# 🎸 FABLE SPRINT #50 — DELIVERY: Hardening dispatch-agenda-notifications v7

**Fecha:** 2026-07-08 (madrugada)
**Owner:** Fable (CCF5)
**Branch:** `feat/harden-agenda-notifs-v7` (pusheada a origin, 5 commits — uno por task)
**Deploy:** **v7 ACTIVE en producción** — primer run del cron verificado: `POST | 200`, 564ms
**Migración 161:** ✅ **APLICADA al remoto** vía MCP (idempotente; el archivo también va en el branch)
**Suite:** `npx tsc --noEmit` = 0 errores · `vitest run` = **845/845** (baseline 826 + **19 nuevos**, spec pedía +8)

---

## Tabla estándar

```
#: T1
Feature: Retries backoff
Estado: ✅ Completa
Clave: sendPushBatchWithRetry (3 intentos, 500ms/2s/5s; solo red/5xx/429;
       4xx corta). fetch/sleep inyectables → testeable sin red ni timers.
Tests: +6

#: T2
Feature: Dead-letter tokens rotos
Estado: ✅ Completa
Clave: analyzeExpoTickets cruza tickets↔batch (token+bucket_key);
       push_failure_log (161, RLS ON sin policies = solo service_role);
       3+ DeviceNotRegistered históricos → DELETE del token. Best-effort:
       nunca bloquea el dispatch.
Tests: +5

#: T3
Feature: Observability estructurada
Estado: ✅ Completa
Clave: structuredLog JSON {component, level, event, ...}; eventos
       suppressed_prefs/cooldown (1 por user), push_failed,
       token_invalidated (token truncado a 24 chars), run_summary con
       los 8 counters del spec + duration_ms.
Tests: +2

#: T4
Feature: Circuit breaker suave
Estado: ✅ Completa
Clave: >50% batches con fallo de RED → trip: log + 503 + logs de
       dispatch NO marcados (retry en el próximo run) + inbox NO
       insertado (para que el cooldown no suprima el retry). Los
       suprimidos por prefs/cooldown SÍ se marcan (intencional).
Tests: +4

#: T5
Feature: Anomaly detection
Estado: ✅ Completa
Clave: >200 pending al inicio → warn anomaly_high_pending con
       pending_count. Umbral en const, 200 exacto no dispara.
Tests: +2
```

## Decisiones de criterio

1. **Helpers puros en `hardening.ts`** (mismo dir de la function, cero imports): lo importa el `index.ts` de Deno con `.ts` y lo testea vitest en node. Un solo source of truth, sin duplicación. El `vitest.config.ts` amplió el include a `supabase/functions/**/__tests__/`.
2. **Tradeoff del circuit breaker**: batches que SÍ salieron antes del trip pueden duplicar push en el retry del próximo run. Preferible a perder notifs — y el caso solo ocurre con expo.host medio-caído.
3. **Token truncado en logs** (24 chars): suficiente para debug, no filtra el push token completo a los logs.
4. **push_success cuenta tickets `ok` reales** (no mensajes enviados); fallback a batch size si el body 2xx no parseó.

## ⚠️ Bugs preexistentes detectados en v6 (NO fixeados — fuera de scope, ninguno crítico)

1. **Cooldown no aplica intra-run.** El check de cooldown se hace contra `user_notifications` ANTES de insertar las del run actual. Un user con eventos en 2+ buckets distintos dentro del mismo run recibe N notifs de golpe. En operación normal (cron cada minuto) casi no pasa, pero si el cron se pausa 2 horas, el run de recuperación puede mandarle 8 buckets juntos a un mismo user. Sugerencia v8: cap de 1 bucket por user por run (consolidar el resto o diferirlos).
2. **Query de pending sin ORDER BY con `.limit(500)`.** Con backlog >500 el subset procesado es arbitrario — los logs más viejos pueden morir de hambre. Sugerencia: `.order("notify_at", { ascending: true })`. (Con T5 al menos ahora hay alarma cuando el backlog crece.)

## Estado final

- Branch `feat/harden-agenda-notifs-v7` lista para audit/merge (el deploy ya está en prod — el merge solo formaliza el código en main).
- v6→v7 es 100% aditivo: bucket/cooldown/prefs intactos.
- Cliente intacto. argos-proxy intacto.

Buen día cuando despierten. 🌅

— Fable (CCF5)
