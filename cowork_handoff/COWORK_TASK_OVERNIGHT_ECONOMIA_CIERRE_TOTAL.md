# COWORK_TASK — Sprint OVERNIGHT: Economía Protones H+ — CIERRE TOTAL

**Filosofía:** Enrique pidió ruta sólida sin parches. **Sin** cableado parcial. **Sin** placeholders. **Sin** wiring diferido. Todo cerrado. Después de este sprint la economía queda lista para activación con UN solo comando (db push + deploy + flip flag + OTA).

**Origen:** después de los 2 sprints anteriores (`feat/economia-protones-h-plus` + `feat/economia-electrons-server-side`), faltaba: (1) cableado completo de los 8 hookpoints diferidos + N call-sites ARGOS reales, (2) calibración de placeholders (curva rank, subscription_bonus, REFERRAL_REWARD_PROTONS) usando el doc económico, (3) suite E2E con flag simulado, (4) documentación de operación.

**Branch base:** `feat/economia-electrons-server-side` (con feat/economia-protones-h-plus mergeada como ancestro).
**Branch nueva:** `feat/economia-cierre-total` (desde `feat/economia-electrons-server-side`).

**Estimado:** 8-12h CC overnight.
**SQL:** 0-1 migración nueva (093 si necesaria para configurar curva de rank en DB).
**Deploy:** ❌ NO merge, NO OTA. Push final pendiente de aprobación Enrique.

**OVERNIGHT MODE:**
- Si encuentras decisión bloqueante, toma la opción MÁS CONSERVADORA y documenta.
- NO te bloquees.
- NO frankenstein: tokens canónicos, NO refactor fuera de scope, NO tocar motor v2/parser AI/lab worker.

---

# CONTEXTO OBLIGATORIO

**Lee PRIMERO, en este orden:**

1. **`R and D/03_ECONOMIA_PROTONES_H_PLUS.md`** — DOCUMENTO ECONÓMICO OFICIAL. **Fuente de verdad de TODOS los números** (curvas de rank, montos, equivalencias, paquetes). NO inventes. Si un número no está, FLAG y usa la opción más conservadora documentada.

2. **`COWORK_REPORT.md` (raíz)** — secciones de los 2 sprints anteriores. Contiene la lista de placeholders y wiring diferido.

3. **`supabase/migrations/082_*` → `092_*`** — schema actual de la economía.

4. **`supabase/functions/_shared/award-rules.ts`** — HABIT_RULES con requiredEvidence explícito. **Compara con el doc económico** (R and D/03...) para validar pesos. Si difieren, **el doc gana**.

5. **`supabase/functions/_shared/challenge-criteria.ts`** — tipos de criteria soportados.

6. **`supabase/functions/argos-proxy/index.ts`** — proxy con debit+refund gated por env.

7. **`src/services/economy/*`** — helpers cliente (electron-award-client, with-preflight, challenge-progress-writer, rank, etc.).

8. **`src/services/anthropic-client.ts`** — `callAnthropic`. **TODO el cliente ARGOS funnelea por aquí** (descubrimiento de CC en sprint anterior).

---

# FASE A — INVESTIGACIÓN PREVIA (1-2h, autónoma)

Antes de cablear, **mapea TODO** y documenta en `cowork_handoff/INVESTIGACION_HOOKPOINTS.md` (al raíz del cowork_handoff). NO empieces a modificar código hasta terminar esto.

## A.1 Mapear hookpoints de hábitos REALES

Para cada uno de los 10 habit_types definidos en `HABIT_RULES`, busca en el cliente DÓNDE se completa el hábito hoy:

| habit_type | requiredEvidence | Buscar en código |
|---|---|---|
| `sleep_wearable` | wearable | `daily_metrics` write con sleep | `src/services/*sleep*`, `app/edad-atp/*` |
| `steps_wearable` | wearable | `daily_metrics` write con steps | `src/services/*steps*`, `app/edad-atp/*` |
| `cardio_hr_wearable` | wearable | sesión cardio guardada | `src/services/*cardio*`, `src/services/*workout*` |
| `meditation_in_app` | wearable (in-app medido) | mind/meditation session cerrada | `app/mente/*`, `src/services/*meditation*` |
| `food_photo` | evidence | food log con foto confirmado | `src/services/*food*`, `app/nutricion/*` |
| `food_text` | evidence | food log solo texto confirmado | (mismo) |
| `checkin_emotional` | evidence | check-in emocional guardado | ✅ YA CABLEADO en `app/checkin.tsx` |
| `hydration_tap` | self | tap de vaso hidratación | ✅ YA CABLEADO en `src/services/hydration-service.ts` |
| `supplement_check` | self | suplemento marcado como tomado | `src/services/*supplement*` |
| `lab_uploaded` | elite | lab-parser-worker exitoso | `supabase/functions/lab-parser-worker/*` (server-side! o `app/labs/*` cuando se confirma) |
| `test_completed` | elite | TestQuestionScreen cierre con resultado | `src/screens/*Test*`, `app/tests/*` |

**Para cada hookpoint:**
- Path absoluto del archivo + número de línea aproximada
- Función exacta donde se hace la mutación local
- Si hay múltiples paths (ej. food puede entrarse por foto o por texto), documenta cada uno
- Si NO encuentras el hookpoint, FLAG en investigación y mueve a "imposible cablear ahora"

## A.2 Mapear call-sites ARGOS REALES

`callAnthropic` se invoca desde varios lados. Para cada call, identifica:
- Path del archivo + línea
- Tipo de acción (cuál de los 8 action_keys del catálogo: chat, food_estimate_photo, food_estimate_text, supplement_scan, lab_interpretation, routine, insight, weekly_insight)
- Si el call ya está wrappeado con `withPreflight` (chat lo está en `app/argos-chat.tsx`)

Si encuentras call-sites a `callAnthropic` que NO corresponden a ningún action_key del catálogo (ej. una función experimental, debug, etc.), FLAG y NO wrappees — son llamadas internas que no deben cobrar al usuario.

## A.3 Tabla final de investigación

Estructura el reporte así:

```markdown
# Investigación hookpoints + call-sites (22-jun)

## Hookpoints awareness por habit_type

| habit_type | Path | Línea | Función | Idempotency key strategy | Status |
|---|---|---|---|---|---|
| sleep_wearable | src/.../X.ts | 42 | onSleepDataSaved() | `sleep_wearable_{userId}_{localDate}` | NUEVO |
| steps_wearable | ... | | | | NUEVO |
| ... | | | | | |
| checkin_emotional | app/checkin.tsx | XX | handleSave() | `checkin_emotional_{userId}_{localDate}` | ✅ YA |
| hydration_tap | src/services/hydration-service.ts | XX | addWater() | `hydration_tap_{userId}_{localDate}_{N}` | ✅ YA |

## Call-sites ARGOS

| Path | Línea | Función | action_key | Status |
|---|---|---|---|---|
| app/argos-chat.tsx | 109 | sendMessage() | chat | ✅ YA |
| src/.../food-X.ts | XX | analyzeFoodPhoto() | food_estimate_photo | NUEVO |
| ... | | | | |

## Decisiones autónomas tomadas durante investigación
1. ...
2. ...

## Hookpoints NO cableables (con razón)
- ...
```

**Salida obligatoria de Fase A:** `cowork_handoff/INVESTIGACION_HOOKPOINTS.md` con esta estructura. Sólo después de esto pasa a Fase B.

---

# FASE B — CABLEADO COMPLETO (3-4h)

## B.1 Cablear los 8 hookpoints diferidos de award

Para cada hookpoint identificado en A.1, agrega 1 línea fire-and-forget DESPUÉS de la mutación local exitosa:

```typescript
import { fireElectronAward } from '@/src/services/economy/electron-award-client';

// ... después de guardar el hábito en DB:
fireElectronAward({
  habit_type: 'sleep_wearable',
  evidence_tier: 'wearable',
  idempotency_key: `sleep_wearable_${userId}_${localDate}`,
  metadata: { /* opcional: hours, quality, etc. */ },
});
```

**Reglas:**
- `fireElectronAward` es fire-and-forget (no await, NO bloquea UI)
- `idempotency_key` debe ser único por evento (ver tabla en A.3)
- `metadata` opcional, útil para debugging
- Si el hookpoint dispara para MULTIPLES habit_types (ej. food puede ser foto O texto), elige el correcto según el path

## B.2 Cablear los call-sites ARGOS faltantes

Para cada call-site identificado en A.2 que NO esté wrappeado, envuélvelo con `withPreflight`:

```typescript
import { withPreflight, wasAborted } from '@/src/services/economy/with-preflight';

const result = await withPreflight('food_estimate_photo', async () => {
  return await callAnthropic({ ... });
});

if (wasAborted(result)) {
  // El usuario decidió ir a la tienda o cancelar
  return;
}

// continuar con result
```

**Reglas:**
- `withPreflight` con flag OFF → proceed() directo (byte-idéntico al actual)
- `withPreflight` con flag ON + balance bajo → muestra Alert con "Ir a la tienda" / "Cancelar"
- Si el usuario aborta, NO debe haber error visible — flujo limpio
- TODO call-site debe tener su action_key correcto

## B.3 Lab uploaded — caso especial (server-side trigger)

`lab_uploaded` no se completa desde el cliente — se completa cuando `lab-parser-worker` termina exitoso (server-side). Necesitas 2 opciones:

**Opción 1 (recomendada):** Modificar `lab-parser-worker` para que al terminar exitoso llame directamente a la RPC `award_electrons` (con service_role, ya que es Edge Function).

```typescript
// En supabase/functions/lab-parser-worker/index.ts, después del éxito:
await supabaseAdmin.rpc('award_electrons', {
  p_user_id: userId,
  p_amount: 200,
  p_reason: 'lab_uploaded',
  p_metadata: { lab_id: labId },
  p_idempotency_key: `lab_uploaded_${userId}_${labId}`,
});
```

**Opción 2 (alternativa):** En el cliente, cuando confirma el lab via UI de lab-confirmation, llama a `fireElectronAward`. Pero esto pierde awards si el usuario no abre la app.

→ **Implementa Opción 1.** Más sólido, menos dependiente de UI.

## B.4 Validación cruzada

Después de cablear todo, verifica:
- TODOS los hookpoints del catálogo HABIT_RULES tienen al menos 1 call site cableado
- TODOS los call-sites a `callAnthropic` con action_key del catálogo tienen withPreflight
- NO hay duplicación (mismo award disparado por 2 paths distintos)
- NO se introdujo break con flag OFF (corre tests + revisa manual con flag OFF)

---

# FASE C — CALIBRACIÓN CON DOC ECONÓMICO (1-2h)

Lee `R and D/03_ECONOMIA_PROTONES_H_PLUS.md` y reemplaza TODOS los placeholders.

## C.1 Curva de rank

Actualmente `src/services/economy/rank.ts` tiene fórmula `sqrt(lifetime/50)` placeholder. El doc tiene tabla:

```
Nivel 1-9    : 0 - 1,000 E-
Nivel 10-29  : 1,001 - 10,000 E-
Nivel 30-49  : 10,001 - 30,000 E-
Nivel 50-79  : 30,001 - 100,000 E-
Nivel 80-99  : 100,001+ E-
```

**Implementación recomendada:** función `rankFromLifetime(lifetime: number): number` con curva por tramos lineal entre niveles. Tests:
- 0 E- → rank 1
- 500 E- → rank 5 (medio del tramo 1-9)
- 1,000 E- → rank 9 o 10 (borde)
- 5,500 E- → rank ~19
- 30,000 E- → rank 49 o 50
- 100,000 E- → rank 79 o 80
- 500,000 E- → rank 99 (cap)

Si el doc tiene más detalle, úsalo. Si no, interpola lineal dentro de cada tramo.

Migración 093 opcional: si quieres mover la curva a DB para que esté accesible por RPCs, agrega tabla `rank_curve(rank INT PRIMARY KEY, min_electrons INT, max_electrons INT)` con seed. **Solo si simplifica.**

## C.2 `subscription_bonus`

Del doc: **100,000 H+** mensuales con sub $399 MXN bruto. Aplica en:
- `economy-config.ts` o donde corresponda
- RPC que se invoca cuando un user paga sub (puede no existir aún, en cuyo caso flag para sprint IAP)
- Mensajes UI: "Tu sub te da 100,000 H+ cada mes"

Si NO hay aún flujo de "user paga sub → server credita bono", marca como **flag** en COWORK_REPORT y entrega un script SQL/TS que CONOCEMOS que debe correr (puede ser una RPC `grant_monthly_subscription_bonus(user_id)` para que el sprint IAP futuro la invoque desde webhook).

## C.3 `REFERRAL_REWARD_PROTONS`

Del doc: **200,000 H+ al referrer + 50,000 H+ al referido**. Reemplaza placeholder de `100,000` en código.

## C.4 Caps + decay por hábito vs doc

Compara HABIT_RULES con la tabla "ELECTRONES (E-) — Generación por hábitos" del doc económico. Si hay diferencia en amount/cap/tier, **el doc gana** y actualiza el código. Documenta cada cambio.

## C.5 Costos por acción IA vs doc

Compara seed de `proton_action_costs` (migración 086) con la tabla "COSTOS POR ACCIÓN IA" del doc. Si difieren, agrega una migración 093 (o 094) que UPDATEé los costos con ON CONFLICT.

---

# FASE D — TESTS E2E CON FLAG SIMULADO (1-2h)

Crea `src/services/economy/__tests__/e2e-flow.test.ts` que simule el ciclo completo con flag ON:

## D.1 Flujo 1: hábito → award → balance

```typescript
test('habit completion awards electrons end-to-end', async () => {
  // mock flag ON
  // mock supabase.functions.invoke('award-electrons')
  // simular addWater() → debe llamar fireElectronAward('hydration_tap', ...)
  // verificar emit balance_changed
});
```

## D.2 Flujo 2: chat ARGOS con balance insuficiente

```typescript
test('argos chat aborts when insufficient H+ and offers tienda', async () => {
  // mock flag ON
  // mock preflightAction → { canProceed: false, cost: 2800, current: 1000 }
  // simular sendMessage() en argos-chat
  // verificar Alert mostrado + opción "Ir a la tienda"
});
```

## D.3 Flujo 3: conversión E- → H+ con campaña activa

```typescript
test('conversion uses challenge multiplier when user is in active challenge', async () => {
  // user con reto activo electron_multiplier=2.0
  // convertElectronsToProtons(100)
  // esperado: 6,000 H+ (no 3,000)
});
```

## D.4 Flujo 4: reto completado dispara settle

```typescript
test('challenge progress reaches criteria triggers settle and prize', async () => {
  // user en reto daily_steps target=20000 days_required=21
  // simular 21 days de writeChallengeProgress con value=20000+
  // verificar settle-challenge invocado + prize_protons acreditado
});
```

## D.5 Flujo 5: flag OFF byte-idéntico

```typescript
test('with flag OFF every helper is noop', async () => {
  // flag OFF
  // fireElectronAward → no network call
  // withPreflight → proceed() directo
  // writeChallengeProgress → early return
});
```

---

# FASE E — DOCUMENTACIÓN OPERACIÓN (30 min)

## E.1 Crear `docs/ECONOMIA_OPERACION.md`

Documento operativo para Enrique (NO buzón CC). Incluir:

1. **Cómo activar la feature:** comandos exactos en orden
   ```
   1. cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
   2. git checkout main
   3. git merge feat/economia-protones-h-plus --no-ff
   4. git merge feat/economia-electrons-server-side --no-ff
   5. git merge feat/economia-cierre-total --no-ff
   6. npx supabase db push  # aplica 082-093
   7. supabase functions deploy award-electrons
   8. supabase functions deploy settle-challenge
   9. # Editar economy-config.ts: LAB_ECONOMY_ENABLED = true
   10. # Setear env del proxy: LAB_ECONOMY_ENABLED=true
   11. eas update --branch preview  # OTA
   ```

2. **Cómo desactivar la feature (rollback):** flag back to false + OTA. Migraciones no se rollback pero quedan inertes.

3. **Smoke test físico en device:**
   - Header HOY muestra pill ⚡ E- + 💎 H+ + 📈 Rank
   - Tap pill → /economy/admin con balance + sub-cards
   - Tienda con 3 paquetes + animaciones
   - Conversión con slider funciona
   - Reto disponible: unirse cobra H+, aparece en activos
   - Hábito completado (ej. tap agua) → balance E- sube
   - Chat ARGOS con balance bajo → aborta + ofrece tienda
   - Referido cargado → código + share

4. **Métricas a monitorear:**
   - `argos_logs` con `request_type='electron_award'` (volumen + fails)
   - `electron_transactions` (awards por hábito, idempotency duplicates)
   - `proton_transactions` (spend rate por action_key)
   - PostHog events si están instrumentados

5. **Troubleshooting:**
   - "Usuarios no ganan E-": chequear que Edge Function `award-electrons` está deployed + flag ON + JWT válido
   - "Usuarios cobrados pero LLM falló": revisar refund logic en argos-proxy
   - "Doble award": chequear idempotency_key (debe ser único)

## E.2 Anexar al `COWORK_REPORT.md`

Sección nueva "Sprint OVERNIGHT: Economía Cierre Total (22-jun)" con:
- Tabla de fases completadas
- Resumen de cableado (10 hookpoints + N call-sites)
- Calibraciones aplicadas (con diffs vs placeholders anteriores)
- Tests añadidos
- Decisiones autónomas (con justificación)
- Cualquier flag pendiente

---

# ENTREGABLE

## Archivos a crear
```
cowork_handoff/INVESTIGACION_HOOKPOINTS.md
src/services/economy/__tests__/e2e-flow.test.ts
docs/ECONOMIA_OPERACION.md
supabase/migrations/093_*.sql (opcional, solo si necesaria)
```

## Archivos a modificar
```
src/services/economy/rank.ts                   ← curva real del doc
src/services/economy/economy-config.ts         ← REFERRAL_REWARD_PROTONS + subscription_bonus
supabase/functions/_shared/award-rules.ts      ← validar/ajustar caps vs doc
supabase/functions/lab-parser-worker/index.ts  ← agregar award_electrons al éxito
(+ hookpoints cableados en sus archivos respectivos según FASE B.1)
(+ call-sites wrappeados según FASE B.2)
COWORK_REPORT.md                                ← sección anexa
```

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos E2E
- [ ] Manual con flag OFF: comportamiento byte-idéntico al actual

## Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/economia-cierre-total`
- Enrique aprueba + smoke en device + ejecuta la activación documentada

---

# RECORDATORIOS CRÍTICOS

1. **Doc económico (R and D/03...) es la fuente de verdad.** NO inventes. Si un número no está, FLAG.
2. NUNCA reescribir archivos completos → str_replace quirúrgico
3. SIEMPRE `getLocalToday()` para date queries
4. Después de mutaciones balance: emit `DeviceEventEmitter('balance_changed')`
5. `npx tsc --noEmit` antes de cada commit
6. Migraciones SQL como archivos .sql, NO ejecutarlas
7. NO tocar motor v2, parser AI (excepto la integración award en lab-parser-worker), otros sprints
8. Pre-flight + award son FIRE-AND-FORGET en cliente — NO bloquean UI
9. Feature OFF byte-idéntico — TODOS los wrappers deben no-op si `LAB_ECONOMY_ENABLED=false`
10. Si un hookpoint NO se puede cablear limpio → FLAG en COWORK_REPORT, no improvises

---

# ORDEN ESTRICTO

1. Crear branch `feat/economia-cierre-total` desde `feat/economia-electrons-server-side`
2. **FASE A** — Investigación (mapa hookpoints + call-sites) + documento `INVESTIGACION_HOOKPOINTS.md`
3. **FASE B** — Cableado completo (B.1 hookpoints, B.2 call-sites, B.3 lab-parser-worker, B.4 validación)
4. **FASE C** — Calibración con doc económico (rank, subscription_bonus, referral, caps, costos IA)
5. **FASE D** — Tests E2E con flag simulado (5 flujos)
6. **FASE E** — Documentación (`docs/ECONOMIA_OPERACION.md` + COWORK_REPORT)
7. Tests + commit final
8. Push branch, NO merge, NO OTA

Si NO te cabe todo, prioridad:
- Crítico: A + B (cableado) + tests
- Importante: C (calibración) — sin esto los números no son finales
- Deseable: D (E2E) + E (docs)

Buena overnight 🌙
