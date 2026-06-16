# COWORK_REPORT — Overnight: Cleanup obsoletas + Pulido HOY profundo

**Branch:** `fix/overnight-cleanup-hoy` (desde `main` @ 413c04e)
**Estado:** ✅ `npx tsc --noEmit` 0 errores · `npx vitest run` 415/415 (+7 nuevos).
**SQL:** ninguna. **NO merge, NO OTA.**
**Modo overnight:** decisiones conservadoras tomadas solo, documentadas abajo.

> `COWORK_REPORT.md` / `COWORK_TASK.md` en `.gitignore` (este se force-add).

---

## PARTE 1 — Cleanup obsoletas → 0 ELIMINACIONES (todo está VIVO) ⚠️

**Hallazgo crítico:** los 4 archivos marcados como "fantasma" en el brief están **VIVOS en el
flujo de onboarding activo**. Borrarlos rompe el registro de TODO usuario nuevo. Por la propia
regla del task ("si hay imports/uso vivo → flag y NO borres"), **no eliminé ninguno**. Evidencia:

| Archivo candidato | ¿Vivo? | Evidencia (verificada en código) |
|---|---|---|
| `app/onboarding/edad-atp.tsx` | **VIVO** | `app/index.tsx:54` rutea `onboarding_step='context' → /onboarding/edad-atp`; `onboarding-service.ts:16,41`; `app/_layout.tsx:155` (Stack.Screen) |
| `app/onboarding/chronotype.tsx` | **VIVO** | `app/index.tsx:58` `'goal' → /onboarding/chronotype`; `onboarding-service.ts:20,37`; `_layout.tsx:151`. NO es duplicado de `app/quiz/chronotype.tsx` (este es el quiz standalone de 10 preguntas; el de onboarding es el bloque de 7) |
| `src/services/edad-atp-service.ts` | **acoplado** | Su ÚNICO consumer es `onboarding/edad-atp.tsx` (vivo). Borrarlo rompe tsc |
| `src/constants/edad-atp-model.ts` | **acoplado** | Solo lo usan edad-atp-service + onboarding/edad-atp.tsx (ambos vivos) |

**Cadena de onboarding viva (verificada):** `onboarding-basics → goal → chronotype → health →
nutrition → context → edad-atp → voice-config → summary → (tabs)`. Los 8 archivos de
`app/onboarding/*` están registrados en `_layout` y son targets de navegación → **todos VIVOS**.

**Bundle size:** 0 bytes eliminados (nada se borró). El potencial de limpieza (edad-atp.tsx 1157
líneas + chronotype dup 374 + service + model) NO se realizó por ser flujo vivo.

### 🚩 FLAG para Enrique — cómo limpiar de verdad (decisión de producto, NO la tomé solo)

El "motor v1 fantasma" de `onboarding/edad-atp.tsx` es un **paso del onboarding que el usuario VE**
(calcula una edad biológica estimada y la guarda). Quitarlo cambia la UX de registro → es decisión
de producto, fuera de overnight. Si decides quitarlo, el rewire mínimo es:
1. `app/index.tsx:54` → `case 'context': setOnboardingRoute('/onboarding/voice-config');`
2. `onboarding-service.ts:16` → `case 'context': return '/onboarding/voice-config';` y `:41` (back nav de voice_config) → `return '/onboarding/context';`
3. Quitar `<Stack.Screen name="onboarding/edad-atp" .../>` de `_layout.tsx:155`.
4. Entonces sí: borrar `onboarding/edad-atp.tsx`, `edad-atp-service.ts`, `edad-atp-model.ts`.
`onboarding/chronotype.tsx` **NO** lo toques: es un bloque real del onboarding (no es el quiz).

---

## PARTE 2 — Pulido HOY profundo ✅

| # | Scope | Antes | Después | Archivos |
|---|---|---|---|---|
| 1 | Quitar caritas mood | 4 emoji buttons quick-log | eliminados (UI + handler + state + estilos) | `index.tsx` |
| 2 | Quitar glucosa de HOY | quick-log 80/90/.../120 | eliminado de HOY (la pantalla /glucose-log sigue) | `index.tsx` |
| 3 | Check-in emocional navegable | sección MOOD con quick-log | card "Check-in emocional" tappable → `/checkin` | `index.tsx` |
| 4 | Card cardio del día | no existía | `WearableMetricCard` (placeholder, wearable es stub) | `WearableMetricCard.tsx`, `index.tsx` |
| 5 | Card pasos | no existía | `WearableMetricCard` (placeholder) | idem |
| 6 | Revivir agenda | solo ayuno/protocolo | + comidas (meal_times) + sueño (cronotipo), informativos | `day-compiler.ts`, `agenda-extras.ts` |

**Detalle:**
- **Mood/glucosa:** removí la UI, los handlers `quickLogMood`/`quickLogGlucose`, el state y los
  estilos. **NO toqué la economía de electrones** (los electrones `checkin`/`glucose_log` se siguen
  ganando en `/checkin` y `/glucose-log`; solo quité el atajo desde HOY). day-compiler conserva su
  lógica cross-pillar de mood/glucosa (no la usé para earnings, no la rompí).
- **Wearable:** `WearableMetricCard` reusable (naming consistente, Spacing/Radius/Fonts del design
  system, colores brand). Lee `getWearableDataForDate(hoy)`; el servicio es un **stub** (devuelve
  null) → muestra "—" + hint "Conecta tu wearable". Cuando se reactive HealthKit/Health Connect,
  los cards muestran datos reales sin más cambios.
- **Agenda:** items informativos (comidas + sueño) con icono estático (no checkbox toggleable, no
  cuentan como "siguiente"). Builders puros en `agenda-extras.ts` (testeados). Protocolos/entreno
  ya fluían vía `daily_plans` — no los dupliqué.

---

## Flags / decisiones autónomas

1. **`/checkin-emocional` NO existe** — solo `app/checkin.tsx` (`/checkin`). El brief pedía navegar
   a `/checkin-emocional`. Navegué a `/checkin` (la ruta real) para no romper con un 404. Si quieres
   el nombre `/checkin-emocional`, hay que crear/renombrar la pantalla — dímelo.
2. **Wearable es un STUB** (`wearable-service.ts`: `isWearableAvailable()→false`,
   `getWearableDataForDate()→null`; comentario dice que los paquetes nativos se removieron por
   requerir compileSdkVersion 34+). Por eso los cards muestran placeholder. **Integración real de
   wearable = sprint dedicado** (permisos nativos + build). NO la implementé (como indicaba el brief).
3. **PARTE 1 = 0 eliminaciones** (todo vivo). Es el resultado conservador correcto; el rewire para
   limpiar de verdad es decisión de producto (arriba).
4. **Completitud de comidas en agenda:** los items de comida son informativos (no marcan
   completado). Derivar "comida registrada" de `food_logs.meal_type` es un follow-up; lo dejé simple.
5. **No toqué:** electrones/protones, motor v2/matrices/parser, ARGOS chat/sheet, welcome/tour.

---

## Deuda técnica encontrada
- El paso `onboarding/edad-atp` usa el **motor v1** (`edad-atp-service`/`edad-atp-model`) que ya
  está obsoleto vs el motor v2. Sigue vivo en onboarding. Recomendación: rewire (arriba) en un
  sprint con Enrique presente para validar el cambio de UX de registro.

---

## EXIT CRITERIA

- [x] `npx tsc --noEmit` → 0 errores.
- [x] `npx vitest run` → 415/415 (58 archivos), +7 nuevos.
- [x] PARTE 1 auditada (eliminaciones extras documentadas: ninguna, con razón).
- [x] Push a `origin/fix/overnight-cleanup-hoy`.
- [ ] **NO merge, NO OTA** — Enrique valida.

---

## SMOKE TEST (Enrique)

- [ ] HOY abre sin crashear.
- [ ] NO hay caritas de mood.
- [ ] NO hay card de glucosa.
- [ ] Tap en "Check-in emocional" → abre `/checkin`.
- [ ] Cards "Cardio hoy" + "Pasos" visibles (placeholder "—" + "Conecta tu wearable", porque el wearable es stub).
- [ ] Agenda muestra más que ayuno: comidas (Desayuno/Comida/Cena…) + "Dormir" (si hay cronotipo) + protocolos.
- [ ] Items de comida/sueño NO tienen checkbox (icono estático).
- [ ] Onboarding (si entras a su path con un usuario nuevo) NO aborta — NO se tocó.

---

## Nota de higiene
Los artefactos `test_habits.js` / `test_missing_scenarios.js` ya fueron borrados en el sprint anterior.
