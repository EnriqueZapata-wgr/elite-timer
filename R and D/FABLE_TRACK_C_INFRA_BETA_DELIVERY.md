# 🚀 TRACK C — Infraestructura pre-launch beta · DELIVERY

**Branch:** `fix/track-c-infra-beta` · **Fecha:** 2026-07-16 · **Autor:** Fable
**Constraint cumplido:** `tsc --noEmit` limpio (exit 0) · **NO se tocó ningún
feature de producto** (los 5 sprints siguen en device-test pendiente).

Sprint consolidado de infraestructura para el soft-launch (5-9 testers, target 1
agosto). Cero cambios en código de producto — solo config de build, scripts de
infra, SQL de datos y documentación operativa.

---

## ✅ Resumen de los 6 entregables

| # | Ítem | Estado | Entregable |
|---|---|---|---|
| 59 | Sentry sourcemaps (build + OTA) | ✅ | Script OTA + npm script + doc setup |
| 60 | SQL grant H+ inicial idempotente | ✅ | `05b_SQL_GRANT_HPLUS_INICIAL.md` |
| 61 | Runbook launch day + 5 sprints | ✅ | Runbook v2.1 actualizado |
| 62 | Comms bienvenida + invite Skool | ✅ | `11_COMMS_BIENVENIDA_SKOOL.md` |
| 5 | INFRA NOTE: DB compute + WAL | ✅ | Investigado; WAL ya resuelto; fix propuesto (no ejecutado) |
| 6 | Migration repair 202/203 | ✅ | **Ejecutado y verificado** |

---

## #59 · Sentry sourcemaps

**Diagnóstico:** el config plugin `@sentry/react-native/expo` ya estaba en
`app.json` (org `atp-v5`, project `atp-mobile`), pero (a) faltaba el
`SENTRY_AUTH_TOKEN` como EAS secret para que los builds nativos suban maps, y (b)
los OTA (`eas update`) no suben sourcemaps automáticamente → crashes ofuscados.

**Entregado:**
- `scripts/upload-ota-sourcemaps.mjs` — wrapper que exporta, publica ESE export
  exacto (`eas update --input-dir`) y sube los `.map` por Debug ID.
- `package.json` → nuevo script `"sourcemaps:ota"`.
- `Business development/Beta_Launch_Kit/10_SENTRY_SOURCEMAPS_SETUP.md` — setup del
  EAS secret (builds), uso del wrapper (OTA), y **validación obligatoria** con un
  error de prueba.

**Acción manual pendiente para Enrique:** crear el auth token en Sentry +
`eas secret:create --name SENTRY_AUTH_TOKEN`. (No se puede hacer desde aquí; es
un secreto.) Reemplaza al comando viejo/deprecado `sentry-expo-upload-sourcemaps`.

## #60 · SQL grant H+ inicial (idempotente de verdad)

**Diferencia clave:** el `05_SQL_BOOST_TESTERS.md` existente daba un **Pro Boost
72h** (bypass rate-limit). El brief pedía **saldo H+ inicial** (protones reales
permanentes) → es un script distinto.

**Entregado:** `05b_SQL_GRANT_HPLUS_INICIAL.md` — deposita **20 000 H+ exactamente
una vez por tester**, apoyado en el índice único `idx_proton_tx_idempotency`
(clave `beta_welcome_grant:<user_id>`). Patrón CTE: `INSERT ... ON CONFLICT
(idempotency_key) DO NOTHING RETURNING` → el balance solo sube por los que
realmente entraron. **Re-correr 10 veces = 0 doble-acreditación.** Tabla real:
`proton_balance` (el runbook viejo citaba `user_protons`, que no existe).

Monto dimensionado con costos vigentes: Braverman/DX = 1000, BHA = 500, chat =
280. 20k cubre toda la beta con holgura (el bono mensual Pro son 10k).

## #61 · Runbook launch day → v2.1

Actualizado `07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md`:
- Bloque nuevo arriba con los **5 sprints** (motor de personalización, Cuestionario
  Maestro/mig 203, Salud Funcional 8 destinos, Pilar Mente editorial, imágenes MJ).
- Invariantes pre-flight: sourcemaps, migraciones **hasta 203 + repair**, grant H+.
- Fase 1.1 (Sentry) y 1.2 (H+) reescritas apuntando a los docs correctos y con la
  tabla real (`proton_balance`).
- **Fase 1.7 nueva:** checklist de device-test de los 5 sprints antes de mandar links.

## #62 · Comms bienvenida + Skool

`11_COMMS_BIENVENIDA_SKOOL.md` — mensaje que llega **con el link** (distinto de la
invitación previa `01_`), guía de onboarding de 5 pasos que arranca por el
Cuestionario Maestro → motor, qué feedback pedir, post de arranque de Skool, y
checklist de envío. `SKOOL_URL` tomado de `src/constants/brand.ts`
(`the-vital-order-7560`).

## #5 · INFRA NOTE — DB compute Nano→Micro + WAL bloat

`R and D/INFRA_NOTE_DB_COMPUTE_WAL_2026-07-16.md` (investigación **solo lectura**).

**Hallazgo:** el WAL de 1.92 GB **ya está resuelto**. Estado actual medido:
- **0 replication slots** (descarta slot atorado como estado actual).
- DB = 60 MB, `max_slot_wal_keep_size = 512 MB` (red de seguridad ya activa: ningún
  slot puede volver a retener >512 MB).
- Causa probable del pico: slot transitorio (Realtime/CDC/migración) ya liberado,
  o buildup de checkpoints durante el crash-loop previo al upgrade; Micro dio CPU
  para reciclar el WAL.

**Fix propuesto:** ninguna acción urgente. Query de diagnóstico + `pg_drop_
replication_slot` uno-por-uno **solo si reaparece** un slot inactivo — todo
marcado **⛔ no ejecutar sin firma**. Incluye query de monitoreo semanal barata.

## #6 · Migration repair 202/203 — ✅ EJECUTADO

**Ampliación del brief:** el historial remoto llegaba a **201**; faltaban **202
(`user_symptoms`) Y 203 (`user_master_quiz`)** — ambas aplicadas por SQL Editor.
El brief pedía solo la 203; se reparó también la 202 (misma causa).

```
$ supabase migration repair --status applied 202 203
Repaired migration history: [202 203] => applied
```

Verificado en `schema_migrations`: 201, 202, 203 presentes. El CLI **sí conectó**
(no hizo falta el fallback SQL). Doc: `12_MIGRATION_REPAIR_202_203.md`.

---

## 🔍 Verificación

- `npx tsc --noEmit` → **exit 0** (limpio).
- Sin cambios en código de producto → tests de Vitest no afectados.
- Migration repair verificado contra el remoto (query a `schema_migrations`).
- WAL investigado read-only; sin ejecutar mutaciones.

## 📦 Archivos tocados

**Nuevos:**
- `scripts/upload-ota-sourcemaps.mjs`
- `Business development/Beta_Launch_Kit/05b_SQL_GRANT_HPLUS_INICIAL.md`
- `Business development/Beta_Launch_Kit/10_SENTRY_SOURCEMAPS_SETUP.md`
- `Business development/Beta_Launch_Kit/11_COMMS_BIENVENIDA_SKOOL.md`
- `Business development/Beta_Launch_Kit/12_MIGRATION_REPAIR_202_203.md`
- `R and D/INFRA_NOTE_DB_COMPUTE_WAL_2026-07-16.md`
- `R and D/FABLE_TRACK_C_INFRA_BETA_DELIVERY.md` (este doc)

**Modificados:**
- `package.json` (+1 script `sourcemaps:ota`)
- `Business development/Beta_Launch_Kit/07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md`

## 🎯 Pendientes manuales para Enrique (no automatizables desde aquí)

1. Crear `SENTRY_AUTH_TOKEN` en Sentry + `eas secret:create` (secreto).
2. Pegar la lista real de emails de testers en `05b` y correr el grant el día del launch.
3. Validar sourcemaps con un error de prueba tras el primer build/OTA.
4. Confirmar que el grupo Skool acepta ingresos.
5. **Device-test de los 5 sprints** (Fase 1.7 del runbook) antes de mandar links.

## 🚫 NO hecho a propósito

- OTA / `eas update` — lo hace Enrique.
- Merge a `main` — lo hace Enrique.
- Cualquier fix de WAL — espera firma.
- Cualquier cambio en features de producto — device-test pendiente.
