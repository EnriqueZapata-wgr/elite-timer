# 🌙 Delivery Sprint Noche · A.1 + B.1 + B.2 + B.3 + B.4 + C.1-core

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

## ✅ B.3 · Persistencia DX transaccional (rama `feat/dx-transaccional`, mig 195)

Commit `33fa51a`. RPC `create_dx_version()`:
- `SECURITY INVOKER` → la RLS de la 170 aplica intacta; `user_id` sale de `auth.uid()`, no de parámetro (verificado: el único caller de `generateDX` pasa el `user.id` logueado — equivalente).
- `pg_advisory_xact_lock` por usuario serializa el doble-tap desde 2 devices: UPDATE `is_current` + `MAX(version)+1` + INSERT ahora son atómicos. Ya no choca contra `idx_functional_dx_current` tras haber pagado el LLM.
- `dx-engine.ts` usa el RPC; `getMaxVersion` sigue vivo (regalo 1er DX). `REVOKE` de anon/public + `GRANT` a authenticated.

## ✅ B.4 · ARGOS intervention_rationale (rama `feat/argos-intervention-rationale`, mig 196)

Commit `371941e`. **Hallazgo:** el backend ya estaba casi listo — el seed de 280 H+ existe desde la mig **175** y el proxy cobra cualquier requestType sin whitelist. Lo entregado:

1. **Core puro** (`intervention-rationale-core.ts`, 9 tests): prompt con doctrina blindada en el system (no fármacos, no diagnóstico médico, match cerrado — ARGOS solo narra, nunca decide —, falta de data ≠ ausencia, 200-400 palabras markdown español) + `set_hash` FNV-1a de (dx.id vigente + keys activas ordenadas).
2. **Servicio IO** patrón braverman-premium, con una diferencia deliberada: cobro **100% server-side** (como dx-engine, sin `spendProtons` cliente) para que el Pro nunca pague cliente-side. idempotencyKey estable por set_hash; 402 → `insufficient_h_plus`.
3. **Mig 196:** tabla `intervention_rationales` (RLS own-row select+insert, `UNIQUE (user_id, set_hash)`, patrón 160). Releer gratis; cambia el set o el DX → hash nuevo → regenera.
4. **⚠️ Proxy modificado** (`argos-proxy/index.ts`, +6 líneas en el bloque de cobro): `intervention_rationale` + tier Pro efectivo (incluye boost, lo resuelve `detectEffectiveTier` server-side) → costo 0. **Spec del buzón B.4** ("Pro gratis all-you-can-eat") — nota: la mig 189 lo dejaba como "decisión abierta"; el buzón lo cierra para ESTA acción, las demás siguen cobrando a todos. **Requiere deploy del proxy tras el merge.**
5. **UI:** pantalla `/salud/intervenciones/rationale` (card previa con precio+balance o "Incluido en tu plan Pro", loading con frases, markdown, estados no_dx / no_protocol, disclaimer educativo) + botón "¿Por qué estas intervenciones?" en la pantalla Mi Protocolo + CTA en la Card B (`MyProtocolCard`). Evento PostHog `intervention_rationale_purchased` (solo cobros reales).

## ✅ C.1 · N-Back core + migración (rama `feat/nback-core`, mig 197)

Commit `7070714`. Solo el arranque sancionado ("core+migraciones sin bloquear"):
- **`nback-core.ts`** puro (24 tests): `evaluateBlock` regla Brain Workshop (≥80% ambos canales sube · <50% cualquiera baja · piso `N_MIN` · umbrales exactos inclusivo/mantiene), `generateStimuli` con rng inyectable — matches EXACTOS por canal, cero accidentales (verificado por escaneo en tests; la UI puntúa sin ambigüedad), `nextStreak`, `stimuliCountFor` (20+N).
- **Defaults del buzón** viven en `NBACK_CONFIG` (única fuente a tocar si Enrique cambia respuestas): **N mín 2 · timeout 3s · auriculares sí · daltónico sí · free ilimitado**. Un test fija las 5 decisiones.
- **Mig 197:** `nback_sessions` (append-only por bloque) + `nback_user_state`. RLS dueño-only **sin lectura coach ni cross-user** (privacidad cognitiva, explícito en spec). Leaderboard futuro de Comunidad iría por columna opt-in aparte.
- **Pendiente sprint grande (8-10):** servicio IO, audio de las 8 letras, 4 pantallas, electrón `nback_session` (peso 2.5), integración cronotipo+push.

## 🔍 Verificación

- `npx tsc --noEmit` → 0 errores (las 5 ramas)
- `npx vitest run` → **163 archivos / 1565 tests verdes** (incluye anti-leak comunidad + 9 de rationale + 24 de nback)
- DB remota solo consultada en LECTURA (information_schema + counts). **Cero SQL aplicado** — migs 194/195/196/197 esperan audit Cowork + merge + `npx supabase db push` de Enrique.

## 📋 Para Cowork (audit) — 4 ramas, todas desde `fix/hotfix-2da-pasada`

1. `fix/routing-hoy-completo` (A.1+B.1, solo TS/TSX, sin SQL) — validar decisión ayuno→`/fasting`.
2. `feat/consolidar-supplement-scan` (B.2, mig 194 + 2 servicios) — foco: policy coach nueva en `user_supplements`, mapeo frequency→dose_pattern, DROP diferido.
3. `feat/dx-transaccional` (B.3, mig 195 + dx-engine) — foco: advisory lock + SECURITY INVOKER.
4. `feat/argos-intervention-rationale` (B.4, mig 196 + proxy + UI) — foco: Pro-gratis en el proxy (¿OK cerrar la "decisión abierta" de la 189 solo para esta acción?) + doctrina del prompt + **recordar deploy del proxy tras merge**.
5. `feat/nback-core` (C.1, mig 197 + core puro) — foco: validar los 5 defaults de `NBACK_CONFIG` + RLS sin coach.

Todas incluyen el commit local de assets `b246c52` que estaba sin pushear. El edit local sin commitear de `interventions-catalog.ts` (86 intervenciones + roots de separadores) quedó intacto en el working tree — es de Enrique/Cowork, no lo commiteé.

## ➡️ Siguiente

Del buzón quedan gated: **B.5** (hub Comunidad — Enrique lo puso en "cuando lleguen insumos"), **C.2** (swap imageBn — espera PNGs MJ de Enrique), **B.6** (pg_cron — espera decisión de encendido post-scale), **C.1 sprint grande** (servicio + audio + 4 pantallas + electrón, tras validar defaults) y todo el Bloque C/D con insumos humanos. Ninguna acción pendiente mía hasta que Enrique despierte, audite Cowork y lleguen insumos.

— Fable 🦊
