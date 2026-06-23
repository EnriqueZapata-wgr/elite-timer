# COWORK_TASK — Sprint OVERNIGHT: Award Electrones Server-Side + Pre-flight ARGOS + Challenge Progress Writer

**Origen:** sprint anterior (`feat/economia-protones-h-plus`) endureció RLS a SELECT-only con créditos solo desde `service_role`. Esto previno exploit de minteo pero rompió el path actual de award de electrones por hábito (era client-side). Este sprint cierra los 3 bloqueantes que quedan antes de poder activar la feature.

**Branch base:** `feat/economia-protones-h-plus` (ya tiene 10 migraciones + servicios + UI + RPCs SECURITY DEFINER + RLS endurecido).

**Branch nueva:** `feat/economia-electrons-server-side` (desde `feat/economia-protones-h-plus`).

**Estimado:** 6-9h CC overnight.
**SQL:** 1-2 migraciones nuevas (092-093) idempotentes.
**Edge Functions:** 1 nueva (`award-electrons`) + cambios en `argos-proxy` (cableado pre-flight).
**Deploy:** ❌ NO merge, NO OTA — Enrique audita + smoke en device + activa flag manualmente.

**Filosofía:** server-side por default. El cliente NUNCA acredita moneda. Toda credit pasa por Edge Function con validación + idempotency + caps + tier.

**OVERNIGHT MODE:** Enrique NO disponible. Si encuentras decisión bloqueante:
1. Toma opción más conservadora (segura + auditable)
2. Documenta como flag en COWORK_REPORT.md (anexa al existente)
3. Continúa, NO te bloquees

**REGLA NO-FRANKENSTEIN:**
- Tokens canónicos: BG/BORDER/TEXT/ELEVATION
- NO refactors fuera de scope
- NO tocar motor v2, parser AI, lab worker, otros sprints UI
- Mantén compatibilidad con cliente actual (helpers del kit del sprint anterior)

---

# CONTEXTO OBLIGATORIO

**Lee PRIMERO:**
1. `COWORK_REPORT.md` (raíz repo) — sección "Sprint OVERNIGHT: Economía Protones H+ (21-jun)". Tiene la lista de flags pendientes.
2. `supabase/migrations/091_economy_rpcs.sql` — RPCs SECURITY DEFINER ya implementadas (award_electrons, award_protons, spend_protons, convert_electrons_to_protons, join_challenge, settle_challenge).
3. `src/services/economy/electron-service.ts` — helper `awardElectrons()` ya existe pero llama RPC que rechaza desde `authenticated`.
4. `src/services/economy/proton-service.ts` — helper `preflightAction()` ya existe pero no cableado en call-sites ARGOS.
5. `supabase/functions/argos-proxy/index.ts` — proxy con debit+refund gated por `LAB_ECONOMY_ENABLED` env.

---

# PARTE 1 — Edge Function `award-electrons` (2-3h)

## Path: `supabase/functions/award-electrons/index.ts`

### Responsabilidad
Recibe del cliente "completé hábito X". Valida server-side. Si pasa todas las reglas → llama RPC `award_electrons` (que ya existe en 091).

### Reglas de validación (orden estricto)

```
1. Auth: extraer userId del JWT. 401 si missing/inválido.
2. Schema: validar payload { habit_type, evidence_tier, idempotency_key, metadata? }.
3. Idempotency: si idempotency_key ya existe en electron_transactions → no-op + 200 OK.
4. Tier verificación: confirmar evidencia consistente con el habit_type
   (ej. habit_type='sleep_wearable' requiere evidence_tier='wearable').
5. Caps diarios: contar electron_transactions del user para este habit_type HOY (getLocalToday() en TZ del user).
   - Si supera el cap → rechazar con cap_reached.
6. Decreciente: si la fuente tiene curva decreciente (ej. hidratación 1er vaso > 10mo), calcular amount ajustado.
7. Llamar RPC `award_electrons(user_id, amount, reason, metadata, idempotency_key)` con service_role.
8. Retornar { success: true, electrons_awarded: amount, new_balance: ... }.
```

### Tabla de habit_types reconocidos (HARDCODED en la Edge Function)

```typescript
const HABIT_RULES: Record<string, HabitRule> = {
  // wearable-verified (premium tier)
  'sleep_wearable':        { tier: 'premium', amount: 30, dailyCap: 1, decay: false },
  'steps_wearable':        { tier: 'premium', amount: 20, dailyCap: 1, decay: false }, // 1/día
  'cardio_hr_wearable':    { tier: 'premium', amount: 25, dailyCap: 3, decay: false }, // hasta 3 sesiones/día
  'meditation_in_app':     { tier: 'premium', amount: 15, dailyCap: 3, decay: false },

  // captura con evidencia (medio)
  'food_photo':            { tier: 'evidence', amount: 8,  dailyCap: 4, decay: false },
  'food_text':             { tier: 'evidence', amount: 5,  dailyCap: 4, decay: false },
  'checkin_emotional':     { tier: 'evidence', amount: 10, dailyCap: 1, decay: false },

  // autoreporte simple (bajo) — con curva decreciente
  'hydration_tap':         { tier: 'self',     amount: 2,  dailyCap: 10, decay: true }, // 1er=2, 2do=2, ..., 10mo=1
  'supplement_check':      { tier: 'self',     amount: 3,  dailyCap: 8,  decay: true },

  // élite (raros, mucho valor)
  'lab_uploaded':          { tier: 'elite',    amount: 200, dailyCap: 5,  decay: false }, // raro
  'test_completed':        { tier: 'elite',    amount: 100, dailyCap: 1,  decay: false }, // 1/semana, validado en cliente
};

// Curva decreciente: amount_n = max(1, baseAmount * (1 - n/dailyCap))
// Para hidratación: 1er=2, 5to=1.0, 10mo=0.2 → redondeo a 1 mínimo
```

### Decay function

```typescript
function applyDecay(baseAmount: number, occurrenceIndex: number, dailyCap: number): number {
  if (occurrenceIndex === 0) return baseAmount;
  const factor = Math.max(0, 1 - (occurrenceIndex / dailyCap));
  return Math.max(1, Math.round(baseAmount * factor));
}
```

### Response shape

```typescript
// 200 OK
{ success: true, electrons_awarded: 30, new_balance: 23830, new_rank: 47 }

// 200 OK pero no-op (idempotent retry)
{ success: true, electrons_awarded: 0, new_balance: 23830, new_rank: 47, idempotent: true }

// 200 OK pero cap alcanzado
{ success: false, reason: 'daily_cap_reached', cap: 4, electrons_today: 4 }

// 400 — schema error
{ error: { type: 'invalid_payload', message: '...' } }

// 401 — no auth
{ error: { type: 'unauthorized' } }

// 422 — habit_type desconocido o tier mismatch
{ error: { type: 'invalid_habit', message: '...' } }

// 500 — fallo interno
{ error: { type: 'server_error' } }
```

### Logging
Cada award debe loguearse en `argos_logs` con `request_type='electron_award'` y metadata `{ habit_type, amount, tier, evidence_tier }`.

### Headers
- `Authorization: Bearer <user JWT>` (Edge Function verifica + extrae userId)
- `Content-Type: application/json`

### Config en `supabase/config.toml`
```toml
[functions.award-electrons]
verify_jwt = true
```

---

# PARTE 2 — Cliente: integración day-compiler.ts (1-2h)

## Path: `src/services/day-compiler.ts` (modificar)

### Cambio: deprecar `awardBooleanElectron` client-side

El path actual de award (si existe `awardBooleanElectron` o similar) que insertaba directo a `electron_transactions` desde el cliente ya NO funciona (RLS SELECT-only). Reemplazar por llamada a Edge Function.

### Nuevo helper en `src/services/economy/electron-award-client.ts`

```typescript
import { LAB_ECONOMY_ENABLED } from './economy-config';
import { supabase } from '@/src/lib/supabase';

export async function requestElectronAward(params: {
  habit_type: string;
  evidence_tier: 'wearable' | 'evidence' | 'self' | 'elite';
  idempotency_key: string; // ej. `${habit_type}_${userId}_${localDate}_${optionalSubId}`
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; electrons_awarded: number; new_balance?: number; reason?: string }> {
  if (!LAB_ECONOMY_ENABLED) {
    // Flag OFF → silenciosa no-op (NO logs ruidosos, NO awards)
    return { success: false, electrons_awarded: 0, reason: 'feature_disabled' };
  }

  const { data, error } = await supabase.functions.invoke('award-electrons', {
    body: params,
  });

  if (error) {
    // Log silencioso a Sentry sin romper flujo del usuario
    console.warn('[economy] award-electrons failed', error);
    return { success: false, electrons_awarded: 0, reason: 'network_error' };
  }

  // Si award exitoso, emit evento para refrescar UI
  if (data?.success && data?.electrons_awarded > 0) {
    DeviceEventEmitter.emit('balance_changed');
  }

  return data;
}
```

### Cablear en mutaciones de hábitos

Identifica DÓNDE en `day-compiler.ts` (o similares) se marca un hábito como completado. Después de la mutación local exitosa, llamar `requestElectronAward()`.

**Ejemplos de hookpoints (auditar el código actual):**
- Sueño: cuando llega data de wearable + se guarda en `daily_metrics` → `requestElectronAward({ habit_type: 'sleep_wearable', ... })`
- Pasos: similar al sueño
- Hidratación: cuando se tap el vaso → `requestElectronAward({ habit_type: 'hydration_tap', metadata: { occurrence: N } })`
- Check-in emocional: al guardar el check-in
- Food (foto): al confirmar food log con foto
- Food (texto): al confirmar food log solo texto
- Meditación: al cerrar sesión de meditación
- Suplemento: al marcar tomado
- Lab uploaded: cuando termina el lab-parser-worker exitoso
- Test completado: al cerrar TestQuestionScreen con resultado válido

**REGLA:** todas las llamadas a `requestElectronAward` deben ser **fire-and-forget** (no await, no bloquear UI). Si el award falla, el hábito NO se rollback. La lógica de hábito es independiente del award.

### idempotency_key format

```typescript
// Para hábitos diarios únicos (sueño/pasos):
const key = `${habit_type}_${userId}_${getLocalToday()}`;

// Para hábitos múltiples al día (food/hidratación):
const key = `${habit_type}_${userId}_${getLocalToday()}_${incrementalIndex}`;

// Para eventos raros (lab/test):
const key = `${habit_type}_${userId}_${eventId}`; // ej. lab_id, test_session_id
```

---

# PARTE 3 — Pre-flight H+ cableado en call-sites ARGOS (2-3h)

## Helpers ya existen
- `preflightAction(action_key)` en `proton-service.ts` (sprint anterior)
- Edge Function `argos-proxy` responde 402 con `{ error: { type: 'insufficient_protons' }, h_plus_required, h_plus_current }` cuando balance insuficiente

## Lo que falta: cablear en cada call-site

### Estrategia
Wrap cada llamada a ARGOS con un `withPreflight()` HOC o helper:

```typescript
// src/services/economy/with-preflight.ts
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { preflightAction } from './proton-service';
import { haptic } from '@/src/utils/haptics';

export async function withPreflight<T>(
  actionKey: string,
  proceed: () => Promise<T>,
): Promise<T | { aborted: true; reason: 'insufficient_protons' }> {
  const check = await preflightAction(actionKey);

  if (!check.canProceed) {
    haptic.warning();
    return new Promise((resolve) => {
      Alert.alert(
        'H+ insuficientes',
        `Esta acción cuesta ${check.cost.toLocaleString()} H+. Tienes ${check.current.toLocaleString()} H+.`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve({ aborted: true, reason: 'insufficient_protons' }) },
          { text: 'Ir a la Tienda', onPress: () => { router.push('/economy/shop'); resolve({ aborted: true, reason: 'insufficient_protons' }); } },
        ],
      );
    });
  }

  return proceed();
}
```

### Call-sites a wrappear

Identifica DÓNDE se llama `argos-proxy` en el cliente (busca `supabase.functions.invoke('argos-proxy', ...)`) y wrappea:

| Lugar | action_key |
|---|---|
| `src/services/argos-chat.ts` (chat ARGOS) | `chat` |
| `src/services/food-estimate-photo.ts` | `food_estimate_photo` |
| `src/services/food-estimate-text.ts` | `food_estimate_text` |
| `src/services/supplement-scan.ts` | `supplement_scan` |
| `src/services/lab-interpretation.ts` | `lab_interpretation` |
| `src/services/routine-personalized.ts` | `routine` |
| `src/services/insight-daily.ts` | `insight` |
| `src/services/insight-weekly.ts` | `weekly_insight` |

**REGLA:** `withPreflight` solo entra al flujo si `LAB_ECONOMY_ENABLED=true`. Si OFF, llamar directo a `proceed()` sin wrap (byte-idéntico al actual).

```typescript
import { LAB_ECONOMY_ENABLED } from './economy-config';

export async function withPreflight<T>(actionKey: string, proceed: () => Promise<T>): Promise<T | { aborted: true }> {
  if (!LAB_ECONOMY_ENABLED) return proceed();
  // ... resto del código
}
```

### UX cuando el pre-flight falla
- Haptic warning
- Alert nativo con 2 opciones: "Cancelar" / "Ir a la Tienda"
- "Ir a la Tienda" navega a `/economy/shop` Y el flujo de ARGOS aborta limpio (sin error visible)

---

# PARTE 4 — Challenge Progress Writer (1-2h)

## Problema actual
`challenges.criteria` es un JSONB con estructura como:
```json
{ "type": "daily_steps", "target": 20000, "days_required": 21 }
```

`challenge_participants.progress` es JSONB que debe acumularse según el criterio. **NO está claro QUIÉN escribe progress.**

## Solución: progress writer reactivo a eventos del día

Crear `src/services/economy/challenge-progress-writer.ts`:

```typescript
import { supabase } from '@/src/lib/supabase';
import { LAB_ECONOMY_ENABLED } from './economy-config';

interface ProgressEvent {
  userId: string;
  type: 'daily_steps' | 'sleep_quality' | 'days_streak_habit' | 'food_logged' | 'lab_uploaded' | 'cardio_minutes' | 'meditation_minutes';
  value: number;
  date: string; // local date ISO
  metadata?: any;
}

export async function writeChallengeProgress(event: ProgressEvent): Promise<void> {
  if (!LAB_ECONOMY_ENABLED) return;

  // Buscar challenges activos del user que coincidan con event.type
  const { data: participants } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, progress, challenges(criteria, end_date)')
    .eq('user_id', event.userId)
    .eq('status', 'active');

  if (!participants?.length) return;

  for (const p of participants) {
    const criteria = (p.challenges as any)?.criteria;
    if (!criteria || criteria.type !== event.type) continue;

    // Actualizar progress según el tipo
    const newProgress = updateProgress(criteria, p.progress, event);

    await supabase
      .from('challenge_participants')
      .update({ progress: newProgress })
      .eq('id', p.id);

    // Si criteria cumplido → llamar RPC settle_challenge (server-side, idempotente)
    if (isCompleted(criteria, newProgress)) {
      await supabase.functions.invoke('settle-challenge', {
        body: { participant_id: p.id },
      });
    }
  }
}

function updateProgress(criteria: any, current: any, event: ProgressEvent): any {
  switch (criteria.type) {
    case 'daily_steps':
      // Sumar día si supera target
      if (event.value >= criteria.target) {
        const days = (current?.days_completed || 0) + 1;
        return { ...current, days_completed: days };
      }
      return current;
    case 'cardio_minutes':
      return { ...current, total_minutes: (current?.total_minutes || 0) + event.value };
    case 'days_streak_habit':
      // Si event.date === ayer + 1, incrementar streak. Si no, reset.
      // ...
      break;
    // ... etc
  }
  return current;
}

function isCompleted(criteria: any, progress: any): boolean {
  switch (criteria.type) {
    case 'daily_steps':
      return progress?.days_completed >= criteria.days_required;
    case 'cardio_minutes':
      return progress?.total_minutes >= criteria.target;
    // ...
  }
  return false;
}
```

## Cableado
Llamar `writeChallengeProgress()` desde los mismos hookpoints donde se llama `requestElectronAward()`. Fire-and-forget.

## Edge Function settle-challenge (server-side)
Crear `supabase/functions/settle-challenge/index.ts`:
- Lee `challenge_participant` + `challenge`
- Re-valida server-side que criteria está cumplido (no confía en cliente)
- Llama RPC `settle_challenge` (ya existe en 091) que actualiza status='completed' + acredita prize_protons
- Idempotente (si ya está settled, no-op)

---

# PARTE 5 — Tests + verificación (1-2h)

## Tests obligatorios

### Edge Function `award-electrons`
- ✅ Award válido (sleep_wearable) → suma 30 E- + actualiza rank
- ✅ Idempotency: 2 requests con misma key → solo 1 award
- ✅ Cap diario: 5 awards de food_photo (cap=4) → 4 exitosos + 1 con `cap_reached`
- ✅ Decay hidratación: 10 awards → suma 2+2+2+1+1+1+1+1+1+1 = 13 (no 20)
- ✅ Tier mismatch: habit_type='sleep_wearable' con evidence_tier='self' → 422
- ✅ Auth: sin JWT → 401

### Cliente `requestElectronAward`
- ✅ Flag OFF → no-op silencioso
- ✅ Flag ON + Edge Function exitosa → emite `balance_changed`
- ✅ Network error → no rompe flujo, retorna `{ success: false, reason: 'network_error' }`

### `withPreflight`
- ✅ Flag OFF → proceed directo
- ✅ Flag ON + balance suficiente → proceed normal
- ✅ Flag ON + balance insuficiente → muestra Alert + opciones cancelar/tienda
- ✅ "Ir a la Tienda" → navega y aborta proceed sin error

### Challenge progress writer
- ✅ Event no relacionado → no-op
- ✅ Event suma a progress correctamente
- ✅ Criteria cumplido → invoca `settle-challenge`
- ✅ Settle idempotente → no doble premio

---

# ENTREGABLE

## Archivos a crear
```
supabase/functions/award-electrons/index.ts
supabase/functions/settle-challenge/index.ts
src/services/economy/electron-award-client.ts
src/services/economy/with-preflight.ts
src/services/economy/challenge-progress-writer.ts
src/services/economy/__tests__/electron-award-client.test.ts
src/services/economy/__tests__/with-preflight.test.ts
src/services/economy/__tests__/challenge-progress-writer.test.ts
supabase/functions/award-electrons/__tests__/index.test.ts
supabase/functions/settle-challenge/__tests__/index.test.ts
```

## Archivos a modificar
```
src/services/day-compiler.ts                    ← cablear requestElectronAward en hookpoints
src/services/argos-chat.ts                      ← envolver con withPreflight('chat')
src/services/food-estimate-photo.ts             ← withPreflight('food_estimate_photo')
src/services/food-estimate-text.ts              ← withPreflight('food_estimate_text')
src/services/supplement-scan.ts                 ← withPreflight('supplement_scan')
src/services/lab-interpretation.ts              ← withPreflight('lab_interpretation')
src/services/routine-personalized.ts            ← withPreflight('routine')
src/services/insight-daily.ts                   ← withPreflight('insight')
src/services/insight-weekly.ts                  ← withPreflight('weekly_insight')
supabase/config.toml                            ← agregar [functions.award-electrons] + [functions.settle-challenge]
```

## Posible migración 092 (decisión CC)

Si decides agregar columna `idempotency_key` UNIQUE a `electron_transactions` para mayor robustez:

```sql
-- 092_electron_transactions_idempotency.sql
ALTER TABLE electron_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_electron_tx_idempotency
  ON electron_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Y modificar RPC `award_electrons` (en 091) para que use `ON CONFLICT (idempotency_key) DO NOTHING`. **Si la 091 ya tiene esto, no se necesita migración nueva.**

## Pre-checks

Antes de empezar:
```bash
git checkout feat/economia-protones-h-plus
git pull origin feat/economia-protones-h-plus
git checkout -b feat/economia-electrons-server-side
```

## Tests obligatorios al final
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + ~25 nuevos
- [ ] Tests Edge Functions (Deno) si tienes runner configurado
- [ ] Manual: con flag OFF, simular llamada a chat → debe NO descontar H+ NO award E-

## Anexar a COWORK_REPORT.md (raíz)
- Sección nueva: "Sprint OVERNIGHT: Award Electrones Server-Side + Pre-flight ARGOS + Challenge Progress Writer (22-jun)"
- Tabla de estado por parte
- Decisiones autónomas (con justificación)
- Lista de archivos creados/modificados
- Smoke test checklist post-flag-on

## Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/economia-electrons-server-side`
- Enrique audita + valida en device

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. SIEMPRE `getLocalToday()` para date queries
3. Edge Functions Deno → usar `Deno.env.get()` + manejo de errores típico
4. Después de mutaciones balance: emit `DeviceEventEmitter('balance_changed')`
5. `npx tsc --noEmit` antes de cada commit
6. Migraciones SQL (si las hay) como archivos .sql, NO ejecutarlas
7. NO tocar motor v2, parser AI, lab worker (excepto integración award al final exitoso)
8. Tokens canónicos + reanimated + haptic
9. Pre-flight + award son FIRE-AND-FORGET en cliente — NO bloquean UI
10. Feature OFF byte-idéntico — TODOS los wrappers deben no-op si `LAB_ECONOMY_ENABLED=false`

---

# ORDEN ESTRICTO

1. Crear branch `feat/economia-electrons-server-side` desde `feat/economia-protones-h-plus`
2. **PARTE 1** — Edge Function `award-electrons`
3. **PARTE 2** — `requestElectronAward` cliente + cablear en day-compiler
4. **PARTE 3** — `withPreflight` + cablear en 8 call-sites ARGOS
5. **PARTE 4** — Challenge progress writer + Edge Function `settle-challenge`
6. **PARTE 5** — Tests + verificación + COWORK_REPORT
7. Push branch, NO merge

Buena overnight 🌙
