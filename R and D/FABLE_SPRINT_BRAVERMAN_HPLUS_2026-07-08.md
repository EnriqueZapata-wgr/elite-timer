# 🎸 FABLE SPRINT — Braverman PREMIUM: gate H+ (no tier)

**Fecha:** 2026-07-08
**Estimado:** 1-2h · sprint chico, aditivo
**Owner:** Fable (CCF5)
**Contexto:** Enrique en submit stores en paralelo. NO bloquear su flujo.

---

## 🎯 Objetivo

**Corrección al Marathon V1.4 F5.** Fable implementó Braverman PREMIUM con gate por tier Pro/Boost. Enrique aclaró la doctrina real:

> **Todas las features "caras" de LLM en ATP se cobran con H+, NO se gate por tier.**
> Modelo Netflix vs pay-per-view. ATP Pro = flat rate all-you-can-eat + ARGOS Boost/Pro.
> Base = pay-per-use con H+ + gain H+ por hábitos.

Braverman PREMIUM es la **primera implementación de este patrón** y sirve como **ancla de calibración** para futuros reportes premium (#96 Recipes advanced, #97 Routines exigente, y futuras: GENÉTICA, PhenoAge deep dive, etc.).

**Precio confirmado por Enrique: 1,000 H+ ($10 MXN, margen 10× sobre $1 costo LLM real).**

---

## 📖 Estado actual (a corregir)

**Archivo:** `src/services/braverman-premium-service.ts` + `app/braverman-premium.tsx`

- Actualmente gate por `effectiveTier` (Pro/Boost) en pantalla
- No hay cobro de H+
- Cache por `braverman_result_id` está bien (mantener)

---

## 🔨 Deliverables (3 tasks discretos)

### T1 — Migración 162: registrar precio Braverman PREMIUM (15 min)

Archivo: `supabase/migrations/162_braverman_premium_action_cost.sql`

Schema real de `proton_action_costs` (verificado por Cowork):
```
action_key    text NOT NULL PK
cost_h_plus   integer NOT NULL
description   text
enabled       boolean NOT NULL
updated_at    timestamptz NOT NULL
```

Contenido:
```sql
-- 162_braverman_premium_action_cost.sql — Precio Braverman PREMIUM (#90, #143)
-- Rango Fable 158-199.
--
-- Doctrina H+ (confirmada Enrique 2026-07-08): features LLM caras se cobran
-- con H+ (no gate por tier). Braverman PREMIUM = 1,000 H+ (ANCLA de calibración
-- para futuros reportes premium). Costo real LLM ~$1 MXN, margen ~10×.
--
-- Idempotente (ON CONFLICT DO NOTHING para preservar overrides manuales).

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled, updated_at)
VALUES (
  'braverman_premium_report',
  1000,
  'Reporte PREMIUM Braverman con análisis ARGOS de proporciones y dominancias neurotransmisoras',
  true,
  NOW()
)
ON CONFLICT (action_key) DO NOTHING;
```

**IMPORTANTE:** Aplicar al remoto tú mismo via MCP `apply_migration` o `execute_sql`. NO dejar pending — Enrique ya no tiene que correr push manual.

### T2 — Backend `braverman-premium-service.ts` (45 min)

**Cambios quirúrgicos** (str_replace, no reescribir el archivo):

1. **Quitar dependencia de tier detection** — el archivo NO debe importar `effectiveTier` ni consultarlo.

2. **Antes de callAnthropic:** consultar cache (ya existe, mantener). Si hay cache → return sin cobrar.

3. **Si NO hay cache:** llamar RPC `spend_protons` con:
   ```typescript
   const { data, error } = await supabase.rpc('spend_protons', {
     p_user_id: userId,
     p_action_key: 'braverman_premium_report',
     p_idempotency_key: `braverman-premium-${result.id}`,  // 1 cobro máx por result
   });
   ```

4. **Handling:**
   - `spend_protons` retorna jsonb con `{ success: bool, error?: string, protons_spent?: number }`
   - Si `success = false` con `error = 'insufficient_h_plus'` → return `{ status: 'insufficient_h_plus', required: 1000, balance: <query balance actual> }`
   - Si `success = false` con otro error → return `{ status: 'error', message: error }`
   - Si `success = true` → proceder con callAnthropic

5. **Actualizar tipo `PremiumReportResult`:**
   ```typescript
   export type PremiumReportResult =
     | { status: 'ok'; markdown: string; cached: boolean }
     | { status: 'no_test' }
     | { status: 'insufficient_h_plus'; required: number; balance: number }
     | { status: 'error'; message?: string };
   ```

6. **Idempotency clave:** el `p_idempotency_key = 'braverman-premium-${result.id}'` garantiza que si el user hace click "Generar" 2× por race condition, solo se cobra 1×. Combinado con el cache actual, previene doble cobro robustamente.

### T3 — Frontend `app/braverman-premium.tsx` (45 min)

**Reemplazar gate por tier con confirm dialog H+.**

Flujo UX:
1. Al abrir pantalla → cargar cost (query a `proton_action_costs`) + balance (query a `proton_balance`)
2. Si ya hay reporte cacheado → mostrarlo directo (NO cobra, NO pregunta)
3. Si NO hay reporte cacheado → mostrar card previa con:
   ```
   ┌─────────────────────────────────────┐
   │  REPORTE PREMIUM · BRAVERMAN        │
   │                                     │
   │  Análisis ARGOS de tu naturaleza    │
   │  neurotransmisora con proporciones  │
   │  específicas y protocolos activos.  │
   │                                     │
   │  💰 Cuesta 1,000 H+                  │
   │  🪙 Tu balance: XXX H+               │
   │                                     │
   │  [ GENERAR REPORTE (1,000 H+) ]     │
   │                                     │
   │  ⚠️ Si saldo insuficiente:          │
   │  [ Comprar H+ → shop ]               │
   └─────────────────────────────────────┘
   ```
4. Click "Generar" → llamar service → si `insufficient_h_plus` → mostrar Alert con link al shop `/economy/shop`
5. Si genera OK → mostrar reporte + `DeviceEventEmitter.emit('balance_changed')` para refresh del EconomyHeaderPill

**Copy respetuoso:**
- No usar "Pagar" (feels transaccional). Usar "Generar" o "Desbloquear".
- Precio siempre visible antes del tap para consentimiento explícito.
- Después de generado: badge "✓ Ya lo tienes — puedes releer cuando quieras" (comunica cache permanente).

### Tests (~+8 tests mínimo)

En `src/services/__tests__/braverman-premium-service.test.ts` (nuevo o extender existente):
- Cache hit → no cobra + retorna cached: true
- Insufficient balance → retorna status insufficient_h_plus con required + balance
- Cobro exitoso → llama spend_protons + callAnthropic + insert cache
- Idempotency key: doble llamada por race → spend_protons falla 2ª con idempotency_conflict → cache eventualmente rescata
- Error de spend genérico → retorna status error

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **Migración 162 idempotente** — `INSERT ... ON CONFLICT DO NOTHING`
2. **NO reescribir archivos completos** — str_replace quirúrgico
3. **NO usar crypto.randomUUID** — si necesitas UUID, usar `generateUUID` helper (regla #2)
4. **npx tsc --noEmit → 0 errores** antes de push
5. **Aplicar migración 162 al remoto tú mismo** via MCP apply_migration
6. **1 commit por task** — 3 commits limpios (T1, T2, T3) + 1 opcional de tests si los quieres separar
7. **DeviceEventEmitter.emit('balance_changed')** después de cobro exitoso (regla #5-6 CLAUDE.md aplicada)

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Aplicar patrón a #96 Recipes advanced (siguiente sprint)
- ❌ Aplicar patrón a #97 Routines exigente (siguiente sprint)
- ❌ Fix del bug #142 (tasa E-→H+ desincronizada) — evitar mostrar tasa en copy, ya lo haces
- ❌ Rediseño visual del shop (#101 ya cerrado)
- ❌ Nuevo package de H+ (los 3 existentes son suficientes)

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_BRAVERMAN_HPLUS_DELIVERY_2026-07-08.md`:

Tabla estándar Fable:
```
#: T1
Feature: Migración 162 action_cost
Estado: ✅ Completa
Clave: <resumen 2 líneas>
Tests: N/A
```

Al final:
- Branch name (sugerido `feat/braverman-hplus-gate`)
- Migración 162 aplicada al remoto (confirmar)
- Bug preexistente detectado (si alguno)
- Doctrina replicable documentada para #96 y #97

---

## 🤝 Contexto colaborativo

- **Marathon V1.4 + Sprint #50 mergeados a main** (11aef1c).
- **OTA corriendo ahora mismo** — no hacer OTA hasta que Enrique termine testing.
- **Enrique en submit stores** — no interrumpir para preguntas no bloqueantes.
- Si detectas bugs preexistentes que NO son parte del scope, flaguéalos en el buzón de vuelta pero NO los fixees a menos que sean críticos.

Vamos por el modelo económico correcto desde v1.0.

— Cowork (Opus 4.7)
