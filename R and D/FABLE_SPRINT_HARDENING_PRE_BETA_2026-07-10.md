# 🎸 FABLE SPRINT — HARDENING PRE-BETA · tech debt + polish invisible

**Fecha:** 2026-07-10 (jueves noche → viernes AM)
**Estimado:** 4-6h · sprint quirúrgico
**Deadline:** viernes 2026-07-10 12:00 CDMX
**Owner:** Fable (CCF5)
**Contexto:** Sprint ONBOARDING épico entregado. Mientras esperamos review Mariana + testing device viernes, Fable ejecuta hardening técnico autocontenido que NO depende de decisiones humanas.

---

## 🎯 Filosofía

**NO tocar copy** (esperando review Mariana mañana).
**NO tocar features grandes** (todo se ve bien).
**SÍ ejecutar tech debt + polish invisible** que hace que testers no vean bugs raros ni experimente resource warnings.

Este sprint es "quirúrgico y silencioso" — cuando termine, la app se sentirá igual pero será más robusta.

---

## 🔨 Deliverables (6 tasks)

### T1 — pg_cron auto-cleanup tablas internas (60-90 min)

**Root cause del warning "exhausting resources" (identificado por Cowork 2026-07-10):**
- `net._http_response` — logs de HTTP outbound (edge functions, webhooks) crecen sin límite
- `cron.job_run_details` — historial pg_cron (cada minuto agenda-notifs) — llegó a 6,295 rows / 4 MB

Cowork limpió manual hoy (6,295 → 1,732 rows), pero **necesitamos un pg_cron automático** que lo haga cada semana para evitar que reaparezca.

**Migración 169:**
```sql
-- 169_supabase_internal_cleanup_cron.sql
-- Cron auto-cleanup de tablas internas Supabase que acumulan sin límite.
-- Root cause del "exhausting resources" warning (2026-07-10 Cowork identificó).
--
-- Frecuencia: semanal (domingo 3am CDMX = 9am UTC)
-- Retención: últimos 7 días para debugging

SELECT cron.schedule(
  'cleanup_supabase_internal_weekly',
  '0 9 * * 0',  -- domingo 9am UTC
  $$
    DELETE FROM net._http_response WHERE created <= NOW() - INTERVAL '7 days';
    DELETE FROM cron.job_run_details WHERE end_time <= NOW() - INTERVAL '7 days';
  $$
);
```

Aplicar via MCP `execute_sql` + INSERT en `supabase_migrations.schema_migrations` (patrón anti-hueco).

**Deliverable:** migración aplicada + verificar que el job aparece en `cron.job` con `SELECT * FROM cron.job WHERE jobname = 'cleanup_supabase_internal_weekly';`

### T2 — Fix food-scan no emite day_changed (15-30 min)

**Bug preexistente flagueado por Fable en delivery de NUTRICIÓN:**
> "Flag preexistente sin tocar: food-scan no emite day_changed al guardar (menor, el hub refresca por focus)."

Ahora sí lo arreglamos. En `app/food-scan.tsx` (o el service que guarda), después de INSERT en `food_logs`:

```typescript
DeviceEventEmitter.emit('day_changed');
```

Coherente con regla #6 CLAUDE.md.

**Verificar** que food-text y food-register YA emiten el evento — si no, agregar ahí también.

### T3 — HOY Header campana notificaciones badge contador real (60-90 min)

**Task #3 pending desde el inicio del proyecto:**
> "HOY Header: campana notificaciones con badge contador real"

Estado actual: campana existe pero el badge no muestra contador real de notifs.

**Deliverable:**
- Query a `user_notifications` where `user_id = current + read_at IS NULL`
- Count → badge visible si > 0
- Tap campana → abre inbox de notificaciones
- Al abrir inbox: marcar como `read_at = NOW()` → badge desaparece
- Update en tiempo real (useEffect + DeviceEventEmitter listener)

Componente probablemente ya existe parcialmente en HOY. Buscar `notifications-service` + `NotificationsBell.tsx` o similar.

### T4 — Empty states polish cross-app (60-90 min)

Cuando un tester no tiene datos aún en un pilar, ¿qué ve? Los empty states son la primera impresión de un módulo.

**Fable audita 5 empty states más visibles:**
1. HOY sin data (primer día usuario) → ¿guía o solo card vacía?
2. Nutrición sin comidas registradas → ¿empty state motivador?
3. Journal sin entries → ¿prompt inicial?
4. Recetas sin favoritos → ¿empty state que invita a explorar?
5. Suplementos sin biblioteca personal → ¿empty state que sugiere catálogo?

Para cada uno donde el empty state esté pobre:
- Icono editorial B/N o pequeño ilustrativo
- Copy motivador (1-2 líneas máx)
- CTA claro para acción principal
- Editorial ATP tone (no cheesy)

**Ejemplo (Recetas empty):**
```
[Icono libro de recetas B/N]

"Aún no tienes recetas favoritas."

"Explora el catálogo ATP o crea la tuya."

[Botón: "Explorar catálogo"]
```

**Fable escoge cuáles pulir según lo que encuentre.** Si algunos ya están bien, saltarlos.

### T5 — Analytics PostHog audit — eventos críticos (60 min)

Verificar que estos eventos disparan correctamente en PostHog:

**Eventos críticos pre-beta:**
- `user_signed_up`
- `onboarding_completed`
- `meet_argos_viewed`
- `argos_message_sent`
- `argos_message_received`
- `food_logged`
- `workout_started`
- `workout_completed`
- `journal_entry_created`
- `checkin_completed`
- `subscription_started`
- `boost_activated`
- `braverman_premium_purchased`

**Deliverable:**
- Buscar cada uno en el código
- Verificar que se llame en el momento correcto
- Si falta alguno crítico, agregarlo con estructura `posthog.capture(event_name, properties)`
- No agregar analytics excesivas (respeto privacy)

### T6 — Sentry verification (30 min)

Verificar que Sentry captura errores:
- Test error manual en un componente dev-only
- Confirmar que llega al dashboard de Sentry (proyecto atp-mobile en atp-v5 org)
- Verificar que source maps están funcionando (líneas correctas)
- Ver stack trace legible

**Deliverable:**
- Confirmación en el buzón de que Sentry recibe errores correctamente
- Si algo raro, flagear para post-beta

---

## 🧪 Tests

- Migración 169: verificar job creado
- food-scan day_changed: unit test del emit
- HOY badge: componentes puros testeados
- PostHog: sin tests (side effect)

Baseline 1138. Target: mantener + agregar donde tenga sentido.

---

## ⚠️ Reglas técnicas

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **NO tocar copy** (esperando Mariana)
3. **NO tocar features grandes** (Meet ARGOS, avatar, streaming, etc.)
4. **NO tocar edge functions** salvo argos-proxy si es CRÍTICO (no lo debería ser)
5. **Migración 169 idempotente** — `IF NOT EXISTS` en el cron.schedule
6. **Aplicar migración TÚ MISMO** via MCP + INSERT schema_migrations (anti-hueco)
7. **npx tsc --noEmit → 0 errores** antes de push
8. **6 commits granulares** — uno por task

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Copy de cualquier tipo (Mariana review pending)
- ❌ Features nuevas
- ❌ Refactoring grande
- ❌ Cambios nativos (romperían OTA)
- ❌ argos-proxy (v16 estable)
- ❌ Rediseñar módulos completos

---

## 📦 Deliverable final

Branch: `feat/hardening-pre-beta`

Al terminar, dime:
- Migración 169 aplicada + cron job activo
- food-scan emite day_changed ahora
- HOY badge contador real live
- N empty states polish (cuáles)
- Analytics eventos verificados / faltantes
- Sentry verified

Después Enrique merge este branch + los siguientes (ONBOARDING épico + POLISH FINAL) juntos sábado AM.

---

## 🤝 Contexto colaborativo

- Sprint ONBOARDING épico ya pusheado en `feat/onboarding-epico-pre-beta` (pending merge después de review Mariana viernes)
- Este sprint es **paralelo** — no depende de merge previo
- Enrique haciendo review Mariana mañana + testing device
- Cowork idle post-review

## 💛 Nota

Fable, este es tech debt honesto. La app se sentirá igual pero los bumps invisibles que un tester expertos catch (warning en Supabase, badges de notif que no funcionan, empty states pobres) se resuelven aquí.

Sprint corto + preciso. Vamos.

— Cowork
