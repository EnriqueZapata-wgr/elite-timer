# COWORK_TASK — Sprint OVERNIGHT: Economía Protones H+ (Backend + UI completa)

**Origen:** decisión Enrique 21-jun. Modelo económico calibrado en `Business development/Product Decisions/03_ECONOMIA_PROTONES_H_PLUS.md` con datos reales de costos. Este sprint construye TODO: backend + UI + integración.

**Branch:** `feat/economia-protones-h-plus` desde `main` actual.
**Estimado:** 10-14h CC overnight (es sprint grande, scope completo).
**SQL:** ⚠️ 9 migraciones (082-090) idempotentes.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida UI en device + flag activar feature.

**Filosofía:** sistema dual Electrones (rank permanente) + Protones H+ (moneda transable). Anti-bancarrota con caps + tier verificación. UI ELITE estilo Clash Royale con animaciones + haptic.

**OVERNIGHT MODE:** Enrique NO disponible. Si encuentras decisión bloqueante:
1. Toma opción más conservadora (premium + bulletproof)
2. Documenta como flag en COWORK_REPORT.md
3. Continúa, NO te bloquees

**REGLA NO-FRANKENSTEIN:**
- Tokens canónicos: BG/BORDER/TEXT/ELEVATION
- Reanimated 4 + haptics + PressableScale
- Coherencia con UI Phase 1 + 2 ya mergeada
- NO refactors fuera de scope
- NO tocar motor v2, parser AI, lab worker, ARGOS proxy (excepto integración de descuento H+)

---

# REFERENCIA OBLIGATORIA

**Lee PRIMERO:** `Business development/Product Decisions/03_ECONOMIA_PROTONES_H_PLUS.md` — modelo económico final con números calibrados (1 H+ = $0.001 MXN, sub $399 bruto / $199 net, margen 5x, conversión 100 E- = 3,000 H+, costos por acción IA, paquetes, retos, referrals, incentivos one-time).

---

# ARQUITECTURA

```
┌─────────────────────────────────────────────────┐
│           CLIENTE (React Native)                │
│                                                 │
│  Header HOY → muestra E- + H+ + Rank actual    │
│         ↓ tap                                   │
│  PANTALLA ADMIN (la que Enrique pidió)         │
│    - Mi balance H+                              │
│    - Mi rank actual + progreso al siguiente    │
│    - Historial transacciones (E- y H+)         │
│    - Conversión E- → H+                        │
│    - Mis logros / insignias                    │
│    - Acceso a Tienda                           │
│                                                 │
│  TIENDA (vistosa estilo Clash Royale)          │
│    - 3 paquetes H+ con animaciones             │
│    - IAP integration                           │
│                                                 │
│  RETOS (challenges)                            │
│    - Browse retos disponibles                  │
│    - Mis retos activos                         │
│    - Historial completados                     │
│                                                 │
│  REFERRAL                                       │
│    - Mi código único                           │
│    - Share nativo                              │
│    - Tracking referidos                        │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│           SUPABASE (Backend)                    │
│                                                 │
│  9 tablas: electron_*, proton_*, referrals,    │
│  challenges, challenge_participants, etc.       │
│                                                 │
│  argos-proxy MODIFICADO para descontar H+      │
│  ANTES de llamar al LLM (atomicidad)           │
└─────────────────────────────────────────────────┘
```

---

# PARTE 1 — BACKEND: 9 migraciones SQL (2-3h)

## 1.1 `082_electron_balance.sql` — balance de electrones por usuario

```sql
CREATE TABLE IF NOT EXISTS electron_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_electrons INT NOT NULL DEFAULT 0 CHECK (current_electrons >= 0),
  lifetime_electrons INT NOT NULL DEFAULT 0 CHECK (lifetime_electrons >= 0),
  current_rank INT NOT NULL DEFAULT 1 CHECK (current_rank BETWEEN 1 AND 99),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE electron_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own electron balance" ON electron_balance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach reads client electron balance" ON electron_balance FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.client_id = electron_balance.user_id AND cc.status = 'active')
);
```

## 1.2 `083_electron_transactions.sql` — log inmutable de cada movimiento E-

```sql
CREATE TABLE IF NOT EXISTS electron_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INT NOT NULL,
  reason TEXT NOT NULL, -- 'habit_sleep', 'habit_steps', 'lab_upload', 'test_completed', 'reto_completed', 'conversion_to_proton', 'achievement', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_electron_tx_user_created ON electron_transactions(user_id, created_at DESC);
ALTER TABLE electron_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own electron tx" ON electron_transactions FOR ALL USING (auth.uid() = user_id);
```

## 1.3 `084_proton_balance.sql` — balance de protones

```sql
CREATE TABLE IF NOT EXISTS proton_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_protons BIGINT NOT NULL DEFAULT 0 CHECK (current_protons >= 0),
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_spent BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proton_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own proton balance" ON proton_balance FOR ALL USING (auth.uid() = user_id);
```

## 1.4 `085_proton_transactions.sql` — log inmutable

```sql
CREATE TABLE IF NOT EXISTS proton_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount BIGINT NOT NULL, -- positivo: ganado, negativo: gastado
  type TEXT NOT NULL CHECK (type IN ('subscription_bonus', 'package_purchase', 'conversion_from_electron', 'action_spent', 'reto_entry', 'reto_prize', 'referral_bonus', 'achievement_bonus')),
  action_key TEXT, -- ej. 'chat', 'lab_interpretation' cuando type='action_spent'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proton_tx_user_created ON proton_transactions(user_id, created_at DESC);
ALTER TABLE proton_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own proton tx" ON proton_transactions FOR ALL USING (auth.uid() = user_id);
```

## 1.5 `086_proton_action_costs.sql` — config de costos por acción IA

```sql
CREATE TABLE IF NOT EXISTS proton_action_costs (
  action_key TEXT PRIMARY KEY,
  cost_h_plus INT NOT NULL CHECK (cost_h_plus >= 0),
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed con valores calibrados del modelo
INSERT INTO proton_action_costs (action_key, cost_h_plus, description) VALUES
  ('chat', 2800, 'Chat ARGOS — 1 mensaje'),
  ('food_estimate_photo', 2450, 'Análisis comida por foto'),
  ('supplement_scan', 2400, 'Escaneo etiqueta suplemento'),
  ('lab_interpretation', 1650, 'Interpretación PDF laboratorio'),
  ('routine', 1650, 'Generación rutina personalizada'),
  ('food_estimate_text', 1550, 'Análisis comida por texto'),
  ('insight', 450, 'Insight diario'),
  ('weekly_insight', 400, 'Insight semanal')
ON CONFLICT (action_key) DO UPDATE SET cost_h_plus = EXCLUDED.cost_h_plus, updated_at = NOW();
```

## 1.6 `087_proton_packages.sql` — paquetes vendibles

```sql
CREATE TABLE IF NOT EXISTS proton_packages (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protons BIGINT NOT NULL,
  price_mxn NUMERIC(10,2) NOT NULL,
  price_usd NUMERIC(10,2),
  bonus_percent INT DEFAULT 0,
  display_order INT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO proton_packages (sku, name, protons, price_mxn, price_usd, bonus_percent, display_order) VALUES
  ('h_plus_small',  'Paquete Chico',  100000,  99.00,  5.35, 0,  1),
  ('h_plus_medium', 'Paquete Medio',  500000,  399.00, 21.55, 20, 2),
  ('h_plus_large',  'Paquete Grande', 2000000, 1199.00, 64.80, 40, 3)
ON CONFLICT (sku) DO NOTHING;
```

## 1.7 `088_referrals.sql`

```sql
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'paid', 'rewarded', 'cancelled')),
  signed_up_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  reward_protons INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
```

## 1.8 `089_challenges.sql`

```sql
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('habits', 'fitness', 'mind', 'labs', 'community')),
  entry_cost_protons INT NOT NULL CHECK (entry_cost_protons >= 0),
  prize_protons INT NOT NULL,
  criteria JSONB NOT NULL, -- estructura de criterio (ej. {"type": "daily_steps", "target": 20000, "days_required": 21})
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  electron_multiplier NUMERIC(3,2) DEFAULT 1.0, -- campaña: x2.0 durante el reto
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users read challenges" ON challenges FOR SELECT USING (true);
```

## 1.9 `090_challenge_participants.sql`

```sql
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress JSONB,
  prize_awarded BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, challenge_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own challenge participation" ON challenge_participants FOR ALL USING (auth.uid() = user_id);
```

**Todas las migraciones idempotentes (IF NOT EXISTS / ON CONFLICT). NO ejecutar — `npx supabase db push` post-merge.**

---

# PARTE 2 — SERVICIOS atomicidad (2h)

## `src/services/economy/electron-service.ts`
```typescript
export async function awardElectrons(userId: string, amount: number, reason: string, metadata?: any): Promise<void>
export async function getElectronBalance(userId: string): Promise<ElectronBalance>
export async function getElectronHistory(userId: string, limit?: number): Promise<ElectronTransaction[]>
export function computeRankFromLifetime(lifetimeElectrons: number): number // returns 1-99
```

**Atomicidad:** usar transacciones Supabase RPC para insert + update balance en un solo batch. Anti-doble-conteo: check de idempotency_key opcional (ej. `habit_sleep_2026-06-21`).

## `src/services/economy/proton-service.ts`
```typescript
export async function getProtonBalance(userId: string): Promise<ProtonBalance>
export async function awardProtons(userId: string, amount: number, type: ProtonTxType, metadata?: any): Promise<void>
export async function spendProtons(userId: string, amount: number, action_key: string, metadata?: any): Promise<{ success: boolean; newBalance: number; error?: string }>
export async function getActionCost(action_key: string): Promise<number> // lee proton_action_costs
export async function getProtonHistory(userId: string, limit?: number): Promise<ProtonTransaction[]>
```

**Anti-balance negativo:** validar en `spendProtons` con CHECK en DB + retorno claro si balance insuficiente.

## `src/services/economy/electron-to-proton-converter.ts`
```typescript
export const BASE_CONVERSION = { electrons: 100, protons: 3000 }; // 1 E- = 30 H+ base

export async function getConversionRate(userId: string): Promise<{ electronsRate: number; protonsRate: number; multiplier: number }> {
  // Check si user tiene reto activo con multiplier > 1
  // Retorna rate ajustado (ej. 1 E- = 60 H+ si está en reto x2)
}

export async function convertElectronsToProtons(userId: string, electrons: number): Promise<{ success: boolean; protonsGained: number }> {
  // Debit electrons del current_electrons (NO toca lifetime)
  // Credit protons
  // Log en electron_transactions + proton_transactions
}
```

## `src/services/economy/referral-service.ts`
```typescript
export async function generateReferralCode(userId: string): Promise<string> // formato: ATPxxxxxx alfanumérico
export async function recordReferralSignup(referralCode: string, newUserId: string): Promise<void>
export async function markReferralPaid(newUserId: string): Promise<void> // dispara reward
export async function getMyReferrals(userId: string): Promise<Referral[]>
```

## `src/services/economy/challenge-service.ts`
```typescript
export async function listActiveChallenges(): Promise<Challenge[]>
export async function joinChallenge(userId: string, challengeId: string): Promise<void> // cobra entry_cost_protons
export async function getMyActiveChallenges(userId: string): Promise<ChallengeParticipant[]>
export async function checkChallengeCriteria(userId: string, challengeId: string): Promise<{ completed: boolean; progress: any }>
export async function settleChallenge(userId: string, challengeId: string): Promise<{ won: boolean; prize: number }>
```

---

# PARTE 3 — INTEGRACIÓN ARGOS-PROXY ↔ proton-service (1h)

## Cambios en `argos-proxy/index.ts`

ANTES de llamar al LLM:
```typescript
// 1. Lookup costo
const cost = await getActionCost(requestType);

// 2. Intentar debit
const debit = await spendProtons(userId, cost, requestType, {...});

if (!debit.success) {
  return new Response(JSON.stringify({
    error: { type: 'insufficient_protons', message: 'No tienes suficientes H+ para esta acción' },
    h_plus_required: cost,
    h_plus_current: debit.newBalance,
  }), { status: 402 });
}

// 3. Si debit exitoso, proceder al LLM normalmente
// ...llamada Anthropic...

// 4. Si Anthropic FALLA, refund:
await awardProtons(userId, cost, 'refund', { reason: 'llm_failed' });
```

**Doctrina:** sin H+ suficientes, NO llamamos al LLM. Cliente debe pre-flight check para guiar al usuario a la tienda si está bajo.

---

# PARTE 4 — UI: pantalla Admin de Balance (ELITE) (3-4h)

## Path: `app/economy/admin.tsx`

**Layout vertical:**

```
┌────────────────────────────────────┐
│  ← MI ECONOMÍA                     │
├────────────────────────────────────┤
│                                    │
│   ╔══════════════════════════╗    │
│   ║   ⚡ TU RANK: 47          ║    │ ← Gradient + glow
│   ║   "ATLETA"               ║    │
│   ║                          ║    │
│   ║   Barra progreso al 48:  ║    │
│   ║   ███████████░░░░ 73%   ║    │ ← Bloom verde
│   ║                          ║    │
│   ║   23,500 / 32,000 E-    ║    │
│   ╚══════════════════════════╝    │
│                                    │
│   ╔══════════════════════════╗    │
│   ║   💎 H+ DISPONIBLES      ║    │
│   ║                          ║    │
│   ║       1,247,500          ║    │ ← Número gigante
│   ║                          ║    │
│   ║   [Ir a la Tienda] →     ║    │
│   ╚══════════════════════════╝    │
│                                    │
│   ┌──────────────────────────┐    │
│   │ 🔄 Convertir E- → H+      │    │
│   │   Tasa actual: 100 → 3000│    │
│   └──────────────────────────┘    │
│                                    │
│   ┌──────────────────────────┐    │
│   │ 🏆 Mis Logros (12)        │    │
│   └──────────────────────────┘    │
│                                    │
│   ┌──────────────────────────┐    │
│   │ 📜 Historial movimientos  │    │
│   └──────────────────────────┘    │
│                                    │
│   ┌──────────────────────────┐    │
│   │ 🎯 Mis Retos Activos (2)  │    │
│   └──────────────────────────┘    │
│                                    │
│   ┌──────────────────────────┐    │
│   │ 👥 Referidos: 3            │    │
│   └──────────────────────────┘    │
└────────────────────────────────────┘
```

### Animaciones obligatorias
- Tap rank: zoom suave + haptic medium
- Tap H+ counter: bounce + haptic light
- Sub-cards: PressableScale + spring
- Entrada de pantalla: FadeInDown.springify() escalonado
- Si hay rank-up reciente: animación con confetti / glow especial

### Sub-secciones (sub-pantallas)
- `/economy/history` — historial de transacciones (filtrar E- / H+)
- `/economy/convert` — conversión E- → H+ con slider + preview de cuánto recibirás
- `/economy/achievements` — grid de logros (desbloqueados + por desbloquear)
- `/economy/referrals` — código único + share + lista referidos
- `/economy/challenges` — browse + mis activos + historial

---

# PARTE 5 — UI: TIENDA H+ estilo Clash Royale (3-4h)

## Path: `app/economy/shop.tsx`

**Layout horizontal o vertical cards grandes:**

```
┌────────────────────────────────────┐
│   ← TIENDA H+                      │
├────────────────────────────────────┤
│                                    │
│   ╔══════════════════════════╗    │
│   ║  💎  PAQUETE GRANDE       ║    │
│   ║     2,000,000 H+         ║    │
│   ║     +40% BONUS           ║    │
│   ║                          ║    │
│   ║  $1,199 MXN              ║    │
│   ║  [COMPRAR]               ║    │
│   ╚══════════════════════════╝    │
│                                    │
│   ╔══════════════════════════╗    │
│   ║  💠  PAQUETE MEDIO        ║    │
│   ║     500,000 H+           ║    │
│   ║     +20% BONUS           ║    │
│   ║                          ║    │
│   ║  $399 MXN                ║    │
│   ║  [COMPRAR]               ║    │
│   ╚══════════════════════════╝    │
│                                    │
│   ╔══════════════════════════╗    │
│   ║  💧  PAQUETE CHICO        ║    │
│   ║     100,000 H+           ║    │
│   ║                          ║    │
│   ║  $99 MXN                 ║    │
│   ║  [COMPRAR]               ║    │
│   ╚══════════════════════════╝    │
│                                    │
└────────────────────────────────────┘
```

### Doctrina UX ELITE (Clash Royale-like)
- Cards con **gradient diferenciado por paquete** (gold para grande, plata para medio, bronce para chico)
- **Animación de "joya brillando"** en el icono (reanimated loop)
- **Tap card**: scale spring + haptic medium + abre confirmación
- **Confirmación de compra**: bottom sheet con: "Confirmar $X MXN por Y H+"
- **Post-compra**: animación de monedas/protones cayendo + haptic success + actualiza balance en vivo
- **Indicador de "Más Popular"** sobre el paquete medio (default)

### IAP integration (placeholder)
- Stripe para web (futuro)
- Apple IAP + Google IAP para mobile
- Webhook `purchase-completed` que credita H+
- **Para este sprint:** stub IAP que solo simula compra en dev (no IAP real). Migración real en sprint dedicado.

---

# PARTE 6 — UI: Header HOY con E-/H+ visible (30 min)

## Cambios en `app/(tabs)/index.tsx`

Modificar el top bar del HOY para mostrar:
```
[ATP DAILY]  ⚡ 23.5K  💎 1.2M  [📈 Rank 47]
```

- Tap en cualquier elemento → navega a `/economy/admin`
- Números formateados con K/M (23.5K en vez de 23,500)
- Iconos consistentes con tokens del kit

---

# PARTE 7 — UI: Pantalla de Retos (1-2h)

## Path: `app/economy/challenges.tsx`

**Tres tabs/secciones:**

1. **Disponibles** — lista de retos para unirse
2. **Activos** — mis retos en curso con progreso
3. **Historial** — completados/fallidos

### Card de reto (estilo Clash Royale)
```
╔══════════════════════════════════╗
║  🏃 RETO DE LA SEMANA            ║
║  20,000 pasos × 21 días          ║
║                                  ║
║  💎 Entrada: 50,000 H+           ║
║  🏆 Premio: 150,000 H+           ║
║  ⚡ Bonus: E- valen ×2 en reto    ║
║                                  ║
║  [UNIRME]                        ║
╚══════════════════════════════════╝
```

---

# ENTREGABLE

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Tests nuevos mínimos:
  - electron-service: award + balance + compute rank
  - proton-service: spend + insufficient + refund
  - converter: con/sin multiplier
  - challenge-service: join + complete
  - referral-service: generate code + signup tracking

## Archivos a crear

```
supabase/migrations/082_electron_balance.sql ... 090_challenge_participants.sql
src/services/economy/electron-service.ts
src/services/economy/proton-service.ts
src/services/economy/electron-to-proton-converter.ts
src/services/economy/referral-service.ts
src/services/economy/challenge-service.ts
src/services/economy/__tests__/*
src/components/economy/RankBadge.tsx
src/components/economy/BalanceCard.tsx
src/components/economy/PackageCard.tsx
src/components/economy/ChallengeCard.tsx
src/components/economy/ProtonOrb.tsx (animación tipo joya brillando)
app/economy/admin.tsx
app/economy/shop.tsx
app/economy/challenges.tsx
app/economy/convert.tsx
app/economy/history.tsx
app/economy/achievements.tsx
app/economy/referrals.tsx
```

## Archivos a modificar

```
app/(tabs)/index.tsx              ← header con E-/H+ visible + navegación a /economy/admin
supabase/functions/argos-proxy/   ← integración con proton-service (debit + refund)
app/_layout.tsx                   ← Stack screens para nuevas pantallas
```

## COWORK_REPORT.md debe incluir
1. Decisiones autónomas (con justificación)
2. Smoke test checklist tuyo:
   - [ ] Header HOY muestra E-/H+/Rank
   - [ ] Tap → admin con todas las cards
   - [ ] Tap "Ir a Tienda" → 3 paquetes con animaciones
   - [ ] Convertir E- → H+ con slider preview
   - [ ] Browse retos + unirse → cobra H+ + se ve en activos
   - [ ] Referral code generado + share
   - [ ] Mock IAP compra → balance se actualiza
   - [ ] Tap mensaje ARGOS con balance bajo → guía a tienda

## Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/economia-protones-h-plus`
- Enrique audita + valida UI premium en device
- Después decide cuándo activar feature con flag (LAB_ECONOMY_ENABLED o similar)

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. SIEMPRE `getLocalToday()` para date queries
3. CADA CREATE TABLE → RLS + policy
4. Después de mutaciones balance: emit `DeviceEventEmitter('balance_changed')`
5. `npx tsc --noEmit` antes de cada commit
6. Migraciones SQL como archivos .sql, NO ejecutarlas
7. NO tocar motor v2, parser AI, lab worker, sprints UI Phase 1/2
8. UI ELITE: tokens canónicos + reanimated + haptic + PressableScale
9. NO push del proxy modificado sin pre-flight check en cliente
10. Feature OFF por default (LAB_ECONOMY_ENABLED = false) hasta que Enrique active

---

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Tokens canónicos: BG/BORDER/TEXT/ELEVATION/GLOW
- Reanimated 4 + gesture-handler + expo-blur + expo-haptics
- PressableScale primitive del kit
- argos-proxy YA existe (modificar mínimo para integración)
- Supabase CLI linkeado (db push automático post-merge)

---

# ORDEN ESTRICTO DE TRABAJO

1. **Leer documento del modelo** `Business development/Product Decisions/03_ECONOMIA_PROTONES_H_PLUS.md`
2. **PARTE 1** (9 migraciones SQL idempotentes)
3. **PARTE 2** (5 servicios con tests)
4. **PARTE 3** (integración argos-proxy con debit+refund)
5. **PARTE 4** (pantalla admin de balance ELITE)
6. **PARTE 5** (tienda H+ Clash Royale-like)
7. **PARTE 6** (header HOY con E-/H+ visible)
8. **PARTE 7** (retos UI)
9. **Tests + commit final**

Si no caben las 7 partes, prioridad:
1, 2, 3, 4 (admin), 6 (header) → mínimo viable
5 (tienda), 7 (retos) → siguiente sprint si no cabe

Para limpio si no cabe alguna. Tabla de estado en COWORK_REPORT.md.

Buena overnight 🌙
