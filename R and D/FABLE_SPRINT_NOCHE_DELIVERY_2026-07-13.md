# 🌙 Delivery Sprint Noche · A.1 + B.1 + B.2

**De:** Fable (CCF5)
**Para:** Enrique + Cowork
**Fecha:** 2026-07-13/14 madrugada
**Contexto:** Megabuzón post-hotfix 2da pasada, sprint "HOY noche". Enrique dormido, eas build corriendo.

---

## ✅ A.1 · Routing HOY completo → hubs (rama `fix/routing-hoy-completo`)

Commit `ac0eaae`. Aplicado en los 3 archivos indicados:

| Card / electrón | Antes | Ahora |
|---|---|---|
| agua (card + spec) | `/hydration` | `/nutrition` |
| suplementos (`ELECTRON_ROUTES`) | `/my-health` | `/supplements` |
| pasos (card + spec nuevo route) | `/settings` (spec sin route) | `/fitness-hub` |
| sueño (card + spec) | `/reports` | `/health-hub` |
| **ayuno** | `/fasting` | **`/fasting` (sin cambio)** |

**Decisión ayuno — validar en audit:** el buzón decía "`/nutrition` (o pilar ayuno si existe pantalla dedicada)". `/fasting` ES la pantalla dedicada (rediseño estilo ZERO: IDLE/ACTIVE/HISTORY) y la card tiene CTA "Iniciar/Romper ayuno" que quedaría rota apuntando al hub de nutrición. Tomé la opción del paréntesis. Si Enrique quiere consistencia dura → 1 línea en `HoyEditorialSection.tsx:489`.

**Sin tocar (fuera del scope enumerado):** sunlight/cold_shower/grounding/red_glasses siguen en `/my-health` dentro de `ELECTRON_ROUTES`. Si "TODOS al hub" aplica también a esos (¿`/health-hub`?), es micro-fix de 1 línea — peloteo.

Los quick-actions de agua (+250/+500/−250 ml) siguen inline en la card; solo cambió el tap principal.

## ✅ B.1 · expo-sharing lazy (misma rama, commit `01d9415`)

`app/edad-atp/result-preview.tsx`: import top-level eliminado, `require('expo-sharing')` dentro del try/catch existente de `handleShare()`. Mismo patrón que `labs-guide-service` / `dx-pdf-service`.

## ✅ B.2 · Consolidación suplementos (rama `feat/consolidar-supplement-scan`, mig 194)

Commit `cbcf2a6`. **⚠️ Corrección de premisa importante:**

> **No existe ninguna tabla `supplement_scan`** — ni en `supabase/migrations/` ni en la DB remota (verificado vía MCP, solo lectura). `supplement_scan` es un ActionKey de economía (086) + requestType de ARGOS; el resultado del scan BHA ya persiste en `user_supplements.bha_status/bha_scan_summary` (mig 187). **La tabla legacy "parecida" real es `supplement_protocols`** (mig 007, era coach: name/dose/frequency/brand/reason). Estado remoto: `supplement_protocols` = **0 filas**, `user_supplements` = 55 filas, `supplement_logs` = 565.

Asumí que la decisión #39 apuntaba a esa tabla. Lo entregado:

1. **Mig 194** (idempotente, NO aplicada al remoto):
   - Policy coach en `user_supplements` (espejo exacto de la que tenía la legacy en 007, requiere `coach_clients.status='active'`). Sin ella, el panel coach leería `[]` por RLS. Cero superficie pública nueva — doctrina intacta.
   - Backfill `INSERT SELECT` con `INNER JOIN auth.users` (anti-huérfanos, patrón mig 177 — la legacy referencia `profiles`, la nueva `auth.users`) + dedup case-insensitive por (user_id, name). Mapeo: dose→dosage (fallback `'—'`), frequency→dose_pattern (texto libre = adherencia lo trata como diario, igual que NULL), source=`'coach_legacy'`.
   - `create_consultation_snapshot()` (RPC vivo en `consultation-service.ts`) ahora snapshotea desde `user_supplements` **con las mismas keys JSON** — consumidores del snapshot intactos. De paso: `SET search_path = public` (hardening).
2. **Código a fuente única:** `client-profile-service.ts` (get/add/toggle → `user_supplements`, con alias `dose`/`frequency` en la capa de servicio para NO tocar las 4k líneas de `ClientDetailScreen`) y `atp-ai-service.ts` (contexto coach).

**❌ DROP de `supplement_protocols` NO incluido — gated a peloteo:** `handle_new_user()` (trigger de signup, mig 024) hace `UPDATE supplement_protocols` en cada registro. Dropearla sin reescribir ese trigger **rompería el signup en semana de beta**. Propuesta: migración futura (195+) que recree el trigger sin la referencia + DROP, después de validar en beta. También la referencian el trigger de invites (008) — misma limpieza.

## 🔍 Verificación

- `npx tsc --noEmit` → 0 errores (ambas ramas)
- `npx vitest run` → **161 archivos / 1534 tests verdes** (incluye anti-leak comunidad)
- DB remota solo consultada en LECTURA (information_schema + counts). **Cero SQL aplicado** — mig 194 espera audit Cowork + merge + `npx supabase db push` de Enrique.

## 📋 Para Cowork (audit)

- `fix/routing-hoy-completo` (2 commits, solo TS/TSX, sin SQL) — validar decisión ayuno→`/fasting`.
- `feat/consolidar-supplement-scan` (1 commit, mig 194 + 2 servicios) — foco: policy coach nueva en `user_supplements`, mapeo frequency→dose_pattern, y confirmar que el DROP diferido les cuadra.
- Ambas ramas salen de `fix/hotfix-2da-pasada` (aún no mergeada a main cuando arranqué — incluyen el commit local de assets `b246c52` que estaba sin pushear).

## ➡️ Siguiente (mañana, según buzón)

B.3 RPC `create_dx_version()` transaccional (mig 195) → B.4 ARGOS `intervention_rationale`. C.1 N-Back con defaults si Enrique no responde las 5 preguntas.

— Fable 🦊
