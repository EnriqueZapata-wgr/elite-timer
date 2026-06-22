# COWORK_TASK — Sprint OVERNIGHT: L3 + TestInputScreen + H7 + N1 polish + (opcional UI purge)

**Origen:** decisiones Enrique 20-jun. Sprint mientras Enrique fuera todo el día (hasta mañana). Cuatro sprints técnicos sin necesidad de input de producto + 1 opcional si hay tiempo.

**Branch:** `feat/overnight-l3-testinput-pulidos-20jun` desde `main`.
**Estimado:** 8-12h CC overnight.
**SQL:** ⚠️ posible migración 081 (script de data fix L3 si hay registros viejos con unidad no canónica).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida mañana.

**Filosofía:** misma que sprints anteriores — orden estricto, ante duda flag en COWORK_REPORT.md y continúa, NO bloquearse. Si una parte no cabe limpia, NO la empieces.

**OVERNIGHT MODE:** Enrique NO disponible. Si encuentras decisión bloqueante:
1. Toma opción más conservadora
2. Documenta como flag con justificación
3. Continúa

**REGLA NO-FRANKENSTEIN:**
- Naming consistente con código existente
- Design tokens del Phase 1 UI (BG/BORDER/TEXT/ELEVATION)
- Animaciones consistentes (durations 200-300ms, springs damping 12-18)
- Reusar primitives existentes (`PressableScale`, `<TestQuestionScreen>` para inspirarte en `<TestInputScreen>`)
- NO refactors fuera de scope

---

# PARTE 1 — L3 Canonicalización unidades en `lab_values` (1-2h)

## Problema
Hoy testosterona ng/dL y ng/mL aparecen como 2 series separadas en gráficas → no se pueden comparar lab a lab. El converter (`lab-unit-converters.ts` con `normalizeLabValue()`) ya existe pero NO se llama en el insert a `lab_values`.

## Archivos involucrados
- `src/constants/lab-unit-converters.ts` ya tiene `normalizeLabValue()` con conversores explícitos + heurísticas por magnitud
- `src/services/edad-atp/lab-values-service.ts` (o donde sea que se haga el INSERT a `lab_values`)
- Worker async (`supabase/functions/lab-parser-worker/index.ts`) también escribe a `lab_uploads.extracted_data` con unidad raw

## Fix esperado

### 1.1 Cliente — usar normalizeLabValue antes de insert
En el path que escribe a `lab_values`:
```typescript
import { normalizeLabValue } from '@/src/constants/lab-unit-converters';

// ANTES del insert:
const { value: canonicalValue, unitTo: canonicalUnit, method, unitFrom } = normalizeLabValue(
  parameter_key,
  rawValue,
  rawUnit, // viene del PDF/manual
);

// Insert con canonicalValue + canonicalUnit
await supabase.from('lab_values').insert({
  user_id, parameter_key,
  value: canonicalValue,
  unit: canonicalUnit,
  // ... otros campos
});
```

### 1.2 Worker server-side — mismo treatment al persistir desde el LLM
El worker escribe a `lab_uploads.extracted_data` con raw values. Cuando esos valores se "confirman" (saveConfirmedLabValues) deben pasar por el converter.

**FLAG:** verificar si el converter ya se llama en `saveConfirmedLabValues` (sprint Parser AI v2 lo agregó). Si SÍ, solo asegurarse que entra a `lab_values` con unidad canónica.

### 1.3 Script de data fix para registros viejos

Crear migración `081_lab_values_canonicalize_units.sql` que:
- Itera `lab_values` con unidades NO canónicas
- Convierte usando las mismas reglas que `normalizeLabValue` pero en SQL
- Update con valor + unit canónica

**O alternativa:** script Node ejecutado una vez (no migración SQL). Decide cuál es más limpio.

Migración base ejemplo (idempotente):
```sql
-- 081_lab_values_canonicalize_units.sql
-- Corrige registros con unidades no canónicas (testosterona en ng/mL → ng/dL × 100, etc.)
-- Idempotente: solo afecta filas con unidad no canónica.

-- Testosterona: ng/mL → ng/dL × 100
UPDATE lab_values
SET value = value * 100, unit = 'ng/dL'
WHERE parameter_key = 'testosterone' AND unit = 'ng/mL';

-- HbA1c: fracción decimal → % × 100
UPDATE lab_values
SET value = value * 100, unit = '%'
WHERE parameter_key = 'hba1c' AND value < 0.5;

-- Hematocrito: fracción decimal → % × 100
UPDATE lab_values
SET value = value * 100, unit = '%'
WHERE parameter_key = 'hematocrit' AND value < 1;

-- WBC: miles → /µL × 1000
UPDATE lab_values
SET value = value * 1000, unit = '/µL'
WHERE parameter_key = 'wbc' AND value < 100;

-- Agregar más conversiones según el catálogo de LAB_UNIT_CONVERTERS
```

### Criterio de aceptación
- [ ] `lab_values` insert SIEMPRE pasa por `normalizeLabValue`
- [ ] Pantalla de gráficas en ATP LABS muestra UNA sola serie por biomarker (no duplicada)
- [ ] Migración 081 (o script) corrige registros viejos
- [ ] Tests para verificar canonicalización en flujo de save

---

# PARTE 2 — `<TestInputScreen>` reusable + migrar tests fitness (4-6h)

## Problema
CC del overnight pasado flagged: `<TestQuestionScreen>` no encaja para tests con input numérico (peso, reps, tiempo, distancia). Necesitan motor propio.

## Spec del componente

`src/components/tests/TestInputScreen.tsx`:

```typescript
type InputType = 'number' | 'time' | 'reps' | 'distance';

type TestInputProps = {
  title: string;
  subtitle?: string;
  instructions: string; // Texto que explica cómo hacer el test
  inputType: InputType;
  unit: string; // 'kg', 'segundos', 'reps', 'metros', 'm/s'
  min?: number;
  max?: number;
  decimals?: number; // 0 = entero
  placeholder?: string;
  onComplete: (value: number) => void | Promise<void>;
  initialValue?: number;
  accent?: string; // default ATP_BRAND.lime
};
```

### Layout esperado
```
┌──────────────────────────────────────┐
│  ← [back]                            │
│                                      │
│  TÍTULO DEL TEST                     │
│  Subtítulo opcional                  │
│                                      │
│  📋 Cómo hacer el test:              │
│  [texto instructions]                │
│                                      │
│  ┌──────────────────────────┐        │
│  │      [    250    ]       │  kg    │
│  │      input enorme         │        │
│  └──────────────────────────┘        │
│                                      │
│  [Slider opcional para inputType     │
│   number con min/max conocidos]      │
│                                      │
│  ┌─────────────────────────┐         │
│  │   GUARDAR RESULTADO     │         │
│  └─────────────────────────┘         │
└──────────────────────────────────────┘
```

### Comportamiento
- Input numérico grande (FontSize.xxl o equivalent)
- Haptic Light al cambiar valor (si slider) o al confirmar
- Haptic Medium al guardar
- Validación: respetar min/max, no submit si fuera de rango
- Cuando `inputType === 'time'`: mostrar con formato MM:SS o HH:MM:SS según range
- Cuando `inputType === 'reps'`: solo enteros
- Disable botón guardar si valor inválido

### Tests fitness a migrar al motor

Cada uno con su spec (verificar archivos existentes y migrar):

| Test | Archivo | inputType | unit | min | max |
|---|---|---|---|---|---|
| Balance (unipodal) | `app/edad-atp/tests/balance.tsx` | time | segundos | 0 | 120 |
| Cooper 12 min | `app/edad-atp/tests/cooper.tsx` | distance | metros | 0 | 4000 |
| Push-ups | `app/edad-atp/tests/push-ups.tsx` | reps | reps | 0 | 200 |
| Reaction time | `app/edad-atp/tests/reaction-time.tsx` | time | ms | 100 | 1000 |
| Plank | `app/edad-atp/test-plank.tsx` | time | segundos | 0 | 600 |
| BOLT (apnea) | `app/edad-atp/test-bolt.tsx` | time | segundos | 0 | 120 |
| Old man test | `app/edad-atp/test-old-man.tsx` | time | segundos | 0 | 60 |
| Recovery HR | `app/edad-atp/test-recovery-hr.tsx` | number | bpm/min | 0 | 60 |

### Migración por test
- Mantener la lógica de score/cálculo de edad ATP intacta
- Solo cambiar la UI a usar `<TestInputScreen>`
- Si el test tiene cronómetro embebido (plank/bolt), mantener el cronómetro + auto-llena input al detener
- Si tiene instrucciones largas, usar `instructions` prop

### Tests del componente
- `<TestInputScreen>` con cada inputType
- Validación min/max
- Formato time MM:SS
- Solo enteros para reps

### Criterio
- [ ] `<TestInputScreen>` reusable + types
- [ ] 8 tests fitness migrados
- [ ] Lógica de score/edad intacta
- [ ] Tests passing

---

# PARTE 3 — H7 Cache ARGOS insights invalidar en `day_changed` (1h)

## Problema
Las notificaciones/insights de ARGOS hoy se cachean 6h. Cuando el usuario cambia hábitos, el insight queda obsoleto durante esa ventana.

## Decisión Enrique (pre-resuelta)
**Invalidar cache cuando `day_changed` se emite.** Es lo más natural — el insight se refresca cuando el usuario hace algo que cambia el contexto del día.

## Fix esperado

### Archivo
`src/services/argos-daily-insights.ts` (o donde esté el cache).

### Lógica
1. El cache se guarda en `argos_daily_insights` table con `created_at + ttl 6h` (o similar)
2. Agregar listener para `DeviceEventEmitter` con evento `day_changed`
3. Cuando se emite: invalidar el insight cacheado del usuario actual (UPDATE `expires_at = now()` o DELETE)
4. Próxima request al insight forzará re-generación del LLM

### Implementación
```typescript
import { DeviceEventEmitter } from 'react-native';

// En el provider o servicio que maneja insights
useEffect(() => {
  const sub = DeviceEventEmitter.addListener('day_changed', () => {
    // Invalidar cache local + DB
    invalidateInsightCache(userId);
  });
  return () => sub.remove();
}, [userId]);

async function invalidateInsightCache(userId: string) {
  // Marcar como expirado en DB (no borrar — historial)
  await supabase
    .from('argos_daily_insights')
    .update({ expires_at: new Date().toISOString() })
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString());
}
```

**FLAG:** verificar el esquema actual de `argos_daily_insights`. Si no tiene `expires_at`, agregar migración 082. Si tiene `cached_at + ttl_hours`, ajustar lógica.

### Criterio
- [ ] Invalidación funciona al emitir `day_changed`
- [ ] Test que verifique listener + invalidación
- [ ] No invalida insights de otros usuarios

---

# PARTE 4 — Pulido N1: back-arrow del ARGOS tab (1h)

## Problema
CC flagged: el back-arrow del header de ARGOS (cuando se accede como tab) es leve rareza visual. Heredado del re-export de `argos-chat.tsx`.

## Fix esperado

### Hipótesis
`app/argos-chat.tsx` tiene header con back-arrow porque originalmente se navega vía `router.push`. Pero ahora también es tab raíz — no debería mostrar back.

### Opción 1: detectar si es tab vs deep link
```typescript
import { useNavigation } from '@react-navigation/native';

const nav = useNavigation();
const canGoBack = nav.canGoBack();
// Renderizar back solo si canGoBack === true (deep link), no si es tab raíz
```

### Opción 2: crear `argos-tab.tsx` separado
- `app/(tabs)/argos.tsx` apunta a su propio component (sin back)
- `app/argos-chat.tsx` mantiene back para deep links

**Mi voto:** opción 1 (más DRY).

### Criterio
- [ ] En tab ARGOS no se muestra back-arrow
- [ ] Deep link `router.push('/argos-chat')` sigue mostrando back
- [ ] Test de navegación si aplica

---

# PARTE 5 (OPCIONAL — solo si hay tiempo, NO bloquear) — Purga magic colors quirúrgica

## Contexto
Del audit Phase 1 UI: `#0a0a0a` aparece 96 veces, `#1a1a1a` aparece 148 veces en el código. Son legacy.

## Scope quirúrgico (NO refactor masivo)
1. Buscar en `app/` y `src/components/` solo los archivos modificados en este sprint
2. Reemplazar magic colors POR archivo tocado:
   - `#0a0a0a` → `ELEVATION[1].bg` o `BG.card`
   - `#1a1a1a` → `ELEVATION[1].border` o `BORDER.card`
3. NO tocar archivos fuera del scope del sprint

**No si no caben.** Es opcional.

---

# ENTREGABLE

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos existentes pasan + nuevos
- [ ] Tests nuevos por parte trabajada

## Migraciones esperadas (idempotentes, NO ejecutar)
- 081 lab_values canonicalize units (data fix)
- Posible 082 si `argos_daily_insights` necesita `expires_at`

## COWORK_REPORT.md — sección "Estado de avance por parte"

| Parte | Items | Estado |
|---|---|---|
| 1 | L3 canonicalización | ✅ / 🟡 / ❌ |
| 2 | TestInputScreen + 8 tests | ✅ / 🟡 / ❌ |
| 3 | H7 cache invalidar | ✅ / 🟡 / ❌ |
| 4 | N1 back-arrow | ✅ / 🟡 / ❌ |
| 5 | Magic colors purga | ✅ / 🟡 / ❌ (opcional) |

## Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/overnight-l3-testinput-pulidos-20jun`
- Enrique audita + decide merge mañana
- Migraciones como archivos .sql, NO ejecutadas

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA `crypto.randomUUID` → usar `generateUUID` helper
3. SIEMPRE `getLocalToday()` / `parseLocalDate()` para date queries
4. CADA CREATE TABLE → ENABLE ROW LEVEL SECURITY + policy
5. Después de mutaciones electrones / day: emit DeviceEventEmitter
6. `Constants.expoConfig.extra` (no process.env directo)
7. `npx tsc --noEmit` antes de commit
8. PowerShell 5.1 sin `&&` en comandos sugeridos
9. OTA por default — NO en este sprint
10. Migraciones SQL como archivos .sql, NO ejecutarlas (regla #12)
11. NO tocar motor v2, parser AI, ARGOS proxy, economía Protones, lab-parser-worker (Edge Function), ni sprints UI Phase 1/2

---

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Tokens canónicos: BG / BORDER / TEXT / ELEVATION (Phase 1 UI)
- Reanimated 4 + gesture-handler + expo-blur + expo-haptics
- DeviceEventEmitter para `day_changed`, `electrons_changed`
- PressableScale primitive del kit
- `<TestQuestionScreen>` como referencia para `<TestInputScreen>`
- Supabase CLI linkeado al proyecto

Buena overnight 🌙
