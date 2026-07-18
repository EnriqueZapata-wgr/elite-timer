# 🔍 Cowork hint para Fable T3 — Root cause del bug Meet ARGOS

**Fecha:** 2026-07-09 tarde
**Owner:** Cowork (para acelerar Fable T3 del sprint MAGIA ARGOS 2.0)

---

## 🎯 Root cause detectado

**El bug NO es del reset flag ni del cache local.** Es un **gap en el flujo de detección**.

### Flujo actual (leído del código):

1. `ArgosPresenceProvider` (`src/components/argos/ArgosPresenceContext.tsx`)
   - Al montar, llama `hasArgosBeenIntroduced(userId)` 
   - Setea `introduced = true|false`
   - Este boolean controla si el **floating button** aparece o no

2. `/argos/meet` (`app/argos/meet.tsx`) tiene el redirect
   - Solo se dispara desde `onboarding-v2-service.ts` línea 37-38:
     ```typescript
     // pantalla marca argos_introduced_at y luego enruta a /(tabs).
     return '/argos/meet';
     ```
   - Este redirect es parte del FLOW DE ONBOARDING V2 (para nuevos usuarios que acaban de completar signup)

3. **Enrique** es usuario EXISTENTE:
   - Su `onboarding_completed_at` ya tiene timestamp (completó onboarding hace tiempo)
   - Cuando reseteó `argos_introduced_at = NULL` manualmente, el flujo NO reintenta el redirect
   - Consecuencia: `introduced = false` → floating oculto, PERO **nada lo lleva a `/argos/meet`**

### Efecto observado (feedback Enrique):

> "Corrí el SQL en supa. Pero no vi ninguna animación"

Correcto. No la vio porque no había ningún trigger que lo llevara a Meet ARGOS después del reset.

---

## 🔨 Fix propuesto (2 opciones, sugiero A)

### Opción A · Auto-redirect al detectar NULL (RECOMENDADO)

En el layout root (`app/_layout.tsx` o `app/(tabs)/_layout.tsx`), después de que `useArgosPresence` sepa el valor:

```typescript
// En _layout.tsx o similar top-level bajo el ArgosPresenceProvider
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';
import { useRouter, useSegments } from 'expo-router';

export function ArgosIntroGate({ children }: { children: ReactNode }) {
  const { introduced } = useArgosPresence();
  const router = useRouter();
  const segments = useSegments();
  
  useEffect(() => {
    // Solo redirect si:
    // 1. Ya tenemos user + valor cargado de `introduced` (no default)
    // 2. introduced === false
    // 3. NO estamos ya en /argos/meet (evita loop)
    // 4. NO estamos en onboarding (que tiene su propio flow)
    if (!introduced && 
        segments[0] !== 'argos' && 
        segments[0] !== 'onboarding-v2' &&
        segments[0] !== 'login' &&
        segments[0] !== 'register') {
      router.replace('/argos/meet');
    }
  }, [introduced, segments]);
  
  return children;
}
```

**Pros:**
- Consistente para todos los users (existentes con reset o nuevos)
- No requiere UI extra
- Cinemática garantizada — no se les pasa por alto

**Cons:**
- Interrumpe si el usuario está haciendo algo cuando abre la app (login → HOY → boom Meet ARGOS)
- Solo pasa 1 vez porque después Meet ARGOS marca el flag

### Opción B · Card "Conoce a ARGOS" en HOY (menos invasivo)

Si el flag es NULL, mostrar en HOY una card editorial:
```
┌─────────────────────────────────────┐
│  Aún no conoces a ARGOS             │
│                                     │
│  Descubre tu asistente personal en  │
│  60 segundos.                       │
│                                     │
│  [ Conocer a ARGOS → ]              │
└─────────────────────────────────────┘
```
Botón navega a `/argos/meet`.

**Pros:**
- No interrumpe
- Da autonomía al user

**Cons:**
- Requiere que Enrique/tester recuerde tocar la card
- Puede que muchos users ignoren la card

---

## 🗣️ Mi voto: **Opción A**

Enrique fue explícito: "quiero que se sienta la magia desde el primer momento". Interrumpir con Meet ARGOS al abrir la app POST-fresh-install o POST-reset ES la magia. Es 1 vez, es memorable, y garantiza que TODOS los users lo vean.

Además, la doctrina UX ATP dice "guiado no prisionero" — un onboarding cinemático UNA vez NO es prisionero, es onboarding.

---

## 📋 Test manual post-fix

1. Confirmar que Enrique (user id `90a55e74-0e3d-477a-9ac5-2b339f7c40af`) tiene `argos_introduced_at = NULL` (ya lo puse manual)
2. Enrique hace fresh login o cierra/abre la app
3. Debería ver Meet ARGOS cinemático al arrancar
4. Al completar, `argos_introduced_at` se marca → floating aparece → siguientes aperturas van directo a HOY

---

## 🤝 Recomendación adicional

En `ArgosPresenceContext.tsx`, agregar el state `introduced` como `null | boolean` (no `boolean` con default true):

```typescript
const [introduced, setIntroduced] = useState<null | boolean>(null);
```

Así el gate espera hasta que llegue el valor real (no dispara redirect con default `true` que sería falso positivo).

Ajuste correspondiente en `useEffect`:
```typescript
hasArgosBeenIntroduced(user.id)
  .then((v) => { if (alive) setIntroduced(v); })
  .catch(() => { if (alive) setIntroduced(true); }); // fail-open sigue igual
```

Y el gate:
```typescript
if (introduced === false && /* rest of conditions */) router.replace('/argos/meet');
```

Esto asegura que no haya "flash" de HOY antes de que el redirect se dispare.

---

Este hint acelera Fable T3 de ~90 min a ~30 min. Ambos ganamos tiempo para más pulido antes del sábado.

— Cowork
