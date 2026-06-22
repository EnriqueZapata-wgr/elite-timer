# Investigación hookpoints + call-sites — Economía Cierre Total (22-jun)

FASE A (sin tocar código). Mapa para cablear en FASE B. Números validados vs
`R and D/03_ECONOMIA_PROTONES_H_PLUS.md` (doc económico = fuente de verdad).

## Hookpoints de award por habit_type

| habit_type | evidence | Path | Línea | Función / mutación | idempotency_key | Status |
|---|---|---|---|---|---|---|
| sleep_wearable | wearable | `src/services/wearable-service.ts` | 71 | `saveWearableToSupabase` está **DESACTIVADO** (stub, native packages removidos) | — | ⚠️ FLAG no-cableable |
| steps_wearable | wearable | `src/services/wearable-service.ts` | 71 | idem — wearable service desactivado | — | ⚠️ FLAG no-cableable |
| cardio_hr_wearable | wearable | — | — | sin ingestión cardio + wearable service desactivado | — | ⚠️ FLAG no-cableable |
| meditation_in_app | evidence | `app/meditation.tsx` | 202 | `handleComplete` (insert `mind_sessions`) | `meditation_in_app_{uid}_{date}_{ts}` | NUEVO |
| food_photo | evidence | `app/food-register.tsx` | 78 | insert `food_logs` con `photo_url` | `food_photo_{uid}_{date}_{logId}` | NUEVO |
| food_text | evidence | `app/food-text.tsx` | 253 | insert `food_logs` solo texto | `food_text_{uid}_{date}_{logId}` | NUEVO |
| checkin_emotional | evidence | `app/checkin.tsx` | ~92 | `handleSave` | `checkin_emotional_{uid}_{date}` | ✅ YA |
| hydration_tap | self | `src/services/hydration-service.ts` | ~113 | `addWater` | `hydration_tap_{uid}_{date}_{N}` | ✅ YA |
| supplement_check | self | `app/supplements.tsx` (119) **+** `app/(tabs)/index.tsx` (654) | 119 / 654 | upsert `supplement_logs` (DOS paths: pantalla supplements y quick-toggle del HOY) | `supplement_check_{uid}_{date}_{suppId}` | NUEVO (2 paths) |
| lab_uploaded | elite | `supabase/functions/lab-parser-worker/index.ts` | ~171 | tras `status='extracted'` (server-side) | `lab_uploaded_{uid}_{uploadId}` | NUEVO (B.3 server) |
| test_completed | elite | pantallas de tests edad-atp (NO capture-service) | — | tras `saveFunctionalTests` | `test_completed_{uid}_{date}` | ⚠️ DIFERIDO a pantalla |

### Notas de hookpoints
- **supplement_check tiene 2 paths** (pantalla Suplementos y quick-toggle del HOY). La key
  incluye `suppId` → si ambos paths disparan para el mismo suplemento/día, la idempotency
  evita doble award. Cablearé ambos.
- **cardio_hr_wearable**: sin ingestión de cardio por wearable hoy → NO cableable. FLAG.
- **lab_uploaded**: server-side en lab-parser-worker (B.3, Opción 1 del handoff). `user_id` =
  `upload.user_id`, `labId` = uploadId. La RPC `award_electrons` se llama con service_role.
- **test_completed**: el doc dice cap "1/semana"; la Edge Function hace cap DIARIO (1) → permite
  hasta 7/sem vs 1/sem del doc. FLAG (ventana semanal = follow-up; el cap diario igual limita).

## Call-sites ARGOS (callAnthropic) → action_key

| Path | Línea | requestType | action_key catálogo | Acción | Decisión |
|---|---|---|---|---|---|
| `app/argos-chat.tsx` (sendMessage) | 109 | chat | `chat` | user | ✅ YA (withPreflight nivel pantalla) |
| `src/services/nutrition-service.ts` | 196 | food_estimate_photo | `food_estimate_photo` | user | wrap nivel pantalla (food-scan) |
| `src/services/nutrition-service.ts` | 213 | food_estimate_text | `food_estimate_text` | user | wrap nivel pantalla (food-text) |
| `src/services/nutrition-service.ts` | 369 | supplement_scan | `supplement_scan` | user | wrap nivel pantalla |
| `src/services/lab-service.ts` | 504 | lab_interpretation | `lab_interpretation` | user | wrap nivel pantalla (lab-confirmation) |
| `src/services/argos-service.ts` | 1612 | routine | `routine` | user | wrap nivel pantalla |
| `src/services/argos-service.ts` | 1458 | insight | `insight` | **background** | NO wrap (sin momento UI; el 402 del proxy lo maneja silencioso) |
| `src/services/weekly-insight-service.ts` | 342 | weekly_insight | `weekly_insight` | **background** | NO wrap (background) |

### Call-sites a callAnthropic que NO están en el catálogo (NO wrappear — internas/no-cobran)
`recipe` (argos 1693), `shopping_list` (argos 1753), `food_reanalysis` (nutrition 229),
`label_scan` (nutrition 327), `meal_suggestion` (nutrition 441), `daily_summary` (atp-ai 357),
`clinical_interpretation` (clinical-study 264), `goal_decomposition` (goal-tree 136 — coach engine interno).
→ Sin `cost_h_plus` definido en el doc; no se cobran. FLAG documentado.

## Decisiones autónomas (FASE A)

1. **El guard económico REAL es el 402 server-side del argos-proxy** (ya implementado, gatea
   `callAnthropic` en TODOS los call-sites). `withPreflight` es solo UX que pre-empta el 402.
   → La economía queda enforced aunque un call-site no tenga withPreflight.
2. **withPreflight se cablea a nivel PANTALLA, no servicio.** Meter `Alert`/`router` en servicios
   (nutrition-service, lab-service) sería frankenstein y cambia el tipo de retorno (ripple a
   callers). El chat ya sigue este patrón (wrap en `app/argos-chat.tsx`). Los demás user-initiated
   se wrappean en su pantalla.
3. **insight / weekly_insight NO se wrappean**: son background (no hay tap del usuario) → un Alert
   "ve a la tienda" sería absurdo. El proxy 402 hace que el insight simplemente no se genere
   (degrada limpio).
4. **Awards = fire-and-forget a nivel servicio/pantalla** (sin ripple): se cablean todos los
   findables.
5. **cardio_hr_wearable**: no cableable hoy (sin ingestión). FLAG, no improviso.

## Hookpoints NO cableables ahora / diferidos (con razón)
- **sleep/steps/cardio_wearable** — `wearable-service` DESACTIVADO (native packages removidos).
- **test_completed** — NO se cabló en `capture-service` (lo importan ~13 tests edad-atp; meterle
  electron-award-client → react-native rompía su colección en Vitest). Cap semanal YA implementado
  (capWindow='week'). Wiring del award = a nivel pantalla de cada test, DIFERIDO a review.
