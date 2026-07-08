# FABLE 5 CC — SPRINT REVENUECAT + IAP + BOOST H+

**Kickoff:** 2026-07-07
**Autor:** Cowork
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable`
**Branch:** `feat/v13-revenuecat-iap` desde main
**Objetivo:** cerrar el bloqueante grande final V1.3 — RevenueCat SDK + Paywall + Sistema Boost H+
**Estimación:** 6-8 horas

## Setup RevenueCat (ya hecho por Enrique)

- 3 Entitlements: `atp_base`, `atp_pro`, `atp_clinician`
- 5 Products con trials configurados (sin trial en Pro monthly/yearly ni Clínico)
- 2 Offerings: `default` (current) con 4 packages + `clinician` con 1 package
- API Key iOS test: `test_sghBdzhCreYftMTyCERAyiwisxX`
- API Key Android test: (por copiar del dashboard cuando llegue el momento)

## 🚨 REGLAS DE ORO

1. **NO OTA/build.** Solo merge+push.
2. Verifica cwd + branch antes de cada commit.
3. Migraciones range 158-199 (Cowork ya usó 100-102).
4. Migraciones idempotentes.
5. Cowork trabaja backend en paralelo (`subscription_events`, `pro_boosts`, edge function webhook, tier detection).

**Setup inicial:**

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable
git pull origin main
npm install
npx tsc --noEmit    # baseline 0 errores
vitest run          # baseline 742+ passing
git checkout -b feat/v13-revenuecat-iap
```

---

## 📋 SCOPE — 5 FEATURES

### F1 · Install RevenueCat SDK

```powershell
npx expo install react-native-purchases react-native-purchases-ui
```

Config API keys en `Constants.expoConfig.extra`:

```json
{
  "extra": {
    "revenuecatIosKey": "test_sghBdzhCreYftMTyCERAyiwisxX",
    "revenuecatAndroidKey": "REEMPLAZAR_CUANDO_ENRIQUE_LA_COPIE"
  }
}
```

Initialize en `app/_layout.tsx` root:

```typescript
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';

useEffect(() => {
  const apiKey = Platform.OS === 'ios' 
    ? Constants.expoConfig.extra.revenuecatIosKey 
    : Constants.expoConfig.extra.revenuecatAndroidKey;
  
  Purchases.configure({ apiKey });
  
  // Identify user si hay sesión
  if (userId) {
    Purchases.logIn(userId);
  }
}, [userId]);
```

### F2 · Hook `useSubscription()`

Path: `src/hooks/useSubscription.ts`

```typescript
type Tier = 'free' | 'base' | 'pro' | 'clinician';
type BoostStatus = { active: boolean; expiresAt: Date | null };

interface UseSubscription {
  tier: Tier;
  boost: BoostStatus;                    // Pro boost via H+ (task #133)
  effectiveTier: Tier;                    // = boost.active ? 'pro' : tier
  entitlements: string[];
  offerings: Offerings | null;
  isLoading: boolean;
  isPro: boolean;
  isBase: boolean;
  isClinician: boolean;
  restore: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  activateBoost: () => Promise<{ success: boolean; hPlusRemaining: number }>;
}
```

Behavior:
- Cache en Zustand o AsyncStorage
- Escucha `Purchases.addCustomerInfoUpdateListener` para tier changes en tiempo real
- Cross-check con `pro_boosts` table (Cowork la crea) para boosts activos
- `effectiveTier` es lo que consumes en toda la app para gating features

### F3 · Screen `/paywall` editorial

Path: `app/paywall.tsx`

Editorial ATP style (negro + lima):

- Hero: "Desbloquea tu potencial"
- Toggle Monthly / Yearly (con badge "AHORRAS 33%" en yearly)
- 2 cards side-by-side (o stacked mobile):
  - **ATP Base** con precio + 14 días trial + features
  - **ATP Pro** con precio + "sin trial · empieza ya" + features + badge "RECOMENDADO"
- Bottom: "¿Ya eres suscriptor? Restaurar compras"
- Terms links: Privacidad · Términos · Reembolsos (`somosatp.com/*`)

Al tap "Suscribirme":
- `Purchases.purchasePackage(pkg)`
- Loading state
- Success → toast + navegar back
- Error → mensaje editorial (no técnico)

**Trigger de paywall:**
- Al tap feature Pro con tier=base o free
- Botón "Actualizar" en Settings > Suscripción
- Nudge cards contextual en HOY (ej. "Desbloquea ARGOS proactivo")

### F4 · Sistema Boost H+ (task #133 — killer feature)

Path: `src/components/economy/ProBoostCard.tsx`

Card visible en HOY solo si `tier === 'base' && !boost.active`:

```
🔥 Prueba ARGOS Pro por 24 horas
Costo: 500 H+
Tienes: 1,234 H+
[ Activar boost → ]
```

Al tap:
1. Modal confirm: "Usarás 500 H+ · Te quedarán 734"
2. Confirmar → llama a Cowork RPC `activate_pro_boost(user_id)`
3. La función SQL descuenta H+ + inserta row en `pro_boosts` con `expires_at = NOW() + 24h`
4. `useSubscription` detecta el boost y `effectiveTier` cambia a 'pro' hasta expiración
5. Card ahora muestra countdown timer:
   ```
   ⚡ ARGOS Pro activo · 23h 15m restantes
   ```

Al expirar:
- Push notif (opcional): "Tu boost Pro expiró · ¿Renovar?"
- Card vuelve a estado inicial

Rate limit: máximo 3 boosts de 24h por semana (backend enforcement en RPC).

### F5 · Settings > Suscripción

Path: `app/settings/subscription.tsx`

Editorial ATP style con:

- **Tier actual:** badge grande "ATP Base" o "ATP Pro"
- Si en trial: countdown "Trial · quedan 8 días"
- **Próxima renovación:** fecha + monto (viene de `customerInfo.entitlements.active`)
- **Método de pago:** "Gestionar en Apple/Google" con deep link
- **Cancelar suscripción:** botón con confirmación
- **Restaurar compras:** botón secundario
- **Historial de pagos:** lista con fechas + montos + links a recibos
- **Boost H+ activo (si aplica):** countdown

Todos los buttons con haptics + editorial polish.

---

## ⚙️ DEPENDENCIAS BACKEND (Cowork trabaja en paralelo)

Cowork estará escribiendo estas migraciones + edge function. Coordina:

1. **Migración 103 `subscription_events`** — Cowork la aplica
2. **Migración 104 `pro_boosts`** — Cowork la aplica
3. **RPC `activate_pro_boost(user_id)`** — Cowork la aplica
4. **Edge function `revenuecat-webhook`** — Cowork la deploya
5. **Update `argos-proxy` con tier detection real** — Cowork lo hace

Fable NO necesita esperar a Cowork — puede trabajar con mocks temporalmente si algo no está listo. Al final coordinamos.

---

## 📦 ENTREGABLES

Al terminar, en branch `feat/v13-revenuecat-iap`:

1. Commits limpios por feature (F1-F5)
2. Tabla estándar con verificaciones
3. `npx tsc --noEmit` = 0 errores
4. `vitest run` = todos passing
5. Push a origin, listo para audit Cowork
6. Reporte con decisiones de criterio

---

## 🚫 FUERA DE SCOPE

- Backend RevenueCat (Cowork lo hace)
- Vinculación de apps Apple/Google en RevenueCat (Enrique cuando destrabé Apple + Google apruebe)
- Widgets nativos, Siri Shortcuts (V1.4)

---

## 🏁 KICKOFF

Fable:

1. Setup arriba
2. Arranca F1 (install SDK) — 30 min
3. F2 (hook useSubscription) — 1h
4. F3 (paywall screen) — 2-3h
5. F5 (Settings > Subscription) — 1h
6. F4 (Boost H+ card + flow) — 2h — el más creativo, cierra con esto

Reporta tabla estándar cuando termines. Sin OTA.

Rock and roll. 🎸
