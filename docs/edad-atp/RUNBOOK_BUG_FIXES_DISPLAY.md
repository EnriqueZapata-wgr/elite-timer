# Runbook — Bug fixes display Edad ATP (post Fase 4)

**Branch:** `fix/edad-atp-display-fixes` (desde `origin/main`)
**SQL:** ninguna. **Deploy:** OTA (`eas update --branch preview`) — lo ejecuta Enrique tras validar.

## Qué se arregló

### Bug 1 (CRÍTICO) — Composición no se mapeaba desde health_measurements
Los params del dominio `composicion_corporal` con `matrizSource = "Forms/Entrevista"`
caían al branch `questionnaire` de `resolveParamSource`, pero los datos viven en
`health_measurements` (capturados en `/edad-atp/composition`). Resultado: CE 0% y
sub-edad Corporal = 70 ▼ aunque los datos existían.

**Fix:** `COMPOSITION_HEALTH_MEASUREMENTS_MAP` en `src/constants/edad-atp-source-map.ts`,
chequeado ANTES del switch sobre `matrizSource`:

| Param matriz | Columna DB | Conversión |
|---|---|---|
| `grasa_corporal` | `body_fat_pct` | % → fracción (11 → 0.11) |
| `musculo_esqueletico` | `skeletal_muscle_pct` (no existe hoy) → derivado | `muscle_mass_kg / weight_kg` (55/79 = 0.696) |
| `fuerza_de_agarre` | `grip_strength_kg` | — |
| `grasa_visceral` | `visceral_fat` | — |

El branch `wearable_or_manual` de `resolveParamValues` (load-all-params.ts) ahora
soporta `convert(v, ctx)` con `deps` leídas del mismo row de health_measurements.

### Bug 2 — Sub-edad con CE bajo mostraba número rojo
Fitness mostraba 70 ▼ rojo con CE 33% (params Forms/Entrevista sin contestar).
**Fix:** con `ce_percent < SUB_EDAD_CE_PENDING_THRESHOLD` (50, en
`src/components/edad-atp/tokens.ts`):
- Constellation: mini-ring gris, icono + "Pendiente" + ⚠️ (sin número).
- Drill-down: ring "⚠️ Pendiente" + mensaje "Esta sub-edad necesita más datos.
  CE actual: X%. Completa los cuestionarios pendientes." Componentes y Acción ATP
  se mantienen visibles para guiar qué falta.
- Aplica a las 5 sub-edades.

### Bug 3 — Drill-down truncaba decimales a "0"
`Math.round(c.value)` en `app/edad-atp/sub-edad/[key].tsx`.
**Fix:** `formatComponentValue` por magnitud (≥100 → 0 dec, ≥10 → 1, ≥1 → 2, <1 → 3)
+ unidad de la matriz junto al valor. Params con `unit: '%'` (la matriz guarda
fracción decimal) se muestran ×100: Hematocrito 0.476 → "47.6%", HbA1c 0.055 → "5.5%",
RDW 0.129 → "12.9%". Bilirrubina 0.44 → "0.440 mg/dl".

## Flags

1. **`musculo_esqueletico` espera FRACCIÓN decimal** — validado contra la matriz en
   código (`edad-atp-matriz-v7-v6.ts`, dominio composicion_corporal): bandLimits
   [0.2, 0.3, 0.35, 0.4, 0.6, 0.7, 0.75, 0.8], consistente con `grasa_corporal`
   (0.03–0.35). El derivado 55/79 = 0.696 cae en `aceptable_3` (0.6 < v ≤ 0.7 → score 80),
   NO en crítico. No se inventó conversión ×100. Si el Excel master difiere del dump
   importado, revisar con Mariana.
2. **`edad_corporal` y `pullups` NO viven en health_measurements** (sin columna) →
   siguen como `questionnaire`. TODO: flujo de captura dedicado.
3. **Threshold CE = 50%** en `SUB_EDAD_CE_PENDING_THRESHOLD` — constante única,
   peloteable. Fitness con CE 33% → Pendiente; Corporal post-Bug-1 debería superar 50%.
4. **No se tocó** la curva sfToAge ni el cálculo de Edad Integral.
5. **⚠️ Fase 4 (`feat/cardio-from-matriz`) NO estaba mergeada en `origin/main`** al
   crear este branch (el handoff asumía que sí). Los 3 fixes aplican igual sobre main
   (source-map, Constellation y drill-down ya existen ahí), pero el síntoma exacto de
   Bug 2 (Fitness desde dominio Vitalidad) y los componentes con claves de matriz en el
   drill-down solo se manifiestan con Fase 4 mergeada. Al mergear ambos branches no se
   esperan conflictos en source-map; revisar `[key].tsx` y el orquestador si Fase 4
   tocó los mismos archivos.

## Smoke test post-OTA

1. Recalcular Edad ATP → sub-edad **Corporal** pasa de 70 ▼ a ~25 ▲ (datos de
   composición ya capturados; requiere Fase 4 mergeada para que Corporal lea del
   dominio SF).
2. Sub-edad **Fitness** → "Pendiente" + ⚠️ (no número rojo).
3. Drill-down Cardiovascular: Bilirrubina **0.440 mg/dl**, Hematocrito **47.6%**,
   RDW **12.9%**.
4. Drill-down Metabólica: HbA1c **5.5%**, HOMAir **0.410**.
5. Edad Integral sigue en ~25-27 (no cambia con estos fixes).

## Verificación local

- `npx tsc --noEmit` → 0 errores.
- `npx vitest run` → 157 tests / 27 archivos en verde, incluyendo los 4 nuevos de
  composición en `load-all-params.test.ts` (paciente Enrique: grasa_corporal 0.11,
  musculo_esqueletico 0.696, fuerza_de_agarre 77.8, grasa_visceral 3).
