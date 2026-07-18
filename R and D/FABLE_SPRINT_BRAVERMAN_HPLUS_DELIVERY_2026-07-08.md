# 🎸 FABLE DELIVERY — Braverman PREMIUM: gate H+ (no tier)

**Fecha:** 2026-07-08
**Owner:** Fable (CCF5)
**Branch:** `feat/braverman-hplus-gate` (pusheada, 3 commits — uno por task)
**Migración 162:** ✅ **APLICADA al remoto** y verificada (`cost_h_plus: 1000, enabled: true`)
**Suite:** `npx tsc --noEmit` = 0 errores · `vitest run` = **855/855** (baseline 845 + **10 nuevos**, spec pedía ~8)

---

## Tabla estándar

```
#: T1
Feature: Migración 162 action_cost
Estado: ✅ Completa
Clave: INSERT idempotente (ON CONFLICT DO NOTHING) de
       braverman_premium_report = 1,000 H+. Aplicada al remoto vía MCP
       execute_sql (no apply_migration — bug 42P10 conocido) y verificada
       con SELECT. Fallback 1000 también agregado a FALLBACK_ACTION_COSTS.
Tests: N/A

#: T2
Feature: Backend — cobro H+ en el service
Estado: ✅ Completa
Clave: spendProtons ANTES del LLM con idempotency_key
       braverman-premium-{result.id} (doble tap = 1 cobro; LLM falla tras
       cobro → retry GRATIS: spend idempotente + regenera hasta cachear).
       Cache hit gratis. Precio server-side (getActionCost). Nuevos status
       insufficient_h_plus {required, balance} y error {message}.
       Sin tier detection.
Tests: +10

#: T3
Feature: Frontend — card previa + consentimiento
Estado: ✅ Completa
Clave: Quote al entrar (cache hit → muestra directo sin cobrar/preguntar).
       Card previa: precio + balance visibles + botón "Generar reporte
       (1,000 H+)". insufficient → Alert con CTA a /economy/shop.
       balance_changed emitido tras cobro. Badge "✓ Tuyo para siempre —
       releer es gratis". Copy sin "Pagar".
Tests: (cubiertos en los 10 del service)
```

## ⚠️ Desviación del spec (importante para el audit)

El snippet del buzón llamaba `spend_protons` con `p_idempotency_key` y esperaba
`error: 'insufficient_h_plus'` + `protons_spent`. **La firma real** (migración 094,
la que está en remoto) es `(p_user_id, p_amount, p_action_key, p_metadata)` con
idempotencia vía `p_metadata->>'idempotency_key'`, y devuelve
`{success, new_balance, error: 'insufficient_protons'}`. Implementé contra el
contrato real usando el helper existente `spendProtons()` de proton-service
(que ya mapea todo) y traduzco `insufficient_protons` → status
`insufficient_h_plus` en la capa del service, como pedía el tipo del spec.

## Blindaje extra contra doble cobro

La misma `idempotency_key` viaja también en el metadata de `callAnthropic`
(vía `getArgosCallMetadata`). Si argos-proxy algún día cobra server-side por
`requestType: braverman_premium_report`, `spend_protons` reconoce la key y NO
debita dos veces. Cliente y server quedan reconciliados por diseño.

## 📐 Doctrina replicable para #96 y #97 (documentada)

Patrón ancla, listo para copiar:
1. Migración N: INSERT en `proton_action_costs` (action_key + costo) — idempotente.
2. Agregar action_key a `ActionKey` + `FALLBACK_ACTION_COSTS` (economy-config).
3. Service: cache check → `getActionCost` → `spendProtons(userId, cost, key, { idempotency_key: '<feature>-<entity_id>' })` → mapear `insufficient_protons` → LLM → cache. Misma key hacia `getArgosCallMetadata`.
4. UI: quote (precio + balance) ANTES del tap · insufficient → Alert + shop · `balance_changed` tras cobro · badge de cache permanente · copy "Generar/Desbloquear", nunca "Pagar".
5. Tests: cache gratis · insufficient · idempotencia estable · retry gratis post-fallo LLM.

Nota para #96/#97: sus features actuales (toggle avanzado / coach exigente) hoy
son gratis — al cobrarlas, la idempotency key necesita una entidad estable por
generación (las recetas/rutinas no tienen result_id previo; sugerencia:
`generateUUID()` client-side por intento, guardado junto al request).

## Bugs preexistentes detectados

Ninguno nuevo en este sprint. Los ya flaggeados siguen: #142 (tasa E-→H+
desincronizada — el copy de esta pantalla no muestra tasa) y los dos de
dispatch v6 anotados en el delivery del Sprint #50.

## Estado final

- Branch lista para audit/merge. **Sin OTA** (Enrique en testing — regla respetada).
- La migración ya vive en remoto: al mergear, el archivo 162 solo documenta.

— Fable (CCF5)
